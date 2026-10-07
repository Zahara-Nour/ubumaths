/**
 * Corpus de l'oracle numérique du moteur de limites.
 *
 * Chaque entrée est une limite du programme (1re, Terminale, quelques
 * classiques du supérieur) écrite COMME UN ÉLÈVE : la borne `at` est du LaTeX
 * (`+\infty`, `-\infty`, `2^+`, `\frac{\pi}{2}^-`…) et la fonction `f` aussi.
 * Le harnais construit `\lim_{x\to at} f` et passe par `parseLatex`.
 *
 * `expected` est la valeur notée À LA MAIN :
 * - un nombre en LaTeX (`0`, `-1`, `\frac{1}{2}`, `e^{-1}`, `\ln 2`…) ;
 * - `'+inf'` ou `'-inf'` ;
 * - `'none'` : pas de limite (sauts, oscillations, pôle bilatéral de signe
 *   changeant).
 *
 * Bornes négatives à gauche/droite écrites comme un élève, `-2^+` (le
 * parseur les refusait jusqu'au 2026-10-06 : « Unexpected token: } »).
 * `\cot` est écrit `\frac{1}{\tan x}` : `compile()` ne connaît pas `cot`,
 * donc l'oracle ne pourrait pas l'échantillonner.
 *
 * Chaque attendu fini ou infini est aussi contrôlé numériquement par le
 * harnais (test « le corpus est juste ») : une faute de frappe dans un attendu
 * ne peut pas fabriquer un faux « moteur faux ».
 */

/** Valeur attendue : LaTeX d'un nombre fini, `+inf`, `-inf` ou `none`. */
export type ExpectedLimit = string;

export interface OracleEntry {
	/** Identifiant stable (préfixe de famille + numéro). */
	readonly id: string;
	/** Borne en LaTeX, direction comprise (`0^+`, `2^-`). */
	readonly at: string;
	/** Fonction de x, en LaTeX. */
	readonly f: string;
	/** Attendu noté à la main. */
	readonly expected: ExpectedLimit;
	/**
	 * Variable de la limite, `x` par défaut. Une lettre grecque s'écrit par
	 * son nom de commande (`alpha` pour `\alpha`), nom que portent aussi la
	 * variable du nœud `limit` et la clé de `compile()`.
	 */
	readonly variable?: string;
}

export interface OracleFamily {
	readonly name: string;
	readonly entries: readonly OracleEntry[];
}

function family(
	name: string,
	prefix: string,
	rows: ReadonlyArray<readonly [string, string, ExpectedLimit]>
): OracleFamily {
	return {
		name,
		entries: rows.map(([at, f, expected], index) => ({
			id: `${prefix}${String(index + 1).padStart(2, '0')}`,
			at,
			f,
			expected
		}))
	};
}

const PINF = '+\\infty';
const MINF = '-\\infty';

// Polynômes : terme de plus haut degré en ±∞, substitution en un point fini
const polynomials = family('polynômes', 'poly-', [
	[PINF, '3x^2-5x+1', '+inf'],
	[MINF, '3x^2-5x+1', '+inf'],
	[PINF, '-2x^3+x^2+7', '-inf'],
	[MINF, '-2x^3+x^2+7', '+inf'],
	[MINF, 'x^3-1000x^2', '-inf'],
	[PINF, 'x^4-x^5', '-inf'],
	[MINF, 'x^4-x^5', '+inf'],
	['2', 'x^2-3x+1', '-1'],
	['-1', '2x^3+x', '-3'],
	['0', '5x^7-3x+4', '4'],
	[PINF, '(1-x)^3', '-inf'],
	[MINF, '(2x+1)(3-x)', '-inf'],
	[PINF, 'x(x-1)(x-2)', '+inf'],
	[MINF, 'x^2(1-x)', '+inf'],
	['\\frac{1}{2}', '4x^2-1', '0'],
	[PINF, '\\frac{x^2}{2}-100x', '+inf'],
	[MINF, '-x^6+x^5', '-inf'],
	['3', '(x-3)^2+x', '3'],
	[PINF, '0.5x^3-2x', '+inf'],
	[MINF, '\\sqrt{2}x^3', '-inf']
]);

