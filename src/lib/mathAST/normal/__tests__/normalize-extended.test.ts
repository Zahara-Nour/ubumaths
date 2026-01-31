/**
 * Tests for normalizeExtended - Extended normalization for limit calculations.
 *
 * These tests verify that normalizeExtended correctly handles:
 * - InfinityNode and SignedZeroNode recognition
 * - Extended arithmetic operations
 * - Indeterminate form detection
 */

import { describe, it, expect } from 'vitest';
import { normalizeExtended } from '../normalize-extended';
import { denormalizeExtended } from '../denormalize';
import {
	positiveInfinity,
	negativeInfinity,
	zeroPlus,
	zeroMinus,
	number,
	add,
	subtract,
	multiply,
	divide,
	opposite,
	func
} from '../../factory';
import type { ExtendedNormalizeResult } from '../types';

// =============================================================================
// Basic Recognition
// =============================================================================

describe('normalizeExtended - basic recognition', () => {
	it('recognizes positive infinity', () => {
		const result = normalizeExtended(positiveInfinity());
		expect(result).toEqual({ type: 'infinity', sign: 'positive' });
	});

	it('recognizes negative infinity', () => {
		const result = normalizeExtended(negativeInfinity());
		expect(result).toEqual({ type: 'infinity', sign: 'negative' });
	});

	it('recognizes positive signed zero', () => {
		const result = normalizeExtended(zeroPlus());
		expect(result).toEqual({ type: 'signed-zero', sign: 'positive' });
	});

	it('recognizes negative signed zero', () => {
		const result = normalizeExtended(zeroMinus());
		expect(result).toEqual({ type: 'signed-zero', sign: 'negative' });
	});

	it('normalizes regular numbers to normal form', () => {
		const result = normalizeExtended(number('5'));
		expect(result.type).toBe('normal');
	});
});

// =============================================================================
// Addition
// =============================================================================

describe('normalizeExtended - addition', () => {
	it('+∞ + +∞ = +∞', () => {
		const result = normalizeExtended(add(positiveInfinity(), positiveInfinity()));
		expect(result).toEqual({ type: 'infinity', sign: 'positive' });
	});

	it('-∞ + -∞ = -∞', () => {
		const result = normalizeExtended(add(negativeInfinity(), negativeInfinity()));
		expect(result).toEqual({ type: 'infinity', sign: 'negative' });
	});

	it('+∞ + -∞ = indeterminate ∞-∞', () => {
		const result = normalizeExtended(add(positiveInfinity(), negativeInfinity()));
		expect(result).toEqual({ type: 'indeterminate', form: '∞-∞' });
	});

	it('+∞ + 5 = +∞', () => {
		const result = normalizeExtended(add(positiveInfinity(), number('5')));
		expect(result).toEqual({ type: 'infinity', sign: 'positive' });
	});

	it('5 + +∞ = +∞', () => {
		const result = normalizeExtended(add(number('5'), positiveInfinity()));
		expect(result).toEqual({ type: 'infinity', sign: 'positive' });
	});

	it('0⁺ + 0⁺ = 0⁺', () => {
		const result = normalizeExtended(add(zeroPlus(), zeroPlus()));
		expect(result).toEqual({ type: 'signed-zero', sign: 'positive' });
	});

	it('0⁺ + 0⁻ = 0', () => {
		const result = normalizeExtended(add(zeroPlus(), zeroMinus()));
		expect(result.type).toBe('normal');
	});

	it('0⁺ + 5 = 5', () => {
		const result = normalizeExtended(add(zeroPlus(), number('5')));
		expect(result.type).toBe('normal');
	});
});

// =============================================================================
// Subtraction
// =============================================================================

describe('normalizeExtended - subtraction', () => {
	it('+∞ - -∞ = +∞', () => {
		const result = normalizeExtended(subtract(positiveInfinity(), negativeInfinity()));
		expect(result).toEqual({ type: 'infinity', sign: 'positive' });
	});

	it('+∞ - +∞ = indeterminate ∞-∞', () => {
		const result = normalizeExtended(subtract(positiveInfinity(), positiveInfinity()));
		expect(result).toEqual({ type: 'indeterminate', form: '∞-∞' });
	});

	it('5 - +∞ = -∞', () => {
		const result = normalizeExtended(subtract(number('5'), positiveInfinity()));
		expect(result).toEqual({ type: 'infinity', sign: 'negative' });
	});
});

// =============================================================================
// Multiplication
// =============================================================================

