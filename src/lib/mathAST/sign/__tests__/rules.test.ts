/**
 * Sign Rules Tests
 *
 * Tests for the sign determination rules:
 * - signOfProduct: product of two signs
 * - signOfProductMultiple: product of multiple signs
 * - signOfQuotient: quotient of two signs
 * - signOfSum: sum of signs (same sign only)
 * - signOfDifference: difference of signs
 * - negateSign: sign negation
 * - signOfPower: power with various exponents
 * - signOfIntegerPower: integer exponents
 * - signOfFunction: builtin function signs (exp, ln, sqrt, sin, cos, etc.)
 * - signOfMultiArgFunction: multi-argument functions (max, min, hypot)
 */

import { describe, it, expect } from 'vitest';
import {
	signOfProduct,
	signOfProductMultiple,
	signOfQuotient,
	signOfSum,
	signOfDifference,
	negateSign,
	allSameSign,
	signOfPower,
	signOfIntegerPower,
	signOfFunction,
	signOfMultiArgFunction,
	getBuiltinSignInfo
} from '../rules';
import type { Sign } from '../types';

// =============================================================================
// Product Rules Tests
// =============================================================================

describe('signOfProduct', () => {
	describe('Standard sign rules', () => {
		it('should return positive for positive * positive', () => {
			expect(signOfProduct('positive', 'positive')).toBe('positive');
		});

		it('should return positive for negative * negative', () => {
			expect(signOfProduct('negative', 'negative')).toBe('positive');
		});

		it('should return negative for positive * negative', () => {
			expect(signOfProduct('positive', 'negative')).toBe('negative');
		});

		it('should return negative for negative * positive', () => {
			expect(signOfProduct('negative', 'positive')).toBe('negative');
		});
	});

	describe('Zero dominance', () => {
		it('should return zero for zero * positive', () => {
			expect(signOfProduct('zero', 'positive')).toBe('zero');
		});

		it('should return zero for zero * negative', () => {
			expect(signOfProduct('zero', 'negative')).toBe('zero');
		});

		it('should return zero for zero * zero', () => {
			expect(signOfProduct('zero', 'zero')).toBe('zero');
		});

		it('should return zero for zero * unknown', () => {
			expect(signOfProduct('zero', 'unknown')).toBe('zero');
		});

		it('should return zero for positive * zero', () => {
			expect(signOfProduct('positive', 'zero')).toBe('zero');
		});

		it('should return zero for negative * zero', () => {
			expect(signOfProduct('negative', 'zero')).toBe('zero');
		});

		it('should return zero for unknown * zero', () => {
			expect(signOfProduct('unknown', 'zero')).toBe('zero');
		});
	});

	describe('Unknown propagation', () => {
		it('should return unknown for unknown * positive', () => {
			expect(signOfProduct('unknown', 'positive')).toBe('unknown');
		});

		it('should return unknown for unknown * negative', () => {
			expect(signOfProduct('unknown', 'negative')).toBe('unknown');
		});

		it('should return unknown for unknown * unknown', () => {
			expect(signOfProduct('unknown', 'unknown')).toBe('unknown');
		});

		it('should return unknown for positive * unknown', () => {
			expect(signOfProduct('positive', 'unknown')).toBe('unknown');
		});

		it('should return unknown for negative * unknown', () => {
			expect(signOfProduct('negative', 'unknown')).toBe('unknown');
		});
	});
});

