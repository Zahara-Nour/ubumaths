/**
 * Core game logic for 2048
 * All functions are pure (no side effects, no mutations)
 */

import type { GameBoard, GameState, Tile, Direction, Position, GameMode } from './types';
import { generateTileId } from './game-utils';
import { generateEducationalTile, getWinningValue } from './educational-modes';

const BOARD_SIZE = 4;
const _WIN_TILE_VALUE = 2048;

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
 * @returns Object with new row, score gain, and whether any merges occurred
 */
export function moveTilesInRow(row: (Tile | null)[]): {
	row: (Tile | null)[];
	scoreGain: number;
	merges: boolean;
} {
	// Extract non-null tiles
	const tiles = row.filter((tile): tile is Tile => tile !== null);

	if (tiles.length === 0) {
		return { row, scoreGain: 0, merges: false };
	}

	const newRow: (Tile | null)[] = [];
	let scoreGain = 0;
	let merges = false;
	let i = 0;

	while (i < tiles.length) {
		const currentTile = tiles[i];

		// Check if we can merge with next tile
		if (i + 1 < tiles.length && tiles[i + 1].value === currentTile.value) {
			// Merge tiles
			const mergedValue = currentTile.value * 2;
			const mergedTile: Tile = {
				id: generateTileId(),
				value: mergedValue,
				position: { row: 0, col: newRow.length }, // Position will be updated later
				isNew: false,
				mergedFrom: [currentTile.id, tiles[i + 1].id]
			};

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

	return { row: newRow, scoreGain, merges };
}

/**
 * Moves all tiles on the board to the left
 * @param board - Current board
 * @returns Object with new board, score gain, and whether board changed
 */
function moveLeft(board: GameBoard): { board: GameBoard; scoreGain: number; changed: boolean } {
	const newBoard = createEmptyBoard();
	let totalScoreGain = 0;
	let boardChanged = false;

	for (let row = 0; row < BOARD_SIZE; row++) {
		const { row: newRow, scoreGain } = moveTilesInRow(board[row]);

		// Update positions for the row
		for (let col = 0; col < BOARD_SIZE; col++) {
			const tile = newRow[col];
			if (tile) {
				newBoard[row][col] = {
					...tile,
					position: { row, col }
				};

				// Check if tile moved or merged
				const originalTile = board[row][col];
				if (!originalTile || originalTile.id !== tile.id || tile.mergedFrom) {
					boardChanged = true;
				}
			}
		}

		totalScoreGain += scoreGain;
	}

	return { board: newBoard, scoreGain: totalScoreGain, changed: boardChanged };
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
 * @returns True if any move is possible
 */
export function canMove(board: GameBoard): boolean {
	// Check for empty cells
	if (getEmptyCells(board).length > 0) {
		return true;
	}

	// Check for adjacent tiles with same value (horizontal)
	for (let row = 0; row < BOARD_SIZE; row++) {
		for (let col = 0; col < BOARD_SIZE - 1; col++) {
			const tile1 = board[row][col];
			const tile2 = board[row][col + 1];
			if (tile1 && tile2 && tile1.value === tile2.value) {
				return true;
			}
		}
	}

	// Check for adjacent tiles with same value (vertical)
	for (let row = 0; row < BOARD_SIZE - 1; row++) {
		for (let col = 0; col < BOARD_SIZE; col++) {
			const tile1 = board[row][col];
			const tile2 = board[row + 1][col];
			if (tile1 && tile2 && tile1.value === tile2.value) {
				return true;
			}
		}
	}

	return false;
}

/**
 * Checks if the game is over (no moves possible)
 * @param board - Current board
 * @returns True if game over
 */
export function isGameOver(board: GameBoard): boolean {
	return !canMove(board);
}

/**
 * Performs a move in the specified direction
 * @param state - Current game state
 * @param direction - Direction to move
 * @returns New game state after the move
 */
export function move(state: GameState, direction: Direction): GameState {
	if (state.gameOver) {
		return state;
	}

	let board = state.board;
	let rotations = 0;

	// Rotate board so direction becomes "left"
	switch (direction) {
		case 'left':
			rotations = 0;
			break;
		case 'right':
			rotations = 2; // 180 degrees
			board = rotateBoardClockwise(rotateBoardClockwise(board));
			break;
		case 'up':
			rotations = 1; // 90 degrees counter-clockwise = move what was on top to the left
			board = rotateBoardCounterClockwise(board);
			break;
		case 'down':
			rotations = 3; // 90 degrees clockwise = move what was on bottom to the left
			board = rotateBoardClockwise(board);
			break;
	}

	// Move tiles left
	const { board: movedBoard, scoreGain, changed } = moveLeft(board);

	if (!changed) {
		// No movement occurred, return same state
		return state;
	}

	// Rotate board back to original orientation
	let finalBoard = movedBoard;
	for (let i = 0; i < (4 - rotations) % 4; i++) {
		finalBoard = rotateBoardClockwise(finalBoard);
	}

	// Add random tile
	finalBoard = addRandomTile(finalBoard, state.mode);

	// Clear isNew flag from previous tiles
	finalBoard = finalBoard.map((row) =>
		row.map((tile) => (tile && !tile.isNew ? { ...tile, isNew: false } : tile))
	);

	// Update game state
	const newScore = state.score + scoreGain;
	const won = state.won || isGameWon(finalBoard, state.mode);
	const gameOver = isGameOver(finalBoard);

	return {
		board: finalBoard,
		score: newScore,
		gameOver,
		won,
		canUndo: true,
		mode: state.mode
	};
}
