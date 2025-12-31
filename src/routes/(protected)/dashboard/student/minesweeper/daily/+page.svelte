<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { minesweeperStore } from '$lib/stores/minesweeper.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import MinesweeperBoard from '$lib/components/game/minesweeper/MinesweeperBoard.svelte';
	import GameControls from '$lib/components/game/minesweeper/GameControls.svelte';
	import { cn } from '$lib/utils';
	import type { PageData } from './$types';
	import type { GridStateDTO } from '$lib/types/minesweeper';

	// Props
	let { data }: { data: PageData } = $props();

	// State
	let challenge = $state(data.challenge);
	let userAttempt = $state(data.userAttempt);
	let leaderboard = $state(data.leaderboard);
	let userPosition = $state(data.userPosition);
	let isSubmitting = $state(false);
	let gameInitialized = $state(false);

	// Derived state
	let hasAttempted = $derived(userAttempt !== null);
	let canPlay = $derived(!hasAttempted && !isSubmitting);

	// Format date
	let challengeDate = $derived.by(() => {
		const date = new Date(challenge.challenge_date);
		return new Intl.DateTimeFormat('fr-FR', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		}).format(date);
	});

	// Difficulty label in French
	let difficultyLabel = $derived.by(() => {
		const labels: Record<string, string> = {
			beginner: 'Facile',
			intermediate: 'Intermédiaire',
			expert: 'Difficile'
		};
		return labels[challenge.difficulty] || challenge.difficulty;
	});

	// Format time as MM:SS
	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	// Get medal emoji for top 3
	function getMedalEmoji(position: number): string {
		const medals: Record<number, string> = {
			1: '🥇',
			2: '🥈',
			3: '🥉'
		};
		return medals[position] || '';
	}

	// Get rank CSS class for top 3
	function getRankClass(position: number, isCurrentUser: boolean): string {
		const baseClass = 'transition-colors';
		const highlightClass = isCurrentUser ? 'ring-2 ring-primary' : '';

		if (position === 1) {
			return cn(
				baseClass,
				'bg-yellow-100 dark:bg-yellow-900/20 border-l-4 border-yellow-500',
				highlightClass
			);
		}
		if (position === 2) {
			return cn(
				baseClass,
				'bg-gray-100 dark:bg-gray-800/50 border-l-4 border-gray-400',
				highlightClass
			);
		}
		if (position === 3) {
			return cn(
				baseClass,
				'bg-orange-100 dark:bg-orange-900/20 border-l-4 border-orange-500',
				highlightClass
			);
		}
		return cn(baseClass, 'hover:bg-muted/50', highlightClass);
	}

	// Get bonus text for top 3
	function getBonusText(position: number): string {
		const bonuses: Record<number, string> = {
			1: '+50 bonus',
			2: '+30 bonus',
			3: '+20 bonus'
		};
		return bonuses[position] || '';
	}

	// Get bonus color for top 3
	function getBonusColor(position: number): string {
		const colors: Record<number, string> = {
			1: 'text-yellow-600 dark:text-yellow-400',
			2: 'text-gray-600 dark:text-gray-400',
			3: 'text-orange-600 dark:text-orange-400'
		};
		return colors[position] || '';
	}

	// Convert current game grid to GridStateDTO
	function gridToDTO(grid: import('$lib/types/minesweeper').CellState[][]): GridStateDTO {
		const mines: [number, number][] = [];
		const revealed: [number, number][] = [];
		const flagged: [number, number][] = [];
		const adjacentCounts: Record<string, number> = {};

		for (let row = 0; row < grid.length; row++) {
			for (let col = 0; col < grid[row].length; col++) {
				const cell = grid[row][col];

				if (cell.isMine) {
					mines.push([row, col]);
				}
				if (cell.isRevealed) {
					revealed.push([row, col]);
				}
				if (cell.isFlagged) {
					flagged.push([row, col]);
				}
				if (cell.adjacentMines > 0 && !cell.isMine) {
					adjacentCounts[`${row},${col}`] = cell.adjacentMines;
				}
			}
		}

		return {
			rows: grid.length,
			cols: grid[0]?.length || 0,
			mines,
			revealed,
			flagged,
			adjacentCounts
		};
	}

	// Handle game completion
	async function handleGameComplete() {
		const game = minesweeperStore.currentGame;
		if (!game || isSubmitting) return;

		isSubmitting = true;

		try {
			const response = await fetch('/api/games/minesweeper/daily-challenge/complete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					challenge_id: challenge.id,
					time_seconds: game.timeElapsed,
					status: game.status,
					grid_state: gridToDTO(game.grid)
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Erreur lors de l'enregistrement");
			}

			const { attempt } = await response.json();
			userAttempt = attempt;

			// Refresh leaderboard
			const leaderboardRes = await fetch(
				'/api/games/minesweeper/daily-challenge/leaderboard?limit=100'
			);
			if (leaderboardRes.ok) {
				const leaderboardData = await leaderboardRes.json();
				leaderboard = leaderboardData.leaderboard;
				userPosition = leaderboardData.userPosition;
			}

			// Show success message
			if (game.status === 'won') {
				const positionText = userPosition ? ` - Rang #${userPosition}` : '';
				toaster.success(`Victoire !${positionText} - ${attempt.gidouilles_earned} gidouilles`);
			} else {
				toaster.error('Défaite ! Réessayez demain pour un nouveau défi');
			}
		} catch (err) {
			console.error('Error completing daily challenge:', err);
			const message = err instanceof Error ? err.message : 'Erreur inconnue';
			toaster.error(message);
		} finally {
			isSubmitting = false;
		}
	}

	// Watch for game completion
	$effect(() => {
		const game = minesweeperStore.currentGame;

		// Only handle completion if:
		// 1. Game exists and is finished (won or lost)
		// 2. User hasn't attempted yet
		// 3. Not already submitting
		// 4. Game was initialized (to avoid initial load triggering)
		if (
			game &&
			gameInitialized &&
			(game.status === 'won' || game.status === 'lost') &&
			!userAttempt &&
			!isSubmitting
		) {
			handleGameComplete();
		}
	});

	// Initialize game on mount
	onMount(async () => {
		// Only start game if user hasn't attempted yet
		// No need to initialize store with supabase - we handle saving via API endpoint
		if (!userAttempt) {
			await minesweeperStore.startNewGame(challenge.difficulty, challenge.seed);
			gameInitialized = true;
		}
	});

	// Cleanup on destroy
	onDestroy(() => {
		minesweeperStore.cleanup();
	});

	// Get current game state
	let currentGame = $derived(minesweeperStore.currentGame);
	let minesRemaining = $derived(currentGame ? currentGame.minesCount - currentGame.flagsUsed : 0);

	// Reset handler (for completed games - creates new game for testing)
	async function handleReset() {
		if (!userAttempt) {
			await minesweeperStore.startNewGame(challenge.difficulty, challenge.seed);
			gameInitialized = true;
		}
	}
