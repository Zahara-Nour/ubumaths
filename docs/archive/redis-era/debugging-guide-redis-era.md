# Debugging Guide

> Comprehensive guide to debugging UbuMaths issues, with focus on multi-layer cache systems

**Last Updated**: 2025-10-29
**Status**: Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Cache Debugging](#cache-debugging)
3. [Common Symptom Patterns](#common-symptom-patterns)
4. [Multi-Layer Cache Debugging](#multi-layer-cache-debugging)
5. [Redis Cache Issues](#redis-cache-issues)
6. [Client Cache Issues](#client-cache-issues)
7. [Cross-Device Sync Debugging](#cross-device-sync-debugging)
8. [Tools and Techniques](#tools-and-techniques)

---

## Overview

UbuMaths uses a **three-tier cache architecture**:

1. **Tier 1 (Client Store)**: Browser-side Svelte stores (0ms latency)
2. **Tier 2 (Redis)**: Shared cache across server instances (~50ms latency)
3. **Tier 3 (Database)**: Supabase Postgres (source of truth, ~250ms latency)

When debugging cache issues, you must verify **each layer** to identify where data corruption or staleness occurs.

---

## Cache Debugging

### Quick Diagnostic Checklist

When data isn't displaying correctly, check these in order:

**1. Is the database correct?**

```sql
-- Check raw database data
SELECT * FROM student_warnings
WHERE class_id = 'your-class-id'
AND academic_period_id = 'your-period-id';
```

**2. Is Redis caching correctly?**

```bash
# Check Redis cache content
redis-cli GET "warnings:v2:class:{classId}:period:{periodId}:false"

# Should show JSON with student IDs, not empty "{}"
```

**3. Is client cache receiving correct data?**

```javascript
// Browser console - inspect cache state
console.log($warningsCache.cache);
// Should show Map with student IDs and counts
```

**4. Is the UI rendering correctly?**

```svelte
<!-- Add debug output to template --><pre>{JSON.stringify(studentWarnings, null, 2)}</pre>
```

---

## Common Symptom Patterns

### Pattern 1: "Flash Then Disappear"

**Symptoms**:

- Data loads correctly on first page load
- After 5-10 seconds (polling interval), data disappears
- Refreshing page shows data again briefly
- Data becomes empty after cache hit

**Root Cause**: Corrupted cache layer (usually Redis Map serialization issue)

**Diagnosis Steps**:

1. **Check Redis cache content**:

```bash
redis-cli GET "warnings:v2:class:{classId}:period:{periodId}:false"
```

Expected: `{"student-uuid-1":{"C":0,"M":1,"R":0,"T":0,"total":1}}`
Actual (if broken): `{}`

2. **Verify cache version**:

```bash
redis-cli KEYS "warnings:*"
# Should show v2 keys, not v1 keys
```

3. **Test Map serialization**:

```javascript
// In Node REPL or browser console
const map = new Map([['key', { value: 'test' }]]);
JSON.stringify(map); // Returns "{}" - THIS IS THE BUG!
```

**Solution**: Convert Map to plain object before Redis storage (see [Hybrid Cache System](../architecture/hybrid-cache-system.md#2-handle-javascript-map-serialization-critical))

**Real-World Example**: `warnings:v1:*` used Map directly (broken) → `warnings:v2:*` uses Object conversion (fixed)

---

### Pattern 2: "Default Values Persist"

**Symptoms**:

- UI shows default values (0/0/0/0 for warnings)
- Database has correct data
- Cache appears to have data but UI doesn't update
- Occurs after API response

**Root Cause**: Client cache parsing wrong part of API response

**Diagnosis Steps**:

1. **Inspect API response**:

```javascript
// Browser DevTools Network tab - check response structure
{
  "success": true,
  "warnings": {
    "student-uuid-1": { "C": 0, "M": 1, "R": 0, "T": 0, "total": 1 }
  }
}
```

2. **Check client cache parsing**:

```typescript
// src/lib/stores/warningsCache.svelte.ts
// WRONG: Object.entries(result).forEach(...)
// RIGHT: Object.entries(result.warnings).forEach(...)
```

3. **Verify cache state**:

```javascript
// Browser console
console.log($warningsCache.cache.get('class:period:key'));
// Should show Map with student data, not API metadata
```

**Solution**: Parse correct property from API response (`result.warnings` not `result`)

**Real-World Fix**: Changed line 577 in `warningsCache.svelte.ts` from `Object.entries(result)` to `Object.entries(result.warnings)`

---

### Pattern 3: "Flash of Default Values on Load"

**Symptoms**:

- UI briefly shows default values (0/0/0/0) before loading real data
- Happens on initial page load only
- Data eventually loads correctly
- No errors in console

**Root Cause**: Component renders before initial data fetch completes

**Diagnosis Steps**:

1. **Check component lifecycle**:

```svelte
<script>
	// Is there a loading state?
	let _hasLoadedOnce = $state(false);

	$effect(() => {
		// Is this setting _hasLoadedOnce after first load?
		if (selectedClassId && selectedPeriodId) {
			cache.get(selectedClassId, selectedPeriodId).then(() => {
				_hasLoadedOnce = true;
			});
		}
	});
</script>
```

2. **Check template rendering**:

```svelte
<!-- Is there a loading state check? -->
{#if !_hasLoadedOnce}
	<div>Loading...</div>
{:else}
	<!-- Show real data -->
{/if}
```

**Solution**: Add loading state management with `_hasLoadedOnce` flag

**Implementation**:

```typescript
let _hasLoadedOnce = $state(false);

$effect(() => {
	if (requiredDataIsPresent) {
		fetchData().then(() => {
			_hasLoadedOnce = true;
		});
	}
});
```

---

### Pattern 4: "Works Without Redis, Breaks With Redis"

**Symptoms**:

- Data displays correctly when Redis is disabled/down
- Data corrupts when Redis is enabled
- Database queries return correct data
- Cache hit causes wrong data

**Root Cause**: Redis serialization issue (likely Map or Set objects)

**Diagnosis Steps**:

1. **Test with Redis disabled**:

```bash
# Temporarily remove Redis credentials
# .env
# UPSTASH_REDIS_REST_URL=  # Comment out
# UPSTASH_REDIS_REST_TOKEN=  # Comment out
```

2. **Check Redis stored data**:

```bash
redis-cli GET "your-cache-key"
# Check if it's "{}" (empty object) or null
```

3. **Verify serialization in code**:

```typescript
// Are you storing Map/Set objects directly?
await redis.setex(key, ttl, JSON.stringify(dataMap)); // WRONG if dataMap is a Map

// Should convert to plain object first
const obj = Object.fromEntries(dataMap);
await redis.setex(key, ttl, JSON.stringify(obj)); // CORRECT
```

**Solution**: Use cache logging to identify which cache function is causing issues, then fix serialization

---

## Multi-Layer Cache Debugging

### Debugging Flow Diagram

```
User Request
     │
     ▼
[Client Store] ─── Hit? ──→ Return (0ms)
     │ Miss
     ▼
[Redis Cache] ─── Hit? ──→ Return (50ms)
     │ Miss
     ▼
[Database] ────────────→ Return (250ms)
     │
     ▼
Cache & Return
```

### Debug Each Layer

**1. Client Store (Browser)**

```javascript
// Browser console
console.log($warningsCache.cache);
// Expected: Map { 'class:period:key' => { data: Map {...}, timestamp: ..., loading: false } }

// Check specific key
const entry = $warningsCache.cache.get('class:period:key');
console.log('Data:', entry?.data);
console.log('Timestamp:', new Date(entry?.timestamp));
console.log('Age (seconds):', (Date.now() - entry?.timestamp) / 1000);
```

**2. Redis Cache (Server)**

```bash
# List all warning cache keys
redis-cli KEYS "warnings:*"

# Get specific cache entry
redis-cli GET "warnings:v2:class:{classId}:period:{periodId}:false"

# Check TTL (time to live)
redis-cli TTL "warnings:v2:class:{classId}:period:{periodId}:false"
# Returns seconds remaining, or -1 if no expiration, -2 if key doesn't exist
```

**3. Database (Source of Truth)**

```sql
-- Check raw data
SELECT
  student_id,
  warning_type,
  COUNT(*) as count
FROM student_warnings
WHERE class_id = 'your-class-id'
  AND academic_period_id = 'your-period-id'
GROUP BY student_id, warning_type
ORDER BY student_id;
```

---

## Redis Cache Issues

### Issue: Empty Objects in Cache

**Symptom**: Redis cache contains `"{}"` instead of data.

**Diagnosis**:

```bash
redis-cli GET "warnings:v2:class:{classId}:period:{periodId}:false"
# Returns: "{}"
```

**Root Cause**: Map/Set serialization bug.

**Fix**:

```typescript
// BEFORE (BROKEN)
await redis.setex(key, TTL, JSON.stringify(dataMap)); // dataMap is a Map

// AFTER (FIXED)
const obj = Object.fromEntries(dataMap);
await redis.setex(key, TTL, JSON.stringify(obj));
```

---

### Issue: Cache Version Mismatch

**Symptom**: Old cache keys from previous version still present.

**Diagnosis**:

```bash
redis-cli KEYS "warnings:v1:*"
# Should return empty array if migration complete
```

**Fix**: Wait for TTL expiration (automatic) or manually delete:

```bash
redis-cli DEL "warnings:v1:class:*"
```

---

### Issue: Cache Not Expiring

**Symptom**: Stale data persists beyond expected TTL.

**Diagnosis**:

```bash
redis-cli TTL "warnings:v2:class:{classId}:period:{periodId}:false"
# Returns remaining seconds, or -1 if no expiration set
```

**Fix**: Check TTL is being set correctly:

```typescript
await redis.setex(cacheKey, TTL_SECONDS, data); // Must be setex, not set
```

---

## Client Cache Issues

### Issue: API Response Parsing Error

**Symptom**: Client cache stores wrong data structure.

**Diagnosis**:

```javascript
// Browser Network tab - check actual API response
{
  "success": true,
  "warnings": { /* data here */ }
}

// Then check how it's parsed in code
Object.entries(result).forEach(...) // WRONG - includes success, warnings
Object.entries(result.warnings).forEach(...) // RIGHT - only warnings data
```

**Fix**: Parse correct property from response.

---

### Issue: Cache Not Updating After Mutation

**Symptom**: After adding/removing warning, UI doesn't update.

**Diagnosis**:

```typescript
// Check if invalidation is called after mutation
await addWarning(...);
await invalidateWarningsCache(classId, periodId); // This line should exist
```

**Fix**: Add cache invalidation after all mutation operations.

---

## Cross-Device Sync Debugging

### Issue: Polling Not Running

**Symptom**: Changes on Device 1 don't appear on Device 2.

**Diagnosis**:

1. **Check browser console for polling logs**:

```javascript
// Should appear every 5 seconds:
[WarningsPage] Polling warnings (cross-device sync)
```

2. **Check tab visibility**:

```javascript
// Browser console
console.log('Tab hidden?', document.hidden);
// Polling pauses when tab is hidden (by design)
```

3. **Check required data presence**:

```typescript
// Polling only runs when classId and periodId are set
console.log('selectedClassId:', selectedClassId);
console.log('selectedPeriodId:', selectedPeriodId);
```

**Fix**: Ensure tab is visible, required data is selected, and network requests aren't blocked.

---

### Issue: Polling Too Frequent

**Symptom**: Excessive API calls, Redis quota exceeded.

**Diagnosis**:

```bash
# Check Upstash dashboard for request count
# Or monitor browser network tab
```

**Fix**: Adjust polling interval:

```typescript
const POLL_INTERVAL = 5000; // Change to 10000 for 10 seconds
```

---

## Tools and Techniques

### Enable Cache Logging

```bash
# .env
ENABLE_CACHE_LOGS=true
```

**Output format**:

```
[getCachedSchool][Redis][Tier-2] 🎯 HIT (52ms) school:550e8400-...:data
[getCachedProfile][RAM Server][Tier-1] 🎯 HIT (0.8ms) profile:123:role
[getClassWarnings][DB] ⏱️ FETCH (245ms) { classId: '...', periodId: '...' }
```

See [Cache Logging Format](cache-logging-format.md) for full documentation.

---

### Redis CLI Commands

```bash
# List all keys matching pattern
redis-cli KEYS "warnings:*"

# Get value
redis-cli GET "warnings:v2:class:{uuid}:period:{uuid}:false"

# Check TTL
redis-cli TTL "warnings:v2:class:{uuid}:period:{uuid}:false"

# Delete key
redis-cli DEL "warnings:v2:class:{uuid}:period:{uuid}:false"

# Delete all matching pattern (use with caution)
redis-cli --scan --pattern "warnings:v1:*" | xargs redis-cli DEL

# Get database info
redis-cli INFO
```

---

### Browser Console Debugging

```javascript
// Check Svelte store state
console.log($warningsCache.cache);

// Check specific cache entry
const key = `class:${classId}:period:${periodId}`;
const entry = $warningsCache.cache.get(key);
console.log('Cache entry:', entry);

// Check data structure
if (entry?.data instanceof Map) {
	console.log('Data is a Map with', entry.data.size, 'entries');
	for (const [studentId, counts] of entry.data) {
		console.log(studentId, counts);
	}
}

// Check cache age
const ageSeconds = (Date.now() - entry?.timestamp) / 1000;
console.log(`Cache age: ${ageSeconds.toFixed(1)}s`);

// Force cache refresh
await $warningsCache.get(classId, periodId);
```

---

### Network Tab Analysis

**Check API Response Structure**:

1. Open DevTools → Network tab
2. Filter by "warnings" or relevant endpoint
3. Click request → Preview tab
4. Verify response structure matches expected format

**Expected for warnings API**:

```json
{
  "success": true,
  "warnings": {
    "student-uuid-1": {
      "C": 0,
      "M": 1,
      "R": 0,
      "T": 0,
      "total": 1,
      "score": 19,
      "warnings": [...]
    }
  }
}
```

---

### Supabase Query Debugging

```typescript
// Add .explain() to see query plan
const { data, error } = await supabase
	.from('student_warnings')
	.select('*')
	.eq('class_id', classId)
	.explain({ analyze: true }); // Shows execution plan

console.log('Query plan:', data);
```

---

## Cache Corruption Recovery

If cache becomes corrupted, follow this recovery process:

**1. Identify Corrupted Keys**:

```bash
redis-cli KEYS "warnings:*" | while read key; do
  value=$(redis-cli GET "$key")
  if [ "$value" = "{}" ]; then
    echo "Corrupted: $key"
  fi
done
```

**2. Invalidate Corrupted Caches**:

```bash
# Option A: Wait for TTL (automatic, 3 minutes for warnings)
# Option B: Manual deletion
redis-cli DEL "warnings:v1:*"
```

**3. Bump Cache Version** (if fixing serialization bug):

```typescript
// In cache module
const CACHE_VERSION = 'v3'; // Increment from v2
```

**4. Deploy Fix**:

- New version uses correct serialization
- Old caches auto-expire
- No data loss (database is source of truth)

---

## Case Study: Warnings Cache Bug (2025-10-29)

**Timeline**:

1. **Initial Symptom**: Data appeared correctly on page load, then disappeared after 5 seconds
2. **First Investigation**: Checked database (correct), checked Redis (empty `{}`), identified Map serialization bug
3. **Root Cause**: `JSON.stringify(map)` produces `"{}"`
4. **Secondary Bug**: Client cache parsing `result` instead of `result.warnings`
5. **Tertiary Bug**: Flash of default values due to missing loading state
6. **Fix**: Map → Object conversion + API parsing fix + loading state
7. **Prevention**: Cache version bump (v1 → v2), documentation updates

**Key Lessons**:

- Multi-layer caches require debugging each layer independently
- Map serialization is a common JavaScript gotcha
- Cache version bumps prevent corrupted data from persisting
- Loading states prevent UI flashing during async operations

---

## See Also

- [Hybrid Cache System](../architecture/hybrid-cache-system.md) - Cache architecture overview
- [Cache Logging Format](cache-logging-format.md) - Log format specification
- [Cross-Device Sync](../features/cross-device-sync.md) - Polling-based sync feature
- [Redis Cache Setup](../guides/redis-cache-setup.md) - Configuration guide

---

**Last Updated**: 2025-10-29
**Maintained By**: Development Team
