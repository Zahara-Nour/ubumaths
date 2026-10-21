/**
 * Noms indicés : `a_1`, `c_{12}`, `A_1`, `\alpha_1` — une lettre (latine ou
 * grecque) suivie d'un indice ENTIER est UN nom, pas la lettre munie d'un indice.
 *
 * Le parseur en fait un nœud `subscript` (base `a`, indice `1`). Une liaison
 * nommée `a_1` doit donc remplacer ce nœud entier, et une liaison `a` ne doit
 * jamais toucher à sa base : `a_1` vaut l'objet `a_1`, jamais `a` (relevé de
 * l'atelier, 2026-10-19 — avec a = 10, `a_1` devenait `10_1`, illisible).
 *
 * Le nom garde l'indice tel qu'écrit : `a_{01}` et `a_1` sont deux noms.
 *
 * Un indice qui n'est pas un entier (`u_n`, `x_{n+1}`) n'est PAS un nom : c'est
 * la notation d'un terme de suite, laissée telle quelle.
 *
 * @module mathAST/common/indexed-names
 */

import type { MathNode, SubscriptNode } from '../types';
import { variable } from '../factory';
import { isVariable } from '../guards';
import { findNodes, mapNode, mapNodeTopDown } from '../transforms';

/** Un indice entier écrit en chiffres (`1`, `12`, `01`) — ni `1.5`, ni `-1`. */
const INTEGER_INDEX = /^\d+$/;

/**
 * Le nom d'un nœud indicé (`a_1`, `alpha_1`), ou `null` quand ce n'est pas un
 * nom : base qui n'est pas une lettre, indice qui n'est pas un entier (`u_n`).
 * Une base grecque se nomme comme sa liaison (`alpha`), suivie de l'indice.
 */
export function indexedNameOf(node: MathNode): string | null {
	if (node.type !== 'subscript') return null;
	const { base, subscript } = node;
	if (subscript.type !== 'number' || !INTEGER_INDEX.test(subscript.value)) return null;
	if (base.type === 'variable') return `${base.name}_${subscript.value}`;
	if (base.type === 'greek') return `${base.letter}_${subscript.value}`;
	return null;
}

/** Le nœud est-il un nom indicé (`a_1`) ? */
export function isIndexedName(node: MathNode): node is SubscriptNode {
	return indexedNameOf(node) !== null;
}

/** Un arbre dont les noms indicés sont cachés, et les nœuds d'origine par nom. */
export interface HiddenIndexedNames {
	readonly node: MathNode;
	readonly originals: ReadonlyMap<string, MathNode>;
}

/**
 * Chaque nom indicé (`a_1`) remplacé par une variable du même nom : ce que
 * lisent `getVariables` et les liaisons. `keep` écarte un nom (l'atelier y
 * laisse `u_3`, terme d'une suite). Un arbre NEUF, jamais modifié en place ;
 * l'arbre tel quel quand il n'a rien à cacher.
 *
 * ⚠️ Le parseur ne rend jamais de variable dont le nom contient `_` : la
 * variable `a_1` ne peut venir que d'ici, `revealIndexedNames` la reconnaît.
 */
export function hideIndexedNames(
	node: MathNode,
	keep: (name: string, node: SubscriptNode) => boolean = () => true
): HiddenIndexedNames {
	const originals = new Map<string, MathNode>();
	const hiddenName = (n: MathNode): string | null => {
		const name = indexedNameOf(n);
		return name !== null && keep(name, n as SubscriptNode) ? name : null;
	};
	if (findNodes(node, (n) => hiddenName(n) !== null).length === 0) return { node, originals };
	const out = mapNodeTopDown(node, (n) => {
		const name = hiddenName(n);
		if (name === null) return n;
		if (!originals.has(name)) originals.set(name, n);
		return variable(name);
	});
	return { node: out, originals };
}

/** Les noms cachés par `hideIndexedNames` et restés tels quels, rendus à leur nœud d'origine. */
export function revealIndexedNames(
	node: MathNode,
	originals: ReadonlyMap<string, MathNode>
): MathNode {
	if (originals.size === 0) return node;
	return mapNode(node, (n) => (isVariable(n) ? (originals.get(n.name) ?? n) : n));
}

/** Le nom d'une variable indicée (`x_1`, `a_12`) : base latine, indice entier. */
const INDEXED_VARIABLE_NAME = /^([A-Za-z])_(\d+)$/;

/**
 * Le LaTeX d'une variable qui porte un nom indicé (`x_1` → `x_1`, `a_12` →
 * `a_{12}`), ou `null` pour un autre nom. Le pipeline de lecture fait de
 * `x_1` une variable (`hideIndexedNames`) : sans ce rendu, elle s'affichait
 * `\mathit{x_1}`, comme un nom de plusieurs lettres.
 */
export function indexedVariableLatex(name: string): string | null {
	const match = INDEXED_VARIABLE_NAME.exec(name);
	if (match === null) return null;
	const [, base, index] = match;
	return index.length === 1 ? `${base}_${index}` : `${base}_{${index}}`;
}