describe('signOfProductMultiple', () => {
	describe('Empty and single-element cases', () => {
		it('should return positive for empty product (multiplicative identity)', () => {
			expect(signOfProductMultiple([])).toBe('positive');
		});

		it('should return the sign for single-element product', () => {
			expect(signOfProductMultiple(['positive'])).toBe('positive');
			expect(signOfProductMultiple(['negative'])).toBe('negative');
			expect(signOfProductMultiple(['zero'])).toBe('zero');
			expect(signOfProductMultiple(['unknown'])).toBe('unknown');
		});
	});

	describe('Multiple factors', () => {
		it('should return positive for even number of negative factors', () => {
			expect(signOfProductMultiple(['negative', 'negative'])).toBe('positive');
			expect(signOfProductMultiple(['negative', 'negative', 'positive', 'positive'])).toBe(
				'positive'
			);
		});

		it('should return negative for odd number of negative factors', () => {
			expect(signOfProductMultiple(['negative', 'negative', 'negative'])).toBe('negative');
			expect(signOfProductMultiple(['positive', 'negative', 'positive'])).toBe('negative');
		});

		it('should return positive for all positive factors', () => {
			expect(signOfProductMultiple(['positive', 'positive', 'positive'])).toBe('positive');
		});

		it('should return zero if any factor is zero', () => {
			expect(signOfProductMultiple(['positive', 'zero', 'negative'])).toBe('zero');
			expect(signOfProductMultiple(['zero', 'zero'])).toBe('zero');
		});

		it('should return unknown if any factor is unknown (and none is zero)', () => {
			expect(signOfProductMultiple(['positive', 'unknown', 'negative'])).toBe('unknown');
			expect(signOfProductMultiple(['unknown', 'positive'])).toBe('unknown');
		});
	});
});

// =============================================================================
// Quotient Rules Tests
// =============================================================================

describe('signOfQuotient', () => {
	describe('Standard division rules', () => {
		it('should return positive for positive / positive', () => {
			expect(signOfQuotient('positive', 'positive')).toBe('positive');
		});

		it('should return positive for negative / negative', () => {
			expect(signOfQuotient('negative', 'negative')).toBe('positive');
		});

		it('should return negative for positive / negative', () => {
			expect(signOfQuotient('positive', 'negative')).toBe('negative');
		});

		it('should return negative for negative / positive', () => {
			expect(signOfQuotient('negative', 'positive')).toBe('negative');
		});
	});

	describe('Zero numerator', () => {
		it('should return zero for zero / positive', () => {
			expect(signOfQuotient('zero', 'positive')).toBe('zero');
		});

		it('should return zero for zero / negative', () => {
			expect(signOfQuotient('zero', 'negative')).toBe('zero');
		});
	});

	describe('Zero denominator (undefined cases)', () => {
		it('should return unknown for positive / zero (undefined)', () => {
			expect(signOfQuotient('positive', 'zero')).toBe('unknown');
		});

		it('should return unknown for negative / zero (undefined)', () => {
			expect(signOfQuotient('negative', 'zero')).toBe('unknown');
		});

		it('should return unknown for zero / zero (indeterminate)', () => {
			expect(signOfQuotient('zero', 'zero')).toBe('unknown');
		});
	});

	describe('Unknown propagation', () => {
		it('should return unknown for unknown / positive', () => {
			expect(signOfQuotient('unknown', 'positive')).toBe('unknown');
		});

		it('should return unknown for positive / unknown', () => {
			expect(signOfQuotient('positive', 'unknown')).toBe('unknown');
		});

		it('should return unknown for unknown / unknown', () => {
			expect(signOfQuotient('unknown', 'unknown')).toBe('unknown');
		});
	});
});

// =============================================================================
// Sum Rules Tests
// =============================================================================

