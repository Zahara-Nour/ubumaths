/**
 * Phase 2 — Pipeline integration tests.
 *
 * Covers `generatePedagogicalSimplifySteps` end-to-end on each intent and
 * each pedagogical category, plus V1-out-of-scope rejection and the abort
 * contract.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { generatePedagogicalSimplifySteps } from '../pipeline';
import { PedagogicalSimplifyNotImplemented } from '../types';

const tex = (n: Parameters<typeof toLatex>[0]) =>
	toLatex(n)
		.replace(/\\left([(|[])\s*/g, '$1')
		.replace(/\s*\\right([)|\]])/g, '$1')
		.replace(/\s+/g, '');

// =============================================================================
// developper — distribution
// =============================================================================

describe('pipeline — developper intent', () => {
	it('(x+1)(x-1) → x²-1 via product-to-diff-squares + normalize', () => {
		const node = parseLatex('(x+1)(x-1)');
		const { result, steps } = generatePedagogicalSimplifySteps(node, {
			intent: 'developper',
			schoolLevel: 'college'
		});
		expect(tex(result)).toBe('x^2-1');
		const ruleNames = steps.map((s) => s.rule);
		expect(ruleNames).toContain('product-to-diff-squares');
	});

	it('(x+1)² → x²+2x+1 via expand-sum-squared + normalize', () => {
		const node = parseLatex('(x+1)^2');
		const { result, steps } = generatePedagogicalSimplifySteps(node, {
			intent: 'developper',
			schoolLevel: 'college'
		});
		expect(tex(result)).toBe('x^2+2x+1');
		const ruleNames = steps.map((s) => s.rule);
		expect(ruleNames).toContain('expand-sum-squared');
	});

	it('(x-1)² → x²-2x+1 via expand-diff-squared', () => {
		const node = parseLatex('(x-1)^2');
		const { result, steps } = generatePedagogicalSimplifySteps(node, {
			intent: 'developper',
			schoolLevel: 'college'
		});
		expect(tex(result)).toBe('x^2-2x+1');
		expect(steps.map((s) => s.rule)).toContain('expand-diff-squared');
	});

	it('(2x+3)(x-1) → 2x²+x-3 via distribute-binomial-product + normalize', () => {
		const node = parseLatex('(2x+3)(x-1)');
		const { result, steps } = generatePedagogicalSimplifySteps(node, {
			intent: 'developper',
			schoolLevel: 'college'
		});
		expect(tex(result)).toBe('2x^2+x-3');
		expect(steps.map((s) => s.rule)).toContain('distribute-binomial-product');
	});

	it('developper produces at least one distribution-categorised step', () => {
		const node = parseLatex('(x+1)(x-1)');
		const { steps } = generatePedagogicalSimplifySteps(node, {
			intent: 'developper',
			schoolLevel: 'college'
		});
		const categories = steps.map((s) => s.category);
		expect(categories).toContain('distribution');
	});
});

// =============================================================================
// factoriser
// =============================================================================

describe('pipeline — factoriser intent', () => {
	it('x²-4 → (x+2)(x-2) via diff-squares-numeric, no normalize', () => {
		const node = parseLatex('x^2 - 4');
		const { result, steps } = generatePedagogicalSimplifySteps(node, {
			intent: 'factoriser',
			schoolLevel: 'college'
		});
		expect(tex(result)).toBe('(x+2)(x-2)');
		expect(steps.map((s) => s.rule)).toContain('diff-squares-numeric');
	});

	it('x²+2x+1 → (x+1)² via perfect-square-trinomial', () => {
		const node = parseLatex('x^2 + 2x + 1');
		const { result, steps } = generatePedagogicalSimplifySteps(node, {
			intent: 'factoriser',
			schoolLevel: 'college'
		});
		expect(tex(result)).toBe('(x+1)^2');
		expect(steps.map((s) => s.rule)).toContain('perfect-square-trinomial');
	});

	it('factoriser does NOT run normalize (would undo the factoring)', () => {
		const node = parseLatex('x^2 - 4');
		const { steps } = generatePedagogicalSimplifySteps(node, {
			intent: 'factoriser',
			schoolLevel: 'college'
		});
		// No normalize-side rule names should appear (combine-like-terms etc.)
		for (const s of steps) {
			expect(s.rule).not.toBe('combine-like-terms');
			expect(s.rule).not.toBe('simplify-fraction');
		}
	});
});

