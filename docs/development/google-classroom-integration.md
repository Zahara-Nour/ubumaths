# Google Classroom Integration - Developer Guide

**Status**: ✅ Production
**Last Updated**: 2025-11-15
**Implementation**: Phases 1-7 Complete

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [API Integration](#api-integration)
5. [Sync Logic](#sync-logic)
6. [Frontend Components](#frontend-components)
7. [Security Model](#security-model)
8. [Testing Guide](#testing-guide)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### Purpose

The Google Classroom Integration enables teachers to:

1. Connect their personal Google account via OAuth 2.0 + PKCE
2. Sync courses, topics, coursework, and course work materials from Google Classroom
3. Share educational materials with UbuMaths classes
4. Organize materials by Google Topics OR UbuMaths Categories (hybrid pattern)

### Implementation Phases

| Phase       | Feature                        | Status      | Files                              |
| ----------- | ------------------------------ | ----------- | ---------------------------------- |
| **Phase 1** | Database Schema (5 migrations) | ✅ Complete | `supabase/migrations/202511151*`   |
| **Phase 2** | OAuth + API Clients            | ✅ Complete | `src/lib/server/google/*.ts`       |
| **Phase 3** | Sync Logic                     | ✅ Complete | `src/lib/server/google/sync.ts`    |
| **Phase 4** | API Endpoints                  | ✅ Complete | `src/routes/api/google/**/*.ts`    |
| **Phase 5** | Teacher UI                     | ✅ Complete | Dashboard + ShareMaterialDialog    |
| **Phase 6** | Student UI                     | ✅ Complete | `/dashboard/student/materials`     |
| **Phase 7** | Tests & Validation             | ✅ Complete | 76 validation tests (100% passing) |

### Key Design Decisions

1. **Strategic Denormalization**: `course_name` and `teacher_name` in `shared_materials` to avoid RLS circular dependency
2. **Hybrid Organization**: Teachers choose per-class between Google Topics OR UbuMaths Categories
3. **Metadata Only**: Files stay in Google Drive (no duplication)
4. **Manual Sync**: Teachers trigger sync explicitly (no automatic background jobs)
5. **Teacher-Owned Materials**: Each teacher syncs their own Google Classroom data

---

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GOOGLE CLASSROOM API                         │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ OAuth 2.0 + PKCE
                           │
         ┌─────────────────▼─────────────────┐
         │  Teacher Authorization Flow       │
         │  1. Generate PKCE challenge        │
         │  2. Redirect to Google consent     │
         │  3. Exchange code for tokens       │
         │  4. Encrypt & store tokens         │
         └─────────────────┬─────────────────┘
                           │
         ┌─────────────────▼─────────────────┐
         │    Sync Service (Manual Trigger)  │
         │  1. Decrypt access token           │
         │  2. Auto-refresh if expired        │
         │  3. Call Google Classroom API      │
         │  4. Upsert to Supabase             │
         │  5. Cleanup deleted items          │
         └─────────────────┬─────────────────┘
                           │
         ┌─────────────────▼─────────────────┐
         │        Supabase PostgreSQL         │
         │                                    │
         │  ┌──────────────────────────────┐ │
         │  │ google_integrations (tokens)  │ │
         │  └──────────────────────────────┘ │
         │  ┌──────────────────────────────┐ │
         │  │ google_classroom_courses      │ │
         │  └──────────────────────────────┘ │
         │  ┌──────────────────────────────┐ │
         │  │ google_classroom_topics       │ │
         │  └──────────────────────────────┘ │
         │  ┌──────────────────────────────┐ │
         │  │ google_classroom_materials    │ │
         │  └──────────────────────────────┘ │
         │  ┌──────────────────────────────┐ │
         │  │ material_attachments          │ │
         │  └──────────────────────────────┘ │
         │  ┌──────────────────────────────┐ │
         │  │ shared_materials (➕ denorm)  │ │
         │  └──────────────────────────────┘ │
         │                                    │
         │  RLS Policies: 28                  │
         │  Triggers: 4 (denormalization)     │
         └─────────────────┬─────────────────┘
                           │
         ┌─────────────────▼─────────────────┐
         │         UbuMaths Frontend          │
         │                                    │
         │  Teacher:                          │
         │  - Google Classroom Dashboard      │
         │  - Sync button                     │
         │  - ShareMaterialDialog             │
         │  - Material browser                │
         │                                    │
         │  Student:                          │
         │  - /dashboard/student/materials    │
         │  - Filters (class/category/topic)  │
         │  - Pagination (20/page)            │
         └────────────────────────────────────┘
```

### Component Interaction

```typescript
// Teacher Workflow
1. Click "Sync Google Classroom"
   → POST /api/google/sync
   → fullSync(teacherId, supabase)
   → syncTeacherCourses()
   → For each course: syncTopics() + syncCourseWorkMaterials()

2. Click "Share" on a material
   → Open ShareMaterialDialog
   → Select classes + choose Topics/Categories
   → POST /api/google/materials/[id]/share
   → Insert into shared_materials (triggers populate course_name/teacher_name)

// Student Workflow
1. Navigate to /dashboard/student/materials
   → +page.server.ts loads shared materials with filters
   → RLS policies enforce: visible=true AND student in class
   → Grouped by category/topic in UI
   → Pagination (20 per page)

2. Click attachment
   → Opens Google Drive/YouTube/external link in new tab
   → No download/storage in UbuMaths
```

---

## Database Schema

### Tables Overview

| Table                                   | Purpose                 | Key Fields                                                                            | Special Features                         |
| --------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------- |
| `google_integrations`                   | OAuth tokens            | `access_token`, `refresh_token`, `token_expiry`                                       | AES-256-GCM encrypted                    |
| `google_classroom_courses`              | Synced courses          | `google_course_id`, `name`, `course_state`                                            | One per teacher per Google course        |
| `google_classroom_topics`               | Topics for organization | `google_topic_id`, `name`                                                             | Links to materials/coursework            |
| `google_classroom_materials`            | Non-graded materials    | `google_material_id`, `title`, `state`, `topic_id`                                    | PUBLISHED only synced                    |
| `google_classroom_material_attachments` | Files/links             | `material_type`, `file_url`, `thumbnail_url`                                          | 4 types: DRIVE_FILE, YOUTUBE, LINK, FORM |
| `shared_materials`                      | Sharing with classes    | `material_id`, `class_id`, `category_id`, `topic_id`, `course_name`★, `teacher_name`★ | ★ Denormalized fields                    |

### Strategic Denormalization

**Problem**: RLS circular dependency when students query `shared_materials` → `google_classroom_materials` → `google_classroom_courses` (RLS blocks access to courses).

**Solution**: Denormalize `course_name` and `teacher_name` in `shared_materials`.

#### Triggers Maintaining Consistency

```sql
-- 1. Auto-populate on INSERT (BEFORE INSERT)
CREATE TRIGGER trigger_populate_shared_material_names
BEFORE INSERT ON shared_materials
FOR EACH ROW
EXECUTE FUNCTION populate_shared_material_names();

-- 2. Sync course renames (AFTER UPDATE on google_classroom_courses)
CREATE TRIGGER trigger_update_shared_material_course_name
AFTER UPDATE ON google_classroom_courses
FOR EACH ROW
EXECUTE FUNCTION update_shared_material_course_name();

-- 3. Sync teacher renames (AFTER UPDATE on profiles)
CREATE TRIGGER trigger_update_shared_material_teacher_name
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_shared_material_teacher_name();
```

**Benefits**:

- ✅ 3x faster queries (1 query vs 3 queries)
- ✅ No service role bypass in application code
- ✅ Automatic consistency (zero maintenance)
- ✅ Simpler code (3 lines vs 31)

**Trade-offs**:

- ⚠️ ~100 bytes extra storage per record (negligible)
- ⚠️ < 5ms overhead on writes (negligible for rare operations)

**Rationale**: Course/teacher names are NOT sensitive data, renames are extremely rare (< 0.1% of operations), triggers guarantee consistency.

See [DECISION-rls-denormalization.md](../architecture/DECISION-rls-denormalization.md) for complete analysis.

### Indexes

**20 indexes** optimized for common query patterns:

```sql
-- Foreign keys (essential for JOINs)
CREATE INDEX idx_topics_course ON google_classroom_topics(google_course_id);
CREATE INDEX idx_materials_course ON google_classroom_materials(google_course_id);
CREATE INDEX idx_material_attachments_material ON google_classroom_material_attachments(google_material_id);

-- Filters (for student UI)
CREATE INDEX idx_shared_materials_class ON shared_materials(class_id);
CREATE INDEX idx_shared_materials_category ON shared_materials(category_id);
CREATE INDEX idx_shared_materials_topic ON shared_materials(topic_id);

-- Partial indexes (performance critical)
CREATE INDEX idx_materials_published ON google_classroom_materials(google_course_id, state)
WHERE state = 'PUBLISHED';

CREATE INDEX idx_shared_materials_visible ON shared_materials(class_id, visible)
WHERE visible = true;

-- Denormalized fields
CREATE INDEX idx_shared_materials_course_name ON shared_materials(course_name)
WHERE course_name IS NOT NULL;
```

---

## API Integration

### Google Classroom API Client

**File**: `src/lib/server/google/classroom-api.ts`

```typescript
import { GoogleClassroomClient } from '$lib/server/google/classroom-api';

// Create client
const client = new GoogleClassroomClient(accessToken, teacherId);

// List courses
const { courses, nextPageToken } = await client.listCourses({
	pageSize: 100,
	courseStates: ['ACTIVE']
});

// List topics for a course
const { topics } = await client.listTopics(googleCourseId);

// List course work materials (non-graded content)
const { courseWorkMaterial } = await client.listCourseWorkMaterials(googleCourseId, {
	pageSize: 100,
	courseWorkStates: ['PUBLISHED'],
	orderBy: 'updateTime desc'
});
```

**Features**:

- ✅ Automatic token refresh on 401
- ✅ Retry logic with exponential backoff (rate limits)
- ✅ Zod validation on all responses
- ✅ Comprehensive error handling (GoogleAPIError hierarchy)

### OAuth Flow (PKCE)

**File**: `src/lib/server/google/oauth.ts`

#### Step 1: Generate Authorization URL

```typescript
import { getAuthUrl } from '$lib/server/google/oauth';

const { url, codeVerifier } = await getAuthUrl(csrfToken);

// Store codeVerifier in httpOnly cookie
cookies.set('google_code_verifier', codeVerifier, {
	httpOnly: true,
	secure: true,
	sameSite: 'lax',
	maxAge: 600 // 10 minutes
});

// Redirect user
return redirect(302, url);
```

#### Step 2: Handle Callback

```typescript
import { exchangeCodeForTokens } from '$lib/server/google/oauth';
import { encryptToken } from '$lib/server/google/encryption';

// GET /api/google/auth/callback?code=...&state=...
const code = url.searchParams.get('code');
const codeVerifier = cookies.get('google_code_verifier');

// Exchange code for tokens
const tokens = await exchangeCodeForTokens(code, codeVerifier);

// Encrypt and store
await supabase.from('google_integrations').insert({
	teacher_id: userId,
	access_token: encryptToken(tokens.access_token),
	refresh_token: encryptToken(tokens.refresh_token),
	token_expiry: new Date(Date.now() + tokens.expires_in * 1000),
	scopes: tokens.scope.split(' '),
	google_email: tokenInfo.email
});
```

#### Step 3: Auto-Refresh Tokens

```typescript
import { shouldRefreshToken, refreshAccessToken } from '$lib/server/google/oauth';
import { decryptToken, encryptToken } from '$lib/server/google/encryption';

// Check if token needs refresh (expires in < 5 minutes)
if (shouldRefreshToken(integration.token_expiry)) {
	const refreshToken = decryptToken(integration.refresh_token);
	const { access_token, expires_in } = await refreshAccessToken(refreshToken);

	// Update database
	await supabase
		.from('google_integrations')
		.update({
			access_token: encryptToken(access_token),
			token_expiry: new Date(Date.now() + expires_in * 1000)
		})
		.eq('teacher_id', teacherId);
}
```

### Token Encryption

**File**: `src/lib/server/google/encryption.ts`

**Algorithm**: AES-256-GCM (authenticated encryption)

```typescript
import { encryptToken, decryptToken, testEncryption } from '$lib/server/google/encryption';

// Encrypt before storing
const encrypted = encryptToken('ya29.a0...');
// Format: [IV (16 bytes)][Auth Tag (16 bytes)][Ciphertext (variable)]

// Decrypt when needed
const token = decryptToken(encrypted);

// Test on startup
try {
	testEncryption();
	console.log('✅ Encryption system operational');
} catch (error) {
	console.error('❌ Encryption test failed:', error);
	process.exit(1);
}
```

**Security Best Practices**:

1. Store `GOOGLE_TOKEN_ENCRYPTION_KEY` in `.env` (never in code/database)
2. Use different keys for dev/staging/production
3. Key minimum 32 characters (generate with `openssl rand -base64 32`)
4. Never log decrypted tokens (mask in logs)
5. Rotate keys periodically (implement re-encryption strategy)

---

## Sync Logic

### Full Sync Workflow

**File**: `src/lib/server/google/sync.ts`

```typescript
import { fullSync } from '$lib/server/google/sync';

// Trigger full sync for a teacher
const result = await fullSync(teacherId, supabase);

// Result structure
{
  coursesSynced: 5,        // Number of courses synced
  topicsSynced: 12,        // Number of topics synced
  courseworkSynced: 0,     // Coursework (not materials!)
  materialsSynced: 34,     // Course work materials synced
  errors: []               // Array of error messages
}
```

#### Sync Stages

```typescript
// Stage 1: Sync courses
const coursesResult = await syncTeacherCourses(teacherId, supabase);
// - Fetches all ACTIVE courses from Google
// - Upserts to google_classroom_courses
// - Deletes courses no longer in Google (cleanup)

// Stage 2: For each course
for (const course of courses) {
	// 2a. Sync topics (needed for material linking)
	const topicsResult = await syncTopics(course.id, course.google_course_id, teacherId, supabase);

	// 2b. Sync course work materials
	const materialsResult = await syncCourseWorkMaterials(
		course.id,
		course.google_course_id,
		teacherId,
		supabase
	);

	// 2c. Sync coursework (graded assignments - separate feature)
	const courseworkResult = await syncCoursework(
		course.id,
		course.google_course_id,
		teacherId,
		supabase
	);
}

// Stage 3: Update last_sync_at
await supabase
	.from('google_integrations')
	.update({ last_sync_at: new Date().toISOString() })
	.eq('teacher_id', teacherId);
```

### Incremental Sync

**Current**: Full sync on each trigger (simple, reliable)

**Future optimization** (Phase 8):

```typescript
// Use updateTime filters for incremental sync
const { courseWorkMaterial } = await client.listCourseWorkMaterials(courseId, {
	orderBy: 'updateTime desc'
	// Filter by last_synced_at timestamp
});
```

**Trade-off**: Full sync is acceptable for now (< 10s for 50 materials), incremental sync adds complexity.

### Material Attachment Parsing

```typescript
import { extractMaterialData } from '$lib/server/google/utils';

// Parse Google Classroom material object
for (const attachment of material.materials) {
  const attachmentData = extractMaterialData(attachment);

  // Returns normalized structure:
  {
    type: 'DRIVE_FILE' | 'YOUTUBE_VIDEO' | 'LINK' | 'FORM',
    fileId: string | null,
    fileName: string,
    mimeType: string | null,
    url: string,
    thumbnailUrl: string | null,
    title: string | null
  }
}
```

### Cleanup Strategy

**Soft delete** for coursework (state = 'DELETED'), **hard delete** for orphaned records:

```typescript
// Cleanup courses no longer in Google Classroom
if (syncedGoogleCourseIds.length > 0) {
	await supabase
		.from('google_classroom_courses')
		.delete()
		.eq('teacher_id', teacherId)
		.not('google_course_id', 'in', `(${syncedGoogleCourseIds.join(',')})`);
}

// Topics/materials are CASCADE deleted when course is deleted
```

---

## Frontend Components

### Teacher: ShareMaterialDialog

**File**: `src/lib/components/google/ShareMaterialDialog.svelte`

**Features**:

- Multi-class selection with individual configuration per class
- Hybrid organization: Toggle between Google Topics OR UbuMaths Categories
- Visibility toggle (draft mode)
- Custom description per class (overrides original)
- Loading states for categories/topics (lazy fetch)
- Real-time validation and error handling

**Usage**:

```svelte
<script>
	import ShareMaterialDialog from '$lib/components/google/ShareMaterialDialog.svelte';

	let showShareDialog = $state(false);
	let selectedMaterial = $state(null);

	function handleShare(material) {
		selectedMaterial = material;
		showShareDialog = true;
	}

	function handleShareSuccess() {
		showShareDialog = false;
		// Refresh materials list
		loadMaterials();
	}
</script>

{#if showShareDialog}
	<ShareMaterialDialog
		material={selectedMaterial}
		onClose={() => (showShareDialog = false)}
		onSuccess={handleShareSuccess}
	/>
{/if}
```

**API Calls**:

```typescript
// Fetch teacher's classes
GET /api/teacher/classes

// Fetch categories for a class
GET /api/teacher/categories/[classId]

// Fetch Google topics (all courses)
GET /api/google/topics

// Share material
POST /api/google/materials/[id]/share
Body: {
  classIds: string[],
  categoryId: string | null,
  topicId: string | null,
  descriptionOverride: string | null,
  visible: boolean
}
```

### Student: Materials Browser

**File**: `src/routes/(protected)/dashboard/student/materials/+page.svelte`

**Features**:

- Filters: class, category (UbuMaths), topic (Google)
- Grouping: Materials grouped by category > topic > uncategorized
- Pagination: 20 materials per page
- Attachment icons: Drive files, YouTube videos, links, forms
- Responsive design: 1 column mobile, 2 columns desktop
- Accessibility: ARIA labels, keyboard navigation, screen reader announcements

**Server Load** (`+page.server.ts`):

```typescript
export async function load({ locals, url }) {
	const user = await requireRole(locals, 'student');

	// Parse filters from query params
	const classId = url.searchParams.get('classId') || '';
	const categoryId = url.searchParams.get('categoryId') || '';
	const topicId = url.searchParams.get('topicId') || '';
	const page = parseInt(url.searchParams.get('page') || '1');

	// Fetch student's classes
	const { data: classes } = await supabase
		.from('class_members')
		.select('classes(id, name)')
		.eq('student_id', user.id)
		.eq('is_test', false);

	// Build query for shared materials
	let query = supabase
		.from('shared_materials')
		.select(
			`
      id,
      description_override,
      visible,
      course_name,
      teacher_name,
      created_at,
      material:google_classroom_materials(
        id,
        google_material_id,
        title,
        description,
        state,
        created_time,
        alternate_link,
        topic:google_classroom_topics(id, name),
        attachments:google_classroom_material_attachments(*)
      ),
      class:classes(id, name),
      category:coursework_categories(id, name, icon),
      topic:google_classroom_topics(id, name)
    `
		)
		.eq('visible', true);

	// Apply filters
	if (classId) query = query.eq('class_id', classId);
	if (categoryId) query = query.eq('category_id', categoryId);
	if (topicId) query = query.eq('topic_id', topicId);

	// Pagination
	const pageSize = 20;
	const offset = (page - 1) * pageSize;
	query = query.range(offset, offset + pageSize - 1);

	const { data: materials, count } = await query;

	return {
		materials,
		total: count || 0,
		totalPages: Math.ceil((count || 0) / pageSize),
		filters: { classId, categoryId, topicId, page },
		classes,
		categories, // Fetched separately if classId filter
		topics // Fetched separately if classId filter
	};
}
```

---

## Security Model

### Multi-Layer Authorization

**Layer 1: Authentication** (all endpoints)

```typescript
const user = await requireRole(locals, 'teacher'); // or 'student'
```

**Layer 2: Ownership Verification** (teacher endpoints)

```typescript
// Verify material belongs to teacher
const { data: material } = await supabase
	.from('google_classroom_materials')
	.select('google_classroom_courses!inner(teacher_id)')
	.eq('id', materialId)
	.single();

if (material.google_classroom_courses.teacher_id !== user.id) {
	throw error(403, 'You do not own this material');
}
```

**Layer 3: Class Ownership** (sharing endpoints)

```typescript
// Verify teacher owns all classes
const { data: classes } = await supabase
	.from('classes')
	.select('id, teacher_id')
	.in('id', classIds);

const invalidClasses = classes.filter((c) => c.teacher_id !== user.id);
if (invalidClasses.length > 0) {
	throw error(403, 'You do not own all selected classes');
}
```

**Layer 4: RLS Policies** (database level)

```sql
-- Students can only view visible materials in their classes
CREATE POLICY "Students can view visible shared materials in their classes"
ON shared_materials FOR SELECT TO authenticated
USING (
  visible = true
  AND EXISTS (
    SELECT 1 FROM class_members cm
    WHERE cm.class_id = shared_materials.class_id
    AND cm.student_id = auth.uid()
    AND cm.is_test = false
  )
);
```

### RLS Policy Summary

**28 policies** across 6 tables:

| Table                        | Teachers                 | Students                    | Admins      |
| ---------------------------- | ------------------------ | --------------------------- | ----------- |
| `google_integrations`        | Full CRUD (own)          | None                        | SELECT only |
| `google_classroom_courses`   | Full CRUD (own)          | None                        | SELECT only |
| `google_classroom_topics`    | Full CRUD (via course)   | None                        | SELECT only |
| `google_classroom_materials` | Full CRUD (via course)   | SELECT (shared)             | SELECT only |
| `material_attachments`       | Full CRUD (via material) | SELECT (shared)             | SELECT only |
| `shared_materials`           | Full CRUD (own)          | SELECT (visible + in class) | SELECT only |

### Input Validation (Zod)

**File**: `src/lib/server/validation/google.ts`

```typescript
import { z } from 'zod';

export const shareMaterialSchema = z
	.object({
		classIds: z.array(z.string().uuid()).min(1).max(50),
		categoryId: z.string().uuid().nullable().optional(),
		topicId: z.string().uuid().nullable().optional(),
		descriptionOverride: z.string().max(2000).nullable().optional(),
		visible: z.boolean().default(true)
	})
	.refine(
		(data) => {
			// Cannot have both category and topic
			return !(data.categoryId && data.topicId);
		},
		{
			message: 'Cannot specify both categoryId and topicId'
		}
	);

export const unshareMaterialSchema = z.object({
	classIds: z.array(z.string().uuid()).min(1).max(50)
});

export const materialIdParamSchema = z.object({
	id: z.string().uuid()
});
```

**Usage**:

```typescript
const validation = shareMaterialSchema.safeParse(body);
if (!validation.success) {
	throw error(400, validation.error.issues[0].message);
}

const { classIds, categoryId, topicId, descriptionOverride, visible } = validation.data;
```

---

## Testing Guide

### Validation Tests

**File**: `src/tests/unit/validation/google.test.ts`

**76 tests** covering all Zod schemas:

```typescript
import { describe, it, expect } from 'vitest';
import { shareMaterialSchema, unshareMaterialSchema } from '$lib/server/validation';

describe('shareMaterialSchema', () => {
	it('validates correct input', () => {
		const input = {
			classIds: ['a1b2c3d4-e5f6-7890-abcd-ef1234567890'],
			categoryId: null,
			topicId: null,
			descriptionOverride: 'Custom description',
			visible: true
		};

		const result = shareMaterialSchema.safeParse(input);
		expect(result.success).toBe(true);
	});

	it('rejects classIds with non-UUID strings', () => {
		const input = {
			classIds: ['not-a-uuid'],
			visible: true
		};

		const result = shareMaterialSchema.safeParse(input);
		expect(result.success).toBe(false);
	});

	it('rejects both categoryId and topicId specified', () => {
		const input = {
			classIds: ['a1b2c3d4-e5f6-7890-abcd-ef1234567890'],
			categoryId: 'category-uuid',
			topicId: 'topic-uuid',
			visible: true
		};

		const result = shareMaterialSchema.safeParse(input);
		expect(result.success).toBe(false);
		expect(result.error?.issues[0]?.message).toContain('Cannot specify both');
	});
});
```

**Run tests**:

```bash
pnpm test:unit -- google.test.ts
```

### API Endpoint Tests

**Manual testing** with REST client:

```http
### Share material with classes
POST http://localhost:5175/api/google/materials/{{materialId}}/share
Content-Type: application/json
Cookie: {{authCookie}}

{
  "classIds": ["class-uuid-1", "class-uuid-2"],
  "categoryId": null,
  "topicId": "topic-uuid",
  "descriptionOverride": "Custom description for class A",
  "visible": true
}

### Expected Response
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "classesShared": 2
}

### Unshare material
DELETE http://localhost:5175/api/google/materials/{{materialId}}/share
Content-Type: application/json
Cookie: {{authCookie}}

{
  "classIds": ["class-uuid-1"]
}
```

### Database Trigger Tests

**Test denormalization triggers**:

```sql
-- Test 1: course_name auto-populated on INSERT
INSERT INTO shared_materials (material_id, class_id, shared_by, visible)
VALUES ('material-uuid', 'class-uuid', 'teacher-uuid', true)
RETURNING course_name, teacher_name;
-- Expected: course_name = 'Math 101', teacher_name = 'John Doe'

-- Test 2: course_name updated when course renamed
UPDATE google_classroom_courses
SET name = 'Math 101 - Advanced'
WHERE id = 'course-uuid';

SELECT course_name FROM shared_materials WHERE material_id IN (
  SELECT id FROM google_classroom_materials WHERE google_course_id = 'course-uuid'
);
-- Expected: course_name = 'Math 101 - Advanced' for all affected rows

-- Test 3: teacher_name updated when profile renamed
UPDATE profiles
SET firstname = 'Jane', lastname = 'Smith'
WHERE id = 'teacher-uuid';

SELECT teacher_name FROM shared_materials WHERE shared_by = 'teacher-uuid';
-- Expected: teacher_name = 'Jane Smith' for all rows
```

---

## Deployment

### Environment Variables

**Required**:

```bash
# Google Classroom OAuth Configuration
GOOGLE_CLASSROOM_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLASSROOM_CLIENT_SECRET=your-client-secret
GOOGLE_CLASSROOM_REDIRECT_URI=https://your-app.com/api/google/auth/callback

# Token Encryption Key (32+ characters)
GOOGLE_TOKEN_ENCRYPTION_KEY=your-32-character-encryption-key-here
```

**Generate encryption key**:

```bash
openssl rand -base64 32
```

### Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. **Enable APIs**:
   - Google Classroom API
   - Google Drive API
4. **Create OAuth 2.0 credentials**:
   - Application type: Web application
   - Authorized redirect URIs: Add your callback URL
   - Copy Client ID and Client Secret to `.env`

### Database Migrations

```bash
# Run migrations
pnpm db:migrate

# Regenerate TypeScript types
pnpm db:types

# Verify migration
psql $DATABASE_URL -c "SELECT * FROM google_classroom_topics LIMIT 0;"
```

### Deployment Checklist

- [ ] Environment variables set in Vercel
- [ ] Database migrations applied
- [ ] TypeScript types regenerated
- [ ] Encryption key tested (`testEncryption()` on startup)
- [ ] Google OAuth credentials configured
- [ ] Redirect URI whitelisted in Google Console
- [ ] Test OAuth flow in production
- [ ] Verify RLS policies with test users
- [ ] Monitor error logs for first 24 hours

---

## Troubleshooting

### Common Issues

#### Issue: "Encryption key not configured"

**Cause**: `GOOGLE_TOKEN_ENCRYPTION_KEY` not set or too short

**Solution**:

```bash
# Generate new key
openssl rand -base64 32

# Set in .env
GOOGLE_TOKEN_ENCRYPTION_KEY=<generated-key>

# Restart server
```

#### Issue: "Token refresh failed"

**Cause**: Refresh token invalid or revoked

**Solution**:

1. Delete teacher's Google integration record
2. Have teacher re-authorize Google Classroom
3. New tokens will be issued

#### Issue: "Students can't see materials"

**Checklist**:

1. Is `visible = true` in `shared_materials`?
2. Is student in the class (`class_members` table)?
3. Is `is_test = false` for the student?
4. Is material `state = 'PUBLISHED'`?

**Debug query**:

```sql
-- As teacher, check what students should see
SELECT sm.*, gcm.title, gcm.state
FROM shared_materials sm
JOIN google_classroom_materials gcm ON sm.material_id = gcm.id
WHERE sm.class_id = 'class-uuid'
AND sm.visible = true;

-- As student, check RLS policy result (run as student user)
SELECT * FROM shared_materials WHERE class_id = 'class-uuid';
-- Should only see visible materials
```

#### Issue: "Sync fails with 403 Forbidden"

**Cause**: Insufficient OAuth scopes

**Solution**:

1. Verify scopes in `google_integrations.scopes`:
   ```sql
   SELECT scopes FROM google_integrations WHERE teacher_id = 'teacher-uuid';
   ```
2. Required scopes:
   - `https://www.googleapis.com/auth/classroom.courses.readonly`
   - `https://www.googleapis.com/auth/classroom.coursework.me.readonly`
   - `https://www.googleapis.com/auth/drive.readonly`
3. If missing, have teacher re-authorize

#### Issue: "Denormalized names not updating"

**Cause**: Trigger not firing or function error

**Debug**:

```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname LIKE '%shared_material%';

-- Manually test trigger function
SELECT populate_shared_material_names();

-- Check trigger logs (if logging enabled)
SELECT * FROM postgres_logs WHERE message LIKE '%shared_material%';
```

**Fix**:

```bash
# Re-run migration
pnpm db:migrate
```

### Performance Monitoring

**Slow queries**:

```sql
-- Identify slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%shared_materials%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename = 'shared_materials'
AND n_distinct > 100;
```

**Sync performance**:

```typescript
// Add timing logs in sync.ts
console.time('[Sync] Full sync');
const result = await fullSync(teacherId, supabase);
console.timeEnd('[Sync] Full sync');
console.log(
	`[Sync] Synced ${result.materialsSynced} materials in`,
	performance.now() - startTime,
	'ms'
);
```

**Expected benchmarks**:

- OAuth flow: < 2s
- Full sync (50 materials): < 10s
- Student page load (20 materials): < 500ms
- Share material (5 classes): < 1s

---

## Appendix

### File Structure

```
src/
├── lib/
│   ├── components/
│   │   └── google/
│   │       └── ShareMaterialDialog.svelte
│   ├── server/
│   │   ├── google/
│   │   │   ├── classroom-api.ts      # Google Classroom API client
│   │   │   ├── drive-api.ts          # Google Drive API client
│   │   │   ├── oauth.ts              # OAuth 2.0 + PKCE
│   │   │   ├── encryption.ts         # AES-256-GCM token encryption
│   │   │   ├── sync.ts               # Sync logic (fullSync, syncCourses, etc.)
│   │   │   ├── schemas.ts            # Zod schemas for Google API responses
│   │   │   ├── errors.ts             # Custom error classes
│   │   │   └── utils.ts              # Helper functions
│   │   └── validation/
│   │       └── google.ts             # Zod schemas for endpoints
│   └── types/
│       └── google.ts                 # TypeScript interfaces
├── routes/
│   ├── api/
│   │   └── google/
│   │       ├── auth/
│   │       │   ├── +server.ts        # Initiate OAuth
│   │       │   └── callback/
│   │       │       └── +server.ts    # OAuth callback
│   │       ├── sync/
│   │       │   └── +server.ts        # Trigger sync
│   │       ├── courses/
│   │       │   └── [id]/
│   │       │       └── +server.ts    # Get course with materials
│   │       ├── topics/
│   │       │   └── +server.ts        # Get all topics
│   │       └── materials/
│   │           └── [id]/
│   │               └── share/
│   │                   └── +server.ts # Share/unshare material
│   └── (protected)/
│       └── dashboard/
│           ├── teacher/
│           │   └── google-classroom/
│           │       └── +page.svelte  # Teacher dashboard
│           └── student/
│               └── materials/
│                   ├── +page.svelte       # Student materials browser
│                   └── +page.server.ts    # Server load function
└── tests/
    └── unit/
        └── validation/
            └── google.test.ts        # 76 validation tests
```

### API Reference

| Method | Endpoint                           | Auth    | Purpose                       |
| ------ | ---------------------------------- | ------- | ----------------------------- |
| GET    | `/api/google/auth`                 | Teacher | Initiate OAuth flow           |
| GET    | `/api/google/auth/callback`        | None    | Handle OAuth callback         |
| POST   | `/api/google/sync`                 | Teacher | Trigger full sync             |
| GET    | `/api/google/courses/[id]`         | Teacher | Get course with materials     |
| GET    | `/api/google/topics`               | Teacher | Get all teacher's topics      |
| POST   | `/api/google/materials/[id]/share` | Teacher | Share material with classes   |
| DELETE | `/api/google/materials/[id]/share` | Teacher | Unshare material from classes |

### Migration Files

| Date       | File                                                   | Purpose                                                    |
| ---------- | ------------------------------------------------------ | ---------------------------------------------------------- |
| 2025-11-14 | `20251114150000_google_classroom_integration.sql`      | Core tables (integrations, courses, coursework, materials) |
| 2025-11-15 | `20251115160000_fix_google_classroom_courses_rls.sql`  | RLS policy fixes                                           |
| 2025-11-15 | `20251115181000_create_google_classroom_topics.sql`    | Topics table                                               |
| 2025-11-15 | `20251115182000_create_google_classroom_materials.sql` | Materials table (non-graded)                               |
| 2025-11-15 | `20251115183000_create_material_attachments.sql`       | Attachments table                                          |
| 2025-11-15 | `20251115184000_create_shared_materials.sql`           | Sharing table with denormalization                         |

---

**Last Updated**: 2025-11-15
**Maintained By**: UbuMaths Development Team
**Questions?** Create an issue or contact the team.
