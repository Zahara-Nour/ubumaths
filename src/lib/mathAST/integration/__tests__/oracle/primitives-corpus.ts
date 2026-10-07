/**
 * Corpus de l'oracle numérique des PRIMITIVES.
 *
 * Chaque entrée est saisie COMME UN ÉLÈVE :
 * - chemin `latex` : ce que rend MathLive, lu par `parseLatex`, puis `integrate` ;
 * - chemin `atelier` : ce que l'élève tape après `.intégrer` dans l'atelier
 *   (`runInput`), avec une référence LaTeX indépendante de l'intégrande (`f`)
 *   pour que l'oracle ne dépende pas du parseur de l'atelier.
 *
 * `expected` : la (ou les) primitive(s) telle(s) qu'on l'ÉCRIT en classe, sans
 * « + C ». Plusieurs écritures de classe sont acceptées quand elles coexistent
 * (`\frac{x^3}{3}` ou `\frac{1}{3}x^3`). Convention du code mesurée le
 * 2026-10-06 : `\ln|u|` PARTOUT, même quand u > 0 (`\ln|x^2+1|`) ; la classe
 * écrit `\ln|x|` pour 1/x, mais `\ln(x^2+1)` quand u > 0 — l'écart est un écart
 * de FORME (`KNOWN_FORM_DIFF`), jamais une erreur de valeur.
 *
 * Les paramètres littéraux (`literal: true`) sont vérifiés pour chacun des
 * jeux de `PARAMETER_SETS` (positifs, négatifs, fractionnaires ; jamais 0 ni 1).
 */

// =============================================================================
// Types
// =============================================================================

export type Family =
	| 'polynome'
	| 'puissance'
	| 'inverse'
	| 'inverse-affine'
	| 'exponentielle'
	| 'u-prime-e-u'
	| 'u-prime-sur-u'
	| 'u-prime-u-n'
	| 'u-prime-sur-racine-u'
	| 'trigonometrie'
	| 'parties'
	| 'rationnelle'
	| 'racine-affine'
	| 'litterale'
	| 'variable-t'
	| 'definie'
	| 'definie-litterale'
	/** Intégrandes hors corpus sondées par la revue de #913 (2026-10-06) */
	| 'revue-913';

export type Path = 'latex' | 'atelier';

/** Une primitive à calculer. */
export interface PrimitiveCase {
	readonly family: Family;
	readonly path: Path;
	/** Ce que tape l'élève (LaTeX, ou notation atelier sans la commande) */
	readonly input: string;
	/** L'intégrande en LaTeX de référence (chemin atelier) ; défaut : `input` */
	readonly f: string;
	/** Variable d'intégration (défaut x) */
	readonly variable: string;
	/** Points de contrôle (ceux où f n'est pas définie sont écartés) */
	readonly points: readonly number[];
	/** Vérifier pour chaque jeu de paramètres */
	readonly literal: boolean;
	/** Écritures de classe acceptées (vide : forme non contrôlée) */
	readonly expected: readonly string[];
}

/** Une intégrale définie. */
export interface DefiniteCase {
	readonly family: 'definie' | 'definie-litterale' | 'revue-913';
	readonly path: Path;
	/** Chemin latex : l'intégrande ; chemin atelier : tout l'argument, bornes comprises */
	readonly input: string;
	/** L'intégrande en LaTeX de référence */
	readonly f: string;
	readonly variable: string;
	/** Bornes en LaTeX (pour la quadrature et le chemin latex) */
	readonly lower: string;
	readonly upper: string;
	/** Valeur exacte attendue, en LaTeX (évaluée numériquement) */
	readonly exact: string;
	readonly literal: boolean;
}

type Row = readonly [input: string, ...expected: string[]];
type AtelierRow = readonly [input: string, f: string, ...expected: string[]];

interface Options {
	readonly variable?: string;
	readonly points?: readonly number[];
	readonly literal?: boolean;
}

// =============================================================================
// Constantes
// =============================================================================

/** Points génériques : deux signes, loin de 0 et de ±1 */
export const DEFAULT_POINTS: readonly number[] = [-2.7, -1.3, -0.45, 0.35, 0.85, 1.65, 2.45, 3.3];

/** Points strictement positifs (ln, puissances fractionnaires) */
const POSITIVE: readonly number[] = [0.3, 0.8, 1.5, 2.4, 3.7, 5.2];

/** ax + b > 0 pour chacun des jeux de `PARAMETER_SETS` (au moins 3 points chacun) */
const AFFINE_POSITIVE: readonly number[] = [-2.7, -1.3, 0.35, 1.65, 3.3, 6.5, 8, 9.5];

/** ]−π/2 ; π/2[ */
const TAN_DOMAIN: readonly number[] = [-1.2, -0.6, 0.2, 0.7, 1.3];

/** ]0 ; π[ */
const SIN_POSITIVE: readonly number[] = [0.3, 0.9, 1.6, 2.2, 2.9];

/**
 * Jeux de valeurs des paramètres littéraux : positifs, négatifs,
 * fractionnaires, jamais 0 ni 1. `n` reste un exposant ≠ −1.
 */
export const PARAMETER_SETS: readonly Readonly<Record<string, number>>[] = [
	{
		a: 2.5,
		b: -1.5,
		c: 0.7,
		k: 1.7,
		m: -2.2,
		n: 3,
		A: 3,
		omega: 2.3,
		phi: 0.4,
		lambda: 0.8,
		w: 2.3
	},
	{
		a: -0.6,
		b: 3.2,
		c: -2,
		k: -0.9,
		m: 0.35,
		n: -3,
		A: -1.5,
		omega: 0.5,
		phi: -1.2,
		lambda: 2.5,
		w: 0.5
	},
	{
		a: 0.4,
		b: -2.2,
		c: 5,
		k: -2.5,
		m: 4,
		n: 0.5,
		A: 0.6,
		omega: -1.7,
		phi: 2.1,
		lambda: -0.3,
		w: -1.7
	}
];

// =============================================================================
// Constructeurs
// =============================================================================

function latex(family: Family, rows: readonly Row[], options: Options = {}): PrimitiveCase[] {
	return rows.map(([input, ...expected]) => ({
		family,
		path: 'latex',
		input,
		f: input,
		variable: options.variable ?? 'x',
		points: options.points ?? DEFAULT_POINTS,
		literal: options.literal ?? false,
		expected
	}));
}

function atelier(
	family: Family,
	rows: readonly AtelierRow[],
	options: Options = {}
): PrimitiveCase[] {
	return rows.map(([input, f, ...expected]) => ({
		family,
		path: 'atelier',
		input,
		f,
		variable: options.variable ?? 'x',
		points: options.points ?? DEFAULT_POINTS,
		literal: options.literal ?? false,
		expected
	}));
}

// =============================================================================
// Primitives — chemin LaTeX
// =============================================================================

