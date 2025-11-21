# Double-Completion Guard Fix

**Date**: 2025-11-20
**Issue**: Game completion was being blocked by the double-completion guard on the FIRST legitimate call
**Status**: ✅ FIXED

---

## Problem Analysis

### Root Cause

The code was setting `game.status = 'lost'` or `game.status = 'won'` BEFORE calling `completeGame()`. When `completeGame()` ran, the double-completion guard checked:

```typescript
if (game.status !== 'in_progress') {
    logger.warn('Attempted to complete non-active game:', { status: game.status });
    return;  // ← Blocked the FIRST legitimate call
}
```

Since status was already changed, the guard rejected the FIRST call instead of protecting against second calls.

### Error Flow

1. User clicks bomb
2. `revealCell()` is called (line 666)
3. Inside `revealCell()`, when mine is detected:
   - Line 665: `game.status = 'lost'` ❌ (sets status BEFORE calling completeGame)
   - Line 666: `this.completeGame(false)` (tries to complete)
4. `completeGame()` checks guard at line 1301-1304
5. Guard sees status is 'lost' (not 'in_progress') and returns early
6. Game completion is blocked, database never updated

### Evidence

Error log showed:
```
[minesweeper.svelte.ts] Attempted to complete non-active game: {status: 'lost'}
```

This happened on the FIRST call to `completeGame()`, not a duplicate call.

---

## Solution

### Changes Made

**Removed 4 premature status assignments** that occurred before `completeGame()`:

1. **Line 665** in `revealCell()` - Mine hit (loss):
   ```typescript
   // ❌ BEFORE
   game.status = 'lost';
   this.completeGame(false);

   // ✅ AFTER
   // Don't set game.status here - let completeGame() handle it
   this.completeGame(false);
   ```

2. **Line 676** in `revealCell()` - All safe cells revealed (win):
   ```typescript
   // ❌ BEFORE
   game.status = 'won';
   this.completeGame(true);

   // ✅ AFTER
   // Don't set game.status here - let completeGame() handle it
   this.completeGame(true);
   ```

3. **Line 1591** in `handleWin()` - Called from chord clicks and hints:
   ```typescript
   // ❌ BEFORE
   this.currentGame.status = 'won';
   this.completeGame(true);

   // ✅ AFTER
   // Don't set status here - let completeGame() handle it
   this.completeGame(true);
   ```

4. **Line 1600** in `handleLoss()` - Called from chord clicks:
   ```typescript
   // ❌ BEFORE
   this.currentGame.status = 'lost';
   this.completeGame(false);

   // ✅ AFTER
   // Don't set status here - let completeGame() handle it
   this.completeGame(false);
   ```

### Why This Works

`completeGame()` already sets the status at **line 1311**:

```typescript
// Update game status
game.status = won ? 'won' : 'lost';
```

**Correct flow now**:
- First call: status is 'in_progress' → guard passes → `completeGame()` sets status to 'won'/'lost'
- Second call (if any): status is 'won'/'lost' → guard blocks correctly ✅

---

## Verification

### Tests Passed

All 36 unit tests in `minesweeper.svelte.test.ts` passed:

```bash
✓ |client (chromium)| src/lib/stores/minesweeper.svelte.test.ts (36 tests) 147ms
```

### Code Quality

- ✅ ESLint: No errors or warnings
- ✅ No TypeScript errors introduced in minesweeper.svelte.ts
- ✅ No other places where `game.status = 'won'/'lost'` before `completeGame()`

### Remaining Status Assignments

Only 2 legitimate status assignments remain:
1. **Line 620**: `game.status = 'in_progress'` - On first reveal (correct, not before completeGame)
2. **Line 1311**: `game.status = won ? 'won' : 'lost'` - Inside completeGame() (correct, this is THE place)

---

## Impact

### Before Fix
- ❌ Game completion blocked on first call
- ❌ Database never updated
- ❌ No XP awarded
- ❌ No achievements unlocked
- ❌ Game state stuck in UI

### After Fix
- ✅ Game completion works on first call
- ✅ Database updated correctly
- ✅ XP awarded
- ✅ Achievements unlocked
- ✅ UI state transitions properly

---

## Key Takeaway

**Rule**: Never set `game.status` before calling `completeGame()`. Let `completeGame()` be the single source of truth for status transitions to 'won'/'lost'.

This ensures the double-completion guard can properly distinguish between:
- First call (status still 'in_progress') → Allow
- Duplicate call (status already 'won'/'lost') → Block
