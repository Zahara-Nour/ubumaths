/**
 * Tests for `extractPiecewiseBoundaries`.
 */

import { describe, it, expect } from 'vitest';
import { extractPiecewiseBoundaries } from '../boundaries';
import {
	piecewise,
	piecewisePiece,
	relation,
	logicalAnd,
	number,
	variable,
	opposite
} from '../../factory';

const x = variable('x');

describe('extractPiecewiseBoundaries — single comparison', () => {
	it('extracts boundary from `x < 0` (upper, open)', () => {
		const node = piecewise([piecewisePiece(relation('<', x, number('0')), number('1'))]);
		const bounds = extractPiecewiseBoundaries(node);
		// The branch valid for x < 0 has an upper bound at 0 (open).
		// At boundary x=0 the LEFT side (x slightly < 0) IS in this branch but
		// the boundary itself is excluded → leftClosed = false.
		expect(bounds).toEqual([{ x: 0, leftClosed: false, rightClosed: false }]);
	});

	it('extracts boundary from `x <= 0` (upper, closed)', () => {
		const node = piecewise([piecewisePiece(relation('<=', x, number('0')), number('1'))]);
		const bounds = extractPiecewiseBoundaries(node);
		expect(bounds).toEqual([{ x: 0, leftClosed: true, rightClosed: false }]);
	});

	it('extracts boundary from `x > 0` (lower, open)', () => {
		const node = piecewise([piecewisePiece(relation('>', x, number('0')), number('1'))]);
		const bounds = extractPiecewiseBoundaries(node);
		expect(bounds).toEqual([{ x: 0, leftClosed: false, rightClosed: false }]);
	});

	it('extracts boundary from `x >= 0` (lower, closed)', () => {
		const node = piecewise([piecewisePiece(relation('>=', x, number('0')), number('1'))]);
		const bounds = extractPiecewiseBoundaries(node);
		expect(bounds).toEqual([{ x: 0, leftClosed: false, rightClosed: true }]);
	});
});

describe('extractPiecewiseBoundaries — sign function', () => {
	it('produces boundary at 0 with both sides open', () => {
		// { -1 si x < 0, 1 si x > 0 }
		const node = piecewise([
			piecewisePiece(relation('<', x, number('0')), opposite(number('1'))),
			piecewisePiece(relation('>', x, number('0')), number('1'))
		]);
		const bounds = extractPiecewiseBoundaries(node);
		expect(bounds).toHaveLength(1);
		expect(bounds[0]).toEqual({ x: 0, leftClosed: false, rightClosed: false });
	});
});

describe('extractPiecewiseBoundaries — absolute value', () => {
	it('produces boundary at 0 with right side closed', () => {
		// { -x si x < 0, x si x >= 0 }
		const node = piecewise([
			piecewisePiece(relation('<', x, number('0')), opposite(x)),
			piecewisePiece(relation('>=', x, number('0')), x)
		]);
		const bounds = extractPiecewiseBoundaries(node);
		expect(bounds).toEqual([{ x: 0, leftClosed: false, rightClosed: true }]);
	});
});

describe('extractPiecewiseBoundaries — relation chains', () => {
	it('extracts both ends from `0 < x < 5`', () => {
		// `0 < x < 5` parses as relation('<', relation('<', 0, x), 5)
		const chain = relation('<', relation('<', number('0'), x), number('5'));
		const node = piecewise([piecewisePiece(chain, number('1'))]);
		const bounds = extractPiecewiseBoundaries(node);
		expect(bounds).toHaveLength(2);
		expect(bounds[0]).toEqual({ x: 0, leftClosed: false, rightClosed: false });
		expect(bounds[1]).toEqual({ x: 5, leftClosed: false, rightClosed: false });
	});

	it('extracts bounds from `0 <= x <= 5`', () => {
		const chain = relation('<=', relation('<=', number('0'), x), number('5'));
		const node = piecewise([piecewisePiece(chain, number('1'))]);
		const bounds = extractPiecewiseBoundaries(node);
		expect(bounds).toEqual([
			{ x: 0, leftClosed: false, rightClosed: true },
			{ x: 5, leftClosed: true, rightClosed: false }
		]);
	});
});

