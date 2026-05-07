/**
 * Pedagogical Domain — Dispatch tests.
 *
 * Validates the typed pipeline + the string-shaped dispatch (Mode B).
 */

import { describe, expect, it } from 'vitest';
import { parseLatex } from '$lib/mathAST/parser';
import {
	generatePedagogicalDomainSteps,
	dispatchPedagogicalDomain,
	PedagogicalDomainNotImplemented
} from '../index';

describe('generatePedagogicalDomainSteps — V1 MVP rules', () => {
	it('emits a sqrt_constraint step for √(x-2)', () => {
		const expr = parseLatex('\\sqrt{x - 2}');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' });
		expect(result.steps).toHaveLength(1);
		expect(result.steps[0].rule).toBe('sqrt_constraint');
	});

	it('emits a ln_constraint step for ln(x-1)', () => {
		const expr = parseLatex('\\ln(x - 1)');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' });
		expect(result.steps[0].rule).toBe('ln_constraint');
	});

	it('emits a division_constraint step for 1/x', () => {
		const expr = parseLatex('\\dfrac{1}{x}');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' });
		expect(result.steps[0].rule).toBe('division_constraint');
	});

	it('emits a chain (sqrt + division + intersection) for √x/(x-1)', () => {
		const expr = parseLatex('\\dfrac{\\sqrt{x}}{x - 1}');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' });
		const rules = result.steps.map((s) => s.rule);
		expect(rules).toEqual(['sqrt_constraint', 'division_constraint', 'intersection']);
	});
});

describe('generatePedagogicalDomainSteps — universal cases', () => {
	it('synthesizes a universal step for f(x) = x', () => {
		const expr = parseLatex('x');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' });
		expect(result.steps).toHaveLength(1);
		expect(result.steps[0].rule).toBe('universal');
	});

	it('synthesizes a universal step for f(x) = x²+1 (no constraint)', () => {
		const expr = parseLatex('x^2 + 1');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' });
		expect(result.steps[0].rule).toBe('universal');
	});
});

describe('generatePedagogicalDomainSteps — edge cases (V1 limitations)', () => {
	it('treats tan(x) as universal (V1 limitation, fixed in V1.1)', () => {
		// `tan(x)` returns a periodic_exclusion domain in `compute.ts`; the
		// recorder emits no step for `tan_constraint` in V1, so the dispatcher
		// does not throw (no out-of-MVP rule in the trace) and synthesizes a
		// `universal` step — incorrect for tan but consistent with the V1
		// contract « throw iff a non-MVP rule appears in the trace ».
		//
		// V1.1 will instrument `tan_constraint` directly and throw cleanly
		// (see `docs/wip/domain-renderer-progress.md` Limitations connues V1).
		const expr = parseLatex('\\tan(x)');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' });
		expect(result.steps).toHaveLength(1);
		expect(result.steps[0].rule).toBe('universal');
	});
});

describe('generatePedagogicalDomainSteps — schoolLevel refusal', () => {
	it('throws PedagogicalDomainNotImplemented for primaire', () => {
		const expr = parseLatex('\\sqrt{x}');
		expect(() =>
			generatePedagogicalDomainSteps(expr, {
				schoolLevel: 'primaire' as never
			})
		).toThrow(PedagogicalDomainNotImplemented);
	});

	it('throws PedagogicalDomainNotImplemented for college', () => {
		const expr = parseLatex('\\sqrt{x}');
		expect(() =>
			generatePedagogicalDomainSteps(expr, {
				schoolLevel: 'college' as never
			})
		).toThrow(PedagogicalDomainNotImplemented);
	});

	it('accepts lycee', () => {
		const expr = parseLatex('\\sqrt{x}');
		expect(() => generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' })).not.toThrow();
	});

	it('accepts superieur', () => {
		const expr = parseLatex('\\sqrt{x}');
		expect(() => generatePedagogicalDomainSteps(expr, { schoolLevel: 'superieur' })).not.toThrow();
	});
});

describe('dispatchPedagogicalDomain (string entry point)', () => {
	it('parses LaTeX expression and runs pipeline', () => {
		const result = dispatchPedagogicalDomain({
			expression: '\\sqrt{x - 2}',
			schoolLevel: 'lycee'
		});
		expect(result.steps[0].rule).toBe('sqrt_constraint');
	});

	it('throws on empty expression', () => {
		expect(() => dispatchPedagogicalDomain({ expression: '', schoolLevel: 'lycee' })).toThrow(
			PedagogicalDomainNotImplemented
		);
	});

	it('throws on parse error', () => {
		expect(() =>
			dispatchPedagogicalDomain({
				expression: '\\sqrt{x +',
				schoolLevel: 'lycee'
			})
		).toThrow(PedagogicalDomainNotImplemented);
	});

	it('honours the variable option', () => {
		const result = dispatchPedagogicalDomain({
			expression: '\\sqrt{y - 1}',
			variable: 'y',
			schoolLevel: 'lycee'
		});
		expect(result.variable).toBe('y');
		expect(result.steps[0].rule).toBe('sqrt_constraint');
	});

	it('passes verbosity through', () => {
		const result = dispatchPedagogicalDomain({
			expression: '\\sqrt{x - 2}',
			schoolLevel: 'lycee',
			verbosity: 'summarized'
		});
		expect(result.steps).toHaveLength(1);
	});
});
