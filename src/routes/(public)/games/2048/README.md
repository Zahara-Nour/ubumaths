# 2048 Game - Core Logic & Types

Production-ready TypeScript implementation of the 2048 game with educational features.

## 📁 Files

- **`types.ts`** - TypeScript interfaces, types, and utility functions
- **`game-logic.ts`** - Pure game logic functions (no side effects)
- **`game-logic.test.ts`** - Comprehensive unit tests (31 tests)
- **`example-usage.ts`** - Usage examples and patterns

## 🎮 Core Concepts

### Game Rules

1. **Board**: 4×4 grid with tiles
2. **Tiles**: Powers of 2 (2, 4, 8, 16, ..., 2048)
3. **Movement**: Arrow keys move all tiles in that direction
4. **Merging**: Two adjacent tiles with same value merge into one (doubled value)
5. **New Tiles**: After each move, a new tile appears (90% chance of 2, 10% chance of 4)
6. **Win**: Reach 2048 tile
7. **Loss**: No more moves possible (board full, no adjacent identical tiles)

### Educational Features

- **Power Notation**: Display tiles as powers of 2 (e.g., "2⁶" for 64)
- **Merge Messages**: Educational feedback (e.g., "32 + 32 = 64 (2⁶) ✓")
- **Victory Message**: Special celebration when reaching 2048

## 🚀 Quick Start

```typescript
import { initializeBoard, move } from './game-logic';
import type { GameState, Direction } from './types';

// Initialize game
let gameState = initializeBoard();

// Make a move
gameState = move(gameState, 'left');

// Check status
console.log('Score:', gameState.score);
console.log('Won:', gameState.won);
console.log('Game Over:', gameState.gameOver);
```

## 📚 API Reference

### Core Functions

#### `initializeBoard(): GameState`

Creates a new game with 2 random tiles.

```typescript
const gameState = initializeBoard();
// Returns: { board, score: 0, gameOver: false, won: false, canUndo: false }
```

#### `move(state: GameState, direction: Direction): GameState`

Performs a move in the specified direction.

```typescript
gameState = move(gameState, 'left'); // 'up' | 'down' | 'left' | 'right'
```

**Returns new state if move was successful, same state if move had no effect.**

#### `canMove(board: GameBoard): boolean`

Checks if any move is possible (empty cells OR adjacent identical tiles).

```typescript
if (!canMove(gameState.board)) {
	console.log('Game Over!');
}
```

#### `isGameWon(board: GameBoard): boolean`

Returns true if any tile has value 2048 or greater.

```typescript
if (isGameWon(gameState.board)) {
	console.log('Victory! 🎉');
}
```

#### `isGameOver(board: GameBoard): boolean`

Returns true if no moves are possible.

```typescript
if (isGameOver(gameState.board)) {
	console.log('No more moves!');
}
```

### Helper Functions

#### `createEmptyBoard(): GameBoard`

Creates an empty 4×4 board filled with nulls.

#### `addRandomTile(board: GameBoard): GameBoard`

Adds a random tile (2 or 4) to a random empty cell.

- 90% chance of value 2
- 10% chance of value 4

#### `getEmptyCells(board: GameBoard): Position[]`

Returns array of all empty positions on the board.

```typescript
const emptyCells = getEmptyCells(gameState.board);
console.log(`${emptyCells.length} empty cells remaining`);
```

#### `moveTilesInRow(row: (Tile | null)[]): { row, scoreGain, merges }`

Moves and merges tiles in a single row to the left. Used internally by `move()`.

#### `rotateBoardClockwise(board: GameBoard): GameBoard`

Rotates the board 90° clockwise. Used internally by `move()` to simplify directional logic.

#### `getTilePower(value: number): number`

Returns the exponent for a power of 2.

```typescript
getTilePower(64); // Returns 6 (because 2^6 = 64)
getTilePower(2048); // Returns 11 (because 2^11 = 2048)
```

### Educational Functions

#### `getPowerNotation(value: number): string`

Returns power notation with superscript.

