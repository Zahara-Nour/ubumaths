/**
 * Écarts CONNUS de l'oracle des primitives (mesurés sur main le 2026-10-06).
 *
 * - `KNOWN_WRONG` : valeur FAUSSE (F′ ≠ f, intégrale définie fausse, résidu,
 *   bornes mal lues). À corriger dans le moteur, PAS ici.
 * - `KNOWN_FORM_DIFF` : valeur juste, écriture différente de celle de classe.
 *
 * Le test échoue si une entrée listée devient juste (la retirer) ou si une
 * entrée non listée devient fausse. Clé : `chemin:entrée` (`def:` pour une
 * intégrale définie).
 */

export const KNOWN_WRONG: Readonly<Record<string, string>> = {
	'latex:(3x-1)^3':
		'(a) F′(-2.7) ≈ -2260.71 ≠ f(-2.7) = -753.571 — rendu « \\dfrac{81}{4} x^4 - 27 x^3 + \\dfrac{27}{2} x^2 - 3 x + \\dfrac{1}{4} »',
	'latex:x^{-1}': '(a) F′(-2.7) ≈ 0 ≠ f(-2.7) = -0.37037 — rendu « 0 »',
	'latex:\\frac{5}{3x}':
		'(b) résidu : nombre à 12 chiffres ou plus (flottant) — rendu « \\dfrac{16666666666666667}{10000000000000000} \\ln\\left( \\left| 3 x \\right| \\right) »',
	'latex:\\frac{1}{3x-1}':
		'(b) résidu : nombre à 12 chiffres ou plus (flottant) — rendu « \\dfrac{3333333333333333}{10000000000000000} \\ln\\left( \\left| 3 x - 1 \\right| \\right) »',
	'latex:\\frac{1}{(3x+2)^3}':
		'(b) résidu : nombre à 12 chiffres ou plus (flottant) — rendu « \\dfrac{-3333333333333333}{180000000000000000 x^2 + 240000000000000000 x + 80000000000000000} »',
	'latex:\\frac{1}{e^{x}}':
		'(a) F′(-2.7) ≈ 1 ≠ f(-2.7) = 14.8797 — rendu « \\ln\\left( \\left| e^x \\right| \\right) »',
	'latex:\\exponentialE^{3x+1}':
		'(a) F′(-2.7) ≈ 0.00247531 ≠ f(-2.7) = 0.000825105 — rendu « \\exp\\left( 3 x + 1 \\right) »',
	'latex:\\frac{x^2}{x^3+1}':
		'(b) résidu : nombre à 12 chiffres ou plus (flottant) — rendu « \\dfrac{3333333333333333}{10000000000000000} \\ln\\left( \\left| x^3 + 1 \\right| \\right) »',
	'latex:\\sin(2x)':
		'(a) F′(-2.7) ≈ 1.54553 ≠ f(-2.7) = 0.772764 — rendu « -\\cos\\left( 2 x \\right) »',
	'latex:\\cos(3x)':
		'(a) F′(-2.7) ≈ -0.730632 ≠ f(-2.7) = -0.243544 — rendu « \\sin\\left( 3 x \\right) »',
	'latex:\\sin(2x+1)':
		'(a) F′(-2.7) ≈ 1.9032 ≠ f(-2.7) = 0.951602 — rendu « -\\cos\\left( 2 x + 1 \\right) »',
	'latex:-2\\sin(4x-1)':
		'(a) F′(-2.7) ≈ -5.5482 ≠ f(-2.7) = -1.38705 — rendu « 2 \\cos\\left( 4 x - 1 \\right) »',
	'latex:5\\cos(2x)-\\sin(x)':
		'(a) F′(-2.7) ≈ 6.77431 ≠ f(-2.7) = 3.60084 — rendu « \\cos\\left( x \\right) + 5 \\sin\\left( 2 x \\right) »',
	'latex:\\ln(2x)':
		'(a) F′(0.3) ≈ 0.239174 ≠ f(0.3) = -0.510826 — rendu « x \\ln\\left( 2 x \\right) - \\dfrac{1}{4} x »',
	'latex:\\sqrt{2x+3}':
		'(a) F′(-1.3) ≈ 1.26491 ≠ f(-1.3) = 0.632456 — rendu « \\dfrac{2}{3} \\left( 2 x + 3 \\right)^{\\dfrac{1}{2} + 1} »',
	'latex:3\\sqrt{4x+12}':
		'(a) F′(-2.7) ≈ 13.1453 ≠ f(-2.7) = 3.28634 — rendu « 2 \\left( 4 x + 12 \\right)^{\\dfrac{1}{2} + 1} »',
	'latex:(2x+6)^{\\frac{1}{2}}':
		'(a) F′(-2.7) ≈ 1.54919 ≠ f(-2.7) = 0.774597 — rendu « \\dfrac{2}{3} \\left( 2 x + 6 \\right)^{\\dfrac{1}{2} + 1} »',
	'latex:(3x+9)^{\\frac{3}{2}}':
		'(a) F′(-2.7) ≈ 2.56144 ≠ f(-2.7) = 0.853815 — rendu « \\dfrac{2}{5} \\left( 3 x + 9 \\right)^{\\dfrac{3}{2} + 1} »',
	'latex:\\sqrt[3]{2x+1}':
		'(a) F′(-0.45) ≈ 0.632456 ≠ f(-0.45) = 0.464159 — rendu « \\dfrac{2}{3} \\left( 2 x + 1 \\right)^{\\dfrac{1}{2} + 1} »',
	'latex:\\sin(3t)':
		'(a) F′(-2.7) ≈ -2.90967 ≠ f(-2.7) = -0.96989 — rendu « -\\cos\\left( 3 t \\right) »',
	'latex:\\frac{a}{x-b}': '(a) F′(-2.7) ≈ 0 ≠ f(-2.7) = -2.08333 (jeu 1) — rendu « 0 »',
	'atelier:(3x-1)^3':
		'(a) F′(-2.7) ≈ -2260.71 ≠ f(-2.7) = -753.571 — rendu « {81/4}x^4-27x^3+{27/2}x^2-3x+1/4 »',
	'atelier:x^(1/2)': 'affichage illisible par le parseur — rendu « {2/3}x^{(1:/2)+1} »',
	'atelier:cos(2x)': '(a) F′(-2.7) ≈ 1.26939 ≠ f(-2.7) = 0.634693 — rendu « sin(2x) »',
	'atelier:sin(3x+1)': '(a) F′(-2.7) ≈ -2.18691 ≠ f(-2.7) = -0.728969 — rendu « -cos(3x+1) »',
	'atelier:sqrt(2x+3)':
		'(a) F′(-1.3) ≈ 1.26491 ≠ f(-1.3) = 0.632456 — rendu « {2/3}(2x+3)^{1/2+1} »',
	'def:latex:\\frac{1}{x} [1 ; e]': '(b) résidu : ln(e) — rendu « \\ln\\left( e \\right) »',
	'def:latex:\\ln(x) [1 ; e]': '(b) résidu : ln(e) — rendu « e \\ln\\left( e \\right) - e + 1 »',
	'def:latex:\\sin(2x) [0 ; \\frac{\\pi}{2}]': '(d) 2 ≠ 1 (Simpson 1) — rendu « 2 »',
	'def:atelier:a x 0 2': '(d) NaN ≠ 5 (Simpson 5) (jeu 1) — rendu « N / A »'
};

