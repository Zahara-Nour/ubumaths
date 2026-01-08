/**
 * MathAST Numeric Evaluation
 *
 * Functions for evaluating mathematical expressions to numeric values.
 * Supports both exact (Rational) and decimal (number) evaluation modes.
 */

import type { MathNode } from '../types';
import type { EvalOptions, EvalResult } from './types';
import type { Rational } from '../normal/types';
import { DEFAULT_EVAL_OPTIONS } from './types';
import { getVariables } from './substitute';
import {
	isNumber,
	isVariable,
	isGreek,
	isSymbol,
	isAddition,
	isSubtraction,
	isMultiplication,
	isDivision,
	isOpposite,
	isPositive,
	isFunction,
	isDelimiter,
	isSuperscript,
	isSubscript,
	isRelation,
	isHole,
	isUnit,
	isComposition,
	isDerivativeFunction,
	isInverseFunction,
	isComplex
} from '../guards';
import { substituteFunction } from './function-bindings';
import {
	rational,
	fromInteger,
	addRational,
	subRational,
	mulRational,
	divRational,
	negRational,
	rationalToNumber,
	isZero as isZeroRational,
	ONE
} from '../normal/rational';
import { number, divide } from '../factory';

// =============================================================================
// Types
// =============================================================================

/**
 * Represents a complex number during evaluation.
 */
interface ComplexValue {
	readonly real: number;
	readonly imag: number;
}

/**
 * Internal type representing an intermediate evaluation result.
 * Can be either a Rational (exact), number (decimal/transcendental), or ComplexValue.
 */
type IntermediateValue = Rational | number | ComplexValue;

// =============================================================================
// Constants
// =============================================================================

/** Mathematical constant pi */
const PI_VALUE = Math.PI;

/** Mathematical constant e (Euler's number) - used in symbol evaluation */
const _E_VALUE = Math.E;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Checks if an intermediate value is a Rational.
 */
function isRational(value: IntermediateValue): value is Rational {
	return typeof value === 'object' && 'n' in value && 'd' in value;
}

/**
 * Checks if an intermediate value is a ComplexValue.
 */
function isComplexValue(value: IntermediateValue): value is ComplexValue {
	return typeof value === 'object' && 'real' in value && 'imag' in value;
}

/**
 * Creates a ComplexValue.
 */
function complexValue(real: number, imag: number): ComplexValue {
	return { real, imag };
}

/**
 * Converts an intermediate value to a number.
 * Throws if the value is complex with non-zero imaginary part.
 */
function toNumber(value: IntermediateValue): number {
	if (isRational(value)) {
		return rationalToNumber(value);
	}
	if (isComplexValue(value)) {
		if (value.imag !== 0) {
			throw new Error('Cannot convert complex number with non-zero imaginary part to real number');
		}
		return value.real;
	}
	return value;
}

/**
 * Converts an intermediate value to a real number, treating complex as real part only.
 */
function toRealPart(value: IntermediateValue): number {
	if (isRational(value)) {
		return rationalToNumber(value);
	}
	if (isComplexValue(value)) {
		return value.real;
	}
	return value;
}

/**
 * Converts a value to a ComplexValue (real numbers become complex with imag=0).
 */
function toComplexValue(value: IntermediateValue): ComplexValue {
	if (isComplexValue(value)) {
		return value;
	}
	return complexValue(toRealPart(value), 0);
}

// =============================================================================
// Complex Arithmetic
// =============================================================================

/**
 * Adds two complex numbers: (a+bi) + (c+di) = (a+c) + (b+d)i
 */
function addComplex(a: ComplexValue, b: ComplexValue): ComplexValue {
	return complexValue(a.real + b.real, a.imag + b.imag);
}

/**
 * Subtracts two complex numbers: (a+bi) - (c+di) = (a-c) + (b-d)i
 */
function subComplex(a: ComplexValue, b: ComplexValue): ComplexValue {
	return complexValue(a.real - b.real, a.imag - b.imag);
}

/**
 * Multiplies two complex numbers: (a+bi) * (c+di) = (ac-bd) + (ad+bc)i
 */
function mulComplex(a: ComplexValue, b: ComplexValue): ComplexValue {
	return complexValue(a.real * b.real - a.imag * b.imag, a.real * b.imag + a.imag * b.real);
}

/**
 * Divides two complex numbers: (a+bi) / (c+di) = ((ac+bd) + (bc-ad)i) / (c²+d²)
 */
function divComplex(a: ComplexValue, b: ComplexValue): ComplexValue {
	const denom = b.real * b.real + b.imag * b.imag;
	if (denom === 0) {
		throw new Error('Division by zero');
	}
	return complexValue(
		(a.real * b.real + a.imag * b.imag) / denom,
		(a.imag * b.real - a.real * b.imag) / denom
	);
}

