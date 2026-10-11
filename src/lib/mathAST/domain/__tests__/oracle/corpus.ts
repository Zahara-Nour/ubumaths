/**
 * Corpus de l'oracle du domaine : fonctions du programme saisies comme un
 * élève (LaTeX), domaine attendu ÉCRIT À LA MAIN.
 *
 * Notation de l'attendu (bornes en LaTeX) :
 * - `R`, `∅` ;
 * - intervalles `[a ; b[`, `]-oo ; b]`, `[a ; +oo[`, réunis par ` U ` ;
 * - points exclus en suffixe : `R \ {a ; b}` ou `]0 ; +oo[ \ {1}` ;
 * - périodique : `R \ {a + k T}` (exclus a + kT, k ∈ ℤ).
 *
 * Conventions (décidées ici, documentées dans `oracle.test.ts`) :
 * - x^{p/q}, p/q irréductible et q IMPAIR (décision du 2026-10-08) : (ᵠ√x)^p,
 *   ℝ si p > 0, ℝ* si p < 0, comme `\sqrt[3]{x}` : ℝ ;
 * - x^a, a non entier autre (q pair, décimal, irrationnel) : x ≥ 0 si a > 0,
 *   x > 0 si a < 0 (x^a = e^{a ln x}) ;
 * - tan, 1/sin, 1/cos : rendu `ℝ \ {a + k·T : k ∈ ℤ}` avec a, T exacts.
 */

export interface DomainEntry {
	readonly id: string;
	/** Fonction en LaTeX, telle qu'un élève la saisit. */
	readonly f: string;
	/** Domaine attendu (notation ci-dessus). */
	readonly expected: string;
}

export interface DomainFamily {
	readonly name: string;
	readonly entries: readonly DomainEntry[];
}

type Row = readonly [id: string, f: string, expected: string];

function family(name: string, rows: readonly Row[]): DomainFamily {
	return { name, entries: rows.map(([id, f, expected]) => ({ id, f, expected })) };
}

