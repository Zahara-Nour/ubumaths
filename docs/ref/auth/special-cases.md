# Special Auth Cases

> Student import system, approval workflow, rate limiting, and edge cases.

## Student Import System

### Overview

Teachers can pre-import students before they authenticate. When a pre-imported student signs in, they're automatically enrolled in their assigned classes with an approved status.

### Database Schema

**Migration**: `026_create_pending_students_table.sql`

```sql
CREATE TABLE pending_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    firstname TEXT NOT NULL,
    lastname TEXT NOT NULL,
    grade TEXT,
    school_id UUID REFERENCES schools(id),
    gender TEXT CHECK (gender IN ('boy', 'girl')),
    class_ids UUID[],           -- Pre-assigned classes
    is_activated BOOLEAN DEFAULT FALSE,
    activated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);
```

### Import Flow

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Teacher   │     │   Database   │     │   Student    │
└──────┬──────┘     └──────┬───────┘     └──────┬───────┘
       │                   │                    │
       │ Import CSV        │                    │
       │ (name, email,     │                    │
       │  class_id)        │                    │
       │──────────────────▶│                    │
       │                   │                    │
       │                   │ INSERT into        │
       │                   │ pending_students   │
       │                   │──────────┐         │
       │                   │          │         │
       │                   │◀─────────┘         │
       │                   │                    │
       │                   │                    │ Student signs in
       │                   │                    │ (Google OAuth)
       │                   │◀───────────────────│
       │                   │                    │
       │                   │ Trigger checks     │
       │                   │ pending_students   │
       │                   │──────────┐         │
       │                   │          │         │
       │                   │◀─────────┘         │
       │                   │                    │
       │                   │ Create profile     │
       │                   │ (status=approved)  │
       │                   │──────────┐         │
       │                   │          │         │
       │                   │◀─────────┘         │
       │                   │                    │
       │                   │ Enroll in classes  │
       │                   │──────────┐         │
       │                   │          │         │
       │                   │◀─────────┘         │
       │                   │                    │
       │                   │ Mark activated     │
       │                   │──────────┐         │
       │                   │          │         │
       │                   │◀─────────┘         │
       │                   │                    │
       │                   │    Redirect to     │
       │                   │    /dashboard      │
       │                   │───────────────────▶│
       │                   │                    │
```

### Trigger Implementation

```sql
-- In handle_new_user() trigger
SELECT * INTO pending_student
FROM pending_students
WHERE email = NEW.email;

IF FOUND THEN
    -- Pre-imported: auto-approve and enroll
    INSERT INTO profiles (id, email, full_name, role, status)
    VALUES (NEW.id, NEW.email, pending_student.firstname || ' ' || pending_student.lastname, 'student', 'approved');

    -- Enroll in pre-assigned classes
    IF pending_student.class_ids IS NOT NULL THEN
        INSERT INTO class_members (class_id, student_id)
        SELECT unnest(pending_student.class_ids), NEW.id;
    END IF;

    -- Mark as activated
    UPDATE pending_students
    SET is_activated = TRUE, activated_at = NOW()
    WHERE id = pending_student.id;
END IF;
```

### Import API

**File**: `src/routes/api/teacher/students/import/+server.ts`

```typescript
export const POST: RequestHandler = async ({ request, locals }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	const { students, classId } = await request.json();

	// Validate each student
	for (const student of students) {
		await supabase.from('pending_students').upsert(
			{
				email: student.email,
				firstname: student.firstname,
				lastname: student.lastname,
				class_ids: [classId],
				created_by: profile.id
			},
			{
				onConflict: 'email',
				ignoreDuplicates: false
			}
		);
	}

	return json({ imported: students.length });
};
```

---

## User Approval Workflow

### Status Transitions

```
                    ┌───────────────────────────┐
                    │       New User Signs Up   │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
            @voltairedoha.com               Other domain
                    │                           │
                    ▼                           ▼
            ┌───────────────┐           ┌───────────────┐
            │    PENDING    │           │   APPROVED    │
            └───────┬───────┘           └───────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           │           ▼
