/**
 * Les coefficients de conversion, en **rationnels exacts**.
 *
 * Contrat : `docs/wip/tidy-phase0.md` §D.1, et son erratum du 2026-09-20.
 * `floatToRational` n'est pas exact sur les coefficients des définitions
 * (`floatToRational(273.15)` rend `8535937499999999/31250000000000`) :
 * l'exactitude vient de **l'écriture décimale** de la définition, relue par
 * `extractRational(number(String(coefficient)))`, puis composée **par unité
 * nommée** — `km/h` vaut `1000 × 3600⁻¹ = 5/18`, jamais le flottant `0,2777…`.
 *
 * Deux familles n'ont pas d'écriture décimale finie et portent un coefficient
 * exact dans leur définition (`BaseUnitDef.exact`) : `°F` (`5/9`) et les
 * angles `°`/`deg` (`π/180`, π en **facteur symbolique**, ce qui donne
 * `180[°] ≡ π rad`).
 *
 * @module mathAST/units/exact
 */

import type { Rational } from '../normal/types';
import type { BaseUnitDef } from './types';
import { extractRational } from '../common/numeric';
import { number } from '../factory';
import { ONE, mulRational, powRational, rational } from '../normal/rational';
import { resolveUnit } from './definitions';
import { parseUnitTerms } from './parser';

// =============================================================================
// Types
// =============================================================================

/**
 * La conversion exacte d'une écriture d'unité vers les unités de base.
 *
 * `valeur_en_base = (valeur_écrite + offset) × coefficient × π^piPower`, le
 * décalage n'étant présent que pour les unités affines (°C, °F).
 */
export type ExactConversion = {
	/** Le facteur rationnel exact vers les unités de base. */
	readonly coefficient: Rational;
	/** La puissance de π en facteur symbolique (`°` : 1, tout le reste : 0). */
	readonly piPower: number;
	/** Les unités de base et leurs exposants signés (`km/h` → `m:1, s:-1`). */
	readonly components: ReadonlyMap<string, number>;
	/** Le décalage affine, dans l'unité écrite, ou `null` si l'unité est linéaire. */
	readonly offset: Rational | null;
};

// =============================================================================
// Coefficient exact d'une unité nommée
// =============================================================================

/**
 * Le rationnel exact d'une écriture décimale de définition (`"1000"`,
 * `"0.3048"`, `"1e-9"`). `null` si l'écriture n'est pas relisible.
 */
function exactFromWriting(value: number): Rational | null {
	return extractRational(number(String(value)));
}

/** Le coefficient exact d'une unité nommée vers son unité de base. */
function exactCoefficient(def: BaseUnitDef): { coefficient: Rational; piPower: number } | null {
	if (def.exact !== undefined) {
		return {
			coefficient: rational(BigInt(def.exact.n), BigInt(def.exact.d)),
			piPower: def.exact.piPower ?? 0
		};
	}
	const coefficient = exactFromWriting(def.coefficient);
	return coefficient === null ? null : { coefficient, piPower: 0 };
}

/** Cette définition est-elle affine (°C, °F) ? */
function isAffineDef(def: BaseUnitDef): boolean {
	return def.offset !== undefined && def.offset !== 0;
}

// =============================================================================
// Conversion exacte d'une écriture d'unité
// =============================================================================

/**
 * Compose la conversion exacte d'une écriture d'unité, unité nommée par unité
 * nommée. Rend `null` dès qu'un symbole ne se résout pas, qu'un coefficient
 * n'est pas relisible, ou qu'une unité affine est composée avec une autre.
 *
 * @param writing - L'écriture de l'unité (`km`, `km/h`, `kg.m/s^2`, `°C`)
 * @returns La conversion exacte, ou `null`
 */
export function exactConversion(writing: string): ExactConversion | null {
	const terms = parseUnitTerms(writing);
	if (terms === null || terms.length === 0) return null;

	let coefficient = ONE;
	let piPower = 0;
	let offset: Rational | null = null;
	const components = new Map<string, number>();

	for (const { symbol, exponent } of terms) {
		if (!Number.isInteger(exponent)) return null;

		const def = resolveUnit(symbol);
		if (def === null) return null;

		if (isAffineDef(def)) {
			// Une unité affine ne se compose pas : seule, et à l'exposant 1.
			if (terms.length !== 1 || exponent !== 1) return null;
			const shift = exactFromWriting(def.offset ?? 0);
			if (shift === null) return null;
			offset = shift;
		}

		const exact = exactCoefficient(def);
		if (exact === null) return null;
		coefficient = mulRational(coefficient, powRational(exact.coefficient, exponent));
		piPower += exact.piPower * exponent;

		// Les unités dérivées nommées (N, J, …) portent leur signature complète ;
		// les unités simples se résument à leur unité de base.
		const defComponents = def.components ?? new Map<string, number>([[def.baseSymbol, 1]]);
		for (const [base, componentExponent] of defComponents) {
			const total = (components.get(base) ?? 0) + componentExponent * exponent;
			if (total === 0) components.delete(base);
			else components.set(base, total);
		}
	}

	return { coefficient, piPower, components, offset };
}

/**
 * La clé de dimension d'une conversion : deux grandeurs de même clé se
 * regroupent (`12[km]` et `500[m]` partagent `m^1`).
 */
export function dimensionKey(conversion: ExactConversion): string {
	const components = [...conversion.components.entries()]
		.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
		.map(([symbol, exponent]) => `${symbol}^${exponent}`)
		.join('*');
	return `${components}:pi^${conversion.piPower}`;
}
