<!--
	Explorer une expression
	=======================

	La formule survolable et son panneau de lecture (spécification :
	`docs/wip/structure-expression-progress.md`, Q10, sections A à C) :
	- la lecture de l'expression entière, en permanence ;
	- la lecture de la dernière sous-expression survolée ou touchée (elle reste
	  quand le pointeur quitte la formule, pour qu'on puisse en survoler les mots) ;
	- sens inverse : survoler un mot ou une formule d'une lecture encadre sa
	  sous-expression dans la formule ;
	- élève de 6e ou avant : le message sur les parenthèses, s'il y en a un,
	  remplace l'encadré et la lecture (C1). Visiteur : jamais.

	Le niveau vient de `readReaderGrade()` ; le dictionnaire des mots cliquables
	est posé par la page (`provideStructureLexicon`). MathLive est chargé par la page.
	Une nouvelle expression : la page remonte le composant (`{#key}`).
-->
<script lang="ts">
	import { needsParenthesesAdvice } from '$lib/lexicon/parentheses-advice-grade';
	import { readReaderGrade } from '$lib/lexicon/reader-grade';
	import { parenthesesAdvice, readingOf, structureFromLatex } from '$lib/mathAST/structure';
	import StructureFormula from './StructureFormula.svelte';
	import StructureReading from './StructureReading.svelte';

	// Types
	interface Props {
		latex: string;
		/** Encadrer aussi un nombre ou une lettre seuls */
		frameLeaves?: boolean;
		/** Encadrer aussi les sous-expressions englobantes */
		showAncestors?: boolean;
	}

	// Variables
	let { latex, frameLeaves = true, showAncestors = false }: Props = $props();

	const readerGrade = readReaderGrade();

	/** Sous-expression sous le pointeur (ou touchée) */
	let selectedId = $state<number | null>(null);
	/** Dernière sous-expression survolée : sa lecture reste affichée */
	let readId = $state<number | null>(null);
	/** Sous-expression désignée par le segment de lecture survolé (sens inverse) */
	let highlightId = $state<number | null>(null);

	const result = $derived(structureFromLatex(latex));
	const structure = $derived(result.status === 'ok' ? result.structure : null);
	const advice = $derived(
		structure && needsParenthesesAdvice(readerGrade()) ? parenthesesAdvice(structure) : null
	);
	const wholeReading = $derived(structure ? readingOf(structure) : null);
	const subReading = $derived(
		structure && readId !== null && structure.nodes[readId] ? readingOf(structure, readId) : null
	);

	// Fonctions
	function getSelectedId(): number | null {
		return selectedId;
	}

	function setSelectedId(id: number | null) {
		selectedId = id;
		if (id !== null) readId = id;
	}

	function highlight(id: number | null) {
		highlightId = id;
	}
</script>

{#if advice}
	<!-- Des div, pas des p : `main p` impose sa taille de police (!important) -->
	<div class="structure-advice" role="status" data-advice>
		{#each advice.segments as segment, i (i)}{#if segment.kind === 'formula'}<math-span
					>{segment.latex}</math-span
				>{:else}{segment.text}{/if}{/each}
	</div>
{:else if structure && wholeReading}
	<StructureFormula
		{structure}
		bind:selectedId={getSelectedId, setSelectedId}
		{highlightId}
		{frameLeaves}
		{showAncestors}
	/>

	<div class="structure-info">
		<div class="reading-line">
			<span class="reading-label">Expression entière&nbsp;:</span>
			<span data-reading="whole"
				><StructureReading reading={wholeReading} onhighlight={highlight} /></span
			>
		</div>
		<div class="reading-line">
			<span class="reading-label">Sous-expression survolée&nbsp;:</span>
			{#if subReading}
				<span data-reading="hovered"
					><StructureReading reading={subReading} onhighlight={highlight} /></span
				>
			{:else}
				<span class="text-muted-foreground">survolez l'expression.</span>
			{/if}
		</div>
	</div>
{:else if result.status === 'unrecognized'}
	<div class="text-muted-foreground">Expression non reconnue ou incomplète.</div>
{/if}

<style>
	.structure-advice {
		padding: 1rem 1.25rem;
		border-radius: 0.75rem;
		border: 1px solid light-dark(var(--color-amber-600, #d97706), var(--color-amber-400, #fbbf24));
		background: light-dark(rgb(251 191 36 / 0.12), rgb(251 191 36 / 0.1));
		font-size: 1.125rem;
		line-height: 1.8;
	}

	.structure-info {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-height: 5rem;
		font-size: 1.125rem;
		line-height: 1.8;
	}

	.reading-label {
		margin-right: 0.25rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-muted-foreground);
	}
</style>
