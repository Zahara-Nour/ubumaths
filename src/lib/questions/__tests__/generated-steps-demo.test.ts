/**
 * Mode B end-to-end demos — snapshot tests
 *
 * Locks the rendered output of two demo templates through the full
 * `generateInstance() → generateCorrection() → RenderedStep[]` pipeline so
 * that any drift in the pedagogical-arithmetic or pedagogical-solve pipelines
 * surfaces immediately as a snapshot diff.
 *
 * @see fixtures/generated-steps-demo.ts
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../generator/instance-generator';
import {
	additionGroupingDemo,
	differentiateCompositionDemo,
	differentiatePolynomialDemo,
	linearEquationDemo,
	linearInequalityFlipDemo,
	linearInequalityTwoSidesDemo,
	quadraticEquationDemo,
	quadraticInequalityClassicDemo,
	quadraticInequalityNegativeADemo
} from './fixtures/generated-steps-demo';

/** Compact serializable view of a RenderedStep tree (no implementation noise). */
interface StepView {
	id: number;
	rule: string;
	title: string;
	schoolLevel?: string;
	hasExpressionLatex: boolean;
	hasExplanation: boolean;
	subSteps?: StepView[];
}

function summarize(step: {
	id: number;
	rule: string;
	title: string;
	schoolLevel?: string;
	expressionLatex?: string;
	explanation?: string;
	subSteps?: readonly {
		id: number;
		rule: string;
		title: string;
		schoolLevel?: string;
		expressionLatex?: string;
		explanation?: string;
		subSteps?: readonly never[];
	}[];
}): StepView {
	const view: StepView = {
		id: step.id,
		rule: step.rule,
		title: step.title,
		schoolLevel: step.schoolLevel,
		hasExpressionLatex: !!step.expressionLatex,
		hasExplanation: !!step.explanation
	};
	if (step.subSteps && step.subSteps.length > 0) {
		view.subSteps = step.subSteps.map((s) => summarize(s));
	}
	return view;
}

