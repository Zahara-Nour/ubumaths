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

export const KNOWN_WRONG: Readonly<Record<string, string>> = {};

/**
 * Valeur juste, écriture différente de celle de classe (règle (f)).
 */
export const KNOWN_FORM_DIFF: Readonly<Record<string, string>> = {
	'latex:0.5x^2+1.2x': 'rendu « \\dfrac{1}{6} x^3 + \\dfrac{3}{5} x^2 »',
	'latex:\\sqrt{2}x': 'rendu « \\dfrac{1}{2} \\sqrt{2} x^2 »',
	'latex:x^{\\frac{3}{2}}': 'rendu « \\dfrac{2}{5} x^2 \\sqrt{x} »',
	'latex:x^{\\frac{2}{3}}': 'rendu « \\dfrac{3}{5} x \\sqrt[3]{x^2} »',
	'latex:\\sin^2(x)\\cos(x)': 'rendu « \\dfrac{1}{3} \\sin\\left( x \\right)^3 »',
	'latex:\\sin(x)\\cos(x)': 'rendu « \\dfrac{1}{2} \\sin\\left( x \\right)^2 »',
	'latex:\\cos(x)\\sin^{3}(x)': 'rendu « \\dfrac{1}{4} \\sin\\left( x \\right)^4 »',
	'latex:-\\sin(x)\\cos^2(x)': 'rendu « \\dfrac{1}{3} \\cos\\left( x \\right)^3 »',
	'latex:5-9.8t': 'rendu « -\\dfrac{49}{10} t^2 + 5 t »',
	'latex:xt^2': 'rendu « \\dfrac{1}{3} t^3 x »',
	'latex:(x-a)(x-b)':
		'rendu « a b x - \\dfrac{1}{2} a x^2 - \\dfrac{1}{2} b x^2 + \\dfrac{1}{3} x^3 »',
	// √x : rendu x√x (classe : x^{3/2})
	'atelier:x^(1/2)': 'rendu « \\dfrac{2}{3} x \\sqrt{x} »',
	// Refusées avant (coefficient littéral ou u = x + b), justes depuis la revue de #913
	'latex:\\frac{1}{(ax+b)^2}': 'rendu « \\dfrac{-1}{a^2 x + a b} »',
	'latex:(ax+b)^3':
		'rendu « \\dfrac{a^4 x^4 + 4 a^3 b x^3 + 6 a^2 b^2 x^2 + 4 a b^3 x + b^4}{4 a} »',
	'latex:A\\cos(\\omega x)': 'rendu « \\dfrac{A \\sin\\left( \\omega x \\right)}{\\omega} »',
	'latex:\\sin(\\omega t+\\phi)':
		'rendu « \\dfrac{-\\cos\\left( \\omega t + \\phi \\right)}{\\omega} »',
	'latex:A\\cos(\\omega t)': 'rendu « \\dfrac{A \\sin\\left( \\omega t \\right)}{\\omega} »',
	'atelier:1/(a x + b)': 'rendu « \\dfrac{\\ln\\left( \\left| a x + b \\right| \\right)}{a} »',
	'atelier:(a x + b)^3':
		'rendu « \\dfrac{a^4 x^4 + 4 a^3 b x^3 + 6 a^2 b^2 x^2 + 4 a b^3 x + b^4}{4 a} »',
	'atelier:A cos(w t) ; t': 'rendu « \\dfrac{A \\sin\\left( t w \\right)}{w} »',
	'latex:(ax+b)^n': 'rendu « \\dfrac{\\left( a x + b \\right)^{n + 1}}{a n + a} »',
	// Refusées avant (lettre e tapée lue comme variable), justes depuis fix/euler-lettre-e :
	// décimal rendu en fraction, primitive développée ou facteur sous la fraction
	'latex:e^{0.5x}': 'rendu « 2 \\exponentialE^{\\dfrac{1}{2} x} »',
	'latex:\\frac{e^{x}-e^{-x}}{2}':
		'rendu « \\dfrac{1}{2} \\exponentialE^x + \\dfrac{1}{2} \\exponentialE^{-x} »',
	'latex:x^2e^{x}': 'rendu « x^2 \\exponentialE^x - 2 x \\exponentialE^x + 2 \\exponentialE^x »',
	'latex:e^{x}\\sin(x)':
		'rendu « \\dfrac{1}{2} \\exponentialE^x \\sin\\left( x \\right) - \\dfrac{1}{2} \\cos\\left( x \\right) \\exponentialE^x »',
	'latex:100e^{-0.05t}': 'rendu « -2000 \\exponentialE^{-\\dfrac{1}{20} t} »',
	'latex:ae^{-kx}': 'rendu « \\dfrac{-a \\exponentialE^{-k x}}{k} »',
	'latex:ae^{-kt}': 'rendu « \\dfrac{-a \\exponentialE^{-k t}}{k} »',
	'latex:Ae^{\\lambda t}': 'rendu « \\dfrac{A \\exponentialE^{\\lambda t}}{\\lambda} »',
	'atelier:5e^(-2x)': 'rendu « \\dfrac{-5}{2} e^{-2 x} »',
	'atelier:a e^(-k t) ; t': 'rendu « \\dfrac{-a e^{-k t}}{k} »',
	'atelier:e^(-2t) ; t': 'rendu « \\dfrac{-1}{2} e^{-2 t} »',
	// Refusées avant (aˣ, u′·f(u) non linéaire, trinôme non factorisé, sin²), justes depuis
	// feat/primitives-refusees : forme développée ou ln|x + 1| − ln|x − 1|
	'latex:\\sin^2(x)': 'rendu « \\dfrac{1}{2} x - \\dfrac{1}{4} \\sin\\left( 2 x \\right) »',
	'latex:\\cos^2(x)': 'rendu « \\dfrac{1}{2} x + \\dfrac{1}{4} \\sin\\left( 2 x \\right) »',
	'latex:\\frac{2}{1-x^2}':
		'rendu « \\ln\\left( \\left| x + 1 \\right| \\right) - \\ln\\left( \\left| x - 1 \\right| \\right) »'
};
