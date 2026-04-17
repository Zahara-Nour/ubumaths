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
		addRandomTile,
		removeTile,
		removeNewlySpawnedTile,
		getEligibleBombTargets,
		getFusionTargets,
		getFusionNeighbors,
		mergeTilesAt,
		getJokerTargets,
		applyJoker,
		generateNextSpawn,
		addTileAt
	} from './game-logic';
	import type { GameState, Direction, Tile, GhostTile, VipCardUsage, VisionPreview } from './types';
	import type { StudentVipCards } from '$lib/types/vip-card';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { browser } from '$app/environment';

	// VIP card IDs
	const UNDO_CARD_IDS = ['2048-undo'];
	const FREEZE_CARD_IDS = ['2048-freeze-spawn'];
	const FUSION_CARD_IDS = ['2048-merge'];
	const JOKER_CARD_IDS = ['2048-joker'];
	const VISION_CARD_IDS = ['2048-vision'];
	// Max uses per game
	const MAX_UNDO_PER_GAME = 2;
	const MAX_BOMB_PER_GAME = 3;
	const MAX_FREEZE_PER_GAME = 2;
	const MAX_FUSION_PER_GAME = 1;
	const MAX_JOKER_PER_GAME = 1;
	const MAX_VISION_PER_GAME = 2;
	const MAX_MULTIPLIER_PER_GAME = 1;

	// Gidouilles costs
	const UNDO_COST = 5;
	const FREEZE_COST = 3;
	const FUSION_COST = 15;
	const JOKER_COST = 10;
	const VISION_COST = 3;
	const MULTIPLIER_COSTS: Record<number, number> = { 1.5: 20, 2: 40 };
	const MULTIPLIER_CARD_BY_FACTOR: Record<number, string> = {
		1.5: '2048-multiplier',
		2: '2048-multiplier-2'
	};

	// Bomb tier mapping
	const BOMB_CARD_BY_TIER: Record<number, string> = {
		4: '2048-bomb',
		16: '2048-bomb-2',
		64: '2048-bomb-3'
	};
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
		initialBombCards: { tier1: number; tier2: number };
		initialFreezeCards: number;
		initialFusionCards: number;
		initialJokerCards: number;
		initialVisionCards: number;
		initialMultiplierCards: { x15: number; x2: number };
		initialGidouilles: number;
	}
	let {
		serverBestScore,
		canSaveScore,
		vipCards = null,
		initialUndoCards = 0,
		initialBombCards = { tier1: 0, tier2: 0 },
		initialFreezeCards = 0,
		initialFusionCards = 0,
		initialJokerCards = 0,
		initialVisionCards = 0,
		initialMultiplierCards = { x15: 0, x2: 0 },
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
	let activeBombTier = $state<number | null>(null);
	let bombMaxValue = $state(4);
	let pendingBombCard = $state<{ instanceId: string; maxValue: number } | null>(null);
	let cardUsage = $state<VipCardUsage>({
		undo: 0,
		bomb: 0,
		freeze: 0,
		fusion: 0,
		joker: 0,
		vision: 0,
		multiplier: 0
	});
	let undoCardsAvailable = $state(initialUndoCards);
	let bombCardsByTier = $state({ ...initialBombCards });
	let freezeCardsAvailable = $state(initialFreezeCards);
	let fusionCardsAvailable = $state(initialFusionCards);
	let jokerCardsAvailable = $state(initialJokerCards);
	let visionCardsAvailable = $state(initialVisionCards);
	let multiplierCardsByFactor = $state({ ...initialMultiplierCards });
	let gidouilles = $state(initialGidouilles);
	let isCardLoading = $state(false);

	// Wave 2 states
	let fusionMode = $state(false);
	let fusionFirstTile = $state<{ row: number; col: number } | null>(null);
	let jokerMode = $state(false);
	let visionPreview = $state<VisionPreview | null>(null);
	let scoreMultiplier = $state(1);

	const isAuthenticated = $derived(canSaveScore);

	// Per-tier bomb targets
	const hasBomb1Targets = $derived(getEligibleBombTargets(gameState.board, 4).length > 0);
	const hasBomb2Targets = $derived(getEligibleBombTargets(gameState.board, 16).length > 0);

	// Fusion/Joker/Vision derived (pre-computed Sets for O(1) lookups in template)
	const fusionTargetSet = $derived(
		fusionMode && !fusionFirstTile
			? new Set(getFusionTargets(gameState.board).map((p) => `${p.row},${p.col}`))
			: new Set<string>()
	);
	const hasFusionTargets = $derived(getFusionTargets(gameState.board).length > 0);
	const fusionNeighbors = $derived(
		fusionFirstTile ? getFusionNeighbors(gameState.board, fusionFirstTile) : []
	);
	const fusionNeighborSet = $derived(new Set(fusionNeighbors.map((p) => `${p.row},${p.col}`)));
	const jokerTargetSet = $derived(
		jokerMode
			? new Set(getJokerTargets(gameState.board).map((p) => `${p.row},${p.col}`))
			: new Set<string>()
	);
	const hasJokerTargets = $derived(getJokerTargets(gameState.board).length > 0);

	// (per-tier/factor props are passed directly to Controls)

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
			bombMode = false;
			activeBombTier = null;
			fusionMode = false;
			jokerMode = false; // clear all modes before dialog
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
		activeBombTier = null;
		bombMaxValue = 4;
		pendingBombCard = null;
		fusionMode = false;
		fusionFirstTile = null;
		jokerMode = false;
		visionPreview = null;
		scoreMultiplier = 1;
		cardUsage = { undo: 0, bomb: 0, freeze: 0, fusion: 0, joker: 0, vision: 0, multiplier: 0 };

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
		if (gameState.gameOver || bombMode || fusionMode || jokerMode) return;

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

		// Vision: replace random spawn with pre-generated one
		if (visionPreview) {
			// Remove the random spawn
			let board = removeNewlySpawnedTile(newState.board);
			// Add the pre-generated spawn (fallback to random if predicted cell is now occupied)
			if (board[visionPreview.position.row][visionPreview.position.col] !== null) {
				board = addRandomTile(board);
			} else {
				board = addTileAt(board, visionPreview.position, visionPreview.value);
			}
			newState = { ...newState, board };

			// Update vision for next move
			const remaining = visionPreview.movesRemaining - 1;
			if (remaining > 0) {
				const nextSpawn = generateNextSpawn(board);
				visionPreview = nextSpawn
					? { position: nextSpawn.position, value: nextSpawn.value, movesRemaining: remaining }
					: null;
			} else {
				visionPreview = null;
			}
		}

		// Score Multiplier: boost the score gain from merges
		if (scoreMultiplier > 1) {
			const originalScore = gameState.score;
			const scoreGain = newState.score - originalScore;
			if (scoreGain > 0) {
				const extraScore = Math.round(scoreGain * (scoreMultiplier - 1));
				newState = { ...newState, score: newState.score + extraScore };
			}
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

	async function handleBomb(tier: number) {
		if (cardUsage.bomb >= MAX_BOMB_PER_GAME || isCardLoading || gameState.gameOver) return;

		if (getEligibleBombTargets(gameState.board, tier).length === 0) {
			toaster.error('Aucune tuile eligible');
			return;
		}

		// Find a VIP card for this specific tier
		const cardId = BOMB_CARD_BY_TIER[tier];
		let bombCard: { instanceId: string; maxValue: number } | null = null;
		if (vipCards && cardId) {
			for (const [instanceId, instance] of Object.entries(vipCards)) {
				if (
					instance.cardId === cardId &&
					!instance.usedAt &&
					(instance.usesRemaining === undefined ||
						instance.usesRemaining === null ||
						instance.usesRemaining > 0)
				) {
					bombCard = { instanceId, maxValue: tier };
					break;
				}
			}
		}

		pendingBombCard = bombCard;
		bombMaxValue = tier;
		activeBombTier = tier;
		bombMode = true;
	}

	function handleCancelBomb() {
		bombMode = false;
		activeBombTier = null;
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
					activeBombTier = null;
					pendingBombCard = null;
					return;
				}
				// Decrement the correct tier
				if (pendingBombCard.maxValue === 64)
					bombCardsByTier.tier3 = Math.max(0, bombCardsByTier.tier3 - 1);
				else if (pendingBombCard.maxValue === 16)
					bombCardsByTier.tier2 = Math.max(0, bombCardsByTier.tier2 - 1);
				else bombCardsByTier.tier1 = Math.max(0, bombCardsByTier.tier1 - 1);
				if (vipCards && vipCards[pendingBombCard.instanceId]) {
					vipCards[pendingBombCard.instanceId].usedAt = new Date().toISOString();
				}
			} else {
				const powerType = BOMB_POWER_TYPES[bombMaxValue] ?? 'bomb_4';
				const ok = await payWithGidouilles(powerType);
				if (!ok) {
					bombMode = false;
					activeBombTier = null;
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
			activeBombTier = null;
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

	// ================================================================
	// Wave 2 VIP Card Handlers (Fusion, Joker, Vision, Multiplier)
	// ================================================================

	function handleFusion() {
		if (
			fusionMode ||
			cardUsage.fusion >= MAX_FUSION_PER_GAME ||
			isCardLoading ||
			gameState.gameOver
		)
			return;
		if (!hasFusionTargets) {
			toaster.error('Aucune paire de tuiles adjacentes identiques');
			return;
		}
		fusionMode = true;
		fusionFirstTile = null;
	}

	async function handleFusionFirstClick(row: number, col: number) {
		if (!fusionMode) return;
		const neighbors = getFusionNeighbors(gameState.board, { row, col });
		if (neighbors.length === 0) return;
		if (neighbors.length === 1) {
			// Only one neighbor: directly fuse
			await handleFusionSecondClick(neighbors[0].row, neighbors[0].col, { row, col });
		} else {
			fusionFirstTile = { row, col };
		}
	}

	async function handleFusionSecondClick(
		row: number,
		col: number,
		firstTile?: { row: number; col: number }
	) {
		if (!fusionMode || isCardLoading) return;
		const pos1 = firstTile ?? fusionFirstTile;
		if (!pos1) return;

		isCardLoading = true;
		try {
			const instanceId = findCardInstanceId(FUSION_CARD_IDS);
			if (instanceId) {
				const ok = await consumeVipCard(instanceId);
				if (!ok) {
					fusionMode = false;
					fusionFirstTile = null;
					return;
				}
				fusionCardsAvailable = Math.max(0, fusionCardsAvailable - 1);
				if (vipCards && vipCards[instanceId]) {
					vipCards[instanceId].usedAt = new Date().toISOString();
				}
			} else {
				const ok = await payWithGidouilles('fusion');
				if (!ok) {
					fusionMode = false;
					fusionFirstTile = null;
					return;
				}
			}

			previousState = JSON.parse(JSON.stringify(gameState));
			const result = mergeTilesAt(gameState.board, pos1, { row, col });
			let newScore = gameState.score + result.scoreGain;
			if (scoreMultiplier > 1 && result.scoreGain > 0) {
				newScore += Math.round(result.scoreGain * (scoreMultiplier - 1));
			}
			gameState = { ...gameState, board: result.board, score: newScore };
			fusionMode = false;
			fusionFirstTile = null;
			cardUsage = { ...cardUsage, fusion: cardUsage.fusion + 1 };
			toaster.success('Fusion reussie !');
		} finally {
			isCardLoading = false;
		}
	}

	function handleCancelFusion() {
		fusionMode = false;
		fusionFirstTile = null;
	}

	function handleJoker() {
		if (jokerMode || cardUsage.joker >= MAX_JOKER_PER_GAME || isCardLoading || gameState.gameOver)
			return;
		if (!hasJokerTargets) {
			toaster.error('Aucune tuile eligible pour le Joker');
			return;
		}
		jokerMode = true;
	}

	async function handleJokerTarget(row: number, col: number) {
		if (!jokerMode || isCardLoading) return;

		isCardLoading = true;
		try {
			const instanceId = findCardInstanceId(JOKER_CARD_IDS);
			if (instanceId) {
				const ok = await consumeVipCard(instanceId);
				if (!ok) {
					jokerMode = false;
					return;
				}
				jokerCardsAvailable = Math.max(0, jokerCardsAvailable - 1);
				if (vipCards && vipCards[instanceId]) {
					vipCards[instanceId].usedAt = new Date().toISOString();
				}
			} else {
				const ok = await payWithGidouilles('joker');
				if (!ok) {
					jokerMode = false;
					return;
				}
			}

			previousState = JSON.parse(JSON.stringify(gameState));
			gameState = { ...gameState, board: applyJoker(gameState.board, { row, col }) };
			jokerMode = false;
			cardUsage = { ...cardUsage, joker: cardUsage.joker + 1 };
			toaster.success('Joker applique !');
		} finally {
			isCardLoading = false;
		}
	}

	function handleCancelJoker() {
		jokerMode = false;
	}

	async function handleVision() {
		if (
			cardUsage.vision >= MAX_VISION_PER_GAME ||
			isCardLoading ||
			visionPreview ||
			gameState.gameOver
		)
			return;

		isCardLoading = true;
		try {
			const instanceId = findCardInstanceId(VISION_CARD_IDS);
			if (instanceId) {
				const ok = await consumeVipCard(instanceId);
				if (!ok) return;
				visionCardsAvailable = Math.max(0, visionCardsAvailable - 1);
				if (vipCards && vipCards[instanceId]) {
					vipCards[instanceId].usedAt = new Date().toISOString();
				}
			} else {
				const ok = await payWithGidouilles('vision');
				if (!ok) return;
			}

			const spawn = generateNextSpawn(gameState.board);
			if (spawn) {
				visionPreview = { position: spawn.position, value: spawn.value, movesRemaining: 3 };
			}
			cardUsage = { ...cardUsage, vision: cardUsage.vision + 1 };
			toaster.success('Vision activee pour 3 coups !');
		} finally {
			isCardLoading = false;
		}
	}

	async function handleMultiplier(factor: number) {
		if (cardUsage.multiplier >= MAX_MULTIPLIER_PER_GAME || isCardLoading || gameState.gameOver)
			return;
		if (scoreMultiplier > 1) return; // already active

		isCardLoading = true;
		try {
			// Find a VIP card for this specific factor
			const cardId = MULTIPLIER_CARD_BY_FACTOR[factor];
			let cardInstanceId: string | null = null;
			if (vipCards && cardId) {
				for (const [instanceId, instance] of Object.entries(vipCards)) {
					if (
						instance.cardId === cardId &&
						!instance.usedAt &&
						(instance.usesRemaining === undefined ||
							instance.usesRemaining === null ||
							instance.usesRemaining > 0)
					) {
						cardInstanceId = instanceId;
						break;
					}
				}
			}

			if (cardInstanceId) {
				const ok = await consumeVipCard(cardInstanceId);
				if (!ok) return;
				// Decrement the correct factor
				if (factor === 2) multiplierCardsByFactor.x2 = Math.max(0, multiplierCardsByFactor.x2 - 1);
				else multiplierCardsByFactor.x15 = Math.max(0, multiplierCardsByFactor.x15 - 1);
				if (vipCards && vipCards[cardInstanceId]) {
					vipCards[cardInstanceId].usedAt = new Date().toISOString();
				}
			} else {
				const powerType = factor === 2 ? 'multiplier_2' : 'multiplier_1_5';
				const ok = await payWithGidouilles(powerType);
				if (!ok) return;
			}

			scoreMultiplier = factor;
			cardUsage = { ...cardUsage, multiplier: cardUsage.multiplier + 1 };
			toaster.success(`Multiplicateur x${factor} active !`);
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
				<div class="score-box relative rounded-lg bg-muted px-4 py-2">
					<div class="text-xs font-semibold text-muted-foreground uppercase">Score</div>
					<div class="text-2xl font-bold">{gameState.score}</div>
					{#if scoreMultiplier > 1}
						<span
							class="absolute -top-1.5 -right-1.5 rounded-full bg-yellow-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow"
						>
							x{scoreMultiplier}
						</span>
					{/if}
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
		bomb1Cards={bombCardsByTier.tier1}
		bomb2Cards={bombCardsByTier.tier2}
		bombUsedThisGame={cardUsage.bomb}
		maxBombPerGame={MAX_BOMB_PER_GAME}
		{bombMode}
		{activeBombTier}
		{hasBomb1Targets}
		{hasBomb2Targets}
		onUseBomb={handleBomb}
		onCancelBomb={handleCancelBomb}
		bomb1Cost={BOMB_COSTS[4]}
		bomb2Cost={BOMB_COSTS[16]}
		{freezeCardsAvailable}
		freezeUsedThisGame={cardUsage.freeze}
		maxFreezePerGame={MAX_FREEZE_PER_GAME}
		freezeActive={skipNextSpawn}
		onUseFreezeSpawn={handleFreezeSpawn}
		{fusionCardsAvailable}
		fusionUsedThisGame={cardUsage.fusion}
		maxFusionPerGame={MAX_FUSION_PER_GAME}
		{fusionMode}
		{hasFusionTargets}
		onUseFusion={handleFusion}
		onCancelFusion={handleCancelFusion}
		{jokerCardsAvailable}
		jokerUsedThisGame={cardUsage.joker}
		maxJokerPerGame={MAX_JOKER_PER_GAME}
		{jokerMode}
		{hasJokerTargets}
		onUseJoker={handleJoker}
		onCancelJoker={handleCancelJoker}
		{visionCardsAvailable}
		visionUsedThisGame={cardUsage.vision}
		maxVisionPerGame={MAX_VISION_PER_GAME}
		visionActive={visionPreview !== null}
		onUseVision={handleVision}
		multi15Cards={multiplierCardsByFactor.x15}
		multi2Cards={multiplierCardsByFactor.x2}
		multiplierUsedThisGame={cardUsage.multiplier}
		maxMultiplierPerGame={MAX_MULTIPLIER_PER_GAME}
		{scoreMultiplier}
		onUseMultiplier={handleMultiplier}
		multi15Cost={MULTIPLIER_COSTS[1.5]}
		multi2Cost={MULTIPLIER_COSTS[2]}
		{gidouilles}
		undoCostGidouilles={UNDO_COST}
		freezeCostGidouilles={FREEZE_COST}
		fusionCostGidouilles={FUSION_COST}
		jokerCostGidouilles={JOKER_COST}
		visionCostGidouilles={VISION_COST}
	/>

	<!-- Mode banners -->
	{#if bombMode}
		<div
			class="mb-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
		>
			💣 Cliquez sur une tuile a supprimer (valeur &le; {bombMaxValue})
		</div>
	{:else if fusionMode && !fusionFirstTile}
		<div
			class="mb-2 rounded-lg border border-purple-300 bg-purple-50 px-3 py-2 text-center text-sm font-medium text-purple-700 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-400"
		>
			🔀 Cliquez sur une tuile a fusionner
		</div>
	{:else if fusionMode && fusionFirstTile}
		<div
			class="mb-2 rounded-lg border border-purple-300 bg-purple-50 px-3 py-2 text-center text-sm font-medium text-purple-700 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-400"
		>
			🔀 Cliquez sur un voisin identique
		</div>
	{:else if jokerMode}
		<div
			class="mb-2 rounded-lg border border-pink-300 bg-pink-50 px-3 py-2 text-center text-sm font-medium text-pink-700 dark:border-pink-800 dark:bg-pink-950/30 dark:text-pink-400"
		>
			🃏 Cliquez sur une tuile a transformer
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

			<!-- Vision preview ghost (semi-transparent tile showing next spawn) -->
			{#if visionPreview}
				<div class="absolute inset-0 p-0">
					<div
						class="absolute flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-indigo-400 bg-indigo-100/40 text-lg font-bold text-indigo-500 opacity-60 sm:h-20 sm:w-20 dark:bg-indigo-900/30"
						style="left: calc({visionPreview.position
							.col} * var(--grid-size)); top: calc({visionPreview.position
							.row} * var(--grid-size));"
					>
						{visionPreview.value}
						<span
							class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[8px] font-bold text-white"
						>
							{visionPreview.movesRemaining}
						</span>
					</div>
				</div>
			{/if}

			<!-- Active tiles (absolutely positioned for animations) -->
			<div class="absolute inset-0 p-0">
				{#each activeTiles as tile (tile.id)}
					{@const posKey = `${tile.position.row},${tile.position.col}`}
					{@const isFusionTarget = fusionTargetSet.has(posKey)}
					{@const isFusionNeighbor = fusionNeighborSet.has(posKey)}
					{@const isJokerTarget = jokerTargetSet.has(posKey)}
					<Tile2048
						{tile}
						{showPowerNotation}
						bombTarget={bombMode && tile.value <= bombMaxValue}
						onBombClick={handleBombTarget}
						fusionTarget={isFusionTarget}
						fusionNeighbor={isFusionNeighbor}
						onFusionClick={fusionMode
							? fusionFirstTile
								? (r, c) => handleFusionSecondClick(r, c)
								: handleFusionFirstClick
							: undefined}
						jokerTarget={isJokerTarget}
						onJokerClick={jokerMode ? handleJokerTarget : undefined}
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
		--grid-size: 72px;
	}

	@media (min-width: 640px) {
		.game-board {
			--grid-size: 92px;
		}
	}

	.empty-cell {
		user-select: none;
		-webkit-user-select: none;
		-moz-user-select: none;
	}
</style>