describe('Mode B end-to-end demos', () => {
	it('CM2 arithmetic — produces primaire steps with grouping', () => {
		const result = generateInstance(additionGroupingDemo, 1);
		expect(result.success).toBe(true);
		if (!result.success) return;

		const steps = result.instance.correction?._renderedSteps;
		expect(steps).toBeDefined();
		expect(steps!.length).toBeGreaterThan(0);

		// Every step must be tagged primaire (CM2 → primaire via auto-mapping).
		expect(steps!.every((s) => s.schoolLevel === 'primaire')).toBe(true);

		// Snapshot the structural summary — the actual LaTeX content is verified
		// by the underlying pedagogical-arithmetic pipeline tests.
		const summary = steps!.map(summarize);
		expect(summary).toMatchSnapshot();
	});

	it('CM2 arithmetic — feedback.correct preserved alongside generated steps', () => {
		const result = generateInstance(additionGroupingDemo, 1);
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.correction?.feedback?.correct).toBe('Excellent !');
	});

	it('4e linear equation — produces college steps', () => {
		const result = generateInstance(linearEquationDemo, 1);
		expect(result.success).toBe(true);
		if (!result.success) return;

		const steps = result.instance.correction?._renderedSteps;
		expect(steps).toBeDefined();
		expect(steps!.length).toBeGreaterThan(0);

		// Every step (including substeps) must be tagged college.
		const allSchoolLevels = (function collect(arr: typeof steps): string[] {
			const out: string[] = [];
			for (const s of arr ?? []) {
				if (s.schoolLevel) out.push(s.schoolLevel);
				if (s.subSteps) out.push(...collect(s.subSteps));
			}
			return out;
		})(steps);
		expect(allSchoolLevels.every((lvl) => lvl === 'college')).toBe(true);

		const summary = steps!.map(summarize);
		expect(summary).toMatchSnapshot();
	});

	it('4e linear equation — feedback.correct preserved', () => {
		const result = generateInstance(linearEquationDemo, 1);
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.correction?.feedback?.correct).toBe('Bravo !');
	});

	it('4e linear inequality with flip — produces college steps with flipOperator note', () => {
		const result = generateInstance(linearInequalityFlipDemo, 1);
		expect(result.success).toBe(true);
		if (!result.success) return;

		const steps = result.instance.correction?._renderedSteps;
		expect(steps).toBeDefined();
		expect(steps!.length).toBeGreaterThan(0);

		// At least one step's title contains the « changement de sens » note.
		const allTitles = (function collect(arr: typeof steps): string[] {
			const out: string[] = [];
			for (const s of arr ?? []) {
				out.push(s.title);
				if (s.subSteps) out.push(...collect(s.subSteps));
			}
			return out;
		})(steps);
		expect(allTitles.some((t) => /changement de sens/i.test(t))).toBe(true);

		const summary = steps!.map(summarize);
		expect(summary).toMatchSnapshot();
	});

	it('4e linear inequality with x on both sides — produces college steps', () => {
		const result = generateInstance(linearInequalityTwoSidesDemo, 1);
		expect(result.success).toBe(true);
		if (!result.success) return;

		const steps = result.instance.correction?._renderedSteps;
		expect(steps).toBeDefined();
		expect(steps!.length).toBeGreaterThan(0);

		const summary = steps!.map(summarize);
		expect(summary).toMatchSnapshot();
	});

	it('Mode B declaration is preserved on ResolvedCorrection', () => {
		const result = generateInstance(additionGroupingDemo, 1);
		expect(result.success).toBe(true);
		if (!result.success) return;

		const gs = result.instance.correction?.generatedSteps;
		expect(gs?.kind).toBe('arithmetic');
		if (gs?.kind === 'arithmetic') {
			// Template variables intentionally NOT resolved on the declaration.
			expect(gs.expression).toBe('{{a}}+{{b}}*{{c}}+{{d}}*{{e}}');
		}
	});

	it('1ère spécialité polynomial differentiation — produces lycee steps', () => {
		const result = generateInstance(differentiatePolynomialDemo, 1);
		expect(result.success).toBe(true);
		if (!result.success) return;

		const steps = result.instance.correction?._renderedSteps;
		expect(steps).toBeDefined();
		expect(steps!.length).toBeGreaterThan(0);

		const allSchoolLevels = (function collect(arr: typeof steps): string[] {
			const out: string[] = [];
			for (const s of arr ?? []) {
				if (s.schoolLevel) out.push(s.schoolLevel);
				if (s.subSteps) out.push(...collect(s.subSteps));
			}
			return out;
		})(steps);
		expect(allSchoolLevels.every((lvl) => lvl === 'lycee')).toBe(true);

		const summary = steps!.map(summarize);
		expect(summary).toMatchSnapshot();
	});

	it('Tle spécialité quadratic equation — produces lycee steps with discriminant', () => {
		const result = generateInstance(quadraticEquationDemo, 1);
		expect(result.success).toBe(true);
		if (!result.success) return;

		const steps = result.instance.correction?._renderedSteps;
		expect(steps).toBeDefined();
		expect(steps!.length).toBeGreaterThan(0);

		// Tle (lycée) → emit_discriminant_sign true → discriminant-positive present.
		const rules = steps!.map((s) => s.rule);
		expect(rules).toContain('compute-discriminant');
		expect(rules).toContain('discriminant-positive');
		expect(rules).toContain('apply-quadratic-formula');
		expect(rules).toContain('read-solutions');

		const allSchoolLevels = (function collect(arr: typeof steps): string[] {
			const out: string[] = [];
			for (const s of arr ?? []) {
				if (s.schoolLevel) out.push(s.schoolLevel);
				if (s.subSteps) out.push(...collect(s.subSteps));
			}
			return out;
		})(steps);
		expect(allSchoolLevels.every((lvl) => lvl === 'lycee')).toBe(true);

		const summary = steps!.map(summarize);
		expect(summary).toMatchSnapshot();
	});

	it('1ère spécialité quadratic inequality — produces lycee steps with sign table + conclusion', () => {
		const result = generateInstance(quadraticInequalityClassicDemo, 1);
		expect(result.success).toBe(true);
		if (!result.success) return;

		const steps = result.instance.correction?._renderedSteps;
		expect(steps).toBeDefined();
		expect(steps!.length).toBeGreaterThan(0);

		const rules = steps!.map((s) => s.rule);
		expect(rules).toContain('compute-discriminant');
		expect(rules).toContain('discriminant-positive');
		expect(rules).toContain('apply-quadratic-formula');
		expect(rules).toContain('quadratic-sign-table');
		expect(rules).toContain('inequality-conclude-quadratic');

		const allSchoolLevels = (function collect(arr: typeof steps): string[] {
			const out: string[] = [];
			for (const s of arr ?? []) {
				if (s.schoolLevel) out.push(s.schoolLevel);
				if (s.subSteps) out.push(...collect(s.subSteps));
			}
			return out;
		})(steps);
		expect(allSchoolLevels.every((lvl) => lvl === 'lycee')).toBe(true);

		const summary = steps!.map(summarize);
		expect(summary).toMatchSnapshot();
	});

	it('1ère spécialité quadratic inequality with a < 0 — produces lycee steps', () => {
		const result = generateInstance(quadraticInequalityNegativeADemo, 1);
		expect(result.success).toBe(true);
		if (!result.success) return;

		const steps = result.instance.correction?._renderedSteps;
		expect(steps).toBeDefined();
		expect(steps!.length).toBeGreaterThan(0);

		const rules = steps!.map((s) => s.rule);
		expect(rules).toContain('quadratic-sign-table');
		expect(rules).toContain('inequality-conclude-quadratic');

		const summary = steps!.map(summarize);
		expect(summary).toMatchSnapshot();
	});

	it('Terminale spécialité composition differentiation — produces sin + linear-coefficient sub-step', () => {
		const result = generateInstance(differentiateCompositionDemo, 1);
		expect(result.success).toBe(true);
		if (!result.success) return;

		const steps = result.instance.correction?._renderedSteps;
		expect(steps).toBeDefined();
		expect(steps!.length).toBeGreaterThan(0);
		expect(steps![0].rule).toBe('sin');
		expect(steps![0].subSteps).toBeDefined();
		expect(steps![0].subSteps!.length).toBeGreaterThan(0);
		expect(steps![0].subSteps![0].rule).toBe('linear-coefficient');

		const summary = steps!.map(summarize);
		expect(summary).toMatchSnapshot();
	});
});