const LATEX_CASES: PrimitiveCase[] = [
	// --- Polynômes (coefficients ≠ 1) ---
	...latex('polynome', [
		['3x^2-5x+2', 'x^3-\\frac{5}{2}x^2+2x', 'x^3-\\frac{5x^2}{2}+2x'],
		['-4x^3+x-7', '-x^4+\\frac{1}{2}x^2-7x', '-x^4+\\frac{x^2}{2}-7x'],
		['\\frac{1}{2}x^2+3', '\\frac{1}{6}x^3+3x', '\\frac{x^3}{6}+3x'],
		[
			'2x^5-3x^4+x^2',
			'\\frac{1}{3}x^6-\\frac{3}{5}x^5+\\frac{1}{3}x^3',
			'\\frac{x^6}{3}-\\frac{3x^5}{5}+\\frac{x^3}{3}'
		],
		['7', '7x'],
		['-3', '-3x'],
		['5x', '\\frac{5}{2}x^2', '\\frac{5x^2}{2}'],
		[
			'\\frac{2}{3}x^3-\\frac{1}{4}x',
			'\\frac{1}{6}x^4-\\frac{1}{8}x^2',
			'\\frac{x^4}{6}-\\frac{x^2}{8}'
		],
		['0.5x^2+1.2x', '\\frac{1}{6}x^3+0.6x^2', '\\frac{x^3}{6}+0.6x^2'],
		['(2x+1)(x-3)'],
		['(x+1)^2', '\\frac{(x+1)^3}{3}', '\\frac{1}{3}(x+1)^3'],
		['x(x-2)', '\\frac{1}{3}x^3-x^2', '\\frac{x^3}{3}-x^2'],
		['6x^2-4x+\\frac{1}{3}', '2x^3-2x^2+\\frac{1}{3}x', '2x^3-2x^2+\\frac{x}{3}'],
		['-x^2', '-\\frac{1}{3}x^3', '-\\frac{x^3}{3}'],
		['-\\frac{x^3}{4}', '-\\frac{1}{16}x^4', '-\\frac{x^4}{16}'],
		['\\frac{3x^2+2}{5}', '\\frac{1}{5}x^3+\\frac{2}{5}x', '\\frac{x^3}{5}+\\frac{2x}{5}'],
		['10x^9', 'x^{10}'],
		['x^2+x+1', '\\frac{1}{3}x^3+\\frac{1}{2}x^2+x', '\\frac{x^3}{3}+\\frac{x^2}{2}+x'],
		['4-x', '4x-\\frac{1}{2}x^2', '4x-\\frac{x^2}{2}'],
		['\\sqrt{2}x', '\\frac{\\sqrt{2}}{2}x^2', '\\frac{\\sqrt{2}x^2}{2}'],
		['\\pi x^2', '\\frac{\\pi}{3}x^3', '\\frac{\\pi x^3}{3}'],
		['(3x-1)^3', '\\frac{(3x-1)^4}{12}', '\\frac{1}{12}(3x-1)^4'],
		['(1-2x)^4', '-\\frac{(1-2x)^5}{10}', '-\\frac{1}{10}(1-2x)^5'],
		['2(x+5)^2', '\\frac{2}{3}(x+5)^3', '\\frac{2(x+5)^3}{3}'],
		['x^3-3x', '\\frac{1}{4}x^4-\\frac{3}{2}x^2', '\\frac{x^4}{4}-\\frac{3x^2}{2}']
	]),

	// --- x^n : n négatif ---
	...latex('puissance', [
		['x^{-2}', '-\\frac{1}{x}'],
		['\\frac{1}{x^2}', '-\\frac{1}{x}'],
		['\\frac{3}{x^3}', '-\\frac{3}{2x^2}'],
		['\\frac{-2}{x^4}', '\\frac{2}{3x^3}'],
		['\\frac{1}{x^5}', '-\\frac{1}{4x^4}'],
		['4x^{-3}', '-\\frac{2}{x^2}', '-2x^{-2}'],
		['\\frac{2}{x^2}+3x', '-\\frac{2}{x}+\\frac{3}{2}x^2', '-\\frac{2}{x}+\\frac{3x^2}{2}'],
		['\\frac{1}{3x^2}', '-\\frac{1}{3x}'],
		['\\frac{x^2+1}{x^2}', 'x-\\frac{1}{x}'],
		['x^{-1}', '\\ln|x|']
	]),
	// --- x^n : n fractionnaire (x > 0) ---
	...latex(
		'puissance',
		[
			['x^{\\frac{1}{2}}', '\\frac{2}{3}x^{\\frac{3}{2}}', '\\frac{2}{3}x\\sqrt{x}'],
			['\\sqrt{x}', '\\frac{2}{3}x^{\\frac{3}{2}}', '\\frac{2}{3}x\\sqrt{x}'],
			['x^{\\frac{3}{2}}', '\\frac{2}{5}x^{\\frac{5}{2}}'],
			['\\frac{1}{\\sqrt{x}}', '2\\sqrt{x}'],
			['x^{-\\frac{1}{2}}', '2\\sqrt{x}', '2x^{\\frac{1}{2}}'],
			['5\\sqrt{x}', '\\frac{10}{3}x^{\\frac{3}{2}}', '\\frac{10}{3}x\\sqrt{x}'],
			['x\\sqrt{x}', '\\frac{2}{5}x^{\\frac{5}{2}}', '\\frac{2}{5}x^2\\sqrt{x}'],
			['x^{\\frac{2}{3}}', '\\frac{3}{5}x^{\\frac{5}{3}}'],
			['x^{0.5}', '\\frac{2}{3}x^{1.5}', '\\frac{2}{3}x^{\\frac{3}{2}}']
		],
		{ points: POSITIVE }
	),

	// --- ⁿ√x, n impair : définie sur ℝ (2026-10-07), primitive écrite en racines ---
	...latex('puissance', [
		['\\sqrt[3]{x}', '\\frac{3}{4}x\\sqrt[3]{x}'],
		['x\\sqrt[3]{x}', '\\frac{3}{7}x^2\\sqrt[3]{x}'],
		['\\frac{1}{\\sqrt[3]{x^2}}', '3\\sqrt[3]{x}']
	]),

	// --- 1/x ---
	...latex('inverse', [
		['\\frac{1}{x}', '\\ln|x|'],
		['\\frac{3}{x}', '3\\ln|x|'],
		['\\frac{-2}{x}', '-2\\ln|x|'],
		['\\frac{1}{2x}', '\\frac{1}{2}\\ln|x|', '\\frac{\\ln|x|}{2}'],
		['\\frac{5}{3x}', '\\frac{5}{3}\\ln|x|', '\\frac{5\\ln|x|}{3}'],
		['\\frac{1}{x}+x', '\\ln|x|+\\frac{1}{2}x^2', '\\ln|x|+\\frac{x^2}{2}'],
		['2-\\frac{4}{x}', '2x-4\\ln|x|'],
		['\\frac{x+1}{x}', 'x+\\ln|x|'],
		['\\frac{x^2-3}{x}', '\\frac{1}{2}x^2-3\\ln|x|', '\\frac{x^2}{2}-3\\ln|x|'],
		['\\frac{1}{x}-\\frac{1}{x^2}', '\\ln|x|+\\frac{1}{x}'],
		['\\frac{2x+1}{x}', '2x+\\ln|x|']
	]),

	// --- 1/(ax+b) et 1/(ax+b)^n ---
	...latex('inverse-affine', [
		['\\frac{1}{x+1}', '\\ln|x+1|'],
		['\\frac{1}{2x+3}', '\\frac{1}{2}\\ln|2x+3|', '\\frac{\\ln|2x+3|}{2}'],
		['\\frac{1}{3x-1}', '\\frac{1}{3}\\ln|3x-1|', '\\frac{\\ln|3x-1|}{3}'],
		['\\frac{5}{2x-4}', '\\frac{5}{2}\\ln|2x-4|', '\\frac{5}{2}\\ln|x-2|'],
		['\\frac{1}{1-x}', '-\\ln|1-x|'],
		['\\frac{-3}{4-2x}', '\\frac{3}{2}\\ln|4-2x|'],
		['\\frac{2}{5x+1}', '\\frac{2}{5}\\ln|5x+1|'],
		['\\frac{1}{(x+1)^2}', '-\\frac{1}{x+1}'],
		['\\frac{3}{(2x-1)^2}', '-\\frac{3}{2(2x-1)}'],
		['\\frac{1}{(3x+2)^3}', '-\\frac{1}{6(3x+2)^2}'],
		['(x+2)^{-1}', '\\ln|x+2|'],
		['\\frac{4}{x-2}', '4\\ln|x-2|'],
		['\\frac{1}{\\frac{1}{2}x+1}', '2\\ln|\\frac{1}{2}x+1|'],
		['\\frac{7}{3-x}', '-7\\ln|3-x|']
	]),

	// --- Exponentielles e^{ax+b} ---
	...latex('exponentielle', [
		['e^x', 'e^x'],
		['3e^x', '3e^x'],
		['e^{2x}', '\\frac{1}{2}e^{2x}', '\\frac{e^{2x}}{2}'],
		['e^{-x}', '-e^{-x}'],
		['e^{3x+1}', '\\frac{1}{3}e^{3x+1}', '\\frac{e^{3x+1}}{3}'],
		['5e^{-2x+1}', '-\\frac{5}{2}e^{-2x+1}'],
		['e^{\\frac{x}{2}}', '2e^{\\frac{x}{2}}'],
		['e^{0.5x}', '2e^{0.5x}'],
		['-4e^{-3x}', '\\frac{4}{3}e^{-3x}'],
		['e^{1-x}', '-e^{1-x}'],
		['\\exp(2x)', '\\frac{1}{2}\\exp(2x)', '\\frac{1}{2}e^{2x}'],
		['e^x+x', 'e^x+\\frac{1}{2}x^2', 'e^x+\\frac{x^2}{2}'],
		['2e^{x}-3x^2', '2e^x-x^3'],
		['e^{x}+e^{-x}', 'e^x-e^{-x}'],
		['\\frac{e^{x}-e^{-x}}{2}', '\\frac{e^x+e^{-x}}{2}'],
		['e^{2x}+1', '\\frac{1}{2}e^{2x}+x', '\\frac{e^{2x}}{2}+x'],
		['\\frac{1}{e^{x}}', '-e^{-x}', '-\\frac{1}{e^x}'],
		['e^{x+2}', 'e^{x+2}'],
		['2^x', '\\frac{2^x}{\\ln(2)}'],
		['\\mathrm{e}^{2x}', '\\frac{1}{2}e^{2x}', '\\frac{e^{2x}}{2}']
	]),
	// --- La touche « e » de MathLive : `\exponentialE` (constante d'Euler) ---
	...latex('exponentielle', [
		['\\exponentialE^{x}', 'e^x'],
		['\\exponentialE^{2x}', '\\frac{1}{2}e^{2x}', '\\frac{e^{2x}}{2}'],
		['3\\exponentialE^{-x}', '-3e^{-x}'],
		['\\exponentialE^{3x+1}', '\\frac{1}{3}e^{3x+1}', '\\frac{e^{3x+1}}{3}'],
		['2x\\exponentialE^{x^2}', 'e^{x^2}'],
		['x\\exponentialE^{x}', '(x-1)e^x', 'xe^x-e^x']
	]),

	// --- u′e^u ---
	...latex('u-prime-e-u', [
		['2xe^{x^2}', 'e^{x^2}'],
		['xe^{x^2}', '\\frac{1}{2}e^{x^2}', '\\frac{e^{x^2}}{2}'],
		['-2xe^{-x^2}', 'e^{-x^2}'],
		['3x^2e^{x^3}', 'e^{x^3}'],
		['x^2e^{x^3}', '\\frac{1}{3}e^{x^3}', '\\frac{e^{x^3}}{3}'],
		['(2x+1)e^{x^2+x}', 'e^{x^2+x}'],
		['\\cos(x)e^{\\sin(x)}', 'e^{\\sin(x)}'],
		['-\\sin(x)e^{\\cos(x)}', 'e^{\\cos(x)}'],
		['e^{x}e^{e^{x}}', 'e^{e^x}'],
		['xe^{-x^2}', '-\\frac{1}{2}e^{-x^2}', '-\\frac{e^{-x^2}}{2}'],
		['(x-1)e^{x^2-2x}', '\\frac{1}{2}e^{x^2-2x}', '\\frac{e^{x^2-2x}}{2}']
	]),
	...latex('u-prime-e-u', [['\\frac{e^{\\sqrt{x}}}{\\sqrt{x}}', '2e^{\\sqrt{x}}']], {
		points: POSITIVE
	}),
	...latex('u-prime-e-u', [['\\frac{e^{\\frac{1}{x}}}{x^2}', '-e^{\\frac{1}{x}}']]),

	// --- u′/u ---
	...latex('u-prime-sur-u', [
		['\\frac{2x}{x^2+1}', '\\ln(x^2+1)'],
		['\\frac{x}{x^2+1}', '\\frac{1}{2}\\ln(x^2+1)', '\\frac{\\ln(x^2+1)}{2}'],
		['\\frac{2x+1}{x^2+x+1}', '\\ln(x^2+x+1)'],
		['\\frac{3x^2}{x^3+2}', '\\ln|x^3+2|'],
		['\\frac{e^{x}}{e^{x}+1}', '\\ln(e^x+1)'],
		['\\frac{2x-3}{x^2-3x+5}', '\\ln(x^2-3x+5)'],
		['\\frac{4x}{x^2+1}', '2\\ln(x^2+1)'],
		['\\frac{e^{2x}}{e^{2x}+3}', '\\frac{1}{2}\\ln(e^{2x}+3)', '\\frac{\\ln(e^{2x}+3)}{2}'],
		['\\frac{x^2}{x^3+1}', '\\frac{1}{3}\\ln|x^3+1|', '\\frac{\\ln|x^3+1|}{3}']
	]),
	...latex(
		'u-prime-sur-u',
		[
			['\\frac{\\cos(x)}{\\sin(x)}', '\\ln(\\sin(x))', '\\ln|\\sin(x)|'],
			['\\frac{1}{\\tan(x)}', '\\ln(\\sin(x))', '\\ln|\\sin(x)|']
		],
		{ points: SIN_POSITIVE }
	),
	...latex(
		'u-prime-sur-u',
		[
			['\\tan(x)', '-\\ln(\\cos(x))', '-\\ln|\\cos(x)|'],
			['\\frac{-\\sin(x)}{\\cos(x)}', '\\ln(\\cos(x))', '\\ln|\\cos(x)|']
		],
		{ points: TAN_DOMAIN }
	),
	...latex('u-prime-sur-u', [['\\frac{1}{x\\ln(x)}', '\\ln|\\ln(x)|']], {
		points: [0.3, 0.6, 1.5, 2.4, 3.7]
	}),

	// --- u′uⁿ ---
	...latex('u-prime-u-n', [
		['2x(x^2+1)^3', '\\frac{(x^2+1)^4}{4}', '\\frac{1}{4}(x^2+1)^4'],
		['x(x^2+1)^2', '\\frac{(x^2+1)^3}{6}', '\\frac{1}{6}(x^2+1)^3'],
		['(2x+1)(x^2+x)^4', '\\frac{(x^2+x)^5}{5}', '\\frac{1}{5}(x^2+x)^5'],
		['\\sin^2(x)\\cos(x)', '\\frac{\\sin^3(x)}{3}', '\\frac{1}{3}\\sin^3(x)'],
		['\\sin(x)\\cos(x)', '\\frac{\\sin^2(x)}{2}', '\\frac{1}{2}\\sin^2(x)'],
		['3x^2(x^3-1)^5', '\\frac{(x^3-1)^6}{6}', '\\frac{1}{6}(x^3-1)^6'],
		['\\frac{2x}{(x^2+1)^2}', '-\\frac{1}{x^2+1}'],
		['\\frac{x}{(x^2+4)^3}', '-\\frac{1}{4(x^2+4)^2}'],
		['e^{x}(e^{x}+1)^2', '\\frac{(e^x+1)^3}{3}', '\\frac{1}{3}(e^x+1)^3'],
		['\\cos(x)\\sin^{3}(x)', '\\frac{\\sin^4(x)}{4}', '\\frac{1}{4}\\sin^4(x)'],
		['-\\sin(x)\\cos^2(x)', '\\frac{\\cos^3(x)}{3}', '\\frac{1}{3}\\cos^3(x)'],
		['x\\sqrt{x^2+1}', '\\frac{1}{3}(x^2+1)^{\\frac{3}{2}}', '\\frac{1}{3}(x^2+1)\\sqrt{x^2+1}']
	]),
	...latex(
		'u-prime-u-n',
		[
			[
				'\\frac{\\ln(x)}{x}',
				'\\frac{(\\ln(x))^2}{2}',
				'\\frac{1}{2}\\ln^2(x)',
				'\\frac{1}{2}(\\ln(x))^2'
			],
			[
				'\\frac{(\\ln(x))^2}{x}',
				'\\frac{(\\ln(x))^3}{3}',
				'\\frac{1}{3}\\ln^3(x)',
				'\\frac{1}{3}(\\ln(x))^3'
			],
			[
				'\\frac{1}{x}\\ln(x)',
				'\\frac{(\\ln(x))^2}{2}',
				'\\frac{1}{2}\\ln^2(x)',
				'\\frac{1}{2}(\\ln(x))^2'
			]
		],
		{ points: POSITIVE }
	),

	// --- u′/√u ---
	...latex('u-prime-sur-racine-u', [
		['\\frac{2x}{\\sqrt{x^2+1}}', '2\\sqrt{x^2+1}'],
		['\\frac{x}{\\sqrt{x^2+1}}', '\\sqrt{x^2+1}'],
		['\\frac{1}{\\sqrt{x+3}}', '2\\sqrt{x+3}'],
		['\\frac{3}{\\sqrt{3x+9}}', '2\\sqrt{3x+9}'],
		['\\frac{2x+1}{\\sqrt{x^2+x+1}}', '2\\sqrt{x^2+x+1}'],
		['\\frac{e^{x}}{\\sqrt{e^{x}+1}}', '2\\sqrt{e^x+1}'],
		['\\frac{1}{\\sqrt{1-x}}', '-2\\sqrt{1-x}'],
		['\\frac{1}{\\sqrt{2x-1}}', '\\sqrt{2x-1}']
	]),
	...latex('u-prime-sur-racine-u', [['\\frac{x}{\\sqrt{4-x^2}}', '-\\sqrt{4-x^2}']], {
		points: [-1.7, -0.9, 0.3, 1.1, 1.8]
	}),
	...latex('u-prime-sur-racine-u', [['\\frac{\\cos(x)}{\\sqrt{\\sin(x)}}', '2\\sqrt{\\sin(x)}']], {
		points: SIN_POSITIVE
	}),

	// --- Trigonométrie ---
	...latex('trigonometrie', [
		['\\sin(x)', '-\\cos(x)'],
		['\\cos(x)', '\\sin(x)'],
		['3\\cos(x)', '3\\sin(x)'],
		['\\sin(2x)', '-\\frac{1}{2}\\cos(2x)', '-\\frac{\\cos(2x)}{2}'],
		['\\cos(3x)', '\\frac{1}{3}\\sin(3x)', '\\frac{\\sin(3x)}{3}'],
		['\\sin(2x+1)', '-\\frac{1}{2}\\cos(2x+1)', '-\\frac{\\cos(2x+1)}{2}'],
		['\\cos(\\pi x)', '\\frac{1}{\\pi}\\sin(\\pi x)', '\\frac{\\sin(\\pi x)}{\\pi}'],
		['-2\\sin(4x-1)', '\\frac{1}{2}\\cos(4x-1)', '\\frac{\\cos(4x-1)}{2}'],
		['\\cos(\\frac{x}{2})', '2\\sin(\\frac{x}{2})'],
		['\\sin(-x)', '\\cos(-x)', '\\cos(x)'],
		['5\\cos(2x)-\\sin(x)', '\\frac{5}{2}\\sin(2x)+\\cos(x)'],
		['\\sin(x)+\\cos(x)', '-\\cos(x)+\\sin(x)'],
		['\\sin^2(x)', '\\frac{x}{2}-\\frac{\\sin(2x)}{4}'],
		['\\cos^2(x)', '\\frac{x}{2}+\\frac{\\sin(2x)}{4}'],
		['\\cos(3-2x)', '-\\frac{1}{2}\\sin(3-2x)', '-\\frac{\\sin(3-2x)}{2}'],
		['\\cos(x)-x', '\\sin(x)-\\frac{1}{2}x^2', '\\sin(x)-\\frac{x^2}{2}'],
		['x+\\sin(x)', '\\frac{1}{2}x^2-\\cos(x)', '\\frac{x^2}{2}-\\cos(x)']
	]),
	...latex(
		'trigonometrie',
		[
			['\\frac{1}{\\cos^2(x)}', '\\tan(x)'],
			['1+\\tan^2(x)', '\\tan(x)']
		],
		{ points: TAN_DOMAIN }
	),

	// --- Intégration par parties ---
	...latex('parties', [
		['xe^{x}', '(x-1)e^x', 'xe^x-e^x'],
		['xe^{-x}', '-(x+1)e^{-x}', '-xe^{-x}-e^{-x}'],
		['xe^{2x}', '\\frac{1}{2}xe^{2x}-\\frac{1}{4}e^{2x}', '(\\frac{x}{2}-\\frac{1}{4})e^{2x}'],
		['x^2e^{x}', '(x^2-2x+2)e^x'],
		['x\\cos(x)', 'x\\sin(x)+\\cos(x)'],
		['x\\sin(x)', '-x\\cos(x)+\\sin(x)', '\\sin(x)-x\\cos(x)'],
		['(x+1)e^{x}', 'xe^x'],
		['e^{x}\\sin(x)', '\\frac{1}{2}e^x(\\sin(x)-\\cos(x))'],
		['(2x-1)e^{x}', '(2x-3)e^x']
	]),
	...latex(
		'parties',
		[
			[
				'x\\ln(x)',
				'\\frac{1}{2}x^2\\ln(x)-\\frac{1}{4}x^2',
				'\\frac{x^2}{2}\\ln(x)-\\frac{x^2}{4}'
			],
			['\\ln(x)', 'x\\ln(x)-x'],
			[
				'x^2\\ln(x)',
				'\\frac{1}{3}x^3\\ln(x)-\\frac{1}{9}x^3',
				'\\frac{x^3}{3}\\ln(x)-\\frac{x^3}{9}'
			],
			['\\ln(2x)', 'x\\ln(2x)-x']
		],
		{ points: POSITIVE }
	),

	// --- Fractions rationnelles ---
	...latex('rationnelle', [
		[
			'\\frac{1}{x^2-1}',
			'\\frac{1}{2}\\ln|\\frac{x-1}{x+1}|',
			'\\frac{1}{2}\\ln|x-1|-\\frac{1}{2}\\ln|x+1|'
		],
		['\\frac{1}{x(x+1)}', '\\ln|x|-\\ln|x+1|', '\\ln|\\frac{x}{x+1}|'],
		['\\frac{x+1}{x-1}', 'x+2\\ln|x-1|'],
		['\\frac{x^2}{x+1}', '\\frac{1}{2}x^2-x+\\ln|x+1|', '\\frac{x^2}{2}-x+\\ln|x+1|'],
		['\\frac{2x+3}{x+1}', '2x+\\ln|x+1|'],
		['\\frac{1}{x^2+1}', '\\arctan(x)'],
		['\\frac{3}{x^2+4}', '\\frac{3}{2}\\arctan(\\frac{x}{2})'],
		['\\frac{x}{x+2}', 'x-2\\ln|x+2|'],
		['\\frac{1}{(x-1)(x-2)}', '\\ln|x-2|-\\ln|x-1|', '\\ln|\\frac{x-2}{x-1}|'],
		['\\frac{x^3+1}{x}', '\\frac{1}{3}x^3+\\ln|x|', '\\frac{x^3}{3}+\\ln|x|'],
		['\\frac{1}{x^2+2x+2}', '\\arctan(x+1)'],
		['\\frac{2}{1-x^2}', '\\ln|\\frac{1+x}{1-x}|', '\\ln|1+x|-\\ln|1-x|']
	]),

	// --- √(ax+b) ---
	...latex('racine-affine', [
		['\\sqrt{x+3}', '\\frac{2}{3}(x+3)^{\\frac{3}{2}}', '\\frac{2}{3}(x+3)\\sqrt{x+3}'],
		['\\sqrt{2x+3}', '\\frac{1}{3}(2x+3)^{\\frac{3}{2}}', '\\frac{1}{3}(2x+3)\\sqrt{2x+3}'],
		['3\\sqrt{4x+12}', '\\frac{1}{2}(4x+12)^{\\frac{3}{2}}', '\\frac{1}{2}(4x+12)\\sqrt{4x+12}'],
		['\\sqrt{4-x}', '-\\frac{2}{3}(4-x)^{\\frac{3}{2}}', '-\\frac{2}{3}(4-x)\\sqrt{4-x}'],
		['(2x+6)^{\\frac{1}{2}}', '\\frac{1}{3}(2x+6)^{\\frac{3}{2}}'],
		['(3x+9)^{\\frac{3}{2}}', '\\frac{2}{15}(3x+9)^{\\frac{5}{2}}'],
		// ∛ définie sur ℝ (2026-10-07) : (2x+1)^{4/3} ne l'est que pour 2x + 1 ≥ 0
		['\\sqrt[3]{2x+1}', '\\frac{3}{8}(2x+1)\\sqrt[3]{2x+1}'],
		['\\sqrt[5]{2x-1}', '\\frac{5}{12}(2x-1)\\sqrt[5]{2x-1}']
	]),
	...latex(
		'racine-affine',
		[
			['\\frac{1}{\\sqrt{x}}+\\sqrt{x}', '2\\sqrt{x}+\\frac{2}{3}x^{\\frac{3}{2}}'],
			['\\sqrt{x}(x+1)', '\\frac{2}{5}x^{\\frac{5}{2}}+\\frac{2}{3}x^{\\frac{3}{2}}']
		],
		{ points: POSITIVE }
	),

	// --- Variable t ---
	...latex(
		'variable-t',
		[
			['3t^2-1', 't^3-t'],
			['e^{-2t}', '-\\frac{1}{2}e^{-2t}', '-\\frac{e^{-2t}}{2}'],
			['\\frac{1}{t}', '\\ln|t|'],
			['te^{t^2}', '\\frac{1}{2}e^{t^2}', '\\frac{e^{t^2}}{2}'],
			['\\frac{2t}{t^2+1}', '\\ln(t^2+1)'],
			['100e^{-0.05t}', '-2000e^{-0.05t}'],
			['5-9.8t', '5t-4.9t^2'],
			['\\sin(3t)', '-\\frac{1}{3}\\cos(3t)', '-\\frac{\\cos(3t)}{3}'],
			['\\frac{1}{1+t}', '\\ln|1+t|'],
			['xt^2', '\\frac{1}{3}xt^3', '\\frac{xt^3}{3}']
		],
		{ variable: 't' }
	),
	...latex(
		'variable-t',
		[['\\sqrt{t}', '\\frac{2}{3}t^{\\frac{3}{2}}', '\\frac{2}{3}t\\sqrt{t}']],
		{
			variable: 't',
			points: POSITIVE
		}
	)
];

