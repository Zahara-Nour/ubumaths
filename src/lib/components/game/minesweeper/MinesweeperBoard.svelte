<script lang="ts">
	import type { GameState, CellState } from '$lib/types/minesweeper';
	import MinesweeperCell from './MinesweeperCell.svelte';
	import { mobileStore } from '$lib/stores/mobile.svelte';

	// Props
	let {
		difficulty,
		gameState,
		onCellReveal,
		onCellFlag,
		onCellChord,
		disabled = false
	}: {
		difficulty: 'beginner' | 'intermediate' | 'expert';
		gameState: GameState;
		onCellReveal: (row: number, col: number) => void;
		onCellFlag: (row: number, col: number) => void;
		onCellChord?: (row: number, col: number) => void;
		disabled?: boolean;
	} = $props();

	// Container ref for measuring available width
	let containerRef: HTMLDivElement | null = $state(null);
	let containerWidth = $state(0);

	// Constants for sizing
	const PADDING = 8; // p-2 = 8px
	const GAP = 2; // gap-0.5 = 2px
	const MIN_CELL_SIZE = 20; // Minimum cell size for playability

	// Default cell sizes by difficulty (used as fallback/max)
	const defaultCellSizes: Record<string, number> = {
		beginner: 48,
		intermediate: 40,
		expert: 32
	};

	// Rotate expert grid 90° on mobile to fit screen width
	// Normal: 30 cols × 16 rows = 674px width (too wide for mobile)
	// Rotated: 16 cols × 30 rows = 366px width (fits mobile)
	const shouldRotate = $derived(difficulty === 'expert' && mobileStore.isMobile);
	const displayRows = $derived(shouldRotate ? gameState.cols : gameState.rows);
	const displayCols = $derived(shouldRotate ? gameState.rows : gameState.cols);

	// Coordinate mapping for rotated display (90° clockwise rotation)
	function getLogicalCoordinates(
		visualRow: number,
		visualCol: number
	): { row: number; col: number } {
		if (shouldRotate) {
			return {
				row: gameState.rows - 1 - visualCol,
				col: visualRow
			};
		}
		return { row: visualRow, col: visualCol };
	}

	function getCellAt(visualRow: number, visualCol: number): CellState {
		const { row, col } = getLogicalCoordinates(visualRow, visualCol);
		return gameState.grid[row][col];
	}

	// Calculate adaptive cell size based on container width
	const cellSize = $derived.by(() => {
		if (!containerWidth || containerWidth === 0) {
			return defaultCellSizes[difficulty];
		}

		// Use displayCols for rotated grid calculation
		const cols = displayCols;
		const availableWidth = containerWidth - PADDING * 2;
		const totalGapWidth = (cols - 1) * GAP;
		const calculatedSize = Math.floor((availableWidth - totalGapWidth) / cols);

		// Clamp between min and max
		const maxSize = defaultCellSizes[difficulty];
		return Math.max(MIN_CELL_SIZE, Math.min(calculatedSize, maxSize));
	});

	// Grid template columns using calculated cell size (uses displayCols for rotation)
	const gridCols = $derived(`repeat(${displayCols}, ${cellSize}px)`);

	// Observe container size changes
	$effect(() => {
		if (!containerRef) return;

		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				containerWidth = entry.contentRect.width;
			}
		});

		resizeObserver.observe(containerRef);

		return () => {
			resizeObserver.disconnect();
		};
	});
</script>

<div bind:this={containerRef} class="w-full">
	<div
		class="inline-grid gap-0.5 rounded-lg border border-border bg-background p-2"
		style="grid-template-columns: {gridCols};"
		role="grid"
		aria-label="Grille de démineur {difficulty === 'beginner'
			? 'débutant'
			: difficulty === 'intermediate'
				? 'intermédiaire'
				: 'expert'}"
	>
		{#each { length: displayRows } as _, visualRow (visualRow)}
			{#each { length: displayCols } as _, visualCol (`${visualRow}-${visualCol}`)}
				{@const cell = getCellAt(visualRow, visualCol)}
				{@const coords = getLogicalCoordinates(visualRow, visualCol)}
				<MinesweeperCell
					row={coords.row}
					col={coords.col}
					isRevealed={cell.isRevealed}
					isFlagged={cell.isFlagged}
					isMine={cell.isMine}
					adjacentMines={cell.adjacentMines}
					isExploded={cell.isExploded}
					onReveal={onCellReveal}
					onFlag={onCellFlag}
					onChord={onCellChord}
					{disabled}
					{cellSize}
				/>
			{/each}
		{/each}
	</div>
</div>
