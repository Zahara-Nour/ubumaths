/**
 * Tests for the pedagogical limits renderer.
 *
 * Covers:
 * - Title lookup chain (level → lycée fallback → default).
 * - Explanation gating by verbosity.
 * - LaTeX formatting (`\lim_{...}` decoration, direction-aware sub/sup,
 *   blue highlight, sub-step short form for `factor-numerator` /
 *   `factor-denominator`).
 * - Subset filtering at `summarized` verbosity (drops `identify-limit` and
 *   `detect-indeterminate-form`).
 * - Recursion into `subSteps`.
 * - Vocabulary differences (`gendarmes` lycée vs `squeeze` sup) — checked
 *   by exercising `apply-squeeze` synthetic steps.
 */

import { describe, expect, it } from 'vitest';
import {
	add,
	divide as divideFactory,
	infinity,
	multiply,
	number,
	power,
	subtract,
	variable
} from '../../factory';
import type { MathNode } from '../../types';
import { generatePedagogicalLimitSteps } from '../pipeline';
import { PedagogicalLimitRenderer } from '../renderer';
import type { PedagogicalLimitStep } from '../types';

/** Test helper: default to fraction style so we don't sprinkle the 3rd arg. */
const divide = (n: MathNode, d: MathNode) => divideFactory(n, d, 'fraction');

const renderer = new PedagogicalLimitRenderer();

// =============================================================================
// Title lookup
// =============================================================================

describe('renderer — title lookup', () => {
	it('lycée: identify-limit produces a verbose French title', () => {
		const steps = generatePedagogicalLimitSteps(
			add(power(variable('x'), number('2')), variable('x')),
			{ variable: 'x', approach: number('3'), schoolLevel: 'lycee' }
		).steps;
		const rendered = renderer.renderAll(steps, { schoolLevel: 'lycee', verbosity: 'detailed' });
		const identify = rendered.find((s) => s.rule === 'identify-limit');
		expect(identify?.title).toMatch(/limite/i);
		expect(identify?.title).toMatch(/x.*tend/i);
		expect(identify?.title).toContain('3');
	});

	it('superieur: identify-limit uses LaTeX-shaped subscript', () => {
		// At sup, `includeIdentify === false`, so identify-limit isn't emitted
		// by the pipeline. We synthesise one to test the table directly.
		const synthetic: PedagogicalLimitStep = {
			id: 99,
			rule: 'identify-limit',
			description: '',
			before: variable('x'),
			after: variable('x'),
			variable: 'x',
			approach: number('3'),
			direction: 'both',
			verbosityLevel: 'detailed'
		};
		const r = renderer.render(synthetic, { schoolLevel: 'superieur', verbosity: 'detailed' });
		expect(r.title).toContain('\\lim_{x \\to 3}');
	});

	it('apply-known-limit propagates step.description into the title', () => {
		// `apply-known-limit` is the one rule whose title is the raw
		// `step.description` (which carries the FR `descriptionFr` from the
		// KnownLimitEntry). Anchor that delegation contract.
		const synthetic: PedagogicalLimitStep = {
			id: 1,
			rule: 'apply-known-limit',
			description: 'Limite connue : sin(x)/x → 1 quand x → 0',
			before: variable('x'),
			after: number('1'),
			variable: 'x',
			approach: number('0'),
			direction: 'both',
			verbosityLevel: 'summarized'
		};
		const r = renderer.render(synthetic, { schoolLevel: 'lycee', verbosity: 'summarized' });
		expect(r.title).toBe('Limite connue : sin(x)/x → 1 quand x → 0');

		// Same delegation at sup
		const r2 = renderer.render(synthetic, { schoolLevel: 'superieur', verbosity: 'summarized' });
		expect(r2.title).toBe('Limite connue : sin(x)/x → 1 quand x → 0');
	});

	it('falls back to step.description when no title is registered', () => {
		const synthetic: PedagogicalLimitStep = {
			id: 1,
			rule: 'compute-asymptotic-equivalent',
			description: 'Custom description',
			before: variable('x'),
			after: variable('x'),
			variable: 'x',
			approach: number('0'),
			direction: 'both',
			verbosityLevel: 'detailed'
		};
		// `compute-asymptotic-equivalent` has a lycée title — let's pick a rule
		// that doesn't to exercise the fallback. (None in V1.) Instead, we
		// override with an obviously synthetic rule via a cast :
		const noTitleSynthetic: PedagogicalLimitStep = {
			...synthetic,
			rule: 'never-registered-rule' as PedagogicalLimitStep['rule']
		};
		const r = renderer.render(noTitleSynthetic, { schoolLevel: 'lycee', verbosity: 'detailed' });
		expect(r.title).toBe('Custom description');
	});
});

