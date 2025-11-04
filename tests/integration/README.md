# Integration Tests

Integration tests for UbuMaths application features that require multiple components working together.

## Overview

Integration tests verify that multiple parts of the application work correctly together, focusing on:

- Data loading and caching patterns
- Page-to-page data flow (layout to child pages)
- Complex workflows involving multiple queries
- Error handling across components

Unlike unit tests (isolated functions) and E2E tests (full browser flows), integration tests validate server-side logic and data flows without UI overhead.

---

## Test Files

### `draw-vip-cards-race-conditions.test.ts` ⚠️ BLOCKED

**Purpose**: Race Condition Testing for VIP Card Draw System

**Status**: **BLOCKED** - Requires authentication implementation

Validates that the `draw_multiple_vip_cards` RPC function properly prevents race conditions using PostgreSQL's `SELECT FOR UPDATE`.

**Test Scenarios** (5 tests, all blocked):

- Gidouilles double-spend prevention
- Gidouilles triple-spend scenario
- VIP card double-use prevention
- VIP card triple-use scenario
- Mixed payment methods (simultaneous gidouilles + VIP card)

**Current Blocker**:
The RPC function has proper authorization that checks `auth.uid()`. Integration tests use service role client (`auth.uid() = NULL`), causing all calls to fail with "Unauthorized".

**Next Steps**:

1. Implement `createAuthenticatedClient()` helper
2. Update `insertAuthUser()` to set known test password
3. Sign in as test user before RPC calls
4. Re-enable assertions

**See** `/tests/integration/draw-vip-cards-race-conditions.README.md` for detailed documentation.

---

### `teacher-layout-loading.test.ts`

**Purpose**: Tests for Teacher Dashboard Cache (Phase 1)

Validates that the teacher dashboard layout loads all necessary data in parallel and makes it available to child pages without additional queries.

**Coverage**: 16 tests organized in 3 groups

#### Group 1: Layout Loading (5 tests)

- ✅ Loads all data in parallel (classes, school, warnings)
- ✅ Classes include students with gidouilles and vip_cards
- ✅ School info includes periods array and active year
- ✅ Warnings are correctly grouped by class for current period
- ✅ Handles gracefully when no active period exists

#### Group 2: Child Pages Inherit Data (5 tests)

- ✅ Rewards page inherits data without additional queries
- ✅ Dashboard page inherits data without additional queries
- ✅ Navigation reuses same data reference (not copies)
- ✅ Inherited data matches layout data exactly
- ✅ All TypeScript types are correct

#### Group 3: Error Handling (5 tests)

- ✅ Propagates error when school query fails
- ✅ Shows error when classes query fails
- ✅ Handles warnings query failure without crashing (warnings optional)
- ✅ Handles teacher with 0 classes gracefully
- ✅ Handles null fields (avatar_url, full_name) without crashes

#### Integration Test (1 test)

- ✅ Complete teacher dashboard load with realistic data

**Key Features**:

- Mock Supabase client for deterministic testing
- Validates parallel query execution
- Verifies zero redundant queries across navigation
- Tests all error paths and edge cases

---

## Running Tests

```bash
# Run all integration tests
pnpm vitest run tests/integration/

# Run with verbose output
pnpm vitest run tests/integration/ --reporter=verbose

# Run specific test file
pnpm vitest run tests/integration/teacher-layout-loading.test.ts

# Watch mode (auto-rerun on changes)
pnpm vitest tests/integration/ --watch

# With coverage
pnpm vitest run tests/integration/ --coverage
```

---

## Writing Integration Tests

### Structure

```typescript
/**
 * Feature Name Integration Tests
 * ===============================
 *
 * Description of what's being tested and why
 *
 * @vitest-environment node
 */

import { describe, test, expect } from 'vitest';

// 1. Type definitions
type MyType = ...;

// 2. Mock data factories
function createMockData() { ... }

// 3. Mock clients/services
function createMockClient() { ... }

// 4. Helper functions
async function loadData() { ... }

// 5. Test groups
describe('Group Name', () => {
  test('should do something', async () => {
    expect.assertions(3); // Always specify assertion count

    // Arrange
    const mockData = createMockData();

    // Act
    const result = await loadData(mockData);

    // Assert
    expect(result).toBeDefined();
    expect(result.foo).toBe('bar');
    expect(result.items).toHaveLength(2);
  });
});
```

### Best Practices

1. **Always use `expect.assertions(n)`**
   - Ensures all assertions run (catches early returns)
   - Documents expected assertion count

2. **Use descriptive test names**
   - Start with `should` for behavior
   - Describe the expected outcome clearly
   - Example: `'should load classes with students including gidouilles and vip_cards'`

3. **Group related tests**
   - Use `describe()` blocks for logical grouping
   - Example: "Layout Loading", "Error Handling"

4. **Test edge cases**
   - Empty arrays/objects
   - Null/undefined fields
   - Missing data
   - Error conditions

5. **Mock external dependencies**
   - Database queries (Supabase)
   - API calls
   - File system operations
   - Time-dependent operations

6. **Keep tests fast**
   - Avoid real I/O operations
   - Use mocks instead of real services
   - Prefer sync operations when possible

---

## Test Coverage Goals

- **Critical paths**: 100% coverage
  - Data loading workflows
  - Error handling paths
  - Security checks (auth, permissions)

- **Edge cases**: Cover all realistic scenarios
  - Empty datasets
  - Null/undefined values
  - Boundary conditions
  - Concurrent operations

- **Type safety**: Verify TypeScript types
  - Ensure no `any` types leak through
  - Test type narrowing works correctly

---

## Troubleshooting

### Tests timing out

**Problem**: `Test timed out in 5000ms`

**Solutions**:

1. Check for unresolved promises
2. Ensure mocks return immediately (not using fake timers with async)
3. Increase timeout if needed: `test('...', async () => { ... }, 10000)`

### Type errors

**Problem**: `Property 'foo' does not exist on type 'Bar'`

**Solutions**:

1. Check database types are up-to-date (`pnpm db:types`)
2. Use proper type imports from `$lib/types/database`
3. Add missing fields to mock factories

### Failed assertions

**Problem**: `expected X to be Y`

**Solutions**:

1. Check mock data matches expected structure
2. Verify async operations completed
3. Use `console.log()` to inspect actual values
4. Check for timing issues (data loaded after assertion)

---

## Future Tests

Integration tests to add as features are developed:

- **Student Dashboard Cache** (Phase 2)
  - Similar to teacher layout loading
  - Validates assignment data loading
  - Tests SRS review caching

- **Assessment Workflow**
  - Create → Assign → Complete → Grade
  - Verify data flows correctly
  - Test concurrent submissions

- **SRS Review Session**
  - Load deck → Review cards → Update stats
  - Test spaced repetition algorithm
  - Verify XP/progress calculations

- **Real-time Features**
  - WebSocket connections
  - Live updates to students
  - Concurrent user actions

---

## Related Documentation

- **Unit Tests**: `/tests/unit/` - Isolated function testing
- **E2E Tests**: `/e2e/` - Full user flows (Playwright)
- **Database Tests**: `/tests/database/` - Trigger and function testing
- **Test Fixtures**: `/tests/fixtures/` - Shared test data

---

**Last Updated**: 2025-11-01
**Test Count**: 16 tests, 100% passing
**Execution Time**: <10ms average
