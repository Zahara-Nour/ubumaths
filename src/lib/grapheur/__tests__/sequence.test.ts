/**
 * Tests for the numeric sequence engine (grapheur/sequence).
 *
 * Covers the Phase 0 spec in docs/wip/suites-grapheur-progress.md:
 * nominal cases N1-N5, edge cases L1-L6, error cases E1-E5.
 */

import { describe, it, expect } from 'vitest';
import {
	MAX_SEQUENCE_TERMS,
	PREV_TERM_VARIABLE,
	SEQUENCE_NAMES,
	computeCobwebPath,
	computeSequenceTerms,
	createRecurrenceFunctionEvaluator,
	nextSequenceName,
	parseSequence,
	sequenceValidationError
} from '$lib/grapheur/sequence';
import type { MathNode } from '$lib/mathAST/types';

// =============================================================================
// Helpers
// =============================================================================

/** Parse and assert success, returning the rewritten AST. */
function astOf(latex: string, mode: 'explicit' | 'recurrence', name = 'u'): MathNode {
	const result = parseSequence(latex, mode, name);
	expect(result.error).toBeNull();
	expect(result.ast).not.toBeNull();
	return result.ast as MathNode;
}

/** Extract the numeric values of computed terms. */
function valuesOf(terms: readonly { n: number; value: number }[]): number[] {
	return terms.map((t) => t.value);
}

// =============================================================================
// parseSequence
// =============================================================================

describe('parseSequence — explicit mode', () => {
	it('accepts an expression in n (N1)', () => {
		const result = parseSequence('3n+2', 'explicit', 'u');

		expect(result.success).toBe(true);
		expect(result.error).toBeNull();
		expect(result.usesIndex).toBe(true);
	});

	it('accepts a constant expression', () => {
		const result = parseSequence('5', 'explicit', 'u');

		expect(result.success).toBe(true);
		expect(result.usesIndex).toBe(false);
	});

	it('rejects a reference to the previous term (E5)', () => {
		const result = parseSequence('0.5u_n+3', 'explicit', 'u');

		expect(result.success).toBe(false);
		expect(result.ast).toBeNull();
		expect(result.error).toMatch(/récurrence/i);
	});

	it('rejects an unknown free variable, naming it (E2)', () => {
		const result = parseSequence('a n + 1', 'explicit', 'u');

		expect(result.success).toBe(false);
		expect(result.error).toContain('« a »');
	});

	it('rejects an empty expression (E4)', () => {
		const result = parseSequence('   ', 'explicit', 'u');

		expect(result.success).toBe(false);
		expect(result.error).not.toBeNull();
	});

	it('rejects a malformed expression (E4)', () => {
		const result = parseSequence('3n+', 'explicit', 'u');

		expect(result.success).toBe(false);
		expect(result.error).not.toBeNull();
	});
});

describe('parseSequence — recurrence mode', () => {
	it('accepts the previous term and reports no index dependency (N2)', () => {
		const result = parseSequence('0.5u_n+3', 'recurrence', 'u');

		expect(result.success).toBe(true);
		expect(result.error).toBeNull();
		expect(result.usesIndex).toBe(false);
	});

	it('accepts the previous term combined with the index', () => {
		const result = parseSequence('u_n+n', 'recurrence', 'u');

		expect(result.success).toBe(true);
		expect(result.usesIndex).toBe(true);
	});

	it('rewrites the subscript to a compilable variable', () => {
		const result = parseSequence('u_n', 'recurrence', 'u');
		const evaluate = createRecurrenceFunctionEvaluator(result.ast as MathNode);

		expect(evaluate(7)).toBe(7);
		expect(PREV_TERM_VARIABLE.length).toBeGreaterThan(0);
	});

	it('rejects another sequence name, naming it', () => {
		const result = parseSequence('v_n+1', 'recurrence', 'u');

		expect(result.success).toBe(false);
		expect(result.error).toContain('« v_n »');
	});

	it('rejects a shifted index such as u_{n-1}', () => {
		const result = parseSequence('u_{n-1}', 'recurrence', 'u');

		expect(result.success).toBe(false);
		expect(result.error).not.toBeNull();
	});

	it('rejects an unknown free variable, naming it (E2)', () => {
		const result = parseSequence('a u_n', 'recurrence', 'u');

		expect(result.success).toBe(false);
		expect(result.error).toContain('« a »');
	});

	it('respects a sequence named v', () => {
		const result = parseSequence('2v_n', 'recurrence', 'v');

		expect(result.success).toBe(true);
	});
});