// Fonctions rationnelles en ±∞ : quotient des termes de plus haut degré
const rationalAtInfinity = family('rationnelles en ±∞', 'ratinf-', [
	[PINF, '\\frac{2x+1}{x-3}', '2'],
	[MINF, '\\frac{2x+1}{x-3}', '2'],
	[PINF, '\\frac{3x^2-x}{2x^2+5}', '\\frac{3}{2}'],
	[MINF, '\\frac{x^2+1}{x^3-2}', '0'],
	[PINF, '\\frac{x^3+1}{x^2-4}', '+inf'],
	[MINF, '\\frac{x^3+1}{x^2-4}', '-inf'],
	[PINF, '\\frac{1-x^2}{x+1}', '-inf'],
	[MINF, '\\frac{-4x^3+x}{2x^3+1}', '-2'],
	[PINF, '\\frac{5}{x^2+1}', '0'],
	[MINF, '\\frac{x}{x^2+x+1}', '0'],
	[PINF, '\\frac{(2x-1)^2}{x^2+3}', '4'],
	[MINF, '\\frac{x^4}{1-x^3}', '+inf'],
	[PINF, '\\frac{3}{x}+2', '2'],
	[PINF, '\\frac{x+1}{x}-\\frac{x}{x+1}', '0'],
	[MINF, '\\frac{2x^2-3x}{5-x^2}', '-2'],
	[PINF, '\\frac{x^2-3x+2}{x-1}', '+inf'],
	[PINF, 'x-\\frac{x^2}{x+1}', '1'],
	[MINF, '\\frac{6x^5-x}{3x^5+x^4}', '2'],
	[PINF, '\\frac{1}{x}-\\frac{1}{x^2}', '0'],
	[PINF, '\\frac{7x^2}{(x+1)(x-2)}', '7'],
	[MINF, '\\frac{x^3}{x^2+1}-x', '0'],
	[PINF, '\\frac{100x}{x^2-100}', '0'],
	[MINF, '\\frac{-x^3+2}{4x^3}', '-\\frac{1}{4}'],
	[PINF, '\\frac{12x}{4x+1}', '3'],
	[MINF, '\\frac{x^2}{x+1}', '-inf']
]);

// Fonctions rationnelles aux pôles : signe du dénominateur, simplification 0/0
const rationalAtPoles = family('rationnelles aux pôles', 'pole-', [
	['0^+', '\\frac{1}{x}', '+inf'],
	['0^-', '\\frac{1}{x}', '-inf'],
	['0', '\\frac{1}{x^2}', '+inf'],
	['2^+', '\\frac{1}{x-2}', '+inf'],
	['2^-', '\\frac{1}{x-2}', '-inf'],
	['2', '\\frac{1}{x-2}', 'none'],
	['1^+', '\\frac{x+1}{x-1}', '+inf'],
	['1^-', '\\frac{x+1}{x-1}', '-inf'],
	['3^+', '\\frac{-2}{x-3}', '-inf'],
	['3^-', '\\frac{-2}{x-3}', '+inf'],
	['-1', '\\frac{x}{(x+1)^2}', '-inf'],
	['2', '\\frac{x^2-4}{x-2}', '4'],
	['1', '\\frac{x^2-1}{x^2+x-2}', '\\frac{2}{3}'],
	['3', '\\frac{x^2-9}{x^2-6x+9}', 'none'],
	['3^+', '\\frac{x^2-9}{x^2-6x+9}', '+inf'],
	['-2^+', '\\frac{x}{x+2}', '-inf'],
	['-2^-', '\\frac{x}{x+2}', '+inf'],
	['0', '\\frac{x^3+x}{x}', '1'],
	['0', '\\frac{x^2+2x}{x^2-x}', '-2'],
	['1', '\\frac{x^3-1}{x-1}', '3'],
	['0^+', '\\frac{x-1}{x^2}', '-inf'],
	['0', '\\frac{x-1}{x^2}', '-inf'],
	['1^+', '\\frac{1}{1-x}', '-inf'],
	['0^+', '\\frac{1}{x}-\\frac{1}{x^2}', '-inf'],
	['2', '\\frac{x^3-8}{x^2-4}', '3'],
	['-3', '\\frac{x^2+5x+6}{x+3}', '-1'],
	['0^-', '\\frac{2x+1}{x^3}', '-inf'],
	['4^+', '\\frac{x}{16-x^2}', '-inf'],
	['0', '\\frac{x+1}{x^3+x^2}', '+inf'],
	['-2', '\\frac{1}{x+2}', 'none'],
	['0', '\\frac{1}{x^3}', 'none'],
	['1', '\\frac{x}{x-1}', 'none']
]);

