<script lang="ts">
	/**
	 * Tuile d'un modèle dans la grille Automaths
	 *
	 * Décision de David (2026-09-29) : la tuile EST la flash-card de la question
	 * (non interactive, avec son bouton de retournement), sous l'intitulé
	 * « Thème / Domaine ». Un clic sur la tuile ne fait rien. En dessous, le
	 * bouton d'ajout au panier (la grille n'a ni durée ni répétitions).
	 */
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import FlashCard from '$lib/components/questions/FlashCard.svelte';
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

<div class="flex flex-col gap-3">
	<!-- Intitulé -->
	<div class="flex items-center justify-between gap-2">
		<p class="text-sm font-medium">
			{template.theme}
			<span class="text-muted-foreground"> / {template.domain}</span>
		</p>
		<Badge variant="outline" class="text-xs" title="Niveau">{template.level}</Badge>
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
