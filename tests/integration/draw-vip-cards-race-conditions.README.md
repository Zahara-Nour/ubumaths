# VIP Card Draw System - Race Condition Integration Tests

## Status: ✅ COMPLETE - All Tests Passing

**Created**: 2025-11-04
**Completed**: 2025-11-04
**Test Results**: 5/5 tests passing with real Supabase instance

---

## Overview

Integration tests for critical race condition scenarios in the VIP card draw system (`draw_multiple_vip_cards` RPC function).

These tests verify that PostgreSQL's `SELECT FOR UPDATE` correctly prevents:

1. **Double-spend**: Multiple simultaneous draws with insufficient balance
2. **Double-use**: Multiple simultaneous uses of the same VIP card

---

## Implementation Summary

### ✅ 1. Test Infrastructure

- **File**: `draw-vip-cards-race-conditions.test.ts` (549 lines)
- **Config**: `vitest.integration.config.ts` (sequential execution)
- **Scripts**: `pnpm test:integration`, `pnpm test:integration:watch`
- **Test Count**: 5 comprehensive race condition scenarios
- **Execution Time**: ~2.34 seconds with cleanup
- **Status**: All tests passing

### ✅ 2. Authentication Helpers

**Challenge**: RPC functions require authenticated clients to test authorization checks with `auth.uid()`

**Solution**: Created complete authentication test infrastructure

**Files Created/Updated**:

1. **`tests/database/helpers/supabase-client.ts`** (NEW)

   - Exports `createAuthenticatedClient(email, password?)` helper
   - Signs in test users with Supabase auth
   - Returns authenticated client with valid session token
   - Default test password: `'password123'`

2. **`tests/database/helpers/postgres-client.ts`** (UPDATED)
   - Updated `insertAuthUser()` with `password` parameter support
   - Uses PostgreSQL `crypt()` function for proper bcrypt hashing
   - Enables sign-in to work correctly in tests

**Example Usage**:

```typescript
// Create test student with auth.users entry
const student = await TestData.profile().withRole('student').withGidouilles(10).create();

// Sign in as the student
const studentClient = await createAuthenticatedClient(student.email);

// Make authenticated RPC call (auth.uid() is correctly set)
const { data, error } = await studentClient.rpc('draw_multiple_vip_cards', {
	p_student_id: student.id,
	p_count: 1,
	p_payment_method: 'gidouilles',
	p_gidouilles_cost: 10,
	p_vip_card_instance_id: null
});
```

### ✅ 3. Bug Fix: ProfileBuilder Duplicate Key

**Bug**: `ProfileBuilder.create()` caused duplicate key violations when creating test profiles

**Root Cause**:

```typescript
// OLD (BROKEN):
await insertAuthUser({ id, email }); // Triggers handle_new_user()
await profiles.insert(profileData); // ❌ Profile already exists!
```

The `handle_new_user()` database trigger automatically creates a profile when inserting into `auth.users`, so the manual `INSERT` into profiles caused a duplicate key error.

**Fix Applied** (in `tests/database/helpers/test-data-factory.ts`):

```typescript
// NEW (FIXED):
await insertAuthUser({ id, email }); // Triggers handle_new_user()
await new Promise((resolve) => setTimeout(resolve, 50)); // Wait for trigger
await profiles.update(profileData).eq('id', id); // ✅ Update instead!
```

**Impact**: This fix also resolves failures in `pnpm test:triggers`.

### ✅ 4. Test Scenarios

All tests follow this pattern:

1. Create test student with specific balance/cards
2. Execute simultaneous RPC calls via `Promise.allSettled()`
3. Verify one request succeeds, others fail with appropriate errors
4. Verify final database state is correct (no negative balances, no double-use)

**Test Cases**:

1. **Double-spend with insufficient balance** (10 gidouilles, 2× 10g draws)

   - Result: 1 succeeds, 1 fails with "Insufficient gidouilles"
   - Final balance: 0 (not -10)

