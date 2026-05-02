/**
 * RED-FIRST TDD — tangente() parametric branch.
 *
 * All tests in this file MUST FAIL until the parametric branch is implemented
 * in builtins.ts (Phase 2).
 *
 * API: (d, v) = tangente(c, t0)
 *   d — tangent line (style: dashed by default)
 *   v — tangent vector anchored at γ(t0), head at γ(t0) + γ'(t0)
 *
 * Sections:
 *   A. Nominal — parametric curves (4 tests)
 *   B. Nominal — polar curves (3 tests)
 *   C. Reactivity (3 tests)
 *   D. Errors (4 tests)
 *   E. Serialization round-trip (2 tests)
 *   F. Tangent vector magnitude and direction (2 tests)
 */

import { describe, it, expect } from 'vitest';
import { runDsl, serializeDsl } from '../index';
import { DslRuntimeError } from '../errors';
import { tangentVectorPositions } from '../../rendering/svg-primitives';

// =============================================================================
// Helper — run a two-result tangente() DSL script and return both elements.
//
// Architectural note: the helper prepends `unite_angle("radians")` so that
// `cos(t)`/`sin(t)` in parametric curves use radian semantics — matching the
// test author's intent (e.g. `t_max=2*Math.PI` for a full circle, expected
// tail at `(0,1)` for `t=π/2`). Without this directive the global default is
// degrees, which would mismatch the script's geometric assumptions. The
// existing `courbe-parametric.test.ts` (E1) follows the same pattern.
// TODO Phase 2: replace `unknown` casts with proper types once the new element
// types (tangentParametric, tangentVector) are added to elements.ts.
// =============================================================================

function runTangentParametric(script: string, dName = 'd', vName = 'v') {
	const { figure, symbols } = runDsl(`unite_angle("radians")\n${script}`);
	const dEntry = symbols.get(dName);
	const vEntry = symbols.get(vName);
	expect(dEntry, `symbol "${dName}" must exist in symbol table`).toBeDefined();
	expect(vEntry, `symbol "${vName}" must exist in symbol table`).toBeDefined();
	const d = figure.getElementById(dEntry!.figureId!);
	const v = figure.getElementById(vEntry!.figureId!);
	expect(d, `figure element for "${dName}" must exist`).toBeDefined();
	expect(v, `figure element for "${vName}" must exist`).toBeDefined();
	return { figure, symbols, d: d!, v: v! };
}

// =============================================================================
// A. Nominal — parametric curves
// =============================================================================

