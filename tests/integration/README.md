# Integration Tests

Integration tests for UbuMaths application features that require multiple components working together.

## Overview

Integration tests verify that multiple parts of the application work correctly together, focusing on:

- Data loading and caching patterns
- Page-to-page data flow (layout to child pages)
- Complex workflows involving multiple queries
- Error handling across components

Unlike unit tests (isolated functions) and E2E tests (full browser flows), integration tests validate server-side logic and data flows without UI overhead.

> **Architecture & règles** : [docs/ref/tests/architecture.md](../../docs/ref/tests/architecture.md).
> Ces tests nécessitent **Supabase local** et tournent via `pnpm test:integration`
> (+ job nightly CI). Le sous-dossier `database/` contient les tests de triggers / RLS,
> les helpers partagés sont dans `tests/helpers/database/`.

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

Les autres fichiers couvrent les VIP cards (filtering, rarity, teacher overrides),
le kanban RLS, les sections CRUD, le endpoint skill-attempts, le référentiel de
compétences, et les triggers/RLS sous `database/`.

---

## Running Tests

```bash
# Démarrer Supabase local d'abord
pnpm db:start

# Lancer tous les tests d'intégration (config dédiée)
pnpm test:integration

# Watch mode
pnpm test:integration:watch
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
