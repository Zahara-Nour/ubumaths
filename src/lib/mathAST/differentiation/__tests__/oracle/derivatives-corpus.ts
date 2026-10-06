/**
 * Oracle numérique des dérivées — le CORPUS
 *
 * Chaque entrée est une fonction du programme (1re, Terminale, classiques),
 * saisie COMME UN ÉLÈVE :
 *
 * - `latex` : ce qu'on tape dans un champ MathLive d'une question (`parseLatex`) ;
 * - `custom` : ce qu'on tape dans l'atelier (`.dériver …`, `f(x) = …`).
 *
 * ⚠️ **La référence `f` est écrite en JavaScript, À LA MAIN.** Elle ne passe
 * par aucun parseur : si `\sin^2 x` est lu `sin(x)` ou `f(2x)` lu comme un
 * produit, la dérivée « juste » d'une expression MAL LUE est quand même
 * comparée à la vraie fonction — et le défaut se voit.
 *
 * `expected` est la dérivée telle qu'on l'ÉCRIT en classe (règle (f) du test) ;
 * absente, seule la valeur est vérifiée.
 */

// =============================================================================
// Types
// =============================================================================

/** Les valeurs des paramètres littéraux (`a`, `b`, `\omega`…) pour un calcul. */
export type Params = Readonly<Record<string, number>>;

export type Family =
	| 'polynômes'
	| 'rationnelles'
	| 'racines'
	| 'puissances'
	| 'exponentielle'
	| 'logarithme'
	| 'log_a et a^x'
	| 'trigonométrie'
	| 'réciproques'
	| 'produits'
	| 'quotients'
	| 'composées'
	| 'valeur absolue'
	| 'variable t'
	| 'objets de l’atelier'
	| 'littérales';

export interface DerivativeCase {
	/** Identifiant stable : il sert de clé aux listes `KNOWN_*`. */
	readonly id: string;
	readonly family: Family;
	/** Saisie LaTeX (champ de question). Absente : pas de chemin LaTeX. */
	readonly latex?: string;
	/** Saisie de l'atelier (notation texte). Absente : pas de chemin atelier. */
	readonly custom?: string;
	/** La variable de dérivation, quand ce n'est pas x (`.dériver … ; t`). */
	readonly variable?: 't';
	/** La fonction, en JavaScript — la seule référence du test. */
	readonly f: (x: number, p: Params) => number;
	/** La dérivée telle qu'on l'écrit en classe (LaTeX), pour la règle (f). */
	readonly expected?: string;
	/** Les paramètres littéraux de l'expression (`['a', 'b']`). */
	readonly params?: readonly string[];
	/** Les jeux de valeurs des paramètres ; par défaut `PARAM_SETS`. */
	readonly paramSets?: readonly Params[];
	/** Les points de vérification ; par défaut `POINTS_R`. */
	readonly points?: readonly number[];
	/** Définitions tapées dans l'atelier AVANT la saisie (`g(x) = x^2+1`). */
	readonly setup?: readonly string[];
}

// =============================================================================
// Constantes
// =============================================================================

const { sin, cos, tan, exp, log, sqrt, atan, asin, acos, abs, cbrt, PI } = Math;

/** Points sur ℝ, loin de 0 et des entiers (pôles fréquents). */
export const POINTS_R: readonly number[] = [-2.3, -1.4, -0.65, 0.35, 0.9, 1.7, 2.6];
/** Points sur ]0 ; +∞[ (racines, logarithmes, puissances non entières). */
export const POINTS_POS: readonly number[] = [0.3, 0.7, 1.3, 2.1, 3.4, 5.2];
/** Points dans ]-1 ; 1[ (arcsin, arccos). */
export const POINTS_UNIT: readonly number[] = [-0.85, -0.45, -0.1, 0.25, 0.6, 0.8];
/** Points larges, pour les paramètres dont le signe déplace le domaine. */
export const POINTS_WIDE: readonly number[] = [
	-3.3, -2.3, -1.4, -0.65, -0.2, 0.35, 0.9, 1.7, 2.6, 3.3, 4.1
];

/**
 * Trois jeux de paramètres : positifs, négatifs, fractionnaires — jamais 0 ni 1
 * (un coefficient 1 cache `3·3x²`, voir la mémoire « coefficient ≠ 1 »).
 * `ad − bc ≠ 0` dans chaque jeu (homographiques non constantes).
 */
export const PARAM_SETS: readonly Params[] = [
	{ a: 3, b: -2, c: 5, d: -4, k: 2, m: 3, A: 4, omega: 2, phi: 0.5 },
	{ a: -1.5, b: 2.5, c: -0.5, d: 3, k: -0.75, m: -2, A: -2.5, omega: -1.5, phi: -1.2 },
	{ a: 0.4, b: -0.25, c: 1.5, d: 0.5, k: 1.25, m: 0.5, A: 0.75, omega: 3.5, phi: 2 }
];

/** Jeux à paramètres POSITIFS, pour `a^x`, `\log_a`, `\ln(kx)`. */
export const POSITIVE_SETS: readonly Params[] = [
	{ a: 3, b: 2, k: 2 },
	{ a: 0.4, b: 0.25, k: 1.25 },
	{ a: 2.5, b: 5, k: 0.5 }
];

// =============================================================================
// Corpus
// =============================================================================

const R = String.raw;

