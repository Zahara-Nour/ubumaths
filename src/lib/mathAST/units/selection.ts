/**
 * Le choix de l'unité adaptée à l'ordre de grandeur.
 *
 * Déplacé depuis `eval/evaluate-with-units.ts` (où il était privé) pour que
 * `tidy` s'en serve aussi (§D.3 de `docs/wip/tidy-phase0.md`). Le seuil bas
 * est un paramètre : l'évaluation garde le sien (0,1), `tidy` demande le sien.
 *
 * @module mathAST/units/selection
 */

import type { Unit } from './types';
import { getConversionFactor } from './conversion';
import { getUnitFamily } from './definitions';
import { unit as namedUnit } from './factory';

// =============================================================================
// Constantes
// =============================================================================

/** Plancher de lisibilité de l'évaluation (`evaluateWithUnits`, mode `best`). */
export const MIN_READABLE = 0.1;

/** Plafond de lisibilité : au-delà, on passe à l'unité supérieure. */
export const MAX_READABLE = 1000;

/** En deçà, la valeur est tenue pour nulle et l'unité de base est conservée. */
const EPSILON = 1e-9;

// =============================================================================
// Choix de l'unité
// =============================================================================

/**
 * Le symbole de base d'une unité **simple** (un seul composant, exposant 1).
 *
 * `null` pour une unité composée (`m/s`) ou puissante (`m^2`) : ces unités
 * n'ont pas de famille, donc pas de meilleure unité.
 */
export function getPrimaryBaseSymbol(unit: Unit): string | null {
	const entries = Array.from(unit.components.entries());
	if (entries.length === 1 && entries[0][1] === 1) {
		return entries[0][0];
	}
	return null;
}

/**
 * Choisit l'unité qui place la valeur dans la plage lisible.
 *
 * Parcourt la famille de la plus grande unité à la plus petite et retient la
 * première qui convient ; si aucune ne convient, celle qui s'en approche le
 * plus (distance logarithmique à la plage).
 *
 * @param valueInSI - La valeur exprimée dans l'unité de base
 * @param baseUnit - L'unité de base
 * @param minReadable - Le plancher de lisibilité (défaut : celui de l'évaluation)
 * @returns La valeur convertie et l'unité retenue
 */
export function selectBestUnit(
	valueInSI: number,
	baseUnit: Unit,
	minReadable: number = MIN_READABLE
): { value: number; unit: Unit } {
	// Valeur nulle ou quasi nulle : l'unité de base est conservée.
	if (Math.abs(valueInSI) < EPSILON) {
		return { value: valueInSI, unit: baseUnit };
	}

	const baseSymbol = getPrimaryBaseSymbol(baseUnit);
	if (baseSymbol === null) {
		return { value: valueInSI, unit: baseUnit };
	}

	const family = getUnitFamily(baseSymbol);

	let bestUnit: Unit = baseUnit;
	let bestValue: number = valueInSI;
	let bestScore: number = Infinity;

	for (const symbol of family) {
		const candidateUnit = namedUnit(symbol);
		if (candidateUnit === null) continue;

		const factor = getConversionFactor(baseUnit, candidateUnit);
		if (factor === null) continue;

		const convertedValue = valueInSI * factor;
		const absValue = Math.abs(convertedValue);

		if (absValue >= minReadable && absValue <= MAX_READABLE) {
			return { value: convertedValue, unit: candidateUnit };
		}

		const score =
			absValue < minReadable
				? Math.log10(minReadable / absValue)
				: Math.log10(absValue / MAX_READABLE);

		if (score < bestScore) {
			bestScore = score;
			bestValue = convertedValue;
			bestUnit = candidateUnit;
		}
	}

	return { value: bestValue, unit: bestUnit };
}