// Racines : conjugué, factorisation par x² sous la racine (attention à |x| en -∞)
const roots = family('racines et conjugués', 'sqrt-', [
	[PINF, '\\sqrt{x^2+x}-x', '\\frac{1}{2}'],
	[PINF, '\\sqrt{x+1}-\\sqrt{x}', '0'],
	[PINF, '\\sqrt{x^2+1}-x', '0'],
	[MINF, '\\sqrt{x^2+1}+x', '0'],
	[MINF, '\\sqrt{x^2+x}+x', '-\\frac{1}{2}'],
	[PINF, '\\sqrt{x^2+3x}-x', '\\frac{3}{2}'],
	[PINF, '\\sqrt{4x^2+x}-2x', '\\frac{1}{4}'],
	[PINF, '\\sqrt{x}-x', '-inf'],
	[PINF, 'x-\\sqrt{x}', '+inf'],
	[PINF, '\\frac{\\sqrt{x}}{x}', '0'],
	[PINF, '\\frac{\\sqrt{x^2+1}}{x}', '1'],
	[MINF, '\\frac{\\sqrt{x^2+1}}{x}', '-1'],
	[PINF, '\\frac{\\sqrt{x}+1}{\\sqrt{x}-1}', '1'],
	['0', '\\frac{\\sqrt{1+x}-1}{x}', '\\frac{1}{2}'],
	['4', '\\frac{\\sqrt{x}-2}{x-4}', '\\frac{1}{4}'],
	['1', '\\frac{x-1}{\\sqrt{x}-1}', '2'],
	['0', '\\frac{\\sqrt{x+4}-2}{x}', '\\frac{1}{4}'],
	['9', '\\frac{3-\\sqrt{x}}{9-x}', '\\frac{1}{6}'],
	[PINF, '\\sqrt{x+\\sqrt{x}}-\\sqrt{x}', '\\frac{1}{2}'],
	[PINF, '\\sqrt{x^2+x+1}-\\sqrt{x^2-x}', '1'],
	[PINF, 'x\\left(\\sqrt{1+\\frac{1}{x}}-1\\right)', '\\frac{1}{2}'],
	[PINF, '\\sqrt{9x^2-x}-3x', '-\\frac{1}{6}'],
	['0^+', '\\frac{\\sqrt{x}}{x}', '+inf'],
	[PINF, '\\frac{2x+\\sqrt{x}}{x-1}', '2'],
	[MINF, '\\sqrt{x^2-2x}-\\sqrt{x^2+1}', '1'],
	['0', '\\frac{x}{\\sqrt{x+1}-1}', '2'],
	[PINF, '\\frac{\\sqrt{x^2+1}}{\\sqrt{x}}', '+inf']
]);

// Exponentielles et croissances comparées
const exponentials = family('exponentielles', 'exp-', [
	[PINF, 'e^x', '+inf'],
	[MINF, 'e^x', '0'],
	[PINF, 'e^{-x}', '0'],
	[MINF, 'e^{-x}', '+inf'],
	[PINF, '\\frac{e^x}{x}', '+inf'],
	[PINF, '\\frac{e^x}{x^2}', '+inf'],
	[PINF, '\\frac{x}{e^x}', '0'],
	[PINF, 'x^3e^{-x}', '0'],
	[MINF, 'xe^x', '0'],
	[MINF, 'x^2e^x', '0'],
	[PINF, 'e^x-x', '+inf'],
	[PINF, 'x-e^x', '-inf'],
	[PINF, 'e^x-x^3', '+inf'],
	[MINF, 'e^x-x', '+inf'],
	[PINF, '\\frac{e^x+1}{e^x-1}', '1'],
	[MINF, '\\frac{e^x+1}{e^x-1}', '-1'],
	[PINF, '\\frac{e^{2x}}{e^x+1}', '+inf'],
	[PINF, '\\frac{2e^x+x}{e^x+1}', '2'],
	[PINF, 'e^{-x^2}', '0'],
	[PINF, 'e^{\\frac{1}{x}}', '1'],
	['0^+', 'e^{\\frac{1}{x}}', '+inf'],
	['0^-', 'e^{\\frac{1}{x}}', '0'],
	['0', 'e^{\\frac{1}{x}}', 'none'],
	[PINF, '\\frac{e^x}{x^{10}}', '+inf'],
	[MINF, 'x^5e^{x}', '0'],
	[PINF, '(x^2-x)e^{-x}', '0'],
	[PINF, 'e^{x}-e^{2x}', '-inf'],
	[PINF, '\\frac{e^{x}-1}{e^{x}+x}', '1'],
	[PINF, '\\frac{e^{x}+e^{-x}}{e^{x}-e^{-x}}', '1'],
	[MINF, '\\frac{e^{x}+e^{-x}}{e^{x}-e^{-x}}', '-1'],
	['0', '\\frac{e^{2x}-1}{x}', '2'],
	['0', '\\frac{e^{x}-e^{-x}}{x}', '2'],
	[PINF, 'x\\left(e^{\\frac{1}{x}}-1\\right)', '1'],
	[PINF, '\\frac{\\sqrt{x}}{e^{x}}', '0'],
	[PINF, 'e^{\\sqrt{x}}-x', '+inf'],
	[MINF, '\\frac{1}{1+e^{x}}', '1'],
	[PINF, '\\frac{1}{1+e^{x}}', '0'],
	[PINF, '3e^{-2x}+5', '5'],
	[PINF, '\\frac{x^2+e^x}{x^3+2e^x}', '\\frac{1}{2}'],
	[MINF, '(x^2+1)e^{x}', '0'],
	['0', '\\frac{e^x}{x}', 'none']
]);