┌───────────────┐   │   ┌───────────────┐
│   APPROVED    │   │   │   REJECTED    │
└───────────────┘   │   └───────┬───────┘
                    │           │
                    │           ▼
                    │   ┌───────────────┐
                    │   │  Signed Out   │
                    │   │  Access Denied │
                    │   └───────────────┘
                    │
            Admin action required
```

### Approval API

**File**: `src/routes/api/admin/users/[id]/status/+server.ts`

```typescript
export const PATCH: RequestHandler = async ({ request, locals, params }) => {
	const { profile: approverProfile } = await requireRoles(locals, ['teacher', 'admin']);
	const userId = params.id;

	// Validate input
	const schema = z.object({
		status: z.enum(['approved', 'rejected']),
		rejection_reason: z.string().optional()
	});
	const { status, rejection_reason } = schema.parse(await request.json());

	// Update profile status
	const { data: updatedProfile } = await supabase
		.from('profiles')
		.update({
			status,
			rejection_reason: status === 'rejected' ? rejection_reason : null,
			status_changed_at: new Date().toISOString(),
			status_changed_by: approverProfile.id
		})
		.eq('id', userId)
		.select()
		.single();

	// Notify user
	if (status === 'approved') {
		await createSystemNotification(supabase, {
			title: 'Compte approuvé',
			message: `Bienvenue ${updatedProfile.full_name}! Votre compte a été approuvé.`,
			target_user_ids: [userId]
		});
	}

	return json({ success: true });
};
```

### Pending Approval Page

**File**: `src/routes/(public)/auth/pending-approval/+page.svelte`

```svelte
<script lang="ts">
	let { data } = $props();
</script>

<div class="flex min-h-screen flex-col items-center justify-center">
	<Card class="max-w-md">
		<CardHeader>
			<CardTitle>Compte en attente d'approbation</CardTitle>
		</CardHeader>
		<CardContent>
			<p>
				Votre compte a été créé mais nécessite l'approbation d'un administrateur. Vous recevrez une
				notification une fois votre compte activé.
			</p>
		</CardContent>
		<CardFooter>
			<form method="POST" action="/auth/logout">
				<Button type="submit" variant="outline">Se déconnecter</Button>
			</form>
		</CardFooter>
	</Card>
</div>
```

---

## Rate Limiting

### Configuration

**File**: `src/lib/server/rateLimiter.ts`

```typescript
interface RateLimitConfig {
	maxAttempts: number;
	windowSeconds: number;
}

const RATE_LIMITS = {
	loginByIP: { maxAttempts: 5, windowSeconds: 900 }, // 5 per 15 min
	loginByEmail: { maxAttempts: 3, windowSeconds: 900 }, // 3 per 15 min
	signupByIP: { maxAttempts: 3, windowSeconds: 3600 }, // 3 per hour
	oauthByIP: { maxAttempts: 10, windowSeconds: 900 }, // 10 per 15 min
	chatbotByUser: { maxAttempts: 5, windowSeconds: 900 } // 5 per 15 min
};
```

### Database Table

```sql
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,        -- IP, email, or user_id
    action TEXT NOT NULL,            -- 'login_ip', 'login_email', etc.
    attempts INTEGER DEFAULT 1,
    first_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (identifier, action)
);