// =============================================================================
// Primitives littérales (plusieurs jeux de paramètres)
// =============================================================================

const LITERAL_CASES: PrimitiveCase[] = [
	...latex(
		'litterale',
		[
			['ax^2+bx+c', '\\frac{a}{3}x^3+\\frac{b}{2}x^2+cx', '\\frac{ax^3}{3}+\\frac{bx^2}{2}+cx'],
			['ax+b', '\\frac{a}{2}x^2+bx', '\\frac{ax^2}{2}+bx'],
			['\\frac{a}{x}', 'a\\ln|x|'],
			['e^{kx}', '\\frac{1}{k}e^{kx}', '\\frac{e^{kx}}{k}'],
			['ke^{kx}', 'e^{kx}'],
			['ae^{x}+b', 'ae^x+bx'],
			['\\frac{1}{ax+b}', '\\frac{1}{a}\\ln|ax+b|', '\\frac{\\ln|ax+b|}{a}'],
			['\\frac{a}{ax+b}', '\\ln|ax+b|'],
			['\\frac{1}{(ax+b)^2}', '-\\frac{1}{a(ax+b)}'],
			['(ax+b)^3', '\\frac{(ax+b)^4}{4a}'],
			['kx^n', '\\frac{k}{n+1}x^{n+1}', '\\frac{kx^{n+1}}{n+1}'],
			['ax^3', '\\frac{a}{4}x^4', '\\frac{ax^4}{4}'],
			['mx^3+c', '\\frac{m}{4}x^4+cx', '\\frac{mx^4}{4}+cx'],
			['\\cos(ax)', '\\frac{1}{a}\\sin(ax)', '\\frac{\\sin(ax)}{a}'],
			['\\sin(kx+b)', '-\\frac{1}{k}\\cos(kx+b)', '-\\frac{\\cos(kx+b)}{k}'],
			['A\\cos(\\omega x)', '\\frac{A}{\\omega}\\sin(\\omega x)'],
			['\\lambda e^{-\\lambda x}', '-e^{-\\lambda x}'],
			['e^{ax+b}', '\\frac{1}{a}e^{ax+b}', '\\frac{e^{ax+b}}{a}'],
			['ae^{-kx}', '-\\frac{a}{k}e^{-kx}'],
			['\\frac{2ax}{ax^2+c}', '\\ln|ax^2+c|'],
			['\\frac{2x+a}{x^2+ax+c}', '\\ln|x^2+ax+c|'],
			['\\frac{k}{x^2}', '-\\frac{k}{x}'],
			['ax^2+\\frac{b}{x}', '\\frac{a}{3}x^3+b\\ln|x|', '\\frac{ax^3}{3}+b\\ln|x|'],
			['a\\sin(x)+b\\cos(x)', '-a\\cos(x)+b\\sin(x)'],
			['(x-a)(x-b)', '\\frac{1}{3}x^3-\\frac{a+b}{2}x^2+abx'],
			['axe^{x^2}', '\\frac{a}{2}e^{x^2}'],
			['\\frac{a}{x-b}', 'a\\ln|x-b|'],
			['a^2x', '\\frac{a^2}{2}x^2', '\\frac{a^2x^2}{2}'],
			['\\frac{x}{a}', '\\frac{x^2}{2a}', '\\frac{1}{2a}x^2'],
			['\\frac{1}{a}e^{\\frac{x}{a}}', 'e^{\\frac{x}{a}}'],
			['b^x', '\\frac{b^x}{\\ln(b)}']
		],
		{ literal: true }
	),
	// ax + b > 0 exigé (√, exposant n = 0,5) : points pour chacun des trois jeux
	...latex('litterale', [['(ax+b)^n', '\\frac{(ax+b)^{n+1}}{a(n+1)}']], {
		literal: true,
		points: AFFINE_POSITIVE
	}),
	// paramètres + racines / ln : x > 0
	...latex(
		'litterale',
		[
			['\\frac{a}{\\sqrt{x}}', '2a\\sqrt{x}'],
			['a\\sqrt{x}', '\\frac{2a}{3}x^{\\frac{3}{2}}', '\\frac{2}{3}ax\\sqrt{x}'],
			['a\\ln(x)', 'a(x\\ln(x)-x)', 'ax\\ln(x)-ax'],
			['x^{a}', '\\frac{x^{a+1}}{a+1}']
		],
		{ literal: true, points: POSITIVE }
	),
	// paramètres en t
	...latex(
		'litterale',
		[
			['ae^{-kt}', '-\\frac{a}{k}e^{-kt}'],
			['\\sin(\\omega t+\\phi)', '-\\frac{1}{\\omega}\\cos(\\omega t+\\phi)'],
			['A\\cos(\\omega t)', '\\frac{A}{\\omega}\\sin(\\omega t)'],
			['at+b', '\\frac{a}{2}t^2+bt', '\\frac{at^2}{2}+bt'],
			['\\frac{k}{t}', 'k\\ln|t|'],
			['Ae^{\\lambda t}', '\\frac{A}{\\lambda}e^{\\lambda t}']
		],
		{ literal: true, variable: 't' }
	)
];

