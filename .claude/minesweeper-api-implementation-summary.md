# Minesweeper API Implementation Summary

**Created**: 2025-11-18
**Status**: ✅ Complete - All endpoints created with Zod validation

---

## Files Created

### 1. Zod Validation Schemas

**File**: `/home/user/ubumaths/src/lib/server/validation/minesweeper.ts`

**Schemas**:
- `startGameSchema` - Validates difficulty selection
- `saveGameSchema` - Validates game progress updates
- `completeGameSchema` - Validates grid state on game completion

**Security Features**:
- ✅ Grid dimensions bounded (max 100x100)
- ✅ Array size limits (mines, revealed, flagged)
- ✅ Adjacent counts validated (0-8 range)
- ✅ Numeric bounds on flags_used (0-200) and cells_revealed (0-10000)

---

### 2. API Endpoints

#### POST `/api/games/minesweeper/start/+server.ts`

**Purpose**: Start a new Minesweeper game
**Authentication**: Students only (`requireRole('student')`)
**Validation**: `startGameSchema`

**Request**:
```json
{
  "difficulty": "beginner" | "intermediate" | "expert"
}
```

**Response**:
```json
{
  "success": true,
  "game": {
    "id": "uuid",
    "difficulty": "beginner",
    "mines_count": 10,
    "status": "in_progress",
    "created_at": "timestamp"
  }
}
```

**Features**:
- Creates game record in database
- Initializes empty grid_state (populated on first move)
- Sets mines_count based on DIFFICULTY_CONFIGS
- Sets status to 'in_progress'

---

#### PUT `/api/games/minesweeper/[id]/+server.ts`

**Purpose**: Save game progress (auto-save)
**Authentication**: Students only (`requireRole('student')`)
**Validation**: `saveGameSchema`

**Request**:
```json
{
  "grid_state": {
    "rows": 9,
    "cols": 9,
    "mines": [[1,2], [3,4]],
    "revealed": [[0,0], [0,1]],
    "flagged": [[1,2]],
    "adjacentCounts": { "0,0": 1, "0,1": 2 }
  },
  "flags_used": 1,
  "cells_revealed": 5
}
```

**Response**:
```json
{
  "success": true
}
```

**Security**:
- ✅ Explicit ownership check (`student_id = user.id`)
- ✅ Only updates in-progress games (`status = 'in_progress'`)
- ✅ RLS policies enforce ownership at database level
- ✅ Returns 404 if game not found or already completed

---

#### GET `/api/games/minesweeper/current/+server.ts`

**Purpose**: Load current in-progress game
**Authentication**: Students only (`requireRole('student')`)
**Validation**: None (GET request)

**Response**:
```json
{
  "game": {
    "id": "uuid",
    "difficulty": "beginner",
    "status": "in_progress",
    "grid_state": { ... },
    "flags_used": 3,
    "cells_revealed": 15,
    "mines_count": 10,
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

Or `{ "game": null }` if no in-progress game exists.

**Features**:
- Fetches most recent in-progress game
- Orders by `created_at DESC`
- Returns null if no in-progress game
- Uses `.maybeSingle()` to handle empty result gracefully

---

#### POST `/api/games/minesweeper/[id]/complete/+server.ts`

**Purpose**: Complete game with WIN
**Authentication**: Students only (`requireRole('student')`)
**Validation**: `completeGameSchema`
**RPC Function**: `complete_minesweeper_game()`

**Request**:
```json
{
  "grid_state": {
    "rows": 9,
    "cols": 9,
    "mines": [[1,2], [3,4]],
    "revealed": [[0,0], [0,1]],
    "flagged": [[1,2]],
    "adjacentCounts": { "0,0": 1 }
  }
}
```

**Response**:
```json
{
  "success": true,
  "gidouilles_awarded": 10,
  "time_seconds": 145
}
```

**RPC Function Handles**:
- ✅ Verifying game ownership
- ✅ Validating win condition (all non-mine cells revealed)
- ✅ Calculating time taken (server-side: NOW() - started_at)
- ✅ Awarding Gidouilles based on difficulty + time bonus
- ✅ Preventing duplicate rewards
- ✅ Inserting into gidouilles_history
- ✅ Atomic transaction (game update + reward insert)

**Error Handling**:
- 404: Game not found
- 403: Not owned by user
- 400: Already completed, not in progress, invalid grid state
- 500: Server error

---

#### POST `/api/games/minesweeper/[id]/loss/+server.ts`

**Purpose**: Record game LOSS
**Authentication**: Students only (`requireRole('student')`)
**Validation**: `completeGameSchema`
**RPC Function**: `record_minesweeper_loss()`

**Request**:
```json
{
  "grid_state": {
    "rows": 9,
    "cols": 9,
    "mines": [[1,2], [3,4]],
    "revealed": [[0,0], [0,1]],
    "flagged": [[1,2]],
    "adjacentCounts": { "0,0": 1 }
  }
}
```

**Response**:
```json
{
  "success": true
}
```

**RPC Function Handles**:
- ✅ Verifying game ownership
- ✅ Saving final grid_state
- ✅ Updating status to 'lost'
- ✅ Preventing duplicate completions
- ✅ No Gidouilles awarded

**Error Handling**:
- 404: Game not found
- 403: Not owned by user
- 400: Already completed, not in progress
- 500: Server error

---

## Security Features Implemented

### ✅ Input Validation with Zod

**ALL endpoints validate input** following UbuMaths standards:

```typescript
// ✅ SECURITY: Validate input with Zod
const body = await request.json();
const validation = startGameSchema.safeParse(body);

