/**
 * Phase V2 — courbe() with polar branch: "r = f(theta)", theta_min=..., theta_max=...
 *
 * RED-FIRST TDD: all tests in this file should FAIL until the polar branch
 * is implemented in the courbe() builtin.
 *
 * Tests cover:
 *   A. Nominal creation (circle, cardioid, rose, spiral, constant).
 *   B. Variable angulaire \theta LaTeX normalisée en "theta" ASCII.
 *   C. Reactivity (dependsOn collects slider ids).
 *   D. Error cases (missing bounds, inverted bounds, wrong parameter, t_min/t_max mix, dual string).
 *   E. Serialization round-trip (polar=true, equationR preserved, slider bounds symbolic).
 *   F. Sampling (≥ 100 points, closed detection via compiledX/compiledY).
 *
 * Internal mapping: r = f(θ) → x(θ) = f(θ)·cos(θ), y(θ) = f(θ)·sin(θ)
 * The resulting GeoElement type stays 'parametricCurve', with two extra fields:
 *   - polar: true
 *   - equationR: string (the RHS expression, e.g. "2*cos(theta)")
 * These fields do NOT exist yet on GeoParametricCurve — Phase 3 will add them.
 */

import { describe, it, expect } from 'vitest';
import { runDsl, serializeDsl } from '../index';
import type { GeoParametricCurve } from '../../types/elements';
import { isParametricCurve } from '../../types/elements';
import { numeric } from '../../types/geo-value';

// =============================================================================
// Helper type for accessing polar-specific fields before they are declared in
// GeoParametricCurve. Phase 3 will add these fields to the type definition.
// =============================================================================

// TODO Phase 3: add { polar?: boolean; equationR?: string } to GeoParametricCurve
type PolarCurve = GeoParametricCurve & {
	polar: boolean;
	equationR: string;
};

// Helper: extract GeoParametricCurve (cast) from runDsl result for symbol name.
function getPolarCurve(script: string, symbol = 'c'): PolarCurve {
	const { figure, symbols } = runDsl(script);
	const entry = symbols.get(symbol);
	expect(entry).toBeDefined();
	const el = figure.getElementById(entry!.figureId!);
	expect(el).toBeDefined();
	expect(isParametricCurve(el!)).toBe(true);
	return el as unknown as PolarCurve;
}

// =============================================================================
// A. Nominal creation
// =============================================================================

