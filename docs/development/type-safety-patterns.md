# 🔒 Type Safety Patterns

Guide des patterns de type safety utilisés dans UbuMaths, notamment pour les interactions avec Supabase et la base de données.

**Last Updated**: 2025-10-27

---

## 🎯 Objectif

Maintenir une sécurité de type maximale tout en travaillant avec des systèmes externes comme Supabase, qui nécessitent parfois des assertions de type explicites.

---

## 📚 Table of Contents

1. [Database Type Assertions](#database-type-assertions)
2. [Mock Interface Typing](#mock-interface-typing)
3. [Null Safety Patterns](#null-safety-patterns)
4. [Json Type Handling](#json-type-handling)
5. [Common Pitfalls](#common-pitfalls)

---

## Database Type Assertions

### Problem

Supabase's generated types use string literal enums, but TypeScript often infers broader types (like `string`) when working with these values.

### Solution: Type Assertions

Use `as` assertions with the exact database enum path from `Database` types.

### Pattern

```typescript
import type { Database } from '$lib/types/database';

// ✅ Good: Explicit type assertion
const notificationType = 'assessment_created' as Database['public']['Enums']['notification_type'];

// ✅ Good: For function parameters
function createNotification(type: Database['public']['Enums']['notification_type']) {
	await supabase.from('notifications').insert({
		type: type as Database['public']['Enums']['notification_type']
		// ...
	});
}

// ❌ Bad: No type assertion (TypeScript error)
const notificationType = 'assessment_created'; // Type 'string' not assignable
```

### Real Examples

**File**: `src/lib/server/notifications.ts`

```typescript
// Fixed in 2025-10-27 cleanup

// Notification type assertion
type: type as Database['public']['Enums']['notification_type'],

// Priority assertion
priority: priority as Database['public']['Enums']['notification_priority'],

// Target type assertion
target_type: (targetType || 'individual') as Database['public']['Enums']['notification_target_type'],

// System event type assertion
event_type: eventType as Database['public']['Enums']['system_event_type']
```

**File**: `src/lib/server/errorMonitoring.ts`

```typescript
// Fixed in 2025-10-27 cleanup

// Error type assertion
type: ((type || 'client') as Database['public']['Enums']['error_type'],
	// Multiple enum assertions in single insert
	await supabase.from('error_logs').insert({
		type: type as Database['public']['Enums']['error_type'],
		severity: severity as Database['public']['Enums']['error_severity']
		// ...
	}));
```

### Common Enum Types

```typescript
// Notification system
Database['public']['Enums']['notification_type'];
Database['public']['Enums']['notification_priority'];
Database['public']['Enums']['notification_target_type'];
Database['public']['Enums']['system_event_type'];

// Error monitoring
Database['public']['Enums']['error_type'];
Database['public']['Enums']['error_severity'];

// User roles
Database['public']['Enums']['user_role'];
```

### Best Practices

1. **Always use the full path**: `Database['public']['Enums']['enum_name']`
2. **Assert at insertion point**: Where the value enters Supabase
3. **Don't over-assert**: Only assert when TypeScript can't infer correctly
4. **Use in function signatures**: Make parameters strongly typed

---

## Mock Interface Typing

### Problem

Chainable mock objects (like Supabase client mocks) lose type information when chained, causing `any` type errors.

### Solution: Explicit Mock Interfaces

Define interfaces that describe the entire chain structure.

### Pattern

```typescript
import { vi, type MockedFunction } from 'vitest';

// ✅ Good: Define complete mock interface
interface MockSupabaseWithChain {
	from: MockedFunction<
		(table: string) => {
			select: MockedFunction<() => Promise<{ data: unknown; error: unknown }>>;
			insert: MockedFunction<() => Promise<{ data: unknown; error: unknown }>>;
			update: MockedFunction<() => Promise<{ data: unknown; error: unknown }>>;
			delete: MockedFunction<() => Promise<{ error: unknown }>>;
		}
	>;
}

// Create typed mock
const mockSupabase = {
	from: vi.fn(() => ({
		select: vi.fn(() => Promise.resolve({ data: [], error: null })),
		insert: vi.fn(() => Promise.resolve({ data: {}, error: null })),
		update: vi.fn(() => Promise.resolve({ data: {}, error: null })),
		delete: vi.fn(() => Promise.resolve({ error: null }))
	}))
} as unknown as MockSupabaseWithChain;
```

### Real Example

**File**: `src/lib/server/assessments.test.ts` (Fixed in 2025-10-27 cleanup)

```typescript
interface MockSupabaseWithChain {
	from: MockedFunction<
		(table: string) => {
			select: MockedFunction<
				(columns?: string) => {
					eq: MockedFunction<
						(
							column: string,
							value: unknown
						) => {
							maybeSingle: MockedFunction<
								() => Promise<{
									data: unknown;
									error: unknown;
								}>
							>;
						}
					>;
					in: MockedFunction<
						(
							column: string,
							values: unknown[]
						) => Promise<{
							data: unknown;
							error: unknown;
						}>
					>;
				}
			>;
			insert: MockedFunction<
				(values: unknown) => Promise<{
					data: unknown;
					error: unknown;
				}>
			>;
			update: MockedFunction<
				(values: unknown) => {
					eq: MockedFunction<
						(
							column: string,
							value: unknown
						) => Promise<{
							data: unknown;
							error: unknown;
						}>
					>;
				}
			>;
			delete: MockedFunction<
				() => {
					eq: MockedFunction<
						(
							column: string,
							value: unknown
						) => Promise<{
							error: unknown;
						}>
					>;
				}
			>;
		}
	>;
}
```

### Benefits

- ✅ Full type safety in tests
- ✅ Autocomplete for mock methods
- ✅ Catches incorrect mock setup at compile time
- ✅ No `@typescript-eslint/no-explicit-any` warnings

### When to Use

- Complex chainable mocks (Supabase, ORMs)
- When mock chains have 3+ levels
- When you see `any` type warnings in tests
- When mock setup is reused across multiple tests

---

## Null Safety Patterns

### Problem

Functions may return nullable results, but tests assume non-null values without checking.

### Solution: Guard Clauses

Add explicit null/success checks before accessing nested properties.

### Pattern

```typescript
// ❌ Bad: Assumes result exists
const result = generateInstance(template);
expect(result.instance.variables).toBeDefined(); // May throw if result is null

// ✅ Good: Check success and existence
const result = generateInstance(template);
if (result.success && result.instance) {
	expect(result.instance.variables).toBeDefined();
}

// ✅ Good: Early return pattern
const result = generateInstance(template);
if (!result.success || !result.instance) {
	throw new Error('Instance generation failed');
}
expect(result.instance.variables).toBeDefined();
```

### Real Example

**File**: `src/lib/exercises/generator/instance-generator.test.ts` (Fixed in 2025-10-27 cleanup)

```typescript
// Fixed 160 null-check errors

// Before (error-prone)
test('should generate instance', () => {
	const result = generateInstance(template);
	expect(result.instance.variables).toBeDefined();
});

// After (safe)
test('should generate instance', () => {
	const result = generateInstance(template);
	if (result.success && result.instance) {
		expect(result.instance.variables).toBeDefined();
	}
});
```

### Best Practices

1. **Always check success field**: `if (result.success)`
2. **Check nested fields**: `if (result.instance && result.instance.data)`
3. **Use early returns**: Fail fast in tests
4. **Type narrowing**: Let TypeScript know the value is non-null

---

## Json Type Handling

### Problem

Supabase's `Json` type is flexible but requires explicit typing when inserting complex data structures.

### Solution: Json Type Assertions

Cast complex objects to `Json` when inserting into JSONB columns.

### Pattern

```typescript
import type { Json } from '$lib/types/database';

// ✅ Good: Cast to Json for JSONB columns
const errorDetails = {
	message: error.message,
	stack: error.stack,
	context: { userId: '123' }
};

await supabase.from('error_logs').insert({
	errors: errorDetails as Json, // JSONB column
	metadata: { timestamp: Date.now() } as Json
});

// ✅ Good: For arrays
const tags = ['tag1', 'tag2', 'tag3'];
await supabase.from('posts').insert({
	tags: tags as Json
});

// ❌ Bad: No type assertion (TypeScript error)
await supabase.from('error_logs').insert({
	errors: errorDetails // Type error
});
```

### Real Example

**File**: `src/lib/server/errorMonitoring.ts` (Fixed in 2025-10-27 cleanup)

```typescript
// Error details as Json
const error_details = {
	message: error.message,
	stack: error.stack,
	context: context
};

await supabase.from('error_logs').insert({
	errors: error_details as Json, // ✅ Explicit Json cast
	user_agent: userAgent || null,
	url: url || null // Handle nulls explicitly
});
```

### When to Use

- JSONB columns in database
- Complex nested objects
- Arrays of mixed types
- Dynamic data structures

### Null Handling with Json

```typescript
// ✅ Good: Explicit null handling
url: url || null, // Converts undefined to null
message: message ?? null, // Only null if message is null/undefined

// ✅ Good: Conditional Json casting
metadata: metadata ? (metadata as Json) : null,

// ❌ Bad: Undefined may cause issues
url: url, // Could be undefined
```

---

## Common Pitfalls

### 1. String vs Enum

```typescript
// ❌ Bad: TypeScript infers 'string'
const role = 'teacher';
await supabase.from('profiles').update({ role });

// ✅ Good: Explicit enum type
const role = 'teacher' as Database['public']['Enums']['user_role'];
await supabase.from('profiles').update({ role });
```

### 2. Enum in Conditionals

```typescript
// ❌ Bad: Loses type information
const targetType = condition ? 'individual' : 'roles';
await supabase.from('notifications').insert({ target_type: targetType }); // Error

// ✅ Good: Assert after conditional
const targetType = (
	condition ? 'individual' : 'roles'
) as Database['public']['Enums']['notification_target_type'];
await supabase.from('notifications').insert({ target_type: targetType });
```

### 3. Optional Parameters

```typescript
// ❌ Bad: Optional parameter without assertion
function logError(type?: string) {
	await supabase.from('error_logs').insert({ type }); // Error
}

// ✅ Good: Assert with default
function logError(type?: string) {
	const errorType = (type || 'client') as Database['public']['Enums']['error_type'];
	await supabase.from('error_logs').insert({ type: errorType });
}
```

### 4. Missing Null Checks in Tests

```typescript
// ❌ Bad: Assumes result exists
test('should return data', async () => {
	const result = await fetchData();
	expect(result.data.value).toBe(123); // May throw
});

// ✅ Good: Null-safe
test('should return data', async () => {
	const result = await fetchData();
	expect(result.data).toBeDefined();
	if (result.data) {
		expect(result.data.value).toBe(123);
	}
});
```

### 5. Mock Type Chains

```typescript
// ❌ Bad: No interface, causes 'any' warnings
const mockSupabase = {
	from: vi.fn(() => ({
		select: vi.fn()
	}))
};

// ✅ Good: Typed interface
interface MockSupabase {
	from: MockedFunction<(table: string) => { select: MockedFunction<() => Promise<unknown>> }>;
}

const mockSupabase = {
	from: vi.fn(() => ({
		select: vi.fn(() => Promise.resolve({ data: [], error: null }))
	}))
} as unknown as MockSupabase;
```

---

## 🔧 Troubleshooting

### TypeScript Error: Type 'string' is not assignable to type 'enum'

**Cause**: Using a string literal where a database enum is expected.

**Fix**: Add type assertion:

```typescript
const value = 'my_value' as Database['public']['Enums']['my_enum'];
```

### TypeScript Error: Object is possibly 'null' or 'undefined'

**Cause**: Accessing nested properties without null check.

**Fix**: Add guard clause:

```typescript
if (result && result.data) {
	// Safe to access result.data
}
```

### ESLint Warning: @typescript-eslint/no-explicit-any

**Cause**: Mock objects losing type information in chains.

**Fix**: Define explicit mock interface (see [Mock Interface Typing](#mock-interface-typing)).

---

## 📊 Impact (2025-10-27 Cleanup)

**Production Code**:

- Fixed 13 critical TypeScript errors
- 0 remaining errors in main codebase
- Files affected: `notifications.ts`, `errorMonitoring.ts`

**Test Code**:

- Fixed 160 null-check errors
- Fixed 91 ESLint 'any' type errors
- Files affected: `instance-generator.test.ts`, `assessments.test.ts`, `api-routes.test.ts`

**Result**:

- ✅ 100% test pass rate (2,063/2,063 non-skipped tests)
- ✅ 0 TypeScript errors in production code
- ✅ Improved type safety across entire codebase

---

## 📖 Resources

### Internal Documentation

- [Linting Best Practices](./linting-best-practices.md)
- [Testing Documentation](../testing/README.md)
- [Code Style Guide](./code-style.md)

### External References

- [TypeScript Type Assertions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions)
- [Supabase TypeScript Support](https://supabase.com/docs/guides/api/generating-types)
- [Vitest Mocking Guide](https://vitest.dev/guide/mocking.html)

---

**Maintenu par**: L'équipe UbuMaths
**Dernière révision**: 2025-10-27

[← Retour au développement](README.md)
