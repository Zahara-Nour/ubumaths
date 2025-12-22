# Authentication Flows

> Detailed diagrams and code for all authentication flows.

## Login Flows

### Email/Password Login

**Route**: `POST /auth/login?/login`

**File**: `src/routes/(public)/auth/login/+page.server.ts`

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│  Client  │     │ +page.server │     │   Supabase   │     │ Database │
└────┬─────┘     └──────┬───────┘     └──────┬───────┘     └────┬─────┘
     │                  │                    │                  │
     │ POST /login      │                    │                  │
     │─────────────────▶│                    │                  │
     │                  │                    │                  │
     │                  │ checkRateLimit(ip) │                  │
     │                  │────────────────────│─────────────────▶│
     │                  │                    │                  │
     │                  │ checkRateLimit(email)                 │
     │                  │────────────────────│─────────────────▶│
     │                  │                    │                  │
     │                  │ Zod validation     │                  │
     │                  │──────────┐         │                  │
     │                  │          │         │                  │
     │                  │◀─────────┘         │                  │
     │                  │                    │                  │
     │                  │ signInWithPassword │                  │
     │                  │───────────────────▶│                  │
     │                  │                    │                  │
     │                  │    Set cookies     │                  │
     │                  │◀───────────────────│                  │
     │                  │                    │                  │
     │  redirect /dashboard                  │                  │
     │◀─────────────────│                    │                  │
     │                  │                    │                  │
```

**Code**:

```typescript
login: async ({ request, locals: { supabase }, getClientAddress }) => {
	const formData = await request.formData();
	const ip = getClientAddress();

	// 1. Rate limiting
	const ipLimit = await checkLoginRateLimitByIP(ip);
	if (!ipLimit.allowed) {
		return fail(429, { error: `Too many attempts. Try again in ${ipLimit.retryAfter}s` });
	}

	const email = formData.get('email') as string;
	const emailLimit = await checkLoginRateLimitByEmail(email);
	if (!emailLimit.allowed) {
		return fail(429, { error: `Too many attempts. Try again in ${emailLimit.retryAfter}s` });
	}

	// 2. Validate input
	const validation = validateFormData(loginFormSchema, formData);
	if (!validation.success) {
		return fail(400, { error: validation.error });
	}

	// 3. Sign in (sets cookies automatically)
	const { error } = await supabase.auth.signInWithPassword({
		email: validation.data.email,
		password: validation.data.password
	});

	if (error) {
		return fail(401, { error: 'Email ou mot de passe incorrect' });
	}

	// 4. Redirect to dashboard
	throw redirect(303, '/dashboard');
};
```

---

### Google OAuth Login

**Routes**:

- `POST /auth/login?/googleSignIn` - Initiates OAuth
- `GET /auth/callback` - Handles OAuth callback

**Files**:

- `src/routes/(public)/auth/login/+page.server.ts`
- `src/routes/(public)/auth/callback/+server.ts`

```
┌──────────┐   ┌────────────┐   ┌────────┐   ┌──────────┐   ┌──────────┐
│  Client  │   │ SvelteKit  │   │ Google │   │ Supabase │   │ Database │
└────┬─────┘   └─────┬──────┘   └────┬───┘   └────┬─────┘   └────┬─────┘
     │               │               │            │               │
     │ POST googleSignIn             │            │               │
     │──────────────▶│               │            │               │
     │               │               │            │               │
     │               │ signInWithOAuth            │               │
     │               │───────────────│───────────▶│               │
     │               │               │            │               │
     │ redirect to Google consent    │            │               │
     │◀──────────────│               │            │               │
     │               │               │            │               │
     │ User consents │               │            │               │
     │──────────────▶│◀──────────────│            │               │
     │               │               │            │               │
     │ GET /callback?code=xxx        │            │               │
     │──────────────▶│               │            │               │
     │               │               │            │               │
     │               │ exchangeCodeForSession     │               │
     │               │───────────────│───────────▶│               │
     │               │               │            │               │
     │               │ Validate @voltairedoha.com │               │
     │               │──────────┐    │            │               │
     │               │          │    │            │               │
     │               │◀─────────┘    │            │               │
     │               │               │            │               │
     │               │ Check/create profile       │               │
     │               │───────────────│────────────│──────────────▶│
     │               │               │            │               │
     │ redirect /dashboard or /pending-approval   │               │
     │◀──────────────│               │            │               │
