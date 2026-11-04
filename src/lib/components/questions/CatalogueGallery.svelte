<!--
	CatalogueGallery — cartes d'une rubrique du catalogue Automaths
	===============================================================

	Montée seulement quand la rubrique est dépliée (l'accordéon ne rend pas une
	rubrique fermée) : les aperçus ne sont calculés que pour elle, après un
	premier affichage « Chargement… », et retenus par `templatePreview` (une
	rubrique rouverte ne recalcule rien). Un modèle sans aperçu est omis.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import QuestionPreviewCard from '$lib/components/QuestionPreviewCard.svelte';
	import { templatePreview } from '$lib/questions/catalogue';
	import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';

	// Types
	interface CardData {
		template: QuestionTemplate;
		preview: QuestionInstance;
	}

	let { templates }: { templates: QuestionTemplate[] } = $props();

	// Variables
	let cards = $state<CardData[] | null>(null);

	// Functions
	function computeCards(): CardData[] {
		const result: CardData[] = [];
		for (const template of templates) {
			const preview = templatePreview(template);
			if (preview) result.push({ template, preview });
		}
		return result;
	}

	onMount(() => {
		// Laisse s'afficher « Chargement… » (et l'accordéon s'ouvrir) avant le calcul
		const timer = setTimeout(() => {
			cards = computeCards();
		}, 0);
		return () => clearTimeout(timer);
	});
</script>

{#if cards === null}
	<p class="text-sm text-muted-foreground">Chargement…</p>
{:else}
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each cards as card (card.template.id)}
			<QuestionPreviewCard template={card.template} preview={card.preview} />
		{/each}
	</div>
{/if}