// =============================================================================
// Primitives — chemin atelier (`.intégrer …`)
// =============================================================================

const ATELIER_CASES: PrimitiveCase[] = [
	...atelier('polynome', [
		['x^2', 'x^2', '\\frac{x^3}{3}', '\\frac{1}{3}x^3'],
		['3x^2-5x+2', '3x^2-5x+2', 'x^3-\\frac{5}{2}x^2+2x', 'x^3-\\frac{5x^2}{2}+2x'],
		[
			'x^3-3x+1',
			'x^3-3x+1',
			'\\frac{1}{4}x^4-\\frac{3}{2}x^2+x',
			'\\frac{x^4}{4}-\\frac{3x^2}{2}+x'
		],
		['0.5x^2', '0.5x^2', '\\frac{1}{6}x^3', '\\frac{x^3}{6}'],
		['x^2/3', '\\frac{x^2}{3}', '\\frac{1}{9}x^3', '\\frac{x^3}{9}'],
		['(3x-1)^3', '(3x-1)^3', '\\frac{(3x-1)^4}{12}', '\\frac{1}{12}(3x-1)^4'],
		['-4x^3+2', '-4x^3+2', '-x^4+2x']
	]),
	...atelier('puissance', [
		['x^(-2)', 'x^{-2}', '-\\frac{1}{x}'],
		['1/x^2', '\\frac{1}{x^2}', '-\\frac{1}{x}'],
		['3/x^4', '\\frac{3}{x^4}', '-\\frac{1}{x^3}']
	]),
	...atelier(
		'puissance',
		[
			['sqrt(x)', '\\sqrt{x}', '\\frac{2}{3}x^{\\frac{3}{2}}', '\\frac{2}{3}x\\sqrt{x}'],
			['1/sqrt(x)', '\\frac{1}{\\sqrt{x}}', '2\\sqrt{x}'],
			['x^(1/2)', 'x^{\\frac{1}{2}}', '\\frac{2}{3}x^{\\frac{3}{2}}']
		],
		{ points: POSITIVE }
	),
	...atelier('inverse', [
		['1/x', '\\frac{1}{x}', '\\ln|x|'],
		['3/x', '\\frac{3}{x}', '3\\ln|x|'],
		['(x^2+1)/x', '\\frac{x^2+1}{x}', '\\frac{x^2}{2}+\\ln|x|', '\\frac{1}{2}x^2+\\ln|x|']
	]),
	...atelier('inverse-affine', [
		['1/(2x+3)', '\\frac{1}{2x+3}', '\\frac{1}{2}\\ln|2x+3|', '\\frac{\\ln|2x+3|}{2}'],
		['1/(x+1)^2', '\\frac{1}{(x+1)^2}', '-\\frac{1}{x+1}'],
		['4/(1-x)', '\\frac{4}{1-x}', '-4\\ln|1-x|']
	]),
	...atelier('exponentielle', [
		['e^x', 'e^x', 'e^x'],
		['e^(2x)', 'e^{2x}', '\\frac{1}{2}e^{2x}', '\\frac{e^{2x}}{2}'],
		['exp(2x)', 'e^{2x}', '\\frac{1}{2}e^{2x}', '\\frac{1}{2}\\exp(2x)'],
		['e^(3x+1)', 'e^{3x+1}', '\\frac{1}{3}e^{3x+1}', '\\frac{e^{3x+1}}{3}'],
		['5e^(-2x)', '5e^{-2x}', '-\\frac{5}{2}e^{-2x}'],
		['e^(-x)', 'e^{-x}', '-e^{-x}'],
		['2^x', '2^x', '\\frac{2^x}{\\ln(2)}']
	]),
	...atelier('u-prime-e-u', [
		['2x e^(x^2)', '2xe^{x^2}', 'e^{x^2}'],
		['-sin(x)e^(cos(x))', '-\\sin(x)e^{\\cos(x)}', 'e^{\\cos(x)}']
	]),
	...atelier('u-prime-sur-u', [
		['2x/(x^2+1)', '\\frac{2x}{x^2+1}', '\\ln(x^2+1)'],
		['x/(x^2+1)', '\\frac{x}{x^2+1}', '\\frac{1}{2}\\ln(x^2+1)', '\\frac{\\ln(x^2+1)}{2}']
	]),
	...atelier(
		'u-prime-sur-u',
		[['cos(x)/sin(x)', '\\frac{\\cos(x)}{\\sin(x)}', '\\ln(\\sin(x))', '\\ln|\\sin(x)|']],
		{
			points: SIN_POSITIVE
		}
	),
	...atelier('u-prime-u-n', [
		['2x(x^2+1)^3', '2x(x^2+1)^3', '\\frac{(x^2+1)^4}{4}', '\\frac{1}{4}(x^2+1)^4']
	]),
	...atelier(
		'u-prime-u-n',
		[
			[
				'ln(x)/x',
				'\\frac{\\ln(x)}{x}',
				'\\frac{(\\ln(x))^2}{2}',
				'\\frac{1}{2}\\ln^2(x)',
				'\\frac{1}{2}(\\ln(x))^2'
			]
		],
		{
			points: POSITIVE
		}
	),
	...atelier('u-prime-sur-racine-u', [
		['x/sqrt(x^2+1)', '\\frac{x}{\\sqrt{x^2+1}}', '\\sqrt{x^2+1}']
	]),
	...atelier('trigonometrie', [
		['sin(x)', '\\sin(x)', '-\\cos(x)'],
		['cos(2x)', '\\cos(2x)', '\\frac{1}{2}\\sin(2x)', '\\frac{\\sin(2x)}{2}'],
		['sin(3x+1)', '\\sin(3x+1)', '-\\frac{1}{3}\\cos(3x+1)', '-\\frac{\\cos(3x+1)}{3}']
	]),
	...atelier('parties', [
		['x e^x', 'xe^x', '(x-1)e^x', 'xe^x-e^x'],
		['x cos(x)', 'x\\cos(x)', 'x\\sin(x)+\\cos(x)']
	]),
	...atelier(
		'parties',
		[
			[
				'x ln(x)',
				'x\\ln(x)',
				'\\frac{1}{2}x^2\\ln(x)-\\frac{1}{4}x^2',
				'\\frac{x^2}{2}\\ln(x)-\\frac{x^2}{4}'
			],
			['ln(x)', '\\ln(x)', 'x\\ln(x)-x']
		],
		{ points: POSITIVE }
	),
	...atelier('rationnelle', [
		['1/(x^2-1)', '\\frac{1}{x^2-1}', '\\frac{1}{2}\\ln|x-1|-\\frac{1}{2}\\ln|x+1|'],
		['(x+1)/(x-1)', '\\frac{x+1}{x-1}', 'x+2\\ln|x-1|'],
		['1/(1+x^2)', '\\frac{1}{1+x^2}', '\\arctan(x)']
	]),
	...atelier('racine-affine', [
		['sqrt(2x+3)', '\\sqrt{2x+3}', '\\frac{1}{3}(2x+3)^{\\frac{3}{2}}']
	]),
	...atelier(
		'litterale',
		[
			[
				'a x^2 + b x + c',
				'ax^2+bx+c',
				'\\frac{a}{3}x^3+\\frac{b}{2}x^2+cx',
				'\\frac{ax^3}{3}+\\frac{bx^2}{2}+cx'
			],
			['a/x', '\\frac{a}{x}', 'a\\ln|x|'],
			['k e^(k x)', 'ke^{kx}', 'e^{kx}'],
			['e^(k x)', 'e^{kx}', '\\frac{1}{k}e^{kx}', '\\frac{e^{kx}}{k}'],
			['1/(a x + b)', '\\frac{1}{ax+b}', '\\frac{1}{a}\\ln|ax+b|'],
			['(a x + b)^3', '(ax+b)^3', '\\frac{(ax+b)^4}{4a}'],
			['cos(a x)', '\\cos(ax)', '\\frac{1}{a}\\sin(ax)', '\\frac{\\sin(ax)}{a}'],
			['a e^(-k t) ; t', 'ae^{-kt}', '-\\frac{a}{k}e^{-kt}'],
			['A cos(w t) ; t', 'A\\cos(wt)', '\\frac{A}{w}\\sin(wt)']
		],
		{ literal: true }
	).map((c) => (c.input.endsWith('; t') ? { ...c, variable: 't' } : c)),
	...atelier(
		'variable-t',
		[
			['3t^2 ; t', '3t^2', 't^3'],
			['e^(-2t) ; t', 'e^{-2t}', '-\\frac{1}{2}e^{-2t}', '-\\frac{e^{-2t}}{2}'],
			['1/t ; t', '\\frac{1}{t}', '\\ln|t|'],
			['t e^(t^2) ; t', 'te^{t^2}', '\\frac{1}{2}e^{t^2}', '\\frac{e^{t^2}}{2}']
		],
		{ variable: 't' }
	)
];