// =============================================================================
// reduire
// =============================================================================

describe('pipeline — reduire intent', () => {
	it('2x + 3x → 5x via combine-like-terms', () => {
		const node = parseLatex('2x + 3x');
		const { result, steps } = generatePedagogicalSimplifySteps(node, {
			intent: 'reduire',
			schoolLevel: 'lycee'
		});
		expect(tex(result)).toBe('5x');
		// combine-like-terms comes from the normalize bridge.
		expect(steps.map((s) => s.rule)).toContain('combine-like-terms');
	});

	it('6/8 → 3/4 via simplify-fraction', () => {
		const node = parseLatex('\\frac{6}{8}');
		const { result, steps } = generatePedagogicalSimplifySteps(node, {
			intent: 'reduire',
			schoolLevel: 'lycee'
		});
		expect(tex(result)).toBe('\\dfrac{3}{4}');
		expect(steps.length).toBeGreaterThan(0);
	});

	it('√8 → 2√2 (radical simplification)', () => {
		const node = parseLatex('\\sqrt{8}');
		const { result } = generatePedagogicalSimplifySteps(node, {
			intent: 'reduire',
			schoolLevel: 'lycee'
		});
		expect(tex(result)).toBe('2\\sqrt{2}');
	});

	it('sin²(x) + cos²(x) → 1 via pythagorean (lycee)', () => {
		const node = parseLatex('\\sin^2(x) + \\cos^2(x)');
		const { result } = generatePedagogicalSimplifySteps(node, {
			intent: 'reduire',
			schoolLevel: 'lycee'
		});
		expect(tex(result)).toBe('1');
	});

	it('|-x| → |x| (abs-negation)', () => {
		const node = parseLatex('|-x|');
		const { result } = generatePedagogicalSimplifySteps(node, {
			intent: 'reduire',
			schoolLevel: 'lycee'
		});
		expect(tex(result)).toBe('|x|');
	});

	it('reduire does NOT factorize x²-4 (would be ambiguous)', () => {
		const node = parseLatex('x^2 - 4');
		const { result, steps } = generatePedagogicalSimplifySteps(node, {
			intent: 'reduire',
			schoolLevel: 'lycee'
		});
		expect(tex(result)).toBe('x^2-4');
		const ruleNames = steps.map((s) => s.rule);
		expect(ruleNames).not.toContain('diff-squares-numeric');
		expect(ruleNames).not.toContain('diff-squares-symbolic');
	});

	it('reduire does NOT use the expand-sum-squared *pattern* rule', () => {
		// Honest V1 limitation : `reduire` delegates to `normalize()` which
		// canonicalizes polynomials (including expanding `(x+1)²` into
		// `x²+2x+1`). The pattern rule `expand-sum-squared` is NOT in the
		// active rule set for `reduire`, but normalize's polynomial pass
		// will still produce the expanded form. This is acceptable because
		// the expanded form IS a tidied-up canonical form — only the
		// `factoriser` intent preserves a factored polynomial.
		const node = parseLatex('(x+1)^2');
		const { steps } = generatePedagogicalSimplifySteps(node, {
			intent: 'reduire',
			schoolLevel: 'lycee'
		});
		expect(steps.map((s) => s.rule)).not.toContain('expand-sum-squared');
	});
});

// =============================================================================
// auto
// =============================================================================

describe('pipeline — auto intent', () => {
	it('√8 → 2√2 (unambiguous radical extraction)', () => {
		const node = parseLatex('\\sqrt{8}');
		const { result } = generatePedagogicalSimplifySteps(node, {
			intent: 'auto',
			schoolLevel: 'lycee'
		});
		expect(tex(result)).toBe('2\\sqrt{2}');
	});

	it('sin² + cos² → 1 (unambiguous identity)', () => {
		const node = parseLatex('\\sin^2(x) + \\cos^2(x)');
		const { result } = generatePedagogicalSimplifySteps(node, {
			intent: 'auto',
			schoolLevel: 'lycee'
		});
		expect(tex(result)).toBe('1');
	});

	it('x²-4 stays unfactored under auto (ambiguous)', () => {
		const node = parseLatex('x^2 - 4');
		const { result } = generatePedagogicalSimplifySteps(node, {
			intent: 'auto',
			schoolLevel: 'lycee'
		});
		expect(tex(result)).toBe('x^2-4');
	});
});

