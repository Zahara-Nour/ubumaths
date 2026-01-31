/**
 * Tests for extended arithmetic with signed zeros and infinities.
 */

import { describe, it, expect } from 'vitest';
import {
	addExtended,
	subtractExtended,
	multiplyExtended,
	divideExtended,
	lnExtended,
	expExtended,
	sqrtExtended,
	sinExtended,
	cosExtended,
	negateExtended,
	isIndeterminateResult,
	type ExtendedResult
} from '../extended-arithmetic';
import { number, positiveInfinity, negativeInfinity, zeroPlus, zeroMinus } from '../../factory';
import { isNumber, isInfinity, isSignedZero } from '../../guards';

// =============================================================================
// Helpers
// =============================================================================

function expectNumber(result: ExtendedResult, expected: number, tolerance = 1e-10): void {
	expect(result.type).toBe('value');
	if (result.type === 'value' && isNumber(result.value)) {
		expect(Math.abs(parseFloat(result.value.value) - expected)).toBeLessThan(tolerance);
	} else {
		throw new Error(`Expected number ${expected}, got ${JSON.stringify(result)}`);
	}
}

function expectPosInfinity(result: ExtendedResult): void {
	expect(result.type).toBe('value');
	if (result.type === 'value') {
		expect(isInfinity(result.value)).toBe(true);
		if (isInfinity(result.value)) {
			expect(result.value.sign).toBe('positive');
		}
	}
}

function expectNegInfinity(result: ExtendedResult): void {
	expect(result.type).toBe('value');
	if (result.type === 'value') {
		expect(isInfinity(result.value)).toBe(true);
		if (isInfinity(result.value)) {
			expect(result.value.sign).toBe('negative');
		}
	}
}

function expectZeroPlus(result: ExtendedResult): void {
	expect(result.type).toBe('value');
	if (result.type === 'value') {
		expect(isSignedZero(result.value)).toBe(true);
		if (isSignedZero(result.value)) {
			expect(result.value.sign).toBe('positive');
		}
	}
}

function expectZeroMinus(result: ExtendedResult): void {
	expect(result.type).toBe('value');
	if (result.type === 'value') {
		expect(isSignedZero(result.value)).toBe(true);
		if (isSignedZero(result.value)) {
			expect(result.value.sign).toBe('negative');
		}
	}
}

function expectIndeterminate(result: ExtendedResult, form: string): void {
	expect(isIndeterminateResult(result)).toBe(true);
	if (isIndeterminateResult(result)) {
		expect(result.form).toBe(form);
	}
}

// =============================================================================
// Addition Tests
// =============================================================================

describe('Extended Addition', () => {
	describe('regular numbers', () => {
		it('2 + 3 = 5', () => {
			expectNumber(addExtended(number('2'), number('3')), 5);
		});

		it('-1 + 4 = 3', () => {
			expectNumber(addExtended(number('-1'), number('4')), 3);
		});
	});

	describe('infinity + infinity', () => {
		it('+∞ + +∞ = +∞', () => {
			expectPosInfinity(addExtended(positiveInfinity(), positiveInfinity()));
		});

		it('-∞ + -∞ = -∞', () => {
			expectNegInfinity(addExtended(negativeInfinity(), negativeInfinity()));
		});

		it('+∞ + -∞ = indeterminate (∞-∞)', () => {
			expectIndeterminate(addExtended(positiveInfinity(), negativeInfinity()), '∞-∞');
		});
	});

	describe('infinity + finite', () => {
		it('+∞ + 5 = +∞', () => {
			expectPosInfinity(addExtended(positiveInfinity(), number('5')));
		});

		it('-∞ + 100 = -∞', () => {
			expectNegInfinity(addExtended(negativeInfinity(), number('100')));
		});
	});

	describe('signed zeros', () => {
		it('0⁺ + 0⁺ = 0⁺', () => {
			expectZeroPlus(addExtended(zeroPlus(), zeroPlus()));
		});

		it('0⁻ + 0⁻ = 0⁻', () => {
			expectZeroMinus(addExtended(zeroMinus(), zeroMinus()));
		});

		it('0⁺ + 0⁻ = 0', () => {
			expectNumber(addExtended(zeroPlus(), zeroMinus()), 0);
		});

		it('0⁺ + 5 = 5', () => {
			expectNumber(addExtended(zeroPlus(), number('5')), 5);
		});
	});
});

// =============================================================================
// Subtraction Tests
// =============================================================================

