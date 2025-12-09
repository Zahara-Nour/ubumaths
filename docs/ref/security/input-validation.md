# Input Validation

## Overview

UbuMaths uses Zod for all input validation. This document covers validation patterns, schema design, and security considerations.

---

## Validation Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Request   │───>│  Zod Schema │───>│  Validated  │
│   (JSON)    │    │  .safeParse │    │    Data     │
└─────────────┘    └─────────────┘    └─────────────┘
                          │
                          v (on error)
                   ┌─────────────┐
                   │  400 Error  │
                   │  + Message  │
                   └─────────────┘
```

### Schema Location

```
src/lib/server/validation/
├── index.ts              # Re-exports all schemas
├── messages.ts           # Message-related schemas
├── exercises.ts          # Exercise schemas
├── riddles.ts            # Riddle schemas
├── srs.ts                # SRS (Spaced Repetition) schemas
├── classes.ts            # Class management schemas
├── marketplace.ts        # Marketplace schemas
└── ... (65+ schema files)
```

---

## Basic Patterns

### Standard API Validation

```typescript
import { z } from 'zod';
import { error, json } from '@sveltejs/kit';

const createItemSchema = z.object({
	name: z.string().min(1).max(100),
	description: z.string().max(500).optional(),
	quantity: z.number().int().positive().max(1000)
});

export const POST: RequestHandler = async ({ request, locals }) => {
	const body = await request.json();
	const validation = createItemSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { name, description, quantity } = validation.data;
	// Use validated data...
};
```

### Query Parameter Validation

```typescript
const paginationSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const GET: RequestHandler = async ({ url }) => {
	const params = Object.fromEntries(url.searchParams);
	const validation = paginationSchema.safeParse(params);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { page, limit } = validation.data;
	// Use validated params...
};
```

### Route Parameter Validation

```typescript
import { z } from 'zod';

// Helper function
function validateUuidParam(id: string, paramName = 'id'): string {
	const result = z.string().uuid().safeParse(id);
	if (!result.success) {
		throw error(400, `Invalid ${paramName} format`);
	}
	return result.data;
}

export const GET: RequestHandler = async ({ params }) => {
	const id = validateUuidParam(params.id);
	// Use validated id...
};
```

---

## Schema Design Patterns

### UUID Validation

```typescript
// Always validate UUIDs
const schema = z.object({
	userId: z.string().uuid(),
	classId: z.string().uuid(),
	exerciseId: z.string().uuid()
});
```

### Numeric Bounds

```typescript
const schema = z.object({
	// Integer with bounds
	quantity: z.number().int().min(1).max(1000),

	// Positive integer
	count: z.number().int().positive(),

	// Non-negative
	score: z.number().int().nonnegative(),

	// Percentage
	percentage: z.number().min(0).max(100),

	// Price (cents)
	price: z.number().int().min(0).max(10000)
});
```

### String Constraints

```typescript
const schema = z.object({
	// Length limits
	name: z.string().min(1).max(100),
	description: z.string().max(500),

	// Email
	email: z.string().email(),

	// URL
	website: z.string().url().optional(),

	// Regex pattern
	code: z.string().regex(/^[A-Z]{3}-\d{4}$/)
});
```

### Array Limits

```typescript
const schema = z.object({
	// Array with size limits
	tags: z.array(z.string().max(50)).max(10),

	// Array of UUIDs
	userIds: z.array(z.string().uuid()).min(1).max(100),

	// Non-empty array
	items: z.array(itemSchema).nonempty()
});
```

### Enums and Literals

```typescript
const schema = z.object({
	// Enum
	role: z.enum(['student', 'teacher', 'admin']),

	// Literal
	type: z.literal('exercise'),

	// Union of literals
	status: z.union([z.literal('pending'), z.literal('active'), z.literal('completed')])
});
```

### Optional and Nullable

```typescript
const schema = z.object({
	// Optional (can be undefined)
	nickname: z.string().optional(),

	// Nullable (can be null)
	deletedAt: z.string().datetime().nullable(),

	// Optional and nullable
	notes: z.string().nullish(),

	// Default value
	isActive: z.boolean().default(true)
});
```

---

## Security-Critical Validations

### Preventing SQL Injection

```typescript
// UUID validation prevents SQL injection in IDs
const id = z.string().uuid().parse(params.id);

// Parameterized queries with validated data
const { data } = await supabase.from('items').select().eq('id', id); // id is guaranteed to be a valid UUID
```

### Preventing XSS

```typescript
// Validate + sanitize user content
import { sanitizeHtml } from '$lib/server/sanitization';

