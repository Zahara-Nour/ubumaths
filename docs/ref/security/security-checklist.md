# Security Checklist

Quick reference checklist for developers. Use this when creating new features, reviewing code, or before commits.

---

## New API Endpoint Checklist

```
□ Authentication
  □ Uses requireAuth() or requireRole()
  □ Returns 401 for unauthenticated requests
  □ Returns 403 for unauthorized requests

□ Input Validation
  □ Zod schema created in src/lib/server/validation/
  □ All request.json() validated with .safeParse()
  □ All URL params validated (especially UUIDs)
  □ Query params validated with coerce for numbers

□ Validation Bounds
  □ Strings have .max() limit
  □ Numbers have .min() and .max()
  □ Arrays have .max() limit
  □ UUIDs use .uuid() validation

□ Database
  □ Uses locals.supabase (not service role)
  □ RLS policies protect the data
  □ No raw SQL with user input

□ Response
  □ Error messages don't leak internals
  □ Sensitive fields excluded from response
  □ Uses json() for data responses

□ Rate Limiting (if applicable)
  □ Considered for sensitive operations
  □ Implemented if high-value target
```

---

## New Database Table Checklist

```
□ Schema
  □ Table created in migration file
  □ Appropriate column types
  □ NOT NULL on required fields
  □ DEFAULT values where appropriate

□ Relationships
  □ Foreign keys defined
  □ ON DELETE CASCADE where appropriate
  □ Indexes on foreign keys
  □ Indexes on frequently queried columns

□ Security
  □ RLS enabled: ALTER TABLE ... ENABLE ROW LEVEL SECURITY
  □ SELECT policy defined
  □ INSERT policy with WITH CHECK
  □ UPDATE policy with USING and WITH CHECK
  □ DELETE policy defined
  □ Admin override policy if needed
  □ Teacher access policy if needed

□ Documentation
  □ Types updated in database.ts
  □ Schema documented in database-schema.md
```

---

## New Component Checklist

```
□ Data Handling
  □ Props typed with interface
  □ User input validated before use
  □ No sensitive data in localStorage

□ XSS Prevention
  □ {@html} only used with sanitized content
  □ Imported sanitize from $lib/utils/sanitize
  □ User-generated content sanitized

□ URLs
  □ External URLs validated before redirect
  □ Links use rel="noopener" for external

□ Events
  □ Form submissions prevent default
  □ Sensitive data cleared after use
```

---

## Code Review Security Checklist

```
□ Authentication
  □ All protected routes have auth checks
  □ Role checks match route requirements
  □ No auth bypass paths

□ Authorization
  □ Users can't access other users' data
  □ Role escalation not possible
  □ IDOR vulnerabilities checked

□ Input Validation
  □ All user input validated
  □ Bounds checking present
  □ No SQL injection vectors
  □ No command injection vectors

□ Output Encoding
  □ XSS prevention in templates
  □ Sanitization before @html
  □ API responses don't leak sensitive data

□ Error Handling
  □ Errors logged server-side only
  □ User-facing errors are generic
  □ No stack traces exposed

□ Dependencies
  □ No known vulnerabilities
  □ Third-party code reviewed
```

---

## Pre-Commit Mental Checklist

Before each commit, verify:

```
□ Zod validation on all request.json() and query params
□ Numeric bounds (.min(), .max()), array limits, UUID validation
□ No any types
□ MySelect/MyCheckbox (not Shadcn/native)
□ Svelte 5 runes only
□ Tests exist for new code
□ No sensitive data in logs
□ Error messages in French
```

---

## Quick Reference: Secure Patterns

### API Endpoint

```typescript
import { json, error } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/middleware/auth';
import { z } from 'zod';

const schema = z.object({
	id: z.string().uuid(),
	amount: z.number().int().positive().max(1000)
});

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user, supabase } = await requireAuth(locals);

	const validation = schema.safeParse(await request.json());
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { data } = await supabase
		.from('items')
		.insert({ ...validation.data, user_id: user.id })
		.select()
		.single();

	return json(data);
};
```

### RLS Policy

```sql
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own items"
ON items FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### Safe HTML Rendering

```svelte
<script>
	import { sanitize } from '$lib/utils/sanitize';
	let { content } = $props();
</script>

{@html sanitize(content)}
```

### Route Parameter Validation

```typescript
function validateUuidParam(id: string): string {
	const result = z.string().uuid().safeParse(id);
	if (!result.success) {
		throw error(400, 'Invalid ID format');
	}
	return result.data;
}
```

---

## Common Mistakes to Avoid

### Authentication

```typescript
// ❌ WRONG: No auth check
export const POST: RequestHandler = async ({ request }) => { ... }

// ✅ CORRECT: Auth required
export const POST: RequestHandler = async ({ request, locals }) => {
    const { user } = await requireAuth(locals);
    ...
}
```

### Input Validation

```typescript
// ❌ WRONG: No validation
const { id, amount } = await request.json();

// ✅ CORRECT: Validated
const validation = schema.safeParse(await request.json());
if (!validation.success) throw error(400, ...);
const { id, amount } = validation.data;
```

### Database Access

```typescript
// ❌ WRONG: Service role for user data
const client = createServiceRoleClient();
const { data } = await client.from('items').select();

// ✅ CORRECT: User's client with RLS
const { data } = await locals.supabase.from('items').select();
```

### Error Messages

```typescript
// ❌ WRONG: Leaks internals
throw error(500, `Database error: ${dbError.message}`);

// ✅ CORRECT: Generic message
console.error('Database error:', dbError);
throw error(500, 'Erreur lors de la creation');
```

### HTML Rendering

```svelte
<!-- ❌ WRONG: Unsanitized -->
{@html userContent}

<!-- ✅ CORRECT: Sanitized -->
{@html sanitize(userContent)}
```

---

## Emergency Contacts

- **Security Issues**: GitHub Issues (private)
- **Incident Response**: Check [audit-findings.md](audit-findings.md)