// Logarithmes : sommes, différences, quotients, croissances comparées
const logarithms = family('logarithmes', 'ln-', [
	[PINF, '\\ln x', '+inf'],
	['0^+', '\\ln x', '-inf'],
	[PINF, '\\frac{\\ln x}{x}', '0'],
	[PINF, '\\frac{x}{\\ln x}', '+inf'],
	['0^+', 'x\\ln x', '0'],
	['0^+', 'x^2\\ln x', '0'],
	[PINF, 'x-\\ln x', '+inf'],
	[PINF, '\\ln x-x', '-inf'],
	[PINF, '\\ln(x+1)-\\ln x', '0'],
	[PINF, '\\ln(2x+1)-\\ln(x)', '\\ln 2'],
	[PINF, '\\ln(x^2+1)-2\\ln x', '0'],
	[PINF, '\\ln(3x)-\\ln(x+5)', '\\ln 3'],
	[PINF, '\\frac{\\ln x}{\\sqrt{x}}', '0'],
	[PINF, '\\frac{(\\ln x)^2}{x}', '0'],
	[PINF, '\\frac{\\ln(x^2)}{x}', '0'],
	['1', '\\frac{\\ln x}{x-1}', '1'],
	[PINF, '\\frac{\\ln(x+1)}{\\ln x}', '1'],
	[PINF, '\\ln\\left(\\frac{x+1}{x}\\right)', '0'],
	[PINF, '\\ln\\left(\\frac{2x^2+1}{x^2}\\right)', '\\ln 2'],
	['0^+', '\\ln x+\\frac{1}{x}', '+inf'],
	['0^+', '\\frac{\\ln x}{x}', '-inf'],
	[PINF, '\\ln(\\ln x)', '+inf'],
	['1^+', '\\frac{1}{\\ln x}', '+inf'],
	['1^-', '\\frac{1}{\\ln x}', '-inf'],
	[PINF, 'x\\ln\\left(1+\\frac{1}{x}\\right)', '1'],
	[PINF, '\\ln(x)-\\ln(x^2)', '-inf'],
	['0^+', '\\sqrt{x}\\ln x', '0'],
	[PINF, '\\frac{\\ln x}{x^2}', '0'],
	[PINF, '\\frac{x^2}{\\ln x}', '+inf'],
	['0^+', '(\\ln x)^2', '+inf'],
	[PINF, '\\ln(e^x+1)-x', '0'],
	[PINF, '\\frac{\\ln(1+e^x)}{x}', '1'],
	['0^+', 'x(\\ln x)^2', '0'],
	[PINF, '\\ln x-\\sqrt{x}', '-inf'],
	['e', '\\frac{\\ln x-1}{x-e}', 'e^{-1}'],
	[PINF, '\\frac{\\ln(x)+x}{x}', '1'],
	['0^+', '\\ln(x)-\\ln(2x)', '-\\ln 2'],
	[PINF, '\\frac{\\ln(x^3)}{\\ln(x)}', '3'],
	['0', '\\frac{\\ln(1+x)}{x^2}', 'none']
]);

// Limites de référence en 0 (taux d'accroissement, développements)
const references = family('limites de référence', 'ref-', [
	['0', '\\frac{\\sin x}{x}', '1'],
	['0', '\\frac{e^x-1}{x}', '1'],
	['0', '\\frac{\\ln(1+x)}{x}', '1'],
	['0', '\\frac{1-\\cos x}{x^2}', '\\frac{1}{2}'],
	['0', '\\frac{\\sin(3x)}{x}', '3'],
	['0', '\\frac{\\sin(2x)}{\\sin(5x)}', '\\frac{2}{5}'],
	['0', '\\frac{\\tan x}{x}', '1'],
	['0', '\\frac{1-\\cos x}{x}', '0'],
	['0', '\\frac{x}{\\sin x}', '1'],
	['0', '\\frac{e^{3x}-1}{2x}', '\\frac{3}{2}'],
	['0', '\\frac{\\ln(1+2x)}{x}', '2'],
	['0', '\\frac{(\\sin x)^2}{x^2}', '1'],
	['0', '\\frac{\\cos x-1}{x^2}', '-\\frac{1}{2}'],
	['0', '\\frac{x}{e^x-1}', '1'],
	['0', '\\frac{\\sin x}{x^2}', 'none'],
	['0^+', '\\frac{\\sin x}{x^2}', '+inf'],
	['0', '\\frac{\\sin(x^2)}{x}', '0'],
	['\\pi', '\\frac{\\sin x}{x-\\pi}', '-1'],
	['0', '\\frac{e^x-1}{\\sin x}', '1'],
	['0', '\\frac{\\ln(1+x)}{\\sin x}', '1'],
	['0', '\\frac{x-\\sin x}{x^3}', '\\frac{1}{6}'],
	['0', '\\frac{e^x-1-x}{x^2}', '\\frac{1}{2}'],
	['0', '\\frac{\\sqrt{1+x}-1}{\\sin x}', '\\frac{1}{2}'],
	['0', '\\frac{1-\\cos(2x)}{x^2}', '2'],
	['1', '\\frac{e^{x-1}-1}{x-1}', '1'],
	['0', '\\frac{\\tan(2x)}{3x}', '\\frac{2}{3}']
]);

