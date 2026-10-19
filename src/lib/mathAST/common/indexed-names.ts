/**
 * Noms indicés : `a_1`, `c_{12}`, `A_1` — une lettre suivie d'un indice ENTIER est
 * UN nom, pas la lettre `a` munie d'un indice.
 *
 * Le parseur en fait un nœud `subscript` (base `a`, indice `1`). Une liaison
 * nommée `a_1` doit donc remplacer ce nœud entier, et une liaison `a` ne doit
 * jamais toucher à sa base : `a_1` vaut l'objet `a_1`, jamais `a` (relevé de
 * l'atelier, 2026-10-19 — avec a = 10, `a_1` devenait `10_1`, illisible).
 *
 * Un indice qui n'est pas un entier (`u_n`, `x_{n+1}`) n'est PAS un nom : c'est
 * la notation d'un terme de suite, laissée telle quelle.
 *
 * @module mathAST/common/indexed-names
 */

import type { MathNode, SubscriptNode } from '../types';

/** Un indice entier écrit en chiffres (`1`, `12`) — ni `1.5`, ni `-1`. */
const INTEGER_INDEX = /^\d+$/;

/**
 * Le nom d'un nœud indicé (`a_1`), ou `null` quand ce n'est pas un nom : base
 * qui n'est pas une variable, indice qui n'est pas un entier (`u_n`).
 */
export function indexedNameOf(node: MathNode): string | null {
	if (node.type !== 'subscript') return null;
	const { base, subscript } = node;
	if (base.type !== 'variable') return null;
	if (subscript.type !== 'number' || !INTEGER_INDEX.test(subscript.value)) return null;
	return `${base.name}_${subscript.value}`;
}

/** Le nœud est-il un nom indicé (`a_1`) ? */
export function isIndexedName(node: MathNode): node is SubscriptNode {
	return indexedNameOf(node) !== null;
}
