/**
 * Inconnues indicées (`x_1`, `u_n`, `u_{n+1}`) vues comme des variables
 * simples. Servait d'abord à la console (`cli/core/variable-argument.ts`) ;
 * `solve` s'en sert aussi depuis V13 (`x_1 + 1 = 3` répondait « pas de
 * solution »).
 */
import type { MathNode } from '../types';
import { variable } from '../factory';
import { isGreek, isSubscript, isVariable } from '../guards';
import { toLatex } from '../latex-generator';
import { findNodes, mapNode } from '../transforms';

/** Une variable indicée (`x_1`, `u_n`, `α_2`) : un indice de base lettre. */
function isIndexedVariable(n: MathNode): boolean {
	return isSubscript(n) && (isVariable(n.base) || isGreek(n.base));
}

/** L'expression contient-elle une variable indicée ? */
export function hasIndexedVariables(node: MathNode): boolean {
	return findNodes(node, isIndexedVariable).length > 0;
}

/**
 * Les variables indicées (`x_1`, `x_{12}`) réécrites en variables simples,
 * nommées par leur LaTeX, et de quoi revenir en arrière.
 *
 * ⚠️ Le parseur lit `x_1` comme un INDICE de base `x`, que la dérivation
 * traite en constante : `.diff x_1^2, x_1` valait 0, et `getVariables` n'y
 * voyait que `x`. Un nom qui contient `_` ne peut pas être celui d'une
 * variable simple : pas de collision.
 */
export function indexVariables(node: MathNode): {
	node: MathNode;
	restore: (indexed: MathNode) => MathNode;
} {
	const originals = new Map<string, MathNode>();
	const flat = mapNode(node, (n) => {
		if (!isIndexedVariable(n)) return n;
		// Sans espaces : `u_{n+1}`, pas `u_{n + 1}` — le nom se relit d'un seul
		// mot après « pour », et s'affiche comme l'élève l'a tapé
		const name = toLatex(n).replace(/\s+/g, '');
		originals.set(name, n);
		return variable(name);
	});
	return {
		node: flat,
		restore: (indexed) =>
			originals.size === 0
				? indexed
				: mapNode(indexed, (n) => (isVariable(n) ? (originals.get(n.name) ?? n) : n))
	};
}