```

**OAuth Initiation**:

```typescript
googleSignIn: async ({ locals: { supabase }, url }) => {
	const origin = url.origin;

	const { data, error } = await supabase.auth.signInWithOAuth({
		provider: 'google',
		options: {
			redirectTo: `${origin}/auth/callback`
		}
	});

	if (error) {
		return fail(500, { error: 'OAuth initialization failed' });
	}

	throw redirect(303, data.url);
};
```

**OAuth Callback**:

```typescript
export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	const code = url.searchParams.get('code');

	// 1. Exchange code for session
	const { data, error } = await supabase.auth.exchangeCodeForSession(code);
	if (error) throw redirect(303, '/login?error=Authentication failed');

	const { user } = data;
	const email = user.email;

	// 2. Validate domain
	const ALLOWED_DOMAIN = '@voltairedoha.com';
	if (!email?.endsWith(ALLOWED_DOMAIN)) {
		await supabase.auth.signOut();
		throw redirect(303, `/login?error=Only @voltairedoha.com allowed`);
	}

	// 3. Check for existing profile
	const { data: existingProfile } = await supabase
		.from('profiles')
		.select('*')
		.eq('id', user.id)
		.single();

	// 4. Handle new user
	if (!existingProfile) {
		// Profile created by trigger, redirect to pending
		throw redirect(303, '/auth/pending-approval');
	}

	// 5. Check approval status
	if (existingProfile.status === 'pending') {
		throw redirect(303, '/auth/pending-approval');
	}
	if (existingProfile.status === 'rejected') {
		await supabase.auth.signOut();
		throw redirect(303, '/login?error=Account rejected');
	}

	// 6. Success
	throw redirect(303, '/dashboard');
};
```

---

## Logout Flow

**Route**: `POST /auth/logout`

**File**: `src/routes/(public)/auth/logout/+server.ts`

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  Client  │     │ +server.ts   │     │   Supabase   │
└────┬─────┘     └──────┬───────┘     └──────┬───────┘
     │                  │                    │
     │ POST /logout     │                    │
     │─────────────────▶│                    │
     │                  │                    │
     │                  │ auth.signOut()     │
     │                  │───────────────────▶│
     │                  │                    │
     │                  │ Clear cookies      │
     │                  │◀───────────────────│
     │                  │                    │
     │  redirect /      │                    │
     │◀─────────────────│                    │
```

**Code**:

```typescript
export const POST: RequestHandler = async ({ locals: { supabase } }) => {
	await supabase.auth.signOut();
	throw redirect(303, '/');
};
```

---

## Password Reset Flow

**Routes**:

1. `POST /auth/reset-password` - Request reset email
2. `GET /auth/confirm?type=recovery` - Verify token
3. `POST /auth/update-password` - Set new password

**Files**:

- `src/routes/(public)/auth/reset-password/+page.server.ts`
- `src/routes/(public)/auth/confirm/+server.ts`
- `src/routes/(public)/auth/update-password/+page.server.ts`

