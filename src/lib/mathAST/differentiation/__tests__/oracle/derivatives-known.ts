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
export const KNOWN_WRONG: Readonly<Record<string, string>> = {
	'rac-08 @ latex-moteur':
		'« \\dfrac{1}{2 \\sqrt{x}} » — x=0.3 : attendu 0.74381439, obtenu 0.91287093',
	'rac-08 @ latex-péda':
		'« \\dfrac{1}{2 \\sqrt{x}} » — x=0.3 : attendu 0.74381439, obtenu 0.91287093',
	'rac-08 @ étapes':
		'derivative-of-sqrt : (\\sqrt[3]{x})′ → \\dfrac{1}{2 \\sqrt{x}} — x=0.3 : attendu 0.74381439, obtenu 0.91287093',
	'rac-09 @ latex-moteur':
		'« \\dfrac{2}{2 \\sqrt{2 x + 1}} » — x=0.3 : attendu 0.48733629, obtenu 0.79056942',
	'rac-09 @ latex-péda':
		'« \\dfrac{1}{\\sqrt{2 x + 1}} » — x=0.3 : attendu 0.48733629, obtenu 0.79056942',
	'rac-09 @ étapes':
		'sqrt : (\\sqrt[3]{2 x + 1})′ → \\dfrac{2}{2 \\sqrt{2 x + 1}} — x=0.3 : attendu 0.48733629, obtenu 0.79056942',
	'rac-10 @ latex-moteur':
		'« \\dfrac{1}{2 \\sqrt{x}} » — x=0.3 : attendu 0.61673567, obtenu 0.91287093',
	'rac-10 @ latex-péda':
		'« \\dfrac{1}{2 \\sqrt{x}} » — x=0.3 : attendu 0.61673567, obtenu 0.91287093',
	'rac-10 @ étapes':
		'derivative-of-sqrt : (\\sqrt[4]{x})′ → \\dfrac{1}{2 \\sqrt{x}} — x=0.3 : attendu 0.61673567, obtenu 0.91287093',
	'exp-15 @ bouton': '« i n s e^{i n s x} » — x=-2.3 : attendu -0.3160811, obtenu NaN',
	'exp-15 @ carte':
		'« c o s \\left( x \\right) e^{s i n \\left( x \\right)} » — x=-2.3 : attendu -0.3160811, obtenu NaN',
	'exp-16 @ bouton': '« q r s t e^{q r s t x} » — x=0.3 : attendu 1.5786369, obtenu NaN',
	'exp-16 @ carte':
		'« e^{s q r t \\left( x \\right)} / 2 s q r t \\left( x \\right) » — x=0.3 : attendu 1.5786369, obtenu NaN',
	'loga-05 @ latex-péda':
		'affiché illisible : \\ln\\left( 2 \\right) 2^x (Unexpected token in expression: 2)',
	'loga-05 @ commande':
		'affiché illisible : \\ln\\left( 2 \\right) 2^x (Unexpected token in expression: 2)',
	'loga-05 @ bouton':
		'affiché illisible : \\ln\\left( 2 \\right) 2^x (Unexpected token in expression: 2)',
	'loga-06 @ latex-péda':
		'affiché illisible : 2 \\ln\\left( 3 \\right) 3^{2 x} (Unexpected token in expression: 3)',
	'loga-06 @ commande':
		'affiché illisible : 2 \\ln\\left( 3 \\right) 3^{2 x} (Unexpected token in expression: 3)',
	'loga-06 @ bouton':
		'affiché illisible : 2 \\ln\\left( 3 \\right) 3^{2 x} (Unexpected token in expression: 3)',
	'loga-06 @ carte':
		'« 2 l n \\left( 3 \\right) * 3^{2 x} » — x=-2.3 : attendu 0.014031906, obtenu NaN',
	'loga-08 @ latex-péda':
		'affiché illisible : \\ln\\left( 10 \\right) 10^x (Unexpected token in expression: 10)',
	'loga-08 @ commande':
		'affiché illisible : \\ln\\left( 10 \\right) 10^x (Unexpected token in expression: 10)',
	'loga-08 @ bouton':
		'affiché illisible : \\ln\\left( 10 \\right) 10^x (Unexpected token in expression: 10)',
	'loga-09 @ latex-péda':
		'affiché illisible : 5 \\ln\\left( 2 \\right) 2^x (Unexpected token in expression: 2)',
	'loga-09 @ commande':
		'affiché illisible : 5 \\ln\\left( 2 \\right) 2^x (Unexpected token in expression: 2)',
	'loga-09 @ bouton':
		'affiché illisible : 5 \\ln\\left( 2 \\right) 2^x (Unexpected token in expression: 2)',
	'loga-10 @ latex-péda':
		'affiché illisible : 2 x \\ln\\left( 2 \\right) 2^{x^2} (Unexpected token in expression: 2)',
	'loga-10 @ commande':
		'affiché illisible : 2 x \\ln\\left( 2 \\right) 2^{x^2} (Unexpected token in expression: 2)',
	'loga-10 @ bouton':
		'affiché illisible : 2 x \\ln\\left( 2 \\right) 2^{x^2} (Unexpected token in expression: 2)',
	'loga-10 @ carte':
		'« 2 x l n \\left( 2 \\right) * 2^{x^2} » — x=-2.3 : attendu -124.74753, obtenu NaN',
	'trig-16 @ commande': '« 3 c o s » — x=-2.3 : attendu -0.50335821, obtenu NaN',
	'trig-23 @ commande': '« \\pi i n s » — x=-2.3 : attendu 1.8465818, obtenu NaN',
	'trig-26 @ latex-péda':
		'« \\dfrac{\\sin\\left( x \\right)}{\\cos\\left( x \\right)^2} » — x=-0.85 : attendu -1.898316, obtenu -1.7247906',
	'trig-27 @ latex-péda':
		'« -\\dfrac{\\cos\\left( x \\right)}{\\sin\\left( x \\right)^2} » — x=-0.85 : attendu 1.898316, obtenu -1.1693075',
	'trig-28 @ latex-péda':
		'« -\\dfrac{1}{\\cos\\left( x \\right)^2 \\tan\\left( x \\right)^2} » — x=-2.3 : attendu 0.15898251, obtenu -1.7983145',
	'prod-07 @ bouton':
		'« -2 c o s x e^{-x} + 2 c o s e^{-x} » — x=-2.3 : attendu -18.703881, obtenu NaN',
	'prod-07 @ carte':
		'« -c o s \\left( 2 x \\right) e^{-x} - 2 s i n \\left( 2 x \\right) e^{-x} » — x=-2.3 : attendu -18.703881, obtenu NaN',
	'comp-02 @ bouton': '« 2 c o s e^{2 c o s x} » — x=-2.3 : attendu -1.7765365, obtenu NaN',
	'comp-02 @ carte':
		'« -2 s i n \\left( 2 x \\right) e^{c o s \\left( 2 x \\right)} » — x=-2.3 : attendu -1.7765365, obtenu NaN',
	'comp-15 @ commande':
		'« -\\dfrac{2 \\pi q r t x e^{-\\dfrac{x^2}{2}}}{s} » — x=-2.3 : attendu 0.065152187, obtenu NaN',
	'lit-12 @ bouton':
		'affiché illisible : \\ln\\left( 3 \\right) 3^x (Unexpected token in expression: 3)',
	'lit-39 @ bouton':
		'affiché illisible : 2 \\ln\\left( 3 \\right) 3^{2 x} (Unexpected token in expression: 3)',
	'lit-39 @ carte':
		'« 2 l n \\left( 3 \\right) * 3^{2 x} » — x=-2.3 [a=3] : attendu 0.014031906, obtenu NaN',
	'lit-45 @ bouton':
		'« -6 i n s x e^{3 x} - 2 i n s e^{3 x} » — x=-2.3 [a=3, b=-2] : attendu -0.0027782306, obtenu NaN',
	'lit-45 @ carte':
		'« 3 s i n \\left( -2 x \\right) e^{3 x} + \\left( -2 c o s \\left( -2 x \\right) e^{3 x} \\right) » — x=-2.3 [a=3, b=-2] : attendu -0.0027782306, obtenu NaN'
};

