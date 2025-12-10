# Journal App - Design Document

## Overview

This is a simple, privacy-focused journaling application built for deployment on Google Cloud Platform. The app allows users to write timestamped journal entries and view their archive.

## Goals and Constraints

### Primary Goals
1. **Simplicity**: Solo founder usage - minimize operational overhead
2. **Fast iteration**: Quick local development cycle, fast deployments
3. **Low cost**: Should cost $0/month at low traffic, scale gracefully
4. **Privacy**: Users can only access their own entries

### Non-Goals (for now)
- Full-text search across entries
- Rich text editing
- Image attachments
- Sharing/collaboration features

## Architecture Decisions

### Why Cloud Run?

**Decision**: Deploy as a containerized Next.js app on Cloud Run

**Alternatives considered**:
- **App Engine**: More opinionated, slower deploys (~2-3 min vs ~30 sec), less control
- **GKE (Kubernetes)**: Massive overkill for a solo founder app
- **Compute Engine**: Too much operational overhead (managing VMs)
- **Vercel**: Great for Next.js but user specifically wanted GCP

**Why Cloud Run wins**:
- Serverless containers = zero ops
- Scales to zero when idle = $0 when not in use
- Fast deploys (~30 seconds)
- Auto-HTTPS with custom domain support
- Container-based = portable to other platforms if needed

### Why Firestore (not Cloud SQL)?

**Decision**: Use Firestore for data persistence

**Alternatives considered**:
- **Cloud SQL (PostgreSQL)**: Familiar SQL, powerful queries, but minimum ~$7-10/month even when idle
- **Supabase**: Great DX, but adds another service and not purely GCP
- **AlloyDB/Spanner**: Enterprise-grade, massive overkill

**Why Firestore wins**:
- Truly serverless - pay per operation, not per hour
- $0 at rest - no minimum monthly cost
- No connection pooling headaches (a common Cloud Run + Cloud SQL pain point)
- Simple data model fits journal entries perfectly
- Real-time listeners available if we want live updates later
- Generous free tier: 50K reads/day, 20K writes/day

**Trade-offs accepted**:
- NoSQL requires different query patterns (no JOINs)
- Limited query operators compared to SQL
- Need to think about document structure upfront

### Why Firebase Auth?

**Decision**: Use Firebase Auth with Google Sign-In

**Alternatives considered**:
- **Roll our own OAuth**: More work, more security surface area
- **Auth0/Clerk**: Good options but add cost and external dependency
- **Cloud IAP**: Better for internal/enterprise apps

**Why Firebase Auth wins**:
- Google Sign-In in ~10 lines of code
- Free for unlimited users with social auth
- Seamlessly integrates with Firestore security rules
- Firebase Auth IS a GCP service (Identity Platform under the hood)
- No backend auth code needed - tokens validated client-side or in security rules

### Why Next.js?

**Decision**: Use Next.js 14+ with App Router

**Alternatives considered**:
- **Remix**: Similar capabilities, smaller ecosystem
- **SvelteKit**: Lighter weight, but smaller ecosystem
- **Plain React + Express**: More boilerplate, less integrated

**Why Next.js wins**:
- Full-stack React framework - API routes + frontend in one project
- App Router enables server components for faster initial loads
- Huge ecosystem, well-documented
- Built-in optimization (image optimization, code splitting, etc.)
- Easy containerization for Cloud Run

### Why Tailwind + shadcn/ui?

**Decision**: Use Tailwind CSS with shadcn/ui component collection

**Alternatives considered**:
- **Material UI**: Looks too "Google-y", harder to customize
- **Chakra UI**: Good but heavier, less control
- **Plain CSS/Tailwind only**: Would rebuild common components

**Why this combination wins**:
- **Tailwind**: Utility-first, no context switching, rapid iteration
- **shadcn/ui**: Copy-paste components you own (not npm dependency)
  - Built on Radix primitives (accessible)
  - Beautiful defaults with Inter font
  - Fully customizable - you own the source code
  - Dark mode included
  - Only add components you need (no bundle bloat)

## Data Model

### Firestore Collections

```
/entries/{entryId}
  - userId: string      // Firebase Auth UID
  - content: string     // Journal entry text
  - createdAt: Timestamp
```

### Why this structure?

1. **Flat collection**: Simple queries, no subcollection complexity
2. **userId on each doc**: Enables security rules to scope access
3. **No update allowed**: Entries are immutable (simpler mental model)
4. **Timestamp**: Server-generated for consistency

### Security Rules

```javascript
match /entries/{entryId} {
  allow read: if request.auth.uid == resource.data.userId;
  allow create: if request.auth.uid == request.resource.data.userId;
  allow delete: if request.auth.uid == resource.data.userId;
  allow update: if false;  // Immutable
}
```