/**
 * Negates a complex number: -(a+bi) = -a - bi
 */
function negComplex(a: ComplexValue): ComplexValue {
	return complexValue(-a.real, -a.imag);
}

/**
 * Simplifies a complex result - if imaginary is 0, return real number.
 */
function simplifyComplex(c: ComplexValue): IntermediateValue {
	// Use small tolerance for floating-point comparison
	const EPSILON = 1e-14;
	if (Math.abs(c.imag) < EPSILON) {
		return c.real;
	}
	return c;
}

/**
 * Computes integer power of a complex number using repeated multiplication.
 */
function intPowComplex(base: ComplexValue, exp: number): ComplexValue {
	if (exp === 0) return complexValue(1, 0);
	if (exp === 1) return base;

	if (exp < 0) {
		// For negative exponent: (a+bi)^(-n) = 1/(a+bi)^n
		const positive = intPowComplex(base, -exp);
		return divComplex(complexValue(1, 0), positive);
	}

	// Repeated squaring for efficiency
	let result = complexValue(1, 0);
	let current = base;
	let e = exp;

	while (e > 0) {
		if (e % 2 === 1) {
			result = mulComplex(result, current);
		}
		current = mulComplex(current, current);
		e = Math.floor(e / 2);
	}

	return result;
}

/**
 * Computes complex power: z^w = exp(w * ln(z))
 * Works for any complex base and exponent.
 */
function complexPow(base: IntermediateValue, exp: IntermediateValue): IntermediateValue {
	// Convert base to ComplexValue
	let baseC: ComplexValue;
	if (isComplexValue(base)) {
		baseC = base;
	} else if (isRational(base)) {
		baseC = complexValue(rationalToNumber(base), 0);
	} else {
		baseC = complexValue(base, 0);
	}

	// Convert exp to ComplexValue
	let expC: ComplexValue;
	if (isComplexValue(exp)) {
		expC = exp;
	} else if (isRational(exp)) {
		expC = complexValue(rationalToNumber(exp), 0);
	} else {
		expC = complexValue(exp, 0);
	}

	// Special cases
	if (expC.real === 0 && expC.imag === 0) {
		return complexValue(1, 0); // z^0 = 1
	}
	if (baseC.real === 0 && baseC.imag === 0) {
		if (expC.real > 0) {
			return complexValue(0, 0); // 0^n = 0 for n > 0
		}
		throw new Error('0^n is undefined for n <= 0');
	}

	// z^w = exp(w * ln(z))
	// ln(z) = ln|z| + i*arg(z)
	const modulus = Math.sqrt(baseC.real * baseC.real + baseC.imag * baseC.imag);
	const theta = Math.atan2(baseC.imag, baseC.real);
	const lnZ: ComplexValue = complexValue(Math.log(modulus), theta);

	// w * ln(z) = (a + bi) * (c + di) = (ac - bd) + (ad + bc)i
	const a = expC.real,
		b = expC.imag;
	const c = lnZ.real,
		d = lnZ.imag;
	const wLnZ: ComplexValue = complexValue(a * c - b * d, a * d + b * c);

	// exp(wLnZ) = exp(re) * (cos(im) + i*sin(im))
	const expRe = Math.exp(wLnZ.real);
	return simplifyComplex(complexValue(expRe * Math.cos(wLnZ.imag), expRe * Math.sin(wLnZ.imag)));
}

/**
 * Parses a number string and returns a Rational if possible, otherwise a number.
 *
 * Handles:
 * - Integers: "5" -> Rational(5, 1)
 * - Decimals: "0.5" -> Rational(1, 2), "0.25" -> Rational(1, 4)
 * - Scientific notation: falls back to number
 */
function parseNumber(value: string): IntermediateValue {
	// Handle scientific notation - use floating point
	if (value.includes('e') || value.includes('E')) {
		return parseFloat(value);
	}

	// Handle negative numbers
	const isNegative = value.startsWith('-');
	const absValue = isNegative ? value.slice(1) : value;

	// Handle integers
	if (!absValue.includes('.')) {
		try {
			const bigVal = BigInt(absValue);
			const n = isNegative ? -bigVal : bigVal;
			return fromInteger(n);
		} catch {
			// If BigInt fails, fall back to float
			return parseFloat(value);
		}
	}

	// Handle decimals
	const [intPart, decPart] = absValue.split('.');
	const decPlaces = decPart.length;

	try {
		const numerator = BigInt(intPart + decPart);
		const denominator = 10n ** BigInt(decPlaces);
		const n = isNegative ? -numerator : numerator;
		return rational(n, denominator);
	} catch {
		// If BigInt fails, fall back to float
		return parseFloat(value);
	}
}

/**
 * Checks if a Rational represents an exact integer.
 */
function isExactInteger(r: Rational): boolean {
	return r.d === 1n;
}

