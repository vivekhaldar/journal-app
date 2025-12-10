# Scaling Architecture Guide

This document outlines how to evolve the journal app codebase into a larger, more complex application while maintaining modularity, testability, and understandability.

## Current State

```
src/
├── app/           # 2 pages
├── components/    # 3 feature components + shadcn/ui
├── lib/           # firebase.ts, auth.tsx, entries.ts, utils.ts
└── __tests__/     # 5 test files
```

---

## Recommended Evolution: Feature-Based Architecture

### Directory Structure

Evolve from "type-based" (components/, lib/) to "feature-based" organization:

```
src/
├── app/                          # Next.js pages (unchanged pattern)
│   ├── (auth)/                   # Route group: login, signup
│   ├── (dashboard)/              # Route group: main app
│   │   ├── projects/
│   │   │   ├── page.tsx          # List projects
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # Project detail
│   │   │       └── settings/
│   │   ├── entries/
│   │   └── settings/
│   ├── layout.tsx
│   └── globals.css
│
├── features/                     # Feature modules
│   ├── auth/
│   │   ├── components/           # AuthProvider, LoginForm, UserMenu
│   │   ├── hooks/                # useAuth, usePermissions
│   │   ├── lib/                  # auth operations
│   │   └── index.ts              # Public exports
│   │
│   ├── projects/
│   │   ├── components/           # ProjectCard, ProjectForm, ProjectList
│   │   ├── hooks/                # useProject, useProjects
│   │   ├── lib/                  # CRUD operations
│   │   ├── types.ts              # Project, ProjectMember interfaces
│   │   └── index.ts
│   │
│   ├── entries/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── index.ts
│   │
│   └── sharing/                  # Cross-cutting feature
│       ├── components/           # ShareDialog, PermissionSelector
│       ├── hooks/                # useSharing, useCollaborators
│       └── lib/                  # sharing operations
│
├── shared/                       # Shared utilities
│   ├── components/               # Header, Layout, LoadingSpinner
│   ├── ui/                       # shadcn/ui components (moved)
│   ├── hooks/                    # useDebounce, useLocalStorage
│   ├── lib/                      # firebase.ts, utils.ts
│   └── types/                    # Common types
│
└── __tests__/                    # Or colocate with features
```

**Key Principle**: Each feature is self-contained with its own components, hooks, lib, and types. Features only import from `shared/` or other features' public `index.ts`.

---

## Data Layer: Repository Pattern

### Current (Simple)
```typescript
// lib/entries.ts - Direct Firestore calls
export async function createEntry(userId, content) {
  return addDoc(collection(db, "entries"), {...});
}
```

### Evolved (Repository Pattern)
```typescript
// features/entries/lib/repository.ts
export const entriesRepository = {
  async create(data: CreateEntryInput): Promise<Entry> {...},
  async getById(id: string): Promise<Entry | null> {...},
  async listByUser(userId: string, options?: ListOptions): Promise<Entry[]> {...},
  async update(id: string, data: UpdateEntryInput): Promise<void> {...},
  async delete(id: string): Promise<void> {...},
};

// features/entries/index.ts - Public API
export { entriesRepository } from './repository';
export type { Entry, CreateEntryInput } from './types';
```

**Benefits**:
- Consistent interface across all collections
- Easy to mock in tests
- Can add caching layer later without changing consumers
- Single place for Firestore-specific logic

---

## Multi-User & Permissions

### Data Model (Firestore Collections)
```
users/
  {userId}/
    - email, displayName, photoURL

projects/
  {projectId}/
    - name, description, ownerId, createdAt
    - members: { [userId]: "owner" | "editor" | "viewer" }

entries/
  {entryId}/
    - projectId, userId, content, createdAt

invites/
  {inviteId}/
    - projectId, email, role, invitedBy, createdAt
```

### Permission Checking
```typescript
// features/sharing/lib/permissions.ts
export type Role = 'owner' | 'editor' | 'viewer';

export function canEdit(project: Project, userId: string): boolean {
  const role = project.members[userId];
  return role === 'owner' || role === 'editor';
}

export function canDelete(project: Project, userId: string): boolean {
  return project.members[userId] === 'owner';
}

export function canView(project: Project, userId: string): boolean {
  return userId in project.members;
}
```

### Security Rules (firestore.rules)
```javascript
match /projects/{projectId} {
  function isOwner() {
    return resource.data.members[request.auth.uid] == 'owner';
  }
  function isMember() {
    return request.auth.uid in resource.data.members;
  }

  allow read: if isMember();
  allow update: if isMember() && canEditFields();
  allow delete: if isOwner();
}

match /entries/{entryId} {
  function getProject() {
    return get(/databases/$(database)/documents/projects/$(resource.data.projectId));
  }

  allow read: if request.auth.uid in getProject().data.members;
  allow create: if canEditProject(request.resource.data.projectId);
}
```

---

## State Management Strategy