/**
 * RÉSIDUS interdits dans le LaTeX rendu — règle (b). Valeur juste.
 * « nombres juxtaposés » : `3 3 x^2` (le défaut `3·3x²` vu par David), dans
 * les étapes ; « - - » : un paramètre négatif substitué derrière un signe.
 */
export const KNOWN_RESIDUE: Readonly<Record<string, string>> = {
	'poly-02 @ étapes': 'nombres juxtaposés',
	'poly-03 @ étapes': 'nombres juxtaposés',
	'poly-04 @ étapes': 'nombres juxtaposés',
	'poly-05 @ étapes': 'nombres juxtaposés',
	'poly-08 @ étapes': 'nombres juxtaposés',
	'poly-11 @ étapes': 'nombres juxtaposés',
	'poly-17 @ étapes': 'nombres juxtaposés',
	'poly-18 @ étapes': 'nombres juxtaposés',
	'poly-19 @ étapes': 'nombres juxtaposés',
	'poly-20 @ étapes': 'nombres juxtaposés',
	'poly-22 @ étapes': 'nombres juxtaposés',
	'poly-27 @ étapes': 'nombres juxtaposés',
	'poly-33 @ étapes': 'nombres juxtaposés',
	'poly-34 @ étapes': 'nombres juxtaposés',
	'poly-35 @ étapes': 'nombres juxtaposés',
	'rat-07 @ étapes': 'nombres juxtaposés',
	'rat-13 @ étapes': '- -',
	'rat-16 @ étapes': 'nombres juxtaposés',
	'exp-12 @ étapes': 'nombres juxtaposés',
	'loga-09 @ étapes': 'nombres juxtaposés',
	'trig-22 @ étapes': '- -',
	'trig-24 @ étapes': '- -',
	'trig-30 @ étapes': 'nombres juxtaposés',
	'prod-09 @ étapes': 'nombres juxtaposés',
	'quot-09 @ étapes': '- -',
	't-02 @ étapes': 'nombres juxtaposés',
	't-10 @ étapes': 'nombres juxtaposés',
	'lit-30 @ carte': '- -',
	'lit-37 @ carte': '- -',
	'lit-53 @ carte': '- -'
};

