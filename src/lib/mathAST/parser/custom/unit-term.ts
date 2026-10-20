/**
 * L'unité multiplie tout le terme qui la précède — chantier lecture-grandeurs, PR 4
 * (décision 1 de David, 2026-10-20 ; docs/wip/lecture-grandeurs-phase0.md).
 *
 * Le crochet d'unité est lu en postfixe, sur l'atome qui le précède (`2[m]`). Puis,
 * à chaque produit, quotient ou signe unaire construit, l'unité remonte sur le
 * terme entier : `1/2[m]` = (1/2) m (et non 1/(2 m)), `-5[m]` = (−5) m,
 * `2*3[m]` = (2×3) m. Le terme s'arrête :
 * - au `+`/`-` d'addition (jamais construit ici) ;
 * - à une grandeur déjà formée : `6[m]/2[s]` reste (6 m)/(2 s) ;
 * - à des parenthèses (nœud délimiteur) ou à des accolades (`close`) : `2/{7[km]}`
 *   reste 2/(7 km) — `braceWrap` substitue ainsi les valeurs des tirages.
 *
 * Après une grandeur, le terme qui porte l'unité doit être UN nombre (signé ou non) :
 * `6[m]/2*3[s]`, `6[m]*2/3[s]` sont refusés (`AMBIGUOUS_TERM`, E7).
 *
 * Partagé par les deux implémentations (Pratt, RD) : même lecture, même refus.
 *
 * @module mathAST/parser/custom/unit-term
 */

import { hasUnitDescendant } from '../../guards';
import type { MathNode, UnitNode } from '../../types';

// =============================================================================
// Constantes
// =============================================================================

/** Message du refus E7 : le terme qui suit une grandeur compte plusieurs nombres */
export const AMBIGUOUS_TERM_MESSAGE =
	'Ambiguous term before a unit after a quantity: write 6[m]/(2*3[s]) or (6[m]/2)*3[s]';

// =============================================================================
// Fonctions
// =============================================================================

/** Le message d'une unité écrite sans nombre devant (`[m]`) */
export function missingNumberBeforeUnitMessage(unit: string): string {
	return `A unit needs a number before it (write 1[${unit}])`;
}

/** Le dernier facteur d'un terme : `2` dans `6[m]/2`, `x` dans `-3*x` */
export function rightmostFactor(node: MathNode): MathNode {
	switch (node.type) {
		case 'multiplication':
			return rightmostFactor(node.right);
		case 'division':
			return rightmostFactor(node.denominator);
		case 'opposite':
		case 'positive':
			return rightmostFactor(node.operand);
		default:
			return node;
	}
}

/** Une valeur de plusieurs facteurs, au signe près : `2*3`, `-1/2` */
function isMultiFactor(node: MathNode): boolean {
	if (node.type === 'opposite' || node.type === 'positive') return isMultiFactor(node.operand);
	return node.type === 'multiplication' || node.type === 'division';
}

/**
 * Pour les générateurs : l'opérande droit d'un produit ou d'une division en ligne doit-il
 * être fermé (accolades) pour se relire à l'identique ? Oui quand il finit par une grandeur
 * et que la lecture la changerait : après `:/` ou `:`, l'unité passerait sur tout le
 * quotient ; après une grandeur, le produit serait refusé (E7). `2*3[m]` et `2[m]*3[m]`
 * se relisent tels quels.
 */
export function needsClosedRightOperand(
	left: MathNode,
	right: MathNode,
	isDivision: boolean
): boolean {
	if (rightmostFactor(right).type !== 'unit') return false;
	if (!hasUnitDescendant(left)) return isDivision;
	const singleQuantity = right.type === 'unit' && !isMultiFactor(right.expression);
	return !singleQuantity || !hasUnitDescendant(rightmostFactor(left));
}

// =============================================================================
// Classe
// =============================================================================

/**
 * La lecture du terme d'une grandeur, le temps d'un parse. Les marques vivent dans
 * des `WeakSet` : l'arbre rendu n'en porte aucune trace.
 */
export class UnitTermReader {
	/** Grandeurs dont le terme compte plusieurs facteurs (`(2*3)[s]`) */
	private readonly multiFactor = new WeakSet<MathNode>();
	/** Grandeurs fermées par des accolades : leur unité ne remonte plus */
	private readonly closed = new WeakSet<MathNode>();

	constructor(private readonly refuseAmbiguousTerm: () => never) {}

	/** Le contenu d'accolades : une grandeur qui en sort reste fermée */
	close(node: MathNode): MathNode {
		if (node.type === 'unit') this.closed.add(node);
		return node;
	}

	/**
	 * Produit ou quotient `left op right` : si `right` est une grandeur ouverte, son
	 * unité passe sur tout le terme, `build` reçoit alors la VALEUR de la grandeur.
	 */
	binary(
		left: MathNode,
		right: MathNode,
		build: (left: MathNode, right: MathNode) => MathNode
	): MathNode {
		if (!this.isOpenQuantity(right)) return build(left, right);
		if (hasUnitDescendant(left)) {
			// Après une grandeur, le terme qui porte l'unité doit être UN nombre
			const termAfterQuantity = !hasUnitDescendant(rightmostFactor(left));
			if (this.multiFactor.has(right) || termAfterQuantity) this.refuseAmbiguousTerm();
			return build(left, right);
		}
		const lifted: UnitNode = { ...right, expression: build(left, right.expression) };
		this.multiFactor.add(lifted);
		return lifted;
	}

	/** Signe unaire : `-5[m]` = (−5) m, le terme reste UN nombre */
	unary(operand: MathNode, build: (operand: MathNode) => MathNode): MathNode {
		if (!this.isOpenQuantity(operand)) return build(operand);
		const lifted: UnitNode = { ...operand, expression: build(operand.expression) };
		if (this.multiFactor.has(operand)) this.multiFactor.add(lifted);
		return lifted;
	}

	private isOpenQuantity(node: MathNode): node is UnitNode {
		return node.type === 'unit' && !this.closed.has(node);
	}
}
