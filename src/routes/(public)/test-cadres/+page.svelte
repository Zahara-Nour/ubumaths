<!--
	Page de mise au point : cadres arrondis autour d'une formule (MathLive 0.111.1)
	==============================================================================

	Encadre une large palette d'expressions (fractions, grandes parenthèses,
	racines, matrices…) avec le cadre des solutions (`colorLatex`, par
	`\htmlStyle`), à côté de `\enclose{roundedbox}` pour comparaison, plus un
	champ libre. Rendu par le même chemin que le résultat attendu : markdown en
	ligne → `<math-span>`, locale fr.
-->
<script lang="ts">
	import InlineMarkdown from '$lib/components/markdown/InlineMarkdown.svelte';
	import { colorLatex } from '$lib/questions/expected-result-markdown';

	// Types
	interface Sample {
		label: string;
		latex: string;
		/** Membre de gauche : la formule encadrée devient le membre de droite d'un `aligned` */
		alignedLeft?: string;
	}

	interface Variant {
		label: string;
		note: string;
		frame: (latex: string) => string;
	}

	// Constantes
	const COLOR = 'var(--expected-correct)';
	const ROUNDEDBOX_LATEX = String.raw`\enclose{roundedbox}`;

	const SAMPLES: Sample[] = [
		// Nombres et calcul
		{ label: 'Entier', latex: '8' },
		{ label: 'Négatif', latex: '-12' },
		{ label: 'Décimal', latex: '3.14' },
		{ label: 'Somme', latex: 'x+1' },
		{ label: 'Égalité', latex: '3+5 = 8' },
		{ label: 'Produit', latex: String.raw`3\times(-4)` },
		{ label: 'Lettres descendantes', latex: 'y = g(p)' },
		{ label: 'Pourcentage', latex: String.raw`25\,\%` },
		// Fractions
		{ label: 'Fraction', latex: String.raw`\frac{1}{2}` },
		{ label: 'Fraction négative', latex: String.raw`-\frac{5}{3}` },
		{ label: 'Fraction de fraction', latex: String.raw`\frac{\frac{1}{2}}{3}` },
		{ label: 'Fraction rationnelle', latex: String.raw`\frac{3x+1}{x^2-4}` },
		{ label: 'Somme de fractions', latex: String.raw`\frac{1}{2}+\frac{1}{3}=\frac{5}{6}` },
		{ label: 'Fraction en exposant', latex: String.raw`2^{\frac{1}{2}}` },
		// Puissances, indices, racines
		{ label: 'Puissance', latex: 'x^2' },
		{ label: 'Puissance négative', latex: '10^{-3}' },
		{ label: 'Exponentielle', latex: String.raw`\mathrm{e}^{-x^2+1}` },
		{ label: 'Indice et exposant', latex: 'u_{n+1}^2' },
		{ label: 'Racine', latex: String.raw`\sqrt{2}` },
		{ label: 'Racine d’une fraction', latex: String.raw`\sqrt{\frac{3}{4}}` },
		{ label: 'Racine cubique', latex: String.raw`\sqrt[3]{27}` },
		{ label: 'Racines imbriquées', latex: String.raw`\sqrt{2+\sqrt{3}}` },
		// Délimiteurs
		{ label: 'Parenthèses simples', latex: '2(x+3)' },
		{ label: 'Grandes parenthèses', latex: String.raw`\left(\frac{2}{3}\right)^2` },
		{
			label: 'Parenthèses imbriquées',
			latex: String.raw`\left(1+\left(\frac{x}{2}\right)^2\right)`
		},
		{ label: 'Crochets', latex: String.raw`\left[\frac{x^2}{2}\right]_0^1` },
		{ label: 'Valeur absolue', latex: String.raw`\left|\frac{-3}{4}\right|` },
		{ label: 'Intervalle', latex: String.raw`\left]-\infty;3\right]` },
		{ label: 'Union d’intervalles', latex: String.raw`]-\infty;-1[\cup]2;+\infty[` },
		{ label: 'Ensemble', latex: String.raw`\left\{-2;\frac{1}{3}\right\}` },
		{ label: 'Ensemble vide', latex: String.raw`\varnothing` },
		// Analyse
		{ label: 'Somme Σ', latex: String.raw`\sum_{k=1}^{n} k` },
		{ label: 'Intégrale', latex: String.raw`\int_0^1 x^2\,\mathrm{d}x` },
		{ label: 'Limite', latex: String.raw`\lim_{x\to+\infty}\frac{1}{x}=0` },
		{ label: 'Dérivée', latex: String.raw`f'(x)=3x^2-\frac{2}{x^2}` },
		{ label: 'Logarithme', latex: String.raw`\ln\left(\frac{x+1}{2}\right)` },
		{ label: 'Trigonométrie', latex: String.raw`\cos\left(\frac{\pi}{3}\right)=\frac{1}{2}` },
		// Géométrie, probabilités
		{ label: 'Vecteur', latex: String.raw`\overrightarrow{AB}` },
		{ label: 'Coordonnées', latex: String.raw`\begin{pmatrix}2\\-1\end{pmatrix}` },
		{ label: 'Angle', latex: String.raw`\widehat{ABC}=60^\circ` },
		{ label: 'Probabilité', latex: String.raw`P(\overline{A})=0.3` },
		{ label: 'Coefficient binomial', latex: String.raw`\binom{5}{2}` },
		// Structures
		{ label: 'Matrice', latex: String.raw`\begin{pmatrix}1 & 2\\3 & 4\end{pmatrix}` },
		{
			label: 'Système',
			latex: String.raw`\begin{cases}x+y=3\\x-y=1\end{cases}`
		},
		{ label: 'Texte', latex: String.raw`\text{aucune solution}` },
		{ label: 'Unité', latex: String.raw`12.5\,\mathrm{m\cdot s^{-1}}` },
		{ label: 'Dans un alignement', latex: '8', alignedLeft: '3+5' },
		{
			label: 'Fraction dans un alignement',
			latex: String.raw`\frac{7}{2}`,
			alignedLeft: String.raw`3+\frac{1}{2}`
		}
	];

	const VARIANTS: Variant[] = [
		{
			label: 'Cadre des solutions',
			note: '\\htmlStyle — celui de l’application (colorLatex)',
			frame: (latex) => colorLatex(latex, 'correct', true)
		},
		{
			label: 'roundedbox',
			note: '\\enclose{roundedbox} — pour comparaison',
			frame: (latex) =>
				String.raw`\textcolor{${COLOR}}{\enclose{roundedbox}[1px solid ${COLOR}]{${latex}}}`
		}
	];

	// Variables
	let large = $state(false);
	let customLatex = $state(String.raw`\left(\frac{x+1}{x-1}\right)^2`);
	let customSample = $derived<Sample>({ label: 'Ta formule', latex: customLatex });

	// Fonctions
	function sampleContent(sample: Sample, variant: Variant): string {
		const framed = variant.frame(sample.latex);
		const formula = sample.alignedLeft
			? String.raw`\begin{aligned}${sample.alignedLeft} &= ${framed}\end{aligned}`
			: framed;
		return `avant $${formula}$ après`;
	}

	function toggleSize() {
		large = !large;
	}