```typescript
getPowerNotation(2); // "2¹"
getPowerNotation(64); // "2⁶"
getPowerNotation(2048); // "2¹¹"
```

#### `getMergeMessage(value: number): string`

Returns educational message for tile merges.

```typescript
getMergeMessage(4); // "2 + 2 = 4 (2²) ✓"
getMergeMessage(128); // "64 + 64 = 128 (2⁷) ✓"
getMergeMessage(2048); // "1024 + 1024 = 2048 (2¹¹) 🎉 VICTOIRE!"
```

## 🏗️ Type Definitions

### `Position`

```typescript
interface Position {
	row: number; // 0-3
	col: number; // 0-3
}
```

### `Tile`

```typescript
interface Tile {
	id: string; // Unique ID for animation tracking
	value: number; // 2, 4, 8, 16, ..., 2048
	position: Position;
	isNew: boolean; // True if just created (for animation)
	mergedFrom?: string[]; // IDs of merged tiles (for animation)
}
```

### `GameBoard`

```typescript
type GameBoard = (Tile | null)[][]; // 4×4 matrix
```

### `GameState`

```typescript
interface GameState {
	board: GameBoard;
	score: number;
	gameOver: boolean;
	won: boolean;
	canUndo: boolean;
}
```

### `Direction`

```typescript
type Direction = 'up' | 'down' | 'left' | 'right';
```

## 🎯 Usage Patterns

### Svelte 5 Integration

```svelte
<script lang="ts">
	import { initializeBoard, move, isGameWon, isGameOver } from './game-logic';
	import { getPowerNotation } from './types';
	import type { GameState, Direction } from './types';

	let gameState = $state<GameState>(initializeBoard());

	function handleMove(direction: Direction) {
		const newState = move(gameState, direction);

		if (newState !== gameState) {
			gameState = newState;

			if (gameState.won && !gameState.gameOver) {
				// Show victory modal
			}
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		const keyMap: Record<string, Direction> = {
			ArrowLeft: 'left',
			ArrowRight: 'right',
			ArrowUp: 'up',
			ArrowDown: 'down'
		};

		const direction = keyMap[event.key];
		if (direction) {
			event.preventDefault();
			handleMove(direction);
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="game-board">
	{#each gameState.board as row}
		{#each row as tile}
			{#if tile}
				<div class="tile tile-{tile.value}" class:new={tile.isNew}>
					<span class="tile-value">{tile.value}</span>
					<span class="tile-power">{getPowerNotation(tile.value)}</span>
				</div>
			{/if}
		{/each}
	{/each}
</div>

<div class="score">Score: {gameState.score}</div>
```

### Keyboard Controls

```typescript
function setupKeyboardControls(handleMove: (direction: Direction) => void): () => void {
	const handleKeyDown = (event: KeyboardEvent) => {
		const keyMap: Record<string, Direction> = {
			ArrowLeft: 'left',
			ArrowRight: 'right',
			ArrowUp: 'up',
			ArrowDown: 'down'
		};

		const direction = keyMap[event.key];
		if (direction) {
			event.preventDefault();
			handleMove(direction);
		}
	};

	window.addEventListener('keydown', handleKeyDown);
	return () => window.removeEventListener('keydown', handleKeyDown);
}
```

### Touch/Swipe Controls

```typescript
function setupSwipeControls(
	element: HTMLElement,
	handleMove: (direction: Direction) => void
): () => void {
	let touchStartX = 0;
	let touchStartY = 0;

	const handleTouchStart = (e: TouchEvent) => {
		touchStartX = e.touches[0].clientX;
		touchStartY = e.touches[0].clientY;
	};

	const handleTouchEnd = (e: TouchEvent) => {
		const deltaX = e.changedTouches[0].clientX - touchStartX;
		const deltaY = e.changedTouches[0].clientY - touchStartY;
		const minSwipeDistance = 50;

		if (Math.abs(deltaX) > Math.abs(deltaY)) {
			// Horizontal swipe
			if (Math.abs(deltaX) > minSwipeDistance) {
				handleMove(deltaX > 0 ? 'right' : 'left');
			}
		} else {
			// Vertical swipe
			if (Math.abs(deltaY) > minSwipeDistance) {
				handleMove(deltaY > 0 ? 'down' : 'up');
			}
		}
	};

	element.addEventListener('touchstart', handleTouchStart);
	element.addEventListener('touchend', handleTouchEnd);

	return () => {
		element.removeEventListener('touchstart', handleTouchStart);
		element.removeEventListener('touchend', handleTouchEnd);
	};
}
```

