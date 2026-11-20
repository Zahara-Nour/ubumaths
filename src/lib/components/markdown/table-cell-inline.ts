/**
 * Marques en ligne d'une cellule de tableau sans trou
 * ===================================================
 *
 * Le parseur garde une cellule en chaîne (`TableCellNode.content`) ; `TableNode`
 * n'y rendait que texte et formules : `**Brumeval**` gardait ses astérisques.
 * Relue comme un paragraphe, la cellule donne ses marques (gras, italique, code).
 *
 * Volontairement étroit : on ne garde le rendu « paragraphe » que pour une cellule
 * qui se lit comme UN paragraphe fait seulement de texte et de formules, avec au
 * moins une marque. Sinon (`- 3`, `1. a` lus comme listes ; lien, trou, mention…),
 * `null` : la cellule garde son rendu d'avant. Une cellule n'affiche donc jamais
 * de lien ni de champ de saisie, chat élève compris (rendu restreint, S1).
 *
 * @module components/markdown/table-cell-inline
 */

import { parseMarkdown } from '#lib/ubumark/index.ts';
import type { MathInlineNode, TextNode } from '#lib/ubumark/index.ts';

/** Morceaux d'une cellule à marques : texte (avec ses marques) ou formule */
export type TableCellInline = TextNode | MathInlineNode;

/**
 * Sans ces caractères, aucune marque n'est possible : évite de relire chaque cellule.
 * `]{.` : marquage en ligne (texte coloré `[a]{.orange}`, ADR 0042 ; détail).
 */
const MARK_HINT = /[*_`]|\]\{\./;

/** Formules `$…$` et `~…~`, retirées avant de chercher un `_` dans un mot */
const MATH_SPANS = /\$[^$]*\$|~[^~\n]*~/g;

/** `_` ou `*` entre deux lettres ou chiffres (`x_1`, `snake_case`, `a*b*c`) : pas une marque */
const INTRAWORD_DELIMITER = /[\p{L}\p{N}][*_]+[\p{L}\p{N}]/u;

/**
 * Morceaux d'une cellule qui porte au moins une marque (gras, italique, code,
 * marquage `[texte]{.…}`), ou
 * `null` pour garder le rendu ordinaire (texte + formules).
 */
export function tableCellMarkedInline(content: string): TableCellInline[] | null {
	if (!MARK_HINT.test(content)) return null;
	const blocks = parseMarkdown(content).children;
	if (blocks.length !== 1 || blocks[0].type !== 'paragraph') return null;
	const nodes: TableCellInline[] = [];
	for (const node of blocks[0].children) {
		if (node.type !== 'text' && node.type !== 'math-inline') return null;
		nodes.push(node);
	}
	const markedTexts = nodes.filter(
		(node): node is TextNode => node.type === 'text' && !!(node.bold || node.italic || node.code)
	);
	// Marquage `[texte]{.…}` : couleur, détail, classe inconnue (à signaler au prof)
	const spanMarked = nodes.some((node) =>
		node.type === 'text' ? !!(node.color || node.detail || node.unknownClasses) : !!node.color
	);
	if (markedTexts.length === 0) return spanMarked ? nodes : null;
	// Le parseur de paragraphe est plus large que CommonMark : `3 * 4 * 5` y met « 4 » en
	// italique, `x_1 et y_2` et `a*b*c` aussi. Une cellule déjà écrite ne doit pas changer pour
	// ça : une marque ne s'ouvre ni ne se ferme sur une espace, et `_` ou `*` dans un mot n'en est
	// pas une.
	if (markedTexts.some((node) => /^\s|\s$/.test(node.content))) return null;
	if (INTRAWORD_DELIMITER.test(content.replace(MATH_SPANS, ''))) return null;
	return nodes;
}
