/**
 * Étiquettes à ranger : le mélange du tirage
 * ==========================================
 *
 * `order[j]` = rang écrit de l'étiquette affichée en position `j`. Jamais l'ordre
 * écrit (déjà rangé) ; jamais l'ordre inverse dès 3 étiquettes (rangé à l'envers) —
 * à 2 étiquettes, l'envers est le seul désordre possible.
 *
 * @module ubumark/utils/ranger
 */

import { shuffled, type RandomSource } from '$lib/utils/random';

// Constantes
export const RANGER_MIN_LABELS = 2;
export const RANGER_MAX_LABELS = 8;

// Functions
const isIdentity = (order: readonly number[]) => order.every((value, k) => value === k);
const isReverse = (order: readonly number[]) =>
	order.every((value, k) => value === order.length - 1 - k);

/**
 * Ordre affiché de `count` étiquettes, sur la source de hasard de l'instance.
 * Tirage recommencé tant qu'il est rangé (ou à l'envers) : au plus 2 permutations
 * sur `count!` refusées, l'attente est courte.
 */
export function rangerOrder(count: number, random: RandomSource): number[] {
	const written = Array.from({ length: count }, (_, k) => k);
	if (count < 2) return written;
	if (count === 2) return [1, 0];
	for (;;) {
		const order = shuffled(written, random);
		if (!isIdentity(order) && !isReverse(order)) return order;
	}
}
