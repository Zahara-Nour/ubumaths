/**
 * Oracle numérique des dérivées — les écarts CONNUS sur main (2026-10-06)
 *
 * ⚠️ Ces listes ne sont pas des tolérances : ce sont des DÉFAUTS constatés, à
 * corriger dans le moteur. Le test échoue :
 * - si une entrée listée devient juste → la retirer de la liste ;
 * - si une entrée non listée devient fausse → régression (ou nouveau défaut).
 *
 * Clé : `<id du corpus> @ <chemin>`. La valeur est une aide à la lecture (ce
 * qui a été obtenu) ; seules les CLÉS sont comparées.
 */

/**
 * VALEUR fausse — règles (a) calculé, (c) affiché relu, (d) étapes.
 * Détail : point, attendu numérique (différence finie de la référence), obtenu.
 */
export const KNOWN_WRONG: Readonly<Record<string, string>> = {};

/**
 * RÉSIDUS interdits dans le LaTeX rendu — règle (b). Valeur juste.
 * « nombres juxtaposés » : `3 3 x^2` (le défaut `3·3x²` vu par David), dans
 * les étapes ; « - - » : un paramètre négatif substitué derrière un signe.
 * Les 30 entrées constatées le 2026-10-06 sont corrigées au rendu
 * (`latex-generator` : croix entre deux chiffres, `-(-a)` sous un signe).
 */
export const KNOWN_RESIDUE: Readonly<Record<string, string>> = {};

/**
 * FORME différente de celle qu'on écrit en classe — règle (f). Valeur JUSTE.
 * La valeur est la forme rendue ; la forme attendue est `expected` du corpus.
 */
