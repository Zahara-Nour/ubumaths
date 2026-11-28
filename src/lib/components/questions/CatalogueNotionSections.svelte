<!--
	CatalogueNotionSections — une notion du catalogue Automaths, dépliée
	===================================================================

	Pastilles des sous-notions (avec leur nombre de questions) en haut, qui
	défilent sur le côté et restent visibles en descendant ; un clic descend à
	la section. Toutes les sous-notions sont dépliées l'une sous l'autre ; leurs
	aperçus se calculent à l'approche (LazyCatalogueGallery). La page remonte
	ce composant à chaque changement de notion (`{#key}`). `initialRubricId` :
	sous-notion où descendre à l'arrivée (raccourci de la recherche).
-->
<script lang="ts">
	import { onMount, tick } from 'svelte';
	import LazyCatalogueGallery from '#lib/components/questions/LazyCatalogueGallery.svelte';
	import type { CatalogueNotion, CatalogueRubric } from '#lib/questions/catalogue.ts';

	// Constantes
	const GENERAL_SECTION_ID = 'general';
	// Recalage : on regarde la section à ce rythme, au plus pendant cette durée
	const SETTLE_STEP_MS = 100;
	const SETTLE_MAX_MS = 3000;
	// Écart toléré entre le haut de la section et sa place visée, en pixels
	const SETTLE_TOLERANCE_PX = 8;

	let {
		notion,
		initialRubricId = null
	}: { notion: CatalogueNotion; initialRubricId?: string | null } = $props();

	// Variables
	// Sections montées d'office jusqu'à cet indice (pastille cliquée), -1 : aucune
	let forcedUpTo = $state(-1);
	// Rangée des pastilles (collée en haut de l'écran en descendant)
	let chips = $state<HTMLElement | null>(null);
	// Arrête le recalage en cours (nouvelle pastille, geste de l'élève, composant retiré)
	let stopSettling: (() => void) | null = null;

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
		const section = rubric ? document.getElementById(sectionId(rubric)) : null;
		if (!section) return;
		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		section.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
		settleUnderChips(section);
	}

	/**
	 * Recale la section juste sous les pastilles une fois la page immobile : les
	 * sections du dessus ont pu grandir pendant le défilement (KaTeX, MathLive).
	 * Jamais pendant le défilement doux : Chromium ajoute alors le recalage à
	 * l'animation en cours et finit tout en bas de la page. Un geste de l'élève
	 * (doigt, molette, clavier) arrête tout : la page est à lui.
	 */
	function settleUnderChips(section: HTMLElement) {
		stopSettling?.();
		const gestures = ['touchstart', 'wheel', 'keydown', 'pointerdown'] as const;
		const deadline = performance.now() + SETTLE_MAX_MS;
		let previousTop: number | null = null;
		let correctedFrom: number | null = null;
		const stop = () => {
			clearInterval(timer);
			for (const gesture of gestures) window.removeEventListener(gesture, stop, true);
			if (stopSettling === stop) stopSettling = null;
		};
		const timer = setInterval(() => {
			if (!section.isConnected || !chips || performance.now() > deadline) return stop();
			const top = section.getBoundingClientRect().top;
			const still = previousTop !== null && Math.abs(top - previousTop) < 1;
			previousTop = top;
			if (!still) return;
			const drift = top - chips.getBoundingClientRect().bottom;
			// Déjà recalée sans que rien ne bouge : la page ne peut pas faire mieux (bas de page)
			if (Math.abs(drift) <= SETTLE_TOLERANCE_PX || top === correctedFrom) return stop();
			correctedFrom = top;
			section.scrollIntoView({ block: 'start' });
			previousTop = null;
		}, SETTLE_STEP_MS);
		for (const gesture of gestures) {
			window.addEventListener(gesture, stop, { capture: true, passive: true });
		}
		stopSettling = stop;
	}

	$effect(() => () => stopSettling?.());

	onMount(() => {
		if (!initialRubricId) return;
		const index = notion.rubrics.findIndex((rubric) => rubric.id === initialRubricId);
		if (index >= 0) void goToSection(index);
	});
</script>

<!-- tabindex -1 : la page y met le focus quand on choisit une notion (clavier, lecteur d'écran) -->
<h2
	id="catalogue-titre"
	tabindex="-1"
	class="mb-2 text-2xl font-semibold tracking-tight focus:outline-none"
>
	{notion.name}
</h2>

{#if notion.rubrics.length > 1}
	<!-- Pastilles : restent en haut de l'écran en descendant -->
	<nav
		bind:this={chips}
		aria-label="Sous-notions"
		class="sticky top-0 z-10 -mx-1 mb-4 bg-background px-1 py-2"
	>
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
