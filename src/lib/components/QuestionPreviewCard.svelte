<script lang="ts">
	/**
	 * Tuile d'un modèle dans la grille Automaths
	 *
	 * Décision de David (2026-09-29) : la tuile EST la flash-card de la question
	 * (non interactive, avec son bouton de retournement), sous un intitulé fait
	 * du titre et de la description du modèle (branche, notion et sous-notion
	 * sont affichées par la page : sélecteur, onglet, rubrique). Un clic sur la tuile ne fait rien. En dessous, le
	 * bouton du panier (la grille n'a ni durée ni répétitions) : « Ajouter au panier »,
	 * puis « Dans le panier », qui retire la question entière (répétitions et durée comprises).
	 */
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import FlashCard from '#lib/components/questions/FlashCard.svelte';
	import { MarkdownRenderer } from '#lib/components/markdown/index.ts';
	import { convertLegacyLatexToMarkdown } from '#lib/utils/latex-syntax-adapter.ts';
	import { TILE_CARD_HEIGHT } from '#lib/components/questions/tile-card.ts';
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

	let isInCart = $derived(questionCart.hasTemplate(template.id));

	function handleCartClick() {
		if (isInCart) questionCart.removeFromCart(template.id);
		else questionCart.addToCart(template.id, 1);
	}
</script>

<div class="flex h-full flex-col gap-3">
	<!-- Intitulé : titre et description du modèle (branche, notion et sous-notion
	     sont affichées par la page : sélecteur, onglet, rubrique) -->
	<!-- flex-1 : la zone s'étire, les cartes d'une même rangée commencent à la même hauteur -->
	<div class="flex flex-1 items-start justify-between gap-2" data-tile-heading>
		<div class="min-w-0">
			<div class="tile-title">
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
		<Badge variant="outline" class="shrink-0 text-xs" title="Niveau">{template.level}</Badge>
	</div>

	<!-- La flash-card elle-même -->
	<FlashCard instance={preview} interactive={false} size="sm" height={TILE_CARD_HEIGHT} />

	<!-- Ajout au panier, ou retrait -->
	<div class="flex justify-end">
		<Button
			size="sm"
			variant={isInCart ? 'default' : 'outline'}
			class="gap-2"
			onclick={handleCartClick}
			title={isInCart ? 'Retirer du panier' : undefined}
			aria-label={isInCart ? 'Dans le panier : retirer' : undefined}
		>
			{#if isInCart}
				<Check class="h-4 w-4" />
				Dans le panier
			{:else}
				<Plus class="h-4 w-4" />
				Ajouter au panier
			{/if}
		</Button>
	</div>
</div>

<style>
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
