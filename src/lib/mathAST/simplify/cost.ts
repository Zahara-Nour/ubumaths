/**
 * Fonction de coût — portée du Compute Engine
 *
 * Attribue un coût numérique à un arbre : **moins cher = plus simple**. Elle
 * sert à départager deux écritures équivalentes, et à rien d'autre.
 *
 * ⚠️ **Portée, pas inventée.** La version précédente disait « Inspired by
 * Compute Engine / Mathematica » et posait ses propres constantes — addition
 * 2, multiplication 3, division 4, racine 3 — jamais confrontées à un cas en
 * sept mois. Les vraies, lues dans
 * `extern/compute-engine/src/compute-engine/cost-function.ts` (v0.30.2), sont
 * ci-dessous. Ce n'est pas cosmétique : c'est le RAPPORT entre les poids qui
 * décide quelle écriture gagne.
 *
 * Elles dérivent de `ComplexityFunction` de Mathematica, citée en tête de leur
 * fichier :
 * https://reference.wolfram.com/language/ref/ComplexityFunction.html
 *
 * ## Les trois écarts assumés
 *
 * 1. **La puissance.** Leur commentaire dit « We want 2q^2 to be less
 *    expensive than 2qq, so we ignore the exponent » — mais leur code rend
 *    `costFunction(expr.ops[1])`, et `ops[1]` est l'EXPOSANT (vérifié :
 *    `['Power', base, -exponentVal]` dans leur sérialiseur). Il ignore donc la
 *    BASE, ce qui donnerait coût 1 à `(x+1)^2` comme à `((x+1)(x+2))^99`. On
 *    porte **l'intention écrite**, pas le lapsus : la base est facturée,
 *    l'exposant ne l'est pas.
 *
 * 2. **Le signe des nombres.** CE pénalise un littéral négatif (`n > 0 ? 1 : 2`).
 *    Chez nous la branche est inatteignable : la fabrique refuse
 *    `number('-5')`, et `-5` se lit `opposite(number('5'))`. Le surcoût est
 *    porté par le nœud `opposite`, qui coûte 4.
 *
 * 3. **Les nœuds que CE n'a pas.** Unités, matrices, limites, morceaux,
 *    indices : leur règle générale est « tout le reste coûte 11 ». On
 *    l'applique, sauf pour ce qui n'est pas une OPÉRATION — parenthèses
 *    (structurelles, gratuites), indice (il nomme, `x_1` est une variable) et
 *    unité (elle annote une grandeur ; la facturer 11 pousserait `simplify` à
 *    dépouiller `12[km]` de son unité).
 *
 * @module mathAST/simplify/cost
 */

import type { MathNode } from '../types';
import { getChildren } from '../transforms';

// =============================================================================
// Number Cost
// =============================================================================

/**
 * Cost of a number literal based on digit count.
 * Longer numbers are penalized.
 */
/**
 * Le coût d'un nombre suit son nombre de chiffres en base 10.
 *
 * Porté de `numericCostFunction` : `floor(log2(|n|) / log2(10))` est
 * `floor(log10(|n|))`, c'est-à-dire le nombre de chiffres moins un. Un
 * décimal coûte 2, quel que soit le nombre de décimales.
 */
function numberCost(value: string): number {
	const n = Number(value.replace(',', '.'));
	if (!Number.isFinite(n)) return 2;
	if (n === 0) return 1;
	if (!Number.isInteger(n)) return 2;
	// La branche du signe (`n > 0 ? 1 : 2`) est conservée par fidélité, mais
	// notre fabrique refuse les littéraux signés : voir l'écart 2 en tête.
	return Math.floor(Math.log2(Math.abs(n)) / Math.log2(10)) + (n > 0 ? 1 : 2);
}

// =============================================================================
// Function Cost Lookup
// =============================================================================

/**
 * Poids par famille de fonction, portés tels quels :
 * `Square`/`Sqrt` 5, `Ln`/`Exp`/`Log`/`Lb` 9, `Cos`/`Sin`/`Tan` 10, tout le
 * reste 11. Les réciproques et hyperboliques tombent donc dans le « reste »,
 * comme chez eux.
 */
const FUNCTION_COSTS: Readonly<Record<string, number>> = {
	sqrt: 5,
	ln: 9,
	exp: 9,
	log: 9,
	lb: 9,
	cos: 10,
	sin: 10,
	tan: 10
};

/** Le coût de toute fonction que CE ne nomme pas (« else nameCost = 11 »). */
const OTHER_FUNCTION_COST = 11;

// =============================================================================
// Main Cost Function
// =============================================================================

/**
 * Computes the structural cost of a MathNode tree.
 *
 * Lower cost indicates a "simpler" expression. The cost is the sum of
 * node-specific costs across the entire tree.
 *
 * @param node - The expression to evaluate
 * @returns A non-negative cost value
 */
