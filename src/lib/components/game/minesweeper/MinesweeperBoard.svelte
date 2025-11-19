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

	// Grid template columns based on difficulty
	const gridCols = $derived.by(() => {
		return `repeat(${gameState.cols}, minmax(0, 1fr))`;
	});

	// Container class for horizontal scrolling on expert mode mobile
	const containerClass = $derived.by(() => {
		if (difficulty === 'expert') {
			return 'overflow-x-auto md:overflow-x-visible';
		}
		return '';
	});
</script>

<div class={containerClass}>
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
				/>
			{/each}
		{/each}
	</div>
</div>

{#if difficulty === 'expert'}
	<p class="mt-2 text-center text-xs text-muted-foreground md:hidden">
		Faites défiler horizontalement pour voir toute la grille
	</p>
{/if}
