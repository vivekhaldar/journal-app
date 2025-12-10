# Google Sign-In Setup Journey

This document records the complete process of setting up Google Sign-In for the Journal App deployed on Cloud Run. It includes all the issues encountered and their solutions.

## Overview

Setting up Google Sign-In for a Next.js app deployed on Cloud Run involves several interconnected systems:
- **Firebase Auth**: Manages user authentication
- **Google OAuth 2.0**: Provides the "Sign in with Google" flow
- **Cloud Run**: Hosts the application
- **Secret Manager**: Stores sensitive configuration
- **Cloud Build**: Builds and deploys the Docker image

## The Journey

### Issue 1: Firebase Config Not Available at Runtime

**Problem**: After initial deployment, the app showed `auth/invalid-api-key` error.

**Root Cause**: Next.js bakes `NEXT_PUBLIC_*` environment variables into the JavaScript bundle at **build time**, not runtime. Using `gcloud run deploy --set-env-vars` only sets runtime environment variables, which Next.js ignores for public variables.

**Solution**: Created `cloudbuild.yaml` to pass Firebase config as Docker build arguments:

```yaml
# In Dockerfile
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
# ... repeat for all Firebase config vars

# In cloudbuild.yaml
docker build \
  --build-arg "NEXT_PUBLIC_FIREBASE_API_KEY=..." \
  ...
```

### Issue 2: API Key Exposed in Public GitHub Repo

**Problem**: Google flagged the Firebase API key committed to the public GitHub repository.

**Solution**:
1. Stored Firebase config in **Secret Manager**:
   ```bash
   gcloud secrets create firebase-web-config --data-file=.env.local --project=journal-app-vh
   ```

2. Updated `cloudbuild.yaml` to fetch secrets at build time
3. Added API key restrictions in Google Cloud Console (HTTP referrer restrictions)
4. Removed hardcoded keys from committed files

### Issue 3: Cloud Build Step Isolation

**Problem**: Multiple iterations of `cloudbuild.yaml` failed because:
- `gcr.io/cloud-builders/docker` image doesn't have `gcloud` CLI
- `gcr.io/google.com/cloudsdktool/cloud-sdk` image doesn't have `docker`
- Environment variables don't persist between steps
- Shell variable escaping issues with `$` in YAML

**Solution**: Two-step approach writing values to individual files in `/workspace/`:

```yaml
steps:
  # Step 1: Fetch secret and write to individual files
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        gcloud secrets versions access latest --secret=firebase-web-config > /workspace/config.env
        grep NEXT_PUBLIC_FIREBASE_API_KEY /workspace/config.env | cut -d'=' -f2 > /workspace/API_KEY
        # ... repeat for each variable

  # Step 2: Build Docker image reading from files
  - name: 'gcr.io/cloud-builders/docker'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        docker build \
          --build-arg "NEXT_PUBLIC_FIREBASE_API_KEY=$(cat /workspace/API_KEY)" \
          ...
```

### Issue 4: Secret Manager Permission Denied

**Problem**: Cloud Build couldn't access the secret: `PERMISSION_DENIED`

**Root Cause**: Cloud Build uses the Compute Engine default service account, which didn't have access to Secret Manager.

**Solution**: Grant access to the service account:
```bash
gcloud secrets add-iam-policy-binding firebase-web-config \
  --member="serviceAccount:913560569160-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=journal-app-vh
```

### Issue 5: OAuth Client Not Found (401 invalid_client)

**Problem**: After app rendered correctly, clicking "Sign in with Google" showed "OAuth client was not found".

**Root Cause**: An earlier attempt to configure Google Sign-In via API had set dummy OAuth credentials:
```json
{
  "clientId": "913560569160-dummy.apps.googleusercontent.com",
  "clientSecret": "dummy"
}
```

**Solution**: Deleted the dummy configuration via API:
```bash
curl -X DELETE "https://identitytoolkit.googleapis.com/v2/projects/journal-app-vh/defaultSupportedIdpConfigs/google.com" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"
```

### Issue 6: OAuth Redirect URI Mismatch