// Trigonométrie et pôles (tan, cot, 1/cos, 1/sin)
const trigonometry = family('trigonométrie et pôles', 'trig-', [
	['\\frac{\\pi}{2}^-', '\\tan x', '+inf'],
	['\\frac{\\pi}{2}^+', '\\tan x', '-inf'],
	['\\frac{\\pi}{2}', '\\tan x', 'none'],
	['0^+', '\\frac{1}{\\tan x}', '+inf'],
	['0^-', '\\frac{1}{\\tan x}', '-inf'],
	['0', '\\frac{1}{\\tan x}', 'none'],
	['\\frac{\\pi}{2}^-', '\\frac{1}{\\cos x}', '+inf'],
	['\\frac{\\pi}{2}^+', '\\frac{1}{\\cos x}', '-inf'],
	['0', '\\frac{1}{\\sin x}', 'none'],
	['0^+', '\\frac{1}{\\sin x}', '+inf'],
	['\\pi^-', '\\frac{1}{\\sin x}', '+inf'],
	['\\pi^+', '\\frac{1}{\\sin x}', '-inf'],
	['0', '\\cos x', '1'],
	['\\frac{\\pi}{3}', '\\sin x', '\\frac{\\sqrt{3}}{2}'],
	['\\frac{\\pi}{4}', '\\tan x', '1'],
	['\\pi', '\\cos(2x)+\\sin x', '1'],
	['0', '\\frac{1}{\\cos x}', '1'],
	['\\pi', '\\frac{1+\\cos x}{(x-\\pi)^2}', '\\frac{1}{2}'],
	['-\\frac{\\pi}{2}^+', '\\tan x', '-inf'],
	['0^+', '\\frac{\\cos x}{x}', '+inf'],
	['0', '\\frac{\\cos x}{x}', 'none'],
	['\\frac{\\pi}{2}', '\\frac{\\cos x}{x-\\frac{\\pi}{2}}', '-1'],
	['0', '\\frac{x}{\\tan x}', '1'],
	['\\frac{\\pi}{2}', '\\left(x-\\frac{\\pi}{2}\\right)\\tan x', '-1'],
	['\\frac{\\pi}{2}', '\\frac{1}{\\cos x}', 'none']
]);

// Valeur absolue : signe à gauche / à droite
const absoluteValue = family('valeur absolue', 'abs-', [
	['0', '|x|', '0'],
	['0', '\\frac{|x|}{x}', 'none'],
	['0^+', '\\frac{|x|}{x}', '1'],
	['0^-', '\\frac{|x|}{x}', '-1'],
	[PINF, '\\frac{|x|}{x}', '1'],
	[MINF, '\\frac{|x|}{x}', '-1'],
	['2^+', '\\frac{|x-2|}{x-2}', '1'],
	['2^-', '\\frac{|x-2|}{x-2}', '-1'],
	['2', '\\frac{|x-2|}{x-2}', 'none'],
	[MINF, '|x|+x', '0'],
	[MINF, '\\frac{|x|+1}{x}', '-1'],
	['0', '\\frac{x^2}{|x|}', '0'],
	['0', '\\frac{1}{|x|}', '+inf'],
	['1', '|x^2-4|', '3'],
	[PINF, '|1-x|-x', '-1'],
	['0', '\\frac{|x|}{x^2}', '+inf'],
	['-1^+', '\\frac{|x+1|}{x+1}', '1'],
	['0', '\\frac{|x|}{x}+1', 'none']
]);

