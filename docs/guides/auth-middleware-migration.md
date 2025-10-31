# Authentication Middleware Migration Guide

**Status**: 5 of 56 files migrated (9%)
**Created**: 2025-10-31
**Benefits**: Eliminates 740 lines of duplicated auth code, improves maintainability, consistent error messages

---

## Overview

This guide documents the migration from duplicated authentication boilerplate to centralized authentication middleware. The middleware provides three functions that eliminate repetitive auth checks across API endpoints.

### Before vs After

**Before** (10 lines per endpoint):

```typescript
const { user } = await locals.safeGetSession();
if (!user) {
	throw error(401, 'Unauthorized');
}

const { data: profile } = await locals.supabase
	.from('profiles')
	.select('role')
	.eq('id', user.id)
	.single();

if (!profile || profile.role !== 'teacher') {
	throw error(403, 'Forbidden - Teachers only');
}
```

**After** (1 line):

```typescript
import { requireRole } from '$lib/server/middleware/auth';

const { user, profile } = await requireRole(locals, 'teacher');
```

### Benefits

- **740 lines removed**: 10 lines × 74 endpoints = 740 lines of boilerplate eliminated
- **56 database queries eliminated**: Profile is fetched once and reused
- **Consistent error messages**: All endpoints use the same French error messages
- **Type safety**: Full TypeScript support with proper types
- **Single source of truth**: Auth logic lives in one place
- **Easier maintenance**: Update auth logic once, not 74 times

---

## Middleware API

Location: `/Users/david/Coding/js/ubumaths/src/lib/server/middleware/auth.ts`

### 1. `requireAuth(locals)` - Basic Authentication

Use when endpoint requires authentication but no specific role.

```typescript
import { requireAuth } from '$lib/server/middleware/auth';

export const GET: RequestHandler = async ({ locals }) => {
	const { user, profile } = await requireAuth(locals);
	// user: Supabase User object (id, email, etc.)
	// profile: Full profile row (role, firstname, lastname, school_id, etc.)
};
```

**When to use**:

- User-agnostic endpoints (student/teacher/admin can all access)
- Profile pages
- General authenticated features

**Error responses**:

- `401`: "Non autorisé - Authentification requise"
- `403`: "Profil utilisateur introuvable"

### 2. `requireRole(locals, role)` - Role-Specific Auth

Use when endpoint should only be accessible to one specific role.

```typescript
import { requireRole } from '$lib/server/middleware/auth';

// Teacher-only endpoint
export const POST: RequestHandler = async ({ locals, request }) => {
	const { user, profile } = await requireRole(locals, 'teacher');
	// ... create assessment logic
};

// Admin-only endpoint
export const DELETE: RequestHandler = async ({ locals, params }) => {
	const { user, profile } = await requireRole(locals, 'admin');
	// ... delete user logic
};

// Student-only endpoint
export const PUT: RequestHandler = async ({ locals, request }) => {
	const { user, profile } = await requireRole(locals, 'student');
	// ... submit assignment logic
};
```

**When to use**:

- Teacher-only features (creating assessments, viewing results)
- Admin-only features (user management, system config)
- Student-only features (submitting assignments)

**Error responses**:

- `401`: "Non autorisé - Authentification requise"
- `403`: "Interdit - Enseignants uniquement" (or Administrateurs/Élèves)

### 3. `requireRoles(locals, roles)` - Multiple Allowed Roles

Use when endpoint should be accessible to multiple roles (OR logic).

```typescript
import { requireRoles } from '$lib/server/middleware/auth';

// Teachers OR Admins can access
export const GET: RequestHandler = async ({ locals }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	// Conditional logic based on role
	if (profile.role === 'admin') {
		return getAllClasses();
	} else {
		return getTeacherClasses(user.id);
	}
};
```

**When to use**:

- Shared functionality (teachers AND admins manage classes)
- Tiered access (teachers AND admins view analytics)
- Flexible permissions (admins AND teachers send messages)

**Error responses**:

- `401`: "Non autorisé - Authentification requise"
- `403`: "Interdit - Enseignants, Administrateurs uniquement"

---

## Migration Patterns

### Pattern 1: Teacher-Only Endpoint (19 occurrences)

**Files to migrate**:

- `src/routes/api/assessments/+server.ts` ✅ DONE
- `src/routes/api/assessments/[id]/+server.ts`
- `src/routes/api/assessments/[id]/assign/+server.ts`
- `src/routes/api/assessments/[id]/results/+server.ts`
- `src/routes/api/exercises/+server.ts`
- `src/routes/api/exercises/[id]/+server.ts`
- `src/routes/api/exercises/[id]/assign/+server.ts`
- `src/routes/api/exercises/[id]/export/+server.ts`
- `src/routes/api/exercises/export/+server.ts`
- `src/routes/api/exercises/import/+server.ts`
- `src/routes/api/questions/templates/+server.ts`
- `src/routes/api/questions/templates/[id]/+server.ts`
- `src/routes/api/questions/generate/[id]/+server.ts`
- `src/routes/api/rewards/gidouilles/+server.ts`
- `src/routes/api/classes/[classId]/gidouilles/+server.ts`
- `src/routes/api/classes/[classId]/warnings/+server.ts`
- `src/routes/api/test-mode/+server.ts`
- `src/routes/api/srs/decks/[id]/assign/+server.ts`
- (+ more to identify)

**Search for**: `profile.role !== 'teacher'`

**Before**:

```typescript
export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw error(401, 'Unauthorized');

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'teacher') {
		throw error(403, 'Forbidden - Teachers only');
	}

	// ... endpoint logic
};
```

**After**:

```typescript
import { requireRole } from '$lib/server/middleware/auth';

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user, profile } = await requireRole(locals, 'teacher');

	// ... endpoint logic (unchanged)
};
```

**Changes**:

1. Add import: `import { requireRole } from '$lib/server/middleware/auth';`
2. Replace auth boilerplate with: `const { user, profile } = await requireRole(locals, 'teacher');`
3. Remove old auth code (8-10 lines)

### Pattern 2: Admin-Only Endpoint (11 occurrences)

**Files to migrate**:

- `src/routes/api/admin/search-users/+server.ts` ✅ DONE
- `src/routes/api/admin/add-to-class/+server.ts`
- `src/routes/api/admin/remove-from-class/+server.ts`
- `src/routes/api/errors/+server.ts`
- `src/routes/api/errors/[id]/+server.ts`
- `src/routes/api/errors/cleanup/+server.ts`
- `src/routes/api/questions/categories/+server.ts`
- `src/routes/api/questions/categories/all/+server.ts`
- (+ more to identify)

**Search for**: `profile.role !== 'admin'`

**Before**:

```typescript
export const GET: RequestHandler = async ({ url, locals: { safeGetSession, supabase } }) => {
	const { user } = await safeGetSession();
	if (!user) throw error(401, 'Unauthorized');

	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'admin') {
		throw error(403, 'Forbidden - Admin access required');
	}

	// ... use 'supabase' variable
};
```

**After**:

```typescript
import { requireRole } from '$lib/server/middleware/auth';

export const GET: RequestHandler = async ({ url, locals }) => {
	await requireRole(locals, 'admin');

	// ... use 'locals.supabase' instead of 'supabase'
};
```

**Important**: When migrating admin routes, check if they use destructured `{ safeGetSession, supabase }`. Change to `locals` and update all `supabase` references to `locals.supabase`.

### Pattern 3: Auth-Only Endpoint (44 occurrences)

**Files to migrate**:

