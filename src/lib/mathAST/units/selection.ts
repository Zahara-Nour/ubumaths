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
const MIN_READABLE = 0.1;

/** Plafond de lisibilité : au-delà, on passe à l'unité supérieure. */
const MAX_READABLE = 1000;

/**
 * Les familles **scolaires**, de la plus grande unité à la plus petite.
 *
 * `tidy` n'écrit pas dans les unités que personne n'emploie (`dam`, `hm`,
 * `dg`, `hg`) : la revue du 2026-09-20 (B1) a relevé `5[m] → 0,5 dam` et
 * `0,3[kg] → 3 hg`. La clé est la **signature de base** de l'unité :
 * `m^1` pour les longueurs, `m^2` pour les aires, `m^3` pour les volumes
 * (finding I2 : `getPrimaryBaseSymbol` rend `null` dès l'exposant 2).
 */
const SCHOOL_FAMILIES: Readonly<Record<string, readonly string[]>> = {
	'm^1': ['km', 'm', 'cm', 'mm'],
	'm^2': ['km^2', 'm^2', 'cm^2', 'mm^2'],
	// 1 m³ = 1000 L ; `mL` et `cm³` sont la même unité, une seule suffit.
	'm^3': ['m^3', 'L', 'mL'],
	'g^1': ['kg', 'g', 'mg'],
	// Jours et années sont scolaires ; `semaine` et `mois` (30 j) ne le sont pas
	// pour un résultat. 400 j n'a pas d'écriture décimale finie en années : il
	// garde ses jours.
	's^1': ['an', 'j', 'h', 'min', 's', 'ms'],
	'K^1': ['K'],
	'A^1': ['A'],
	'mol^1': ['mol'],
	'cd^1': ['cd'],
	'rad^1': ['rad'],
	'€^1': ['€'],
	'$^1': ['$']
};

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
function getPrimaryBaseSymbol(unit: Unit): string | null {
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
 * @returns La valeur convertie et l'unité retenue
 */
export function selectBestUnit(valueInSI: number, baseUnit: Unit): { value: number; unit: Unit } {
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

		if (absValue >= MIN_READABLE && absValue <= MAX_READABLE) {
			return { value: convertedValue, unit: candidateUnit };
		}

		const score =
			absValue < MIN_READABLE
				? Math.log10(MIN_READABLE / absValue)
				: Math.log10(absValue / MAX_READABLE);

		if (score < bestScore) {
			bestScore = score;
			bestValue = convertedValue;
			bestUnit = candidateUnit;
		}
	}

	return { value: bestValue, unit: bestUnit };
}

// =============================================================================
// Les unités scolaires (`tidy`)
// =============================================================================

/** La signature de base d'une unité : `m^1`, `m^3`, `g^1*m^1*s^-2`, … */
function baseSignature(components: ReadonlyMap<string, number>): string {
	return [...components.entries()]
		.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
		.map(([symbol, exponent]) => `${symbol}^${exponent}`)
		.join('*');
}

/**
 * La famille scolaire d'une unité de base, ou `null` s'il n'y en a pas
 * (unité composée : `km/h`, `kg.m/s²`).
 */
export function schoolFamily(components: ReadonlyMap<string, number>): readonly string[] | null {
	return SCHOOL_FAMILIES[baseSignature(components)] ?? null;
}
