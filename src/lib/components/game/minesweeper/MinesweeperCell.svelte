<script lang="ts">
	import { cn } from '$lib/utils';

	// Long press configuration
	const LONG_PRESS_DURATION = 400; // ms
	const TOUCH_MOVE_THRESHOLD = 10; // px - cancel if finger moves more than this

	// Touch state for long press detection
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let touchStartPos: { x: number; y: number } | null = null;
	let didLongPress = false;

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
		1: 'text-blue-600 num-1',
		2: 'text-green-600 num-2',
		3: 'text-red-600 num-3',
		4: 'text-blue-800 num-4',
		5: 'text-red-800 num-5',
		6: 'text-cyan-600 num-6',
		7: 'text-black num-7',
		8: 'text-gray-600 num-8'
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

		// Prevent click after long press (touch flag)
		if (didLongPress) {
			didLongPress = false;
			return;
		}

		// Shift+Click: contextual action (unified modifier)
		// - On revealed cell: chord (reveal neighbors)
		// - On unrevealed cell: toggle flag
		if (event.shiftKey) {
			event.preventDefault();
			if (isRevealed && onChord) {
				onChord(row, col);
			} else if (!isRevealed) {
				onFlag(row, col);
			}
			return;
		}

		// Middle click: chord on revealed cell
		if (event.button === 1 && isRevealed && onChord) {
			event.preventDefault();
			onChord(row, col);
			return;
		}

		// Normal click: reveal
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

	// Touch handlers for long press (mobile flag)
	function handleTouchStart(event: TouchEvent) {
		if (disabled || isRevealed) return;

		const touch = event.touches[0];
		touchStartPos = { x: touch.clientX, y: touch.clientY };
		didLongPress = false;

		longPressTimer = setTimeout(() => {
			didLongPress = true;
			onFlag(row, col);
			// Vibrate if available (haptic feedback)
			if (navigator.vibrate) {
				navigator.vibrate(50);
			}
		}, LONG_PRESS_DURATION);
	}

	function handleTouchMove(event: TouchEvent) {
		if (!longPressTimer || !touchStartPos) return;

		const touch = event.touches[0];
		const dx = Math.abs(touch.clientX - touchStartPos.x);
		const dy = Math.abs(touch.clientY - touchStartPos.y);

		// Cancel long press if finger moved too much
		if (dx > TOUCH_MOVE_THRESHOLD || dy > TOUCH_MOVE_THRESHOLD) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
			touchStartPos = null;
		}
	}

	function handleTouchEnd() {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
		touchStartPos = null;
		// Note: don't reset didLongPress here - handleClick needs to check it
		// handleClick will reset it after preventing the click
	}

	function handleTouchCancel() {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
		touchStartPos = null;
		didLongPress = false;
	}
</script>

<button
	type="button"
	class={cn(
		'flex items-center justify-center font-bold transition-all',
		'border border-border',
		'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
		!isRevealed && !isFlagged && 'cell-unrevealed bg-muted hover:bg-muted/80 active:scale-95',
		!isRevealed && isFlagged && 'cell-unrevealed bg-muted',
		isRevealed && !isMine && 'cell-revealed bg-card',
		isRevealed && isMine && !isExploded && 'cell-mine bg-card',
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
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
	ontouchcancel={handleTouchCancel}
	aria-label={ariaLabel}
	aria-pressed={isRevealed}
	tabindex={disabled ? -1 : 0}
	title={isRevealed && adjacentMines > 0 && onChord
		? 'Shift+Clic pour révélation rapide'
		: !isRevealed && !isFlagged
			? 'Shift+Clic pour drapeau'
			: ''}
>
	<span
		class={cn(
			'font-bold select-none',
			textSizeClasses,
			isRevealed && adjacentMines > 0 && numberColors[adjacentMines],
			isRevealed && isMine && 'dark:drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]'
		)}
	>
		{cellContent}
	</span>
</button>

<style>
	/* Light mode - slightly darker unrevealed cells */
	button.cell-unrevealed {
		background-color: rgb(212 212 216); /* gray-300 */
	}
	button.cell-unrevealed:hover {
		background-color: rgb(190 190 195);
	}

	/* Dark mode overrides for better contrast */
	:global(.dark) button.cell-unrevealed {
		background-color: rgb(82 82 91); /* zinc-600 */
	}
	:global(.dark) button.cell-unrevealed:hover {
		background-color: rgb(113 113 122); /* zinc-500 */
	}
	:global(.dark) button.cell-revealed,
	:global(.dark) button.cell-mine {
		background-color: rgb(39 39 42); /* zinc-800 */
	}

	/* Number colors - dark mode overrides */
	:global(.dark) .num-1 {
		color: rgb(147 197 253); /* blue-300 */
	}
	:global(.dark) .num-2 {
		color: rgb(134 239 172); /* green-300 */
	}
	:global(.dark) .num-3 {
		color: rgb(248 113 113); /* red-400 */
	}
	:global(.dark) .num-4 {
		color: rgb(165 180 252); /* indigo-300 */
	}
	:global(.dark) .num-5 {
		color: rgb(253 186 116); /* orange-300 */
	}
	:global(.dark) .num-6 {
		color: rgb(103 232 249); /* cyan-300 */
	}
	:global(.dark) .num-7 {
		color: rgb(255 255 255); /* white */
	}
	:global(.dark) .num-8 {
		color: rgb(212 212 216); /* gray-300 */
	}
</style>