// Fonctions bornées : encadrement, comparaison
const bounded = family('fonctions bornées', 'bnd-', [
	[PINF, 'x+\\sin x', '+inf'],
	[MINF, 'x+\\sin x', '-inf'],
	[PINF, '\\frac{\\sin x}{x}', '0'],
	[MINF, '\\frac{\\cos x}{x}', '0'],
	[PINF, '\\frac{\\sin x}{x^2}', '0'],
	['0', 'x\\sin\\left(\\frac{1}{x}\\right)', '0'],
	['0', 'x^2\\cos\\left(\\frac{1}{x}\\right)', '0'],
	[PINF, '\\frac{2+\\sin x}{x}', '0'],
	[PINF, 'x(2+\\sin x)', '+inf'],
	[PINF, '\\frac{x+\\cos x}{x}', '1'],
	[PINF, 'e^{-x}\\sin x', '0'],
	[PINF, 'x^2-x\\cos x', '+inf'],
	[PINF, '\\frac{x+\\sin x}{x-\\cos x}', '1'],
	[PINF, '\\frac{\\sin(x^2)}{x}', '0'],
	[MINF, 'e^{x}\\cos x', '0'],
	[PINF, '\\sin\\left(\\frac{1}{x}\\right)', '0'],
	[PINF, 'x\\sin\\left(\\frac{1}{x}\\right)', '1'],
	// Borné de signe STRICT (2 + sin x ≥ 1) : la conclusion tient
	[PINF, 'e^x(2+\\sin x)', '+inf'],
	[PINF, 'x^2', '+inf'],
	[PINF, '\\frac{1+\\sin x}{x}', '0'],
	// Borné qui retombe à 0, mais × (→ 0) : la conclusion tient
	[PINF, 'e^{-x}(1+\\sin x)', '0'],
	// Borné de signe STRICT sous ln : x + ln(2 + sin x) → +∞
	[PINF, '\\ln(e^x(2+\\sin x))', '+inf']
]);

// Oscillantes : pas de limite
const oscillating = family('oscillantes sans limite', 'osc-', [
	[PINF, '\\sin x', 'none'],
	[PINF, '\\cos x', 'none'],
	[PINF, 'x\\sin x', 'none'],
	[MINF, 'x\\cos x', 'none'],
	['0', '\\sin\\left(\\frac{1}{x}\\right)', 'none'],
	['0^+', '\\cos\\left(\\frac{1}{x}\\right)', 'none'],
	[PINF, '\\sin(x^2)', 'none'],
	[PINF, 'e^{x}\\sin x', 'none'],
	[PINF, '\\tan x', 'none'],
	['0^+', '\\frac{1}{x}\\sin\\left(\\frac{1}{x}\\right)', 'none'],
	[PINF, 'x^2\\sin x', 'none'],
	[PINF, '\\sin x+\\cos x', 'none'],
	// Borné qui RETOMBE à 0 (1 + sin x ∈ [0, 2]) × ∞ : signe constant, mais la
	// fonction s'annule en −π/2 + 2kπ — pas de limite
	[PINF, 'x(1+\\sin x)', 'none'],
	[PINF, 'x^2(1+\\cos x)', 'none'],
	[PINF, 'e^x(1-\\sin x)', 'none'],
	[PINF, 'x+x\\sin x', 'none'],
	[PINF, '\\ln(x(1+\\sin x))', 'none'],
	[PINF, 'e^{x(1+\\sin x)}', 'none'],
	// eˣ(1 + sin x) déborde en 1e6 : le creux se mesure plus tôt (#930)
	[PINF, '\\ln(e^x(1+\\sin x))', 'none'],
	[PINF, '\\frac{1}{e^x(1+\\sin x)}', 'none'],
	[PINF, '\\sqrt{e^x(1+\\cos x)}', 'none'],
	// 1/(x(1 + sin x)) : petite aux échantillons, mais explose aux zéros du
	// dénominateur — ni 0 ni limite, et l'exp composée non plus
	[PINF, '\\frac{1}{x(1+\\sin x)}', 'none'],
	[PINF, 'e^{\\frac{1}{x(1+\\sin x)}}', 'none'],
	[PINF, '1+\\frac{1}{x(1+\\sin x)}', 'none']
]);

// Bords de domaine (limites à droite / à gauche seulement)
const domainEdges = family('bords de domaine', 'edge-', [
	['0^+', '\\sqrt{x}', '0'],
	['0^+', '\\frac{1}{\\sqrt{x}}', '+inf'],
	['1^+', '\\sqrt{x-1}', '0'],
	['1^+', '\\frac{1}{\\sqrt{x-1}}', '+inf'],
	['1^+', '\\ln(x-1)', '-inf'],
	['0', '\\ln(x^2)', '-inf'],
	['2^-', '\\sqrt{4-x^2}', '0'],
	['0^+', '\\frac{\\ln x}{\\sqrt{x}}', '-inf'],
	['1^+', '\\frac{\\sqrt{x-1}}{x-1}', '+inf'],
	['0^+', 'e^{-\\frac{1}{x}}', '0'],
	['0^+', '\\frac{x}{\\sqrt{x}}', '0'],
	['3^-', '\\ln(3-x)', '-inf'],
	['3^-', '\\frac{x}{\\sqrt{3-x}}', '+inf'],
	['-1^+', '\\sqrt{x+1}+x', '-1'],
	['0^+', '\\ln(\\sin x)', '-inf']
]);

