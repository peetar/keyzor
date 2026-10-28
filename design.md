# Architecture & Specification: Project Sharing & Multi-User Collaboration

## 1. Overview & Objectives

KEYZOR (`https://keyzor.vercel.app`) is an AI-native project & feature flowchart tracker built for software architects and agentic developers. As teams adopt KEYZOR, multiple engineers, product architects, and their respective AI coding agents (Antigravity, Cursor, Claude Code) need to collaborate concurrently on the same project flowcharts without friction.

### Core Goals:
1. **Frictionless OAuth Identity**: Automatically create and sync user accounts in KEYZOR upon OAuth (GitHub/Google) sign-in without clunky multi-step onboarding.
2. **Organization-Free Project Sharing**: Implement a lightweight, direct project-membership model (similar to Figma and personal GitHub repositories) avoiding the complexity of organizations or enterprise workspaces.
3. **Flexible Sharing Channels**:
   - **Shareable Links & Codes**: Project owners can generate invite links (`https://keyzor.vercel.app/join?code=KZ-XXXXX`) or short alphanumeric codes to share over Slack, email, or chat.
   - **Direct Join via Code**: Logged-in users can enter a project code directly in the dashboard to immediately join as a collaborator.
   - **Access Requests**: Users can request access to an existing project slug; owners can review, approve, or deny pending requests with one click.
4. **Role-Based Access Control (RBAC)**:
   - **Owner**: Creator of the project. Exclusively retains the ability to rename the project, delete the project, manage invite codes, and approve access requests.
   - **Collaborator (Editor)**: Can create new features, edit flowcharts, advance stages, attach links (e.g. `design.md`, PRs, preview URLs), and update the 4 Core Questions. Cannot rename or delete the project.
5. **Multi-Agent Collaboration**: Each collaborator generates their own KEYZOR API key. When their AI agent interacts with the project API, actions are accurately attributed in the project audit log (e.g. *"Alice (Coding Agent)"*).

---

## 2. Authentication & User Identity Lifecycle

### Current State
* `src/auth.ts` configures NextAuth (Auth.js v5) with JWT session strategy and GitHub / Google / Credentials providers.
* No database user creation or session mapping currently occurs during login; project creation hardcodes `DEFAULT_USER_ID = "usr_architect_peter"`.

### Target Architecture
1. **`signIn` & `jwt` NextAuth Callbacks**:
   ```typescript
   // On OAuth or Quick Login:
   async jwt({ token, user, account }) {
     if (user) {
       // Upsert or retrieve user in KEYZOR database
       const dbUser = await getOrCreateUser({
         email: user.email!,
         name: user.name || "Software Architect",
         image: user.image || null,
         provider: account?.provider || "credentials",
       });
       token.userId = dbUser.id;
     }
     return token;
   }
   ```
2. **`session` Callback**:
   Attaches `session.user.id = token.userId`, ensuring server components (`src/app/page.tsx`), server actions, and API routes always have access to the authenticated user ID.
3. **Personal API Keys**:
   Users generate API keys linked to their own `userId`. When an API request arrives with `Authorization: Bearer kz_live_...`, the system identifies the calling user and resolves their permissions across projects.

---

## 3. Database Schema Design

Three lightweight relational tables are introduced in `src/db/schema.ts` alongside updates to the existing `projects` table:

```
┌─────────────────┐       ┌────────────────────────┐       ┌─────────────────┐
│     users       │       │ project_collaborators  │       │    projects     │
├─────────────────┤       ├────────────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────┤ user_id (FK)           │   ┌──►│ id (PK)         │
│ email           │       │ project_id (FK)        ├───┘   │ owner_id (FK)   │
│ name            │       │ role ('owner'|'editor')│       │ slug            │
│ image           │       │ invited_by (FK)        │       │ name            │
│ provider        │       │ joined_at              │       │ ...             │
└─────────────────┘       └────────────────────────┘       └─────────────────┘
         ▲                                                          ▲
         │                ┌────────────────────────┐                │
         │                │     project_invites    │                │
         │                ├────────────────────────┤                │
         │                │ id (PK)                │                │
         │                │ project_id (FK)        ├────────────────┤
         │                │ code (Unique)          │                │
         │                │ created_by (FK)        │                │
         │                │ is_active              │                │
         │                │ uses_count             │                │
         │                └────────────────────────┘                │
         │                                                          │
         │                ┌────────────────────────┐                │
         │                │ project_access_requests│                │
         │                ├────────────────────────┤                │
         └────────────────┤ user_id (FK)           │                │
                          │ project_id (FK)        ├────────────────┘
                          │ status ('pending' etc) │
                          │ reviewed_by (FK)       │
                          └────────────────────────┘
```

### Drizzle Schema Definitions

```typescript
// 1. Project Collaborators (Membership & Roles)
export const projectCollaborators = pgTable("project_collaborators", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("editor"), // "owner" | "editor"
  invitedBy: text("invited_by").references(() => users.id, { onDelete: "set null" }),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// 2. Shareable Invite Codes / Links
export const projectInvites = pgTable("project_invites", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(), // e.g., "KZ-9X72" or secure token
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").notNull().default(true),
  usesCount: integer("uses_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 3. Project Access Requests
export const projectAccessRequests = pgTable("project_access_requests", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // "pending" | "approved" | "rejected"
  reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
});
```