// =============================================================================
// Revue de #913 : intégrandes hors corpus (doublons du corpus retirés)
// =============================================================================

const REVIEW_913_CASES: PrimitiveCase[] = [
	// --- Revue #913 : 208 lignes sondées (2026-10-06) ; 18 déjà au corpus et 1 doublon non repris ---
	// ∛ définie sur ℝ (décision du 2026-10-07) : points de part et d'autre de 2,5
	...latex('revue-913', [['\\sqrt[3]{2x-5}']], { points: [-1.5, 0.7, 2.1, 3.3, 5.5] }),
	...latex('revue-913', [['\\sqrt{ax+b}']], { literal: true, points: AFFINE_POSITIVE }),
	// `x2^x` : illisible par parseLatex (refus attendu) ; référence f écrite avec ·
	{
		family: 'revue-913',
		path: 'latex',
		input: 'x2^x',
		f: 'x\\cdot2^x',
		variable: 'x',
		points: DEFAULT_POINTS,
		literal: false,
		expected: []
	},
	...latex('revue-913', [
		['\\sin(-\\frac{x}{3}+1)'],
		['\\cos(\\frac{2x}{5}-3)'],
		['\\cos(-4x+2)'],
		['3\\sin(0.5x)'],
		['\\tan(2x+1)'],
		['\\tan(-\\frac{x}{2})'],
		['e^{-0.5x}'],
		['e^{\\frac{x}{4}-2}'],
		['3e^{-2x+1}'],
		['\\ln(3x+2)'],
		['\\ln(2-x)'],
		['\\ln(\\frac{x}{2})'],
		['\\ln(-x)'],
		['\\frac{1}{(2x-1)^2}'],
		['\\frac{3}{(1-x)^3}'],
		['\\frac{-2}{(\\frac{x}{3}+1)^4}'],
		['\\frac{1}{-3x+2}'],
		['\\frac{5}{0.5x+1}'],
		['(\\frac{2}{3}x-1)^5'],
		['(-0.5x+2)^3'],
		['(2-3x)^{-2}'],
		['\\sqrt{2x+1}'],
		['\\sqrt{1-3x}'],
		['\\frac{1}{\\sqrt{4x+1}}'],
		['\\frac{1}{\\sqrt[3]{3x+1}}'],
		['(2x+1)^{\\frac{3}{2}}'],
		['(1-x)^{\\frac{2}{3}}'],
		['3^{2x+1}'],
		['(\\frac{1}{2})^x'],
		['0.5^{-x}'],
		['5^{-x}'],
		['10^{0.3x}'],
		['\\frac{1}{\\cos^2(3x)}'],
		['1+\\tan^2(2x)'],
		['\\sin^2(3x)'],
		['\\cos^2(-x)'],
		['\\sin(2x)\\cos(2x)'],
		['x\\cos(x^2)'],
		['x\\sin(3x^2+1)'],
		['\\frac{\\ln x}{x}'],
		['\\frac{\\ln(x)^2}{x}'],
		['\\frac{e^{\\sqrt x}}{\\sqrt x}'],
		['\\sin x\\cos^3 x'],
		['\\sin^3 x\\cos x'],
		['\\tan x'],
		['\\frac{1}{\\tan x}'],
		['\\frac{2x}{x^2-4}'],
		['\\frac{x}{(x^2+1)^2}'],
		['\\frac{x}{\\sqrt{1-x^2}}'],
		['\\frac{\\cos x}{\\sin x}'],
		['\\frac{\\sin x}{\\cos^2 x}'],
		['\\frac{e^x}{e^x+1}'],
		['\\frac{e^{2x}}{1+e^{2x}}'],
		['\\frac{1}{x\\ln x}'],
		['\\cos(x)e^{\\sin x}'],
		['\\frac{\\cos(\\ln x)}{x}'],
		['3x^2(x^3+1)^4'],
		['(2x+1)(x^2+x)^3'],
		['\\frac{\\sin(\\sqrt x)}{\\sqrt x}'],
		['\\frac{1}{x^2}e^{\\frac{1}{x}}'],
		['\\frac{x}{\\sqrt{x^2+4}}'],
		['x\\cos(\\frac{x^2}{2})'],
		['-\\frac{x}{3}e^{-x^2}'],
		['x\\sin(2x)'],
		['x\\cos(3x)'],
		['x^2e^{-x}'],
		['(x+1)e^{-x}'],
		['x\\ln(3x)'],
		['\\ln(x)^2'],
		['x^2\\ln x'],
		['\\frac{\\ln x}{x^2}'],
		['e^x\\sin x'],
		['e^{-x}\\cos(2x)'],
		['x^2\\cos x'],
		['\\sqrt{x}\\ln x'],
		['(2x-1)e^{\\frac{x}{2}}'],
		['\\arctan(x)'],
		['x\\sin(-\\frac{x}{2})'],
		['\\frac{2x+3}{x^2+3x+2}'],
		['\\frac{1}{x^2-4x+3}'],
		['\\frac{x}{x^2-5x+6}'],
		['\\frac{3}{(x-1)(x+2)}'],
		['\\frac{x^2}{x^2-1}'],
		['\\frac{x^3+1}{x-2}'],
		['\\frac{1}{x(x+1)^2}'],
		['\\frac{2x-1}{(x+1)^2}'],
		['\\frac{1}{x^2+4}'],
		['\\frac{1}{4x^2+1}'],
		['\\frac{1}{2x^2-x-1}'],
		['\\frac{x+1}{x^2+2x+5}'],
		['\\frac{1}{x^2+x+1}'],
		['\\frac{1}{9-x^2}'],
		['\\frac{4}{x^2-2x}'],
		['0.3x^2-1.25x'],
		['2.5e^{0.4x}'],
		['\\frac{1.5}{x}'],
		['\\sin(0.25x)'],
		['(0.2x+1)^{2}'],
		['\\frac{1}{0.4x-1.2}'],
		['\\exponentialE^{-0.5x}'],
		['\\exponentialE^{\\frac{x}{4}-2}'],
		['3\\exponentialE^{-2x+1}'],
		['\\exponentialE^{1-x}'],
		['x\\exponentialE^{x^2}'],
		['x\\exponentialE^{-x^2}'],
		['x^2\\exponentialE^{x^3}'],
		['-\\frac{x}{3}\\exponentialE^{-x^2}'],
		['\\frac{\\exponentialE^{\\sqrt x}}{\\sqrt x}'],
		['\\cos(x)\\exponentialE^{\\sin x}'],
		['\\frac{1}{x^2}\\exponentialE^{\\frac{1}{x}}'],
		['x^2\\exponentialE^{-x}'],
		['x\\exponentialE^{2x}'],
		['(x+1)\\exponentialE^{-x}'],
		['\\exponentialE^x\\sin x'],
		['\\exponentialE^{-x}\\cos(2x)'],
		['(2x-1)\\exponentialE^{\\frac{x}{2}}'],
		['2.5\\exponentialE^{0.4x}'],
		['\\exponentialE^{-3x}+\\exponentialE^{\\frac{x}{2}}'],
		['\\exp(-\\frac{x}{2})'],
		['\\exp(1-3x)'],
		['x\\exp(-x)'],
		['\\frac{1}{(x+1)^2(x-1)}'],
		['\\frac{x}{(x-1)^2}'],
		['\\frac{1}{x^2(x+1)}'],
		['\\frac{2}{x(x-1)^2}'],
		['\\frac{1}{(x-2)^2(x+3)}'],
		['\\frac{x+5}{(x+1)^3}'],
		['\\sin(3x-\\pi)'],
		['\\sin(\\frac{\\pi}{2}x)'],
		['\\cos(\\sqrt{2}x+1)'],
		['(3x-2)^{-1}'],
		['(5-2x)^{-3}'],
		['(1.5x+0.5)^4'],
		['\\frac{2}{(3-x)^2}'],
		['\\frac{1}{(\\frac{1}{2}x+1)^2}'],
		['\\sqrt{\\frac{x}{2}+1}'],
		['\\frac{3}{\\sqrt{2-x}}'],
		['\\sqrt[3]{x+1}'],
		['\\sqrt[3]{(2x+1)^2}'],
		['x^{\\frac{1}{3}}(x^{\\frac{4}{3}}+1)^2']
	]),
	...latex(
		'revue-913',
		[
			['t\\cos(2t)'],
			['e^{-\\frac{t}{3}}'],
			['\\frac{1}{2t+1}'],
			['\\sqrt{3t}'],
			['\\sin(\\frac{t}{2})\\cos(\\frac{t}{2})'],
			['\\exponentialE^{-\\frac{t}{3}}']
		],
		{ variable: 't' }
	),
	...latex(
		'revue-913',
		[
			['\\frac{a}{x^2-a^2}'],
			['\\frac{k}{(x+m)^2}'],
			['\\sin(ax+b)'],
			['xe^{ax}'],
			['\\frac{1}{x^2+a^2}'],
			['k\\ln(x)'],
			['e^{\\frac{x}{a}}'],
			['\\exponentialE^{kx}'],
			['x\\exponentialE^{ax}'],
			['\\exponentialE^{\\frac{x}{a}}'],
			['\\frac{3}{(x+m)^2}'],
			['\\frac{k}{(x+1)^2}'],
			['\\frac{k}{x+m}'],
			['k(x+m)^2'],
			['\\frac{1}{(x-a)^3}']
		],
		{ literal: true }
	),
	...latex('revue-913', [['\\cos(kt)']], { literal: true, variable: 't' }),
	// --- Revue de #914 (2026-10-06) : arctan(ax+b) rendait ln|P| avec P de degré 1024 ---
	...latex('revue-913', [
		['\\arctan(3x)'],
		['\\arctan(2x+1)'],
		['\\frac{1}{(x-1)^3(x+2)}'],
		['\\frac{1}{x(x^2+1)}'],
		['\\frac{x^3}{x^2-1}'],
		['\\frac{1}{2x^2-2}'],
		['\\frac{1}{x^2-x-6}'],
		['e^{\\sqrt{3}x}'],
		['|2x-1|']
	]),
	...latex('revue-913', [['\\frac{1}{\\cos^2(2x)}']], { points: [-0.6, -0.3, 0.2, 0.5, 0.7] }),
	...latex(
		'revue-913',
		[['\\frac{a}{(x-b)^3}'], ['\\frac{1}{(kx+m)^3}'], ['\\frac{1}{(x-a)(x-b)}']],
		{ literal: true }
	)
];