// =============================================================================
// Explanation gating
// =============================================================================

describe('renderer — explanation gating', () => {
	it('emits explanation when verbosity = detailed', () => {
		const steps = generatePedagogicalLimitSteps(
			divide(
				subtract(power(variable('x'), number('2')), number('4')),
				subtract(variable('x'), number('2'))
			),
			{ variable: 'x', approach: number('2'), schoolLevel: 'lycee' }
		).steps;
		const rendered = renderer.renderAll(steps, { schoolLevel: 'lycee', verbosity: 'detailed' });
		const detect = rendered.find((s) => s.rule === 'detect-indeterminate-form');
		expect(detect?.explanation).toBeDefined();
		expect(detect?.explanation).toMatch(/0/);
	});

	it('omits explanation when verbosity = summarized', () => {
		const synthetic: PedagogicalLimitStep = {
			id: 1,
			rule: 'apply-direct-substitution',
			description: 'Substitution directe',
			before: variable('x'),
			after: number('2'),
			variable: 'x',
			approach: number('2'),
			direction: 'both',
			verbosityLevel: 'summarized'
		};
		const r = renderer.render(synthetic, { schoolLevel: 'lycee', verbosity: 'summarized' });
		expect(r.explanation).toBeUndefined();
	});
});

// =============================================================================
// LaTeX formatting
// =============================================================================

describe('renderer — LaTeX format', () => {
	it('includes \\lim_{x \\to a} in the LaTeX block', () => {
		const synthetic: PedagogicalLimitStep = {
			id: 1,
			rule: 'apply-direct-substitution',
			description: '',
			before: variable('x'),
			after: number('3'),
			variable: 'x',
			approach: number('3'),
			direction: 'both',
			verbosityLevel: 'summarized'
		};
		const r = renderer.render(synthetic, { schoolLevel: 'lycee', verbosity: 'summarized' });
		expect(r.expressionLatex).toContain('\\lim_{x \\to 3}');
		expect(r.expressionLatex).toContain('\\textcolor{blue}');
		expect(r.expressionLatex).toContain('\\begin{aligned}');
	});

	it('decorates direction = left as a^-', () => {
		const synthetic: PedagogicalLimitStep = {
			id: 1,
			rule: 'apply-direct-substitution',
			description: '',
			before: variable('x'),
			after: number('0'),
			variable: 'x',
			approach: number('0'),
			direction: 'left',
			verbosityLevel: 'summarized'
		};
		const r = renderer.render(synthetic, { schoolLevel: 'lycee', verbosity: 'summarized' });
		expect(r.expressionLatex).toContain('x \\to 0^-');
	});

	it('decorates direction = right as a^+', () => {
		const synthetic: PedagogicalLimitStep = {
			id: 1,
			rule: 'apply-direct-substitution',
			description: '',
			before: variable('x'),
			after: number('0'),
			variable: 'x',
			approach: number('0'),
			direction: 'right',
			verbosityLevel: 'summarized'
		};
		const r = renderer.render(synthetic, { schoolLevel: 'lycee', verbosity: 'summarized' });
		expect(r.expressionLatex).toContain('x \\to 0^+');
	});

	it('handles infinity in the limit subscript', () => {
		const synthetic: PedagogicalLimitStep = {
			id: 1,
			rule: 'identify-dominant-term',
			description: '',
			before: variable('x'),
			after: variable('x'),
			variable: 'x',
			approach: infinity('positive'),
			direction: 'both',
			verbosityLevel: 'summarized'
		};
		const r = renderer.render(synthetic, { schoolLevel: 'lycee', verbosity: 'summarized' });
		expect(r.expressionLatex).toContain('\\to');
		expect(r.expressionLatex).toContain('\\infty');
	});

	it('drops \\lim_{...} decoration on factor-numerator sub-steps', () => {
		const synthetic: PedagogicalLimitStep = {
			id: 1,
			rule: 'factor-numerator',
			description: '',
			before: subtract(power(variable('x'), number('2')), number('4')),
			after: multiply(
				subtract(variable('x'), number('2')),
				add(variable('x'), number('2')),
				'implicit'
			),
			variable: 'x',
			approach: number('2'),
			direction: 'both',
			verbosityLevel: 'detailed'
		};
		const r = renderer.render(synthetic, { schoolLevel: 'lycee', verbosity: 'detailed' });
		expect(r.expressionLatex).not.toContain('\\lim_{');
		expect(r.expressionLatex).toContain('\\textcolor{blue}');
	});
});

// =============================================================================
// Verbosity filtering
// =============================================================================

