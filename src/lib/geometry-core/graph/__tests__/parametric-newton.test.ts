/**
 * Unit tests for findClosestParameterOnCurve.
 *
 * Focus: warm-start fast path (added 2026-05-18). The audit (tests.md) noted
 * this function had no direct unit tests — only indirect coverage via
 * point-sur drag tests. This file fills the gap for the optimization itself.
 *
 * Note: a few coverage gaps remain (Newton convergence on tricky shapes,
 * singularity handling) — addressed in dsl point-sur tests, kept indirect.
 */

import { describe, it, expect } from 'vitest';
import { parseCustom, compile } from '$lib/mathAST';
import { differentiate } from '$lib/mathAST/differentiation';
import type { CompiledFn } from '$lib/mathAST/eval/compile';
import { numeric } from '../../types/geo-value';
import type { GeoParametricCurve } from '../../types/elements';
import { findClosestParameterOnCurve } from '../parametric-newton';

function makeCurve(xSrc: string, ySrc: string, parameter = 't'): GeoParametricCurve {
	const xExpr = parseCustom(xSrc);
	const yExpr = parseCustom(ySrc);
	const xPrime = differentiate(xExpr, { variable: parameter, simplify: true });
	const yPrime = differentiate(yExpr, { variable: parameter, simplify: true });
	const xSecond = differentiate(xPrime, { variable: parameter, simplify: true });
	const ySecond = differentiate(yPrime, { variable: parameter, simplify: true });
	const cx: CompiledFn = compile(xExpr);
	const cy: CompiledFn = compile(yExpr);
	const cxp: CompiledFn = compile(xPrime);
	const cyp: CompiledFn = compile(yPrime);
	const cxs: CompiledFn = compile(xSecond);
	const cys: CompiledFn = compile(ySecond);
	return {
		type: 'parametricCurve',
		id: 'pc_test',
		xExpression: xExpr,
		yExpression: yExpr,
		xDerivative: xPrime,
		yDerivative: yPrime,
		compiledX: cx,
		compiledY: cy,
		compiledXPrime: cxp,
		compiledYPrime: cyp,
		compiledXSecond: cxs,
		compiledYSecond: cys,
		parameter,
		tMin: numeric(0),
		tMax: numeric(2 * Math.PI),
		equationX: `x = ${xSrc}`,
		equationY: `y = ${ySrc}`,
		color: '#1e40af',
		visible: true,
		dependsOn: []
	};
}

describe('findClosestParameterOnCurve — multi-start (no warm-start)', () => {
	it('finds the closest t on a unit circle for a cursor at (1, 0)', () => {
		const c = makeCurve('cos(t)', 'sin(t)');
		const t = findClosestParameterOnCurve(c, 1, 0, {}, 0, 2 * Math.PI);
		expect(t).not.toBeNull();
		// γ(0) = γ(2π) = (1, 0). Either bound is correct.
		const cosT = Math.cos(t!);
		const sinT = Math.sin(t!);
		expect(cosT).toBeCloseTo(1, 4);
		expect(sinT).toBeCloseTo(0, 4);
	});

	it('returns null when both derivatives are missing (no Newton possible)', () => {
		const c = makeCurve('cos(t)', 'sin(t)');
		const noDerivs: GeoParametricCurve = {
			...c,
			compiledXPrime: null,
			compiledYPrime: null
		};
		const t = findClosestParameterOnCurve(noDerivs, 1, 0, {}, 0, 2 * Math.PI);
		expect(t).toBeNull();
	});

	it('returns null when tMax <= tMin', () => {
		const c = makeCurve('cos(t)', 'sin(t)');
		const t = findClosestParameterOnCurve(c, 1, 0, {}, Math.PI, 0);
		expect(t).toBeNull();
	});
});

describe('findClosestParameterOnCurve — warm-start fast path', () => {
	it('returns the warm-start neighbourhood when cursor is near the previous point', () => {
		// Unit circle. Previous t = π/2 (point (0, 1)). Cursor at (0.1, 0.99) —
		// very close to that point. Newton should land on a t near π/2.
		const c = makeCurve('cos(t)', 'sin(t)');
		const t = findClosestParameterOnCurve(c, 0.1, 0.99, {}, 0, 2 * Math.PI, undefined, Math.PI / 2);
		expect(t).not.toBeNull();
		// Should land in the neighbourhood of π/2, not on the opposite side.
		expect(Math.abs(t! - Math.PI / 2)).toBeLessThan(0.5);
	});

	it('converges to the global minimum even when warm-start is far from it', () => {
		// Unit circle. Previous t = 0.1 (point near (1, 0)). Cursor at (-0.9, 0)
		// is closest to (-1, 0), i.e. t = π. Newton with curvature ignored
		// (f'(t) ≈ ‖γ'‖²) iterates t_{n+1} = t_n + 0.9 sin(t_n), which on the
		// unit circle walks monotonically to t = π in ~8 steps from t = 0.1.
		// So warm-start gives the SAME answer as multi-start here, with 1
		// Newton run instead of 8.
		const c = makeCurve('cos(t)', 'sin(t)');
		const tWarm = findClosestParameterOnCurve(c, -0.9, 0, {}, 0, 2 * Math.PI, undefined, 0.1);
		expect(tWarm).not.toBeNull();
		expect(Math.cos(tWarm!)).toBeCloseTo(-1, 3);
		expect(Math.sin(tWarm!)).toBeCloseTo(0, 3);
	});

	it('falls back to boundary when warm-start would converge to a local maximum', () => {
		// Half-circle t ∈ [0, π]. Previous t = π/2 (apex (0, 1)). Cursor at
		// (0, -2) — below the curve, unreachable. Newton from π/2 finds a
		// stationary point at π/2 (perpendicularity holds), but that's a
		// local MAXIMUM of distance. Our boundary check rescues this:
		// distance at t=0 (point (1,0)) and t=π (point (-1,0)) is √5,
		// vs distance at apex which is 3. Boundary wins.
		const c = makeCurve('cos(t)', 'sin(t)');
		const t = findClosestParameterOnCurve(c, 0, -2, {}, 0, Math.PI, undefined, Math.PI / 2);
		expect(t).not.toBeNull();
		// Either boundary is acceptable: 0 or π. Both give y=0.
		expect(t === 0 || t === Math.PI).toBe(true);
	});

	it('ignores warm-start outside [tMin, tMax] and falls back to multi-start', () => {
		const c = makeCurve('cos(t)', 'sin(t)');
		// Warm-start 100 is way outside [0, 2π]: should be ignored.
		const t = findClosestParameterOnCurve(c, 1, 0, {}, 0, 2 * Math.PI, undefined, 100);
		expect(t).not.toBeNull();
		// Multi-start still finds (1, 0).
		expect(Math.cos(t!)).toBeCloseTo(1, 4);
		expect(Math.sin(t!)).toBeCloseTo(0, 4);
	});

	it('ignores non-finite warm-start and falls back to multi-start', () => {
		const c = makeCurve('cos(t)', 'sin(t)');
		const t = findClosestParameterOnCurve(c, 1, 0, {}, 0, 2 * Math.PI, undefined, NaN);
		expect(t).not.toBeNull();
		expect(Math.cos(t!)).toBeCloseTo(1, 4);
	});
});