describe('Extended Subtraction', () => {
	describe('regular numbers', () => {
		it('5 - 3 = 2', () => {
			expectNumber(subtractExtended(number('5'), number('3')), 2);
		});
	});

	describe('infinity - infinity', () => {
		it('+∞ - -∞ = +∞', () => {
			expectPosInfinity(subtractExtended(positiveInfinity(), negativeInfinity()));
		});

		it('-∞ - +∞ = -∞', () => {
			expectNegInfinity(subtractExtended(negativeInfinity(), positiveInfinity()));
		});

		it('+∞ - +∞ = indeterminate', () => {
			expectIndeterminate(subtractExtended(positiveInfinity(), positiveInfinity()), '∞-∞');
		});
	});

	describe('signed zeros', () => {
		it('0⁺ - 0⁺ = 0', () => {
			expectNumber(subtractExtended(zeroPlus(), zeroPlus()), 0);
		});

		it('0⁺ - 0⁻ = 0⁺', () => {
			expectZeroPlus(subtractExtended(zeroPlus(), zeroMinus()));
		});

		it('0⁻ - 0⁺ = 0⁻', () => {
			expectZeroMinus(subtractExtended(zeroMinus(), zeroPlus()));
		});
	});
});

// =============================================================================
// Multiplication Tests
// =============================================================================

describe('Extended Multiplication', () => {
	describe('regular numbers', () => {
		it('2 × 3 = 6', () => {
			expectNumber(multiplyExtended(number('2'), number('3')), 6);
		});

		it('-2 × 3 = -6', () => {
			expectNumber(multiplyExtended(number('-2'), number('3')), -6);
		});
	});

	describe('0 × ∞ = indeterminate', () => {
		it('0⁺ × +∞ = indeterminate (0·∞)', () => {
			expectIndeterminate(multiplyExtended(zeroPlus(), positiveInfinity()), '0·∞');
		});

		it('0⁻ × -∞ = indeterminate (0·∞)', () => {
			expectIndeterminate(multiplyExtended(zeroMinus(), negativeInfinity()), '0·∞');
		});

		it('0 × +∞ = indeterminate (0·∞)', () => {
			expectIndeterminate(multiplyExtended(number('0'), positiveInfinity()), '0·∞');
		});
	});

	describe('∞ × ∞', () => {
		it('+∞ × +∞ = +∞', () => {
			expectPosInfinity(multiplyExtended(positiveInfinity(), positiveInfinity()));
		});

		it('+∞ × -∞ = -∞', () => {
			expectNegInfinity(multiplyExtended(positiveInfinity(), negativeInfinity()));
		});

		it('-∞ × -∞ = +∞', () => {
			expectPosInfinity(multiplyExtended(negativeInfinity(), negativeInfinity()));
		});
	});

	describe('∞ × finite', () => {
		it('+∞ × 2 = +∞', () => {
			expectPosInfinity(multiplyExtended(positiveInfinity(), number('2')));
		});

		it('+∞ × -3 = -∞', () => {
			expectNegInfinity(multiplyExtended(positiveInfinity(), number('-3')));
		});

		it('-∞ × -2 = +∞', () => {
			expectPosInfinity(multiplyExtended(negativeInfinity(), number('-2')));
		});
	});

	describe('signed zeros × finite', () => {
		it('0⁺ × 5 = 0⁺', () => {
			expectZeroPlus(multiplyExtended(zeroPlus(), number('5')));
		});

		it('0⁺ × -3 = 0⁻', () => {
			expectZeroMinus(multiplyExtended(zeroPlus(), number('-3')));
		});

		it('0⁻ × -2 = 0⁺', () => {
			expectZeroPlus(multiplyExtended(zeroMinus(), number('-2')));
		});
	});

	describe('signed zeros × signed zeros', () => {
		it('0⁺ × 0⁺ = 0⁺', () => {
			expectZeroPlus(multiplyExtended(zeroPlus(), zeroPlus()));
		});

		it('0⁺ × 0⁻ = 0⁻', () => {
			expectZeroMinus(multiplyExtended(zeroPlus(), zeroMinus()));
		});

		it('0⁻ × 0⁻ = 0⁺', () => {
			expectZeroPlus(multiplyExtended(zeroMinus(), zeroMinus()));
		});
	});
});

// =============================================================================
// Division Tests
// =============================================================================

