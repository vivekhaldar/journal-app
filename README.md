# Journal

A simple, private journaling app built with Next.js and deployed to Google Cloud Run.

## Quick Start

### Prerequisites

- Node.js 20+
- npm
- Google Cloud SDK (`gcloud`) - for deployment
- Firebase CLI (`firebase`) - for local emulators

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project (or use existing)
3. Enable Authentication:
   - Go to Authentication → Sign-in method
   - Enable Google provider
4. Enable Firestore:
   - Go to Firestore Database → Create database
   - Start in production mode (we'll use security rules)
5. Get your config:
   - Go to Project settings → Your apps → Add app (Web)
   - Copy the config values

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Firebase config:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 4. Deploy Firestore Security Rules

```bash
firebase deploy --only firestore:rules
```

### 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Development

### Local Development with Firebase Emulators

For fully offline development:

```bash
# Terminal 1: Start emulators
firebase emulators:start

# Terminal 2: Start Next.js (pointing to emulators)
npm run dev
```

Emulator UI: [http://localhost:4000](http://localhost:4000)

### Project Structure

```
src/
├── __tests__/           # Unit tests
├── app/                 # Next.js App Router pages
├── components/          # React components
│   ├── ui/             # shadcn/ui base components
│   ├── header.tsx      # Navigation + auth
│   ├── entry-form.tsx  # New entry creation
│   └── entry-list.tsx  # Entry display
└── lib/                 # Utilities and configs
    ├── firebase.ts     # Firebase initialization
    ├── auth.tsx        # Authentication context
    └── entries.ts      # Firestore operations
```

### Adding shadcn/ui Components

```bash
npx shadcn@latest add [component-name]
```

Example: `npx shadcn@latest add dialog`

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npx tsc --noEmit
```

### Testing

The project uses Jest and React Testing Library for unit testing.

**Run all tests:**
```bash
npm test
```

**Run tests in watch mode (re-runs on file changes):**
```bash
npm run test:watch
```

**Run tests with coverage report:**
```bash
npm run test:coverage
```

**Test coverage:**
- Components: ~99% line coverage
- Library functions: 100% line coverage
- Overall: ~86% line coverage

**Test files location:**
```
src/__tests__/
├── auth.test.tsx        # AuthProvider and useAuth hook tests
├── entries.test.ts      # Firestore CRUD operations tests
├── entry-form.test.tsx  # EntryForm component tests
├── entry-list.test.tsx  # EntryList component tests
└── header.test.tsx      # Header component tests
```

**What's tested:**
- Authentication state management and Google Sign-In flow
- Entry creation, listing, and deletion
- Component rendering in different auth states
- User interactions (form submission, button clicks)
- Error handling

## Deployment to Cloud Run

### First-Time Setup

1. Enable required GCP APIs:

```bash
gcloud services enable run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

2. Create Firestore database (if not using Firebase):

```bash
gcloud firestore databases create --location=us-central1
```

### Deploy

```bash
gcloud run deploy journal-app \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NEXT_PUBLIC_FIREBASE_API_KEY=your-key" \
  --set-env-vars "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com" \
  --set-env-vars "NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id" \
  --set-env-vars "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com" \
  --set-env-vars "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id" \
  --set-env-vars "NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id"
```

Or use a `.env` file with Cloud Build:

```bash
# Create cloudbuild.yaml for more complex builds
gcloud run deploy journal-app --source .
```

### Custom Domain

```bash
# Map your domain
gcloud run domain-mappings create \
  --service journal-app \
  --domain journal.yourdomain.com \
  --region us-central1

# Get DNS records to configure
gcloud run domain-mappings describe \
  --domain journal.yourdomain.com \
  --region us-central1
```

## Debugging

### Check Cloud Run Logs

```bash
gcloud run logs read journal-app --region us-central1
```

### Check Firestore in Console

[Firebase Console](https://console.firebase.google.com) → Firestore Database

### Common Issues

**"Missing or insufficient permissions"**
- Check that Firestore security rules are deployed
- Verify the user is signed in
- Check browser console for auth errors

**"Firebase app not initialized"**
- Verify all `NEXT_PUBLIC_FIREBASE_*` env vars are set
- Check that `.env.local` exists (not committed to git)

**Google Sign-In popup blocked**
- Add your domain to Firebase Auth → Settings → Authorized domains
- For Cloud Run, add `*.run.app` domain

**Cloud Run cold starts slow**
- Normal for scale-to-zero; consider setting `--min-instances=1` ($$$)
- Container starts in ~2-3 seconds

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key | Yes |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Yes |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | Yes |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID | Yes |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID | Yes |

All variables are prefixed with `NEXT_PUBLIC_` because they're used client-side. Firebase config is designed to be public (restricted by domain).

## Architecture

See [DESIGN.md](./DESIGN.md) for detailed architecture decisions and rationale.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Firestore
- **Auth**: Firebase Auth (Google Sign-In)
- **Hosting**: Cloud Run
- **Language**: TypeScript

## License

MIT
