<script lang="ts">
	/**
	 * Tuile d'un modèle dans la grille Automaths
	 *
	 * Décision de David (2026-09-29) : la tuile EST la flash-card de la question
	 * (non interactive, avec son bouton de retournement), sous un intitulé fait
	 * du titre et de la description du modèle (branche, notion et sous-notion
	 * sont affichées par la page : liste des notions, section). Un clic sur la tuile ne fait rien. En dessous, le
	 * bouton de « Ma série » (la grille n'a ni durée ni répétitions) : « Ajouter »,
	 * puis « Dans ma série », qui retire la question entière (répétitions et durée comprises).
	 * Au-dessus de la carte (chantier `automaths`, 2026-11-26) : niveaux du modèle
	 * et flèches des variations (`TileCard`).
	 */
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import TileCard from '#lib/components/questions/TileCard.svelte';
	import { MarkdownRenderer } from '#lib/components/markdown/index.ts';
	import { convertLegacyLatexToMarkdown } from '#lib/utils/latex-syntax-adapter.ts';
	import { CATALOGUE_TILE_CARD_HEIGHT } from '#lib/components/questions/tile-card.ts';
	import { Plus, Check } from '@lucide/svelte';
	import { questionCart } from '#lib/stores/questionCart.svelte.ts';
	import type { QuestionInstance, QuestionTemplate } from '#lib/questions/types.ts';

	let {
		template,
		preview
	}: {
		template: QuestionTemplate;
		preview: QuestionInstance;
	} = $props();

	const titleId = $props.id();

	let isInCart = $derived(questionCart.hasTemplate(template.id));

	function handleCartClick() {
		if (isInCart) questionCart.removeFromCart(template.id);
		else questionCart.addToCart(template.id, 1);
	}
</script>

<!-- Groupe nommé par le titre : les boutons de toutes les tuiles portent le même nom -->
<div
	class="tile flex h-full flex-col gap-3"
	style:--tile-card-default={CATALOGUE_TILE_CARD_HEIGHT}
	role="group"
	aria-labelledby={titleId}
>
	<!-- Intitulé : titre et description du modèle (branche, notion et sous-notion
	     sont affichées par la page : liste des notions, section) -->
	<!-- flex-1 : la zone s'étire, les cartes d'une même rangée commencent à la même hauteur -->
	<div class="flex flex-1 items-start justify-between gap-2" data-tile-heading>
		<div class="min-w-0">
			<div class="tile-title" id={titleId}>
				<MarkdownRenderer content={convertLegacyLatexToMarkdown(template.title)} />
			</div>
			<!-- Les modèles d'une même rubrique partagent souvent leur titre : la
			     description les distingue (« Somme égale à 10 », « avec retenue »…) -->
			{#if template.description}
				<div class="tile-description" data-tile-description>
					<MarkdownRenderer content={convertLegacyLatexToMarkdown(template.description)} />
				</div>
			{/if}
		</div>
		<Badge variant="outline" class="shrink-0 text-xs" title="Difficulté">{template.level}</Badge>
	</div>

	<!-- La flash-card, sous ses niveaux et ses variations -->
	<!-- Plus basse sur téléphone (règle .tile ci-dessous) -->
	<TileCard {template} {preview} height="var(--tile-card-height)" />

	<!-- Ajout à « Ma série », ou retrait -->
	<div class="flex justify-end">
		<Button
			size="sm"
			variant={isInCart ? 'default' : 'outline'}
			class="gap-2"
			onclick={handleCartClick}
			title={isInCart ? 'Retirer de ma série' : undefined}
			aria-label={isInCart ? 'Dans ma série : retirer' : 'Ajouter à ma série'}
		>
			{#if isInCart}
				<Check class="h-4 w-4" />
				Dans ma série
			{:else}
				<Plus class="h-4 w-4" />
				Ajouter
			{/if}
		</Button>
	</div>
</div>

<style>
	/* Hauteur de la flash-card : celle des tuiles (18rem), 13,5rem sur téléphone (< 640 px) */
	.tile {
		--tile-card-height: var(--tile-card-default);
	}

	@media (width < 40rem) {
		.tile {
			--tile-card-height: 13.5rem;
		}
	}

	/*
	 * Tailles de l'intitulé. `app.css` impose `main p { font-size: …1rem… !important }`
	 * (réglage « A − / + ») : une classe Tailwind ne suffit pas. Ces règles, plus
	 * précises, gardent la mise à l'échelle par --font-scale.
	 */
	.tile-description :global(p) {
		margin: 0;
		font-size: calc(0.75rem * var(--font-scale, 1)) !important;
		line-height: calc(1rem * var(--font-scale, 1)) !important;
	}

	.tile-description :global(p) {
		color: var(--color-muted-foreground) !important;
	}

	.tile-title :global(p) {
		margin: 0;
		font-weight: 500;
		font-size: calc(0.875rem * var(--font-scale, 1)) !important;
		line-height: calc(1.25rem * var(--font-scale, 1)) !important;
	}
</style>
