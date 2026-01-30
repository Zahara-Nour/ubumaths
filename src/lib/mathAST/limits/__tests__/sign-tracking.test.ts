/**
 * Tests for Sign Tracking and Infinity Algebra
 *
 * Tests the binary operations on SignedLimitValue:
 * - addSigns, subtractSigns, multiplySigns, divideSigns
 */

import { describe, it, expect } from 'vitest';
import {
	addSigns,
	subtractSigns,
	multiplySigns,
	divideSigns,
	isIndeterminate,
	type SignedLimitValue,
	type BinaryOpResult
} from '../sign-tracking';

// =============================================================================
// Helper Functions
// =============================================================================

const posInf: SignedLimitValue = { type: 'pos-infinity' };
const negInf: SignedLimitValue = { type: 'neg-infinity' };
const zeroPlus: SignedLimitValue = { type: 'zero-plus' };
const zeroMinus: SignedLimitValue = { type: 'zero-minus' };
const zero: SignedLimitValue = { type: 'zero' };
const finite = (v: number): SignedLimitValue => ({ type: 'finite', value: v });
const unknown: SignedLimitValue = { type: 'unknown' };

function expectResult(result: BinaryOpResult, expected: SignedLimitValue | string) {
	if (typeof expected === 'string') {
		// Expecting indeterminate form
		expect(isIndeterminate(result)).toBe(true);
		if (isIndeterminate(result)) {
			expect(result.form).toBe(expected);
		}
	} else {
		expect(result.type).toBe(expected.type);
		if (expected.type === 'finite' && result.type === 'finite') {
			expect(result.value).toBeCloseTo(expected.value);
		}
	}
}

// =============================================================================
// Addition Tests
// =============================================================================

describe('addSigns', () => {
	describe('infinity + infinity', () => {
		it('+∞ + +∞ = +∞', () => {
			expectResult(addSigns(posInf, posInf), posInf);
		});

		it('-∞ + -∞ = -∞', () => {
			expectResult(addSigns(negInf, negInf), negInf);
		});

		it('+∞ + -∞ = indeterminate (∞-∞)', () => {
			expectResult(addSigns(posInf, negInf), '∞-∞');
		});

		it('-∞ + +∞ = indeterminate (∞-∞)', () => {
			expectResult(addSigns(negInf, posInf), '∞-∞');
		});
	});

	describe('infinity + finite', () => {
		it('+∞ + 5 = +∞', () => {
			expectResult(addSigns(posInf, finite(5)), posInf);
		});

		it('-∞ + 5 = -∞', () => {
			expectResult(addSigns(negInf, finite(5)), negInf);
		});

		it('5 + +∞ = +∞', () => {
			expectResult(addSigns(finite(5), posInf), posInf);
		});

		it('-3 + -∞ = -∞', () => {
			expectResult(addSigns(finite(-3), negInf), negInf);
		});
	});

	describe('infinity + zero', () => {
		it('+∞ + 0⁺ = +∞', () => {
			expectResult(addSigns(posInf, zeroPlus), posInf);
		});

		it('-∞ + 0⁻ = -∞', () => {
			expectResult(addSigns(negInf, zeroMinus), negInf);
		});
	});

	describe('finite + finite', () => {
		it('3 + 4 = 7', () => {
			expectResult(addSigns(finite(3), finite(4)), finite(7));
		});

		it('-2 + 5 = 3', () => {
			expectResult(addSigns(finite(-2), finite(5)), finite(3));
		});
	});

	describe('finite + zero', () => {
		it('5 + 0⁺ = 5', () => {
			expectResult(addSigns(finite(5), zeroPlus), finite(5));
		});

		it('0⁻ + 3 = 3', () => {
			expectResult(addSigns(zeroMinus, finite(3)), finite(3));
		});
	});

	describe('zero + zero', () => {
		it('0⁺ + 0⁺ = 0⁺', () => {
			expectResult(addSigns(zeroPlus, zeroPlus), zeroPlus);
		});

		it('0⁻ + 0⁻ = 0⁻', () => {
			expectResult(addSigns(zeroMinus, zeroMinus), zeroMinus);
		});

		it('0⁺ + 0⁻ = 0 (unknown sign)', () => {
			expectResult(addSigns(zeroPlus, zeroMinus), zero);
		});
	});

	describe('unknown propagation', () => {
		it('unknown + anything = unknown', () => {
			expectResult(addSigns(unknown, posInf), unknown);
			expectResult(addSigns(finite(5), unknown), unknown);
		});
	});
});

// =============================================================================
// Subtraction Tests
// =============================================================================