/**
 * Gets the integer value from a Rational if it's an exact integer.
 * Returns null otherwise.
 */
function getExactInteger(r: Rational): bigint | null {
	if (r.d === 1n) {
		return r.n;
	}
	return null;
}

/**
 * Computes integer square root if value is a perfect square.
 * Returns null if not a perfect square or negative.
 */
function exactIntegerSqrt(n: bigint): bigint | null {
	if (n < 0n) return null;
	if (n === 0n) return 0n;
	if (n === 1n) return 1n;

	// Newton's method for integer square root
	let x = n;
	let y = (x + 1n) / 2n;

	while (y < x) {
		x = y;
		y = (x + n / x) / 2n;
	}

	// Check if it's a perfect square
	if (x * x === n) {
		return x;
	}
	return null;
}

/**
 * Tries to compute exact square root of a Rational.
 * Returns Rational if both numerator and denominator are perfect squares.
 */
function exactSqrt(r: Rational): Rational | null {
	if (r.n < 0n) return null; // No real square root of negative

	const sqrtN = exactIntegerSqrt(r.n);
	const sqrtD = exactIntegerSqrt(r.d);

	if (sqrtN !== null && sqrtD !== null) {
		return rational(sqrtN, sqrtD);
	}
	return null;
}

/**
 * Computes power with integer exponent.
 */
function intPow(base: IntermediateValue, exp: number): IntermediateValue {
	if (exp === 0) return ONE;
	if (exp === 1) return base;

	if (isRational(base)) {
		// For rational base with integer exponent, result is rational
		if (exp < 0) {
			if (isZeroRational(base)) {
				throw new Error('Division by zero: 0 raised to negative power');
			}
			// Invert base and negate exponent
			const inverted = rational(base.d, base.n);
			return intPowRational(inverted, -exp);
		}
		return intPowRational(base, exp);
	}

	// For complex base, use complex power
	if (isComplexValue(base)) {
		return simplifyComplex(intPowComplex(base, exp));
	}

	// For number base, use Math.pow
	return Math.pow(base, exp);
}

/**
 * Computes power of a Rational with a positive integer exponent.
 */
function intPowRational(base: Rational, exp: number): Rational {
	if (exp === 0) return ONE;
	if (exp === 1) return base;

	// Use repeated squaring for efficiency
	let result = ONE;
	let current = base;
	let e = exp;

	while (e > 0) {
		if (e % 2 === 1) {
			result = mulRational(result, current);
		}
		current = mulRational(current, current);
		e = Math.floor(e / 2);
	}

	return result;
}

// =============================================================================
// Supported Functions
// =============================================================================

/**
 * Map of supported function names to their evaluation logic.
 */
const SUPPORTED_FUNCTIONS: Record<
	string,
	(args: IntermediateValue[], exactMode: boolean) => IntermediateValue
