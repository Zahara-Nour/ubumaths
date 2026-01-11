<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import { Trophy, ArrowLeft } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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

	// Format score with thousands separator
	function formatScore(score: number): string {
		return score.toLocaleString('fr-FR');
	}
</script>

<svelte:head>
	<title>Classement 2048 | UbuMaths</title>
	<meta name="description" content="Classement global du jeu 2048 - Meilleurs scores" />
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
				class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-xl"
			>
				🎮
			</div>
			<div>
				<h1 class="text-2xl font-bold text-foreground md:text-3xl">2048</h1>
				<p class="text-sm text-muted-foreground">Classement par meilleur score</p>
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

	<!-- Leaderboard Table -->
	{#if data.leaderboard.length === 0}
		<Card class="p-12 text-center">
			<Trophy class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
			<p class="mb-4 text-muted-foreground">Aucun joueur dans le classement</p>
			<a href="/games/2048">
				<Button>Jouer au 2048</Button>
			</a>
		</Card>
	{:else}
		<div class="overflow-x-auto rounded-lg border border-border">
			<table class="w-full text-sm">
				<thead class="border-b border-border bg-muted/50">
					<tr>
						<th class="w-16 px-3 py-3 text-center font-semibold text-foreground">Rang</th>
						<th class="px-3 py-3 text-left font-semibold text-foreground">Joueur</th>
						<th class="px-3 py-3 text-center font-semibold text-foreground">Score</th>
						<th class="hidden px-3 py-3 text-center font-semibold text-foreground sm:table-cell">
							Parties
						</th>
						<th class="hidden px-3 py-3 text-center font-semibold text-foreground md:table-cell">
							2048
						</th>
						<th class="hidden px-3 py-3 text-center font-semibold text-foreground md:table-cell">
							4096
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border">
					{#each data.leaderboard as entry (entry.user_id)}
						<tr class={`transition-colors hover:bg-muted/50 ${getRankClass(entry.rank)}`}>
							<td class="px-3 py-3 text-center font-bold text-foreground">
								<span class="text-lg">{getMedalEmoji(entry.rank)}</span>
								<span class="ml-2 text-sm">#{entry.rank}</span>
							</td>
							<td class="px-3 py-3">
								<div class="flex items-center gap-2">
									{#if entry.avatar_url}
										<img src={entry.avatar_url} alt="" class="h-8 w-8 rounded-full object-cover" />
									{/if}
									<div>
										<p class="font-semibold text-foreground">{entry.name}</p>
										{#if entry.user_id === data.currentUserId}
											<Badge class="mt-1" variant="default">Vous</Badge>
										{/if}
									</div>
								</div>
							</td>
							<td class="px-3 py-3 text-center">
								<span class="font-mono font-bold text-primary">
									{formatScore(entry.best_score)}
								</span>
							</td>
							<td class="hidden px-3 py-3 text-center text-muted-foreground sm:table-cell">
								{entry.games_played}
							</td>
							<td class="hidden px-3 py-3 text-center text-muted-foreground md:table-cell">
								{entry.tiles_2048_reached > 0 ? `${entry.tiles_2048_reached}x` : '-'}
							</td>
							<td class="hidden px-3 py-3 text-center text-muted-foreground md:table-cell">
								{entry.tiles_4096_reached > 0 ? `${entry.tiles_4096_reached}x` : '-'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Play CTA -->
		<div class="mt-6 text-center">
			<a href="/games/2048">
				<Button variant="outline">Jouer au 2048</Button>
			</a>
		</div>
	{/if}
</div>
