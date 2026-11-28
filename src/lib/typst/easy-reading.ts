/**
 * Lecture facilitée des PDF de fiche : Luciole et Luciole Math
 * ============================================================
 *
 * Accessibilité (élèves dys ; chantier `lecture-facilitee`, phase 0 validée
 * par David le 2026-11-19) : le document ENTIER passe en Luciole (bandeau,
 * titres, consignes, réponses, corrigé), les formules en Luciole Math, police
 * de maths OpenType que Typst lit telle quelle. Lettres, mots et lignes sont un
 * peu espacés, comme à l'écran (`app.css`, `html.lecture-facilitee`).
 *
 * Réglage de l'élève (`student_print_settings.easy_reading`), ou choisi au
 * coup par coup par le prof : option `easyReading` du générateur. Le corrigé
 * quitte alors Shantell Sans / Chiphre Math (règles du Corrigé non posées).
 *
 * Les règles sont encadrées de deux commentaires : le compilateur les repère
 * (compilateur à part qui charge Luciole, `correction-fonts-compiler.ts`) et
 * les retire pour le repli dans la police habituelle.
 *
 * Module pur : générateurs (navigateur et serveur) et tests l'importent.
 *
 * @module typst/easy-reading
 */

import { endOfTypstCall, withoutMarkedRules } from './correction-fonts';

// ============================================================================
// CONSTANTES
// ============================================================================

/**
 * Les cinq fichiers, servis depuis `static/` : téléchargés pour un PDF en
 * lecture facilitée seulement (≈ 810 ko). Paquet CTAN `luciole`
 * (Luciole-Math 0.76). Changer une police = lui ajouter un `?v=` (cache de 30
 * jours sur `/fonts/`, `vercel.json`).
 */
export const EASY_READING_FONT_FILES = [
	'/fonts/luciole/Luciole-Regular.ttf',
	'/fonts/luciole/Luciole-Bold.ttf',
	'/fonts/luciole/Luciole-Italic.ttf',
	'/fonts/luciole/Luciole-BoldItalic.ttf',
	'/fonts/luciole/Luciole-Math.otf'
] as const;

const START_MARK = '// <lecture-facilitee>';
const END_MARK = '// </lecture-facilitee>';

/**
 * Les règles, encadrées. Écarts de l'écran : lettres + 0,02 em, mots
 * + 0,08 em ; interligne 0,9 em (0,65 em par défaut dans Typst, essai de
 * `/dev/polices/luciole`). Texte aligné à gauche, jamais justifié : la
 * justification creuse des blancs irréguliers entre les mots, gênants pour un
 * lecteur dys (David, 2026-11-19). Les formules gardent leurs écarts : l'espacement des
 * lettres décalerait indices et exposants.
 */
export const EASY_READING_RULES = `${START_MARK}
#set text(font: "Luciole", tracking: 0.02em, spacing: 100% + 0.08em)
#set par(leading: 0.9em, justify: false)
#show math.equation: set text(font: "Luciole Math", tracking: 0em, spacing: 100%)
${END_MARK}`;

/**
 * Un `#set text(` ou `#set par(` en début de ligne : règle du document, pas
 * d'un bloc imbriqué. Le dernier des deux l'emporterait sur nos règles.
 */
const TOP_LEVEL_SET_TEXT_OR_PAR = /^#set (?:text|par)\(/gm;

// ============================================================================
// FONCTIONS
// ============================================================================

/**
 * Le document en lecture facilitée. Les règles y sont posées deux fois :
 * - en tête, pour ce que Typst met en forme avec les réglages du `#set page`
 *   (pied de page, numéros de page) ;
 * - après le DERNIER `#set text(…)` ou `#set par(…)` de premier niveau, sinon
 *   la police ou l'interligne du gabarit (même écrit par un prof) l'emporterait.
 */
export function withEasyReading(typst: string): string {
	let insertAt: number | null = null;
	for (const match of typst.matchAll(TOP_LEVEL_SET_TEXT_OR_PAR)) {
		insertAt = endOfTypstCall(typst, match.index) ?? insertAt;
	}
	const body =
		insertAt === null
			? typst
			: `${typst.slice(0, insertAt)}\n${EASY_READING_RULES}${typst.slice(insertAt)}`;
	return `${EASY_READING_RULES}\n${body}`;
}

/** Le document porte-t-il les règles de la lecture facilitée ? */
export function hasEasyReading(typst: string): boolean {
	return typst.includes(START_MARK);
}

/** Le même document sans la lecture facilitée (repli : police habituelle) */
export function withoutEasyReading(typst: string): string {
	return withoutMarkedRules(typst, START_MARK, END_MARK);
}