CREATE INDEX idx_rate_limits_cleanup ON rate_limits (last_attempt_at);
```

### Check Function

```typescript
export async function checkRateLimit(
	identifier: string,
	action: string,
	config: RateLimitConfig
): Promise<{ allowed: boolean; retryAfter?: number }> {
	const supabase = createServiceRoleClient();

	const { data: existing } = await supabase
		.from('rate_limits')
		.select('*')
		.eq('identifier', identifier)
		.eq('action', action)
		.single();

	if (!existing) {
		// First attempt
		await supabase.from('rate_limits').insert({
			identifier,
			action,
			attempts: 1
		});
		return { allowed: true };
	}

	const windowStart = new Date(Date.now() - config.windowSeconds * 1000);
	const firstAttempt = new Date(existing.first_attempt_at);

	if (firstAttempt < windowStart) {
		// Window expired, reset counter
		await supabase
			.from('rate_limits')
			.update({
				attempts: 1,
				first_attempt_at: new Date().toISOString(),
				last_attempt_at: new Date().toISOString()
			})
			.eq('id', existing.id);
		return { allowed: true };
	}

	if (existing.attempts >= config.maxAttempts) {
		// Rate limited
		const retryAfter = Math.ceil(
			(firstAttempt.getTime() + config.windowSeconds * 1000 - Date.now()) / 1000
		);
		return { allowed: false, retryAfter };
	}

	// Increment counter
	await supabase
		.from('rate_limits')
		.update({
			attempts: existing.attempts + 1,
			last_attempt_at: new Date().toISOString()
		})
		.eq('id', existing.id);

	return { allowed: true };
}
```

### Usage in Auth

```typescript
// In login action
const ipLimit = await checkLoginRateLimitByIP(getClientAddress());
if (!ipLimit.allowed) {
	return fail(429, {
		error: `Trop de tentatives. Réessayez dans ${ipLimit.retryAfter} secondes.`
	});
}

const emailLimit = await checkLoginRateLimitByEmail(email);
if (!emailLimit.allowed) {
	return fail(429, {
		error: `Trop de tentatives pour cette adresse. Réessayez dans ${emailLimit.retryAfter} secondes.`
	});
}
```

---

## Edge Cases

### 1. Profile Not Found After Login

**Scenario**: User exists in `auth.users` but not in `profiles`.

**Cause**: Trigger `on_auth_user_created` failed or was disabled.

**Handling**:

```typescript
// In userProfileHandle
if (user && !profile) {
	await event.locals.supabase.auth.signOut();
	throw redirect(303, '/auth/login?error=Profile not found. Please contact support.');
}
```

### 2. Student Logs In Before Import

**Scenario**: Student signs in before teacher imports them.

**Handling**: They get `status='pending'` and wait for approval. If teacher later imports them, admin must manually approve or teacher can add them to class.

### 3. Email Domain Change

**Scenario**: User changes their email from @voltairedoha.com to another domain.

**Handling**: Email change goes through Supabase's email verification. The new email doesn't affect their existing `status` - they remain approved.

### 4. Admin Removes Own Admin Role

**Scenario**: Last admin accidentally demotes themselves.

**Prevention**: Add check in role update API:

```typescript
const adminCount = await supabase
	.from('profiles')
	.select('id', { count: 'exact' })
	.eq('role', 'admin');

if (adminCount.count === 1 && userId === currentAdminId) {
	return fail(400, { error: 'Cannot remove the last admin' });
}
```

### 5. Session Timeout During Form Submission

**Scenario**: User's session expires while filling a form.

**Handling**: Server returns 401, client redirects to login with return URL:

```typescript
if (error.status === 401) {
	goto(`/auth/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
}
```

### 6. Multiple Tabs with Different Auth States

**Scenario**: User logs out in one tab, continues using another.

**Handling**: `onAuthStateChange` listener invalidates data:

```typescript
supabase.auth.onAuthStateChange((event) => {
	if (event === 'SIGNED_OUT') {
		invalidate('supabase:auth');
		// Or force redirect
		goto('/auth/login');
	}
});
```

---

## Security Considerations

### Domain Restriction Bypass Attempts

The domain check happens server-side after OAuth:

```typescript
if (!email?.endsWith('@voltairedoha.com')) {
	await supabase.auth.signOut(); // Clear any session created
	throw redirect(303, '/login?error=...');
}
```

Cannot be bypassed because:

1. OAuth callback is server-side only
2. Domain check happens after session creation
3. Session is immediately invalidated if check fails

### Rate Limit Bypass Attempts

- IP-based: Use both IP and email limits
- Email enumeration: Same response for valid/invalid emails
- Distributed attacks: Could add CAPTCHA for repeated failures

### Session Fixation

Prevented by Supabase's session management:

- New session ID on login
- HTTP-only, Secure, SameSite cookies
- Server-side session verification
