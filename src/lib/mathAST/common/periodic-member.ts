/**
 * Un membre a + kT d'une famille périodique (zéros d'une équation
 * trigonométrique, valeurs interdites de tan x), écrit sous forme réduite :
 * π/2 + 2π → 5π/2.
 *
 * Partagé par l'énumération des zéros périodiques (`sign/helpers/zeros.ts`) et
 * par les valeurs interdites d'un domaine périodique restreint à un intervalle
 * borné (`domain/algebra.ts`, `intersect`).
 *
 * @module mathAST/common/periodic-member
 */

import type { MathNode } from '../types';
import { add, multiply, number, opposite } from '../factory';
import { canonicalForm } from '../normal';
import { tidy } from '../tidy';

/**
 * Le membre base + k·période, réduit (`normalize`) ; la somme brute si la
 * réduction échoue. Écriture des zéros du solveur (`\\dfrac{2}{3}\\pi`), que
 * `.résoudre` affiche telle quelle.
 */
export function periodicMember(base: MathNode, k: number, period: MathNode): MathNode {
	if (k === 0) return base;

	let kTimesT: MathNode;
	if (k === 1) {
		kTimesT = period;
	} else if (k === -1) {
		kTimesT = opposite(period);
	} else if (k > 0) {
		kTimesT = multiply(number(k.toString()), period, 'implicit');
	} else {
		kTimesT = opposite(multiply(number((-k).toString()), period, 'implicit'));
	}

	const raw = add(base, kTimesT);

	// Normalize to simplify (e.g. 0 + 2π → 2π, π/2 + 2π → 5π/2)
	try {
		return canonicalForm(raw);
	} catch {
		return raw;
	}
}

/**
 * Le membre, mis au propre (`tidy`) : écrit comme une borne du tableau de
 * variations (`variationValueLatex`) — 3π/2, pas 3/2·π ; π/2, pas π / 2. Pour
 * les valeurs interdites d'un domaine et les bornes coupées à ces valeurs.
 */
export function tidyPeriodicMember(base: MathNode, k: number, period: MathNode): MathNode {
	return tidySafe(periodicMember(base, k, period));
}

/** `tidy` peut lever une exception imprévue : la forme reçue reste alors. */
function tidySafe(node: MathNode): MathNode {
	try {
		return tidy(node);
	} catch {
		return node;
	}
}
