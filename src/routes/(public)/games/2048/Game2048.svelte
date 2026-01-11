<script lang="ts">
	/**
	 * Main 2048 game component
	 * Manages game state, controls, and UI
	 * Syncs scores to server for authenticated students
	 */
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import Tile2048 from './Tile2048.svelte';
	import GhostTile2048 from './GhostTile2048.svelte';
	import { initializeBoard, move } from './game-logic';
	import type { GameState, Direction, GameMode, Tile, GhostTile } from './types';
	import { browser } from '$app/environment';

	// Props from page load
	interface Props {
		serverBestScore: number | null;
		canSaveScore: boolean;
	}
	let { serverBestScore, canSaveScore }: Props = $props();

	// Game mode options
	const modeOptions = [
		{ value: 'classic', label: 'Classique (Puissances de 2)' },
		{ value: 'multiplication', label: 'Tables de Multiplication' },
		{ value: 'equations', label: 'Équations Simples' },
		{ value: 'fractions', label: 'Fractions' }
	];

	// Storage keys
	const STORAGE_KEY_BEST_SCORE = '2048-best-score';
	const STORAGE_KEY_GAME_STATE = '2048-game-state';

	// State management with Svelte 5 runes
	let selectedMode = $state<GameMode>('classic');
	let gameState = $state<GameState>(initializeBoard(selectedMode));
	let bestScore = $state(0);

	// Track milestones for server sync
	let reached2048 = $state(false);
	let reached4096 = $state(false);
	let scoreSavedToServer = $state(false);

	// Initialize best score: server > localStorage > 0
	if (browser) {
		// Server score takes priority if available
		if (serverBestScore !== null && serverBestScore > 0) {
			bestScore = serverBestScore;
			// Also update localStorage to keep in sync
			localStorage.setItem(STORAGE_KEY_BEST_SCORE, serverBestScore.toString());
		} else {
			// Fall back to localStorage
			const savedBestScore = localStorage.getItem(STORAGE_KEY_BEST_SCORE);
			if (savedBestScore) {
				bestScore = parseInt(savedBestScore);
			}
		}

		// Try to restore game state
		const savedGameState = localStorage.getItem(STORAGE_KEY_GAME_STATE);
		if (savedGameState) {
			try {
				const parsed = JSON.parse(savedGameState) as GameState;
				// Only restore if same mode and game not over
				if (parsed.mode === selectedMode && !parsed.gameOver) {
					gameState = parsed;
				}
			} catch {
				// Invalid saved state, start fresh
				localStorage.removeItem(STORAGE_KEY_GAME_STATE);
			}
		}
	}
	let showEducationalHints = $state(true);
	let showGameOverDialog = $state(false);
	let showVictoryDialog = $state(false);

	// Ghost tiles for merge animations (tiles sliding to merge position)
	let ghostTiles = $state<GhostTile[]>([]);
	let ghostTimeout: ReturnType<typeof setTimeout> | null = null;

	// Track if victory has already been celebrated (to avoid multiple confetti)
	let victoryCelebrated = $state(false);

	// Track confetti interval to clean up on unmount
	let confettiInterval: ReturnType<typeof setInterval> | null = null;

	// Track localStorage save timer for debouncing
	let saveScoreTimer: ReturnType<typeof setTimeout> | null = null;
	let saveGameTimer: ReturnType<typeof setTimeout> | null = null;

	// Memoize active tiles to avoid redundant array operations on every render
	let activeTiles = $derived(gameState.board.flat().filter((t): t is Tile => t !== null));

	// Check for 2048/4096 tiles in the board
	let has2048Tile = $derived(activeTiles.some((t) => t.value === 2048));
	let has4096Tile = $derived(activeTiles.some((t) => t.value === 4096));

	// Track milestones when tiles appear
	$effect(() => {
		if (has2048Tile && !reached2048) {
			reached2048 = true;
		}
	});

	$effect(() => {
		if (has4096Tile && !reached4096) {
			reached4096 = true;
		}
	});

	/**
	 * Saves the current game score to the server (for authenticated students only)
	 */
	async function saveScoreToServer() {
		// Only save if user can save scores (authenticated student) and in classic mode
		if (!canSaveScore || selectedMode !== 'classic' || scoreSavedToServer) {
			return;
		}

		try {
			const response = await fetch('/api/games/2048/scores', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					score: gameState.score,
					reached_2048: reached2048,
					reached_4096: reached4096,
					mode: 'classic'
				})
			});

			if (response.ok) {
				scoreSavedToServer = true;
				const data = await response.json();
				// Update best score if server returns a higher one
				if (data.best_score > bestScore) {
					bestScore = data.best_score;
					if (browser) {
						localStorage.setItem(STORAGE_KEY_BEST_SCORE, bestScore.toString());
					}
				}
			}
		} catch {
			// Silent failure - localStorage still has the score
		}
	}

	// Derive dialog states from game state and trigger server save on game over
	$effect(() => {
		if (gameState.gameOver && !showGameOverDialog) {
			showGameOverDialog = true;
			// Save score to server when game ends
			saveScoreToServer();
		}
		if (gameState.won && !victoryCelebrated) {
			showVictoryDialog = true;
			victoryCelebrated = true;
			triggerVictoryConfetti();
		}
	});

	// Update best score when current score changes (debounced localStorage write)
	$effect(() => {
		if (gameState.score > bestScore) {
			bestScore = gameState.score;

			// Debounce localStorage writes (reduces main thread blocks from 30-50 per game to 1)
			if (browser) {
				if (saveScoreTimer) clearTimeout(saveScoreTimer);
				saveScoreTimer = setTimeout(() => {
					localStorage.setItem(STORAGE_KEY_BEST_SCORE, bestScore.toString());
					saveScoreTimer = null;
				}, 500);
			}
		}
	});

	// Save game state on every change (debounced)
	$effect(() => {
		if (browser && !gameState.gameOver) {
			if (saveGameTimer) clearTimeout(saveGameTimer);
			saveGameTimer = setTimeout(() => {
				localStorage.setItem(STORAGE_KEY_GAME_STATE, JSON.stringify(gameState));
				saveGameTimer = null;
			}, 1000);
		}
	});

	// Save immediately on unmount (ensures no data loss)
	$effect(() => {
		return () => {
			if (saveScoreTimer) {
				clearTimeout(saveScoreTimer);
			}
			if (saveGameTimer) {
				clearTimeout(saveGameTimer);
			}
			if (browser) {
				if (bestScore > 0) {
					localStorage.setItem(STORAGE_KEY_BEST_SCORE, bestScore.toString());
				}
				if (!gameState.gameOver) {
					localStorage.setItem(STORAGE_KEY_GAME_STATE, JSON.stringify(gameState));
				}
			}
		};
	});

	/**
	 * Starts a new game
	 */
	function startNewGame() {
		gameState = initializeBoard(selectedMode);
		showGameOverDialog = false;
		showVictoryDialog = false;
		victoryCelebrated = false;

		// Reset milestone tracking for new game
		reached2048 = false;
		reached4096 = false;
		scoreSavedToServer = false;

		// Clear saved game state when starting fresh
		if (browser) {
			localStorage.removeItem(STORAGE_KEY_GAME_STATE);
		}
	}

	/**
	 * Handles mode change - starts a new game with the selected mode
	 */
	function handleModeChange() {
		startNewGame();
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

		const result = move(gameState, direction);
		if (!result.moved) return;

		// Animation timing constants (must match CSS in GhostTile2048.svelte)
		const GHOST_SLIDE_DURATION = 300;
		const GHOST_CLEANUP_BUFFER = 20;

		// If there are merge animations, create ghost tiles
		if (result.mergeAnimations.length > 0) {
			// Clear previous timeout AND ghost tiles immediately (atomic operation)
			if (ghostTimeout) {
				clearTimeout(ghostTimeout);
				ghostTimeout = null;
			}
			ghostTiles = [];

			// Create new ghost tiles
			ghostTiles = result.mergeAnimations.flatMap((anim) => anim.tiles);

			// Clear ghost tiles after animation completes
			ghostTimeout = setTimeout(() => {
				ghostTiles = [];
				ghostTimeout = null;
			}, GHOST_SLIDE_DURATION + GHOST_CLEANUP_BUFFER);
		}

		gameState = result.state;
	}

	/**
	 * Triggers confetti animation for victory
	 * Dynamically imports confetti library only when needed (-20KB from initial bundle)
	 */
	async function triggerVictoryConfetti() {
		// Clear any existing interval
		if (confettiInterval) {
			clearInterval(confettiInterval);
		}

		// Dynamically import confetti only when user wins (used <5% of the time)
		const confettiModule = await import('canvas-confetti');
		const confetti = confettiModule.default;

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
			// Clean up ghost tile timeout
			if (ghostTimeout) {
				clearTimeout(ghostTimeout);
				ghostTimeout = null;
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

		<!-- Mode Selector -->
		<div class="mb-4">
			<label class="mb-2 block text-sm font-semibold">Mode de Jeu</label>
			<MySelect
				type="single"
				bind:value={selectedMode}
				items={modeOptions}
				onValueChange={handleModeChange}
			/>
		</div>

		<!-- Educational Hints Toggle (only for classic mode) -->
		{#if selectedMode === 'classic'}
			<div class="flex items-center gap-2">
				<MyCheckbox bind:checked={showEducationalHints} label="Afficher les puissances" />
			</div>
		{/if}
	</div>

	<!-- Game Board -->
	<div
		class="game-board mb-6 rounded-lg bg-muted/50 p-3 select-none sm:p-4"
		ontouchstart={handleTouchStart}
		ontouchend={handleTouchEnd}
	>
		<!-- Tile container with absolute positioning for smooth animations -->
		<div class="tile-container relative">
			<!-- Background grid (empty cells) -->
			<div class="grid grid-cols-4 gap-2 sm:gap-3" aria-hidden="true">
				{#each Array(16) as _, index (index)}
					<div class="empty-cell h-16 w-16 rounded-lg bg-muted/30 sm:h-20 sm:w-20"></div>
				{/each}
			</div>

			<!-- Ghost tiles (sliding to merge position) -->
			<div class="absolute inset-0 p-0">
				{#each ghostTiles as ghost (ghost.id)}
					<GhostTile2048 {ghost} />
				{/each}
			</div>

			<!-- Active tiles (absolutely positioned for animations) -->
			<div class="absolute inset-0 p-0">
				{#each activeTiles as tile (tile.id)}
					<Tile2048 {tile} showPowerNotation={showEducationalHints} />
				{/each}
			</div>
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
