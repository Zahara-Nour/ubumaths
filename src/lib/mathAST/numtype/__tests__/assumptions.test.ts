/**
 * Tests for TypeContext assumptions
 *
 * Verifies that variable assumptions (sign, finiteness) are correctly
 * integrated into type inference results.
 */

import { describe, it, expect } from 'vitest';
import { inferType } from '../infer';
import { variable, greek } from '../../factory';
import type { TypeContext, VariableAssumption } from '../types';

// =============================================================================
// Helpers
// =============================================================================

function ctxWithAssumptions(
	assumptions: Record<string, VariableAssumption>,
	variables?: Record<string, string>
): TypeContext {
	return {
		...(variables && {
			variables: new Map(Object.entries(variables)) as ReadonlyMap<string, never>
		}),
		assumptions: new Map(Object.entries(assumptions))
	};
}

// =============================================================================
// Tests
// =============================================================================

describe('TypeContext assumptions', () => {
	describe('inferType with variable assumptions', () => {
		it('should return sign from assumptions for a variable', () => {
			const ctx = ctxWithAssumptions({ x: { sign: 'positive' } });
			const result = inferType(variable('x'), ctx);
			expect(result.base).toBe('real');
			expect(result.sign).toBe('positive');
		});

		it('should return negative sign from assumptions', () => {
			const ctx = ctxWithAssumptions({ x: { sign: 'negative' } });
			const result = inferType(variable('x'), ctx);
			expect(result.base).toBe('real');
			expect(result.sign).toBe('negative');
		});

		it('should return finiteness from assumptions', () => {
			const ctx = ctxWithAssumptions({ x: { finite: true } });
			const result = inferType(variable('x'), ctx);
			expect(result.base).toBe('real');
			expect(result.finite).toBe(true);
		});

		it('should combine sign and finiteness', () => {
			const ctx = ctxWithAssumptions({ x: { sign: 'nonzero', finite: true } });
			const result = inferType(variable('x'), ctx);
			expect(result.base).toBe('real');
			expect(result.sign).toBe('nonzero');
			expect(result.finite).toBe(true);
		});

		it('should not affect variables without assumptions', () => {
			const ctx = ctxWithAssumptions({ x: { sign: 'positive' } });
			const result = inferType(variable('y'), ctx);
			expect(result.base).toBe('real');
			expect(result.sign).toBeUndefined();
		});

		it('should merge assumptions with explicit variable type', () => {
			const ctx: TypeContext = {
				variables: new Map([['n', 'integer']]),
				assumptions: new Map([['n', { sign: 'positive' }]])
			};
			const result = inferType(variable('n'), ctx);
			expect(result.base).toBe('integer');
			expect(result.sign).toBe('positive');
		});

		it('should work in strict mode', () => {
			const ctx: TypeContext = {
				strict: true,
				assumptions: new Map([['x', { sign: 'positive' }]])
			};
			const result = inferType(variable('x'), ctx);
			expect(result.base).toBe('unknown');
			expect(result.sign).toBe('positive');
		});
	});

	describe('inferType with greek letter assumptions', () => {
		it('should return sign from assumptions for a greek letter', () => {
			const ctx = ctxWithAssumptions({ alpha: { sign: 'positive' } });
			const result = inferType(greek('alpha'), ctx);
			expect(result.base).toBe('real');
			expect(result.sign).toBe('positive');
		});

		it('should not affect pi (always transcendental)', () => {
			const ctx = ctxWithAssumptions({ pi: { sign: 'negative' } });
			const result = inferType(greek('pi'), ctx);
			// pi is always transcendental, positive
			expect(result.base).toBe('transcendental');
			expect(result.sign).toBe('positive');
		});
	});
});