describe('signOfSum', () => {
	describe('Empty and all-zero cases', () => {
		it('should return zero for empty sum (additive identity)', () => {
			expect(signOfSum([])).toBe('zero');
		});

		it('should return zero for all zero terms', () => {
			expect(signOfSum(['zero'])).toBe('zero');
			expect(signOfSum(['zero', 'zero'])).toBe('zero');
			expect(signOfSum(['zero', 'zero', 'zero'])).toBe('zero');
		});
	});

	describe('Same-sign terms', () => {
		it('should return positive for all positive terms', () => {
			expect(signOfSum(['positive'])).toBe('positive');
			expect(signOfSum(['positive', 'positive'])).toBe('positive');
			expect(signOfSum(['positive', 'zero', 'positive'])).toBe('positive');
		});

		it('should return negative for all negative terms', () => {
			expect(signOfSum(['negative'])).toBe('negative');
			expect(signOfSum(['negative', 'negative'])).toBe('negative');
			expect(signOfSum(['negative', 'zero', 'negative'])).toBe('negative');
		});
	});

	describe('Mixed signs', () => {
		it('should return unknown for mixed positive and negative', () => {
			expect(signOfSum(['positive', 'negative'])).toBe('unknown');
			expect(signOfSum(['negative', 'positive', 'positive'])).toBe('unknown');
		});
	});

	describe('Unknown propagation', () => {
		it('should return unknown if any non-zero term is unknown', () => {
			expect(signOfSum(['positive', 'unknown'])).toBe('unknown');
			expect(signOfSum(['unknown', 'negative'])).toBe('unknown');
			expect(signOfSum(['zero', 'unknown'])).toBe('unknown');
		});
	});
});

describe('allSameSign', () => {
	it('should return null for empty array', () => {
		expect(allSameSign([])).toBe(null);
	});

	it('should return null for only zeros', () => {
		expect(allSameSign(['zero', 'zero'])).toBe(null);
	});

	it('should return the common sign when all are the same', () => {
		expect(allSameSign(['positive', 'positive'])).toBe('positive');
		expect(allSameSign(['negative', 'negative', 'negative'])).toBe('negative');
	});

	it('should ignore zeros when checking for common sign', () => {
		expect(allSameSign(['positive', 'zero', 'positive'])).toBe('positive');
		expect(allSameSign(['negative', 'zero'])).toBe('negative');
	});

	it('should return null for mixed signs', () => {
		expect(allSameSign(['positive', 'negative'])).toBe(null);
		expect(allSameSign(['positive', 'zero', 'negative'])).toBe(null);
	});
});

describe('signOfDifference', () => {
	it('should return positive for positive - negative (= positive + positive)', () => {
		expect(signOfDifference('positive', 'negative')).toBe('positive');
	});

	it('should return negative for negative - positive (= negative + negative)', () => {
		expect(signOfDifference('negative', 'positive')).toBe('negative');
	});

	it('should return unknown for positive - positive (cannot determine without values)', () => {
		expect(signOfDifference('positive', 'positive')).toBe('unknown');
	});

	it('should return unknown for negative - negative (cannot determine without values)', () => {
		expect(signOfDifference('negative', 'negative')).toBe('unknown');
	});

	it('should return the first sign when second is zero', () => {
		expect(signOfDifference('positive', 'zero')).toBe('positive');
		expect(signOfDifference('negative', 'zero')).toBe('negative');
	});

	it('should return the negated sign when first is zero', () => {
		expect(signOfDifference('zero', 'positive')).toBe('negative');
		expect(signOfDifference('zero', 'negative')).toBe('positive');
	});
});

describe('negateSign', () => {
	it('should negate positive to negative', () => {
		expect(negateSign('positive')).toBe('negative');
	});

	it('should negate negative to positive', () => {
		expect(negateSign('negative')).toBe('positive');
	});

	it('should keep zero as zero', () => {
		expect(negateSign('zero')).toBe('zero');
	});

	it('should keep unknown as unknown', () => {
		expect(negateSign('unknown')).toBe('unknown');
	});
});

// =============================================================================
// Power Rules Tests
// =============================================================================