/**
 * Intégrandes qui faisaient BOUCLER `integrate` (revue de #914 : 100 % CPU,
 * onglet gelé) : ln(g(ax+b)). Elles doivent être refusées, et VITE.
 */
export const FAST_REFUSAL_INPUTS: readonly string[] = [
	'\\ln(\\sin(2x+1))',
	'\\ln(\\sin(x+1))',
	'\\ln(\\cos(2x))',
	'\\ln(\\ln(2x+1))'
];

/** Toutes les primitives du corpus */
export const PRIMITIVE_CASES: readonly PrimitiveCase[] = [
	...LATEX_CASES,
	...LITERAL_CASES,
	...ATELIER_CASES,
	...REVIEW_913_CASES
];

// =============================================================================
// Intégrales définies
// =============================================================================

function definite(
	path: Path,
	input: string,
	f: string,
	lower: string,
	upper: string,
	exact: string,
	options: { variable?: string; literal?: boolean; family?: 'revue-913' } = {}
): DefiniteCase {
	return {
		family: options.family ?? (options.literal === true ? 'definie-litterale' : 'definie'),
		path,
		input,
		f,
		variable: options.variable ?? 'x',
		lower,
		upper,
		exact,
		literal: options.literal ?? false
	};
}

/** Chemin latex : l'élève donne l'intégrande ET les bornes en LaTeX */
const L = (f: string, lower: string, upper: string, exact: string) =>
	definite('latex', f, f, lower, upper, exact);

