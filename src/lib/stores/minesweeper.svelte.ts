import { browser } from '$app/environment';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '$lib/types/database';
import { createLogger } from '$lib/utils/logger';
import { toaster } from '$lib/stores/toaster.svelte';
import { modalStack } from '$lib/stores/modalStack.svelte';
import VictoryModal from '$lib/components/game/minesweeper/VictoryModal.svelte';
import DefeatModal from '$lib/components/game/minesweeper/DefeatModal.svelte';
import type {
	GameState,
	CellState,
	DifficultyConfig,
	Difficulty,
	GameStatus,
	DatabaseGameStatus,
	RewardBreakdown,
	TournamentGameStartResponse
} from '$lib/types/minesweeper';
import { DIFFICULTY_CONFIGS } from '$lib/types/minesweeper';
import TournamentVictoryModal from '$lib/components/game/minesweeper/TournamentVictoryModal.svelte';
import TournamentDefeatModal from '$lib/components/game/minesweeper/TournamentDefeatModal.svelte';

const logger = createLogger('minesweeper.svelte.ts');

type User = Database['public']['Tables']['profiles']['Row'];

const AUTOSAVE_INTERVAL = 10000; // 10 seconds
const TIMER_INTERVAL = 1000; // 1 second
const LOCALSTORAGE_KEY = 'minesweeper_game';

// ✅ FIX (I-2): Hints system configuration constants
const MAX_HINTS_PER_GAME = 3; // Maximum hints allowed per game
const HINT_COST_GIDOUILLES = 10; // Gidouilles cost per hint
const HINT_PENALTY_PERCENTAGE = 30; // Percentage penalty on final reward (only for gidouilles hints)
const HINT_ITEM_INTERNAL_NAME = 'minesweeper_hint'; // Shop item internal name

/**
 * 8 neighboring cell directions (relative positions)
 * Used for mine counting and cascade reveal algorithms
 */
const NEIGHBOR_DIRECTIONS = [
	[-1, -1],
	[-1, 0],
	[-1, 1],
	[0, -1],
	[0, 1],
	[1, -1],
	[1, 0],
	[1, 1]
] as const;

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
 * Achievement data structure from API
 */
export interface UnlockedAchievement {
	achievement_id: string;
	name: string;
	icon: string;
	difficulty: string | null;
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
 * - Auto-save (localStorage for public/teachers/admins, API for students)
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
	 * Game completion in progress (waiting for API response)
	 * Used to keep the board visible while saving result
	 */
	isCompletingGame = $state(false);

	/**
	 * Error state
	 */
	error = $state<string | null>(null);

	/**
	 * Newly unlocked achievements (for toast notifications)
	 */
	newlyUnlockedAchievements = $state<UnlockedAchievement[]>([]);

	/**
	 * Number of hint items available in student's inventory
	 * Used to show "No penalty" indicator when items are available
	 */
	hintItemsAvailable = $state(0);

	// ============================================================================
	// Tournament Mode State
	// ============================================================================

	/**
	 * Current tournament ID (null if not in tournament mode)
	 */
	tournamentId = $state<string | null>(null);

	/**
	 * Current tournament game ID (null if not in tournament mode)
	 */
	tournamentGameId = $state<string | null>(null);

	/**
	 * Current tournament game number (for display)
	 */
	tournamentGameNumber = $state<number | null>(null);

	/**
	 * Tournament difficulty (cached from tournament config)
	 */
	tournamentDifficulty = $state<Difficulty | null>(null);

	/**
	 * Timer interval
	 */
	private timerInterval: ReturnType<typeof setInterval> | null = null;

	/**
	 * Auto-save interval for students
	 */
	private autoSaveInterval: ReturnType<typeof setInterval> | null = null;

	/**
	 * Cleanup handler for window unload
	 */
	private cleanupHandler: (() => void) | null = null;

	/**
	 * Check if current user should use database storage
	 * Students and teachers use database. Admins use localStorage like anonymous users.
	 * @returns true if user is a student or teacher with database access
	 */
	private shouldUseDatabase(): boolean {
		return !!(
			this.user &&
			this.supabase &&
			(this.user.role === 'student' || this.user.role === 'teacher')
		);
	}

	/**
	 * Initialize the Minesweeper store
	 *
	 * @param client - Supabase client instance (required for authenticated students)
	 * @param currentUser - Current authenticated user (null for public users, teachers, and admins)
	 */
	init(client: SupabaseClient<Database> | null, currentUser: User | null): void {
		if (!browser) {
			logger.warn('Cannot initialize Minesweeper store on server');
			return;
		}

		this.supabase = client;
		this.user = currentUser;

		// ✅ MEMORY LEAK PROTECTION: Auto-cleanup on page unload
		// Prevents intervals from running if components forget to call cleanup()
		if (!this.cleanupHandler) {
			this.cleanupHandler = () => this.cleanup();
			window.addEventListener('beforeunload', this.cleanupHandler);
			logger.info('Automatic cleanup handler registered');
		}

		logger.info(
			'Minesweeper store initialized',
			currentUser ? `for user: ${currentUser.id}` : 'for public user'
		);
	}

	/**
	 * Convert client GameStatus to DatabaseGameStatus
	 * Used when persisting to database
	 *
	 * @param status - Client-side game status
	 * @returns Database-compatible status
	 * @throws Error if status is invalid
	 */
	private toDbStatus(status: GameStatus): DatabaseGameStatus {
		// 'not_started' is client-only UX state
		// Database uses 'in_progress' for games that haven't finished
		if (status === 'not_started') {
			return 'in_progress';
		}

		// Validate against allowed database values
		if (status !== 'in_progress' && status !== 'won' && status !== 'lost') {
			logger.error('Invalid database status:', status);
			throw new Error(`Invalid database status: ${status}`);
		}

		return status;
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
		this.newlyUnlockedAchievements = []; // Clear previous achievements

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
				seed, // Store seed for potential grid regeneration
				hintsUsed: 0 // Initialize hints counter
			};