- `src/routes/api/chat/+server.ts` ✅ DONE
- `src/routes/api/messages/send/+server.ts` ✅ DONE
- `src/routes/api/messages/inbox/+server.ts`
- `src/routes/api/messages/sent/+server.ts`
- `src/routes/api/messages/[id]/+server.ts`
- `src/routes/api/messages/thread/+server.ts`
- `src/routes/api/messages/unread-count/+server.ts`
- `src/routes/api/messages/drafts/+server.ts`
- `src/routes/api/messages/drafts/[id]/+server.ts`
- `src/routes/api/messages/recipients/+server.ts`
- `src/routes/api/messages/search/+server.ts`
- `src/routes/api/notifications/unread/+server.ts`
- `src/routes/api/notifications/unread-count/+server.ts`
- `src/routes/api/notifications/mark-read/+server.ts`
- `src/routes/api/notifications/mark-all-read/+server.ts`
- `src/routes/api/exercises/assigned/+server.ts`
- `src/routes/api/exercises/[id]/access/+server.ts`
- `src/routes/api/exercises/[id]/complete/+server.ts`
- `src/routes/api/exercises/[id]/view/+server.ts`
- `src/routes/api/exercises/assignments/[assignmentId]/+server.ts`
- `src/routes/api/assessments/assigned/+server.ts`
- `src/routes/api/assessments/[id]/validate-attempt/+server.ts`
- `src/routes/api/riddles/[id]/submit/+server.ts`
- `src/routes/api/warnings/+server.ts`
- `src/routes/api/warnings/[id]/+server.ts`
- `src/routes/api/srs/decks/+server.ts` ✅ DONE
- `src/routes/api/srs/decks/[id]/+server.ts`
- `src/routes/api/srs/cards/+server.ts`
- `src/routes/api/srs/cards/[id]/+server.ts`
- `src/routes/api/srs/review/due/+server.ts`
- `src/routes/api/srs/review/submit/+server.ts`
- (+ more to identify)

**Search for**: `if (!user)` without role check afterward

**Before**:

```typescript
export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw error(401, 'Unauthorized');
	}

	// ... endpoint logic
};
```

**After**:

```typescript
import { requireAuth } from '$lib/server/middleware/auth';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user, profile } = await requireAuth(locals);

	// ... endpoint logic (unchanged)
};
```

**Note**: Even if you don't use `profile`, the middleware still returns it. This is fine - TypeScript won't complain about unused variables.

### Pattern 4: Student-Only Endpoint (rare)

**Search for**: `profile.role !== 'student'`

**Before**:

```typescript
export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = await locals.safeGetSession();
	if (!user) throw error(401, 'Unauthorized');

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'student') {
		throw error(403, 'Students only');
	}

	// ... endpoint logic
};
```

**After**:

```typescript
import { requireRole } from '$lib/server/middleware/auth';

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user, profile } = await requireRole(locals, 'student');

	// ... endpoint logic (unchanged)
};
```

---

## Migration Checklist

For each file you migrate:

- [ ] **Search**: Grep for `safeGetSession` to find files to migrate
- [ ] **Read**: Understand the auth pattern (teacher/admin/any role?)
- [ ] **Import**: Add `import { requireAuth/requireRole/requireRoles } from '$lib/server/middleware/auth';`
- [ ] **Replace**: Replace auth boilerplate with middleware call
- [ ] **Update locals**: If using destructured `{ supabase, safeGetSession }`, change to `locals` and update references
- [ ] **Verify**: Ensure all `user.id` and `profile.role` references still work
- [ ] **Test**: Run `pnpm build` to check for TypeScript errors
- [ ] **Test**: Manually test endpoint (or write integration test)

---

## Common Pitfalls

### 1. Destructured Locals

**Problem**: Some endpoints destructure locals:

```typescript
export const GET: RequestHandler = async ({ url, locals: { safeGetSession, supabase } }) => {
	// ...
};
```

**Solution**: Change to regular `locals`:

```typescript
export const GET: RequestHandler = async ({ url, locals }) => {
	await requireRole(locals, 'admin');
	// Update all 'supabase' references to 'locals.supabase'
};
```

### 2. Unused Profile Variable

**Problem**: ESLint warning about unused `profile` variable when you only need `user`.

**Solution**: This is fine - you can ignore the warning or use `const { user } = await requireAuth(locals)` (TypeScript will still work).

