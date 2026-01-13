# Google Classroom Integration - Technical Guide

> Complete technical reference for the Google Classroom integration in UbuMaths.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Authentication (OAuth 2.0 + PKCE)](#authentication-oauth-20--pkce)
4. [Security & Encryption](#security--encryption)
5. [Google Classroom API Client](#google-classroom-api-client)
6. [Synchronization System](#synchronization-system)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [UI Components](#ui-components)
10. [TypeScript Types](#typescript-types)
11. [Configuration](#configuration)
12. [Usage Examples](#usage-examples)
13. [Troubleshooting](#troubleshooting)

---

## Overview

The Google Classroom integration allows teachers to:

- Connect their Google account to UbuMaths
- Sync courses, topics, coursework, and materials from Google Classroom
- Share synced content with their UbuMaths classes
- Organize shared content with categories (Cours, Exercices, Devoirs, etc.)
- Control visibility of shared content per class or per student

### Key Features

| Feature               | Description                                       |
| --------------------- | ------------------------------------------------- |
| OAuth 2.0 + PKCE      | Secure authentication flow with enhanced security |
| Encrypted tokens      | AES-256-GCM encryption for token storage          |
| Full sync             | Courses, topics, coursework, and materials        |
| Selective sharing     | Share specific items with specific classes        |
| Category organization | Teacher-defined categories for coursework         |
| Visibility control    | Toggle visibility, per-student restrictions       |

### File Structure

```
src/lib/server/google/
├── oauth.ts           # OAuth 2.0 implementation
├── encryption.ts      # AES-256-GCM token encryption
├── classroom-api.ts   # Google Classroom API client
├── drive-api.ts       # Google Drive API client
├── gmail.ts           # Gmail API (email sending)
├── sync.ts            # Sync orchestration
├── schemas.ts         # Zod validation schemas
├── errors.ts          # Custom error classes
├── utils.ts           # Data parsing utilities
└── index.ts           # Module exports

src/routes/api/google/
├── auth/              # Authentication endpoints
├── sync/              # Sync trigger
├── courses/           # Course operations
├── coursework/        # Coursework sharing
├── materials/         # Material sharing
├── shared-coursework/ # Shared coursework management
├── shared-materials/  # Shared materials management
└── topics/            # Topic listing

src/lib/components/google/
└── *.svelte           # Share/manage dialogs
```

---

## Architecture

### Data Flow

```
                    ┌─────────────────────────────────────┐
                    │      Google Cloud Platform          │
                    │  ┌─────────────────────────────┐    │
                    │  │   Google Classroom API      │    │
                    │  │   Google Drive API          │    │
                    │  │   Gmail API                 │    │
                    │  └─────────────────────────────┘    │
                    └───────────────┬─────────────────────┘
                                    │ OAuth 2.0 + PKCE
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                      UbuMaths Server                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  src/lib/server/google/                              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│  │  │   oauth.ts  │  │ encryption  │  │ classroom   │   │   │
│  │  │   (PKCE)    │  │   (AES)     │  │   api.ts    │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│  │  │   sync.ts   │  │  errors.ts  │  │  utils.ts   │   │   │
│  │  │   (sync)    │  │  (errors)   │  │  (parse)    │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│                              │                              │
│                              ▼                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    Supabase                          │   │
│  │  google_integrations  │  google_classroom_courses    │   │
│  │  google_classroom_coursework │ google_classroom_topics│  │
│  │  google_classroom_materials │ shared_coursework      │   │
│  │  shared_materials     │ coursework_materials         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
        ┌─────────────────────────────────────────┐
        │            Frontend (Svelte 5)          │
        │  /dashboard/teacher/google              │
        │  /dashboard/teacher/settings/google     │
        │  ShareCourseworkDialog.svelte           │
        │  ShareMaterialDialog.svelte             │
        └─────────────────────────────────────────┘
```

### Integration Points

| Component  | UbuMaths Feature                                 |
| ---------- | ------------------------------------------------ |
| Classes    | Share coursework to UbuMaths classes             |
| Students   | View shared coursework in student dashboard      |
| Categories | Organize shared content (Cours, Exercices, etc.) |
| Profiles   | Teacher authentication and permissions           |

---

## Authentication (OAuth 2.0 + PKCE)

### OAuth Scopes Requested

```typescript
// src/lib/server/google/oauth.ts
export const GOOGLE_CLASSROOM_SCOPES = [
	'openid', // User info (sub, email)
	'email', // User email
	'profile', // User profile
	'https://www.googleapis.com/auth/classroom.courses.readonly', // Courses
	'https://www.googleapis.com/auth/classroom.topics.readonly', // Topics
	'https://www.googleapis.com/auth/classroom.coursework.students.readonly', // Coursework
	'https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly', // Materials
	'https://www.googleapis.com/auth/drive.file', // Drive (app-created only)
	'https://www.googleapis.com/auth/gmail.send' // Gmail (sending emails)
];
```

### PKCE Flow (Proof Key for Code Exchange)

PKCE adds an extra layer of security to the OAuth flow:

```
1. Generate code_verifier (64 random chars)
2. Generate code_challenge = SHA256(code_verifier) base64url
3. Send code_challenge with authorization request
4. Exchange code + code_verifier for tokens
5. Google verifies SHA256(code_verifier) === code_challenge
```

### Implementation

```typescript
// src/lib/server/google/oauth.ts

// Generate random PKCE code verifier (43-128 characters)
function generateCodeVerifier(): string {
	const length = 64;
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
	let verifier = '';
	const randomBytes = crypto.getRandomValues(new Uint8Array(length));
	for (let i = 0; i < length; i++) {
		verifier += possible.charAt(randomBytes[i] % possible.length);
	}
	return verifier;
}

// Generate code challenge from verifier using SHA-256
async function generateCodeChallenge(verifier: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(verifier);
	const hash = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hash));
	const base64 = btoa(String.fromCharCode(...hashArray));
	return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
```

### Authentication Flow

```
Teacher clicks "Connect Google"
          │
          ▼
POST /api/google/auth/connect
          │
          ├─── Generate PKCE (code_verifier, code_challenge)
          ├─── Generate CSRF state token
          ├─── Store code_verifier + state in httpOnly cookies
          │
          ▼
Redirect to Google OAuth consent screen
          │
          ▼
User authorizes UbuMaths
          │
          ▼
GET /api/google/auth/callback?code=...&state=...
          │
          ├─── Verify CSRF state token
          ├─── Exchange code + code_verifier for tokens
          ├─── Encrypt access_token & refresh_token
          ├─── Store encrypted tokens in google_integrations
          │
          ▼
Redirect to /dashboard/teacher/settings/google
```

### Key Functions

| Function                                    | Description                           |
| ------------------------------------------- | ------------------------------------- |
| `getAuthUrl(state?)`                        | Generate OAuth URL with PKCE          |
| `exchangeCodeForTokens(code, codeVerifier)` | Exchange auth code for tokens         |
| `refreshAccessToken(refreshToken)`          | Get new access token                  |
| `revokeAccess(token)`                       | Revoke Google OAuth access            |
| `validateToken(accessToken)`                | Validate and get token info           |
| `shouldRefreshToken(tokenExpiry)`           | Check if token needs refresh (<5 min) |

---

## Security & Encryption

### AES-256-GCM Token Encryption

Tokens are encrypted server-side before database storage:

```typescript
// src/lib/server/google/encryption.ts

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

// Encrypted token format:
// Base64( IV[16 bytes] + AuthTag[16 bytes] + EncryptedData[variable] )
```

### Encryption Process

```
                    Plain Token
                         │
                         ▼
              ┌──────────────────────┐
              │  Generate random IV  │
              │     (16 bytes)       │
              └──────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  AES-256-GCM Encrypt │
              │  with key + IV       │
              └──────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Get Auth Tag        │
              │  (integrity check)   │
              └──────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Combine:            │
              │  IV + AuthTag + Data │
              └──────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Base64 encode       │
              │  for DB storage      │
              └──────────────────────┘
                         │
                         ▼
                  Encrypted Token
```

### Key Functions

```typescript
// Encrypt token for storage
encryptToken(token: string): string

// Decrypt token for API calls
decryptToken(encryptedToken: string): string

// Hash token for comparison (one-way)
hashToken(token: string): string

// Validate encryption key is configured
validateEncryptionKey(): boolean

// Test encryption roundtrip
testEncryption(): boolean
```

### Security Checklist

- [x] OAuth 2.0 with PKCE (not implicit flow)
- [x] Tokens encrypted AES-256-GCM before storage
- [x] Automatic token refresh 5 min before expiry
- [x] CSRF protection via state parameter
- [x] httpOnly, secure, sameSite cookies
- [x] Role-based access control (teacher only)
- [x] Row-level security (RLS) on all tables
- [x] Zod validation on all inputs
- [x] No token leakage in error messages
- [x] Rate limit handling with backoff

---

## Google Classroom API Client

### Class: GoogleClassroomClient

```typescript
// src/lib/server/google/classroom-api.ts

class GoogleClassroomClient {
	constructor(accessToken: string, teacherId: string);

	// Courses
	async listCourses(options?: ListCoursesOptions): Promise<GoogleCourseList>;
	async getCourse(courseId: string): Promise<GoogleCourse>;

	// Coursework
	async listCoursework(
		courseId: string,
		options?: ListCourseworkOptions
	): Promise<GoogleCourseworkList>;
	async getCoursework(courseId: string, courseworkId: string): Promise<GoogleCoursework>;
	async getCourseworkMaterials(courseId: string, courseworkId: string): Promise<GoogleMaterial[]>;
	async listAllCoursework(): Promise<Map<string, GoogleCoursework[]>>;

	// Topics
	async listTopics(courseId: string): Promise<GoogleTopicList>;

	// Materials (non-graded)
	async listCourseWorkMaterials(
		courseId: string,
		options?: ListCourseworkMaterialOptions
	): Promise<GoogleCourseWorkMaterialList>;
}
```

### Options Interfaces

```typescript
interface ListCoursesOptions {
	pageSize?: number; // 1-100
	pageToken?: string; // Pagination
	courseStates?: CourseState[]; // Filter by state
}

interface ListCourseworkOptions {
	pageSize?: number;
	pageToken?: string;
	orderBy?: string; // e.g., "updateTime desc"
	courseWorkStates?: CourseworkState[]; // PUBLISHED, DRAFT, DELETED
}

interface ListCourseworkMaterialOptions {
	pageSize?: number;
	pageToken?: string;
	orderBy?: string;
	courseWorkMaterialStates?: CourseworkState[];
}
```

### Error Handling

```typescript
// src/lib/server/google/errors.ts

class GoogleAPIError extends Error {
	statusCode: number;
	errorCode?: string;
}

class GoogleTokenExpiredError extends GoogleAPIError {} // 401
class GoogleRateLimitError extends GoogleAPIError {
	// 429
	retryAfter?: number;
}
class GoogleInsufficientPermissionsError extends GoogleAPIError {} // 403
class GoogleNotFoundError extends GoogleAPIError {} // 404
```

### Retry Logic

```typescript
// Automatic retry with exponential backoff for rate limits (429)
// Max 3 retries
// calculateBackoff(attempt): 2s, 4s, 8s

// Server errors (500-504): retry once after 2s
```

---

## Synchronization System

### Full Sync Workflow

```typescript
// src/lib/server/google/sync.ts

fullSync(teacherId, supabase):
  │
  ├── getTeacherAccessToken()
  │     ├── Fetch from google_integrations
  │     ├── Check if token expired (< 5 min)
  │     ├── If expired: refreshAccessToken() + update database
  │     └── Return decrypted access token
  │
  ├── syncTeacherCourses()
  │     ├── Fetch all ACTIVE courses from Google
  │     ├── Upsert to google_classroom_courses
  │     ├── Delete removed/archived courses
  │     └── Return synced count
  │
  └── For each course:
        │
        ├── syncTopics()
        │     ├── Fetch topics from Google
        │     ├── Upsert to google_classroom_topics
        │     └── Delete removed topics
        │
        ├── syncCoursework()
        │     ├── Fetch all coursework (PUBLISHED, DRAFT)
        │     ├── Upsert to google_classroom_coursework
        │     ├── Extract and store materials
        │     └── Link to topics via topic_id
        │
        └── syncCourseWorkMaterials()
              ├── Fetch materials (PUBLISHED only)
              ├── Upsert to google_classroom_materials
              ├── Extract and store attachments
              └── Link to topics via topic_id
```

### Sync Functions

| Function                    | Description                            |
| --------------------------- | -------------------------------------- |
| `getTeacherAccessToken()`   | Get/refresh access token               |
| `syncTeacherCourses()`      | Sync all courses                       |
| `syncTopics()`              | Sync topics for a course               |
| `syncCoursework()`          | Sync coursework for a course           |
| `syncCourseWorkMaterials()` | Sync materials for a course            |
| `fullSync()`                | Complete sync (all data)               |
| `syncSingleCourse()`        | Sync one specific course               |
| `hasValidIntegration()`     | Check if teacher has valid integration |

### Sync Result Types

```typescript
interface SyncResult {
	synced: number; // Number of items synced
	errors: string[]; // Error messages
}

interface FullSyncResult {
	coursesSynced: number;
	topicsSynced: number;
	courseworkSynced: number;
	materialsSynced: number;
	errors: string[];
}
```

---

## Database Schema

### Tables Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        google_integrations                          │
│  OAuth tokens (encrypted), scopes, google_email, last_sync_at       │
│  PK: id  │  UNIQUE: teacher_id                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     google_classroom_courses                        │
│  Synced courses from Google Classroom                               │
│  PK: id  │  UNIQUE: (teacher_id, google_course_id)                  │
└─────────────────────────────────────────────────────────────────────┘
            │ 1:N                              │ 1:N
            ▼                                  ▼
┌───────────────────────────────┐  ┌───────────────────────────────┐
│  google_classroom_topics      │  │  google_classroom_coursework  │
│  Topics/Rubriques             │  │  Graded assignments           │
│  UNIQUE: (course_id, topic_id)│  │  UNIQUE: (course_id, cw_id)   │
└───────────────────────────────┘  └───────────────────────────────┘
            │ 1:N                              │ 1:N
            ▼                                  ▼
┌───────────────────────────────┐  ┌───────────────────────────────┐
│  google_classroom_materials   │  │    coursework_materials       │
│  Non-graded materials         │  │  Attachments (files, links)   │
│  UNIQUE: (course_id, mat_id)  │  │  FK: coursework_id            │
└───────────────────────────────┘  └───────────────────────────────┘
            │                                  │
            │                                  │
            └──────────────┬───────────────────┘
                           │ (sharing)
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   shared_coursework / shared_materials              │
│  Track what's shared with which UbuMaths classes                    │
│  + visibility, category, description_override                       │
│  UNIQUE: (coursework_id/material_id, class_id)                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Table: google_integrations

```sql
CREATE TABLE google_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,     -- Encrypted by Node.js AES-256-GCM
    refresh_token TEXT NOT NULL,    -- Encrypted by Node.js AES-256-GCM
    token_expiry TIMESTAMPTZ NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    google_email TEXT NOT NULL,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: google_classroom_courses

```sql
CREATE TABLE google_classroom_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    google_course_id TEXT NOT NULL,
    name TEXT NOT NULL,
    section TEXT,
    description_heading TEXT,
    room TEXT,
    enrollment_code TEXT,
    alternate_link TEXT,
    course_state TEXT NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, ARCHIVED, PROVISIONED, DECLINED, SUSPENDED
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_teacher_google_course UNIQUE(teacher_id, google_course_id)
);
```

### Table: google_classroom_topics

```sql
CREATE TABLE google_classroom_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_course_id UUID NOT NULL REFERENCES google_classroom_courses(id) ON DELETE CASCADE,
    google_topic_id TEXT NOT NULL,
    name TEXT NOT NULL CHECK (char_length(name) <= 100),
    updated_time TIMESTAMPTZ NOT NULL,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_topic_per_course UNIQUE(google_course_id, google_topic_id)
);
```

### Table: google_classroom_coursework

```sql
CREATE TABLE google_classroom_coursework (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_course_id UUID NOT NULL REFERENCES google_classroom_courses(id) ON DELETE CASCADE,
    google_coursework_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    coursework_type TEXT NOT NULL,   -- ASSIGNMENT, SHORT_ANSWER_QUESTION, MULTIPLE_CHOICE_QUESTION
    state TEXT NOT NULL,             -- PUBLISHED, DRAFT, DELETED
    due_date DATE,
    due_time TIME,
    created_time TIMESTAMPTZ NOT NULL,
    updated_time TIMESTAMPTZ NOT NULL,
    max_points NUMERIC(10, 2),
    work_type TEXT NOT NULL DEFAULT 'ASSIGNMENT',
    alternate_link TEXT,
    topic_id UUID REFERENCES google_classroom_topics(id) ON DELETE SET NULL,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_coursework_per_course UNIQUE(google_course_id, google_coursework_id)
);
```

### Table: google_classroom_materials

```sql
CREATE TABLE google_classroom_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_course_id UUID NOT NULL REFERENCES google_classroom_courses(id) ON DELETE CASCADE,
    google_material_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    state TEXT NOT NULL CHECK (state IN ('PUBLISHED', 'DRAFT', 'DELETED')),
    topic_id UUID REFERENCES google_classroom_topics(id) ON DELETE SET NULL,
    created_time TIMESTAMPTZ NOT NULL,
    updated_time TIMESTAMPTZ NOT NULL,
    alternate_link TEXT,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_material_per_course UNIQUE(google_course_id, google_material_id)
);
```

### Table: coursework_materials (Attachments)

```sql
CREATE TABLE coursework_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coursework_id UUID NOT NULL REFERENCES google_classroom_coursework(id) ON DELETE CASCADE,
    material_type TEXT NOT NULL,   -- DRIVE_FILE, YOUTUBE_VIDEO, LINK, FORM
    google_file_id TEXT,
    file_name TEXT NOT NULL,
    mime_type TEXT,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    title TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table: shared_coursework

```sql
CREATE TABLE shared_coursework (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coursework_id UUID NOT NULL REFERENCES google_classroom_coursework(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    category_id UUID REFERENCES coursework_categories(id) ON DELETE SET NULL,
    shared_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    visible BOOLEAN NOT NULL DEFAULT true,
    description_override TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_coursework_per_class UNIQUE(coursework_id, class_id)
);
```

### Table: coursework_categories

```sql
CREATE TABLE coursework_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,              -- e.g., "Cours", "Exercices"
    icon TEXT,                       -- Emoji
    color TEXT,                      -- Hex color (#3B82F6)
    display_order INTEGER NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_category_per_class UNIQUE(class_id, name)
);
```

### Row-Level Security (RLS)

All tables have RLS enabled with policies:

| Role    | Access                                               |
| ------- | ---------------------------------------------------- |
| Teacher | CRUD on own data (own teacher_id)                    |
| Student | SELECT on shared visible coursework in their classes |
| Admin   | SELECT on all data (for support)                     |

### Database Views

```sql
-- student_coursework_view: Simplified view for students
-- Shows visible, published coursework with category info
-- Automatically filters by visibility and student restrictions
```

### Database Functions

```sql
-- initialize_default_categories(class_id)
-- Creates default categories: Cours, Exercices, Corrections, Devoirs, Evaluations
-- Called when linking class to Google Classroom
```

---

## API Endpoints

### Authentication Endpoints

| Endpoint                      | Method | Description             |
| ----------------------------- | ------ | ----------------------- |
| `/api/google/auth/connect`    | POST   | Start OAuth flow        |
| `/api/google/auth/callback`   | GET    | OAuth callback handler  |
| `/api/google/auth/status`     | GET    | Check connection status |
| `/api/google/auth/disconnect` | DELETE | Revoke Google access    |

### Sync Endpoint

| Endpoint           | Method | Description       |
| ------------------ | ------ | ----------------- |
| `/api/google/sync` | POST   | Trigger full sync |

### Course Endpoints

| Endpoint                               | Method | Description         |
| -------------------------------------- | ------ | ------------------- |
| `/api/google/courses`                  | GET    | List synced courses |
| `/api/google/courses/[courseId]`       | GET    | Get course details  |
| `/api/google/courses/[courseId]/share` | POST   | Share coursework    |
| `/api/google/courses/[courseId]/share` | DELETE | Unshare coursework  |

### Coursework Sharing Endpoints

| Endpoint                             | Method | Description            |
| ------------------------------------ | ------ | ---------------------- |
| `/api/google/coursework/bulk-share`  | POST   | Bulk share coursework  |
| `/api/google/shared-coursework`      | GET    | List shared coursework |
| `/api/google/shared-coursework`      | POST   | Share coursework       |
| `/api/google/shared-coursework`      | DELETE | Bulk unshare           |
| `/api/google/shared-coursework/[id]` | GET    | Get shared item        |
| `/api/google/shared-coursework/[id]` | PATCH  | Update shared item     |
| `/api/google/shared-coursework/[id]` | DELETE | Delete shared item     |

### Materials Sharing Endpoints

| Endpoint                            | Method | Description            |
| ----------------------------------- | ------ | ---------------------- |
| `/api/google/materials/[id]/share`  | POST   | Share material         |
| `/api/google/materials/[id]/share`  | DELETE | Unshare material       |
| `/api/google/materials/bulk-share`  | POST   | Bulk share materials   |
| `/api/google/shared-materials`      | GET    | List shared materials  |
| `/api/google/shared-materials`      | POST   | Share material         |
| `/api/google/shared-materials`      | DELETE | Bulk unshare           |
| `/api/google/shared-materials/[id]` | GET    | Get shared material    |
| `/api/google/shared-materials/[id]` | PATCH  | Update shared material |
| `/api/google/shared-materials/[id]` | DELETE | Delete shared material |

### Topics Endpoint

| Endpoint             | Method | Description              |
| -------------------- | ------ | ------------------------ |
| `/api/google/topics` | GET    | List topics for a course |

---

## UI Components

### Component Files

```
src/lib/components/google/
├── ShareCourseworkDialog.svelte         # Share single coursework
├── ShareCourseworkBulkDialog.svelte     # Share one coursework to multiple classes
├── ShareMultipleCourseworkDialog.svelte # Share multiple coursework to classes
├── ManageSharedCourseworkDialog.svelte  # Edit shared coursework settings
├── ShareMaterialDialog.svelte           # Share single material
├── ShareMultipleMaterialsDialog.svelte  # Bulk share materials
├── ManageSharedMaterialDialog.svelte    # Edit shared material settings
└── UnshareTopicMaterialsDialog.svelte   # Batch unshare materials by topic
```

### Common Props Pattern

```svelte
<ShareCourseworkDialog
	bind:open={dialogOpen}
	coursework={selectedCoursework}
	classes={teacherClasses}
	categories={availableCategories}
	onSuccess={() => refreshList()}
/>
```

### Teacher Dashboard Pages

| Route                                | Purpose                         |
| ------------------------------------ | ------------------------------- |
| `/dashboard/teacher/google`          | Main Google Classroom browser   |
| `/dashboard/teacher/settings/google` | Connect/disconnect, sync status |

---

## TypeScript Types

### OAuth Types

```typescript
// src/lib/types/google.ts

interface GoogleOAuthTokenResponse {
	access_token: string;
	expires_in: number;
	refresh_token?: string; // Only on first authorization
	scope: string;
	token_type: 'Bearer';
}

interface GoogleTokenInfo {
	azp: string; // Authorized party (client ID)
	aud: string; // Audience (client ID)
	sub: string; // Subject (user ID)
	scope: string;
	exp: string; // Expiration timestamp
	expires_in: string;
	email?: string;
	email_verified?: string;
}
```

### Google Classroom Types

```typescript
interface GoogleCourse {
	id: string;
	name: string;
	section?: string;
	descriptionHeading?: string;
	description?: string;
	room?: string;
	ownerId: string;
	creationTime: string;
	updateTime: string;
	enrollmentCode?: string;
	courseState: CourseState;
	alternateLink: string;
	teacherFolder?: { id: string; title?: string; alternateLink?: string };
}

interface GoogleCoursework {
	id: string;
	courseId: string;
	title: string;
	description?: string;
	materials?: GoogleMaterial[];
	state: CourseworkState;
	alternateLink?: string;
	creationTime: string;
	updateTime: string;
	dueDate?: { year: number; month: number; day: number };
	dueTime?: { hours?: number; minutes?: number };
	maxPoints?: number;
	workType: WorkType;
	topicId?: string;
}

interface GoogleTopic {
	courseId: string;
	topicId: string;
	name: string;
	updateTime: string;
}

interface GoogleCourseWorkMaterial {
	id: string;
	courseId: string;
	title: string;
	description?: string;
	materials?: GoogleMaterial[];
	state: CourseworkState;
	alternateLink?: string;
	creationTime: string;
	updateTime: string;
	topicId?: string;
}

interface GoogleMaterial {
	driveFile?: { id?: string; title?: string; alternateLink?: string; thumbnailUrl?: string };
	youtubeVideo?: { id: string; title: string; alternateLink: string; thumbnailUrl?: string };
	link?: { url: string; title?: string; thumbnailUrl?: string };
	form?: { formUrl: string; title?: string; thumbnailUrl?: string; responseUrl?: string };
}
```

### Enums

```typescript
type CourseState = 'ACTIVE' | 'ARCHIVED' | 'PROVISIONED' | 'DECLINED' | 'SUSPENDED';
type CourseworkState = 'PUBLISHED' | 'DRAFT' | 'DELETED';
type WorkType = 'ASSIGNMENT' | 'SHORT_ANSWER_QUESTION' | 'MULTIPLE_CHOICE_QUESTION';
type MaterialType = 'DRIVE_FILE' | 'YOUTUBE_VIDEO' | 'LINK' | 'FORM';
```

### Helper Functions

```typescript
// Extract material type from GoogleMaterial
getMaterialType(material: GoogleMaterial): MaterialType | null

// Get material URL (Drive, YouTube, Link, or Form URL)
getMaterialUrl(material: GoogleMaterial): string | null

// Get material title
getMaterialTitle(material: GoogleMaterial): string

// Get thumbnail URL
getMaterialThumbnail(material: GoogleMaterial): string | null
```

---

## Configuration

### Required Environment Variables

```env
# Google OAuth Credentials (from Google Cloud Console)
GOOGLE_CLASSROOM_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLASSROOM_CLIENT_SECRET=your-client-secret

# OAuth Redirect URI (must match Google Cloud Console)
GOOGLE_CLASSROOM_REDIRECT_URI=https://your-domain.com/api/google/auth/callback

# Token Encryption Key (generate with: openssl rand -base64 32)
GOOGLE_TOKEN_ENCRYPTION_KEY=your-32-character-minimum-encryption-key

# App URL (for OAuth redirect)
PUBLIC_APP_URL=https://your-domain.com
```

### Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable APIs:
   - Google Classroom API
   - Google Drive API
   - Gmail API
4. Configure OAuth consent screen:
   - User Type: External (or Internal for Workspace)
   - App name: UbuMaths
   - Scopes: Add the required scopes
5. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `https://your-domain.com/api/google/auth/callback`

### Generate Encryption Key

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Using OpenSSL
openssl rand -base64 32
```

---

## Usage Examples

### Connect Google Account

```typescript
// Frontend: Initiate OAuth flow
const response = await fetch('/api/google/auth/connect', {
	method: 'POST'
});
const { authUrl } = await response.json();
window.location.href = authUrl;
```

### Trigger Sync

```typescript
// Trigger full sync
const response = await fetch('/api/google/sync', {
	method: 'POST'
});
const result = await response.json();
// { coursesSynced: 5, topicsSynced: 12, courseworkSynced: 45, materialsSynced: 23, errors: [] }
```

### Share Coursework

```typescript
// Share coursework with a class
const response = await fetch(`/api/google/courses/${courseId}/share`, {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({
		courseworkId: 'uuid-here',
		classId: 'class-uuid',
		categoryId: 'category-uuid', // optional
		visible: true,
		customDescription: 'Teacher notes' // optional
	})
});
```

### Get Shared Coursework (Teacher)

```typescript
const response = await fetch('/api/google/shared-coursework?classId=uuid');
const { data, pagination } = await response.json();
```

### Server-Side: Get Access Token

```typescript
import { getTeacherAccessToken } from '$lib/server/google/sync';

const accessToken = await getTeacherAccessToken(teacherId, supabase);
const client = new GoogleClassroomClient(accessToken, teacherId);
const courses = await client.listCourses({ courseStates: ['ACTIVE'] });
```

---

## Troubleshooting

### Common Issues

#### Token Refresh Failures

**Symptom**: "Refresh token is invalid or revoked"

**Causes**:

- User revoked access in Google Account settings
- Token expired after long inactivity
- OAuth app credentials changed

**Solution**:

1. User must disconnect and reconnect their Google account
2. Check Google Cloud Console for credential changes

#### Rate Limit Errors

**Symptom**: `GoogleRateLimitError` (429)

**Solution**:

- Automatic retry with exponential backoff (2s, 4s, 8s)
- If persistent, reduce sync frequency
- Check Google Classroom API quotas

#### Missing Scopes

**Symptom**: `GoogleInsufficientPermissionsError` (403)

**Solution**:

1. Check that all required scopes are requested
2. User may need to re-authorize with `prompt: 'consent'`
3. Verify OAuth consent screen includes all scopes

#### Encryption Key Issues

**Symptom**: "Failed to decrypt token"

**Causes**:

- Encryption key changed after tokens were stored
- Key not properly configured

**Solution**:

1. Verify `GOOGLE_TOKEN_ENCRYPTION_KEY` is set
2. Key must be at least 32 characters
3. If key changed, users must reconnect

### Debug Logging

```typescript
// Sync service logs to console with [Sync] prefix
[Sync] Starting full sync for teacher abc123
[Sync] Refreshing expired token for teacher abc123
[Sync] Fetched 5 active courses for teacher abc123
[Sync] Synced 3/5 courses for teacher abc123

// Classroom API logs rate limits
[GoogleClassroomClient] Rate limit hit for teacher abc123. Retrying in 2000ms (attempt 1/3)
```

### Health Check

```typescript
// Test encryption configuration
import { testEncryption, validateEncryptionKey } from '$lib/server/google/encryption';

validateEncryptionKey(); // Throws if key not configured
testEncryption(); // Throws if encrypt/decrypt fails
```

---

## Related Documentation

- [Google Classroom API Reference](https://developers.google.com/classroom/reference/rest)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [UbuMaths Database Schema](../../architecture/database-schema.md)
- [Supabase RLS Policies](../../claude/database.md)

---

## Migration History

| Migration                                              | Date       | Description      |
| ------------------------------------------------------ | ---------- | ---------------- |
| `20251114150000_google_classroom_integration.sql`      | 2025-11-14 | Initial schema   |
| `20251115160000_fix_google_classroom_courses_rls.sql`  | 2025-11-15 | RLS policy fixes |
| `20251115181000_create_google_classroom_topics.sql`    | 2025-11-15 | Topics table     |
| `20251115182000_create_google_classroom_materials.sql` | 2025-11-15 | Materials table  |

---

_Last updated: January 2025_