describe('signOfPower', () => {
	describe('Integer exponents', () => {
		it('should return positive for positive base with any exponent', () => {
			expect(signOfPower('positive', 1)).toBe('positive');
			expect(signOfPower('positive', 2)).toBe('positive');
			expect(signOfPower('positive', 3)).toBe('positive');
			expect(signOfPower('positive', -2)).toBe('positive');
		});

		it('should return positive for negative base with even exponent', () => {
			expect(signOfPower('negative', 2)).toBe('positive');
			expect(signOfPower('negative', 4)).toBe('positive');
			expect(signOfPower('negative', -2)).toBe('positive');
		});

		it('should return negative for negative base with odd exponent', () => {
			expect(signOfPower('negative', 1)).toBe('negative');
			expect(signOfPower('negative', 3)).toBe('negative');
			expect(signOfPower('negative', 5)).toBe('negative');
			expect(signOfPower('negative', -1)).toBe('negative');
			expect(signOfPower('negative', -3)).toBe('negative');
		});

		it('should return positive for zero exponent (non-zero base)', () => {
			expect(signOfPower('positive', 0)).toBe('positive');
			expect(signOfPower('negative', 0)).toBe('positive');
		});
	});

	describe('Zero base', () => {
		it('should return zero for zero base with positive exponent', () => {
			expect(signOfPower('zero', 1)).toBe('zero');
			expect(signOfPower('zero', 2)).toBe('zero');
			expect(signOfPower('zero', 0.5)).toBe('zero');
		});

		it('should return unknown for zero base with zero or negative exponent', () => {
			expect(signOfPower('zero', 0)).toBe('unknown');
			expect(signOfPower('zero', -1)).toBe('unknown');
		});
	});

	describe('Unknown base', () => {
		it('should return unknown for unknown base', () => {
			expect(signOfPower('unknown', 2)).toBe('unknown');
			expect(signOfPower('unknown', 3)).toBe('unknown');
		});
	});

	describe('Fractional exponents (even root)', () => {
		it('should return positive for positive base with even root', () => {
			expect(signOfPower('positive', { numerator: 1, denominator: 2 })).toBe('positive'); // sqrt
			expect(signOfPower('positive', { numerator: 1, denominator: 4 })).toBe('positive'); // 4th root
		});

		it('should return unknown for negative base with even root (not real)', () => {
			expect(signOfPower('negative', { numerator: 1, denominator: 2 })).toBe('unknown');
			expect(signOfPower('negative', { numerator: 1, denominator: 4 })).toBe('unknown');
		});
	});

	describe('Fractional exponents (odd root)', () => {
		it('should return positive for positive base with odd root', () => {
			expect(signOfPower('positive', { numerator: 1, denominator: 3 })).toBe('positive'); // cbrt
			expect(signOfPower('positive', { numerator: 1, denominator: 5 })).toBe('positive');
		});

		it('should return negative for negative base with odd root and odd numerator', () => {
			expect(signOfPower('negative', { numerator: 1, denominator: 3 })).toBe('negative'); // cbrt(-x)
			expect(signOfPower('negative', { numerator: 3, denominator: 5 })).toBe('negative');
		});

		it('should return positive for negative base with odd root and even numerator', () => {
			expect(signOfPower('negative', { numerator: 2, denominator: 3 })).toBe('positive'); // (-x)^(2/3)
		});
	});
});

describe('signOfIntegerPower', () => {
	describe('Standard cases', () => {
		it('should match signOfPower for integer exponents', () => {
			const signs: Sign[] = ['positive', 'negative', 'zero', 'unknown'];
			const exponents = [-3, -2, -1, 0, 1, 2, 3];

			for (const sign of signs) {
				for (const exp of exponents) {
					expect(signOfIntegerPower(sign, exp)).toBe(signOfPower(sign, exp));
				}
			}
		});
	});
});

// =============================================================================
// Function Rules Tests
// =============================================================================

