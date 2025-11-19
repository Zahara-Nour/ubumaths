<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import AchievementShowcase from '$lib/components/game/minesweeper/AchievementShowcase.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Mes succès - Démineur - UbuMaths</title>
	<meta name="description" content="Consultez tous vos succès débloqués au Démineur" />
</svelte:head>

<main class="min-h-screen bg-gradient-to-br from-background to-muted p-4 md:p-8">
	<div class="mx-auto max-w-6xl space-y-6">
		<!-- Header -->
		<div class="flex flex-wrap items-center justify-between gap-4">
			<div>
				<h1 class="text-3xl font-bold text-foreground md:text-4xl">Mes succès - Démineur</h1>
				<p class="mt-1 text-sm text-muted-foreground">
					Débloquez tous les succès en jouant au Démineur
				</p>
			</div>
			<div class="flex gap-2">
				<a href="/games/minesweeper">
					<Button variant="outline">
						<span class="mr-2">🎮</span>
						Jouer
					</Button>
				</a>
				<a href="/dashboard/student/minesweeper/stats">
					<Button variant="outline">
						<span class="mr-2">📊</span>
						Statistiques
					</Button>
				</a>
			</div>
		</div>

		<Separator />

		<!-- Achievement showcase -->
		<Card class="p-6">
			<AchievementShowcase achievements={data.achievements} stats={data.stats} />
		</Card>

		<!-- Help section -->
		<Card class="bg-muted/50 p-6">
			<h3 class="mb-3 font-semibold text-foreground">Comment débloquer les succès</h3>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div class="space-y-2 text-sm text-muted-foreground">
					<div class="flex gap-3">
						<span class="text-lg" aria-hidden="true">🎯</span>
						<div>
							<strong class="text-foreground">Premier pas</strong> - Remportez votre première victoire
							au Démineur
						</div>
					</div>
					<div class="flex gap-3">
						<span class="text-lg" aria-hidden="true">🚫</span>
						<div>
							<strong class="text-foreground">Sans drapeaux</strong> - Gagnez une partie sans placer
							aucun drapeau (pour chaque difficulté)
						</div>
					</div>
				</div>
				<div class="space-y-2 text-sm text-muted-foreground">
					<div class="flex gap-3">
						<span class="text-lg" aria-hidden="true">✨</span>
						<div>
							<strong class="text-foreground">Perfectionniste</strong> - Gagnez sans révéler de cellules
							inutiles (pour chaque difficulté)
						</div>
					</div>
					<div class="flex gap-3">
						<span class="text-lg" aria-hidden="true">⚡</span>
						<div>
							<strong class="text-foreground">Vitesse éclair</strong> - Gagnez sous un temps limite (pour
							chaque difficulté)
						</div>
					</div>
				</div>
			</div>
		</Card>
	</div>
</main>