export const KNOWN_FORM_DIFF: Readonly<Record<string, string>> = {
	'rat-18 @ commande': '\\dfrac{2 \\left( -x^2 - 9 \\right)}{\\left( x^2 - 9 \\right)^2}',
	'rat-18 @ bouton': '\\dfrac{2 \\left( -x^2 - 9 \\right)}{\\left( x^2 - 9 \\right)^2}',
	'rat-18 @ carte': '\\dfrac{2 \\left( -x^2 - 9 \\right)}{\\left( x^2 - 9 \\right)^2}',
	'rac-06 @ latex-péda': '\\sqrt{x} + \\dfrac{x}{2 \\sqrt{x}}',
	'rac-06 @ commande': '\\sqrt{x} + \\dfrac{x}{2 \\sqrt{x}}',
	'rac-06 @ bouton': '\\sqrt{x} + \\dfrac{x}{2 \\sqrt{x}}',
	'rac-06 @ carte': '\\sqrt{x} + \\dfrac{x}{2 \\sqrt{x}}',
	'rac-07 @ latex-péda': '-\\dfrac{1}{2 \\sqrt{x}^3}',
	'rac-07 @ commande': '-\\dfrac{1}{2 \\sqrt{x}^3}',
	'rac-07 @ bouton': '-\\dfrac{1}{2 \\sqrt{x}^3}',
	'rac-07 @ carte': '-\\dfrac{1}{2 \\sqrt{x}^3}',
	'rac-08 @ commande': '\\dfrac{x^{-\\dfrac{2}{3}}}{3}',
	'rac-08 @ bouton': '\\dfrac{x^{-\\dfrac{2}{3}}}{3}',
	'rac-08 @ carte': '\\dfrac{x^{-\\dfrac{2}{3}}}{3}',
	'rac-10 @ commande': '\\dfrac{x^{-\\dfrac{3}{4}}}{4}',
	'rac-10 @ bouton': '\\dfrac{x^{-\\dfrac{3}{4}}}{4}',
	'rac-10 @ carte': '\\dfrac{x^{-\\dfrac{3}{4}}}{4}',
	'pow-01 @ latex-péda': '-\\dfrac{1}{x^2}',
	'pow-01 @ commande': '-\\dfrac{1}{x^2}',
	'pow-01 @ bouton': '-\\dfrac{1}{x^2}',
	'pow-01 @ carte': '-\\dfrac{1}{x^2}',
	'pow-02 @ latex-péda': '-\\dfrac{6}{x^3}',
	'pow-02 @ commande': '-\\dfrac{6}{x^3}',
	'pow-02 @ bouton': '-\\dfrac{6}{x^3}',
	'pow-02 @ carte': '-\\dfrac{6}{x^3}',
	'pow-06 @ latex-péda': '3 x^2 - \\dfrac{3}{x^4}',
	'pow-06 @ commande': '3 x^2 - \\dfrac{3}{x^4}',
	'pow-06 @ bouton': '3 x^2 - \\dfrac{3}{x^4}',
	'pow-06 @ carte': '3 x^2 - \\dfrac{3}{x^4}',
	'pow-07 @ latex-péda': '\\dfrac{5 x^{\\dfrac{3}{2}}}{2}',
	'pow-07 @ commande': '\\dfrac{5 x^{\\dfrac{3}{2}}}{2}',
	'pow-07 @ bouton': '\\dfrac{5 x^{\\dfrac{3}{2}}}{2}',
	'pow-07 @ carte': '\\dfrac{5 x^{\\dfrac{3}{2}}}{2}',
	'pow-08 @ latex-péda': '-\\dfrac{2}{\\left( 2 x + 1 \\right)^2}',
	'pow-08 @ commande': '-\\dfrac{2}{\\left( 2 x + 1 \\right)^2}',
	'pow-08 @ bouton': '-\\dfrac{2}{\\left( 2 x + 1 \\right)^2}',
	'pow-08 @ carte': '-\\dfrac{2}{\\left( 2 x + 1 \\right)^2}',
	'pow-10 @ latex-péda': '-\\dfrac{6}{\\left( 3 x - 1 \\right)^3}',
	'pow-10 @ commande': '-\\dfrac{6}{\\left( 3 x - 1 \\right)^3}',
	'pow-10 @ bouton': '-\\dfrac{6}{\\left( 3 x - 1 \\right)^3}',
	'pow-10 @ carte': '-\\dfrac{6}{\\left( 3 x - 1 \\right)^3}',
	'exp-14 @ latex-péda': '-\\dfrac{e^{\\dfrac{1}{x}}}{x^2}',
	'exp-14 @ commande': '-\\dfrac{\\exponentialE^{\\dfrac{1}{x}}}{x^2}',
	'exp-14 @ bouton': '-\\dfrac{e^{\\dfrac{1}{x}}}{x^2}',
	'exp-14 @ carte': '-\\dfrac{\\exponentialE^{\\dfrac{1}{x}}}{x^2}',
	'loga-05 @ latex-péda': '\\ln\\left( 2 \\right) \\times 2^x',
	'loga-05 @ commande': '\\ln\\left( 2 \\right) \\times 2^x',
	'loga-05 @ bouton': '\\ln\\left( 2 \\right) \\times 2^x',
	'loga-05 @ carte': '\\ln\\left( 2 \\right) \\times 2^x',
	'loga-06 @ latex-péda': '2 \\ln\\left( 3 \\right) \\times 3^{2 x}',
	'loga-06 @ commande': '2 \\ln\\left( 3 \\right) \\times 3^{2 x}',
	'loga-06 @ bouton': '2 \\ln\\left( 3 \\right) \\times 3^{2 x}',
	'loga-06 @ carte': '2 \\ln\\left( 3 \\right) \\times 3^{2 x}',
	'loga-07 @ latex-péda': '\\ln\\left( \\dfrac{1}{2} \\right) \\left( \\dfrac{1}{2} \\right)^x',
	'loga-07 @ commande': '\\ln\\left( \\dfrac{1}{2} \\right) \\left( \\dfrac{1}{2} \\right)^x',
	'loga-07 @ bouton': '\\ln\\left( \\dfrac{1}{2} \\right) \\left( \\dfrac{1}{2} \\right)^x',
	'loga-07 @ carte': '\\ln\\left( \\dfrac{1}{2} \\right) \\left( \\dfrac{1}{2} \\right)^x',
	'loga-08 @ latex-péda': '\\ln\\left( 10 \\right) \\times 10^x',
	'loga-08 @ commande': '\\ln\\left( 10 \\right) \\times 10^x',
	'loga-08 @ bouton': '\\ln\\left( 10 \\right) \\times 10^x',
	'loga-08 @ carte': '\\ln\\left( 10 \\right) \\times 10^x',
	'loga-09 @ latex-péda': '5 \\ln\\left( 2 \\right) \\times 2^x',
	'loga-09 @ commande': '5 \\ln\\left( 2 \\right) \\times 2^x',
	'loga-09 @ bouton': '5 \\ln\\left( 2 \\right) \\times 2^x',
	'loga-09 @ carte': '5 \\ln\\left( 2 \\right) \\times 2^x',
	'loga-10 @ latex-péda': '2 x \\ln\\left( 2 \\right) \\times 2^{x^2}',
	'loga-10 @ commande': '2 x \\ln\\left( 2 \\right) \\times 2^{x^2}',
	'loga-10 @ bouton': '2 x \\ln\\left( 2 \\right) \\times 2^{x^2}',
	'loga-10 @ carte': '2 x \\ln\\left( 2 \\right) \\times 2^{x^2}',
	'trig-03 @ latex-péda': '\\dfrac{1}{\\cos\\left( x \\right)^2}',
	'trig-03 @ commande': '\\dfrac{1}{\\cos\\left( x \\right)^2}',
	'trig-03 @ bouton': '\\dfrac{1}{\\cos\\left( x \\right)^2}',
	'trig-03 @ carte': '\\dfrac{1}{\\cos\\left( x \\right)^2}',
	'trig-11 @ latex-péda': '3 \\cos\\left( x \\right) \\sin\\left( x \\right)^2',
	'trig-11 @ commande': '3 \\cos\\left( x \\right) \\sin\\left( x \\right)^2',
	'trig-11 @ bouton': '3 \\cos\\left( x \\right) \\sin\\left( x \\right)^2',
	'trig-11 @ carte': '3 \\cos\\left( x \\right) \\sin\\left( x \\right)^2',
	'trig-12 @ latex-péda': '-3 \\cos\\left( x \\right)^2 \\sin\\left( x \\right)',
	'trig-18 @ latex-péda': '\\dfrac{2}{\\cos\\left( 2 x \\right)^2}',
	'trig-18 @ commande': '\\dfrac{2}{\\cos\\left( 2 x \\right)^2}',
	'trig-18 @ bouton': '\\dfrac{2}{\\cos\\left( 2 x \\right)^2}',
	'trig-18 @ carte': '\\dfrac{2}{\\cos\\left( 2 x \\right)^2}',
	'trig-19 @ latex-péda': '\\dfrac{2 \\tan\\left( x \\right)}{\\cos\\left( x \\right)^2}',
	'trig-19 @ commande': '\\dfrac{2 \\tan\\left( x \\right)}{\\cos\\left( x \\right)^2}',
	'trig-19 @ bouton': '\\dfrac{2 \\tan\\left( x \\right)}{\\cos\\left( x \\right)^2}',
	'trig-19 @ carte': '\\dfrac{2 \\tan\\left( x \\right)}{\\cos\\left( x \\right)^2}',
	'trig-21 @ latex-péda': '\\cos\\left( x \\right)^2 - \\sin\\left( x \\right)^2',
	'trig-21 @ commande': '\\cos\\left( x \\right)^2 - \\sin\\left( x \\right)^2',
	'trig-21 @ bouton': '\\cos\\left( x \\right)^2 - \\sin\\left( x \\right)^2',
	'trig-21 @ carte': '\\cos\\left( x \\right)^2 - \\sin\\left( x \\right)^2',
	'trig-22 @ latex-péda': '\\dfrac{\\sin\\left( x \\right)}{\\cos\\left( x \\right)^2}',
	'trig-22 @ commande': '\\dfrac{\\sin\\left( x \\right)}{\\cos\\left( x \\right)^2}',
	'trig-22 @ bouton': '\\dfrac{\\sin\\left( x \\right)}{\\cos\\left( x \\right)^2}',
	'trig-22 @ carte': '\\dfrac{\\sin\\left( x \\right)}{\\cos\\left( x \\right)^2}',
	'trig-25 @ latex-péda': '\\dfrac{\\cos\\left( \\dfrac{x}{2} \\right)}{2}',
	'trig-25 @ commande': '\\dfrac{\\cos\\left( \\dfrac{x}{2} \\right)}{2}',
	'trig-25 @ bouton': '\\dfrac{\\cos\\left( \\dfrac{x}{2} \\right)}{2}',
	'trig-25 @ carte': '\\dfrac{\\cos\\left( \\dfrac{x}{2} \\right)}{2}',
	'trig-29 @ latex-péda': '\\cos\\left( x \\right)^2 - \\sin\\left( x \\right)^2',
	'inv-08 @ latex-péda': '\\dfrac{\\dfrac{-1}{x^2}}{1 + \\dfrac{1}{x^2}}',
	'inv-08 @ commande': '\\dfrac{\\dfrac{-1}{x^2}}{1 + \\dfrac{1}{x^2}}',
	'inv-08 @ bouton': '\\dfrac{\\dfrac{-1}{x^2}}{1 + \\dfrac{1}{x^2}}',
	'inv-08 @ carte': '\\dfrac{\\dfrac{-1}{x^2}}{1 + \\dfrac{1}{x^2}}',
	'quot-07 @ latex-péda':
		'\\dfrac{-\\sin\\left( x \\right)^2 - \\cos\\left( x \\right)^2}{\\sin\\left( x \\right)^2}',
	'quot-07 @ commande':
		'\\dfrac{-\\sin\\left( x \\right)^2 - \\cos\\left( x \\right)^2}{\\sin\\left( x \\right)^2}',
	'quot-07 @ bouton':
		'\\dfrac{-\\sin\\left( x \\right)^2 - \\cos\\left( x \\right)^2}{\\sin\\left( x \\right)^2}',
	'quot-07 @ carte':
		'\\dfrac{-\\sin\\left( x \\right)^2 - \\cos\\left( x \\right)^2}{\\sin\\left( x \\right)^2}',
	'quot-08 @ latex-péda': '\\dfrac{2 \\sqrt{x} - \\dfrac{x}{\\sqrt{x}}}{\\sqrt{x}^2}',
	'quot-08 @ commande':
		'\\dfrac{2 \\left( \\sqrt{x} - \\dfrac{x}{2 \\sqrt{x}} \\right)}{\\sqrt{x}^2}',
	'quot-08 @ bouton':
		'\\dfrac{2 \\left( \\sqrt{x} - \\dfrac{x}{2 \\sqrt{x}} \\right)}{\\sqrt{x}^2}',
	'quot-08 @ carte': '\\dfrac{2 \\left( \\sqrt{x} - \\dfrac{x}{2 \\sqrt{x}} \\right)}{\\sqrt{x}^2}',
	'quot-13 @ latex-péda': '\\dfrac{\\ln\\left( x \\right) - 1}{\\ln\\left( x \\right)^2}',
	'quot-13 @ commande': '\\dfrac{\\ln\\left( x \\right) - 1}{\\ln\\left( x \\right)^2}',
	'quot-13 @ bouton': '\\dfrac{\\ln\\left( x \\right) - 1}{\\ln\\left( x \\right)^2}',
	'quot-13 @ carte': '\\dfrac{\\ln\\left( x \\right) - 1}{\\ln\\left( x \\right)^2}',
	'comp-12 @ latex-péda': '\\dfrac{e^x}{1 + \\left( e^x \\right)^2}',
	'comp-12 @ commande': '\\dfrac{\\exponentialE^x}{1 + \\left( \\exponentialE^x \\right)^2}',
	'comp-12 @ bouton': '\\dfrac{\\exponentialE^x}{1 + \\left( \\exponentialE^x \\right)^2}',
	'comp-12 @ carte': '\\dfrac{\\exponentialE^x}{1 + \\left( \\exponentialE^x \\right)^2}',
	'lit-05 @ commande': 'A ω \\cos\\left( t ω + φ \\right)',
	'lit-06 @ commande': '-A ω \\sin\\left( t ω \\right)',
	'lit-25 @ latex-péda': '\\dfrac{\\dfrac{1}{a}}{1 + \\dfrac{x^2}{a^2}}',
	'lit-25 @ commande': '\\dfrac{\\dfrac{1}{a}}{1 + \\dfrac{x^2}{a^2}}',
	'lit-30 @ latex-péda': 'a e^{-k x} - a k x e^{-k x}',
	'lit-30 @ commande': 'a \\exponentialE^{-k x} - a k x \\exponentialE^{-k x}',
	'lit-33 @ commande': '-ω \\sin\\left( t ω \\right)',
	'lit-51 @ latex-péda': '\\dfrac{a}{\\cos\\left( a x \\right)^2}',
	'lit-51 @ commande': '\\dfrac{a}{\\cos\\left( a x \\right)^2}'
};
