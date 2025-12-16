<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { minesweeperStore } from '$lib/stores/minesweeper.svelte';
	import { multiplayerStore } from '$lib/stores/multiplayer.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import MultiplayerLobby from '$lib/components/minesweeper/multiplayer/MultiplayerLobby.svelte';
	import MultiplayerMatchScreen from '$lib/components/minesweeper/multiplayer/MultiplayerMatchScreen.svelte';
	import MultiplayerResultScreen from '$lib/components/minesweeper/multiplayer/MultiplayerResultScreen.svelte';
	import MinesweeperBoard from '$lib/components/game/minesweeper/MinesweeperBoard.svelte';
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';

	// Get Supabase client and user from page data
	let { data } = $props();
	const supabase = data.supabase;
	const user = data.user;

	// Loading state
	let isInitialized = $state(false);

	// Progress update interval
	let progressInterval: ReturnType<typeof setInterval> | null = null;

	// Derived state from stores
	let matchStatus = $derived(multiplayerStore.matchStatus);
	let match = $derived(multiplayerStore.match);
	let result = $derived(multiplayerStore.result);
	let gameState = $derived(minesweeperStore.currentGame);
	let minesweeperStatus = $derived(gameState?.status);

	// View states
	let showLobby = $derived(matchStatus === 'waiting' && !match.id);
	let showCountdown = $derived(matchStatus === 'countdown');
	let showGame = $derived(matchStatus === 'in_progress');
	let showResult = $derived(matchStatus === 'completed' || matchStatus === 'abandoned');

	/**
	 * Initialize stores and game when match starts
	 */
	$effect(() => {
		if (match.seed && match.difficulty && matchStatus === 'countdown') {
			// Initialize minesweeper game with seed from match
			minesweeperStore.startNewGame(match.difficulty, match.seed);
		}
	});

	/**
	 * Update progress periodically during active game
	 */
	$effect(() => {
		if (matchStatus === 'in_progress' && gameState) {
			// Start progress updates
			if (!progressInterval) {
				progressInterval = setInterval(() => {
					if (gameState && matchStatus === 'in_progress') {
						multiplayerStore.updateProgress(
							gameState.cellsRevealed,
							gameState.flagsUsed,
							gameState.timeElapsed
						);
					}
				}, 500); // Update every 500ms
			}
		} else {
			// Stop progress updates
			if (progressInterval) {
				clearInterval(progressInterval);
				progressInterval = null;
			}
		}

		// Cleanup function
		return () => {
			if (progressInterval) {
				clearInterval(progressInterval);
				progressInterval = null;
			}
		};
	});

	/**
	 * Handle win detection
	 */
	$effect(() => {
		if (minesweeperStatus === 'won' && matchStatus === 'in_progress' && gameState) {
			// Player won the game
			handleWin().catch((err) => {
				console.error('Failed to complete match:', err);
				toaster.error('Erreur lors de la victoire');
			});
		}
	});

	/**
	 * Handle loss detection (game over but not abandoned)
	 */
	$effect(() => {
		if (minesweeperStatus === 'lost' && matchStatus === 'in_progress') {
			// Player lost the game (hit a mine)
			toaster.error('💥 Vous avez perdu ! Vous avez touché une mine.');
			// Don't abandon - wait for opponent to potentially finish
			// The match will be abandoned by timeout or opponent win
		}
	});

	/**
	 * Complete match when player wins
	 */
	async function handleWin() {
		if (!gameState) return;

		const success = await multiplayerStore.completeMatch(gameState.timeElapsed, {
			rows: gameState.rows,
			cols: gameState.cols,
			mines: gameState.grid.flatMap((row, r) =>
				row.filter((cell) => cell.isMine).map((cell) => [r, cell.col] as [number, number])
			),
			revealed: gameState.grid.flatMap((row, r) =>
				row.filter((cell) => cell.isRevealed).map((cell) => [r, cell.col] as [number, number])
			),
			flagged: gameState.grid.flatMap((row, r) =>
				row.filter((cell) => cell.isFlagged).map((cell) => [r, cell.col] as [number, number])
			),
			adjacentCounts: Object.fromEntries(
				gameState.grid.flatMap((row, r) =>
					row
						.filter((cell) => !cell.isMine && cell.adjacentMines > 0)
						.map((cell) => [`${r},${cell.col}`, cell.adjacentMines])
				)
			)
		});

		if (!success) {
			toaster.error('Erreur lors de la complétion du match');
		}
	}

	/**
	 * Handle cell reveal
	 */
	function handleCellReveal(row: number, col: number) {
		minesweeperStore.revealCell(row, col);
		multiplayerStore.updateActivity();
	}

	/**
	 * Handle cell flag
	 */
	function handleCellFlag(row: number, col: number) {
		minesweeperStore.toggleFlag(row, col);
		multiplayerStore.updateActivity();
	}

	/**
	 * Handle chord click
	 */
	function handleCellChord(row: number, col: number) {
		minesweeperStore.chordClick(row, col);
		multiplayerStore.updateActivity();
	}

	/**
	 * Handle play again
	 */
	function handlePlayAgain() {
		// Reset stores
		multiplayerStore.reset();
		minesweeperStore.cleanup();

		// Will show lobby again
	}

	/**
	 * Handle return to menu
	 */
	function handleReturnToMenu() {
		goto('/games/minesweeper');
	}

	/**
	 * Initialize on mount
	 */
	onMount(() => {
		if (!user) {
			toaster.error('Vous devez être connecté pour jouer en multijoueur');
			goto('/games/minesweeper');
			return;
		}

		// Initialize stores
		minesweeperStore.init(supabase, user);
		multiplayerStore.init(supabase, user.id);

		isInitialized = true;
	});

	/**
	 * Cleanup on unmount
	 */
	onDestroy(async () => {
		// Stop progress updates (synchronous)
		if (progressInterval) {
			clearInterval(progressInterval);
			progressInterval = null;
		}

		// Handle match abandonment if needed (async)
		const currentMatchStatus = multiplayerStore.matchStatus;

		if (currentMatchStatus === 'in_progress' || currentMatchStatus === 'countdown') {
			const shouldAbandon = confirm(
				'Vous êtes en match. Quitter abandonnera la partie. Continuer ?'
			);
			if (shouldAbandon) {
				await multiplayerStore.abandonMatch('player_quit');
			}
		}

		// Leave queue if in queue (async)
		if (multiplayerStore.inQueue) {
			await multiplayerStore.leaveQueue();
		}

		// Cleanup stores (synchronous)
		multiplayerStore.cleanup();
		minesweeperStore.cleanup();
	});