</script>

<svelte:head>
	<title>Test des cadres arrondis</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="test-cadres mx-auto max-w-6xl space-y-6 px-4 py-8">
	<header class="space-y-2">
		<h1 class="text-2xl font-bold">Cadres arrondis autour d’une formule</h1>
		<p class="text-muted-foreground">
			Chaque ligne montre la même formule avec le cadre des solutions, et avec <code
				>{ROUNDEDBOX_LATEX}</code
			>
			pour comparaison. Le cadre doit entourer la formule sans la toucher, et « avant » / « après » rester
			sur la ligne de base.
		</p>
		<label class="block space-y-1">
			<span class="text-sm font-medium">Tester une formule (LaTeX)</span>
			<input
				id="custom-latex"
				type="text"
				class="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
				bind:value={customLatex}
				spellcheck="false"
			/>
		</label>
		<button
			type="button"
			class="rounded-md border px-3 py-1 text-sm hover:bg-muted"
			onclick={toggleSize}
		>
			{large ? 'Taille normale' : 'Grande taille'}
		</button>
	</header>

	<div class="overflow-x-auto">
		<table class="w-full border-collapse" class:large>
			<thead>
				<tr>
					<th class="sample-label">Formule</th>
					{#each VARIANTS as variant (variant.label)}
						<th>
							<span class="block">{variant.label}</span>
							<span class="block text-xs font-normal text-muted-foreground">{variant.note}</span>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				<tr class="custom-row">
					<td class="sample-label">{customSample.label}</td>
					{#each VARIANTS as variant (variant.label)}
						<td><InlineMarkdown content={sampleContent(customSample, variant)} /></td>
					{/each}
				</tr>
				{#each SAMPLES as sample (sample.label)}
					<tr>
						<td class="sample-label">{sample.label}</td>
						{#each VARIANTS as variant (variant.label)}
							<td><InlineMarkdown content={sampleContent(sample, variant)} /></td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	/* Mêmes couleurs que le résultat attendu (ExpectedResultView) */
	.test-cadres {
		--expected-correct: light-dark(
			var(--color-green-700, #15803d),
			var(--color-green-400, #4ade80)
		);
	}

	th,
	td {
		padding: 0.75rem 1rem;
		border-bottom: 1px dashed var(--color-border);
		text-align: left;
		vertical-align: middle;
		white-space: nowrap;
	}

	.sample-label {
		color: var(--color-muted-foreground);
		font-size: 0.875rem;
	}

	.custom-row td {
		background: var(--color-muted);
	}

	table.large td:not(.sample-label) {
		font-size: 1.5rem;
	}
</style>
