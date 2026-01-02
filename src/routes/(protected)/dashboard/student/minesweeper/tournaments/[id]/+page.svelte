<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import MinesweeperBoard from '$lib/components/game/minesweeper/MinesweeperBoard.svelte';
	import GameControls from '$lib/components/game/minesweeper/GameControls.svelte';
	import TournamentLeaderboard from '$lib/components/game/minesweeper/TournamentLeaderboard.svelte';
	import { minesweeperStore } from '$lib/stores/minesweeper.svelte';
	import { cn } from '$lib/utils';
	import { DIFFICULTY_LABELS } from '$lib/types/minesweeper';
	import type { PageData } from './$types';

	// Props
	let { data }: { data: PageData } = $props();

	// State
	let tournament = $state(data.tournament);
	let standings = $state(data.standings);
	let userStanding = $state(data.userStanding);
	let _inProgressGame = $state(data.inProgressGame);
	let isStartingGame = $state(false);

	// Derived state
	let difficultyLabel = $derived(DIFFICULTY_LABELS[tournament.difficulty] || tournament.difficulty);

	let difficultyColor = $derived.by(() => {
		switch (tournament.difficulty) {
			case 'beginner':
				return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
			case 'intermediate':
				return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
			case 'expert':
				return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
			default:
				return '';
		}
	});

	// Format time remaining as countdown
	let timeRemaining = $derived.by(() => {
		const endDate = new Date(tournament.end_date);
		const now = new Date();
		const seconds = Math.max(0, Math.floor((endDate.getTime() - now.getTime()) / 1000));

		if (seconds <= 0) return 'Termine';

		const days = Math.floor(seconds / 86400);
		const hours = Math.floor((seconds % 86400) / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);

		if (days > 0) {
			return `${days}j ${hours}h`;
		}
		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		}
		return `${minutes}m`;
	});

	let isTournamentEnded = $derived.by(() => {
		const endDate = new Date(tournament.end_date);
		return new Date() > endDate;
	});

	// Format score with "pts" suffix
	function formatScore(score: number): string {
		return `${Math.round(score)} pts`;
	}

	// Start a new tournament game using the store's tournament methods
	async function startNewGame() {
		if (isStartingGame || isTournamentEnded) return;

		isStartingGame = true;

		try {
			// Use the store's tournament method - it handles the API call and game initialization
			await minesweeperStore.startTournamentGame(tournament.id, tournament.difficulty);

			// The store now shows modals on game completion,
			// so we need to refresh standings when returning from modal
		} catch (err) {
			// Error is already handled by the store with toaster
			console.error('Error starting tournament game:', err);
		} finally {
			isStartingGame = false;
		}
	}

	// Watch for tournament mode exit to refresh standings
	$effect(() => {
		// When the store exits tournament mode (after modal interaction),
		// refresh the page data to get updated standings
		if (!minesweeperStore.isInTournamentMode() && !minesweeperStore.currentGame) {
			// Only refresh if we had an active game before
			if (standings.length > 0) {
				invalidateAll().then(() => {
					// Update local state from refreshed data
					tournament = data.tournament;
					standings = data.standings;
					userStanding = data.userStanding;
				});
			}
		}
	});

	// Initialize store and handle in-progress game on mount
	onMount(async () => {
		// Initialize minesweeper store with supabase client and profile
		// These come from parent layout data
		if (data.supabase && data.profile) {
			minesweeperStore.init(data.supabase, data.profile);
		}

		// TODO: Resume in-progress game if exists
		// For now, user needs to start a new game
	});

	// Cleanup on destroy
	onDestroy(() => {
		minesweeperStore.cleanup();
	});

	// Get current game state from store
	let currentGame = $derived(minesweeperStore.currentGame);
	let minesRemaining = $derived(currentGame ? currentGame.minesCount - currentGame.flagsUsed : 0);
	let isGameInProgress = $derived(
		currentGame && currentGame.status !== 'won' && currentGame.status !== 'lost'
	);
	let isLoading = $derived(minesweeperStore.isLoading);
	let isCompletingGame = $derived(minesweeperStore.isCompletingGame);

	// Reset handler (for failed games)
	function handleReset() {
		if (!isTournamentEnded) {
			startNewGame();
		}
	}
</script>

<svelte:head>
	<title>{tournament.name} - Tournoi Demineur | UbuMaths</title>
	<meta name="description" content="Participez au tournoi {tournament.name}" />
</svelte:head>

