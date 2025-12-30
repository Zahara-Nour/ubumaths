/**
 * Campus Game Logic
 * ==================
 *
 * Core game logic for the Campus dice game.
 * Uses Svelte 5 runes for reactive state management.
 */

import {
	ALL_TOKENS,
	GRID_SIZE,
	calculateScore,
	type Token,
	type DiceRoll,
	type Position,
	type ChainReactionStep,
	type GameState,
	type GameStatus
} from './types';

// ============================================================================
// PURE FUNCTIONS (for testing)
// ============================================================================

/**
 * Alignment type for chain reaction detection
 */
export interface Alignment {
	type: 'row' | 'col' | 'diagonal';
	index: number;
	positions: Position[];
}

/**
 * Get all 14 alignments (6 rows + 6 cols + 2 diagonals)
 */
export function getAlignments(): Alignment[] {
	const alignments: Alignment[] = [];

	// Rows
	for (let row = 0; row < GRID_SIZE; row++) {
		alignments.push({
			type: 'row',
			index: row,
			positions: Array.from({ length: GRID_SIZE }, (_, col) => ({ row, col }))
		});
	}

	// Columns
	for (let col = 0; col < GRID_SIZE; col++) {
		alignments.push({
			type: 'col',
			index: col,
			positions: Array.from({ length: GRID_SIZE }, (_, row) => ({ row, col }))
		});
	}

	// Main diagonal (top-left to bottom-right)
	alignments.push({
		type: 'diagonal',
		index: 0,
		positions: Array.from({ length: GRID_SIZE }, (_, i) => ({ row: i, col: i }))
	});

	// Anti-diagonal (top-right to bottom-left)
	alignments.push({
		type: 'diagonal',
		index: 1,
		positions: Array.from({ length: GRID_SIZE }, (_, i) => ({
			row: i,
			col: GRID_SIZE - 1 - i
		}))
	});

	return alignments;
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

/**
 * Create a new 6x6 grid with randomly placed tokens
 */
export function createGrid(): Token[][] {
	// Shuffle all tokens and take first 36
	const shuffled = shuffleArray(ALL_TOKENS);
	const selected = shuffled.slice(0, GRID_SIZE * GRID_SIZE);

	// Create grid
	const grid: Token[][] = [];
	for (let row = 0; row < GRID_SIZE; row++) {
		grid[row] = [];
		for (let col = 0; col < GRID_SIZE; col++) {
			const tokenIndex = row * GRID_SIZE + col;
			const token = selected[tokenIndex];
			grid[row][col] = {
				value: token.value,
				type: token.type,
				flipped: false,
				row,
				col
			};
		}
	}

	return grid;
}

/**
 * Roll two dice and return the result
 */
export function rollDice(): DiceRoll {
	const die1 = Math.floor(Math.random() * 6) + 1;
	const die2 = Math.floor(Math.random() * 6) + 1;
	const isDouble = die1 === die2;
	const availablePoints = calculateAvailablePoints(die1, die2);

	return { die1, die2, isDouble, availablePoints };
}

/**
 * Calculate available points from dice values
 * Double: sum * 2 (max 20)
 * Normal: sum
 */
export function calculateAvailablePoints(die1: number, die2: number): number {
	const sum = die1 + die2;
	if (die1 === die2) {
		return Math.min(sum * 2, 20);
	}
	return sum;
}

/**
 * Check if a token can be selected
 */
export function canSelectToken(grid: Token[][], row: number, col: number): boolean {
	const token = grid[row][col];
	// Cannot select stars directly (only via chain reaction)
	if (token.type === 'star') return false;
	// Cannot select already flipped tokens
	if (token.flipped) return false;
	return true;
}

/**
 * Calculate the sum of selected tokens
 */
export function getSelectedSum(grid: Token[][], positions: Position[]): number {
	return positions.reduce((sum, pos) => sum + grid[pos.row][pos.col].value, 0);
}

/**
 * Check if the current selection is valid (sum <= available points)
 */
export function isSelectionValid(
	grid: Token[][],
	positions: Position[],
	availablePoints: number
): boolean {
	// Empty selection is valid (pass turn)
	if (positions.length === 0) return true;
	return getSelectedSum(grid, positions) <= availablePoints;
}

/**
 * Flip tokens at the given positions (returns new grid)
 */
export function flipTokens(grid: Token[][], positions: Position[]): Token[][] {
	// Deep copy the grid
	const newGrid: Token[][] = grid.map((row) => row.map((token) => ({ ...token })));

	// Flip selected tokens
	for (const pos of positions) {
		newGrid[pos.row][pos.col].flipped = true;
	}

	return newGrid;
}

/**
 * Count unflipped number tokens in an alignment (excludes stars)
 */
export function countUnflippedNumbersInAlignment(grid: Token[][], alignment: Alignment): number {
	return alignment.positions.filter((pos) => {
		const token = grid[pos.row][pos.col];
		return !token.flipped && token.type === 'number';
	}).length;
}

/**
 * Check and execute chain reactions (B2 rule)
 * Returns the new grid and the steps of the chain reaction
 */
export function checkChainReactions(grid: Token[][]): {
	newGrid: Token[][];
	steps: ChainReactionStep[];
} {
	const steps: ChainReactionStep[] = [];
	const currentGrid = grid.map((row) => row.map((token) => ({ ...token })));
	let hasChanges = true;

	while (hasChanges) {
		hasChanges = false;
		const alignments = getAlignments();

		for (const alignment of alignments) {
			const unflippedNumbers = countUnflippedNumbersInAlignment(currentGrid, alignment);

			// B2 rule: if exactly one number token remains on an alignment
			if (unflippedNumbers === 1) {
				const positionsToFlip: Position[] = [];

				// Find all unflipped tokens (number + stars) on this alignment
				for (const pos of alignment.positions) {
					const token = currentGrid[pos.row][pos.col];
					if (!token.flipped) {
						positionsToFlip.push(pos);
					}
				}

				if (positionsToFlip.length > 0) {
					// Record the step for animation
					steps.push({
						positions: positionsToFlip,
						alignment: alignment.type,
						alignmentIndex: alignment.index
					});

					// Flip the tokens
					for (const pos of positionsToFlip) {
						currentGrid[pos.row][pos.col].flipped = true;
					}

					hasChanges = true;
				}
			}
		}
	}

	return { newGrid: currentGrid, steps };
}

/**
 * Check if the game is won (all tokens flipped)
 */
export function isGameWon(grid: Token[][]): boolean {
	return grid.flat().every((token) => token.flipped);
}

// ============================================================================
// GAME STATE CLASS (Svelte 5 Runes)
// ============================================================================

const STORAGE_KEY = 'campus-game-state';

/**
 * Campus Game State Manager
 * Singleton class managing the complete game state with Svelte 5 runes
 */
class CampusGame {
	// Reactive state
	grid = $state<Token[][]>([]);
	status = $state<GameStatus>('not_started');
	rollCount = $state(0);
	totalPointsUsed = $state(0);
	currentRoll = $state<DiceRoll | null>(null);
	selectedPositions = $state<Position[]>([]);
	pointsRemaining = $state(0);
	chainReactions = $state<ChainReactionStep[]>([]);
	startedAt = $state<number>(0);
	endedAt = $state<number | null>(null);

	// Derived state
	get selectedSum(): number {
		if (this.grid.length === 0) return 0;
		return getSelectedSum(this.grid, this.selectedPositions);
	}

	get isSelectionValid(): boolean {
		if (this.grid.length === 0) return false;
		return isSelectionValid(this.grid, this.selectedPositions, this.pointsRemaining);
	}

	get score(): number {
		return calculateScore(this.rollCount, this.totalPointsUsed);
	}

	get hasWon(): boolean {
		if (this.grid.length === 0) return false;
		return isGameWon(this.grid);
	}

	get unflippedCount(): number {
		if (this.grid.length === 0) return 36;
		return this.grid.flat().filter((t) => !t.flipped).length;
	}

	/**
	 * Initialize or resume game
	 */
	constructor() {
		// Try to load saved game on client side
		if (typeof window !== 'undefined') {
			this.loadFromStorage();
		}
	}

	/**
	 * Start a new game
	 */
	startNewGame(): void {
		this.grid = createGrid();
		this.status = 'rolling';
		this.rollCount = 0;
		this.totalPointsUsed = 0;
		this.currentRoll = null;
		this.selectedPositions = [];
		this.pointsRemaining = 0;
		this.chainReactions = [];
		this.startedAt = Date.now();
		this.endedAt = null;

		this.saveToStorage();
	}

	/**
	 * Roll the dice
	 */
	roll(): DiceRoll {
		if (this.status !== 'rolling') {
			throw new Error('Cannot roll dice in current state');
		}

		const roll = rollDice();
		this.currentRoll = roll;
		this.rollCount++;
		this.pointsRemaining = roll.availablePoints;
		this.selectedPositions = [];
		this.status = 'selecting';

		this.saveToStorage();
		return roll;
	}

	/**
	 * Toggle token selection
	 */
	toggleSelection(row: number, col: number): void {
		if (this.status !== 'selecting') return;
		if (!canSelectToken(this.grid, row, col)) return;

		const index = this.selectedPositions.findIndex((p) => p.row === row && p.col === col);

		if (index >= 0) {
			// Deselect
			this.selectedPositions = this.selectedPositions.filter((_, i) => i !== index);
		} else {
			// Try to select
			const newPositions = [...this.selectedPositions, { row, col }];
			const newSum = getSelectedSum(this.grid, newPositions);
			if (newSum <= this.pointsRemaining) {
				this.selectedPositions = newPositions;
			}
		}

		this.saveToStorage();
	}

	/**
	 * Confirm the current selection and flip tokens
	 */
	async confirmSelection(): Promise<ChainReactionStep[]> {
		if (this.status !== 'selecting') {
			throw new Error('Cannot confirm in current state');
		}

		const pointsUsed = this.selectedSum;
		this.totalPointsUsed += pointsUsed;

		// Flip selected tokens
		if (this.selectedPositions.length > 0) {
			this.grid = flipTokens(this.grid, this.selectedPositions);
		}

		// Check for chain reactions
		this.status = 'animating';
		const { newGrid, steps } = checkChainReactions(this.grid);
		this.grid = newGrid;
		this.chainReactions = steps;

		// Reset for next turn
		this.selectedPositions = [];
		this.currentRoll = null;
		this.pointsRemaining = 0;

		// Check win condition
		if (isGameWon(this.grid)) {
			this.status = 'won';
			this.endedAt = Date.now();
		} else {
			this.status = 'rolling';
		}

		this.saveToStorage();
		return steps;
	}

	/**
	 * Pass the current turn (use no points)
	 */
	async passTurn(): Promise<void> {
		this.selectedPositions = [];
		await this.confirmSelection();
	}

	/**
	 * Save game state to localStorage
	 */
	private saveToStorage(): void {
		if (typeof window === 'undefined') return;

		const state: GameState = {
			grid: this.grid,
			status: this.status,
			rollCount: this.rollCount,
			totalPointsUsed: this.totalPointsUsed,
			currentRoll: this.currentRoll,
			selectedPositions: this.selectedPositions,
			pointsRemaining: this.pointsRemaining,
			chainReactions: this.chainReactions,
			startedAt: this.startedAt,
			endedAt: this.endedAt
		};

		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		} catch {
			// Storage full or unavailable
		}
	}

	/**
	 * Load game state from localStorage
	 */
	private loadFromStorage(): void {
		if (typeof window === 'undefined') return;

		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (!saved) return;

			const state: GameState = JSON.parse(saved);

			// Validate the saved state
			if (!state.grid || state.grid.length !== GRID_SIZE) return;

			this.grid = state.grid;
			this.status = state.status;
			this.rollCount = state.rollCount;
			this.totalPointsUsed = state.totalPointsUsed;
			this.currentRoll = state.currentRoll;
			this.selectedPositions = state.selectedPositions;
			this.pointsRemaining = state.pointsRemaining;
			this.chainReactions = state.chainReactions;
			this.startedAt = state.startedAt;
			this.endedAt = state.endedAt;
		} catch {
			// Invalid saved state, ignore
		}
	}

	/**
	 * Clear saved game
	 */
	clearStorage(): void {
		if (typeof window === 'undefined') return;
		localStorage.removeItem(STORAGE_KEY);
	}

	/**
	 * Reset the game completely
	 */
	reset(): void {
		this.clearStorage();
		this.grid = [];
		this.status = 'not_started';
		this.rollCount = 0;
		this.totalPointsUsed = 0;
		this.currentRoll = null;
		this.selectedPositions = [];
		this.pointsRemaining = 0;
		this.chainReactions = [];
		this.startedAt = 0;
		this.endedAt = null;
	}
}

// Export singleton instance
export const game = new CampusGame();