if (!validation.success) {
  throw error(400, validation.error.issues[0].message);
}
```

**Validation includes**:
- Difficulty enum validation
- Grid dimensions bounds (max 100x100)
- Array size limits (mines, revealed, flagged)
- Numeric bounds (flags_used: 0-200, cells_revealed: 0-10000)
- Adjacent counts range validation (0-8)

### ✅ Authentication & Authorization

**All endpoints require authentication**:

```typescript
const { user } = await requireRole(locals, 'student');
```

**Features**:
- Students only (teachers/admins cannot play)
- Session validation via `safeGetSession()`
- Profile fetched and validated
- Consistent error messages in French

### ✅ Ownership Verification

**Explicit ownership checks**:

```typescript
.eq('student_id', user.id) // Explicit ownership check
```

**Plus RLS policies** at database level for defense-in-depth.

### ✅ SECURITY DEFINER RPC Functions

**Game completion uses RPC** to prevent:
- Client manipulation of gidouilles
- Time manipulation
- Win condition bypass
- Duplicate rewards
- Missing audit trail

**RPC handles ALL sensitive operations** (gidouilles calculation, time tracking, validation).

### ✅ Error Handling

**Comprehensive error handling**:
- Try-catch blocks around database operations
- Specific error codes (400, 401, 403, 404, 500)
- User-friendly error messages in French
- Re-throws SvelteKit errors properly
- Logs errors for debugging

### ✅ Status Validation

**Only in-progress games can be updated**:

```typescript
.eq('status', 'in_progress') // Only update in-progress games
```

**Prevents**:
- Modifying completed games
- Changing status directly (must use RPC)
- Updating sensitive fields (gidouilles_awarded, time_seconds)

---

## Difficulty Configurations

**Defined in start endpoint**:

```typescript
const DIFFICULTY_CONFIGS = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 }
} as const;
```

**Used for**:
- Setting `mines_count` on game creation
- Initializing `grid_state` dimensions

---

## Reward Structure

**Base Rewards** (calculated server-side):
- **Beginner** (9×9, 10 mines): 10 gidouilles
- **Intermediate** (16×16, 40 mines): 30 gidouilles
- **Expert** (16×30, 99 mines): 60 gidouilles

**Time Bonuses**:
- **Beginner < 60s**: +10 (total: 20)
- **Intermediate < 300s (5min)**: +20 (total: 50)
- **Expert < 600s (10min)**: +40 (total: 100)

**Caps**:
- **Per-game cap**: 100 gidouilles max
- **Daily cap**: 500 gidouilles/day from Minesweeper

---

## Code Quality

### ✅ TypeScript

**All files use strict TypeScript**:
- Proper type imports (`RequestHandler`, `error`, `json`)
- No `any` types used
- Type-safe Zod validation with `.safeParse()`

### ✅ Documentation

**All endpoints include**:
- JSDoc comments explaining purpose
- Request/response examples
- Security notes
- Feature descriptions
- Error handling documentation

### ✅ UbuMaths Patterns

**Follows project conventions**:
- Uses `requireRole()` middleware
- Uses `error()` from '@sveltejs/kit'
- Uses `json()` for responses
- French error messages
- Try-catch with re-throw pattern
- Early returns for errors

### ✅ Consistent Structure

**All endpoints follow same pattern**:
1. Authentication
2. Input validation
3. Database operation in try-catch
4. Error handling with specific codes
5. Success response with JSON

---

## Testing Checklist

### Authentication Tests
- [ ] Unauthenticated user gets 401
- [ ] Teacher/Admin cannot access (403)
- [ ] Student can access all endpoints

### Validation Tests
- [ ] Invalid difficulty rejected (400)
- [ ] Grid dimensions >100 rejected (400)
- [ ] Negative values rejected (400)
- [ ] Missing required fields rejected (400)

### Ownership Tests
- [ ] Cannot update another student's game (404)
- [ ] Cannot complete another student's game (403)

### Status Tests
- [ ] Cannot update completed game (404)
- [ ] Cannot complete game twice (400)
- [ ] Can save in-progress game progress

### RPC Tests
- [ ] Win condition validated server-side
- [ ] Time calculated server-side (not client-submitted)
- [ ] Gidouilles awarded correctly based on difficulty
- [ ] Time bonus applied correctly
- [ ] Daily cap enforced (500 gidouilles/day)
- [ ] Per-game cap enforced (100 gidouilles max)
- [ ] Gidouilles_history entry created on win
- [ ] No gidouilles on loss

### Functional Tests
- [ ] Start new game returns game ID
- [ ] Save progress updates grid_state
- [ ] Load current game returns most recent in-progress
- [ ] Complete game awards gidouilles
- [ ] Record loss marks game as lost
- [ ] No in-progress game returns null

---

## Next Steps

### 1. Verify Migration Applied

```bash
# Check if migration was applied
pnpm db:migrate
```

Verify these functions exist in database:
- `validate_minesweeper_win()`
- `calculate_minesweeper_gidouilles()`
- `complete_minesweeper_game()`
- `record_minesweeper_loss()`

### 2. Run Type Check

```bash
# Install dependencies if needed
pnpm install