> = {
	sqrt: (args, exactMode) => {
		if (args.length !== 1) throw new Error('sqrt requires exactly 1 argument');
		const arg = args[0];

		// Try exact evaluation first
		if (exactMode && isRational(arg)) {
			const exact = exactSqrt(arg);
			if (exact !== null) {
				return exact;
			}
		}

		// Fall back to decimal
		const num = toNumber(arg);
		if (num < 0) throw new Error('Cannot compute square root of negative number');
		return Math.sqrt(num);
	},

	sin: (args) => {
		if (args.length !== 1) throw new Error('sin requires exactly 1 argument');
		return Math.sin(toNumber(args[0]));
	},

	cos: (args) => {
		if (args.length !== 1) throw new Error('cos requires exactly 1 argument');
		return Math.cos(toNumber(args[0]));
	},

	tan: (args) => {
		if (args.length !== 1) throw new Error('tan requires exactly 1 argument');
		return Math.tan(toNumber(args[0]));
	},

	asin: (args) => {
		if (args.length !== 1) throw new Error('asin requires exactly 1 argument');
		const val = toNumber(args[0]);
		if (val < -1 || val > 1) throw new Error('asin argument must be in [-1, 1]');
		return Math.asin(val);
	},

	acos: (args) => {
		if (args.length !== 1) throw new Error('acos requires exactly 1 argument');
		const val = toNumber(args[0]);
		if (val < -1 || val > 1) throw new Error('acos argument must be in [-1, 1]');
		return Math.acos(val);
	},

	atan: (args) => {
		if (args.length !== 1) throw new Error('atan requires exactly 1 argument');
		return Math.atan(toNumber(args[0]));
	},

	ln: (args) => {
		if (args.length !== 1) throw new Error('ln requires exactly 1 argument');
		const arg = args[0];

		// Complex logarithm: ln(z) = ln|z| + i*arg(z) (principal value)
		if (isComplexValue(arg)) {
			const modulus = Math.sqrt(arg.real * arg.real + arg.imag * arg.imag);
			if (modulus === 0) throw new Error('ln(0) is undefined');
			const theta = Math.atan2(arg.imag, arg.real);
			return complexValue(Math.log(modulus), theta);
		}

		// For negative real numbers, extend to complex domain
		const val = toNumber(arg);
		if (val === 0) throw new Error('ln(0) is undefined');
		if (val < 0) {
			// ln(-x) = ln(x) + i*pi for x > 0
			return complexValue(Math.log(-val), Math.PI);
		}
		return Math.log(val);
	},

	log: (args) => {
		// log without base is log base 10
		if (args.length !== 1) throw new Error('log requires exactly 1 argument');
		const val = toNumber(args[0]);
		if (val <= 0) throw new Error('log argument must be positive');
		return Math.log10(val);
	},

	exp: (args, exactMode) => {
		if (args.length !== 1) throw new Error('exp requires exactly 1 argument');
		const arg = args[0];

		// exp(0) = 1 exactly
		if (isRational(arg) && isZeroRational(arg)) {
			return exactMode ? ONE : 1;
		}

		// Complex exponential: exp(a + bi) = e^a * (cos(b) + i*sin(b))
		if (isComplexValue(arg)) {
			const a = arg.real;
			const b = arg.imag;
			const expA = Math.exp(a);
			return complexValue(expA * Math.cos(b), expA * Math.sin(b));
		}

		return Math.exp(toNumber(arg));
	},

	abs: (args, _exactMode) => {
		if (args.length !== 1) throw new Error('abs requires exactly 1 argument');
		const arg = args[0];

		if (isRational(arg)) {
			if (arg.n < 0n) {
				return { n: -arg.n, d: arg.d };
			}
			return arg;
		}

		if (isComplexValue(arg)) {
			throw new Error(
				'abs is not defined for complex numbers. Use cabs for complex absolute value.'
			);
		}

		return Math.abs(arg);
	},

	floor: (args, _exactMode) => {
		if (args.length !== 1) throw new Error('floor requires exactly 1 argument');
		const arg = args[0];

		if (isRational(arg)) {
			// For rational, floor is integer division of n by d
			const n = arg.n;
			const d = arg.d;
			if (n >= 0n) {
				return fromInteger(n / d);
			} else {
				// For negative, we need to round toward negative infinity
				const absN = -n;
				const q = absN / d;
				const r = absN % d;
				return fromInteger(r === 0n ? -q : -(q + 1n));
			}
		}

		if (isComplexValue(arg)) {
			throw new Error('floor is not defined for complex numbers');
		}

		return Math.floor(arg);
	},

	ceil: (args, _exactMode) => {
		if (args.length !== 1) throw new Error('ceil requires exactly 1 argument');
		const arg = args[0];

		if (isRational(arg)) {
			const n = arg.n;
			const d = arg.d;
			if (n >= 0n) {
				const q = n / d;
				const r = n % d;
				return fromInteger(r === 0n ? q : q + 1n);
			} else {
				// For negative, round toward zero
				return fromInteger(-(-n / d));
			}
		}

		if (isComplexValue(arg)) {
			throw new Error('ceil is not defined for complex numbers');
		}

		return Math.ceil(arg);
	},

	round: (args) => {
		if (args.length !== 1) throw new Error('round requires exactly 1 argument');
		return Math.round(toNumber(args[0]));
	},

	// ==========================================================================
	// Statistical Functions
	// ==========================================================================

	mean: (args) => {
		if (args.length === 0) throw new Error('mean requires at least 1 argument');
		const values = args.map(toNumber);
		return values.reduce((a, b) => a + b, 0) / values.length;
	},

	median: (args) => {
		if (args.length === 0) throw new Error('median requires at least 1 argument');
		const values = args.map(toNumber).sort((a, b) => a - b);
		const mid = Math.floor(values.length / 2);
		if (values.length % 2 === 0) {
			return (values[mid - 1] + values[mid]) / 2;
		}
		return values[mid];
	},

	variance: (args) => {
		if (args.length < 2) throw new Error('variance requires at least 2 arguments');
		const values = args.map(toNumber);
		const mean = values.reduce((a, b) => a + b, 0) / values.length;
		const squaredDiffs = values.map((v) => (v - mean) ** 2);
		// Sample variance (n-1)
		return squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1);
	},

	stdev: (args) => {
		if (args.length < 2) throw new Error('stdev requires at least 2 arguments');
		const values = args.map(toNumber);
		const mean = values.reduce((a, b) => a + b, 0) / values.length;
		const squaredDiffs = values.map((v) => (v - mean) ** 2);
		// Sample standard deviation (n-1)
		const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1);
		return Math.sqrt(variance);
	},

	min: (args) => {
		if (args.length === 0) throw new Error('min requires at least 1 argument');
		return Math.min(...args.map(toNumber));
	},

	max: (args) => {
		if (args.length === 0) throw new Error('max requires at least 1 argument');
		return Math.max(...args.map(toNumber));
	},

	sum: (args) => {
		if (args.length === 0) throw new Error('sum requires at least 1 argument');
		return args.map(toNumber).reduce((a, b) => a + b, 0);
	},

	// ==========================================================================
	// Complex Number Functions
	// ==========================================================================

	/**
	 * Returns the conjugate of a complex number.
	 * conj(a + bi) = a - bi
	 */
	conj: (args) => {
		if (args.length !== 1) throw new Error('conj requires exactly 1 argument');
		const arg = args[0];

		if (isComplexValue(arg)) {
			return complexValue(arg.real, -arg.imag);
		}

		// Real number is its own conjugate
		return arg;
	},

	/**
	 * Returns the real part of a complex number.
	 * Re(a + bi) = a
	 */
	re: (args) => {
		if (args.length !== 1) throw new Error('Re requires exactly 1 argument');
		const arg = args[0];

		if (isComplexValue(arg)) {
			return arg.real;
		}

		// Real number: return itself
		return toNumber(arg);
	},

	/**
	 * Returns the imaginary part of a complex number.
	 * Im(a + bi) = b
	 */
	im: (args) => {
		if (args.length !== 1) throw new Error('Im requires exactly 1 argument');
		const arg = args[0];

		if (isComplexValue(arg)) {
			return arg.imag;
		}

		// Real number has no imaginary part
		return 0;
	},

	/**
	 * Returns the modulus (absolute value) of a complex number.
	 * |a + bi| = sqrt(a² + b²)
	 */
	cabs: (args) => {
		if (args.length !== 1) throw new Error('cabs requires exactly 1 argument');
		const arg = args[0];

		if (isComplexValue(arg)) {
			return Math.sqrt(arg.real * arg.real + arg.imag * arg.imag);
		}

		// Real number: return absolute value
		const num = toNumber(arg);
		return Math.abs(num);
	},

	/**
	 * Returns the argument (phase) of a complex number.
	 * arg(a + bi) = atan2(b, a)
	 */
	arg: (args) => {
		if (args.length !== 1) throw new Error('arg requires exactly 1 argument');
		const arg = args[0];

		if (isComplexValue(arg)) {
			return Math.atan2(arg.imag, arg.real);
		}

		// Real number: arg is 0 for positive, pi for negative
		const num = toNumber(arg);
		return num >= 0 ? 0 : Math.PI;
	},

	/**
	 * cis(theta) = cos(theta) + i*sin(theta)
	 * Shorthand for the unit circle complex exponential.
	 */
	cis: (args) => {
		if (args.length !== 1) throw new Error('cis requires exactly 1 argument');
		const theta = toNumber(args[0]);
		return simplifyComplex(complexValue(Math.cos(theta), Math.sin(theta)));
	},

	/**
	 * Creates a complex number from polar coordinates.
	 * fromPolar(r, theta) = r * cis(theta) = r * (cos(theta) + i*sin(theta))
	 */
	frompolar: (args) => {
		if (args.length !== 2) throw new Error('fromPolar requires exactly 2 arguments (r, theta)');
		const r = toNumber(args[0]);
		const theta = toNumber(args[1]);
		return simplifyComplex(complexValue(r * Math.cos(theta), r * Math.sin(theta)));
	},

	// ==========================================================================
	// Nth Roots Functions
	// ==========================================================================

	/**
	 * Returns the k-th nth root of unity: e^{2πik/n}
	 * rootofunity(n, k) = cos(2πk/n) + i·sin(2πk/n)
	 *
	 * k can be any integer (wraps around via modulo n)
	 */
	rootofunity: (args) => {
		if (args.length !== 2) throw new Error('rootofunity requires exactly 2 arguments (n, k)');
		const n = toNumber(args[0]);
		const k = toNumber(args[1]);

		// Validate n is positive integer
		if (!Number.isInteger(n) || n <= 0) {
			throw new Error('rootofunity: n must be a positive integer');
		}

		// k can be any integer, we use modulo for the angle calculation
		// This allows wrapping: k=n is same as k=0
		const theta = (2 * Math.PI * k) / n;
		return simplifyComplex(complexValue(Math.cos(theta), Math.sin(theta)));
	},

	/**
	 * Returns the k-th nth root of a complex number z.
	 * nthroot(z, n, k) = |z|^{1/n} · e^{i(arg(z) + 2πk)/n}
	 *
	 * @param z - Complex number to take root of
	 * @param n - Positive integer (root degree)
	 * @param k - Integer 0 ≤ k < n (which root to return)
	 */
	nthroot: (args) => {
		if (args.length !== 3) throw new Error('nthroot requires exactly 3 arguments (z, n, k)');
		const z = toComplexValue(args[0]);
		const n = toNumber(args[1]);
		const k = toNumber(args[2]);

		// Validate n is positive integer
		if (!Number.isInteger(n) || n <= 0) {
			throw new Error('nthroot: n must be a positive integer');
		}

		// Validate k is integer in range [0, n-1]
		if (!Number.isInteger(k)) {
			throw new Error('nthroot: k must be an integer');
		}
		if (k < 0 || k >= n) {
			throw new Error(`nthroot: k must be in range [0, ${n - 1}]`);
		}

		// Special case: z = 0
		const modulus = Math.sqrt(z.real * z.real + z.imag * z.imag);
		if (modulus === 0) {
			return complexValue(0, 0);
		}

		// nth root formula: z^{1/n}_k = |z|^{1/n} · e^{i(arg(z) + 2πk)/n}
		const rootModulus = Math.pow(modulus, 1 / n);
		const theta = (Math.atan2(z.imag, z.real) + 2 * Math.PI * k) / n;

		return simplifyComplex(
			complexValue(rootModulus * Math.cos(theta), rootModulus * Math.sin(theta))
		);
	},

	/**
	 * Returns the principal (k=0) nth root of a complex number.
	 * principalroot(z, n) = nthroot(z, n, 0)
	 */
	principalroot: (args) => {
		if (args.length !== 2) throw new Error('principalroot requires exactly 2 arguments (z, n)');
		const z = toComplexValue(args[0]);
		const n = toNumber(args[1]);

		// Validate n is positive integer
		if (!Number.isInteger(n) || n <= 0) {
			throw new Error('principalroot: n must be a positive integer');
		}

		// Special case: z = 0
		const modulus = Math.sqrt(z.real * z.real + z.imag * z.imag);
		if (modulus === 0) {
			return complexValue(0, 0);
		}

		// Principal root (k=0): z^{1/n}_0 = |z|^{1/n} · e^{i·arg(z)/n}
		const rootModulus = Math.pow(modulus, 1 / n);
		const theta = Math.atan2(z.imag, z.real) / n;

		return simplifyComplex(
			complexValue(rootModulus * Math.cos(theta), rootModulus * Math.sin(theta))
		);
	}
};

