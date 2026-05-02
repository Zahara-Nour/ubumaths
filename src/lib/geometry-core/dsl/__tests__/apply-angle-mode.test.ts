/**
 * Tests for `applyAngleMode(node, mode)` — wraps trig calls in a MathNode
 * tree so that downstream evaluation respects the active angle mode.
 *
 * - mode 'rad': returns the node unchanged (mathAST native).
 * - mode 'deg': for each FunctionNode named sin/cos/tan/cot/sec/csc in the
 *   tree, replace its argument `arg` with `arg * \pi / 180`. For inverse
 *   trig (arcsin/arccos/arctan), wrap the call itself: `f(x) → f(x) * 180 / \pi`.
 *
 * Phase 5 of dsl-mathast-routing plan.
 */

import { describe, it, expect } from 'vitest';
import { applyAngleMode } from '../apply-angle-mode';
import { parseCustom } from '$lib/mathAST';
import { compile } from '$lib/mathAST/eval/compile';

function evalNode(node: ReturnType<typeof parseCustom>): number {
	return compile(node)({});
}

describe('applyAngleMode — mode radians (no-op)', () => {
	it('sin(\\pi/2) in rad mode → 1', () => {
		const node = applyAngleMode(parseCustom('sin(\\pi/2)'), 'rad');
		expect(evalNode(node)).toBeCloseTo(1, 10);
	});

	it('cos(0) in rad mode → 1', () => {
		const node = applyAngleMode(parseCustom('cos(0)'), 'rad');
		expect(evalNode(node)).toBeCloseTo(1, 10);
	});

	it('non-trig: sqrt(2) unchanged', () => {
		const node = applyAngleMode(parseCustom('sqrt(2)'), 'rad');
		expect(evalNode(node)).toBeCloseTo(Math.SQRT2, 10);
	});
});

describe('applyAngleMode — mode degrees (wrap trig args)', () => {
	it('sin(45) in deg mode → ~0.707', () => {
		const node = applyAngleMode(parseCustom('sin(45)'), 'deg');
		expect(evalNode(node)).toBeCloseTo(Math.sin((45 * Math.PI) / 180), 10);
	});

	it('cos(60) in deg mode → 0.5', () => {
		const node = applyAngleMode(parseCustom('cos(60)'), 'deg');
		expect(evalNode(node)).toBeCloseTo(0.5, 10);
	});

	it('tan(45) in deg mode → 1', () => {
		const node = applyAngleMode(parseCustom('tan(45)'), 'deg');
		expect(evalNode(node)).toBeCloseTo(1, 10);
	});

	it('non-trig in deg mode: sqrt(2) unchanged', () => {
		const node = applyAngleMode(parseCustom('sqrt(2)'), 'deg');
		expect(evalNode(node)).toBeCloseTo(Math.SQRT2, 10);
	});

	it('mixed expression: sin(45) + cos(45) in deg mode → ~1.414', () => {
		const node = applyAngleMode(parseCustom('sin(45) + cos(45)'), 'deg');
		expect(evalNode(node)).toBeCloseTo(Math.SQRT2, 10);
	});

	it('nested: sin(cos(0)*90) in deg mode → sin(90 deg) = 1', () => {
		const node = applyAngleMode(parseCustom('sin(cos(0) * 90)'), 'deg');
		// cos(0 deg) = 1, then sin(1 * 90 deg) = sin(90 deg) = 1
		expect(evalNode(node)).toBeCloseTo(1, 10);
	});
});

describe('applyAngleMode — inverse trig in degrees', () => {
	it('arcsin(0.707) in deg mode → ~45', () => {
		// mathAST exposes asin via custom parser? Try alternate names.
		// We expect both `asin` and `arcsin` to be handled.
		const node = applyAngleMode(parseCustom('arcsin(0.7071067811865475)'), 'deg');
		expect(evalNode(node)).toBeCloseTo(45, 6);
	});

	it('arccos(0.5) in deg mode → 60', () => {
		const node = applyAngleMode(parseCustom('arccos(0.5)'), 'deg');
		expect(evalNode(node)).toBeCloseTo(60, 6);
	});

	it('arctan(1) in deg mode → 45', () => {
		const node = applyAngleMode(parseCustom('arctan(1)'), 'deg');
		expect(evalNode(node)).toBeCloseTo(45, 6);
	});

	it('arcsin in rad mode → pi/4', () => {
		const node = applyAngleMode(parseCustom('arcsin(0.7071067811865475)'), 'rad');
		expect(evalNode(node)).toBeCloseTo(Math.PI / 4, 6);
	});
});
