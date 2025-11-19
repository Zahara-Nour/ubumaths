import { browser } from '$app/environment';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { createLogger } from '$lib/utils/logger';
import { toaster } from '$lib/stores/toaster.svelte';
import type { GameState, CellState, DifficultyConfig } from '$lib/types/minesweeper';
import { DIFFICULTY_CONFIGS } from '$lib/types/minesweeper';

const logger = createLogger('minesweeper.svelte.ts');

type Difficulty = 'beginner' | 'intermediate' | 'expert';
type GameStatus = 'not_started' | 'in_progress' | 'won' | 'lost';
type User = Database['public']['Tables']['profiles']['Row'];

const AUTOSAVE_INTERVAL = 10000; // 10 seconds
const TIMER_INTERVAL = 1000; // 1 second
const LOCALSTORAGE_KEY = 'minesweeper_game';

interface LocalStorageGame {
	difficulty: Difficulty;
	status: GameStatus;
	grid: CellState[][];
	timeElapsed: number;
	flagsUsed: number;
	cellsRevealed: number;
	createdAt: string;
}

/**
 * Minesweeper Game Store
 * ======================
 *
 * Manages the complete Minesweeper game logic including:
 * - Grid generation with random mine placement
 * - Cascade reveal algorithm (BFS for empty cells)
 * - Flag management
 * - Win/loss detection
 * - Timer
 * - Auto-save (localStorage for public, API for authenticated)
 *
 * ⚠️ IMPORTANT: Components using this store MUST call cleanup() in onDestroy()
 * to prevent memory leaks from running intervals.
 *
 * @example
 * ```ts
 * import { onDestroy } from 'svelte';
 * import { minesweeperStore } from '$lib/stores/minesweeper.svelte';
 *
 * // Initialize with user (null for public)
 * minesweeperStore.init(supabase, user);
 *
 * // Start a new game
 * await minesweeperStore.startNewGame('beginner');
 *
 * // Reveal a cell
 * minesweeperStore.revealCell(0, 0);
 *
 * // Toggle flag
 * minesweeperStore.toggleFlag(0, 1);
 *
 * // Resume saved game
 * await minesweeperStore.loadSavedGame();
 *
 * // REQUIRED: Cleanup on component destroy
 * onDestroy(() => {
 *   minesweeperStore.cleanup();
 * });
 * ```
 */
class MinesweeperStore {
	private supabase: SupabaseClient<Database> | null = null;
	private user: User | null = null;

	/**
	 * Current game state
	 */
	currentGame = $state<GameState | null>(null);

	/**
	 * Loading state
	 */
	isLoading = $state(false);

	/**
	 * Error state
	 */
	error = $state<string | null>(null);

	/**
	 * Timer interval
	 */
	private timerInterval: ReturnType<typeof setInterval> | null = null;

	/**
	 * Auto-save interval for authenticated users
	 */
	private autoSaveInterval: ReturnType<typeof setInterval> | null = null;

	/**
	 * Initialize the Minesweeper store
	 *
	 * @param client - Supabase client instance (required for authenticated users)
	 * @param currentUser - Current authenticated user (null for public users)
	 */
	init(client: SupabaseClient<Database> | null, currentUser: User | null): void {
		if (!browser) {
			logger.warn('Cannot initialize Minesweeper store on server');
			return;
		}

		this.supabase = client;
		this.user = currentUser;

		logger.info(
			'Minesweeper store initialized',
			currentUser ? `for user: ${currentUser.id}` : 'for public user'
		);
	}

