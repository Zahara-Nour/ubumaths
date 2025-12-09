# API Security

## Overview

UbuMaths has 74+ API endpoints. This document covers endpoint protection patterns, rate limiting, and security best practices.

---

## Endpoint Structure

```
src/routes/
├── api/
│   ├── admin/           # Admin-only endpoints
│   │   ├── users/       # User management
│   │   ├── riddles/     # Riddle management
│   │   └── reports/     # Admin reports
│   ├── classes/         # Class management (teacher+)
│   ├── exercises/       # Exercise endpoints
│   ├── messages/        # Messaging system
│   ├── riddles/         # Riddle game
│   ├── srs/             # Spaced Repetition
│   ├── marketplace/     # Points marketplace
│   └── errors/          # Error logging
└── (protected)/
    └── api/             # Protected route APIs
```

---

## Security Layers

### Layer 1: CSRF Protection

```typescript
// src/hooks.server.ts
const isStateChangingRequest = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.request.method);

if (isStateChangingRequest && !event.url.pathname.startsWith('/api/cron')) {
	const origin = event.request.headers.get('origin');
	const host = event.request.headers.get('host');

	if (!origin || !host || new URL(origin).host !== host) {
		// Allow internal server-to-server calls
		if (origin !== null) {
			throw error(403, 'Invalid origin');
		}
	}
}
```

**Bypassed For**:

- GET/HEAD/OPTIONS requests
- Cron job endpoints (`/api/cron/*`)
- Server-to-server calls (origin is null)

### Layer 2: Authentication

```typescript
import { requireAuth } from '$lib/server/middleware/auth';

export const POST: RequestHandler = async ({ locals }) => {
	const { user, supabase } = await requireAuth(locals);
	// Guaranteed authenticated user
};
```

### Layer 3: Authorization

```typescript
import { requireRole, requireRoles } from '$lib/server/middleware/auth';

// Single role
export const POST: RequestHandler = async ({ locals }) => {
	await requireRole(locals, 'admin');
};

// Multiple roles (OR)
export const GET: RequestHandler = async ({ locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);
};
```

### Layer 4: Input Validation

```typescript
import { z } from 'zod';

const schema = z.object({
	id: z.string().uuid(),
	amount: z.number().int().positive().max(1000)
});

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const validation = schema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}
};
```

### Layer 5: Database (RLS)

```typescript
// Uses authenticated client with RLS
const { data } = await locals.supabase.from('exercises').select().eq('id', exerciseId);
// RLS automatically filters to user's accessible data
```

---

## Standard Endpoint Template

```typescript
// src/routes/api/items/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { z } from 'zod';

// 1. Define schema
const createItemSchema = z.object({
	name: z.string().min(1).max(100),
	description: z.string().max(500).optional(),
	quantity: z.number().int().positive().max(1000)
});

export const POST: RequestHandler = async ({ request, locals }) => {
	// 2. Authenticate
	const { user, supabase } = await requireAuth(locals);

	// 3. Validate input
	const body = await request.json();
	const validation = createItemSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { name, description, quantity } = validation.data;

	// 4. Business logic with RLS-protected client
	const { data, error: dbError } = await supabase
		.from('items')
		.insert({
			name,
			description,
			quantity,
			user_id: user.id
		})
		.select()
		.single();

	if (dbError) {
		console.error('Database error:', dbError);
		throw error(500, 'Erreur lors de la creation');
	}

	// 5. Return sanitized response
	return json(data, { status: 201 });
};
```

---

## Rate Limiting

### Current Implementation

Two rate limiters exist:

1. **General middleware** (`src/lib/server/middleware/rateLimit.ts`) - Reusable
2. **AI Tutor specific** (`src/lib/server/tutor/tutor-rate-limiter.ts`)

```typescript
// src/lib/server/middleware/rateLimit.ts
import { rateLimit } from '$lib/server/middleware/rateLimit';

// Usage - throws 429 if exceeded
rateLimit(`error-log:${clientIp}`, 20, 60000); // 20/min by IP
rateLimit(`messages:${user.id}`, 30, 60000); // 30/min by user
```

### Currently Protected Endpoints

| Endpoint          | Limit     | Key        | Status |
| ----------------- | --------- | ---------- | ------ |
| `/api/errors/log` | 20/min    | IP address | ✅     |
| `/api/tutor/*`    | env-based | User ID    | ✅     |

### Endpoints Needing Rate Limiting (Future)

| Endpoint                   | Recommended Limit | Reason                 | Priority |
| -------------------------- | ----------------- | ---------------------- | -------- |
| `/api/messages/send`       | 30/min            | Spam prevention        | Medium   |
| `/api/riddles/[id]/submit` | 20/min            | Brute force prevention | High     |
| `/api/exercises/submit`    | 60/min            | Fair usage             | Low      |
| `/api/auth/*`              | 5/min             | Login brute force      | High     |

---

## Rate Limiting Strategy (Future Implementation)

### Architecture Decision

**Current: In-Memory (acceptable for educational app)**

```
┌─────────────────┐     ┌─────────────────┐
│   Instance A    │     │   Instance B    │
│  Map<key,count> │     │  Map<key,count> │
│   (isolated)    │     │   (isolated)    │
└─────────────────┘     └─────────────────┘
```

- **Pro**: No cost, simple, sufficient for moderate traffic
- **Con**: Each Vercel instance has separate counters (leakage between instances)
- **Impact**: User could get `limit × number_of_instances` requests in worst case

**Future: Redis (if needed)**

```
┌─────────────────┐     ┌─────────────────┐
│   Instance A    │     │   Instance B    │
└────────┬────────┘     └────────┬────────┘
         └───────────┬───────────┘
              ┌──────▼──────┐
              │    Redis    │
              │  (shared)   │
              └─────────────┘
```