describe('subtractSigns', () => {
	describe('infinity - infinity', () => {
		it('+∞ - -∞ = +∞', () => {
			expectResult(subtractSigns(posInf, negInf), posInf);
		});

		it('-∞ - +∞ = -∞', () => {
			expectResult(subtractSigns(negInf, posInf), negInf);
		});

		it('+∞ - +∞ = indeterminate (∞-∞)', () => {
			expectResult(subtractSigns(posInf, posInf), '∞-∞');
		});

		it('-∞ - -∞ = indeterminate (∞-∞)', () => {
			expectResult(subtractSigns(negInf, negInf), '∞-∞');
		});
	});

	describe('infinity - finite', () => {
		it('+∞ - 5 = +∞', () => {
			expectResult(subtractSigns(posInf, finite(5)), posInf);
		});

		it('-∞ - 5 = -∞', () => {
			expectResult(subtractSigns(negInf, finite(5)), negInf);
		});
	});

	describe('finite - infinity', () => {
		it('5 - +∞ = -∞', () => {
			expectResult(subtractSigns(finite(5), posInf), negInf);
		});

		it('5 - -∞ = +∞', () => {
			expectResult(subtractSigns(finite(5), negInf), posInf);
		});
	});

	describe('finite - finite', () => {
		it('7 - 3 = 4', () => {
			expectResult(subtractSigns(finite(7), finite(3)), finite(4));
		});
	});
});

// =============================================================================
// Multiplication Tests
// =============================================================================

describe('multiplySigns', () => {
	describe('infinity × infinity', () => {
		it('+∞ × +∞ = +∞', () => {
			expectResult(multiplySigns(posInf, posInf), posInf);
		});

		it('-∞ × -∞ = +∞', () => {
			expectResult(multiplySigns(negInf, negInf), posInf);
		});

		it('+∞ × -∞ = -∞', () => {
			expectResult(multiplySigns(posInf, negInf), negInf);
		});

		it('-∞ × +∞ = -∞', () => {
			expectResult(multiplySigns(negInf, posInf), negInf);
		});
	});

	describe('infinity × zero = indeterminate', () => {
		it('+∞ × 0⁺ = indeterminate (0·∞)', () => {
			expectResult(multiplySigns(posInf, zeroPlus), '0·∞');
		});

		it('-∞ × 0⁻ = indeterminate (0·∞)', () => {
			expectResult(multiplySigns(negInf, zeroMinus), '0·∞');
		});

		it('0 × +∞ = indeterminate (0·∞)', () => {
			expectResult(multiplySigns(zero, posInf), '0·∞');
		});
	});

	describe('infinity × finite', () => {
		it('+∞ × 3 = +∞', () => {
			expectResult(multiplySigns(posInf, finite(3)), posInf);
		});

		it('+∞ × -2 = -∞', () => {
			expectResult(multiplySigns(posInf, finite(-2)), negInf);
		});

		it('-∞ × 3 = -∞', () => {
			expectResult(multiplySigns(negInf, finite(3)), negInf);
		});

		it('-∞ × -2 = +∞', () => {
			expectResult(multiplySigns(negInf, finite(-2)), posInf);
		});

		it('5 × +∞ = +∞', () => {
			expectResult(multiplySigns(finite(5), posInf), posInf);
		});

		it('-4 × -∞ = +∞', () => {
			expectResult(multiplySigns(finite(-4), negInf), posInf);
		});
	});

	describe('finite × finite', () => {
		it('3 × 4 = 12', () => {
			expectResult(multiplySigns(finite(3), finite(4)), finite(12));
		});

		it('-2 × 3 = -6', () => {
			expectResult(multiplySigns(finite(-2), finite(3)), finite(-6));
		});

		it('-2 × -3 = 6', () => {
			expectResult(multiplySigns(finite(-2), finite(-3)), finite(6));
		});
	});

	describe('zero × finite', () => {
		it('0⁺ × 3 = 0⁺', () => {
			expectResult(multiplySigns(zeroPlus, finite(3)), zeroPlus);
		});

		it('0⁺ × -2 = 0⁻', () => {
			expectResult(multiplySigns(zeroPlus, finite(-2)), zeroMinus);
		});

		it('0⁻ × -3 = 0⁺', () => {
			expectResult(multiplySigns(zeroMinus, finite(-3)), zeroPlus);
		});
	});

	describe('zero × zero', () => {
		it('0⁺ × 0⁺ = 0⁺', () => {
			expectResult(multiplySigns(zeroPlus, zeroPlus), zeroPlus);
		});

		it('0⁺ × 0⁻ = 0⁻', () => {
			expectResult(multiplySigns(zeroPlus, zeroMinus), zeroMinus);
		});

		it('0⁻ × 0⁻ = 0⁺', () => {
			expectResult(multiplySigns(zeroMinus, zeroMinus), zeroPlus);
		});
	});
});

// =============================================================================
// Division Tests
// =============================================================================

