/**
 * Tests for Parity (even/odd) Inference
 *
 * Verifies that parity is correctly inferred for literals,
 * propagated through arithmetic operations, and available via predicates.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { inferType } from '../infer';
import { isEvenType, isOddType } from '../predicates';
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
// Literal Parity
// =============================================================================

describe('parity inference - literals', () => {
	it('should infer even parity for even integers', () => {
		expect(inferType(parseLatex('4')).parity).toBe('even');
		expect(inferType(parseLatex('0')).parity).toBe('even');
		expect(inferType(parseLatex('100')).parity).toBe('even');
	});

	it('should infer odd parity for odd integers', () => {
		expect(inferType(parseLatex('5')).parity).toBe('odd');
		expect(inferType(parseLatex('1')).parity).toBe('odd');
		expect(inferType(parseLatex('99')).parity).toBe('odd');
	});

	it('should infer even for negative even integers', () => {
		expect(inferType(parseLatex('-2')).parity).toBe('even');
		expect(inferType(parseLatex('-4')).parity).toBe('even');
	});

	it('should infer odd for negative odd integers', () => {
		expect(inferType(parseLatex('-3')).parity).toBe('odd');
		expect(inferType(parseLatex('-1')).parity).toBe('odd');
	});

	it('should not have parity for non-integer literals', () => {
		expect(inferType(parseLatex('3.14')).parity).toBeUndefined();
		expect(inferType(parseLatex('1.5')).parity).toBeUndefined();
	});
});

// =============================================================================
// Variable Parity from Assumptions
// =============================================================================

describe('parity inference - variable assumptions', () => {
	it('should propagate even parity from assumption', () => {
		const ctx = ctxWithAssumptions({ n: { parity: 'even' } }, { n: 'integer' });
		const result = inferType(variable('n'), ctx);
		expect(result.parity).toBe('even');
	});

	it('should propagate odd parity from assumption', () => {
		const ctx = ctxWithAssumptions({ n: { parity: 'odd' } }, { n: 'integer' });
		const result = inferType(variable('n'), ctx);
		expect(result.parity).toBe('odd');
	});

	it('should propagate parity for variable without explicit type', () => {
		const ctx = ctxWithAssumptions({ k: { parity: 'even' } });
		const result = inferType(variable('k'), ctx);
		expect(result.parity).toBe('even');
	});

	it('should propagate parity for greek letters', () => {
		const ctx = ctxWithAssumptions({ alpha: { parity: 'odd' } }, { alpha: 'integer' });
		const result = inferType(greek('alpha'), ctx);
		expect(result.parity).toBe('odd');
	});

	it('should propagate parity in strict mode', () => {
		const ctx: TypeContext = {
			strict: true,
			assumptions: new Map([['x', { parity: 'even' }]])
		};
		const result = inferType(variable('x'), ctx);
		expect(result.parity).toBe('even');
	});
});

// =============================================================================
// Arithmetic Parity Propagation
// =============================================================================

describe('parity inference - addition', () => {
	it('even + even = even', () => {
		expect(inferType(parseLatex('2 + 4')).parity).toBe('even');
	});

	it('odd + odd = even', () => {
		expect(inferType(parseLatex('3 + 5')).parity).toBe('even');
	});

	it('even + odd = odd', () => {
		expect(inferType(parseLatex('2 + 3')).parity).toBe('odd');
	});

	it('odd + even = odd', () => {
		expect(inferType(parseLatex('3 + 4')).parity).toBe('odd');
	});

	it('no parity when operands lack parity', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'integer']])
		};
		expect(inferType(parseLatex('x + 2'), ctx).parity).toBeUndefined();
	});
});

describe('parity inference - subtraction', () => {
	it('even - even = even', () => {
		expect(inferType(parseLatex('4 - 2')).parity).toBe('even');
	});

	it('odd - odd = even', () => {
		expect(inferType(parseLatex('5 - 3')).parity).toBe('even');
	});

	it('even - odd = odd', () => {
		expect(inferType(parseLatex('4 - 3')).parity).toBe('odd');
	});

	it('odd - even = odd', () => {
		expect(inferType(parseLatex('5 - 2')).parity).toBe('odd');
	});
});

describe('parity inference - multiplication', () => {
	it('even * anything_integer = even', () => {
		expect(inferType(parseLatex('2 \\times 3')).parity).toBe('even');
		expect(inferType(parseLatex('4 \\times 5')).parity).toBe('even');
	});

	it('odd * odd = odd', () => {
		expect(inferType(parseLatex('3 \\times 5')).parity).toBe('odd');
	});

	it('even * even = even', () => {
		expect(inferType(parseLatex('2 \\times 4')).parity).toBe('even');
	});

	it('even * integer_var = even (with assumption)', () => {
		const ctx = ctxWithAssumptions({ n: { parity: 'odd' } }, { n: 'integer' });
		expect(inferType(parseLatex('2n'), ctx).parity).toBe('even');
	});
});

describe('parity inference - opposite', () => {
	it('-even = even', () => {
		expect(inferType(parseLatex('-4')).parity).toBe('even');
	});

	it('-odd = odd', () => {
		expect(inferType(parseLatex('-3')).parity).toBe('odd');
	});
});

// =============================================================================
// Predicates
// =============================================================================

describe('isEvenType / isOddType predicates', () => {
	it('isEvenType returns true for even integer', () => {
		expect(isEvenType(parseLatex('4'))).toBe(true);
		expect(isEvenType(parseLatex('0'))).toBe(true);
	});

	it('isEvenType returns false for odd integer', () => {
		expect(isEvenType(parseLatex('5'))).toBe(false);
	});

	it('isOddType returns true for odd integer', () => {
		expect(isOddType(parseLatex('5'))).toBe(true);
		expect(isOddType(parseLatex('1'))).toBe(true);
	});

	it('isOddType returns false for even integer', () => {
		expect(isOddType(parseLatex('4'))).toBe(false);
	});

	it('isEvenType with variable assumption', () => {
		const ctx = ctxWithAssumptions({ n: { parity: 'even' } }, { n: 'integer' });
		expect(isEvenType(variable('n'), ctx)).toBe(true);
		expect(isOddType(variable('n'), ctx)).toBe(false);
	});

	it('isOddType with variable assumption', () => {
		const ctx = ctxWithAssumptions({ n: { parity: 'odd' } }, { n: 'integer' });
		expect(isOddType(variable('n'), ctx)).toBe(true);
		expect(isEvenType(variable('n'), ctx)).toBe(false);
	});

	it('returns false for non-integer types', () => {
		expect(isEvenType(parseLatex('3.14'))).toBe(false);
		expect(isOddType(parseLatex('3.14'))).toBe(false);
	});
});
