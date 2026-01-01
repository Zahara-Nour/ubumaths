<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import { Trophy, ArrowLeft } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Split leaderboard into ranked (10+ games) and provisional (< 10 games)
	const rankedPlayers = $derived(data.leaderboard.filter((e) => (e.top_games_count || 0) >= 10));
	const provisionalPlayers = $derived(
		data.leaderboard.filter((e) => (e.top_games_count || 0) < 10)
	);

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

	// Format points with thousands separator
	function formatPoints(points: number): string {
		return points.toLocaleString('fr-FR');
	}
</script>

<svelte:head>
	<title>Classement Démineur | UbuMaths</title>
	<meta
		name="description"
		content="Classement global du jeu Démineur - Moyenne des 10 meilleures parties"
	/>
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
				<p class="text-sm text-muted-foreground">
					Classement par moyenne des 10 meilleures parties
				</p>
			</div>
		</div>
	</div>

	<Separator class="mb-6" />

	<!-- User's Rank Card (only if authenticated and has a rank) -->
	{#if data.currentUserId && data.userRank}
		<Card class="mb-6 border-primary/20 bg-primary/5 p-4 md:p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-muted-foreground">Votre position</p>
					<p class="text-2xl font-bold text-foreground">#{data.userRank}</p>
				</div>
				<div class="text-right">
					<p class="text-3xl font-bold text-primary">{getMedalEmoji(data.userRank)}</p>
				</div>
			</div>
		</Card>
	{/if}

	<!-- Ranked Players Table (10+ games) -->
	{#if rankedPlayers.length === 0 && provisionalPlayers.length === 0}
		<Card class="p-12 text-center">
			<Trophy class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
			<p class="mb-4 text-muted-foreground">Aucun joueur dans le classement</p>
		</Card>
	{:else}
		{#if rankedPlayers.length > 0}
			<div class="overflow-x-auto rounded-lg border border-border">
				<table class="w-full text-sm">
					<thead class="border-b border-border bg-muted/50">
						<tr>
							<th class="w-16 px-3 py-3 text-center font-semibold text-foreground">Rang</th>
							<th class="px-3 py-3 text-left font-semibold text-foreground">Joueur</th>
							<th class="px-3 py-3 text-center font-semibold text-foreground">Moyenne</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each rankedPlayers as entry, index (entry.student_id)}
							<tr class={`transition-colors hover:bg-muted/50 ${getRankClass(index + 1)}`}>
								<td class="px-3 py-3 text-center font-bold text-foreground">
									<span class="text-lg">{getMedalEmoji(index + 1)}</span>
									<span class="ml-2 text-sm">#{index + 1}</span>
								</td>
								<td class="px-3 py-3">
									<p class="font-semibold text-foreground">
										{entry.firstname || ''}
										<span class="hidden sm:inline">{entry.lastname || ''}</span>
									</p>
									{#if entry.student_id === data.currentUserId}
										<Badge class="mt-1" variant="default">Vous</Badge>
									{/if}
								</td>
								<td class="px-3 py-3 text-center">
									<span class="font-mono font-bold text-primary">
										{formatPoints(entry.avg_top_10 || 0)}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<Card class="p-8 text-center">
				<p class="text-muted-foreground">Aucun joueur classé (10 parties minimum)</p>
			</Card>
		{/if}

		<!-- Provisional Players (< 10 games) -->
		{#if provisionalPlayers.length > 0}
			<div class="mt-8">
				<h2 class="mb-3 text-lg font-semibold text-muted-foreground">
					Non classés (moins de 10 parties)
				</h2>
				<div class="overflow-x-auto rounded-lg border border-border/50">
					<table class="w-full text-sm">
						<thead class="border-b border-border bg-muted/30">
							<tr>
								<th class="px-3 py-2 text-left font-medium text-muted-foreground">Joueur</th>
								<th class="px-3 py-2 text-center font-medium text-muted-foreground">Moyenne</th>
								<th class="px-3 py-2 text-center font-medium text-muted-foreground">Parties</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border/50">
							{#each provisionalPlayers as entry (entry.student_id)}
								<tr class="transition-colors hover:bg-muted/30">
									<td class="px-3 py-2">
										<p class="text-foreground">
											{entry.firstname || ''}
											<span class="hidden sm:inline">{entry.lastname || ''}</span>
										</p>
										{#if entry.student_id === data.currentUserId}
											<Badge class="mt-1" variant="secondary">Vous</Badge>
										{/if}
									</td>
									<td class="px-3 py-2 text-center">
										<span class="font-mono text-muted-foreground">
											{formatPoints(entry.avg_top_10 || 0)}
										</span>
									</td>
									<td class="px-3 py-2 text-center text-muted-foreground">
										{entry.top_games_count || 0}/10
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	{/if}
</div>
