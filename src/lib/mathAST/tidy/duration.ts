/**
 * Une durée écrite en heures, minutes, secondes : `2 h 30 min`.
 *
 * Règle commune de l'unité du résultat (David, 2026-11-02, chantier
 * registre-reference) : quand l'élève a tapé au moins deux de h, min, s et que
 * la durée tombe juste en secondes, le résultat s'écrit en h-min-s
 * (`1[h] - 59[min]` → `1 min`, `2*(1[h] 30[min])` → `3 h`). Une seule fonction
 * pour `tidy`, l'Atelier et `{{eval}}`.
 *
 * L'arbre est la somme JUXTAPOSÉE des parties (lecture-grandeurs, PR 5) : il
 * s'écrit `2[h] 30[min]` et se relit à l'identique.
 *
 * @module mathAST/tidy/duration
 */

import { juxtaposedSum, number, opposite, withUnit } from '../factory';
import { isJuxtaposedSum } from '../guards';
import { parse as parseUnit } from '../units/parser';
import type { Rational } from '../normal/types';
import type { MathNode } from '../types';

// =============================================================================
// Types
// =============================================================================

/** Une partie d'une durée composée : `30` et `min`. */
export type DurationPart = { readonly count: bigint; readonly symbol: string };

// =============================================================================
// Constantes
// =============================================================================

/** Les unités d'une durée composée, de la plus grande à la plus petite. */
export const DURATION_PARTS: readonly (readonly [string, bigint])[] = [
	['h', 3600n],
	['min', 60n],
	['s', 1n]
];

// =============================================================================
// Fonctions
// =============================================================================

/** Au moins deux de h, min, s parmi les unités tapées. */
export function typesCompositeDuration(typed: Iterable<string>): boolean {
	const symbols = new Set(typed);
	return DURATION_PARTS.filter(([symbol]) => symbols.has(symbol)).length >= 2;
}

/** Les parties non nulles d'un nombre entier positif de secondes : 9000 → 2 h, 30 min. */
export function durationParts(seconds: bigint): DurationPart[] {
	let rest = seconds;
	const parts: DurationPart[] = [];
	for (const [symbol, size] of DURATION_PARTS) {
		const count = rest / size;
		rest %= size;
		if (count !== 0n) parts.push({ count, symbol });
	}
	return parts;
}

/**
 * La durée en h-min-s d'une valeur en secondes : `9000` → `2[h] 30[min]`,
 * `-9000` → `-(2[h] 30[min])` (sans parenthèses à l'écrit), `10800` → `3[h]`.
 * `null` si elle ne tombe pas juste en secondes, ou vaut zéro.
 */
export function compositeDurationNode(seconds: Rational): MathNode | null {
	if (seconds.d !== 1n) return null;
	const negative = seconds.n < 0n;
	const parts = durationParts(negative ? -seconds.n : seconds.n);
	if (parts.length === 0) return null;
	const nodes: MathNode[] = [];
	for (const { count, symbol } of parts) {
		const unit = parseUnit(symbol);
		if (unit === null) return null;
		nodes.push(withUnit(number(count.toString()), { ...unit, original: symbol }));
	}
	const duration = nodes.reduce((left, right) => juxtaposedSum(left, right));
	return negative ? opposite(duration) : duration;
}

/** Une durée composée (`2[h] 30[min]`), signée ou non. */
export function isCompositeDuration(node: MathNode): boolean {
	return isJuxtaposedSum(node.type === 'opposite' ? node.operand : node);
}
