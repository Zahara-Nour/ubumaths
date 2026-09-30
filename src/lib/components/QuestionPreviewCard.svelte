<script lang="ts">
	/**
	 * Tuile d'un modèle dans la grille Automaths
	 *
	 * Décision de David (2026-09-29) : la tuile EST la flash-card de la question
	 * (non interactive, avec son bouton de retournement), sous un intitulé fait
	 * du sous-domaine, du titre et de la description du modèle (2026-09-30 ;
	 * thème et domaine sont déjà affichés par la page). Un clic sur la tuile ne fait rien. En dessous, le
	 * bouton d'ajout au panier (la grille n'a ni durée ni répétitions).
	 */
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import FlashCard from '$lib/components/questions/FlashCard.svelte';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import { convertLegacyLatexToMarkdown } from '$lib/utils/latex-syntax-adapter';
	import { TILE_CARD_HEIGHT } from '$lib/components/questions/tile-card';
	import { Plus, Check } from '@lucide/svelte';
	import { questionCart } from '$lib/stores/questionCart.svelte';
	import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';

	let {
		template,
		preview
	}: {
		template: QuestionTemplate;
		preview: QuestionInstance;
	} = $props();

	let category = $derived({
		theme: template.theme,
		domain: template.domain,
		subdomain: template.subdomain || null,
		level: template.level
	});
	let isInCart = $derived(questionCart.hasCategory(category));

	function handleAddToCart() {
		questionCart.addToCart(category, 1);
	}
</script>

<div class="flex h-full flex-col gap-3">
	<!-- Intitulé : sous-domaine et titre du modèle (thème et domaine sont déjà
	     affichés par la page : sélecteur et onglet) -->
	<!-- flex-1 : la zone s'étire, les cartes d'une même rangée commencent à la même hauteur -->
	<div class="flex flex-1 items-start justify-between gap-2" data-tile-heading>
		<div class="min-w-0">
			{#if template.subdomain}
				<p class="tile-subdomain text-muted-foreground">{template.subdomain}</p>
			{/if}
			<div class="tile-title">
				<MarkdownRenderer content={convertLegacyLatexToMarkdown(template.title)} />
			</div>
			<!-- Les modèles d'un même sous-domaine partagent souvent leur titre : la
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

	<!-- Ajout au panier -->
	<div class="flex justify-end">
		<Button
			size="sm"
			variant={isInCart ? 'default' : 'outline'}
			class="gap-2"
			onclick={handleAddToCart}
			disabled={isInCart}
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
	.tile-subdomain,
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
