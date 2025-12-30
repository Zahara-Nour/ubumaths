/**
 * Core game logic for 2048
 * All functions are pure (no side effects, no mutations)
 */

import type {
	GameBoard,
	GameState,
	Tile,
	Direction,
	Position,
	GameMode,
	MoveResult,
	MergeAnimation
} from './types';
import { generateTileId } from './game-utils';
import { generateEducationalTile, getWinningValue, canMerge } from './educational-modes';

/**
 * Internal type for merge info at row level (before coordinate transformation)
 */
interface RowMergeInfo {
	/** First tile that merged */
	tile1: { id: string; value: number; originalCol: number; displayValue?: string };
	/** Second tile that merged */
	tile2: { id: string; value: number; originalCol: number; displayValue?: string };
	/** Destination column in the row */
	destCol: number;
	/** The resulting merged tile */
	resultTile: Tile;
}

const BOARD_SIZE = 4;

/**
 * Creates an empty 4x4 game board
 * @returns Empty board filled with nulls
 */
export function createEmptyBoard(): GameBoard {
	return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

/**
 * Gets all empty cell positions on the board
 * @param board - Game board
 * @returns Array of empty positions
 */
export function getEmptyCells(board: GameBoard): Position[] {
	const emptyCells: Position[] = [];

	for (let row = 0; row < BOARD_SIZE; row++) {
		for (let col = 0; col < BOARD_SIZE; col++) {
			if (board[row][col] === null) {
				emptyCells.push({ row, col });
			}
		}
	}

	return emptyCells;
}

/**
 * Adds a random tile to an empty cell on the board
 * @param board - Current game board
 * @param mode - Game mode (determines tile generation)
 * @returns New board with added tile (or same board if no empty cells)
 */
export function addRandomTile(board: GameBoard, mode: GameMode = 'classic'): GameBoard {
	const emptyCells = getEmptyCells(board);

	if (emptyCells.length === 0) {
		return board;
	}

	// Pick random empty cell
	const randomIndex = Math.floor(Math.random() * emptyCells.length);
	const position = emptyCells[randomIndex];

	// Generate tile based on mode
	const tileConfig = generateEducationalTile(mode);

	// Create new tile
	const newTile: Tile = {
		id: generateTileId(),
		value: tileConfig.value,
		position,
		isNew: true,
		displayValue: mode !== 'classic' ? tileConfig.displayValue : undefined
	};

	// Create new board with the tile added
	const newBoard = board.map((row) => [...row]);
	newBoard[position.row][position.col] = newTile;

	return newBoard;
}

/**
 * Initializes a new game with 2 random tiles
 * @param mode - Game mode (default: classic)
 * @returns Initial game state
 */
export function initializeBoard(mode: GameMode = 'classic'): GameState {
	let board = createEmptyBoard();

	// Add first tile
	board = addRandomTile(board, mode);
	// Add second tile
	board = addRandomTile(board, mode);

	// Reset isNew flag for initial tiles (no animation needed)
	board = board.map((row) => row.map((tile) => (tile ? { ...tile, isNew: false } : null)));

	return {
		board,
		score: 0,
		gameOver: false,
		won: false,
		canUndo: false,
		mode
	};
}

/**
 * Rotates the board 90 degrees clockwise
 * @param board - Current board
 * @returns Rotated board
 */
export function rotateBoardClockwise(board: GameBoard): GameBoard {
	const newBoard = createEmptyBoard();

	for (let row = 0; row < BOARD_SIZE; row++) {
		for (let col = 0; col < BOARD_SIZE; col++) {
			const tile = board[row][col];
			if (tile) {
				// When rotating clockwise: (row, col) -> (col, BOARD_SIZE - 1 - row)
				newBoard[col][BOARD_SIZE - 1 - row] = {
					...tile,
					position: { row: col, col: BOARD_SIZE - 1 - row }
				};
			}
		}
	}

	return newBoard;
}

/**
 * Rotates the board 90 degrees counter-clockwise
 * @param board - Current board
 * @returns Rotated board
 */
function rotateBoardCounterClockwise(board: GameBoard): GameBoard {
	const newBoard = createEmptyBoard();

	for (let row = 0; row < BOARD_SIZE; row++) {
		for (let col = 0; col < BOARD_SIZE; col++) {
			const tile = board[row][col];
			if (tile) {
				// Counter-clockwise: (row, col) -> (BOARD_SIZE - 1 - col, row)
				newBoard[BOARD_SIZE - 1 - col][row] = {
					...tile,
					position: { row: BOARD_SIZE - 1 - col, col: row }
				};
			}
		}
	}

	return newBoard;
}

/**
 * Moves and merges tiles in a single row to the left
 * @param row - Row of tiles
 * @param mode - Game mode (determines merge logic)
 * @returns Object with new row, score gain, merge info for animations, and whether any merges occurred
 */
export function moveTilesInRow(
	row: (Tile | null)[],
	mode: GameMode = 'classic'
): {
	row: (Tile | null)[];
	scoreGain: number;
	merges: boolean;
	mergeInfos: RowMergeInfo[];
} {
	// Extract non-null tiles with their original column index
	const tilesWithCols: Array<{ tile: Tile; originalCol: number }> = [];
	for (let col = 0; col < row.length; col++) {
		const tile = row[col];
		if (tile) {
			tilesWithCols.push({ tile, originalCol: col });
		}
	}

	if (tilesWithCols.length === 0) {
		return { row, scoreGain: 0, merges: false, mergeInfos: [] };
	}

	const newRow: (Tile | null)[] = [];
	const mergeInfos: RowMergeInfo[] = [];
	let scoreGain = 0;
	let merges = false;
	let i = 0;

	while (i < tilesWithCols.length) {
		const { tile: currentTile, originalCol: currentCol } = tilesWithCols[i];

		// Check if we can merge with next tile (uses mode-aware canMerge)
		if (
			i + 1 < tilesWithCols.length &&
			canMerge(currentTile.value, tilesWithCols[i + 1].tile.value, mode)
		) {
			const { tile: nextTile, originalCol: nextCol } = tilesWithCols[i + 1];
			const destCol = newRow.length;

			// Merge tiles
			const mergedValue = currentTile.value * 2;
			const mergedTile: Tile = {
				id: generateTileId(),
				value: mergedValue,
				position: { row: 0, col: destCol }, // Position will be updated later
				isNew: false,
				mergedFrom: [currentTile.id, nextTile.id]
			};

			// Store merge info for animation
			mergeInfos.push({
				tile1: {
					id: currentTile.id,
					value: currentTile.value,
					originalCol: currentCol,
					displayValue: currentTile.displayValue
				},
				tile2: {
					id: nextTile.id,
					value: nextTile.value,
					originalCol: nextCol,
					displayValue: nextTile.displayValue
				},
				destCol,
				resultTile: mergedTile
			});

			newRow.push(mergedTile);
			scoreGain += mergedValue;
			merges = true;
			i += 2; // Skip both merged tiles
		} else {
			// Just move the tile
			newRow.push({
				...currentTile,
				position: { row: 0, col: newRow.length } // Position will be updated later
			});
			i += 1;
		}
	}

	// Pad with nulls to maintain row length
	while (newRow.length < BOARD_SIZE) {
		newRow.push(null);
	}

	return { row: newRow, scoreGain, merges, mergeInfos };
}

/**
 * Merge info at board level (with full positions)
 */
interface BoardMergeInfo {
	tile1: { id: string; value: number; fromPosition: Position; displayValue?: string };
	tile2: { id: string; value: number; fromPosition: Position; displayValue?: string };
	toPosition: Position;
	resultTile: Tile;
}

/**
 * Moves all tiles on the board to the left
 * @param board - Current board
 * @param mode - Game mode (determines merge logic)
 * @returns Object with new board, score gain, merge infos, and whether board changed
 */
function moveLeft(
	board: GameBoard,
	mode: GameMode = 'classic'
): { board: GameBoard; scoreGain: number; changed: boolean; mergeInfos: BoardMergeInfo[] } {
	const newBoard = createEmptyBoard();
	const allMergeInfos: BoardMergeInfo[] = [];
	let totalScoreGain = 0;
	let boardChanged = false;

	for (let rowIdx = 0; rowIdx < BOARD_SIZE; rowIdx++) {
		const { row: newRow, scoreGain, mergeInfos } = moveTilesInRow(board[rowIdx], mode);

		// Convert row-level merge infos to board-level (with full positions)
		for (const mergeInfo of mergeInfos) {
			allMergeInfos.push({
				tile1: {
					id: mergeInfo.tile1.id,
					value: mergeInfo.tile1.value,
					fromPosition: { row: rowIdx, col: mergeInfo.tile1.originalCol },
					displayValue: mergeInfo.tile1.displayValue
				},
				tile2: {
					id: mergeInfo.tile2.id,
					value: mergeInfo.tile2.value,
					fromPosition: { row: rowIdx, col: mergeInfo.tile2.originalCol },
					displayValue: mergeInfo.tile2.displayValue
				},
				toPosition: { row: rowIdx, col: mergeInfo.destCol },
				resultTile: {
					...mergeInfo.resultTile,
					position: { row: rowIdx, col: mergeInfo.destCol }
				}
			});
		}

		// Update positions for the row
		for (let col = 0; col < BOARD_SIZE; col++) {
			const tile = newRow[col];
			if (tile) {
				newBoard[rowIdx][col] = {
					...tile,
					position: { row: rowIdx, col }
				};

				// Check if tile moved or merged
				const originalTile = board[rowIdx][col];
				if (!originalTile || originalTile.id !== tile.id || tile.mergedFrom) {
					boardChanged = true;
				}
			}
		}

		totalScoreGain += scoreGain;
	}

	return {
		board: newBoard,
		scoreGain: totalScoreGain,
		changed: boardChanged,
		mergeInfos: allMergeInfos
	};
}

/**
 * Checks if the game is won
 * @param board - Current board
 * @param mode - Game mode (determines winning value)
 * @returns True if won
 */
export function isGameWon(board: GameBoard, mode: GameMode = 'classic'): boolean {
	const winningValue = getWinningValue(mode);
	for (let row = 0; row < BOARD_SIZE; row++) {
		for (let col = 0; col < BOARD_SIZE; col++) {
			const tile = board[row][col];
			if (tile && tile.value >= winningValue) {
				return true;
			}
		}
	}
	return false;
}

/**
 * Checks if any move is possible
 * @param board - Current board
 * @param mode - Game mode (determines merge logic)
 * @returns True if any move is possible
 */
export function canMove(board: GameBoard, mode: GameMode = 'classic'): boolean {
	// Check for empty cells
	if (getEmptyCells(board).length > 0) {
		return true;
	}

	// Check for adjacent tiles that can merge (horizontal)
	for (let row = 0; row < BOARD_SIZE; row++) {
		for (let col = 0; col < BOARD_SIZE - 1; col++) {
			const tile1 = board[row][col];
			const tile2 = board[row][col + 1];
			if (tile1 && tile2 && canMerge(tile1.value, tile2.value, mode)) {
				return true;
			}
		}
	}

	// Check for adjacent tiles that can merge (vertical)
	for (let row = 0; row < BOARD_SIZE - 1; row++) {
		for (let col = 0; col < BOARD_SIZE; col++) {
			const tile1 = board[row][col];
			const tile2 = board[row + 1][col];
			if (tile1 && tile2 && canMerge(tile1.value, tile2.value, mode)) {
				return true;
			}
		}
	}

	return false;
}

/**
 * Checks if the game is over (no moves possible)
 * @param board - Current board
 * @param mode - Game mode (determines merge logic)
 * @returns True if game over
 */
export function isGameOver(board: GameBoard, mode: GameMode = 'classic'): boolean {
	return !canMove(board, mode);
}

/**
 * Transforms a position by applying N clockwise rotations
 * @param pos - Position to transform
 * @param rotations - Number of clockwise rotations (0-3)
 * @returns Transformed position
 */
function transformPosition(pos: Position, rotations: number): Position {
	let { row, col } = pos;

	for (let i = 0; i < rotations; i++) {
		// Single clockwise rotation: (row, col) -> (col, BOARD_SIZE - 1 - row)
		const newRow = col;
		const newCol = BOARD_SIZE - 1 - row;
		row = newRow;
		col = newCol;
	}

	return { row, col };
}

/**
 * Performs a move in the specified direction
 * @param state - Current game state
 * @param direction - Direction to move
 * @returns MoveResult with new state and merge animations
 */
export function move(state: GameState, direction: Direction): MoveResult {
	if (state.gameOver) {
		return { state, moved: false, mergeAnimations: [] };
	}

	// Clear animation flags from PREVIOUS move first (on the input board)
	// This ensures new tiles from THIS move will have their flags intact
	let board = state.board.map((row) =>
		row.map((tile) => (tile ? { ...tile, isNew: false, mergedFrom: undefined } : null))
	);
	let rotations = 0;

	// Rotate board so direction becomes "left"
	// rotations = number of clockwise rotations performed (for inverse calculation)
	switch (direction) {
		case 'left':
			rotations = 0;
			break;
		case 'right':
			rotations = 2; // 180 degrees (2 clockwise rotations)
			board = rotateBoardClockwise(rotateBoardClockwise(board));
			break;
		case 'up':
			rotations = 3; // 1 counter-clockwise = 3 clockwise
			board = rotateBoardCounterClockwise(board);
			break;
		case 'down':
			rotations = 1; // 1 clockwise rotation
			board = rotateBoardClockwise(board);
			break;
	}

	// Move tiles left (pass mode for correct merge logic)
	const { board: movedBoard, scoreGain, changed, mergeInfos } = moveLeft(board, state.mode);

	if (!changed) {
		// No movement occurred, return same state
		return { state, moved: false, mergeAnimations: [] };
	}

	// Number of clockwise rotations to apply to transform positions back
	const inverseRotations = (4 - rotations) % 4;

	// Transform merge animations back to original orientation
	const mergeAnimations: MergeAnimation[] = mergeInfos.map((info) => ({
		tiles: [
			{
				id: info.tile1.id,
				value: info.tile1.value,
				fromPosition: transformPosition(info.tile1.fromPosition, inverseRotations),
				toPosition: transformPosition(info.toPosition, inverseRotations),
				displayValue: info.tile1.displayValue
			},
			{
				id: info.tile2.id,
				value: info.tile2.value,
				fromPosition: transformPosition(info.tile2.fromPosition, inverseRotations),
				toPosition: transformPosition(info.toPosition, inverseRotations),
				displayValue: info.tile2.displayValue
			}
		],
		resultTile: {
			...info.resultTile,
			position: transformPosition(info.toPosition, inverseRotations)
		}
	}));

	// Rotate board back to original orientation
	let finalBoard = movedBoard;
	for (let i = 0; i < inverseRotations; i++) {
		finalBoard = rotateBoardClockwise(finalBoard);
	}

	// Add random tile (will have isNew: true for appear animation)
	// Note: Animation flags were cleared at the START of this function,
	// so merged tiles from THIS move still have their mergedFrom flag intact
	finalBoard = addRandomTile(finalBoard, state.mode);

	// Update game state
	const newScore = state.score + scoreGain;
	const won = state.won || isGameWon(finalBoard, state.mode);
	const gameOver = isGameOver(finalBoard, state.mode);

	const newState: GameState = {
		board: finalBoard,
		score: newScore,
		gameOver,
		won,
		canUndo: true,
		mode: state.mode
	};

	return { state: newState, moved: true, mergeAnimations };
}