---

## 4. Permission Model & Security Rules

### Project Permission Helper
```typescript
export async function getProjectPermission(
  projectIdOrSlug: string,
  userId: string
): Promise<{ hasAccess: boolean; role: "owner" | "editor" | null; project: EnrichedProject | null }>
```

### Access Enforcement Matrix
| Operation | Owner | Collaborator (Editor) | Non-Member / Unauthenticated |
| :--- | :---: | :---: | :---: |
| `GET /api/v1/projects` (List) | Own + Joined Projects | Joined Projects | None |
| `GET /api/v1/projects/[slug]` | Full Access | Full Access | 403 Forbidden |
| `PATCH /api/v1/projects/[slug]` (Rename) | Allowed | 403 Forbidden | 403 Forbidden |
| `DELETE /api/v1/projects/[slug]` | Allowed | 403 Forbidden | 403 Forbidden |
| `POST /api/v1/projects/[slug]/invites` | Allowed | 403 Forbidden | 403 Forbidden |
| `GET /access-requests` (Review queue) | Allowed | 403 Forbidden | 403 Forbidden |
| `POST /features` (Create feature) | Allowed | Allowed | 403 Forbidden |
| `PATCH /features/[id]/status` | Allowed | Allowed | 403 Forbidden |

---

## 5. API Endpoints Contract

### 1. Generate / View Invite Link & Code
* **Endpoint**: `POST /api/v1/projects/[projectSlug]/invites`
* **Authorization**: Bearer API Key or Session (Owner Only)
* **Response**:
  ```json
  {
    "ok": true,
    "data": {
      "inviteCode": "KZ-8A91B",
      "inviteUrl": "https://keyzor.vercel.app/join?code=KZ-8A91B",
      "createdAt": "2026-10-26T22:50:00Z"
    }
  }
  ```

### 2. Join Project via Code
* **Endpoint**: `POST /api/v1/projects/join`
* **Body**: `{ "code": "KZ-8A91B" }`
* **Authorization**: Bearer API Key or Session
* **Behavior**: Adds authenticated user as collaborator; returns project metadata.

### 3. Request Access to a Project
* **Endpoint**: `POST /api/v1/projects/[projectSlug]/access-requests`
* **Authorization**: Authenticated user session
* **Behavior**: Submits a pending request. Notifies the owner in the dashboard.

### 4. Review Access Requests (Owner Only)
* **Endpoint**: `PATCH /api/v1/projects/[projectSlug]/access-requests/[requestId]`
* **Body**: `{ "status": "approved" | "rejected" }`
* **Behavior**: If approved, automatically inserts user into `project_collaborators`.

---

## 6. User Interface & Experience Flows

### A. "Share & Collaborate" Modal (Project Owner View)
* Located in the dashboard navigation bar.
* **Tab 1: Collaborator Link & Code**:
  * Copy direct join link (`https://keyzor.vercel.app/join?code=...`)
  * Copy short invite code (`KZ-XXXXX`)
  * Option to rotate or revoke current code.
* **Tab 2: Active Members**:
  * Lists project owner and all collaborators with avatars and join timestamps.
* **Tab 3: Pending Access Requests**:
  * Badge displays number of pending requests (e.g. `Access Requests (2)`).
  * One-click **Approve** and **Deny** buttons.

### B. "Join Project" Modal
* Accessible from the project selector dropdown for all logged-in users.
* Dual input:
  1. **Enter Code**: Paste invite code & click "Join".
  2. **Request Access**: Type project slug & click "Submit Request".

### C. Dedicated `/join` Landing Route
* Route: `src/app/join/page.tsx`
* Handles `?code=KZ-XXXXX`:
  * If logged in: Prompts *"Join [Project Name] as a Collaborator"* with one-click confirmation.
  * If unauthenticated: Offers GitHub / Google OAuth sign-in, redirecting immediately back to complete the join flow.

---

## 7. Delivery Plan & Milestones

1. **Phase 1: Identity & NextAuth Session Bridge**
   - Update `src/auth.ts` with database upsert callbacks.
   - Attach verified `userId` to `session.user.id`.
2. **Phase 2: Database Migration & Lifecycle Permissions**
   - Implement `project_collaborators`, `project_invites`, and `project_access_requests` in `src/db/schema.ts` and `src/db/index.ts`.
   - Update `lifecycle-service.ts` with permission-aware queries and role enforcement.
3. **Phase 3: Sharing & Collaboration API Routes**
   - Implement invite generation, joining by code, access requests, and owner-only rename/delete guards.
4. **Phase 4: Dashboard UI & Join Page**
   - Build the enhanced Share & Collaborate modal, Join Project dialog, and `/join` page.
5. **Phase 5: Agent Multi-User Verification**
   - Test automated stage transitions with different user API keys, verifying audit trail accuracy.