			// Stop existing timers
			this.stopTimer();
			this.stopAutoSave();

			// Save to database if student
			if (this.shouldUseDatabase()) {
				const gridState = this.gridToDTO(newGame.grid);
				const config = DIFFICULTY_CONFIGS[difficulty];
				const { data, error } = await this.supabase!.from('minesweeper_games')
					.insert({
						student_id: this.user!.id,
						difficulty,
						status: this.toDbStatus('in_progress'), // ✅ FIX: Database only accepts 'in_progress'|'won'|'lost'
						grid_state: gridState as unknown as Json,
						time_seconds: null, // ✅ FIX: NULL instead of 0 for in-progress games
						mines_count: config.mines
					})
					.select('id')
					.single();

				if (error) {
					throw error;
				}

				newGame.id = data.id;

				logger.info('Created new game in database:', data.id);
			} else {
				// Save to localStorage for public users, teachers, and admins
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

		// Check all 8 neighboring cells
		for (const [dRow, dCol] of NEIGHBOR_DIRECTIONS) {
			const newRow = row + dRow;
			const newCol = col + dCol;

			// Check bounds
			if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
				if (grid[newRow][newCol].isMine) {
					count++;
				}
			}
		}

		return count;
	}

	/**
	 * Convert internal CellState[][] to API GridStateDTO format
	 *
	 * **Validation**: Performs client-side sanity checks before returning DTO.
	 * Server-side validation with Zod will perform comprehensive validation.
	 *
	 * @param grid - Internal grid representation
	 * @returns GridStateDTO format for API/database
	 * @throws Error if DTO is invalid (defense in depth)
	 */
	private gridToDTO(grid: CellState[][]): import('$lib/types/minesweeper').GridStateDTO {
		// Build arrays from grid (source of truth)
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
				if (cell.isRevealed && !cell.isMine) {
					revealed.push([row, col]);
				}
				if (cell.isFlagged) {
					flagged.push([row, col]);
				}
				if (cell.adjacentMines > 0) {
					adjacentCounts[`${row},${col}`] = cell.adjacentMines;
				}
			}
		}

		const dto = {
			rows: grid.length,
			cols: grid[0]?.length || 0,
			mines,
			revealed,
			flagged,
			adjacentCounts
		};

		// ✅ CRITICAL FIX (C-1): Client-side validation before sending to API
		// Defense in depth - server-side Zod validation will also validate
		const currentDifficulty = this.currentGame?.difficulty;

		// Sanity checks (basic validation, not full Zod)
		if (dto.rows <= 0 || dto.rows > 100) {
			logger.error('Invalid rows count:', dto.rows);
			throw new Error(`Invalid grid rows: ${dto.rows}`);
		}

		if (dto.cols <= 0 || dto.cols > 100) {
			logger.error('Invalid cols count:', dto.cols);
			throw new Error(`Invalid grid cols: ${dto.cols}`);
		}

		if (dto.mines.length > 999) {
			logger.error('Too many mines:', dto.mines.length);
			throw new Error(`Too many mines: ${dto.mines.length}`);
		}

		if (dto.revealed.length > 10000) {
			logger.error('Too many revealed cells:', dto.revealed.length);
			throw new Error(`Too many revealed cells: ${dto.revealed.length}`);
		}

		if (dto.flagged.length > 999) {
			logger.error('Too many flagged cells:', dto.flagged.length);
			throw new Error(`Too many flagged cells: ${dto.flagged.length}`);
		}

		// Difficulty-specific validation (if we know the difficulty)
		if (currentDifficulty) {
			const config = DIFFICULTY_CONFIGS[currentDifficulty];
			const expectedMines = config.mines;

			if (dto.mines.length !== expectedMines) {
				logger.error('Mine count mismatch:', {
					expected: expectedMines,
					actual: dto.mines.length,
					difficulty: currentDifficulty
				});
				throw new Error(
					`Invalid mine count for ${currentDifficulty}: expected ${expectedMines}, got ${dto.mines.length}`
				);
			}

			if (dto.rows !== config.rows || dto.cols !== config.cols) {
				logger.error('Grid size mismatch:', {
					expected: `${config.rows}x${config.cols}`,
					actual: `${dto.rows}x${dto.cols}`,
					difficulty: currentDifficulty
				});
				throw new Error(
					`Invalid grid size for ${currentDifficulty}: expected ${config.rows}x${config.cols}, got ${dto.rows}x${dto.cols}`
				);
			}
		}

		return dto;
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

			// Start auto-save (database for students, localStorage for others)
			this.startAutoSave();

			// ✅ H-3 SECURITY FIX: Disable first-click regeneration for daily challenges
			// Daily challenges must use pre-determined grids (seeded) for fairness
			// Regenerating with different first-click positions creates different grids
			// This allows players to "shop" for easier layouts, violating competitive integrity
			if (cell.isMine && !game.seed) {
				// Only regenerate for non-seeded games (regular play)
				const config = DIFFICULTY_CONFIGS[game.difficulty];
				game.grid = this.generateGrid(config, row, col);
				// Get the new cell after regeneration
				const newCell = game.grid[row][col];
				if (newCell.isMine) {
					logger.error('Failed to regenerate grid without mine at first click');
					// Fallback: just mark it as not a mine
					newCell.isMine = false;
					newCell.adjacentMines = this.countAdjacentMines(game.grid, row, col);
				}
			} else if (cell.isMine && game.seed) {
				// For seeded games (daily challenges), warn user they clicked a mine on first try
				// This is fair because all players get the same grid
				logger.warn('First click on mine in daily challenge - grid cannot be regenerated');
				toaster.warning(
					'Attention : Vous avez cliqué sur une mine ! Les défis quotidiens utilisent la même grille pour tous.'
				);
			}

			// Immediately save the game state so it can be resumed if page is reloaded
			// before the first auto-save interval (10 seconds)
			// This must happen AFTER potential grid regeneration to save the correct grid
			logger.info('Triggering immediate save after first click', {
				tournamentMode: this.isInTournamentMode(),
				tournamentGameId: this.tournamentGameId,
				gameId: game.id
			});
			this.saveGame().catch((err) => {
				logger.error('Immediate save after first click failed:', err);
			});
		}

		// Update cell reference after potential regeneration
		const currentCell = game.grid[row][col];

		// If mine, game over
		if (currentCell.isMine) {
			currentCell.isRevealed = true;
			currentCell.isExploded = true;
			game.cellsRevealed++;
			// Don't set game.status here - let completeGame() handle it
			this.completeGame(false);
			return;
		}

		// Reveal cell and cascade if empty (BFS)
		this.cascadeReveal(row, col);

		// Check win condition
		const totalCells = game.rows * game.cols;
		if (game.cellsRevealed === totalCells - game.minesCount) {
			// Don't set game.status here - let completeGame() handle it
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
			const next = queue.shift();

			// ✅ SAFETY: Guard against corrupted queue state
			if (!next) {
				logger.error('BFS queue returned undefined unexpectedly');
				break;
			}

			const { row, col } = next;
			const key = `${row},${col}`;

			// Skip if already visited
			if (visited.has(key)) {
				continue;
			}

			// ✅ SAFETY: Validate coordinates are within bounds
			if (row < 0 || row >= game.rows || col < 0 || col >= game.cols) {
				logger.warn('BFS encountered out-of-bounds coordinates:', { row, col });
				continue;
			}

			visited.add(key);

			const cell = game.grid[row]?.[col];

			// Skip invalid, flagged, mine, or already revealed cells
			if (!cell || cell.isFlagged || cell.isMine || cell.isRevealed) {
				continue;
			}

			// Reveal the cell
			cell.isRevealed = true;
			game.cellsRevealed++;

			// If cell has adjacent mines, stop cascading in this direction
			if (cell.adjacentMines > 0) {
				continue;
			}

			// Add valid neighbors to queue
			for (const [dRow, dCol] of NEIGHBOR_DIRECTIONS) {
				const newRow = row + dRow;
				const newCol = col + dCol;

				if (newRow >= 0 && newRow < game.rows && newCol >= 0 && newCol < game.cols) {
					const neighbor = game.grid[newRow][newCol];
					if (neighbor && !neighbor.isRevealed && !neighbor.isFlagged && !neighbor.isMine) {
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
				// Safe cell - reveal it (only if not already revealed by previous cascade)
				// ✅ FIX: Prevent double-counting if cascade from previous neighbor already revealed this cell
				if (!neighborCell.isRevealed) {
					neighborCell.isRevealed = true;
					game.cellsRevealed++;

					// Cascade if empty
					if (neighborCell.adjacentMines === 0) {
						this.cascadeReveal(neighbor.row, neighbor.col);
					}
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
	 * Use a hint to reveal a safe cell
	 * Costs ${HINT_COST_GIDOUILLES} gidouilles and applies ${HINT_PENALTY_PERCENTAGE}% penalty to final reward
	 * Maximum ${MAX_HINTS_PER_GAME} hints per game
	 *
	 * @returns Promise that resolves when hint is used successfully
	 */
	async useHint(): Promise<void> {
		if (!browser || !this.currentGame) {
			toaster.error('Aucune partie en cours');
			return;
		}

		const game = this.currentGame;

		// Validate game status
		if (game.status !== 'in_progress') {
			toaster.error('La partie doit être en cours');
			return;
		}

		// Check hint limit
		const hintsUsed = game.hintsUsed || 0;
		if (hintsUsed >= MAX_HINTS_PER_GAME) {
			toaster.error(`Maximum d'indices atteint (${MAX_HINTS_PER_GAME} par partie)`);
			return;
		}

		// Must be a student to use hints
		if (!this.shouldUseDatabase() || !game.id) {
			toaster.error("Vous devez être connecté en tant qu'élève pour utiliser les indices");
			return;
		}

		// Find a safe unrevealed cell
		const safeCells: { row: number; col: number }[] = [];
		for (let row = 0; row < game.rows; row++) {
			for (let col = 0; col < game.cols; col++) {
				const cell = game.grid[row][col];
				if (!cell.isRevealed && !cell.isFlagged && !cell.isMine) {
					safeCells.push({ row, col });
				}
			}
		}

		if (safeCells.length === 0) {
			toaster.error('Aucune cellule sûre disponible');
			return;
		}

		this.isLoading = true;
		try {
			// Call API to spend gidouilles
			const response = await fetch(`/api/games/minesweeper/${game.id}/hint`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Échec de l'utilisation de l'indice");
			}

			const result = await response.json();

			// Select a random safe cell
			const randomIndex = Math.floor(Math.random() * safeCells.length);
			const selectedCell = safeCells[randomIndex];
			const cell = game.grid[selectedCell.row][selectedCell.col];

			// Reveal the cell (defensive check in case it was already revealed)
			// ✅ FIX: Prevent double-counting if cell was somehow revealed between selection and now
			if (!cell.isRevealed) {
				cell.isRevealed = true;
				game.cellsRevealed++;

				// Cascade reveal if it's an empty cell
				if (cell.adjacentMines === 0) {
					this.cascadeReveal(selectedCell.row, selectedCell.col);
				}
			}

			// Increment hints counter
			game.hintsUsed = hintsUsed + 1;

			// Check win condition
			if (this.checkWinCondition()) {
				this.handleWin();
			} else {
				// Trigger reactivity
				this.currentGame = { ...game };
			}

			// Show appropriate toast based on hint source
			if (result.source === 'item') {
				toaster.success(
					`Indice utilisé (${game.hintsUsed}/${MAX_HINTS_PER_GAME}). Aucune pénalité !`
				);
				// Decrement local hint item count
				if (this.hintItemsAvailable > 0) {
					this.hintItemsAvailable--;
				}
			} else {
				toaster.success(
					`Indice utilisé (${game.hintsUsed}/${MAX_HINTS_PER_GAME}). Pénalité de ${HINT_PENALTY_PERCENTAGE}% appliquée sur la récompense finale.`
				);
			}

			logger.info(
				`Hint used. Source: ${result.source || 'gidouilles'}. Hints remaining: ${MAX_HINTS_PER_GAME - game.hintsUsed}. Gidouilles spent: ${result.gidouilles_spent || 0}`
			);
		} catch (err) {
			const rawMessage = err instanceof Error ? err.message : "Échec de l'utilisation de l'indice";
			logger.error('Failed to use hint:', err);

			// Map common API errors to user-friendly messages
			let userMessage = rawMessage;
			if (rawMessage.toLowerCase().includes('insufficient') || rawMessage.includes('gidouilles')) {
				userMessage = `Gidouilles insuffisantes (${HINT_COST_GIDOUILLES} requis)`;
			} else if (rawMessage.toLowerCase().includes('maximum') || rawMessage.includes('limite')) {
				userMessage = `Maximum d'indices atteint (${MAX_HINTS_PER_GAME} par partie)`;
			} else if (
				rawMessage.toLowerCase().includes('not found') ||
				rawMessage.includes('introuvable')
			) {
				userMessage = 'Partie introuvable';
			}

			toaster.error(userMessage);
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Fetch the count of hint items available in student's inventory
	 * Updates `hintItemsAvailable` state
	 *
	 * @returns Promise that resolves with the count of available hint items
	 */
	async fetchHintItemCount(): Promise<number> {
		if (!browser || !this.shouldUseDatabase()) {
			this.hintItemsAvailable = 0;
			return 0;
		}

		try {
			// Query for minesweeper_hint items in student's inventory
			const { data, error } = await this.supabase!.from('student_item_inventory')
				.select(
					`
					quantity,
					shop_item_templates!inner(internal_name)
				`
				)
				.eq('student_id', this.user!.id)
				.eq('shop_item_templates.internal_name', HINT_ITEM_INTERNAL_NAME)
				.eq('is_locked', false)
				.gt('quantity', 0);

			if (error) {
				logger.error('Failed to fetch hint item count:', error);
				this.hintItemsAvailable = 0;
				return 0;
			}

			// Sum up all quantities (should typically be 1 row but could be multiple)
			const totalCount = data?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
			this.hintItemsAvailable = totalCount;

			logger.info(`Hint items available: ${totalCount}`);
			return totalCount;
		} catch (err) {
			logger.error('Failed to fetch hint item count:', err);
			this.hintItemsAvailable = 0;
			return 0;
		}
	}

	/**
	 * Refresh hint item count (call after purchasing items from shop)
	 */
	async refreshHintItemCount(): Promise<void> {
		await this.fetchHintItemCount();
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
	 * Start auto-save system (saves every 10s)
	 * - Students: saves to database
	 * - Public/teachers/admins: saves to localStorage
	 */
	private startAutoSave(): void {
		if (!browser || this.autoSaveInterval) {
			return;
		}

		this.autoSaveInterval = setInterval(() => {
			this.saveGame().catch((err) => {
				logger.error('Auto-save failed:', err);
			});
		}, AUTOSAVE_INTERVAL);

		logger.info('Auto-save started (10s interval)');
	}

	/**
	 * Stop auto-save system
	 */
	private stopAutoSave(): void {
		if (this.autoSaveInterval) {
			clearInterval(this.autoSaveInterval);
			this.autoSaveInterval = null;
		}
		logger.info('Auto-save stopped');
	}

	/**
	 * Save game state
	 */
	async saveGame(): Promise<void> {
		if (!browser || !this.currentGame) {
			return;
		}

		const game = this.currentGame;

		// Guard: Skip auto-save for completed games
		// Only save games that are still in progress to avoid RLS policy violations
		// Completed games are saved via completeGame() RPC functions
		if (game.status !== 'in_progress') {
			logger.info('Skipping save for non-in-progress game:', { status: game.status });
			return;
		}

		try {
			if (this.shouldUseDatabase() && game.id) {
				// Save to database for students
				const gridState = this.gridToDTO(game.grid);

				// Check if we're in tournament mode
				if (this.isInTournamentMode() && this.tournamentGameId) {
					// Save to tournament games table
					// Note: tournament_games table only has grid_state column for auto-save
					const updatePayload = {
						grid_state: gridState as unknown as Json
					};

					const { error } = await this.supabase!.from('minesweeper_tournament_games')
						.update(updatePayload)
						.eq('id', this.tournamentGameId);

					if (error) {
						throw error;
					}

					logger.info('Tournament game saved to database:', {
						gameId: this.tournamentGameId,
						cellsRevealed: game.cellsRevealed
					});
				} else {
					// Save to regular games table
					// Build update payload (exclude time_seconds - it's server-controlled)
					// The complete_minesweeper_game() function sets time_seconds when game ends
					const updatePayload: {
						grid_state: Json;
						status: DatabaseGameStatus;
						flags_used: number;
						cells_revealed: number;
						hints_used: number;
					} = {
						grid_state: gridState as unknown as Json,
						status: this.toDbStatus(game.status),
						flags_used: game.flagsUsed,
						cells_revealed: game.cellsRevealed,
						hints_used: game.hintsUsed || 0
					};

					const { error } = await this.supabase!.from('minesweeper_games')
						.update(updatePayload)
						.eq('id', game.id);

					if (error) {
						throw error;
					}

					logger.info('Regular game saved to database:', {
						gameId: game.id,
						cellsRevealed: game.cellsRevealed
					});
				}
			} else {
				// Save to localStorage for public users, teachers, and admins
				this.saveToLocalStorage(game);
				logger.info('Game saved to localStorage');
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
	 * Automatically detects tournament mode and routes to appropriate handler
	 *
	 * @param won - Whether the player won
	 */
	async completeGame(won: boolean): Promise<void> {
		if (!browser || !this.currentGame) {
			return;
		}

		// Route to tournament completion if in tournament mode
		if (this.isInTournamentMode()) {
			return this.completeTournamentGame(won);
		}

		const game = this.currentGame;

		// Guard: Prevent double-completion
		if (game.status !== 'in_progress') {
			logger.warn('Attempted to complete non-active game:', { status: game.status });
			return;
		}

		// Stop timers
		this.stopTimer();
		this.stopAutoSave();

		// Update game status
		game.status = won ? 'won' : 'lost';

		try {
			if (this.shouldUseDatabase() && game.id) {
				const gridState = this.gridToDTO(game.grid);

				if (won) {
					// WIN: Call API endpoint to validate grid, calculate rewards, and update achievements
					// Using API instead of direct RPC for better auth handling (401 on session expiry)
					const response = await fetch(`/api/games/minesweeper/${game.id}/complete`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ grid_state: gridState })
					});

					// Handle session expiry (401) with user-friendly message
					if (response.status === 401) {
						toaster.error('Session expirée. Veuillez vous reconnecter.');
						logger.warn('Session expired during game completion');
						// Show victory modal without rewards (game was won locally)
						this.showVictoryModalWithoutRewards(game);
						return;
					}

					if (!response.ok) {
						const errorData = await response.json().catch(() => ({}));
						throw new Error(errorData.message || `Erreur ${response.status}`);
					}

					const data = await response.json();

					if (data.success) {
						const gidouilles = data.gidouilles || 0;
						const points = data.points || 0;

						// Store newly unlocked achievements for modal display
						if (data.achievements && data.achievements.length > 0) {
							this.newlyUnlockedAchievements = data.achievements;
							logger.info('Unlocked achievements:', data.achievements);
						}

						// Get breakdown or create default
						const breakdown: RewardBreakdown = data.breakdown || {
							cycle: null,
							base_reward: DIFFICULTY_CONFIGS[game.difficulty].baseGidouilles,
							reference_time: DIFFICULTY_CONFIGS[game.difficulty].baseTime,
							time_seconds: game.timeElapsed,
							time_mult: 1.0,
							hints_used: game.hintsUsed || 0,
							hints_from_items: 0,
							hint_penalty: 0,
							theoretical_reward: 0,
							actual_reward: 0,
							is_first_win_of_day: false,
							week_best_reward: 0
						};

						// Show victory modal with detailed breakdown
						modalStack.push({
							component: VictoryModal,
							props: {
								gidouilles,
								points,
								breakdown,
								difficulty: game.difficulty,
								achievements: this.newlyUnlockedAchievements,
								isPublicUser: false,
								onPlayAgain: () => {
									modalStack.clear();
									this.startNewGame(game.difficulty);
								},
								onClose: () => modalStack.pop()
							},
							canDismiss: true
						});
					} else {
						// Fallback if response format is unexpected
						logger.warn('Unexpected API response format:', data);
						this.showVictoryModalWithoutRewards(game);
					}

					logger.info('Game completed (win):', { gameId: game.id });
				} else {
					// LOSS: Call SECURITY DEFINER RPC to record loss with server-side time calculation
					// RPC handles: ownership verification, server-side time calculation, grid validation, audit trail
					const { data, error } = await this.supabase!.rpc('record_minesweeper_loss', {
						p_game_id: game.id,
						p_grid_state: gridState as unknown as Json
					});

					if (error) {
						throw error;
					}

					// Reveal all mines on loss
					this.revealAllMines();

					// Calculate total cells (non-mine cells)
					const config = DIFFICULTY_CONFIGS[game.difficulty];
					const totalCells = config.rows * config.cols - config.mines;

					// Show defeat modal
					modalStack.push({
						component: DefeatModal,
						props: {
							difficulty: game.difficulty,
							timeElapsed: game.timeElapsed,
							cellsRevealed: game.cellsRevealed,
							totalCells,
							onPlayAgain: () => {
								modalStack.clear();
								this.startNewGame(game.difficulty);
							},
							onClose: () => modalStack.pop()
						},
						canDismiss: true
					});

					logger.info('Game completed (loss):', {
						gameId: game.id,
						success: Array.isArray(data) && data[0]?.success
					});
				}
			} else {
				// Public user - show modal without gidouilles
				const config = DIFFICULTY_CONFIGS[game.difficulty];
				const totalCells = config.rows * config.cols - config.mines;

				if (won) {
					// Create a simple breakdown for public users
					const publicBreakdown: RewardBreakdown = {
						cycle: null,
						base_reward: config.baseGidouilles,
						reference_time: config.baseTime,
						time_seconds: game.timeElapsed,
						time_mult: 1.0,
						hints_used: game.hintsUsed || 0,
						hints_from_items: 0,
						hint_penalty: 0,
						theoretical_reward: 0,
						actual_reward: 0,
						is_first_win_of_day: false,
						week_best_reward: 0
					};

					modalStack.push({
						component: VictoryModal,
						props: {
							gidouilles: 0,
							points: 0,
							breakdown: publicBreakdown,
							difficulty: game.difficulty,
							achievements: [],
							isPublicUser: true,
							onPlayAgain: () => {
								modalStack.clear();
								this.startNewGame(game.difficulty);
							},
							onClose: () => modalStack.pop()
						},
						canDismiss: true
					});
				} else {
					// Reveal all mines on loss
					this.revealAllMines();

					modalStack.push({
						component: DefeatModal,
						props: {
							difficulty: game.difficulty,
							timeElapsed: game.timeElapsed,
							cellsRevealed: game.cellsRevealed,
							totalCells,
							onPlayAgain: () => {
								modalStack.clear();
								this.startNewGame(game.difficulty);
							},
							onClose: () => modalStack.pop()
						},
						canDismiss: true
					});
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

			// Show error toast for students (database save failed)
			// Keep toasts only for errors as per user request
			if (this.shouldUseDatabase() && game.id) {
				toaster.error('Erreur lors de la sauvegarde. Verifiez votre connexion.');

				// Still show modal for the result (but user knows it wasn't saved)
				const config = DIFFICULTY_CONFIGS[game.difficulty];
				const totalCells = config.rows * config.cols - config.mines;

				if (won) {
					const errorBreakdown: RewardBreakdown = {
						cycle: null,
						base_reward: config.baseGidouilles,
						reference_time: config.baseTime,
						time_seconds: game.timeElapsed,
						time_mult: 1.0,
						hints_used: game.hintsUsed || 0,
						hints_from_items: 0,
						hint_penalty: 0,
						theoretical_reward: 0,
						actual_reward: 0,
						is_first_win_of_day: false,
						week_best_reward: 0
					};

					modalStack.push({
						component: VictoryModal,
						props: {
							gidouilles: 0,
							points: 0,
							breakdown: errorBreakdown,
							difficulty: game.difficulty,
							achievements: [],
							isPublicUser: true, // Treat as public since save failed
							onPlayAgain: () => {
								modalStack.clear();
								this.startNewGame(game.difficulty);
							},
							onClose: () => modalStack.pop()
						},
						canDismiss: true
					});
				} else {
					this.revealAllMines();
					modalStack.push({
						component: DefeatModal,
						props: {
							difficulty: game.difficulty,
							timeElapsed: game.timeElapsed,
							cellsRevealed: game.cellsRevealed,
							totalCells,
							onPlayAgain: () => {
								modalStack.clear();
								this.startNewGame(game.difficulty);
							},
							onClose: () => modalStack.pop()
						},
						canDismiss: true
					});
				}
			} else {
				// Public users, teachers, and admins - no save expected, show modal normally
				const config = DIFFICULTY_CONFIGS[game.difficulty];
				const totalCells = config.rows * config.cols - config.mines;

				if (won) {
					const fallbackBreakdown: RewardBreakdown = {
						cycle: null,
						base_reward: config.baseGidouilles,
						reference_time: config.baseTime,
						time_seconds: game.timeElapsed,
						time_mult: 1.0,
						hints_used: game.hintsUsed || 0,
						hints_from_items: 0,
						hint_penalty: 0,
						theoretical_reward: 0,
						actual_reward: 0,
						is_first_win_of_day: false,
						week_best_reward: 0
					};

					modalStack.push({
						component: VictoryModal,
						props: {
							gidouilles: 0,
							points: 0,
							breakdown: fallbackBreakdown,
							difficulty: game.difficulty,
							achievements: [],
							isPublicUser: true,
							onPlayAgain: () => {
								modalStack.clear();
								this.startNewGame(game.difficulty);
							},
							onClose: () => modalStack.pop()
						},
						canDismiss: true
					});
				} else {
					this.revealAllMines();
					modalStack.push({
						component: DefeatModal,
						props: {
							difficulty: game.difficulty,
							timeElapsed: game.timeElapsed,
							cellsRevealed: game.cellsRevealed,
							totalCells,
							onPlayAgain: () => {
								modalStack.clear();
								this.startNewGame(game.difficulty);
							},
							onClose: () => modalStack.pop()
						},
						canDismiss: true
					});
				}
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
	 * Show victory modal without rewards (used when session expired or API error)
	 * The game was won locally but couldn't be recorded server-side
	 */
	private showVictoryModalWithoutRewards(game: GameState): void {
		const config = DIFFICULTY_CONFIGS[game.difficulty];
		const fallbackBreakdown: RewardBreakdown = {
			cycle: null,
			base_reward: config.baseGidouilles,
			reference_time: config.baseTime,
			time_seconds: game.timeElapsed,
			time_mult: 1.0,
			hints_used: game.hintsUsed || 0,
			hints_from_items: 0,
			hint_penalty: 0,
			theoretical_reward: 0,
			actual_reward: 0,
			is_first_win_of_day: false,
			week_best_reward: 0
		};

		modalStack.push({
			component: VictoryModal,
			props: {
				gidouilles: 0,
				points: 0,
				breakdown: fallbackBreakdown,
				difficulty: game.difficulty,
				achievements: [],
				isPublicUser: true, // Treat as public since save failed
				onPlayAgain: () => {
					modalStack.clear();
					this.startNewGame(game.difficulty);
				},
				onClose: () => modalStack.pop()
			},
			canDismiss: true
		});
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
			if (this.shouldUseDatabase()) {
				// Load from database for students
				const { data, error } = await this.supabase!.from('minesweeper_games')
					.select('*')
					.eq('student_id', this.user!.id)
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

				// Parse difficulty and status with proper type checking
				const difficulty = data.difficulty as Difficulty;
				const status = data.status as GameStatus;
				const config = DIFFICULTY_CONFIGS[difficulty];

				// Convert GridStateDTO from database to internal CellState[][]
				const grid = this.dtoToGrid(
					data.grid_state as unknown as import('$lib/types/minesweeper').GridStateDTO
				);

				// Calculate elapsed time from started_at for in-progress games
				let timeElapsed = 0;
				if (data.started_at) {
					const startedAt = new Date(data.started_at);
					timeElapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
				}

				const game: GameState = {
					id: data.id,
					difficulty,
					status,
					grid,
					rows: config.rows,
					cols: config.cols,
					minesCount: config.mines,
					flagsUsed: this.countFlags(grid),
					cellsRevealed: this.countRevealed(grid),
					timeElapsed,
					startedAt: data.started_at ? new Date(data.started_at) : undefined
				};

				this.currentGame = game;

				// Resume timer if game is in progress
				if (game.status === 'in_progress') {
					this.startTimer();
					this.startAutoSave();
				}

				logger.info('Loaded saved game from database:', data.id);
			} else {
				// Load from localStorage for public users, teachers, and admins
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
	 * Check if coordinates are within grid bounds
	 *
	 * @param row - Row coordinate
	 * @param col - Column coordinate
	 * @returns True if cell is valid
	 */
	private isValidCell(row: number, col: number): boolean {
		if (!this.currentGame) return false;
		return row >= 0 && row < this.currentGame.rows && col >= 0 && col < this.currentGame.cols;
	}

	/**
	 * Check win condition
	 *
	 * @returns True if player has won
	 */
	private checkWinCondition(): boolean {
		if (!this.currentGame) return false;
		const game = this.currentGame;
		const totalCells = game.rows * game.cols;
		return game.cellsRevealed === totalCells - game.minesCount;
	}

	/**
	 * Handle win
	 */
	private handleWin(): void {
		if (!this.currentGame) return;
		// Don't set status here - let completeGame() handle it
		this.completeGame(true);
	}

	/**
	 * Handle loss
	 */
	private handleLoss(): void {
		if (!this.currentGame) return;
		// Don't set status here - let completeGame() handle it
		this.completeGame(false);
	}

	/**
	 * Clear newly unlocked achievements (after toasts are dismissed)
	 */
	clearAchievements(): void {
		this.newlyUnlockedAchievements = [];
	}

	// ============================================================================
	// Tournament Mode Methods
	// ============================================================================

	/**
	 * Check if currently in tournament mode
	 * @returns True if a tournament game is active
	 */
	isInTournamentMode(): boolean {
		return this.tournamentId !== null && this.tournamentGameId !== null;
	}

	/**
	 * Start a new tournament game
	 *
	 * @param tournamentId - Tournament ID
	 * @param difficulty - Tournament difficulty (from tournament config)
	 * @returns Promise that resolves with game info or throws on error
	 */
	async startTournamentGame(
		tournamentId: string,
		difficulty: Difficulty
	): Promise<TournamentGameStartResponse> {
		if (!browser) {
			throw new Error('Cannot start tournament game on server');
		}

		if (!this.shouldUseDatabase()) {
			throw new Error('Must be logged in as student to play tournament');
		}

		this.isLoading = true;
		this.error = null;

		try {
			// Call API to start tournament game
			const response = await fetch(
				`/api/games/minesweeper/tournaments/${tournamentId}/games/start`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' }
				}
			);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || `Erreur ${response.status}`);
			}

			const gameData: TournamentGameStartResponse = await response.json();

			// Store tournament context
			this.tournamentId = tournamentId;
			this.tournamentGameId = gameData.game_id;
			this.tournamentGameNumber = gameData.game_number;
			this.tournamentDifficulty = difficulty;

			// Stop existing timers
			this.stopTimer();
			this.stopAutoSave();

			// Get difficulty config
			const config = DIFFICULTY_CONFIGS[difficulty];

			// Generate grid with tournament seed (same for all players)
			const grid = this.generateGrid(config, undefined, undefined, gameData.seed);

			// Create game state
			const newGame: GameState = {
				id: gameData.game_id,
				difficulty,
				status: 'not_started',
				grid,
				rows: config.rows,
				cols: config.cols,
				minesCount: config.mines,
				flagsUsed: 0,
				cellsRevealed: 0,
				timeElapsed: 0,
				startedAt: undefined,
				seed: gameData.seed,
				hintsUsed: 0 // No hints in tournament mode
			};

			this.currentGame = newGame;

			logger.info('Started tournament game:', {
				tournamentId,
				gameId: gameData.game_id,
				gameNumber: gameData.game_number,
				seed: gameData.seed
			});

			toaster.success(`Partie ${gameData.game_number} du tournoi démarrée !`);

			return gameData;
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Échec du démarrage de la partie';
			logger.error('Failed to start tournament game:', err);
			this.error = message;
			toaster.error(message);
			throw err;
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Resume an in-progress tournament game
	 *
	 * @param tournamentId - Tournament ID
	 * @param difficulty - Tournament difficulty
	 * @param gameData - In-progress game data from server
	 */
	resumeTournamentGame(
		tournamentId: string,
		difficulty: Difficulty,
		gameData: {
			id: string;
			seed: string;
			game_number: number;
			started_at: string;
			grid_state: import('$lib/types/minesweeper').GridStateDTO;
			time_seconds: number | null;
		}
	): void {
		if (!browser) {
			throw new Error('Cannot resume tournament game on server');
		}

		if (!this.shouldUseDatabase()) {
			throw new Error('Must be logged in as student to play tournament');
		}

		// Stop existing timers
		this.stopTimer();
		this.stopAutoSave();

		// Store tournament context
		this.tournamentId = tournamentId;
		this.tournamentGameId = gameData.id;
		this.tournamentGameNumber = gameData.game_number;
		this.tournamentDifficulty = difficulty;

		// Get difficulty config
		const config = DIFFICULTY_CONFIGS[difficulty];

		// Restore grid from saved state
		const grid = this.dtoToGrid(gameData.grid_state);

		// Calculate elapsed time from started_at
		let timeElapsed = 0;
		if (gameData.started_at) {
			const startedAt = new Date(gameData.started_at);
			timeElapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
		}

		// Count revealed cells
		const cellsRevealed = this.countRevealed(grid);

		// Create game state
		const resumedGame: GameState = {
			id: gameData.id,
			difficulty,
			status: cellsRevealed > 0 ? 'in_progress' : 'not_started',
			grid,
			rows: config.rows,
			cols: config.cols,
			minesCount: config.mines,
			flagsUsed: this.countFlags(grid),
			cellsRevealed,
			timeElapsed,
			startedAt: gameData.started_at ? new Date(gameData.started_at) : undefined,
			seed: gameData.seed,
			hintsUsed: 0
		};

		this.currentGame = resumedGame;

		// Start timer if game was already in progress
		if (resumedGame.status === 'in_progress') {
			this.startTimer();
			this.startAutoSave();
		}

		logger.info('Resumed tournament game:', {
			tournamentId,
			gameId: gameData.id,
			gameNumber: gameData.game_number,
			timeElapsed,
			cellsRevealed
		});

		toaster.info(`Partie ${gameData.game_number} reprise`);
	}

	/**
	 * Complete current tournament game
	 * Called when game is won or lost
	 *
	 * @param won - Whether the player won
	 */
	async completeTournamentGame(won: boolean): Promise<void> {
		if (!browser || !this.currentGame) {
			return;
		}

		if (!this.isInTournamentMode()) {
			logger.error('Cannot complete tournament game: not in tournament mode');
			return;
		}

		const game = this.currentGame;

		// Guard: Prevent double-completion
		if (game.status !== 'in_progress') {
			logger.warn('Attempted to complete non-active tournament game:', { status: game.status });
			return;
		}

		// Stop timers
		this.stopTimer();
		this.stopAutoSave();

		// Update game status
		game.status = won ? 'won' : 'lost';

		// Mark as completing (keeps board visible during API call)
		this.isCompletingGame = true;

		try {
			const gridState = this.gridToDTO(game.grid);

			// Call tournament game complete API
			const response = await fetch(
				`/api/games/minesweeper/tournaments/${this.tournamentId}/games/${this.tournamentGameId}/complete`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						status: won ? 'won' : 'lost',
						time_seconds: game.timeElapsed,
						grid_state: gridState
					})
				}
			);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || `Erreur ${response.status}`);
			}

			// Parse the response to get 3BV scoring data
			const responseData = (await response.json()) as {
				success: boolean;
				status: string;
				grid_3bv: number | null;
				score: number | null;
				actual_3bvs: number | null;
			};

			if (won) {
				// Show tournament victory modal with 3BV-based scoring
				modalStack.push({
					component: TournamentVictoryModal,
					props: {
						timeSeconds: game.timeElapsed,
						gameNumber: this.tournamentGameNumber || 1,
						difficulty: game.difficulty,
						grid3bv: responseData.grid_3bv ?? 0,
						score: responseData.score ?? 0,
						actual3bvs: responseData.actual_3bvs ?? 0,
						onPlayAgain: () => {
							modalStack.clear();
							// Start new tournament game with same tournament/difficulty
							if (this.tournamentId && this.tournamentDifficulty) {
								this.startTournamentGame(this.tournamentId, this.tournamentDifficulty);
							}
						},
						onBackToTournament: () => {
							modalStack.clear();
							this.exitTournamentMode();
						}
					},
					canDismiss: true
				});
			} else {
				// Reveal all mines on loss
				this.revealAllMines();

				// Show tournament defeat modal
				const config = DIFFICULTY_CONFIGS[game.difficulty];
				const totalCells = config.rows * config.cols - config.mines;

				modalStack.push({
					component: TournamentDefeatModal,
					props: {
						timeElapsed: game.timeElapsed,
						cellsRevealed: game.cellsRevealed,
						totalCells,
						gameNumber: this.tournamentGameNumber || 1,
						difficulty: game.difficulty,
						onPlayAgain: () => {
							modalStack.clear();
							// Start new tournament game
							if (this.tournamentId && this.tournamentDifficulty) {
								this.startTournamentGame(this.tournamentId, this.tournamentDifficulty);
							}
						},
						onBackToTournament: () => {
							modalStack.clear();
							this.exitTournamentMode();
						}
					},
					canDismiss: true
				});
			}

			// Modal is now visible, completion is done
			this.isCompletingGame = false;

			logger.info('Tournament game completed:', {
				tournamentId: this.tournamentId,
				gameId: this.tournamentGameId,
				won,
				timeSeconds: game.timeElapsed
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Échec de la sauvegarde';
			logger.error('Failed to complete tournament game:', err);
			this.error = message;
			this.isCompletingGame = false;
			toaster.error('Erreur lors de la sauvegarde. Votre partie a peut-être été enregistrée.');
		}

		// Trigger reactivity
		this.currentGame = { ...game };
	}

	/**
	 * Abandon current tournament game
	 * Used when player wants to quit without finishing
	 */
	async abandonTournamentGame(): Promise<void> {
		if (!browser || !this.isInTournamentMode()) {
			return;
		}

		this.isLoading = true;

		try {
			// Call API to mark game as abandoned
			const response = await fetch(
				`/api/games/minesweeper/tournaments/${this.tournamentId}/games/${this.tournamentGameId}/abandon`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' }
				}
			);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || `Erreur ${response.status}`);
			}

			logger.info('Tournament game abandoned:', {
				tournamentId: this.tournamentId,
				gameId: this.tournamentGameId
			});

			// Clean up
			this.exitTournamentMode();

			toaster.info('Partie abandonnée');
		} catch (err) {
			const message = err instanceof Error ? err.message : "Échec de l'abandon";
			logger.error('Failed to abandon tournament game:', err);
			this.error = message;
			toaster.error(message);
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Exit tournament mode and clean up state
	 */
	exitTournamentMode(): void {
		this.stopTimer();
		this.stopAutoSave();
		this.currentGame = null;
		this.tournamentId = null;
		this.tournamentGameId = null;
		this.tournamentGameNumber = null;
		this.tournamentDifficulty = null;
		this.isCompletingGame = false;
		this.error = null;

		logger.info('Exited tournament mode');
	}

	/**
	 * Cleanup intervals and state
	 * ⚠️ IMPORTANT: This is now called automatically on beforeunload,
	 * but components should still call it in onDestroy() for proper cleanup.
	 */
	cleanup(): void {
		if (!browser) return;

		this.stopTimer();
		this.stopAutoSave();
		this.currentGame = null;
		this.error = null;
		this.isCompletingGame = false;
		this.newlyUnlockedAchievements = [];
		this.hintItemsAvailable = 0;

		// Clear tournament state
		this.tournamentId = null;
		this.tournamentGameId = null;
		this.tournamentGameNumber = null;
		this.tournamentDifficulty = null;

		// Remove beforeunload listener if exists
		if (this.cleanupHandler) {
			window.removeEventListener('beforeunload', this.cleanupHandler);
			this.cleanupHandler = null;
		}

		logger.info('Minesweeper store cleaned up');
	}
}

export const minesweeperStore = new MinesweeperStore();