describe('courbe — polar (A. nominal creation)', () => {
	it('A1. r = 2*cos(theta) on [0, π] creates a polar curve (circle)', () => {
		const script = `c = courbe("r = 2*cos(theta)", theta_min=0, theta_max=${Math.PI})`;
		const { figure, symbols } = runDsl(script);

		const entry = symbols.get('c');
		expect(entry).toBeDefined();
		expect(entry!.type).toBe('courbe');

		const el = figure.getElementById(entry!.figureId!);
		expect(el).toBeDefined();
		expect(isParametricCurve(el!)).toBe(true);

		const pc = el as unknown as PolarCurve;

		// TODO Phase 3: these fields will be added to GeoParametricCurve
		expect(pc.polar).toBe(true);
		// equationR stores the RHS of r = ..., normalized with ASCII theta
		expect(pc.equationR).toBe('2*cos(theta)');
		// parameter must be 'theta'
		expect(pc.parameter).toBe('theta');
		// bounds
		expect(pc.tMin).toEqual(numeric(0));
		expect(pc.tMax).toEqual(numeric(Math.PI));
	});

	it('A2. r = 1 - cos(theta) on [0, 2π] creates a cardioid, x/y values correct at theta=0', () => {
		const script = `c = courbe("r = 1 - cos(theta)", theta_min=0, theta_max=${2 * Math.PI})`;
		const pc = getPolarCurve(script);

		expect(pc.polar).toBe(true);

		// r(0) = 1 - cos(0) = 0 → x = 0·cos(0) = 0, y = 0·sin(0) = 0
		expect(pc.compiledX({ theta: 0 })).toBeCloseTo(0, 10);
		expect(pc.compiledY({ theta: 0 })).toBeCloseTo(0, 10);

		// r(π) = 1 - cos(π) = 2 → x = 2·cos(π) = -2, y = 2·sin(π) ≈ 0
		expect(pc.compiledX({ theta: Math.PI })).toBeCloseTo(-2, 6);
		expect(pc.compiledY({ theta: Math.PI })).toBeCloseTo(0, 6);
	});

	it('A3. r = sin(2*theta) on [0, 2π] creates a 4-petal rose, polar=true', () => {
		const script = `c = courbe("r = sin(2*theta)", theta_min=0, theta_max=${2 * Math.PI})`;
		const pc = getPolarCurve(script);

		expect(pc.polar).toBe(true);
		expect(pc.parameter).toBe('theta');
	});

	it("A4. r = theta on [0, 6π] creates Archimedes' spiral, polar=true", () => {
		const script = `c = courbe("r = theta", theta_min=0, theta_max=${6 * Math.PI})`;
		const pc = getPolarCurve(script);

		expect(pc.polar).toBe(true);
		// At theta = π: r = π, x = π·cos(π) = -π, y = π·sin(π) ≈ 0
		expect(pc.compiledX({ theta: Math.PI })).toBeCloseTo(-Math.PI, 5);
		expect(pc.compiledY({ theta: Math.PI })).toBeCloseTo(0, 5);
	});

	it('A5. r = 2 (constant) on [0, 2π] creates a circle of radius 2', () => {
		const script = `c = courbe("r = 2", theta_min=0, theta_max=${2 * Math.PI})`;
		const pc = getPolarCurve(script);

		expect(pc.polar).toBe(true);

		// At theta=0: x = 2·cos(0) = 2, y = 2·sin(0) = 0
		expect(pc.compiledX({ theta: 0 })).toBeCloseTo(2, 10);
		expect(pc.compiledY({ theta: 0 })).toBeCloseTo(0, 10);

		// At theta=π/2: x = 2·cos(π/2) ≈ 0, y = 2·sin(π/2) = 2
		expect(pc.compiledX({ theta: Math.PI / 2 })).toBeCloseTo(0, 6);
		expect(pc.compiledY({ theta: Math.PI / 2 })).toBeCloseTo(2, 6);
	});
});

// =============================================================================
// B. Variable angulaire \theta LaTeX
// =============================================================================

describe('courbe — polar (B. LaTeX \\theta normalization)', () => {
	it('B1. r = \\theta (LaTeX escape) is accepted and normalized to theta ASCII', () => {
		// In the DSL string literal, the user writes \theta (single backslash).
		// In a JS template literal, `\\` produces one backslash → the DSL sees "r = \theta".
		// The tokenizer normalizes \theta → theta internally.
		const script = `c = courbe("r = \\theta", theta_min=0, theta_max=${2 * Math.PI})`;
		const pc = getPolarCurve(script);

		expect(pc.polar).toBe(true);
		expect(pc.parameter).toBe('theta');

		// At theta = 1: r = 1, x = 1·cos(1), y = 1·sin(1)
		expect(pc.compiledX({ theta: 1 })).toBeCloseTo(Math.cos(1), 8);
		expect(pc.compiledY({ theta: 1 })).toBeCloseTo(Math.sin(1), 8);
	});
});

// =============================================================================
// C. Reactivity (dependsOn)
// =============================================================================

