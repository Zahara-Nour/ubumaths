# Response Validation Developer Guide

Quick reference for adding response validation to UbuMaths API endpoints.

---

## Quick Start

### 1. Import validation utilities

```typescript
import { validateJsonResponse } from '$lib/server/validation/response-utils';
import { yourResponseSchema } from '$lib/server/validation/your-module';
```

### 2. Add validation before json() return

```typescript
// Before
return json({ data: result });

// After
const validated = validateJsonResponse(
	yourResponseSchema,
	{ data: result },
	'GET /api/your-endpoint'
);
return json(validated);
```

That's it! The response is now validated and type-safe.

---

## When to Use Response Validation

✅ **DO use** for:

- All API endpoints returning data to clients
- Endpoints with complex response structures
- High-traffic endpoints (GET /api/\*)
- Critical operations (create, update, delete)

❌ **DON'T use** for:

- Error responses (already handled by SvelteKit)
- Redirects
- File downloads (binary data)
- Streaming responses

---

## Response Schema Patterns

### Pattern 1: Simple Success

```typescript
// Schema
const successResponseSchema = z.object({
	success: z.literal(true),
	message: z.string().optional()
});

// Usage
const validated = validateJsonResponse(
	successResponseSchema,
	{ success: true, message: 'Exercise deleted' },
	'DELETE /api/exercises/[id]'
);
```

### Pattern 2: Single Item

```typescript
// Schema
const itemDetailResponseSchema = z.object({
	item: itemSchema
});

// Usage
const validated = validateJsonResponse(
	itemDetailResponseSchema,
	{ item: dbItem },
	'GET /api/items/[id]'
);
```

### Pattern 3: List with Pagination

```typescript
// Schema
const itemListResponseSchema = z.object({
  items: z.array(itemSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative()
  })
});

// Usage
const validated = validateJsonResponse(
  itemListResponseSchema,
  { items: [...], pagination: {...} },
  'GET /api/items'
);
```

### Pattern 4: Count Only

```typescript
// Schema (pre-defined)
const countResponseSchema = z.object({
	count: z.number().int().nonnegative()
});

// Usage
const validated = validateJsonResponse(
	countResponseSchema,
	{ count: unreadCount },
	'GET /api/notifications/unread-count'
);
```

---

## Creating New Response Schemas

### Step 1: Define schema in validation file

```typescript
// src/lib/server/validation/your-module.ts

/**
 * Single item response schema
 */
export const itemResponseSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	description: z.string().nullable().optional(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime()
});

/**
 * List response schema (GET /api/items)
 */
export const itemListResponseSchema = z.object({
	items: z.array(itemResponseSchema),
	total: z.number().int().nonnegative().optional()
});
```

### Step 2: Use in endpoint

```typescript
// src/routes/api/items/+server.ts

import { validateJsonResponse } from '$lib/server/validation/response-utils';
import { itemListResponseSchema } from '$lib/server/validation/your-module';

export const GET: RequestHandler = async ({ locals }) => {
	// ... fetch data

	const validated = validateJsonResponse(
		itemListResponseSchema,
		{ items: data, total: count },
		'GET /api/items'
	);

	return json(validated);
};
```

---

## Common Zod Patterns

### Nullable vs Optional

```typescript
// Optional: field may not exist
field: z.string().optional();

// Nullable: field exists but may be null
field: z.string().nullable();

// Both: field may not exist OR be null
field: z.string().nullable().optional();
```

### Arrays

```typescript
// Simple array
items: z.array(z.string());

// Array with constraints
items: z.array(itemSchema).min(1).max(100);

// Empty array allowed
items: z.array(itemSchema);
```

### Datetime Fields

```typescript
// ISO 8601 datetime string (from database)
created_at: z.string().datetime();

// Nullable datetime
updated_at: z.string().datetime().nullable().optional();
```

### Enums

```typescript
// String enum
status: z.enum(['draft', 'published', 'archived']);

// With default
status: z.enum(['draft', 'published']).default('draft');
```

### Numbers

```typescript
// Integer
count: z.number().int();

// Positive integer
count: z.number().int().positive();

// Non-negative (0 or more)
count: z.number().int().nonnegative();

// With range
score: z.number().min(0).max(100);
```

### UUIDs

```typescript
// UUID validation
id: z.string().uuid();

// Nullable UUID
parent_id: z.string().uuid().nullable().optional();
```

---

## Error Handling

### What Happens on Validation Failure?

1. **Detailed error logged** to console:

   ```
   [RESPONSE VALIDATION ERROR] GET /api/items:
   {
     issues: [...],
     data: {...}
   }
   ```

2. **Generic error returned** to client:

   ```json
   {
   	"error": "Internal server error: Invalid response format"
   }
   ```

3. **500 status code** (Internal Server Error)

### Why Generic Errors?

- **Security**: Don't expose internal structure to clients
- **Fault**: Response validation errors are OUR bugs, not client bugs
- **Debugging**: Detailed logs help us fix issues quickly