// Formes indéterminées : 1^∞, ∞−∞, 0×∞
const indeterminateForms = family('formes indéterminées', 'ind-', [
	[PINF, '\\left(1+\\frac{1}{x}\\right)^x', 'e'],
	[MINF, '\\left(1+\\frac{1}{x}\\right)^x', 'e'],
	[PINF, '\\left(1+\\frac{2}{x}\\right)^x', 'e^2'],
	[PINF, '\\left(1-\\frac{1}{x}\\right)^x', 'e^{-1}'],
	['0', '(1+x)^{\\frac{1}{x}}', 'e'],
	['0', '(1+2x)^{\\frac{1}{x}}', 'e^2'],
	[PINF, '\\left(\\frac{x+1}{x-1}\\right)^x', 'e^2'],
	[PINF, '\\left(1+\\frac{1}{x^2}\\right)^x', '1'],
	[PINF, '\\left(1+\\frac{1}{x}\\right)^{x^2}', '+inf'],
	['1', 'x^{\\frac{1}{x-1}}', 'e'],
	[PINF, 'x^{\\frac{1}{x}}', '1'],
	['0^+', 'x^{x}', '1'],
	[PINF, 'x^2-x', '+inf'],
	[PINF, 'x-x^2', '-inf'],
	['0', '\\frac{1}{x}-\\frac{1}{\\sin x}', '0'],
	['0', '\\frac{1}{x}-\\frac{1}{e^x-1}', '\\frac{1}{2}'],
	['1', '\\frac{1}{x-1}-\\frac{2}{x^2-1}', '\\frac{1}{2}'],
	[PINF, 'x-\\ln(e^x+1)', '0'],
	[PINF, '\\sqrt{x^2+2x}-\\sqrt{x^2-2x}', '2'],
	['0^+', 'xe^{\\frac{1}{x}}', '+inf'],
	['0^-', 'xe^{\\frac{1}{x}}', '0'],
	[PINF, 'xe^{-\\sqrt{x}}', '0'],
	[PINF, 'x\\sin\\left(\\frac{2}{x}\\right)', '2'],
	[PINF, 'x\\left(\\ln(x+1)-\\ln x\\right)', '1'],
	['0^+', '\\sin(x)\\ln(x)', '0'],
	[PINF, '\\left(1+\\frac{3}{x}\\right)^{2x}', 'e^6']
]);

// Classiques du supérieur : compositions, développements limités
const classics = family('classiques du supérieur', 'sup-', [
	[PINF, '\\sqrt{\\frac{4x+1}{x}}', '2'],
	[PINF, 'e^{\\frac{x}{x+1}}', 'e'],
	[PINF, '\\ln\\left(\\frac{x^2}{x+1}\\right)', '+inf'],
	[MINF, '\\sqrt{\\frac{x^2+1}{4x^2}}', '\\frac{1}{2}'],
	['0', '\\cos\\left(\\frac{\\sin x}{x}\\right)', '\\cos(1)'],
	[PINF, 'xe^{-\\frac{1}{x}}-x', '-1'],
	[PINF, '(x+1)e^{\\frac{1}{x}}-x', '2'],
	['0', '\\frac{\\ln(\\cos x)}{x^2}', '-\\frac{1}{2}'],
	[PINF, '\\frac{\\ln(x+e^x)}{x}', '1'],
	['0^+', 'x^{\\sin x}', '1'],
	[PINF, '\\left(\\frac{x}{x+1}\\right)^{x}', 'e^{-1}'],
	['0', '\\frac{\\sin(\\sin x)}{x}', '1'],
	[PINF, '\\sqrt{x}\\left(\\sqrt{x+1}-\\sqrt{x}\\right)', '\\frac{1}{2}'],
	['0', '\\frac{e^{x^2}-1}{x^2}', '1'],
	['2', '\\frac{\\ln(x-1)}{x-2}', '1'],
	[PINF, 'x^2\\left(1-\\cos\\left(\\frac{1}{x}\\right)\\right)', '\\frac{1}{2}'],
	['0^+', '\\frac{e^{-\\frac{1}{x}}}{x}', '0'],
	[PINF, '\\frac{x^{100}}{e^{x}}', '0']
]);