describe('signOfFunction', () => {
	describe('Always positive functions', () => {
		it('should return positive for exp with any argument', () => {
			expect(signOfFunction('exp', 'positive')).toBe('positive');
			expect(signOfFunction('exp', 'negative')).toBe('positive');
			expect(signOfFunction('exp', 'zero')).toBe('positive');
			expect(signOfFunction('exp', 'unknown')).toBe('positive');
		});

		it('should return positive for cosh with any argument', () => {
			expect(signOfFunction('cosh', 'positive')).toBe('positive');
			expect(signOfFunction('cosh', 'negative')).toBe('positive');
			expect(signOfFunction('cosh', 'zero')).toBe('positive');
		});
	});

	describe('Always non-negative functions', () => {
		it('should return positive for abs with non-zero argument', () => {
			expect(signOfFunction('abs', 'positive')).toBe('positive');
			expect(signOfFunction('abs', 'negative')).toBe('positive');
		});

		it('should return zero for abs with zero argument', () => {
			expect(signOfFunction('abs', 'zero')).toBe('zero');
		});

		it('should return positive for sqrt with positive argument', () => {
			expect(signOfFunction('sqrt', 'positive')).toBe('positive');
		});

		it('should return zero for sqrt with zero argument', () => {
			expect(signOfFunction('sqrt', 'zero')).toBe('zero');
		});

		it('should return positive for sqrt with negative argument (abs value, no domain check)', () => {
			// Note: signOfFunction does not validate domain - it assumes the argument
			// is valid. For sqrt, alwaysNonNegative means result is always >= 0.
			// Domain validation happens separately in analyzeSign.
			expect(signOfFunction('sqrt', 'negative')).toBe('positive');
		});

		it('should return positive for acos with valid argument', () => {
			// acos range is [0, pi], always non-negative
			expect(signOfFunction('acos', 'positive')).toBe('positive');
			expect(signOfFunction('acos', 'negative')).toBe('positive');
		});

		it('should return zero for acos with zero argument', () => {
			expect(signOfFunction('acos', 'zero')).toBe('zero');
		});
	});

	describe('Sign-preserving functions (odd functions)', () => {
		it('should preserve sign for sinh', () => {
			expect(signOfFunction('sinh', 'positive')).toBe('positive');
			expect(signOfFunction('sinh', 'negative')).toBe('negative');
			expect(signOfFunction('sinh', 'zero')).toBe('zero');
		});

		it('should preserve sign for tanh', () => {
			expect(signOfFunction('tanh', 'positive')).toBe('positive');
			expect(signOfFunction('tanh', 'negative')).toBe('negative');
			expect(signOfFunction('tanh', 'zero')).toBe('zero');
		});

		it('should preserve sign for atan', () => {
			expect(signOfFunction('atan', 'positive')).toBe('positive');
			expect(signOfFunction('atan', 'negative')).toBe('negative');
			expect(signOfFunction('atan', 'zero')).toBe('zero');
		});

		it('should preserve sign for cbrt (cube root)', () => {
			expect(signOfFunction('cbrt', 'positive')).toBe('positive');
			expect(signOfFunction('cbrt', 'negative')).toBe('negative');
			expect(signOfFunction('cbrt', 'zero')).toBe('zero');
		});
	});

	describe('Logarithmic functions (special case: ln)', () => {
		it('should return unknown for ln without domain info', () => {
			// Without domain info, we cannot determine if x > 1 or x < 1
			expect(signOfFunction('ln', 'positive')).toBe('unknown');
		});

		it('should return unknown for ln with non-positive argument', () => {
			expect(signOfFunction('ln', 'zero')).toBe('unknown');
			expect(signOfFunction('ln', 'negative')).toBe('unknown');
		});
	});

	describe('Periodic functions', () => {
		it('should return unknown for sin (periodic/oscillating)', () => {
			expect(signOfFunction('sin', 'positive')).toBe('unknown');
			expect(signOfFunction('sin', 'negative')).toBe('unknown');
		});

		it('should return unknown for cos (periodic/oscillating)', () => {
			expect(signOfFunction('cos', 'positive')).toBe('unknown');
			expect(signOfFunction('cos', 'negative')).toBe('unknown');
		});

		it('should return unknown for tan (periodic/oscillating)', () => {
			expect(signOfFunction('tan', 'positive')).toBe('unknown');
		});
	});

	describe('Unknown functions', () => {
		it('should return unknown for unrecognized function names', () => {
			expect(signOfFunction('custom_func', 'positive')).toBe('unknown');
			expect(signOfFunction('unknown_func', 'negative')).toBe('unknown');
		});
	});
});