// =============================================================================
// Core Evaluation
// =============================================================================

/**
 * Maximum recursion depth for expression evaluation.
 * Prevents stack overflow from deeply nested expressions.
 */
const MAX_EVAL_DEPTH = 100;

/**
 * Evaluates a MathNode to an intermediate value (Rational or number).
 *
 * @param node - The node to evaluate
 * @param exactMode - Whether to prefer exact (rational) results
 * @param depth - Current recursion depth (internal use)
 * @returns The computed value
 * @throws Error for unevaluable nodes or mathematical errors
 */
function evaluateNode(node: MathNode, exactMode: boolean, depth = 0): IntermediateValue {
	// SECURITY: Prevent stack overflow from deeply nested expressions
	if (depth > MAX_EVAL_DEPTH) {
		throw new Error(`Expression too deeply nested (max depth: ${MAX_EVAL_DEPTH})`);
	}

	// NumberNode
	if (isNumber(node)) {
		return parseNumber(node.value);
	}

	// VariableNode - should have been substituted
	if (isVariable(node)) {
		throw new Error(`Cannot evaluate expression with unsubstituted variable: ${node.name}`);
	}

	// GreekLetterNode - handle constants (pi) or throw
	if (isGreek(node)) {
		if (node.letter === 'pi') {
			return PI_VALUE;
		}
		throw new Error(`Cannot evaluate expression with unsubstituted Greek letter: ${node.letter}`);
	}

	// SymbolNode - handle known constants
	if (isSymbol(node)) {
		switch (node.symbol) {
			case 'infinity':
				return Infinity;
			default:
				throw new Error(`Cannot evaluate symbol: ${node.symbol}`);
		}
	}

	// HoleNode - cannot be evaluated
	if (isHole(node)) {
		throw new Error('Cannot evaluate expression with holes');
	}

	// AdditionNode
	if (isAddition(node)) {
		const left = evaluateNode(node.left, exactMode, depth + 1);
		const right = evaluateNode(node.right, exactMode, depth + 1);

		// Handle complex numbers
		if (isComplexValue(left) || isComplexValue(right)) {
			return simplifyComplex(addComplex(toComplexValue(left), toComplexValue(right)));
		}

		if (isRational(left) && isRational(right)) {
			return addRational(left, right);
		}
		return toNumber(left) + toNumber(right);
	}

	// SubtractionNode
	if (isSubtraction(node)) {
		const left = evaluateNode(node.left, exactMode, depth + 1);
		const right = evaluateNode(node.right, exactMode, depth + 1);

		// Handle complex numbers
		if (isComplexValue(left) || isComplexValue(right)) {
			return simplifyComplex(subComplex(toComplexValue(left), toComplexValue(right)));
		}

		if (isRational(left) && isRational(right)) {
			return subRational(left, right);
		}
		return toNumber(left) - toNumber(right);
	}

	// MultiplicationNode
	if (isMultiplication(node)) {
		const left = evaluateNode(node.left, exactMode, depth + 1);
		const right = evaluateNode(node.right, exactMode, depth + 1);

		// Handle complex numbers
		if (isComplexValue(left) || isComplexValue(right)) {
			return simplifyComplex(mulComplex(toComplexValue(left), toComplexValue(right)));
		}

		if (isRational(left) && isRational(right)) {
			return mulRational(left, right);
		}
		return toNumber(left) * toNumber(right);
	}

	// DivisionNode
	if (isDivision(node)) {
		const num = evaluateNode(node.numerator, exactMode, depth + 1);
		const den = evaluateNode(node.denominator, exactMode, depth + 1);

		// Handle complex numbers
		if (isComplexValue(num) || isComplexValue(den)) {
			return simplifyComplex(divComplex(toComplexValue(num), toComplexValue(den)));
		}

		// Check for division by zero
		if (isRational(den)) {
			if (isZeroRational(den)) {
				throw new Error('Division by zero');
			}
		} else if (den === 0) {
			throw new Error('Division by zero');
		}

		if (isRational(num) && isRational(den)) {
			return divRational(num, den);
		}
		return toNumber(num) / toNumber(den);
	}

	// OppositeNode (negation)
	if (isOpposite(node)) {
		const operand = evaluateNode(node.operand, exactMode, depth + 1);

		// Handle complex numbers
		if (isComplexValue(operand)) {
			return simplifyComplex(negComplex(operand));
		}

		if (isRational(operand)) {
			return negRational(operand);
		}
		return -operand;
	}

	// PositiveNode
	if (isPositive(node)) {
		return evaluateNode(node.operand, exactMode, depth + 1);
	}

	// SuperscriptNode (power)
	if (isSuperscript(node)) {
		const base = evaluateNode(node.base, exactMode, depth + 1);
		const exp = evaluateNode(node.superscript, exactMode, depth + 1);

		// Check for integer exponent for exact evaluation
		if (isRational(exp) && isExactInteger(exp)) {
			const intExp = getExactInteger(exp);
			if (intExp !== null) {
				// Convert to JS number for exponent (BigInt could be too large)
				const expNum = Number(intExp);
				if (Number.isSafeInteger(expNum) && Math.abs(expNum) <= 1000) {
					return intPow(base, expNum);
				}
			}
		}

		// Complex power: z^w = exp(w * ln(z))
		// This handles complex base, complex exponent, and negative base with non-integer exponent
		if (isComplexValue(base) || isComplexValue(exp)) {
			return complexPow(base, exp);
		}

		// Handle negative base with non-integer exponent (e.g., (-1)^0.5 = i)
		const baseNum = toNumber(base);
		const expNum = toNumber(exp);
		if (baseNum < 0 && !Number.isInteger(expNum)) {
			return complexPow(complexValue(baseNum, 0), complexValue(expNum, 0));
		}

		// Fall back to floating point for positive real base
		return Math.pow(baseNum, expNum);
	}

	// FunctionNode
	if (isFunction(node)) {
		const originalName = node.name; // Store name before any narrowing
		const funcName = originalName.toLowerCase();
		const funcNode = node;
		const handler = SUPPORTED_FUNCTIONS[funcName];

		if (!handler) {
			// Check if this is a derivative or inverse function that wasn't substituted
			if (isDerivativeFunction(funcNode)) {
				throw new Error(
					`Cannot evaluate derivative function '${originalName}'(x) without a definition. ` +
						'Derivative functions remain symbolic and require differentiation rules.'
				);
			}
			if (isInverseFunction(funcNode)) {
				throw new Error(
					`Cannot evaluate inverse function '${originalName}^{-1}(x)' without a definition. ` +
						'Inverse functions remain symbolic.'
				);
			}
			// Unknown generic function
			throw new Error(
				`Unknown function: ${originalName}. ` +
					'If this is a generic function (like f, g, h), provide its definition in EvalOptions.functions'
			);
		}

		// Evaluate all arguments
		const evaluatedArgs = node.args.map((arg) => evaluateNode(arg, exactMode, depth + 1));

		return handler(evaluatedArgs, exactMode);
	}

	// DelimiterNode (parentheses)
	if (isDelimiter(node)) {
		return evaluateNode(node.content, exactMode, depth + 1);
	}

	// SubscriptNode - cannot evaluate numerically
	if (isSubscript(node)) {
		throw new Error('Cannot evaluate subscript expressions numerically');
	}

	// RelationNode - cannot evaluate to a single value
	if (isRelation(node)) {
		throw new Error('Cannot evaluate relation expressions to a numeric value');
	}

	// UnitNode - evaluate the expression part (ignore the unit)
	if (isUnit(node)) {
		return evaluateNode(node.expression, exactMode, depth + 1);
	}

	// ComplexNode - evaluate both parts and combine
	if (isComplex(node)) {
		const realVal = evaluateNode(node.real, exactMode, depth + 1);
		const imagVal = evaluateNode(node.imaginary, exactMode, depth + 1);

		// Convert to numbers for complex arithmetic
		const real = toRealPart(realVal);
		const imag = toRealPart(imagVal);

		// If imaginary is 0, return just the real part
		if (imag === 0) {
			return realVal;
		}

		return complexValue(real, imag);
	}

	// CompositionNode - cannot evaluate directly without application
	if (isComposition(node)) {
		throw new Error(
			'Cannot evaluate composition expression directly. ' +
				'Compositions must be applied to arguments first (e.g., (f o g)(x) not f o g)'
		);
	}

	// Should never reach here with proper typing
	throw new Error(`Cannot evaluate node type: ${(node as MathNode).type}`);
}

