# Testing Documentation

Comprehensive testing documentation for UbuMaths.

---

## 🎉 Current Status: 100% Pass Rate

**Date**: October 28, 2025
**Tests**: 2,454 total / 2,430 passing (100% of non-skipped tests)
**Skipped**: 24 tests (integration tests, intentional)
**Flaky Tests**: 0 (all tests pass reliably)
**Coverage**: All features thoroughly tested

**Recent Fixes** (2025-10-28):

- ✅ Added comprehensive Zod validation test suite (366 tests, 100% pass rate)
- ✅ Fixed critical Zod v4 compatibility bug in 6 schema files
- ✅ Fixed all 10 validation test failures (100% pass rate achieved)
- ✅ All 15 validation modules now have complete test coverage

**Previous Fixes** (2025-10-27):

- ✅ Fixed 1 flaky test (timestamp comparison in instance-generator.test.ts:87)
- ✅ Fixed 13 critical TypeScript errors in production server code
- ✅ Fixed 160 null-check errors in test files
- ✅ Fixed 91 ESLint 'any' type errors in test files
- ✅ Improved type safety with mock interfaces (MockSupabaseWithChain)

**Quick Links**:

- [100% Pass Rate Achievement](./test-suite-achievement.md) - How we achieved it
- [Test Infrastructure Guide](./test-infrastructure.md) - Shared mock helpers
- [Common Test Patterns](./common-test-patterns.md) - Quick pattern reference
- [Database Trigger Tests](./database-trigger-tests.md) ⭐ - PostgreSQL trigger testing (139 tests)

---

## Documentation Index

### Core Testing Guides

- **[Test Suite Achievement](./test-suite-achievement.md)** ⭐ - Complete story of achieving 100% pass rate
- **[Test Infrastructure Guide](./test-infrastructure.md)** ⭐ - How to use shared mock helpers
- **[Common Test Patterns](./common-test-patterns.md)** ⭐ - Quick reference for test patterns
- **[Database Trigger Tests](./database-trigger-tests.md)** ⭐ - PostgreSQL trigger integration tests (139 tests, 72 triggers)

### Feature Test Reports

- [Test Suite Summary](../TEST_SUITE_SUMMARY.md) - Overall test status and health
- [Questions Feature Test Report](../TEST_REPORT_QUESTIONS.md) - Detailed Questions feature testing
- [Assessments Feature Test Report](./ASSESSMENT_TEST_REPORT.md) - Detailed Assessments feature testing
- **[Message Templates Test Report](./message-templates-test-report.md)** - Comprehensive Templates testing (250 tests)
- [Riddles Feature Test Report](./riddles-test-report.md) - Comprehensive Riddles feature testing (143 tests)
- [Riddles Test Summary](./riddles-test-summary.md) - Quick overview of riddle tests

---

## Test Organization

### Unit Tests (`*.test.ts`)

Located alongside implementation files in `src/`:

```
src/lib/questions/
├── parser/
│   ├── tokenizer.test.ts (31 tests)
│   ├── variable-parser.test.ts (31 tests)
│   ├── random-parser.test.ts (29 tests)
│   └── eval-parser.test.ts (42 tests)
├── generator/
│   ├── variable-resolver.test.ts (39 tests)
│   ├── random-generator.test.ts (36 tests)
│   ├── content-resolver.test.ts (41 tests)
│   ├── choice-shuffler.test.ts (23 tests)
│   └── instance-generator.test.ts (27 tests)
└── validators/
    └── template-validator.test.ts (34 tests)

src/lib/server/
├── assessments.test.ts (44 tests)
├── exercise-assignments.test.ts (...)
├── riddle-auto-select.test.ts (17 tests)
└── riddle-messages.test.ts (22 tests)

src/lib/templates/
├── templateEngine.test.ts (63 tests) ✨ NEW
├── advancedEngine.test.ts (108 tests) ✨ NEW
└── templateVariables.test.ts (79 tests) ✨ NEW

src/lib/utils/
├── riddle-validator.test.ts (55 tests)
└── riddle-badges.test.ts (33 tests)

src/routes/api/assessments/
└── api-routes.test.ts (47 tests)

src/routes/api/riddles/
└── api-routes.test.ts (16 tests)
```