/**
 * Valeur juste, écriture différente de celle de classe (règle (f)).
 */
export const KNOWN_FORM_DIFF: Readonly<Record<string, string>> = {
	'latex:0.5x^2+1.2x': 'rendu « \\dfrac{1}{6} x^3 + \\dfrac{3}{5} x^2 »',
	'latex:(x+1)^2': 'rendu « \\dfrac{1}{3} x^3 + x^2 + x + \\dfrac{1}{3} »',
	'latex:\\sqrt{2}x': 'rendu « \\dfrac{1}{2} \\sqrt{2} x^2 »',
	'latex:x^{\\frac{1}{2}}': 'rendu « \\dfrac{2}{3} x^{\\dfrac{1}{2} + 1} »',
	'latex:x^{\\frac{3}{2}}': 'rendu « \\dfrac{2}{5} x^{\\dfrac{3}{2} + 1} »',
	'latex:x^{-\\frac{1}{2}}': 'rendu « 2 x^{-\\dfrac{1}{2} + 1} »',
	'latex:x^{\\frac{2}{3}}': 'rendu « \\dfrac{3}{5} x^{\\dfrac{2}{3} + 1} »',
	'latex:\\frac{1}{2x}': 'rendu « \\dfrac{1}{2} \\ln\\left( \\left| 2 x \\right| \\right) »',
	'latex:\\frac{3}{(2x-1)^2}': 'rendu « \\dfrac{-3}{4 x - 2} »',
	'latex:\\frac{2x}{x^2+1}': 'rendu « \\ln\\left( \\left| x^2 + 1 \\right| \\right) »',
	'latex:\\frac{x}{x^2+1}': 'rendu « \\dfrac{1}{2} \\ln\\left( \\left| x^2 + 1 \\right| \\right) »',
	'latex:\\frac{2x+1}{x^2+x+1}': 'rendu « \\ln\\left( \\left| x^2 + x + 1 \\right| \\right) »',
	'latex:\\frac{e^{x}}{e^{x}+1}': 'rendu « \\ln\\left( \\left| e^x + 1 \\right| \\right) »',
	'latex:\\frac{2x-3}{x^2-3x+5}': 'rendu « \\ln\\left( \\left| x^2 - 3 x + 5 \\right| \\right) »',
	'latex:\\frac{4x}{x^2+1}': 'rendu « 2 \\ln\\left( \\left| x^2 + 1 \\right| \\right) »',
	'latex:\\frac{e^{2x}}{e^{2x}+3}':
		'rendu « \\dfrac{1}{2} \\ln\\left( \\left| e^{2 x} + 3 \\right| \\right) »',
	'latex:2x(x^2+1)^3':
		'rendu « \\dfrac{1}{4} x^8 + x^6 + \\dfrac{3}{2} x^4 + x^2 + \\dfrac{1}{4} »',
	'latex:x(x^2+1)^2':
		'rendu « \\dfrac{1}{6} x^6 + \\dfrac{1}{2} x^4 + \\dfrac{1}{2} x^2 + \\dfrac{1}{6} »',
	'latex:\\sin^2(x)\\cos(x)': 'rendu « \\dfrac{1}{3} \\sin\\left( x \\right)^3 »',
	'latex:\\sin(x)\\cos(x)': 'rendu « \\dfrac{1}{2} \\sin\\left( x \\right)^2 »',
	'latex:3x^2(x^3-1)^5':
		'rendu « \\dfrac{1}{6} x^{18} - x^{15} + \\dfrac{5}{2} x^{12} - \\dfrac{10}{3} x^9 + \\dfrac{5}{2} x^6 - x^3 + \\dfrac{1}{6} »',
	'latex:\\frac{x}{(x^2+4)^3}': 'rendu « \\dfrac{-1}{4 x^4 + 32 x^2 + 64} »',
	'latex:e^{x}(e^{x}+1)^2':
		'rendu « \\dfrac{1}{3} \\left( e^x \\right)^3 + \\left( e^x \\right)^2 + e^x + \\dfrac{1}{3} »',
	'latex:\\cos(x)\\sin^{3}(x)': 'rendu « \\dfrac{1}{4} \\sin\\left( x \\right)^4 »',
	'latex:-\\sin(x)\\cos^2(x)': 'rendu « \\dfrac{1}{3} \\cos\\left( x \\right)^3 »',
	'latex:x\\sqrt{x^2+1}': 'rendu « \\dfrac{1}{3} \\left( x^2 + 1 \\right)^{\\dfrac{1}{2} + 1} »',
	'latex:\\frac{2x}{\\sqrt{x^2+1}}': 'rendu « 2 \\left( x^2 + 1 \\right)^{-\\dfrac{1}{2} + 1} »',
	'latex:\\frac{x}{\\sqrt{x^2+1}}': 'rendu « \\left( x^2 + 1 \\right)^{-\\dfrac{1}{2} + 1} »',
	'latex:\\frac{3}{\\sqrt{3x+9}}': 'rendu « 2 \\left( 3 x + 9 \\right)^{-\\dfrac{1}{2} + 1} »',
	'latex:\\frac{2x+1}{\\sqrt{x^2+x+1}}':
		'rendu « 2 \\left( x^2 + x + 1 \\right)^{-\\dfrac{1}{2} + 1} »',
	'latex:\\frac{e^{x}}{\\sqrt{e^{x}+1}}':
		'rendu « 2 \\left( e^x + 1 \\right)^{-\\dfrac{1}{2} + 1} »',
	'latex:\\frac{1}{\\sqrt{2x-1}}': 'rendu « \\left( 2 x - 1 \\right)^{-\\dfrac{1}{2} + 1} »',
	'latex:\\frac{x}{\\sqrt{4-x^2}}': 'rendu « -\\left( 4 - x^2 \\right)^{-\\dfrac{1}{2} + 1} »',
	'latex:\\frac{\\cos(x)}{\\sqrt{\\sin(x)}}':
		'rendu « 2 \\sin\\left( x \\right)^{-\\dfrac{1}{2} + 1} »',
	'latex:\\frac{2t}{t^2+1}': 'rendu « \\ln\\left( \\left| t^2 + 1 \\right| \\right) »',
	'latex:5-9.8t': 'rendu « -\\dfrac{49}{10} t^2 + 5 t »',
	'latex:xt^2': 'rendu « \\dfrac{1}{3} t^3 x »',
	'latex:(x-a)(x-b)':
		'rendu « a b x - \\dfrac{1}{2} a x^2 - \\dfrac{1}{2} b x^2 + \\dfrac{1}{3} x^3 »',
	'atelier:x^(-2)': 'rendu « -x^{\\left( -2 \\right) + 1} »',
	'atelier:2x/(x^2+1)': 'rendu « \\ln\\left( \\left| x^2 + 1 \\right| \\right) »',
	'atelier:x/(x^2+1)': 'rendu « \\dfrac{1}{2} \\ln\\left( \\left| x^2 + 1 \\right| \\right) »',
	'atelier:2x(x^2+1)^3':
		'rendu « \\dfrac{1}{4} x^8 + x^6 + \\dfrac{3}{2} x^4 + x^2 + \\dfrac{1}{4} »',
	'atelier:x/sqrt(x^2+1)': 'rendu « \\left( x^2 + 1 \\right)^{\\dfrac{-1}{2} + 1} »',
	// Intégrales définies : valeur numérique seulement (primitive non trouvée), juste à 1e-4
	'def:latex:\\frac{1}{x^2} [1 ; 2]': 'approximation 0.5000000056691063 au lieu de 1/2',
	'def:latex:\\sqrt{x} [0 ; 4]': 'approximation 5.3333332873618104 au lieu de 16/3',
	'def:latex:\\frac{1}{1+x} [0 ; 1]': 'approximation 0.6931471842635284 au lieu de ln 2'
};