// =============================================================================
// computeSequenceTerms — explicit
// =============================================================================

describe('computeSequenceTerms — explicit (N1, N3)', () => {
	it('computes u_n = 3n+2 from n0 = 0', () => {
		const terms = computeSequenceTerms(
			{ mode: 'explicit', ast: astOf('3n+2', 'explicit'), firstIndex: 0, firstTerm: null },
			4
		);

		expect(terms).toEqual([
			{ n: 0, value: 2 },
			{ n: 1, value: 5 },
			{ n: 2, value: 8 },
			{ n: 3, value: 11 },
			{ n: 4, value: 14 }
		]);
	});

	it('starts at n0 = 1 when asked (N3)', () => {
		const terms = computeSequenceTerms(
			{ mode: 'explicit', ast: astOf('3n+2', 'explicit'), firstIndex: 1, firstTerm: null },
			3
		);

		expect(terms.map((t) => t.n)).toEqual([1, 2, 3]);
		expect(valuesOf(terms)).toEqual([5, 8, 11]);
	});

	it('skips an undefined rank and keeps the following ones (L2, explicit)', () => {
		const terms = computeSequenceTerms(
			{
				mode: 'explicit',
				ast: astOf('\\frac{1}{n-2}', 'explicit'),
				firstIndex: 0,
				firstTerm: null
			},
			4
		);

		expect(terms.map((t) => t.n)).toEqual([0, 1, 3, 4]);
	});

	it('returns nothing when lastIndex is below firstIndex', () => {
		const terms = computeSequenceTerms(
			{ mode: 'explicit', ast: astOf('n', 'explicit'), firstIndex: 5, firstTerm: null },
			2
		);

		expect(terms).toEqual([]);
	});

	it('caps the number of terms (L6)', () => {
		const terms = computeSequenceTerms(
			{ mode: 'explicit', ast: astOf('n', 'explicit'), firstIndex: 0, firstTerm: null },
			10_000
		);

		expect(terms.length).toBe(MAX_SEQUENCE_TERMS);
	});

	it('keeps large values without erroring (L1)', () => {
		const terms = computeSequenceTerms(
			{ mode: 'explicit', ast: astOf('2^n', 'explicit'), firstIndex: 0, firstTerm: null },
			10
		);

		expect(valuesOf(terms)).toEqual([1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024]);
	});
});

// =============================================================================
// computeSequenceTerms — recurrence
// =============================================================================

describe('computeSequenceTerms — recurrence (N2)', () => {
	it('iterates u_{n+1} = 0.5u_n + 3 from u_0 = 8', () => {
		const terms = computeSequenceTerms(
			{ mode: 'recurrence', ast: astOf('0.5u_n+3', 'recurrence'), firstIndex: 0, firstTerm: 8 },
			3
		);

		expect(terms).toEqual([
			{ n: 0, value: 8 },
			{ n: 1, value: 7 },
			{ n: 2, value: 6.5 },
			{ n: 3, value: 6.25 }
		]);
	});

	it('binds the index to the rank of the term being consumed', () => {
		// u_0 = 0, u_{n+1} = u_n + n  ->  0, 0, 1, 3, 6
		const terms = computeSequenceTerms(
			{ mode: 'recurrence', ast: astOf('u_n+n', 'recurrence'), firstIndex: 0, firstTerm: 0 },
			4
		);

		expect(valuesOf(terms)).toEqual([0, 0, 1, 3, 6]);
	});

	it('honours a first index of 1', () => {
		const terms = computeSequenceTerms(
			{ mode: 'recurrence', ast: astOf('2u_n', 'recurrence'), firstIndex: 1, firstTerm: 3 },
			3
		);

		expect(terms).toEqual([
			{ n: 1, value: 3 },
			{ n: 2, value: 6 },
			{ n: 3, value: 12 }
		]);
	});

	it('stops at the first undefined term and keeps the previous ones (L2)', () => {
		// u_0 = 2, u_{n+1} = 1/(u_n - 1)  ->  2, 1, then 1/0 stops the iteration
		const terms = computeSequenceTerms(
			{
				mode: 'recurrence',
				ast: astOf('\\frac{1}{u_n-1}', 'recurrence'),
				firstIndex: 0,
				firstTerm: 2
			},
			6
		);

		expect(valuesOf(terms)).toEqual([2, 1]);
	});

	it('handles a constant sequence without looping (L5)', () => {
		const terms = computeSequenceTerms(
			{ mode: 'recurrence', ast: astOf('u_n', 'recurrence'), firstIndex: 0, firstTerm: 3 },
			4
		);

		expect(valuesOf(terms)).toEqual([3, 3, 3, 3, 3]);
	});

	it('caps the iteration count (E3)', () => {
		const terms = computeSequenceTerms(
			{ mode: 'recurrence', ast: astOf('u_n+1', 'recurrence'), firstIndex: 0, firstTerm: 0 },
			50_000
		);

		expect(terms.length).toBe(MAX_SEQUENCE_TERMS);
	});

	it('returns nothing without a first term (E1)', () => {
		const terms = computeSequenceTerms(
			{ mode: 'recurrence', ast: astOf('2u_n', 'recurrence'), firstIndex: 0, firstTerm: null },
			5
		);

		expect(terms).toEqual([]);
	});
});

