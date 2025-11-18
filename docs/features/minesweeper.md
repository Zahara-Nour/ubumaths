# Minesweeper Game System

**Status**: ✅ Production
**Last Updated**: 2025-11-18
**Version**: 1.0.0

## Table of Contents

- [Overview](#overview)
- [User Guide](#user-guide)
  - [How to Play](#how-to-play)
  - [Difficulty Levels](#difficulty-levels)
  - [Scoring System](#scoring-system)
  - [Public vs Authenticated Play](#public-vs-authenticated-play)
- [Technical Architecture](#technical-architecture)
  - [Database Schema](#database-schema)
  - [Game Logic](#game-logic)
  - [API Endpoints](#api-endpoints)
  - [Security Model](#security-model)
- [UI Components](#ui-components)
- [Performance & Optimization](#performance--optimization)
- [Testing](#testing)

---

## Overview

The Minesweeper game is a classic puzzle game implementation integrated into UbuMaths. The game is **publicly accessible** (no authentication required) while offering **premium features** for authenticated students, including game saving, statistics tracking, leaderboards, and gidouilles rewards.

### Key Features

- ✅ **Public accessibility** - Play without an account
- ✅ **Three difficulty levels** - Beginner, Intermediate, Expert
- ✅ **Cascade reveal** - Efficient BFS algorithm for revealing empty cells
- ✅ **Save & Resume** - For authenticated students only
- ✅ **Gidouilles rewards** - Based on difficulty and completion time
- ✅ **Statistics tracking** - Win rate, best time, total rewards
- ✅ **Global leaderboards** - Per difficulty level
- ✅ **Responsive design** - Mobile-friendly with horizontal scroll for expert mode
- ✅ **Server-side security** - Win validation and reward calculation

---

## User Guide

### How to Play

**Objective**: Reveal all cells that don't contain mines without triggering a mine.

**Controls**:
- **Left click / Tap**: Reveal a cell
- **Right click / Long press**: Flag a suspected mine

**Cell States**:
- **Number (1-8)**: Shows how many mines are adjacent to that cell
- **Empty**: No adjacent mines (triggers cascade reveal)
- **🚩 Flag**: Marks a suspected mine
- **💣 Mine**: Revealed when you click on one (game over)
- **💥 Explosion**: The mine that ended the game

**Game Flow**:
1. Choose a difficulty level
2. Click any cell to start (first click is always safe)
3. Use numbers to deduce mine locations
4. Flag suspected mines
5. Reveal all non-mine cells to win

### Difficulty Levels

| Difficulty    | Grid Size | Mines | Base Gidouilles | Target Time |
|---------------|-----------|-------|-----------------|-------------|
| **Débutant**  | 9×9       | 10    | 10              | 3 minutes   |
| **Intermédiaire** | 16×16 | 40    | 30              | 10 minutes  |
| **Expert**    | 16×30     | 99    | 60              | 20 minutes  |

### Scoring System

**Gidouilles awarded** are calculated server-side using:

```
gidouilles = baseGidouilles × timeBonus × dailyMultiplier
```

**Time Bonus** (degressive):
- Finish in ≤ 50% of target time: 2.0× multiplier
- Finish in ≤ 75% of target time: 1.5× multiplier
- Finish in ≤ 100% of target time: 1.0× multiplier
- Finish in > 100% of target time: 0.5× multiplier

**Daily Multiplier** (degressive):
- First win of the day: 1.0×
- Second win: 0.8×
- Third win: 0.6×
- Fourth+ wins: 0.4×

**Example** (Beginner, 90 seconds):
- Base: 10 gidouilles
- Time bonus: 2.0× (90s ≤ 90s target)
- Daily multiplier: 1.0× (first win)
- **Total: 20 gidouilles**

### Public vs Authenticated Play

#### Public Play (No Account)
- ✅ Unlimited gameplay
- ✅ All difficulty levels
- ✅ Game state saved in localStorage
- ❌ No server persistence
- ❌ No gidouilles rewards
- ❌ No statistics tracking
- ❌ No leaderboard participation

#### Authenticated Play (Student Account)
- ✅ All public features
- ✅ Game state saved to database
- ✅ Resume game across devices
- ✅ Earn gidouilles on completion
- ✅ Track personal statistics
- ✅ Compete on global leaderboards
- ✅ View win rate and best times

**Premium Banner**: Non-authenticated users see a banner encouraging account creation to unlock premium features.

---

## Technical Architecture

### Database Schema

#### `minesweeper_games` Table

Stores game state for authenticated students.

| Column               | Type        | Description                                      |
|----------------------|-------------|--------------------------------------------------|
| `id`                 | UUID (PK)   | Game ID                                          |
| `student_id`         | UUID (FK)   | References profiles(id), NULLABLE for public     |
| `difficulty`         | TEXT        | 'beginner', 'intermediate', 'expert'             |
| `status`             | TEXT        | 'in_progress', 'won', 'lost'                     |
| `grid_state`         | JSONB       | GridStateDTO format (see below)                  |
| `gidouilles_awarded` | INTEGER     | Gidouilles awarded on completion (0-1000)        |
| `time_seconds`       | INTEGER     | Time elapsed in seconds                          |
| `started_at`         | TIMESTAMPTZ | Auto-set by trigger on first move                |
| `completed_at`       | TIMESTAMPTZ | Set when status changes to won/lost              |
| `created_at`         | TIMESTAMPTZ | Row creation timestamp                           |

**Indexes**:
- `idx_minesweeper_games_student_status` on (student_id, status)
- `idx_minesweeper_games_resume` on (student_id, status, created_at DESC)
- `idx_minesweeper_games_difficulty` on (difficulty, status, time_seconds)

**Constraints**:
- `gidouilles_awarded >= 0 AND gidouilles_awarded <= 1000` (prevents abuse)
- `difficulty IN ('beginner', 'intermediate', 'expert')`
- `status IN ('in_progress', 'won', 'lost')`

#### GridStateDTO Format

Game state is stored as JSONB in flattened format for efficiency:

```typescript
interface GridStateDTO {
  rows: number;             // Grid height (9, 16)
  cols: number;             // Grid width (9, 16, 30)
  mines: [number, number][]; // Mine coordinates [[row, col], ...]
  revealed: [number, number][]; // Revealed cell coordinates
  flagged: [number, number][]; // Flagged cell coordinates
  adjacentCounts: Record<string, number>; // {"row,col": count}
}
```

**Example**:
```json
{
  "rows": 9,
  "cols": 9,
  "mines": [[0, 3], [1, 5], [2, 2]],
  "revealed": [[0, 0], [0, 1], [1, 1]],
  "flagged": [[0, 3]],
  "adjacentCounts": {
    "0,2": 1,
    "1,2": 2,
    "1,3": 1
  }
}
```

#### RLS Policies

**Security Model**: Students can only access their own games.

- `select_own_games`: Students can SELECT their own games
- `insert_own_games`: Students can INSERT games with their own student_id
- `update_own_games`: Students can UPDATE only in_progress games
- `no_delete`: DELETE is forbidden (audit trail)

#### Database Functions (RPC)

##### `complete_minesweeper_game(p_game_id, p_grid_state)`

**Security**: `SECURITY DEFINER` - Runs with elevated privileges

**Purpose**: Validates win condition and calculates gidouilles server-side

**Flow**:
1. Verify ownership (student_id matches authenticated user)
2. Verify game is in_progress
3. **Validate win condition**:
   - Check all non-mine cells are revealed
   - Check no mine cells are revealed
   - Reject if validation fails
4. Calculate time elapsed
5. Calculate gidouilles with time bonus + daily degressive
6. Update game status to 'won'
7. Update student's gidouilles balance
8. Return awarded gidouilles and time

**Returns**:
```typescript
{
  success: boolean;
  gidouilles_awarded: number;
  time_seconds: number;
}
```

##### `record_minesweeper_loss(p_game_id, p_grid_state)`

**Security**: `SECURITY DEFINER`

**Purpose**: Records a loss (mine explosion)

**Flow**:
1. Verify ownership
2. Verify game is in_progress
3. Update status to 'lost'
4. Set completed_at timestamp
5. Save final grid_state

**Returns**: `{ success: boolean }`

#### Triggers

##### `set_minesweeper_started_at`

**Event**: BEFORE UPDATE on `minesweeper_games`

**Purpose**: Auto-set `started_at` timestamp on first move

**Logic**:
- Triggers when `grid_state` changes from initial state
- Sets `started_at = NOW()` if currently NULL
- Prevents manual override of `started_at`

### Game Logic

#### Store: `minesweeperStore`

**Location**: `src/lib/stores/minesweeper.svelte.ts`

**State Management** (Svelte 5 runes):
```typescript
let gameState = $state<GameState>({
  id: undefined,
  difficulty: 'beginner',
  status: 'not_started',
  grid: [],
  rows: 9,
  cols: 9,
  minesCount: 10,
  flagsUsed: 0,
  cellsRevealed: 0,
  timeElapsed: 0,
  startedAt: undefined
});

let isAuthenticated = $state(false);
let currentGameId = $state<string | null>(null);
```

#### Core Algorithms

##### Mine Generation (Fisher-Yates Shuffle)

```typescript
private generateMines(
  rows: number,
  cols: number,
  mineCount: number,
  firstClickRow: number,
  firstClickCol: number
): Set<string> {
  const allPositions: string[] = [];

  // Generate all positions except first click + neighbors
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isFirstClick = r === firstClickRow && c === firstClickCol;
      const isNeighbor = Math.abs(r - firstClickRow) <= 1
                      && Math.abs(c - firstClickCol) <= 1;

      if (!isFirstClick && !isNeighbor) {
        allPositions.push(`${r},${c}`);
      }
    }
  }

  // Fisher-Yates shuffle
  for (let i = allPositions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allPositions[i], allPositions[j]] = [allPositions[j], allPositions[i]];
  }

  return new Set(allPositions.slice(0, mineCount));
}
```

**Key Feature**: First click is **always safe** (no mine on first click or neighbors).

##### Cascade Reveal (BFS)

When an empty cell (0 adjacent mines) is revealed, automatically reveal all connected empty cells and their borders.

```typescript
private cascadeReveal(startRow: number, startCol: number): void {
  const queue: { row: number; col: number }[] = [{ row: startRow, col: startCol }];
  const visited = new Set<string>([`${startRow},${startCol}`]);

  while (queue.length > 0) {
    const { row, col } = queue.shift()!;
    const cell = gameState.grid[row][col];

    // Always reveal the current cell
    if (!cell.isRevealed && !cell.isFlagged) {
      cell.isRevealed = true;
      gameState.cellsRevealed++;
    }

    // If empty (0 adjacent mines), add neighbors to queue
    if (cell.adjacentMines === 0) {
      for (let dRow = -1; dRow <= 1; dRow++) {
        for (let dCol = -1; dCol <= 1; dCol++) {
          const newRow = row + dRow;
          const newCol = col + dCol;
          const key = `${newRow},${newCol}`;

          if (this.isValidCell(newRow, newCol) && !visited.has(key)) {
            visited.add(key);
            queue.push({ row: newRow, col: newCol });
          }
        }
      }
    }
  }
}
```

**Complexity**: O(rows × cols) worst case (entire grid is empty).

#### Format Conversion

**Problem**: Internal game representation (`CellState[][]`) differs from API/database format (`GridStateDTO`).

**Solution**: Conversion methods handle translation transparently.

##### `gridToDTO()` - Internal → API

```typescript
private gridToDTO(grid: CellState[][]): GridStateDTO {
  const mines: [number, number][] = [];
  const revealed: [number, number][] = [];
  const flagged: [number, number][] = [];
  const adjacentCounts: Record<string, number> = {};

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const cell = grid[row][col];

      if (cell.isMine) mines.push([row, col]);
      if (cell.isRevealed) revealed.push([row, col]);
      if (cell.isFlagged) flagged.push([row, col]);
      if (cell.adjacentMines > 0 && !cell.isMine) {
        adjacentCounts[`${row},${col}`] = cell.adjacentMines;
      }
    }
  }

  return {
    rows: grid.length,
    cols: grid[0]?.length || 0,
    mines,
    revealed,
    flagged,
    adjacentCounts
  };
}
```

##### `dtoToGrid()` - API → Internal

Reconstructs `CellState[][]` from flattened DTO format.

#### Auto-Save (Authenticated Only)

**Debounced auto-save** every 5 seconds for in-progress games:

```typescript
private scheduleSave(): void {
  clearTimeout(this.saveTimer);

  if (!isAuthenticated || !currentGameId) return;

  this.saveTimer = setTimeout(async () => {
    await this.saveGame();
  }, 5000); // 5 second debounce
}
```

**Cleanup**: Components must call `cleanup()` in `onDestroy()` to prevent memory leaks.

### API Endpoints

All endpoints under `/api/games/minesweeper/`

#### `POST /api/games/minesweeper/start`

**Auth**: Required (student role)

**Body**:
```typescript
{
  difficulty: 'beginner' | 'intermediate' | 'expert'
}
```

**Validation** (Zod):
```typescript
const schema = z.object({
  difficulty: z.enum(['beginner', 'intermediate', 'expert'])
});
```

**Flow**:
1. Validate request body
2. Create new game row with initial grid_state
3. Return game ID

**Response**:
```json
{
  "id": "uuid-here",
  "difficulty": "beginner",
  "status": "in_progress"
}
```

#### `GET /api/games/minesweeper/current`

**Auth**: Required (student role)

**Purpose**: Fetch the most recent in-progress game

**Query**:
```
?difficulty=beginner (optional)
```

**Flow**:
1. Query for in_progress games ordered by created_at DESC
2. Filter by difficulty if provided
3. Return most recent or null

**Response**:
```json
{
  "id": "uuid",
  "difficulty": "beginner",
  "status": "in_progress",
  "grid_state": { ... },
  "time_seconds": 45,
  "started_at": "2025-11-18T10:00:00Z"
}
```

#### `PATCH /api/games/minesweeper/[id]/save`

**Auth**: Required (student role, ownership verified)

**Body**:
```typescript
{
  grid_state: GridStateDTO;
  time_seconds: number;
}
```

**Validation**:
```typescript
// 1. Fetch game to get difficulty
// 2. Validate with difficulty-specific schema
const validation = validateGridState(game.difficulty, body.grid_state);
```

**Flow**:
1. Verify ownership
2. Verify game is in_progress
3. Validate grid_state with difficulty-specific bounds
4. Update grid_state and time_seconds
5. Return success

#### `POST /api/games/minesweeper/[id]/complete`

**Auth**: Required (student role, ownership verified)

**Body**:
```typescript
{
  grid_state: GridStateDTO
}
```

**Validation**:
```typescript
// Difficulty-specific validation with exact bounds
const schema = z.object({
  rows: z.literal(config.rows),
  cols: z.literal(config.cols),
  mines: z.array(coordinateSchema).length(config.mines),
  revealed: z.array(coordinateSchema).max(config.maxCells),
  flagged: z.array(coordinateSchema).max(config.mines * 2),
  adjacentCounts: z.record(
    z.string().regex(/^\d+,\d+$/),
    z.number().int().min(0).max(8)
  )
});
```

**Flow**:
1. Fetch game to get difficulty
2. Validate grid_state with difficulty-specific schema
3. Call `complete_minesweeper_game()` RPC function
4. RPC validates win condition server-side
5. RPC calculates gidouilles with time bonuses
6. RPC updates student balance
7. Return awarded gidouilles and time

**Response**:
```json
{
  "success": true,
  "gidouilles_awarded": 20,
  "time_seconds": 90
}
```

#### `POST /api/games/minesweeper/[id]/loss`

**Auth**: Required (student role, ownership verified)

**Body**:
```typescript
{
  grid_state: GridStateDTO
}
```

**Flow**:
1. Verify ownership
2. Validate grid_state
3. Call `record_minesweeper_loss()` RPC
4. Update status to 'lost'
5. Return success

### Security Model

#### Input Validation (Zod)

**CRITICAL**: All API endpoints use **difficulty-specific validation** to prevent:
- DoS attacks (unbounded array sizes)
- Invalid coordinates (out-of-bounds)
- Grid size manipulation
- Mine count tampering

**Example** (Beginner difficulty):
```typescript
const coordinateSchema = z.tuple([
  z.number().int().min(0).max(8),  // row: 0-8
  z.number().int().min(0).max(8)   // col: 0-8
]);

const beginnerGridStateSchema = z.object({
  rows: z.literal(9),                           // Exact match
  cols: z.literal(9),                           // Exact match
  mines: z.array(coordinateSchema).length(10),  // Exactly 10 mines
  revealed: z.array(coordinateSchema).max(81),  // Max 81 cells
  flagged: z.array(coordinateSchema).max(20),   // Max 2× mines
  adjacentCounts: z.record(
    z.string().regex(/^\d+,\d+$/),
    z.number().int().min(0).max(8)              // 0-8 adjacent mines
  )
});
```

**Why**: Generic validation allows attackers to send 1000×1000 grids or invalid coordinates.

#### Server-Side Win Validation

**Problem**: Client could claim victory with unfinished grid.

**Solution**: `complete_minesweeper_game()` RPC validates:
1. All non-mine cells are revealed
2. No mine cells are revealed (except allowed flags)
3. Game is actually in_progress

```sql
-- Win validation logic
IF (
  SELECT COUNT(*) FROM jsonb_array_elements(v_grid_revealed) AS coord
  WHERE coord IN (SELECT jsonb_array_elements(v_grid_mines))
) > 0 THEN
  RAISE EXCEPTION 'Invalid win: mine cell revealed';
END IF;
```

#### Server-Side Reward Calculation

**Problem**: Client could manipulate gidouilles_awarded field.

**Solution**: All reward calculation happens in `SECURITY DEFINER` RPC function:

```sql
-- Calculate gidouilles server-side
v_gidouilles := v_base_gidouilles * v_time_bonus * v_daily_multiplier;

-- Cap at max 1000
v_gidouilles := LEAST(v_gidouilles, 1000);

-- Update student balance atomically
UPDATE profiles
SET gidouilles = gidouilles + v_gidouilles
WHERE id = v_student_id;
```

**Result**: Client cannot forge rewards, even with modified HTTP requests.

#### RLS Policies

**Defense in Depth**: Even if application checks fail, RLS prevents unauthorized access.

- `student_id` must match authenticated user
- UPDATE only allowed for in_progress games
- DELETE forbidden (audit trail preservation)

---

## UI Components

### Component Tree

```
MinesweeperPage (routes)
  ├─ DifficultySelector
  │   └─ MySelect (difficulty dropdown)
  ├─ GameControls
  │   ├─ Timer display
  │   ├─ Mine counter
  │   └─ New Game / Save buttons
  ├─ MinesweeperBoard
  │   └─ MinesweeperCell (grid[row][col])
  ├─ PremiumBanner (if not authenticated)
  ├─ GameStats (authenticated only)
  │   ├─ Games played
  │   ├─ Win rate
  │   ├─ Best time
  │   └─ Total gidouilles
  └─ LeaderboardPreview (authenticated only)
      └─ Top 3 players
```

### Component Details

#### `MinesweeperCell.svelte`

**Purpose**: Individual grid cell with reveal/flag interactions

**Props** (Svelte 5 `$props()`):
```typescript
let {
  row,
  col,
  isRevealed,
  isFlagged,
  isMine,
  adjacentMines,
  isExploded = false,
  onReveal,
  onFlag,
  disabled = false
} = $props();
```

**Computed Content** (`$derived.by`):
```typescript
const cellContent = $derived.by(() => {
  if (!isRevealed && isFlagged) return '🚩';
  if (!isRevealed) return '';
  if (isExploded) return '💥';
  if (isMine) return '💣';
  if (adjacentMines === 0) return '';
  return adjacentMines.toString();
});
```

**Interactions**:
- Left click → `onReveal(row, col)`
- Right click / Long press → `onFlag(row, col)`

**Styling**: Number-based color coding (1=blue, 2=green, 3=red, etc.)

#### `MinesweeperBoard.svelte`

**Purpose**: CSS Grid layout for the game board

**Responsive Design**:
- Beginner/Intermediate: Fits on screen
- Expert: Horizontal scroll on mobile with hint text

```svelte
<div class="overflow-x-auto md:overflow-x-visible">
  <div
    class="inline-grid gap-0.5"
    style="grid-template-columns: repeat({cols}, minmax(0, 1fr));"
  >
    {#each grid as row, rowIndex}
      {#each row as cell, colIndex}
        <MinesweeperCell ... />
      {/each}
    {/each}
  </div>
</div>
```

#### `GameControls.svelte`

**Purpose**: Game status, timer, mine counter, action buttons

**Features**:
- Real-time timer (updates every second)
- Mine counter (total mines - flags used)
- New Game button
- Save Game button (authenticated only, disabled if not in_progress)

**Timer** (`$effect` + cleanup):
```typescript
$effect(() => {
  if (status === 'in_progress') {
    const interval = setInterval(() => {
      timeElapsed++;
    }, 1000);

    return () => clearInterval(interval);
  }
});
```

#### `DifficultySelector.svelte`

**Purpose**: Dropdown + info cards for difficulty selection

**Uses**: `MySelect` component (REQUIRED, not native `<select>`)

```svelte
<MySelect
  type="single"
  bind:value={selected}
  items={selectItems}
  {disabled}
  placeholder="Choisir une difficulté"
  onValueChange={handleChange}
/>
```

**Info Cards**: Display grid size, mine count, base gidouilles for each difficulty

#### `GameStats.svelte`

**Purpose**: Display personal statistics (authenticated only)

**Data**:
- Games played
- Victories (with win rate %)
- Best time (MM:SS format)
- Total gidouilles earned

**Localization**: French number formatting (`toLocaleString('fr-FR')`)

#### `LeaderboardPreview.svelte`

**Purpose**: Top 3 players for current difficulty

**Features**:
- Medal emoji for ranks 1-3 (🥇🥈🥉)
- Time display (MM:SS format)
- Privacy: Non-authenticated users see only first letter of names
- Link to full leaderboard page

**Privacy Logic**:
```typescript
function displayName(name: string): string {
  if (isAuthenticated) return name;
  return name.charAt(0).toUpperCase() + '.';
}
```

#### `PremiumBanner.svelte`

**Purpose**: Encourage account creation (shown to public users)

**Content**:
- Highlights premium features (save games, earn gidouilles, leaderboards)
- Call-to-action button to sign up

---

## Performance & Optimization

### Grid Rendering

**Challenge**: Expert mode = 480 cells (16×30)

**Solution**:
- CSS Grid (GPU-accelerated layout)
- No virtualization needed (cells are simple)
- Minimal re-renders (Svelte reactivity)

### Auto-Save Debouncing

**Pattern**: 5-second debounce to prevent excessive API calls

**Benefit**:
- 10 moves in 5 seconds = 1 API call (not 10)
- Reduces database load
- Improves UX (no jank from network requests)

### Format Conversion

**Trade-off**:
- Internal format (`CellState[][]`) optimized for game logic (fast lookups, simple iteration)
- Database format (`GridStateDTO`) optimized for storage (compact, JSONB indexing)
- Conversion happens only on save/load (not every render)

### BFS Cascade

**Optimization**:
- Set-based visited tracking (O(1) lookups)
- Queue-based iteration (no recursion stack overflow)
- Worst case: O(rows × cols) when entire grid is empty

---

## Testing

### Unit Tests

**Location**: `src/lib/stores/minesweeper.test.ts`

**Coverage**:
- [ ] Mine generation (Fisher-Yates)
- [ ] First click safety (no mine on first click + neighbors)
- [ ] Cascade reveal (BFS correctness)
- [ ] Win condition detection
- [ ] Loss condition detection
- [ ] Flag toggling
- [ ] Format conversion (gridToDTO, dtoToGrid)
- [ ] Difficulty configurations

### API Tests

**Location**: `src/routes/api/games/minesweeper/**/*.test.ts`

**Coverage**:
- [x] Start game endpoint (Zod validation)
- [x] Save game endpoint (ownership check)
- [x] Complete game endpoint (win validation)
- [x] Loss game endpoint
- [ ] Current game endpoint

### Database Tests

**Location**: `tests/database/minesweeper-triggers.test.ts`

**Coverage**:
- [ ] `set_minesweeper_started_at` trigger
- [ ] `complete_minesweeper_game` RPC (win validation)
- [ ] `record_minesweeper_loss` RPC
- [ ] Daily degressive multiplier
- [ ] Gidouilles cap (max 1000)

---

## Deployment Checklist

- [x] Database migrations applied
- [x] RLS policies tested
- [x] RPC functions deployed (SECURITY DEFINER)
- [x] API endpoints with Zod validation
- [x] UI components with Svelte 5 runes
- [x] Game logic with BFS cascade
- [x] Format conversion layer
- [x] Auto-save with debouncing
- [x] Cleanup handlers (prevent memory leaks)
- [ ] Unit tests (store logic)
- [ ] API tests (endpoint validation)
- [ ] Database tests (triggers + RPCs)
- [ ] E2E tests (Playwright)
- [ ] Documentation complete
- [ ] Security audit (input validation, RLS, SECURITY DEFINER)

---

## Future Enhancements

### Potential Improvements

1. **Chord Click** - Middle-click to reveal all neighbors when flags = adjacent mine count
2. **Quick Start** - Drag-select multiple cells to reveal
3. **Undo Move** - Allow 1-2 undos per game
4. **Daily Challenges** - Pre-generated boards with specific patterns
5. **Achievement System** - Badges for milestones (10 wins, sub-60s beginner, etc.)
6. **Multiplayer** - Race mode (2+ players on same board)
7. **Custom Grids** - Allow students to create and share custom boards
8. **Hints** - Cost gidouilles to reveal a safe cell
9. **Mobile Gestures** - Two-finger tap for flag, swipe for quick reveal
10. **Accessibility** - Keyboard-only mode, screen reader support

---

## References

- **Game Rules**: [Wikipedia - Minesweeper](https://fr.wikipedia.org/wiki/Démineur_(genre_de_jeu_vidéo))
- **Svelte 5 Runes**: [Svelte Documentation](https://svelte.dev/docs/svelte/overview)
- **BFS Algorithm**: [Breadth-First Search](https://en.wikipedia.org/wiki/Breadth-first_search)
- **Fisher-Yates Shuffle**: [Knuth Shuffle](https://en.wikipedia.org/wiki/Fisher–Yates_shuffle)

---

**Maintenu par**: L'équipe UbuMaths
**Version**: 1.0.0
**Date**: 2025-11-18