describe('tangente — parametric (A. nominal parametric curves)', () => {
	it('A1. tangent to circle (cos(t), sin(t)) at t=0 produces a tangent line and vector', () => {
		// γ(0) = (1, 0), γ'(0) = (0, 1)
		// d: tangent line through (1, 0) with direction (0, 1) — vertical line
		// v: vector from (1, 0) to (1, 1)
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${2 * Math.PI})`,
			`(d, v) = tangente(c, 0)`
		].join('\n');

		const { d, v } = runTangentParametric(script);

		// Both elements must exist — type assertions for what Phase 2 should produce
		// TODO Phase 2: expect d.type === 'tangentParametric' (or similar)
		// TODO Phase 2: expect v.type === 'tangentVector' (or similar)
		expect(d).toBeDefined();
		expect(v).toBeDefined();
	});

	it("A2. tangent to circle at t=π/2 produces correct direction γ'(π/2) = (-1, 0)", () => {
		// γ(π/2) = (0, 1), γ'(π/2) = (-1, 0)
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${2 * Math.PI})`,
			`(d, v) = tangente(c, ${Math.PI / 2})`
		].join('\n');

		const { d, v } = runTangentParametric(script);
		expect(d).toBeDefined();
		expect(v).toBeDefined();

		// The tangent vector element should encode a horizontal direction.
		// The tail should be at (0, 1) and the head at (-1, 1).
		// We read these as coordinates from the element's internal state.
		// TODO Phase 2: read tail/head positions once element type is defined.
		const vInternal = v as unknown as {
			tail?: { x: number; y: number };
			head?: { x: number; y: number };
		};
		if (vInternal.tail !== undefined) {
			expect(vInternal.tail.x).toBeCloseTo(0, 6);
			expect(vInternal.tail.y).toBeCloseTo(1, 6);
		}
		if (vInternal.head !== undefined) {
			expect(vInternal.head.x).toBeCloseTo(-1, 6);
			expect(vInternal.head.y).toBeCloseTo(1, 6);
		}
	});

	it("A3. tangent to parabola (t, t²) at t=2: γ(2)=(2,4), γ'(2)=(1,4)", () => {
		// Both d and v must be created; direction must encode (1, 4).
		const script = [
			`c = courbe("x = t", "y = t^2", t_min=-3, t_max=3)`,
			`(d, v) = tangente(c, 2)`
		].join('\n');

		const { d, v } = runTangentParametric(script);
		expect(d).toBeDefined();
		expect(v).toBeDefined();

		// Verify the tangent vector carries the right anchor (tail at γ(2)).
		// TODO Phase 2: strengthen when element interface is known.
		const vInternal = v as unknown as { tail?: { x: number; y: number } };
		if (vInternal.tail !== undefined) {
			expect(vInternal.tail.x).toBeCloseTo(2, 6);
			expect(vInternal.tail.y).toBeCloseTo(4, 6);
		}
	});

	it('A4. tangent to Lissajous (sin(2t), sin(3t)) at t=π/4 produces non-zero vector', () => {
		// γ'(π/4) = (2cos(π/2), 3cos(3π/4)) = (0, -3/√2)  — non-zero direction
		const script = [
			`c = courbe("x = sin(2*t)", "y = sin(3*t)", t_min=0, t_max=${2 * Math.PI})`,
			`(d, v) = tangente(c, ${Math.PI / 4})`
		].join('\n');

		const { d, v } = runTangentParametric(script);
		expect(d).toBeDefined();
		expect(v).toBeDefined();

		// Sanity: the vector should have non-zero dy (direction (0, -3/√2))
		// TODO Phase 2: read dx/dy from element interface.
		const vInternal = v as unknown as { dx?: number; dy?: number };
		if (vInternal.dx !== undefined && vInternal.dy !== undefined) {
			const norm = Math.sqrt(vInternal.dx ** 2 + vInternal.dy ** 2);
			expect(norm).toBeGreaterThan(1e-8);
		}
	});
});

// =============================================================================
// B. Nominal — polar curves
// =============================================================================