2. **Triple-spend with partial balance** (20 gidouilles, 3× 10g draws)

   - Result: 2 succeed, 1 fails
   - Final balance: 0

3. **Double-use of same VIP card** (1 card, 2 simultaneous uses)

   - Result: 1 succeeds, 1 fails with "VIP card already used"
   - Card marked as used exactly once

4. **Triple-use of same VIP card** (1 card, 3 simultaneous uses)

   - Result: 1 succeeds, 2 fail
   - Card used exactly once

5. **Mixed race conditions** (simultaneous gidouilles + VIP card payments)
   - Result: Both succeed (different resources, no conflict)
   - Verifies lock granularity is correct

### ✅ 5. Proper Test Isolation

- `beforeEach`: Cleans all test data (auth.users, profiles)
- Sequential execution (`singleFork: true`) prevents test interference
- 30s timeout for database operations
- Proper cleanup with verification logging
- Wait periods for transaction completion (200ms)

---

## Running Tests

### Prerequisites

- Docker installed and running
- Supabase local instance on port 54321

### Commands

```bash
# Start Supabase local (one-time setup)
pnpm db:start

# Run integration tests
pnpm test:integration

# Watch mode (for development)
pnpm test:integration:watch

# Stop Supabase when done
pnpm db:stop
```

### Expected Output

```
✓ tests/integration/draw-vip-cards-race-conditions.test.ts (5)
  ✓ POST /api/rewards/draw-vip-cards - Race Condition Tests (5)
    ✓ Gidouilles Double-Spend Prevention (2)
      ✓ should prevent double-spend when student makes 2 simultaneous draws with insufficient balance
      ✓ should handle 3 simultaneous draws with balance for only 2
    ✓ VIP Card Double-Use Prevention (2)
      ✓ should prevent double-use when student tries to use same VIP card twice simultaneously
      ✓ should prevent triple-use when 3 requests try to use same card simultaneously
    ✓ Mixed Race Conditions (1)
      ✓ should handle simultaneous gidouilles and VIP card payments without interference

Test Files  1 passed (1)
     Tests  5 passed (5)
  Start at  10:30:45
  Duration  2.34s
```

---

## What Tests Verify

### Race Condition Protection

- ✅ `SELECT FOR UPDATE` locks profile row during transaction
- ✅ Concurrent requests wait for lock before checking balance
- ✅ Only one request can modify balance at a time
- ✅ Database state remains consistent (no negative balances)
- ✅ VIP cards cannot be used multiple times

### Security

- ✅ Students cannot exploit timing to get free cards
- ✅ Authorization checks work correctly with authenticated clients
- ✅ `auth.uid()` is properly set in RPC function context
- ✅ Error messages are user-friendly and don't leak sensitive data

### Data Integrity

- ✅ Gidouilles balance never goes negative
- ✅ VIP cards have exactly one `usedAt` timestamp after use
- ✅ Card counts match expected values
- ✅ Transactions are atomic (all-or-nothing)

---

## Test Architecture

### Test Helpers

**`createAuthenticatedClient(email, password?)`**

- Location: `tests/database/helpers/supabase-client.ts`
- Returns authenticated Supabase client with valid session
- Default password: `'password123'`

**`insertAuthUser(params)`**

- Location: `tests/database/helpers/postgres-client.ts`
- Creates user in `auth.users` with hashed password
- Uses PostgreSQL `crypt()` for bcrypt hashing
- Parameters: `{ id, email, password?, encryptedPassword? }`

**`TestData.profile()`**

- Location: `tests/database/helpers/test-data-factory.ts`
- Builder pattern for creating test profiles
- Methods: `.withRole()`, `.withGidouilles()`, `.withVipCards()`, `.create()`

**`cleanupAllTestData()`**

- Location: `tests/database/helpers/trigger-test-helpers.ts`
- Removes all test users (email pattern: `%@test.com%`)
- Cleans both `auth.users` and `profiles` tables

### Configuration

**`vitest.integration.config.ts`**:

```typescript
export default defineConfig({
	test: {
		name: 'integration',
		environment: 'node',
		include: ['tests/integration/**/*.{test,spec}.{js,ts}'],
		testTimeout: 30000, // 30s for database operations
		hookTimeout: 30000,
		pool: 'forks',
		poolOptions: {
			forks: {
				singleFork: true // Sequential execution to prevent test interference
			}
		}
	}
});
```

---

## Related Files

### Source Code

- `/supabase/migrations/20251104091315_add_draw_multiple_vip_cards_function.sql` - RPC function with race condition protection
- `/src/routes/api/rewards/draw-vip-cards/+server.ts` - API endpoint
- `/src/lib/server/validation/draw-vip-cards.ts` - Zod validation schemas

### Tests

- `/src/routes/api/rewards/draw-vip-cards/+server.test.ts` - Unit tests (919 lines)
- `/tests/integration/draw-vip-cards-race-conditions.test.ts` - Integration tests (549 lines, this file)

### Test Infrastructure

- `/tests/database/helpers/supabase-client.ts` - Authentication helpers (NEW)
- `/tests/database/helpers/postgres-client.ts` - Direct database access (UPDATED)
- `/tests/database/helpers/test-data-factory.ts` - Test data builders (FIXED)
- `/tests/database/helpers/trigger-test-helpers.ts` - Supabase utilities

### Configuration

- `/vitest.integration.config.ts` - Integration test configuration (NEW)
- `/package.json` - Test scripts: `test:integration`, `test:integration:watch`

---

## Troubleshooting

### Tests Failing with "Unauthorized"

**Problem**: RPC calls return "Unauthorized: You can only draw cards for yourself or your students"

**Cause**: Not using authenticated client, so `auth.uid()` is NULL

**Solution**:

```typescript
// ❌ DON'T use service client for RPC calls
const { data } = await serviceClient.rpc('draw_multiple_vip_cards', {...});

// ✅ DO use authenticated client
const studentClient = await createAuthenticatedClient(student.email);
const { data } = await studentClient.rpc('draw_multiple_vip_cards', {...});
```

### Tests Failing with "Duplicate Key Violation"

**Problem**: `ProfileBuilder.create()` fails with duplicate key error

**Cause**: `handle_new_user()` trigger already created profile

**Solution**: Already fixed in `test-data-factory.ts`. If you see this error, ensure you're using the latest version.

### Supabase Not Starting

**Problem**: `pnpm db:start` fails

**Solutions**:

- Ensure Docker is running
- Check port 54321 is not in use: `lsof -i :54321`
- Reset Supabase: `pnpm db:stop && pnpm db:start`

### Tests Timeout

**Problem**: Tests exceed 30s timeout

**Possible Causes**:

- Database not responding (check Docker)
- Cleanup taking too long (check for orphaned test data)
- Network issues (ensure localhost:54321 is accessible)

**Solution**:

- Verify Supabase is running: `supabase status`
- Check Docker logs: `docker logs supabase-db`
- Increase timeout in config if needed

---

## Future Enhancements

### Short Term

- [ ] Add integration tests for VIP card action type validation
- [ ] Test RLS policies with authenticated clients
- [ ] Add stress tests (10+ concurrent requests)

### Long Term

- [ ] Parallel test execution with better isolation
- [ ] Performance benchmarks for race condition scenarios
- [ ] Integration with CI/CD pipeline (GitHub Actions)
- [ ] Mock Supabase client for faster tests (trade-off: less realistic)

---

## Documentation

For more information:

- **Feature Documentation**: `docs/features/vip-card-draw-system.md`
- **Quality Standards**: `docs/claude/quality-standards.md` (Testing section)
- **Database Schema**: `docs/architecture/database-schema.md`
- **Supabase Local Development**: https://supabase.com/docs/guides/cli/local-development

---

**Last Updated**: 2025-11-04
**Status**: Production-ready ✅
**Test Suite**: 5/5 passing
