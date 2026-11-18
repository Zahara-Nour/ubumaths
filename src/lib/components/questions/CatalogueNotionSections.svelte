<!--
	CatalogueNotionSections — une notion du catalogue Automaths, dépliée
	===================================================================

	Pastilles des sous-notions (avec leur nombre de questions) en haut, qui
	défilent sur le côté et restent visibles en descendant ; un clic descend à
	la section. Toutes les sous-notions sont dépliées l'une sous l'autre ; leurs
	aperçus se calculent à l'approche (LazyCatalogueGallery). La page remonte
	ce composant à chaque changement de notion (`{#key}`).
-->
<script lang="ts">
	import { tick } from 'svelte';
	import LazyCatalogueGallery from '#lib/components/questions/LazyCatalogueGallery.svelte';
	import type { CatalogueNotion, CatalogueRubric } from '#lib/questions/catalogue.ts';

	// Constantes
	const GENERAL_SECTION_ID = 'general';

	let { notion }: { notion: CatalogueNotion } = $props();

	// Variables
	// Sections montées d'office jusqu'à cet indice (pastille cliquée), -1 : aucune
	let forcedUpTo = $state(-1);

	// Functions
	function sectionId(rubric: CatalogueRubric): string {
		return `rubrique-${rubric.id ?? GENERAL_SECTION_ID}`;
	}

	function questionCount(n: number): string {
		return n === 1 ? '1 question' : `${n} questions`;
	}

	/**
	 * Descend à une section. Les sections du dessus sont d'abord montées (leurs
	 * cartes calculées), sinon elles grandiraient pendant le défilement et la
	 * section visée finirait plus bas que l'écran.
	 */
	async function goToSection(index: number) {
		forcedUpTo = Math.max(forcedUpTo, index);
		await tick();
		// Les galeries calculent leurs cartes après un premier rendu (setTimeout 0)
		await new Promise((resolve) => setTimeout(resolve, 0));
		await tick();
		const rubric = notion.rubrics[index];
		if (!rubric) return;
		document
			.getElementById(sectionId(rubric))
			?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
</script>

<h2 class="mb-2 text-2xl font-semibold tracking-tight">{notion.name}</h2>

{#if notion.rubrics.length > 1}
	<!-- Pastilles : restent en haut de l'écran en descendant -->
	<nav aria-label="Sous-notions" class="sticky top-0 z-10 -mx-1 mb-4 bg-background px-1 py-2">
		<ul class="flex gap-2 overflow-x-auto pb-1">
			{#each notion.rubrics as rubric, index (sectionId(rubric))}
				<li class="shrink-0">
					<button
						type="button"
						class="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm whitespace-nowrap hover:bg-muted"
						onclick={() => goToSection(index)}
					>
						{rubric.name}
						<span class="text-xs text-muted-foreground" aria-hidden="true"
							>{rubric.templates.length}</span
						>
						<span class="sr-only">, {questionCount(rubric.templates.length)}</span>
					</button>
				</li>
			{/each}
		</ul>
	</nav>
{/if}

<div class="space-y-10">
	{#each notion.rubrics as rubric, index (sectionId(rubric))}
		<!-- scroll-mt : la section arrive sous les pastilles -->
		<section
			id={sectionId(rubric)}
			class="scroll-mt-16"
			aria-labelledby="{sectionId(rubric)}-titre"
		>
			<h3 id="{sectionId(rubric)}-titre" class="mb-3 text-lg font-medium">
				{rubric.name}
				<span class="text-sm font-normal text-muted-foreground"
					>· {questionCount(rubric.templates.length)}</span
				>
			</h3>
			<LazyCatalogueGallery templates={rubric.templates} force={index <= forcedUpTo} />
		</section>
	{/each}
</div>
