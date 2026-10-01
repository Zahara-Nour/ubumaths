/**
 * Statistiques — variable aléatoire finie
 *
 * Programme de 1re spécialité (`1SPE-156` à `1SPE-166`) : loi, espérance,
 * variance (formule de König-Huygens, en calcul exact), écart type.
 *
 * ⚠️ Aucun import `$lib` : voir `statistics/describe`.
 *
 * @module statistics/random-variable
 */

import { Fraction } from './fraction';
import { failure, success, type Outcome } from './outcome';

// =============================================================================
// Types
// =============================================================================

export interface RandomVariableLaw {
	readonly expectation: Fraction;
	readonly variance: Fraction;
	/** Écart type, valeur approchée */
	readonly deviation: number;
	/** Écart type exact quand la racine tombe juste, sinon null */
	readonly exactDeviation: Fraction | null;
}

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Espérance, variance et écart type d'une variable aléatoire de loi donnée.
 *
 * @returns `null` sans aucune valeur ; un échec en français si la loi n'en est
 *   pas une (somme ≠ 1, probabilité hors de [0 ; 1], valeurs en double).
 */
export function randomVariable(
	values: readonly Fraction[],
	probabilities: readonly Fraction[]
): Outcome<RandomVariableLaw> | null {
	if (values.length === 0 && probabilities.length === 0) return null;
	if (values.length !== probabilities.length) {
		return failure(
			`${values.length} valeur(s) pour ${probabilities.length} probabilité(s) : il en faut autant.`
		);
	}
	for (const [i, value] of values.entries()) {
		if (values.findIndex((other) => other.equals(value)) !== i) {
			return failure(`La valeur « ${value} » apparaît deux fois : chaque valeur une seule fois.`);
		}
	}
	const outside = probabilities.find((p) => p.isNegative() || p.greaterThan(Fraction.ONE));
	if (outside !== undefined) {
		return failure(`La probabilité ${outside} n'est pas entre 0 et 1.`);
	}
	const sum = probabilities.reduce((total, p) => total.add(p), Fraction.ZERO);
	if (!sum.equals(Fraction.ONE)) {
		return failure(`La somme des probabilités fait ${sum}, pas 1.`);
	}

	let expectation = Fraction.ZERO;
	let squares = Fraction.ZERO;
	values.forEach((value, i) => {
		expectation = expectation.add(value.mul(probabilities[i]));
		squares = squares.add(value.mul(value).mul(probabilities[i]));
	});
	// König-Huygens : V(X) = E(X²) − E(X)²
	const variance = squares.sub(expectation.mul(expectation));

	return success({
		expectation,
		variance,
		deviation: Math.sqrt(variance.toNumber()),
		exactDeviation: variance.sqrt()
	});
}
