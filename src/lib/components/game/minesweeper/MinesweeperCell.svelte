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
		onChord,
		disabled = false,
		cellSize = 32
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
		onChord?: (row: number, col: number) => void;
		disabled?: boolean;
		cellSize?: number;
	} = $props();

	// Text size based on cell size
	const textSizeClasses = $derived.by(() => {
		if (cellSize <= 24) return 'text-xs';
		if (cellSize <= 32) return 'text-sm';
		return 'text-base';
	});

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
	function handleClick(event: MouseEvent) {
		if (disabled) return;

		// Chord click: Shift+Click or Middle Click on revealed cell
		if (isRevealed && onChord && (event.shiftKey || event.button === 1)) {
			event.preventDefault();
			onChord(row, col);
			return;
		}

		// Normal click
		if (isRevealed || isFlagged) return;
		onReveal(row, col);
	}

	function handleMouseDown(event: MouseEvent) {
		// Middle mouse button (wheel click) for chord
		if (event.button === 1) {
			event.preventDefault();
			if (disabled || !isRevealed || !onChord) return;
			onChord(row, col);
		}
	}

	function handleRightClick(event: MouseEvent) {
		event.preventDefault();
		if (disabled || isRevealed) return;
		onFlag(row, col);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			if (!disabled && !isRevealed && !isFlagged) {
				onReveal(row, col);
			}
		} else if (event.key === 'f' || event.key === 'F') {
			event.preventDefault();
			if (!disabled && !isRevealed) {
				onFlag(row, col);
			}
		} else if (event.key === 'c' || event.key === 'C') {
			// Chord click with 'c' key for keyboard users
			event.preventDefault();
			if (!disabled && isRevealed && onChord) {
				onChord(row, col);
			}
		}
	}
</script>

<button
	type="button"
	class={cn(
		'flex items-center justify-center font-bold transition-all',
		'border border-border',
		'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
		!isRevealed && !isFlagged && 'bg-muted hover:bg-muted/80 active:scale-95',
		!isRevealed && isFlagged && 'bg-muted',
		isRevealed && !isMine && 'bg-card',
		isRevealed && isMine && !isExploded && 'bg-card',
		isRevealed &&
			adjacentMines > 0 &&
			onChord &&
			'cursor-pointer hover:ring-2 hover:ring-primary/50',
		isExploded && 'animate-pulse bg-destructive',
		disabled && 'cursor-not-allowed opacity-60'
	)}
	style="width: {cellSize}px; height: {cellSize}px;"
	onclick={handleClick}
	onmousedown={handleMouseDown}
	oncontextmenu={handleRightClick}
	onkeydown={handleKeyDown}
	aria-label={ariaLabel}
	aria-pressed={isRevealed}
	tabindex={disabled ? -1 : 0}
	title={isRevealed && adjacentMines > 0 && onChord
		? 'Shift+Clic ou clic molette pour révélation rapide'
		: ''}
>
	<span
		class={cn(
			'font-bold select-none',
			textSizeClasses,
			isRevealed && adjacentMines > 0 && numberColors[adjacentMines]
		)}
	>
		{cellContent}
	</span>
</button>