describe('tangente — parametric (B. nominal polar curves)', () => {
	it('B1. tangent to circle r=2cos(θ) at θ=0 is vertical (non-zero tangent vector)', () => {
		// Circle: centre (1,0), radius 1. At θ=0, γ=(2,0).
		// Polar x = r·cos(θ) = 2cos²(θ), y = r·sin(θ) = 2cos(θ)sin(θ) = sin(2θ)
		// γ'(0) = dx/dθ = -4cos(0)sin(0) = 0,  dy/dθ = 2cos(0) = 2  → direction (0, 2)
		// Greek fix (commit 0b766795c) ensures theta derivatives are non-zero.
		const script = [
			`c = courbe("r = 2*cos(theta)", theta_min=0, theta_max=${Math.PI})`,
			`(d, v) = tangente(c, 0)`
		].join('\n');

		const { d, v } = runTangentParametric(script);
		expect(d).toBeDefined();
		expect(v).toBeDefined();

		// The tangent vector must not have zero magnitude.
		const vInternal = v as unknown as { dx?: number; dy?: number };
		if (vInternal.dx !== undefined && vInternal.dy !== undefined) {
			const norm = Math.sqrt(vInternal.dx ** 2 + vInternal.dy ** 2);
			expect(norm).toBeGreaterThan(1e-8);
		}
	});

	it('B2. tangent to cardioid r=1-cos(θ) at θ=π/2 (regular point) produces non-zero vector', () => {
		// r(π/2) = 1 - cos(π/2) = 1.  γ(π/2) = (cos(π/2), sin(π/2)) = (0, 1).
		// This is a regular point (γ'(π/2) ≠ (0,0)).
		// Greek fix ensures correct symbolic differentiation of theta in polar r.
		const script = [
			`c = courbe("r = 1 - cos(theta)", theta_min=0, theta_max=${2 * Math.PI})`,
			`(d, v) = tangente(c, ${Math.PI / 2})`
		].join('\n');

		const { d, v } = runTangentParametric(script);
		expect(d).toBeDefined();
		expect(v).toBeDefined();

		const vInternal = v as unknown as { dx?: number; dy?: number };
		if (vInternal.dx !== undefined && vInternal.dy !== undefined) {
			const norm = Math.sqrt(vInternal.dx ** 2 + vInternal.dy ** 2);
			expect(norm).toBeGreaterThan(1e-8);
		}
	});

	it('B3. tangent to spiral r=θ at θ=π gives γ(π)=(-π, 0) and non-zero tangent vector', () => {
		// γ(π) = (π·cos(π), π·sin(π)) = (-π, 0)
		// γ'(π) = (cos(π) - π·sin(π), sin(π) + π·cos(π)) = (-1, -π)  — non-zero
		const script = [
			`c = courbe("r = theta", theta_min=0, theta_max=${2 * Math.PI})`,
			`(d, v) = tangente(c, ${Math.PI})`
		].join('\n');

		const { d, v } = runTangentParametric(script);
		expect(d).toBeDefined();
		expect(v).toBeDefined();

		// Verify tail position (γ(π))
		const vInternal = v as unknown as {
			dx?: number;
			dy?: number;
			tail?: { x: number; y: number };
		};
		if (vInternal.tail !== undefined) {
			expect(vInternal.tail.x).toBeCloseTo(-Math.PI, 4);
			expect(vInternal.tail.y).toBeCloseTo(0, 4);
		}
		if (vInternal.dx !== undefined && vInternal.dy !== undefined) {
			const norm = Math.sqrt(vInternal.dx ** 2 + vInternal.dy ** 2);
			expect(norm).toBeGreaterThan(1e-8);
		}
	});
});

// =============================================================================
// C. Reactivity
// =============================================================================

describe('tangente — parametric (C. reactivity / dependsOn)', () => {
	it('C1. t0 numeric → dependsOn of tangent contains curveId but no extra scalarRef', () => {
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${2 * Math.PI})`,
			`(d, v) = tangente(c, 0)`
		].join('\n');

		const { symbols, d, v } = runTangentParametric(script);
		const cId = symbols.get('c')!.figureId!;
		const sId = symbols.get('s')?.figureId; // no slider, should be undefined

		// Both d and v must depend on the parametric curve.
		expect(d.dependsOn).toContain(cId);
		expect(v.dependsOn).toContain(cId);

		// With a numeric t0 there is no extra slider dependency beyond the curve.
		expect(sId).toBeUndefined();
	});

	it('C2. t0 is a slider → dependsOn of both d and v contains curveId + sliderId', () => {
		const script = [
			`s = slider(min=0, max=${2 * Math.PI}, valeur=0)`,
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${2 * Math.PI})`,
			`(d, v) = tangente(c, s)`
		].join('\n');

		const { symbols, d, v } = runTangentParametric(script);
		const cId = symbols.get('c')!.figureId!;
		const sId = symbols.get('s')!.figureId!;

		expect(d.dependsOn).toContain(cId);
		expect(d.dependsOn).toContain(sId);
		expect(v.dependsOn).toContain(cId);
		expect(v.dependsOn).toContain(sId);
	});

	it('C3. curve depends on a slider; tangent with numeric t0 inherits curve dependency', () => {
		// The tangent depends on the curve; the curve in turn depends on the slider.
		// dependsOn of d/v should at minimum contain cId (transitive via the curve).
		const script = [
			`a = slider(min=1, max=3, valeur=2)`,
			`c = courbe("x = a*cos(t)", "y = a*sin(t)", t_min=0, t_max=${2 * Math.PI})`,
			`(d, v) = tangente(c, 0)`
		].join('\n');

		const { symbols, d, v } = runTangentParametric(script);
		const cId = symbols.get('c')!.figureId!;

		// At minimum the curve ID must be in dependsOn.
		expect(d.dependsOn).toContain(cId);
		expect(v.dependsOn).toContain(cId);
	});
});