describe('renderer — verbosity filtering', () => {
	it('summarized drops identify-limit and detect-indeterminate-form top-level', () => {
		const steps = generatePedagogicalLimitSteps(
			divide(
				subtract(power(variable('x'), number('2')), number('4')),
				subtract(variable('x'), number('2'))
			),
			{ variable: 'x', approach: number('2'), schoolLevel: 'lycee' }
		).steps;
		const rendered = renderer.renderAll(steps, { schoolLevel: 'lycee', verbosity: 'summarized' });
		const rules = rendered.map((s) => s.rule);
		expect(rules).not.toContain('identify-limit');
		expect(rules).not.toContain('detect-indeterminate-form');
		expect(rules).toContain('simplify-common-factor');
	});

	it('detailed keeps all top-level steps', () => {
		const steps = generatePedagogicalLimitSteps(
			divide(
				subtract(power(variable('x'), number('2')), number('4')),
				subtract(variable('x'), number('2'))
			),
			{ variable: 'x', approach: number('2'), schoolLevel: 'lycee' }
		).steps;
		const rendered = renderer.renderAll(steps, { schoolLevel: 'lycee', verbosity: 'detailed' });
		const rules = rendered.map((s) => s.rule);
		expect(rules).toContain('identify-limit');
		expect(rules).toContain('detect-indeterminate-form');
	});
});

// =============================================================================
// Recursion
// =============================================================================

describe('renderer — recursion', () => {
	it('renders sub-steps unconditionally (regardless of top-level verbosity filter)', () => {
		const steps = generatePedagogicalLimitSteps(
			divide(
				subtract(power(variable('x'), number('2')), number('4')),
				subtract(variable('x'), number('2'))
			),
			{ variable: 'x', approach: number('2'), schoolLevel: 'lycee' }
		).steps;
		const rendered = renderer.renderAll(steps, { schoolLevel: 'lycee', verbosity: 'summarized' });
		const parent = rendered.find((s) => s.rule === 'simplify-common-factor');
		expect(parent?.subSteps).toBeDefined();
		expect(parent?.subSteps?.[0].rule).toBe('factor-numerator');
		expect(parent?.subSteps?.[1].rule).toBe('factor-denominator');
	});

	it('preserves sub-step IDs (no remapping)', () => {
		const steps = generatePedagogicalLimitSteps(
			divide(
				subtract(power(variable('x'), number('2')), number('4')),
				subtract(variable('x'), number('2'))
			),
			{ variable: 'x', approach: number('2'), schoolLevel: 'lycee' }
		).steps;
		const rendered = renderer.renderAll(steps, { schoolLevel: 'lycee', verbosity: 'detailed' });
		const parent = rendered.find((s) => s.rule === 'simplify-common-factor');
		expect(parent?.subSteps?.[0].id).toBe(2); // factor-numerator gets id 2
		expect(parent?.subSteps?.[1].id).toBe(3); // factor-denominator gets id 3
	});
});

// =============================================================================
// Vocabulary differences (lycée vs sup)
// =============================================================================

describe('renderer — vocabulary differences', () => {
	it('squeeze rule renders as « théorème des gendarmes » at lycée', () => {
		const synthetic: PedagogicalLimitStep = {
			id: 1,
			rule: 'apply-squeeze',
			description: '',
			before: variable('x'),
			after: number('0'),
			variable: 'x',
			approach: number('0'),
			direction: 'both',
			verbosityLevel: 'summarized'
		};
		const r = renderer.render(synthetic, { schoolLevel: 'lycee', verbosity: 'summarized' });
		expect(r.title.toLowerCase()).toContain('gendarmes');
	});

	it("squeeze rule renders as « théorème d'encadrement / squeeze » at sup", () => {
		const synthetic: PedagogicalLimitStep = {
			id: 1,
			rule: 'apply-squeeze',
			description: '',
			before: variable('x'),
			after: number('0'),
			variable: 'x',
			approach: number('0'),
			direction: 'both',
			verbosityLevel: 'summarized'
		};
		const r = renderer.render(synthetic, { schoolLevel: 'superieur', verbosity: 'summarized' });
		expect(r.title.toLowerCase()).toMatch(/squeeze|encadrement/);
		expect(r.title.toLowerCase()).not.toContain('gendarmes');
	});

	it('bumps primaire/college up to lycée vocabulary', () => {
		const synthetic: PedagogicalLimitStep = {
			id: 1,
			rule: 'apply-squeeze',
			description: '',
			before: variable('x'),
			after: number('0'),
			variable: 'x',
			approach: number('0'),
			direction: 'both',
			verbosityLevel: 'summarized'
		};
		const r = renderer.render(synthetic, {
			schoolLevel: 'primaire',
			verbosity: 'summarized'
		});
		// effective level becomes 'lycee'
		expect(r.title.toLowerCase()).toContain('gendarmes');
		expect(r.schoolLevel).toBe('lycee');
	});
});
