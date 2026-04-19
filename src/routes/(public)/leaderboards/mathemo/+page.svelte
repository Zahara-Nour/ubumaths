<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import { Trophy, ArrowLeft } from 'lucide-svelte';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function getMedalEmoji(rank: number): string {
		return (
			{
				1: '🥇',
				2: '🥈',
				3: '🥉'
			}[rank] || ''
		);
	}

	function getRankClass(rank: number): string {
		if (rank === 1) return 'bg-amber-500/20 border-l-4 border-amber-500';
		if (rank === 2) return 'bg-gray-500/20 border-l-4 border-gray-400';
		if (rank === 3) return 'bg-orange-600/20 border-l-4 border-orange-600';
		return '';
	}

	function formatScore(score: number): string {
		return score.toLocaleString('fr-FR');
	}

	function formatWinRate(won: number, played: number): string {
		if (played === 0) return '-';
		return Math.round((won / played) * 100) + '%';
	}
</script>

<svelte:head>
	<title>Classement Mathémo | UbuMaths</title>
	<meta name="description" content="Classement global du jeu Mathémo - Score cumulé" />
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
				class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-600 text-xl"
			>
				🔤
			</div>
			<div>
				<h1 class="text-2xl font-bold text-foreground md:text-3xl">Mathémo</h1>
				<p class="text-sm text-muted-foreground">Classement par score cumulé</p>
			</div>
		</div>
	</div>

	<Separator class="mb-6" />

	<!-- User's Rank Card -->
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
			<a href="/games/mathemo">
				<Button>Jouer à Mathémo</Button>
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
							Victoires
						</th>
						<th class="hidden px-3 py-3 text-center font-semibold text-foreground sm:table-cell">
							Taux
						</th>
						<th class="hidden px-3 py-3 text-center font-semibold text-foreground md:table-cell">
							Meilleur mot
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
									<UserAvatar
										avatar_url={entry.avatar_url}
										role="student"
										firstname={entry.name}
										class="h-8 w-8"
									/>
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
									{formatScore(entry.total_score)}
								</span>
							</td>
							<td class="hidden px-3 py-3 text-center text-muted-foreground sm:table-cell">
								{entry.games_won}/{entry.games_played}
							</td>
							<td class="hidden px-3 py-3 text-center text-muted-foreground sm:table-cell">
								{formatWinRate(entry.games_won, entry.games_played)}
							</td>
							<td class="hidden px-3 py-3 text-center text-muted-foreground md:table-cell">
								{entry.best_word_length > 0 ? `${entry.best_word_length} lettres` : '-'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Play CTA -->
		<div class="mt-6 text-center">
			<a href="/games/mathemo">
				<Button variant="outline">Jouer à Mathémo</Button>
			</a>
		</div>
	{/if}
</div>
