<!--
	CatalogueProgrammeSections — un chapitre du programme, dans le catalogue Automaths
	================================================================================

	Une section par point du programme (son intitulé), dans l'ordre du BO, ses
	questions dessous (aperçus calculés à l'approche, LazyCatalogueGallery).
	Questions venues du nœud du point (aucune n'y est rattachée) : on le dit
	(« Questions de « Fractions » »).
	Point sans question : ligne grise « Pas encore de question ». La page
	remonte ce composant à chaque changement de chapitre (`{#key}`).
-->
<script lang="ts">
	import LazyCatalogueGallery from '#lib/components/questions/LazyCatalogueGallery.svelte';
	import type { ProgrammeChapter } from '#lib/questions/catalogue-programme.ts';

	let { chapter }: { chapter: ProgrammeChapter } = $props();

	function questionCount(n: number): string {
		return n === 1 ? '1 question' : `${n} questions`;
	}
</script>

<!-- tabindex -1 : la page y met le focus quand on choisit un chapitre (clavier, lecteur d'écran) -->
<h2
	id="catalogue-titre"
	tabindex="-1"
	class="mb-6 text-2xl font-semibold tracking-tight focus:outline-none"
>
	{chapter.name}
</h2>

<div class="space-y-10">
	{#each chapter.points as point (point.id)}
		<section aria-labelledby="point-{point.id}-titre">
			<h3 id="point-{point.id}-titre" class="mb-3 text-lg font-medium">
				{point.name}
				{#if point.templates.length > 0}
					<span class="text-sm font-normal text-muted-foreground"
						>· {questionCount(point.templates.length)}</span
					>
				{/if}
			</h3>
			{#if point.templates.length === 0}
				<p class="text-sm text-muted-foreground">Pas encore de question</p>
			{:else}
				{#if point.fallbackNodeName}
					<p class="-mt-2 mb-3 text-sm text-muted-foreground">
						Questions de « {point.fallbackNodeName} »
					</p>
				{/if}
				<LazyCatalogueGallery templates={point.templates} />
			{/if}
		</section>
	{/each}
</div>