</script>

<!-- Loading State -->
{#if !isInitialized}
	<div class="flex min-h-screen items-center justify-center p-4">
		<Card class="p-6 text-center">
			<div class="mb-4 text-5xl">⏳</div>
			<h2 class="mb-2 text-xl font-semibold text-foreground">Chargement...</h2>
			<p class="text-sm text-muted-foreground">Initialisation du mode multijoueur</p>
		</Card>
	</div>
{:else if showLobby}
	<!-- Lobby: Queue and Matchmaking -->
	<div class="container mx-auto py-8">
		<div class="mb-6 flex items-center justify-between">
			<h1 class="text-3xl font-bold text-foreground">Démineur Multijoueur</h1>
			<Button variant="outline" onclick={handleReturnToMenu}>
				<span class="mr-2">←</span>
				Retour
			</Button>
		</div>
		<MultiplayerLobby />
	</div>
{:else if showCountdown || showGame}
	<!-- Match Screen: Countdown + Game -->
	<div class="container mx-auto py-8">
		<MultiplayerMatchScreen
			playerProgress={{
				cellsRevealed: gameState?.cellsRevealed || 0,
				flagsUsed: gameState?.flagsUsed || 0,
				timeElapsed: gameState?.timeElapsed || 0
			}}
		/>

		<!-- Game Board (only show during in_progress) -->
		{#if showGame && gameState}
			<div class="mt-6 flex justify-center">
				<MinesweeperBoard
					difficulty={match.difficulty || 'beginner'}
					{gameState}
					onCellReveal={handleCellReveal}
					onCellFlag={handleCellFlag}
					onCellChord={handleCellChord}
					disabled={minesweeperStatus !== 'in_progress'}
				/>
			</div>

			<!-- Game Stats -->
			<div class="mt-4 flex justify-center gap-4 text-sm text-muted-foreground">
				<div>
					<span class="font-semibold">Mines:</span>
					{gameState.minesCount}
				</div>
				<div>
					<span class="font-semibold">Drapeaux:</span>
					{gameState.flagsUsed}/{gameState.minesCount}
				</div>
				<div>
					<span class="font-semibold">Cellules révélées:</span>
					{gameState.cellsRevealed}/{gameState.rows * gameState.cols - gameState.minesCount}
				</div>
			</div>
		{/if}
	</div>
{:else if showResult && result}
	<!-- Result Screen -->
	<div class="container mx-auto py-8">
		<MultiplayerResultScreen
			{result}
			currentUserId={user?.id || ''}
			difficulty={match.difficulty || 'beginner'}
			matchType={match.matchType || 'quick'}
			onPlayAgain={handlePlayAgain}
			onReturnToMenu={handleReturnToMenu}
		/>
	</div>
{:else}
	<!-- Fallback: Unknown State -->
	<div class="flex min-h-screen items-center justify-center p-4">
		<Card class="p-6 text-center">
			<div class="mb-4 text-5xl">⚠️</div>
			<h2 class="mb-2 text-xl font-semibold text-foreground">État inattendu</h2>
			<p class="mb-4 text-sm text-muted-foreground">Le match est dans un état inattendu.</p>
			<Button onclick={handleReturnToMenu}>Retour au menu</Button>
		</Card>
	</div>
{/if}
