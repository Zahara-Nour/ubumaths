# Cache Event Bus - Multi-Tab Synchronization

## Overview

The Cache Event Bus supports automatic synchronization between browser tabs using the [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel). When a cache invalidation event is published in one tab, all other tabs for the same user will automatically receive the event and can react accordingly.

**Status**: ✅ **Production** - Implemented and tested in warnings management system (2025-10-29)

## How It Works

### Architecture

```
Tab 1                    Tab 2                    Tab 3
  |                        |                        |
  | publish('warnings')    |                        |
  |----------------------->|                        |
  | BroadcastChannel       |                        |
  |----------------------->|----------------------->|
  |                        |                        |
  |                    listeners                listeners
  |                    triggered                triggered
```

### Implementation Details

1. **Initialization** (browser only):
   - When the `CacheEventBus` is constructed, it checks if `BroadcastChannel` is available
   - If available, it creates a channel named `'cache-invalidation'`
   - It sets up a listener for messages from other tabs

2. **Publishing Events**:
   - When an event is published via `cacheEventBus.publish()`:
     - Local listeners in the current tab are notified immediately
     - The event is broadcast to other tabs via `BroadcastChannel.postMessage()`

3. **Receiving Events**:
   - When a message arrives from another tab:
     - The event is automatically forwarded to all local listeners
     - This triggers cache invalidation in the receiving tab

## Usage Example

### Teacher Dashboard - Warnings Management (✅ Production Implementation)

**Real implementation from `/src/routes/(protected)/dashboard/teacher/warnings/+page.svelte`**:

```typescript
// Tab 1: Teacher adds a warning
async function handleAddWarning(studentId: string, type: WarningType) {
	const tempWarningId = crypto.randomUUID();

	// 1. Optimistic update (instant UI)
	warningsCache.addOptimistic(selectedClassId, selectedPeriodId, studentId, type, tempWarningId);

	// 2. Debounce server sync (500ms)
	clearTimeout(addDebounceTimers.get(studentId));
	const timer = setTimeout(async () => {
		try {
			// 3. Server API call
			const response = await fetch('/api/warnings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					student_id: studentId,
					warning_type: type,
					class_id: selectedClassId,
					academic_period_id: selectedPeriodId
				})
			});

			if (!response.ok) throw new Error('Failed to add warning');

			// 4. Success - invalidate cache
			warningsCache.invalidate(selectedClassId, selectedPeriodId);

			// 5. Publish Event Bus event (broadcasts to other tabs automatically)
			cacheEventBus.invalidateWarnings(selectedClassId, selectedPeriodId, 'Warning added');

			// 6. Reload fresh data
			await loadWarnings();
		} catch (error) {
			// Rollback optimistic update on error
			warningsCache.rollbackOptimistic(selectedClassId, selectedPeriodId, studentId);
			toaster.error('Failed to add warning');
		}
	}, 500);

	addDebounceTimers.set(studentId, timer);
}

// Tab 2: Automatic synchronization via Event Bus subscription
$effect(() => {
	const unsubscribe = cacheEventBus.subscribe((event) => {
		// Filter events by type and scope
		if (
			event.type === 'warnings' &&
			event.scope.classId === selectedClassId &&
			event.scope.periodId === selectedPeriodId
		) {
			console.log('[WarningsPage] Cache invalidated from another tab:', event.reason);
			// Invalidate local cache
			warningsCache.invalidate(selectedClassId, selectedPeriodId);
			// Reload warnings (triggers fresh API call)
			loadWarnings();
		}
	});

	return unsubscribe; // Cleanup on unmount
});
```

### Real-World Scenario

**Scenario**: A teacher has two browser tabs open:

- Tab 1: Student warnings management page
- Tab 2: Student grades dashboard (shows warning count)

**Flow**:

1. Teacher adds a warning in Tab 1
2. `cacheEventBus.invalidateWarnings()` is called
3. Tab 1's listeners update immediately (optimistic UI)
4. Event is broadcast via BroadcastChannel
5. Tab 2 receives the event and automatically reloads warning counts
6. **Result**: Both tabs stay synchronized without manual refresh

## Features

### SSR Compatibility

The feature is **browser-only** and gracefully degrades on the server:

```typescript
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
	this.broadcastChannel = new BroadcastChannel('cache-invalidation');
}
```

- ✅ Works in modern browsers (Chrome, Firefox, Edge, Safari 15.4+)
- ✅ Server-side rendering doesn't break (BroadcastChannel is null)
- ✅ Falls back to single-tab invalidation when unavailable

### Error Handling

The implementation includes robust error handling:

```typescript
// Publishing errors don't crash the app
if (this.broadcastChannel) {
	try {
		this.broadcastChannel.postMessage(fullEvent);
	} catch (error) {
		console.error('[CacheEventBus] Error broadcasting to other tabs:', error);
	}
}

// Listener errors are isolated
this.broadcastChannel.onmessage = (event) => {
	this.listeners.forEach((listener) => {
		try {
			listener(cacheEvent);
		} catch (error) {
			console.error('[CacheEventBus] Error in listener:', error);
		}
	});
};
```

### Debugging

Events include console logging for debugging:

```typescript
// Publishing
console.log('[CacheEventBus] Publishing event:', fullEvent.type, fullEvent.reason);

// Receiving from other tabs
console.log('[CacheEventBus] Received event from other tab:', cacheEvent.type, cacheEvent.reason);
```

