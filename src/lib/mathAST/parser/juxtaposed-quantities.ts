/**
 * Durées juxtaposées — chantier lecture-grandeurs, PR 5 (décisions 6 et 10 de David,
 * 2026-10-20 ; docs/wip/lecture-grandeurs-phase0.md § PR 5)
 *
 * `2[h] 30[min]`, `2[h]30[min]`, `{2[h]}{30[min]}` (et en LaTeX `2~\unit{h}~30~\unit{min}`)
 * se lisent comme UNE durée : la somme 2 h + 30 min, marquée « juxtaposée » pour
 * s'écrire sans `+`. Règles :
 * - la durée composée est un bloc face à `+` et `−` : `3[h] - 1[h] 30[min]` = 1 h 30 min ;
 *   un signe en tête porte sur tout le bloc : `-2[h] 30[min]` = −(2 h 30 min) ;
 * - collée à `*` ou `/`, d'un côté comme de l'autre, elle est refusée (`2*1[h] 30[min]` :
 *   2 h 30 min ou 3 h ?) ; entre parenthèses, elle se lit : `2*(1[h] 30[min])` = 3 h ;
 * - chaque terme est UN nombre et son unité ; l'ordre et les unités répétées ne sont
 *   pas jugés ici (`30[min] 2[h]` est lu) ;
 * - seules les durées se juxtaposent (David, 2026-10-20 : les angles attendent les
 *   unités ′ et ″, absentes de mathAST) : `2[m] 30[cm]`, `2[m]3[m]` sont refusés ;
 *   entre accolades, deux grandeurs qui ne sont pas des durées restent un produit
 *   (`{2[m]}{3[m]}` = 6 m²).
 *
 * Partagé par les quatre parseurs (maison et LaTeX, Pratt et RD) : même lecture, mêmes
 * refus, code `JUXTAPOSED_QUANTITIES`.
 *
 * @module mathAST/parser/juxtaposed-quantities
 */

import { isJuxtaposedSum } from '../guards';
import { juxtaposedSum, opposite, positive } from '../factory';
import { exactConversion } from '../units/exact';
import type { MathNode, UnitNode } from '../types';

// =============================================================================
// Types
// =============================================================================

/** Pourquoi une juxtaposition est refusée */
export type JuxtapositionRefusal = 'operator' | 'notDuration' | 'missingUnit';

// =============================================================================
// Constantes
// =============================================================================

/** Les messages des refus (anglais : l'atelier les traduit) */
export const JUXTAPOSITION_MESSAGES: Readonly<Record<JuxtapositionRefusal, string>> = {
	operator:
		'Ambiguous compound duration next to * or /: write 2*(1 h 30 min) for 3 h, or 2*1 h + 30 min for 2 h 30 min',
	notDuration:
		'Only durations can be written side by side, each as a number and its unit (2 h 30 min)',
	missingUnit: 'Each part of a compound duration needs its unit (write 2 h 30 min)'
};

// =============================================================================
// Fonctions
// =============================================================================

/** Une unité de durée (`h`, `min`, `s`) */
function isDurationUnit(node: UnitNode): boolean {
	const conversion = exactConversion(node.unit.original ?? '');
	return (
		conversion !== null && conversion.components.size === 1 && conversion.components.get('s') === 1
	);
}

/** Un nombre et son unité, sans signe : `30[min]` */
function isPlainQuantity(node: MathNode): node is UnitNode {
	return node.type === 'unit' && node.expression.type === 'number';
}

/** Une durée simple : `30[min]` */
function isPlainDuration(node: MathNode): node is UnitNode {
	return isPlainQuantity(node) && isDurationUnit(node);
}

/** Le signe en tête d'un terme (`-2[h]`), séparé de sa grandeur */
function splitSign(node: MathNode): { sign: 'opposite' | 'positive' | null; term: MathNode } {
	if (node.type === 'opposite' || node.type === 'positive') {
		return { sign: node.type, term: node.operand };
	}
	if (node.type === 'unit') {
		const value = node.expression;
		if (value.type === 'opposite' || value.type === 'positive') {
			return { sign: value.type, term: { ...node, expression: value.operand } };
		}
	}
	return { sign: null, term: node };
}

/** Le signe remis devant le bloc : `-2[h] 30[min]` = −(2 h 30 min) */
function withSign(sign: 'opposite' | 'positive' | null, node: MathNode): MathNode {
	if (sign === 'opposite') return opposite(node);
	if (sign === 'positive') return positive(node);
	return node;
}

/** Le dernier facteur d'un terme, au travers des produits, quotients et signes */
function lastFactor(node: MathNode): MathNode {
	switch (node.type) {
		case 'multiplication':
			return lastFactor(node.right);
		case 'division':
			return lastFactor(node.denominator);
		case 'opposite':
		case 'positive':
			return lastFactor(node.operand);
		default:
			return node;
	}
}