const schema = z.object({
	content: z.string().max(10000).transform(sanitizeHtml)
});
```

### Preventing Command Injection

```typescript
// Never use user input in commands
// If needed, use strict allowlists
const allowedActions = ['start', 'stop', 'restart'] as const;
const schema = z.object({
	action: z.enum(allowedActions)
});
```

### Preventing DoS

```typescript
// Always limit arrays
const schema = z.object({
	ids: z.array(z.string().uuid()).max(100),
	items: z.array(itemSchema).max(50)
});

// Always limit strings
const schema = z.object({
	content: z.string().max(10000),
	name: z.string().max(255)
});

// Always bound numbers
const schema = z.object({
	limit: z.number().int().min(1).max(100),
	offset: z.number().int().min(0).max(10000)
});
```

---

## Form Actions Validation

```typescript
// +page.server.ts
import { fail } from '@sveltejs/kit';

const formSchema = z.object({
	name: z.string().min(1, 'Le nom est requis').max(100),
	email: z.string().email('Email invalide')
});

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const data = Object.fromEntries(formData);

		const validation = formSchema.safeParse(data);

		if (!validation.success) {
			return fail(400, {
				errors: validation.error.flatten().fieldErrors
			});
		}

		// Process validated data...
	}
};
```

---

## Complex Schema Examples

### Nested Objects

```typescript
const addressSchema = z.object({
	street: z.string().max(200),
	city: z.string().max(100),
	postalCode: z.string().regex(/^\d{5}$/)
});

const userSchema = z.object({
	name: z.string().min(1).max(100),
	address: addressSchema.optional()
});
```

### Discriminated Unions

```typescript
const notificationSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('email'),
		email: z.string().email(),
		subject: z.string().max(200)
	}),
	z.object({
		type: z.literal('sms'),
		phone: z.string().regex(/^\+\d{10,15}$/),
		message: z.string().max(160)
	})
]);
```

### Refinements

```typescript
const dateRangeSchema = z
	.object({
		startDate: z.string().datetime(),
		endDate: z.string().datetime()
	})
	.refine((data) => new Date(data.startDate) < new Date(data.endDate), {
		message: 'La date de fin doit etre apres la date de debut'
	});
```

### Transformations

```typescript
const schema = z.object({
	// Trim whitespace
	name: z.string().trim().min(1),

	// Convert to lowercase
	email: z.string().email().toLowerCase(),

	// Parse date string to Date
	birthDate: z.string().transform((s) => new Date(s)),

	// Custom transformation
	tags: z.string().transform((s) => s.split(',').map((t) => t.trim()))
});
```

---

## Error Handling

### Single Error Message

```typescript
const validation = schema.safeParse(data);
if (!validation.success) {
	throw error(400, validation.error.issues[0].message);
}
```

### All Errors

```typescript
const validation = schema.safeParse(data);
if (!validation.success) {
	return fail(400, {
		errors: validation.error.flatten().fieldErrors
	});
}
```

### Custom Error Messages

```typescript
const schema = z.object({
	email: z
		.string({
			required_error: "L'email est requis",
			invalid_type_error: "L'email doit etre une chaine"
		})
		.email('Email invalide'),

	age: z.number().min(13, 'Vous devez avoir au moins 13 ans').max(120, 'Age invalide')
});
```

---

## Testing Validation

```typescript
import { describe, it, expect } from 'vitest';
import { createItemSchema } from './schemas';

describe('createItemSchema', () => {
	it('accepts valid data', () => {
		const result = createItemSchema.safeParse({
			name: 'Test Item',
			quantity: 10
		});
		expect(result.success).toBe(true);
	});

	it('rejects empty name', () => {
		const result = createItemSchema.safeParse({
			name: '',
			quantity: 10
		});
		expect(result.success).toBe(false);
	});

	it('rejects negative quantity', () => {
		const result = createItemSchema.safeParse({
			name: 'Test',
			quantity: -1
		});
		expect(result.success).toBe(false);
	});

	it('rejects quantity over limit', () => {
		const result = createItemSchema.safeParse({
			name: 'Test',
			quantity: 10001
		});
		expect(result.success).toBe(false);
	});
});
```

---

## Checklist

When creating a new schema:

- [ ] All strings have `.max()` limit
- [ ] All numbers have `.min()` and `.max()` bounds
- [ ] All arrays have `.max()` limit
- [ ] All UUIDs use `.uuid()` validation
- [ ] All enums use explicit allowed values
- [ ] Error messages are in French
- [ ] Schema is exported from `validation/index.ts`
- [ ] Tests cover edge cases