export const CORPUS: readonly DerivativeCase[] = [
	// ---------------------------------------------------------------------------
	// Polynômes — coefficients ≠ 1, le défaut `3·3x²` vu par David
	// ---------------------------------------------------------------------------
	{
		id: 'poly-01',
		family: 'polynômes',
		latex: 'x^2',
		custom: 'x^2',
		f: (x) => x * x,
		expected: '2x'
	},
	{
		id: 'poly-02',
		family: 'polynômes',
		latex: '3x^3',
		custom: '3x^3',
		f: (x) => 3 * x ** 3,
		expected: '9x^2'
	},
	{
		id: 'poly-03',
		family: 'polynômes',
		latex: '3x^2-2x+5',
		custom: '3x^2-2x+5',
		f: (x) => 3 * x * x - 2 * x + 5,
		expected: '6x-2'
	},
	{
		id: 'poly-04',
		family: 'polynômes',
		latex: '-4x^3+7x',
		custom: '-4x^3+7x',
		f: (x) => -4 * x ** 3 + 7 * x,
		expected: '-12x^2+7'
	},
	{
		id: 'poly-05',
		family: 'polynômes',
		latex: '5x^4-3x^2+2',
		custom: '5x^4-3x^2+2',
		f: (x) => 5 * x ** 4 - 3 * x * x + 2,
		expected: '20x^3-6x'
	},
	{
		id: 'poly-06',
		family: 'polynômes',
		latex: R`\frac{1}{3}x^3-x^2`,
		custom: '(1/3)x^3-x^2',
		f: (x) => x ** 3 / 3 - x * x,
		expected: 'x^2-2x'
	},
	{
		id: 'poly-07',
		family: 'polynômes',
		latex: R`\frac{x^2}{2}+3x`,
		custom: 'x^2/2+3x',
		f: (x) => (x * x) / 2 + 3 * x,
		expected: 'x+3'
	},
	{
		id: 'poly-08',
		family: 'polynômes',
		latex: '2x^5-x^4+x^3',
		custom: '2x^5-x^4+x^3',
		f: (x) => 2 * x ** 5 - x ** 4 + x ** 3,
		expected: '10x^4-4x^3+3x^2'
	},
	{ id: 'poly-09', family: 'polynômes', latex: '7', custom: '7', f: () => 7, expected: '0' },
	{
		id: 'poly-10',
		family: 'polynômes',
		latex: '-2x+9',
		custom: '-2x+9',
		f: (x) => -2 * x + 9,
		expected: '-2'
	},
	{
		id: 'poly-11',
		family: 'polynômes',
		latex: '0.5x^2-1.5x',
		custom: '0.5x^2-1.5x',
		f: (x) => 0.5 * x * x - 1.5 * x,
		expected: 'x-1.5'
	},
	{
		id: 'poly-12',
		family: 'polynômes',
		latex: '(x-2)(x+3)',
		custom: '(x-2)(x+3)',
		f: (x) => (x - 2) * (x + 3)
	},
	{
		id: 'poly-13',
		family: 'polynômes',
		latex: '(2x+1)^2',
		custom: '(2x+1)^2',
		f: (x) => (2 * x + 1) ** 2,
		expected: '4(2x+1)'
	},
	{
		id: 'poly-14',
		family: 'polynômes',
		latex: '(3x-2)^3',
		custom: '(3x-2)^3',
		f: (x) => (3 * x - 2) ** 3,
		expected: '9(3x-2)^2'
	},
	{
		id: 'poly-15',
		family: 'polynômes',
		latex: '(1-x)^4',
		custom: '(1-x)^4',
		f: (x) => (1 - x) ** 4,
		expected: '-4(1-x)^3'
	},
	{
		id: 'poly-16',
		family: 'polynômes',
		latex: '-x^2',
		custom: '-x^2',
		f: (x) => -x * x,
		expected: '-2x'
	},
	{
		id: 'poly-17',
		family: 'polynômes',
		latex: '-3x^2+12x-7',
		custom: '-3x^2+12x-7',
		f: (x) => -3 * x * x + 12 * x - 7,
		expected: '-6x+12'
	},
	{
		id: 'poly-18',
		family: 'polynômes',
		latex: '2(x-1)^2+3',
		custom: '2(x-1)^2+3',
		f: (x) => 2 * (x - 1) ** 2 + 3,
		expected: '4(x-1)'
	},
	{
		id: 'poly-19',
		family: 'polynômes',
		latex: 'x^3-3x^2+3x-1',
		custom: 'x^3-3x^2+3x-1',
		f: (x) => x ** 3 - 3 * x * x + 3 * x - 1,
		expected: '3x^2-6x+3'
	},
	{
		id: 'poly-20',
		family: 'polynômes',
		latex: '4x^3-6x',
		custom: '4x^3-6x',
		f: (x) => 4 * x ** 3 - 6 * x,
		expected: '12x^2-6'
	},
	{
		id: 'poly-21',
		family: 'polynômes',
		latex: 'x^{10}',
		custom: 'x^10',
		f: (x) => x ** 10,
		expected: '10x^9'
	},
	{
		id: 'poly-22',
		family: 'polynômes',
		latex: '2x^{7}-5',
		custom: '2x^7-5',
		f: (x) => 2 * x ** 7 - 5,
		expected: '14x^6'
	},
	{
		id: 'poly-23',
		family: 'polynômes',
		latex: R`\frac{3}{4}x^4`,
		custom: '(3/4)x^4',
		f: (x) => 0.75 * x ** 4,
		expected: '3x^3'
	},
	{
		id: 'poly-24',
		family: 'polynômes',
		latex: R`-\frac{2}{3}x^3+x`,
		custom: '-(2/3)x^3+x',
		f: (x) => (-2 / 3) * x ** 3 + x,
		expected: '-2x^2+1'
	},
	{
		id: 'poly-25',
		family: 'polynômes',
		latex: '(x^2+1)^2',
		custom: '(x^2+1)^2',
		f: (x) => (x * x + 1) ** 2,
		expected: '4x(x^2+1)'
	},
	{
		id: 'poly-26',
		family: 'polynômes',
		latex: '(x^2-3x)^3',
		custom: '(x^2-3x)^3',
		f: (x) => (x * x - 3 * x) ** 3,
		expected: '3(2x-3)(x^2-3x)^2'
	},
	{
		id: 'poly-27',
		family: 'polynômes',
		latex: R`3\left(x^2-4\right)`,
		custom: '3(x^2-4)',
		f: (x) => 3 * (x * x - 4),
		expected: '6x'
	},
	{
		id: 'poly-28',
		family: 'polynômes',
		latex: '-5(2x-1)',
		custom: '-5(2x-1)',
		f: (x) => -5 * (2 * x - 1),
		expected: '-10'
	},
	{
		id: 'poly-29',
		family: 'polynômes',
		latex: R`\pi x^2`,
		custom: R`\pi x^2`,
		f: (x) => PI * x * x,
		expected: R`2\pi x`
	},
	{
		id: 'poly-30',
		family: 'polynômes',
		latex: R`\sqrt{2}x+3`,
		custom: 'sqrt(2)x+3',
		f: (x) => Math.SQRT2 * x + 3,
		expected: R`\sqrt{2}`
	},
	{
		id: 'poly-31',
		family: 'polynômes',
		latex: R`2x\left(x^2-1\right)`,
		custom: '2x(x^2-1)',
		f: (x) => 2 * x * (x * x - 1)
	},
	{
		id: 'poly-32',
		family: 'polynômes',
		latex: '(x+1)(x-1)(x+2)',
		custom: '(x+1)(x-1)(x+2)',
		f: (x) => (x + 1) * (x - 1) * (x + 2)
	},
	{
		id: 'poly-33',
		family: 'polynômes',
		latex: '12x-3x^2',
		custom: '12x-3x^2',
		f: (x) => 12 * x - 3 * x * x,
		expected: '12-6x'
	},
	{
		id: 'poly-34',
		family: 'polynômes',
		latex: '0.2x^5',
		custom: '0.2x^5',
		f: (x) => 0.2 * x ** 5,
		expected: 'x^4'
	},
	{
		id: 'poly-35',
		family: 'polynômes',
		latex: '6x^2\\times 2x',
		custom: '6x^2*2x',
		f: (x) => 12 * x ** 3,
		expected: '36x^2'
	},

	// ---------------------------------------------------------------------------
	// Rationnelles
	// ---------------------------------------------------------------------------
	{
		id: 'rat-01',
		family: 'rationnelles',
		latex: R`\frac{1}{x}`,
		custom: '1/x',
		f: (x) => 1 / x,
		expected: R`-\frac{1}{x^2}`
	},
	{
		id: 'rat-02',
		family: 'rationnelles',
		latex: R`\frac{3}{x}`,
		custom: '3/x',
		f: (x) => 3 / x,
		expected: R`-\frac{3}{x^2}`
	},
	{
		id: 'rat-03',
		family: 'rationnelles',
		latex: R`\frac{1}{x^2}`,
		custom: '1/x^2',
		f: (x) => 1 / (x * x),
		expected: R`-\frac{2}{x^3}`
	},
	{
		id: 'rat-04',
		family: 'rationnelles',
		latex: R`\frac{x+1}{x-1}`,
		custom: '(x+1)/(x-1)',
		f: (x) => (x + 1) / (x - 1),
		expected: R`-\frac{2}{(x-1)^2}`
	},
	{
		id: 'rat-05',
		family: 'rationnelles',
		latex: R`\frac{2x+1}{x-3}`,
		custom: '(2x+1)/(x-3)',
		f: (x) => (2 * x + 1) / (x - 3),
		expected: R`-\frac{7}{(x-3)^2}`
	},
	{
		id: 'rat-06',
		family: 'rationnelles',
		latex: R`\frac{1}{2x+3}`,
		custom: '1/(2x+3)',
		f: (x) => 1 / (2 * x + 3),
		expected: R`-\frac{2}{(2x+3)^2}`
	},
	{
		id: 'rat-07',
		family: 'rationnelles',
		latex: R`\frac{5}{x^2+1}`,
		custom: '5/(x^2+1)',
		f: (x) => 5 / (x * x + 1),
		expected: R`-\frac{10x}{(x^2+1)^2}`
	},
	{
		id: 'rat-08',
		family: 'rationnelles',
		latex: R`\frac{x^2}{x+1}`,
		custom: 'x^2/(x+1)',
		f: (x) => (x * x) / (x + 1),
		expected: R`\frac{x^2+2x}{(x+1)^2}`
	},
	{
		id: 'rat-09',
		family: 'rationnelles',
		latex: R`\frac{x}{x^2+1}`,
		custom: 'x/(x^2+1)',
		f: (x) => x / (x * x + 1),
		expected: R`\frac{1-x^2}{(x^2+1)^2}`
	},
	{
		id: 'rat-10',
		family: 'rationnelles',
		latex: R`x+\frac{1}{x}`,
		custom: 'x+1/x',
		f: (x) => x + 1 / x,
		expected: R`1-\frac{1}{x^2}`
	},
	{
		id: 'rat-11',
		family: 'rationnelles',
		latex: R`2x-3+\frac{4}{x}`,
		custom: '2x-3+4/x',
		f: (x) => 2 * x - 3 + 4 / x,
		expected: R`2-\frac{4}{x^2}`
	},
	{
		id: 'rat-12',
		family: 'rationnelles',
		latex: R`\frac{3x-1}{2x+5}`,
		custom: '(3x-1)/(2x+5)',
		f: (x) => (3 * x - 1) / (2 * x + 5),
		expected: R`\frac{17}{(2x+5)^2}`
	},
	{
		id: 'rat-13',
		family: 'rationnelles',
		latex: R`\frac{-2}{x-4}`,
		custom: '-2/(x-4)',
		f: (x) => -2 / (x - 4),
		expected: R`\frac{2}{(x-4)^2}`
	},
	{
		id: 'rat-14',
		family: 'rationnelles',
		latex: R`\frac{x^2-1}{x^2+1}`,
		custom: '(x^2-1)/(x^2+1)',
		f: (x) => (x * x - 1) / (x * x + 1),
		expected: R`\frac{4x}{(x^2+1)^2}`
	},
	{
		id: 'rat-15',
		family: 'rationnelles',
		latex: R`\frac{1}{x^3}`,
		custom: '1/x^3',
		f: (x) => 1 / x ** 3,
		expected: R`-\frac{3}{x^4}`
	},
	{
		id: 'rat-16',
		family: 'rationnelles',
		latex: R`\frac{4}{(x-2)^2}`,
		custom: '4/(x-2)^2',
		f: (x) => 4 / (x - 2) ** 2,
		expected: R`-\frac{8}{(x-2)^3}`
	},
	{
		id: 'rat-17',
		family: 'rationnelles',
		latex: R`\frac{x^3}{3}-\frac{1}{x}`,
		custom: 'x^3/3-1/x',
		f: (x) => x ** 3 / 3 - 1 / x,
		expected: R`x^2+\frac{1}{x^2}`
	},
	{
		id: 'rat-18',
		family: 'rationnelles',
		latex: R`\frac{2x}{x^2-9}`,
		custom: '2x/(x^2-9)',
		f: (x) => (2 * x) / (x * x - 9),
		expected: R`\frac{-2x^2-18}{(x^2-9)^2}`
	},
	{
		id: 'rat-19',
		family: 'rationnelles',
		latex: R`\frac{1-x}{1+x}`,
		custom: '(1-x)/(1+x)',
		f: (x) => (1 - x) / (1 + x),
		expected: R`-\frac{2}{(1+x)^2}`
	},
	{
		id: 'rat-20',
		family: 'rationnelles',
		latex: R`3+\frac{2}{x-1}`,
		custom: '3+2/(x-1)',
		f: (x) => 3 + 2 / (x - 1),
		expected: R`-\frac{2}{(x-1)^2}`
	},
	{
		id: 'rat-21',
		family: 'rationnelles',
		latex: R`\frac{x^2+x+1}{x}`,
		custom: '(x^2+x+1)/x',
		f: (x) => (x * x + x + 1) / x,
		expected: R`\frac{x^2-1}{x^2}`
	},
	{
		id: 'rat-22',
		family: 'rationnelles',
		latex: R`\frac{1}{x^2+x+1}`,
		custom: '1/(x^2+x+1)',
		f: (x) => 1 / (x * x + x + 1),
		expected: R`-\frac{2x+1}{(x^2+x+1)^2}`
	},

	// ---------------------------------------------------------------------------
	// Racines
	// ---------------------------------------------------------------------------
	{
		id: 'rac-01',
		family: 'racines',
		latex: R`\sqrt{x}`,
		custom: 'sqrt(x)',
		f: (x) => sqrt(x),
		points: POINTS_POS,
		expected: R`\frac{1}{2\sqrt{x}}`
	},
	{
		id: 'rac-02',
		family: 'racines',
		latex: R`3\sqrt{x}`,
		custom: '3sqrt(x)',
		f: (x) => 3 * sqrt(x),
		points: POINTS_POS,
		expected: R`\frac{3}{2\sqrt{x}}`
	},
	{
		id: 'rac-03',
		family: 'racines',
		latex: R`\sqrt{2x+1}`,
		custom: 'sqrt(2x+1)',
		f: (x) => sqrt(2 * x + 1),
		points: POINTS_POS,
		expected: R`\frac{1}{\sqrt{2x+1}}`
	},
	{
		id: 'rac-04',
		family: 'racines',
		latex: R`\sqrt{x^2+1}`,
		custom: 'sqrt(x^2+1)',
		f: (x) => sqrt(x * x + 1),
		expected: R`\frac{x}{\sqrt{x^2+1}}`
	},
	{
		id: 'rac-05',
		family: 'racines',
		latex: R`\sqrt{4-x^2}`,
		custom: 'sqrt(4-x^2)',
		f: (x) => sqrt(4 - x * x),
		points: [-1.7, -1.1, -0.4, 0.3, 0.8, 1.5],
		expected: R`-\frac{x}{\sqrt{4-x^2}}`
	},
	{
		id: 'rac-06',
		family: 'racines',
		latex: R`x\sqrt{x}`,
		custom: 'x*sqrt(x)',
		f: (x) => x * sqrt(x),
		points: POINTS_POS,
		expected: R`\frac{3}{2}\sqrt{x}`
	},
	{
		id: 'rac-07',
		family: 'racines',
		latex: R`\frac{1}{\sqrt{x}}`,
		custom: '1/sqrt(x)',
		f: (x) => 1 / sqrt(x),
		points: POINTS_POS,
		expected: R`-\frac{1}{2x\sqrt{x}}`
	},
	{
		id: 'rac-08',
		family: 'racines',
		latex: R`\sqrt[3]{x}`,
		custom: 'x^(1/3)',
		f: (x) => cbrt(x),
		points: POINTS_POS,
		expected: R`\frac{1}{3\sqrt[3]{x^2}}`
	},
	{
		id: 'rac-09',
		family: 'racines',
		latex: R`\sqrt[3]{2x+1}`,
		f: (x) => cbrt(2 * x + 1),
		points: POINTS_POS
	},
	{
		id: 'rac-10',
		family: 'racines',
		latex: R`\sqrt[4]{x}`,
		custom: 'x^(1/4)',
		f: (x) => x ** 0.25,
		points: POINTS_POS
	},
	{
		id: 'rac-11',
		family: 'racines',
		latex: R`\sqrt{x}-x`,
		custom: 'sqrt(x)-x',
		f: (x) => sqrt(x) - x,
		points: POINTS_POS,
		expected: R`\frac{1}{2\sqrt{x}}-1`
	},
	{
		id: 'rac-12',
		family: 'racines',
		latex: R`\sqrt{3-2x}`,
		custom: 'sqrt(3-2x)',
		f: (x) => sqrt(3 - 2 * x),
		points: [-2.3, -1.4, -0.65, 0.35, 0.9, 1.3],
		expected: R`-\frac{1}{\sqrt{3-2x}}`
	},
	{
		id: 'rac-13',
		family: 'racines',
		latex: R`(x+1)\sqrt{x}`,
		custom: '(x+1)sqrt(x)',
		f: (x) => (x + 1) * sqrt(x),
		points: POINTS_POS
	},
	{
		id: 'rac-14',
		family: 'racines',
		latex: R`\frac{\sqrt{x}}{x+1}`,
		custom: 'sqrt(x)/(x+1)',
		f: (x) => sqrt(x) / (x + 1),
		points: POINTS_POS
	},

	// ---------------------------------------------------------------------------
	// Puissances fractionnaires et négatives
	// ---------------------------------------------------------------------------
	{
		id: 'pow-01',
		family: 'puissances',
		latex: 'x^{-1}',
		custom: 'x^(-1)',
		f: (x) => 1 / x,
		expected: '-x^{-2}'
	},
	{
		id: 'pow-02',
		family: 'puissances',
		latex: '3x^{-2}',
		custom: '3x^(-2)',
		f: (x) => 3 / (x * x),
		expected: '-6x^{-3}'
	},
	{
		id: 'pow-03',
		family: 'puissances',
		latex: R`x^{\frac{3}{2}}`,
		custom: 'x^(3/2)',
		f: (x) => x ** 1.5,
		points: POINTS_POS,
		expected: R`\frac{3}{2}x^{\frac{1}{2}}`
	},
	{
		id: 'pow-04',
		family: 'puissances',
		latex: R`x^{\frac{1}{2}}`,
		custom: 'x^(1/2)',
		f: (x) => sqrt(x),
		points: POINTS_POS,
		expected: R`\frac{1}{2}x^{-\frac{1}{2}}`
	},
	{
		id: 'pow-05',
		family: 'puissances',
		latex: R`4x^{\frac{3}{4}}`,
		custom: '4x^(3/4)',
		f: (x) => 4 * x ** 0.75,
		points: POINTS_POS,
		expected: R`3x^{-\frac{1}{4}}`
	},
	{
		id: 'pow-06',
		family: 'puissances',
		latex: 'x^{-3}+x^{3}',
		custom: 'x^(-3)+x^3',
		f: (x) => x ** -3 + x ** 3,
		expected: '-3x^{-4}+3x^2'
	},
	{
		id: 'pow-07',
		family: 'puissances',
		latex: 'x^{2.5}',
		custom: 'x^2.5',
		f: (x) => x ** 2.5,
		points: POINTS_POS,
		expected: '2.5x^{1.5}'
	},
	{
		id: 'pow-08',
		family: 'puissances',
		latex: '(2x+1)^{-1}',
		custom: '(2x+1)^(-1)',
		f: (x) => 1 / (2 * x + 1),
		expected: '-2(2x+1)^{-2}'
	},
	{
		id: 'pow-09',
		family: 'puissances',
		latex: R`(x^2+1)^{\frac{1}{2}}`,
		custom: '(x^2+1)^(1/2)',
		f: (x) => sqrt(x * x + 1)
	},
	{
		id: 'pow-10',
		family: 'puissances',
		latex: '(3x-1)^{-2}',
		custom: '(3x-1)^(-2)',
		f: (x) => (3 * x - 1) ** -2,
		expected: '-6(3x-1)^{-3}'
	},
	{
		id: 'pow-11',
		family: 'puissances',
		latex: R`x^{-\frac{1}{2}}`,
		custom: 'x^(-1/2)',
		f: (x) => x ** -0.5,
		points: POINTS_POS,
		expected: R`-\frac{1}{2}x^{-\frac{3}{2}}`
	},
	{
		id: 'pow-12',
		family: 'puissances',
		latex: R`5x^{\frac{2}{5}}`,
		custom: '5x^(2/5)',
		f: (x) => 5 * x ** 0.4,
		points: POINTS_POS,
		expected: R`2x^{-\frac{3}{5}}`
	},
	{
		id: 'pow-13',
		family: 'puissances',
		latex: '2^{3}x^{2}',
		custom: '2^3x^2',
		f: (x) => 8 * x * x,
		expected: '16x'
	},

	// ---------------------------------------------------------------------------
	// Exponentielle — le défaut `(e^u)'` avec ln(e)
	// ---------------------------------------------------------------------------
	{
		id: 'exp-01',
		family: 'exponentielle',
		latex: 'e^{x}',
		custom: 'e^x',
		f: (x) => exp(x),
		expected: 'e^x'
	},
	{
		id: 'exp-02',
		family: 'exponentielle',
		latex: 'e^{2x}',
		custom: 'e^(2x)',
		f: (x) => exp(2 * x),
		expected: '2e^{2x}'
	},
	{
		id: 'exp-03',
		family: 'exponentielle',
		latex: 'e^{-x}',
		custom: 'e^(-x)',
		f: (x) => exp(-x),
		expected: '-e^{-x}'
	},
	{
		id: 'exp-04',
		family: 'exponentielle',
		latex: '3e^{-2x}',
		custom: '3e^(-2x)',
		f: (x) => 3 * exp(-2 * x),
		expected: '-6e^{-2x}'
	},
	{
		id: 'exp-05',
		family: 'exponentielle',
		latex: 'e^{x^2}',
		custom: 'e^(x^2)',
		f: (x) => exp(x * x),
		expected: '2xe^{x^2}'
	},
	{
		id: 'exp-06',
		family: 'exponentielle',
		latex: 'e^{-x^2}',
		custom: 'e^(-x^2)',
		f: (x) => exp(-x * x),
		expected: '-2xe^{-x^2}'
	},
	{
		id: 'exp-07',
		family: 'exponentielle',
		latex: 'e^{3x+1}',
		custom: 'e^(3x+1)',
		f: (x) => exp(3 * x + 1),
		expected: '3e^{3x+1}'
	},
	{
		id: 'exp-08',
		family: 'exponentielle',
		latex: R`\exp(x)`,
		custom: 'exp(x)',
		f: (x) => exp(x),
		expected: R`\exp(x)`
	},
	{
		id: 'exp-09',
		family: 'exponentielle',
		latex: R`\exp(4x)`,
		custom: 'exp(4x)',
		f: (x) => exp(4 * x),
		expected: R`4\exp(4x)`
	},
	{
		id: 'exp-10',
		family: 'exponentielle',
		latex: R`\exponentialE^{x}`,
		f: (x) => exp(x),
		expected: 'e^x'
	},
	{
		id: 'exp-11',
		family: 'exponentielle',
		latex: 'e^{x}+x',
		custom: 'e^x+x',
		f: (x) => exp(x) + x,
		expected: 'e^x+1'
	},
	{
		id: 'exp-12',
		family: 'exponentielle',
		latex: '5e^{x}-3x^2',
		custom: '5e^x-3x^2',
		f: (x) => 5 * exp(x) - 3 * x * x,
		expected: '5e^x-6x'
	},
	{
		id: 'exp-13',
		family: 'exponentielle',
		latex: R`e^{\frac{x}{2}}`,
		custom: 'e^(x/2)',
		f: (x) => exp(x / 2),
		expected: R`\frac{1}{2}e^{\frac{x}{2}}`
	},
	{
		id: 'exp-14',
		family: 'exponentielle',
		latex: R`e^{\frac{1}{x}}`,
		custom: 'e^(1/x)',
		f: (x) => exp(1 / x),
		expected: R`-\frac{1}{x^2}e^{\frac{1}{x}}`
	},
	{
		id: 'exp-15',
		family: 'exponentielle',
		latex: R`e^{\sin x}`,
		custom: 'e^(sin(x))',
		f: (x) => exp(sin(x)),
		expected: R`\cos(x)e^{\sin(x)}`
	},
	{
		id: 'exp-16',
		family: 'exponentielle',
		latex: R`e^{\sqrt{x}}`,
		custom: 'e^(sqrt(x))',
		f: (x) => exp(sqrt(x)),
		points: POINTS_POS,
		expected: R`\frac{e^{\sqrt{x}}}{2\sqrt{x}}`
	},
	{
		id: 'exp-17',
		family: 'exponentielle',
		latex: 'e^{2x}-e^{-2x}',
		custom: 'e^(2x)-e^(-2x)',
		f: (x) => exp(2 * x) - exp(-2 * x),
		expected: '2e^{2x}+2e^{-2x}'
	},
	{
		id: 'exp-18',
		family: 'exponentielle',
		latex: '(e^{x})^2',
		custom: '(e^x)^2',
		f: (x) => exp(2 * x),
		expected: '2e^{2x}'
	},
	{
		id: 'exp-19',
		family: 'exponentielle',
		latex: R`\frac{e^{x}+e^{-x}}{2}`,
		custom: '(e^x+e^(-x))/2',
		f: (x) => (exp(x) + exp(-x)) / 2,
		expected: R`\frac{e^x-e^{-x}}{2}`
	},
	{
		id: 'exp-20',
		family: 'exponentielle',
		latex: 'e^{1-x}',
		custom: 'e^(1-x)',
		f: (x) => exp(1 - x),
		expected: '-e^{1-x}'
	},
	{
		id: 'exp-21',
		family: 'exponentielle',
		latex: 'e^{x^2-3x}',
		custom: 'e^(x^2-3x)',
		f: (x) => exp(x * x - 3 * x),
		expected: '(2x-3)e^{x^2-3x}'
	},
	{
		id: 'exp-22',
		family: 'exponentielle',
		latex: '2e^{0.5x}',
		custom: '2e^(0.5x)',
		f: (x) => 2 * exp(0.5 * x),
		expected: 'e^{0.5x}'
	},
	{
		id: 'exp-23',
		family: 'exponentielle',
		latex: 'e^{2}x',
		custom: 'e^2x',
		f: (x) => Math.E ** 2 * x,
		expected: 'e^2'
	},

	// ---------------------------------------------------------------------------
	// Logarithme népérien
	// ---------------------------------------------------------------------------
	{
		id: 'ln-01',
		family: 'logarithme',
		latex: R`\ln(x)`,
		custom: 'ln(x)',
		f: (x) => log(x),
		points: POINTS_POS,
		expected: R`\frac{1}{x}`
	},
	{
		id: 'ln-02',
		family: 'logarithme',
		latex: R`\ln x`,
		f: (x) => log(x),
		points: POINTS_POS,
		expected: R`\frac{1}{x}`
	},
	{
		id: 'ln-03',
		family: 'logarithme',
		latex: R`3\ln(x)`,
		custom: '3ln(x)',
		f: (x) => 3 * log(x),
		points: POINTS_POS,
		expected: R`\frac{3}{x}`
	},
	{
		id: 'ln-04',
		family: 'logarithme',
		latex: R`\ln(2x)`,
		custom: 'ln(2x)',
		f: (x) => log(2 * x),
		points: POINTS_POS,
		expected: R`\frac{1}{x}`
	},
	{
		id: 'ln-05',
		family: 'logarithme',
		latex: R`\ln(x^2+1)`,
		custom: 'ln(x^2+1)',
		f: (x) => log(x * x + 1),
		expected: R`\frac{2x}{x^2+1}`
	},
	{
		id: 'ln-06',
		family: 'logarithme',
		latex: R`\ln(3x-1)`,
		custom: 'ln(3x-1)',
		f: (x) => log(3 * x - 1),
		points: [0.5, 0.9, 1.3, 2.1, 3.4, 5.2],
		expected: R`\frac{3}{3x-1}`
	},
	{
		id: 'ln-07',
		family: 'logarithme',
		latex: R`x\ln(x)`,
		custom: 'x*ln(x)',
		f: (x) => x * log(x),
		points: POINTS_POS,
		expected: R`\ln(x)+1`
	},
	{
		id: 'ln-08',
		family: 'logarithme',
		latex: R`x\ln(x)-x`,
		custom: 'x*ln(x)-x',
		f: (x) => x * log(x) - x,
		points: POINTS_POS,
		expected: R`\ln(x)`
	},
	{
		id: 'ln-09',
		family: 'logarithme',
		latex: R`\frac{\ln(x)}{x}`,
		custom: 'ln(x)/x',
		f: (x) => log(x) / x,
		points: POINTS_POS,
		expected: R`\frac{1-\ln(x)}{x^2}`
	},
	{
		id: 'ln-10',
		family: 'logarithme',
		latex: R`(\ln x)^2`,
		custom: 'ln(x)^2',
		f: (x) => log(x) ** 2,
		points: POINTS_POS,
		expected: R`\frac{2\ln(x)}{x}`
	},
	{
		id: 'ln-11',
		family: 'logarithme',
		latex: R`\ln^2 x`,
		f: (x) => log(x) ** 2,
		points: POINTS_POS,
		expected: R`\frac{2\ln(x)}{x}`
	},
	{
		id: 'ln-12',
		family: 'logarithme',
		latex: R`\ln(\ln x)`,
		custom: 'ln(ln(x))',
		f: (x) => log(log(x)),
		points: [1.3, 1.8, 2.1, 3.4, 5.2, 7.7],
		expected: R`\frac{1}{x\ln(x)}`
	},
	{
		id: 'ln-13',
		family: 'logarithme',
		latex: R`\ln(e^{x}+1)`,
		custom: 'ln(e^x+1)',
		f: (x) => log(exp(x) + 1),
		expected: R`\frac{e^x}{e^x+1}`
	},
	{
		id: 'ln-14',
		family: 'logarithme',
		latex: R`x^2\ln(x)`,
		custom: 'x^2*ln(x)',
		f: (x) => x * x * log(x),
		points: POINTS_POS,
		expected: R`2x\ln(x)+x`
	},
	{
		id: 'ln-15',
		family: 'logarithme',
		latex: R`\ln\left(\frac{x}{2}\right)`,
		custom: 'ln(x/2)',
		f: (x) => log(x / 2),
		points: POINTS_POS,
		expected: R`\frac{1}{x}`
	},
	{
		id: 'ln-16',
		family: 'logarithme',
		latex: R`\ln\left(\frac{x+1}{x}\right)`,
		custom: 'ln((x+1)/x)',
		f: (x) => log((x + 1) / x),
		points: POINTS_POS
	},
	{
		id: 'ln-17',
		family: 'logarithme',
		latex: R`\ln(\sqrt{x})`,
		custom: 'ln(sqrt(x))',
		f: (x) => 0.5 * log(x),
		points: POINTS_POS,
		expected: R`\frac{1}{2x}`
	},
	{
		id: 'ln-18',
		family: 'logarithme',
		latex: R`2\ln(x)-x+3`,
		custom: '2ln(x)-x+3',
		f: (x) => 2 * log(x) - x + 3,
		points: POINTS_POS,
		expected: R`\frac{2}{x}-1`
	},
	{
		id: 'ln-19',
		family: 'logarithme',
		latex: R`\ln(1-x)`,
		custom: 'ln(1-x)',
		f: (x) => log(1 - x),
		points: [-2.3, -1.4, -0.65, -0.2, 0.35, 0.7],
		expected: R`\frac{-1}{1-x}`
	},
	{
		id: 'ln-20',
		family: 'logarithme',
		latex: R`\ln(x)+\ln(e)`,
		custom: 'ln(x)+ln(e)',
		f: (x) => log(x) + 1,
		points: POINTS_POS,
		expected: R`\frac{1}{x}`
	},

	// ---------------------------------------------------------------------------
	// log_a et a^x
	// ---------------------------------------------------------------------------
	{
		id: 'loga-01',
		family: 'log_a et a^x',
		latex: R`\log_2(x)`,
		custom: 'log_2(x)',
		f: (x) => Math.log2(x),
		points: POINTS_POS,
		expected: R`\frac{1}{x\ln(2)}`
	},
	{
		id: 'loga-02',
		family: 'log_a et a^x',
		latex: R`\log_{10}(x)`,
		custom: 'log_10(x)',
		f: (x) => Math.log10(x),
		points: POINTS_POS,
		expected: R`\frac{1}{x\ln(10)}`
	},
	{
		id: 'loga-03',
		family: 'log_a et a^x',
		latex: R`\log(x)`,
		custom: 'log(x)',
		f: (x) => Math.log10(x),
		points: POINTS_POS,
		expected: R`\frac{1}{x\ln(10)}`
	},
	{
		id: 'loga-04',
		family: 'log_a et a^x',
		latex: R`\log_3(2x+1)`,
		custom: 'log_3(2x+1)',
		f: (x) => log(2 * x + 1) / log(3),
		points: POINTS_POS,
		expected: R`\frac{2}{(2x+1)\ln(3)}`
	},
	{
		id: 'loga-05',
		family: 'log_a et a^x',
		latex: '2^{x}',
		custom: '2^x',
		f: (x) => 2 ** x,
		expected: R`\ln(2)2^x`
	},
	{
		id: 'loga-06',
		family: 'log_a et a^x',
		latex: '3^{2x}',
		custom: '3^(2x)',
		f: (x) => 3 ** (2 * x),
		expected: R`2\ln(3)3^{2x}`
	},
	{
		id: 'loga-07',
		family: 'log_a et a^x',
		latex: '0.5^{x}',
		custom: '0.5^x',
		f: (x) => 0.5 ** x,
		expected: R`\ln(0.5)0.5^x`
	},
	{
		id: 'loga-08',
		family: 'log_a et a^x',
		latex: '10^{x}',
		custom: '10^x',
		f: (x) => 10 ** x,
		expected: R`\ln(10)10^x`
	},
	{
		id: 'loga-09',
		family: 'log_a et a^x',
		latex: '5\\times 2^{x}',
		custom: '5*2^x',
		f: (x) => 5 * 2 ** x,
		expected: R`5\ln(2)2^x`
	},
	{
		id: 'loga-10',
		family: 'log_a et a^x',
		latex: '2^{x^2}',
		custom: '2^(x^2)',
		f: (x) => 2 ** (x * x),
		expected: R`2x\ln(2)2^{x^2}`
	},
	{
		id: 'loga-11',
		family: 'log_a et a^x',
		latex: 'x^{x}',
		custom: 'x^x',
		f: (x) => x ** x,
		points: POINTS_POS,
		expected: R`(\ln(x)+1)x^x`
	},
	{
		id: 'loga-12',
		family: 'log_a et a^x',
		latex: R`\left(\frac{1}{2}\right)^{x}`,
		custom: '(1/2)^x',
		f: (x) => 0.5 ** x
	},

	// ---------------------------------------------------------------------------
	// Trigonométrie — `\sin^2 x` dont la puissance était ignorée
	// ---------------------------------------------------------------------------
	{
		id: 'trig-01',
		family: 'trigonométrie',
		latex: R`\sin(x)`,
		custom: 'sin(x)',
		f: (x) => sin(x),
		expected: R`\cos(x)`
	},
	{
		id: 'trig-02',
		family: 'trigonométrie',
		latex: R`\cos(x)`,
		custom: 'cos(x)',
		f: (x) => cos(x),
		expected: R`-\sin(x)`
	},
	{
		id: 'trig-03',
		family: 'trigonométrie',
		latex: R`\tan(x)`,
		custom: 'tan(x)',
		f: (x) => tan(x),
		expected: R`\frac{1}{\cos^2(x)}`
	},
	{
		id: 'trig-04',
		family: 'trigonométrie',
		latex: R`\sin(2x)`,
		custom: 'sin(2x)',
		f: (x) => sin(2 * x),
		expected: R`2\cos(2x)`
	},
	{
		id: 'trig-05',
		family: 'trigonométrie',
		latex: R`\cos(2x)`,
		custom: 'cos(2x)',
		f: (x) => cos(2 * x),
		expected: R`-2\sin(2x)`
	},
	{
		id: 'trig-06',
		family: 'trigonométrie',
		latex: R`3\sin(x)`,
		custom: '3sin(x)',
		f: (x) => 3 * sin(x),
		expected: R`3\cos(x)`
	},
	{
		id: 'trig-07',
		family: 'trigonométrie',
		latex: R`-2\cos(3x)`,
		custom: '-2cos(3x)',
		f: (x) => -2 * cos(3 * x),
		expected: R`6\sin(3x)`
	},
	{
		id: 'trig-08',
		family: 'trigonométrie',
		latex: R`\sin^2 x`,
		f: (x) => sin(x) ** 2,
		expected: R`2\sin(x)\cos(x)`
	},
	{
		id: 'trig-09',
		family: 'trigonométrie',
		latex: R`\sin^2(x)`,
		custom: 'sin(x)^2',
		f: (x) => sin(x) ** 2,
		expected: R`2\sin(x)\cos(x)`
	},
	{
		id: 'trig-10',
		family: 'trigonométrie',
		latex: R`\cos^2(x)`,
		custom: 'cos(x)^2',
		f: (x) => cos(x) ** 2,
		expected: R`-2\sin(x)\cos(x)`
	},
	{
		id: 'trig-11',
		family: 'trigonométrie',
		latex: R`\sin^3(x)`,
		custom: 'sin(x)^3',
		f: (x) => sin(x) ** 3,
		expected: R`3\sin^2(x)\cos(x)`
	},
	{
		id: 'trig-12',
		family: 'trigonométrie',
		latex: R`\cos^3 x`,
		f: (x) => cos(x) ** 3,
		expected: R`-3\cos^2(x)\sin(x)`
	},
	{
		id: 'trig-13',
		family: 'trigonométrie',
		latex: R`\sin(x)^2`,
		f: (x) => sin(x) ** 2,
		expected: R`2\sin(x)\cos(x)`
	},
	{
		id: 'trig-14',
		family: 'trigonométrie',
		latex: R`(\sin x)^2`,
		f: (x) => sin(x) ** 2,
		expected: R`2\sin(x)\cos(x)`
	},
	{
		id: 'trig-15',
		family: 'trigonométrie',
		latex: R`\sin(x^2)`,
		custom: 'sin(x^2)',
		f: (x) => sin(x * x),
		expected: R`2x\cos(x^2)`
	},
	{
		id: 'trig-16',
		family: 'trigonométrie',
		latex: R`\cos\left(3x+\frac{\pi}{4}\right)`,
		custom: R`cos(3x+\pi/4)`,
		f: (x) => cos(3 * x + PI / 4),
		expected: R`-3\sin\left(3x+\frac{\pi}{4}\right)`
	},
	{
		id: 'trig-17',
		family: 'trigonométrie',
		latex: R`\sin(x)+\cos(x)`,
		custom: 'sin(x)+cos(x)',
		f: (x) => sin(x) + cos(x),
		expected: R`\cos(x)-\sin(x)`
	},
	{
		id: 'trig-18',
		family: 'trigonométrie',
		latex: R`\tan(2x)`,
		custom: 'tan(2x)',
		f: (x) => tan(2 * x),
		points: [-2.3, -1.4, -0.65, 0.35, 1.0, 1.7, 2.6],
		expected: R`\frac{2}{\cos^2(2x)}`
	},
	{
		id: 'trig-19',
		family: 'trigonométrie',
		latex: R`\tan^2(x)`,
		custom: 'tan(x)^2',
		f: (x) => tan(x) ** 2,
		expected: R`2\tan(x)(1+\tan^2(x))`
	},
	{
		id: 'trig-20',
		family: 'trigonométrie',
		latex: R`\sin^{2}(3x)`,
		custom: 'sin(3x)^2',
		f: (x) => sin(3 * x) ** 2,
		expected: R`6\sin(3x)\cos(3x)`
	},
	{
		id: 'trig-21',
		family: 'trigonométrie',
		latex: R`\sin(x)\cos(x)`,
		custom: 'sin(x)cos(x)',
		f: (x) => sin(x) * cos(x),
		expected: R`\cos^2(x)-\sin^2(x)`
	},
	{
		id: 'trig-22',
		family: 'trigonométrie',
		latex: R`\frac{1}{\cos(x)}`,
		custom: '1/cos(x)',
		f: (x) => 1 / cos(x),
		expected: R`\frac{\sin(x)}{\cos^2(x)}`
	},
	{
		id: 'trig-23',
		family: 'trigonométrie',
		latex: R`\sin(\pi x)`,
		custom: R`sin(\pi x)`,
		f: (x) => sin(PI * x),
		expected: R`\pi\cos(\pi x)`
	},
	{
		id: 'trig-24',
		family: 'trigonométrie',
		latex: R`\cos(-x)`,
		custom: 'cos(-x)',
		f: (x) => cos(-x),
		expected: R`\sin(-x)`
	},
	{
		id: 'trig-25',
		family: 'trigonométrie',
		latex: R`\sin\left(\frac{x}{2}\right)`,
		custom: 'sin(x/2)',
		f: (x) => sin(x / 2),
		expected: R`\frac{1}{2}\cos\left(\frac{x}{2}\right)`
	},
	{
		id: 'trig-26',
		family: 'trigonométrie',
		latex: R`\cos^{-1}(x)`,
		f: (x) => acos(x),
		points: POINTS_UNIT,
		expected: R`-\frac{1}{\sqrt{1-x^2}}`
	},
	{
		id: 'trig-27',
		family: 'trigonométrie',
		latex: R`\sin^{-1}(x)`,
		f: (x) => asin(x),
		points: POINTS_UNIT,
		expected: R`\frac{1}{\sqrt{1-x^2}}`
	},
	{
		id: 'trig-28',
		family: 'trigonométrie',
		latex: R`\tan^{-1}(x)`,
		f: (x) => atan(x),
		expected: R`\frac{1}{1+x^2}`
	},
	{
		id: 'trig-29',
		family: 'trigonométrie',
		latex: R`\sin x\cos x`,
		f: (x) => sin(x) * cos(x),
		expected: R`\cos^2(x)-\sin^2(x)`
	},
	{
		id: 'trig-30',
		family: 'trigonométrie',
		latex: R`2\sin^2(x)-1`,
		custom: '2sin(x)^2-1',
		f: (x) => 2 * sin(x) ** 2 - 1,
		expected: R`4\sin(x)\cos(x)`
	},

	// ---------------------------------------------------------------------------
	// Fonctions réciproques
	// ---------------------------------------------------------------------------
	{
		id: 'inv-01',
		family: 'réciproques',
		latex: R`\arcsin(x)`,
		custom: 'arcsin(x)',
		f: (x) => asin(x),
		points: POINTS_UNIT,
		expected: R`\frac{1}{\sqrt{1-x^2}}`
	},
	{
		id: 'inv-02',
		family: 'réciproques',
		latex: R`\arccos(x)`,
		custom: 'arccos(x)',
		f: (x) => acos(x),
		points: POINTS_UNIT,
		expected: R`-\frac{1}{\sqrt{1-x^2}}`
	},
	{
		id: 'inv-03',
		family: 'réciproques',
		latex: R`\arctan(x)`,
		custom: 'arctan(x)',
		f: (x) => atan(x),
		expected: R`\frac{1}{1+x^2}`
	},
	{
		id: 'inv-04',
		family: 'réciproques',
		latex: R`\arctan(2x)`,
		custom: 'arctan(2x)',
		f: (x) => atan(2 * x),
		expected: R`\frac{2}{1+4x^2}`
	},
	{
		id: 'inv-05',
		family: 'réciproques',
		latex: R`\arcsin(2x)`,
		custom: 'arcsin(2x)',
		f: (x) => asin(2 * x),
		points: [-0.4, -0.25, -0.1, 0.15, 0.3, 0.45],
		expected: R`\frac{2}{\sqrt{1-4x^2}}`
	},
	{
		id: 'inv-06',
		family: 'réciproques',
		latex: R`\arctan(x^2)`,
		custom: 'arctan(x^2)',
		f: (x) => atan(x * x),
		expected: R`\frac{2x}{1+x^4}`
	},
	{
		id: 'inv-07',
		family: 'réciproques',
		latex: R`x\arctan(x)`,
		custom: 'x*arctan(x)',
		f: (x) => x * atan(x)
	},
	{
		id: 'inv-08',
		family: 'réciproques',
		latex: R`\arctan\left(\frac{1}{x}\right)`,
		custom: 'arctan(1/x)',
		f: (x) => atan(1 / x),
		expected: R`-\frac{1}{1+x^2}`
	},
	{
		id: 'inv-09',
		family: 'réciproques',
		latex: R`3\arcsin(x)`,
		custom: '3arcsin(x)',
		f: (x) => 3 * asin(x),
		points: POINTS_UNIT,
		expected: R`\frac{3}{\sqrt{1-x^2}}`
	},
	{
		id: 'inv-10',
		family: 'réciproques',
		latex: R`\arccos(x^2)`,
		custom: 'arccos(x^2)',
		f: (x) => acos(x * x),
		points: POINTS_UNIT
	},

	// ---------------------------------------------------------------------------
	// Produits
	// ---------------------------------------------------------------------------
	{
		id: 'prod-01',
		family: 'produits',
		latex: R`x e^{x}`,
		custom: 'x*e^x',
		f: (x) => x * exp(x),
		expected: '(x+1)e^x'
	},
	{
		id: 'prod-02',
		family: 'produits',
		latex: R`(2x+1)e^{x}`,
		custom: '(2x+1)e^x',
		f: (x) => (2 * x + 1) * exp(x),
		expected: '(2x+3)e^x'
	},
	{
		id: 'prod-03',
		family: 'produits',
		latex: R`x^2 e^{-x}`,
		custom: 'x^2*e^(-x)',
		f: (x) => x * x * exp(-x),
		expected: '(2x-x^2)e^{-x}'
	},
	{
		id: 'prod-04',
		family: 'produits',
		latex: R`x\sin(x)`,
		custom: 'x*sin(x)',
		f: (x) => x * sin(x),
		expected: R`\sin(x)+x\cos(x)`
	},
	{
		id: 'prod-05',
		family: 'produits',
		latex: R`x^2\cos(x)`,
		custom: 'x^2*cos(x)',
		f: (x) => x * x * cos(x),
		expected: R`2x\cos(x)-x^2\sin(x)`
	},
	{
		id: 'prod-06',
		family: 'produits',
		latex: R`e^{x}\sin(x)`,
		custom: 'e^x*sin(x)',
		f: (x) => exp(x) * sin(x),
		expected: R`e^x(\sin(x)+\cos(x))`
	},
	{
		id: 'prod-07',
		family: 'produits',
		latex: R`e^{-x}\cos(2x)`,
		custom: 'e^(-x)*cos(2x)',
		f: (x) => exp(-x) * cos(2 * x)
	},
	{
		id: 'prod-08',
		family: 'produits',
		latex: R`(x-1)\ln(x)`,
		custom: '(x-1)ln(x)',
		f: (x) => (x - 1) * log(x),
		points: POINTS_POS
	},
	{
		id: 'prod-09',
		family: 'produits',
		latex: R`(3x^2-1)(2x+5)`,
		custom: '(3x^2-1)(2x+5)',
		f: (x) => (3 * x * x - 1) * (2 * x + 5)
	},
	{
		id: 'prod-10',
		family: 'produits',
		latex: R`x\sqrt{x+1}`,
		custom: 'x*sqrt(x+1)',
		f: (x) => x * sqrt(x + 1),
		points: POINTS_POS
	},
	{
		id: 'prod-11',
		family: 'produits',
		latex: R`(x^2+1)e^{2x}`,
		custom: '(x^2+1)e^(2x)',
		f: (x) => (x * x + 1) * exp(2 * x),
		expected: '(2x^2+2x+2)e^{2x}'
	},
	{
		id: 'prod-12',
		family: 'produits',
		latex: R`3x e^{-2x}`,
		custom: '3x*e^(-2x)',
		f: (x) => 3 * x * exp(-2 * x),
		expected: '(3-6x)e^{-2x}'
	},
	{
		id: 'prod-13',
		family: 'produits',
		latex: R`\sin(x)\ln(x)`,
		custom: 'sin(x)*ln(x)',
		f: (x) => sin(x) * log(x),
		points: POINTS_POS
	},
	{
		id: 'prod-14',
		family: 'produits',
		latex: R`x^3 e^{x}`,
		custom: 'x^3*e^x',
		f: (x) => x ** 3 * exp(x),
		expected: '(x^3+3x^2)e^x'
	},
	{
		id: 'prod-15',
		family: 'produits',
		latex: R`(1-x)e^{x}`,
		custom: '(1-x)e^x',
		f: (x) => (1 - x) * exp(x),
		expected: '-xe^x'
	},
	{
		id: 'prod-16',
		family: 'produits',
		latex: R`x\cos(2x)`,
		custom: 'x*cos(2x)',
		f: (x) => x * cos(2 * x),
		expected: R`\cos(2x)-2x\sin(2x)`
	},
	{
		id: 'prod-17',
		family: 'produits',
		latex: R`2x\ln(x)`,
		custom: '2x*ln(x)',
		f: (x) => 2 * x * log(x),
		points: POINTS_POS,
		expected: R`2\ln(x)+2`
	},
	{
		id: 'prod-18',
		family: 'produits',
		latex: R`(x+2)^2(x-1)`,
		custom: '(x+2)^2(x-1)',
		f: (x) => (x + 2) ** 2 * (x - 1)
	},
	{
		id: 'prod-19',
		family: 'produits',
		latex: R`x e^{x}\sin(x)`,
		custom: 'x*e^x*sin(x)',
		f: (x) => x * exp(x) * sin(x)
	},
	{
		id: 'prod-20',
		family: 'produits',
		latex: R`4x(x-3)`,
		custom: '4x(x-3)',
		f: (x) => 4 * x * (x - 3),
		expected: '8x-12'
	},

	// ---------------------------------------------------------------------------
	// Quotients
	// ---------------------------------------------------------------------------
	{
		id: 'quot-01',
		family: 'quotients',
		latex: R`\frac{e^{x}}{x}`,
		custom: 'e^x/x',
		f: (x) => exp(x) / x,
		expected: R`\frac{(x-1)e^x}{x^2}`
	},
	{
		id: 'quot-02',
		family: 'quotients',
		latex: R`\frac{x}{e^{x}}`,
		custom: 'x/e^x',
		f: (x) => x / exp(x),
		expected: R`\frac{1-x}{e^x}`
	},
	{
		id: 'quot-03',
		family: 'quotients',
		latex: R`\frac{\sin(x)}{x}`,
		custom: 'sin(x)/x',
		f: (x) => sin(x) / x,
		expected: R`\frac{x\cos(x)-\sin(x)}{x^2}`
	},
	{
		id: 'quot-04',
		family: 'quotients',
		latex: R`\frac{e^{x}}{e^{x}+1}`,
		custom: 'e^x/(e^x+1)',
		f: (x) => exp(x) / (exp(x) + 1),
		expected: R`\frac{e^x}{(e^x+1)^2}`
	},
	{
		id: 'quot-05',
		family: 'quotients',
		latex: R`\frac{\ln(x)}{x^2}`,
		custom: 'ln(x)/x^2',
		f: (x) => log(x) / (x * x),
		points: POINTS_POS,
		expected: R`\frac{1-2\ln(x)}{x^3}`
	},
	{
		id: 'quot-06',
		family: 'quotients',
		latex: R`\frac{x^2+3}{x-1}`,
		custom: '(x^2+3)/(x-1)',
		f: (x) => (x * x + 3) / (x - 1),
		expected: R`\frac{x^2-2x-3}{(x-1)^2}`
	},
	{
		id: 'quot-07',
		family: 'quotients',
		latex: R`\frac{\cos(x)}{\sin(x)}`,
		custom: 'cos(x)/sin(x)',
		f: (x) => cos(x) / sin(x),
		expected: R`-\frac{1}{\sin^2(x)}`
	},
	{
		id: 'quot-08',
		family: 'quotients',
		latex: R`\frac{2x}{\sqrt{x}}`,
		custom: '2x/sqrt(x)',
		f: (x) => (2 * x) / sqrt(x),
		points: POINTS_POS,
		expected: R`\frac{1}{\sqrt{x}}`
	},
	{
		id: 'quot-09',
		family: 'quotients',
		latex: R`\frac{1}{1+e^{-x}}`,
		custom: '1/(1+e^(-x))',
		f: (x) => 1 / (1 + exp(-x)),
		expected: R`\frac{e^{-x}}{(1+e^{-x})^2}`
	},
	{
		id: 'quot-10',
		family: 'quotients',
		latex: R`\frac{x-1}{x^2}`,
		custom: '(x-1)/x^2',
		f: (x) => (x - 1) / (x * x),
		expected: R`\frac{2-x}{x^3}`
	},
	{
		id: 'quot-11',
		family: 'quotients',
		latex: R`\frac{e^{2x}}{x+1}`,
		custom: 'e^(2x)/(x+1)',
		f: (x) => exp(2 * x) / (x + 1),
		expected: R`\frac{(2x+1)e^{2x}}{(x+1)^2}`
	},
	{
		id: 'quot-12',
		family: 'quotients',
		latex: R`\frac{3}{e^{x}+2}`,
		custom: '3/(e^x+2)',
		f: (x) => 3 / (exp(x) + 2),
		expected: R`-\frac{3e^x}{(e^x+2)^2}`
	},
	{
		id: 'quot-13',
		family: 'quotients',
		latex: R`\frac{x}{\ln(x)}`,
		custom: 'x/ln(x)',
		f: (x) => x / log(x),
		points: [0.3, 0.6, 1.6, 2.1, 3.4, 5.2],
		expected: R`\frac{\ln(x)-1}{\ln^2(x)}`
	},
	{
		id: 'quot-14',
		family: 'quotients',
		latex: R`\frac{\sin(x)}{\cos(x)+2}`,
		custom: 'sin(x)/(cos(x)+2)',
		f: (x) => sin(x) / (cos(x) + 2)
	},
	{
		id: 'quot-15',
		family: 'quotients',
		latex: R`\frac{x^3}{x^2-4}`,
		custom: 'x^3/(x^2-4)',
		f: (x) => x ** 3 / (x * x - 4),
		points: [-3.3, -1.4, -0.65, 0.35, 0.9, 1.5, 2.6]
	},

	// ---------------------------------------------------------------------------
	// Composées profondes
	// ---------------------------------------------------------------------------
	{
		id: 'comp-01',
		family: 'composées',
		latex: R`\sin(e^{x})`,
		custom: 'sin(e^x)',
		f: (x) => sin(exp(x)),
		expected: R`e^x\cos(e^x)`
	},
	{
		id: 'comp-02',
		family: 'composées',
		latex: R`e^{\cos(2x)}`,
		custom: 'e^(cos(2x))',
		f: (x) => exp(cos(2 * x)),
		expected: R`-2\sin(2x)e^{\cos(2x)}`
	},
	{
		id: 'comp-03',
		family: 'composées',
		latex: R`\ln(\sin(x)+2)`,
		custom: 'ln(sin(x)+2)',
		f: (x) => log(sin(x) + 2),
		expected: R`\frac{\cos(x)}{\sin(x)+2}`
	},
	{
		id: 'comp-04',
		family: 'composées',
		latex: R`\sqrt{e^{x}+1}`,
		custom: 'sqrt(e^x+1)',
		f: (x) => sqrt(exp(x) + 1),
		expected: R`\frac{e^x}{2\sqrt{e^x+1}}`
	},
	{
		id: 'comp-05',
		family: 'composées',
		latex: R`\sin^2(2x+1)`,
		custom: 'sin(2x+1)^2',
		f: (x) => sin(2 * x + 1) ** 2,
		expected: R`4\sin(2x+1)\cos(2x+1)`
	},
	{
		id: 'comp-06',
		family: 'composées',
		latex: R`\left(\ln(x)+1\right)^3`,
		custom: '(ln(x)+1)^3',
		f: (x) => (log(x) + 1) ** 3,
		points: POINTS_POS,
		expected: R`\frac{3(\ln(x)+1)^2}{x}`
	},
	{
		id: 'comp-07',
		family: 'composées',
		latex: R`e^{e^{x}}`,
		custom: 'e^(e^x)',
		f: (x) => exp(exp(x)),
		points: [-2.3, -1.4, -0.65, 0.35, 0.9, 1.3],
		expected: R`e^xe^{e^x}`
	},
	{
		id: 'comp-08',
		family: 'composées',
		latex: R`\cos(\sqrt{x})`,
		custom: 'cos(sqrt(x))',
		f: (x) => cos(sqrt(x)),
		points: POINTS_POS,
		expected: R`-\frac{\sin(\sqrt{x})}{2\sqrt{x}}`
	},
	{
		id: 'comp-09',
		family: 'composées',
		latex: R`\ln(\cos(x)+2)`,
		custom: 'ln(cos(x)+2)',
		f: (x) => log(cos(x) + 2),
		expected: R`-\frac{\sin(x)}{\cos(x)+2}`
	},
	{
		id: 'comp-10',
		family: 'composées',
		latex: R`\sqrt{\ln(x)}`,
		custom: 'sqrt(ln(x))',
		f: (x) => sqrt(log(x)),
		points: [1.3, 1.8, 2.1, 3.4, 5.2, 7.7],
		expected: R`\frac{1}{2x\sqrt{\ln(x)}}`
	},
	{
		id: 'comp-11',
		family: 'composées',
		latex: R`(e^{x}-x)^2`,
		custom: '(e^x-x)^2',
		f: (x) => (exp(x) - x) ** 2,
		expected: R`2(e^x-1)(e^x-x)`
	},
	{
		id: 'comp-12',
		family: 'composées',
		latex: R`\arctan(e^{x})`,
		custom: 'arctan(e^x)',
		f: (x) => atan(exp(x)),
		expected: R`\frac{e^x}{1+e^{2x}}`
	},
	{
		id: 'comp-13',
		family: 'composées',
		latex: R`\sin(\cos(x))`,
		custom: 'sin(cos(x))',
		f: (x) => sin(cos(x)),
		expected: R`-\sin(x)\cos(\cos(x))`
	},
	{
		id: 'comp-14',
		family: 'composées',
		latex: R`e^{-\frac{x^2}{2}}`,
		custom: 'e^(-x^2/2)',
		f: (x) => exp((-x * x) / 2),
		expected: R`-xe^{-\frac{x^2}{2}}`
	},
	{
		id: 'comp-15',
		family: 'composées',
		latex: R`\frac{1}{\sqrt{2\pi}}e^{-\frac{x^2}{2}}`,
		custom: R`1/sqrt(2\pi)*e^(-x^2/2)`,
		f: (x) => exp((-x * x) / 2) / sqrt(2 * PI)
	},
	{
		id: 'comp-16',
		family: 'composées',
		latex: R`\ln(x^2+x+1)`,
		custom: 'ln(x^2+x+1)',
		f: (x) => log(x * x + x + 1),
		expected: R`\frac{2x+1}{x^2+x+1}`
	},
	{
		id: 'comp-17',
		family: 'composées',
		latex: R`\left(\frac{x+1}{x-1}\right)^2`,
		custom: '((x+1)/(x-1))^2',
		f: (x) => ((x + 1) / (x - 1)) ** 2
	},
	{
		id: 'comp-18',
		family: 'composées',
		latex: R`\cos^2(e^{x})`,
		custom: 'cos(e^x)^2',
		f: (x) => cos(exp(x)) ** 2,
		points: [-2.3, -1.4, -0.65, 0.35, 0.9, 1.3]
	},
	{
		id: 'comp-19',
		family: 'composées',
		latex: R`\sqrt{1+\sqrt{x}}`,
		custom: 'sqrt(1+sqrt(x))',
		f: (x) => sqrt(1 + sqrt(x)),
		points: POINTS_POS
	},
	{
		id: 'comp-20',
		family: 'composées',
		latex: R`\ln(\ln(\ln(x)))`,
		custom: 'ln(ln(ln(x)))',
		f: (x) => log(log(log(x))),
		points: [3.1, 4.2, 5.5, 7.7, 10.3, 14.9]
	},

	// ---------------------------------------------------------------------------
	// Valeur absolue (hors 0)
	// ---------------------------------------------------------------------------
	{
		id: 'abs-01',
		family: 'valeur absolue',
		latex: R`\left|x\right|`,
		custom: 'abs(x)',
		f: (x) => abs(x)
	},
	{
		id: 'abs-02',
		family: 'valeur absolue',
		latex: R`|x-2|`,
		custom: 'abs(x-2)',
		f: (x) => abs(x - 2),
		points: [-2.3, -1.4, -0.65, 0.35, 2.6, 3.4]
	},
	{
		id: 'abs-03',
		family: 'valeur absolue',
		latex: R`\ln|x|`,
		custom: 'ln(abs(x))',
		f: (x) => log(abs(x)),
		expected: R`\frac{1}{x}`
	},
	{
		id: 'abs-04',
		family: 'valeur absolue',
		latex: R`x|x|`,
		custom: 'x*abs(x)',
		f: (x) => x * abs(x)
	},
	{
		id: 'abs-05',
		family: 'valeur absolue',
		latex: R`|x^2-4|`,
		custom: 'abs(x^2-4)',
		f: (x) => abs(x * x - 4),
		points: [-2.6, -1.4, -0.65, 0.35, 1.3, 2.6]
	},
	{
		id: 'abs-06',
		family: 'valeur absolue',
		latex: R`\sqrt{|x|}`,
		custom: 'sqrt(abs(x))',
		f: (x) => sqrt(abs(x))
	},

	// ---------------------------------------------------------------------------
	// Variable t (`.dériver … ; t`)
	// ---------------------------------------------------------------------------
	{
		id: 't-01',
		family: 'variable t',
		variable: 't',
		latex: 't^2',
		custom: 't^2',
		f: (t) => t * t,
		expected: '2t'
	},
	{
		id: 't-02',
		family: 'variable t',
		variable: 't',
		latex: '-4.9t^2+20t',
		custom: '-4.9t^2+20t',
		f: (t) => -4.9 * t * t + 20 * t,
		expected: '-9.8t+20'
	},
	{
		id: 't-03',
		family: 'variable t',
		variable: 't',
		latex: 'e^{-3t}',
		custom: 'e^(-3t)',
		f: (t) => exp(-3 * t),
		expected: '-3e^{-3t}'
	},
	{
		id: 't-04',
		family: 'variable t',
		variable: 't',
		latex: R`5\cos(2t)`,
		custom: '5cos(2t)',
		f: (t) => 5 * cos(2 * t),
		expected: R`-10\sin(2t)`
	},
	{
		id: 't-05',
		family: 'variable t',
		variable: 't',
		latex: R`\ln(t+1)`,
		custom: 'ln(t+1)',
		f: (t) => log(t + 1),
		points: POINTS_POS,
		expected: R`\frac{1}{t+1}`
	},
	{
		id: 't-06',
		family: 'variable t',
		variable: 't',
		latex: R`\sqrt{t}`,
		custom: 'sqrt(t)',
		f: (t) => sqrt(t),
		points: POINTS_POS,
		expected: R`\frac{1}{2\sqrt{t}}`
	},
	{
		id: 't-07',
		family: 'variable t',
		variable: 't',
		latex: R`t e^{-t}`,
		custom: 't*e^(-t)',
		f: (t) => t * exp(-t),
		expected: '(1-t)e^{-t}'
	},
	{
		id: 't-08',
		family: 'variable t',
		variable: 't',
		latex: R`\frac{1}{t^2+1}`,
		custom: '1/(t^2+1)',
		f: (t) => 1 / (t * t + 1),
		expected: R`-\frac{2t}{(t^2+1)^2}`
	},
	{
		id: 't-09',
		family: 'variable t',
		variable: 't',
		latex: R`\sin^2(t)`,
		custom: 'sin(t)^2',
		f: (t) => sin(t) ** 2,
		expected: R`2\sin(t)\cos(t)`
	},
	{
		id: 't-10',
		family: 'variable t',
		variable: 't',
		latex: R`3t^3-2t+x`,
		custom: '3t^3-2t+x',
		f: (t) => 3 * t ** 3 - 2 * t,
		expected: '9t^2-2'
	},

	// ---------------------------------------------------------------------------
	// Objets de l'atelier — `f(2x)` lu comme un produit
	// ---------------------------------------------------------------------------
	{
		id: 'obj-01',
		family: 'objets de l’atelier',
		setup: ['g(x) = x^2+1'],
		custom: 'g(2x)',
		f: (x) => 4 * x * x + 1,
		expected: '8x'
	},
	{
		id: 'obj-02',
		family: 'objets de l’atelier',
		setup: ['g(x) = sin(x)'],
		custom: 'g(3x)',
		f: (x) => sin(3 * x),
		expected: R`3\cos(3x)`
	},
	{
		id: 'obj-03',
		family: 'objets de l’atelier',
		setup: ['g(x) = e^x'],
		custom: 'g(x^2)',
		f: (x) => exp(x * x),
		expected: '2xe^{x^2}'
	},
	{
		id: 'obj-04',
		family: 'objets de l’atelier',
		setup: ['g(x) = x^3'],
		custom: '2g(x)',
		f: (x) => 2 * x ** 3,
		expected: '6x^2'
	},
	{
		id: 'obj-05',
		family: 'objets de l’atelier',
		setup: ['g(x) = ln(x)'],
		custom: 'g(2x+1)',
		f: (x) => log(2 * x + 1),
		points: POINTS_POS,
		expected: R`\frac{2}{2x+1}`
	},
	{
		id: 'obj-06',
		family: 'objets de l’atelier',
		setup: ['g(x) = x^2', 'h(x) = 3x+1'],
		custom: 'g(h(x))',
		f: (x) => (3 * x + 1) ** 2,
		expected: '6(3x+1)'
	},
	{
		id: 'obj-07',
		family: 'objets de l’atelier',
		setup: ['g(x) = x^2', 'h(x) = 3x+1'],
		custom: 'g(x)h(x)',
		f: (x) => x * x * (3 * x + 1)
	},
	{
		id: 'obj-08',
		family: 'objets de l’atelier',
		setup: ['g(x) = sqrt(x)'],
		custom: 'g(x)+g(4x)',
		f: (x) => 3 * sqrt(x),
		points: POINTS_POS
	},
	{
		id: 'obj-09',
		family: 'objets de l’atelier',
		setup: ['a = 3'],
		custom: 'a x^2',
		f: (x) => 3 * x * x,
		expected: '6x'
	},
	{
		id: 'obj-10',
		family: 'objets de l’atelier',
		setup: ['g(x) = cos(x)'],
		custom: 'g(x)^2',
		f: (x) => cos(x) ** 2,
		expected: R`-2\sin(x)\cos(x)`
	},

	// ---------------------------------------------------------------------------
	// Littérales — dérivées par rapport à x (ou t), PLUSIEURS jeux de paramètres
	// ---------------------------------------------------------------------------
	{
		id: 'lit-01',
		family: 'littérales',
		params: ['a', 'b', 'c'],
		latex: 'ax^2+bx+c',
		custom: 'a*x^2+b*x+c',
		f: (x, p) => p.a * x * x + p.b * x + p.c,
		expected: '2ax+b'
	},
	{
		id: 'lit-02',
		family: 'littérales',
		params: ['a'],
		latex: R`\frac{a}{x}`,
		custom: 'a/x',
		f: (x, p) => p.a / x,
		expected: R`-\frac{a}{x^2}`
	},
	{
		id: 'lit-03',
		family: 'littérales',
		params: ['k'],
		latex: 'e^{kx}',
		custom: 'e^(k*x)',
		f: (x, p) => exp(p.k * x),
		expected: 'ke^{kx}'
	},
	{
		id: 'lit-04',
		family: 'littérales',
		params: ['a', 'k'],
		variable: 't',
		latex: 'ae^{-kt}',
		custom: 'a*e^(-k*t)',
		f: (t, p) => p.a * exp(-p.k * t),
		expected: '-ake^{-kt}'
	},
	{
		id: 'lit-05',
		family: 'littérales',
		params: ['A', 'omega', 'phi'],
		variable: 't',
		latex: R`A\sin(\omega t+\phi)`,
		custom: 'A*sin(ω*t+φ)',
		f: (t, p) => p.A * sin(p.omega * t + p.phi),
		expected: R`A\omega\cos(\omega t+\phi)`
	},
	{
		id: 'lit-06',
		family: 'littérales',
		params: ['A', 'omega'],
		variable: 't',
		latex: R`A\cos(\omega t)`,
		custom: 'A*cos(ω*t)',
		f: (t, p) => p.A * cos(p.omega * t),
		expected: R`-A\omega\sin(\omega t)`
	},
	{
		id: 'lit-07',
		family: 'littérales',
		params: ['a', 'b'],
		latex: R`\ln(ax+b)`,
		custom: 'ln(a*x+b)',
		f: (x, p) => log(p.a * x + p.b),
		points: POINTS_WIDE,
		expected: R`\frac{a}{ax+b}`
	},
	{
		id: 'lit-08',
		family: 'littérales',
		params: ['a', 'b', 'm'],
		latex: '(ax+b)^m',
		custom: '(a*x+b)^m',
		f: (x, p) => (p.a * x + p.b) ** p.m,
		points: POINTS_WIDE,
		expected: 'am(ax+b)^{m-1}'
	},
	{
		id: 'lit-09',
		family: 'littérales',
		params: ['a', 'b'],
		latex: R`\sqrt{ax+b}`,
		custom: 'sqrt(a*x+b)',
		f: (x, p) => sqrt(p.a * x + p.b),
		points: POINTS_WIDE,
		expected: R`\frac{a}{2\sqrt{ax+b}}`
	},
	{
		id: 'lit-10',
		family: 'littérales',
		params: ['a'],
		latex: 'xe^{ax}',
		custom: 'x*e^(a*x)',
		f: (x, p) => x * exp(p.a * x),
		expected: '(1+ax)e^{ax}'
	},
	{
		id: 'lit-11',
		family: 'littérales',
		params: ['a', 'b', 'c', 'd'],
		latex: R`\frac{ax+b}{cx+d}`,
		custom: '(a*x+b)/(c*x+d)',
		f: (x, p) => (p.a * x + p.b) / (p.c * x + p.d),
		points: POINTS_WIDE,
		expected: R`\frac{ad-bc}{(cx+d)^2}`
	},
	{
		id: 'lit-12',
		family: 'littérales',
		params: ['a'],
		paramSets: POSITIVE_SETS,
		latex: 'a^{x}',
		custom: 'a^x',
		f: (x, p) => p.a ** x,
		expected: R`\ln(a)a^x`
	},
	{
		id: 'lit-13',
		family: 'littérales',
		params: ['k'],
		latex: R`k\ln(x)`,
		custom: 'k*ln(x)',
		f: (x, p) => p.k * log(x),
		points: POINTS_POS,
		expected: R`\frac{k}{x}`
	},
	{
		id: 'lit-14',
		family: 'littérales',
		params: ['a', 'b'],
		latex: 'ax+b',
		custom: 'a*x+b',
		f: (x, p) => p.a * x + p.b,
		expected: 'a'
	},
	{
		id: 'lit-15',
		family: 'littérales',
		params: ['a'],
		latex: 'ax^3',
		custom: 'a*x^3',
		f: (x, p) => p.a * x ** 3,
		expected: '3ax^2'
	},
	{
		id: 'lit-16',
		family: 'littérales',
		params: ['a', 'b'],
		latex: R`a\sin(bx)`,
		custom: 'a*sin(b*x)',
		f: (x, p) => p.a * sin(p.b * x),
		expected: R`ab\cos(bx)`
	},
	{
		id: 'lit-17',
		family: 'littérales',
		params: ['a', 'b'],
		latex: R`a\cos(bx)`,
		custom: 'a*cos(b*x)',
		f: (x, p) => p.a * cos(p.b * x),
		expected: R`-ab\sin(bx)`
	},
	{
		id: 'lit-18',
		family: 'littérales',
		params: ['a', 'b'],
		latex: R`\frac{a}{x-b}`,
		custom: 'a/(x-b)',
		f: (x, p) => p.a / (x - p.b),
		points: POINTS_WIDE,
		expected: R`-\frac{a}{(x-b)^2}`
	},
	{
		id: 'lit-19',
		family: 'littérales',
		params: ['a', 'b'],
		latex: 'a(x-b)^2',
		custom: 'a*(x-b)^2',
		f: (x, p) => p.a * (x - p.b) ** 2,
		expected: '2a(x-b)'
	},
	{
		id: 'lit-20',
		family: 'littérales',
		params: ['k'],
		latex: 'x^{k}',
		custom: 'x^k',
		f: (x, p) => x ** p.k,
		points: POINTS_POS,
		expected: 'kx^{k-1}'
	},
	{
		id: 'lit-21',
		family: 'littérales',
		params: ['a', 'b'],
		latex: 'e^{ax+b}',
		custom: 'e^(a*x+b)',
		f: (x, p) => exp(p.a * x + p.b),
		expected: 'ae^{ax+b}'
	},
	{
		id: 'lit-22',
		family: 'littérales',
		params: ['a', 'b'],
		latex: 'ae^{bx}',
		custom: 'a*e^(b*x)',
		f: (x, p) => p.a * exp(p.b * x),
		expected: 'abe^{bx}'
	},
	{
		id: 'lit-23',
		family: 'littérales',
		params: ['k'],
		latex: R`\ln(kx)`,
		custom: 'ln(k*x)',
		f: (x, p) => log(p.k * x),
		paramSets: POSITIVE_SETS,
		points: POINTS_POS,
		expected: R`\frac{1}{x}`
	},
	{
		id: 'lit-24',
		family: 'littérales',
		params: ['a'],
		latex: R`\frac{1}{x^2+a^2}`,
		custom: '1/(x^2+a^2)',
		f: (x, p) => 1 / (x * x + p.a * p.a),
		expected: R`-\frac{2x}{(x^2+a^2)^2}`
	},
	{
		id: 'lit-25',
		family: 'littérales',
		params: ['a'],
		latex: R`\arctan\left(\frac{x}{a}\right)`,
		custom: 'arctan(x/a)',
		f: (x, p) => atan(x / p.a),
		expected: R`\frac{a}{a^2+x^2}`
	},
	{
		id: 'lit-26',
		family: 'littérales',
		params: ['a', 'b'],
		latex: R`\frac{a}{b}x^2`,
		custom: '(a/b)x^2',
		f: (x, p) => (p.a / p.b) * x * x,
		expected: R`\frac{2ax}{b}`
	},
	{
		id: 'lit-27',
		family: 'littérales',
		params: ['a'],
		latex: R`x^2-a^2`,
		custom: 'x^2-a^2',
		f: (x, p) => x * x - p.a * p.a,
		expected: '2x'
	},
	{
		id: 'lit-28',
		family: 'littérales',
		params: ['a', 'b'],
		latex: '(x-a)(x-b)',
		custom: '(x-a)(x-b)',
		f: (x, p) => (x - p.a) * (x - p.b),
		expected: '2x-a-b'
	},
	{
		id: 'lit-29',
		family: 'littérales',
		params: ['k'],
		latex: R`\sin^2(kx)`,
		custom: 'sin(k*x)^2',
		f: (x, p) => sin(p.k * x) ** 2,
		expected: R`2k\sin(kx)\cos(kx)`
	},
	{
		id: 'lit-30',
		family: 'littérales',
		params: ['a', 'k'],
		latex: R`ax e^{-kx}`,
		custom: 'a*x*e^(-k*x)',
		f: (x, p) => p.a * x * exp(-p.k * x),
		expected: R`a(1-kx)e^{-kx}`
	},
	{
		id: 'lit-31',
		family: 'littérales',
		params: ['a', 'k'],
		variable: 't',
		latex: R`a(1-e^{-kt})`,
		custom: 'a*(1-e^(-k*t))',
		f: (t, p) => p.a * (1 - exp(-p.k * t)),
		expected: 'ake^{-kt}'
	},
	{
		id: 'lit-32',
		family: 'littérales',
		params: ['a', 'b', 'c'],
		variable: 't',
		latex: 'at^2+bt+c',
		custom: 'a*t^2+b*t+c',
		f: (t, p) => p.a * t * t + p.b * t + p.c,
		expected: '2at+b'
	},
	{
		id: 'lit-33',
		family: 'littérales',
		params: ['omega'],
		variable: 't',
		latex: R`\cos(\omega t)`,
		custom: 'cos(ω*t)',
		f: (t, p) => cos(p.omega * t),
		expected: R`-\omega\sin(\omega t)`
	},
	{
		id: 'lit-34',
		family: 'littérales',
		params: ['A', 'k', 'omega'],
		variable: 't',
		latex: R`Ae^{-kt}\cos(\omega t)`,
		custom: 'A*e^(-k*t)*cos(ω*t)',
		f: (t, p) => p.A * exp(-p.k * t) * cos(p.omega * t)
	},
	{
		id: 'lit-35',
		family: 'littérales',
		params: ['a'],
		latex: R`\sqrt{a^2-x^2}`,
		custom: 'sqrt(a^2-x^2)',
		f: (x, p) => sqrt(p.a * p.a - x * x),
		points: [-0.35, -0.2, -0.1, 0.05, 0.15, 0.3],
		expected: R`-\frac{x}{\sqrt{a^2-x^2}}`
	},
	{
		id: 'lit-36',
		family: 'littérales',
		params: ['a'],
		latex: R`\frac{x}{x+a}`,
		custom: 'x/(x+a)',
		f: (x, p) => x / (x + p.a),
		points: POINTS_WIDE,
		expected: R`\frac{a}{(x+a)^2}`
	},
	{
		id: 'lit-37',
		family: 'littérales',
		params: ['k'],
		latex: R`\frac{1}{1+e^{-kx}}`,
		custom: '1/(1+e^(-k*x))',
		f: (x, p) => 1 / (1 + exp(-p.k * x)),
		expected: R`\frac{ke^{-kx}}{(1+e^{-kx})^2}`
	},
	{
		id: 'lit-38',
		family: 'littérales',
		params: ['a', 'b'],
		latex: R`\log_a(x)`,
		custom: 'log_a(x)',
		f: (x, p) => log(x) / log(p.a),
		paramSets: POSITIVE_SETS,
		points: POINTS_POS,
		expected: R`\frac{1}{x\ln(a)}`
	},
	{
		id: 'lit-39',
		family: 'littérales',
		params: ['a'],
		latex: R`a^{2x}`,
		custom: 'a^(2x)',
		f: (x, p) => p.a ** (2 * x),
		paramSets: POSITIVE_SETS,
		expected: R`2\ln(a)a^{2x}`
	},
	{
		id: 'lit-40',
		family: 'littérales',
		params: ['k'],
		latex: R`k\sqrt{x}`,
		custom: 'k*sqrt(x)',
		f: (x, p) => p.k * sqrt(x),
		points: POINTS_POS,
		expected: R`\frac{k}{2\sqrt{x}}`
	},
	{
		id: 'lit-41',
		family: 'littérales',
		params: ['a', 'b'],
		latex: R`ax+\frac{b}{x}`,
		custom: 'a*x+b/x',
		f: (x, p) => p.a * x + p.b / x,
		expected: R`a-\frac{b}{x^2}`
	},
	{
		id: 'lit-42',
		family: 'littérales',
		params: ['a', 'b'],
		latex: R`ax\ln(x)+b`,
		custom: 'a*x*ln(x)+b',
		f: (x, p) => p.a * x * log(x) + p.b,
		points: POINTS_POS,
		expected: R`a\ln(x)+a`
	},
	{
		id: 'lit-43',
		family: 'littérales',
		params: ['a', 'b'],
		latex: R`\frac{\ln(x)}{a}+bx`,
		custom: 'ln(x)/a+b*x',
		f: (x, p) => log(x) / p.a + p.b * x,
		points: POINTS_POS,
		expected: R`\frac{1}{ax}+b`
	},
	{
		id: 'lit-44',
		family: 'littérales',
		params: ['m'],
		latex: R`(x^2+1)^m`,
		custom: '(x^2+1)^m',
		f: (x, p) => (x * x + 1) ** p.m,
		expected: R`2mx(x^2+1)^{m-1}`
	},
	{
		id: 'lit-45',
		family: 'littérales',
		params: ['a', 'b'],
		latex: R`e^{ax}\sin(bx)`,
		custom: 'e^(a*x)*sin(b*x)',
		f: (x, p) => exp(p.a * x) * sin(p.b * x)
	},
	{
		id: 'lit-46',
		family: 'littérales',
		params: ['a', 'b'],
		latex: R`\frac{a}{b+e^{-x}}`,
		custom: 'a/(b+e^(-x))',
		f: (x, p) => p.a / (p.b + exp(-x)),
		points: POINTS_WIDE,
		expected: R`\frac{ae^{-x}}{(b+e^{-x})^2}`
	},
	{
		id: 'lit-47',
		family: 'littérales',
		params: ['a', 'b', 'c', 'd'],
		latex: R`ax^3+bx^2+cx+d`,
		custom: 'a*x^3+b*x^2+c*x+d',
		f: (x, p) => p.a * x ** 3 + p.b * x * x + p.c * x + p.d,
		expected: '3ax^2+2bx+c'
	},
	{
		id: 'lit-48',
		family: 'littérales',
		params: ['k'],
		variable: 't',
		latex: 'kt^2',
		custom: 'k*t^2',
		f: (t, p) => p.k * t * t,
		expected: '2kt'
	},
	{
		id: 'lit-49',
		family: 'littérales',
		params: ['a', 'b'],
		variable: 't',
		latex: R`a\ln(bt)`,
		custom: 'a*ln(b*t)',
		f: (t, p) => p.a * log(p.b * t),
		paramSets: POSITIVE_SETS,
		points: POINTS_POS,
		expected: R`\frac{a}{t}`
	},
	{
		id: 'lit-50',
		family: 'littérales',
		params: ['a', 'b'],
		latex: R`\frac{1}{ax+b}`,
		custom: '1/(a*x+b)',
		f: (x, p) => 1 / (p.a * x + p.b),
		points: POINTS_WIDE,
		expected: R`-\frac{a}{(ax+b)^2}`
	},
	{
		id: 'lit-51',
		family: 'littérales',
		params: ['a'],
		latex: R`\tan(ax)`,
		custom: 'tan(a*x)',
		f: (x, p) => tan(p.a * x),
		points: [-0.35, -0.2, -0.1, 0.05, 0.15, 0.3],
		expected: R`\frac{a}{\cos^2(ax)}`
	},
	{
		id: 'lit-52',
		family: 'littérales',
		params: ['a', 'b'],
		latex: R`\cos(ax+b)`,
		custom: 'cos(a*x+b)',
		f: (x, p) => cos(p.a * x + p.b),
		expected: R`-a\sin(ax+b)`
	},
	{
		id: 'lit-53',
		family: 'littérales',
		params: ['k'],
		latex: R`e^{-kx^2}`,
		custom: 'e^(-k*x^2)',
		f: (x, p) => exp(-p.k * x * x),
		points: [-1.4, -0.65, -0.2, 0.35, 0.9, 1.3],
		expected: R`-2kxe^{-kx^2}`
	},
	{
		id: 'lit-54',
		family: 'littérales',
		params: ['a', 'b'],
		latex: R`\frac{ax^2}{b}`,
		custom: 'a*x^2/b',
		f: (x, p) => (p.a * x * x) / p.b,
		expected: R`\frac{2ax}{b}`
	},
	{
		id: 'lit-55',
		family: 'littérales',
		params: ['a'],
		latex: R`(x-a)e^{x}`,
		custom: '(x-a)e^x',
		f: (x, p) => (x - p.a) * exp(x),
		expected: '(x-a+1)e^x'
	},
	{
		id: 'lit-56',
		family: 'littérales',
		params: ['a', 'b'],
		latex: R`x^a+x^b`,
		custom: 'x^a+x^b',
		f: (x, p) => x ** p.a + x ** p.b,
		points: POINTS_POS,
		expected: 'ax^{a-1}+bx^{b-1}'
	},
	{
		id: 'lit-57',
		family: 'littérales',
		params: ['a'],
		latex: R`\sqrt{x^2+a}`,
		custom: 'sqrt(x^2+a)',
		f: (x, p) => sqrt(x * x + p.a),
		paramSets: POSITIVE_SETS,
		expected: R`\frac{x}{\sqrt{x^2+a}}`
	},
	{
		id: 'lit-58',
		family: 'littérales',
		params: ['k'],
		latex: R`\frac{e^{kx}}{k}`,
		custom: 'e^(k*x)/k',
		f: (x, p) => exp(p.k * x) / p.k,
		expected: 'e^{kx}'
	},
	{
		id: 'lit-59',
		family: 'littérales',
		params: ['a', 'b'],
		latex: R`a\ln(x)-bx^2`,
		custom: 'a*ln(x)-b*x^2',
		f: (x, p) => p.a * log(x) - p.b * x * x,
		points: POINTS_POS,
		expected: R`\frac{a}{x}-2bx`
	},
	{
		id: 'lit-60',
		family: 'littérales',
		params: ['a', 'b', 'c'],
		latex: R`\frac{a}{x^2}+\frac{b}{x}+c`,
		custom: 'a/x^2+b/x+c',
		f: (x, p) => p.a / (x * x) + p.b / x + p.c,
		expected: R`-\frac{2a}{x^3}-\frac{b}{x^2}`
	},
	{
		id: 'lit-61',
		family: 'littérales',
		params: ['a', 'b'],
		latex: R`\arctan(ax+b)`,
		custom: 'arctan(a*x+b)',
		f: (x, p) => atan(p.a * x + p.b),
		expected: R`\frac{a}{1+(ax+b)^2}`
	},
	{
		id: 'lit-62',
		family: 'littérales',
		params: ['a'],
		latex: R`\sin(x)\cos(ax)`,
		custom: 'sin(x)*cos(a*x)',
		f: (x, p) => sin(x) * cos(p.a * x)
	}
];
