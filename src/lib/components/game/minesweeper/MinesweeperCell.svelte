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
		'h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12',
		'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
		// Non-revealed cells: raised 3D appearance with darker background
		!isRevealed &&
			!isFlagged &&
			'border-2 border-t-muted-foreground/20 border-r-muted-foreground/40 border-b-muted-foreground/40 border-l-muted-foreground/20 bg-muted/90 shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3),inset_-2px_-2px_4px_rgba(0,0,0,0.2)] hover:bg-muted/70 active:scale-95 dark:shadow-[inset_2px_2px_4px_rgba(255,255,255,0.1),inset_-2px_-2px_4px_rgba(0,0,0,0.3)]',
		// Flagged cells: same raised appearance but no hover effect
		!isRevealed &&
			isFlagged &&
			'border-2 border-t-muted-foreground/20 border-r-muted-foreground/40 border-b-muted-foreground/40 border-l-muted-foreground/20 bg-muted/90 shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3),inset_-2px_-2px_4px_rgba(0,0,0,0.2)] dark:shadow-[inset_2px_2px_4px_rgba(255,255,255,0.1),inset_-2px_-2px_4px_rgba(0,0,0,0.3)]',
		// Revealed cells (not mine): sunken appearance with much lighter background
		isRevealed &&
			!isMine &&
			'border border-border/50 bg-background/60 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.15)] dark:bg-background/40 dark:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.4)]',
		// Revealed mine (not exploded): same sunken appearance
		isRevealed &&
			isMine &&
			!isExploded &&
			'border border-border/50 bg-background/60 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.15)] dark:bg-background/40 dark:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.4)]',
		// Exploded mine: distinct red background with pulse animation
		isExploded &&
			'animate-pulse border-2 border-destructive-foreground/30 bg-destructive shadow-lg',
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
			'text-sm font-bold select-none sm:text-base lg:text-lg',
			isRevealed && adjacentMines > 0 && numberColors[adjacentMines]
		)}
	>
		{cellContent}
	</span>
</button>
