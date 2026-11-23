<!--
	Page d'essai de la « Lecture facilitée » (chantier lecture-facilitee, PR 1)
	==========================================================================

	Le même texte avec formules, en trois versions :
	A. la police habituelle, maths de MathLive ;
	B. Luciole pour le texte, maths de MathLive inchangées (ce que donnera le
	   réglage écran de la PR 2) ;
	C. Luciole pour le texte, Luciole Math pour les formules. MathLive ne sait
	   pas lire une police de maths OpenType : les formules sont converties en
	   MathML et mises en page par le navigateur. Aperçu seulement : le vrai jeu
	   écran demandera des polices découpées à la KaTeX (PR 3).

	Plus les PDF Typst des exercices de démonstration en Luciole + Luciole Math.
-->
<script lang="ts">
	import '#lib/utils/mathlive-styles.ts';
	import { convertLatexToMathMl } from 'mathlive';
	import BackLink from '#lib/components/navigation/BackLink.svelte';
	import InlineMarkdown from '#lib/components/markdown/InlineMarkdown.svelte';
	import MyCheckbox from '#lib/components/MyCheckbox.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { toaster } from '#lib/stores/toaster.svelte.ts';
	import demoExercises from '../exercices-demo.json';
	import { downloadLuciolePdf, type LucioleVariant } from './luciole-pdf';

	// Types
	type Part = { kind: 'text'; value: string } | { kind: 'math'; mathml: string };

	// Constantes

	/** Consignes de collège et de primaire, avec leurs formules entre `$` */
	const SAMPLES = [
		'Calcule $3\\times 4+12\\div 2$ puis $(3+4)\\times 2$.',
		'Un rectangle mesure $7{,}5$ cm de long et $4$ cm de large. Calcule son aire $\\mathcal{A}$ en cm².',
		"Résous l'équation $2x-7=11$, puis vérifie ta réponse.",
		'Simplifie la fraction $\\dfrac{24}{36}$, puis compare-la à $\\dfrac{2}{3}$.',
		"Range dans l'ordre croissant : $-1{,}5$ ; $0{,}15$ ; $-0{,}51$ ; $1{,}05$.",
		'Dans le triangle $ABC$ rectangle en $A$, on a $BC^2=AB^2+AC^2$.',
		'Développe $(x+3)^2$ et factorise $x^2-9$.',
		'Si $x\\geq 2$ et $x\\neq 5$, alors $x\\in[2;5[\\,\\cup\\,]5;+\\infty[$.',
		'La moyenne de $12$, $15$ et $9$ est $\\dfrac{12+15+9}{3}=12$.',
		'Calcule $\\sqrt{49}+\\sqrt{2}\\times\\sqrt{8}$ et $\\vec{AB}+\\vec{BC}$.'
	];

	/** Lettres calligraphiques Unicode hors du bloc 𝒜… (déjà codées ailleurs) */
	const SCRIPT_EXCEPTIONS: Record<string, string> = {
		B: 'ℬ',
		E: 'ℰ',
		F: 'ℱ',
		H: 'ℋ',
		I: 'ℐ',
		L: 'ℒ',
		M: 'ℳ',
		R: 'ℛ'
	};

	/** Signes qui se ressemblent : ce que Luciole cherche à distinguer */
	const LOOKALIKES = 'Il1| O0o 6b 9g pq bd rn m 5S 2Z uv';

	// Variables
	let spaced = $state(true);
	// PDF en cours de compilation : « <id>:<variante> »
	let pendingPdf = $state<string | null>(null);

	// Fonctions

	/**
	 * Une formule en MathML pour le navigateur. Deux retouches, que la conversion
	 * de MathLive ne fait pas : `\mathcal{A}` en lettre calligraphique Unicode (le
	 * navigateur ignore `mathvariant`), et la virgule décimale (`7{,}5` sort en `7.5`).
	 */
	function toMathMl(latex: string): string {
		const withScript = latex.replace(
			/\\mathcal\{([A-Z])\}/g,
			(_, letter: string) =>
				SCRIPT_EXCEPTIONS[letter] ??
				String.fromCodePoint(0x1d49c + letter.charCodeAt(0) - 'A'.charCodeAt(0))
		);
		const mathml = convertLatexToMathMl(withScript).replace(
			/<mn>(\d+)\.(\d+)<\/mn>/g,
			'<mn>$1,$2</mn>'
		);
		return `<math>${mathml}</math>`;
	}

	/** Découpe une consigne en texte et formules */
	function toParts(sample: string): Part[] {
		return sample
			.split('$')
			.map((value, index) =>
				index % 2 === 0 ? { kind: 'text', value } : { kind: 'math', mathml: toMathMl(value) }
			);
	}

	const sampleParts = SAMPLES.map(toParts);

	async function handleDownloadPdf(
		exercise: (typeof demoExercises)[number],
		variant: LucioleVariant
	) {
		if (pendingPdf) return;
		pendingPdf = `${exercise.id}:${variant}`;
		try {
			await downloadLuciolePdf(exercise, variant);
		} catch (err) {
			console.error('PDF Luciole :', err);
			toaster.error('La compilation du PDF a échoué');
		} finally {
			pendingPdf = null;
		}
	}
