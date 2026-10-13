<!--
	Champ de formule : écrire, explorer la structure, déplacer
	==========================================================

	Le champ réutilisable du chantier « glisser-déposer » (spécification F,
	`docs/wip/structure-glisser-deposer-progress.md` ; règles A à D :
	`docs/systeme/mathast/structure-expression.md`). Une seule formule, qu'on
	écrit d'un clic court et qu'on explore ou manipule au pointeur
	(`InteractiveFormula`). Réglages :
	- `structure` : cadres au survol (règles A, cadres imbriqués) ;
	- `reading` : la lecture en français, de l'expression entière et de la
	  dernière sous-expression survolée ; survoler un mot encadre sa sous-expression ;
	- `move` : glisser les termes, facteurs et membres (allume `structure`), avec
	  « Annuler » (plusieurs retours ; une saisie au clavier vide l'historique).
	Sans aucun réglage : un champ de saisie ordinaire.

	Élève de 6e ou avant (`readReaderGrade`) : le message sur les parenthèses,
	s'il y en a un, remplace cadres et lecture (C1) ; une somme qui contient une
	soustraction ne se déplace pas, le signe × est toujours écrit. Visiteur :
	jamais. Mode tactile : détecté (`any-pointer: coarse`), sauf si `touch` est donné.
-->
<script lang="ts">
	import '$lib/utils/mathlive-styles';
	import { onMount, untrack } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { needsParenthesesAdvice } from '$lib/lexicon/parentheses-advice-grade';
	import { readReaderGrade } from '$lib/lexicon/reader-grade';
	import type { CapitalPairs } from '$lib/mathAST/parser';
	import { parenthesesAdvice, readingOf, structureFromLatex } from '$lib/mathAST/structure';
	import InteractiveFormula from './InteractiveFormula.svelte';
	import StructureReading from './StructureReading.svelte';

	// Types
	interface Props {
		latex: string;
		/** Cadres au survol */
		structure?: boolean;
		/** Lecture en français sous la formule */
		reading?: boolean;
		/** Glisser les parties (allume `structure`) */
		move?: boolean;
		/** La partie saisie monte au-dessus de la ligne */
		lift?: boolean;
		/** Mode tactile imposé ; absent : détecté */
		touch?: boolean;
		/** Encadrer aussi un nombre ou une lettre seuls */
		frameLeaves?: boolean;
		/** Encadrer aussi les sous-expressions englobantes */
		showAncestors?: boolean;
		/** Sens de deux majuscules collées ; absent : le défaut du parseur (produit) */
		capitalPairs?: CapitalPairs;
		label?: string;
	}

	// Variables
	let {
		latex = $bindable(),
		structure: explore = true,
		reading = false,
		move = false,
		lift = true,
		touch,
		frameLeaves = true,
		showAncestors = false,
		capitalPairs,
		label = 'Expression : clic court pour écrire, appui puis mouvement pour déplacer'
	}: Props = $props();

	const readerGrade = readReaderGrade();
	const beforeFifthGrade = $derived(needsParenthesesAdvice(readerGrade()));

	/** L'appareil accepte un doigt (lu au montage) */
	let touchDevice = $state(false);
	/** Sous-expression sous le pointeur */
	let selectedId = $state<number | null>(null);
	/** Dernière sous-expression survolée : sa lecture reste affichée */
	let readId = $state<number | null>(null);
	/** Sous-expression désignée par le segment de lecture survolé (sens inverse) */
	let highlightId = $state<number | null>(null);
	/** Expressions d'avant chaque déplacement, la plus récente en dernier */
	let history = $state<string[]>([]);
	/** La dernière expression écrite par le champ lui-même (déplacement, annulation) */
	let ownLatex: string | null = null;

	const result = $derived(structureFromLatex(latex, { capitalPairs }));
	const parsed = $derived(result.status === 'ok' ? result.structure : null);
	const advice = $derived(
		parsed && (explore || move) && beforeFifthGrade ? parenthesesAdvice(parsed) : null
	);
	/** Cadres et déplacement : seulement sans message « 6e ou avant » */
	const exploring = $derived((explore || move) && parsed !== null && advice === null);
	const wholeReading = $derived(parsed && reading && !advice ? readingOf(parsed) : null);
	const subReading = $derived(
		parsed && reading && readId !== null && parsed.nodes[readId] ? readingOf(parsed, readId) : null
	);

	// Une expression venue d'ailleurs (exemple chargé) ou un autre sens de `AB` (les
	// numéros de sous-expressions changent) : sélection et historique repartent de zéro
	$effect(() => {
		const current = latex;
		void capitalPairs;
		untrack(() => {
			selectedId = null;
			readId = null;
			highlightId = null;
			if (current !== ownLatex) history = [];
			ownLatex = null;
		});
	});

	onMount(() => {
		// `any-pointer` : un portable à écran tactile compte aussi
		touchDevice = window.matchMedia('(any-pointer: coarse)').matches;
	});

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

	function handleMove(next: string) {
		history = [...history, latex];
		ownLatex = next;
		latex = next;
	}

	function handleEdit(next: string) {
		// Une saisie au clavier vide l'historique (F5)
		ownLatex = null;
		latex = next;
	}

	function undo() {
		const previous = history.at(-1);
		if (previous === undefined) return;
		history = history.slice(0, -1);
		ownLatex = previous;
		latex = previous;
	}
</script>

<div class="structure-field">
	{#if advice}
		<!-- Des div, pas des p : `main p` impose sa taille de police (!important) -->
		<div class="structure-advice" role="status" data-advice>
			{#each advice.segments as segment, i (i)}{#if segment.kind === 'formula'}<math-span
						>{segment.latex}</math-span
					>{:else}{segment.text}{/if}{/each}
		</div>
	{:else if (explore || move) && result.status === 'figureName'}
		<div class="structure-advice" role="status" data-figure-name>{result.message}</div>
	{:else if (explore || move) && result.status === 'unrecognized'}
		<div class="text-muted-foreground">Expression non reconnue ou incomplète.</div>
	{/if}

	<InteractiveFormula
		{latex}
		structure={exploring ? parsed : null}
		explore={exploring}
		move={move && exploring}
		{lift}
		touch={touch ?? touchDevice}
		{beforeFifthGrade}
		{frameLeaves}
		{showAncestors}
		bind:selectedId={getSelectedId, setSelectedId}
		{highlightId}
		{label}
		onmove={handleMove}
		onedit={handleEdit}
	/>

	{#if move}
		<div class="field-actions">
			<Button variant="outline" size="sm" disabled={history.length === 0} onclick={undo} data-undo>
				Annuler
			</Button>
		</div>
	{/if}

	{#if wholeReading}
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
	{/if}
</div>

<style>
	.structure-field {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.field-actions {
		display: flex;
		justify-content: flex-end;
	}

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
