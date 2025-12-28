<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	import type { PageData } from './$types';
	import { GAME_PACKS } from '$lib/types/guess-who';

	let { data }: { data: PageData } = $props();

	// Format time in seconds to mm:ss format
	function formatTime(seconds: number | null): string {
		if (seconds === null) return '—';
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	// Format percentage
	function formatPercent(value: number): string {
		return `${Math.round(value)}%`;
	}

	// Get pack name
	function getPackName(packId: string): string {
		return GAME_PACKS[packId as keyof typeof GAME_PACKS]?.nameFr || packId;
	}

	// Get rarity color
	function getRarityColor(rarity: string): string {
		switch (rarity) {
			case 'legendary':
				return 'text-amber-500';
			case 'epic':
				return 'text-purple-500';
			case 'rare':
				return 'text-blue-500';
			default:
				return 'text-muted-foreground';
		}
	}
</script>

<svelte:head>
	<title>Mes statistiques - Guess Who Math | UbuMaths</title>
	<meta name="description" content="Voir mes statistiques au jeu Guess Who Math" />
</svelte:head>

<div class="space-y-8">
	<!-- Header -->
	<div class="space-y-2">
		<div class="flex items-center justify-between">
			<h1 class="text-3xl font-bold text-foreground">Guess Who Math - Mes statistiques</h1>
			<a href="/games/guess-who">
				<Button variant="outline">← Retour au jeu</Button>
			</a>
		</div>
		<p class="text-muted-foreground">Consultez vos performances et vos réussites</p>
	</div>

	<Separator />

	<!-- Overall Summary -->
	<div>
		<h2 class="mb-4 text-xl font-semibold text-foreground">Vue d'ensemble</h2>
		<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
			<Card class="p-4 text-center">
				<div class="text-3xl font-bold text-primary">{data.aggregated.totalGamesPlayed}</div>
				<div class="text-sm text-muted-foreground">Parties jouées</div>
			</Card>
			<Card class="p-4 text-center">
				<div class="text-3xl font-bold text-green-500">{data.aggregated.totalGamesWon}</div>
				<div class="text-sm text-muted-foreground">Victoires</div>
			</Card>
			<Card class="p-4 text-center">
				<div class="text-3xl font-bold text-blue-500">
					{formatPercent(data.aggregated.overallWinRate)}
				</div>
				<div class="text-sm text-muted-foreground">Taux de victoire</div>
			</Card>
			<Card class="p-4 text-center">
				<div class="text-3xl font-bold text-amber-500">{data.aggregated.bestWinStreak}</div>
				<div class="text-sm text-muted-foreground">Meilleure série</div>
			</Card>
		</div>
	</div>

	<Separator />

	<!-- Stats by Pack -->
	{#if data.stats.length > 0}
		<div>
			<h2 class="mb-4 text-xl font-semibold text-foreground">Statistiques par pack</h2>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each data.stats as stat (stat.id)}
					<Card class="p-4">
						<div class="mb-2 flex items-center justify-between">
							<h3 class="font-semibold text-foreground">{getPackName(stat.packId)}</h3>
							<Badge variant="outline">{stat.gamesPlayed} parties</Badge>
						</div>
						<div class="space-y-2 text-sm">
							<div class="flex justify-between">
								<span class="text-muted-foreground">Victoires</span>
								<span class="font-medium">{stat.gamesWon} / {stat.gamesPlayed}</span>
							</div>
							<Progress value={stat.winRate} max={100} class="h-2" />
							<div class="flex justify-between">
								<span class="text-muted-foreground">Taux de victoire</span>
								<span class="font-medium">{formatPercent(stat.winRate)}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-muted-foreground">Précision réponses</span>
								<span class="font-medium">{formatPercent(stat.accuracy)}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-muted-foreground">Meilleur temps</span>
								<span class="font-medium">{formatTime(stat.bestTimeSeconds)}</span>
							</div>
							{#if stat.fewestQuestionsWin}
								<div class="flex justify-between">
									<span class="text-muted-foreground">Moins de questions</span>
									<span class="font-medium">{stat.fewestQuestionsWin}</span>
								</div>
							{/if}
						</div>
					</Card>
				{/each}
			</div>
		</div>

		<Separator />
	{/if}

	<!-- Achievements -->
	<div>
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-semibold text-foreground">Succès</h2>
			<Badge variant="secondary">
				{data.unlockedCount} / {data.totalAchievements}
			</Badge>
		</div>

		{#if data.achievements.length === 0}
			<Card class="p-6 text-center">
				<p class="text-muted-foreground">Les succès seront disponibles prochainement !</p>
			</Card>
		{:else}
			<div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
				{#each data.achievements as achievement (achievement.id)}
					<Card class="flex items-center gap-3 p-3 {achievement.unlocked ? '' : 'opacity-50'}">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full {achievement.unlocked
								? 'bg-primary/20'
								: 'bg-muted'}"
						>
							<span class="text-lg">{achievement.unlocked ? '🏆' : '🔒'}</span>
						</div>
						<div class="flex-1">
							<div class="flex items-center gap-2">
								<span class="font-medium text-foreground">{achievement.nameFr}</span>
								<span class="text-xs {getRarityColor(achievement.rarity)}"
									>{achievement.points} pts</span
								>
							</div>
							<p class="text-xs text-muted-foreground">{achievement.descriptionFr}</p>
							{#if achievement.unlockedAt}
								<p class="text-xs text-green-500">
									Débloqué le {new Date(achievement.unlockedAt).toLocaleDateString('fr-FR')}
								</p>
							{/if}
						</div>
					</Card>
				{/each}
			</div>
		{/if}
	</div>

	<Separator />

	<!-- Recent Games -->
	<div>
		<h2 class="mb-4 text-xl font-semibold text-foreground">Parties récentes</h2>

		{#if data.recentGames.length === 0}
			<Card class="p-12 text-center">
				<p class="mb-4 text-muted-foreground">Vous n'avez pas encore joué à Guess Who Math</p>
				<a href="/games/guess-who">
					<Button>Commencer une partie</Button>
				</a>
			</Card>
		{:else}
			<div class="overflow-x-auto rounded-lg border border-border">
				<table class="w-full text-sm">
					<thead class="border-b border-border bg-muted/50">
						<tr>
							<th class="px-4 py-3 text-left font-semibold text-foreground">Date</th>
							<th class="px-4 py-3 text-left font-semibold text-foreground">Pack</th>
							<th class="px-4 py-3 text-center font-semibold text-foreground">Résultat</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each data.recentGames as game (game.id)}
							<tr class="transition-colors hover:bg-muted/50">
								<td class="px-4 py-3 text-muted-foreground">
									{new Date(game.createdAt).toLocaleDateString('fr-FR', {
										year: 'numeric',
										month: 'long',
										day: 'numeric',
										hour: '2-digit',
										minute: '2-digit'
									})}
								</td>
								<td class="px-4 py-3">
									<Badge variant="outline">{game.packName}</Badge>
								</td>
								<td class="px-4 py-3 text-center">
									<Badge variant={game.won ? 'default' : 'destructive'}>
										{game.won ? 'Victoire ✓' : 'Défaite ✗'}
									</Badge>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Link to leaderboard -->
	<Card class="bg-gradient-to-r from-primary/10 to-transparent p-6">
		<div class="flex items-center justify-between">
			<div>
				<h3 class="font-semibold text-foreground">Voir le classement global</h3>
				<p class="mt-1 text-sm text-muted-foreground">
					Comparez vos performances avec les autres joueurs
				</p>
			</div>
			<a href="/dashboard/student/guess-who/leaderboard">
				<Button>Classement →</Button>
			</a>
		</div>
	</Card>
</div>
