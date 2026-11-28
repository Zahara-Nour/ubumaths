<!--
	LazyCatalogueGallery — cartes d'une sous-notion, calculées à l'approche
	======================================================================

	Les sous-notions d'une notion sont toutes dépliées (jusqu'à 111 questions) :
	la galerie, et ses aperçus, ne sont montés que quand la section approche de
	l'écran (800 px d'avance). Avant, une réserve de la hauteur estimée (1, 2 ou 3
	colonnes selon la largeur, comme la grille de CatalogueGallery), ou quand la page le demande (`force` : une
	pastille vise une section plus bas, celles du dessus doivent avoir leur
	hauteur). Une galerie montée le reste.
-->
<script lang="ts">
	import CatalogueGallery from '#lib/components/questions/CatalogueGallery.svelte';
	import type { QuestionTemplate } from '#lib/questions/types.ts';

	// Constantes
	// Avance de l'approche : la galerie se calcule avant d'être à l'écran
	const ROOT_MARGIN = '800px 0px';

	let { templates, force = false }: { templates: QuestionTemplate[]; force?: boolean } = $props();

	// Variables
	let near = $state(false);
	let mounted = $derived(near || force);

	// Functions
	/** Attache à la réserve : la galerie se monte quand elle approche de l'écran */
	function observeApproach(placeholder: HTMLElement) {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					near = true;
					observer.disconnect();
				}
			},
			{ rootMargin: ROOT_MARGIN }
		);
		observer.observe(placeholder);
		return () => observer.disconnect();
	}
</script>

{#if mounted}
	<CatalogueGallery {templates} />
{:else}
	<div
		{@attach observeApproach}
		data-gallery-placeholder
		class="min-h-[calc(var(--rows-1)*15rem)] sm:min-h-[calc(var(--rows-2)*18rem)] lg:min-h-[calc(var(--rows-3)*18rem)]"
		style:--rows-1={templates.length}
		style:--rows-2={Math.ceil(templates.length / 2)}
		style:--rows-3={Math.ceil(templates.length / 3)}
	></div>
{/if}