describe('getBuiltinSignInfo', () => {
	it('should return alwaysPositive for exp', () => {
		const info = getBuiltinSignInfo('exp');
		expect(info).not.toBeNull();
		expect(info?.alwaysPositive).toBe(true);
	});

	it('should return alwaysNonNegative for abs', () => {
		const info = getBuiltinSignInfo('abs');
		expect(info).not.toBeNull();
		expect(info?.alwaysNonNegative).toBe(true);
	});

	it('should return preservesSign for sinh', () => {
		const info = getBuiltinSignInfo('sinh');
		expect(info).not.toBeNull();
		expect(info?.preservesSign).toBe(true);
	});

	it('should return specialCase ln for ln', () => {
		const info = getBuiltinSignInfo('ln');
		expect(info).not.toBeNull();
		expect(info?.specialCase).toBe('ln');
	});

	it('should return specialCase periodic for sin', () => {
		const info = getBuiltinSignInfo('sin');
		expect(info).not.toBeNull();
		expect(info?.specialCase).toBe('periodic');
	});

	it('should return null for unknown functions', () => {
		expect(getBuiltinSignInfo('custom_unknown')).toBeNull();
	});
});

describe('signOfMultiArgFunction', () => {
	describe('max function', () => {
		it('should return positive if any arg is positive', () => {
			expect(signOfMultiArgFunction('max', ['positive', 'negative'])).toBe('positive');
			expect(signOfMultiArgFunction('max', ['negative', 'positive', 'zero'])).toBe('positive');
		});

		it('should return zero if all are non-positive and some is zero', () => {
			expect(signOfMultiArgFunction('max', ['negative', 'zero'])).toBe('zero');
			expect(signOfMultiArgFunction('max', ['zero', 'negative', 'negative'])).toBe('zero');
		});

		it('should return negative if all are negative', () => {
			expect(signOfMultiArgFunction('max', ['negative', 'negative'])).toBe('negative');
		});

		it('should return zero if all are zero', () => {
			expect(signOfMultiArgFunction('max', ['zero', 'zero'])).toBe('zero');
		});
	});

	describe('min function', () => {
		it('should return negative if any arg is negative', () => {
			expect(signOfMultiArgFunction('min', ['positive', 'negative'])).toBe('negative');
			expect(signOfMultiArgFunction('min', ['negative', 'positive', 'zero'])).toBe('negative');
		});

		it('should return zero if all are non-negative and some is zero', () => {
			expect(signOfMultiArgFunction('min', ['positive', 'zero'])).toBe('zero');
			expect(signOfMultiArgFunction('min', ['zero', 'positive', 'positive'])).toBe('zero');
		});

		it('should return positive if all are positive', () => {
			expect(signOfMultiArgFunction('min', ['positive', 'positive'])).toBe('positive');
		});

		it('should return zero if all are zero', () => {
			expect(signOfMultiArgFunction('min', ['zero', 'zero'])).toBe('zero');
		});
	});

	describe('hypot function', () => {
		it('should return zero if all args are zero', () => {
			expect(signOfMultiArgFunction('hypot', ['zero', 'zero'])).toBe('zero');
		});

		it('should return positive if any arg is non-zero', () => {
			expect(signOfMultiArgFunction('hypot', ['positive', 'zero'])).toBe('positive');
			expect(signOfMultiArgFunction('hypot', ['negative', 'positive'])).toBe('positive');
			expect(signOfMultiArgFunction('hypot', ['negative', 'negative'])).toBe('positive');
		});
	});

	describe('Empty and unknown cases', () => {
		it('should return unknown for empty args', () => {
			expect(signOfMultiArgFunction('max', [])).toBe('unknown');
			expect(signOfMultiArgFunction('min', [])).toBe('unknown');
		});

		it('should return unknown for unknown function', () => {
			expect(signOfMultiArgFunction('custom', ['positive', 'negative'])).toBe('unknown');
		});

		it('should return unknown for pow (needs actual values)', () => {
			expect(signOfMultiArgFunction('pow', ['positive', 'negative'])).toBe('unknown');
		});
	});
});