<div class="space-y-8 pb-8">
	<!-- Header -->
	<div class="space-y-4">
		<div class="flex flex-wrap items-center justify-between gap-4">
			<div>
				<a
					href="/dashboard/student/minesweeper/tournaments"
					class="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				>
					<span aria-hidden="true">←</span>
					Retour aux tournois
				</a>
				<h1 class="text-3xl font-bold text-foreground">{tournament.name}</h1>
				{#if tournament.description}
					<p class="mt-1 text-muted-foreground">{tournament.description}</p>
				{/if}
			</div>
			<Badge class={cn('px-4 py-2 text-lg', difficultyColor)}>
				{difficultyLabel}
			</Badge>
		</div>

		<!-- Tournament Info Card -->
		<Card class="bg-card p-6">
			<div class="flex flex-wrap items-center justify-between gap-4">
				<div class="space-y-3">
					<div class="flex items-center gap-2 text-sm">
						<span aria-hidden="true">⏳</span>
						<span class={cn(isTournamentEnded && 'font-semibold text-destructive')}>
							{isTournamentEnded ? 'Tournoi termine' : `Temps restant : ${timeRemaining}`}
						</span>
					</div>
					<div class="flex items-center gap-2 text-sm text-muted-foreground">
						<span aria-hidden="true">🏆</span>
						<span>Moyenne des {tournament.top_x_games} meilleures parties</span>
					</div>
					<div class="flex flex-wrap items-center gap-3 text-sm">
						{#each Object.entries(tournament.podium_rewards) as [place, reward] (place)}
							<div class="flex items-center gap-1">
								{#if place === '1'}
									<span>🥇</span>
								{:else if place === '2'}
									<span>🥈</span>
								{:else if place === '3'}
									<span>🥉</span>
								{:else}
									<span>#{place}</span>
								{/if}
								<span class="font-bold text-amber-500">{reward}</span>
							</div>
						{/each}
						<span class="text-muted-foreground">gidouilles</span>
					</div>
				</div>

				<!-- Player's current standing -->
				{#if userStanding}
					<div class="rounded-lg bg-muted/50 p-4 text-center">
						<p class="text-sm text-muted-foreground">Votre position</p>
						<p class="text-3xl font-bold text-foreground">
							{#if userStanding.position <= 3}
								{#if userStanding.position === 1}🥇{:else if userStanding.position === 2}🥈{:else}🥉{/if}
							{/if}
							#{userStanding.position}
						</p>
						<div class="mt-2 flex gap-4 text-sm">
							<div>
								<span class="font-bold text-green-600">{userStanding.games_won}</span>
								<span class="text-muted-foreground"> victoires</span>
							</div>
							<div>
								<span class="font-bold">{formatScore(userStanding.average_score)}</span>
								<span class="text-muted-foreground"> moy.</span>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</Card>
	</div>

	<Separator />

	<!-- Game Section -->
	<div class="space-y-4">
		{#if currentGame}
			<!-- Game in progress or completing -->
			<div class="mx-auto max-w-4xl space-y-4">
				<!-- Game Controls -->
				<GameControls
					timeElapsed={currentGame.timeElapsed}
					{minesRemaining}
					gameStatus={currentGame.status}
					difficulty={tournament.difficulty}
					onReset={handleReset}
				/>

				<!-- Game Board -->
				<MinesweeperBoard
					difficulty={tournament.difficulty}
					gameState={currentGame}
					onCellReveal={(row, col) => minesweeperStore.revealCell(row, col)}
					onCellFlag={(row, col) => minesweeperStore.toggleFlag(row, col)}
					onCellChord={(row, col) => minesweeperStore.chordClick(row, col)}
					disabled={!isGameInProgress || isLoading || isCompletingGame}
				/>

				{#if isCompletingGame}
					<div class="text-center">
						<p class="animate-pulse text-muted-foreground">Enregistrement de votre resultat...</p>
					</div>
				{/if}
			</div>
		{:else if !isTournamentEnded}
			<!-- No active game - show start button -->
			<div class="flex justify-center py-4">
				<Button onclick={startNewGame} disabled={isStartingGame} size="lg">
					{#if isStartingGame}
						<span class="mr-2 animate-spin">⏳</span>
						Demarrage...
					{:else}
						Jouer
					{/if}
				</Button>
			</div>
		{/if}
	</div>

	<Separator />

	<!-- Leaderboard Section -->
	<div class="space-y-4">
		<div class="flex items-center justify-between">
			<h2 class="text-2xl font-bold text-foreground">
				{#if isTournamentEnded}<span class="mr-2">🏁</span>{/if}Classement{#if isTournamentEnded}
					final{/if}
			</h2>
			<Badge variant="outline" class="px-3 py-1">
				{standings.length} participant{standings.length !== 1 ? 's' : ''}
			</Badge>
		</div>

		<TournamentLeaderboard {standings} currentUserId={data.currentUserId} maxRows={20} />
	</div>

	<!-- Navigation -->
	<div class="flex flex-wrap gap-3">
		<a href="/dashboard/student/minesweeper/tournaments">
			<Button variant="outline">Tous les tournois</Button>
		</a>
		<a href="/dashboard/student/minesweeper/stats">
			<Button variant="outline">Mes statistiques</Button>
		</a>
		<a href="/games/minesweeper">
			<Button variant="outline">Jeu libre</Button>
		</a>
	</div>
</div>