export function computeCost(node: MathNode): number {
	switch (node.type) {
		// --- feuilles : coût 1 (CE : `if (expr.symbol) return 1`) -------------
		case 'variable':
		case 'greek':
		case 'constant':
		case 'symbol':
		case 'hole':
		case 'infinity':
		case 'signed-zero':
		case 'boolean':
			return 1;

		case 'number':
			return numberCost(node.value);

		// --- structure : gratuite, ce n'est pas une opération ------------------
		case 'delimiter':
			return computeCost(node.content);

		/**
		 * Écart 3 : un indice NOMME, il ne calcule pas. `x_1` est une variable,
		 * pas une opération à 11 points — CE la boîterait d'ailleurs comme un
		 * symbole unique.
		 */
		case 'subscript':
			return 1 + childrenCost(node);

		/**
		 * Écart 3 : une unité annote une grandeur. La facturer 11 pousserait
		 * `simplify` à préférer `12` à `12 km`.
		 */
		case 'unit':
			return 1 + computeCost(node.expression);

		// --- arithmétique : les poids du Compute Engine ------------------------
		case 'addition':
			return 3 + childrenCost(node);

		case 'subtraction':
			return 4 + childrenCost(node);

		/** CE : `Negate` vaut 4. `positive` est le même signe unaire. */
		case 'opposite':
		case 'positive':
			return 4 + childrenCost(node);

		case 'multiplication':
			return 7 + childrenCost(node);

		case 'division':
			return 8 + childrenCost(node);

		/**
		 * Écart 1 — **le seul poids qu'on ne porte pas, et la raison compte.**
		 *
		 * CE ne facture pas la puissance : leur commentaire dit « we want 2q^2 to
		 * be less expensive than 2qq, so we ignore the exponent » (leur code, lui,
		 * ignore la BASE — il rend `costFunction(ops[1])`, et `ops[1]` est
		 * l'exposant : il fait l'inverse de son propre commentaire).
		 *
		 * ⚠️ Porté tel quel, `x^2` coûterait 1 comme `x`, donc `x² + x²` coûterait
		 * aussi peu que `x + x` — et **mesuré**, `x² + x² → 2x²` cesse alors
		 * d'être retenu. Ce poids ne tient que dans LEUR architecture, où la forme
		 * canonique remplace l'expression AVANT que le coût n'arbitre ; chez nous
		 * le coût arbitre contre l'entrée, donc rendre les puissances presque
		 * gratuites bloque le regroupement des termes semblables.
		 *
		 * On garde donc `3 + enfants`. Leur BUT est atteint autrement, par les
		 * poids généraux : `2x²` (13) reste moins cher que `2·x·x` (17), parce
		 * qu'une multiplication coûte 7.
		 */
		case 'superscript':
			return 3 + childrenCost(node);

		case 'function': {
			const baseCost = FUNCTION_COSTS[node.name] ?? OTHER_FUNCTION_COST;
			const argsCost = node.args.reduce((sum, arg) => sum + computeCost(arg), 0);
			const powerCost = node.power ? computeCost(node.power) : 0;
			// Pénalise la négation dans un argument : on préfère -f(x) à f(-x).
			const negArgPenalty = node.args.filter((a) => a.type === 'opposite').length;
			return baseCost + argsCost + powerCost + negArgPenalty;
		}

		// --- tout le reste : « else nameCost = 11 » ---------------------------
		case 'matrix':
			return (
				OTHER_FUNCTION_COST +
				node.rows.reduce((sum, row) => sum + row.reduce((s, e) => s + computeCost(e), 0), 0)
			);

		case 'complex':
		case 'composition':
		case 'relation':
		case 'logical':
		case 'logical-not':
		case 'piecewise':
		case 'limit':
			return OTHER_FUNCTION_COST + childrenCost(node);

		default: {
			const _exhaustive: never = node;
			return _exhaustive;
		}
	}
}

/**
 * Sum of costs of all children of a node.
 */
function childrenCost(node: MathNode): number {
	return getChildren(node).reduce((sum, child) => sum + computeCost(child), 0);
}

// =============================================================================
// Comparison Utility
// =============================================================================

/**
 * Le biais en faveur du NOUVEAU, porté tel quel.
 *
 * CE : « return the cheapest of the two, **with a bias towards the new**
 * (which can actually be a bit more expensive than the old one, and still be
 * picked) » — `cost(new) <= 1.2 * cost(old)`.
 *
 * Il empêche une réécriture juste d'être refusée pour un point de coût.
 */
export const NEW_FORM_BIAS = 1.2;

/**
 * Laquelle garder, de l'ancienne écriture et de la nouvelle ?
 *
 * ⚠️ **Directionnel, pas symétrique** : le second argument est le CANDIDAT,
 * et il gagne les égalités. La version précédente comparait deux nœuds sans
 * ordre et donnait l'égalité au premier — le nom de CE avait voyagé, son
 * contenu non, et elle n'a jamais eu d'appelant.
 *
 * @param oldNode - L'écriture en place
 * @param newNode - Celle qu'on propose à la place
 */
export function cheapest(oldNode: MathNode, newNode: MathNode): MathNode {
	return computeCost(newNode) <= NEW_FORM_BIAS * computeCost(oldNode) ? newNode : oldNode;
}