/** Le premier facteur d'un terme : `30[min]` dans `30[min]/2` */
function firstFactor(node: MathNode): MathNode {
	switch (node.type) {
		case 'multiplication':
			return firstFactor(node.left);
		case 'division':
			return firstFactor(node.numerator);
		default:
			return node;
	}
}

/** Le terme finit-il par une grandeur (`2[h]`, `3*2[h]`, `1[h] 30[min]`) ? */
export function endsWithQuantity(node: MathNode): boolean {
	const last = lastFactor(node);
	return last.type === 'unit' || isJuxtaposedSum(last);
}

/** Le terme finit-il par une durée (simple ou composée) ? */
function endsWithDuration(node: MathNode): boolean {
	const last = lastFactor(node);
	return isPlainDuration(last) || isJuxtaposedSum(last);
}

/** Un terme fait d'un produit ou d'un quotient, au signe et à l'unité près : `(2*1)[h]` */
function isProductTerm(node: MathNode): boolean {
	const inner = node.type === 'unit' ? node.expression : node;
	const { term } = splitSign(inner);
	return term.type === 'multiplication' || term.type === 'division';
}

/** Les termes d'un bloc déjà lu, ou `null` si `node` n'est pas un bloc de durées */
function blockOf(
	node: MathNode
): { sign: 'opposite' | 'positive' | null; block: MathNode } | 'operator' | 'notDuration' {
	const { sign, term } = splitSign(node);
	if (isJuxtaposedSum(term) || isPlainDuration(term)) return { sign, block: term };
	if (isProductTerm(node) || isProductTerm(term)) return 'operator';
	return 'notDuration';
}

/**
 * Un nombre écrit après une grandeur (`2[h] 30[min]`, `2[h] 30`) : `right` est le terme
 * lu après elle, opérateurs compris (`30[min]*2`). Rend la durée composée, un refus, ou
 * `null` quand ce n'est pas une juxtaposition de durées mais le refus habituel d'un
 * nombre après un facteur (`2[m] 30` : `MISSING_OPERATOR`).
 */
export function juxtaposeAfterNumber(
	left: MathNode,
	right: MathNode
): MathNode | JuxtapositionRefusal | null {
	if (lastFactor(right).type !== 'unit' && firstFactor(right).type !== 'unit') {
		return endsWithDuration(left) ? 'missingUnit' : null;
	}
	const head = blockOf(left);
	if (typeof head === 'string') return head;
	if (!isPlainQuantity(right)) return isProductTerm(right) ? 'operator' : 'notDuration';
	if (!isPlainDuration(right)) return 'notDuration';
	return withSign(head.sign, juxtaposedSum(head.block, right));
}

/**
 * Un produit implicite (`{2[h]}{30[min]}`, ou un facteur collé à une durée composée) :
 * la durée composée, un refus, ou `null` pour garder le produit (`{2[m]}{3[m]}`).
 */
export function juxtaposeImplicit(
	left: MathNode,
	right: MathNode
): MathNode | JuxtapositionRefusal | null {
	const leftBlock = blockOf(left);
	if (isPlainDuration(right)) {
		if (typeof leftBlock !== 'string') {
			return withSign(leftBlock.sign, juxtaposedSum(leftBlock.block, right));
		}
		// `2*{1[h]}{30[min]}` : le bloc commencerait après un `*`
		return endsWithDuration(left) ? 'operator' : null;
	}
	// Un facteur collé à une durée composée : `{1[h]}{30[min]}x`, `{1[h]}{30[min]}/2`
	if (isJuxtaposedSum(splitSign(left).term)) return 'operator';
	if (typeof leftBlock !== 'string' && isPlainDuration(firstFactor(right))) return 'operator';
	return null;
}

/** Un opérande de `*`, `/` ou `:` : une durée composée y est refusée (`1[h] 30[min]*2`) */
export function isCompoundDurationOperand(node: MathNode): boolean {
	return isJuxtaposedSum(splitSign(node).term);
}

/**
 * Pour les générateurs : les termes d'une durée composée qui s'écrit sans `+`
 * (`2[h] 30[min]`), ou `null`. Une transformation qui a changé un terme (valeur
 * négative, expression) fait retomber l'écriture sur la somme : « 2 h + 30 min »,
 * valeur juste — l'échec bénin accepté par David (phase 0, PR 5).
 */
export function juxtaposedTerms(node: MathNode): UnitNode[] | null {
	if (!isJuxtaposedSum(node)) return null;
	const terms: UnitNode[] = [];
	const collect = (term: MathNode): boolean => {
		if (isJuxtaposedSum(term)) return collect(term.left) && collect(term.right);
		if (term.type !== 'unit' || term.expression.type !== 'number') return false;
		if (term.expression.value.startsWith('-')) return false;
		terms.push(term);
		return true;
	};
	return collect(node) ? terms : null;
}
