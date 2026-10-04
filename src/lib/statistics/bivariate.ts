/**
 * Statistiques — série statistique à deux variables (manche 15, Q172)
 *
 * Point moyen, droite des moindres carrés (y en x) et prévisions EXACTES, en
 * fractions : un bloc ```nuage écrit a ≈ 3,686 arrondi UNE fois depuis 129/35,
 * jamais depuis un décimal déjà arrondi. r est irrationnel en général : il
 * reste décimal (r² est exact, ce qui dit si r vaut ±1).
 *
 * `fitAffine` (`fit.ts`) reste la source de l'atelier ; ce module sert les
 * blocs, qui affichent des valeurs arrondies.
 *
 * ⚠️ Aucun import `$lib` : voir `statistics/describe`.
 *
 * @module statistics/bivariate
 */

import { roundExact } from './binomial';
import { Fraction } from './fraction';
import { readListValue } from './read-value';

// =============================================================================
// Types
// =============================================================================

export interface BivariateFit {
	meanX: Fraction;
	meanY: Fraction;
	/** a dans y = ax + b */
	slope: Fraction;
	/** b dans y = ax + b */
	intercept: Fraction;
	/** Coefficient de corrélation ; null si les ordonnées sont toutes égales */
	correlation: { value: number; exact: Fraction | null } | null;
	/** Étendue des abscisses observées (interpolation / extrapolation) */
	minX: Fraction;
	maxX: Fraction;
}

// =============================================================================
// Constantes
// =============================================================================

/** Chiffres gardés pour passer de r² (fraction) à un décimal sans débordement */
const DECIMAL_SCALE = 10n ** 18n;

// =============================================================================
// Fonctions
// =============================================================================

function divide(a: Fraction, b: Fraction): Fraction {
	return new Fraction(a.num * b.den, a.den * b.num);
}

function sum(values: readonly Fraction[]): Fraction {
	return values.reduce((total, value) => total.add(value), Fraction.ZERO);
}

/**
 * Une fraction positive en décimal, sans passer par `Number(num)` : numérateur
 * et dénominateur peuvent dépasser 10^308 sur cent points à quinze chiffres.
 */
function toDecimal(value: Fraction): number {
	return Number((value.num * DECIMAL_SCALE) / value.den) / Number(DECIMAL_SCALE);
}

/**
 * Une valeur de série écrite par l'auteur, EXACTE : le lecteur de nombres
 * commun (`0,5`, `2.5`, `−3`, `1/3`) décide de ce qui est un nombre ; la
 * fraction vient de l'écriture, sinon du décimal (`1e3`). null : pas un nombre
 * (un pourcentage n'en est pas un ici).
 */
export function readExactValue(text: string): Fraction | null {
	const written = text.trim().replaceAll('−', '-');
	if (written.includes('%')) return null;
	const value = readListValue(written);
	if (value === null) return null;
	return Fraction.parse(written.replace(/^\+/, '')) ?? Fraction.fromNumber(value);
}

/**
 * Point moyen, droite des moindres carrés et r d'une série (xᵢ ; yᵢ), même
 * longueur ; null si les abscisses sont toutes égales (pas de y = ax + b).
 */
export function bivariateFit(
	xs: readonly Fraction[],
	ys: readonly Fraction[]
): BivariateFit | null {
	const n = new Fraction(BigInt(xs.length));
	const meanX = divide(sum(xs), n);
	const meanY = divide(sum(ys), n);
	let covariance = Fraction.ZERO;
	let varianceX = Fraction.ZERO;
	let varianceY = Fraction.ZERO;
	xs.forEach((x, i) => {
		const dx = x.sub(meanX);
		const dy = ys[i].sub(meanY);
		covariance = covariance.add(dx.mul(dy));
		varianceX = varianceX.add(dx.mul(dx));
		varianceY = varianceY.add(dy.mul(dy));
	});
	if (varianceX.equals(Fraction.ZERO)) return null;

	const slope = divide(covariance, varianceX);
	const intercept = meanY.sub(slope.mul(meanX));

	let correlation: BivariateFit['correlation'] = null;
	if (!varianceY.equals(Fraction.ZERO)) {
		// r² = cov² / (Vx·Vy) est exact : r = ±1 se reconnaît sans flottant
		const squared = divide(covariance.mul(covariance), varianceX.mul(varianceY));
		const root = squared.sqrt();
		const sign = covariance.isNegative() ? -1n : 1n;
		const exact = root === null ? null : new Fraction(sign * root.num, root.den);
		const magnitude = exact === null ? Math.sqrt(toDecimal(squared)) : Math.abs(exact.toNumber());
		correlation = { value: Number(sign) * magnitude, exact };
	}

	let minX = xs[0];
	let maxX = xs[0];
	for (const x of xs) {
		if (minX.greaterThan(x)) minX = x;
		if (x.greaterThan(maxX)) maxX = x;
	}
	return { meanX, meanY, slope, intercept, correlation, minX, maxX };
}

/** ŷ = ax + b */
export function predictY(fit: BivariateFit, x: Fraction): Fraction {
	return fit.slope.mul(x).add(fit.intercept);
}

/** x tel que ax + b = y ; null si la pente est nulle (aucun x, ou tous). */
export function predictX(fit: BivariateFit, y: Fraction): Fraction | null {
	if (fit.slope.equals(Fraction.ZERO)) return null;
	return divide(y.sub(fit.intercept), fit.slope);
}

/** Interpolation : x dans l'étendue des abscisses observées, bornes comprises. */
export function isInterpolation(fit: BivariateFit, x: Fraction): boolean {
	return !fit.minX.greaterThan(x) && !x.greaterThan(fit.maxX);
}

/**
 * Arrondi unique à `places` décimales, demi vers le haut sur la valeur absolue
 * (−0,125 → −0,13). `digits` s'écrit avec un point, zéros finals gardés
 * (`4.630`) ; `exact` : la valeur tombe juste à cette précision.
 */
export function roundFraction(value: Fraction, places: number): { digits: string; exact: boolean } {
	const negative = value.isNegative();
	const { digits, exact } = roundExact(negative ? -value.num : value.num, value.den, places);
	// Pas de « −0,00 » : un arrondi nul n'a pas de signe
	const zero = /^[0.]+$/.test(digits);
	return { digits: negative && !zero ? `-${digits}` : digits, exact };
}
