/**
 * Polices du Corrigé : Shantell Sans (texte) et Chiphre Math (formules)
 * =====================================================================
 *
 * Le Corrigé d'une fiche s'imprime dans le duo de `/dev/polices` : Shantell Sans
 * Light pour le texte (Bold pour le gras) et Chiphre Math, police OpenType MATH
 * construite par `tools/chiphre-math`, pour les formules.
 *
 * Seule la correction de chaque exercice prend ces polices : les règles
 * ouvrent un bloc `#[ … ]` qui ne contient qu'elle (`render-exercise.ts`).
 * Bandeau, titres d'exercice et de section, pied de page gardent la police du
 * modèle (David, 2026-10-18). Les règles sont encadrées de deux commentaires,
 * pour qu'un corrigé dont la compilation échoue avec ces polices puisse être
 * recompilé sans elles (`withoutCorrectionFonts`, qui retire chaque bloc de
 * règles), y compris quand son Typst vient du serveur.
 *
 * Module pur : générateurs (navigateur et serveur) et tests l'importent.
 *
 * @module typst/correction-fonts
 */

// ============================================================================
// CONSTANTES
// ============================================================================

/** Les trois fichiers, servis depuis `static/` : téléchargés pour un Corrigé seulement */
export const CORRECTION_FONT_FILES = [
	'/fonts/chiphre-math-typst/ShantellSans-Light.ttf',
	'/fonts/chiphre-math-typst/ShantellSans-Bold.ttf',
	'/fonts/chiphre-math-typst/ChiphreMath.ttf'
] as const;

const START_MARK = '// <polices-du-corrige>';
const END_MARK = '// </polices-du-corrige>';

/**
 * Les règles, encadrées. `weight: "light"` : le gras de Typst (`*…*`, +300)
 * tombe alors sur Shantell Bold, la graisse la plus proche.
 */
export const CORRECTION_FONT_RULES = `${START_MARK}
#set text(font: "Shantell Sans", weight: "light")
#show math.equation: set text(font: "Chiphre Math")
${END_MARK}`;

/** Un `#set text(` en début de ligne : règle du document, pas d'un bloc imbriqué */
const TOP_LEVEL_SET_TEXT = /^#set text\(/gm;

// ============================================================================
// FONCTIONS
// ============================================================================

/**
 * Position juste après l'appel Typst qui commence à `start` (parenthèses
 * équilibrées, chaînes ignorées), ou null s'il n'est pas fermé.
 */
function endOfTypstCall(typst: string, start: number): number | null {
	const open = typst.indexOf('(', start);
	if (open === -1) return null;

	let depth = 0;
	let inString = false;
	for (let i = open; i < typst.length; i++) {
		const char = typst[i];
		if (inString) {
			if (char === '\\') i++;
			else if (char === '"') inString = false;
			continue;
		}
		if (char === '"') inString = true;
		else if (char === '(') depth++;
		else if (char === ')' && --depth === 0) return i + 1;
	}
	return null;
}

/**
 * Le document ENTIER dans les polices du Corrigé : sert à `/dev/polices` seul,
 * plus aux corrigés des fiches (leurs règles sont bornées à chaque
 * correction). Les règles y sont posées deux fois :
 * - en tête, pour ce que Typst met en forme avec les réglages du `#set page`
 *   (pied de page, numéros de page) ;
 * - après le DERNIER `#set text(…)` de premier niveau, sinon la police du
 *   modèle l'emporterait sur tout le contenu.
 */
export function withCorrectionFonts(typst: string): string {
	let insertAt: number | null = null;
	for (const match of typst.matchAll(TOP_LEVEL_SET_TEXT)) {
		insertAt = endOfTypstCall(typst, match.index) ?? insertAt;
	}
	const body =
		insertAt === null
			? typst
			: `${typst.slice(0, insertAt)}\n${CORRECTION_FONT_RULES}${typst.slice(insertAt)}`;
	return `${CORRECTION_FONT_RULES}\n${body}`;
}

/** Le document porte-t-il les règles de police du Corrigé ? */
export function hasCorrectionFonts(typst: string): boolean {
	return typst.includes(START_MARK);
}

/** Le même document sans les règles de police du Corrigé (repli : police standard) */
export function withoutCorrectionFonts(typst: string): string {
	let result = typst;
	for (;;) {
		const start = result.indexOf(START_MARK);
		if (start === -1) return result;
		const end = result.indexOf(END_MARK, start);
		if (end === -1) return result;
		// En tête, le saut de ligne qui suit les règles part avec elles ; ailleurs,
		// celui qui les précède
		if (start === 0) {
			const after = end + END_MARK.length;
			result = result.slice(result[after] === '\n' ? after + 1 : after);
		} else {
			const from = result[start - 1] === '\n' ? start - 1 : start;
			result = result.slice(0, from) + result.slice(end + END_MARK.length);
		}
	}
}