/**
 * Creates the result AST node from an intermediate value.
 */
function valueToNode(value: IntermediateValue): MathNode {
	if (isRational(value)) {
		if (value.d === 1n) {
			// Integer
			return number(value.n.toString());
		}
		// Fraction
		return divide(number(value.n.toString()), number(value.d.toString()), 'fraction');
	}

	if (isComplexValue(value)) {
		// Complex number
		const realNode = Number.isInteger(value.real)
			? number(value.real.toString())
			: number(value.real.toPrecision(15));
		const imagNode = Number.isInteger(value.imag)
			? number(value.imag.toString())
			: number(value.imag.toPrecision(15));
		return { type: 'complex', real: realNode, imaginary: imagNode };
	}

	// Number (plain number type)
	if (Number.isInteger(value)) {
		return number(value.toString());
	}

	// Decimal - use reasonable precision
	return number(value.toPrecision(15));
}

// =============================================================================
// Main Export
// =============================================================================

/**
 * Evaluates a mathematical expression to a numeric value.
 *
 * The expression must not contain unsubstituted variables. Use the `substitute`
 * function first if your expression contains variables.
 *
 * @param node - The MathAST node to evaluate
 * @param options - Evaluation options (mode: 'exact' or 'decimal', functions: FunctionBindings)
 * @returns An EvalResult containing the value, a node representation, and exactness flag
 *
 * @throws Error if:
 * - Expression contains unsubstituted variables
 * - Division by zero occurs
 * - Unknown function is called
 * - Mathematical error (e.g., sqrt of negative)
 *
 * @example
 * // Exact evaluation: 1/3 + 1/3 + 1/3 = 1
 * const result = evaluate(parseLatex('\\frac{1}{3}+\\frac{1}{3}+\\frac{1}{3}'));
 * // result.value = { n: 1n, d: 1n }
 * // result.exact = true
 *
 * @example
 * // Decimal evaluation: sqrt(2)
 * const result = evaluate(parseLatex('\\sqrt{2}'), { mode: 'decimal' });
 * // result.value = 1.4142135623730951
 * // result.exact = false
 *
 * @example
 * // With function bindings: f(3) where f(x) = x^2
 * const result = evaluate(
 *   parseLatex('f(3)', { genericFunctions: { names: ['f'] } }),
 *   { functions: { f: { expression: parseLatex('x^2'), parameters: ['x'] } } }
 * );
 * // result.value = { n: 9n, d: 1n }
 */
export function evaluate(node: MathNode, options?: EvalOptions): EvalResult {
	const opts = { ...DEFAULT_EVAL_OPTIONS, ...options };
	const exactMode = opts.mode === 'exact';

	// If function bindings are provided, substitute functions first
	let processedNode = node;
	if (opts.functions && Object.keys(opts.functions).length > 0) {
		processedNode = substituteFunction(node, opts.functions);
	}

	// Check for unsubstituted variables
	const variables = getVariables(processedNode);

	// Filter out 'pi' as it's a known constant
	const unsubstituted = [...variables].filter((v) => v !== 'pi');

	if (unsubstituted.length > 0) {
		throw new Error(
			`Cannot evaluate expression with unsubstituted variables: ${unsubstituted.join(', ')}`
		);
	}

	// Evaluate the expression
	const value = evaluateNode(processedNode, exactMode);

	// Determine if result is exact
	const isExact = isRational(value);

	// Convert to final result based on mode
	if (opts.mode === 'decimal') {
		const numValue = toNumber(value);
		return {
			value: numValue,
			node: valueToNode(numValue),
			exact: false
		};
	}

	// Exact mode - keep Rational if possible
	return {
		value,
		node: valueToNode(value),
		exact: isExact
	};
}
