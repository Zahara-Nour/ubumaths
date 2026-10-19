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
import { denormalize, normalize } from '../normal';

/**
 * Le membre base + k·période, réduit (`normalize`) ; la somme brute si la
 * réduction échoue.
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
		return denormalize(normalize(raw));
	} catch {
		return raw;
	}
}
