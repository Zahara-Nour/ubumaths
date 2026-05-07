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

describe('generatePedagogicalDomainSteps — V1.1.a rules', () => {
	it('emits tan_constraint for tan(x) at lycée', () => {
		const expr = parseLatex('\\tan(x)');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' });
		expect(result.steps).toHaveLength(1);
		expect(result.steps[0].rule).toBe('tan_constraint');
	});

	// `arccosh` is unknown to the LaTeX parser but recognised by the algebra
	// engine, so we hand-build the MathNode directly for these tests rather
	// than parsing.
	const arccoshExpr = {
		type: 'function' as const,
		name: 'arccosh',
		args: [{ type: 'variable' as const, name: 'x' }]
	};

	it('refuses arccosh(x) at lycée (out of syllabus)', () => {
		expect(() => generatePedagogicalDomainSteps(arccoshExpr, { schoolLevel: 'lycee' })).toThrow(
			PedagogicalDomainNotImplemented
		);
	});

	it('accepts arccosh(x) at supérieur', () => {
		expect(() =>
			generatePedagogicalDomainSteps(arccoshExpr, { schoolLevel: 'superieur' })
		).not.toThrow();
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
