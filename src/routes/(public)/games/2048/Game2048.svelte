<script lang="ts">
	/**
	 * Main 2048 game component
	 * Manages game state, controls, and UI
	 * Syncs scores to server for authenticated students
	 * Integrates VIP card powers (Undo, Bomb, Freeze Spawn)
	 */
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import Tile2048 from './Tile2048.svelte';
	import GhostTile2048 from './GhostTile2048.svelte';
	import Game2048Controls from './Game2048Controls.svelte';
	import {
		initializeBoard,
		move,
		removeTile,
		removeNewlySpawnedTile,
		getEligibleBombTargets
	} from './game-logic';
	import type { GameState, Direction, Tile, GhostTile, VipCardUsage } from './types';
	import type { StudentVipCards } from '$lib/types/vip-card';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { browser } from '$app/environment';

	// VIP card IDs
	const UNDO_CARD_IDS = ['2048-undo'];
	const FREEZE_CARD_IDS = ['2048-freeze-spawn'];

	// Max uses per game
	const MAX_UNDO_PER_GAME = 2;
	const MAX_BOMB_PER_GAME = 3;
	const MAX_FREEZE_PER_GAME = 2;

	// Gidouilles costs
	const UNDO_COST = 5;
	const FREEZE_COST = 3;

	// Bomb tier mapping
	const BOMB_CARD_BY_TIER: Record<number, string> = {
		4: '2048-bomb',
		16: '2048-bomb-2',
		64: '2048-bomb-3'
	};
	const BOMB_TIERS = [64, 16, 4] as const; // highest first for card selection
	const BOMB_COSTS: Record<number, number> = { 4: 3, 16: 8, 64: 15 };
	const BOMB_POWER_TYPES: Record<number, string> = {
		4: 'bomb_4',
		16: 'bomb_16',
		64: 'bomb_64'
	};

	// Props from page load
	interface Props {
		serverBestScore: number | null;
		canSaveScore: boolean;
		vipCards: StudentVipCards | null;
		initialUndoCards: number;
		initialBombCards: number;
		initialFreezeCards: number;
		initialGidouilles: number;
	}
	let {
		serverBestScore,
		canSaveScore,
		vipCards = null,
		initialUndoCards = 0,
		initialBombCards = 0,
		initialFreezeCards = 0,
		initialGidouilles = 0
	}: Props = $props();

	// Storage keys
	const STORAGE_KEY_BEST_SCORE = '2048-best-score';
	const STORAGE_KEY_GAME_STATE = '2048-game-state';

	// State management with Svelte 5 runes
	let gameState = $state<GameState>(initializeBoard());
	let bestScore = $state(0);

	// Track milestones for server sync
	let reached2048 = $state(false);
	let reached4096 = $state(false);
	let scoreSavedToServer = $state(false);

	// Reward data from server response
	let rewardData = $state<{
		theoretical_reward: number;
		actual_reward: number;
		is_first_win_of_day: boolean;
		week_best_reward: number;
	} | null>(null);
	let unlockedMilestones = $state<{ slug: string; name: string; gidouilles_reward: number }[]>([]);

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
				// Only restore if game not over
				if (!parsed.gameOver) {
					gameState = parsed;
				}
			} catch {
				// Invalid saved state, start fresh
				localStorage.removeItem(STORAGE_KEY_GAME_STATE);
			}
		}
	}
	let showPowerNotation = $state(true);
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

	// ================================================================
	// VIP Card State
	// ================================================================
	let previousState: GameState | null = $state(null);
	let skipNextSpawn = $state(false);
	let bombMode = $state(false);
	let bombMaxValue = $state(4);
	let pendingBombCard = $state<{ instanceId: string; maxValue: number } | null>(null);
	let cardUsage = $state<VipCardUsage>({ undo: 0, bomb: 0, freeze: 0 });
	let undoCardsAvailable = $state(initialUndoCards);
	let bombCardsAvailable = $state(initialBombCards);
	let freezeCardsAvailable = $state(initialFreezeCards);
	let gidouilles = $state(initialGidouilles);
	let isCardLoading = $state(false);

	const isAuthenticated = $derived(canSaveScore);

	// Determine the best bomb tier available (highest tier first: VIP cards, then gidouilles)
	const bestBombMaxValue = $derived.by(() => {
		// VIP card path: highest tier with an available card
		if (vipCards) {
			for (const tier of BOMB_TIERS) {
				const cardId = BOMB_CARD_BY_TIER[tier];
				for (const instance of Object.values(vipCards)) {
					if (instance.cardId === cardId && !instance.usedAt) return tier;
				}
			}
		}
		// Gidouilles fallback: highest tier the player can afford
		for (const tier of BOMB_TIERS) {
			if (gidouilles >= (BOMB_COSTS[tier] ?? 3)) return tier;
		}
		return 4;
	});

	const hasBombTargets = $derived(
		getEligibleBombTargets(gameState.board, bestBombMaxValue).length > 0
	);

	// Best bomb cost for gidouilles display
	const bombCostGidouilles = $derived(BOMB_COSTS[bestBombMaxValue] ?? 3);

	/**
	 * Find first available VIP card instance ID for given card IDs
	 */
	function findCardInstanceId(cardIds: string[]): string | null {
		if (!vipCards) return null;
		for (const [instanceId, instance] of Object.entries(vipCards)) {
			if (
				cardIds.includes(instance.cardId) &&
				!instance.usedAt &&
				(instance.usesRemaining === undefined ||
					instance.usesRemaining === null ||
					instance.usesRemaining > 0)
			) {
				return instanceId;
			}
		}
		return null;
	}

	/**
	 * Find best bomb card instance (highest tier first)
	 */
	function findBombCardInstance(): { instanceId: string; maxValue: number } | null {
		if (!vipCards) return null;
		for (const tier of BOMB_TIERS) {
			const cardId = BOMB_CARD_BY_TIER[tier];
			for (const [instanceId, instance] of Object.entries(vipCards)) {
				if (
					instance.cardId === cardId &&
					!instance.usedAt &&
					(instance.usesRemaining === undefined ||
						instance.usesRemaining === null ||
						instance.usesRemaining > 0)
				) {
					return { instanceId, maxValue: tier };
				}
			}
		}
		return null;
	}

	/**
	 * Consume a VIP card via the API
	 */
	async function consumeVipCard(instanceId: string): Promise<boolean> {
		try {
			const response = await fetch('/api/vip-cards/use-card', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ instanceId, context: '2048' })
			});
			if (!response.ok) {
				const data = await response.json();
				toaster.error(data.message || 'Erreur lors de la consommation de la carte');
				return false;
			}
			return true;
		} catch {
			toaster.error('Erreur reseau');
			return false;
		}
	}

	/**
	 * Pay with gidouilles via the API
	 */
	async function payWithGidouilles(powerType: string): Promise<boolean> {
		try {
			const response = await fetch('/api/games/2048/use-power', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ power_type: powerType })
			});
			if (!response.ok) {
				const data = await response.json();
				toaster.error(data.message || 'Pas assez de gidouilles');
				return false;
			}
			const data = await response.json();
			gidouilles = data.gidouilles_remaining ?? gidouilles;
			return true;
		} catch {
			toaster.error('Erreur reseau');
			return false;
		}
	}

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
		if (!canSaveScore || scoreSavedToServer) {
			return;
		}

		try {
			const response = await fetch('/api/games/2048/scores', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					score: gameState.score,
					reached_2048: reached2048,
					reached_4096: reached4096
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
				// Capture reward data
				if (data.reward) {
					rewardData = data.reward;
				}
				if (data.milestones && data.milestones.length > 0) {
					unlockedMilestones = data.milestones;
				}
			}
		} catch {
			// Silent failure - localStorage still has the score
		}
	}

	// Derive dialog states from game state and trigger server save on game over
	$effect(() => {
		if (gameState.gameOver && !showGameOverDialog) {
			bombMode = false; // clear bomb mode before dialog
			// Save score first, then open dialog (avoids layout jump from reward data arriving late)
			saveScoreToServer().then(() => {
				showGameOverDialog = true;
			});
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
		gameState = initializeBoard();
		showGameOverDialog = false;
		showVictoryDialog = false;
		victoryCelebrated = false;

		// Reset milestone tracking for new game
		reached2048 = false;
		reached4096 = false;
		scoreSavedToServer = false;
		rewardData = null;
		unlockedMilestones = [];

		// Reset VIP card usage for new game
		previousState = null;
		skipNextSpawn = false;
		bombMode = false;
		pendingBombCard = null;
		cardUsage = { undo: 0, bomb: 0, freeze: 0 };

		// Clear saved game state when starting fresh
		if (browser) {
			localStorage.removeItem(STORAGE_KEY_GAME_STATE);
		}
	}

	/**
	 * Continues playing after reaching 2048
	 */
	function continueGame() {
		showVictoryDialog = false;
	}

	/**
	 * Handles move in specified direction.
	 * Slide animations use CSS keyframes with explicit from/to positions
	 * (not CSS transitions), so no two-frame hack is needed.
	 */
	function handleMove(direction: Direction) {
		if (gameState.gameOver || bombMode) return;

		// Save current state for undo (deep copy)
		previousState = JSON.parse(JSON.stringify(gameState));

		const result = move(gameState, direction);
		if (!result.moved) {
			previousState = null; // No move happened, don't allow undo
			return;
		}

		// Animation timing constants (must match CSS in GhostTile2048.svelte)
		const GHOST_SLIDE_DURATION = 150;
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

		let newState = result.state;

		// Freeze Spawn: remove the newly spawned tile
		if (skipNextSpawn) {
			newState = {
				...newState,
				board: removeNewlySpawnedTile(newState.board)
			};
			skipNextSpawn = false;
		}

		// Apply new state directly — animations are CSS keyframes, not transitions
		gameState = newState;
	}

	// ================================================================
	// VIP Card Handlers
	// ================================================================

	async function handleUndo() {
		if (!previousState || cardUsage.undo >= MAX_UNDO_PER_GAME || isCardLoading) return;

		isCardLoading = true;
		try {
			const instanceId = findCardInstanceId(UNDO_CARD_IDS);
			if (instanceId) {
				const ok = await consumeVipCard(instanceId);
				if (!ok) return;
				undoCardsAvailable = Math.max(0, undoCardsAvailable - 1);
				// Mark instance as used locally
				if (vipCards && vipCards[instanceId]) {
					vipCards[instanceId].usedAt = new Date().toISOString();
				}
			} else {
				const ok = await payWithGidouilles('undo');
				if (!ok) return;
			}

			gameState = previousState;
			previousState = null;
			cardUsage = { ...cardUsage, undo: cardUsage.undo + 1 };
			toaster.success('Coup annule !');
		} finally {
			isCardLoading = false;
		}
	}

	async function handleBomb() {
		if (cardUsage.bomb >= MAX_BOMB_PER_GAME || isCardLoading || gameState.gameOver) return;

		// Determine which bomb to use and capture it
		const bombCard = findBombCardInstance();
		pendingBombCard = bombCard;
		if (bombCard) {
			bombMaxValue = bombCard.maxValue;
		} else {
			// Gidouilles fallback: use cheapest bomb tier that has targets
			for (const tier of [4, 16, 64] as const) {
				if (
					getEligibleBombTargets(gameState.board, tier).length > 0 &&
					gidouilles >= (BOMB_COSTS[tier] ?? 3)
				) {
					bombMaxValue = tier;
					break;
				}
			}
		}

		if (getEligibleBombTargets(gameState.board, bombMaxValue).length === 0) {
			toaster.error('Aucune tuile eligible');
			pendingBombCard = null;
			return;
		}

		bombMode = true;
	}

	function handleCancelBomb() {
		bombMode = false;
		pendingBombCard = null;
	}

	async function handleBombTarget(row: number, col: number) {
		if (!bombMode || isCardLoading) return;

		isCardLoading = true;
		try {
			if (pendingBombCard) {
				const ok = await consumeVipCard(pendingBombCard.instanceId);
				if (!ok) {
					bombMode = false;
					pendingBombCard = null;
					return;
				}
				bombCardsAvailable = Math.max(0, bombCardsAvailable - 1);
				if (vipCards && vipCards[pendingBombCard.instanceId]) {
					vipCards[pendingBombCard.instanceId].usedAt = new Date().toISOString();
				}
			} else {
				const powerType = BOMB_POWER_TYPES[bombMaxValue] ?? 'bomb_4';
				const ok = await payWithGidouilles(powerType);
				if (!ok) {
					bombMode = false;
					pendingBombCard = null;
					return;
				}
			}

			// Save state for potential undo
			previousState = JSON.parse(JSON.stringify(gameState));

			gameState = {
				...gameState,
				board: removeTile(gameState.board, row, col)
			};
			bombMode = false;
			pendingBombCard = null;
			cardUsage = { ...cardUsage, bomb: cardUsage.bomb + 1 };
			toaster.success('Tuile supprimee !');
		} finally {
			isCardLoading = false;
		}
	}

	async function handleFreezeSpawn() {
		if (
			cardUsage.freeze >= MAX_FREEZE_PER_GAME ||
			isCardLoading ||
			skipNextSpawn ||
			gameState.gameOver
		)
			return;

		isCardLoading = true;
		try {
			const instanceId = findCardInstanceId(FREEZE_CARD_IDS);
			if (instanceId) {
				const ok = await consumeVipCard(instanceId);
				if (!ok) return;
				freezeCardsAvailable = Math.max(0, freezeCardsAvailable - 1);
				if (vipCards && vipCards[instanceId]) {
					vipCards[instanceId].usedAt = new Date().toISOString();
				}
			} else {
				const ok = await payWithGidouilles('freeze_spawn');
				if (!ok) return;
			}

			skipNextSpawn = true;
			cardUsage = { ...cardUsage, freeze: cardUsage.freeze + 1 };
			toaster.success('Prochain coup sans nouvelle tuile !');
		} finally {
			isCardLoading = false;
		}
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

		<!-- Power notation toggle -->
		<div class="flex items-center gap-2">
			<MyCheckbox bind:checked={showPowerNotation} label="Afficher les puissances" />
		</div>
	</div>

	<!-- VIP Card Controls -->
	<Game2048Controls
		gameOver={gameState.gameOver}
		{isAuthenticated}
		isLoading={isCardLoading}
		{undoCardsAvailable}
		canUndo={previousState !== null}
		undoUsedThisGame={cardUsage.undo}
		maxUndoPerGame={MAX_UNDO_PER_GAME}
		onUseUndo={handleUndo}
		{bombCardsAvailable}
		bombUsedThisGame={cardUsage.bomb}
		maxBombPerGame={MAX_BOMB_PER_GAME}
		{bombMode}
		{hasBombTargets}
		onUseBomb={handleBomb}
		onCancelBomb={handleCancelBomb}
		{freezeCardsAvailable}
		freezeUsedThisGame={cardUsage.freeze}
		maxFreezePerGame={MAX_FREEZE_PER_GAME}
		freezeActive={skipNextSpawn}
		onUseFreezeSpawn={handleFreezeSpawn}
		{gidouilles}
		undoCostGidouilles={UNDO_COST}
		{bombCostGidouilles}
		freezeCostGidouilles={FREEZE_COST}
	/>

	<!-- Bomb mode banner -->
	{#if bombMode}
		<div
			class="mb-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
		>
			💣 Cliquez sur une tuile a supprimer (valeur &le; {bombMaxValue})
		</div>
	{/if}

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
					<Tile2048
						{tile}
						{showPowerNotation}
						bombTarget={bombMode && tile.value <= bombMaxValue}
						onBombClick={handleBombTarget}
					/>
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
			<div class="mb-4 text-4xl font-bold">{gameState.score}</div>

			{#if canSaveScore && rewardData}
				<div class="mb-4 space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
					{#if rewardData.is_first_win_of_day}
						<div class="text-2xl font-bold text-primary">+1 gidouille</div>
					{:else}
						<div class="text-muted-foreground">Gidouille 2048 déjà gagnée aujourd'hui</div>
					{/if}
					<div class="flex items-center justify-between">
						<span>Valeur théorique</span>
						<span class="font-mono font-medium">{rewardData.theoretical_reward.toFixed(2)}g</span>
					</div>
					<div class="flex items-center justify-between rounded bg-primary/10 px-2 py-1">
						<span>Meilleur cette semaine</span>
						<span class="font-mono font-medium text-primary"
							>{rewardData.week_best_reward.toFixed(2)}g</span
						>
					</div>
				</div>
			{:else if canSaveScore && gameState.score < 1000}
				<div class="mb-4 text-sm text-muted-foreground">
					Score minimum de 1 000 pour gagner des gidouilles
				</div>
			{/if}

			{#if unlockedMilestones.length > 0}
				<div class="mb-4 space-y-1 rounded-lg bg-yellow-50 p-3 text-sm dark:bg-yellow-950/30">
					<div class="font-semibold">Succès débloqués !</div>
					{#each unlockedMilestones as milestone (milestone.slug)}
						<div class="flex items-center justify-between">
							<span>{milestone.name}</span>
							<span class="font-mono font-bold text-primary">+{milestone.gidouilles_reward}g</span>
						</div>
					{/each}
				</div>
			{/if}

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
