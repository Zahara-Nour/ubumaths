<!--
	CatalogueGallery — cartes d'une rubrique du catalogue Automaths
	===============================================================

	Montée par le catalogue seulement quand la rubrique est dépliée (bits-ui rend
	aussi le contenu fermé, masqué par `hidden` : la page conditionne le montage).
	Les aperçus ne sont calculés que pour elle, après un
	premier affichage « Chargement… », et retenus par `templatePreview` (une
	rubrique rouverte ne recalcule rien). Un modèle sans aperçu est omis ; une
	rubrique sans aucun aperçu le dit.
-->
<script lang="ts">
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
	function computeCards(list: QuestionTemplate[]): CardData[] {
		const result: CardData[] = [];
		for (const template of list) {
			const preview = templatePreview(template);
			if (preview) result.push({ template, preview });
		}
		return result;
	}

	// Calcul différé : « Chargement… » (et l'accordéon) s'affichent d'abord.
	// Relancé si la liste change (liste des modèles relue après invalidate()).
	$effect(() => {
		const current = templates;
		cards = null;
		const timer = setTimeout(() => {
			cards = computeCards(current);
		}, 0);
		return () => clearTimeout(timer);
	});
</script>

{#if cards === null}
	<p class="text-sm text-muted-foreground">Chargement…</p>
{:else if cards.length === 0}
	<p class="text-sm text-muted-foreground">Aucun aperçu disponible pour cette rubrique.</p>
{:else}
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each cards as card (card.template.id)}
			<QuestionPreviewCard template={card.template} preview={card.preview} />
		{/each}
	</div>
{/if}
