/**
 * Unit tests for 2048 game logic
 */

import { describe, it, expect } from 'vitest';
import {
	createEmptyBoard,
	initializeBoard,
	addRandomTile,
	getEmptyCells,
	moveTilesInRow,
	move,
	canMove,
	isGameOver,
	isGameWon,
	rotateBoardClockwise
} from './game-logic';
import { getPowerNotation, getMergeMessage, getTilePower, generateTileId } from './game-utils';
import type { Tile, GameBoard } from './types';

describe('2048 Game Logic', () => {
	describe('createEmptyBoard', () => {
		it('should create a 4x4 board filled with nulls', () => {
			const board = createEmptyBoard();
			expect(board).toHaveLength(4);
			expect(board[0]).toHaveLength(4);
			expect(board.flat().every((cell) => cell === null)).toBe(true);
		});
	});

	describe('initializeBoard', () => {
		it('should create initial state with 2 tiles', () => {
			const state = initializeBoard();
			const tiles = state.board.flat().filter((tile) => tile !== null);

			expect(tiles).toHaveLength(2);
			expect(state.score).toBe(0);
			expect(state.gameOver).toBe(false);
			expect(state.won).toBe(false);
			expect(state.canUndo).toBe(false);
		});

		it('should have tiles with values 2 or 4', () => {
			const state = initializeBoard();
			const tiles = state.board.flat().filter((tile): tile is Tile => tile !== null);

			tiles.forEach((tile) => {
				expect([2, 4]).toContain(tile.value);
				expect(tile.id).toBeDefined();
				expect(tile.isNew).toBe(false); // Initial tiles should not be marked as new
			});
		});
	});

	describe('getEmptyCells', () => {
		it('should return 16 empty cells for empty board', () => {
			const board = createEmptyBoard();
			const emptyCells = getEmptyCells(board);
			expect(emptyCells).toHaveLength(16);
		});

		it('should return 14 empty cells after initialization', () => {
			const state = initializeBoard();
			const emptyCells = getEmptyCells(state.board);
			expect(emptyCells).toHaveLength(14);
		});

		it('should return correct positions', () => {
			const board = createEmptyBoard();
			const emptyCells = getEmptyCells(board);

			expect(emptyCells).toContainEqual({ row: 0, col: 0 });
			expect(emptyCells).toContainEqual({ row: 3, col: 3 });
		});
	});

	describe('addRandomTile', () => {
		it('should add a tile to empty board', () => {
			const board = createEmptyBoard();
			const newBoard = addRandomTile(board);
			const tiles = newBoard.flat().filter((tile) => tile !== null);

			expect(tiles).toHaveLength(1);
			expect(tiles[0]?.value).toBeGreaterThanOrEqual(2);
		});

		it('should not mutate original board', () => {
			const board = createEmptyBoard();
			const newBoard = addRandomTile(board);

			expect(board).not.toBe(newBoard);
			expect(board.flat().every((cell) => cell === null)).toBe(true);
		});

		it('should return same board if no empty cells', () => {
			// Create full board
			const fullBoard: GameBoard = Array.from({ length: 4 }, (_, row) =>
				Array.from({ length: 4 }, (_, col) => ({
					id: generateTileId(),
					value: 2,
					position: { row, col },
					isNew: false
				}))
			);

			const newBoard = addRandomTile(fullBoard);
			expect(newBoard).toBe(fullBoard);
		});

		it('should follow 90/10 distribution for tile values', () => {
			const iterations = 1000;
			const counts = { 2: 0, 4: 0 };

			for (let i = 0; i < iterations; i++) {
				const board = createEmptyBoard();
				const newBoard = addRandomTile(board);
				const tile = newBoard.flat().find((t) => t !== null);
				if (tile) {
					counts[tile.value as keyof typeof counts]++;
				}
			}

			// With 1000 iterations, expect roughly 900 twos and 100 fours
			// Allow 10% deviation: 810-990 for 2s, 10-190 for 4s
			expect(counts[2]).toBeGreaterThan(810);
			expect(counts[2]).toBeLessThan(990);
			expect(counts[4]).toBeGreaterThan(10);
			expect(counts[4]).toBeLessThan(190);
		});
	});

	describe('moveTilesInRow', () => {
		it('should move tiles to the left', () => {
			const row: (Tile | null)[] = [
				null,
				{ id: '1', value: 2, position: { row: 0, col: 1 }, isNew: false },
				null,
				{ id: '2', value: 4, position: { row: 0, col: 3 }, isNew: false }
			];

			const { row: newRow, scoreGain } = moveTilesInRow(row);

			expect(newRow[0]?.value).toBe(2);
			expect(newRow[1]?.value).toBe(4);
			expect(newRow[2]).toBe(null);
			expect(newRow[3]).toBe(null);
			expect(scoreGain).toBe(0);
		});

		it('should merge adjacent identical tiles', () => {
			const row: (Tile | null)[] = [
				{ id: '1', value: 2, position: { row: 0, col: 0 }, isNew: false },
				{ id: '2', value: 2, position: { row: 0, col: 1 }, isNew: false },
				null,
				null
			];

			const { row: newRow, scoreGain, merges } = moveTilesInRow(row);

			expect(newRow[0]?.value).toBe(4);
			expect(newRow[0]?.mergedFrom).toHaveLength(2);
			expect(newRow[1]).toBe(null);
			expect(scoreGain).toBe(4);
			expect(merges).toBe(true);
		});

		it('should merge correctly: [2,2,4,4] -> [4,8,null,null]', () => {
			const row: (Tile | null)[] = [
				{ id: '1', value: 2, position: { row: 0, col: 0 }, isNew: false },
				{ id: '2', value: 2, position: { row: 0, col: 1 }, isNew: false },
				{ id: '3', value: 4, position: { row: 0, col: 2 }, isNew: false },
				{ id: '4', value: 4, position: { row: 0, col: 3 }, isNew: false }
			];

			const { row: newRow, scoreGain } = moveTilesInRow(row);

			expect(newRow[0]?.value).toBe(4);
			expect(newRow[1]?.value).toBe(8);
			expect(newRow[2]).toBe(null);
			expect(newRow[3]).toBe(null);
			expect(scoreGain).toBe(12); // 4 + 8
		});

		it('should not merge twice: [2,2,2,2] -> [4,4,null,null]', () => {
			const row: (Tile | null)[] = [
				{ id: '1', value: 2, position: { row: 0, col: 0 }, isNew: false },
				{ id: '2', value: 2, position: { row: 0, col: 1 }, isNew: false },
				{ id: '3', value: 2, position: { row: 0, col: 2 }, isNew: false },
				{ id: '4', value: 2, position: { row: 0, col: 3 }, isNew: false }
			];

			const { row: newRow, scoreGain } = moveTilesInRow(row);

			expect(newRow[0]?.value).toBe(4);
			expect(newRow[1]?.value).toBe(4);
			expect(newRow[2]).toBe(null);
			expect(newRow[3]).toBe(null);
			expect(scoreGain).toBe(8); // 4 + 4
		});
	});

	describe('rotateBoardClockwise', () => {
		it('should rotate board 90 degrees clockwise', () => {
			const board = createEmptyBoard();
			board[0][0] = { id: '1', value: 2, position: { row: 0, col: 0 }, isNew: false };
			board[0][3] = { id: '2', value: 4, position: { row: 0, col: 3 }, isNew: false };

			const rotated = rotateBoardClockwise(board);

			// Top-left should move to top-right
			expect(rotated[0][3]?.value).toBe(2);
			// Top-right should move to bottom-right
			expect(rotated[3][3]?.value).toBe(4);
		});

		it('should rotate full board correctly', () => {
			const board = createEmptyBoard();
			// Place tiles at all four corners
			board[0][0] = { id: '1', value: 2, position: { row: 0, col: 0 }, isNew: false };
			board[0][3] = { id: '2', value: 4, position: { row: 0, col: 3 }, isNew: false };
			board[3][0] = { id: '3', value: 8, position: { row: 3, col: 0 }, isNew: false };
			board[3][3] = { id: '4', value: 16, position: { row: 3, col: 3 }, isNew: false };

			const rotated = rotateBoardClockwise(board);

			// Verify all corners rotated correctly
			expect(rotated[0][3]?.value).toBe(2); // top-left -> top-right
			expect(rotated[3][3]?.value).toBe(4); // top-right -> bottom-right
			expect(rotated[3][0]?.value).toBe(16); // bottom-right -> bottom-left
			expect(rotated[0][0]?.value).toBe(8); // bottom-left -> top-left
		});

		it('should return to original after 4 rotations', () => {
			const board = createEmptyBoard();
			board[0][0] = { id: '1', value: 2, position: { row: 0, col: 0 }, isNew: false };
			board[1][2] = { id: '2', value: 4, position: { row: 1, col: 2 }, isNew: false };

			let rotated = board;
			for (let i = 0; i < 4; i++) {
				rotated = rotateBoardClockwise(rotated);
			}

			// Should be back to original positions
			expect(rotated[0][0]?.value).toBe(2);
			expect(rotated[1][2]?.value).toBe(4);
		});
	});

	describe('canMove', () => {
		it('should return true if there are empty cells', () => {
			const state = initializeBoard();
			expect(canMove(state.board)).toBe(true);
		});

		it('should return true if adjacent tiles can merge horizontally', () => {
			const board = createEmptyBoard();
			board[0][0] = { id: '1', value: 2, position: { row: 0, col: 0 }, isNew: false };
			board[0][1] = { id: '2', value: 2, position: { row: 0, col: 1 }, isNew: false };

			// Fill rest of board with different values
			for (let row = 0; row < 4; row++) {
				for (let col = 0; col < 4; col++) {
					if (board[row][col] === null) {
						board[row][col] = {
							id: generateTileId(),
							value: row === 0 ? 4 : 8,
							position: { row, col },
							isNew: false
						};
					}
				}
			}

			expect(canMove(board)).toBe(true);
		});

		it('should return false if board is full and no merges possible', () => {
			// Create checkerboard pattern with no possible merges
			const board: GameBoard = Array.from({ length: 4 }, (_, row) =>
				Array.from({ length: 4 }, (_, col) => ({
					id: generateTileId(),
					value: (row + col) % 2 === 0 ? 2 : 4,
					position: { row, col },
					isNew: false
				}))
			);

			expect(canMove(board)).toBe(false);
		});
	});

	describe('isGameOver', () => {
		it('should return false for new game', () => {
			const state = initializeBoard();
			expect(isGameOver(state.board)).toBe(false);
		});

		it('should return true when no moves possible', () => {
			// Create checkerboard pattern
			const board: GameBoard = Array.from({ length: 4 }, (_, row) =>
				Array.from({ length: 4 }, (_, col) => ({
					id: generateTileId(),
					value: (row + col) % 2 === 0 ? 2 : 4,
					position: { row, col },
					isNew: false
				}))
			);

			expect(isGameOver(board)).toBe(true);
		});
	});

	describe('isGameWon', () => {
		it('should return false for new game', () => {
			const state = initializeBoard();
			expect(isGameWon(state.board)).toBe(false);
		});

		it('should return true when 2048 tile exists', () => {
			const board = createEmptyBoard();
			board[0][0] = { id: '1', value: 2048, position: { row: 0, col: 0 }, isNew: false };

			expect(isGameWon(board)).toBe(true);
		});
	});

	describe('move', () => {
		it('should not change state if move is not possible', () => {
			// Create board where left move does nothing
			const board = createEmptyBoard();
			board[0][0] = { id: '1', value: 2, position: { row: 0, col: 0 }, isNew: false };
			board[0][1] = { id: '2', value: 4, position: { row: 0, col: 1 }, isNew: false };

			const state = {
				board,
				score: 0,
				gameOver: false,
				won: false,
				canUndo: false,
				mode: 'classic' as const
			};

			const result = move(state, 'left');
			expect(result.moved).toBe(false);
			expect(result.state).toBe(state); // Should return same state
		});

		it('should add new tile after successful move', () => {
			const state = initializeBoard();
			const tilesBefore = state.board.flat().filter((t): t is Tile => t !== null).length;

			const result = move(state, 'left');
			const tilesAfter = result.state.board.flat().filter((t): t is Tile => t !== null).length;

			// Should have one more tile (unless a merge occurred)
			expect(tilesAfter).toBeGreaterThanOrEqual(tilesBefore);
		});

		it('should update score when tiles merge', () => {
			const board = createEmptyBoard();
			board[0][0] = { id: '1', value: 2, position: { row: 0, col: 0 }, isNew: false };
			board[0][1] = { id: '2', value: 2, position: { row: 0, col: 1 }, isNew: false };

			const state = {
				board,
				score: 0,
				gameOver: false,
				won: false,
				canUndo: false,
				mode: 'classic' as const
			};

			const result = move(state, 'left');
			expect(result.state.score).toBeGreaterThan(0);
			expect(result.state.canUndo).toBe(true);
		});

		it('should set won flag when reaching 2048', () => {
			const board = createEmptyBoard();
			board[0][0] = { id: '1', value: 1024, position: { row: 0, col: 0 }, isNew: false };
			board[0][1] = { id: '2', value: 1024, position: { row: 0, col: 1 }, isNew: false };

			const state = {
				board,
				score: 0,
				gameOver: false,
				won: false,
				canUndo: false,
				mode: 'classic' as const
			};

			const result = move(state, 'left');
			expect(result.state.won).toBe(true);
		});

		it('should move tiles up correctly', () => {
			const board = createEmptyBoard();
			// Place a tile at bottom, expect it to move to top
			board[3][0] = { id: '1', value: 2, position: { row: 3, col: 0 }, isNew: false };

			const state = {
				board,
				score: 0,
				gameOver: false,
				won: false,
				canUndo: false,
				mode: 'classic' as const
			};

			const result = move(state, 'up');
			// Tile should now be at row 0, col 0
			expect(result.state.board[0][0]?.value).toBe(2);
			// Note: Can't check if (3,0) is null as a new tile might spawn there
		});

		it('should move tiles down correctly', () => {
			const board = createEmptyBoard();
			// Place a tile at top, expect it to move to bottom
			board[0][0] = { id: '1', value: 2, position: { row: 0, col: 0 }, isNew: false };

			const state = {
				board,
				score: 0,
				gameOver: false,
				won: false,
				canUndo: false,
				mode: 'classic' as const
			};

			const result = move(state, 'down');
			// Tile should now be at row 3, col 0
			expect(result.state.board[3][0]?.value).toBe(2);
			// Note: Can't check if (0,0) is null as a new tile might spawn there
		});

		it('should merge tiles correctly when moving up', () => {
			const board = createEmptyBoard();
			// Two tiles in the same column
			board[0][0] = { id: '1', value: 2, position: { row: 0, col: 0 }, isNew: false };
			board[2][0] = { id: '2', value: 2, position: { row: 2, col: 0 }, isNew: false };

			const state = {
				board,
				score: 0,
				gameOver: false,
				won: false,
				canUndo: false,
				mode: 'classic' as const
			};

			const result = move(state, 'up');
			// Should merge to 4 at row 0
			expect(result.state.board[0][0]?.value).toBe(4);
			// Note: Can't check if (2,0) is null as a new tile might spawn there
			expect(result.state.score).toBe(4);
		});

		it('should merge tiles correctly when moving down', () => {
			const board = createEmptyBoard();
			// Two tiles in the same column
			board[0][0] = { id: '1', value: 2, position: { row: 0, col: 0 }, isNew: false };
			board[2][0] = { id: '2', value: 2, position: { row: 2, col: 0 }, isNew: false };

			const state = {
				board,
				score: 0,
				gameOver: false,
				won: false,
				canUndo: false,
				mode: 'classic' as const
			};

			const result = move(state, 'down');
			// Should merge to 4 at row 3
			expect(result.state.board[3][0]?.value).toBe(4);
			// Note: Can't check if (0,0) is null as a new tile might spawn there
			expect(result.state.score).toBe(4);
		});

		it('should not change state if up move is not possible', () => {
			const board = createEmptyBoard();
			// Tiles already at top
			board[0][0] = { id: '1', value: 2, position: { row: 0, col: 0 }, isNew: false };
			board[0][1] = { id: '2', value: 4, position: { row: 0, col: 1 }, isNew: false };

			const state = {
				board,
				score: 0,
				gameOver: false,
				won: false,
				canUndo: false,
				mode: 'classic' as const
			};

			const result = move(state, 'up');
			expect(result.moved).toBe(false);
			expect(result.state).toBe(state); // Should return same state
		});
	});

	describe('getTilePower', () => {
		it('should return correct power for powers of 2', () => {
			expect(getTilePower(2)).toBe(1);
			expect(getTilePower(4)).toBe(2);
			expect(getTilePower(8)).toBe(3);
			expect(getTilePower(64)).toBe(6);
			expect(getTilePower(2048)).toBe(11);
		});

		it('should return 0 for non-powers of 2', () => {
			expect(getTilePower(3)).toBe(0);
			expect(getTilePower(100)).toBe(0);
		});
	});

	describe('getPowerNotation', () => {
		it('should return correct superscript notation', () => {
			expect(getPowerNotation(2)).toBe('2¹');
			expect(getPowerNotation(4)).toBe('2²');
			expect(getPowerNotation(64)).toBe('2⁶');
			expect(getPowerNotation(2048)).toBe('2¹¹');
		});

		it('should handle non-powers of 2', () => {
			expect(getPowerNotation(3)).toBe('3');
			expect(getPowerNotation(100)).toBe('100');
		});
	});

	describe('getMergeMessage', () => {
		it('should return correct merge message', () => {
			expect(getMergeMessage(4)).toBe('2 + 2 = 4 (2²) ✓');
			expect(getMergeMessage(64)).toBe('32 + 32 = 64 (2⁶) ✓');
		});

		it('should return victory message for 2048', () => {
			const message = getMergeMessage(2048);
			expect(message).toContain('VICTOIRE');
			expect(message).toContain('1024 + 1024 = 2048');
		});
	});
});
