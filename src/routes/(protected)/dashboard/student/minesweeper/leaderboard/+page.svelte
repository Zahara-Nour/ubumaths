<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import MySelect from '$lib/components/MySelect.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Track selected difficulty
	let selectedDifficulty = $state<'beginner' | 'intermediate' | 'expert'>('beginner');

	// Difficulty select items for MySelect component
	const difficultyItems = [
		{ value: 'beginner', label: 'Facile' },
		{ value: 'intermediate', label: 'Intermédiaire' },
		{ value: 'expert', label: 'Difficile' }
	];

	// Get current leaderboard for selected difficulty
	let currentLeaderboard = $derived(
		data.leaderboardByDifficulty[selectedDifficulty] || []
	);

	// Get user's rank in current difficulty
	let userRank = $derived(
		data.userPositions[selectedDifficulty] || null
	);

	// Format time in seconds to mm:ss format
	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	// Get medal emoji for top 3
	function getMedalEmoji(rank: number): string {
		return {
			1: '🥇',
			2: '🥈',
			3: '🥉'
		}[rank] || '';
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

<div class="space-y-8">
	<!-- Header -->
	<div class="space-y-2">
		<div class="flex items-center justify-between">
			<h1 class="text-3xl font-bold text-foreground">Démineur - Classement global</h1>
			<a href="/games/minesweeper">
				<Button variant="outline">← Retour au jeu</Button>
			</a>
		</div>
		<p class="text-muted-foreground">Découvrez les meilleures performances des joueurs</p>
	</div>

	<Separator />

	<!-- Difficulty Selector -->
	<div class="flex items-center gap-4">
		<label for="difficulty" class="font-semibold text-foreground">Difficulté:</label>
		<div class="w-48">
			<MySelect
				type="single"
				bind:value={selectedDifficulty}
				items={difficultyItems}
			/>
		</div>
	</div>

	<!-- User's Rank Card -->
	{#if userRank}
		<Card class="p-6 bg-primary/5 border-primary/20">
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
	<div>
		{#if currentLeaderboard.length === 0}
			<Card class="p-12 text-center">
				<p class="text-muted-foreground mb-4">Aucun joueur pour cette difficulté pour le moment</p>
				<a href="/games/minesweeper">
					<Button>Jouer maintenant</Button>
				</a>
			</Card>
		{:else}
			<div class="overflow-x-auto rounded-lg border border-border">
				<table class="w-full text-sm">
					<thead class="bg-muted/50 border-b border-border">
						<tr>
							<th class="px-4 py-3 text-center font-semibold text-foreground w-12">Rang</th>
							<th class="px-4 py-3 text-left font-semibold text-foreground">Joueur</th>
							<th class="px-4 py-3 text-center font-semibold text-foreground">Meilleur temps</th>
							<th class="px-4 py-3 text-center font-semibold text-foreground">Gidouilles</th>
							<th class="px-4 py-3 text-right font-semibold text-foreground">Taux victoire</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each currentLeaderboard as entry, idx (entry.student_id + '-' + entry.difficulty)}
							<tr class={`hover:bg-muted/50 transition-colors ${getRankClass(entry.rank || 0)}`}>
								<td class="px-4 py-3 text-center font-bold text-foreground">
									<span class="text-lg">{getMedalEmoji(entry.rank || 0)}</span>
									<span class="ml-2">#{entry.rank || '—'}</span>
								</td>
								<td class="px-4 py-3">
									<div class="flex items-center gap-3">
										<div>
											<p class="font-semibold text-foreground">
												{entry.firstname || ''} {entry.lastname || ''}
											</p>
											{#if entry.student_id === data.currentUserId}
												<Badge class="mt-1" variant="default">C'est vous!</Badge>
											{/if}
										</div>
									</div>
								</td>
								<td class="px-4 py-3 text-center">
									<span class="font-mono font-semibold text-foreground">
										{entry.best_time !== null ? formatTime(entry.best_time) : '—'}
									</span>
								</td>
								<td class="px-4 py-3 text-center">
									<span class="text-amber-500 font-semibold">{entry.total_gidouilles || 0}</span>
								</td>
								<td class="px-4 py-3 text-right text-muted-foreground text-xs">
									<span class="inline-block px-2 py-1 rounded bg-muted text-xs">
										{entry.win_rate || 0}%
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Navigation -->
	<div class="flex gap-3">
		<a href="/dashboard/student/minesweeper/stats">
			<Button variant="outline">Mes statistiques</Button>
		</a>
		<a href="/games/minesweeper">
			<Button>Jouer une partie</Button>
		</a>
	</div>
</div>