describe('courbe — polar (C. reactivity / dependsOn)', () => {
	it('C1. slider a in r = a*cos(theta) adds a to dependsOn', () => {
		const script = [
			`a = slider(min=0.5, max=5, valeur=2)`,
			`c = courbe("r = a*cos(theta)", theta_min=0, theta_max=${2 * Math.PI})`
		].join('\n');
		const { figure, symbols } = runDsl(script);

		const aId = symbols.get('a')!.figureId!;
		const pc = figure.getElementById(symbols.get('c')!.figureId!) as GeoParametricCurve;

		expect(isParametricCurve(pc)).toBe(true);
		expect(pc.dependsOn).toContain(aId);
	});

	it('C2. slider s used as theta_max adds s to dependsOn', () => {
		const script = [
			`s = slider(min=0, max=${2 * Math.PI}, valeur=${Math.PI})`,
			`c = courbe("r = 2", theta_min=0, theta_max=s)`
		].join('\n');
		const { figure, symbols } = runDsl(script);

		const sId = symbols.get('s')!.figureId!;
		const pc = figure.getElementById(symbols.get('c')!.figureId!) as GeoParametricCurve;

		expect(isParametricCurve(pc)).toBe(true);
		expect(pc.dependsOn).toContain(sId);
	});
});

// =============================================================================
// D. Errors
// =============================================================================

describe('courbe — polar (D. errors)', () => {
	it('D1. r = 2 without theta_min/theta_max throws with explicit message', () => {
		const script = `c = courbe("r = 2")`;
		expect(() => runDsl(script)).toThrow(
			/theta_min et theta_max obligatoires pour une courbe polaire/
		);
	});

	it('D2. theta_min >= theta_max throws with explicit message', () => {
		const script = `c = courbe("r = 2*cos(theta)", theta_min=1, theta_max=0)`;
		expect(() => runDsl(script)).toThrow(/theta_max doit être strictement supérieur à theta_min/);
	});

	it('D3. r = a*sin(t) — free variable t instead of theta throws', () => {
		// The variable t is not theta, so polar expects theta but sees t.
		const script = `c = courbe("r = sin(t)", theta_min=0, theta_max=${2 * Math.PI})`;
		expect(() => runDsl(script)).toThrow(/paramètre polaire attendu : theta/);
	});

	it('D4. r = 2*cos(theta) with t_min/t_max instead of theta_min/theta_max throws', () => {
		// User mistakenly passes t_min/t_max for a polar curve.
		// The spec requires: error mentions theta_min/theta_max AND mentions pas t_min/t_max.
		// We check both parts in separate assertions (two runDsl calls on the same script).
		const script = `c = courbe("r = 2*cos(theta)", t_min=0, t_max=${Math.PI})`;
		// Part 1: message mentions theta_min/theta_max
		expect(() => runDsl(script)).toThrow(/theta_min.*theta_max|theta_min|theta_max/);
		// Part 2: message explicitly rejects t_min/t_max
		expect(() => runDsl(script)).toThrow(/pas t_min.*t_max|t_min.*t_max.*pas|utilisez theta_min/i);
	});

	it('D5. two positional strings where one is r=... throws with clear message', () => {
		// "r = ..." must be used alone; mixing with "y = ..." is invalid.
		const script = `c = courbe("r = 2", "y = sin(t)", theta_min=0, theta_max=${2 * Math.PI})`;
		expect(() => runDsl(script)).toThrow(/r = .* attendu seul/);
	});

	it('D6. r = 1/x — free variable x (not theta) throws', () => {
		const script = `c = courbe("r = 1/x", theta_min=0, theta_max=${2 * Math.PI})`;
		expect(() => runDsl(script)).toThrow(/paramètre polaire attendu : theta/);
	});
});

// =============================================================================
// E. Serialization
// =============================================================================

