# Deployment Summary

This document records the initial deployment of the journal app to GCP.

## Resources Created

### GitHub Repository
- **URL**: https://github.com/vivekhaldar/journal-app
- **Created with**: `gh repo create journal-app --public --source=. --push`

### GCP/Firebase Project
- **Project ID**: `journal-app-vh`
- **Project Name**: Journal App
- **Firebase Console**: https://console.firebase.google.com/project/journal-app-vh

### Firebase Configuration
Firebase configuration is stored in **Secret Manager** under `firebase-web-config`.

To retrieve it locally:
```bash
gcloud secrets versions access latest --secret=firebase-web-config --project=journal-app-vh
```

Copy the output to `.env.local` for local development.

### Cloud Run Service
- **Service URL**: https://journal-app-913560569160.us-central1.run.app
- **Region**: us-central1
- **Console**: https://console.cloud.google.com/run/detail/us-central1/journal-app/metrics?project=journal-app-vh

### Firestore Database
- **Location**: us-central1
- **Security Rules**: Deployed from `firestore.rules`

## Setup Steps Performed

1. **Created GCP project**
   ```bash
   gcloud projects create journal-app-vh --name="Journal App"
   ```

2. **Linked billing account**
   ```bash
   gcloud billing projects link journal-app-vh --billing-account=<BILLING_ACCOUNT_ID>
   ```

3. **Added Firebase to project**
   ```bash
   firebase projects:addfirebase journal-app-vh
   ```

4. **Enabled required APIs**
   ```bash
   gcloud services enable \
     identitytoolkit.googleapis.com \
     firestore.googleapis.com \
     run.googleapis.com \
     cloudbuild.googleapis.com \
     artifactregistry.googleapis.com \
     secretmanager.googleapis.com \
     --project journal-app-vh
   ```

5. **Created Firebase web app**
   ```bash
   firebase apps:create WEB journal-app-web --project journal-app-vh
   ```

6. **Created Firestore database**
   ```bash
   gcloud firestore databases create --location=us-central1 --project journal-app-vh
   ```

7. **Deployed Firestore security rules**
   ```bash
   firebase deploy --only firestore:rules --project journal-app-vh
   ```

8. **Stored Firebase config in Secret Manager**
   ```bash
   gcloud secrets create firebase-web-config --data-file=- --project=journal-app-vh
   ```

9. **Deployed to Cloud Run**
   ```bash
   gcloud builds submit --config cloudbuild.yaml --project journal-app-vh
   ```

## Manual Step Required

**Enable Google Sign-In** in Firebase Console:
1. Go to: https://console.firebase.google.com/project/journal-app-vh/authentication/providers
2. Click **Google**
3. Toggle **Enable**
4. Select support email
5. Click **Save**

## Redeployment

To redeploy after code changes:

```bash
cd ~/repos/gh/journal-app
gcloud builds submit --config cloudbuild.yaml --project journal-app-vh --substitutions=COMMIT_SHA=$(git rev-parse HEAD)
```

## Costs

At current usage (development/testing), all services should remain within free tier:
- Cloud Run: 2M requests/month free
- Firestore: 50K reads/day, 20K writes/day free
- Firebase Auth: Unlimited for social auth
- Secret Manager: 6 active secret versions free