// =============================================================================
// createRecurrenceFunctionEvaluator
// =============================================================================

describe('createRecurrenceFunctionEvaluator (N4)', () => {
	it('evaluates f as a function of the previous term', () => {
		const evaluate = createRecurrenceFunctionEvaluator(astOf('0.5u_n+3', 'recurrence'));

		expect(evaluate(4)).toBe(5);
		expect(evaluate(0)).toBe(3);
	});

	it('returns null outside the domain', () => {
		const evaluate = createRecurrenceFunctionEvaluator(astOf('\\frac{1}{u_n}', 'recurrence'));

		expect(evaluate(0)).toBeNull();
	});
});

// =============================================================================
// computeCobwebPath
// =============================================================================

describe('computeCobwebPath (N4, N5)', () => {
	it('builds the staircase polyline from the terms', () => {
		const terms = [
			{ n: 0, value: 8 },
			{ n: 1, value: 7 },
			{ n: 2, value: 6.5 }
		];

		expect(computeCobwebPath(terms)).toEqual([
			{ x: 8, y: 0 },
			{ x: 8, y: 7 },
			{ x: 7, y: 7 },
			{ x: 7, y: 6.5 },
			{ x: 6.5, y: 6.5 }
		]);
	});

	it('limits the polyline to the requested number of steps (N5)', () => {
		const terms = [
			{ n: 0, value: 8 },
			{ n: 1, value: 7 },
			{ n: 2, value: 6.5 },
			{ n: 3, value: 6.25 }
		];

		// 1 step = start point + one vertical + one horizontal
		expect(computeCobwebPath(terms, 1)).toEqual([
			{ x: 8, y: 0 },
			{ x: 8, y: 7 },
			{ x: 7, y: 7 }
		]);
	});

	it('returns a single anchor point for a lone term', () => {
		expect(computeCobwebPath([{ n: 0, value: 8 }])).toEqual([{ x: 8, y: 0 }]);
	});

	it('returns an empty path with no term', () => {
		expect(computeCobwebPath([])).toEqual([]);
	});

	it('degenerates without looping on a fixed point (L5)', () => {
		const terms = [
			{ n: 0, value: 3 },
			{ n: 1, value: 3 },
			{ n: 2, value: 3 }
		];

		expect(computeCobwebPath(terms)).toEqual([
			{ x: 3, y: 0 },
			{ x: 3, y: 3 },
			{ x: 3, y: 3 },
			{ x: 3, y: 3 },
			{ x: 3, y: 3 }
		]);
	});
});

// =============================================================================
// sequenceValidationError
// =============================================================================

describe('nextSequenceName', () => {
	it('starts at u', () => {
		expect(nextSequenceName([])).toBe('u');
	});

	it('skips the names already taken', () => {
		expect(nextSequenceName(['u'])).toBe('v');
		expect(nextSequenceName(['u', 'v'])).toBe('w');
		expect(nextSequenceName(['v'])).toBe('u');
	});

	it('falls back to the first name once the pool is exhausted', () => {
		expect(nextSequenceName([...SEQUENCE_NAMES])).toBe('u');
	});
});

describe('sequenceValidationError', () => {
	it('reports a missing first term in recurrence mode (E1)', () => {
		expect(sequenceValidationError('recurrence', null, null)).toMatch(/premier terme/i);
	});

	it('does not require a first term in explicit mode', () => {
		expect(sequenceValidationError('explicit', null, null)).toBeNull();
	});

	it('surfaces the parse error first', () => {
		expect(sequenceValidationError('recurrence', 'Expression invalide', null)).toBe(
			'Expression invalide'
		);
	});

	it('returns null when everything is valid', () => {
		expect(sequenceValidationError('recurrence', null, 8)).toBeNull();
	});
});