describe('divideSigns', () => {
	describe('infinity / infinity = indeterminate', () => {
		it('+∞ / +∞ = indeterminate (∞/∞)', () => {
			expectResult(divideSigns(posInf, posInf), '∞/∞');
		});

		it('-∞ / +∞ = indeterminate (∞/∞)', () => {
			expectResult(divideSigns(negInf, posInf), '∞/∞');
		});

		it('+∞ / -∞ = indeterminate (∞/∞)', () => {
			expectResult(divideSigns(posInf, negInf), '∞/∞');
		});
	});

	describe('zero / zero = indeterminate', () => {
		it('0⁺ / 0⁺ = indeterminate (0/0)', () => {
			expectResult(divideSigns(zeroPlus, zeroPlus), '0/0');
		});

		it('0 / 0⁻ = indeterminate (0/0)', () => {
			expectResult(divideSigns(zero, zeroMinus), '0/0');
		});
	});

	describe('finite / infinity = 0', () => {
		it('5 / +∞ = 0⁺', () => {
			expectResult(divideSigns(finite(5), posInf), zeroPlus);
		});

		it('5 / -∞ = 0⁻', () => {
			expectResult(divideSigns(finite(5), negInf), zeroMinus);
		});

		it('-3 / +∞ = 0⁻', () => {
			expectResult(divideSigns(finite(-3), posInf), zeroMinus);
		});

		it('-3 / -∞ = 0⁺', () => {
			expectResult(divideSigns(finite(-3), negInf), zeroPlus);
		});
	});

	describe('infinity / finite = infinity', () => {
		it('+∞ / 2 = +∞', () => {
			expectResult(divideSigns(posInf, finite(2)), posInf);
		});

		it('+∞ / -2 = -∞', () => {
			expectResult(divideSigns(posInf, finite(-2)), negInf);
		});

		it('-∞ / 2 = -∞', () => {
			expectResult(divideSigns(negInf, finite(2)), negInf);
		});

		it('-∞ / -2 = +∞', () => {
			expectResult(divideSigns(negInf, finite(-2)), posInf);
		});
	});

	describe('finite / zero = infinity', () => {
		it('5 / 0⁺ = +∞', () => {
			expectResult(divideSigns(finite(5), zeroPlus), posInf);
		});

		it('5 / 0⁻ = -∞', () => {
			expectResult(divideSigns(finite(5), zeroMinus), negInf);
		});

		it('-3 / 0⁺ = -∞', () => {
			expectResult(divideSigns(finite(-3), zeroPlus), negInf);
		});

		it('-3 / 0⁻ = +∞', () => {
			expectResult(divideSigns(finite(-3), zeroMinus), posInf);
		});
	});

	describe('zero / finite = 0', () => {
		it('0⁺ / 3 = 0⁺', () => {
			expectResult(divideSigns(zeroPlus, finite(3)), zeroPlus);
		});

		it('0⁺ / -2 = 0⁻', () => {
			expectResult(divideSigns(zeroPlus, finite(-2)), zeroMinus);
		});

		it('0⁻ / -2 = 0⁺', () => {
			expectResult(divideSigns(zeroMinus, finite(-2)), zeroPlus);
		});
	});

	describe('finite / finite', () => {
		it('10 / 2 = 5', () => {
			expectResult(divideSigns(finite(10), finite(2)), finite(5));
		});

		it('-6 / 2 = -3', () => {
			expectResult(divideSigns(finite(-6), finite(2)), finite(-3));
		});

		it('-6 / -2 = 3', () => {
			expectResult(divideSigns(finite(-6), finite(-2)), finite(3));
		});
	});

	describe('infinity / zero = infinity', () => {
		it('+∞ / 0⁺ = +∞', () => {
			expectResult(divideSigns(posInf, zeroPlus), posInf);
		});

		it('+∞ / 0⁻ = -∞', () => {
			expectResult(divideSigns(posInf, zeroMinus), negInf);
		});

		it('-∞ / 0⁺ = -∞', () => {
			expectResult(divideSigns(negInf, zeroPlus), negInf);
		});

		it('-∞ / 0⁻ = +∞', () => {
			expectResult(divideSigns(negInf, zeroMinus), posInf);
		});
	});
});

// =============================================================================
// isIndeterminate Tests
// =============================================================================

describe('isIndeterminate', () => {
	it('returns true for indeterminate forms', () => {
		expect(isIndeterminate({ type: 'indeterminate', form: '∞-∞' })).toBe(true);
		expect(isIndeterminate({ type: 'indeterminate', form: '0·∞' })).toBe(true);
		expect(isIndeterminate({ type: 'indeterminate', form: '∞/∞' })).toBe(true);
		expect(isIndeterminate({ type: 'indeterminate', form: '0/0' })).toBe(true);
	});

	it('returns false for determinate values', () => {
		expect(isIndeterminate(posInf)).toBe(false);
		expect(isIndeterminate(negInf)).toBe(false);
		expect(isIndeterminate(zeroPlus)).toBe(false);
		expect(isIndeterminate(finite(5))).toBe(false);
		expect(isIndeterminate(unknown)).toBe(false);
	});
});
