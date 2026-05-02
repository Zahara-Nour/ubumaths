/**
 * Phase 2 — courbe() with 2 string equations creates a parametric curve.
 *
 * Tests cover:
 *   A. Nominal creation (circle, parabola, cardioid, Lissajous, with scalar/slider).
 *   B. Equation order swap (y= then x=) is accepted and normalized.
 *   C. Explicit param= override.
 *   D. Error cases (missing bounds, both x/both y, bad LHS, ambiguous param, ...).
 *   E. Differentiation and compilation behaviour.
 *   F. Reactivity (dependsOn collects scalar/slider ids).
 */

import { describe, it, expect } from 'vitest';
import { runDsl } from '../index';
import { DslRuntimeError } from '../errors';
import type { GeoParametricCurve } from '../../types/elements';
import { isParametricCurve } from '../../types/elements';
import { numeric } from '../../types/geo-value';

// =============================================================================
// A. Nominal creation
// =============================================================================

describe('courbe — parametric (A. nominal creation)', () => {
	it('A1. creates a parametric circle from cos(t)/sin(t)', () => {
		const script = `c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${2 * Math.PI})`;
		const { figure, symbols } = runDsl(script);
		const entry = symbols.get('c');
		expect(entry).toBeDefined();
		expect(entry!.type).toBe('courbe');
		const el = figure.getElementById(entry!.figureId!);
		expect(el).toBeDefined();
		expect(isParametricCurve(el!)).toBe(true);
		const pc = el as GeoParametricCurve;
		expect(pc.parameter).toBe('t');
		expect(pc.equationX).toBe('x = cos(t)');
		expect(pc.equationY).toBe('y = sin(t)');
		expect(pc.tMin).toEqual(numeric(0));
		expect(pc.tMax).toEqual(numeric(2 * Math.PI));
	});

	it('A2. creates a parametric parabola (t, t^2)', () => {
		const script = `c = courbe("x = t", "y = t^2", t_min=-2, t_max=2)`;
		const { figure, symbols } = runDsl(script);
		const pc = figure.getElementById(symbols.get('c')!.figureId!) as GeoParametricCurve;
		expect(isParametricCurve(pc)).toBe(true);
		expect(pc.parameter).toBe('t');
		expect(pc.compiledX({ t: 3 })).toBeCloseTo(3, 10);
		expect(pc.compiledY({ t: 3 })).toBeCloseTo(9, 10);
	});

	it('A3. uses theta (Greek) as auto-detected parameter', () => {
		// `\theta` is the parser's syntax for the Greek letter theta. In a JS template
		// literal `\\` produces a single backslash, which is then passed as-is to the
		// DSL string literal (the DSL tokenizer does not interpret escapes).
		const script = `c = courbe("x = cos(\\theta)", "y = sin(\\theta)", t_min=0, t_max=${2 * Math.PI})`;
		const { figure, symbols } = runDsl(script);
		const pc = figure.getElementById(symbols.get('c')!.figureId!) as GeoParametricCurve;
		expect(pc.parameter).toBe('theta');
	});

	it('A4. creates a cardioid (1+cos(t))cos(t), (1+cos(t))sin(t)', () => {
		const script = `c = courbe("x = (1 + cos(t)) * cos(t)", "y = (1 + cos(t)) * sin(t)", t_min=0, t_max=${2 * Math.PI})`;
		const { figure, symbols } = runDsl(script);
		const pc = figure.getElementById(symbols.get('c')!.figureId!) as GeoParametricCurve;
		expect(pc.parameter).toBe('t');
		// At t=0: x = (1+1)*1 = 2, y = 0
		expect(pc.compiledX({ t: 0 })).toBeCloseTo(2, 10);
		expect(pc.compiledY({ t: 0 })).toBeCloseTo(0, 10);
	});

	it('A5. with scalar a defined before (slider), auto-detects t and depends on a', () => {
		const script = [
			`a = slider(min=1, max=5, valeur=3)`,
			`c = courbe("x = a * cos(t)", "y = a * sin(t)", t_min=0, t_max=${2 * Math.PI})`
		].join('\n');
		const { figure, symbols } = runDsl(script);
		const aId = symbols.get('a')!.figureId!;
		const pc = figure.getElementById(symbols.get('c')!.figureId!) as GeoParametricCurve;
		expect(pc.parameter).toBe('t');
		expect(pc.dependsOn).toContain(aId);
	});

	it('A6. creates a Lissajous curve', () => {
		const script = `c = courbe("x = sin(2 * t)", "y = sin(3 * t)", t_min=0, t_max=${2 * Math.PI})`;
		const { figure, symbols } = runDsl(script);
		const pc = figure.getElementById(symbols.get('c')!.figureId!) as GeoParametricCurve;
		expect(isParametricCurve(pc)).toBe(true);
		expect(pc.parameter).toBe('t');
	});
});