export const DOMAIN_CORPUS: readonly DomainFamily[] = [
	family('polynômes', [
		['poly-1', 'x^2-3x+2', 'R'],
		['poly-2', '\\frac{1}{2}x^3-x', 'R'],
		['poly-3', '(x-1)(x+2)', 'R'],
		['poly-4', '-3x+\\frac{2}{3}', 'R'],
		['poly-5', 'x^4-2x^2+1', 'R']
	]),
	family('rationnelles — pôles rationnels', [
		['rat-1', '\\frac{1}{x}', 'R \\ {0}'],
		['rat-2', '\\frac{1}{x-\\frac{1}{2}}', 'R \\ {\\frac{1}{2}}'],
		['rat-3', '\\frac{1}{x-1/2}', 'R \\ {\\frac{1}{2}}'],
		['rat-4', '\\frac{1}{3x-1}', 'R \\ {\\frac{1}{3}}'],
		['rat-5', '\\frac{2x+1}{x-3}', 'R \\ {3}'],
		['rat-6', '\\frac{x}{2x+5}', 'R \\ {-\\frac{5}{2}}'],
		['rat-7', '\\frac{1}{x^2-1}', 'R \\ {-1 ; 1}'],
		['rat-8', '\\frac{1}{x^2-4x+3}', 'R \\ {1 ; 3}'],
		['rat-9', '\\frac{1}{x^2+1}', 'R'],
		['rat-10', '\\frac{1}{(x-1)^2}', 'R \\ {1}'],
		['rat-11', '\\frac{x+1}{x^2-x}', 'R \\ {0 ; 1}'],
		['rat-12', '\\frac{1}{2x^2-x-1}', 'R \\ {-\\frac{1}{2} ; 1}'],
		['rat-13', '\\frac{1}{6x^2-5x+1}', 'R \\ {\\frac{1}{3} ; \\frac{1}{2}}'],
		['rat-14', '\\frac{3}{x^3-x}', 'R \\ {-1 ; 0 ; 1}'],
		['rat-15', '\\frac{1}{x^3-8}', 'R \\ {2}'],
		['rat-16', '\\frac{1}{x}+\\frac{1}{x-2}', 'R \\ {0 ; 2}'],
		['rat-17', '\\frac{x^2+1}{4x^2-9}', 'R \\ {-\\frac{3}{2} ; \\frac{3}{2}}'],
		['rat-18', '\\frac{1}{0.5x-1}', 'R \\ {2}'],
		['rat-19', '\\frac{1}{x+\\frac{3}{4}}', 'R \\ {-\\frac{3}{4}}'],
		['rat-20', '\\frac{5}{\\frac{x}{3}-1}', 'R \\ {3}'],
		['rat-21', '\\frac{1}{x^4-1}', 'R \\ {-1 ; 1}'],
		['rat-22', '\\frac{1}{x^2+x+1}', 'R'],
		['rat-23', '\\frac{x-1}{x^2-2x+1}', 'R \\ {1}'],
		['rat-24', '2x-1+\\frac{3}{x+1}', 'R \\ {-1}'],
		['rat-25', '\\frac{1}{(2x-1)(3x+2)}', 'R \\ {-\\frac{2}{3} ; \\frac{1}{2}}'],
		['rat-26', '\\frac{1}{x^4-5x^2+4}', 'R \\ {-2 ; -1 ; 1 ; 2}'],
		['rat-27', '(x-3)^{-1}', 'R \\ {3}'],
		['rat-28', 'x^{-2}', 'R \\ {0}'],
		['rat-29', '\\frac{1}{\\frac{1}{2}x+\\frac{1}{3}}', 'R \\ {-\\frac{2}{3}}'],
		['rat-30', '\\frac{x}{x}', 'R \\ {0}']
	]),
	family('rationnelles — pôles irrationnels', [
		['irr-1', '\\frac{1}{x^2-2}', 'R \\ {-\\sqrt{2} ; \\sqrt{2}}'],
		['irr-2', '\\frac{1}{2x^2-1}', 'R \\ {-\\frac{\\sqrt{2}}{2} ; \\frac{\\sqrt{2}}{2}}'],
		['irr-3', '\\frac{1}{x^2-x-1}', 'R \\ {\\frac{1-\\sqrt{5}}{2} ; \\frac{1+\\sqrt{5}}{2}}'],
		['irr-4', '\\frac{1}{x^2-3}', 'R \\ {-\\sqrt{3} ; \\sqrt{3}}'],
		['irr-5', '\\frac{1}{x^2-8}', 'R \\ {-2\\sqrt{2} ; 2\\sqrt{2}}'],
		['irr-6', '\\frac{1}{x^2-2x-1}', 'R \\ {1-\\sqrt{2} ; 1+\\sqrt{2}}'],
		['irr-7', '\\frac{1}{3x^2-1}', 'R \\ {-\\frac{\\sqrt{3}}{3} ; \\frac{\\sqrt{3}}{3}}'],
		['irr-8', '\\frac{x}{x^2+4x+1}', 'R \\ {-2-\\sqrt{3} ; -2+\\sqrt{3}}'],
		['irr-9', '\\frac{1}{(x-1)(x^2-5)}', 'R \\ {-\\sqrt{5} ; 1 ; \\sqrt{5}}'],
		['irr-10', '\\frac{1}{x^4-4}', 'R \\ {-\\sqrt{2} ; \\sqrt{2}}'],
		['irr-11', '\\frac{1}{x-\\sqrt{2}}', 'R \\ {\\sqrt{2}}'],
		[
			'irr-12',
			'\\frac{1}{x^2-\\frac{1}{2}}',
			'R \\ {-\\frac{\\sqrt{2}}{2} ; \\frac{\\sqrt{2}}{2}}'
		],
		['irr-13', '\\frac{1}{x^3-2x}', 'R \\ {-\\sqrt{2} ; 0 ; \\sqrt{2}}'],
		['irr-14', '\\frac{1}{4x^2-4x-1}', 'R \\ {\\frac{1-\\sqrt{2}}{2} ; \\frac{1+\\sqrt{2}}{2}}']
	]),
	family('racines carrées', [
		['sqrt-1', '\\sqrt{x}', '[0 ; +oo['],
		['sqrt-2', '\\sqrt{x-\\frac{1}{3}}', '[\\frac{1}{3} ; +oo['],
		['sqrt-3', '\\sqrt{3x-1}', '[\\frac{1}{3} ; +oo['],
		['sqrt-4', '\\sqrt{2-x}', ']-oo ; 2]'],
		['sqrt-5', '\\sqrt{5-2x}', ']-oo ; \\frac{5}{2}]'],
		['sqrt-6', '\\sqrt{x^2-1}', ']-oo ; -1] U [1 ; +oo['],
		['sqrt-7', '\\sqrt{1-x^2}', '[-1 ; 1]'],
		['sqrt-8', '\\sqrt{x^2+1}', 'R'],
		['sqrt-9', '\\sqrt{x^2-2}', ']-oo ; -\\sqrt{2}] U [\\sqrt{2} ; +oo['],
		['sqrt-10', '\\sqrt{x^2-x-6}', ']-oo ; -2] U [3 ; +oo['],
		['sqrt-11', '\\sqrt{-x^2+x+2}', '[-1 ; 2]'],
		['sqrt-12', '\\sqrt{(x-1)(x-4)}', ']-oo ; 1] U [4 ; +oo['],
		['sqrt-13', '\\sqrt{\\frac{x-1}{x+2}}', ']-oo ; -2[ U [1 ; +oo['],
		['sqrt-14', '\\sqrt{\\frac{1}{x}}', ']0 ; +oo['],
		['sqrt-15', '\\frac{1}{\\sqrt{x}}', ']0 ; +oo['],
		['sqrt-16', '\\frac{1}{\\sqrt{2x-1}}', ']\\frac{1}{2} ; +oo['],
		['sqrt-17', '\\sqrt{x}+\\sqrt{4-x}', '[0 ; 4]'],
		['sqrt-18', '\\sqrt{x}\\sqrt{x-1}', '[1 ; +oo['],
		['sqrt-19', '\\frac{\\sqrt{x}}{x-1}', '[0 ; 1[ U ]1 ; +oo['],
		['sqrt-20', '\\sqrt{-x}', ']-oo ; 0]'],
		['sqrt-21', '\\sqrt{x^2}', 'R'],
		['sqrt-22', '\\sqrt{-(x-1)^2}', '[1 ; 1]'],
		['sqrt-23', '\\sqrt{2x^2-1}', ']-oo ; -\\frac{\\sqrt{2}}{2}] U [\\frac{\\sqrt{2}}{2} ; +oo['],
		['sqrt-24', '\\sqrt{x^3-x}', '[-1 ; 0] U [1 ; +oo['],
		['sqrt-25', '\\sqrt{\\frac{x}{2}-\\frac{1}{4}}', '[\\frac{1}{2} ; +oo['],
		['sqrt-26', '\\sqrt{x-\\sqrt{2}}', '[\\sqrt{2} ; +oo['],
		['sqrt-27', '\\frac{x}{\\sqrt{x^2-4}}', ']-oo ; -2[ U ]2 ; +oo['],
		['sqrt-28', '\\sqrt{\\frac{2-x}{x}}', ']0 ; 2]'],
		[
			'sqrt-29',
			'\\sqrt{x^2-x-1}',
			']-oo ; \\frac{1-\\sqrt{5}}{2}] U [\\frac{1+\\sqrt{5}}{2} ; +oo['
		],
		['sqrt-30', '\\sqrt{4-x^2}+\\frac{1}{x}', '[-2 ; 0[ U ]0 ; 2]']
	]),
	family('racines n-ièmes (#925)', [
		['root-1', '\\sqrt[3]{x}', 'R'],
		['root-2', '\\sqrt[3]{x-1}', 'R'],
		['root-3', '\\sqrt[4]{x}', '[0 ; +oo['],
		['root-4', '\\sqrt[4]{x-2}', '[2 ; +oo['],
		['root-5', '\\sqrt[5]{x^2-1}', 'R'],
		['root-6', '\\sqrt[4]{1-x^2}', '[-1 ; 1]'],
		['root-7', '\\frac{1}{\\sqrt[3]{x}}', 'R \\ {0}'],
		['root-8', '\\sqrt[6]{3x-2}', '[\\frac{2}{3} ; +oo[']
	]),
	family('logarithmes', [
		['ln-1', '\\ln(x)', ']0 ; +oo['],
		['ln-2', '\\ln(x-\\frac{1}{2})', ']\\frac{1}{2} ; +oo['],
		['ln-3', '\\ln(2x-3)', ']\\frac{3}{2} ; +oo['],
		['ln-4', '\\ln(1-x)', ']-oo ; 1['],
		['ln-5', '\\ln(x^2)', 'R \\ {0}'],
		['ln-6', '\\ln(x^2-1)', ']-oo ; -1[ U ]1 ; +oo['],
		['ln-7', '\\ln(1-x^2)', ']-1 ; 1['],
		['ln-8', '\\ln(x^2+1)', 'R'],
		['ln-9', '\\ln(x^2-3x+2)', ']-oo ; 1[ U ]2 ; +oo['],
		['ln-10', '\\ln(-x^2+4)', ']-2 ; 2['],
		['ln-11', '\\ln\\left(\\frac{x-1}{x+2}\\right)', ']-oo ; -2[ U ]1 ; +oo['],
		['ln-12', '\\ln\\left(\\frac{1+x}{1-x}\\right)', ']-1 ; 1['],
		['ln-13', '\\ln(|x|)', 'R \\ {0}'],
		['ln-14', '\\ln(|x-2|)', 'R \\ {2}'],
		['ln-15', '\\ln(|x|-1)', ']-oo ; -1[ U ]1 ; +oo['],
		['ln-16', '\\frac{1}{\\ln(x)}', ']0 ; 1[ U ]1 ; +oo['],
		['ln-17', '\\frac{x}{\\ln(x)}', ']0 ; 1[ U ]1 ; +oo['],
		['ln-18', 'x\\ln(x)', ']0 ; +oo['],
		['ln-19', '\\ln(x)+\\ln(3-x)', ']0 ; 3['],
		['ln-20', '\\ln(x^2-2)', ']-oo ; -\\sqrt{2}[ U ]\\sqrt{2} ; +oo['],
		['ln-21', '\\ln(x^3)', ']0 ; +oo['],
		['ln-22', '\\ln(x)^2', ']0 ; +oo['],
		['ln-23', '\\log(x-5)', ']5 ; +oo['],
		['ln-24', '\\ln(\\frac{x}{2}+1)', ']-2 ; +oo['],
		['ln-25', '\\ln(x^2-x-1)', ']-oo ; \\frac{1-\\sqrt{5}}{2}[ U ]\\frac{1+\\sqrt{5}}{2} ; +oo['],
		['ln-26', '\\ln(e^x)', 'R'],
		['ln-27', '\\ln(e^x-1)', ']0 ; +oo['],
		['ln-28', '\\ln(x)-\\ln(x+1)', ']0 ; +oo['],
		['ln-29', '\\frac{\\ln(x)}{x}', ']0 ; +oo['],
		['ln-30', '\\ln(\\frac{1}{x})', ']0 ; +oo[']
	]),
	family('composées', [
		['comp-1', '\\sqrt{\\ln(x)}', '[1 ; +oo['],
		['comp-2', '\\ln(\\sqrt{x}-1)', ']1 ; +oo['],
		['comp-3', '\\ln(\\ln(x))', ']1 ; +oo['],
		['comp-4', '\\ln(\\sqrt{x})', ']0 ; +oo['],
		['comp-5', '\\sqrt{e^x-1}', '[0 ; +oo['],
		['comp-6', '\\sqrt{1-e^x}', ']-oo ; 0]'],
		['comp-7', '\\sqrt{\\ln(x-1)}', '[2 ; +oo['],
		['comp-8', '\\ln(2-\\sqrt{x})', '[0 ; 4['],
		['comp-9', '\\sqrt{|x|-2}', ']-oo ; -2] U [2 ; +oo['],
		['comp-10', '\\sqrt{\\sqrt{x}-1}', '[1 ; +oo['],
		['comp-11', '\\frac{1}{e^x-1}', 'R \\ {0}'],
		['comp-12', '\\frac{1}{\\sqrt{x}-2}', '[0 ; 4[ U ]4 ; +oo['],
		['comp-13', '\\cos(\\frac{1}{x-1})', 'R \\ {1}'],
		['comp-14', 'e^{\\sqrt{x}}', '[0 ; +oo['],
		['comp-15', '\\sqrt{x^2-4}+\\ln(x)', '[2 ; +oo['],
		['comp-16', '\\frac{1}{1-\\ln(x)}', ']0 ; e[ U ]e ; +oo['],
		['comp-17', '\\sqrt{2-|x|}', '[-2 ; 2]'],
		['comp-18', '\\ln(1+\\frac{1}{x})', ']-oo ; -1[ U ]0 ; +oo['],
		['comp-19', '\\sqrt{\\frac{1}{x}-1}', ']0 ; 1]'],
		['comp-20', '\\ln(|x^2-1|)', 'R \\ {-1 ; 1}']
	]),
	family('trigonométrie (domaines périodiques)', [
		['trig-1', '\\sin(x)', 'R'],
		['trig-2', '\\cos(2x+1)', 'R'],
		['trig-3', '\\tan(x)', 'R \\ {\\frac{\\pi}{2} + k \\pi}'],
		['trig-4', '\\tan(2x)', 'R \\ {\\frac{\\pi}{4} + k \\frac{\\pi}{2}}'],
		['trig-5', '\\tan(\\frac{x}{2})', 'R \\ {\\pi + k 2\\pi}'],
		['trig-6', '\\frac{1}{\\sin(x)}', 'R \\ {0 + k \\pi}'],
		['trig-7', '\\frac{1}{\\cos(x)}', 'R \\ {\\frac{\\pi}{2} + k \\pi}'],
		['trig-8', '\\frac{1}{\\sin(2x)}', 'R \\ {0 + k \\frac{\\pi}{2}}'],
		['trig-9', '\\frac{\\cos(x)}{\\sin(x)}', 'R \\ {0 + k \\pi}'],
		['trig-10', '\\frac{1}{\\cos(3x)}', 'R \\ {\\frac{\\pi}{6} + k \\frac{\\pi}{3}}'],
		['trig-11', '\\tan(x-1)', 'R \\ {1+\\frac{\\pi}{2} + k \\pi}'],
		['trig-12', '\\sqrt{\\sin(x)}', 'REFUS'],
		['trig-13', '\\frac{1}{\\sin(x)-\\frac{1}{2}}', 'REFUS'],
		['trig-14', '\\sin(\\frac{1}{x})', 'R \\ {0}'],
		['trig-15', '\\tan(x)+\\frac{1}{x}', 'REFUS']
	]),
	family('puissances fractionnaires (q impair : racine ; sinon x^a = e^{a ln x})', [
		['pow-1', 'x^{\\frac{1}{2}}', '[0 ; +oo['],
		['pow-2', 'x^{\\frac{1}{3}}', 'R'],
		['pow-3', 'x^{-\\frac{1}{2}}', ']0 ; +oo['],
		['pow-4', 'x^{1.5}', '[0 ; +oo['],
		['pow-5', '(x-1)^{\\frac{2}{3}}', 'R'],
		['pow-6', 'x^{\\sqrt{2}}', '[0 ; +oo['],
		['pow-7', 'x^x', ']0 ; +oo['],
		['pow-8', '(2x+1)^{\\frac{1}{4}}', '[-\\frac{1}{2} ; +oo['],
		['pow-9', 'x^{3}', 'R'],
		['pow-10', '(1-x)^{-\\frac{1}{3}}', 'R \\ {1}'],
		// Dénominateur impair : défini pour une base négative (2026-10-08)
		['pow-11', 'x^{\\frac{2}{3}}', 'R'],
		['pow-12', 'x^{-\\frac{1}{3}}', 'R \\ {0}'],
		['pow-13', '(2x-1)^{\\frac{1}{3}}', 'R'],
		['pow-14', 'x^{\\frac{4}{6}}', 'R'],
		['pow-15', '(x-1)^{\\frac{5}{3}}', 'R'],
		['pow-16', 'x^{-\\frac{2}{3}}', 'R \\ {0}'],
		['pow-17', '(x+2)^{-\\frac{1}{5}}', 'R \\ {-2}'],
		// Dénominateur pair, décimal : inchangés
		['pow-18', 'x^{\\frac{3}{4}}', '[0 ; +oo['],
		['pow-19', 'x^{\\frac{2}{6}}', 'R'],
		['pow-20', 'x^{0.2}', '[0 ; +oo['],
		['pow-21', 'x^{-\\frac{3}{2}}', ']0 ; +oo['],
		// Composées (revue du 2026-10-08)
		['pow-22', '\\ln(x^{\\frac{2}{3}})', 'R \\ {0}'],
		['pow-23', '(x^{\\frac{1}{3}})^{\\frac{1}{2}}', '[0 ; +oo['],
		['pow-24', '\\ln(x^{\\frac{1}{3}})', ']0 ; +oo['],
		['pow-25', 'x^{-\\frac{1}{13}}', 'R \\ {0}']
	]),
	family('exponentielles', [
		['exp-1', 'e^x', 'R'],
		['exp-2', 'e^{2x-1}', 'R'],
		['exp-3', '2^x', 'R'],
		['exp-4', 'xe^{-x}', 'R'],
		['exp-5', '\\frac{e^x}{x}', 'R \\ {0}'],
		['exp-6', '\\frac{1}{e^x+1}', 'R'],
		['exp-7', '\\exp(x^2)', 'R'],
		['exp-8', '\\frac{e^x-1}{x}', 'R \\ {0}'],
		['exp-9', '\\frac{1}{e^{2x}-1}', 'R \\ {0}'],
		['exp-10', 'e^{-\\frac{1}{x^2}}', 'R \\ {0}']
	]),
	family('valeur absolue', [
		['abs-1', '|x|', 'R'],
		['abs-2', '|2x-1|', 'R'],
		['abs-3', '\\frac{1}{|x|}', 'R \\ {0}'],
		['abs-4', '\\frac{1}{|x-3|}', 'R \\ {3}'],
		['abs-5', '\\frac{1}{|x|-1}', 'R \\ {-1 ; 1}'],
		['abs-6', '\\sqrt{|x|}', 'R'],
		['abs-7', '\\frac{x}{|x|}', 'R \\ {0}'],
		['abs-8', '\\sqrt{|x-1|-3}', ']-oo ; -2] U [4 ; +oo[']
	]),
	family('paramétriques (contrainte qui mêle x et un paramètre : refus)', [
		['param-1', '\\frac{1}{x-a}', 'REFUS'],
		['param-2', '\\sqrt{x-m}', 'REFUS'],
		['param-3', '\\ln(ax+1)', 'REFUS']
	]),
	family('trigonométrie réciproque', [
		['arc-1', '\\arcsin(x)', '[-1 ; 1]'],
		['arc-2', '\\arccos(2x)', '[-\\frac{1}{2} ; \\frac{1}{2}]'],
		['arc-3', '\\arcsin(x-1)', '[0 ; 2]'],
		['arc-4', '\\arctan(x)', 'R']
	])
];
