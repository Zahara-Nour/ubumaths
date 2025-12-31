<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import GameStats from '$lib/components/game/minesweeper/GameStats.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Format time in seconds to mm:ss format
	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	// Get difficulty label in French
	function getDifficultyLabel(difficulty: string): string {
		return (
			{
				beginner: 'Facile',
				intermediate: 'Intermédiaire',
				expert: 'Difficile'
			}[difficulty] || difficulty
		);
	}

	// Get status badge variant
	function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' {
		return status === 'won' ? 'default' : status === 'lost' ? 'destructive' : 'secondary';
	}

	// Get status label
	function getStatusLabel(status: string): string {
		return (
			{
				won: 'Victoire ✓',
				lost: 'Défaite ✗',
				in_progress: 'En cours',
				not_started: 'Non commencée'
			}[status] || status
		);
	}
</script>

<svelte:head>
	<title>Mes statistiques - Démineur | UbuMaths</title>
	<meta name="description" content="Voir mes statistiques au jeu Démineur" />
</svelte:head>

<div class="space-y-8">
	<!-- Header -->
	<div class="space-y-2">
		<div class="flex items-center justify-between">
			<h1 class="text-3xl font-bold text-foreground">Démineur - Mes statistiques</h1>
			<a href="/games/minesweeper">
				<Button variant="outline">← Retour au jeu</Button>
			</a>
		</div>
		<p class="text-muted-foreground">Consultez vos performances et votre historique de jeu</p>
	</div>

	<Separator />

	<!-- Overall Statistics by Difficulty -->
	<div>
		<h2 class="mb-4 text-xl font-semibold text-foreground">Vue d'ensemble</h2>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			{#each data.statistics as stats (stats.difficulty)}
				<GameStats {...stats} />
			{/each}
		</div>
	</div>

	<Separator />

	<!-- Recent Games History -->
	<div>
		<h2 class="mb-4 text-xl font-semibold text-foreground">Historique récent</h2>

		{#if data.recentGames.length === 0}
			<Card class="p-12 text-center">
				<p class="mb-4 text-muted-foreground">Vous n'avez pas encore joué au Démineur</p>
				<a href="/games/minesweeper">
					<Button>Commencer une partie</Button>
				</a>
			</Card>
		{:else}
			<div class="overflow-x-auto rounded-lg border border-border">
				<table class="w-full text-sm">
					<thead class="border-b border-border bg-muted/50">
						<tr>
							<th class="px-4 py-3 text-left font-semibold text-foreground">Date</th>
							<th class="px-4 py-3 text-left font-semibold text-foreground">Difficulté</th>
							<th class="px-4 py-3 text-center font-semibold text-foreground">Statut</th>
							<th class="px-4 py-3 text-center font-semibold text-foreground">Temps</th>
							<th class="px-4 py-3 text-center font-semibold text-foreground">Points</th>
							<th class="hidden px-4 py-3 text-center font-semibold text-foreground sm:table-cell"
								>Gidouilles</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each data.recentGames as game (game.id)}
							<tr class="transition-colors hover:bg-muted/50">
								<td class="px-4 py-3 text-muted-foreground">
									{new Date(game.created_at).toLocaleDateString('fr-FR', {
										year: 'numeric',
										month: 'long',
										day: 'numeric',
										hour: '2-digit',
										minute: '2-digit'
									})}
								</td>
								<td class="px-4 py-3">
									<Badge variant="outline">
										{getDifficultyLabel(game.difficulty)}
									</Badge>
								</td>
								<td class="px-4 py-3 text-center">
									<Badge variant={getStatusVariant(game.status)}>
										{getStatusLabel(game.status)}
									</Badge>
								</td>
								<td class="px-4 py-3 text-center font-medium text-foreground">
									{formatTime(game.time_seconds)}
								</td>
								<td class="px-4 py-3 text-center font-medium text-foreground">
									{#if game.status === 'won' && game.points_earned > 0}
										<span class="text-primary">+{game.points_earned}</span>
									{:else}
										<span class="text-muted-foreground">—</span>
									{/if}
								</td>
								<td class="hidden px-4 py-3 text-center font-medium text-foreground sm:table-cell">
									{#if game.status === 'won' && game.gidouilles_awarded > 0}
										<span class="text-amber-500">+{game.gidouilles_awarded}</span>
									{:else}
										<span class="text-muted-foreground">—</span>
									{/if}
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
			<a href="/leaderboards/minesweeper">
				<Button>Classement →</Button>
			</a>
		</div>
	</Card>
</div>