// =============================================================================
// B. Equation order swap
// =============================================================================

describe('courbe — parametric (B. equation order swap)', () => {
	it('B1. accepts (y=..., x=...) order', () => {
		const script = `c = courbe("y = sin(t)", "x = cos(t)", t_min=0, t_max=${2 * Math.PI})`;
		const { figure, symbols } = runDsl(script);
		const pc = figure.getElementById(symbols.get('c')!.figureId!) as GeoParametricCurve;
		expect(isParametricCurve(pc)).toBe(true);
		// Even when input order was swapped, x=... and y=... are stored coherently.
		expect(pc.compiledX({ t: 0 })).toBeCloseTo(1, 10); // cos(0) = 1
		expect(pc.compiledY({ t: Math.PI / 2 })).toBeCloseTo(1, 10); // sin(pi/2) = 1
	});

	it('B2. equationX/equationY stored in canonical x-then-y order regardless of input', () => {
		const script = `c = courbe("y = sin(t)", "x = cos(t)", t_min=0, t_max=${2 * Math.PI})`;
		const { figure, symbols } = runDsl(script);
		const pc = figure.getElementById(symbols.get('c')!.figureId!) as GeoParametricCurve;
		expect(pc.equationX).toBe('x = cos(t)');
		expect(pc.equationY).toBe('y = sin(t)');
	});
});

// =============================================================================
// C. Explicit param=
// =============================================================================

describe('courbe — parametric (C. explicit param=)', () => {
	it('C1. param="t" forces t even when an undefined symbol "a" appears', () => {
		// Without param, "a" + "t" would be ambiguous.
		const script = `c = courbe("x = a * cos(t)", "y = a * sin(t)", t_min=0, t_max=${2 * Math.PI}, param="t")`;
		const { figure, symbols } = runDsl(script);
		const pc = figure.getElementById(symbols.get('c')!.figureId!) as GeoParametricCurve;
		expect(pc.parameter).toBe('t');
	});

	it('C2. param="u" but u absent from both RHS throws', () => {
		const script = `c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=1, param="u")`;
		expect(() => runDsl(script)).toThrow(DslRuntimeError);
	});

	it('C3. param="x" or param="y" is rejected (reserved for coordinates)', () => {
		const scriptX = `c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=1, param="x")`;
		const scriptY = `c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=1, param="y")`;
		expect(() => runDsl(scriptX)).toThrow(/réservé/);
		expect(() => runDsl(scriptY)).toThrow(/réservé/);
	});
});

// =============================================================================
// D. Errors
// =============================================================================

describe('courbe — parametric (D. errors)', () => {
	it('D1. throws when t_min is missing', () => {
		const script = `c = courbe("x = cos(t)", "y = sin(t)", t_max=${2 * Math.PI})`;
		expect(() => runDsl(script)).toThrow(/t_min.*t_max.*obligatoires/);
	});

	it('D1b. throws when t_max is missing', () => {
		const script = `c = courbe("x = cos(t)", "y = sin(t)", t_min=0)`;
		expect(() => runDsl(script)).toThrow(/t_min.*t_max.*obligatoires/);
	});

	it('D2. throws when t_min >= t_max (numeric, statically detectable)', () => {
		const script = `c = courbe("x = cos(t)", "y = sin(t)", t_min=5, t_max=2)`;
		expect(() => runDsl(script)).toThrow(/t_max.*strictement supérieur.*t_min/);
	});

	it('D3. throws when both equations are in x', () => {
		const script = `c = courbe("x = cos(t)", "x = sin(t)", t_min=0, t_max=1)`;
		expect(() => runDsl(script)).toThrow(/équation en x.*y/);
	});

	it('D4. throws when both equations are in y', () => {
		const script = `c = courbe("y = cos(t)", "y = sin(t)", t_min=0, t_max=1)`;
		expect(() => runDsl(script)).toThrow(/équation en x.*y/);
	});

	it('D5. throws when LHS is z (not x or y)', () => {
		const script = `c = courbe("z = cos(t)", "y = sin(t)", t_min=0, t_max=1)`;
		expect(() => runDsl(script)).toThrow(/non reconnu|utilise x, y|"z"/);
	});

	it('D6. throws when an equation is not a relation (no =)', () => {
		const script = `c = courbe("cos(t)", "y = sin(t)", t_min=0, t_max=1)`;
		expect(() => runDsl(script)).toThrow(/attendu.*"x = .*"|"y = .*"|équation invalide/);
	});

	it('D7. throws when x and y use different parameter names', () => {
		const script = `c = courbe("x = cos(t)", "y = sin(u)", t_min=0, t_max=1)`;
		expect(() => runDsl(script)).toThrow(/paramètre incohérent|incohérent/);
	});

	it('D8. throws on ambiguous parameter (>=2 free vars)', () => {
		// Both a and t are free; without a defined symbol or param=, it's ambiguous.
		const script = `c = courbe("x = a * cos(t)", "y = a * sin(t)", t_min=0, t_max=1)`;
		expect(() => runDsl(script)).toThrow(/ambigu|précisez param/);
	});

	it('D9. throws when no free variable is present (constant curve)', () => {
		const script = `c = courbe("x = 1", "y = 1", t_min=0, t_max=1)`;
		expect(() => runDsl(script)).toThrow(/aucune variable.*paramètre|paramètre.*détecté/);
	});

	it('D10. throws when 1 string + t_min is given', () => {
		const script = `c = courbe("y = x^2", t_min=0, t_max=1)`;
		expect(() => runDsl(script)).toThrow(/t_min.*paramétrique|t_max.*paramétrique/);
	});

	it('D11. throws when 0 positional strings are given', () => {
		const script = `c = courbe(t_min=0, t_max=1)`;
		expect(() => runDsl(script)).toThrow(DslRuntimeError);
	});

	it('D12. throws when 3 positional strings are given', () => {
		const script = `c = courbe("x = cos(t)", "y = sin(t)", "z = t", t_min=0, t_max=1)`;
		expect(() => runDsl(script)).toThrow(DslRuntimeError);
	});
});

