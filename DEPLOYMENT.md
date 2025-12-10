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
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyByESAVaqQg0oF_LFVusttbgUuc4OrGWbg
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=journal-app-vh.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=journal-app-vh
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=journal-app-vh.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=913560569160
NEXT_PUBLIC_FIREBASE_APP_ID=1:913560569160:web:9f7ee22d7709665131df7d
```

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
   gcloud billing projects link journal-app-vh --billing-account=01F59E-8E38DD-76CA23
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

8. **Initialized Identity Platform and authorized domains**
   - Authorized domains: localhost, journal-app-vh.firebaseapp.com, journal-app-vh.web.app, journal-app-913560569160.us-central1.run.app

9. **Deployed to Cloud Run**
   ```bash
   gcloud run deploy journal-app \
     --source . \
     --region us-central1 \
     --project journal-app-vh \
     --allow-unauthenticated
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
gcloud run deploy journal-app \
  --source . \
  --region us-central1 \
  --project journal-app-vh
```

## Costs

At current usage (development/testing), all services should remain within free tier:
- Cloud Run: 2M requests/month free
- Firestore: 50K reads/day, 20K writes/day free
- Firebase Auth: Unlimited for social auth
