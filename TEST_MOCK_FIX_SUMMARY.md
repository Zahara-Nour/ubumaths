# Test Mock Infrastructure Fix - Summary Report

**Date**: 2025-10-27
**Task**: Fix mock infrastructure issues in failing tests
**Status**: Partially Complete (98 failing → down from 124 failing)

## 🎯 Progress Summary

### ✅ Completed

1. **Created Shared Test Helper** (`tests/helpers/supabase-helpers.ts`)
   - Proper mock Supabase client with chainable query builder
   - Consistent mock creation across all tests
   - Helper functions for common test patterns

2. **Fixed Critical Endpoint Typo**
   - `src/routes/api/assessments/[id]/assign/+server.ts` line 17
   - Changed `locals.sapabaseClient()` → `locals.safeGetSession()`
   - This was causing 7 test failures

3. **Fixed Session Mock Logic**
   - Updated `createMockLocals()` to return `null` for unauthenticated users
   - Previously returned `{ user: null, session: null }` which is truthy
   - This fixes authentication test failures

### 📊 Current Test Status

```
Total: 2,088 tests
✅ Passing: 1,966 (94.2%)
❌ Failing: 98 (4.7%)
⏭️ Skipped: 24 (1.1%)

Failed Test Files: 6
- src/lib/server/assessments.test.ts (22 tests)
- src/routes/api/assessments/api-routes.test.ts (43 tests)
- src/routes/api/exercises/api-routes.test.ts (29 tests)
- src/lib/server/riddle-auto-select.test.ts (4 tests)
```

## 🔍 Root Cause Analysis

### The Core Problem

Tests were incorrectly mocking intermediate chain methods (`.select()`, `.eq()`, etc.) with `.mockResolvedValueOnce()`, which breaks the chain:

```typescript
// ❌ WRONG - Breaks the chain
supabase._mockChain.select.mockResolvedValueOnce({
  data: [...],
  error: null
});

// ✅ CORRECT - Only mock terminal operations
supabase._mockChain.single.mockResolvedValueOnce({
  data: {...},
  error: null
});
```

### Why This Matters

When an endpoint or server function makes a database call like:

```typescript
const { data } = await supabase
	.from('profiles') // Returns mockChain
	.select('role') // Should return mockChain
	.eq('id', userId) // Should return mockChain
	.single(); // Terminal - should resolve to { data, error }
```

If `.select()` is mocked with `.mockResolvedValueOnce()`, it returns a Promise instead of the chain object, causing `.eq()` to fail with "eq is not a function".

## 🛠️ Solution Patterns

### Pattern 1: Simple Single Query

```typescript
const supabase = createMockSupabase();
const locals = createMockLocals(userId, supabase);

// Mock the terminal operation only
supabase._mockChain.single.mockResolvedValueOnce({
	data: { id: '123', role: 'teacher' },
	error: null
});

// The query chain works correctly
const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
```

### Pattern 2: Multiple Sequential Queries

```typescript
const supabase = createMockSupabase();
const locals = createMockLocals(userId, supabase);

// Mock each query's terminal operation in sequence
supabase._mockChain.single.mockResolvedValueOnce({
	data: { role: 'teacher' }, // First query
	error: null
});

supabase._mockChain.single.mockResolvedValueOnce({
	data: { id: 'assessment-123' }, // Second query
	error: null
});

// Both queries work
const { data: profile } = await supabase.from('profiles').select().eq().single();
const { data: assessment } = await supabase.from('assessments').select().eq().single();
```

### Pattern 3: Queries Returning Arrays

```typescript
supabase._mockChain.then.mockResolvedValueOnce({
	data: [{ id: '1' }, { id: '2' }],
	error: null
});

const { data } = await supabase.from('items').select().eq('status', 'active'); // No .single(), so promise resolves with .then()
```

## 📝 Files Requiring Updates

### High Priority (Many Tests Affected)

1. **`src/lib/server/assessments.test.ts`** (22 failing tests)
   - Pattern: Tests mock `.select()` and `.then()` incorrectly
   - Fix: Only mock terminal operations (`.single()`, `.then()`)
   - Line examples: 267, 284, 408, 442, 471, etc.

2. **`src/routes/api/assessments/api-routes.test.ts`** (43 failing tests)
   - Pattern: Similar `.select()` mocking issue
   - Additionally: Some tests need multiple sequential mocks
   - Line examples: 408, 441, 878, 920, 1106, 1189, 1258, etc.

3. **`src/routes/api/exercises/api-routes.test.ts`** (29 failing tests)
   - Same pattern as assessments
   - Already has import path fixed (needs `createMockSupabase` import)

4. **`src/lib/server/riddle-auto-select.test.ts`** (4 failing tests)
   - Complex nested mock structure
   - Custom mock implementation instead of using shared helper

### Specific Fix Patterns

#### Fix Type A: Remove `.select()` mocks, use `.then()` or `.single()`

```typescript
// Before:
(locals.supabase.from('assessments') as any).select.mockResolvedValueOnce({
	data: assignments,
	error: null
});

// After:
supabase._mockChain.then.mockResolvedValueOnce({
	data: assignments,
	error: null
});
```

#### Fix Type B: Sequential queries need multiple mocks

```typescript
// Before (one mock for multiple queries - WRONG):
supabase._mockChain.single.mockResolvedValueOnce({data: {...}, error: null});

// After (one mock per query):
supabase._mockChain.single.mockResolvedValueOnce({data: profile, error: null});
supabase._mockChain.single.mockResolvedValueOnce({data: assessment, error: null});
supabase._mockChain.select.mockResolvedValueOnce({data: attempts, error: null});
```

## 🚀 Next Steps

### Immediate Actions

1. **Update all `.select()` mocks in test files**
   - Use Python script to automate this
   - Pattern: Find `.select.mockResolvedValue` and change to appropriate terminal operation

2. **Fix sequential query mocks**
   - Manually review tests with complex endpoint/server function calls
   - Add multiple `.mockResolvedValueOnce()` calls in correct sequence

3. **Update riddle-auto-select tests**
   - Migrate to use `createMockSupabase()` helper
   - Simplify nested mock structure

### Recommended Approach

Given the complexity, I recommend:

1. **Incremental fixing**: Fix one test file at a time
2. **Run tests frequently**: Verify each fix doesn't break other tests
3. **Document patterns**: Add comments explaining mock sequencing for complex tests

### Automation Script

A Python script exists at `/tmp/fix-test-mocks.py` that can help with basic pattern fixes. However, many tests require manual review due to complex query sequences.

## 📚 Resources Created

1. **`tests/helpers/supabase-helpers.ts`** - Shared mock infrastructure
2. **`/tmp/fix-test-mocks.py`** - Basic automation for pattern fixes
3. **This document** - Comprehensive guide to the problem and solutions

## 🎓 Key Learnings

1. **Mock chain objects must maintain chainability** - Intermediate methods must return `this`
2. **Only terminal operations return data** - `.single()`, `.then()`, `.maybeSingle()`
3. **Test isolation requires careful mock sequencing** - Each query needs its own mock
4. **Shared helpers prevent inconsistency** - Centralized mocking logic is critical

## ⚠️ Warnings

- **Do not use `.mockResolvedValue()` on `.select()`, `.eq()`, `.order()`, etc.**
- **Always use `.mockResolvedValueOnce()` for sequential queries** (not `.mockResolvedValue()`)
- **Count your queries** - If an endpoint makes 3 database calls, you need 3 mocks

---

**Status**: Ready for systematic fixing. The infrastructure is in place, patterns are documented, and automated tools are available for bulk fixes.
