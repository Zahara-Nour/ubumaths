# Quality Standards

**Last Updated**: 2025-10-31

Complete guide to maintaining code quality, efficient linting, and secure input validation in UbuMaths.

---

## 📊 Code Quality Status

**Current Status** (Updated: 2025-10-28 - Post-Validation Testing)

- ✅ **Build**: Passing, no errors
- ✅ **Prettier**: All files formatted
- ✅ **ESLint (Production)**: 0 errors in main codebase
- ✅ **ESLint (Tests)**: 0 errors (was 57) - **NEW: All test file errors fixed!**
- ✅ **TypeScript (Production)**: 0 errors in main codebase
- ✅ **Test Suite**: 2,435/2,459 passing (99.0% pass rate, 24 skipped)
  - Unit tests: 2,430/2,454 passing
  - Integration tests: 5/5 passing (race condition scenarios)
- ✅ **Zod Validation Tests**: 366 tests, 100% pass rate (was 97.3%) - **NEW: All validation schemas tested!**
- ⚠️ **ESLint (Warnings)**: 29 warnings (legitimate Svelte reactivity patterns)

**Achievement**: 100% error-free codebase + fixed all 57 test file type errors

### Security

- ✅ **CSRF Protection**: Implemented in hooks.server.ts (origin validation)
- ✅ **XSS Prevention**: DOMPurify sanitization on all user-generated content
- ✅ **Admin Authorization**: Role checks added to all admin API endpoints
- ✅ **AI Chatbot**: Rate limited (5 req/15min) + authenticated
- ✅ **Input Validation**: 100% of API endpoints have Zod validation (50+ endpoints validated, 0 vulnerabilities) - See [Input Validation with Zod](#🛡️-input-validation-with-zod)

### Performance

- ✅ **Database Indexes**: 13 new indexes for hot paths
- ✅ **N+1 Queries**: Eliminated in assessment results (244 → 6 queries, 97% reduction)
- ⚠️ **No caching layer**: Direct DB queries on every request (simpler architecture, slightly slower)

### Standards

- **Avant commit**: Automatique via `lint-staged` hook
- **Nouveau code**: Maintenir 0 errors obligatoire
- **Tests**: All new code must have tests, 100% pass rate required
- **Database Triggers**: Tested via integration tests (see `tests/database/README.md`)

---

## 🚨 Efficient Linting Strategy

**NEVER** run `pnpm eslint . --no-cache` or full uncached lint - it takes ~30s.

### ✅ DO (Fast & Efficient)

```bash
# 1. After making changes - lint ONLY changed files
pnpm eslint path/to/changed/file.ts --cache

# 2. Before major steps - lint specific directory
pnpm eslint src/lib/exercises/ --cache

# 3. Final verification - full cached lint (3-5s)
pnpm lint  # Uses --cache by default now
```

### Why It Matters

- ESLint cache makes subsequent runs **6-10x faster** (30s → 3-5s)
- Linting specific files is **instant** (~0.5s)
- `lint-staged` runs automatically on commit (only staged files)

### Pre-commit Hook

- Automatically runs `lint-staged` on `git commit`
- Lints & formats only staged files (~1-2s)
- Auto-fixes issues when possible
- **Blocks commit** if errors remain

---

## 🛡️ Input Validation with Zod

**GOLDEN RULE**: ALL user input MUST be validated with Zod before processing.

**Why this matters**: 80% of API endpoints currently lack proper input validation, creating 23 security vulnerabilities (7 critical). TypeScript types provide zero runtime protection.

### 🚨 Critical Requirements

#### ❌ NEVER Accept User Input Without Validation

```typescript
// ❌ CRITICAL SECURITY VIOLATION - No validation
const body = await request.json();
const { userId, amount } = body; // Could be ANYTHING!

// ❌ Type assertion without runtime validation
const data: CreateUserData = await request.json(); // TypeScript types don't run at runtime!

// ❌ Weak manual validation
if (!userId || typeof amount !== 'number') {
	/* ... */
} // Incomplete, allows NaN, Infinity, negative values, etc.
```

#### ✅ ALWAYS Use Zod Schemas

```typescript
// ✅ CORRECT: Zod validation with proper error handling
import { z } from 'zod';

const createUserSchema = z.object({
	userId: z.string().uuid('ID utilisateur invalide'),
	amount: z.number().int().positive().max(1000)
});

const body = await request.json();
const validation = createUserSchema.safeParse(body);

if (!validation.success) {
	throw error(400, validation.error.issues[0].message);
}

const { userId, amount } = validation.data; // Guaranteed to be valid!
```

---

## 📍 Where to Use Zod

**Required for ALL:**

- ✅ API endpoints (`/src/routes/api/**/*+server.ts`) - Request bodies, query params
- ✅ Form actions (`+page.server.ts`) - Form data
- ✅ Server-side functions processing user input
- ✅ WebSocket message handlers
- ✅ File upload handlers

### Examples

#### API Endpoint

```typescript
export const POST: RequestHandler = async ({ request }) => {
	const validation = mySchema.safeParse(await request.json());
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}
	// ... use validation.data
};
```

#### Form Action

```typescript
export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const validation = myFormSchema.safeParse(Object.fromEntries(formData));
		if (!validation.success) {
			return fail(400, { errors: validation.error.flatten() });
		}
		// ... use validation.data
	}
};
```

#### Query Parameters

```typescript
const paginationSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20)
});

const validation = paginationSchema.safeParse({
	page: url.searchParams.get('page'),
	limit: url.searchParams.get('limit')
});
```

---

## 🏗️ Validation Library Structure

**Location**: `src/lib/server/validation/` (à créer)

### Recommended Structure

```
src/lib/server/validation/
├── index.ts          # Re-exports all schemas
├── common.ts         # Shared utilities (UUIDs, pagination, grades)
├── users.ts          # User-related schemas
├── assessments.ts    # Assessment schemas
├── questions.ts      # Question schemas
├── rewards.ts        # Gidouilles/rewards schemas
└── admin.ts          # Admin operation schemas
```

### Import Pattern

```typescript
import { createUserSchema } from '$lib/server/validation/users';
import { uuidSchema, paginationSchema } from '$lib/server/validation/common';
```

---

## 📝 Writing Zod Schemas

### Best Practices

```typescript
import { z } from 'zod';

// 1. Use descriptive names ending in "Schema"
export const createAssessmentSchema = z.object({
	// 2. Validate string constraints
	title: z.string().trim().min(1, 'Titre requis').max(200, 'Titre trop long'),
	description: z.string().trim().optional(),

	// 3. Validate numeric bounds
	duration_minutes: z.number().int().min(1).max(300),
	max_points: z.number().int().positive().finite(),

	// 4. Validate UUIDs
	teacher_id: z.string().uuid('ID enseignant invalide'),

	// 5. Validate enums
	grade: z.enum(['6eme', '5eme', '4eme', '3eme']),
	status: z.enum(['draft', 'published', 'archived']),

	// 6. Validate arrays with limits
	categories: z.array(z.string()).min(1, 'Au moins une catégorie requise').max(10),
	student_ids: z.array(z.string().uuid()).max(200, 'Maximum 200 élèves'),

	// 7. Optional with defaults
	is_public: z.boolean().default(false),

	// 8. Nested objects
	settings: z
		.object({
			allow_retakes: z.boolean(),
			show_solutions: z.boolean()
		})
		.optional()
});

// 9. Infer TypeScript types from schemas
export type CreateAssessmentData = z.infer<typeof createAssessmentSchema>;

// 10. Reuse and extend schemas
export const updateAssessmentSchema = createAssessmentSchema.partial();
export const assessmentIdSchema = createAssessmentSchema.pick({ teacher_id: true });
```

---

## 🎯 Common Validation Patterns

### UUIDs

```typescript
z.string().uuid('Format ID invalide');
```

### Positive Integers with Bounds

```typescript
z.number().int().positive().max(1000);
```

### Non-empty Strings with Length Limits

```typescript
z.string().trim().min(1, 'Champ requis').max(200, 'Trop long');
```

### Arrays with Size Limits

```typescript
z.array(z.string().uuid()).min(1, 'Au moins un élément requis').max(50, 'Maximum 50 éléments');
```

### Optional Fields

```typescript
z.string().optional(); // string | undefined
z.string().nullable(); // string | null
z.string().optional().nullable(); // string | null | undefined
```

### Enums from Database

```typescript
z.enum(['6eme', '5eme', '4eme', '3eme']);
z.enum(['student', 'teacher', 'admin']);
```

### Coercion for Query Params

Converts strings to numbers:

```typescript
z.coerce.number().int().positive(); // "42" → 42
```

### Discriminated Unions

Type-safe polymorphism:

```typescript
const questionSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('multiple_choice'), choices: z.array(z.string()) }),
	z.object({ type: z.literal('open_ended'), max_length: z.number() })
]);
```

---

## ⚠️ Anti-patterns to Avoid

```typescript
// ❌ Using .any() defeats the purpose
z.object({ data: z.any() }); // Don't do this!

// ❌ No upper bounds (DoS risk - allows massive payloads)
z.string(); // Should have .max(500)
z.array(z.string()); // Should have .max(100)

// ❌ No validation on numeric special values
z.number(); // Allows NaN, Infinity - use .finite()

// ❌ Type assertions instead of validation
const data: MyType = await request.json(); // Runtime types don't exist!

// ❌ Manual validation (incomplete, error-prone)
if (!userId || typeof amount !== 'number') {
	/* ... */
}

// ✅ Use Zod to create runtime types
const validation = mySchema.safeParse(await request.json());
const data = validation.data; // TypeScript infers the type!
```

---

## 🧪 Testing Validation

**Unit tests** (required for all schemas):

```typescript
import { describe, it, expect } from 'vitest';
import { createAssessmentSchema } from '$lib/server/validation/assessments';

describe('createAssessmentSchema', () => {
	it('accepts valid input', () => {
		const result = createAssessmentSchema.safeParse({
			title: 'Test Assessment',
			grade: '6eme',
			categories: ['Algèbre'],
			duration_minutes: 60,
			max_points: 100,
			teacher_id: '550e8400-e29b-41d4-a716-446655440000'
		});
		expect(result.success).toBe(true);
	});

	it('rejects missing required fields', () => {
		const result = createAssessmentSchema.safeParse({
			title: 'Test'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].path).toContain('grade');
		}
	});

	it('rejects invalid UUID', () => {
		const result = createAssessmentSchema.safeParse({
			title: 'Test',
			grade: '6eme',
			categories: ['Algèbre'],
			duration_minutes: 60,
			max_points: 100,
			teacher_id: 'not-a-uuid'
		});
		expect(result.success).toBe(false);
	});

	it('rejects duration exceeding maximum', () => {
		const result = createAssessmentSchema.safeParse({
			title: 'Test',
			grade: '6eme',
			categories: ['Algèbre'],
			duration_minutes: 999,
			max_points: 100,
			teacher_id: '550e8400-e29b-41d4-a716-446655440000'
		});
		expect(result.success).toBe(false);
	});

	it('rejects empty category array', () => {
		const result = createAssessmentSchema.safeParse({
			title: 'Test',
			grade: '6eme',
			categories: [],
			duration_minutes: 60,
			max_points: 100,
			teacher_id: '550e8400-e29b-41d4-a716-446655440000'
		});
		expect(result.success).toBe(false);
	});
});
```

---

## 🧪 Testing Standards

UbuMaths uses a comprehensive testing strategy with multiple test types for different purposes.

### Test Types

#### 1. Unit Tests

**Location**: Colocated with source files (`*.test.ts`)
**Tool**: Vitest
**Command**: `pnpm test:unit`

**Purpose**: Test individual functions, components, and modules in isolation

**When to Write**:

- New utility functions
- Business logic functions
- Validation schemas (Zod)
- Data transformations
- Complex calculations

**Example**:

```typescript
// src/lib/utils/math-helpers.test.ts
import { describe, it, expect } from 'vitest';
import { calculateGrade } from './math-helpers';

describe('calculateGrade', () => {
	it('calculates percentage correctly', () => {
		expect(calculateGrade(80, 100)).toBe(80);
	});

	it('handles zero max points', () => {
		expect(calculateGrade(50, 0)).toBe(0);
	});
});
```

**Best Practices**:

- Test happy path and edge cases
- Test error conditions
- Mock external dependencies (database, API calls)
- Keep tests fast (<100ms each)
- Aim for 80%+ code coverage on critical paths

---

#### 2. Integration Tests

**Location**: `tests/integration/`
**Tool**: Vitest + Real Supabase instance
**Command**: `pnpm test:integration`

**Purpose**: Test interactions between multiple components using real database

**When to Write**:

- Database race conditions (concurrent requests)
- RPC function authorization and security
- Multi-step workflows that span database + API + client
- Features requiring transaction guarantees

**Prerequisites**:

- Supabase local running on port 54321 (`pnpm db:start`)
- Docker installed and running

**Example**:

```typescript
// tests/integration/race-conditions.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createAuthenticatedClient } from '../database/helpers/supabase-client';
import { TestData } from '../database/helpers/test-data-factory';

describe('Race Condition Tests', () => {
	beforeAll(async () => {
		// Setup: start Supabase local
	});

	afterAll(async () => {
		// Cleanup: remove test data
	});

	it('prevents double-spend with concurrent requests', async () => {
		// Create test student with 10 gidouilles
		const student = await TestData.profile().withRole('student').withGidouilles(10).create();

		// Create authenticated client
		const client = await createAuthenticatedClient(student.email);

		// Execute 2 simultaneous API calls, each spending 10
		const [result1, result2] = await Promise.allSettled([
			client.rpc('draw_multiple_vip_cards', {
				p_student_id: student.id,
				p_gidouilles_cost: 10
			}),
			client.rpc('draw_multiple_vip_cards', {
				p_student_id: student.id,
				p_gidouilles_cost: 10
			})
		]);

		// One succeeds, one fails
		const succeeded = [result1, result2].filter(
			(r) => r.status === 'fulfilled' && r.value.data !== null
		);
		const failed = [result1, result2].filter(
			(r) => r.status === 'fulfilled' && r.value.error !== null
		);

		expect(succeeded).toHaveLength(1);
		expect(failed).toHaveLength(1);

		// Verify final balance is 0 (not -10)
		const { data: profile } = await serviceClient
			.from('profiles')
			.select('gidouilles')
			.eq('id', student.id)
			.single();

		expect(profile.gidouilles).toBe(0);
	});
});
```

**Configuration**:

File: `vitest.integration.config.ts`

```typescript
export default defineConfig({
	test: {
		name: 'integration',
		environment: 'node',
		include: ['tests/integration/**/*.{test,spec}.{js,ts}'],
		testTimeout: 30000, // 30s for database operations
		pool: 'forks',
		poolOptions: {
			forks: {
				singleFork: true // Sequential execution
			}
		}
	}
});
```

**Best Practices**:

- Use `beforeEach` to clean test data (ensure isolation)
- Use sequential execution (`singleFork: true`) to prevent race conditions between tests
- Create authenticated clients with `createAuthenticatedClient()` helper
- Test database state after operations (verify consistency)
- Clean up auth.users and profiles tables in `afterAll`
- Use `Promise.allSettled()` for concurrent request testing

**Authentication Helpers**:

Integration tests need to authenticate as users to test RPC authorization:

```typescript
// Create student with auth.users entry
const student = await TestData.profile()
  .withRole('student')
  .create();

// Sign in as the student (gets valid session)
const studentClient = await createAuthenticatedClient(student.email);

// Now RPC functions see correct auth.uid()
const { data, error } = await studentClient.rpc('my_rpc_function', {...});
```

**Files**:

- `tests/database/helpers/supabase-client.ts` - `createAuthenticatedClient()`
- `tests/database/helpers/postgres-client.ts` - `insertAuthUser()` with password support
- `tests/database/helpers/test-data-factory.ts` - Test data builders

---

#### 3. Database Trigger Tests

**Location**: `tests/database/triggers/`
**Tool**: Vitest + Docker Supabase
**Command**: `pnpm test:triggers`

**Purpose**: Test PostgreSQL triggers and database constraints

**When to Write**:

- Testing database triggers (e.g., `handle_new_user()`)
- Testing foreign key constraints
- Testing CHECK constraints
- Testing database functions

**Example**:

```typescript
// tests/database/triggers/handle-new-user.test.ts
it('creates profile when user is inserted', async () => {
	const userId = crypto.randomUUID();
	const email = 'test@example.com';

	// Insert into auth.users (triggers handle_new_user)
	await insertAuthUser({ id: userId, email });

	// Wait for trigger to complete
	await new Promise((resolve) => setTimeout(resolve, 100));

	// Verify profile was created
	const { data } = await serviceClient.from('profiles').select('*').eq('id', userId).single();

	expect(data).toBeDefined();
	expect(data.email).toBe(email);
});
```

---

#### 4. E2E Tests

**Location**: `tests/e2e/`
**Tool**: Playwright
**Command**: `pnpm test:e2e`

**Purpose**: Test full user workflows in a real browser

**When to Write**:

- Critical user journeys (login, sign up, take assessment)
- Cross-page workflows
- UI interactions
- Browser-specific behavior

---

### When to Write Integration Tests vs Unit Tests

**Write Integration Tests When**:

- Testing race conditions (concurrent database access)
- Testing RPC function authorization with `auth.uid()`
- Testing transaction guarantees (atomicity)
- Testing database triggers and constraints
- Verifying cross-component security (e.g., students can't access other students' data)
- Testing real database queries with actual Supabase RLS policies

**Write Unit Tests When**:

- Testing pure functions (no side effects)
- Testing business logic in isolation
- Testing validation schemas (Zod)
- Testing data transformations
- Testing error handling
- Fast feedback needed (unit tests are 100x faster)

**Example Decision**:

- ✅ Integration test: "Verify `SELECT FOR UPDATE` prevents double-spend"
- ✅ Unit test: "Verify Zod schema rejects invalid UUID"
- ✅ Integration test: "Student cannot draw cards for another student"
- ✅ Unit test: "Calculate gidouilles cost correctly"

---

### Running Tests

```bash
# Unit tests (fast, no Docker needed)
pnpm test:unit

# Integration tests (requires Supabase local)
pnpm db:start           # Start Supabase (one-time)
pnpm test:integration   # Run integration tests
pnpm db:stop            # Stop Supabase when done

# Watch mode
pnpm test:unit -- --watch
pnpm test:integration:watch

# Database trigger tests
pnpm test:triggers

# All tests
pnpm test
```

---

### Test Coverage Goals

**Critical Paths**: 90%+ coverage

- Payment processing (gidouilles, VIP cards)
- User authentication and authorization
- Database transactions
- Input validation (Zod schemas)

**Business Logic**: 80%+ coverage

- Assessment grading
- SRS algorithm
- Rewards calculations

**UI Components**: Not required (E2E tests cover user flows)

---

### Test Data Management

**Helpers Available**:

```typescript
// Profile builder
const student = await TestData.profile()
	.withRole('student')
	.withGidouilles(100)
	.withVipCards({ 'card-id': { cardId: 'fortune', earnedAt: '...' } })
	.create();

// Authentication
const client = await createAuthenticatedClient(student.email);

// Cleanup
await cleanupAllTestData(); // Removes all test users and profiles
```

---

## 📚 Resources

- **Zod Documentation**: https://zod.dev/
- **Vitest Documentation**: https://vitest.dev/
- **Playwright Documentation**: https://playwright.dev/
- **Existing Example**: `src/lib/exercises/validation.ts` (excellent reference for schema design)
- **Integration Test Example**: `tests/integration/draw-vip-cards-race-conditions.test.ts`
- **Project Context**: See security audit reports for vulnerabilities prevented by Zod

---

## 🚦 Pre-commit Checklist

Before committing any endpoint or form action:

- [ ] All `request.json()` calls have Zod validation
- [ ] All query parameters are validated
- [ ] All numeric inputs have bounds checking (`.min()`, `.max()`, `.finite()`)
- [ ] All arrays have size limits (`.max()`)
- [ ] All UUIDs are validated (`.uuid()`)
- [ ] Error messages are clear and user-friendly (French for user-facing errors)
- [ ] Unit tests exist for the validation schema
- [ ] No type assertions (`as Type`) used instead of validation

**Remember**: Type assertions provide compile-time types but **zero runtime protection**. Zod provides both!

---

## 🚨 Critical TypeScript Rule

**Project Standard**: `@typescript-eslint/no-explicit-any` is enforced

### Why `any` is Forbidden

- **Disables TypeScript**: `any` turns off all type checking and hides bugs
- **Security Risk**: Combined with no validation, allows any malicious input
- **Project Impact**: Fixed 209 `any` violations in test files (2025-10-27)

### ❌ NEVER Use `any`

```typescript
const data: any = fetchData(); // ❌ NEVER use 'any' type
const result: any = processUser(user); // ❌ Breaks type safety
function handleEvent(event: any) {} // ❌ Disables type checking
```

### ✅ Use Proper Types

```typescript
// ✅ Use proper types from database
import type { Database } from '$lib/types/database';
type User = Database['public']['Tables']['users']['Row'];

const data: User = fetchData(); // ✅ Use proper types from database
const result: ProcessedUser = processUser(user); // ✅ Define custom types
function handleEvent(event: MouseEvent) {} // ✅ Use specific types

// For truly unknown types, use 'unknown' and narrow with type guards
const data: unknown = fetchData();
if (isUser(data)) {
	// Now TypeScript knows data is User
}

// ✅ Zod validation with type inference (SECURE)
import { userSchema } from '$lib/server/validation/users';
const validation = userSchema.safeParse(await request.json());
if (!validation.success) {
	throw error(400, validation.error.issues[0].message);
}
const data = validation.data; // Type-safe AND runtime-validated!
```

**Alternatives to `any`**:

- Use specific types from `$lib/types/database`
- Use `unknown` with type guards for truly unknown data
- Use generics for reusable type-safe functions
- Use Zod schemas for runtime validation + type inference

**Reference**: [Type Safety Patterns](../development/type-safety-patterns.md)

---

[← Back to Claude Docs](./README.md)