```
┌──────────┐    ┌─────────────┐    ┌──────────┐    ┌───────┐
│  Client  │    │  SvelteKit  │    │ Supabase │    │ Email │
└────┬─────┘    └──────┬──────┘    └────┬─────┘    └───┬───┘
     │                 │                │              │
     │ POST email      │                │              │
     │────────────────▶│                │              │
     │                 │                │              │
     │                 │ resetPasswordForEmail         │
     │                 │───────────────▶│              │
     │                 │                │              │
     │                 │                │ Send email   │
     │                 │                │─────────────▶│
     │                 │                │              │
     │ "Check inbox"   │                │              │
     │◀────────────────│                │              │
     │                 │                │              │
     │                 │                │              │
     │ Click email link                 │              │
     │─────────────────────────────────▶│◀─────────────│
     │                 │                │              │
     │ GET /confirm?token_hash=xxx&type=recovery       │
     │────────────────▶│                │              │
     │                 │                │              │
     │                 │ verifyOtp()    │              │
     │                 │───────────────▶│              │
     │                 │                │              │
     │ redirect /update-password        │              │
     │◀────────────────│                │              │
     │                 │                │              │
     │ POST new password                │              │
     │────────────────▶│                │              │
     │                 │                │              │
     │                 │ updateUser({password})        │
     │                 │───────────────▶│              │
     │                 │                │              │
     │ redirect /dashboard              │              │
     │◀────────────────│                │              │
```

**Request Reset**:

```typescript
// src/routes/(public)/auth/reset-password/+page.server.ts
export const actions = {
	default: async ({ request, locals: { supabase }, url }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;

		const { error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${url.origin}/auth/confirm`
		});

		// Always return success (don't reveal if email exists)
		return { success: true };
	}
};
```

**Verify Token**:

```typescript
// src/routes/(public)/auth/confirm/+server.ts
export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	const token_hash = url.searchParams.get('token_hash');
	const type = url.searchParams.get('type');

	if (type === 'recovery') {
		const { error } = await supabase.auth.verifyOtp({
			type: 'recovery',
			token_hash
		});

		if (error) {
			throw redirect(303, '/auth/reset-password?error=Invalid or expired link');
		}

		throw redirect(303, '/auth/update-password');
	}
};
```

**Update Password**:

```typescript
// src/routes/(public)/auth/update-password/+page.server.ts
export const actions = {
	default: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const password = formData.get('password') as string;

		const { error } = await supabase.auth.updateUser({ password });

		if (error) {
			return fail(400, { error: error.message });
		}

		throw redirect(303, '/dashboard');
	}
};
```

---

## Email Verification Flow

**Route**: `GET /auth/confirm?type=signup|email`

**File**: `src/routes/(public)/auth/confirm/+server.ts`

Used for:

- New account email confirmation (`type=signup`)
- Email change confirmation (`type=email_change`)
- Magic link login (`type=magiclink`)

```typescript
export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	const token_hash = url.searchParams.get('token_hash');
	const type = url.searchParams.get('type');

	if (token_hash && type) {
		const { error } = await supabase.auth.verifyOtp({
			type: type as 'signup' | 'email' | 'recovery' | 'magiclink' | 'email_change',
			token_hash
		});

		if (error) {
			throw redirect(303, '/auth/login?error=Verification failed');
		}
	}

	throw redirect(303, '/dashboard');
};
```

---

## Error Handling

All auth flows handle errors consistently:

| Error Type          | User Message                         | HTTP Code    |
| ------------------- | ------------------------------------ | ------------ |
| Rate limited        | "Too many attempts. Try again in Xs" | 429          |
| Invalid credentials | "Email ou mot de passe incorrect"    | 401          |
| Domain not allowed  | "Only @voltairedoha.com allowed"     | 303 redirect |
| Account pending     | Redirect to `/auth/pending-approval` | 303 redirect |
| Account rejected    | "Accès refusé"                       | 303 redirect |
| Invalid token       | "Invalid or expired link"            | 303 redirect |
| Server error        | "Une erreur est survenue"            | 500          |

Errors are passed via URL parameters or form action returns:

```typescript
// Via URL (for redirects)
throw redirect(303, '/auth/login?error=' + encodeURIComponent(message));

// Via form action (for same-page errors)
return fail(400, { error: message });
```
