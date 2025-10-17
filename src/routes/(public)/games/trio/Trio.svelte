<script lang="ts">
	/**
	 * Trio Game Component
	 *
	 * A math puzzle game where players select 3 aligned numbers from a grid
	 * to match a target equation: a × b ± c = target
	 *
	 * Game Rules:
	 * - Select 3 cells that are aligned (horizontal, vertical, or diagonal)
	 * - The cells can have gaps between them
	 * - Toggle between + and - operations
	 * - Match the target value to win
	 */

	import Tile from './Tile.svelte';
	import { X, Plus, Minus, HelpCircle } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import confetti from 'canvas-confetti';
	import { untrack } from 'svelte';

	// Props
	let { size = 9 }: { size?: number } = $props();

	// Type Definitions
	type Cell = {
		n: number;       // Number displayed (1-9)
		status: string;  // 'selected', 'selected-third', 'not_available', or ''
	};

	type Position = {
		i: number;  // Row index
		j: number;  // Column index
	};

	type Grid = Cell[][];
	type Target = {
		op: string;           // Operation: '+' or '-'
		value: number;        // Target value to match
		positions: Position[]; // The 3 cells that form the solution
	};

	type Targets = number[];

	// Constants
	const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; // Column labels

	// State Variables
	let grid: Grid = $state([]);  // The game grid (size × size)

	// Array to track used target values (prevents duplicates across games)
	// IMPORTANT: Cleared in changeGrid() to prevent infinite loops
	const targets: Targets = [];

	let target: Target = $state({
		positions: [],
		op: Math.random() < 0.5 ? '+' : '-',
		value: -1
	});

	let result: number | null = $state(null);  // Current equation result
	let op = $state('+');                       // User's selected operation
	let win = $state(false);                    // Whether player has won
	let selecteds: Position[] = $state([]);     // Currently selected cells (max 3)
	let gridSize = $state(size);                // Current grid dimensions

	/**
	 * Derived State - Dynamic grid columns
	 * Creates CSS grid-template-columns: repeat(gridSize + 1, minmax(0, 1fr))
	 * +1 accounts for row label column
	 */
	let gridTemplateColumns = $derived(`repeat(${gridSize + 1}, minmax(0, 1fr))`);

	/**
	 * Effect: Watch for grid size changes
	 *
	 * IMPORTANT: Uses untrack() to prevent infinite loops
	 * - Tracks `gridSize` changes (triggers when +/- buttons clicked)
	 * - Does NOT track state mutations inside changeGrid()
	 *
	 * Without untrack(), changeGrid() modifying `grid`, `win`, `result`, etc.
	 * would re-trigger this effect infinitely
	 */
	$effect(() => {
		const currentSize = gridSize; // Track gridSize dependency
		untrack(() => changeGrid(currentSize)); // Don't track state mutations
	});

	/**
	 * Effect: Calculate result when selection or operation changes
	 *
	 * Recalculates equation whenever:
	 * - User selects/deselects cells
	 * - User toggles the +/- operation
	 *
	 * Also checks if result matches target and sets win state
	 */
	$effect(() => {
		const newResult = calculateValue(selecteds, op);
		untrack(() => {
			result = newResult;
		});
	});

	/**
	 * Effect: Trigger confetti animation on win
	 * Fires confetti from center-bottom of screen
	 */
	$effect(() => {
		if (win) {
			confetti({
				particleCount: 100,
				spread: 70,
				origin: { y: 0.6 },
				colors: ['#ff3e00', '#40b3ff', '#676778']
			});
		}
	});

	/**
	 * Calculate the equation result from selected cells
	 *
	 * Formula: a × b ± c
	 * - a = first selected cell
	 * - b = second selected cell
	 * - c = third selected cell
	 * - Operation (± ) determined by `op` parameter
	 *
	 * Side Effect: Sets `win = true` if result matches target
	 *
	 * @param selecteds - Array of selected positions (needs exactly 3)
	 * @param op - Operation: '+' or '-'
	 * @returns Calculated value or null if < 3 selections
	 */
	function calculateValue(selecteds: Position[], op: string) {
		if (selecteds.length === 3) {
			const values = selecteds.map((selected) => grid[selected.i][selected.j].n);

			const value = values[0] * values[1] + (op === '+' ? values[2] : -values[2]);
			if (value === target.value) {
				win = true;
			}
			return value;
		}
		return null;
	}

	/**
	 * Generate a new grid with random numbers
	 *
	 * Creates a size × size grid where each cell contains:
	 * - A random number from 1-9
	 * - An empty status
	 *
	 * IMPORTANT: Clears `targets` array to prevent infinite loop in choseTarget()
	 *
	 * @param size - Grid dimensions (3-15)
	 */
	function changeGrid(size: number) {
		grid = [];
		// Clear targets array to prevent infinite loop accumulation
		// Without this, after many grids, choseTarget() can't find unique values
		targets.length = 0;

		for (let i = 0; i < size; i++) {
			grid[i] = [];
			for (let j = 0; j < size; j++) {
				grid[i][j] = {
					status: '',
					n: Math.floor(Math.random() * 9 + 1)
				};
			}
		}
		choseTarget();
	}

	/**
	 * Reveal the solution to the current puzzle
	 *
	 * Actions:
	 * - Highlights the 3 target cells
	 * - Sets the correct operation
	 * - Displays the target value
	 * - Marks puzzle as won
	 */
	function showSolution() {
		// Disable all cells
		for (let i = 0; i < gridSize; i++) {
			for (let j = 0; j < gridSize; j++) {
				grid[i][j].status = 'not_available';
			}
		}

		// Select the target positions
		selecteds = [...target.positions];
		selecteds.forEach((selected, i) => {
			grid[selected.i][selected.j].status = i === 2 ? 'selected-third' : 'selected';
		});

		// Set correct operation and result
		op = target.op;
		result = target.value;
		win = true;
	}

	/**
	 * Toggle between addition and subtraction
	 * User can click the +/- button to switch operations
	 */
	function toggleOp() {
		op = op === '+' ? '-' : '+';
	}

	/**
	 * Handle cell click - Select/deselect cells and update available moves
	 *
	 * Selection Logic:
	 * 1. Click selected cell → Deselect it
	 * 2. Click available cell → Select it (max 3)
	 * 3. After each selection, update which cells can be clicked next
	 *
	 * Alignment Rules:
	 * - 1st cell: Can select any cell within 2 steps (horizontally, vertically, diagonally)
	 * - 2nd cell: Can select cells that continue the same direction OR create gaps
	 * - 3rd cell: Must be aligned with first two cells
	 *
	 * @param i - Row index of clicked cell
	 * @param j - Column index of clicked cell
	 */
	function handleClick(i: number, j: number) {
		// Clear all cell statuses
		for (let i = 0; i < gridSize; i++) {
			for (let j = 0; j < gridSize; j++) {
				grid[i][j].status = '';
			}
		}

		// Toggle selection if clicking already selected cell
		if (selecteds.some((selected) => selected.j === j && selected.i === i)) {
			selecteds = selecteds.filter((selected) => !(selected.j === j && selected.i === i));
		} else if (selecteds.length < 3) {
			// Add cell to selection
			selecteds.push({ i, j });
			selecteds = selecteds;
		}

		// After 2 cells selected: Mark valid positions for 3rd cell
		if (selecteds.length === 2) {
			const min_i = Math.min(selecteds[0].i, selecteds[1].i);
			const max_i = Math.max(selecteds[0].i, selecteds[1].i);
			const min_j = Math.min(selecteds[0].j, selecteds[1].j);
			const max_j = Math.max(selecteds[0].j, selecteds[1].j);

			for (let i = 0; i < gridSize; i++) {
				for (let j = 0; j < gridSize; j++) {
					if (
						!(
							// il y a un trou
							(
								(min_j < j && j < max_j && min_i < i && i < max_i) ||
								(min_j === max_j && j === min_j && min_i < i && i < max_i) ||
								(min_i === max_i && i === min_i && min_j < j && j < max_j) ||
								// pas de trou
								// les éléments se suivent sous la même progression

								(max_j - min_j <= 1 &&
									max_i - min_i <= 1 &&
									((selecteds[0].j - j === selecteds[1].j - selecteds[0].j &&
										selecteds[0].i - i === selecteds[1].i - selecteds[0].i) ||
										(j - selecteds[1].j === selecteds[1].j - selecteds[0].j &&
											i - selecteds[1].i === selecteds[1].i - selecteds[0].i)))
							)
						)
					) {
						grid[i][j].status = 'not_available';
					}
				}
			}
		} else if (selecteds.length === 1) {
			const selected = selecteds[0];
			for (let i = 0; i < gridSize; i++) {
				for (let j = 0; j < gridSize; j++) {
					if (
						!(
							Math.abs(selected.i - i) <= 2 &&
							Math.abs(selected.j - j) <= 2 &&
							(selected.j === j ||
								selected.i === i ||
								Math.abs(selected.j - j) === Math.abs(selected.i - i))
						)
					) {
						grid[i][j].status = 'not_available';
					}
				}
			}
		} else if (selecteds.length === 3) {
			for (let i = 0; i < gridSize; i++) {
				for (let j = 0; j < gridSize; j++) {
					grid[i][j].status = 'not_available';
				}
			}
		}

		selecteds.forEach((selected, i) => {
			grid[selected.i][selected.j].status = i === 2 ? 'selected-third' : 'selected';
		});
	}

	/**
	 * Choose a random target for the puzzle
	 *
	 * Algorithm:
	 * 1. Pick a random starting cell
	 * 2. Choose a random direction (8 possible: up, down, left, right, diagonals)
	 * 3. Move 2 steps in that direction to get 3 aligned cells
	 * 4. Calculate target value from those cells: a × b ± c
	 * 5. Retry if value is invalid (<0) or already used
	 *
	 * IMPORTANT: This does NOT pick a target value and search for cells
	 * Instead: Pick cells → Calculate value → Retry if duplicate
	 *
	 * Safety Features:
	 * - MAX_ATTEMPTS limit prevents infinite loops
	 * - Validates direction is still valid after each move
	 * - Only accepts positive values
	 * - Prevents duplicate target values across multiple games
	 */
	function choseTarget() {
		// Reset game state
		win = false;
		result = null;
		selecteds = [];

		// Clear all cell statuses
		for (let i = 0; i < gridSize; i++) {
			for (let j = 0; j < gridSize; j++) {
				grid[i][j].status = '';
			}
		}

		// Safety limit to prevent infinite loops
		// Without this, if targets array fills up, we can loop forever
		let attempts = 0;
		const MAX_ATTEMPTS = 1000;

		do {
			attempts++;

			// Initialize new target with random operation
			target = {
				positions: [],
				op: Math.random() < 0.5 ? '+' : '-',
				value: -1
			};

			// Step 1: Pick random starting cell
			let i = Math.floor(Math.random() * gridSize);
			let j = Math.floor(Math.random() * gridSize);
			target.positions.push({ i, j });

			// Step 2 & 3: Move 2 times in the same direction
			let direction;
			for (let count = 0; count < 2; count++) {
				// Determine which directions are valid from current position
				const directions = [];
				if (i > 0 && j > 0) directions.push('up-left');
				if (i > 0) directions.push('up');
				if (i > 0 && j < gridSize - 1) directions.push('up-right');
				if (j > 0) directions.push('left');
				if (j < gridSize - 1) directions.push('right');
				if (i < gridSize - 1 && j > 0) directions.push('down-left');
				if (i < gridSize - 1) directions.push('down');
				if (i < gridSize - 1 && j < gridSize - 1) directions.push('down-right');

				if (directions.length !== 0) {
					// Choose direction on first move, keep same direction on second move
					direction = direction || directions[Math.floor(Math.random() * directions.length)];

					// Verify the chosen direction is still valid
					if (directions.includes(direction)) {
						// Move one step in the chosen direction
						switch (direction) {
							case 'up-left':
								i--;
								j--;
								break;
							case 'up':
								i--;
								break;
							case 'up-right':
								i--;
								j++;
								break;
							case 'left':
								j--;
								break;
							case 'right':
								j++;
								break;
							case 'down-left':
								i++;
								j--;
								break;
							case 'down':
								i++;
								break;
							case 'down-right':
								i++;
								j++;
								break;
						}
						target.positions.push({ i, j });
					}
				}
			}

			// Step 4: Calculate target value from the 3 cells
			if (target.positions.length === 3) {
				const number1 = grid[target.positions[0].i][target.positions[0].j].n;
				const number2 = grid[target.positions[1].i][target.positions[1].j].n;
				const number3 = grid[target.positions[2].i][target.positions[2].j].n;

				// Formula: a × b ± c
				target.value =
					target.op === '+' ? number1 * number2 + number3 : number1 * number2 - number3;
			} else {
				// Failed to get 3 aligned cells, mark as invalid
				target.value = -1;
			}

			// Safety valve: Exit if too many attempts
			if (attempts >= MAX_ATTEMPTS) {
				console.warn('Max attempts reached, accepting duplicate target value');
				break;
			}

			// Step 5: Retry if value is negative or already used
		} while (target.value < 0 || targets.includes(target.value));

		// Store this target value to prevent future duplicates
		targets.push(target.value);
	}