describe('courbe — polar (E. serialization)', () => {
	it('E1. round-trip: parse → serialize → reparse preserves polar=true and equationR', () => {
		const script = `c = courbe("r = 2*cos(theta)", theta_min=0, theta_max=${Math.PI})`;
		const { figure, symbols } = runDsl(script);

		// Serialize to DSL string
		const serialized = serializeDsl(figure, symbols);

		// The serialized form should reconstruct the polar call, not expose
		// the internal x/y parametric form.
		// Expected form: c = courbe("r = 2*cos(theta)", theta_min=0, theta_max=<pi>)
		expect(serialized).toContain('r = 2*cos(theta)');
		expect(serialized).toContain('theta_min=');
		expect(serialized).toContain('theta_max=');

		// Reparse the serialized script
		const { figure: fig2, symbols: sym2 } = runDsl(serialized);
		const entry2 = sym2.get('c');
		expect(entry2).toBeDefined();
		const el2 = fig2.getElementById(entry2!.figureId!);
		expect(isParametricCurve(el2!)).toBe(true);

		// TODO Phase 3: polar and equationR fields must survive the round-trip
		const pc2 = el2 as unknown as PolarCurve;
		expect(pc2.polar).toBe(true);
		expect(pc2.equationR).toBe('2*cos(theta)');
	});

	it('E2. slider in theta_max is serialized as symbolic name, not numeric value', () => {
		const script = [
			`s = slider(min=0, max=${2 * Math.PI}, valeur=${Math.PI})`,
			`c = courbe("r = 2", theta_min=0, theta_max=s)`
		].join('\n');
		const { figure, symbols } = runDsl(script);

		const serialized = serializeDsl(figure, symbols);

		// The serialized output must use the symbolic slider name "s", not the
		// numeric value (Math.PI ≈ 3.14159...), so that the script is editable.
		expect(serialized).toContain('theta_max=s');
	});
});

// =============================================================================
// F. Sampling
// =============================================================================

describe('courbe — polar (F. sampling)', () => {
	it('F1. cardioid r = 1 - cos(theta) on [0, 2π]: ≥ 100 samples and closed=true', () => {
		const script = `c = courbe("r = 1 - cos(theta)", theta_min=0, theta_max=${2 * Math.PI})`;
		const { figure, symbols } = runDsl(script);
		const curveId = symbols.get('c')!.figureId!;

		// Use figure.computeParametricCurveSampling (same as parametric-curve-svg tests).
		const result = figure.computeParametricCurveSampling(curveId);
		expect(result).not.toBeNull();
		expect(result!.points.length).toBeGreaterThanOrEqual(100);

		// Cardioid starts and ends at (0, 0) over [0, 2π] → closed.
		expect(result!.closed).toBe(true);

		// All sampled points must be finite numbers.
		for (const p of result!.points) {
			expect(Number.isFinite(p.x)).toBe(true);
			expect(Number.isFinite(p.y)).toBe(true);
		}
	});

	it('F2. Archimedes spiral r = theta on [0, 6π]: ≥ 100 samples and closed=false', () => {
		const script = `c = courbe("r = theta", theta_min=0, theta_max=${6 * Math.PI})`;
		const { figure, symbols } = runDsl(script);
		const curveId = symbols.get('c')!.figureId!;

		const result = figure.computeParametricCurveSampling(curveId);
		expect(result).not.toBeNull();
		expect(result!.points.length).toBeGreaterThanOrEqual(100);

		// Spiral: start (0,0) at theta=0, end (6π·cos(6π), 6π·sin(6π)) = (6π, 0) → not closed.
		expect(result!.closed).toBe(false);

		// All sampled points must be finite numbers.
		for (const p of result!.points) {
			expect(Number.isFinite(p.x)).toBe(true);
			expect(Number.isFinite(p.y)).toBe(true);
		}
	});
});

// =============================================================================
// G. Edge cases (added during code review enrichment)
// =============================================================================

