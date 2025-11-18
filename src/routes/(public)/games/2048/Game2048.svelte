<script lang="ts">
	/**
	 * Main 2048 game component
	 * Manages game state, controls, and UI
	 */
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import Tile2048 from './Tile2048.svelte';
	import { initializeBoard, move } from './game-logic';
	import type { GameState, Direction } from './types';
	import confetti from 'canvas-confetti';
	import { browser } from '$app/environment';

	// State management with Svelte 5 runes
	let gameState = $state<GameState>(initializeBoard());
	let bestScore = $state(browser ? parseInt(localStorage.getItem('2048-best-score') || '0') : 0);
	let showEducationalHints = $state(true);
	let showGameOverDialog = $state(false);
	let showVictoryDialog = $state(false);

	// Track if victory has already been celebrated (to avoid multiple confetti)
	let victoryCelebrated = $state(false);

	// Track confetti interval to clean up on unmount
	let confettiInterval: ReturnType<typeof setInterval> | null = null;

	// Derive dialog states from game state
	$effect(() => {
		if (gameState.gameOver && !showGameOverDialog) {
			showGameOverDialog = true;
		}
		if (gameState.won && !victoryCelebrated) {
			showVictoryDialog = true;
			victoryCelebrated = true;
			triggerVictoryConfetti();
		}
	});

	// Update best score when current score changes
	$effect(() => {
		if (gameState.score > bestScore) {
			bestScore = gameState.score;
			if (browser) {
				localStorage.setItem('2048-best-score', bestScore.toString());
			}
		}
	});

	/**
	 * Starts a new game
	 */
	function startNewGame() {
		gameState = initializeBoard();
		showGameOverDialog = false;
		showVictoryDialog = false;
		victoryCelebrated = false;
	}

	/**
	 * Continues playing after reaching 2048
	 */
	function continueGame() {
		showVictoryDialog = false;
	}

	/**
	 * Handles move in specified direction
	 */
	function handleMove(direction: Direction) {
		if (gameState.gameOver) return;

		const newState = move(gameState, direction);
		if (newState !== gameState) {
			gameState = newState;
		}
	}

	/**
	 * Triggers confetti animation for victory
	 */
	function triggerVictoryConfetti() {
		// Clear any existing interval
		if (confettiInterval) {
			clearInterval(confettiInterval);
		}

		const duration = 3000;
		const animationEnd = Date.now() + duration;
		const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

		function randomInRange(min: number, max: number) {
			return Math.random() * (max - min) + min;
		}

		confettiInterval = setInterval(function () {
			const timeLeft = animationEnd - Date.now();

			if (timeLeft <= 0) {
				if (confettiInterval) {
					clearInterval(confettiInterval);
					confettiInterval = null;
				}
				return;
			}

			const particleCount = 50 * (timeLeft / duration);
			confetti({
				...defaults,
				particleCount,
				origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
			});
			confetti({
				...defaults,
				particleCount,
				origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
			});
		}, 250);
	}

	/**
	 * Handles keyboard controls
	 */
	function handleKeyDown(event: KeyboardEvent) {
		// Map of keys to directions
		const keyMap: Record<string, Direction | undefined> = {
			ArrowUp: 'up',
			ArrowDown: 'down',
			ArrowLeft: 'left',
			ArrowRight: 'right'
		};

		const direction = keyMap[event.key];
		if (direction) {
			event.preventDefault(); // Prevent page scrolling
			handleMove(direction);
		}
	}

	// Touch controls state
	let touchStartX = 0;
	let touchStartY = 0;
	const MIN_SWIPE_DISTANCE = 50;

	/**
	 * Handles touch start
	 */
	function handleTouchStart(event: TouchEvent) {
		touchStartX = event.touches[0].clientX;
		touchStartY = event.touches[0].clientY;
	}

	/**
	 * Handles touch end (detects swipe direction)
	 */
	function handleTouchEnd(event: TouchEvent) {
		if (!event.changedTouches[0]) return;

		const touchEndX = event.changedTouches[0].clientX;
		const touchEndY = event.changedTouches[0].clientY;

		const deltaX = touchEndX - touchStartX;
		const deltaY = touchEndY - touchStartY;

		// Determine if swipe is primarily horizontal or vertical
		if (Math.abs(deltaX) > Math.abs(deltaY)) {
			// Horizontal swipe
			if (Math.abs(deltaX) > MIN_SWIPE_DISTANCE) {
				handleMove(deltaX > 0 ? 'right' : 'left');
			}
		} else {
			// Vertical swipe
			if (Math.abs(deltaY) > MIN_SWIPE_DISTANCE) {
				handleMove(deltaY > 0 ? 'down' : 'up');
			}
		}
	}

	// Set up keyboard listeners and cleanup on unmount
	$effect(() => {
		document.addEventListener('keydown', handleKeyDown);

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
			// Clean up confetti interval if active
			if (confettiInterval) {
				clearInterval(confettiInterval);
				confettiInterval = null;
			}
		};
	});
