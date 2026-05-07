/**
 * Tests for the LaTeX-string dispatcher.
 *
 * Validates expression parsing, approach parsing (with infinity special
 * cases), and the wiring through to the typed pipeline.
 */

import { describe, expect, it } from 'vitest';
import { dispatchPedagogicalLimit } from '../dispatch';
import { PedagogicalLimitNotImplemented } from '../types';

describe('dispatch — expression parsing', () => {
	it('routes (x^2-4)/(x-2) at x=2 through factorisation', () => {
		const result = dispatchPedagogicalLimit({
			expression: '(x^2-4)/(x-2)',
			approach: '2',
			schoolLevel: 'lycee'
		});

		expect(result.status).toBe('exact');
		expect(result.value).toMatchObject({ type: 'number', value: '4' });
	});

	it('routes x^2 + 2x at x=3 through direct substitution', () => {
		const result = dispatchPedagogicalLimit({
			expression: 'x^2 + 2x',
			approach: '3',
			schoolLevel: 'lycee'
		});

		expect(result.status).toBe('exact');
		expect(result.value).toMatchObject({ type: 'number', value: '15' });
	});

	it('throws on unparsable expression', () => {
		expect(() =>
			dispatchPedagogicalLimit({
				expression: '(((',
				approach: '0',
				schoolLevel: 'lycee'
			})
		).toThrow(PedagogicalLimitNotImplemented);
	});

	it('throws on empty expression', () => {
		expect(() =>
			dispatchPedagogicalLimit({
				expression: '   ',
				approach: '0',
				schoolLevel: 'lycee'
			})
		).toThrow(/empty expression/);
	});
});

describe('dispatch — approach parsing', () => {
	it('parses \\infty as +∞', () => {
		const result = dispatchPedagogicalLimit({
			expression: '(3*x^2-x)/(x^2+1)',
			approach: '\\infty',
			schoolLevel: 'lycee'
		});
		expect(result.status).toBe('exact');
		expect(result.value).toMatchObject({ type: 'number', value: '3' });
	});

	it('parses +\\infty as +∞', () => {
		const result = dispatchPedagogicalLimit({
			expression: '(x^2)/(x+1)',
			approach: '+\\infty',
			schoolLevel: 'lycee'
		});
		expect(result.status).toBe('infinite');
		expect(result.value).toMatchObject({ type: 'infinity', sign: 'positive' });
	});

	it('parses -\\infty as −∞', () => {
		const result = dispatchPedagogicalLimit({
			expression: '(x^3)/(x+1)',
			approach: '-\\infty',
			schoolLevel: 'lycee'
		});
		expect(result.status).toBe('infinite');
	});

	it('parses oo / +oo / -oo (custom convention) as ±∞', () => {
		const r1 = dispatchPedagogicalLimit({
			expression: '(3*x^2-x)/(x^2+1)',
			approach: 'oo',
			schoolLevel: 'lycee'
		});
		expect(r1.value).toMatchObject({ type: 'number', value: '3' });

		const r2 = dispatchPedagogicalLimit({
			expression: '(3*x^2-x)/(x^2+1)',
			approach: '+oo',
			schoolLevel: 'lycee'
		});
		expect(r2.value).toMatchObject({ type: 'number', value: '3' });
	});

	it('parses a numeric approach', () => {
		const result = dispatchPedagogicalLimit({
			expression: 'x^2',
			approach: '5',
			schoolLevel: 'lycee'
		});
		expect(result.status).toBe('exact');
		expect(result.value).toMatchObject({ type: 'number', value: '25' });
	});

	it('throws on empty approach', () => {
		expect(() =>
			dispatchPedagogicalLimit({
				expression: 'x^2',
				approach: '',
				schoolLevel: 'lycee'
			})
		).toThrow(/empty approach/);
	});
});

describe('dispatch — variable + direction defaults', () => {
	it('defaults variable to "x"', () => {
		const result = dispatchPedagogicalLimit({
			expression: 'x + 1',
			approach: '2',
			schoolLevel: 'lycee'
		});
		expect(result.variable).toBe('x');
		expect(result.value).toMatchObject({ type: 'number', value: '3' });
	});

	it('honours an explicit variable name', () => {
		const result = dispatchPedagogicalLimit({
			expression: 'n^2',
			variable: 'n',
			approach: '3',
			schoolLevel: 'lycee'
		});
		expect(result.variable).toBe('n');
	});

	it('defaults direction to "both"', () => {
		const result = dispatchPedagogicalLimit({
			expression: 'x',
			approach: '0',
			schoolLevel: 'lycee'
		});
		expect(result.direction).toBe('both');
	});

	it('propagates an explicit "right" direction', () => {
		const result = dispatchPedagogicalLimit({
			expression: 'x',
			approach: '0',
			direction: 'right',
			schoolLevel: 'lycee'
		});
		expect(result.direction).toBe('right');
	});
});

describe('dispatch — verbosity propagation', () => {
	it('accepts an explicit "summarized" verbosity (currently no-op, anchored for Phase 3)', () => {
		// `verbosity` is wired through the dispatcher API and is observed by the
		// renderer (Phase 3). The pipeline itself currently emits all steps and
		// the renderer is expected to filter per `step.verbosityLevel`. This
		// test simply asserts that passing `verbosity` does not throw and the
		// status stays consistent.
		const result = dispatchPedagogicalLimit({
			expression: 'x + 1',
			approach: '2',
			schoolLevel: 'lycee',
			verbosity: 'summarized'
		});
		expect(result.status).toBe('exact');
	});

	it('accepts an explicit "detailed" verbosity', () => {
		const result = dispatchPedagogicalLimit({
			expression: 'x + 1',
			approach: '2',
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});
		expect(result.status).toBe('exact');
	});
});

describe('dispatch — refusals', () => {
	it('forwards primaire/college throws', () => {
		expect(() =>
			dispatchPedagogicalLimit({
				expression: 'x',
				approach: '0',
				schoolLevel: 'primaire'
			})
		).toThrow(PedagogicalLimitNotImplemented);
	});
});
