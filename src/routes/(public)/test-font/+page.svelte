<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import InlineMarkdown from '$lib/components/markdown/InlineMarkdown.svelte';

	// Get font type from URL param
	const useShantell = $derived($page.url.searchParams.get('font') !== 'katex');

	let isReady = $state(false);

	// UbuMark examples mixing text and math
	const ubumarkExamples = [
		{
			label: 'Équation du second degré',
			content:
				"Soit l'équation $ax^2 + bx + c = 0$ avec $a \\neq 0$. Les solutions sont données par la formule $x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$ où $\\Delta = b^2 - 4ac$ est le discriminant."
		},
		{
			label: 'Théorème de Pythagore',
			content:
				"Dans un triangle rectangle, si $a$ et $b$ sont les côtés de l'angle droit et $c$ l'hypoténuse, alors $a^2 + b^2 = c^2$."
		},
		{
			label: 'Dérivée',
			content:
				"La dérivée de $f(x) = x^n$ est $f'(x) = nx^{n-1}$. Par exemple, si $f(x) = x^3$, alors $f'(x) = 3x^2$."
		},
		{
			label: 'Intégrale',
			content:
				"L'aire sous la courbe de $f(x)$ entre $a$ et $b$ est donnée par $\\int_a^b f(x) \\, dx$. Pour $f(x) = x^2$, on a $\\int_0^1 x^2 \\, dx = \\frac{1}{3}$."
		},
		{
			label: 'Suite géométrique',
			content:
				"La somme des $n$ premiers termes d'une suite géométrique de raison $r$ est $S_n = a \\cdot \\frac{1 - r^n}{1 - r}$ pour $r \\neq 1$."
		},
		{
			label: 'Probabilités',
			content:
				'Si $A$ et $B$ sont indépendants, alors $P(A \\cap B) = P(A) \\times P(B)$. La probabilité conditionnelle est $P(A|B) = \\frac{P(A \\cap B)}{P(B)}$.'
		},
		{
			label: 'Vecteurs',
			content:
				'Le produit scalaire de $\\vec{u} = (x_1, y_1)$ et $\\vec{v} = (x_2, y_2)$ est $\\vec{u} \\cdot \\vec{v} = x_1 x_2 + y_1 y_2$. On a $\\vec{u} \\perp \\vec{v}$ si $\\vec{u} \\cdot \\vec{v} = 0$.'
		},
		{
			label: 'Limites',
			content:
				'On dit que $\\lim_{x \\to a} f(x) = L$ si pour tout $\\epsilon > 0$, il existe $\\delta > 0$ tel que $|x - a| < \\delta$ implique $|f(x) - L| < \\epsilon$.'
		}
	];

	const testFormulas = [
		{ label: 'Equation quadratique', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
		{ label: 'Integrale', latex: '\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}' },
		{ label: 'Somme', latex: '\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}' },
		{ label: 'Produit', latex: '\\prod_{i=1}^{n} i = n!' },
		{ label: 'Limite', latex: '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1' },
		{ label: 'Derivee partielle', latex: '\\frac{\\partial^2 f}{\\partial x \\partial y}' },
		{ label: 'Matrice', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
		{
			label: 'Equation de Schrodinger',
			latex: 'i\\hbar\\frac{\\partial}{\\partial t}\\Psi = \\hat{H}\\Psi'
		},
		{ label: 'Theoreme de Pythagore', latex: 'a^2 + b^2 = c^2' },
		{ label: 'Identite Euler', latex: 'e^{i\\pi} + 1 = 0' },
		{ label: 'Binomiale', latex: '(x+y)^n = \\sum_{k=0}^{n} \\binom{n}{k} x^k y^{n-k}' },
		{ label: 'Lettres grecques', latex: '\\alpha + \\beta + \\gamma = \\delta \\cdot \\epsilon' },
		{
			label: 'Ensembles',
			latex: 'A \\cup B = \\{x : x \\in A \\lor x \\in B\\}'
		},
		{ label: 'Logique', latex: '\\forall x \\exists y : P(x) \\Rightarrow Q(y)' },
		{ label: 'Fleches', latex: 'A \\rightarrow B \\Leftrightarrow C \\leftarrow D' },
		{ label: 'Comparaisons', latex: 'a \\leq b < c \\geq d \\neq e \\approx f' },
		{ label: 'Racines', latex: '\\sqrt{2} + \\sqrt[3]{8} + \\sqrt[4]{16}' },
		{ label: 'Fractions complexes', latex: '\\frac{1}{1+\\frac{1}{1+\\frac{1}{x}}}' },
		{
			label: 'Texte et nombres',
			latex: 'f(x) = 2x^3 - 5x^2 + 3x - 7'
		},
		{
			label: 'Grands operateurs',
			latex: '\\iiint_V \\nabla \\cdot \\vec{F} \\, dV = \\oiint_S \\vec{F} \\cdot d\\vec{S}'
		}
	];

	onMount(async () => {
		if (browser) {
			const mathlive = await import('mathlive');
			// Set fonts directory BEFORE any mathfield is rendered
			mathlive.MathfieldElement.fontsDirectory = useShantell ? '/fonts/shantell-katex' : '/fonts';
			isReady = true;
		}
	});
</script>

<svelte:head>
	<title>Test Police ShantellMath | UbuMaths</title>
	<style>
		@font-face {
			font-family: 'ShantellSans';
			src: url('/fonts/shantell-sans-variable.woff2') format('woff2');
			font-weight: 300 800;
			font-style: normal;
			font-display: swap;
		}
		@font-face {
			font-family: 'ShantellSans';
			src: url('/fonts/shantell-sans-italic-variable.woff2') format('woff2');
			font-weight: 300 800;
			font-style: italic;
			font-display: swap;
		}
		@font-face {
			font-family: 'ShantellMath';
			src: url('/fonts/ShantellMath-Regular.woff2') format('woff2');
			font-weight: normal;
			font-style: normal;
			font-display: swap;
		}
		@font-face {
			font-family: 'ShantellKaTeX';
			src: url('/fonts/shantell-katex/KaTeX_Main-Regular.woff2') format('woff2');
			font-weight: normal;
			font-style: normal;
			font-display: swap;
		}
		@font-face {
			font-family: 'KaTeXOriginal';
			src: url('/fonts/KaTeX_Main-Regular.woff2') format('woff2');
			font-weight: normal;
			font-style: normal;
			font-display: swap;
		}
		.font-shantell-sans {
			font-family: 'ShantellSans', sans-serif;
			font-weight: 300;
		}
		.font-shantell {
			font-family: 'ShantellMath', serif;
		}
		.font-shantell-katex {
			font-family: 'ShantellKaTeX', serif;
		}
		.font-katex-original {
			font-family: 'KaTeXOriginal', serif;
		}
	</style>
</svelte:head>

<div class="container mx-auto p-4">
	<h1 class="mb-4 text-2xl font-bold">Test Police ShantellMath</h1>

	<!-- Direct font test without MathLive -->
	<div class="mb-8 rounded-lg border-2 border-orange-300 bg-orange-50 p-4">
		<h2 class="mb-4 text-xl font-semibold text-orange-800">
			Test direct des polices (sans MathLive)
		</h2>

		<div class="space-y-4">
			<div class="rounded bg-white p-4">
				<div class="mb-1 text-xs font-medium text-gray-500">ShantellMath (fichier original)</div>
				<div class="font-shantell text-3xl">
					ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789
				</div>
				<div class="font-shantell mt-2 text-2xl">
					x² + y² = z² ∫ ∑ ∏ √ ∞ ± × ÷ = ≠ &lt; &gt; ≤ ≥ α β γ δ Γ Δ Θ Σ Ω
				</div>
			</div>

			<div class="rounded bg-white p-4">
				<div class="mb-1 text-xs font-medium text-gray-500">
					ShantellKaTeX (copie dans shantell-katex/)
				</div>
				<div class="font-shantell-katex text-3xl">
					ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789
				</div>
				<div class="font-shantell-katex mt-2 text-2xl">
					x² + y² = z² ∫ ∑ ∏ √ ∞ ± × ÷ = ≠ &lt; &gt; ≤ ≥ α β γ δ Γ Δ Θ Σ Ω
				</div>
			</div>

			<div class="rounded bg-white p-4">
				<div class="mb-1 text-xs font-medium text-gray-500">KaTeX Original (pour comparaison)</div>
				<div class="font-katex-original text-3xl">
					ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789
				</div>
				<div class="font-katex-original mt-2 text-2xl">
					x² + y² = z² ∫ ∑ ∏ √ ∞ ± × ÷ = ≠ &lt; &gt; ≤ ≥ α β γ δ Γ Δ Θ Σ Ω
				</div>
			</div>
		</div>
	</div>

	<div class="mb-6 flex flex-wrap items-center gap-4 rounded-lg bg-gray-100 p-4">
		<div class="flex gap-2">
			<a
				href="/test-font"
				data-sveltekit-reload
				class="rounded-lg px-4 py-2 font-medium transition-colors {useShantell
					? 'bg-green-500 text-white'
					: 'bg-gray-300 text-gray-700 hover:bg-gray-400'}"
			>
				ShantellMath
			</a>
			<a
				href="/test-font?font=katex"
				data-sveltekit-reload
				class="rounded-lg px-4 py-2 font-medium transition-colors {!useShantell
					? 'bg-blue-500 text-white'
					: 'bg-gray-300 text-gray-700 hover:bg-gray-400'}"
			>
				KaTeX Standard
			</a>
		</div>
		<span class="text-sm text-gray-600">
			Police active: <strong
				>{useShantell ? 'ShantellMath (manuscrite)' : 'KaTeX (standard)'}</strong
			>
		</span>
	</div>

	{#if !isReady}
		<div class="flex items-center justify-center p-8">
			<div class="text-gray-500">Chargement de MathLive...</div>
		</div>
	{:else}
		<div class="mb-8">
			<h2 class="mb-4 text-xl font-semibold">Editeur interactif</h2>
			<div class="rounded-lg border-2 border-gray-300 bg-white p-2">
				<math-field style="width: 100%; font-size: 1.5rem; border: none; outline: none;">
					x = \frac{'{-b \\pm \\sqrt{b^2 - 4ac}}'}{'{2a}'}
				</math-field>
			</div>
			<p class="mt-2 text-sm text-gray-600">
				Cliquez pour editer. Utilisez le clavier ou les raccourcis LaTeX.
			</p>
		</div>

		<h2 class="mb-4 text-xl font-semibold">Galerie de formules</h2>

		<div class="grid gap-4 md:grid-cols-2">
			{#each testFormulas as formula (formula.label)}
				<div class="rounded-lg border bg-gray-50 p-4">
					<div class="mb-2 text-sm font-medium text-gray-700">{formula.label}</div>
					<div class="flex min-h-16 items-center justify-center rounded-lg bg-white p-4">
						<math-field
							read-only
							style="border: none; background: transparent; font-size: 1.25rem;"
						>
							{formula.latex}
						</math-field>
					</div>
					<div class="mt-2 overflow-x-auto rounded bg-gray-200 p-2 font-mono text-xs text-gray-600">
						{formula.latex}
					</div>
				</div>
			{/each}
		</div>

		<!-- UbuMark section: text mixed with math -->
		<div class="mt-8">
			<h2 class="mb-4 text-xl font-semibold">Texte mixte (UbuMark)</h2>
			<p class="mb-4 text-sm text-gray-600">
				Test de l'harmonie entre le texte normal (Shantell Sans) et les formules mathématiques
				(KaTeX modifié).
			</p>

			<div class="space-y-4">
				{#each ubumarkExamples as example (example.label)}
					<div class="rounded-lg border bg-white p-4">
						<div class="mb-2 text-sm font-medium text-gray-500">{example.label}</div>
						<div class="font-shantell-sans text-lg leading-relaxed">
							<InlineMarkdown content={example.content} />
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<div class="mt-8 rounded-lg bg-blue-50 p-4">
		<h3 class="mb-2 font-semibold text-blue-800">A propos de ShantellMath</h3>
		<ul class="list-inside list-disc space-y-1 text-sm text-blue-700">
			<li>Caracteres A-Z, a-z, 0-9 remplaces par Shantell Sans (police manuscrite)</li>
			<li>Symboles mathematiques avec effet "roughen" (petites perturbations)</li>
			<li>Base: KaTeX_Main-Regular avec metriques preservees</li>
			<li>Intensite roughen: 12 units, seed: 42</li>
		</ul>
	</div>
</div>
