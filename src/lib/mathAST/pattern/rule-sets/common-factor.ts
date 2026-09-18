/**
 * Common Factor Rules
 *
 * La mise en facteur commun : `a×c + b×c → (a+b)c`.
 *
 * ⚠️ **Elle n'existait nulle part dans mathAST.** `algebraicFactoringRules` ne
 * contenait que des identités remarquables — différence de carrés, carré
 * parfait, somme et différence de cubes. Conséquence mesurée : la dérivée de
 * `x·eˣ` restait `eˣ + x·eˣ` au lieu de `(x+1)eˣ`, alors que c'est la forme
 * factorisée qui permet d'étudier le signe. Demandé par David.
 *
 * ⚠️ **Le facteur commun purement NUMÉRIQUE est laissé de côté.**
 * `intent-rules.ts` note déjà que la factorisation numérique est « ambiguë » et
 * l'exclut de l'intention `auto` ; et `analysis/structures.ts` expose
 * `hasCommonFactor`, qui la traite par le PGCD. Mélanger les deux ici ferait
 * deux décisions dans une seule règle.
 *
 * @module mathAST/pattern/rule-sets/common-factor
 */

import { P } from '../builder';
import { createRule } from '../rule';
import type { Rule } from '../types';
import type { MathNode } from '../../types';
import { add, multiply, number, parentheses } from '../../factory';
import { extractRational } from '../../common/numeric';

/**
 * La somme mise en facteur, TOUJOURS parenthésée.
 *
 * ⚠️ Sans les parenthèses, `(a+b)x` se rend `a + b x` — une expression fausse,
 * qui se lit `a + bx`. C'est le défaut qu'a produit la première version.
 */
function factoredProduct(sum: MathNode, factor: MathNode): MathNode {
	return multiply(parentheses(sum), factor, 'implicit');
}

/** Le nœud est-il un nombre ? (`-3` s'écrit `opposite(number)`.) */
function isNumeric(node: MathNode): boolean {
	return extractRational(node) !== null;
}

/**
 * `a×c + b×c → (a+b)c`
 *
 * Le facteur commun ne doit pas être un nombre : ce serait la factorisation
 * numérique, traitée ailleurs.
 */
const factorCommonInProducts = createRule(
	P.parse('a * c + b * c'),
	(bindings) =>
		factoredProduct(
			add(bindings.get('a') as MathNode, bindings.get('b') as MathNode),
			bindings.get('c') as MathNode
		),
	{
		name: 'common-factor-products',
		condition: (bindings) => !isNumeric(bindings.get('c') as MathNode)
	}
);

/**
 * `c + b×c → (b+1)c`
 *
 * Le terme nu compte pour `1 × c`. On écrit `(b+1)` plutôt que `(1+b)` : c'est
 * l'ordre du tableau, degré décroissant — `eˣ + x·eˣ = (x+1)eˣ`.
 */
const factorCommonWithBareTerm = createRule(
	P.parse('c + b * c'),
	(bindings) =>
		factoredProduct(add(bindings.get('b') as MathNode, number('1')), bindings.get('c') as MathNode),
	{
		name: 'common-factor-bare-term',
		condition: (bindings) => !isNumeric(bindings.get('c') as MathNode)
	}
);

/** Les règles de mise en facteur commun. */
export const commonFactorRules: readonly Rule[] = [
	factorCommonInProducts,
	factorCommonWithBareTerm
];
