<!--
	Page de démonstration : la structure d'une expression au survol
	================================================================

	Reprend l'idée d'Algebria (David, Sésamath) : en promenant la souris sur une
	expression, on voit encadrée la plus petite sous-expression sous le pointeur
	(nombre, terme, facteur, parenthèses, somme…), et on déplace un terme dans sa
	somme, un facteur dans son produit, un membre d'une égalité. Une seule formule,
	`StructureField` (`$lib/components/structure`) : clic court pour écrire, appui
	puis mouvement pour déplacer, lecture en français, message « 6e ou avant ».

	La structure et sa lecture en français viennent de `$lib/mathAST/structure`.
	Chaque expression du corpus est survolable (`StructureFormula.svelte`), avec la
	lecture courte de la sous-expression survolée.

	Deux majuscules collées (`AB`) se lisent comme une longueur (« la longueur AB »),
	sauf si la case « Lire AB comme un produit » est cochée : tout est alors lu
	comme avant les longueurs. Le réglage vaut aussi pour le corpus.
-->
<script lang="ts">
	import '$lib/utils/mathlive-styles';
	import 'mathlive';
	import { Button } from '$lib/components/ui/button';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	// Lecture seule : le corpus des tests de parité, une saisie par ligne
	import corpusText from '$lib/mathAST/structure/__tests__/fixtures/corpus-saisies.txt?raw';
	import type { CapitalPairs } from '$lib/mathAST/parser';
	import { readingOf, structureFromLatex, type StructureResult } from '$lib/mathAST/structure';
	import StructureField from '$lib/components/structure/StructureField.svelte';
	import StructureReading from '$lib/components/structure/StructureReading.svelte';
	import StructureFormula from './StructureFormula.svelte';
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
	const CORPUS_LATEX: string[] = corpusText
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line !== '');

	// Variables
	let latex = $state(EXAMPLES[0].latex);
	let frameLeaves = $state(true);
	let showAncestors = $state(false);
	/** Case « Lire AB comme un produit » : décochée, `AB` est une longueur */
	let readAsProduct = $state(false);
	/** Case « Soulever le terme » : la partie déplacée monte au-dessus de la ligne */
	let lift = $state(true);
	const capitalPairs: CapitalPairs = $derived(readAsProduct ? 'product' : 'length');
	/** Structures calculées une fois par sens ; les zones, elles, se mesurent au premier survol */
	const corpus: CorpusEntry[] = $derived(
		CORPUS_LATEX.map((entry) => ({
			latex: entry,
			result: structureFromLatex(entry, { capitalPairs })
		}))
	);
	/** Sous-expression survolée de chaque formule du corpus */
	let corpusSelection = $state<(number | null)[]>(CORPUS_LATEX.map(() => null));

	// Mots de la lecture : fiche du dictionnaire au niveau de l'élève connecté
	provideStructureLexicon();

	// Fonctions
	function loadExample(example: Example) {
		latex = example.latex;
	}

	function handleOptionChange() {
		// Le réglage change ce qui s'encadre : les encadrés du corpus sont à recalculer
		corpusSelection = CORPUS_LATEX.map(() => null);
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
			encadrée et lue en français. Cliquez pour écrire. Appuyez sur un terme, un facteur ou un
			membre d'égalité puis bougez pour le déplacer ; sur la bordure du cadre de 2x, on attrape 2x
			entier. Survolez un mot de la lecture : sa sous-expression s'encadre ; cliquez-le pour ouvrir
			sa fiche du dictionnaire.
		</div>
	</header>

	<section class="space-y-3">
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
			<MyCheckbox
				bind:checked={readAsProduct}
				onCheckedChange={handleOptionChange}
				label="Lire AB comme un produit"
			/>
			<MyCheckbox bind:checked={lift} label="Soulever le terme pendant un déplacement" />
		</div>
	</section>

	<!-- Un autre sens de AB : le champ repart de zéro (une nouvelle expression, il s'en charge) -->
	{#key capitalPairs}
		<StructureField bind:latex reading move {lift} {frameLeaves} {showAncestors} {capitalPairs} />
	{/key}

	<section class="space-y-3" aria-labelledby="corpus-title">
		<h2 id="corpus-title" class="text-xl font-semibold">Corpus ({corpus.length} expressions)</h2>
		<div class="text-sm text-muted-foreground">
			Les saisies du corpus de test, chacune survolable.
		</div>
		<ul class="corpus-grid">
			{#each corpus as entry, i (i)}
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
								<StructureReading
									reading={readingOf(entry.result.structure, hovered)}
									interactive={false}
								/>
							{/if}
						</div>
					{:else if entry.result.status === 'figureName'}
						<code class="corpus-raw">{entry.latex}</code>
						<div class="corpus-caption">{entry.result.message}</div>
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