Open the browser console to see real-time synchronization across tabs.

## Browser Support

| Browser | Version | Support                             |
| ------- | ------- | ----------------------------------- |
| Chrome  | 54+     | ✅ Full support                     |
| Firefox | 38+     | ✅ Full support                     |
| Edge    | 79+     | ✅ Full support                     |
| Safari  | 15.4+   | ✅ Full support                     |
| Safari  | <15.4   | ⚠️ Graceful degradation             |
| Node.js | N/A     | ⚠️ Server-side: no BroadcastChannel |

Source: [MDN Browser Compatibility](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel#browser_compatibility)

## Performance Considerations

### Efficiency

- **Zero overhead**: BroadcastChannel uses native browser APIs (no polling)
- **Same-origin only**: Only tabs on the same domain receive messages (security + performance)
- **Small payloads**: Events are lightweight JSON objects (~100-200 bytes)

### Best Practices

1. **Debounce rapid updates**: When publishing many events quickly, consider debouncing:

   ```typescript
   let debounceTimer: ReturnType<typeof setTimeout>;

   function debouncedInvalidate() {
   	clearTimeout(debounceTimer);
   	debounceTimer = setTimeout(() => {
   		cacheEventBus.invalidateWarnings(classId, periodId);
   	}, 300);
   }
   ```

2. **Scope events properly**: Use specific scopes to avoid unnecessary cache clears:

   ```typescript
   // Good: Specific scope
   cacheEventBus.invalidateWarnings(classId, periodId, 'Warning added');

   // Bad: Too broad
   cacheEventBus.invalidateAll(teacherId, 'Some change');
   ```

3. **Batch database operations**: When making multiple changes, batch them and publish once:

   ```typescript
   // Good: Single invalidation after batch
   await Promise.all([deleteWarning(id1), deleteWarning(id2), deleteWarning(id3)]);
   cacheEventBus.invalidateWarnings(classId, periodId, 'Bulk delete');

   // Bad: Multiple invalidations
   await deleteWarning(id1);
   cacheEventBus.invalidateWarnings(classId, periodId);
   await deleteWarning(id2);
   cacheEventBus.invalidateWarnings(classId, periodId); // Redundant!
   ```

## Testing

### Unit Tests

See `src/lib/stores/__tests__/cacheEventBus-broadcast.test.ts` for unit tests.

### Manual Testing

**✅ Confirmed Working (2025-10-29)**

**Test procedure**:

1. Open the app in two browser tabs
2. Navigate to the teacher warnings management page in both tabs (`/dashboard/teacher/warnings`)
3. Select the same class in both tabs
4. In Tab 1: Add a new warning for a student
5. In Tab 2: Watch the warning list update automatically (within 1-2 seconds)
6. Check browser console for synchronization logs

**Expected console output**:

**Tab 1** (where warning was added):

```
[WarningsPage] Adding warning type C for student abc-123
[CacheEventBus] Publishing event: warnings Warning added
```

**Tab 2** (receiving update):

```
[CacheEventBus] Received event from other tab: warnings Warning added
[WarningsPage] Cache invalidated from another tab: Warning added
[WarningsCache] Fetching warnings for class xyz-456, period def-789
```

**Test results**:

- ✅ Single-tab updates work instantly (optimistic UI)
- ✅ Cross-tab synchronization works automatically (1-2s delay)
- ✅ Console logs show proper event flow
- ✅ No errors or race conditions
- ✅ Scope filtering works correctly (only matching class+period updates)
- ✅ Multiple rapid changes batch correctly (debouncing works)

### E2E Testing

For E2E tests with Playwright:

```typescript
test('multi-tab cache synchronization', async ({ context }) => {
	// Open two pages (tabs)
	const page1 = await context.newPage();
	const page2 = await context.newPage();

	// Navigate both to the same page
	await page1.goto('/dashboard/teacher/warnings');
	await page2.goto('/dashboard/teacher/warnings');

	// Add warning in page1
	await page1.click('[data-testid="add-warning"]');
	await page1.fill('input[name="reason"]', 'Test warning');
	await page1.click('[data-testid="submit"]');

	// Verify page2 updates automatically
	await expect(page2.locator('[data-testid="warning-list"]')).toContainText('Test warning');
});
```

## Future Enhancements

### Possible Improvements

1. **Conflict Resolution**: Detect simultaneous edits across tabs
2. **Event Replay**: Cache recent events for late-joining tabs
3. **Message Deduplication**: Prevent duplicate invalidations
4. **Selective Sync**: Allow users to opt-out of multi-tab sync
5. **Metrics**: Track sync latency and event frequency

### Not Planned

- **Cross-user sync**: Use Supabase Realtime instead (for real-time collaboration)
- **Persistent sync**: BroadcastChannel is ephemeral (tabs must be open)

## Related Documentation

- [Cache Event Bus Overview](./cache-event-bus.md)
- [Client-Side Caching Strategy](../guides/client-side-caching.md)
- [Warnings Management Feature](../features/warnings-management.md)
- [BroadcastChannel API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)

## Implementation Files

- **Core**: `src/lib/stores/cacheEventBus.svelte.ts`
- **Tests**: `src/lib/stores/__tests__/cacheEventBus-broadcast.test.ts`
- **Usage**: `src/routes/(protected)/dashboard/teacher/warnings/+page.svelte`
