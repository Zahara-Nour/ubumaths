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

Rate limiting is implemented for the AI tutor:

```typescript
// src/lib/server/tutor/tutor-rate-limiter.ts
import { env } from '$lib/server/env';

const WINDOW_MS = env.RATE_LIMIT_WINDOW_MS;
const MAX_REQUESTS = env.RATE_LIMIT_MAX_REQUESTS;

const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(userId: string): boolean {
	const now = Date.now();
	const record = requestCounts.get(userId);

	if (!record || now > record.resetTime) {
		requestCounts.set(userId, { count: 1, resetTime: now + WINDOW_MS });
		return true;
	}

	if (record.count >= MAX_REQUESTS) {
		return false;
	}

	record.count++;
	return true;
}
```

### Recommended Pattern

```typescript
// src/lib/server/middleware/rateLimit.ts
import { error } from '@sveltejs/kit';

interface RateLimitRecord {
	count: number;
	resetTime: number;
}

const requestCounts = new Map<string, RateLimitRecord>();

export function rateLimit(key: string, maxRequests: number = 100, windowMs: number = 60000): void {
	const now = Date.now();
	const record = requestCounts.get(key);

	if (!record || now > record.resetTime) {
		requestCounts.set(key, { count: 1, resetTime: now + windowMs });
		return;
	}

	if (record.count >= maxRequests) {
		throw error(429, 'Trop de requetes. Reessayez plus tard.');
	}

	record.count++;
}

// Usage
export const POST: RequestHandler = async ({ locals, getClientAddress }) => {
	const { user } = await requireAuth(locals);
	rateLimit(`message:${user.id}`, 30, 60000); // 30 messages/minute
	// ...
};
```

### Endpoints Needing Rate Limiting

| Endpoint                   | Recommended Limit | Reason                 |
| -------------------------- | ----------------- | ---------------------- |
| `/api/messages/send`       | 30/min            | Spam prevention        |
| `/api/riddles/[id]/submit` | 10/min            | Brute force prevention |
| `/api/errors/log`          | 20/min/IP         | DoS prevention         |
| `/api/tutor/*`             | 20/min            | AI cost control        |
| `/api/exercises/submit`    | 60/min            | Fair usage             |

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