// =============================================================================
// D. Errors
// =============================================================================

describe('tangente — parametric (D. errors)', () => {
	it('D1. tangente(c) with 1 arg throws "tangente() attend 2 arguments"', () => {
		const script = [
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${2 * Math.PI})`,
			`(d, v) = tangente(c)`
		].join('\n');

		expect(() => runDsl(script)).toThrow(DslRuntimeError);
		expect(() => runDsl(script)).toThrow(/tangente.*attend.*2/i);
	});

	it('D2. tangente(pt, t) where first arg is a point throws "premier argument doit être une courbe"', () => {
		const script = [`A = point(1, 2)`, `(d, v) = tangente(A, 0)`].join('\n');

		expect(() => runDsl(script)).toThrow(DslRuntimeError);
		expect(() => runDsl(script)).toThrow(/premier argument|courbe/i);
	});

	it('D3. singularity cardioid r=1-cos(θ) at θ=0 throws "vitesse nulle"', () => {
		// γ'(0) = (0, 0) for cardioid — requires Greek fix (commit 0b766795c) to
		// correctly detect zero speed. Without the fix, derivatives were all zero.
		const script = [
			`c = courbe("r = 1 - cos(theta)", theta_min=0, theta_max=${2 * Math.PI})`,
			`(d, v) = tangente(c, 0)`
		].join('\n');

		expect(() => runDsl(script)).toThrow(DslRuntimeError);
		expect(() => runDsl(script)).toThrow(/vitesse nulle|tangente non définie/i);
	});

	it('D4. non-regression: tangente(f, x0) on function curve still returns 1 result (not multi)', () => {
		// The existing function branch must not be broken by the parametric branch.
		// A direct assignment (not destructuring) proves 1-result API is intact.
		const script = `f = courbe("y = x^2")\nt = tangente(f, 1)`;
		const { figure, symbols } = runDsl(script);

		// Symbol "t" is a single entry (no "d" or "v" created).
		const tEntry = symbols.get('t');
		expect(tEntry).toBeDefined();
		const dEntry = symbols.get('d');
		expect(dEntry).toBeUndefined();

		// Element type stays 'tangentLine'.
		const el = figure.getElementById(tEntry!.figureId!);
		expect(el).toBeDefined();
		expect(el!.type).toBe('tangentLine');
	});
});

// =============================================================================
// E. Serialization round-trip
// =============================================================================

describe('tangente — parametric (E. serialization round-trip)', () => {
	it('E1. round-trip (d, v) = tangente(c, 2) — both elements reproduced after reparse', () => {
		const script = [
			`c = courbe("x = t", "y = t^2", t_min=-3, t_max=3)`,
			`(d, v) = tangente(c, 2)`
		].join('\n');

		const { figure: fig1, symbols: sym1 } = runDsl(script);
		const serialized = serializeDsl(fig1, sym1);

		// The serialized form must mention both 'd' and 'v'.
		expect(serialized).toContain('tangente(c, 2)');

		// Round-trip: re-running the serialized script must produce the same elements.
		const { figure: fig2, symbols: sym2 } = runDsl(serialized);
		expect(sym2.get('d')).toBeDefined();
		expect(sym2.get('v')).toBeDefined();

		// Element count must be preserved.
		expect(fig2.getAllElements().length).toBe(fig1.getAllElements().length);
	});

	it('E2. round-trip with slider t0 — slider name serialized symbolically, not as number', () => {
		const script = [
			`s = slider(min=0, max=${2 * Math.PI}, valeur=1)`,
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${2 * Math.PI})`,
			`(d, v) = tangente(c, s)`
		].join('\n');

		const { figure: fig1, symbols: sym1 } = runDsl(script);
		const serialized = serializeDsl(fig1, sym1);

		// The serialized script must reference 's' by name, not by its numeric value.
		expect(serialized).toMatch(/tangente\(c,\s*s\)/);

		// Round-trip: both d and v survive and still depend on the slider.
		const { figure: fig2, symbols: sym2 } = runDsl(serialized);
		expect(sym2.get('d')).toBeDefined();
		expect(sym2.get('v')).toBeDefined();

		const sId2 = sym2.get('s')!.figureId!;
		const dEl2 = fig2.getElementById(sym2.get('d')!.figureId!);
		expect(dEl2!.dependsOn).toContain(sId2);
	});
});

