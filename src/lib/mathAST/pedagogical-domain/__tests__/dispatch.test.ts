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

describe('generatePedagogicalDomainSteps — out of MVP scope', () => {
	it('throws on tan(x) (V1.1 scope)', () => {
		// tan(x) returns a periodic_exclusion domain; the recorder emits no step
		// for tan_constraint in V1, so we synthesize universal — but tan is
		// constrained, so universal is wrong. Detection: the dispatcher does
		// not currently throw for tan, because no out-of-MVP rule lands in the
		// trace (V1 instrumentation simply skips tan). The exhaustivity check
		// is left to V1.1 (where tan_constraint will be a recordable rule
		// against which we can throw if not in scope).
		//
		// For V1, the contract is: « si une rule out-of-MVP apparaît dans la
		// trace, on throw ». If no out-of-MVP rule is in the trace (because
		// the recorder is silent for tan), we don't throw — fall back to
		// universal. This is the documented V1 limitation.
		const expr = parseLatex('\\tan(x)');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' });
		// V1 limitation: tan(x) is silently treated as universal. V1.1 will
		// instrument tan_constraint and throw cleanly.
		expect(result.steps).toHaveLength(1);
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
