<script lang="ts">
	/**
	 * 2048 Game Page
	 * Educational math game where players combine powers of 2
	 */
	import Game2048 from './Game2048.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Trophy } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Toggle for rules visibility
	let showRules = $state(false);
</script>

<svelte:head>
	<title>2048 - UbuMaths</title>
	<meta
		name="description"
		content="Jeu 2048 éducatif - Apprenez les puissances de 2 en vous amusant !"
	/>
</svelte:head>

<div class="container mx-auto max-w-3xl px-4 py-8">
	<!-- Banner -->
	<div class="mb-8 overflow-hidden rounded-xl">
		<img
			src="/images/banner-2048.webp"
			alt="2048 - Un plateau de jeu coloré sur un chemin doré enchanteur"
			class="h-40 w-full object-cover sm:h-52 md:h-64"
		/>
	</div>

	<!-- Game Component -->
	<div class="mb-8">
		<Game2048
			serverBestScore={data.serverBestScore}
			canSaveScore={data.canSaveScore}
			vipCards={data.vipCards}
			initialUndoCards={data.undoCardsAvailable}
			initialBombCards={data.bombCardsAvailable}
			initialFreezeCards={data.freezeCardsAvailable}
			initialFusionCards={data.fusionCardsAvailable}
			initialJokerCards={data.jokerCardsAvailable}
			initialVisionCards={data.visionCardsAvailable}
			initialMultiplierCards={data.multiplierCardsAvailable}
			initialGidouilles={data.gidouilles}
		/>
	</div>

	<!-- Actions -->
	<div class="rules-section mx-auto max-w-md">
		<div class="mb-4 flex justify-center gap-3">
			<a href="/leaderboards/2048">
				<Button variant="outline" size="sm">
					<Trophy class="mr-2 h-4 w-4" />
					Classement
				</Button>
			</a>
			<Button onclick={() => (showRules = !showRules)} variant="outline" size="sm">
				{showRules ? 'Masquer les règles' : 'Afficher les règles'}
			</Button>
		</div>

		{#if showRules}
			<Card.Root class="bg-muted/30">
				<Card.Header>
					<Card.Title class="text-xl">Comment jouer ?</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div>
						<h3 class="mb-2 font-semibold">🎯 Objectif</h3>
						<p class="text-sm text-muted-foreground">
							Combinez les tuiles portant le même nombre pour créer une tuile de valeur double.
							L'objectif est d'atteindre la tuile <strong>2048</strong> !
						</p>
					</div>

					<div>
						<h3 class="mb-2 font-semibold">🎮 Contrôles</h3>
						<ul class="list-inside list-disc space-y-1 text-sm text-muted-foreground">
							<li><strong>Clavier :</strong> Utilisez les flèches directionnelles (↑ ↓ ← →)</li>
							<li><strong>Tactile :</strong> Glissez dans la direction souhaitée</li>
						</ul>
					</div>

					<div>
						<h3 class="mb-2 font-semibold">📐 Règles</h3>
						<ul class="list-inside list-disc space-y-1 text-sm text-muted-foreground">
							<li>Chaque mouvement fait glisser toutes les tuiles dans la direction choisie</li>
							<li>Deux tuiles identiques fusionnent pour former leur somme (2 + 2 = 4, etc.)</li>
							<li>Après chaque mouvement, une nouvelle tuile (2 ou 4) apparaît aléatoirement</li>
							<li>Le jeu se termine quand plus aucun mouvement n'est possible</li>
						</ul>
					</div>

					<div>
						<h3 class="mb-2 font-semibold">💡 Stratégie</h3>
						<ul class="list-inside list-disc space-y-1 text-sm text-muted-foreground">
							<li>Gardez vos tuiles de grande valeur dans un coin</li>
							<li>Construisez des chaînes de tuiles en ordre croissant</li>
							<li>Évitez de remplir complètement la grille</li>
							<li>Pensez plusieurs coups à l'avance</li>
						</ul>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
</div>
