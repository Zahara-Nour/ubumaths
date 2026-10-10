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

import { Fraction } from './fraction';

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

/**
 * Plus grand dénominateur d'une fraction écrite (`2/7`) : au-delà, cent points
 * aux dénominateurs distincts font des calculs exacts de milliers de chiffres
 * (2,5 s pour des dénominateurs à 15 chiffres, revue) ; à 1000, ≈ 40 ms.
 */
export const MAX_WRITTEN_DENOMINATOR = 1000n;

/** Chiffres d'un nombre écrit, comme `Fraction.parse` (au-delà : refusé) */
const MAX_WRITTEN_DIGITS = 15;

/** `12`, `-0,5`, `2.5`, `1/3` : la forme d'un nombre (avant de compter ses chiffres) */
const NUMBER_SHAPE = /^[-+]?\d+(?:[.,]\d+)?$|^[-+]?\d+\s*\/\s*\d+$/;

/** Chiffres gardés par `toSafeNumber` avant la conversion en décimal */
const SAFE_DIGITS = 300;

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
 * Une fraction en décimal, sans débordement : `Number(num) / Number(den)`
 * donne Infinity / Infinity = NaN dès 309 chiffres (revue). Numérateur et
 * dénominateur sont raccourcis ensemble, ce qui garde le rapport.
 */
export function toSafeNumber(value: Fraction): number {
	const length = (n: bigint) => (n < 0n ? -n : n).toString().length;
	const digits = Math.max(length(value.num), length(value.den));
	if (digits <= SAFE_DIGITS) return Number(value.num) / Number(value.den);
	const cut = 10n ** BigInt(digits - SAFE_DIGITS);
	return Number(value.num / cut) / Number(value.den / cut);
}

/**
 * Une valeur de série écrite par l'auteur, EXACTE, lue comme les autres blocs
 * (`Fraction.parse`) : `0,5`, `2.5`, `−3`, `+3`, `1/3`. null : pas un nombre
 * (`0x1A`, `1e3`, un pourcentage), plus de 15 chiffres, ou un dénominateur
 * écrit au-delà de 1000 — `invalidValueReason` dit lequel.
 */
export function readExactValue(text: string): Fraction | null {
	const written = text.trim().replaceAll('−', '-').replace(/^\+/, '');
	if (!NUMBER_SHAPE.test(written)) return null;
	const value = Fraction.parse(written);
	if (value === null) return null;
	const slash = written.indexOf('/');
	if (slash !== -1 && BigInt(written.slice(slash + 1).trim()) > MAX_WRITTEN_DENOMINATOR)
		return null;
	return value;
}

/** Pourquoi `readExactValue` a refusé ce texte, en français (message d'auteur) */
export function invalidValueReason(text: string): string {
	const written = text.trim().replaceAll('−', '-').replace(/^\+/, '');
	if (NUMBER_SHAPE.test(written)) {
		const parts = written
			.replace('-', '')
			.split('/')
			.map((part) => part.trim());
		if (parts.some((part) => part.replace(/[.,]/, '').length > MAX_WRITTEN_DIGITS)) {
			return `« ${text.trim()} » : au plus ${MAX_WRITTEN_DIGITS} chiffres`;
		}
		if (parts.length === 2 && Number(parts[1]) === 0)
			return `« ${text.trim()} » : dénominateur nul`;
		if (parts.length === 2) {
			return `« ${text.trim()} » : dénominateur au plus ${MAX_WRITTEN_DENOMINATOR}`;
		}
	}
	return `« ${text.trim()} » n’est pas un nombre`;
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
		const magnitude =
			exact === null ? Math.sqrt(toSafeNumber(squared)) : Math.abs(toSafeNumber(exact));
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
