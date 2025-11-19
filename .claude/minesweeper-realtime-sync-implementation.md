# Minesweeper Multiplayer Real-Time Synchronization Implementation

**Date**: 2025-11-19
**Feature**: Real-time game state synchronization for multiplayer matches
**Status**: ✅ Complete

---

## Overview

Implemented a complete real-time synchronization system for Minesweeper multiplayer matches, allowing players to see each other's progress during gameplay with sub-second latency.

---

## Files Created

### 1. Database Migration
**File**: `supabase/migrations/20251119130200_add_realtime_functions.sql`

Three SECURITY DEFINER functions:
- `update_game_state()` - Update player's game state (cells, flags, time)
- `start_match()` - Transition match from countdown to in_progress
- `get_match_state()` - Retrieve complete match state for both players

**Security Features**:
- Authentication validation (auth.uid() check)
- Player participation verification
- Bounds checking (cells: 0-480, flags: 0-99, time: 0-7200)
- Match status validation

### 2. Validation Schema
**File**: `src/lib/server/validation/minesweeper-multiplayer.ts`

Added `realtimeStateUpdateSchema`:
```typescript
{
  cells_revealed: number (0-480)
  flags_used: number (0-99)
  time_elapsed: number (0-7200)
  last_action?: {
    type: 'reveal' | 'flag' | 'unflag'
    row: number (0-15)
    col: number (0-29)
    timestamp: number
  }
}
```

### 3. API Endpoints

#### GET/PATCH `/api/games/minesweeper/multiplayer/[id]/state`
**File**: `src/routes/api/games/minesweeper/multiplayer/[id]/state/+server.ts`

**GET** - Retrieve current match state:
- Returns both players' progress
- Includes player names, cells revealed, flags used, time elapsed
- Returns which player number you are (1 or 2)

**PATCH** - Update your game state:
- Validates input with Zod schema
- Updates cells_revealed, flags_used, time_elapsed
- Optionally includes last_action for fine-grained sync
- Debounced on client (recommended: 200-500ms)

#### POST `/api/games/minesweeper/multiplayer/[id]/start`
**File**: `src/routes/api/games/minesweeper/multiplayer/[id]/start/+server.ts`

**POST** - Start match:
- Transitions match from 'countdown' to 'in_progress'
- Sets started_at timestamp
- Both players should call this when countdown reaches 0

---

## Security Implementation

### ✅ Input Validation (Zod)
All endpoints use Zod schemas:
- `realtimeStateUpdateSchema` - PATCH /state
- Match ID validated as UUID

### ✅ Authentication & Authorization
- `requireRole(locals, 'student')` on all endpoints
- SQL functions verify auth.uid()
- Player participation checked in database

### ✅ Bounds Checking
Multiple layers:
1. Zod schema (TypeScript layer)
2. SQL function (Database layer)
3. Specific error messages for each violation

### ✅ Error Handling
French error messages:
- 400: Invalid input (cells/flags/time out of bounds)
- 401: Not authenticated
- 403: Not a participant in match
- 409: Match not in valid status
- 500: Server error

---

## Database Functions Details

### update_game_state()
```sql
FUNCTION update_game_state(
  p_match_id UUID,
  p_cells_revealed INTEGER,  -- 0-480
  p_flags_used INTEGER,      -- 0-99
  p_time_elapsed INTEGER,    -- 0-7200 (2 hours)
  p_last_action JSONB        -- Optional action details
)
RETURNS JSONB
```

**Validation**:
- User authenticated
- User is participant (player1_id OR player2_id)
- Match status is 'countdown' OR 'in_progress'
- All values within bounds

**Operation**:
- INSERT ... ON CONFLICT DO UPDATE pattern
- Automatic updated_at timestamp
- Returns success + updated values

### start_match()
```sql
FUNCTION start_match(p_match_id UUID)
RETURNS JSONB
```

**Validation**:
- User authenticated
- User is participant
- Match status is 'countdown' (can only start from countdown)

**Operation**:
- UPDATE status to 'in_progress'
- SET started_at to NOW()
- Returns success + match details