// =============================================================================
// schoolLevel-driven flag defaults
// =============================================================================

describe('pipeline — flag defaults from schoolLevel', () => {
	it('primaire defaults: trig and log/exp OFF — pythagorean does not fire', () => {
		const node = parseLatex('\\sin^2(x) + \\cos^2(x)');
		const { result } = generatePedagogicalSimplifySteps(node, {
			intent: 'reduire',
			schoolLevel: 'primaire'
		});
		// Pythagorean is gated off; the result stays as-is (or trivially sorted).
		expect(tex(result)).not.toBe('1');
	});

	it('lycee defaults: trig ON — pythagorean fires', () => {
		const node = parseLatex('\\sin^2(x) + \\cos^2(x)');
		const { result } = generatePedagogicalSimplifySteps(node, {
			intent: 'reduire',
			schoolLevel: 'lycee'
		});
		expect(tex(result)).toBe('1');
	});

	it('explicit enableTrig:false at lycee disables trig identities', () => {
		const node = parseLatex('\\sin^2(x) + \\cos^2(x)');
		const { result } = generatePedagogicalSimplifySteps(node, {
			intent: 'reduire',
			schoolLevel: 'lycee',
			enableTrig: false
		});
		expect(tex(result)).not.toBe('1');
	});
});

// =============================================================================
// Step shape
// =============================================================================