### 3. Multiple Handlers in Same File

**Problem**: File has GET, POST, PUT, DELETE handlers with different auth requirements.

**Example**:

```typescript
// GET - any authenticated user
export const GET: RequestHandler = async ({ locals }) => {
	const { user } = await requireAuth(locals);
};

// POST - teachers only
export const POST: RequestHandler = async ({ locals }) => {
	const { user } = await requireRole(locals, 'teacher');
};

// DELETE - admins only
export const DELETE: RequestHandler = async ({ locals }) => {
	const { user } = await requireRole(locals, 'admin');
};
```

**Solution**: Import all needed middleware functions and use appropriate one per handler.

### 4. Error Response Format Changes

**Problem**: Old code used different error messages.

**Solution**: New middleware uses consistent French error messages:

- `401`: "Non autorisé - Authentification requise"
- `403`: "Interdit - [Role] uniquement"

If you need custom error messages, catch the error and re-throw:

```typescript
try {
	await requireRole(locals, 'teacher');
} catch (err) {
	throw error(403, 'Custom error message');
}
```

---

## Testing Migration

### 1. Type Check

```bash
pnpm check
```

### 2. Build

```bash
pnpm build
```

### 3. Manual Testing

For each migrated endpoint, test:

- ✅ **Authenticated user with correct role**: Should work as before
- ✅ **Authenticated user with wrong role**: Should return 403 with French error
- ✅ **Unauthenticated user**: Should return 401 with French error

### 4. Integration Tests

Consider adding tests for middleware (future work):

```typescript
describe('requireRole', () => {
	it('allows teacher to access teacher-only endpoint', async () => {
		// Test implementation
	});

	it('blocks student from teacher-only endpoint', async () => {
		// Test implementation
	});
});
```

---

## Progress Tracking

### Completed (5/56 files - 9%)

- ✅ `src/routes/api/assessments/+server.ts` (GET, POST)
- ✅ `src/routes/api/admin/search-users/+server.ts` (GET)
- ✅ `src/routes/api/chat/+server.ts` (POST)
- ✅ `src/routes/api/messages/send/+server.ts` (POST)
- ✅ `src/routes/api/srs/decks/+server.ts` (GET, POST)

### Remaining Files (51 files)

#### Admin Routes (9 files)

- [ ] `src/routes/api/admin/add-to-class/+server.ts`
- [ ] `src/routes/api/admin/remove-from-class/+server.ts`
- [ ] `src/routes/api/errors/+server.ts`
- [ ] `src/routes/api/errors/[id]/+server.ts`
- [ ] `src/routes/api/errors/cleanup/+server.ts`
- [ ] `src/routes/api/errors/log/+server.ts`
- [ ] `src/routes/api/questions/categories/+server.ts`
- [ ] `src/routes/api/questions/categories/all/+server.ts`
- [ ] `src/routes/api/test-mode/+server.ts`

#### Teacher Routes (14 files)

- [ ] `src/routes/api/assessments/[id]/+server.ts`
- [ ] `src/routes/api/assessments/[id]/assign/+server.ts`
- [ ] `src/routes/api/assessments/[id]/results/+server.ts`
- [ ] `src/routes/api/exercises/+server.ts`
- [ ] `src/routes/api/exercises/[id]/+server.ts`
- [ ] `src/routes/api/exercises/[id]/assign/+server.ts`
- [ ] `src/routes/api/exercises/[id]/export/+server.ts`
- [ ] `src/routes/api/exercises/[id]/stats/+server.ts`
- [ ] `src/routes/api/exercises/export/+server.ts`
- [ ] `src/routes/api/exercises/import/+server.ts`
- [ ] `src/routes/api/questions/templates/+server.ts`
- [ ] `src/routes/api/questions/templates/[id]/+server.ts`
- [ ] `src/routes/api/questions/generate/[id]/+server.ts`
- [ ] `src/routes/api/rewards/gidouilles/+server.ts`
- [ ] `src/routes/api/classes/[classId]/gidouilles/+server.ts`
- [ ] `src/routes/api/classes/[classId]/warnings/+server.ts`
- [ ] `src/routes/api/srs/decks/[id]/assign/+server.ts`

