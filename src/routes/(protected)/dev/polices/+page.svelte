<script lang="ts">
	import '$lib/utils/mathlive-styles';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import InlineMarkdown from '$lib/components/markdown/InlineMarkdown.svelte';
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import { Button } from '$lib/components/ui/button';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { switchMathFonts, getCurrentFontSet, type MathFontSet } from '$lib/utils/mathlive-fonts';
	import demoExercises from './exercices-demo.json';
	import { downloadExercisePdf, type PdfFontSet } from './shantell-pdf';

	let isReady = $state(false);
	let currentFont = $state<MathFontSet>('shantell');
	let isSwitching = $state(false);
	let renderKey = $state(0); // Force re-render of mathfields
	// PDF en cours de compilation : « <id>:<police> »
	let pendingPdf = $state<string | null>(null);

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

	// Expression de l'éditeur : tous les symboles de la police, petits et grands,
	// une famille par ligne
	const showcaseLines = [
		// Ponctuation et prime
		"x=1{,}5\\quad I=]2;5]\\quad n!\\quad a:b\\quad f'(x)\\quad f''(x)\\quad x\\ne 2",
		// Opérateurs et petits délimiteurs
		'f(x)=(2x+1)(x-3)-|x-2|\\times 3\\div 4\\pm 1\\quad a/b\\approx 0{,}5\\quad\\{1;2;3\\}',
		// Comparaisons et flèches
		'a<b\\leq c\\quad d>e\\geq f\\quad a\\leqslant b\\geqslant c\\quad A\\rightarrow B\\leftarrow C\\leftrightarrow D\\quad\\nearrow\\searrow',
		'x\\simeq 2\\quad f\\sim g\\quad a\\ll b\\gg c\\quad a\\mid b\\quad a\\mp b',
		// Logique
		'P\\Rightarrow Q\\quad P\\implies Q\\quad P\\Leftrightarrow Q\\quad P\\iff Q\\quad f:x\\mapsto x^2\\quad g:x\\longmapsto 2x',
		'\\forall x\\in E,\\ \\exists n\\quad\\nexists y\\quad A\\land B\\lor\\lnot C\\quad P\\Leftarrow Q\\quad P\\Longleftarrow Q',
		// Ensembles
		'x\\in[0;1]\\cup]2;+\\infty[\\quad A\\cap B=\\emptyset\\quad C=\\varnothing\\quad\\mathbb{N}\\subset\\mathbb{Z}\\subset\\mathbb{Q}\\subset\\mathbb{R}\\subset\\mathbb{C}',
		'x\\notin E\\quad A\\subseteq B\\supseteq C\\quad A\\subsetneq B\\supsetneq C\\quad A\\nsubseteq B\\nsupseteq C\\quad D\\supset E\\quad A\\setminus B',
		// Vecteurs
		'\\vec{u}+\\vec{v}=\\vec{AB}\\quad\\vec{u}\\cdot\\vec{n}=0',
		// Géométrie
		"(d)\\perp(d')\\quad(d)\\parallel(\\Delta)\\nparallel(D)\\quad\\angle ABC=\\measuredangle ABC=90^\\circ\\quad\\hat{A}\\quad\\bar{x}\\quad\\tilde{u}\\quad\\triangle ABC",
		// Lettres grecques
		'\\alpha\\beta\\gamma\\delta\\varepsilon\\zeta\\eta\\theta\\iota\\kappa\\lambda\\mu\\nu\\rho\\sigma\\tau\\upsilon\\varphi\\phi\\chi\\psi\\omega\\quad\\xi\\vartheta\\varpi\\varrho\\varsigma\\quad\\Gamma\\Delta\\Theta\\Lambda\\Xi\\Pi\\Sigma\\Upsilon\\Phi\\Psi',
		// Lettres calligraphiques
		'\\mathcal{S}=\\{2\\}\\quad\\mathcal{C}_f\\quad\\mathcal{P}\\quad\\mathcal{D}_f\\quad\\mathcal{L}\\quad\\mathcal{A}\\quad S\\ne\\mathcal{S}',
		'\\mathcal{ABCDEFGHIJKLM}\\quad\\mathcal{NOPQRSTUVWXYZ}',
		'\\mathcal{B}(n;p)\\quad\\mathcal{N}(0;1)\\quad\\mathcal{E}\\quad\\mathcal{R}\\quad\\mathcal{T}\\quad\\mathcal{F}',
		// Lettres-symboles et divers
		'E=\\hbar\\omega\\quad\\ell\\quad 20\\,\\%\\quad u_1,\\ldots,u_n\\quad 1+\\cdots+n\\quad\\therefore\\ \\because\\quad\\spadesuit\\heartsuit\\diamondsuit\\clubsuit',
		'2\\pi r\\quad\\frac{\\partial f}{\\partial x}\\quad\\Omega\\quad x\\times y',
		// Grands opérateurs
		'\\sum_{k=0}^{n}k\\quad\\prod_{i=1}^{n}i\\quad\\coprod_i A_i\\quad\\int_0^1 x^2\\,dx\\quad\\iint_D f\\quad\\iiint_V g',
		// Racines
		'\\sqrt{2}\\quad\\sqrt{\\frac{a}{b}}\\quad\\sqrt{\\frac{\\frac{a}{b}}{c}}\\quad\\sqrt[3]{x}',
		// Grands délimiteurs
		'\\left(\\frac{2x+1}{x-3}\\right)^2\\quad\\left[\\frac{\\frac{1}{2}}{\\frac{3}{4}}\\right]\\quad\\left\\{\\frac{a}{b}\\right\\}\\quad\\left\\langle\\frac{a}{b}\\right\\rangle\\quad\\left\\lceil\\frac{a}{b}\\right\\rceil\\quad\\left\\lfloor\\frac{a}{b}\\right\\rfloor\\quad\\left|\\frac{a}{b}\\right|',
		// Très grands délimiteurs et racine, faits de morceaux empilés
		'\\left(\\begin{matrix}a\\\\b\\\\c\\\\d\\end{matrix}\\right)\\left[\\begin{matrix}1\\\\2\\\\3\\\\4\\end{matrix}\\right]\\left\\{\\begin{matrix}x\\\\y\\\\z\\\\t\\end{matrix}\\right.\\left\\|\\begin{matrix}u\\\\v\\\\w\\\\s\\end{matrix}\\right\\|\\quad\\sqrt{\\begin{matrix}a\\\\b\\\\c\\\\d\\end{matrix}}'
	];
	const showcaseLatex = `\\begin{gathered}${showcaseLines.join('\\\\')}\\end{gathered}`;

	const testFormulas = [
		{ label: 'Équation quadratique', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
		{ label: 'Intégrale', latex: '\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}' },
		{ label: 'Somme', latex: '\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}' },
		{ label: 'Produit', latex: '\\prod_{i=1}^{n} i = n!' },
		{ label: 'Limite', latex: '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1' },
		{ label: 'Dérivée partielle', latex: '\\frac{\\partial^2 f}{\\partial x \\partial y}' },
		{ label: 'Matrice', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
		{
			label: 'Équation de Schrödinger',
			latex: 'i\\hbar\\frac{\\partial}{\\partial t}\\Psi = \\hat{H}\\Psi'
		},
		{ label: 'Théorème de Pythagore', latex: 'a^2 + b^2 = c^2' },
		{ label: "Identité d'Euler", latex: 'e^{i\\pi} + 1 = 0' },
		{ label: 'Binomiale', latex: '(x+y)^n = \\sum_{k=0}^{n} \\binom{n}{k} x^k y^{n-k}' },
		{ label: 'Lettres grecques', latex: '\\alpha + \\beta + \\gamma = \\delta \\cdot \\epsilon' },
		{
			label: 'Ensembles',
			latex: 'A \\cup B = \\{x : x \\in A \\lor x \\in B\\}'
		},
		{ label: 'Logique', latex: '\\forall x \\exists y : P(x) \\Rightarrow Q(y)' },
		{ label: 'Flèches', latex: 'A \\rightarrow B \\Leftrightarrow C \\leftarrow D' },
		{ label: 'Comparaisons', latex: 'a \\leq b < c \\geq d \\neq e \\approx f' },
		{ label: 'Racines', latex: '\\sqrt{2} + \\sqrt[3]{8} + \\sqrt[4]{16}' },
		{ label: 'Fractions complexes', latex: '\\frac{1}{1+\\frac{1}{1+\\frac{1}{x}}}' },
		{
			label: 'Texte et nombres',
			latex: 'f(x) = 2x^3 - 5x^2 + 3x - 7'
		},
		{
			label: 'Grands opérateurs',
			latex: '\\iiint_V \\nabla \\cdot \\vec{F} \\, dV = \\oiint_S \\vec{F} \\cdot d\\vec{S}'
		}
	];

	async function handleSwitchFont(fontSet: MathFontSet) {
		if (isSwitching || currentFont === fontSet) return;

		isSwitching = true;
		try {
			await switchMathFonts(fontSet);
			currentFont = fontSet;
			// Force re-render of all mathfields by changing the key
			renderKey++;
		} finally {
			isSwitching = false;
		}
	}

	async function handleDownloadPdf(exercise: (typeof demoExercises)[number], fonts: PdfFontSet) {
		if (pendingPdf) return;
		pendingPdf = `${exercise.id}:${fonts}`;
		try {
			await downloadExercisePdf(exercise, fonts);
		} catch (err) {
			console.error('PDF de démonstration :', err);
			toaster.error('La compilation du PDF a échoué');
		} finally {
			pendingPdf = null;
		}
	}

	onMount(async () => {
		if (browser) {
			// Initialize with shantell fonts by default
			await switchMathFonts('shantell');
			currentFont = getCurrentFontSet() ?? 'shantell';
			isReady = true;
		}
	});
</script>

<svelte:head>
	<title>Test Police Chiphre Math | Chiphre</title>
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
			font-family: 'ChiphreMathMain';
			src: url('/fonts/chiphre-math/KaTeX_Main-Regular.woff2') format('woff2');
			font-weight: normal;
			font-style: normal;
			font-display: swap;
		}
		@font-face {
			font-family: 'KaTeXOriginal';
			src: url('/fonts/katex-original/KaTeX_Main-Regular.woff2') format('woff2');
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
		.font-chiphre-math {
			font-family: 'ChiphreMathMain', serif;
		}
		.font-katex-original {
			font-family: 'KaTeXOriginal', serif;
		}
	</style>
</svelte:head>

<div class="container mx-auto p-4">
	<h1 class="mb-4 text-2xl font-bold">Test Police Chiphre Math</h1>

	<!-- Direct font test without MathLive -->
	<div class="mb-8 rounded-lg border-2 border-orange-300 bg-card p-4">
		<h2 class="mb-4 text-xl font-semibold text-orange-600">
			Test direct des polices (sans MathLive)
		</h2>
		<p class="mb-4 text-sm text-muted-foreground">
			Seulement les caractères de KaTeX_Main-Regular. Les autres (² ∑ ∏ ≠ α…) s'afficheraient ici
			dans une police du système : MathLive les prend dans d'autres polices KaTeX ou les compose,
			comme le montrent les formules plus bas.
		</p>

		<div class="space-y-4">
			<div class="rounded bg-card p-4">
				<div class="mb-1 text-xs font-medium text-muted-foreground">
					ShantellMath (premier essai, fichier d'origine)
				</div>
				<div class="font-shantell text-3xl break-all">
					ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789
				</div>
				<div class="font-shantell mt-2 text-2xl">
					x + y = z ∫ √ ∞ ± × ÷ &lt; &gt; ≤ ≥ ∈ ∀ ∃ → ⇒ Γ Δ Θ Σ Ω
				</div>
			</div>

			<div class="rounded bg-card p-4">
				<div class="mb-1 text-xs font-medium text-muted-foreground">
					Chiphre Math (KaTeX_Main-Regular de static/fonts/chiphre-math/)
				</div>
				<div class="font-chiphre-math text-3xl break-all">
					ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789
				</div>
				<div class="font-chiphre-math mt-2 text-2xl">
					x + y = z ∫ √ ∞ ± × ÷ &lt; &gt; ≤ ≥ ∈ ∀ ∃ → ⇒ Γ Δ Θ Σ Ω
				</div>
			</div>

			<div class="rounded bg-card p-4">
				<div class="mb-1 text-xs font-medium text-muted-foreground">
					KaTeX Original (pour comparaison)
				</div>
				<div class="font-katex-original text-3xl break-all">
					ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789
				</div>
				<div class="font-katex-original mt-2 text-2xl">
					x + y = z ∫ √ ∞ ± × ÷ &lt; &gt; ≤ ≥ ∈ ∀ ∃ → ⇒ Γ Δ Θ Σ Ω
				</div>
			</div>
		</div>
	</div>

	<!-- Font switcher -->
	<div class="mb-6 flex flex-wrap items-center gap-4 rounded-lg bg-muted p-4">
		<div class="flex gap-2">
			<button
				onclick={() => handleSwitchFont('shantell')}
				disabled={isSwitching}
				class="rounded-lg px-4 py-2 font-medium transition-colors disabled:opacity-50 {currentFont ===
				'shantell'
					? 'bg-green-500 text-white'
					: 'bg-secondary text-secondary-foreground hover:opacity-80'}"
			>
				{isSwitching && currentFont !== 'shantell' ? 'Chargement...' : 'Chiphre Math'}
			</button>
			<button
				onclick={() => handleSwitchFont('katex')}
				disabled={isSwitching}
				class="rounded-lg px-4 py-2 font-medium transition-colors disabled:opacity-50 {currentFont ===
				'katex'
					? 'bg-blue-500 text-white'
					: 'bg-secondary text-secondary-foreground hover:opacity-80'}"
			>
				{isSwitching && currentFont !== 'katex' ? 'Chargement...' : 'KaTeX Standard'}
			</button>
		</div>
		<span class="text-sm text-muted-foreground">
			Police active: <strong
				>{currentFont === 'shantell' ? 'Chiphre Math (manuscrite)' : 'KaTeX (standard)'}</strong
			>
		</span>
		<span class="text-xs text-green-600"> Changement dynamique sans rechargement de page </span>
	</div>

	{#if !isReady}
		<div class="flex items-center justify-center p-8">
			<div class="text-muted-foreground">Chargement de MathLive...</div>
		</div>
	{:else}
		{#key renderKey}
			<div class="mb-8">
				<h2 class="mb-4 text-xl font-semibold">Éditeur interactif</h2>
				<div class="rounded-lg border-2 border-border bg-card p-2">
					<math-field style="width: 100%; font-size: 1.5rem; border: none; outline: none;">
						{showcaseLatex}
					</math-field>
				</div>
				<p class="mt-2 text-sm text-muted-foreground">
					Cliquez pour éditer. Utilisez le clavier ou les raccourcis LaTeX.
				</p>
			</div>

			<h2 class="mb-4 text-xl font-semibold">Galerie de formules</h2>

			<div class="grid gap-4 md:grid-cols-2">
				{#each testFormulas as formula (formula.label)}
					<div class="rounded-lg border bg-muted p-4">
						<div class="mb-2 text-sm font-medium text-muted-foreground">{formula.label}</div>
						<div class="flex min-h-16 items-center justify-center rounded-lg bg-card p-4">
							<math-field
								read-only
								style="border: none; background: transparent; font-size: 1.25rem;"
							>
								{formula.latex}
							</math-field>
						</div>
						<div
							class="mt-2 overflow-x-auto rounded bg-muted p-2 font-mono text-xs text-muted-foreground"
						>
							{formula.latex}
						</div>
					</div>
				{/each}
			</div>

			<!-- UbuMark section: text mixed with math -->
			<div class="mt-8">
				<h2 class="mb-4 text-xl font-semibold">Texte mixte (UbuMark)</h2>
				<p class="mb-4 text-sm text-muted-foreground">
					Test de l'harmonie entre le texte normal (Shantell Sans) et les formules mathématiques
					(KaTeX modifié).
				</p>

				<div class="space-y-4">
					{#each ubumarkExamples as example (example.label)}
						<div class="rounded-lg border bg-card p-4">
							<div class="mb-2 text-sm font-medium text-muted-foreground">{example.label}</div>
							<div class="font-shantell-sans text-lg leading-relaxed">
								<InlineMarkdown content={example.content} />
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Exercices réels : copie figée de trois exercices de la base -->
			<div class="mt-8">
				<h2 class="mb-2 text-xl font-semibold">Exercices de la base</h2>
				<p class="mb-4 text-sm text-muted-foreground">
					Trois exercices réels (énoncé et corrigé), copiés de la base le 2026-10-12. Le PDF est
					compilé par Typst, comme les fiches, avec Shantell Sans pour le texte et Chiphre Math pour
					les formules ; « PDF standard » montre la même chose avec les polices habituelles.
				</p>

				<div class="space-y-6">
					{#each demoExercises as exercise (exercise.id)}
						<div class="rounded-lg border bg-card p-4">
							<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
								<h3 class="text-lg font-semibold">{exercise.title}</h3>
								<div class="flex gap-2">
									<Button
										size="sm"
										disabled={pendingPdf !== null}
										onclick={() => handleDownloadPdf(exercise, 'shantell')}
									>
										{pendingPdf === `${exercise.id}:shantell` ? 'Compilation…' : 'PDF Chiphre Math'}
									</Button>
									<Button
										size="sm"
										variant="outline"
										disabled={pendingPdf !== null}
										onclick={() => handleDownloadPdf(exercise, 'standard')}
									>
										{pendingPdf === `${exercise.id}:standard` ? 'Compilation…' : 'PDF standard'}
									</Button>
								</div>
							</div>
							<div class="font-shantell-sans">
								<MarkdownRenderer content={exercise.statement_md} />
								<h4 class="mt-4 mb-2 font-semibold text-muted-foreground">Corrigé</h4>
								<MarkdownRenderer content={exercise.solution_md} />
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/key}
	{/if}

	<div class="mt-8 rounded-lg bg-blue-50 p-4">
		<h3 class="mb-2 font-semibold text-blue-800">À propos de Chiphre Math</h3>
		<ul class="list-inside list-disc space-y-1 text-sm text-blue-700">
			<li>Caractères A-Z, a-z, 0-9 remplacés par Shantell Sans (police manuscrite)</li>
			<li>Symboles mathématiques avec effet "roughen" (petites perturbations)</li>
			<li>Base: KaTeX_Main-Regular avec métriques préservées</li>
			<li>Intensité roughen: 12 units, seed: 42</li>
		</ul>
	</div>

	<div class="mt-4 rounded-lg bg-purple-50 p-4">
		<h3 class="mb-2 font-semibold text-purple-800">Fonctionnement technique</h3>
		<ul class="list-inside list-disc space-y-1 text-sm text-purple-700">
			<li>
				Polices KaTeX par défaut : <code>mathlive/static.css</code>, importé par les composants de
				maths
			</li>
			<li>
				Chiphre Math : la feuille <code>mathlive-fonts-shantell.css</code> est ajoutée par-dessus, puis
				retirée pour revenir à KaTeX
			</li>
			<li>Force le re-render des mathfields via une cle Svelte</li>
		</ul>
	</div>
</div>