## 🎨 Styling Guidelines

### Tile Colors (Tailwind CSS)

```typescript
const tileColors: Record<number, string> = {
	2: 'bg-amber-100 text-gray-800',
	4: 'bg-amber-200 text-gray-800',
	8: 'bg-orange-300 text-white',
	16: 'bg-orange-400 text-white',
	32: 'bg-orange-500 text-white',
	64: 'bg-red-400 text-white',
	128: 'bg-red-500 text-white',
	256: 'bg-red-600 text-white',
	512: 'bg-yellow-400 text-white',
	1024: 'bg-yellow-500 text-white',
	2048: 'bg-yellow-600 text-white'
};
```

### Animation Classes

```css
/* Tile appearance animation */
.tile.new {
	animation: appear 200ms ease-in-out;
}

@keyframes appear {
	from {
		opacity: 0;
		transform: scale(0);
	}
	to {
		opacity: 1;
		transform: scale(1);
	}
}

/* Merge animation */
.tile.merged {
	animation: merge 150ms ease-in-out;
}

@keyframes merge {
	0% {
		transform: scale(1);
	}
	50% {
		transform: scale(1.1);
	}
	100% {
		transform: scale(1);
	}
}
```

## ✅ Testing

Run the comprehensive test suite:

```bash
pnpm test:unit src/routes/\(public\)/games/2048/game-logic.test.ts
```

**Test Coverage:**

- ✅ Board creation & initialization (4 tests)
- ✅ Empty cell detection (3 tests)
- ✅ Random tile addition (3 tests)
- ✅ Row movement & merging (5 tests)
- ✅ Board rotation (1 test)
- ✅ Move detection & game over (3 tests)
- ✅ Game state updates (4 tests)
- ✅ Win condition (2 tests)
- ✅ Power notation (3 tests)
- ✅ Educational messages (3 tests)

**Total: 31 tests, 100% pass rate** ✅

## 🔒 Code Quality

- ✅ TypeScript strict mode (no `any` types)
- ✅ All functions are pure (no side effects, no mutations)
- ✅ Immutable data structures (return new objects)
- ✅ Comprehensive JSDoc comments
- ✅ Edge case handling (full board, no empty cells)
- ✅ Efficient algorithms (minimal copying)
- ✅ Unique tile IDs for animation tracking

## 🎓 Algorithm Details

### Move Algorithm

1. **Normalize direction**: Rotate board so all moves become "left"

   - Left: 0° rotation
   - Right: 180° rotation
   - Up: 90° counter-clockwise
   - Down: 90° clockwise

2. **Process each row**:

   - Extract non-null tiles
   - Merge adjacent identical values
   - Create new tiles for merges
   - Pad with nulls

3. **Rotate back**: Return board to original orientation

4. **Add random tile**: If board changed, add new tile

5. **Update state**: Calculate score, check win/loss conditions

### Merge Logic

When processing `[2, 2, 4, 4]`:

1. First pair merges: `2 + 2 = 4` (score +4)
2. Second pair merges: `4 + 4 = 8` (score +8)
3. Result: `[4, 8, null, null]` (score +12)

**Important**: Each tile can only merge once per move.

- `[2, 2, 2, 2]` → `[4, 4, null, null]` (not `[8, null, null, null]`)
- `[2, 2, 4]` → `[4, 4, null, null]` (4 doesn't merge with the newly created 4)

## 📝 License

Part of UbuMaths educational platform.