### get_match_state()
```sql
FUNCTION get_match_state(p_match_id UUID)
RETURNS JSONB
```

**Validation**:
- User authenticated
- User is participant

**Returns**:
```json
{
  "match": {
    "id": "uuid",
    "match_type": "quick" | "ranked",
    "difficulty": "beginner" | "intermediate" | "expert",
    "seed": 12345,
    "status": "countdown" | "in_progress",
    "started_at": "timestamp"
  },
  "player1": {
    "id": "uuid",
    "firstname": "John",
    "lastname": "Doe",
    "cells_revealed": 42,
    "flags_used": 5,
    "time_elapsed": 120,
    "updated_at": "timestamp"
  },
  "player2": { ... },
  "your_player_number": 1 | 2
}
```

---

## Usage Example (Client-Side Pseudocode)

```typescript
// 1. When countdown finishes (both players call this)
await fetch(`/api/games/minesweeper/multiplayer/${matchId}/start`, {
  method: 'POST'
});

// 2. During gameplay (debounced updates)
let debounceTimer;
function updateGameState(cells, flags, time) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    await fetch(`/api/games/minesweeper/multiplayer/${matchId}/state`, {
      method: 'PATCH',
      body: JSON.stringify({
        cells_revealed: cells,
        flags_used: flags,
        time_elapsed: time,
        last_action: {
          type: 'reveal',
          row: 5,
          col: 10,
          timestamp: Date.now()
        }
      })
    });
  }, 300); // 300ms debounce
}

// 3. Polling opponent state (or use Supabase Realtime)
setInterval(async () => {
  const response = await fetch(`/api/games/minesweeper/multiplayer/${matchId}/state`);
  const state = await response.json();

  updateOpponentUI(state.player1, state.player2, state.your_player_number);
}, 1000); // Poll every 1 second
```

---

## Performance Considerations

### Debouncing
Recommended debounce: 200-500ms
- Too fast: Unnecessary server load
- Too slow: Choppy opponent updates

### Polling Interval
Recommended: 500-1000ms
- Fast enough for real-time feel
- Low enough server load
- Consider Supabase Realtime for instant updates (postgres_changes)

### Database Indexes
Already exist from previous migrations:
- `minesweeper_multiplayer_game_state(match_id, player_id)` - UNIQUE index
- `minesweeper_multiplayer_matches(id)` - PRIMARY KEY
- `profiles(id)` - PRIMARY KEY

---

## Testing Checklist

- [x] TypeScript: 0 errors
- [x] ESLint: 0 errors (56 warnings pre-existing)
- [x] Prettier: Formatted
- [x] Zod validation: All endpoints
- [x] Authentication: requireRole middleware
- [x] Bounds checking: Multi-layer
- [x] Error messages: French, descriptive
- [x] Security: DEFINER functions with auth checks

---

## Next Steps (Frontend Integration)

1. **Create Svelte component**: `MultiplayerGame.svelte`
   - Two-player board view with opponent overlay
   - Real-time progress bars
   - Countdown timer

2. **State management**: Use Svelte stores
   - `$state` for local player progress
   - Polling or Realtime subscription for opponent

3. **WebSocket/Realtime** (optional enhancement):
   - Subscribe to `minesweeper_multiplayer_game_state` table
   - Filter: `match_id=eq.${matchId}`
   - Instant updates instead of polling

4. **UI polish**:
   - Smooth progress animations
   - "Player 1" / "Player 2" labels
   - Victory/defeat animations
   - Rematch button

---

## Documentation References

- **Database Schema**: `docs/architecture/database-schema.md` (needs update)
- **API Security**: `docs/security/input-validation-audit.md`
- **Validation Guide**: `docs/development/zod-validation-report.md`
- **Realtime Guide**: `docs/architecture/supabase-realtime.md`

---

## Code Quality

- ✅ 0 TypeScript errors
- ✅ 0 ESLint errors
- ✅ 100% Zod validation on inputs
- ✅ Security: requireRole middleware
- ✅ French error messages
- ✅ Comprehensive JSDoc comments
- ✅ Security comments (✅ SECURITY markers)
- ✅ Early returns pattern
- ✅ Descriptive error handling
