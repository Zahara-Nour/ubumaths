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
	'latex:(x+1)^2': 'rendu « \\dfrac{1}{3} x^3 + x^2 + x + \\dfrac{1}{3} »',
	'latex:\\sqrt{2}x': 'rendu « \\dfrac{1}{2} \\sqrt{2} x^2 »',
	'latex:x^{\\frac{3}{2}}': 'rendu « \\dfrac{2}{5} x^2 \\sqrt{x} »',
	'latex:x^{\\frac{2}{3}}': 'rendu « \\dfrac{3}{5} x \\sqrt[3]{x^2} »',
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
	'latex:x\\sqrt{x^2+1}':
		'rendu « \\dfrac{1}{3} x^2 \\sqrt{x^2 + 1} + \\dfrac{1}{3} \\sqrt{x^2 + 1} »',
	'latex:\\frac{2t}{t^2+1}': 'rendu « \\ln\\left( \\left| t^2 + 1 \\right| \\right) »',
	'latex:5-9.8t': 'rendu « -\\dfrac{49}{10} t^2 + 5 t »',
	'latex:xt^2': 'rendu « \\dfrac{1}{3} t^3 x »',
	'latex:(x-a)(x-b)':
		'rendu « a b x - \\dfrac{1}{2} a x^2 - \\dfrac{1}{2} b x^2 + \\dfrac{1}{3} x^3 »',
	'atelier:2x/(x^2+1)': 'rendu « \\ln\\left( \\left| x^2 + 1 \\right| \\right) »',
	'atelier:x/(x^2+1)': 'rendu « \\dfrac{1}{2} \\ln\\left( \\left| x^2 + 1 \\right| \\right) »',
	'atelier:2x(x^2+1)^3':
		'rendu « \\dfrac{1}{4} x^8 + x^6 + \\dfrac{3}{2} x^4 + x^2 + \\dfrac{1}{4} »',
	// Primitives corrigées (facteur 1/a, rationnels exacts) : forme développée par la normalisation finale
	'latex:(3x-1)^3': 'rendu « \\dfrac{27}{4} x^4 - 9 x^3 + \\dfrac{9}{2} x^2 - x + \\dfrac{1}{12} »',
	'latex:\\frac{5}{3x}': 'rendu « \\dfrac{5}{3} \\ln\\left( \\left| 3 x \\right| \\right) »',
	'latex:\\frac{1}{(3x+2)^3}': 'rendu « \\dfrac{-1}{54 x^2 + 72 x + 24} »',
	'latex:\\sqrt{2x+3}': 'rendu « \\dfrac{2}{3} x \\sqrt{2 x + 3} + \\sqrt{2 x + 3} »',
	'latex:3\\sqrt{4x+12}': 'rendu « 2 x \\sqrt{4 x + 12} + 6 \\sqrt{4 x + 12} »',
	'latex:(2x+6)^{\\frac{1}{2}}': 'rendu « \\dfrac{2}{3} x \\sqrt{2 x + 6} + 2 \\sqrt{2 x + 6} »',
	'latex:(3x+9)^{\\frac{3}{2}}':
		'rendu « \\dfrac{6}{5} x^2 \\sqrt{3 x + 9} + \\dfrac{36}{5} x \\sqrt{3 x + 9} + \\dfrac{54}{5} \\sqrt{3 x + 9} »',
	'atelier:(3x-1)^3':
		'rendu « \\dfrac{27}{4} x^4 - 9 x^3 + \\dfrac{9}{2} x^2 - x + \\dfrac{1}{12} »',
	'atelier:x^(1/2)': 'rendu « \\dfrac{2}{3} x \\sqrt{x} »',
	'atelier:sqrt(2x+3)': 'rendu « \\dfrac{2}{3} x \\sqrt{2 x + 3} + \\sqrt{2 x + 3} »',
	// Refusées avant (u′ = −2 ou 1 non reconnu), justes maintenant, forme développée
	'latex:(1-2x)^4': 'rendu « \\dfrac{16}{5} x^5 - 8 x^4 + 8 x^3 - 4 x^2 + x - \\dfrac{1}{10} »',
	'latex:2(x+5)^2': 'rendu « \\dfrac{2}{3} x^3 + 10 x^2 + 50 x + \\dfrac{250}{3} »',
	'latex:\\sqrt{4-x}': 'rendu « \\dfrac{2}{3} x \\sqrt{-x + 4} - \\dfrac{8}{3} \\sqrt{-x + 4} »',
	// Intégrales définies : valeur numérique seulement (primitive non trouvée), juste à 1e-4
	'def:latex:\\frac{1}{x^2} [1 ; 2]': 'approximation 0.5000000056691063 au lieu de 1/2',
	'def:latex:\\sqrt{x} [0 ; 4]': 'approximation 5.3333332873618104 au lieu de 16/3'
};