// Saisies SANS parenthèses après `\lim`, relevées dans le contenu en
// production (2026-10-07) : depuis la décision du même jour, `\lim` porte sur
// toute l'expression qui suit. Le harnais construit `\lim_{x\to a} f` tel quel ;
// le test « portée de \lim » vérifie qu'aucune n'a besoin de parenthèses.
const unparenthesized = family('sans parenthèses', 'bare-', [
	[PINF, 'x^2+3x+1', '+inf'],
	[PINF, '3\\sqrt{x}', '+inf'],
	[PINF, '\\sqrt{x^2+1}-x', '0'],
	['0', '\\frac{\\sin x}{x}+1', '2'],
	['0', '1-\\frac{\\sin x}{x}', '0'],
	// 2 − 3/ln x (contenu réel) converge trop lentement pour l'échantillonnage :
	// testé à part (scope-without-parentheses.test.ts), remplacé ici par 3/√x
	[PINF, '2-\\dfrac{3}{x}', '2'],
	[PINF, '2-\\dfrac{3}{\\sqrt{x}}+\\frac{1}{x}', '2'],
	[PINF, '\\frac{1}{x+1}+\\frac{1}{x}', '0'],
	[PINF, '-2x^{3}+x', '-inf'],
	['0^+', '\\frac{1}{x}+\\frac{\\sin x}{x}', '+inf'],
	['0', '\\frac{e^x-1}{x}+\\cos x', '2'],
	['1', '\\frac{x^2-1}{x-1}-x', '1']
]);

// Variable grecque (contenu en production, 2026-10-07 :
// `\lim_{\alpha\to+\infty}\frac{\alpha+1}{\alpha+2}`). Le parseur refusait
// toute variable non latine (« Expected \to in limit subscript »).
const greekVariable: OracleFamily = {
	name: 'variable grecque',
	entries: [
		{
			id: 'greek-01',
			at: PINF,
			f: '\\frac{\\alpha+1}{\\alpha+2}',
			expected: '1',
			variable: 'alpha'
		},
		{
			id: 'greek-02',
			at: PINF,
			f: '\\ln\\frac{\\alpha+1}{\\alpha+2}',
			expected: '0',
			variable: 'alpha'
		},
		{
			id: 'greek-03',
			at: '0',
			f: '\\frac{\\sin\\theta}{\\theta}',
			expected: '1',
			variable: 'theta'
		}
	]
};

export const ORACLE_CORPUS: readonly OracleFamily[] = [
	polynomials,
	rationalAtInfinity,
	rationalAtPoles,
	roots,
	exponentials,
	logarithms,
	references,
	trigonometry,
	absoluteValue,
	bounded,
	oscillating,
	domainEdges,
	indeterminateForms,
	classics,
	unparenthesized,
	greekVariable
];

/**
 * Liste d'attente : entrées connues pour BOUCLER (ou dépasser le budget de
 * temps) — elles ne sont PAS exécutées, mais restent visibles ici et dans le
 * rapport de couverture. Une entrée en sort quand le moteur la traite vite.
 */
export const WAITING_LIST: readonly (OracleEntry & { readonly reason: string })[] = [
	{
		id: 'wait-01',
		at: PINF,
		f: '\\frac{x^{\\sqrt{2}}}{x^{\\sqrt{2}}+1}',
		expected: '1',
		reason: 'boucle infinie connue (exposant irrationnel)'
	},
	{
		id: 'wait-02',
		at: '0',
		f: '\\frac{2^x-1}{x}',
		expected: '\\ln 2',
		reason: 'boucle infinie constatée le 2026-10-06 (base numérique ≠ e)'
	}
];

/**
 * Variantes GÉNÉRÉES : g = 2 − 3·f pour chaque entrée du corpus (coefficient
 * ≠ 1 et négatif : un facteur oublié ou un signe perdu ne se voit pas avec
 * f seule). L'attendu se déduit de celui de f : L ↦ 2 − 3L, ±∞ ↦ ∓∞,
 * « pas de limite » reste « pas de limite ».
 */
export function scaledVariant(entry: OracleEntry): OracleEntry {
	const expected =
		entry.expected === 'none'
			? 'none'
			: entry.expected === '+inf'
				? '-inf'
				: entry.expected === '-inf'
					? '+inf'
					: `2-3\\left(${entry.expected}\\right)`;
	return {
		...entry,
		id: `${entry.id}~2-3f`,
		at: entry.at,
		f: `2-3\\left(${entry.f}\\right)`,
		expected
	};
}

export const GENERATED_VARIANTS: readonly OracleEntry[] = ORACLE_CORPUS.flatMap((family) =>
	family.entries.map(scaledVariant)
);