</script>

<div class="game-container mx-auto max-w-md px-4">
	<!-- Header Section -->
	<div class="header mb-6">
		<div class="mb-4 flex items-center justify-between">
			<!-- Scores -->
			<div class="flex gap-4">
				<div class="score-box rounded-lg bg-muted px-4 py-2">
					<div class="text-xs font-semibold text-muted-foreground uppercase">Score</div>
					<div class="text-2xl font-bold">{gameState.score}</div>
				</div>
				<div class="score-box rounded-lg bg-muted px-4 py-2">
					<div class="text-xs font-semibold text-muted-foreground uppercase">Meilleur</div>
					<div class="text-2xl font-bold">{bestScore}</div>
				</div>
			</div>

			<!-- New Game Button -->
			<Button onclick={startNewGame} variant="default">Nouvelle Partie</Button>
		</div>

		<!-- Educational Hints Toggle -->
		<div class="flex items-center gap-2">
			<MyCheckbox bind:checked={showEducationalHints} label="Afficher les puissances" />
		</div>
	</div>

	<!-- Game Board -->
	<div
		class="game-board mb-6 rounded-lg bg-muted/50 p-3 select-none sm:p-4"
		ontouchstart={handleTouchStart}
		ontouchend={handleTouchEnd}
	>
		<div class="grid grid-cols-4 gap-2 sm:gap-3">
			{#each gameState.board as row, rowIndex (rowIndex)}
				{#each row as tile, colIndex (`${rowIndex}-${colIndex}`)}
					{#if tile}
						<Tile2048 {tile} showPowerNotation={showEducationalHints} />
					{:else}
						<div
							class="empty-cell h-16 w-16 rounded-lg bg-muted/30 sm:h-20 sm:w-20"
							data-row={rowIndex}
							data-col={colIndex}
						></div>
					{/if}
				{/each}
			{/each}
		</div>
	</div>

	<!-- Controls Info -->
	<div class="controls-info text-center text-sm text-muted-foreground">
		<p class="mb-2">
			<span class="font-semibold">Clavier :</span> Utilisez les flèches directionnelles
		</p>
		<p><span class="font-semibold">Tactile :</span> Glissez dans la direction souhaitée</p>
	</div>
</div>

<!-- Game Over Dialog -->
<Dialog.Root bind:open={showGameOverDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="text-center text-2xl font-bold">Partie Terminée</Dialog.Title>
			<Dialog.Description class="text-center">Plus aucun mouvement possible !</Dialog.Description>
		</Dialog.Header>
		<div class="py-6 text-center">
			<div class="mb-2 text-lg">Score final :</div>
			<div class="mb-6 text-4xl font-bold">{gameState.score}</div>
			<Button onclick={startNewGame} size="lg" class="w-full">Rejouer</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>

<!-- Victory Dialog -->
<Dialog.Root bind:open={showVictoryDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="text-center text-3xl font-bold">🎉 Victoire ! 🎉</Dialog.Title>
			<Dialog.Description class="text-center">Vous avez atteint la tuile 2048 !</Dialog.Description>
		</Dialog.Header>
		<div class="py-6 text-center">
			<div class="mb-2 text-lg">Score :</div>
			<div class="mb-6 text-4xl font-bold">{gameState.score}</div>
			<div class="flex flex-col gap-3">
				<Button onclick={continueGame} size="lg" class="w-full">Continuer</Button>
				<Button onclick={startNewGame} variant="outline" size="lg" class="w-full">Rejouer</Button>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>

<style>
	.game-container {
		user-select: none;
		-webkit-user-select: none;
		-moz-user-select: none;
	}

	.game-board {
		touch-action: none; /* Prevent default touch actions */
	}

	.empty-cell {
		user-select: none;
		-webkit-user-select: none;
		-moz-user-select: none;
	}
</style>