**Problem**: After creating a new OAuth client via the IAP API, sign-in failed with `redirect_uri_mismatch`. The expected redirect URI was `https://journal-app-vh.firebaseapp.com/__/auth/handler`.

**Root Cause**: IAP (Identity-Aware Proxy) OAuth clients are special-purpose and don't support custom redirect URIs. Firebase Auth requires a standard "Web application" OAuth client.

**Solution**: Created a proper OAuth client manually in Google Cloud Console:

1. Go to: https://console.cloud.google.com/apis/credentials?project=journal-app-vh
2. Click "+ CREATE CREDENTIALS" → "OAuth client ID"
3. Select: Application type = **Web application**
4. Name: `Firebase Web Journal App`
5. **Authorized redirect URIs**: `https://journal-app-vh.firebaseapp.com/__/auth/handler`
6. Click "Create" and note the Client ID and Secret

Then configured Firebase Auth via API:
```bash
curl -X PATCH "https://identitytoolkit.googleapis.com/v2/projects/journal-app-vh/defaultSupportedIdpConfigs/google.com?updateMask=clientId,clientSecret" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "clientId": "913560569160-0uibl0sdmts64cknajng0uni8ta21714.apps.googleusercontent.com",
    "clientSecret": "GOCSPX-..."
  }'
```

## Final Working Configuration

### Components

| Component | Value |
|-----------|-------|
| GCP Project | `journal-app-vh` |
| Cloud Run URL | https://journal-app-913560569160.us-central1.run.app |
| Firebase Auth Domain | `journal-app-vh.firebaseapp.com` |
| OAuth Client ID | `913560569160-0uibl0sdmts64cknajng0uni8ta21714.apps.googleusercontent.com` |
| Secret Manager Secret | `firebase-web-config` |

### Authorized Domains (Firebase Auth)

- `localhost`
- `journal-app-vh.firebaseapp.com`
- `journal-app-vh.web.app`
- `journal-app-913560569160.us-central1.run.app`

### OAuth Client Configuration

- **Type**: Web application
- **Authorized redirect URI**: `https://journal-app-vh.firebaseapp.com/__/auth/handler`

## Key Lessons Learned

1. **Next.js `NEXT_PUBLIC_*` variables are build-time only** - You cannot set them as runtime environment variables in Cloud Run. They must be available during `npm run build`.

2. **Cloud Build steps are isolated** - Each step runs in a fresh container. Use `/workspace/` to share data between steps. Environment variables don't persist.

3. **IAP OAuth clients ≠ Standard OAuth clients** - IAP creates special-purpose clients that can't be used for Firebase Auth. Use the Credentials page to create standard "Web application" clients.

4. **Firebase Auth redirect URI is fixed** - It's always `https://<project>.firebaseapp.com/__/auth/handler`. This must be registered in the OAuth client's authorized redirect URIs.

5. **Service accounts need explicit Secret Manager access** - Cloud Build uses the Compute Engine service account by default, which needs `roles/secretmanager.secretAccessor`.

## Redeployment Commands

```bash
# Deploy code changes
cd ~/repos/gh/journal-app
gcloud builds submit --config cloudbuild.yaml --project journal-app-vh --substitutions=COMMIT_SHA=$(git rev-parse HEAD)

# Update Firestore security rules
firebase deploy --only firestore:rules --project journal-app-vh

# View logs
gcloud run logs read journal-app --region us-central1 --project journal-app-vh
```

## Troubleshooting

### "auth/invalid-api-key"
- Check that Firebase config is being passed as build args in `cloudbuild.yaml`
- Verify the API key in Secret Manager matches Firebase Console

### "OAuth client was not found" (401 invalid_client)
- Check Google Sign-In is enabled in Firebase Console
- Verify the OAuth client ID in Firebase Auth config matches an actual OAuth client

### "redirect_uri_mismatch"
- Ensure `https://<project>.firebaseapp.com/__/auth/handler` is in the OAuth client's authorized redirect URIs
- Make sure you're using a "Web application" type OAuth client, not an IAP client
