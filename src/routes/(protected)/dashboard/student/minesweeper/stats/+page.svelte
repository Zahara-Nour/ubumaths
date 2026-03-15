<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import GameStats from '$lib/components/game/minesweeper/GameStats.svelte';
	import LeaderboardTable from '$lib/components/game/minesweeper/LeaderboardTable.svelte';
	import type { PageData } from './$types';

	let showLeaderboard = $state(false);

	const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

	let { data }: { data: PageData } = $props();

	type Game = (typeof data.effectivePeriods)[number]['games'][number];

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function getDifficultyLabel(difficulty: string): string {
		return (
			{
				beginner: 'Débutant',
				intermediate: 'Intermédiaire',
				expert: 'Expert'
			}[difficulty] || difficulty
		);
	}

	function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' {
		return status === 'won' ? 'default' : status === 'lost' ? 'destructive' : 'secondary';
	}

	function getStatusLabel(status: string): string {
		return (
			{
				won: 'Victoire',
				lost: 'Défaite',
				in_progress: 'En cours',
				not_started: 'Non commencée'
			}[status] || status
		);
	}

	/** Format "YYYY-MM-DDTHHh" → "ven. 6 mars 15h" */
	function formatPeriodBound(periodStr: string): string {
		const [dateStr, hourStr] = periodStr.split('T');
		const [y, m, d] = dateStr.split('-').map(Number);
		const date = new Date(y, m - 1, d);
		const dayName = DAY_NAMES[date.getDay()];
		const monthStr = date.toLocaleDateString('fr-FR', { month: 'long' });
		return `${dayName} ${d} ${monthStr} ${hourStr}`;
	}

	/** Get the best theoretical_reward from the actual games in this period */
	function getPeriodBest(games: Game[]): number | null {
		let best: number | null = null;
		for (const g of games) {
			if (g.theoretical_reward != null && (best === null || g.theoretical_reward > best)) {
				best = g.theoretical_reward;
			}
		}
		return best;
	}

	/** Check if this game has the best theoretical_reward in the period */
	function isWeekBestGame(game: Game, periodBest: number | null): boolean {
		if (game.theoretical_reward == null || periodBest == null) return false;
		return Math.abs(game.theoretical_reward - periodBest) < 0.005;
	}
</script>

<svelte:head>
	<title>Mes statistiques - Démineur | UbuMaths</title>
	<meta name="description" content="Voir mes statistiques au jeu Démineur" />
</svelte:head>