export const DEFINITE_CASES: readonly DefiniteCase[] = [
	L('x^2', '0', '1', '\\frac{1}{3}'),
	L('\\frac{1}{x}', '1', 'e', '1'),
	L('\\sin(x)', '0', '\\pi', '2'),
	L('x', '0', '2', '2'),
	L('3x^2+1', '-1', '1', '4'),
	L('e^{x}', '0', '1', 'e-1'),
	L('\\cos(x)', '0', '\\frac{\\pi}{2}', '1'),
	L('\\frac{1}{x}', '1', '2', '\\ln(2)'),
	L('2x+1', '1', '3', '10'),
	L('x^3', '-1', '2', '\\frac{15}{4}'),
	L('\\frac{1}{x^2}', '1', '2', '\\frac{1}{2}'),
	L('\\sqrt{x}', '0', '4', '\\frac{16}{3}'),
	L('e^{2x}', '0', '1', '\\frac{e^2-1}{2}'),
	L('xe^{x}', '0', '1', '1'),
	L('\\ln(x)', '1', 'e', '1'),
	L('\\frac{1}{1+x}', '0', '1', '\\ln(2)'),
	L('\\frac{2x}{x^2+1}', '0', '1', '\\ln(2)'),
	L('\\sin(2x)', '0', '\\frac{\\pi}{2}', '1'),
	L('x^2-4', '-2', '2', '-\\frac{32}{3}'),
	L('\\frac{1}{x}', '-2', '-1', '-\\ln(2)'),
	L('\\frac{1}{x+1}', '-3', '-2', '-\\ln(2)'),
	L('e^{1-x}', '0', '1', 'e-1'),
	L('\\cos(x)', '-\\pi', '\\pi', '0'),
	L('x\\cos(x)', '0', '\\pi', '-2'),
	L('4x^3-2x', '0', '1', '0'),
	L('e^{-x}', '0', '\\ln(2)', '\\frac{1}{2}'),
	L('\\exponentialE^{x}', '0', '1', 'e-1'),
	L('x\\exponentialE^{x}', '0', '1', '1'),
	// Chemin atelier : bornes numériques après l'expression
	definite('atelier', 'x^2 0 1', 'x^2', '0', '1', '\\frac{1}{3}'),
	definite('atelier', '1/x 1 2', '\\frac{1}{x}', '1', '2', '\\ln(2)'),
	definite('atelier', '3x^2+1 -1 1', '3x^2+1', '-1', '1', '4'),
	definite('atelier', 'e^x 0 1', 'e^x', '0', '1', 'e-1'),
	definite('atelier', 'sin(x) 0 2', '\\sin(x)', '0', '2', '1-\\cos(2)'),
	definite('atelier', '1/x -2 -1', '\\frac{1}{x}', '-2', '-1', '-\\ln(2)'),
	definite('atelier', 't^2 ; t 0 3', 't^2', '0', '3', '9', { variable: 't' }),
	definite('atelier', '2x/(x^2+1) 0 1', '\\frac{2x}{x^2+1}', '0', '1', '\\ln(2)'),
	definite('atelier', 'x e^x 0 1', 'xe^x', '0', '1', '1'),
	definite('atelier', 'sqrt(x) 0 4', '\\sqrt{x}', '0', '4', '\\frac{16}{3}'),
	definite('atelier', 'e^(2x) 0 1', 'e^{2x}', '0', '1', '\\frac{e^2-1}{2}'),
	// Bornes littérales
	definite('latex', 'x^2', 'x^2', '0', 'a', '\\frac{a^3}{3}', { literal: true }),
	definite('latex', 'kx', 'kx', '0', '2', '2k', { literal: true }),
	definite('latex', 'e^{x}', 'e^x', '0', 'c', 'e^c-1', { literal: true }),
	definite('latex', '\\cos(x)', '\\cos(x)', '0', 'b', '\\sin(b)', { literal: true }),
	definite('atelier', 'x^2 0 a', 'x^2', '0', 'a', '\\frac{a^3}{3}', { literal: true }),
	definite('atelier', 'a x 0 2', 'ax', '0', '2', '2a', { literal: true }),
	// Revue de #913
	definite(
		'latex',
		'\\sin(-\\frac{x}{3}+1)',
		'\\sin(-\\frac{x}{3}+1)',
		'0',
		'\\pi',
		'3\\cos(1-\\frac{\\pi}{3})-3\\cos(1)',
		{ family: 'revue-913' }
	),
	definite('latex', 'e^{-0.5x}', 'e^{-0.5x}', '0', '2', '2-\\frac{2}{e}', { family: 'revue-913' }),
	definite(
		'latex',
		'x\\ln(3x)',
		'x\\ln(3x)',
		'1',
		'2',
		'2\\ln(6)-\\frac{1}{2}\\ln(3)-\\frac{3}{4}',
		{ family: 'revue-913' }
	),
	definite(
		'latex',
		'\\frac{1}{x^2-1}',
		'\\frac{1}{x^2-1}',
		'2',
		'3',
		'\\frac{1}{2}\\ln(3)-\\frac{1}{2}\\ln(2)',
		{ family: 'revue-913' }
	),
	definite('latex', '(\\frac{2}{3}x-1)^5', '(\\frac{2}{3}x-1)^5', '0', '3', '0', {
		family: 'revue-913'
	}),
	definite('latex', 'x\\sin(2x)', 'x\\sin(2x)', '0', '\\pi', '-\\frac{\\pi}{2}', {
		family: 'revue-913'
	}),
	definite('latex', '\\frac{1}{\\sqrt{4x+1}}', '\\frac{1}{\\sqrt{4x+1}}', '0', '2', '1', {
		family: 'revue-913'
	}),
	definite('latex', '2^x', '2^x', '-1', '1', '\\frac{3}{2\\ln(2)}', { family: 'revue-913' }),
	definite('latex', '\\frac{\\ln x}{x}', '\\frac{\\ln x}{x}', '1', 'e', '\\frac{1}{2}', {
		family: 'revue-913'
	}),
	definite('latex', 'xe^{-x^2}', 'xe^{-x^2}', '-1', '2', '\\frac{1}{2}(e^{-1}-e^{-4})', {
		family: 'revue-913'
	}),
	definite('latex', '\\tan x', '\\tan x', '0', '\\frac{\\pi}{4}', '\\frac{1}{2}\\ln(2)', {
		family: 'revue-913'
	}),
	definite('latex', '\\frac{1}{(2x-1)^2}', '\\frac{1}{(2x-1)^2}', '1', '3', '\\frac{2}{5}', {
		family: 'revue-913'
	}),
	definite('latex', '\\frac{2x+3}{x^2+3x+2}', '\\frac{2x+3}{x^2+3x+2}', '0', '1', '\\ln(3)', {
		family: 'revue-913'
	}),
	definite(
		'latex',
		'\\cos(3x)',
		'\\cos(3x)',
		'-\\frac{\\pi}{6}',
		'\\frac{\\pi}{6}',
		'\\frac{2}{3}',
		{ family: 'revue-913' }
	),
	definite('latex', '\\frac{1}{3-x}', '\\frac{1}{3-x}', '0', '2', '\\ln(3)', {
		family: 'revue-913'
	}),
	definite('latex', 'x^2e^{-x}', 'x^2e^{-x}', '0', '1', '2-\\frac{5}{e}', { family: 'revue-913' }),
	definite(
		'latex',
		't\\cos(2t)',
		't\\cos(2t)',
		'0',
		'1',
		'\\frac{1}{2}\\sin(2)+\\frac{1}{4}\\cos(2)-\\frac{1}{4}',
		{ family: 'revue-913', variable: 't' }
	),
	definite(
		'latex',
		'\\exponentialE^{-0.5x}',
		'\\exponentialE^{-0.5x}',
		'0',
		'2',
		'2-\\frac{2}{e}',
		{ family: 'revue-913' }
	),
	definite(
		'latex',
		'x^2\\exponentialE^{-x}',
		'x^2\\exponentialE^{-x}',
		'0',
		'1',
		'2-\\frac{5}{e}',
		{ family: 'revue-913' }
	),
	definite(
		'latex',
		'x\\exponentialE^{-x^2}',
		'x\\exponentialE^{-x^2}',
		'-1',
		'2',
		'\\frac{1}{2}(e^{-1}-e^{-4})',
		{ family: 'revue-913' }
	),
	definite(
		'latex',
		'\\frac{1}{(x+1)^2(x-1)}',
		'\\frac{1}{(x+1)^2(x-1)}',
		'2',
		'3',
		'\\frac{1}{4}\\ln(3)-\\frac{1}{4}\\ln(2)-\\frac{1}{24}',
		{ family: 'revue-913' }
	),
	definite('latex', '(1.5x+0.5)^4', '(1.5x+0.5)^4', '-1', '1', '\\frac{22}{5}', {
		family: 'revue-913'
	}),
	definite('latex', '\\frac{2}{(3-x)^2}', '\\frac{2}{(3-x)^2}', '0', '2', '\\frac{4}{3}', {
		family: 'revue-913'
	}),
	definite('latex', '\\sin(3x-\\pi)', '\\sin(3x-\\pi)', '0', '1', '\\frac{\\cos(3)-1}{3}', {
		family: 'revue-913'
	})
];
