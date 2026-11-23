/**
 * Ligne d'un bloc imbriqué (liste, citation)
 * ==========================================
 *
 * Un bloc à case (geste, opération à remplir, choix, figure à compléter) ne
 * vaut qu'au premier niveau de l'énoncé : en retrait, cité, ou ouvert sur la
 * ligne même d'un item (`- ```cubes`), le générateur le refuse. Depuis que le
 * parseur de listes lit cette dernière forme (avant : bloc lu vide), elle doit
 * être refusée comme les deux autres, sinon le geste s'afficherait sans case,
 * jamais jugé.
 *
 * @module ubumark/parser/nested-line
 */

/** Marqueur d'item (`-`, `*`, `+`, `1.`, `1)`, `a)`) suivi d'une ouverture de bloc */
const ITEM_MARKER_BEFORE_FENCE = /^(?:[-*+]|\d+[.)]|[a-z][.)])\s+(?=`{3})/;

/**
 * Ce qui imbrique une ligne de bloc, en tête d'un motif d'ouverture : retrait,
 * `>` de citation, ou marqueur d'item. Source d'expression régulière.
 */
export const NESTED_PREFIX = String.raw`(?:[\s>]*(?:[-*+]|\d+[.)]|[a-z][.)])\s+|\s+|\s*>\s*)`;

/**
 * La ligne sans ce qui l'imbrique : retrait, `>` de citation, et marqueur
 * d'item devant une ouverture de bloc. Ligne changée = bloc imbriqué.
 * Une ligne de corps (`- étiquette` d'un ```ranger) garde son tiret.
 */
export const unnestedLine = (line: string) =>
	line.replace(/^[\s>]*/, '').replace(ITEM_MARKER_BEFORE_FENCE, '');
