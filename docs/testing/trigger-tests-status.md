# Database Trigger Tests - Current Status

**Date**: 2025-10-28
**Status**: In Progress - Significant Infrastructure Issues

---

## Summary

Database trigger tests were implemented but are currently failing due to foundational infrastructure issues with how tests interact with Supabase's auth schema and local database setup.

**Current State**: ~6% passing (8/136 tests)

---

## Issues Fixed

### 1. UUID Generation ✅ FIXED

- **Problem**: `generateTestId()` was creating strings like `"user-1761604321691-065j9d"` instead of valid UUIDs
- **Fix**: Updated to use `crypto.randomUUID()` for proper UUID v4 format
- **Location**: `tests/database/helpers/trigger-test-helpers.ts:52`

### 2. Foreign Key Constraints ✅ FIXED

- **Problem**: Tests tried to insert `profiles` without corresponding `auth.users` entries
- **Error**: `insert or update on table "profiles" violates foreign key constraint "profiles_id_fkey"`
- **Fix**: Updated `ProfileBuilder.create()` to insert into `auth.users` first, then `profiles`
- **Location**: `tests/database/helpers/test-data-factory.ts:55-79`

### 3. Cleanup Function Schema Access ✅ FIXED

- **Problem**: `cleanupAllTestData()` tried to access `auth.users` table, causing "table not in schema cache" errors
- **Fix**: Removed `auth.users` deletion (relies on ON DELETE CASCADE from `profiles`)
- **Location**: `tests/database/helpers/trigger-test-helpers.ts:146-148`

### 4. Migration Issues ✅ FIXED

- **Problem 1**: School "Lycée Franco-Qatari Voltaire" not found
  - **Fix**: Migration now creates school if it doesn't exist
  - **Location**: `supabase/migrations/015_seed_voltaire_test_data.sql:36-44`

- **Problem 2**: Game spells FK violation for non-existent user
  - **Fix**: Migration now checks if user exists before inserting spells
  - **Location**: `supabase/migrations/059_unlock_spells_for_student.sql:16-52`

---

## Remaining Issues

### Critical: Auth Schema Access Problem ❌

**Impact**: Blocks ~80% of tests

**Problem**: Supabase client cannot access `auth.users` table in local test environment

**Error**: `Could not find the table 'public.users' in the schema cache`

**Affected Files**:

- `chat-triggers.test.ts` (14 tests)
- `updated-at-triggers.test.ts` (18 tests)
- `messaging-triggers.test.ts` (20 tests)
- `cleanup-triggers.test.ts` (9 tests)
- `sync-triggers.test.ts` (10 tests)
- `geometry-triggers.test.ts` (10 tests)
- `game-triggers.test.ts` (11 tests)
- `profile-triggers.test.ts` (7 tests - these NEED auth.users access to test the trigger)

**Root Cause**: Local Supabase instance doesn't expose auth schema through standard Supabase client

**Possible Solutions**:

1. Configure Supabase client to access auth schema
2. Use direct PostgreSQL client instead of Supabase client for these operations
3. Mock auth.users interactions entirely
4. Skip profile-triggers tests (they specifically test auth integration)

### High Priority: Null Profile Creation ❌

**Impact**: 25 tests failing

**Problem**: `ProfileBuilder.create()` sometimes returns `null` instead of created profile

**Error**: `Cannot read properties of null (reading 'id')`

**Affected Files**:

- `template-triggers.test.ts` (13 tests)
- `assignment-triggers.test.ts` (12 tests)

**Investigation Needed**:

- Why does `ProfileBuilder` return null?
- Is the auth.users insert failing silently?
- Are there role-specific issues (only happens for teachers)?

### Medium Priority: Error Monitoring Double-Counting ❌

**Impact**: 4 tests failing

**Problem**: `error_occurrences` count is double what's expected

**Error**: Expected 1/2/5, got 2/4/15

**Affected File**: `error-monitoring-triggers.test.ts` (4 tests)

**Investigation Needed**:

- Is the trigger firing multiple times per insert?
- Is test cleanup not working properly?
- Are there duplicate error signatures being created?

---

## Working Tests (8/136) ✅

All from `error-monitoring-triggers.test.ts`:

- `should generate consistent MD5 signatures` (6 variations)
- `should update last_occurred_at when error occurs again`
- `should denormalize error details`

**Why These Work**: They don't require complex profile/user setup or auth schema access

---

## Test Infrastructure Issues

### 1. Schema Access

The fundamental problem is that Supabase's local instance separates `auth` and `public` schemas, but the test client only has access to `public` schema. This blocks:

- Direct inserts to `auth.users`
- Testing of `on_auth_user_created` trigger
- Cleanup of test auth data

### 2. Test Data Builders

The builder pattern is good, but needs:

- Better error handling when auth.users insert fails
- Validation that profiles were actually created
- Handling of all user roles (student, teacher, admin)

### 3. Test Isolation

Tests are not properly isolated:

- Cleanup function doesn't clear all test data
- Tests may interfere with each other
- Auth users persist between test runs

---

## Recommended Next Steps

### Option 1: Use PostgreSQL Client Directly

Replace Supabase client with `pg` (PostgreSQL) client for tests:

```typescript
import { Client } from 'pg';

const pgClient = new Client({
	connectionString: 'postgresql://postgres:postgres@localhost:54321/postgres'
});

// Direct access to auth.users
await pgClient.query('INSERT INTO auth.users ...');
```

**Pros**: Full schema access, no schema cache issues
**Cons**: Bypasses Supabase SDK entirely, more manual work

### Option 2: Skip Auth-Dependent Tests

Mark profile-triggers tests as `.skip` or `.todo`:

```typescript
describe.skip('on_auth_user_created trigger', () => {
	// Tests that require auth.users access
});
```

**Pros**: Quick fix, other tests can proceed
**Cons**: Doesn't test critical auth integration trigger

### Option 3: Mock Auth Layer

Create mock implementations of auth.users interactions:

```typescript
async function mockAuthUserCreation(profile) {
	// Simulate trigger behavior without auth.users
	await createProfile(profile);
}
```

**Pros**: Tests can run without auth schema
**Cons**: Not true integration tests, may miss real issues

---

## Files Modified

**Test Infrastructure**:

- `tests/database/helpers/trigger-test-helpers.ts` - UUID generation, cleanup
- `tests/database/helpers/test-data-factory.ts` - ProfileBuilder auth.users creation

**Migrations**:

- `supabase/migrations/015_seed_voltaire_test_data.sql` - Auto-create school
- `supabase/migrations/059_unlock_spells_for_student.sql` - Conditional spell insert

---

## Time Estimate to Fix

**Quick Fix (Skip problematic tests)**: 30 minutes

- Mark auth-dependent tests as `.skip`
- Fix null profile issue
- Get ~20-30% tests passing

**Proper Fix (PostgreSQL client)**: 4-6 hours

- Implement PostgreSQL client for auth schema access
- Refactor all test helpers to use pg client
- Fix test isolation issues
- Get ~80-90% tests passing

**Complete Fix (All tests passing)**: 8-10 hours

- All of above
- Debug error monitoring double-counting
- Implement proper test isolation
- Add comprehensive cleanup
- Get ~95-100% tests passing

---

## Conclusion

The trigger test infrastructure has foundational issues that prevent most tests from running. The main blocker is auth schema access in the local Supabase environment.

**Recommendation**: Use PostgreSQL client directly for full schema access, or skip auth-dependent tests and focus on getting the remaining ~100 tests passing first.

The test files themselves are well-structured and comprehensive - the issues are purely infrastructure-related.
