# Claude Code Instructions for Journal App

This file helps Claude Code (and future AI assistants) understand and work with this codebase effectively.

## Project Overview

A simple journal app where users write timestamped entries and view their archive. Built with Next.js 14 (App Router), deployed to Cloud Run.

**Key constraint**: Solo founder project prioritizing simplicity and fast iteration over enterprise features.

## Tech Stack Quick Reference

| Layer | Technology | Key Files |
|-------|------------|-----------|
| Framework | Next.js 14 (App Router) | `src/app/` |
| Styling | Tailwind CSS + shadcn/ui | `src/app/globals.css`, `src/components/ui/` |
| Database | Firestore | `src/lib/entries.ts` |
| Auth | Firebase Auth (Google Sign-In) | `src/lib/auth.tsx` |
| Deployment | Cloud Run (Docker) | `Dockerfile` |

## Architecture

See [DESIGN.md](./DESIGN.md) for full architecture documentation and rationale.

## Key Patterns

### Authentication

All auth flows go through the `AuthProvider` context in `src/lib/auth.tsx`:

```tsx
// In any client component:
const { user, signInWithGoogle, signOut } = useAuth();
```

The `user` object is a Firebase `User` or `null`. Always check for `null` before accessing user properties.

### Firestore Operations

All database operations are in `src/lib/entries.ts`:

- `createEntry(userId, content)` - Create new entry
- `getEntriesForUser(userId)` - Get all entries for a user
- `deleteEntry(entryId)` - Delete an entry

**Important**: Security rules in `firestore.rules` ensure users can only access their own data. Always pass the current user's `uid`.

### Adding UI Components

Use shadcn/ui for new components:

```bash
npx shadcn@latest add [component-name]
```

Components are copied to `src/components/ui/`. You own the code - modify freely.

### Client vs Server Components

- **Client components**: Anything using hooks (`useState`, `useEffect`, `useAuth`)
- **Server components**: Static content, layouts without interactivity

All data fetching for user-specific content happens client-side (requires auth).

## File Naming Conventions

- **Components**: `kebab-case.tsx` (e.g., `entry-form.tsx`)
- **Utilities**: `kebab-case.ts` (e.g., `firebase.ts`)
- **Pages**: `page.tsx` in route directories (Next.js convention)

## Common Tasks

### Add a new page

1. Create directory under `src/app/` (e.g., `src/app/settings/`)
2. Add `page.tsx` with default export
3. Use `"use client"` directive if using hooks

### Add a new Firestore collection

1. Add types and functions to `src/lib/entries.ts` (or create new file)
2. Update `firestore.rules` with security rules
3. Deploy rules: `firebase deploy --only firestore:rules`

### Add a new UI component

```bash
npx shadcn@latest add [component]
```

Browse available components: https://ui.shadcn.com/docs/components

### Deploy changes

```bash
gcloud run deploy journal-app --source . --region us-central1
```

## Testing Locally

```bash
# Development server
npm run dev

# With Firebase emulators (offline mode)
firebase emulators:start  # Terminal 1
npm run dev               # Terminal 2
```

## Environment Variables

Required in `.env.local` (see `.env.local.example`):

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

These are client-side variables (hence `NEXT_PUBLIC_` prefix). Firebase config is designed to be public.

## Known Limitations

1. **No full-text search**: Firestore doesn't support it. Would need Algolia/Typesense.
2. **No offline support**: Could add with Firestore persistence, but adds complexity.
3. **No edit functionality**: Entries are immutable by design. Could be added.
4. **Single user focus**: No sharing/collaboration features.

## Code Style

- All files start with 2-line `// ABOUTME:` comments explaining the file's purpose
- Use TypeScript strict mode
- Prefer functional components with hooks
- Keep components focused - one responsibility per file
- No premature abstraction - duplicate code is fine until pattern is clear

## Don't Do

- Don't add features without explicit request (YAGNI)
- Don't refactor working code unless asked
- Don't add comments explaining "improvements" or "better than before"
- Don't use Cloud SQL - Firestore is chosen for $0 at-rest cost
- Don't add server-side data fetching for user content (auth complexity)

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run lint             # Run ESLint
npx tsc --noEmit        # Type check

# Firebase
firebase emulators:start # Local emulators
firebase deploy --only firestore:rules # Deploy rules

# Deployment
gcloud run deploy journal-app --source . --region us-central1

# Logs
gcloud run logs read journal-app --region us-central1
```

## Project Structure

```
journal-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # Home page (entry form + list)
│   │   ├── entries/page.tsx   # All entries archive
│   │   ├── layout.tsx         # Root layout with AuthProvider
│   │   └── globals.css        # Tailwind + shadcn styles
│   ├── components/
│   │   ├── ui/                # shadcn/ui components (generated)
│   │   ├── header.tsx         # Navigation + user menu
│   │   ├── entry-form.tsx     # New entry textarea + submit
│   │   └── entry-list.tsx     # Entry cards with delete
│   └── lib/
│       ├── firebase.ts        # Firebase client initialization
│       ├── auth.tsx           # AuthProvider context + hooks
│       ├── entries.ts         # Firestore CRUD operations
│       └── utils.ts           # shadcn utilities (cn function)
├── public/                     # Static assets
├── Dockerfile                  # Cloud Run container build
├── firebase.json              # Emulator configuration
├── firestore.rules            # Security rules
├── DESIGN.md                  # Architecture documentation
├── README.md                  # Usage instructions
└── CLAUDE.md                  # This file
```