</script>

<svelte:head>
	<title>Essai Luciole | Chiphre</title>
	<style>
		@font-face {
			font-family: 'Luciole';
			src: url('/fonts/luciole/Luciole-Regular.woff2') format('woff2');
			font-weight: 400;
			font-style: normal;
			font-display: swap;
		}
		@font-face {
			font-family: 'Luciole';
			src: url('/fonts/luciole/Luciole-Bold.woff2') format('woff2');
			font-weight: 700;
			font-style: normal;
			font-display: swap;
		}
		@font-face {
			font-family: 'Luciole';
			src: url('/fonts/luciole/Luciole-Italic.woff2') format('woff2');
			font-weight: 400;
			font-style: italic;
			font-display: swap;
		}
		@font-face {
			font-family: 'Luciole';
			src: url('/fonts/luciole/Luciole-BoldItalic.woff2') format('woff2');
			font-weight: 700;
			font-style: italic;
			font-display: swap;
		}
		@font-face {
			font-family: 'Luciole Math';
			src: url('/fonts/luciole/Luciole-Math.woff2') format('woff2');
			font-display: swap;
		}
	</style>
</svelte:head>

<div class="container mx-auto max-w-4xl p-4">
	<BackLink href="/dev/polices" label="Retour aux polices des formules" />
	<h1 class="mb-2 text-2xl font-bold">Essai Luciole</h1>
	<p class="mb-4 text-sm text-muted-foreground">
		Luciole est une police dessinée pour les personnes malvoyantes (Centre technique régional pour
		la déficience visuelle, typographies.fr). Luciole Math, sa police de formules, est de Daniel
		Flipo (version 0.76). Les mêmes consignes en trois versions.
	</p>

	<div class="mb-6 rounded-lg bg-muted p-4">
		<MyCheckbox bind:checked={spaced} label="Espacer les lettres et les lignes (B et C)" />
	</div>

	<section class="mb-8 rounded-lg border bg-card p-4">
		<h2 class="mb-1 text-lg font-semibold">A. Police habituelle</h2>
		<p class="mb-3 text-xs text-muted-foreground">Texte et formules comme aujourd’hui.</p>
		<p class="mb-3 text-2xl">{LOOKALIKES}</p>
		<div class="space-y-2 text-lg">
			{#each SAMPLES as sample (sample)}
				<p><InlineMarkdown content={sample} /></p>
			{/each}
		</div>
	</section>

	<section class="mb-8 rounded-lg border bg-card p-4">
		<h2 class="mb-1 text-lg font-semibold">B. Texte en Luciole, formules habituelles</h2>
		<p class="mb-3 text-xs text-muted-foreground">
			Ce que donnera le réglage « Lecture facilitée » de la PR 2.
		</p>
		<div class="luciole" class:spaced>
			<p class="mb-3 text-2xl">{LOOKALIKES}</p>
			<div class="space-y-2 text-lg">
				{#each SAMPLES as sample (sample)}
					<p><InlineMarkdown content={sample} /></p>
				{/each}
			</div>
		</div>
	</section>

	<section class="mb-8 rounded-lg border bg-card p-4">
		<h2 class="mb-1 text-lg font-semibold">C. Texte en Luciole, formules en Luciole Math</h2>
		<p class="mb-3 text-xs text-muted-foreground">
			Aperçu : formules mises en page par le navigateur (MathML), pas par MathLive. Le rendu final
			passera par MathLive (PR 3), avec une mise en page un peu différente.
		</p>
		<div class="luciole" class:spaced>
			<p class="mb-1 text-2xl">{LOOKALIKES}</p>
			<p class="luciole-math-text mb-3 text-2xl" title="Les mêmes signes dans Luciole Math">
				{LOOKALIKES}
			</p>
			<div class="luciole-math space-y-2 text-lg">
				{#each sampleParts as parts, index (index)}
					<p>
						{#each parts as part, partIndex (partIndex)}
							{#if part.kind === 'text'}{part.value}{:else}
								<!-- eslint-disable-next-line svelte/no-at-html-tags -- MathML de constantes de la page -->
								{@html part.mathml}{/if}
						{/each}
					</p>
				{/each}
			</div>
		</div>
	</section>

	<section class="mb-8 rounded-lg border bg-card p-4">
		<h2 class="mb-1 text-lg font-semibold">PDF : Luciole et Luciole Math</h2>
		<p class="mb-3 text-sm text-muted-foreground">
			Les exercices de démonstration de « Polices des formules », compilés par Typst : texte en
			Luciole, formules en Luciole Math (lue telle quelle par Typst), interligne agrandi. « PDF
			standard » pour comparer.
		</p>
		<ul class="space-y-2">
			{#each demoExercises as exercise (exercise.id)}
				<li class="flex flex-wrap items-center justify-between gap-2">
					<span>{exercise.title}</span>
					<span class="flex gap-2">
						<Button
							size="sm"
							disabled={pendingPdf !== null}
							onclick={() => handleDownloadPdf(exercise, 'luciole')}
						>
							{pendingPdf === `${exercise.id}:luciole` ? 'Compilation…' : 'PDF Luciole'}
						</Button>
						<Button
							size="sm"
							variant="outline"
							disabled={pendingPdf !== null}
							onclick={() => handleDownloadPdf(exercise, 'standard')}
						>
							{pendingPdf === `${exercise.id}:standard` ? 'Compilation…' : 'PDF standard'}
						</Button>
					</span>
				</li>
			{/each}
		</ul>
	</section>

	<p class="text-xs text-muted-foreground">
		Licences : Luciole (texte) © Laurent Bourcellier et Jonathan Fabreguettes, CC-BY 4.0 ; Luciole
		Math © Daniel Flipo, Laurent Bourcellier, Jonathan Fabreguettes, SIL OFL 1.1. Paquet CTAN
		<code>luciole</code>.
	</p>
</div>

<style>
	.luciole {
		font-family: 'Luciole', sans-serif;
	}
	/* Espacement : lettres, mots et lignes un peu plus larges que d'habitude */
	.spaced {
		letter-spacing: 0.04em;
		word-spacing: 0.12em;
		line-height: 1.8;
	}
	.luciole-math :global(math) {
		font-family: 'Luciole Math', math;
		font-size: 1.1em;
		/* \dfrac des consignes : fractions à la taille du texte */
		math-style: normal;
	}
	.luciole-math-text {
		font-family: 'Luciole Math', serif;
	}
</style>