	/**
	 * Start a new game
	 *
	 * @param difficulty - Game difficulty level
	 * @param seed - Optional seed for deterministic grid generation (for daily challenges)
	 */
	async startNewGame(difficulty: Difficulty, seed?: string): Promise<void> {
		if (!browser) {
			logger.warn('Cannot start game on server');
			return;
		}

		this.isLoading = true;
		this.error = null;

		try {
			const config = DIFFICULTY_CONFIGS[difficulty];

			// Create fresh game state
			const newGame: GameState = {
				difficulty,
				status: 'not_started',
				grid: this.generateGrid(config, undefined, undefined, seed),
				rows: config.rows,
				cols: config.cols,
				minesCount: config.mines,
				flagsUsed: 0,
				cellsRevealed: 0,
				timeElapsed: 0,
				startedAt: undefined,
				seed // Store seed for potential grid regeneration
			};

			// Stop existing timers
			this.stopTimer();
			this.stopAutoSave();

			// Save to database if authenticated
			if (this.user && this.supabase) {
				const { data, error } = await this.supabase
					.from('minesweeper_games')
					.insert({
						user_id: this.user.id,
						difficulty,
						status: 'not_started',
						grid_state: this.gridToDTO(newGame.grid),
						time_elapsed: 0
					})
					.select('id')
					.single();

				if (error) {
					throw error;
				}

				newGame.id = data.id;

				logger.info('Created new game in database:', data.id);
			} else {
				// Save to localStorage for public users
				this.saveToLocalStorage(newGame);
				logger.info('Created new game in localStorage');
			}

			this.currentGame = newGame;

			toaster.success('Nouvelle partie créée !');
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to start new game';
			logger.error('Failed to start new game:', err);
			this.error = message;
			toaster.error('Impossible de créer une nouvelle partie');
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Create a seeded random number generator (Mulberry32 algorithm)
	 * Used for daily challenges to generate identical grids from the same seed
	 *
	 * @param seed - Seed string
	 * @returns Function that returns random numbers between 0 and 1
	 */
	private createSeededRNG(seed: string): () => number {
		// Convert string seed to 32-bit integer
		let state = 0;
		for (let i = 0; i < seed.length; i++) {
			state = (state << 5) - state + seed.charCodeAt(i);
			state = state & state; // Convert to 32bit integer
		}

		// Mulberry32 PRNG - simple and effective
		return () => {
			state = (state + 0x6d2b79f5) | 0;
			let t = Math.imul(state ^ (state >>> 15), 1 | state);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	/**
	 * Generate a grid with random mine placement
	 *
	 * @param config - Difficulty configuration
	 * @param firstClickRow - First click row (to avoid placing mine there)
	 * @param firstClickCol - First click column (to avoid placing mine there)
	 * @param seed - Optional seed for deterministic generation (for daily challenges)
	 * @returns 2D array of cell states
	 */
	private generateGrid(
		config: DifficultyConfig,
		firstClickRow?: number,
		firstClickCol?: number,
		seed?: string
	): CellState[][] {
		const { rows, cols, mines } = config;

		// Initialize grid with empty cells
		const grid: CellState[][] = [];
		for (let row = 0; row < rows; row++) {
			grid[row] = [];
			for (let col = 0; col < cols; col++) {
				grid[row][col] = {
					row,
					col,
					isMine: false,
					isRevealed: false,
					isFlagged: false,
					adjacentMines: 0
				};
			}
		}

		// Place mines randomly (avoid first click position and its neighbors)
		const availableCells: { row: number; col: number }[] = [];

		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < cols; col++) {
				// Skip first click and its neighbors
				if (firstClickRow !== undefined && firstClickCol !== undefined) {
					const rowDiff = Math.abs(row - firstClickRow);
					const colDiff = Math.abs(col - firstClickCol);
					if (rowDiff <= 1 && colDiff <= 1) {
						continue;
					}
				}

				availableCells.push({ row, col });
			}
		}

		// Fisher-Yates shuffle to select random mine positions
		// Use seeded RNG if seed provided (for daily challenges), otherwise use Math.random()
		const rng = seed ? this.createSeededRNG(seed) : Math.random;
		const shuffled = [...availableCells];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(rng() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}

		// Place mines
		const minesToPlace = Math.min(mines, shuffled.length);
		for (let i = 0; i < minesToPlace; i++) {
			const { row, col } = shuffled[i];
			grid[row][col].isMine = true;
		}

		// Calculate adjacent mine counts for each cell
		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < cols; col++) {
				if (!grid[row][col].isMine) {
					grid[row][col].adjacentMines = this.countAdjacentMines(grid, row, col);
				}
			}
		}

		return grid;
	}