describe('Extended Division', () => {
	describe('regular numbers', () => {
		it('6 / 2 = 3', () => {
			expectNumber(divideExtended(number('6'), number('2')), 3);
		});

		it('-6 / 2 = -3', () => {
			expectNumber(divideExtended(number('-6'), number('2')), -3);
		});
	});

	describe('finite / 0± = ±∞', () => {
		it('1 / 0⁺ = +∞', () => {
			expectPosInfinity(divideExtended(number('1'), zeroPlus()));
		});

		it('1 / 0⁻ = -∞', () => {
			expectNegInfinity(divideExtended(number('1'), zeroMinus()));
		});

		it('-5 / 0⁺ = -∞', () => {
			expectNegInfinity(divideExtended(number('-5'), zeroPlus()));
		});

		it('-5 / 0⁻ = +∞', () => {
			expectPosInfinity(divideExtended(number('-5'), zeroMinus()));
		});
	});

	describe('0 / 0 = indeterminate', () => {
		it('0⁺ / 0⁺ = indeterminate (0/0)', () => {
			expectIndeterminate(divideExtended(zeroPlus(), zeroPlus()), '0/0');
		});

		it('0 / 0⁺ = indeterminate (0/0)', () => {
			expectIndeterminate(divideExtended(number('0'), zeroPlus()), '0/0');
		});
	});

	describe('∞ / ∞ = indeterminate', () => {
		it('+∞ / +∞ = indeterminate (∞/∞)', () => {
			expectIndeterminate(divideExtended(positiveInfinity(), positiveInfinity()), '∞/∞');
		});

		it('-∞ / +∞ = indeterminate (∞/∞)', () => {
			expectIndeterminate(divideExtended(negativeInfinity(), positiveInfinity()), '∞/∞');
		});
	});

	describe('finite / ∞ = 0±', () => {
		it('5 / +∞ = 0⁺', () => {
			expectZeroPlus(divideExtended(number('5'), positiveInfinity()));
		});

		it('-3 / +∞ = 0⁻', () => {
			expectZeroMinus(divideExtended(number('-3'), positiveInfinity()));
		});
	});

	describe('∞ / finite = ±∞', () => {
		it('+∞ / 2 = +∞', () => {
			expectPosInfinity(divideExtended(positiveInfinity(), number('2')));
		});

		it('+∞ / -2 = -∞', () => {
			expectNegInfinity(divideExtended(positiveInfinity(), number('-2')));
		});

		it('-∞ / -3 = +∞', () => {
			expectPosInfinity(divideExtended(negativeInfinity(), number('-3')));
		});
	});

	describe('0± / finite = 0±', () => {
		it('0⁺ / 2 = 0⁺', () => {
			expectZeroPlus(divideExtended(zeroPlus(), number('2')));
		});

		it('0⁺ / -3 = 0⁻', () => {
			expectZeroMinus(divideExtended(zeroPlus(), number('-3')));
		});
	});
});

// =============================================================================
// Function Tests
// =============================================================================

describe('Extended Functions', () => {
	describe('ln', () => {
		it('ln(0⁺) = -∞', () => {
			expectNegInfinity(lnExtended(zeroPlus()));
		});

		it('ln(+∞) = +∞', () => {
			expectPosInfinity(lnExtended(positiveInfinity()));
		});

		it('ln(1) = 0', () => {
			expectNumber(lnExtended(number('1')), 0);
		});

		it('ln(e) ≈ 1', () => {
			expectNumber(lnExtended(number(Math.E.toString())), 1, 1e-10);
		});
	});

	describe('exp', () => {
		it('exp(-∞) = 0⁺', () => {
			expectZeroPlus(expExtended(negativeInfinity()));
		});

		it('exp(+∞) = +∞', () => {
			expectPosInfinity(expExtended(positiveInfinity()));
		});

		it('exp(0) = 1', () => {
			expectNumber(expExtended(number('0')), 1);
		});

		it('exp(1) ≈ e', () => {
			expectNumber(expExtended(number('1')), Math.E, 1e-10);
		});
	});

	describe('sqrt', () => {
		it('sqrt(0⁺) = 0⁺', () => {
			expectZeroPlus(sqrtExtended(zeroPlus()));
		});

		it('sqrt(+∞) = +∞', () => {
			expectPosInfinity(sqrtExtended(positiveInfinity()));
		});

		it('sqrt(4) = 2', () => {
			expectNumber(sqrtExtended(number('4')), 2);
		});
	});

	describe('sin', () => {
		it('sin(0⁺) = 0⁺', () => {
			expectZeroPlus(sinExtended(zeroPlus()));
		});

		it('sin(0⁻) = 0⁻', () => {
			expectZeroMinus(sinExtended(zeroMinus()));
		});

		it('sin(0) = 0', () => {
			expectNumber(sinExtended(number('0')), 0);
		});
	});

	describe('cos', () => {
		it('cos(0⁺) = 1', () => {
			expectNumber(cosExtended(zeroPlus()), 1);
		});

		it('cos(0) = 1', () => {
			expectNumber(cosExtended(number('0')), 1);
		});
	});
});

// =============================================================================
// Negation Tests
// =============================================================================

describe('Extended Negation', () => {
	it('-5 = -5', () => {
		expectNumber(negateExtended(number('5')), -5);
	});

	it('-(+∞) = -∞', () => {
		expectNegInfinity(negateExtended(positiveInfinity()));
	});

	it('-(-∞) = +∞', () => {
		expectPosInfinity(negateExtended(negativeInfinity()));
	});

	it('-(0⁺) = 0⁻', () => {
		expectZeroMinus(negateExtended(zeroPlus()));
	});

	it('-(0⁻) = 0⁺', () => {
		expectZeroPlus(negateExtended(zeroMinus()));
	});
});