</script>

<div class="flex flex-col items-center justify-around gap-8 lg:flex-row">
	<!-- Equation Display Column -->
	<div class="flex flex-col justify-center" style="font-family:'Baloo 2', sans-serif;">
		<div
			class="mx-4 my-2 flex h-16 w-16 items-center justify-center rounded-lg p-4 text-4xl font-bold md:h-20 md:w-20 md:text-5xl
				{selecteds.length >= 1
				? 'bg-secondary text-secondary-foreground'
				: 'bg-muted text-muted-foreground'}"
		>
			{#if selecteds.length >= 1}
				{grid[selecteds[0].i][selecteds[0].j].n}
			{:else}
				<HelpCircle class="h-8 w-8 md:h-10 md:w-10" />
			{/if}
		</div>

		<div
			class="mx-4 my-2 flex h-16 w-16 items-center justify-center rounded-lg p-4 text-4xl font-bold md:h-20 md:w-20 md:text-5xl"
		>
			<X class="h-8 w-8 md:h-10 md:w-10" />
		</div>

		<div
			class="mx-4 my-2 flex h-16 w-16 items-center justify-center rounded-lg p-4 text-4xl font-bold md:h-20 md:w-20 md:text-5xl
				{selecteds.length >= 2
				? 'bg-secondary text-secondary-foreground'
				: 'bg-muted text-muted-foreground'}"
		>
			{#if selecteds.length >= 2}
				{grid[selecteds[1].i][selecteds[1].j].n}
			{:else}
				<HelpCircle class="h-8 w-8 md:h-10 md:w-10" />
			{/if}
		</div>

		<button
			onclick={toggleOp}
			class="mx-4 my-2 flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg p-4 text-4xl font-bold transition-colors hover:bg-muted/80 md:h-20 md:w-20 md:text-5xl"
		>
			{#if op === '+'}
				<Plus class="h-8 w-8 md:h-10 md:w-10" />
			{:else}
				<Minus class="h-8 w-8 md:h-10 md:w-10" />
			{/if}
		</button>

		<div
			class="mx-4 my-2 flex h-16 w-16 items-center justify-center rounded-lg p-4 text-4xl font-bold md:h-20 md:w-20 md:text-5xl
				{selecteds.length >= 3 ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}"
		>
			{#if selecteds.length === 3}
				{grid[selecteds[2].i][selecteds[2].j].n}
			{:else}
				<HelpCircle class="h-8 w-8 md:h-10 md:w-10" />
			{/if}
		</div>

		<div
			class="mx-4 my-2 flex h-16 w-16 items-center justify-center rounded-lg p-4 text-4xl font-bold md:h-20 md:w-20 md:text-5xl"
		>
			=
		</div>

		{#if result !== null}
			<div
				class="mx-4 my-2 flex h-16 w-16 items-center justify-center rounded-lg p-4 text-4xl font-bold md:h-20 md:w-20 md:text-5xl
					{result === target.value
					? 'bg-success text-success-foreground'
					: 'bg-destructive text-destructive-foreground'}"
			>
				{result}
			</div>
		{:else}
			<div
				class="mx-4 my-2 flex h-16 w-16 items-center justify-center rounded-lg bg-muted p-4 text-4xl font-bold text-muted-foreground md:h-20 md:w-20 md:text-5xl"
			>
				<HelpCircle class="h-8 w-8 md:h-10 md:w-10" />
			</div>
		{/if}
	</div>

	<!-- Grid Column -->
	<div class="flex flex-col items-center">
		<div
			class="my-6 grid w-max gap-2 md:gap-4"
			style="grid-template-columns: {gridTemplateColumns}"
		>
			<div></div>
			{#each grid as _, i}
				<div
					class="flex h-12 w-12 items-center justify-center text-2xl md:h-16 md:w-16 md:text-3xl"
				>
					{letters[i]}
				</div>
			{/each}
			{#each grid as row, i}
				<div
					class="flex h-12 w-12 items-center justify-center text-2xl md:h-16 md:w-16 md:text-3xl"
				>
					{i + 1}
				</div>
				{#each row as cell, j}
					<Tile n={cell.n} onclick={() => handleClick(i, j)} status={cell.status} />
				{/each}
			{/each}
		</div>
	</div>

	<!-- Controls Column -->
	<div class="flex flex-col items-center justify-center gap-4">
		<Button onclick={choseTarget} class="w-40">Nouvelle cible</Button>

		<Button onclick={showSolution} class="w-40">Solution</Button>

		<Button onclick={() => changeGrid(gridSize)} class="w-40">Nouvelle grille</Button>

		<div class="flex items-center justify-center gap-2">
			<Button
				variant="outline"
				size="icon"
				onclick={() => {
					if (gridSize > 3) gridSize--;
				}}
				disabled={gridSize <= 3}
			>
				<Minus class="h-4 w-4" />
			</Button>
			<span class="w-16 text-center">Taille</span>
			<Button
				variant="outline"
				size="icon"
				onclick={() => {
					if (gridSize < 15) gridSize++;
				}}
				disabled={gridSize >= 15}
			>
				<Plus class="h-4 w-4" />
			</Button>
		</div>

		{#if target && target.value > 0}
			<div
				class="mt-4 flex h-24 w-24 items-center justify-center rounded-lg bg-primary text-6xl font-bold text-primary-foreground shadow-lg md:h-28 md:w-28 md:text-7xl"
				style="font-family:'Baloo 2', sans-serif;"
			>
				{target.value}
			</div>
		{/if}
	</div>
</div>
