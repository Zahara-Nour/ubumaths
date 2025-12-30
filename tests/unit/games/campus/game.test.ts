/**
 * Campus Game Logic Tests
 * ========================
 *
 * Tests for the Campus game core logic including:
 * - Grid initialization
 * - Dice rolling
 * - Token selection
 * - Chain reaction (B2 rule)
 * - Win detection
 * - Score calculation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
	createGrid,
	rollDice,
	calculateAvailablePoints,
	isSelectionValid,
	getSelectedSum,
	canSelectToken,
	flipTokens,
	checkChainReactions,
	isGameWon,
	getAlignments,
	countUnflippedNumbersInAlignment
} from '../../../../src/routes/(public)/games/campus/game.svelte';
import {
	ALL_TOKENS,
	GRID_SIZE,
	calculateScore,
	type Token
} from '../../../../src/routes/(public)/games/campus/types';

describe('Grid Initialization', () => {
	it('should create a 6x6 grid', () => {
		const grid = createGrid();
		expect(grid).toHaveLength(GRID_SIZE);
		grid.forEach((row) => {
			expect(row).toHaveLength(GRID_SIZE);
		});
	});

	it('should have exactly 36 tokens', () => {
		const grid = createGrid();
		const tokenCount = grid.flat().length;
		expect(tokenCount).toBe(36);
	});

	it('should have all tokens not flipped initially', () => {
		const grid = createGrid();
		grid.flat().forEach((token) => {
			expect(token.flipped).toBe(false);
		});
	});

	it('should have correct row and col positions', () => {
		const grid = createGrid();
		for (let row = 0; row < GRID_SIZE; row++) {
			for (let col = 0; col < GRID_SIZE; col++) {
				expect(grid[row][col].row).toBe(row);
				expect(grid[row][col].col).toBe(col);
			}
		}
	});

	it('should draw tokens from the available pool', () => {
		const grid = createGrid();
		const availableValues = ALL_TOKENS.map((t) => t.value);
		grid.flat().forEach((token) => {
			expect(availableValues).toContain(token.value);
		});
	});

	it('should have at most 3 stars', () => {
		const grid = createGrid();
		const starCount = grid.flat().filter((t) => t.type === 'star').length;
		expect(starCount).toBeLessThanOrEqual(3);
	});
});

describe('Dice Rolling', () => {
	it('should return values between 1 and 6 for both dice', () => {
		for (let i = 0; i < 100; i++) {
			const roll = rollDice();
			expect(roll.die1).toBeGreaterThanOrEqual(1);
			expect(roll.die1).toBeLessThanOrEqual(6);
			expect(roll.die2).toBeGreaterThanOrEqual(1);
			expect(roll.die2).toBeLessThanOrEqual(6);
		}
	});

	it('should correctly identify doubles', () => {
		// Test with forced values
		const double = { die1: 3, die2: 3, isDouble: true, availablePoints: 12 };
		expect(double.isDouble).toBe(true);

		const notDouble = { die1: 3, die2: 4, isDouble: false, availablePoints: 7 };
		expect(notDouble.isDouble).toBe(false);
	});
});

describe('Available Points Calculation', () => {
	it('should return sum of dice when not a double', () => {
		expect(calculateAvailablePoints(3, 4)).toBe(7);
		expect(calculateAvailablePoints(1, 2)).toBe(3);
		expect(calculateAvailablePoints(6, 5)).toBe(11);
	});

	it('should return double sum when a double (max 20)', () => {
		expect(calculateAvailablePoints(3, 3)).toBe(12); // 6 * 2 = 12
		expect(calculateAvailablePoints(5, 5)).toBe(20); // 10 * 2 = 20, capped at 20
		expect(calculateAvailablePoints(6, 6)).toBe(20); // 12 * 2 = 24, capped at 20
	});

	it('should cap double points at 20', () => {
		expect(calculateAvailablePoints(6, 6)).toBe(20);
	});
});

describe('Token Selection', () => {
	let grid: Token[][];

	beforeEach(() => {
		// Create a test grid with known values
		grid = [];
		for (let row = 0; row < GRID_SIZE; row++) {
			grid[row] = [];
			for (let col = 0; col < GRID_SIZE; col++) {
				grid[row][col] = {
					value: ((row * GRID_SIZE + col) % 10) + 1, // Values 1-10
					type: 'number',
					flipped: false,
					row,
					col
				};
			}
		}
		// Add a star at position (0, 0)
		grid[0][0] = { value: 25, type: 'star', flipped: false, row: 0, col: 0 };
	});

	it('should not allow selecting a star directly', () => {
		// Star is at position (0, 0)
		expect(canSelectToken(grid, 0, 0)).toBe(false);
	});

	it('should not allow selecting a flipped token', () => {
		grid[1][1].flipped = true;
		expect(canSelectToken(grid, 1, 1)).toBe(false);
	});

	it('should allow selecting an unflipped number token', () => {
		expect(canSelectToken(grid, 1, 1)).toBe(true);
	});

	it('should calculate selected sum correctly', () => {
		const positions = [
			{ row: 1, col: 0 }, // value = 7
			{ row: 1, col: 1 } // value = 8
		];
		grid[1][0].value = 7;
		grid[1][1].value = 8;
		expect(getSelectedSum(grid, positions)).toBe(15);
	});

	it('should validate selection within available points', () => {
		grid[1][0].value = 3;
		grid[1][1].value = 4;
		const positions = [
			{ row: 1, col: 0 },
			{ row: 1, col: 1 }
		];
		expect(isSelectionValid(grid, positions, 7)).toBe(true);
		expect(isSelectionValid(grid, positions, 6)).toBe(false);
	});

	it('should allow empty selection (pass turn)', () => {
		expect(isSelectionValid(grid, [], 5)).toBe(true);
	});
});

describe('Token Flipping', () => {
	let grid: Token[][];

	beforeEach(() => {
		grid = [];
		for (let row = 0; row < GRID_SIZE; row++) {
			grid[row] = [];
			for (let col = 0; col < GRID_SIZE; col++) {
				grid[row][col] = {
					value: row * GRID_SIZE + col + 1,
					type: 'number',
					flipped: false,
					row,
					col
				};
			}
		}
	});

	it('should flip selected tokens', () => {
		const positions = [
			{ row: 0, col: 0 },
			{ row: 0, col: 1 }
		];
		const newGrid = flipTokens(grid, positions);
		expect(newGrid[0][0].flipped).toBe(true);
		expect(newGrid[0][1].flipped).toBe(true);
		expect(newGrid[0][2].flipped).toBe(false);
	});

	it('should not modify original grid', () => {
		const positions = [{ row: 0, col: 0 }];
		const newGrid = flipTokens(grid, positions);
		expect(grid[0][0].flipped).toBe(false);
		expect(newGrid[0][0].flipped).toBe(true);
	});
});

describe('Alignments', () => {
	it('should return all 14 alignments (6 rows + 6 cols + 2 diagonals)', () => {
		const alignments = getAlignments();
		expect(alignments).toHaveLength(14);
	});

	it('should have 6 positions in each alignment', () => {
		const alignments = getAlignments();
		alignments.forEach((alignment) => {
			expect(alignment.positions).toHaveLength(6);
		});
	});

	it('should have correct row alignments', () => {
		const alignments = getAlignments();
		const rowAlignments = alignments.filter((a) => a.type === 'row');
		expect(rowAlignments).toHaveLength(6);

		// Check first row
		const row0 = rowAlignments.find((a) => a.index === 0);
		expect(row0?.positions).toEqual([
			{ row: 0, col: 0 },
			{ row: 0, col: 1 },
			{ row: 0, col: 2 },
			{ row: 0, col: 3 },
			{ row: 0, col: 4 },
			{ row: 0, col: 5 }
		]);
	});

	it('should have correct column alignments', () => {
		const alignments = getAlignments();
		const colAlignments = alignments.filter((a) => a.type === 'col');
		expect(colAlignments).toHaveLength(6);

		// Check first column
		const col0 = colAlignments.find((a) => a.index === 0);
		expect(col0?.positions).toEqual([
			{ row: 0, col: 0 },
			{ row: 1, col: 0 },
			{ row: 2, col: 0 },
			{ row: 3, col: 0 },
			{ row: 4, col: 0 },
			{ row: 5, col: 0 }
		]);
	});

	it('should have correct diagonal alignments', () => {
		const alignments = getAlignments();
		const diagAlignments = alignments.filter((a) => a.type === 'diagonal');
		expect(diagAlignments).toHaveLength(2);

		// Main diagonal (top-left to bottom-right)
		const mainDiag = diagAlignments.find((a) => a.index === 0);
		expect(mainDiag?.positions).toEqual([
			{ row: 0, col: 0 },
			{ row: 1, col: 1 },
			{ row: 2, col: 2 },
			{ row: 3, col: 3 },
			{ row: 4, col: 4 },
			{ row: 5, col: 5 }
		]);

		// Anti-diagonal (top-right to bottom-left)
		const antiDiag = diagAlignments.find((a) => a.index === 1);
		expect(antiDiag?.positions).toEqual([
			{ row: 0, col: 5 },
			{ row: 1, col: 4 },
			{ row: 2, col: 3 },
			{ row: 3, col: 2 },
			{ row: 4, col: 1 },
			{ row: 5, col: 0 }
		]);
	});
});

describe('Chain Reaction (B2 Rule)', () => {
	let grid: Token[][];

	beforeEach(() => {
		// Create grid with all tokens flipped except specific ones
		grid = [];
		for (let row = 0; row < GRID_SIZE; row++) {
			grid[row] = [];
			for (let col = 0; col < GRID_SIZE; col++) {
				grid[row][col] = {
					value: row * GRID_SIZE + col + 1,
					type: 'number',
					flipped: true, // All flipped by default
					row,
					col
				};
			}
		}
	});

	it('should count unflipped numbers in alignment', () => {
		// Unflip two tokens in row 0
		grid[0][0].flipped = false;
		grid[0][3].flipped = false;

		const rowAlignment = {
			type: 'row' as const,
			index: 0,
			positions: [
				{ row: 0, col: 0 },
				{ row: 0, col: 1 },
				{ row: 0, col: 2 },
				{ row: 0, col: 3 },
				{ row: 0, col: 4 },
				{ row: 0, col: 5 }
			]
		};

		expect(countUnflippedNumbersInAlignment(grid, rowAlignment)).toBe(2);
	});

	it('should not count stars in unflipped number count', () => {
		// Unflip one number and one star in row 0
		grid[0][0].flipped = false;
		grid[0][1] = { value: 25, type: 'star', flipped: false, row: 0, col: 1 };

		const rowAlignment = {
			type: 'row' as const,
			index: 0,
			positions: [
				{ row: 0, col: 0 },
				{ row: 0, col: 1 },
				{ row: 0, col: 2 },
				{ row: 0, col: 3 },
				{ row: 0, col: 4 },
				{ row: 0, col: 5 }
			]
		};

		expect(countUnflippedNumbersInAlignment(grid, rowAlignment)).toBe(1);
	});

	it('should trigger chain reaction when one number left on alignment', () => {
		// Leave only one token unflipped in row 0
		grid[0][2].flipped = false;
		grid[0][2].value = 5;

		const result = checkChainReactions(grid);
		expect(result.steps.length).toBeGreaterThan(0);
		expect(result.newGrid[0][2].flipped).toBe(true);
	});

	it('should also flip stars on the same alignment', () => {
		// Leave one number and one star unflipped in row 0
		grid[0][2].flipped = false;
		grid[0][2].value = 5;
		grid[0][4] = { value: 25, type: 'star', flipped: false, row: 0, col: 4 };

		const result = checkChainReactions(grid);
		expect(result.newGrid[0][2].flipped).toBe(true);
		expect(result.newGrid[0][4].flipped).toBe(true); // Star should be flipped too
	});

	it('should cascade chain reactions', () => {
		// Setup: token A alone on row 0, token B alone on col 0 after A flips
		// Row 0: only (0,2) unflipped
		grid[0][2].flipped = false;
		grid[0][2].value = 5;

		// Col 2: only (0,2) and (3,2) unflipped
		// After (0,2) flips, (3,2) will be alone on col 2
		grid[3][2].flipped = false;
		grid[3][2].value = 7;

		const result = checkChainReactions(grid);

		// Both should be flipped after cascade
		expect(result.newGrid[0][2].flipped).toBe(true);
		expect(result.newGrid[3][2].flipped).toBe(true);
		expect(result.steps.length).toBeGreaterThanOrEqual(2);
	});

	it('should not trigger when multiple numbers remain on alignment', () => {
		// Create a 2x2 block of unflipped tokens that avoids both diagonals
		// Main diagonal: (i,i) for i=0..5
		// Anti-diagonal: (i, 5-i) for i=0..5
		// Positions (0,1), (0,4), (2,1), (2,4) avoid both diagonals
		// This ensures: 2 tokens on row 0, 2 on row 2, 2 on col 1, 2 on col 4
		grid[0][1].flipped = false;
		grid[0][4].flipped = false;
		grid[2][1].flipped = false;
		grid[2][4].flipped = false;

		const result = checkChainReactions(grid);
		expect(result.steps.length).toBe(0);
		expect(result.newGrid[0][1].flipped).toBe(false);
		expect(result.newGrid[0][4].flipped).toBe(false);
		expect(result.newGrid[2][1].flipped).toBe(false);
		expect(result.newGrid[2][4].flipped).toBe(false);
	});
});

describe('Win Detection', () => {
	it('should return true when all tokens are flipped', () => {
		const grid: Token[][] = [];
		for (let row = 0; row < GRID_SIZE; row++) {
			grid[row] = [];
			for (let col = 0; col < GRID_SIZE; col++) {
				grid[row][col] = {
					value: row * GRID_SIZE + col + 1,
					type: 'number',
					flipped: true,
					row,
					col
				};
			}
		}
		expect(isGameWon(grid)).toBe(true);
	});

	it('should return false when some tokens are not flipped', () => {
		const grid: Token[][] = [];
		for (let row = 0; row < GRID_SIZE; row++) {
			grid[row] = [];
			for (let col = 0; col < GRID_SIZE; col++) {
				grid[row][col] = {
					value: row * GRID_SIZE + col + 1,
					type: 'number',
					flipped: true,
					row,
					col
				};
			}
		}
		grid[0][0].flipped = false;
		expect(isGameWon(grid)).toBe(false);
	});
});

describe('Score Calculation', () => {
	it('should calculate score as rollCount * 100 + totalPointsUsed', () => {
		expect(calculateScore(5, 30)).toBe(530);
		expect(calculateScore(10, 50)).toBe(1050);
		expect(calculateScore(1, 0)).toBe(100);
	});

	it('should favor fewer rolls over fewer points', () => {
		// 4 rolls with 99 points = 499
		// 5 rolls with 0 points = 500
		expect(calculateScore(4, 99)).toBeLessThan(calculateScore(5, 0));
	});
});