- **Pro**: Accurate global counting
- **Con**: Cost (~$10-25/month for Upstash/Redis Cloud)
- **When**: If abuse becomes a real problem

### Implementation Recommendations

1. **Use conservative limits** to avoid false positives:

   ```typescript
   // Generous limits for educational context
   rateLimit(`riddle:${user.id}`, 20, 60000); // 20/min not 10
   ```

2. **Consider school NAT**: Multiple students behind same IP

   ```typescript
   // Prefer user ID over IP when authenticated
   const key = user?.id ? `submit:${user.id}` : `submit:${clientIp}`;
   ```

3. **Add warning logs** before blocking:

   ```typescript
   if (record.count === maxRequests - 5) {
   	console.warn(`[RATE_LIMIT] ${key} approaching limit`);
   }
   ```

4. **Priority order** for implementation:
   - `/api/riddles/[id]/submit` - Anti-cheat
   - `/api/auth/*` - Security critical
   - `/api/messages/send` - Spam prevention
   - Others as needed

### Decision Matrix

| Scenario                  | Action              |
| ------------------------- | ------------------- |
| Educational app, low risk | In-memory (current) |
| Abuse detected            | Add more endpoints  |
| Persistent abuse          | Consider Redis      |
| High-value transactions   | Redis + stricter    |

---

## Error Handling

### Safe Error Responses

```typescript
// DO: Generic error message
throw error(500, 'Erreur lors de la creation');

// DON'T: Leak internal details
throw error(500, `Database error: ${dbError.message}`);
```

### Error Logging Pattern

```typescript
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// ... logic
	} catch (err) {
		// Log full error server-side
		console.error('API Error:', {
			endpoint: '/api/items',
			error: err,
			userId: locals.user?.id
		});

		// Return safe message to client
		if (err instanceof Error && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}
		throw error(500, 'Erreur interne du serveur');
	}
};
```

---

## Sensitive Endpoints

### Admin Endpoints

```typescript
// src/routes/api/admin/users/[id]/+server.ts
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	// 1. Admin only
	await requireRole(locals, 'admin');

	// 2. Validate UUID
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(params.id)) {
		throw error(400, 'Invalid user ID format');
	}

	// 3. Validate body
	const body = await request.json();
	const validation = updateUserSchema.safeParse(body);
	// ...
};
```

### Financial/Points Endpoints

```typescript
// src/routes/api/marketplace/purchase/+server.ts
export const POST: RequestHandler = async ({ request, locals }) => {
	const { user, supabase } = await requireAuth(locals);

	// Validate purchase request
	const validation = purchaseSchema.safeParse(await request.json());
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	// Use transaction for atomicity
	const { data, error: dbError } = await supabase.rpc('purchase_item', {
		p_user_id: user.id,
		p_item_id: validation.data.itemId,
		p_quantity: validation.data.quantity
	});

	if (dbError) {
		throw error(400, dbError.message);
	}

	return json(data);
};
```

---

## IDOR Prevention

### Vulnerable Pattern

```typescript
// BAD: No ownership check
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { supabase } = await requireAuth(locals);

	await supabase.from('items').delete().eq('id', params.id);
	// Anyone can delete any item!
};
```

### Secure Pattern

```typescript
// GOOD: RLS handles ownership
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { user, supabase } = await requireAuth(locals);

	// RLS policy: user_id = auth.uid()
	const { error: dbError } = await supabase.from('items').delete().eq('id', params.id);
	// Only deletes if user owns the item

	if (dbError) {
		throw error(403, 'Acces refuse');
	}

	return new Response(null, { status: 204 });
};
```

### Explicit Ownership Check

```typescript
// Alternative: Explicit check when RLS insufficient
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { user, supabase } = await requireAuth(locals);

	// Check ownership
	const { data: item } = await supabase
		.from('items')
		.select('user_id')
		.eq('id', params.id)
		.single();

	if (!item || item.user_id !== user.id) {
		throw error(403, 'Acces refuse');
	}

	await supabase.from('items').delete().eq('id', params.id);
	return new Response(null, { status: 204 });
};
```

---

## Cron/Background Jobs

### Authentication

Cron endpoints use a shared secret:

```typescript
// src/routes/api/cron/daily-tasks/+server.ts
import { env } from '$lib/server/env';

export const GET: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('authorization');

	if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
		throw error(401, 'Unauthorized');
	}

	// Run cron tasks...
};
```

### Vercel Cron Configuration

```json
// vercel.json
{
	"crons": [
		{
			"path": "/api/cron/daily-tasks",
			"schedule": "0 0 * * *"
		}
	]
}
```

---

## API Response Security

### Sanitize Response Data

```typescript
// Remove sensitive fields before returning
const { data: user } = await supabase
	.from('profiles')
	.select('id, name, avatar_url') // Don't select sensitive fields
	.eq('id', userId)
	.single();

return json(user);
```

### Consistent Response Format

```typescript
// Success
return json({
	success: true,
	data: result
});

// Error (handled by SvelteKit)
throw error(400, 'Message descriptif');

// Paginated
return json({
	data: items,
	pagination: {
		page,
		limit,
		total,
		hasMore: page * limit < total
	}
});
```

---

## Security Checklist

For every new endpoint:

- [ ] Uses `requireAuth()` or `requireRole()`
- [ ] Has Zod validation for all inputs
- [ ] Route params validated (especially UUIDs)
- [ ] Uses RLS-protected supabase client
- [ ] Error messages don't leak internals
- [ ] Considers rate limiting needs
- [ ] Response data is sanitized
- [ ] Tested for IDOR vulnerabilities