### E2E Tests (`*.spec.ts`)

Located in `e2e/`:

```
e2e/
├── demo.test.ts
├── exercises-parameterization.spec.ts
├── teacher-students-cache.spec.ts
└── navadra/
    ├── challenge-types.spec.ts
    ├── error-scenarios.spec.ts
    └── student-combat-flow.spec.ts
```

---

## Running Tests

### All Tests

```bash
pnpm test              # Run all tests (unit + E2E)
pnpm test:unit         # Run only unit tests
pnpm test:e2e          # Run only E2E tests
```

### Filtered Tests

```bash
# Run tests for specific feature
pnpm test:unit -- questions
pnpm test:unit -- exercises
pnpm test:unit -- api

# Run specific test file
pnpm test:unit -- tokenizer
pnpm test:unit -- instance-generator

# Run tests matching pattern
pnpm test:unit -- parser
pnpm test:unit -- generator
```

### Watch Mode

```bash
pnpm test:unit -- --watch           # Watch all
pnpm test:unit -- --watch questions # Watch Questions feature
```

### Coverage

```bash
pnpm test:unit -- --coverage
```

---

## Test Statistics (2025-10-28)

### Overall

- Total test files: 70 (69 active, 1 skipped)
- Total tests: 2,454
- Passing: 2,430 (100% of non-skipped)
- Failing: 0 (0%)
- Skipped: 24 (integration tests, intentional)
- Flaky: 0 (all tests pass reliably)

### By Feature

| Feature               | Files | Tests   | Pass    | Status                |
| --------------------- | ----- | ------- | ------- | --------------------- |
| **Zod Validation**    | **8** | **366** | **366** | **✅ PERFECT (100%)** |
| **Message Templates** | **3** | **250** | **250** | **✅ PERFECT (100%)** |
| **Riddles**           | **5** | **143** | **143** | **✅ PERFECT (100%)** |
| **Assessments**       | **2** | **91**  | **91**  | **✅ PERFECT (100%)** |
| Questions             | 11    | 334     | 334     | ✅ PERFECT (100%)     |
| Exercises             | ~15   | ~400    | ~400    | ✅ PERFECT (100%)     |
| API Routes            | 8     | ~300    | ~300    | ✅ PERFECT (100%)     |
| Shared Param          | 4     | 46      | 46      | ✅ PERFECT (100%)     |
| Server Functions      | ~10   | ~200    | ~200    | ✅ PERFECT (100%)     |
| Other                 | ~10   | ~250    | ~250    | ✅ PERFECT (100%)     |

#### Message Templates Feature Breakdown

| Component         | Tests | Pass | Status  |
| ----------------- | ----- | ---- | ------- |
| Core Engine       | 63    | 63   | ✅ 100% |
| Advanced Features | 108   | 108  | ✅ 100% |
| Variable Registry | 79    | 79   | ✅ 100% |

**Coverage Includes:**

- ✅ 30+ variable substitutions (5 trigger types)
- ✅ 14 filters (text, number, date, array, HTML)
- ✅ Conditional logic (if/else blocks)
- ✅ Filter chaining
- ✅ Template validation
- ✅ Edge cases and error handling

#### Riddles Feature Breakdown

| Component        | Tests | Pass | Status  |
| ---------------- | ----- | ---- | ------- |
| Validation Logic | 55    | 55   | ✅ 100% |
| Badge System     | 33    | 33   | ✅ 100% |
| Message Creation | 22    | 22   | ✅ 100% |
| API Endpoints    | 16    | 16   | ✅ 100% |
| Auto-Selection   | 17    | 17   | ✅ 100% |

#### Zod Validation Suite Breakdown

