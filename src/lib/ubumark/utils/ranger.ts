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

import { createRandomSource, shuffled, type RandomSource } from '$lib/utils/random';
import type { RangerSpec } from '../types/ranger';

// Constantes
export const RANGER_MIN_LABELS = 2;
export const RANGER_MAX_LABELS = 8;
/** Dans une question : à 2, l'affichage (l'inverse) donnerait la réponse */
export const RANGER_MIN_LABELS_IN_QUESTION = 3;

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

/** Graine tirée du texte des étiquettes : stable partout, différente d'un bloc à l'autre */
function textSeed(labels: readonly string[]): number {
	let hash = 0;
	for (const char of labels.join('\n')) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) | 0;
	return hash;
}

/**
 * Étiquettes dans l'ordre où l'élève les voit. Dans une question (`case:` posée),
 * le bloc est déjà mélangé : tel quel. Hors question (cours, page d'aide, PDF d'un
 * cours), le bloc est dans l'ordre écrit, qui est la réponse : mélange fixe, tiré du
 * texte des étiquettes (même rendu au serveur et au navigateur, à l'écran et sur
 * papier ; d'un bloc à l'autre, pas le même motif).
 */
export function displayedLabels(spec: Pick<RangerSpec, 'caseIndex' | 'labels'>): string[] {
	if (spec.caseIndex !== undefined) return [...spec.labels];
	const order = rangerOrder(spec.labels.length, createRandomSource(textSeed(spec.labels)));
	return order.map((index) => spec.labels[index]);
}

/** Position affichée lue dans la réponse d'une place (`2`) ; `null` : place vide ou illisible */
export function placedOfAnswer(value: string, count: number): number | null {
	if (!/^\d{1,2}$/.test(value.trim())) return null;
	const position = Number(value.trim());
	return position < count ? position : null;
}