#### Auth-Only Routes (28 files)

- [ ] `src/routes/api/messages/inbox/+server.ts`
- [ ] `src/routes/api/messages/sent/+server.ts`
- [ ] `src/routes/api/messages/[id]/+server.ts`
- [ ] `src/routes/api/messages/thread/+server.ts`
- [ ] `src/routes/api/messages/unread-count/+server.ts`
- [ ] `src/routes/api/messages/drafts/+server.ts`
- [ ] `src/routes/api/messages/drafts/[id]/+server.ts`
- [ ] `src/routes/api/messages/recipients/+server.ts`
- [ ] `src/routes/api/messages/search/+server.ts`
- [ ] `src/routes/api/notifications/unread/+server.ts`
- [ ] `src/routes/api/notifications/unread-count/+server.ts`
- [ ] `src/routes/api/notifications/mark-read/+server.ts`
- [ ] `src/routes/api/notifications/mark-all-read/+server.ts`
- [ ] `src/routes/api/exercises/assigned/+server.ts`
- [ ] `src/routes/api/exercises/[id]/access/+server.ts`
- [ ] `src/routes/api/exercises/[id]/complete/+server.ts`
- [ ] `src/routes/api/exercises/[id]/view/+server.ts`
- [ ] `src/routes/api/exercises/assignments/[assignmentId]/+server.ts`
- [ ] `src/routes/api/assessments/assigned/+server.ts`
- [ ] `src/routes/api/assessments/[id]/validate-attempt/+server.ts`
- [ ] `src/routes/api/riddles/[id]/submit/+server.ts`
- [ ] `src/routes/api/warnings/+server.ts`
- [ ] `src/routes/api/warnings/[id]/+server.ts`
- [ ] `src/routes/api/srs/decks/[id]/+server.ts`
- [ ] `src/routes/api/srs/cards/+server.ts`
- [ ] `src/routes/api/srs/cards/[id]/+server.ts`
- [ ] `src/routes/api/srs/review/due/+server.ts`
- [ ] `src/routes/api/srs/review/submit/+server.ts`

---

## Search Commands

### Find All Files to Migrate

```bash
grep -r "safeGetSession" src/routes/api --include="*.ts" -l | grep -v ".test.ts" | sort
```

### Find Teacher-Only Endpoints

```bash
grep -r "profile.role !== 'teacher'" src/routes/api --include="*.ts" -l
```

### Find Admin-Only Endpoints

```bash
grep -r "profile.role !== 'admin'" src/routes/api --include="*.ts" -l
```

### Find Auth-Only Endpoints (no role check)

```bash
grep -r "safeGetSession" src/routes/api --include="*.ts" -A5 | grep -B5 "if (!user)" | grep "\.ts-" | cut -d'-' -f1 | sort -u
```

---

## Resources

- **Middleware Source**: `/Users/david/Coding/js/ubumaths/src/lib/server/middleware/auth.ts`
- **Example Migrations**:
  - Teacher-only: `src/routes/api/assessments/+server.ts`
  - Admin-only: `src/routes/api/admin/search-users/+server.ts`
  - Auth-only: `src/routes/api/chat/+server.ts`, `src/routes/api/srs/decks/+server.ts`
- **Rate Limiter Reference**: `src/lib/server/rateLimiter.ts` (gold standard for JSDoc comments)

---

## Next Steps

1. **Priority 1**: Migrate teacher-only endpoints (14 files) - highest duplication
2. **Priority 2**: Migrate admin-only endpoints (9 files) - security-critical
3. **Priority 3**: Migrate auth-only endpoints (28 files) - largest group
4. **Future**: Add integration tests for middleware
5. **Future**: Add middleware for form actions in `+page.server.ts` files

---

**Remember**: Migration should be done incrementally. Test after each file, commit frequently, and don't rush. Quality over speed!