describe('normalizeExtended - multiplication', () => {
	it('0 × ∞ = indeterminate 0·∞', () => {
		const result = normalizeExtended(multiply(zeroPlus(), positiveInfinity()));
		expect(result).toEqual({ type: 'indeterminate', form: '0·∞' });
	});

	it('∞ × 0 = indeterminate 0·∞', () => {
		const result = normalizeExtended(multiply(positiveInfinity(), zeroMinus()));
		expect(result).toEqual({ type: 'indeterminate', form: '0·∞' });
	});

	it('+∞ × +∞ = +∞', () => {
		const result = normalizeExtended(multiply(positiveInfinity(), positiveInfinity()));
		expect(result).toEqual({ type: 'infinity', sign: 'positive' });
	});

	it('+∞ × -∞ = -∞', () => {
		const result = normalizeExtended(multiply(positiveInfinity(), negativeInfinity()));
		expect(result).toEqual({ type: 'infinity', sign: 'negative' });
	});

	it('-∞ × -∞ = +∞', () => {
		const result = normalizeExtended(multiply(negativeInfinity(), negativeInfinity()));
		expect(result).toEqual({ type: 'infinity', sign: 'positive' });
	});

	it('+∞ × 2 = +∞', () => {
		const result = normalizeExtended(multiply(positiveInfinity(), number('2')));
		expect(result).toEqual({ type: 'infinity', sign: 'positive' });
	});

	it('+∞ × (-2) = -∞', () => {
		const result = normalizeExtended(multiply(positiveInfinity(), opposite(number('2'))));
		expect(result).toEqual({ type: 'infinity', sign: 'negative' });
	});

	it('0⁺ × 0⁺ = 0⁺', () => {
		const result = normalizeExtended(multiply(zeroPlus(), zeroPlus()));
		expect(result).toEqual({ type: 'signed-zero', sign: 'positive' });
	});

	it('0⁺ × 0⁻ = 0⁻', () => {
		const result = normalizeExtended(multiply(zeroPlus(), zeroMinus()));
		expect(result).toEqual({ type: 'signed-zero', sign: 'negative' });
	});
});

// =============================================================================
// Division
// =============================================================================

describe('normalizeExtended - division', () => {
	it('0 / 0 = indeterminate 0/0', () => {
		const result = normalizeExtended(divide(zeroPlus(), zeroMinus()));
		expect(result).toEqual({ type: 'indeterminate', form: '0/0' });
	});

	it('∞ / ∞ = indeterminate ∞/∞', () => {
		const result = normalizeExtended(divide(positiveInfinity(), negativeInfinity()));
		expect(result).toEqual({ type: 'indeterminate', form: '∞/∞' });
	});

	it('5 / 0⁺ = +∞', () => {
		const result = normalizeExtended(divide(number('5'), zeroPlus()));
		expect(result).toEqual({ type: 'infinity', sign: 'positive' });
	});

	it('5 / 0⁻ = -∞', () => {
		const result = normalizeExtended(divide(number('5'), zeroMinus()));
		expect(result).toEqual({ type: 'infinity', sign: 'negative' });
	});

	it('(-5) / 0⁺ = -∞', () => {
		const result = normalizeExtended(divide(opposite(number('5')), zeroPlus()));
		expect(result).toEqual({ type: 'infinity', sign: 'negative' });
	});

	it('5 / +∞ = 0⁺', () => {
		const result = normalizeExtended(divide(number('5'), positiveInfinity()));
		expect(result).toEqual({ type: 'signed-zero', sign: 'positive' });
	});

	it('5 / -∞ = 0⁻', () => {
		const result = normalizeExtended(divide(number('5'), negativeInfinity()));
		expect(result).toEqual({ type: 'signed-zero', sign: 'negative' });
	});

	it('+∞ / 2 = +∞', () => {
		const result = normalizeExtended(divide(positiveInfinity(), number('2')));
		expect(result).toEqual({ type: 'infinity', sign: 'positive' });
	});

	it('+∞ / 0⁺ = +∞', () => {
		const result = normalizeExtended(divide(positiveInfinity(), zeroPlus()));
		expect(result).toEqual({ type: 'infinity', sign: 'positive' });
	});

	it('0⁺ / 5 = 0⁺', () => {
		const result = normalizeExtended(divide(zeroPlus(), number('5')));
		expect(result).toEqual({ type: 'signed-zero', sign: 'positive' });
	});

	it('0⁺ / +∞ = 0⁺', () => {
		const result = normalizeExtended(divide(zeroPlus(), positiveInfinity()));
		expect(result).toEqual({ type: 'signed-zero', sign: 'positive' });
	});
});

// =============================================================================
// Negation
// =============================================================================

