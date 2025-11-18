<script lang="ts">
	import { cn } from '$lib/utils';

	// Props
	let {
		row,
		col,
		isRevealed = false,
		isFlagged = false,
		isMine = false,
		adjacentMines = 0,
		isExploded = false,
		onReveal,
		onFlag,
		disabled = false
	}: {
		row: number;
		col: number;
		isRevealed?: boolean;
		isFlagged?: boolean;
		isMine?: boolean;
		adjacentMines?: number;
		isExploded?: boolean;
		onReveal: (row: number, col: number) => void;
		onFlag: (row: number, col: number) => void;
		disabled?: boolean;
	} = $props();

	// Number color mapping (classic minesweeper colors)
	const numberColors: Record<number, string> = {
		1: 'text-blue-600 dark:text-blue-400',
		2: 'text-green-600 dark:text-green-400',
		3: 'text-red-600 dark:text-red-400',
		4: 'text-blue-800 dark:text-blue-500',
		5: 'text-red-800 dark:text-red-500',
		6: 'text-cyan-600 dark:text-cyan-400',
		7: 'text-black dark:text-white',
		8: 'text-gray-600 dark:text-gray-400'
	};

	// Cell display content
	const cellContent = $derived.by(() => {
		if (!isRevealed && isFlagged) return '🚩';
		if (!isRevealed) return '';
		if (isExploded) return '💥';
		if (isMine) return '💣';
		if (adjacentMines === 0) return '';
		return adjacentMines.toString();
	});

	// Accessibility label
	const ariaLabel = $derived.by(() => {
		const position = `ligne ${row + 1}, colonne ${col + 1}`;
		if (!isRevealed && isFlagged) return `Case marquée, ${position}`;
		if (!isRevealed) return `Case cachée, ${position}`;
		if (isMine) return `Mine ${isExploded ? 'explosée' : 'révélée'}, ${position}`;
		if (adjacentMines === 0) return `Case vide, ${position}`;
		return `${adjacentMines} mine${adjacentMines > 1 ? 's' : ''} adjacente${adjacentMines > 1 ? 's' : ''}, ${position}`;
	});

	// Event handlers
	function handleClick() {
		if (disabled || isRevealed || isFlagged) return;
		onReveal(row, col);
	}

	function handleRightClick(event: MouseEvent) {
		event.preventDefault();
		if (disabled || isRevealed) return;
		onFlag(row, col);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleClick();
		} else if (event.key === 'f' || event.key === 'F') {
			event.preventDefault();
			if (!disabled && !isRevealed) {
				onFlag(row, col);
			}
		}
	}
</script>

<button
	type="button"
	class={cn(
		'flex items-center justify-center font-bold transition-all',
		'w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12',
		'border border-border',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
		!isRevealed && !isFlagged && 'bg-muted hover:bg-muted/80 active:scale-95',
		!isRevealed && isFlagged && 'bg-muted',
		isRevealed && !isMine && 'bg-card',
		isRevealed && isMine && !isExploded && 'bg-card',
		isExploded && 'bg-destructive animate-pulse',
		disabled && 'cursor-not-allowed opacity-60'
	)}
	onclick={handleClick}
	oncontextmenu={handleRightClick}
	onkeydown={handleKeyDown}
	role="button"
	aria-label={ariaLabel}
	aria-pressed={isRevealed}
	tabindex={disabled ? -1 : 0}
>
	<span
		class={cn(
			'text-sm sm:text-base lg:text-lg select-none',
			isRevealed && adjacentMines > 0 && numberColors[adjacentMines]
		)}
	>
		{cellContent}
	</span>
</button>