describe('courbe — polar (G. edge cases)', () => {
	it('G1. negative theta_min: r = 1 + cos(theta) on [-π, π] is accepted', () => {
		const script = `c = courbe("r = 1 + cos(theta)", theta_min=${-Math.PI}, theta_max=${Math.PI})`;
		const pc = getPolarCurve(script);
		expect(pc.polar).toBe(true);
		expect(pc.tMin).toEqual(numeric(-Math.PI));
		expect(pc.tMax).toEqual(numeric(Math.PI));
		// r(-π) = 1 + cos(-π) = 0 → x = 0, y = 0
		expect(pc.compiledX({ theta: -Math.PI })).toBeCloseTo(0, 6);
		expect(pc.compiledY({ theta: -Math.PI })).toBeCloseTo(0, 6);
	});

	it('G2. negative r constant: r = -1 on [0, 2π] is accepted (circle radius 1, phase-flipped)', () => {
		const script = `c = courbe("r = -1", theta_min=0, theta_max=${2 * Math.PI})`;
		const pc = getPolarCurve(script);
		expect(pc.polar).toBe(true);
		// At theta=0: x = -1·cos(0) = -1, y = -1·sin(0) = 0
		expect(pc.compiledX({ theta: 0 })).toBeCloseTo(-1, 10);
		expect(pc.compiledY({ theta: 0 })).toBeCloseTo(0, 10);
		// At theta=π/2: x = -1·cos(π/2) ≈ 0, y = -1·sin(π/2) = -1
		expect(pc.compiledX({ theta: Math.PI / 2 })).toBeCloseTo(0, 6);
		expect(pc.compiledY({ theta: Math.PI / 2 })).toBeCloseTo(-1, 6);
	});

	it('G3. slider in r AND in theta_max: dependsOn contains both ids', () => {
		const script = [
			'a = slider(min=1, max=3, valeur=2)',
			`s = slider(min=0, max=${2 * Math.PI}, valeur=${Math.PI})`,
			'c = courbe("r = a*cos(theta)", theta_min=0, theta_max=s)'
		].join('\n');
		const { figure, symbols } = runDsl(script);
		const aId = symbols.get('a')!.figureId!;
		const sId = symbols.get('s')!.figureId!;
		const pc = figure.getElementById(symbols.get('c')!.figureId!) as GeoParametricCurve;
		expect(pc.dependsOn).toContain(aId);
		expect(pc.dependsOn).toContain(sId);
	});

	it('G4. unite_angle("degrees") active: polar curve still samples in radians', () => {
		// Even when angleMode=degrees globally, the polar branch must work in radians.
		// 4-petal rose r = sin(2*theta): at theta = π/4, r = sin(π/2) = 1
		// → x = 1·cos(π/4) = √2/2 ≈ 0.7071
		const script = [
			'unite_angle("degrees")',
			`c = courbe("r = sin(2*theta)", theta_min=0, theta_max=${2 * Math.PI})`
		].join('\n');
		const pc = getPolarCurve(script);
		expect(pc.polar).toBe(true);
		expect(pc.compiledX({ theta: Math.PI / 4 })).toBeCloseTo(Math.sqrt(2) / 2, 5);
		expect(pc.compiledY({ theta: Math.PI / 4 })).toBeCloseTo(Math.sqrt(2) / 2, 5);
	});

	it('G5. theta_min == theta_max throws D2 (strictement supérieur)', () => {
		const script = `c = courbe("r = 2", theta_min=1, theta_max=1)`;
		expect(() => runDsl(script)).toThrow(/theta_max doit être strictement supérieur à theta_min/);
	});

	it('G6. sliders in both bounds: D2 skipped, dependsOn contains both', () => {
		// When both bounds are scalar refs, the numeric inversion check is skipped.
		const script = [
			`smin = slider(min=0, max=${Math.PI}, valeur=0)`,
			`smax = slider(min=${Math.PI}, max=${2 * Math.PI}, valeur=${2 * Math.PI})`,
			'c = courbe("r = 2*cos(theta)", theta_min=smin, theta_max=smax)'
		].join('\n');
		const { figure, symbols } = runDsl(script);
		const sminId = symbols.get('smin')!.figureId!;
		const smaxId = symbols.get('smax')!.figureId!;
		const pc = figure.getElementById(symbols.get('c')!.figureId!) as GeoParametricCurve;
		expect(pc.dependsOn).toContain(sminId);
		expect(pc.dependsOn).toContain(smaxId);
	});
});
