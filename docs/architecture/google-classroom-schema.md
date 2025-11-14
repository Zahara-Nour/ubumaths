# Google Classroom Integration - Database Schema

**Migration**: `20251114120000_google_classroom_integration.sql`
**Date**: 2025-11-14
**Status**: ✅ Ready for deployment

## Overview

This schema enables teachers to:

1. Link their personal Google account via OAuth
2. Sync courses and coursework from Google Classroom
3. Manually associate Google Classroom courses with UbuMaths classes
4. Share coursework (assignments with attached materials) with students
5. Organize coursework into categories (Cours, Exercices, Corrections, Devoirs, Évaluations)
6. Optionally restrict coursework visibility to specific students

## Architecture Flow

```
Teacher Google Account
        ↓
   OAuth Integration (google_integrations)
        ↓
   Google Classroom API Sync
        ↓
   Courses & Coursework (google_classroom_courses, google_classroom_coursework)
        ↓
   Materials Attached (coursework_materials)
        ↓
   Manual Class Association (class_google_classroom_links)
        ↓
   Categorization (coursework_categories)
        ↓
   Sharing with Students (shared_coursework, shared_coursework_students)
        ↓
   Student View (student_coursework_view)
```

## Tables

### 1. `google_integrations`

**Purpose**: Store encrypted OAuth tokens for each teacher's Google account
**Key**: One integration per teacher (UNIQUE on `teacher_id`)

| Column          | Type        | Description                                               |
| --------------- | ----------- | --------------------------------------------------------- |
| `id`            | UUID        | Primary key                                               |
| `teacher_id`    | UUID        | Teacher who linked their Google account (UNIQUE)          |
| `access_token`  | TEXT        | Encrypted OAuth access token (~1 hour lifespan)           |
| `refresh_token` | TEXT        | Encrypted OAuth refresh token (long-lived)                |
| `token_expiry`  | TIMESTAMPTZ | When `access_token` expires                               |
| `scopes`        | TEXT[]      | OAuth scopes granted (e.g., `classroom.courses.readonly`) |
| `google_email`  | TEXT        | Email of linked Google account                            |
| `last_sync_at`  | TIMESTAMPTZ | Last successful sync with Google Classroom API            |
| `created_at`    | TIMESTAMPTZ | Creation timestamp                                        |
| `updated_at`    | TIMESTAMPTZ | Last update timestamp                                     |

**Indexes**:

- `idx_google_integrations_teacher` on `teacher_id`
- `idx_google_integrations_expiry` on `token_expiry` (WHERE `token_expiry < NOW() + 1 hour`)

**RLS Policies**:

- Teachers: Full CRUD on their own integration
- Admins: SELECT only (for support)

**Encryption**:

- `access_token` and `refresh_token` are encrypted using `pgcrypto` extension
- Use `encrypt_token()` and `decrypt_token()` helper functions
- Encryption key stored in database setting: `app.encryption_key`

**Important**: Set encryption key before use:

```sql
ALTER DATABASE postgres SET app.encryption_key TO 'your-secret-key-here';
```

---

### 2. `google_classroom_courses`

**Purpose**: Google Classroom courses synced from teacher's account
**Key**: Unique per (teacher_id, google_course_id)

| Column                | Type        | Description                                        |
| --------------------- | ----------- | -------------------------------------------------- |
| `id`                  | UUID        | Primary key                                        |
| `teacher_id`          | UUID        | Teacher who owns this course                       |
| `google_course_id`    | TEXT        | Google's unique course identifier                  |
| `name`                | TEXT        | Course name                                        |
| `section`             | TEXT        | Course section (optional)                          |
| `description_heading` | TEXT        | Course description                                 |
| `room`                | TEXT        | Classroom location (optional)                      |
| `enrollment_code`     | TEXT        | Google Classroom join code                         |
| `course_state`        | TEXT        | ACTIVE, ARCHIVED, PROVISIONED, DECLINED, SUSPENDED |
| `last_synced_at`      | TIMESTAMPTZ | Last sync with Google API                          |
| `created_at`          | TIMESTAMPTZ | Creation timestamp                                 |
| `updated_at`          | TIMESTAMPTZ | Last update timestamp                              |