/**
 * FORME différente de celle qu'on écrit en classe — règle (f). Valeur JUSTE.
 * La valeur est la forme rendue ; la forme attendue est `expected` du corpus.
 */
export const KNOWN_FORM_DIFF: Readonly<Record<string, string>> = {
	'poly-11 @ latex-péda': 'x - \\dfrac{3}{2}',
	'poly-11 @ commande': 'x - \\dfrac{3}{2}',
	'poly-11 @ bouton': 'x - \\dfrac{3}{2}',
	'poly-11 @ carte': 'x - \\dfrac{3}{2}',
	'rat-04 @ commande': '\\dfrac{x - 1 - \\left( x + 1 \\right)}{\\left( x - 1 \\right)^2}',
	'rat-04 @ bouton': '\\dfrac{x - 1 - \\left( x + 1 \\right)}{\\left( x - 1 \\right)^2}',
	'rat-04 @ carte': '\\dfrac{x - 1 - \\left( x + 1 \\right)}{\\left( x - 1 \\right)^2}',
	'rat-05 @ latex-péda':
		'\\dfrac{2 \\left( x - 3 \\right) - \\left( 2 x + 1 \\right)}{\\left( x - 3 \\right)^2}',
	'rat-05 @ commande':
		'\\dfrac{2 \\left( x - 3 \\right) - \\left( 2 x + 1 \\right)}{\\left( x - 3 \\right)^2}',
	'rat-05 @ bouton':
		'\\dfrac{2 \\left( x - 3 \\right) - \\left( 2 x + 1 \\right)}{\\left( x - 3 \\right)^2}',
	'rat-05 @ carte':
		'\\dfrac{2 \\left( x - 3 \\right) - \\left( 2 x + 1 \\right)}{\\left( x - 3 \\right)^2}',
	'rat-08 @ latex-péda': '\\dfrac{2 x \\left( x + 1 \\right) - x^2}{\\left( x + 1 \\right)^2}',
	'rat-08 @ commande': '\\dfrac{2 x \\left( x + 1 \\right) - x^2}{\\left( x + 1 \\right)^2}',
	'rat-08 @ bouton': '\\dfrac{2 x \\left( x + 1 \\right) - x^2}{\\left( x + 1 \\right)^2}',
	'rat-08 @ carte': '\\dfrac{2 x \\left( x + 1 \\right) - x^2}{\\left( x + 1 \\right)^2}',
	'rat-12 @ latex-péda':
		'\\dfrac{3 \\left( 2 x + 5 \\right) - 2 \\left( 3 x - 1 \\right)}{\\left( 2 x + 5 \\right)^2}',
	'rat-12 @ commande':
		'\\dfrac{3 \\left( 2 x + 5 \\right) - 2 \\left( 3 x - 1 \\right)}{\\left( 2 x + 5 \\right)^2}',
	'rat-12 @ bouton':
		'\\dfrac{3 \\left( 2 x + 5 \\right) - 2 \\left( 3 x - 1 \\right)}{\\left( 2 x + 5 \\right)^2}',
	'rat-12 @ carte':
		'\\dfrac{3 \\left( 2 x + 5 \\right) - 2 \\left( 3 x - 1 \\right)}{\\left( 2 x + 5 \\right)^2}',
	'rat-14 @ latex-péda':
		'\\dfrac{2 x \\left( x^2 + 1 \\right) - 2 x \\left( x^2 - 1 \\right)}{\\left( x^2 + 1 \\right)^2}',
	'rat-14 @ commande':
		'\\dfrac{2 x \\left( x^2 + 1 \\right) - 2 x \\left( x^2 - 1 \\right)}{\\left( x^2 + 1 \\right)^2}',
	'rat-14 @ bouton':
		'\\dfrac{2 x \\left( x^2 + 1 \\right) - 2 x \\left( x^2 - 1 \\right)}{\\left( x^2 + 1 \\right)^2}',
	'rat-14 @ carte':
		'\\dfrac{2 x \\left( x^2 + 1 \\right) - 2 x \\left( x^2 - 1 \\right)}{\\left( x^2 + 1 \\right)^2}',
	'rat-18 @ latex-péda': '\\dfrac{2 \\left( x^2 - 9 \\right) - 4 x^2}{\\left( x^2 - 9 \\right)^2}',
	'rat-18 @ commande': '\\dfrac{2 \\left( -x^2 - 9 \\right)}{\\left( x^2 - 9 \\right)^2}',
	'rat-18 @ bouton': '\\dfrac{2 \\left( -x^2 - 9 \\right)}{\\left( x^2 - 9 \\right)^2}',
	'rat-18 @ carte': '\\dfrac{2 \\left( -x^2 - 9 \\right)}{\\left( x^2 - 9 \\right)^2}',
	'rat-19 @ commande':
		'\\dfrac{-\\left( x + 1 \\right) - \\left( 1 - x \\right)}{\\left( x + 1 \\right)^2}',
	'rat-19 @ bouton':
		'\\dfrac{-\\left( x + 1 \\right) - \\left( 1 - x \\right)}{\\left( x + 1 \\right)^2}',
	'rat-19 @ carte':
		'\\dfrac{-\\left( x + 1 \\right) - \\left( 1 - x \\right)}{\\left( x + 1 \\right)^2}',
	'rat-21 @ latex-péda': '\\dfrac{x \\left( 2 x + 1 \\right) - \\left( x^2 + x + 1 \\right)}{x^2}',
	'rat-21 @ commande': '\\dfrac{x \\left( 2 x + 1 \\right) - \\left( x^2 + x + 1 \\right)}{x^2}',
	'rat-21 @ bouton': '\\dfrac{x \\left( 2 x + 1 \\right) - \\left( x^2 + x + 1 \\right)}{x^2}',
	'rat-21 @ carte': '\\dfrac{x \\left( 2 x + 1 \\right) - \\left( x^2 + x + 1 \\right)}{x^2}',
	'rat-22 @ latex-péda': '\\dfrac{-2 x - 1}{\\left( x^2 + x + 1 \\right)^2}',
	'rat-22 @ commande': '\\dfrac{-2 x - 1}{\\left( x^2 + x + 1 \\right)^2}',
	'rat-22 @ bouton': '\\dfrac{-2 x - 1}{\\left( x^2 + x + 1 \\right)^2}',
	'rat-22 @ carte': '\\dfrac{-2 x - 1}{\\left( x^2 + x + 1 \\right)^2}',
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
	'rac-08 @ carte': 'x^{-2 / 3} / 3',
	'pow-01 @ latex-péda': '-\\dfrac{1}{x^2}',
	'pow-01 @ commande': '-\\dfrac{1}{x^2}',
	'pow-01 @ bouton': '-\\dfrac{1}{x^2}',
	'pow-01 @ carte': '-\\dfrac{1}{x^2}',
	'pow-02 @ latex-péda': '-\\dfrac{6}{x^3}',
	'pow-02 @ commande': '-\\dfrac{6}{x^3}',
	'pow-02 @ bouton': '-\\dfrac{6}{x^3}',
	'pow-02 @ carte': '-\\dfrac{6}{x^3}',
	'pow-03 @ carte': '3 x^{1 / 2} / 2',
	'pow-04 @ carte': 'x^{-1 / 2} / 2',
	'pow-05 @ carte': '3 x^{-1 / 4}',
	'pow-06 @ latex-péda': '3 x^2 - \\dfrac{3}{x^4}',
	'pow-06 @ commande': '3 x^2 - \\dfrac{3}{x^4}',
	'pow-06 @ bouton': '3 x^2 - \\dfrac{3}{x^4}',
	'pow-06 @ carte': '3 x^2 - \\dfrac{3}{x^4}',
	'pow-07 @ latex-péda': '\\dfrac{5 x^{\\dfrac{3}{2}}}{2}',
	'pow-07 @ commande': '\\dfrac{5 x^{\\dfrac{3}{2}}}{2}',
	'pow-07 @ bouton': '\\dfrac{5 x^{\\dfrac{3}{2}}}{2}',
	'pow-07 @ carte': '5 x^{3 / 2} / 2',
	'pow-08 @ latex-péda': '-\\dfrac{2}{\\left( 2 x + 1 \\right)^2}',
	'pow-08 @ commande': '-\\dfrac{2}{\\left( 2 x + 1 \\right)^2}',
	'pow-08 @ bouton': '-\\dfrac{2}{\\left( 2 x + 1 \\right)^2}',
	'pow-08 @ carte': '-\\dfrac{2}{\\left( 2 x + 1 \\right)^2}',
	'pow-10 @ latex-péda': '-\\dfrac{6}{\\left( 3 x - 1 \\right)^3}',
	'pow-10 @ commande': '-\\dfrac{6}{\\left( 3 x - 1 \\right)^3}',
	'pow-10 @ bouton': '-\\dfrac{6}{\\left( 3 x - 1 \\right)^3}',
	'pow-10 @ carte': '-\\dfrac{6}{\\left( 3 x - 1 \\right)^3}',
	'pow-11 @ carte': '-x^{-3 / 2} / 2',
	'pow-12 @ carte': '2 x^{-3 / 5}',
	'exp-13 @ carte': 'e^{x / 2} / 2',
	'exp-14 @ latex-péda': '-\\dfrac{e^{\\dfrac{1}{x}}}{x^2}',
	'exp-14 @ commande': '-\\dfrac{\\exponentialE^{\\dfrac{1}{x}}}{x^2}',
	'exp-14 @ bouton': '-\\dfrac{e^{\\dfrac{1}{x}}}{x^2}',
	'exp-14 @ carte': '-e^{1 / x} / x^2',
	'exp-18 @ latex-péda': '2 \\left( e^x \\right)^2',
	'exp-18 @ commande': '2 \\left( \\exponentialE^x \\right)^2',
	'exp-18 @ bouton': '2 \\left( \\exponentialE^x \\right)^2',
	'exp-18 @ carte': '2 \\left( \\exponentialE^x \\right)^2',
	'exp-19 @ carte': '\\left( e^x - e^{-x} \\right) / 2',
	'exp-22 @ latex-péda': 'e^{\\dfrac{x}{2}}',
	'exp-22 @ commande': '\\exponentialE^{\\dfrac{x}{2}}',
	'exp-22 @ bouton': 'e^{\\dfrac{x}{2}}',
	'exp-22 @ carte': 'e^{x / 2}',
	'ln-12 @ latex-péda': '\\dfrac{\\dfrac{1}{x}}{\\ln\\left( x \\right)}',
	'ln-12 @ commande': '\\dfrac{\\dfrac{1}{x}}{\\ln\\left( x \\right)}',
	'ln-12 @ bouton': '\\dfrac{\\dfrac{1}{x}}{\\ln\\left( x \\right)}',
	'ln-12 @ carte': '\\dfrac{\\dfrac{1}{x}}{\\ln\\left( x \\right)}',
	'ln-17 @ latex-péda': '\\dfrac{1}{2 \\sqrt{x}^2}',
	'ln-17 @ commande': '\\dfrac{1}{2 \\sqrt{x}^2}',
	'ln-17 @ bouton': '\\dfrac{1}{2 \\sqrt{x}^2}',
	'ln-17 @ carte': '\\dfrac{1}{2 \\sqrt{x}^2}',
	'loga-05 @ carte': '\\ln\\left( 2 \\right) \\times 2^x',
	'loga-07 @ latex-péda': '\\ln\\left( \\dfrac{1}{2} \\right) \\left( \\dfrac{1}{2} \\right)^x',
	'loga-07 @ commande': '\\ln\\left( \\dfrac{1}{2} \\right) \\left( \\dfrac{1}{2} \\right)^x',
	'loga-07 @ bouton': '\\ln\\left( \\dfrac{1}{2} \\right) \\left( \\dfrac{1}{2} \\right)^x',
	'loga-07 @ carte': '\\ln\\left( \\dfrac{1}{2} \\right) \\left( \\dfrac{1}{2} \\right)^x',
	'loga-08 @ carte': '\\ln\\left( 10 \\right) \\times 10^x',
	'loga-09 @ carte': '5 \\ln\\left( 2 \\right) \\times 2^x',
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
	'prod-01 @ latex-péda': 'e^x + x e^x',
	'prod-01 @ commande': '\\exponentialE^x + x \\exponentialE^x',
	'prod-01 @ bouton': '\\exponentialE^x + x \\exponentialE^x',
	'prod-01 @ carte': '\\exponentialE^x + x \\exponentialE^x',
	'prod-02 @ latex-péda': '2 e^x + \\left( 2 x + 1 \\right) e^x',
	'prod-02 @ commande': '2 \\exponentialE^x + \\left( 2 x + 1 \\right) \\exponentialE^x',
	'prod-02 @ bouton': '2 \\exponentialE^x + \\left( 2 x + 1 \\right) \\exponentialE^x',
	'prod-02 @ carte': '2 \\exponentialE^x + \\left( 2 x + 1 \\right) \\exponentialE^x',
	'prod-03 @ latex-péda': '2 x e^{-x} - x^2 e^{-x}',
	'prod-03 @ commande': '2 x \\exponentialE^{-x} - x^2 \\exponentialE^{-x}',
	'prod-03 @ bouton': '2 x e^{-x} - x^2 e^{-x}',
	'prod-03 @ carte': '2 x e^{-x} - x^2 e^{-x}',
	'prod-06 @ latex-péda': '\\sin\\left( x \\right) e^x + \\cos\\left( x \\right) e^x',
	'prod-06 @ commande':
		'\\sin\\left( x \\right) \\exponentialE^x + \\cos\\left( x \\right) \\exponentialE^x',
	'prod-06 @ bouton':
		'\\sin\\left( x \\right) \\exponentialE^x + \\cos\\left( x \\right) \\exponentialE^x',
	'prod-06 @ carte':
		'\\sin\\left( x \\right) \\exponentialE^x + \\cos\\left( x \\right) \\exponentialE^x',
	'prod-11 @ latex-péda': '2 x e^{2 x} + 2 e^{2 x} \\left( x^2 + 1 \\right)',
	'prod-11 @ commande':
		'2 x \\exponentialE^{2 x} + 2 \\exponentialE^{2 x} \\left( x^2 + 1 \\right)',
	'prod-11 @ bouton': '2 x e^{2 x} + 2 e^{2 x} \\left( x^2 + 1 \\right)',
	'prod-11 @ carte': '2 x e^{2 x} + 2 e^{2 x} \\left( x^2 + 1 \\right)',
	'prod-12 @ latex-péda': '3 e^{-2 x} - 6 x e^{-2 x}',
	'prod-12 @ commande': '3 \\exponentialE^{-2 x} - 6 x \\exponentialE^{-2 x}',
	'prod-12 @ bouton': '3 e^{-2 x} - 6 x e^{-2 x}',
	'prod-12 @ carte': '3 e^{-2 x} - 6 x e^{-2 x}',
	'prod-14 @ latex-péda': '3 x^2 e^x + x^3 e^x',
	'prod-14 @ commande': '3 x^2 \\exponentialE^x + x^3 \\exponentialE^x',
	'prod-14 @ bouton': '3 x^2 \\exponentialE^x + x^3 \\exponentialE^x',
	'prod-14 @ carte': '3 x^2 \\exponentialE^x + x^3 \\exponentialE^x',
	'prod-15 @ latex-péda': '\\left( 1 - x \\right) e^x - e^x',
	'prod-15 @ commande': '\\left( 1 - x \\right) \\exponentialE^x - \\exponentialE^x',
	'prod-15 @ bouton': '\\left( 1 - x \\right) \\exponentialE^x - \\exponentialE^x',
	'prod-15 @ carte': '\\left( 1 - x \\right) \\exponentialE^x - \\exponentialE^x',
	'prod-20 @ latex-péda': '4 \\left( x - 3 \\right) + 4 x',
	'prod-20 @ commande': '4 \\left( x - 3 \\right) + 4 x',
	'prod-20 @ bouton': '4 \\left( x - 3 \\right) + 4 x',
	'prod-20 @ carte': '4 \\left( x - 3 \\right) + 4 x',
	'quot-01 @ latex-péda': '\\dfrac{x e^x - e^x}{x^2}',
	'quot-01 @ commande': '\\dfrac{x \\exponentialE^x - \\exponentialE^x}{x^2}',
	'quot-01 @ bouton': '\\dfrac{x \\exponentialE^x - \\exponentialE^x}{x^2}',
	'quot-01 @ carte': '\\dfrac{x \\exponentialE^x - \\exponentialE^x}{x^2}',
	'quot-02 @ latex-péda': '\\dfrac{e^x - x e^x}{\\left( e^x \\right)^2}',
	'quot-02 @ commande':
		'\\dfrac{\\exponentialE^x - x \\exponentialE^x}{\\left( \\exponentialE^x \\right)^2}',
	'quot-02 @ bouton':
		'\\dfrac{\\exponentialE^x - x \\exponentialE^x}{\\left( \\exponentialE^x \\right)^2}',
	'quot-02 @ carte':
		'\\dfrac{\\exponentialE^x - x \\exponentialE^x}{\\left( \\exponentialE^x \\right)^2}',
	'quot-04 @ latex-péda':
		'\\dfrac{e^x \\left( e^x + 1 \\right) - \\left( e^x \\right)^2}{\\left( e^x + 1 \\right)^2}',
	'quot-04 @ commande':
		'\\dfrac{\\exponentialE^x \\left( \\exponentialE^x + 1 \\right) - \\left( \\exponentialE^x \\right)^2}{\\left( \\exponentialE^x + 1 \\right)^2}',
	'quot-04 @ bouton':
		'\\dfrac{\\exponentialE^x \\left( \\exponentialE^x + 1 \\right) - \\left( \\exponentialE^x \\right)^2}{\\left( \\exponentialE^x + 1 \\right)^2}',
	'quot-04 @ carte':
		'\\dfrac{\\exponentialE^x \\left( \\exponentialE^x + 1 \\right) - \\left( \\exponentialE^x \\right)^2}{\\left( \\exponentialE^x + 1 \\right)^2}',
	'quot-05 @ latex-péda': '\\dfrac{x - 2 x \\ln\\left( x \\right)}{x^4}',
	'quot-05 @ commande': '\\dfrac{x - 2 x \\ln\\left( x \\right)}{x^4}',
	'quot-05 @ bouton': '\\dfrac{x - 2 x \\ln\\left( x \\right)}{x^4}',
	'quot-05 @ carte': '\\dfrac{x - 2 x \\ln\\left( x \\right)}{x^4}',
	'quot-06 @ latex-péda':
		'\\dfrac{2 x \\left( x - 1 \\right) - \\left( x^2 + 3 \\right)}{\\left( x - 1 \\right)^2}',
	'quot-06 @ commande':
		'\\dfrac{2 x \\left( x - 1 \\right) - \\left( x^2 + 3 \\right)}{\\left( x - 1 \\right)^2}',
	'quot-06 @ bouton':
		'\\dfrac{2 x \\left( x - 1 \\right) - \\left( x^2 + 3 \\right)}{\\left( x - 1 \\right)^2}',
	'quot-06 @ carte':
		'\\dfrac{2 x \\left( x - 1 \\right) - \\left( x^2 + 3 \\right)}{\\left( x - 1 \\right)^2}',
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
	'quot-09 @ carte': 'e^{-x} / \\left( e^{-x} + 1 \\right)^2',
	'quot-10 @ latex-péda': '\\dfrac{x^2 - 2 x \\left( x - 1 \\right)}{x^4}',
	'quot-10 @ commande': '\\dfrac{x^2 - 2 x \\left( x - 1 \\right)}{x^4}',
	'quot-10 @ bouton': '\\dfrac{x^2 - 2 x \\left( x - 1 \\right)}{x^4}',
	'quot-10 @ carte': '\\dfrac{x^2 - 2 x \\left( x - 1 \\right)}{x^4}',
	'quot-11 @ latex-péda':
		'\\dfrac{2 e^{2 x} \\left( x + 1 \\right) - e^{2 x}}{\\left( x + 1 \\right)^2}',
	'quot-11 @ commande':
		'\\dfrac{2 \\exponentialE^{2 x} \\left( x + 1 \\right) - \\exponentialE^{2 x}}{\\left( x + 1 \\right)^2}',
	'quot-11 @ bouton':
		'\\dfrac{2 e^{2 x} \\left( x + 1 \\right) - e^{2 x}}{\\left( x + 1 \\right)^2}',
	'quot-11 @ carte':
		'\\left( 2 e^{2 x} \\left( x + 1 \\right) - e^{2 x} \\right) / \\left( x + 1 \\right)^2',
	'quot-13 @ latex-péda': '\\dfrac{\\ln\\left( x \\right) - 1}{\\ln\\left( x \\right)^2}',
	'quot-13 @ commande': '\\dfrac{\\ln\\left( x \\right) - 1}{\\ln\\left( x \\right)^2}',
	'quot-13 @ bouton': '\\dfrac{\\ln\\left( x \\right) - 1}{\\ln\\left( x \\right)^2}',
	'quot-13 @ carte': '\\dfrac{\\ln\\left( x \\right) - 1}{\\ln\\left( x \\right)^2}',
	'comp-10 @ latex-péda': '\\dfrac{\\dfrac{1}{x}}{2 \\sqrt{\\ln\\left( x \\right)}}',
	'comp-10 @ commande': '\\dfrac{\\dfrac{1}{x}}{2 \\sqrt{\\ln\\left( x \\right)}}',
	'comp-10 @ bouton': '\\dfrac{\\dfrac{1}{x}}{2 \\sqrt{\\ln\\left( x \\right)}}',
	'comp-10 @ carte': '\\dfrac{\\dfrac{1}{x}}{2 \\sqrt{\\ln\\left( x \\right)}}',
	'comp-12 @ latex-péda': '\\dfrac{e^x}{\\left( e^x \\right)^2 + 1}',
	'comp-12 @ commande': '\\dfrac{\\exponentialE^x}{\\left( \\exponentialE^x \\right)^2 + 1}',
	'comp-12 @ bouton': '\\dfrac{\\exponentialE^x}{\\left( \\exponentialE^x \\right)^2 + 1}',
	'comp-12 @ carte': '\\dfrac{\\exponentialE^x}{\\left( \\exponentialE^x \\right)^2 + 1}',
	'comp-14 @ carte': '-x e^{-x^2 / 2}',
	't-02 @ latex-péda': '20 - \\dfrac{49 t}{5}',
	't-02 @ commande': '20 - \\dfrac{49 t}{5}',
	't-07 @ latex-péda': 'e^{-t} - t e^{-t}',
	't-07 @ commande': '\\exponentialE^{-t} - t \\exponentialE^{-t}',
	'obj-01 @ carte': '2 \\times 2 \\times 2 x',
	'obj-04 @ carte': '2 \\times 3 x^2',
	'obj-05 @ carte': '2 \\times \\dfrac{1}{2 x + 1}',
	'obj-06 @ carte': '2 \\left( 3 x + 1 \\right) \\times 3',
	'obj-09 @ carte': '2 \\times 3 x',
	'lit-05 @ commande': 'A ω \\cos\\left( t ω + φ \\right)',
	'lit-06 @ commande': '-A ω \\sin\\left( t ω \\right)',
	'lit-10 @ latex-péda': 'e^{a x} + a x e^{a x}',
	'lit-10 @ commande': '\\exponentialE^{a x} + a x \\exponentialE^{a x}',
	'lit-11 @ latex-péda':
		'\\dfrac{a \\left( c x + d \\right) - c \\left( a x + b \\right)}{\\left( c x + d \\right)^2}',
	'lit-11 @ commande':
		'\\dfrac{a \\left( c x + d \\right) - c \\left( a x + b \\right)}{\\left( c x + d \\right)^2}',
	'lit-25 @ latex-péda': '\\dfrac{\\dfrac{1}{a}}{1 + \\dfrac{x^2}{a^2}}',
	'lit-25 @ commande': '\\dfrac{\\dfrac{1}{a}}{1 + \\dfrac{x^2}{a^2}}',
	'lit-28 @ latex-péda': 'x - b + x - a',
	'lit-28 @ commande': 'x - b + x - a',
	'lit-30 @ latex-péda': 'a e^{-k x} - a k x e^{-k x}',
	'lit-30 @ commande': 'a \\exponentialE^{-k x} - a k x \\exponentialE^{-k x}',
	'lit-33 @ commande': '-ω \\sin\\left( t ω \\right)',
	'lit-51 @ latex-péda': '\\dfrac{a}{\\cos\\left( a x \\right)^2}',
	'lit-51 @ commande': '\\dfrac{a}{\\cos\\left( a x \\right)^2}',
	'lit-55 @ latex-péda': 'e^x + e^x \\left( x - a \\right)',
	'lit-55 @ commande': '\\exponentialE^x + \\exponentialE^x \\left( x - a \\right)'
};
