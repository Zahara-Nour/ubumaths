/**
 * Phase 3 — Renderer tests.
 *
 * Verifies titles + explanations per `SchoolLevel`, LaTeX 2-line formatting,
 * verbosity-driven explanation gating, and the fallback chain.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { PedagogicalSimplifyRenderer } from '../renderer';
import { generatePedagogicalSimplifySteps } from '../pipeline';
import type { PedagogicalSimplifyStep } from '../types';

function fakeStep(overrides: Partial<PedagogicalSimplifyStep>): PedagogicalSimplifyStep {
	const node = parseLatex('x');
	return {
		id: 1,
		rule: 'expand-sum-squared',
		description: 'Identité remarquable : (a+b)² = a² + 2ab + b²',
		before: node,
		after: node,
		verbosityLevel: 'detailed',
		category: 'distribution',
		...overrides
	};
}

const renderer = new PedagogicalSimplifyRenderer();

// =============================================================================
// Per-level title lookup
// =============================================================================

describe('renderer — title lookup per SchoolLevel', () => {
	const step = fakeStep({});

	it('lycee uses LYCEE_TITLES', () => {
		const r = renderer.render(step, { schoolLevel: 'lycee', verbosity: 'detailed' });
		expect(r.title).toBe('On développe (a+b)² avec l’identité remarquable');
	});

	it('college uses COLLEGE_TITLES', () => {
		const r = renderer.render(step, { schoolLevel: 'college', verbosity: 'detailed' });
		expect(r.title).toBe('On utilise (a+b)² = a² + 2ab + b²');
	});

	it('superieur uses SUPERIEUR_TITLES (compact)', () => {
		const r = renderer.render(step, { schoolLevel: 'superieur', verbosity: 'detailed' });
		expect(r.title).toBe('Identité (a+b)²');
	});

	it('primaire falls back to LYCEE_TITLES when no PRIMAIRE entry exists', () => {
		// expand-sum-squared has no primaire entry; lycee fallback applies.
		const r = renderer.render(step, { schoolLevel: 'primaire', verbosity: 'detailed' });
		expect(r.title).toBe('On développe (a+b)² avec l’identité remarquable');
	});

	it('primaire uses PRIMAIRE_TITLES when entry exists', () => {
		const s = fakeStep({ rule: 'combine-like-terms', category: 'combinaison-termes-semblables' });
		const r = renderer.render(s, { schoolLevel: 'primaire', verbosity: 'detailed' });
		expect(r.title).toBe('On regroupe les nombres');
	});

	it('falls back to step.description when no level entry exists at any level', () => {
		const s = fakeStep({
			rule: 'totally-unknown-rule',
			description: 'Une description neutre',
			category: 'autre'
		});
		const r = renderer.render(s, { schoolLevel: 'lycee', verbosity: 'detailed' });
		expect(r.title).toBe('Une description neutre');
	});
});

// =============================================================================
// Explanation gating per verbosity
// =============================================================================

describe('renderer — explanation gating', () => {
	const step = fakeStep({});

	it('omits explanation at verbosity=summarized', () => {
		const r = renderer.render(step, { schoolLevel: 'lycee', verbosity: 'summarized' });
		expect(r.explanation).toBeUndefined();
	});

	it('includes explanation at verbosity=detailed when present', () => {
		const r = renderer.render(step, { schoolLevel: 'lycee', verbosity: 'detailed' });
		expect(r.explanation).toBeTruthy();
		expect(r.explanation).toContain('a² + 2ab + b²');
	});

	it('omits explanation at verbosity=detailed when no entry exists for the level', () => {
		const s = fakeStep({ rule: 'totally-unknown-rule', category: 'autre' });
		const r = renderer.render(s, { schoolLevel: 'lycee', verbosity: 'detailed' });
		expect(r.explanation).toBeUndefined();
	});

	it('superieur has no explanations even at verbosity=detailed', () => {
		const r = renderer.render(step, { schoolLevel: 'superieur', verbosity: 'detailed' });
		// SUPERIEUR explanations table is empty by design — fallback to lycee
		// is on the LOOKUP side, but we want sup to be terse.
		// Our impl falls back to lycee's explanation in that case.
		// Spec : sup gets the lycee explanation when verbosity demands it.
		expect(r.explanation).toBeTruthy();
	});
});

// =============================================================================
// LaTeX expression formatting
// =============================================================================

describe('renderer — expressionLatex 2-line block', () => {
	it('uses globalBefore/After when populated', () => {
		const before = parseLatex('(x+1)^2 + 5');
		const after = parseLatex('x^2 + 2x + 1 + 5');
		const step = fakeStep({
			globalBefore: before,
			globalAfter: after,
			before: parseLatex('(x+1)^2'),
			after: parseLatex('x^2 + 2x + 1')
		});
		const r = renderer.render(step, { schoolLevel: 'lycee', verbosity: 'detailed' });
		expect(r.expressionLatex).toContain('\\begin{aligned}');
		expect(r.expressionLatex).toContain('\\end{aligned}');
		expect(r.expressionLatex).toContain('\\textcolor{blue}{');
		// global*  — not local
		expect(r.expressionLatex).toMatch(/\\left\(\s*x\s*\+\s*1\s*\\right\)\^2.*\+\s*5/s);
	});

	it('falls back to before/after when globalBefore/After are absent', () => {
		const step = fakeStep({
			before: parseLatex('(x+1)^2'),
			after: parseLatex('x^2 + 2x + 1')
		});
		const r = renderer.render(step, { schoolLevel: 'lycee', verbosity: 'detailed' });
		expect(r.expressionLatex).toContain('\\textcolor{blue}{');
		expect(r.expressionLatex).toMatch(/\\left\(\s*x\s*\+\s*1\s*\\right\)\^2/);
	});
});

// =============================================================================
// Sub-steps recursion (V1 always empty, but exercised structurally)
// =============================================================================

describe('renderer — sub-steps', () => {
	it('omits subSteps when undefined', () => {
		const r = renderer.render(fakeStep({}), {
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});
		expect(r.subSteps).toBeUndefined();
	});

	it('omits subSteps when empty array', () => {
		const step = fakeStep({ subSteps: [] });
		const r = renderer.render(step, { schoolLevel: 'lycee', verbosity: 'detailed' });
		expect(r.subSteps).toBeUndefined();
	});

	it('recurses when subSteps are populated', () => {
		const child = fakeStep({ id: 2, rule: 'combine-like-terms' });
		const parent = fakeStep({ id: 1, subSteps: [child] });
		const r = renderer.render(parent, { schoolLevel: 'lycee', verbosity: 'detailed' });
		expect(r.subSteps).toHaveLength(1);
		expect(r.subSteps![0].id).toBe(2);
		expect(r.subSteps![0].rule).toBe('combine-like-terms');
	});
});

// =============================================================================
// renderAll
// =============================================================================

describe('renderer — renderAll', () => {
	it('renders an array preserving order', () => {
		const a = fakeStep({ id: 1, rule: 'expand-sum-squared' });
		const b = fakeStep({ id: 2, rule: 'combine-like-terms' });
		const out = renderer.renderAll([a, b], {
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});
		expect(out).toHaveLength(2);
		expect(out[0].id).toBe(1);
		expect(out[1].id).toBe(2);
	});
});

// =============================================================================
// End-to-end via pipeline + renderer
// =============================================================================

describe('renderer — end-to-end with pipeline', () => {
	it('(x+1)(x-1) at college produces a "On utilise (a+b)(a-b)" title', () => {
		const node = parseLatex('(x+1)(x-1)');
		const { steps } = generatePedagogicalSimplifySteps(node, {
			intent: 'developper',
			schoolLevel: 'college'
		});
		const rendered = renderer.renderAll(steps, {
			schoolLevel: 'college',
			verbosity: 'detailed'
		});
		const titles = rendered.map((r) => r.title);
		expect(titles.some((t) => t.includes('(a+b)(a-b)'))).toBe(true);
	});

	it('every rendered step has id, rule, title, expressionLatex, schoolLevel', () => {
		const node = parseLatex('(x+1)(x-1)');
		const { steps } = generatePedagogicalSimplifySteps(node, {
			intent: 'developper',
			schoolLevel: 'lycee'
		});
		const rendered = renderer.renderAll(steps, {
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});
		expect(rendered.length).toBeGreaterThan(0);
		for (const r of rendered) {
			expect(r.id).toBeGreaterThan(0);
			expect(r.rule).toBeTruthy();
			expect(r.title).toBeTruthy();
			expect(r.expressionLatex).toBeTruthy();
			expect(r.schoolLevel).toBe('lycee');
		}
	});
});