**Indexes**:

- `idx_google_courses_teacher` on `teacher_id`
- `idx_google_courses_state` on `course_state`
- `idx_google_courses_google_id` on `google_course_id`

**RLS Policies**:

- Teachers: Full CRUD on their own courses
- Admins: SELECT only

---

### 3. `class_google_classroom_links`

**Purpose**: Link UbuMaths classes to Google Classroom courses
**Key**: Unique per (class_id, google_course_id)

| Column             | Type        | Description                                                |
| ------------------ | ----------- | ---------------------------------------------------------- |
| `id`               | UUID        | Primary key                                                |
| `class_id`         | UUID        | UbuMaths class                                             |
| `google_course_id` | UUID        | Google Classroom course (FK to `google_classroom_courses`) |
| `created_by`       | UUID        | Teacher who created the link                               |
| `created_at`       | TIMESTAMPTZ | Creation timestamp                                         |

**Indexes**:

- `idx_class_google_links_class` on `class_id`
- `idx_class_google_links_google_course` on `google_course_id`

**RLS Policies**:

- Teachers: Full CRUD for their classes
- Students: SELECT for their classes (read-only)
- Admins: Full access

**Trigger Suggestion**: Consider adding a trigger to call `initialize_default_categories()` when a link is created

---

### 4. `coursework_categories`

**Purpose**: Teacher-defined categories for organizing coursework
**Key**: Unique per (class_id, name)

| Column          | Type        | Description                                        |
| --------------- | ----------- | -------------------------------------------------- |
| `id`            | UUID        | Primary key                                        |
| `class_id`      | UUID        | UbuMaths class                                     |
| `name`          | TEXT        | Category name (e.g., "Cours", "Exercices")         |
| `icon`          | TEXT        | Emoji or icon identifier (e.g., "📚", "book-open") |
| `color`         | TEXT        | Hex color for UI (e.g., "#3B82F6")                 |
| `display_order` | INTEGER     | Order for displaying (lower = first)               |
| `created_by`    | UUID        | Teacher who created the category                   |
| `created_at`    | TIMESTAMPTZ | Creation timestamp                                 |
| `updated_at`    | TIMESTAMPTZ | Last update timestamp                              |

**Indexes**:

- `idx_coursework_categories_class` on `class_id`
- `idx_coursework_categories_order` on `(class_id, display_order)`

**RLS Policies**:

- Teachers: Full CRUD for their classes
- Students: SELECT for their classes (read-only)
- Admins: Full access

**Default Categories**:
Use `initialize_default_categories(class_id, teacher_id)` to create:

1. 📚 Cours (blue, #3B82F6)
2. ✏️ Exercices (green, #10B981)
3. ✅ Corrections (purple, #8B5CF6)
4. 📝 Devoirs (orange, #F59E0B)
5. 🎯 Évaluations (red, #EF4444)

---

### 5. `google_classroom_coursework`

**Purpose**: Coursework/assignments synced from Google Classroom
**Key**: Unique per (google_course_id, google_coursework_id)

| Column                 | Type          | Description                                                 |
| ---------------------- | ------------- | ----------------------------------------------------------- |
| `id`                   | UUID          | Primary key                                                 |
| `google_course_id`     | UUID          | Google Classroom course (FK)                                |
| `google_coursework_id` | TEXT          | Google's unique coursework identifier                       |
| `title`                | TEXT          | Coursework title                                            |
| `description`          | TEXT          | Coursework description (optional)                           |
| `coursework_type`      | TEXT          | ASSIGNMENT, SHORT_ANSWER_QUESTION, MULTIPLE_CHOICE_QUESTION |
| `state`                | TEXT          | PUBLISHED, DRAFT, DELETED                                   |
| `due_date`             | DATE          | Due date (optional)                                         |
| `due_time`             | TIME          | Due time (optional, paired with `due_date`)                 |
| `created_time`         | TIMESTAMPTZ   | When created in Google Classroom                            |
| `updated_time`         | TIMESTAMPTZ   | When last updated in Google Classroom                       |
| `max_points`           | NUMERIC(10,2) | Maximum points for grading (optional)                       |
| `work_type`            | TEXT          | Type of work (default: ASSIGNMENT)                          |
| `last_synced_at`       | TIMESTAMPTZ   | Last sync from Google API                                   |
| `created_at`           | TIMESTAMPTZ   | Creation timestamp                                          |
| `updated_at`           | TIMESTAMPTZ   | Last update timestamp                                       |

**Indexes**:

- `idx_coursework_course` on `google_course_id`
- `idx_coursework_state` on `state`
- `idx_coursework_due_date` on `due_date` (WHERE `due_date IS NOT NULL`)
- `idx_coursework_google_id` on `google_coursework_id`
- `idx_coursework_published_due` on `(google_course_id, state, due_date)` (WHERE `state = 'PUBLISHED'`)

**RLS Policies**:

- Teachers: Full CRUD for their courses
- Students: SELECT for coursework shared with their classes (via `shared_coursework`)
- Admins: Full access

---

### 6. `coursework_materials`

**Purpose**: Files, links, videos attached to coursework
**Key**: No uniqueness constraint (multiple materials per coursework)

| Column           | Type        | Description                                      |
| ---------------- | ----------- | ------------------------------------------------ |
| `id`             | UUID        | Primary key                                      |
| `coursework_id`  | UUID        | Coursework (FK to `google_classroom_coursework`) |
| `material_type`  | TEXT        | DRIVE_FILE, YOUTUBE_VIDEO, LINK, FORM            |
| `google_file_id` | TEXT        | Google Drive file ID (for DRIVE_FILE type)       |
| `file_name`      | TEXT        | File name or link title                          |
| `mime_type`      | TEXT        | MIME type (e.g., `application/pdf`, `video/mp4`) |
| `file_url`       | TEXT        | URL to access the material                       |
| `thumbnail_url`  | TEXT        | Preview thumbnail URL (optional)                 |
| `title`          | TEXT        | Title for links/videos (optional)                |
| `created_at`     | TIMESTAMPTZ | Creation timestamp                               |

**Indexes**:

- `idx_coursework_materials_coursework` on `coursework_id`
- `idx_coursework_materials_type` on `material_type`

**RLS Policies**:

- Teachers: Full CRUD for their coursework
- Students: SELECT for materials in shared coursework (with student restriction check)
- Admins: Full access

**Material Types**:

- `DRIVE_FILE`: Google Drive file (PDF, Doc, etc.)
- `YOUTUBE_VIDEO`: YouTube video
- `LINK`: External link
- `FORM`: Google Form

---

### 7. `shared_coursework`

**Purpose**: Track which coursework is shared with which UbuMaths classes
**Key**: Unique per (coursework_id, class_id)

| Column                 | Type        | Description                                             |
| ---------------------- | ----------- | ------------------------------------------------------- |
| `id`                   | UUID        | Primary key                                             |
| `coursework_id`        | UUID        | Coursework being shared (FK)                            |
| `class_id`             | UUID        | UbuMaths class receiving the coursework (FK)            |
| `category_id`          | UUID        | Category for organization (FK, nullable)                |
| `shared_by`            | UUID        | Teacher who shared the coursework (FK)                  |
| `visible`              | BOOLEAN     | Toggle visibility for students                          |
| `description_override` | TEXT        | Custom description (overrides `coursework.description`) |
| `display_order`        | INTEGER     | Custom ordering within category                         |
| `created_at`           | TIMESTAMPTZ | Creation timestamp                                      |
| `updated_at`           | TIMESTAMPTZ | Last update timestamp                                   |

**Indexes**:

- `idx_shared_coursework_class` on `class_id`
- `idx_shared_coursework_category` on `category_id`
- `idx_shared_coursework_visible` on `(class_id, visible, display_order)` (WHERE `visible = true`)
- `idx_shared_coursework_coursework` on `coursework_id`

**RLS Policies**:

- Teachers: Full CRUD for their classes
- Students: SELECT visible coursework for their classes (with student restriction check)
- Admins: Full access

**Visibility Logic**:

- `visible = true`: Students can see the coursework
- `visible = false`: Hidden from students (draft mode)

---

### 8. `shared_coursework_students`

**Purpose**: Optionally restrict coursework to specific students
**Key**: Unique per (shared_coursework_id, student_id)

| Column                 | Type        | Description                                 |
| ---------------------- | ----------- | ------------------------------------------- |
| `id`                   | UUID        | Primary key                                 |
| `shared_coursework_id` | UUID        | Shared coursework entry (FK)                |
| `student_id`           | UUID        | Student who can access this coursework (FK) |
| `created_at`           | TIMESTAMPTZ | Creation timestamp                          |

**Indexes**:

- `idx_shared_coursework_students_shared` on `shared_coursework_id`
- `idx_shared_coursework_students_student` on `student_id`

**RLS Policies**:

- Teachers: Full CRUD for their shared coursework
- Students: SELECT to check their access
- Admins: Full access

**Logic**:

- **No rows** for a `shared_coursework_id`: Visible to ALL students in the class
- **One or more rows**: Only visible to listed students

**Example**:

```sql
-- Share coursework with entire class (no restrictions)
INSERT INTO shared_coursework (coursework_id, class_id, ...)
VALUES ('uuid1', 'class1', ...);
-- No entries in shared_coursework_students

-- Share coursework with specific students only
INSERT INTO shared_coursework (coursework_id, class_id, ...)
VALUES ('uuid2', 'class2', ...);

INSERT INTO shared_coursework_students (shared_coursework_id, student_id)
VALUES ('shared_uuid', 'student1'), ('shared_uuid', 'student2');
-- Only student1 and student2 can see this coursework
```

---

## Helper Functions

### `encrypt_token(token TEXT) RETURNS TEXT`

Encrypts OAuth tokens using `pgcrypto`.

**Usage**:

```sql
UPDATE google_integrations
SET access_token = encrypt_token('ya29.a0...')
WHERE teacher_id = 'uuid';
```

**Security**: `SECURITY DEFINER` function, requires `app.encryption_key` setting

---

### `decrypt_token(encrypted_token TEXT) RETURNS TEXT`

Decrypts OAuth tokens using `pgcrypto`.

**Usage**:

```sql
SELECT decrypt_token(access_token)
FROM google_integrations
WHERE teacher_id = 'uuid';
```

**Security**: `SECURITY DEFINER` function, restricted access via RLS

---

### `initialize_default_categories(p_class_id UUID, p_teacher_id UUID) RETURNS VOID`

Creates default coursework categories for a class.

**Usage**:

```sql
-- After linking a class to Google Classroom
SELECT initialize_default_categories('class-uuid', 'teacher-uuid');
```

**Categories Created**:

1. 📚 Cours (blue)
2. ✏️ Exercices (green)
3. ✅ Corrections (purple)
4. 📝 Devoirs (orange)
5. 🎯 Évaluations (red)

**Security**: `SECURITY DEFINER` function, verifies caller is teacher of the class

---

## Helper Views

### `student_coursework_view`

**Purpose**: Simplified view for students to see available coursework

**Columns**:

- `shared_coursework_id`: ID of shared coursework entry
- `class_id`, `class_name`: Class information
- `category_id`, `category_name`, `category_icon`, `category_color`: Category details
- `visible`, `display_order`: Visibility and ordering
- `coursework_id`, `title`, `description`: Coursework details
- `coursework_type`, `state`, `due_date`, `due_time`, `max_points`: Assignment info
- `created_time`, `updated_time`: Timestamps
- `google_course_name`, `google_course_section`: Source course info
- `has_student_restrictions`: Boolean indicating if restrictions exist

**Usage**:

```sql
-- Get all coursework for a student's class
SELECT *
FROM student_coursework_view
WHERE class_id = 'class-uuid'
ORDER BY category_name, display_order;
```

**Note**: View respects RLS policies, so students only see coursework they have access to

---

## Security

### Row Level Security (RLS)

All tables have RLS enabled with comprehensive policies:

**Teachers**:

- Full CRUD on their own Google integrations, courses, and coursework
- Full CRUD on coursework shared with their classes
- Cannot access other teachers' Google data

**Students**:

- SELECT visible coursework for their classes
- Respect student restrictions (`shared_coursework_students`)
- Cannot modify any Google Classroom data

**Admins**:

- SELECT on all tables (for support and auditing)
- Cannot decrypt OAuth tokens (use `SECURITY DEFINER` functions)

### Encryption

**OAuth Tokens** (`access_token`, `refresh_token`):

**Phase 2 Implementation**: Application-level encryption (AES-256-GCM)

- Encrypted at rest using Node.js `crypto` module
- Algorithm: AES-256-GCM (authenticated encryption)
- Key derivation: SHA-256 hash of `GOOGLE_TOKEN_ENCRYPTION_KEY`
- IV: Random 16 bytes per encryption (stored with ciphertext)
- Auth Tag: 16 bytes for integrity verification

**Implementation**:

```typescript
import { encryptToken, decryptToken } from '$lib/server/google/encryption';

// Encrypt before storing
const encrypted = encryptToken('ya29.a0...');
// Format: [IV (16 bytes)][Auth Tag (16 bytes)][Ciphertext (variable)]

// Decrypt when needed
const token = decryptToken(encrypted);
```

**Database-level Encryption** (Alternative, not currently used):

- PostgreSQL `pgcrypto` extension available
- Use `encrypt_token()` and `decrypt_token()` SQL functions
- Requires `app.encryption_key` database setting
- SECURITY DEFINER functions for controlled access

**Best Practices**:

1. Store encryption key in environment variable (not database)
2. Use different keys for development/production
3. Rotate keys periodically (implement re-encryption strategy)
4. Never log decrypted tokens (mask in logs)
5. Use service_role key only for backend operations
6. Validate encryption key length (minimum 32 characters)
7. Test encryption/decryption on startup (use `testEncryption()`)

**Key Rotation Strategy**:

1. Generate new encryption key
2. Decrypt all tokens with old key
3. Re-encrypt with new key
4. Update environment variable
5. Restart application
6. Monitor for decryption errors

**Security Audit**:

- ✅ Authenticated encryption (AES-GCM prevents tampering)
- ✅ Random IV per encryption (prevents pattern analysis)
- ✅ Key derivation (SHA-256 ensures 256-bit key)
- ✅ Error handling (doesn't leak sensitive data)
- ✅ Server-side only (encryption key never exposed to client)

---

## Query Patterns

### For Teachers

**Get teacher's Google integration**:

```sql
SELECT *
FROM google_integrations
WHERE teacher_id = auth.uid();
```

**List teacher's Google Classroom courses**:

```sql
SELECT gcc.*, cgcl.class_id, c.name AS class_name
FROM google_classroom_courses gcc
LEFT JOIN class_google_classroom_links cgcl ON cgcl.google_course_id = gcc.id
LEFT JOIN classes c ON c.id = cgcl.class_id
WHERE gcc.teacher_id = auth.uid()
ORDER BY gcc.name;
```

**Get coursework for a course with materials**:

```sql
SELECT
    gcw.*,
    json_agg(json_build_object(
        'id', cm.id,
        'type', cm.material_type,
        'name', cm.file_name,
        'url', cm.file_url,
        'thumbnail', cm.thumbnail_url
    )) AS materials
FROM google_classroom_coursework gcw
LEFT JOIN coursework_materials cm ON cm.coursework_id = gcw.id
WHERE gcw.google_course_id = 'course-uuid'
AND gcw.state = 'PUBLISHED'
GROUP BY gcw.id
ORDER BY gcw.due_date NULLS LAST, gcw.title;
```

**Share coursework with a class**:

```sql
-- Share with entire class
INSERT INTO shared_coursework (coursework_id, class_id, category_id, shared_by, visible)
VALUES ('coursework-uuid', 'class-uuid', 'category-uuid', auth.uid(), true);

-- Share with specific students
INSERT INTO shared_coursework (coursework_id, class_id, category_id, shared_by, visible)
VALUES ('coursework-uuid', 'class-uuid', 'category-uuid', auth.uid(), true)
RETURNING id;

INSERT INTO shared_coursework_students (shared_coursework_id, student_id)
SELECT 'shared-uuid', unnest(ARRAY['student1-uuid', 'student2-uuid']);
```

### For Students

**Get all coursework for a class (respects restrictions)**:

```sql
SELECT *
FROM student_coursework_view
WHERE class_id = 'class-uuid'
AND visible = true
ORDER BY
    category_name,
    display_order,
    due_date NULLS LAST;
```

**Get coursework with materials (manual join)**:

```sql
SELECT
    sc.id AS shared_coursework_id,
    gcw.*,
    cc.name AS category_name,
    cc.icon AS category_icon,
    json_agg(json_build_object(
        'id', cm.id,
        'type', cm.material_type,
        'name', cm.file_name,
        'url', cm.file_url
    )) AS materials
FROM shared_coursework sc
JOIN google_classroom_coursework gcw ON gcw.id = sc.coursework_id
JOIN class_members m ON m.class_id = sc.class_id
LEFT JOIN coursework_categories cc ON cc.id = sc.category_id
LEFT JOIN coursework_materials cm ON cm.coursework_id = gcw.id
WHERE sc.class_id = 'class-uuid'
AND sc.visible = true
AND m.student_id = auth.uid()
-- Check student restrictions
AND (
    NOT EXISTS (SELECT 1 FROM shared_coursework_students WHERE shared_coursework_id = sc.id)
    OR EXISTS (
        SELECT 1 FROM shared_coursework_students scs
        WHERE scs.shared_coursework_id = sc.id
        AND scs.student_id = auth.uid()
    )
)
GROUP BY sc.id, gcw.id, cc.name, cc.icon
ORDER BY cc.display_order, sc.display_order;
```

---

## Performance Considerations

### Indexes

**20 indexes** created for optimal query performance:

- Foreign key indexes (essential for JOIN performance)
- Composite indexes for common query patterns
- Partial indexes (e.g., `WHERE visible = true`, `WHERE state = 'PUBLISHED'`)
- Expiry index for token refresh operations

### Optimization Tips

1. **Use `student_coursework_view`** for student-facing queries (pre-joined, optimized)
2. **Filter by `state = 'PUBLISHED'`** early in WHERE clause (indexed)
3. **Batch sync operations** to minimize API calls and DB writes
4. **Cache coursework materials** on client side (rarely change)
5. **Use `last_synced_at`** to implement incremental sync

### Expected Load

- **Writes**: Low (sync operations, sharing actions)
- **Reads**: High (students viewing coursework)
- **Storage**: Moderate (metadata only, no file storage)

**Recommendation**: Monitor `shared_coursework` and `coursework_materials` table sizes

---

## Migration Checklist

### Before Migration

- [ ] Backup production database
- [ ] Review RLS policies for security
- [ ] Test encryption key configuration
- [ ] Verify Google OAuth credentials

### After Migration

- [ ] Run: `pnpm db:migrate` to apply migration
- [ ] Run: `pnpm db:types` to update TypeScript types
- [ ] Set encryption key: `ALTER DATABASE postgres SET app.encryption_key TO 'key';`
- [ ] Test OAuth flow in development
- [ ] Verify RLS policies with test users
- [ ] Monitor error logs for permission issues

### TypeScript Types Update

**Option 1 (Recommended)**: Auto-generate types

```bash
pnpm db:types
```

**Option 2**: Manual update (see reference types in migration file comments)

---

## API Integration Notes

### Google Classroom API Scopes Required

```
https://www.googleapis.com/auth/classroom.courses.readonly
https://www.googleapis.com/auth/classroom.coursework.me.readonly
https://www.googleapis.com/auth/drive.readonly
```

### OAuth Flow

**Phase 2 Implementation (Complete)**: OAuth configuration and authentication services

1. **Teacher Initiates OAuth**:

   ```typescript
   import { getAuthUrl } from '$lib/server/google/oauth';

   const { url, codeVerifier } = await getAuthUrl('csrf-token-123');
   // Store codeVerifier in session cookie
   cookies.set('google_code_verifier', codeVerifier, {
   	httpOnly: true,
   	secure: true,
   	sameSite: 'lax',
   	maxAge: 600 // 10 minutes
   });
   // Redirect user to Google authorization
   return redirect(302, url);
   ```

2. **Google Redirects Back with Authorization Code**:

   ```typescript
   // GET /api/google/auth/callback?code=...&state=...
   const code = url.searchParams.get('code');
   const state = url.searchParams.get('state');
   const codeVerifier = cookies.get('google_code_verifier');
   ```

3. **Exchange Code for Tokens**:

   ```typescript
   import { exchangeCodeForTokens } from '$lib/server/google/oauth';
   import { encryptToken } from '$lib/server/google/encryption';

   const tokens = await exchangeCodeForTokens(code, codeVerifier);

   // tokens = {
   //   access_token: 'ya29.a0...',
   //   refresh_token: '1//0g...',
   //   expires_in: 3599,
   //   scope: 'https://www.googleapis.com/auth/classroom...',
   //   token_type: 'Bearer'
   // }
   ```

4. **Encrypt and Store Tokens**:

   ```typescript
   await supabase.from('google_integrations').insert({
   	teacher_id: userId,
   	access_token: encryptToken(tokens.access_token),
   	refresh_token: encryptToken(tokens.refresh_token),
   	token_expiry: new Date(Date.now() + tokens.expires_in * 1000),
   	scopes: tokens.scope.split(' '),
   	google_email: tokenInfo.email,
   	last_sync_at: null
   });
   ```

5. **Use Access Token for API Requests**:

   ```typescript
   import { decryptToken } from '$lib/server/google/encryption';

   const { data } = await supabase
   	.from('google_integrations')
   	.select('access_token, token_expiry')
   	.eq('teacher_id', userId)
   	.single();

   const accessToken = decryptToken(data.access_token);

   // Make API request
   const response = await fetch('https://classroom.googleapis.com/v1/courses', {
   	headers: {
   		Authorization: `Bearer ${accessToken}`
   	}
   });
   ```

6. **Refresh Token When Expired**:

   ```typescript
   import { shouldRefreshToken, refreshAccessToken } from '$lib/server/google/oauth';

   if (shouldRefreshToken(data.token_expiry)) {
   	const refreshToken = decryptToken(data.refresh_token);
   	const { access_token, expires_in } = await refreshAccessToken(refreshToken);

   	// Update database
   	await supabase
   		.from('google_integrations')
   		.update({
   			access_token: encryptToken(access_token),
   			token_expiry: new Date(Date.now() + expires_in * 1000)
   		})
   		.eq('teacher_id', userId);
   }
   ```

### Security: PKCE (Proof Key for Code Exchange)

OAuth flow uses PKCE for enhanced security:

- **Code Verifier**: Random 64-character string (stored in session cookie)
- **Code Challenge**: SHA-256 hash of code verifier (sent to Google)
- **Benefits**: Prevents authorization code interception attacks

### Environment Setup

**Required Environment Variables**:

```bash
# Google Classroom OAuth Configuration
GOOGLE_CLASSROOM_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLASSROOM_CLIENT_SECRET=your-client-secret
GOOGLE_CLASSROOM_REDIRECT_URI=https://your-app.com/api/google/auth/callback

# Token Encryption Key (32+ characters)
GOOGLE_TOKEN_ENCRYPTION_KEY=your-32-character-encryption-key-here
```

**Generate Encryption Key**:

```bash
openssl rand -base64 32
```

**Configure Google Cloud Console**:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable APIs:
   - Google Classroom API
   - Google Drive API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: Add your callback URL
5. Copy Client ID and Client Secret to `.env`

### Token Refresh Strategy

**Access Token Lifecycle**:

- **Lifespan**: ~1 hour (3600 seconds)
- **Refresh Window**: 5 minutes before expiry
- **Automatic Refresh**: Check `shouldRefreshToken()` before API calls

**Refresh Token Lifecycle**:

- **Lifespan**: Long-lived (months to years)
- **Invalidation**: User revokes access, password change, or manual revocation
- **Error Handling**: If refresh fails, require user to re-authenticate

**Best Practices**:

1. Always check token expiry before API calls
2. Implement automatic refresh in API middleware
3. Handle `INVALID_GRANT` errors gracefully (prompt re-auth)
4. Log token refresh events for monitoring
5. Implement rate limiting on refresh attempts

### Sync Strategy

**Initial Sync**:

1. Fetch all courses → Insert into `google_classroom_courses`
2. For each course, fetch coursework → Insert into `google_classroom_coursework`
3. For each coursework, fetch materials → Insert into `coursework_materials`

**Incremental Sync**:

1. Use `last_synced_at` to filter by `updated_time`
2. Update only changed coursework
3. Handle deleted coursework (set `state = 'DELETED'`)

**Sync Frequency**: Recommended every 6-12 hours (or on-demand)

---

## Edge Cases & Considerations

### Student Restrictions

- Empty `shared_coursework_students` = visible to all class members
- Populated `shared_coursework_students` = visible only to listed students
- Teachers should see warnings when restricting to students not in the class

### Deleted Coursework

- Google Classroom sets `state = 'DELETED'` when coursework is deleted
- Keep records for audit trail (don't CASCADE DELETE)
- Filter by `state = 'PUBLISHED'` in student queries

### Duplicate Materials

- Same file attached to multiple coursework → Separate rows (no deduplication)
- Reduces complexity, minimal storage impact (metadata only)

### Token Expiry

- Access tokens expire after ~1 hour
- Check `token_expiry` before API calls
- Use `refresh_token` to obtain new `access_token`
- Update `token_expiry` after refresh

### Course State Changes

- ACTIVE → ARCHIVED: Keep coursework visible unless teacher hides
- ARCHIVED → ACTIVE: Automatically show coursework again
- DECLINED/SUSPENDED: Hide from UI, don't sync

---

## Future Enhancements

### Phase 2 (Optional)

- [ ] Student submission tracking
- [ ] Grade sync from Google Classroom
- [ ] Comments on coursework
- [ ] Notifications for new/updated coursework
- [ ] Bulk sharing operations
- [ ] Coursework templates
- [ ] Analytics dashboard (most viewed, completion rates)

### Phase 3 (Advanced)

- [ ] Two-way sync (UbuMaths → Google Classroom)
- [ ] Automatic categorization using AI
- [ ] Cross-class coursework sharing
- [ ] Version history for coursework updates
- [ ] Integration with UbuMaths assessment system

---

## Troubleshooting

### Common Issues

**Issue**: `Encryption key not configured`
**Solution**: Set `app.encryption_key` in database settings

**Issue**: Students can't see coursework
**Solution**: Check `visible = true` and `state = 'PUBLISHED'`, verify student restrictions

**Issue**: Token refresh fails
**Solution**: Check `refresh_token` validity, may need re-authentication

**Issue**: RLS policy denies access
**Solution**: Verify user role and class membership, check `class_members` table

### Debugging Queries

**Check student access**:

```sql
-- As teacher
SELECT
    sc.id,
    gcw.title,
    sc.visible,
    CASE
        WHEN NOT EXISTS (SELECT 1 FROM shared_coursework_students WHERE shared_coursework_id = sc.id)
        THEN 'All students'
        ELSE 'Restricted'
    END AS access_type,
    COUNT(scs.student_id) AS restricted_count
FROM shared_coursework sc
JOIN google_classroom_coursework gcw ON gcw.id = sc.coursework_id
LEFT JOIN shared_coursework_students scs ON scs.shared_coursework_id = sc.id
WHERE sc.class_id = 'class-uuid'
GROUP BY sc.id, gcw.title, sc.visible;
```

**Check token expiry**:

```sql
SELECT
    teacher_id,
    google_email,
    token_expiry,
    CASE
        WHEN token_expiry < NOW() THEN 'Expired'
        WHEN token_expiry < NOW() + INTERVAL '1 hour' THEN 'Expiring soon'
        ELSE 'Valid'
    END AS token_status
FROM google_integrations;
```

---

## References

- [Google Classroom API Documentation](https://developers.google.com/classroom)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [pgcrypto Documentation](https://www.postgresql.org/docs/current/pgcrypto.html)
- [UbuMaths Database Schema](./database-schema.md)

---

**Last Updated**: 2025-11-14
**Maintained By**: Database Team
**Questions?** Contact: claude@ubumaths.com
