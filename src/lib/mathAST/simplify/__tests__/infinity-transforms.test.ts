/**
 * Tests for infinity transforms
 */

import { describe, it, expect } from 'vitest';
import { infinityTransforms } from '../infinity-transforms';
import { applyIdentityTransforms } from '../../transform/identity-engine';
import {
	func,
	number,
	positiveInfinity,
	negativeInfinity,
	opposite,
	greek,
	divide
} from '../../factory';
import { toLatex } from '../../latex-generator';
import type { MathNode } from '../../types';

// =============================================================================
// Helpers
// =============================================================================

function applyInfTransforms(node: MathNode): string {
	const { result } = applyIdentityTransforms(node, infinityTransforms);
	return toLatex(result);
}

// =============================================================================
// Tests
// =============================================================================

describe('infinity transforms', () => {
	describe('arctan', () => {
		it('arctan(+∞) -> π/2', () => {
			const result = applyInfTransforms(func('arctan', [positiveInfinity()]));
			expect(result).toBe(toLatex(divide(greek('pi'), number('2'), 'fraction')));
		});

		it('arctan(-∞) -> -π/2', () => {
			const result = applyInfTransforms(func('arctan', [negativeInfinity()]));
			expect(result).toBe(toLatex(opposite(divide(greek('pi'), number('2'), 'fraction'))));
		});
	});

	describe('hyperbolic functions', () => {
		it('sinh(+∞) -> +∞', () => {
			const result = applyInfTransforms(func('sinh', [positiveInfinity()]));
			expect(result).toBe(toLatex(positiveInfinity()));
		});

		it('sinh(-∞) -> -∞', () => {
			const result = applyInfTransforms(func('sinh', [negativeInfinity()]));
			expect(result).toBe(toLatex(negativeInfinity()));
		});

		it('cosh(+∞) -> +∞', () => {
			const result = applyInfTransforms(func('cosh', [positiveInfinity()]));
			expect(result).toBe(toLatex(positiveInfinity()));
		});

		it('cosh(-∞) -> +∞', () => {
			const result = applyInfTransforms(func('cosh', [negativeInfinity()]));
			expect(result).toBe(toLatex(positiveInfinity()));
		});

		it('tanh(+∞) -> 1', () => {
			const result = applyInfTransforms(func('tanh', [positiveInfinity()]));
			expect(result).toBe('1');
		});

		it('tanh(-∞) -> -1', () => {
			const result = applyInfTransforms(func('tanh', [negativeInfinity()]));
			expect(result).toBe('-1');
		});
	});

	describe('exp / ln', () => {
		it('exp(+∞) -> +∞', () => {
			const result = applyInfTransforms(func('exp', [positiveInfinity()]));
			expect(result).toBe(toLatex(positiveInfinity()));
		});

		it('exp(-∞) -> 0', () => {
			const result = applyInfTransforms(func('exp', [negativeInfinity()]));
			expect(result).toBe('0');
		});

		it('ln(+∞) -> +∞', () => {
			const result = applyInfTransforms(func('ln', [positiveInfinity()]));
			expect(result).toBe(toLatex(positiveInfinity()));
		});
	});

	describe('inverse hyperbolic', () => {
		it('arcsinh(+∞) -> +∞', () => {
			const result = applyInfTransforms(func('arcsinh', [positiveInfinity()]));
			expect(result).toBe(toLatex(positiveInfinity()));
		});

		it('arccosh(+∞) -> +∞', () => {
			const result = applyInfTransforms(func('arccosh', [positiveInfinity()]));
			expect(result).toBe(toLatex(positiveInfinity()));
		});
	});

	describe('no-op cases', () => {
		it('should not transform sin(+∞)', () => {
			const node = func('sin', [positiveInfinity()]);
			const result = applyInfTransforms(node);
			expect(result).toBe(toLatex(node));
		});

		it('should not transform arctan(x) for non-infinity', () => {
			const node = func('arctan', [number('1')]);
			const result = applyInfTransforms(node);
			expect(result).toBe(toLatex(node));
		});
	});
});