// =============================================================================
// E. Differentiation and compilation
// =============================================================================

describe('courbe — parametric (E. differentiation and compilation)', () => {
	it('E1. standard cos/sin curve has non-null xDerivative and yDerivative', () => {
		const script = `c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${2 * Math.PI})`;
		const { figure, symbols } = runDsl(script);
		const pc = figure.getElementById(symbols.get('c')!.figureId!) as GeoParametricCurve;
		expect(pc.xDerivative).not.toBeNull();
		expect(pc.yDerivative).not.toBeNull();
		expect(pc.compiledXPrime).not.toBeNull();
		expect(pc.compiledYPrime).not.toBeNull();
		// At t=0: dx/dt = -sin(0) = 0, dy/dt = cos(0) = 1
		expect(pc.compiledXPrime!({ t: 0 })).toBeCloseTo(0, 10);
		expect(pc.compiledYPrime!({ t: 0 })).toBeCloseTo(1, 10);
	});

	it('E2. polynomial curve compiles successfully (xDerivative non-null)', () => {
		const script = `c = courbe("x = t^3 - t", "y = t^2", t_min=-2, t_max=2)`;
		const { figure, symbols } = runDsl(script);
		const pc = figure.getElementById(symbols.get('c')!.figureId!) as GeoParametricCurve;
		// Even with non-trivial expressions, our differentiation handles polynomials.
		expect(pc.xDerivative).not.toBeNull();
		expect(pc.yDerivative).not.toBeNull();
		// dy/dt = 2t at t=3 → 6
		expect(pc.compiledYPrime!({ t: 3 })).toBeCloseTo(6, 10);
	});

	it('E3. RHS that fails to parse throws a clear DSL error', () => {
		const script = `c = courbe("x = cos((", "y = sin(t)", t_min=0, t_max=1)`;
		expect(() => runDsl(script)).toThrow(/syntaxe|courbe/);
	});
});

// =============================================================================
// F. Reactivity (dependsOn)
// =============================================================================

describe('courbe — parametric (F. reactivity / dependsOn)', () => {
	it('F1. t_max referencing a slider adds it to dependsOn', () => {
		const script = [
			`m = slider(min=1, max=10, valeur=${2 * Math.PI})`,
			`c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=m)`
		].join('\n');
		const { figure, symbols } = runDsl(script);
		const mId = symbols.get('m')!.figureId!;
		const pc = figure.getElementById(symbols.get('c')!.figureId!) as GeoParametricCurve;
		expect(pc.dependsOn).toContain(mId);
	});

	it('F2. slider a used in x(t) and y(t) is in dependsOn', () => {
		const script = [
			`a = slider(min=1, max=5, valeur=3)`,
			`c = courbe("x = a * cos(t)", "y = a * sin(t)", t_min=0, t_max=${2 * Math.PI})`
		].join('\n');
		const { figure, symbols } = runDsl(script);
		const aId = symbols.get('a')!.figureId!;
		const pc = figure.getElementById(symbols.get('c')!.figureId!) as GeoParametricCurve;
		expect(pc.dependsOn).toContain(aId);
	});

	it('F3. autonomous curve has empty dependsOn', () => {
		const script = `c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=${2 * Math.PI})`;
		const { figure, symbols } = runDsl(script);
		const pc = figure.getElementById(symbols.get('c')!.figureId!) as GeoParametricCurve;
		expect(pc.dependsOn).toEqual([]);
	});
});