describe('pipeline — step shape', () => {
	it('every step has globalBefore, globalAfter, category, description', () => {
		const node = parseLatex('(x+1)(x-1)');
		const { steps } = generatePedagogicalSimplifySteps(node, {
			intent: 'developper',
			schoolLevel: 'college'
		});
		expect(steps.length).toBeGreaterThan(0);
		for (const s of steps) {
			expect(s.globalBefore).toBeDefined();
			expect(s.globalAfter).toBeDefined();
			expect(s.category).toBeDefined();
			expect(s.description).toBeTruthy();
			expect(typeof s.id).toBe('number');
			expect(s.id).toBeGreaterThan(0);
		}
	});

	it('step ids are unique and increasing', () => {
		const node = parseLatex('(x+1)(x-1)');
		const { steps } = generatePedagogicalSimplifySteps(node, {
			intent: 'developper',
			schoolLevel: 'college'
		});
		const ids = steps.map((s) => s.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (let i = 1; i < ids.length; i++) {
			expect(ids[i]).toBeGreaterThan(ids[i - 1]);
		}
	});

	it('id counter resets between calls (no carry-over)', () => {
		const a = generatePedagogicalSimplifySteps(parseLatex('2x+3x'), {
			intent: 'reduire',
			schoolLevel: 'lycee'
		});
		const b = generatePedagogicalSimplifySteps(parseLatex('6/8'), {
			intent: 'reduire',
			schoolLevel: 'lycee'
		});
		expect(a.steps[0]?.id).toBe(1);
		expect(b.steps[0]?.id).toBe(1);
	});
});

// =============================================================================
// V1-out-of-scope rejection
// =============================================================================

describe('pipeline — PedagogicalSimplifyNotImplemented', () => {
	it('throws on inequations (relation other than =)', () => {
		const node = parseLatex('x + 1 < 2');
		expect(() =>
			generatePedagogicalSimplifySteps(node, {
				intent: 'reduire',
				schoolLevel: 'lycee'
			})
		).toThrow(PedagogicalSimplifyNotImplemented);
	});

	it('does NOT throw on equations (relation === "=")', () => {
		const node = parseLatex('x + 1 = 2');
		expect(() =>
			generatePedagogicalSimplifySteps(node, {
				intent: 'reduire',
				schoolLevel: 'lycee'
			})
		).not.toThrow();
	});

	it('throws on matrix node', () => {
		const node: import('../../types').MathNode = {
			type: 'matrix',
			rows: [[parseLatex('1'), parseLatex('2')]]
		};
		expect(() =>
			generatePedagogicalSimplifySteps(node, {
				intent: 'reduire',
				schoolLevel: 'lycee'
			})
		).toThrow(PedagogicalSimplifyNotImplemented);
	});

	it('throws on piecewise node', () => {
		const node: import('../../types').MathNode = {
			type: 'piecewise',
			pieces: [{ condition: parseLatex('x > 0'), value: parseLatex('1') }],
			otherwise: parseLatex('-1')
		};
		expect(() =>
			generatePedagogicalSimplifySteps(node, {
				intent: 'reduire',
				schoolLevel: 'lycee'
			})
		).toThrow(PedagogicalSimplifyNotImplemented);
	});

	it('throws on logical (and/or) node', () => {
		const node: import('../../types').MathNode = {
			type: 'logical',
			op: 'and',
			left: parseLatex('x = 1'),
			right: parseLatex('y = 2')
		};
		expect(() =>
			generatePedagogicalSimplifySteps(node, {
				intent: 'reduire',
				schoolLevel: 'lycee'
			})
		).toThrow(PedagogicalSimplifyNotImplemented);
	});
});

// =============================================================================
// No-op cases
// =============================================================================

describe('pipeline — no-op cases', () => {
	it('returns empty steps when input is already simplified for the intent', () => {
		const node = parseLatex('x');
		const { result, steps } = generatePedagogicalSimplifySteps(node, {
			intent: 'reduire',
			schoolLevel: 'lycee'
		});
		expect(tex(result)).toBe('x');
		expect(steps).toEqual([]);
	});

	it('returns input unchanged when no rule matches', () => {
		const node = parseLatex('y');
		const { result } = generatePedagogicalSimplifySteps(node, {
			intent: 'factoriser',
			schoolLevel: 'lycee'
		});
		expect(tex(result)).toBe('y');
	});
});

// =============================================================================
// Abort
// =============================================================================

describe('pipeline — abort', () => {
	it('returns aborted=true when signal is pre-aborted', () => {
		const node = parseLatex('2x + 3x');
		const ctrl = new AbortController();
		ctrl.abort();
		const { aborted } = generatePedagogicalSimplifySteps(node, {
			intent: 'reduire',
			schoolLevel: 'lycee',
			signal: ctrl.signal
		});
		expect(aborted).toBe(true);
	});

	it('honours timeoutMs=0 (immediate abort)', () => {
		const node = parseLatex('2x + 3x');
		const { aborted } = generatePedagogicalSimplifySteps(node, {
			intent: 'reduire',
			schoolLevel: 'lycee',
			timeoutMs: 0
		});
		expect(aborted).toBe(true);
	});

	it('completes normally when timeoutMs is generous', () => {
		const node = parseLatex('2x + 3x');
		const { result, aborted } = generatePedagogicalSimplifySteps(node, {
			intent: 'reduire',
			schoolLevel: 'lycee',
			timeoutMs: 5000
		});
		expect(aborted).toBeUndefined();
		expect(tex(result)).toBe('5x');
	});
});

// =============================================================================
// Step descriptions (Phase 2 — pedagogical lookups)
// =============================================================================

describe('pipeline — step descriptions', () => {
	it('pattern rule steps get a French pedagogical description (not the generic fallback)', () => {
		const node = parseLatex('(x+1)^2');
		const { steps } = generatePedagogicalSimplifySteps(node, {
			intent: 'developper',
			schoolLevel: 'college'
		});
		const expand = steps.find((s) => s.rule === 'expand-sum-squared');
		expect(expand).toBeDefined();
		expect(expand!.description).toContain('Identité remarquable');
		expect(expand!.description).not.toMatch(/^Règle\s*:/i);
	});

	it('normalize-side rule steps fall through to normal/rule-descriptions-fr', () => {
		const node = parseLatex('2x + 3x');
		const { steps } = generatePedagogicalSimplifySteps(node, {
			intent: 'reduire',
			schoolLevel: 'lycee'
		});
		const combine = steps.find((s) => s.rule === 'combine-like-terms');
		expect(combine).toBeDefined();
		expect(combine!.description).toBeTruthy();
		expect(combine!.description).not.toMatch(/^Règle\s*:/i);
	});

	it('distribute-binomial-product description mentions distribution', () => {
		const node = parseLatex('(2x+3)(x-1)');
		const { steps } = generatePedagogicalSimplifySteps(node, {
			intent: 'developper',
			schoolLevel: 'college'
		});
		const dist = steps.find((s) => s.rule === 'distribute-binomial-product');
		expect(dist).toBeDefined();
		expect(dist!.description.toLowerCase()).toContain('distribution');
	});
});