describe('normalizeExtended - negation', () => {
	it('-( +∞) = -∞', () => {
		const result = normalizeExtended(opposite(positiveInfinity()));
		expect(result).toEqual({ type: 'infinity', sign: 'negative' });
	});

	it('-(  -∞) = +∞', () => {
		const result = normalizeExtended(opposite(negativeInfinity()));
		expect(result).toEqual({ type: 'infinity', sign: 'positive' });
	});

	it('-(0⁺) = 0⁻', () => {
		const result = normalizeExtended(opposite(zeroPlus()));
		expect(result).toEqual({ type: 'signed-zero', sign: 'negative' });
	});

	it('-(0⁻) = 0⁺', () => {
		const result = normalizeExtended(opposite(zeroMinus()));
		expect(result).toEqual({ type: 'signed-zero', sign: 'positive' });
	});
});

// =============================================================================
// Functions
// =============================================================================

describe('normalizeExtended - functions', () => {
	it('ln(0⁺) = -∞', () => {
		const result = normalizeExtended(func('ln', [zeroPlus()]));
		expect(result).toEqual({ type: 'infinity', sign: 'negative' });
	});

	it('ln(+∞) = +∞', () => {
		const result = normalizeExtended(func('ln', [positiveInfinity()]));
		expect(result).toEqual({ type: 'infinity', sign: 'positive' });
	});

	it('exp(-∞) = 0⁺', () => {
		const result = normalizeExtended(func('exp', [negativeInfinity()]));
		expect(result).toEqual({ type: 'signed-zero', sign: 'positive' });
	});

	it('exp(+∞) = +∞', () => {
		const result = normalizeExtended(func('exp', [positiveInfinity()]));
		expect(result).toEqual({ type: 'infinity', sign: 'positive' });
	});

	it('exp(0±) = 1', () => {
		const result = normalizeExtended(func('exp', [zeroPlus()]));
		expect(result.type).toBe('normal');
	});

	it('√(0⁺) = 0⁺', () => {
		const result = normalizeExtended(func('sqrt', [zeroPlus()]));
		expect(result).toEqual({ type: 'signed-zero', sign: 'positive' });
	});

	it('√(+∞) = +∞', () => {
		const result = normalizeExtended(func('sqrt', [positiveInfinity()]));
		expect(result).toEqual({ type: 'infinity', sign: 'positive' });
	});

	it('sin(0⁺) = 0⁺', () => {
		const result = normalizeExtended(func('sin', [zeroPlus()]));
		expect(result).toEqual({ type: 'signed-zero', sign: 'positive' });
	});

	it('cos(0±) = 1', () => {
		const result = normalizeExtended(func('cos', [zeroPlus()]));
		expect(result.type).toBe('normal');
	});

	it('sin(∞) throws (oscillates)', () => {
		expect(() => normalizeExtended(func('sin', [positiveInfinity()]))).toThrow(/oscillates/);
	});

	it('cos(∞) throws (oscillates)', () => {
		expect(() => normalizeExtended(func('cos', [negativeInfinity()]))).toThrow(/oscillates/);
	});

	it('abs(+∞) = +∞', () => {
		const result = normalizeExtended(func('abs', [positiveInfinity()]));
		expect(result).toEqual({ type: 'infinity', sign: 'positive' });
	});

	it('abs(-∞) = +∞', () => {
		const result = normalizeExtended(func('abs', [negativeInfinity()]));
		expect(result).toEqual({ type: 'infinity', sign: 'positive' });
	});

	it('abs(0⁻) = 0⁺', () => {
		const result = normalizeExtended(func('abs', [zeroMinus()]));
		expect(result).toEqual({ type: 'signed-zero', sign: 'positive' });
	});
});

// =============================================================================
// Denormalize Extended
// =============================================================================

describe('denormalizeExtended', () => {
	it('denormalizes infinity to InfinityNode', () => {
		const result: ExtendedNormalizeResult = { type: 'infinity', sign: 'positive' };
		const node = denormalizeExtended(result);
		expect(node.type).toBe('infinity');
		if (node.type === 'infinity') {
			expect(node.sign).toBe('positive');
		}
	});

	it('denormalizes signed-zero to SignedZeroNode', () => {
		const result: ExtendedNormalizeResult = { type: 'signed-zero', sign: 'negative' };
		const node = denormalizeExtended(result);
		expect(node.type).toBe('signed-zero');
		if (node.type === 'signed-zero') {
			expect(node.sign).toBe('negative');
		}
	});

	it('throws on indeterminate form', () => {
		const result: ExtendedNormalizeResult = { type: 'indeterminate', form: '0/0' };
		expect(() => denormalizeExtended(result)).toThrow(/indeterminate/);
	});
});