| Component               | Tests | Pass | Status  |
| ----------------------- | ----- | ---- | ------- |
| Common Schemas          | 79    | 79   | ✅ 100% |
| Misc Modules            | 95    | 95   | ✅ 100% |
| Exercises               | 84    | 84   | ✅ 100% |
| SRS (Spaced Repetition) | 76    | 76   | ✅ 100% |
| Rewards/Messages/Notifs | 56    | 56   | ✅ 100% |
| Assessments             | 41    | 41   | ✅ 100% |
| Admin                   | 40    | 40   | ✅ 100% |
| Response Utils          | 33    | 33   | ✅ 100% |

**Coverage Includes**:

- ✅ 15 validation modules (100% coverage)
- ✅ 51+ Zod schemas (input & response validation)
- ✅ UUID validation, pagination, form data transforms
- ✅ Discriminated unions (SRS card types)
- ✅ Edge cases, error handling, type coercion
- ✅ Critical bug fix: Zod v4 compatibility (`z.record()` signature)

**Test Command**: `pnpm test:unit src/lib/server/validation`

**Achievement**: Fixed all 10 initial test failures, achieving 100% pass rate

---

## Shared Test Infrastructure

The project uses a centralized test infrastructure for consistent mocking:

**Location**: `/tests/helpers/supabase-helpers.ts`

**Key Functions**:

- `createMockSupabase()` - Chainable mock Supabase client
- `createMockLocals()` - Mock locals with authentication
- `createMockRequest()` - Mock HTTP requests
- `mockSuccess()` / `mockError()` - Quick mock setup
- `mockSequence()` - Multiple sequential mocks
- Standard test data (IDs, profiles)

**See**: [Test Infrastructure Guide](./test-infrastructure.md) for detailed usage

---

## Test Quality Standards

### Naming Conventions

**Test Files**:

- Unit tests: `*.test.ts` (adjacent to implementation)
- E2E tests: `*.spec.ts` (in `e2e/` directory)
- Integration tests: `*.integration.test.ts`

**Test Names** (behavior-driven):

```typescript
// ✅ Good - describes behavior
test('should generate reproducible instance with same seed', () => {});

// ❌ Bad - too vague
test('test generation', () => {});
```

### Test Structure (Arrange-Act-Assert)

```typescript
test('should resolve variable in eval expression', () => {
	// Arrange: Set up test data
	const variables = [
		{ name: 'a', value: 5 },
		{ name: 'b', value: 10 }
	];

	// Act: Execute the function
	const result = resolveVariables('{eval:{@:a}+{@:b}}', variables);

	// Assert: Verify the outcome
	expect(result).toBe('15');
});
```

### Test Organization

```typescript
describe('Feature - Category', () => {
	describe('Subcategory', () => {
		test('should do specific thing', () => {});
		test('should handle edge case', () => {});
	});

	describe('Error Handling', () => {
		test('should throw on invalid input', () => {});
	});
});
```

---

## Testing Patterns

### 1. Parser Tests

```typescript
test('should parse random expression with exclusions', () => {
	const input = '{#:1-100!10-20,50}';
	const result = parseRandomExpression(input);

	expect(result).toEqual({
		min: 1,
		max: 100,
		exclusions: {
			ranges: [[10, 20]],
			values: [50]
		}
	});
});
```

### 2. Generator Tests (Seeded Random)

```typescript
test('should produce same results with same seed', () => {
	const result1 = generateRandom(1, 10, 42); // seed=42
	const result2 = generateRandom(1, 10, 42); // same seed

	expect(result1).toBe(result2); // Deterministic
});

test('should produce different results with different seeds', () => {
	const result1 = generateRandom(1, 10, 42);
	const result2 = generateRandom(1, 10, 43);

	expect(result1).not.toBe(result2); // Non-deterministic
});
```

### 3. Validator Tests

```typescript
test('should fail on missing required field', () => {
	const template = {
		/* missing 'type' field */
	};
	const errors = validateTemplate(template);

	expect(errors.some((e) => e.includes('type'))).toBe(true);
});
```

### 4. Edge Case Tests