Even if the app code has bugs, users can't access each other's data.

## Future Evolution

### Adding Tags/Categories

Just add fields to documents (Firestore is schemaless):

```javascript
/entries/{entryId}
  - userId: string
  - content: string
  - createdAt: Timestamp
  - tags: string[]        // Add this
  - category: string      // Add this
```

Query by tag: `where("tags", "array-contains", "work")`

### Adding Full-Text Search

Firestore doesn't support full-text search. Options:
1. **Algolia**: Best UX, adds ~$29/month minimum
2. **Typesense Cloud**: Cheaper, self-hostable
3. **Migrate to Cloud SQL**: If search becomes critical

### Adding Real-Time Sync

Firestore supports real-time listeners:

```javascript
onSnapshot(query(...), (snapshot) => {
  // Update UI in real-time
});
```

This would enable multi-device sync without polling.

## Cost Analysis

At typical solo founder usage (a few entries per day):

| Service | Free Tier | Expected Usage | Monthly Cost |
|---------|-----------|----------------|--------------|
| Cloud Run | 2M requests, 360K GB-sec | ~1K requests | **$0** |
| Firestore | 50K reads/day, 20K writes/day | ~100 ops/day | **$0** |
| Firebase Auth | Unlimited social auth | 1 user | **$0** |

**Total: $0/month** until significant traction.

### Cost at Scale

If the app grows to 1,000 daily active users:

| Service | Estimated Usage | Monthly Cost |
|---------|-----------------|--------------|
| Cloud Run | 100K requests | ~$5 |
| Firestore | 500K reads, 50K writes | ~$5 |
| Firebase Auth | 1K users | **$0** |

**Total: ~$10/month** - very reasonable.

## Project Structure

```
journal-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # Home (entry form + recent)
│   │   ├── entries/
│   │   │   └── page.tsx       # All entries view
│   │   ├── layout.tsx         # Root layout with providers
│   │   └── globals.css        # Tailwind + shadcn styles
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── header.tsx         # Nav + auth controls
│   │   ├── entry-form.tsx     # New entry input
│   │   └── entry-list.tsx     # Entry display
│   └── lib/
│       ├── firebase.ts        # Firebase client init
│       ├── auth.tsx           # Auth context + hooks
│       ├── entries.ts         # Firestore operations
│       └── utils.ts           # Utility functions
├── public/                     # Static assets
├── Dockerfile                  # Cloud Run container
├── firebase.json              # Emulator config
├── firestore.rules            # Security rules
└── .env.local.example         # Environment template
```

## Key Implementation Notes

### Auth Flow

1. User clicks "Sign in with Google"
2. Firebase Auth handles OAuth popup
3. On success, `onAuthStateChanged` fires with user object
4. User object stored in React context via `AuthProvider`
5. Components use `useAuth()` hook to access user

### Entry Creation Flow

1. User types in textarea
2. On submit, `createEntry(userId, content)` called
3. Document added to Firestore with server timestamp
4. `refreshTrigger` increments to reload entry list
5. New entry appears at top of list

### Why No Server-Side Rendering for Entries?

Entries are user-specific and require authentication. SSR would require:
1. Server-side token validation
2. Firebase Admin SDK setup
3. More complexity

For a simple journal app, client-side data fetching is simpler and sufficient. The main page structure is still server-rendered for SEO.

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Internet                                 │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Cloud Run (auto-scaled, 0-N instances)          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Next.js Container (Node.js 20)            │  │
│  │  • Serves HTML/JS/CSS                                  │  │
│  │  • Handles API routes (if added later)                │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
              │                              │
              ▼                              ▼
┌───────────────────────┐      ┌───────────────────────────┐
│    Firebase Auth      │      │        Firestore          │
│  (Google Sign-In)     │      │  (entries collection)     │
│                       │      │                           │
│  - Token issuance     │      │  - Document storage       │
│  - Token validation   │      │  - Security rules         │
└───────────────────────┘      └───────────────────────────┘
```

### Deployment Process

```bash
# One command deployment
gcloud run deploy journal-app \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NEXT_PUBLIC_FIREBASE_API_KEY=..." \
  --set-env-vars "..."
```

Cloud Run automatically:
1. Builds the Dockerfile
2. Pushes to Container Registry
3. Deploys new revision
4. Routes traffic (zero-downtime)

## Security Considerations

1. **Firestore Rules**: Defense in depth - even buggy app code can't leak data
2. **No secrets in client**: Firebase config is public by design (domain-restricted)
3. **HTTPS only**: Cloud Run provides automatic TLS
4. **Non-root container**: Dockerfile runs as unprivileged user
5. **Auth required**: All data operations require valid Firebase token
