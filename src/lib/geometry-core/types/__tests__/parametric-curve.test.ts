/**
 * Phase 1 — type GeoParametricCurve and isParametricCurve type guard.
 *
 * Red-first TDD: validates that the discriminated union, the structural shape,
 * and the type guard expose the shape required by the parametric-curves V1 plan.
 */

import { describe, it, expect } from 'vitest';
import { parseCustom, compile } from '$lib/mathAST';
import type { CompiledFn } from '$lib/mathAST/eval/compile';
import { numeric } from '../geo-value';
import type {
	GeoElement,
	GeoFunction,
	GeoParametricCurve,
	GeoFreePoint,
	GeoImplicitCurve
} from '../elements';
import { isParametricCurve, isFunction, isImplicitCurve } from '../elements';

// =============================================================================
// Helpers
// =============================================================================

function makeParamCircle(): GeoParametricCurve {
	const xExpr = parseCustom('cos(t)');
	const yExpr = parseCustom('sin(t)');
	const xPrime = parseCustom('-sin(t)');
	const yPrime = parseCustom('cos(t)');
	const cx: CompiledFn = compile(xExpr);
	const cy: CompiledFn = compile(yExpr);
	const cxp: CompiledFn = compile(xPrime);
	const cyp: CompiledFn = compile(yPrime);
	return {
		type: 'parametricCurve',
		id: 'pc_test_1',
		xExpression: xExpr,
		yExpression: yExpr,
		xDerivative: xPrime,
		yDerivative: yPrime,
		compiledX: cx,
		compiledY: cy,
		compiledXPrime: cxp,
		compiledYPrime: cyp,
		parameter: 't',
		tMin: numeric(0),
		tMax: numeric(2 * Math.PI),
		equationX: 'x = cos(t)',
		equationY: 'y = sin(t)',
		color: '#1e40af',
		visible: true,
		dependsOn: []
	};
}

function makeFreePoint(): GeoFreePoint {
	return {
		type: 'freePoint',
		id: 'pt_1',
		position: { x: numeric(0), y: numeric(0) },
		draggable: true,
		color: '#1e40af',
		visible: true,
		dependsOn: []
	};
}

// =============================================================================
// Discriminant + structure
// =============================================================================

describe('GeoParametricCurve — type and structure', () => {
	it('has discriminant "parametricCurve"', () => {
		const pc = makeParamCircle();
		expect(pc.type).toBe('parametricCurve');
	});

	it('exposes xExpression and yExpression as MathNodes', () => {
		const pc = makeParamCircle();
		expect(pc.xExpression).toBeDefined();
		expect(pc.yExpression).toBeDefined();
		expect(pc.xExpression).not.toBe(pc.yExpression);
	});

	it('exposes compiled closures that evaluate at parameter values', () => {
		const pc = makeParamCircle();
		const xAt0 = pc.compiledX({ t: 0 });
		const yAt0 = pc.compiledY({ t: 0 });
		expect(xAt0).toBeCloseTo(1, 10);
		expect(yAt0).toBeCloseTo(0, 10);

		const xAtHalfPi = pc.compiledX({ t: Math.PI / 2 });
		const yAtHalfPi = pc.compiledY({ t: Math.PI / 2 });
		expect(xAtHalfPi).toBeCloseTo(0, 10);
		expect(yAtHalfPi).toBeCloseTo(1, 10);
	});

	it('exposes compiled derivatives when symbolic differentiation succeeded', () => {
		const pc = makeParamCircle();
		expect(pc.compiledXPrime).not.toBeNull();
		expect(pc.compiledYPrime).not.toBeNull();
		const xpAt0 = pc.compiledXPrime!({ t: 0 });
		const ypAt0 = pc.compiledYPrime!({ t: 0 });
		expect(xpAt0).toBeCloseTo(0, 10);
		expect(ypAt0).toBeCloseTo(1, 10);
	});

	it('allows xDerivative / yDerivative to be null (sampling fallback)', () => {
		const pc = makeParamCircle();
		const fallback: GeoParametricCurve = {
			...pc,
			xDerivative: null,
			yDerivative: null,
			compiledXPrime: null,
			compiledYPrime: null
		};
		expect(fallback.xDerivative).toBeNull();
		expect(fallback.yDerivative).toBeNull();
		expect(fallback.compiledXPrime).toBeNull();
		expect(fallback.compiledYPrime).toBeNull();
	});

	it('stores parameter name and original equation strings', () => {
		const pc = makeParamCircle();
		expect(pc.parameter).toBe('t');
		expect(pc.equationX).toBe('x = cos(t)');
		expect(pc.equationY).toBe('y = sin(t)');
	});

	it('stores tMin and tMax as ScalarParam values', () => {
		const pc = makeParamCircle();
		expect(pc.tMin).toEqual(numeric(0));
		expect(pc.tMax).toEqual(numeric(2 * Math.PI));
	});

	it('exposes a dependsOn list (readonly string[])', () => {
		const pc = makeParamCircle();
		expect(Array.isArray(pc.dependsOn)).toBe(true);
		expect(pc.dependsOn).toEqual([]);
	});
});

// =============================================================================
// Type guard
// =============================================================================

describe('isParametricCurve type guard', () => {
	it('returns true for a parametricCurve element', () => {
		const pc = makeParamCircle();
		const asElement: GeoElement = pc;
		expect(isParametricCurve(asElement)).toBe(true);
		if (isParametricCurve(asElement)) {
			// Type narrowing should preserve access to the parametric fields.
			expect(asElement.xExpression).toBeDefined();
			expect(asElement.parameter).toBe('t');
		}
	});

	it('returns false for non-parametric elements', () => {
		const fp: GeoElement = makeFreePoint();
		expect(isParametricCurve(fp)).toBe(false);
		expect(isFunction(fp)).toBe(false);
		expect(isImplicitCurve(fp)).toBe(false);
	});

	it('returns false for a function curve element', () => {
		const expr = parseCustom('x^2');
		const deriv = parseCustom('2*x');
		const fn: GeoFunction = {
			type: 'function',
			id: 'fn_1',
			expression: expr,
			derivative: deriv,
			compiledFn: compile(expr),
			compiledDerivative: compile(deriv),
			equation: 'y = x^2',
			color: '#1e40af',
			visible: true,
			dependsOn: []
		};
		expect(isParametricCurve(fn)).toBe(false);
	});

	it('returns false for an implicit curve element', () => {
		const expr = parseCustom('x^2 + y^2 - 1');
		const ic: GeoImplicitCurve = {
			type: 'implicitCurve',
			id: 'ic_1',
			expression: expr,
			compiledFn: compile(expr),
			equation: 'x^2 + y^2 = 1',
			color: '#1e40af',
			visible: true,
			dependsOn: []
		};
		expect(isParametricCurve(ic)).toBe(false);
	});
});
