<!--
	Vitrine : la structure d'une expression (`/demo/structure`)
	===========================================================

	La formule de `/dev/structure` seule, pour un visiteur : `StructureField`
	(lecture et déplacement allumés), une rangée d'exemples, les réglages par
	défaut (pas de cases à cocher, `AB` lu comme une longueur). Le corpus et les
	réglages restent sur `/dev/structure` (chantier demo-debug, PR 6a).

	Les mots de la lecture ouvrent leur fiche du dictionnaire : au niveau de
	l'élève connecté, au niveau 5e pour un visiteur.
-->
<script lang="ts">
	import { demoSeo } from '$lib/seo/demo-pages';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import '$lib/utils/mathlive-styles';
	import 'mathlive';
	import { Button } from '$lib/components/ui/button';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import StructureField from '$lib/components/structure/StructureField.svelte';
	import { provideStructureLexicon } from '$lib/components/structure/structure-lexicon.svelte';

	// Types
	interface Example {
		label: string;
		latex: string;
	}

	// Constantes
	/** Expression chargée à l'ouverture (celle de l'article Sésamath) */
	const FIRST_LATEX = String.raw`\left(\sqrt{3}+6a\right)\times\frac{2}{7}`;
	const EXAMPLES: Example[] = [
		{ label: 'Priorités', latex: String.raw`2+3\times4` },
		{ label: 'Somme algébrique', latex: '5-3+x' },
		{ label: 'Différence', latex: '2x-(3-x)' },
		{ label: 'Puissance', latex: '3(x+2)^2' },
		{ label: 'Fractions', latex: String.raw`\frac{2x+1}{3}-\frac{x}{2}` },
		{ label: 'Équation', latex: '2x+3=7' }
	];

	// Variables
	let latex = $state(FIRST_LATEX);

	// Mots de la lecture : fiche du dictionnaire au niveau de l'élève connecté (5e pour un visiteur)
	provideStructureLexicon();

	// Fonctions
	function loadExample(example: Example) {
		latex = example.latex;
	}
</script>

<SeoHead {...demoSeo('/demo/structure')} />

<div class="mx-auto max-w-4xl space-y-6 px-4 py-8">
	<BackLink href="/demo" label="Retour aux démonstrations" />

	<header class="space-y-2">
		<h1 class="text-2xl font-bold">La structure d'une expression</h1>
		<div class="text-muted-foreground">
			Promenez la souris sur l'expression : la partie sous le pointeur s'encadre et se lit en
			français. Appuyez sur un terme, un facteur ou un membre d'égalité puis bougez pour le déplacer
			; un clic court permet d'écrire votre propre expression. Les mots de la lecture s'ouvrent sur
			leur fiche du dictionnaire.
		</div>
	</header>

	<div class="flex flex-wrap gap-2">
		{#each EXAMPLES as example (example.label)}
			<Button variant="outline" size="sm" onclick={() => loadExample(example)}>
				{example.label}
			</Button>
		{/each}
	</div>

	<StructureField bind:latex reading move />
</div>