---

## Testing

### 1. Unit Test Response Schemas

```typescript
import { describe, it, expect } from 'vitest';
import { itemResponseSchema } from '$lib/server/validation/your-module';

describe('itemResponseSchema', () => {
	it('should validate valid response', () => {
		const valid = {
			id: '123e4567-e89b-12d3-a456-426614174000',
			name: 'Test Item',
			description: 'Test description',
			created_at: '2025-10-28T12:00:00Z',
			updated_at: '2025-10-28T12:00:00Z'
		};
		expect(() => itemResponseSchema.parse(valid)).not.toThrow();
	});

	it('should reject invalid UUID', () => {
		const invalid = { ...valid, id: 'not-a-uuid' };
		expect(() => itemResponseSchema.parse(invalid)).toThrow();
	});
});
```

### 2. Integration Test Endpoints

```typescript
import { describe, it, expect } from 'vitest';
import { GET } from './+server';

describe('GET /api/items', () => {
	it('should return validated response', async () => {
		const response = await GET({ locals, url });
		const data = await response.json();

		// Response passed validation (no 500 error)
		expect(response.status).toBe(200);
		expect(data).toHaveProperty('items');
	});
});
```

---

## Troubleshooting

### Schema Mismatch Errors

**Error**: "Expected string, received null"

**Cause**: Database field is nullable but schema expects non-nullable

**Fix**: Add `.nullable().optional()` to schema field

```typescript
// Before
description: z.string();

// After
description: z.string().nullable().optional();
```

---

### Datetime Parsing Errors

**Error**: "Invalid datetime"

**Cause**: Database returns timestamp in non-ISO format

**Fix**: Use `.datetime()` for ISO 8601 strings, or transform

```typescript
// ISO 8601 (from Supabase)
created_at: z.string().datetime();

// Unix timestamp (if needed)
created_at: z.number().transform((ts) => new Date(ts).toISOString());
```

---

### Array Empty vs Undefined

**Error**: "Expected array, received undefined"

**Cause**: Query returns null/undefined instead of empty array

**Fix**: Handle null in endpoint before validation

```typescript
// Before
return json({ items: data });

// After
return json({ items: data || [] });
```

---

## Performance

### Overhead

- **Typical**: 1-2ms per request
- **Large arrays** (100+ items): 5-10ms
- **Complex nested**: 10-20ms

### Optimization

Not needed for most endpoints. If required:

```typescript
// Cache parsed schema (rarely needed)
const cachedSchema = itemListResponseSchema;

// Use .passthrough() to skip extra fields (not recommended)
const schema = z.object({...}).passthrough();
```

---

## Best Practices

### 1. Schema Naming

```typescript
// Single item
export const itemResponseSchema = z.object({...});

// List
export const itemListResponseSchema = z.object({...});

// Detail (with relations)
export const itemDetailResponseSchema = z.object({...});

// Stats
export const itemStatsResponseSchema = z.object({...});
```

### 2. Reuse Schemas

```typescript
// Base schema
export const itemResponseSchema = z.object({
	id: z.string().uuid(),
	name: z.string()
});

// Extended schema
export const itemWithStatsResponseSchema = itemResponseSchema.extend({
	stats: itemStatsSchema
});
```

### 3. Document Schemas

```typescript
/**
 * Item response schema
 *
 * Used by:
 * - GET /api/items/[id]
 * - POST /api/items
 * - PUT /api/items/[id]
 */
export const itemResponseSchema = z.object({...});
```

### 4. Endpoint Context

```typescript
// Good: Descriptive endpoint context
validateJsonResponse(schema, data, 'GET /api/items');

// Better: Include important params
validateJsonResponse(schema, data, `GET /api/items (user=${userId})`);
```

---

## Migration Checklist

When adding validation to existing endpoint:

- [ ] Read endpoint to understand response structure
- [ ] Define response schema in validation module
- [ ] Import `validateJsonResponse` and schema
- [ ] Add validation before `json()` return
- [ ] Test with valid data
- [ ] Test with edge cases (empty, null)
- [ ] Check logs for validation errors
- [ ] Update API documentation

---

## References

- **Zod Documentation**: https://zod.dev/
- **Response Validation Utilities**: `/src/lib/server/validation/response-utils.ts`
- **Implementation Summary**: `/RESPONSE_VALIDATION_IMPLEMENTATION.md`
- **Validation Standards**: `/docs/development/validation-standards.md`

---

## Getting Help

**Questions?** Check:

1. Existing schemas in `/src/lib/server/validation/`
2. Refactored endpoints in `/src/routes/api/`
3. Implementation summary document
4. Ask in #backend-dev Slack channel

**Found a bug?** Report:

- Validation error in logs
- Endpoint URL
- Request payload
- Expected vs actual response

---

**Last Updated**: 2025-10-28
**Status**: Ready for use