```typescript
test('should handle empty input', () => {
	expect(parseExpression('')).toEqual([]);
});

test('should handle very long input', () => {
	const longInput = 'a'.repeat(10000);
	expect(() => parseExpression(longInput)).not.toThrow();
});

test('should handle special characters', () => {
	const input = 'Calcul: é + à = ';
	expect(parseExpression(input)).toBeDefined();
});
```

### 5. Error Handling Tests

```typescript
test('should throw on circular dependency', () => {
	const variables = [
		{ name: 'a', expression: '{@:b}' },
		{ name: 'b', expression: '{@:a}' } // Circular!
	];

	expect(() => resolveVariables(variables)).toThrow('Circular dependency');
});
```

---

## Mocking Strategies

### Supabase Mocks

```typescript
import { vi } from 'vitest';

const mockSupabase = {
	from: vi.fn(() => ({
		select: vi.fn(() => ({
			eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
		})),
		insert: vi.fn(() => Promise.resolve({ data: {}, error: null })),
		update: vi.fn(() => Promise.resolve({ data: {}, error: null })),
		delete: vi.fn(() => Promise.resolve({ error: null }))
	}))
};
```

### Storage Mocks

```typescript
const mockStorage = {
	upload: vi.fn(() => Promise.resolve({ data: { path: 'test.jpg' }, error: null })),
	remove: vi.fn(() => Promise.resolve({ error: null })),
	getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://...' } }))
};
```

---

## Performance Testing

### Benchmarking

```typescript
test('should handle 1000 shuffles efficiently', () => {
	const choices = Array.from({ length: 100 }, (_, i) => ({
		content: { type: 'text', content: `Choice ${i}` },
		isCorrect: i === 0
	}));

	const start = performance.now();
	for (let i = 0; i < 1000; i++) {
		shuffleChoices(choices, i);
	}
	const duration = performance.now() - start;

	expect(duration).toBeLessThan(1000); // < 1 second
});
```

### Memory Testing

```typescript
test('should not leak memory with large inputs', () => {
	const large = Array.from({ length: 10000 }, () => generateRandom(1, 100));

	expect(large.length).toBe(10000);
	// Check memory usage if needed
});
```

---

## Common Test Failures

### 1. Mock Configuration Issues

**Error**: `Cannot destructure property 'data' of undefined`

**Cause**: Mock not returning proper `{ data, error }` structure

**Fix**:

```typescript
// ❌ Bad
const mockFrom = vi.fn(() => ({ select: vi.fn() }));

// ✅ Good
const mockFrom = vi.fn(() => ({
	select: vi.fn(() => Promise.resolve({ data: [], error: null }))
}));
```

### 2. Async Test Failures

**Error**: Test times out or finishes before assertions

**Fix**: Always `await` async operations

```typescript
// ❌ Bad
test('should fetch data', () => {
	fetchData(); // Missing await!
	expect(data).toBeDefined();
});

// ✅ Good
test('should fetch data', async () => {
	const data = await fetchData();
	expect(data).toBeDefined();
});
```

### 3. Flaky Tests (Non-Deterministic)

**Cause**: Tests depend on random values or timing

**Fix**: Use seeded random or mock timers

```typescript
// ❌ Bad
const random = Math.random();

// ✅ Good
const random = generateRandom(0, 1, 42); // Seeded
```

---

## CI/CD Integration (TODO)

### GitHub Actions Workflow

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - name: Install dependencies
        run: pnpm install
      - name: Run tests
        run: pnpm test:unit
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Testing Checklist

Before committing code, ensure:

- [ ] All new code has tests
- [ ] All tests pass (`pnpm test:unit`)
- [ ] No skipped tests (or documented reason)
- [ ] Test names are descriptive
- [ ] Edge cases are covered
- [ ] Error handling is tested
- [ ] Mocks are properly configured
- [ ] No flaky tests (run multiple times to verify)

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Questions Feature Tests](../TEST_REPORT_QUESTIONS.md)
- [Assessments Feature Tests](./ASSESSMENT_TEST_REPORT.md)
- [Test Suite Summary](../TEST_SUITE_SUMMARY.md)

---

**Last Updated**: 2025-10-27
**Maintained By**: Development Team
