/**
 * Compute.ts pedagogical instrumentation — V1 MVP.
 *
 * Validates that `computeDomain(expr, 'x', { showSteps: true, recorder })`
 * emits `EnhancedDomainStep[]` for each of the 5 MVP rules + intersection
 * for composite cases.
 *
 * Critical regression check: legacy callers (no `showSteps`) must observe
 * EXACTLY the same `domain` output as before. Domain values are never
 * affected by the instrumentation (it is pure addition).
 */

import { describe, expect, it } from 'vitest';
import { parseLatex } from '$lib/mathAST/parser';
import { parseCustomSafe } from '$lib/mathAST/parser/custom';
import { computeDomain, createDomainStepRecorder, getNullRecorder } from '$lib/mathAST/domain';

describe('compute.ts instrumentation — sqrt_constraint', () => {
	it('emits a sqrt_constraint step for √(x-2)', () => {
		const expr = parseLatex('\\sqrt{x - 2}');
		const recorder = createDomainStepRecorder();
		computeDomain(expr, 'x', { showSteps: true, recorder });
		const steps = recorder.getSteps();
		expect(steps).toHaveLength(1);
		expect(steps[0].rule).toBe('sqrt_constraint');
		expect(steps[0].constraint).toContain('\\geq 0');
	});

	it('captures intermediateDomain on the sqrt step', () => {
		const expr = parseLatex('\\sqrt{x - 2}');
		const recorder = createDomainStepRecorder();
		computeDomain(expr, 'x', { showSteps: true, recorder });
		const steps = recorder.getSteps();
		expect(steps[0].intermediateDomain).toBeDefined();
		expect(steps[0].intermediateDomain?.kind).toBe('interval_set');
	});

	it('records the argument expression in LaTeX', () => {
		const expr = parseLatex('\\sqrt{2x + 3}');
		const recorder = createDomainStepRecorder();
		computeDomain(expr, 'x', { showSteps: true, recorder });
		const steps = recorder.getSteps();
		expect(steps[0].expression).toMatch(/2.*x.*\+.*3|2x \+ 3/);
	});

	it('emits a reasoning string from the template', () => {
		const expr = parseLatex('\\sqrt{x - 2}');
		const recorder = createDomainStepRecorder();
		computeDomain(expr, 'x', { showSteps: true, recorder });
		const steps = recorder.getSteps();
		expect(steps[0].reasoning).toContain('définie');
		expect(steps[0].reasoning).toContain('≥ 0');
	});
});

describe('compute.ts instrumentation — ln_constraint / log_constraint', () => {
	it('emits ln_constraint for ln(x-1)', () => {
		const expr = parseLatex('\\ln(x - 1)');
		const recorder = createDomainStepRecorder();
		computeDomain(expr, 'x', { showSteps: true, recorder });
		const steps = recorder.getSteps();
		expect(steps).toHaveLength(1);
		expect(steps[0].rule).toBe('ln_constraint');
		expect(steps[0].constraint).toContain('> 0');
	});

	it('emits log_constraint for log(2x+1)', () => {
		const expr = parseLatex('\\log(2x + 1)');
		const recorder = createDomainStepRecorder();
		computeDomain(expr, 'x', { showSteps: true, recorder });
		const steps = recorder.getSteps();
		expect(steps).toHaveLength(1);
		expect(steps[0].rule).toBe('log_constraint');
	});
});

