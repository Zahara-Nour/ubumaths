<!--
	Page de démonstration : la structure d'une expression au survol
	================================================================

	Reprend l'idée d'Algebria (David, Sésamath) : en promenant la souris sur une
	expression, on voit encadrée la plus petite sous-expression sous le pointeur
	(nombre, terme, facteur, parenthèses, somme…). Sur un écran tactile, un toucher
	encadre, un nouveau toucher dans le cadre passe à la sous-expression qui la contient.

	La structure et sa lecture en français viennent de `$lib/mathAST/structure` ;
	MathLive affiche des marqueurs `\class` sans effet sur le rendu ; le survol et
	l'encadré sont dans `StructureFormula.svelte`, la lecture (mots cliquables,
	sens inverse) et le message « 6e ou avant » dans `StructureExplorer.svelte`.
	Chaque expression du corpus est survolable, avec la lecture courte de la
	sous-expression survolée.
-->
<script lang="ts">
	import '$lib/utils/mathlive-styles';
	import 'mathlive';
	import type { MathfieldElement } from 'mathlive';
	import { Button } from '$lib/components/ui/button';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	// Lecture seule : le corpus des tests de parité, une saisie par ligne
	import corpusText from '$lib/mathAST/structure/__tests__/fixtures/corpus-saisies.txt?raw';
	import { readingOf, structureFromLatex, type StructureResult } from '$lib/mathAST/structure';
	import StructureExplorer from './StructureExplorer.svelte';
	import StructureFormula from './StructureFormula.svelte';
	import StructureReading from './StructureReading.svelte';
	import { provideStructureLexicon } from './structure-lexicon.svelte';

	// Types
	interface Example {
		label: string;
		latex: string;
	}

	interface CorpusEntry {
		latex: string;
		result: StructureResult;
	}

	// Constantes
	const EXAMPLES: Example[] = [
		{ label: 'Article Sésamath', latex: String.raw`\left(\sqrt{3}+6a\right)\times\frac{2}{7}` },
		{ label: 'Priorités', latex: String.raw`2+3\times4` },
		{ label: 'Somme algébrique', latex: '5-3+x' },
		{ label: 'Différence', latex: '2x-(3-x)' },
		{ label: 'Puissance', latex: '3(x+2)^2' },
		{ label: 'Fractions', latex: String.raw`\frac{2x+1}{3}-\frac{x}{2}` },
		{ label: 'Équation', latex: '2x+3=7' },
		{ label: 'Relatifs', latex: String.raw`-4\times(5-x)^2+1` },
		{ label: 'Racine', latex: String.raw`\sqrt{x^2+1}` }
	];
	/** Structures calculées une fois ; les zones, elles, se mesurent au premier survol */
	const CORPUS: CorpusEntry[] = corpusText
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line !== '')
		.map((latex) => ({ latex, result: structureFromLatex(latex) }));

	// Variables
	let latex = $state(EXAMPLES[0].latex);
	let frameLeaves = $state(true);
	let showAncestors = $state(false);
	/** Sous-expression survolée de chaque formule du corpus */
	let corpusSelection = $state<(number | null)[]>(CORPUS.map(() => null));
	let mathfield = $state<MathfieldElement>();

	// Mots de la lecture : fiche du dictionnaire au niveau de l'élève connecté
	provideStructureLexicon();

	// Fonctions
	function loadExample(example: Example) {
		latex = example.latex;
		if (mathfield) mathfield.value = example.latex;
	}

	function handleOptionChange() {
		// Le réglage change ce qui s'encadre : les encadrés du corpus sont à recalculer
		corpusSelection = CORPUS.map(() => null);
	}

	function initMathfield(element: MathfieldElement) {
		mathfield = element;
		element.value = latex;
		const update = () => {
			latex = element.value;
		};
		element.addEventListener('input', update);
		// Action plutôt qu'attachment : prettier-plugin-svelte 3.3 ne lit pas `{@attach}`
		return { destroy: () => element.removeEventListener('input', update) };
	}
</script>

<svelte:head>
	<title>Structure d'une expression</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6 px-4 py-8">
	<header class="space-y-2">
		<h1 class="text-2xl font-bold">La structure d'une expression</h1>
		<div class="text-muted-foreground">
			Promenez la souris sur l'expression : la plus petite sous-expression sous le pointeur est
			encadrée et lue en français. Sur un écran tactile, touchez l'expression, puis touchez à
			nouveau dans le cadre pour passer à la sous-expression qui la contient. Survolez un mot de la
			lecture : sa sous-expression s'encadre ; cliquez-le pour ouvrir sa fiche du dictionnaire.
		</div>
	</header>

	<section class="space-y-3">
		<div class="space-y-1">
			<span id="structure-input-label" class="text-sm font-medium">Expression</span>
			<math-field use:initMathfield aria-labelledby="structure-input-label" class="structure-input"
			></math-field>
		</div>
		<div class="flex flex-wrap gap-2">
			{#each EXAMPLES as example (example.label)}
				<Button variant="outline" size="sm" onclick={() => loadExample(example)}>
					{example.label}
				</Button>
			{/each}
		</div>
		<div class="flex flex-wrap gap-x-6 gap-y-2">
			<MyCheckbox
				bind:checked={frameLeaves}
				onCheckedChange={handleOptionChange}
				label="Encadrer aussi un nombre ou une lettre seuls"
			/>
			<MyCheckbox
				bind:checked={showAncestors}
				onCheckedChange={handleOptionChange}
				label="Montrer aussi les sous-expressions englobantes"
			/>
		</div>
	</section>

	<!-- Une nouvelle expression : sélection et lecture repartent de zéro -->
	{#key latex}
		<StructureExplorer {latex} {frameLeaves} {showAncestors} />
	{/key}

	<section class="space-y-3" aria-labelledby="corpus-title">
		<h2 id="corpus-title" class="text-xl font-semibold">Corpus ({CORPUS.length} expressions)</h2>
		<div class="text-sm text-muted-foreground">
			Les saisies du corpus de test, chacune survolable.
		</div>
		<ul class="corpus-grid">
			{#each CORPUS as entry, i (i)}
				<li class="corpus-item" data-corpus-index={i}>
					{#if entry.result.status === 'ok'}
						{@const hovered = corpusSelection[i]}
						<StructureFormula
							structure={entry.result.structure}
							bind:selectedId={corpusSelection[i]}
							{frameLeaves}
							{showAncestors}
							compact
							label={`Expression ${i + 1} du corpus`}
						/>
						<div class="corpus-caption">
							{#if hovered !== null && entry.result.structure.nodes[hovered]}
								<StructureReading reading={readingOf(entry.result.structure, hovered)} />
							{/if}
						</div>
					{:else}
						<code class="corpus-raw">{entry.latex}</code>
						<div class="corpus-caption text-destructive">non reconnue</div>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
</div>

<style>
	.structure-input {
		width: 100%;
		font-size: 1.5rem;
		padding: 0.25rem 0.5rem;
	}

	.corpus-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
		gap: 0.75rem;
	}

	.corpus-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}

	.corpus-caption {
		min-height: 2.5rem;
		font-size: 0.8rem;
		line-height: 1.25rem;
		color: var(--color-muted-foreground);
	}

	.corpus-raw {
		display: block;
		padding: 0.75rem;
		border-radius: 0.5rem;
		background: var(--color-muted);
		font-size: 0.85rem;
		overflow-wrap: anywhere;
	}
</style>