	/**
	 * Count adjacent mines for a cell
	 *
	 * @param grid - The game grid
	 * @param row - Cell row
	 * @param col - Cell column
	 * @returns Number of adjacent mines (0-8)
	 */
	private countAdjacentMines(grid: CellState[][], row: number, col: number): number {
		let count = 0;
		const rows = grid.length;
		const cols = grid[0].length;

		// Check all 8 directions
		for (let dRow = -1; dRow <= 1; dRow++) {
			for (let dCol = -1; dCol <= 1; dCol++) {
				if (dRow === 0 && dCol === 0) continue; // Skip center cell

				const newRow = row + dRow;
				const newCol = col + dCol;

				// Check bounds
				if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
					if (grid[newRow][newCol].isMine) {
						count++;
					}
				}
			}
		}

		return count;
	}

	/**
	 * Convert internal CellState[][] to API GridStateDTO format
	 *
	 * @param grid - Internal grid representation
	 * @returns GridStateDTO format for API/database
	 */
	private gridToDTO(grid: CellState[][]): import('$lib/types/minesweeper').GridStateDTO {
		const mines: [number, number][] = [];
		const revealed: [number, number][] = [];
		const flagged: [number, number][] = [];
		const adjacentCounts: Record<string, number> = {};

		for (let row = 0; row < grid.length; row++) {
			for (let col = 0; col < grid[row].length; col++) {
				const cell = grid[row][col];

				if (cell.isMine) {
					mines.push([row, col]);
				}
				if (cell.isRevealed) {
					revealed.push([row, col]);
				}
				if (cell.isFlagged) {
					flagged.push([row, col]);
				}
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

	/**
	 * Convert API GridStateDTO format to internal CellState[][]
	 *
	 * @param dto - GridStateDTO from API/database
	 * @returns Internal grid representation
	 */
	private dtoToGrid(dto: import('$lib/types/minesweeper').GridStateDTO): CellState[][] {
		const grid: CellState[][] = [];
		const mineSet = new Set(dto.mines.map(([r, c]) => `${r},${c}`));
		const revealedSet = new Set(dto.revealed.map(([r, c]) => `${r},${c}`));
		const flaggedSet = new Set(dto.flagged.map(([r, c]) => `${r},${c}`));

		for (let row = 0; row < dto.rows; row++) {
			grid[row] = [];
			for (let col = 0; col < dto.cols; col++) {
				const key = `${row},${col}`;
				grid[row][col] = {
					row,
					col,
					isMine: mineSet.has(key),
					isRevealed: revealedSet.has(key),
					isFlagged: flaggedSet.has(key),
					adjacentMines: dto.adjacentCounts[key] || 0
				};
			}
		}

		return grid;
	}

	/**
	 * Reveal a cell (cascade if empty)
	 *
	 * @param row - Cell row
	 * @param col - Cell column
	 */
	revealCell(row: number, col: number): void {
		if (!browser || !this.currentGame) {
			return;
		}

		const game = this.currentGame;
		const cell = game.grid[row]?.[col];

		// Validate cell exists
		if (!cell) {
			logger.warn('Invalid cell coordinates:', row, col);
			return;
		}

		// Cannot reveal flagged or already revealed cells
		if (cell.isFlagged || cell.isRevealed) {
			return;
		}

		// Start game on first reveal
		if (game.status === 'not_started') {
			game.status = 'in_progress';
			game.startedAt = new Date();
			this.startTimer();

			// Start auto-save for authenticated users
			if (this.user && this.supabase && game.id) {
				this.startAutoSave();
			}

			// Regenerate grid if first click is a mine (shouldn't happen but safety check)
			// For seeded games (daily challenges), use the same seed to ensure consistency
			if (cell.isMine) {
				const config = DIFFICULTY_CONFIGS[game.difficulty];
				game.grid = this.generateGrid(config, row, col, game.seed);
				// Get the new cell after regeneration
				const newCell = game.grid[row][col];
				if (newCell.isMine) {
					logger.error('Failed to regenerate grid without mine at first click');
					// Fallback: just mark it as not a mine
					newCell.isMine = false;
					newCell.adjacentMines = this.countAdjacentMines(game.grid, row, col);
				}
			}
		}

		// Update cell reference after potential regeneration
		const currentCell = game.grid[row][col];

		// If mine, game over
		if (currentCell.isMine) {
			currentCell.isRevealed = true;
			currentCell.isExploded = true;
			game.cellsRevealed++;
			game.status = 'lost';
			this.completeGame(false);
			return;
		}

		// Reveal cell and cascade if empty (BFS)
		this.cascadeReveal(row, col);

		// Check win condition
		const totalCells = game.rows * game.cols;
		if (game.cellsRevealed === totalCells - game.minesCount) {
			game.status = 'won';
			this.completeGame(true);
		}

		// Trigger reactivity
		this.currentGame = { ...game };
	}

	/**
	 * Cascade reveal using BFS (breadth-first search)
	 *
	 * @param startRow - Starting cell row
	 * @param startCol - Starting cell column
	 */
	private cascadeReveal(startRow: number, startCol: number): void {
		if (!this.currentGame) return;

		const game = this.currentGame;
		const queue: { row: number; col: number }[] = [{ row: startRow, col: startCol }];
		const visited = new Set<string>();

		while (queue.length > 0) {
			const { row, col } = queue.shift()!;
			const key = `${row},${col}`;

			// Skip if already visited
			if (visited.has(key)) {
				continue;
			}

			visited.add(key);

			const cell = game.grid[row]?.[col];

			// Skip invalid, flagged, or already revealed cells
			if (!cell || cell.isFlagged || cell.isRevealed || cell.isMine) {
				continue;
			}

			// Reveal the cell
			cell.isRevealed = true;
			game.cellsRevealed++;

			// If cell has adjacent mines, stop cascading in this direction
			if (cell.adjacentMines > 0) {
				continue;
			}

			// If empty (0 adjacent mines), add all neighbors to queue
			for (let dRow = -1; dRow <= 1; dRow++) {
				for (let dCol = -1; dCol <= 1; dCol++) {
					if (dRow === 0 && dCol === 0) continue; // Skip center cell

					const newRow = row + dRow;
					const newCol = col + dCol;

					// Check bounds
					if (newRow >= 0 && newRow < game.rows && newCol >= 0 && newCol < game.cols) {
						queue.push({ row: newRow, col: newCol });
					}
				}
			}
		}
	}

	/**
	 * Toggle flag on a cell
	 *
	 * @param row - Cell row
	 * @param col - Cell column
	 */
	toggleFlag(row: number, col: number): void {
		if (!browser || !this.currentGame) {
			return;
		}

		const game = this.currentGame;
		const cell = game.grid[row]?.[col];

		// Validate cell exists
		if (!cell) {
			logger.warn('Invalid cell coordinates:', row, col);
			return;
		}

		// Cannot flag revealed cells
		if (cell.isRevealed) {
			return;
		}

		// Toggle flag
		if (cell.isFlagged) {
			cell.isFlagged = false;
			game.flagsUsed--;
		} else {
			// Check if we have flags remaining
			if (game.flagsUsed >= game.minesCount) {
				toaster.warning('Nombre maximum de drapeaux atteint');
				return;
			}

			cell.isFlagged = true;
			game.flagsUsed++;
		}

		// Trigger reactivity
		this.currentGame = { ...game };
	}

	/**
	 * Chord click: Reveal all neighbors if flags match adjacent mine count
	 * This is a classic Minesweeper feature for expert players.
	 *
	 * @param row - Cell row
	 * @param col - Cell column
	 */
	chordClick(row: number, col: number): void {
		if (!browser || !this.currentGame) {
			return;
		}

		const game = this.currentGame;
		const cell = game.grid[row]?.[col];

		// Validate cell exists and is revealed
		if (!cell || !cell.isRevealed) {
			return;
		}

		// Only works on numbered cells (not empty cells or mines)
		if (cell.adjacentMines === 0 || cell.isMine) {
			return;
		}

		// Count flags around this cell
		let flagCount = 0;
		const neighbors: { row: number; col: number }[] = [];

		for (let dRow = -1; dRow <= 1; dRow++) {
			for (let dCol = -1; dCol <= 1; dCol++) {
				if (dRow === 0 && dCol === 0) continue;

				const newRow = row + dRow;
				const newCol = col + dCol;

				if (!this.isValidCell(newRow, newCol)) continue;

				const neighbor = game.grid[newRow][newCol];
				if (neighbor.isFlagged) {
					flagCount++;
				} else if (!neighbor.isRevealed) {
					neighbors.push({ row: newRow, col: newCol });
				}
			}
		}

		// Only reveal if flag count matches adjacent mine count
		if (flagCount !== cell.adjacentMines) {
			return;
		}

		// Reveal all non-flagged neighbors
		let hitMine = false;
		for (const neighbor of neighbors) {
			const neighborCell = game.grid[neighbor.row][neighbor.col];

			if (neighborCell.isMine) {
				// Hit a mine! Game over
				neighborCell.isRevealed = true;
				neighborCell.isExploded = true;
				hitMine = true;
			} else {
				// Safe cell - reveal it
				neighborCell.isRevealed = true;
				game.cellsRevealed++;

				// Cascade if empty
				if (neighborCell.adjacentMines === 0) {
					this.cascadeReveal(neighbor.row, neighbor.col);
				}
			}
		}

		if (hitMine) {
			this.handleLoss();
		} else {
			// Check for win
			if (this.checkWinCondition()) {
				this.handleWin();
			} else {
				// Trigger reactivity
				this.currentGame = { ...game };
			}
		}
	}

	/**
	 * Start the game timer
	 */
	private startTimer(): void {
		if (!browser || this.timerInterval) {
			return;
		}

		this.timerInterval = setInterval(() => {
			if (this.currentGame && this.currentGame.status === 'in_progress') {
				this.currentGame.timeElapsed++;
			}
		}, TIMER_INTERVAL);

		logger.info('Timer started');
	}

	/**
	 * Stop the game timer
	 */
	private stopTimer(): void {
		if (this.timerInterval) {
			clearInterval(this.timerInterval);
			this.timerInterval = null;
			logger.info('Timer stopped');
		}
	}

	/**
	 * Start auto-save interval for authenticated users
	 */
	private startAutoSave(): void {
		if (!browser || this.autoSaveInterval || !this.user) {
			return;
		}

		this.autoSaveInterval = setInterval(() => {
			this.saveGame().catch((err) => {
				logger.error('Auto-save failed:', err);
			});
		}, AUTOSAVE_INTERVAL);

		logger.info('Auto-save started');
	}

	/**
	 * Stop auto-save interval
	 */
	private stopAutoSave(): void {
		if (this.autoSaveInterval) {
			clearInterval(this.autoSaveInterval);
			this.autoSaveInterval = null;
			logger.info('Auto-save stopped');
		}
	}

	/**
	 * Save game state
	 */
	async saveGame(): Promise<void> {
		if (!browser || !this.currentGame) {
			return;
		}

		const game = this.currentGame;

		try {
			if (this.user && this.supabase && game.id) {
				// Save to database for authenticated users
				const { error } = await this.supabase
					.from('minesweeper_games')
					.update({
						grid_state: this.gridToDTO(game.grid),
						status: game.status,
						time_elapsed: game.timeElapsed,
						flags_used: game.flagsUsed,
						cells_revealed: game.cellsRevealed
					})
					.eq('id', game.id);

				if (error) {
					throw error;
				}

				logger.trace('Game saved to database');
			} else {
				// Save to localStorage for public users
				this.saveToLocalStorage(game);
				logger.trace('Game saved to localStorage');
			}
		} catch (err) {
			logger.error('Failed to save game:', err);
			// Don't throw - auto-save failures shouldn't interrupt gameplay
		}
	}

	/**
	 * Save game to localStorage
	 *
	 * @param game - Game state to save
	 */
	private saveToLocalStorage(game: GameState): void {
		if (!browser) return;

		const localGame: LocalStorageGame = {
			difficulty: game.difficulty,
			status: game.status,
			grid: game.grid,
			timeElapsed: game.timeElapsed,
			flagsUsed: game.flagsUsed,
			cellsRevealed: game.cellsRevealed,
			createdAt: game.startedAt?.toISOString() ?? new Date().toISOString()
		};

		try {
			localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(localGame));
		} catch (err) {
			logger.error('Failed to save to localStorage:', err);
		}
	}

	/**
	 * Load saved game from localStorage
	 *
	 * @returns Loaded game state or null if not found
	 */
	private loadFromLocalStorage(): GameState | null {
		if (!browser) return null;

		try {
			const saved = localStorage.getItem(LOCALSTORAGE_KEY);
			if (!saved) return null;

			const localGame: LocalStorageGame = JSON.parse(saved);
			const config = DIFFICULTY_CONFIGS[localGame.difficulty];

			const game: GameState = {
				difficulty: localGame.difficulty,
				status: localGame.status,
				grid: localGame.grid,
				rows: config.rows,
				cols: config.cols,
				minesCount: config.mines,
				flagsUsed: localGame.flagsUsed,
				cellsRevealed: localGame.cellsRevealed,
				timeElapsed: localGame.timeElapsed,
				startedAt: new Date(localGame.createdAt)
			};

			return game;
		} catch (err) {
			logger.error('Failed to load from localStorage:', err);
			return null;
		}
	}

	/**
	 * Complete the game (win or loss)
	 *
	 * @param won - Whether the player won
	 */
	async completeGame(won: boolean): Promise<void> {
		if (!browser || !this.currentGame) {
			return;
		}

		const game = this.currentGame;

		// Stop timers
		this.stopTimer();
		this.stopAutoSave();

		// Update game status
		game.status = won ? 'won' : 'lost';

		try {
			if (this.user && this.supabase && game.id) {
				// Call RPC to complete game and calculate rewards
				const { data, error } = await this.supabase.rpc('complete_minesweeper_game', {
					p_game_id: game.id,
					p_grid_state: this.gridToDTO(game.grid)
				});

				if (error) {
					throw error;
				}

				// Show reward notification
				if (won && data && typeof data === 'object' && 'gidouilles_earned' in data) {
					const gidouilles = (data as { gidouilles_earned: number }).gidouilles_earned;
					if (gidouilles > 0) {
						toaster.success(`Victoire ! +${gidouilles} gidouilles 🎉`);
					} else {
						toaster.success('Victoire ! 🎉');
					}
				} else if (!won) {
					// Reveal all mines on loss
					this.revealAllMines();
					toaster.error('Défaite ! Réessayez 💥');
				}

				logger.info('Game completed:', { won, gameId: game.id });
			} else {
				// Public user - just show message
				if (won) {
					toaster.success('Victoire ! 🎉');
				} else {
					// Reveal all mines on loss
					this.revealAllMines();
					toaster.error('Défaite ! Réessayez 💥');
				}

				// Clear localStorage
				if (browser) {
					localStorage.removeItem(LOCALSTORAGE_KEY);
				}

				logger.info('Game completed (public):', { won });
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to complete game';
			logger.error('Failed to complete game:', err);
			this.error = message;

			// Still show result to user
			if (won) {
				toaster.success('Victoire ! 🎉');
			} else {
				this.revealAllMines();
				toaster.error('Défaite ! Réessayez 💥');
			}
		}

		// Trigger reactivity
		this.currentGame = { ...game };
	}

	/**
	 * Reveal all mines (on game loss)
	 */
	private revealAllMines(): void {
		if (!this.currentGame) return;

		const game = this.currentGame;

		for (let row = 0; row < game.rows; row++) {
			for (let col = 0; col < game.cols; col++) {
				const cell = game.grid[row][col];
				if (cell.isMine && !cell.isRevealed) {
					cell.isRevealed = true;
				}
			}
		}
	}

	/**
	 * Load saved game (from database or localStorage)
	 */
	async loadSavedGame(): Promise<void> {
		if (!browser) {
			logger.warn('Cannot load game on server');
			return;
		}

		this.isLoading = true;
		this.error = null;

		try {
			if (this.user && this.supabase) {
				// Load from database for authenticated users
				const { data, error } = await this.supabase
					.from('minesweeper_games')
					.select('*')
					.eq('user_id', this.user.id)
					.eq('status', 'in_progress')
					.order('created_at', { ascending: false })
					.limit(1)
					.maybeSingle();

				if (error) {
					throw error;
				}

				if (!data) {
					logger.info('No saved game found in database');
					this.currentGame = null;
					return;
				}

				const config = DIFFICULTY_CONFIGS[data.difficulty];

				// Convert GridStateDTO from database to internal CellState[][]
				const grid = this.dtoToGrid(
					data.grid_state as import('$lib/types/minesweeper').GridStateDTO
				);

				const game: GameState = {
					id: data.id,
					difficulty: data.difficulty,
					status: data.status,
					grid,
					rows: config.rows,
					cols: config.cols,
					minesCount: config.mines,
					flagsUsed: this.countFlags(grid),
					cellsRevealed: this.countRevealed(grid),
					timeElapsed: data.time_elapsed,
					startedAt: new Date(data.created_at)
				};

				this.currentGame = game;

				// Resume timer if game is in progress
				if (game.status === 'in_progress') {
					this.startTimer();
					this.startAutoSave();
				}

				logger.info('Loaded saved game from database:', data.id);
			} else {
				// Load from localStorage for public users
				const game = this.loadFromLocalStorage();

				if (!game) {
					logger.info('No saved game found in localStorage');
					this.currentGame = null;
					return;
				}

				this.currentGame = game;

				// Resume timer if game is in progress
				if (game.status === 'in_progress') {
					this.startTimer();
				}

				logger.info('Loaded saved game from localStorage');
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to load saved game';
			logger.error('Failed to load saved game:', err);
			this.error = message;
			toaster.error('Impossible de charger la partie sauvegardée');
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Count flagged cells in grid
	 *
	 * @param grid - Game grid
	 * @returns Number of flagged cells
	 */
	private countFlags(grid: CellState[][]): number {
		let count = 0;
		for (const row of grid) {
			for (const cell of row) {
				if (cell.isFlagged) count++;
			}
		}
		return count;
	}

	/**
	 * Count revealed cells in grid
	 *
	 * @param grid - Game grid
	 * @returns Number of revealed cells
	 */
	private countRevealed(grid: CellState[][]): number {
		let count = 0;
		for (const row of grid) {
			for (const cell of row) {
				if (cell.isRevealed) count++;
			}
		}
		return count;
	}

	/**
	 * Cleanup intervals and state
	 */
	cleanup(): void {
		if (!browser) return;

		this.stopTimer();
		this.stopAutoSave();
		this.currentGame = null;
		this.error = null;

		logger.info('Minesweeper store cleaned up');
	}
}

export const minesweeperStore = new MinesweeperStore();
