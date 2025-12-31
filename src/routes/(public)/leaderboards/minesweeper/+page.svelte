<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import MySelect from '$lib/components/MySelect.svelte';
	import { Trophy, ArrowLeft } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Track selected difficulty
	let selectedDifficulty = $state<'beginner' | 'intermediate' | 'expert'>('beginner');

	// Difficulty select items for MySelect component
	const difficultyItems = [
		{ value: 'beginner', label: 'Débutant' },
		{ value: 'intermediate', label: 'Intermédiaire' },
		{ value: 'expert', label: 'Expert' }
	];

	// Get current leaderboard for selected difficulty
	let currentLeaderboard = $derived(data.leaderboardByDifficulty[selectedDifficulty] || []);

	// Get user's rank in current difficulty (if authenticated)
	let userRank = $derived(data.userPositions[selectedDifficulty] || null);

	// Format time in seconds to mm:ss format
	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	// Get medal emoji for top 3
	function getMedalEmoji(rank: number): string {
		return (
			{
				1: '🥇',
				2: '🥈',
				3: '🥉'
			}[rank] || ''
		);
	}

	// Get medal/highlight for top players
	function getRankClass(rank: number): string {
		if (rank === 1) return 'bg-amber-500/20 border-l-4 border-amber-500';
		if (rank === 2) return 'bg-gray-500/20 border-l-4 border-gray-400';
		if (rank === 3) return 'bg-orange-600/20 border-l-4 border-orange-600';
		return '';
	}
</script>

<svelte:head>
	<title>Classement Démineur | UbuMaths</title>
	<meta name="description" content="Classement global du jeu Démineur" />
</svelte:head>

<div class="mx-auto max-w-4xl p-4 md:p-6">
	<!-- Header -->
	<div class="mb-6 flex items-center gap-4">
		<a href="/leaderboards">
			<Button variant="ghost" size="icon">
				<ArrowLeft class="h-5 w-5" />
			</Button>
		</a>
		<div class="flex items-center gap-3">
			<div
				class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-xl"
			>
				💣
			</div>
			<div>
				<h1 class="text-2xl font-bold text-foreground md:text-3xl">Démineur</h1>
				<p class="text-sm text-muted-foreground">Classement global</p>
			</div>
		</div>
	</div>

	<Separator class="mb-6" />

	<!-- Difficulty Selector -->
	<div class="mb-6 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
		<label for="difficulty" class="font-semibold text-foreground">Difficulté :</label>
		<div class="w-full sm:w-48">
			<MySelect type="single" bind:value={selectedDifficulty} items={difficultyItems} />
		</div>
	</div>

	<!-- User's Rank Card (only if authenticated and has a rank) -->
	{#if data.currentUserId && userRank}
		<Card class="mb-6 border-primary/20 bg-primary/5 p-4 md:p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-muted-foreground">Votre position</p>
					<p class="text-2xl font-bold text-foreground">#{userRank}</p>
				</div>
				<div class="text-right">
					<p class="text-3xl font-bold text-primary">{getMedalEmoji(userRank)}</p>
				</div>
			</div>
		</Card>
	{/if}

	<!-- Leaderboard Table -->
	{#if currentLeaderboard.length === 0}
		<Card class="p-12 text-center">
			<Trophy class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
			<p class="mb-4 text-muted-foreground">Aucun joueur pour cette difficulté</p>
			<a href="/games/minesweeper">
				<Button>Jouer maintenant</Button>
			</a>
		</Card>
	{:else}
		<div class="overflow-x-auto rounded-lg border border-border">
			<table class="w-full text-sm">
				<thead class="border-b border-border bg-muted/50">
					<tr>
						<th
							class="w-10 px-2 py-2 text-center font-semibold text-foreground sm:w-12 sm:px-4 sm:py-3"
							>Rang</th
						>
						<th class="px-2 py-2 text-left font-semibold text-foreground sm:px-4 sm:py-3">Joueur</th
						>
						<th class="px-2 py-2 text-center font-semibold text-foreground sm:px-4 sm:py-3"
							>Temps</th
						>
						<th
							class="hidden px-2 py-2 text-center font-semibold text-foreground sm:table-cell sm:px-4 sm:py-3"
							>Victoires</th
						>
						<th
							class="hidden px-2 py-2 text-right font-semibold text-foreground sm:table-cell sm:px-4 sm:py-3"
							>Taux</th
						>
					</tr>
				</thead>
				<tbody class="divide-y divide-border">
					{#each currentLeaderboard as entry (entry.student_id + '-' + entry.difficulty)}
						<tr class={`transition-colors hover:bg-muted/50 ${getRankClass(entry.rank || 0)}`}>
							<td class="px-2 py-2 text-center font-bold text-foreground sm:px-4 sm:py-3">
								<span class="text-base sm:text-lg">{getMedalEmoji(entry.rank || 0)}</span>
								<span class="ml-1 text-xs sm:ml-2 sm:text-sm">#{entry.rank || '—'}</span>
							</td>
							<td class="px-2 py-2 sm:px-4 sm:py-3">
								<div class="flex items-center gap-2 sm:gap-3">
									<div>
										<p class="text-xs font-semibold text-foreground sm:text-sm">
											{entry.firstname || ''}
											<span class="hidden sm:inline">{entry.lastname || ''}</span>
										</p>
										{#if entry.student_id === data.currentUserId}
											<Badge class="mt-1" variant="default">Vous</Badge>
										{/if}
									</div>
								</div>
							</td>
							<td class="px-2 py-2 text-center sm:px-4 sm:py-3">
								<span class="font-mono text-xs font-semibold text-foreground sm:text-sm">
									{entry.best_time !== null ? formatTime(entry.best_time) : '—'}
								</span>
							</td>
							<td class="hidden px-2 py-2 text-center sm:table-cell sm:px-4 sm:py-3">
								<span class="font-semibold text-foreground">{entry.games_won || 0}</span>
							</td>
							<td
								class="hidden px-2 py-2 text-right text-xs text-muted-foreground sm:table-cell sm:px-4 sm:py-3"
							>
								<span class="inline-block rounded bg-muted px-2 py-1 text-xs">
									{entry.win_rate || 0}%
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<!-- Navigation -->
	<div class="mt-6 flex flex-wrap gap-3">
		<a href="/leaderboards">
			<Button variant="outline">Tous les classements</Button>
		</a>
		<a href="/games/minesweeper">
			<Button>Jouer une partie</Button>
		</a>
	</div>
</div>