describe('compute.ts instrumentation — division_constraint', () => {
	it('emits division_constraint for 1/x', () => {
		const expr = parseLatex('\\dfrac{1}{x}');
		const recorder = createDomainStepRecorder();
		computeDomain(expr, 'x', { showSteps: true, recorder });
		const steps = recorder.getSteps();
		expect(steps).toHaveLength(1);
		expect(steps[0].rule).toBe('division_constraint');
		expect(steps[0].constraint).toContain('\\neq 0');
	});

	it('emits division_constraint for 1/(x-2) with denominator LaTeX', () => {
		const expr = parseLatex('\\dfrac{1}{x - 2}');
		const recorder = createDomainStepRecorder();
		computeDomain(expr, 'x', { showSteps: true, recorder });
		const steps = recorder.getSteps();
		expect(steps).toHaveLength(1);
		expect(steps[0].rule).toBe('division_constraint');
		expect(steps[0].expression).toMatch(/x.*-.*2|x - 2/);
	});

	it('does NOT emit division_constraint for x/(x²+1) (no real zeros)', () => {
		const expr = parseLatex('\\dfrac{x}{x^2 + 1}');
		const recorder = createDomainStepRecorder();
		computeDomain(expr, 'x', { showSteps: true, recorder });
		const steps = recorder.getSteps();
		expect(steps).toHaveLength(0);
	});
});

describe('compute.ts instrumentation — arcsin_constraint / arccos_constraint', () => {
	it('emits arcsin_constraint for arcsin(x)', () => {
		const expr = parseLatex('\\arcsin(x)');
		const recorder = createDomainStepRecorder();
		computeDomain(expr, 'x', { showSteps: true, recorder });
		const steps = recorder.getSteps();
		expect(steps).toHaveLength(1);
		expect(steps[0].rule).toBe('arcsin_constraint');
		expect(steps[0].constraint).toMatch(/-1.*\\leq.*\\leq.*1/);
	});

	it('emits arccos_constraint for arccos(x/2)', () => {
		const expr = parseLatex('\\arccos\\left(\\dfrac{x}{2}\\right)');
		const recorder = createDomainStepRecorder();
		computeDomain(expr, 'x', { showSteps: true, recorder });
		const steps = recorder.getSteps();
		expect(steps).toHaveLength(1);
		expect(steps[0].rule).toBe('arccos_constraint');
	});
});

describe('compute.ts instrumentation — composite cases (intersection)', () => {
	it('emits sqrt + division + intersection for √x/(x-1)', () => {
		const expr = parseLatex('\\dfrac{\\sqrt{x}}{x - 1}');
		const recorder = createDomainStepRecorder();
		computeDomain(expr, 'x', { showSteps: true, recorder });
		const steps = recorder.getSteps();
		const rules = steps.map((s) => s.rule);
		expect(rules).toContain('sqrt_constraint');
		expect(rules).toContain('division_constraint');
		expect(rules).toContain('intersection');
	});

	it('intersection step carries the final domain as intermediateDomain', () => {
		const expr = parseLatex('\\dfrac{\\sqrt{x}}{x - 1}');
		const recorder = createDomainStepRecorder();
		computeDomain(expr, 'x', { showSteps: true, recorder });
		const intersection = recorder.getSteps().find((s) => s.rule === 'intersection');
		expect(intersection).toBeDefined();
		expect(intersection?.intermediateDomain).toBeDefined();
		expect(intersection?.intermediateDomain?.kind).toBe('interval_set');
	});

	it('does NOT emit intersection for a single-constraint case', () => {
		const expr = parseLatex('\\sqrt{x - 2}');
		const recorder = createDomainStepRecorder();
		computeDomain(expr, 'x', { showSteps: true, recorder });
		const intersection = recorder.getSteps().find((s) => s.rule === 'intersection');
		expect(intersection).toBeUndefined();
	});
});