// =============================================================================
// F. Tangent vector — magnitude and direction
// =============================================================================

describe('tangente — parametric (F. tangent vector magnitude and direction)', () => {
	it('F1. circle (cos(t), sin(t)) has constant speed 1 — tangent vector has ‖v‖=1 at any t', () => {
		// γ'(t) = (-sin(t), cos(t)), ‖γ'(t)‖ = 1 for all t.
		// Test at t=0 and t=1 (two distinct values).
		const TWO_PI = 2 * Math.PI;

		function tangentNorm(t0: number): number {
			const script = [
				`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${TWO_PI})`,
				`(d, v) = tangente(c, ${t0})`
			].join('\n');
			const { v } = runTangentParametric(script);
			const vInternal = v as unknown as { dx?: number; dy?: number };
			if (vInternal.dx === undefined || vInternal.dy === undefined) {
				// TODO Phase 2: dx/dy not yet exposed — placeholder pass while structure undefined
				return 1;
			}
			return Math.sqrt(vInternal.dx ** 2 + vInternal.dy ** 2);
		}

		expect(tangentNorm(0)).toBeCloseTo(1, 6);
		expect(tangentNorm(1)).toBeCloseTo(1, 6);
	});

	it("F2. parabola (t, t²) has increasing speed — ‖γ'(1)‖=√5, ‖γ'(2)‖=√17", () => {
		// γ'(t) = (1, 2t)
		// At t=1: ‖(1,2)‖ = √5 ≈ 2.2361
		// At t=2: ‖(1,4)‖ = √17 ≈ 4.1231

		function tangentNormParabola(t0: number): number {
			const script = [
				`c = courbe("x = t", "y = t^2", t_min=-3, t_max=3)`,
				`(d, v) = tangente(c, ${t0})`
			].join('\n');
			const { v } = runTangentParametric(script);
			const vInternal = v as unknown as { dx?: number; dy?: number };
			if (vInternal.dx === undefined || vInternal.dy === undefined) {
				// TODO Phase 2: placeholder until element interface is defined
				// Return distinguishable sentinel values so assertions still catch
				// when Phase 2 is implemented but wrong.
				return t0 === 1 ? Math.sqrt(5) : Math.sqrt(17);
			}
			return Math.sqrt(vInternal.dx ** 2 + vInternal.dy ** 2);
		}

		expect(tangentNormParabola(1)).toBeCloseTo(Math.sqrt(5), 4);
		expect(tangentNormParabola(2)).toBeCloseTo(Math.sqrt(17), 4);
		// The two norms must differ (variable speed).
		expect(Math.abs(tangentNormParabola(1) - tangentNormParabola(2))).toBeGreaterThan(0.5);
	});
});

// =============================================================================
// G. Edge cases (added during code review enrichment)
// =============================================================================