# Run TypeScript check
pnpm check:fast

# Should show 0 errors
```

### 3. Update Database Types

```bash
# Regenerate TypeScript types from database
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/types/database.ts
```

### 4. Test Endpoints

Create test file or use API client (Postman, curl):

```bash
# Example: Start new game
curl -X POST http://localhost:5175/api/games/minesweeper/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"difficulty":"beginner"}'

# Example: Save progress
curl -X PUT http://localhost:5175/api/games/minesweeper/GAME_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"grid_state":{...}, "flags_used":1, "cells_revealed":5}'

# Example: Get current game
curl -X GET http://localhost:5175/api/games/minesweeper/current \
  -H "Authorization: Bearer YOUR_TOKEN"

# Example: Complete game (win)
curl -X POST http://localhost:5175/api/games/minesweeper/GAME_ID/complete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"grid_state":{...}}'

# Example: Record loss
curl -X POST http://localhost:5175/api/games/minesweeper/GAME_ID/loss \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"grid_state":{...}}'
```

### 5. Update Documentation

Update these files:
- `docs/architecture/database-schema.md` - Document RPC functions
- `docs/features/games/minesweeper.md` - API documentation
- Add API endpoint documentation with request/response examples

### 6. Create Frontend Integration

Next step is to create frontend components that use these endpoints:
- Game board component
- API client utilities
- State management

---

## File Structure

```
src/
├── lib/
│   └── server/
│       └── validation/
│           └── minesweeper.ts          ✅ Created
└── routes/
    └── api/
        └── games/
            └── minesweeper/
                ├── start/
                │   └── +server.ts       ✅ Created (POST)
                ├── current/
                │   └── +server.ts       ✅ Created (GET)
                └── [id]/
                    ├── +server.ts       ✅ Created (PUT)
                    ├── complete/
                    │   └── +server.ts   ✅ Created (POST)
                    └── loss/
                        └── +server.ts   ✅ Created (POST)
```

**Total Files Created**: 6

---

## Summary

**Status**: ✅ All endpoints created successfully

**Security**: ✅ Comprehensive Zod validation on all endpoints

**Authentication**: ✅ All endpoints require student authentication

**Authorization**: ✅ Ownership checks + RLS policies

**Error Handling**: ✅ Proper HTTP status codes + French messages

**Documentation**: ✅ JSDoc comments on all endpoints

**Code Quality**: ✅ Follows UbuMaths patterns and conventions

**Next**: Test endpoints, integrate with frontend, update documentation

---

**References**:
- Zod validation: `/home/user/ubumaths/src/lib/server/validation/minesweeper.ts`
- Security guide: `/home/user/ubumaths/.claude/minesweeper-security-implementation-guide.md`
- Migration: `/home/user/ubumaths/supabase/migrations/20251118120000_harden_minesweeper_security.sql`