describe('compute.ts instrumentation — V1.1 rules', () => {
	it('emits tan_constraint for tan(x)', () => {
		const expr = parseLatex('\\tan(x)');
		const recorder = createDomainStepRecorder();
		computeDomain(expr, 'x', { showSteps: true, recorder });
		const steps = recorder.getSteps();
		expect(steps).toHaveLength(1);
		expect(steps[0].rule).toBe('tan_constraint');
		expect(steps[0].constraint).toContain('\\dfrac{\\pi}{2}');
	});

	it('emits cot_constraint for cot(x)', () => {
		const expr = parseLatex('\\cot(x)');
		const recorder = createDomainStepRecorder();
		computeDomain(expr, 'x', { showSteps: true, recorder });
		const steps = recorder.getSteps();
		expect(steps[0].rule).toBe('cot_constraint');
	});

	it('emits arccosh_constraint for arccosh(x)', () => {
		const parsed = parseCustomSafe('arccosh(x)');
		expect(parsed.ast).toBeTruthy();
		const recorder = createDomainStepRecorder();
		computeDomain(parsed.ast!, 'x', { showSteps: true, recorder });
		const steps = recorder.getSteps();
		const arccoshSteps = steps.filter((s) => s.rule === 'arccosh_constraint');
		expect(arccoshSteps.length).toBeGreaterThan(0);
		expect(arccoshSteps[0].constraint).toContain('\\geq 1');
	});

	it('emits arctanh_constraint for arctanh(x)', () => {
		const parsed = parseCustomSafe('arctanh(x)');
		expect(parsed.ast).toBeTruthy();
		const recorder = createDomainStepRecorder();
		computeDomain(parsed.ast!, 'x', { showSteps: true, recorder });
		const steps = recorder.getSteps();
		const arctanhSteps = steps.filter((s) => s.rule === 'arctanh_constraint');
		expect(arctanhSteps.length).toBeGreaterThan(0);
	});

	it('emits power_constraint for x^(-1)', () => {
		const expr = parseLatex('x^{-1}');
		const recorder = createDomainStepRecorder();
		computeDomain(expr, 'x', { showSteps: true, recorder });
		const steps = recorder.getSteps();
		const powerSteps = steps.filter((s) => s.rule === 'power_constraint');
		expect(powerSteps.length).toBeGreaterThan(0);
		expect(powerSteps[0].constraint).toContain('\\neq 0');
	});

	it('emits even_root_constraint for x^(1/2)', () => {
		const expr = parseLatex('x^{1/2}');
		const recorder = createDomainStepRecorder();
		computeDomain(expr, 'x', { showSteps: true, recorder });
		const steps = recorder.getSteps();
		const rootSteps = steps.filter((s) => s.rule === 'even_root_constraint');
		expect(rootSteps.length).toBeGreaterThan(0);
		expect(rootSteps[0].constraint).toContain('\\geq 0');
	});
});

describe('compute.ts instrumentation — backward compatibility', () => {
	it('returns the same domain whether showSteps is true or false', () => {
		const expr = parseLatex('\\sqrt{x - 2}');
		const withSteps = computeDomain(expr, 'x', { showSteps: true });
		const withoutSteps = computeDomain(expr, 'x', { showSteps: false });
		expect(withSteps.domain.kind).toBe(withoutSteps.domain.kind);
	});

	it('does not populate the legacy steps[] field even with showSteps:true', () => {
		const expr = parseLatex('\\sqrt{x - 2}');
		const result = computeDomain(expr, 'x', { showSteps: true });
		// Legacy DomainStep[] is still empty — nothing pushes to it. The
		// EnhancedDomainStep[] live in the recorder, not in result.steps.
		expect(result.steps).toBeUndefined();
	});

	it('does not call the recorder when showSteps is false', () => {
		const expr = parseLatex('\\sqrt{x - 2}');
		const recorder = createDomainStepRecorder();
		computeDomain(expr, 'x', { showSteps: false, recorder });
		expect(recorder.getSteps()).toHaveLength(0);
	});

	it('falls back to NullRecorder when showSteps:true and no recorder provided', () => {
		const expr = parseLatex('\\sqrt{x - 2}');
		// Should not throw, should return a normal domain.
		const result = computeDomain(expr, 'x', { showSteps: true });
		expect(result.domain.kind).toBe('interval_set');
	});

	it('accepts a NullRecorder explicitly without crashing', () => {
		const expr = parseLatex('\\sqrt{x - 2}');
		const result = computeDomain(expr, 'x', {
			showSteps: true,
			recorder: getNullRecorder()
		});
		expect(result.domain.kind).toBe('interval_set');
	});
});