describe('extractPiecewiseBoundaries — logical and', () => {
	it('extracts both bounds from `x > 0 and x < 5`', () => {
		const cond = logicalAnd(relation('>', x, number('0')), relation('<', x, number('5')));
		const node = piecewise([piecewisePiece(cond, number('1'))]);
		const bounds = extractPiecewiseBoundaries(node);
		expect(bounds).toEqual([
			{ x: 0, leftClosed: false, rightClosed: false },
			{ x: 5, leftClosed: false, rightClosed: false }
		]);
	});
});

describe('extractPiecewiseBoundaries — step function', () => {
	it('extracts both step boundaries', () => {
		// { -1 si x < -1, 0 si -1 <= x <= 1, 1 si x > 1 }
		const node = piecewise([
			piecewisePiece(relation('<', x, opposite(number('1'))), opposite(number('1'))),
			piecewisePiece(
				relation('<=', relation('<=', opposite(number('1')), x), number('1')),
				number('0')
			),
			piecewisePiece(relation('>', x, number('1')), number('1'))
		]);
		const bounds = extractPiecewiseBoundaries(node);
		expect(bounds).toHaveLength(2);
		// At x=-1: left branch (x<-1) excludes, middle branch (x>=-1) includes
		expect(bounds[0]).toEqual({ x: -1, leftClosed: false, rightClosed: true });
		// At x=1: middle branch (x<=1) includes, right branch (x>1) excludes
		expect(bounds[1]).toEqual({ x: 1, leftClosed: true, rightClosed: false });
	});
});

describe('extractPiecewiseBoundaries — non-piecewise input', () => {
	it('returns empty array for non-piecewise nodes', () => {
		expect(extractPiecewiseBoundaries(number('5'))).toEqual([]);
		expect(extractPiecewiseBoundaries(x)).toEqual([]);
	});
});

describe('extractPiecewiseBoundaries — symbolic bounds via bindings', () => {
	it('skips variable bounds without bindings', () => {
		const a = variable('a');
		const node = piecewise([piecewisePiece(relation('<', x, a), number('1'))]);
		expect(extractPiecewiseBoundaries(node)).toEqual([]);
	});

	it('resolves variable bounds when bindings are provided', () => {
		const a = variable('a');
		const node = piecewise([
			piecewisePiece(relation('<', x, a), opposite(x)),
			piecewisePiece(relation('>=', x, a), x)
		]);
		const bounds = extractPiecewiseBoundaries(node, { a: 2 });
		expect(bounds).toEqual([{ x: 2, leftClosed: false, rightClosed: true }]);
	});

	it('resolves negated variable bounds (-a)', () => {
		const a = variable('a');
		const node = piecewise([
			piecewisePiece(relation('<', x, opposite(a)), opposite(number('1'))),
			piecewisePiece(relation('>=', x, opposite(a)), number('1'))
		]);
		const bounds = extractPiecewiseBoundaries(node, { a: 3 });
		expect(bounds).toEqual([{ x: -3, leftClosed: false, rightClosed: true }]);
	});

	it('does not resolve compound expressions (2*a not yet supported)', () => {
		// Out-of-scope: `x < 2*a` would require evaluating a multiplication.
		// Verify it falls back gracefully (returns no bounds).
		const a = variable('a');
		const twoA = {
			type: 'multiplication',
			left: number('2'),
			right: a,
			displayStyle: 'implicit' as const
		};
		const node = piecewise([piecewisePiece(relation('<', x, twoA as never), number('1'))]);
		expect(extractPiecewiseBoundaries(node, { a: 2 })).toEqual([]);
	});
});