### Context for Global State
```typescript
// features/auth/components/AuthProvider.tsx (existing)
// features/projects/components/ProjectProvider.tsx (new)

// Wrap routes that need project context:
// app/(dashboard)/projects/[id]/layout.tsx
export default function ProjectLayout({ children, params }) {
  return (
    <ProjectProvider projectId={params.id}>
      {children}
    </ProjectProvider>
  );
}
```

### Custom Hooks for Data Fetching
```typescript
// features/projects/hooks/useProjects.ts
export function useProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await projectsRepository.listByMember(user.uid);
      setProjects(data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return { projects, loading, error, refresh };
}
```

**When to add TanStack Query/SWR?**
- When you need: caching, deduplication, background refetch, optimistic updates
- Not needed yet with manual refresh pattern
- Easy to add later by wrapping repository calls

---

## Component Patterns

### Feature Component Template
```typescript
// features/projects/components/ProjectCard.tsx
"use client";

import { Card, CardHeader, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { useAuth } from "@/features/auth";
import { canEdit } from "@/features/sharing";
import type { Project } from "../types";

interface ProjectCardProps {
  project: Project;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const { user } = useAuth();
  const editable = user && canEdit(project, user.uid);

  return (
    <Card>
      <CardHeader>
        <h3>{project.name}</h3>
        {editable && (
          <Button variant="ghost" onClick={onEdit}>Edit</Button>
        )}
      </CardHeader>
      <CardContent>
        <p>{project.description}</p>
      </CardContent>
    </Card>
  );
}
```

### Barrel Exports
```typescript
// features/projects/index.ts
// Components
export { ProjectCard } from './components/ProjectCard';
export { ProjectForm } from './components/ProjectForm';
export { ProjectList } from './components/ProjectList';

// Hooks
export { useProject } from './hooks/useProject';
export { useProjects } from './hooks/useProjects';

// Lib (repository)
export { projectsRepository } from './lib/repository';

// Types
export type { Project, CreateProjectInput } from './types';
```

---

## Testing Strategy

### Colocated Tests
```
src/features/projects/
├── __tests__/
│   ├── repository.test.ts
│   ├── ProjectCard.test.tsx
│   └── useProjects.test.tsx
├── components/
├── hooks/
└── lib/
```

### Test Patterns

**Repository tests** - mock Firestore:
```typescript
describe('projectsRepository', () => {
  it('creates project with owner as first member', async () => {
    mockAddDoc.mockResolvedValue({ id: 'proj-123' });

    await projectsRepository.create({
      name: 'Test',
      ownerId: 'user-abc',
    });

    expect(mockAddDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        members: { 'user-abc': 'owner' },
      })
    );
  });
});
```

**Hook tests** - mock repository:
```typescript
jest.mock('../lib/repository');
describe('useProjects', () => {
  it('fetches projects for current user', async () => {
    mockProjectsRepository.listByMember.mockResolvedValue([mockProject]);

    const { result } = renderHook(() => useProjects(), {
      wrapper: AuthProviderMock,
    });

    await waitFor(() => {
      expect(result.current.projects).toHaveLength(1);
    });
  });
});
```

**Component tests** - mock hooks:
```typescript
jest.mock('../hooks/useProjects');
describe('ProjectList', () => {
  it('renders loading state', () => {
    mockUseProjects.mockReturnValue({ loading: true, projects: [] });
    render(<ProjectList />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
```

---

## Migration Path

### Phase 1: Restructure (No New Features)
1. Create `features/` and `shared/` directories
2. Move existing code:
   - `lib/auth.tsx` → `features/auth/`
   - `lib/entries.ts` → `features/entries/`
   - `components/ui/` → `shared/ui/`
   - `components/header.tsx` → `shared/components/`
3. Update imports throughout
4. Run tests to verify nothing broke

### Phase 2: Add Repository Pattern
1. Create repository for entries
2. Update components to use repository
3. Add repository tests

### Phase 3: Add New Feature (e.g., Projects)
1. Create `features/projects/` with full structure
2. Add Firestore collection + security rules
3. Add ProjectProvider context
4. Build UI components

### Phase 4: Add Sharing/Permissions
1. Create `features/sharing/`
2. Update data models with `members` field
3. Add permission checking to UI
4. Update security rules

---

## Summary

| Aspect | Current | Evolved |
|--------|---------|---------|
| **Organization** | Type-based (lib/, components/) | Feature-based (features/auth/, features/projects/) |
| **Data Layer** | Direct Firestore calls | Repository pattern per collection |
| **Permissions** | Single-user (userId check) | Multi-user (members map + roles) |
| **State** | 1 context (Auth) | Context per feature domain |
| **Testing** | Central __tests__/ | Colocated with features |
| **Imports** | Direct file imports | Barrel exports (index.ts) |

**Key Principles**:
- **YAGNI** - Don't add complexity until needed
- **Testable** - Repository pattern is easily mockable
- **Modular** - Features are self-contained
- **Understandable** - Clear boundaries and naming