</script>

<svelte:head>
	<title>Défi Quotidien - Démineur | UbuMaths</title>
	<meta
		name="description"
		content="Participez au défi quotidien du démineur et comparez vos performances"
	/>
</svelte:head>

<div class="space-y-8 pb-8">
	<!-- Header -->
	<div class="space-y-4">
		<div class="flex flex-wrap items-center justify-between gap-4">
			<div>
				<h1 class="text-3xl font-bold text-foreground">Défi Quotidien</h1>
				<p class="mt-1 text-muted-foreground">
					Même grille pour tous ! Classement journalier avec bonus pour le top 3.
				</p>
			</div>
			<a href="/leaderboards/minesweeper">
				<Button variant="outline">Classement global</Button>
			</a>
		</div>

		<!-- Challenge Info Card -->
		<Card class="bg-card p-6">
			<div class="space-y-3">
				<div class="flex flex-wrap items-center justify-between gap-4">
					<div>
						<p class="text-sm text-muted-foreground">Date du défi</p>
						<p class="text-lg font-semibold capitalize">{challengeDate}</p>
					</div>
					<Badge variant="default" class="px-4 py-2 text-lg">
						{difficultyLabel}
					</Badge>
				</div>

				<Separator />

				<!-- User Attempt Status -->
				{#if userAttempt}
					<div class="flex items-center gap-3">
						{#if userAttempt.status === 'won'}
							<span class="text-2xl">✅</span>
							<div class="flex-1">
								<p class="font-semibold text-green-600 dark:text-green-400">
									Défi terminé avec succès !
								</p>
								<p class="text-sm text-muted-foreground">
									Temps: {formatTime(userAttempt.time_seconds)}
									{#if userPosition}
										• Rang: #{userPosition}
									{/if}
									• Récompense: {userAttempt.gidouilles_earned} gidouilles
								</p>
							</div>
						{:else}
							<span class="text-2xl">❌</span>
							<div class="flex-1">
								<p class="font-semibold text-destructive">Défi échoué</p>
								<p class="text-sm text-muted-foreground">
									Temps: {formatTime(userAttempt.time_seconds)} • Réessayez demain !
								</p>
							</div>
						{/if}
					</div>
				{:else}
					<div class="flex items-center gap-3">
						<span class="text-2xl">⏳</span>
						<div>
							<p class="font-semibold text-foreground">
								Vous n'avez pas encore tenté le défi d'aujourd'hui
							</p>
							<p class="text-sm text-muted-foreground">
								Une seule tentative autorisée • Le chrono démarre au premier clic
							</p>
						</div>
					</div>
				{/if}
			</div>
		</Card>
	</div>

	<Separator />

	<!-- Game Section (only if not attempted) -->
	{#if canPlay && currentGame}
		<div class="space-y-4">
			<h2 class="text-2xl font-bold text-foreground">Jouer</h2>

			<div class="mx-auto max-w-4xl space-y-4">
				<!-- Game Controls -->
				<GameControls
					timeElapsed={currentGame.timeElapsed}
					{minesRemaining}
					gameStatus={currentGame.status}
					difficulty={challenge.difficulty}
					onReset={handleReset}
				/>

				<!-- Game Board -->
				<MinesweeperBoard
					difficulty={challenge.difficulty}
					gameState={currentGame}
					onCellReveal={(row, col) => minesweeperStore.revealCell(row, col)}
					onCellFlag={(row, col) => minesweeperStore.toggleFlag(row, col)}
					onCellChord={(row, col) => minesweeperStore.chordClick(row, col)}
					disabled={currentGame.status === 'won' || currentGame.status === 'lost' || isSubmitting}
				/>

				{#if isSubmitting}
					<div class="text-center">
						<p class="text-muted-foreground">Enregistrement de votre résultat...</p>
					</div>
				{/if}
			</div>
		</div>

		<Separator />
	{/if}

	<!-- Leaderboard Section -->
	<div class="space-y-4">
		<div class="flex items-center justify-between">
			<h2 class="text-2xl font-bold text-foreground">Classement du jour</h2>
			{#if userPosition}
				<Badge variant="outline" class="px-4 py-2 text-lg">
					Votre position: #{userPosition}
				</Badge>
			{/if}
		</div>

		{#if leaderboard.length === 0}
			<Card class="p-12 text-center">
				<p class="mb-4 text-lg text-muted-foreground">
					Aucune tentative pour le moment. Soyez le premier !
				</p>
				{#if !hasAttempted}
					<p class="text-sm text-muted-foreground">
						Jouez au défi ci-dessus pour apparaître dans le classement
					</p>
				{/if}
			</Card>
		{:else}
			<div class="overflow-x-auto rounded-lg border border-border">
				<table class="w-full text-sm">
					<thead class="border-b border-border bg-muted/50">
						<tr>
							<th class="w-20 px-4 py-3 text-center font-semibold text-foreground">Position</th>
							<th class="px-4 py-3 text-left font-semibold text-foreground">Joueur</th>
							<th class="px-4 py-3 text-center font-semibold text-foreground">Temps</th>
							<th class="px-4 py-3 text-right font-semibold text-foreground">Gidouilles</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each leaderboard as entry (entry.student_id)}
							{@const isCurrentUser = entry.student_id === data.currentUserId}
							<tr class={getRankClass(entry.position, isCurrentUser)}>
								<td class="px-4 py-3 text-center">
									<div class="flex items-center justify-center gap-2">
										{#if entry.position <= 3}
											<span class="text-2xl">{getMedalEmoji(entry.position)}</span>
										{/if}
										<span class="text-lg font-bold">#{entry.position}</span>
									</div>
								</td>
								<td class="px-4 py-3">
									<div class="flex items-center gap-3">
										<div>
											<p class="font-semibold text-foreground">
												{entry.firstname}
												{entry.lastname}
											</p>
											{#if isCurrentUser}
												<Badge class="mt-1" variant="default">C'est vous !</Badge>
											{/if}
										</div>
									</div>
								</td>
								<td class="px-4 py-3 text-center">
									<span class="font-mono text-lg font-semibold text-foreground">
										{formatTime(entry.time_seconds)}
									</span>
								</td>
								<td class="px-4 py-3 text-right">
									<div class="flex flex-col items-end">
										<span class="text-lg font-bold text-amber-500">
											{entry.gidouilles_earned}
										</span>
										{#if entry.position <= 3}
											<span class={cn('text-xs font-semibold', getBonusColor(entry.position))}>
												{getBonusText(entry.position)}
											</span>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Navigation -->
	<div class="flex flex-wrap gap-3">
		<a href="/dashboard/student/minesweeper/stats">
			<Button variant="outline">Mes statistiques</Button>
		</a>
		<a href="/games/minesweeper">
			<Button variant="outline">Jeu libre</Button>
		</a>
	</div>
</div>