<div class="space-y-8">
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold text-foreground">Démineur - Mes statistiques</h1>
		<a href="/games/minesweeper">
			<Button variant="outline">Retour au jeu</Button>
		</a>
	</div>

	{#if data.leaderboardRank}
		<Card class="p-4">
			<div class="flex items-center justify-between">
				<p class="text-lg text-muted-foreground">
					Classement général : <span class="text-2xl font-bold text-foreground"
						>#{data.leaderboardRank}</span
					>
					<span class="ml-2">({Math.round(data.leaderboardScore)} pts)</span>
				</p>
				<Button variant="outline" size="sm" onclick={() => (showLeaderboard = true)}
					>Voir le classement</Button
				>
			</div>
		</Card>

		<Dialog.Root bind:open={showLeaderboard}>
			<Dialog.Content class="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
				<Dialog.Title>Classement général</Dialog.Title>
				<LeaderboardTable entries={data.leaderboard} currentUserId={data.currentUserId} />
			</Dialog.Content>
		</Dialog.Root>
	{/if}

	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		{#each data.statistics as stats (stats.difficulty)}
			<GameStats {...stats} />
		{/each}
	</div>

	<div>
		<h2 class="mb-4 text-xl font-semibold text-foreground">Historique récent</h2>

		{#if data.effectivePeriods.length === 0}
			<Card class="p-12 text-center">
				<p class="mb-4 text-muted-foreground">Vous n'avez pas encore joué au Démineur</p>
				<a href="/games/minesweeper">
					<Button>Commencer une partie</Button>
				</a>
			</Card>
		{:else}
			<div class="space-y-4">
				{#each data.effectivePeriods as period (period.periodStart)}
					{@const bestReward = getPeriodBest(period.games)}
					{@const bonusAwarded =
						period.weeklyBests.length > 0 &&
						period.weeklyBests.every((wb) => wb.bonus_awarded != null)}
					<div class="overflow-x-auto rounded-lg border border-border">
						<div
							class="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/80 px-4 py-2"
						>
							<span class="text-sm font-semibold text-foreground">
								{formatPeriodBound(period.periodStart)} — {formatPeriodBound(period.periodEnd)}
							</span>
							{#if bestReward != null}
								<span class="flex items-center gap-2 text-sm">
									Bonus semaine :<span class="font-semibold">{bestReward.toFixed(2)}</span>
									{#if bonusAwarded}
										<Badge variant="default">Bonus attribué</Badge>
									{:else if period.isPast}
										<Badge variant="outline">Bonus non distribué</Badge>
									{:else}
										<Badge variant="secondary">En attente</Badge>
									{/if}
								</span>
							{/if}
						</div>
						<table class="w-full text-sm">
							<thead class="border-b border-border bg-muted/50">
								<tr>
									<th class="px-4 py-2 text-left font-semibold text-foreground">Date</th>
									<th class="px-4 py-2 text-left font-semibold text-foreground">Difficulté</th>
									<th class="px-4 py-2 text-center font-semibold text-foreground">Statut</th>
									<th class="px-4 py-2 text-center font-semibold text-foreground">Temps</th>
									<th class="px-4 py-2 text-center font-semibold text-foreground">Points</th>
									<th
										class="hidden px-4 py-2 text-center font-semibold text-foreground sm:table-cell"
										>Gidouilles</th
									>
									<th
										class="hidden px-4 py-2 text-center font-semibold text-foreground sm:table-cell"
										>Bonus semaine</th
									>
								</tr>
							</thead>
							<tbody class="divide-y divide-border">
								{#each period.games as game (game.id)}
									{@const isBest = isWeekBestGame(game, bestReward)}
									<tr class="transition-colors hover:bg-muted/50 {isBest ? 'bg-primary/5' : ''}">
										<td class="px-4 py-2 text-muted-foreground">
											{new Date(game.created_at).toLocaleDateString('fr-FR', {
												timeZone: data.schoolTimezone,
												day: 'numeric',
												month: 'short',
												hour: '2-digit',
												minute: '2-digit'
											})}
										</td>
										<td class="px-4 py-2">
											<Badge variant="outline">
												{getDifficultyLabel(game.difficulty)}
											</Badge>
										</td>
										<td class="px-4 py-2 text-center">
											<Badge variant={getStatusVariant(game.status)}>
												{getStatusLabel(game.status)}
											</Badge>
										</td>
										<td class="px-4 py-2 text-center font-medium text-foreground">
											{formatTime(game.time_seconds)}
										</td>
										<td class="px-4 py-2 text-center font-medium text-foreground">
											{#if game.status === 'won' && game.points_earned > 0}
												+{game.points_earned}
											{:else}
												<span class="text-muted-foreground">—</span>
											{/if}
										</td>
										<td
											class="hidden px-4 py-2 text-center font-medium text-foreground sm:table-cell"
										>
											{#if game.status === 'won' && game.gidouilles_awarded > 0}
												+{game.gidouilles_awarded}
											{:else}
												<span class="text-muted-foreground">—</span>
											{/if}
										</td>
										<td
											class="hidden px-4 py-2 text-center font-medium sm:table-cell {isBest
												? 'font-bold text-primary'
												: 'text-foreground'}"
										>
											{#if game.theoretical_reward != null}
												{game.theoretical_reward.toFixed(2)}
												{#if isBest}★{/if}
											{:else}
												<span class="text-muted-foreground">—</span>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<Card class="bg-gradient-to-r from-primary/10 to-transparent p-6">
		<div class="flex items-center justify-between">
			<div>
				<h3 class="font-semibold text-foreground">Voir le classement global</h3>
				<p class="mt-1 text-sm text-muted-foreground">
					Comparez vos performances avec les autres joueurs
				</p>
			</div>
			<a href="/leaderboards/minesweeper">
				<Button>Classement</Button>
			</a>
		</div>
	</Card>
</div>
