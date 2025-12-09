<script lang="ts">
	import type { GameState } from '$lib/types/minesweeper';
	import MinesweeperCell from './MinesweeperCell.svelte';

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

	// Calculate adaptive cell size based on container width
	const cellSize = $derived.by(() => {
		if (!containerWidth || containerWidth === 0) {
			return defaultCellSizes[difficulty];
		}

		const cols = gameState.cols;
		const availableWidth = containerWidth - PADDING * 2;
		const totalGapWidth = (cols - 1) * GAP;
		const calculatedSize = Math.floor((availableWidth - totalGapWidth) / cols);

		// Clamp between min and max
		const maxSize = defaultCellSizes[difficulty];
		return Math.max(MIN_CELL_SIZE, Math.min(calculatedSize, maxSize));
	});

	// Grid template columns using calculated cell size
	const gridCols = $derived(`repeat(${gameState.cols}, ${cellSize}px)`);

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
		{#each gameState.grid as row, rowIndex (rowIndex)}
			{#each row as cell, colIndex (`${rowIndex}-${colIndex}`)}
				<MinesweeperCell
					row={rowIndex}
					col={colIndex}
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