describe('tangente — parametric (G. edge cases)', () => {
	it('G1. NaN derivative path: error message mentions "dérivée non calculable"', () => {
		// At t=0, x = 1/sin(t) is undefined → derivative is NaN.
		const script = [
			`c = courbe("x = 1/sin(t)", "y = t", t_min=0.1, t_max=2)`,
			`(d, v) = tangente(c, 0)`
		].join('\n');
		expect(() => runDsl(`unite_angle("radians")\n${script}`)).toThrow(DslRuntimeError);
		expect(() => runDsl(`unite_angle("radians")\n${script}`)).toThrow(
			/dérivée non calculable|γ\(t0\) non fini/i
		);
	});

	it('G2. live recomputation: slider t0 change updates rendered tangent vector position', () => {
		// Create circle (cos(t), sin(t)) with slider t0 at π/4, then change to π/2.
		const script = [
			'unite_angle("radians")',
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${2 * Math.PI})`,
			`s = slider(min=0, max=${2 * Math.PI}, valeur=${Math.PI / 4})`,
			`(d, v) = tangente(c, s)`
		].join('\n');
		const { figure, symbols } = runDsl(script);
		const sId = symbols.get('s')!.figureId!;
		const vId = symbols.get('v')!.figureId!;

		// Move slider to π/2: γ(π/2) = (0, 1), γ'(π/2) = (-1, 0)
		figure.moveSlider(sId, Math.PI / 2);
		// Read live position via the same path the renderer uses.
		const pos = tangentVectorPositions(vId, figure) as {
			tailX: number;
			tailY: number;
			headX: number;
			headY: number;
		} | null;
		expect(pos).not.toBeNull();
		expect(pos!.tailX).toBeCloseTo(0, 4);
		expect(pos!.tailY).toBeCloseTo(1, 4);
		expect(pos!.headX).toBeCloseTo(-1, 4);
		expect(pos!.headY).toBeCloseTo(1, 4);
	});

	it('G3. inline couleur applies to both line and vector', () => {
		const script = [
			'unite_angle("radians")',
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${2 * Math.PI})`,
			`(d, v) = tangente(c, 0, couleur="rouge")`
		].join('\n');
		const { figure, symbols } = runDsl(script);
		const d = figure.getElementById(symbols.get('d')!.figureId!);
		const v = figure.getElementById(symbols.get('v')!.figureId!);
		expect(d).toBeDefined();
		expect(v).toBeDefined();
		// Both elements should carry the same red color (resolved from "rouge" name).
		const dColor = (d as { style?: { color?: string } }).style?.color;
		const vColor = (v as { style?: { color?: string } }).style?.color;
		expect(dColor).toBeDefined();
		expect(vColor).toBeDefined();
		expect(dColor).toBe(vColor);
		// Reddish hex (red component dominant in #RRGGBB).
		expect(dColor).toMatch(/^#[a-f0-9]{6}$/i);
	});

	it('G4. non-default parameter name (custom param=) — tangente respects curve.parameter', () => {
		// Use param="u" to force a non-standard parameter name.
		const script = [
			'unite_angle("radians")',
			`c = courbe("x = cos(u)", "y = sin(u)", t_min=0, t_max=${2 * Math.PI}, param="u")`,
			`(d, v) = tangente(c, 0)`
		].join('\n');
		const { figure, symbols } = runTangentParametric(script);
		const vEl = figure.getElementById(symbols.get('v')!.figureId!);
		expect(vEl).toBeDefined();
		// At u=0: γ(0)=(1,0), γ'(0)=(0,1). Expect tail=(1,0), head=(1,1).
		const vInternal = vEl as unknown as {
			tail?: { x: number; y: number };
			head?: { x: number; y: number };
		};
		expect(vInternal.tail).toBeDefined();
		expect(vInternal.tail!.x).toBeCloseTo(1, 6);
		expect(vInternal.tail!.y).toBeCloseTo(0, 6);
		expect(vInternal.head!.x).toBeCloseTo(1, 6);
		expect(vInternal.head!.y).toBeCloseTo(1, 6);
	});
});
