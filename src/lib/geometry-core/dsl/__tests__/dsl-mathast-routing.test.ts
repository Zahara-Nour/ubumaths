/**
 * Tests for routing math-pure RHS through mathAST's parseCustom().
 *
 * Phase 3 of dsl-mathast-routing plan: STATIC routing only (no scalar deps).
 *
 * - Constants \pi and e accessible at top level via mathAST
 * - Math functions (sqrt, exp, ln, log, abs, ceil, floor, …) accessible via mathAST
 * - Static variables substituted into mathAST nodes
 * - Trig functions (sin/cos/tan/asin/acos/atan) intentionally LEFT on the
 *   existing DSL path for V1: angle-mode integration is Phase 5. Tests here
 *   verify they still work in the legacy degrees-default mode.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';

function run(source: string) {
	return interpret(parse(source));
}

function getNumber(symbols: ReturnType<typeof run>['symbols'], name: string): number {
	const entry = symbols.get(name);
	if (!entry) throw new Error(`Symbol "${name}" not found`);
	if (entry.type !== 'nombre')
		throw new Error(`Symbol "${name}" is not a number (got ${entry.type})`);
	return entry.value!;
}

describe('Phase 3 — Constants \\pi and e', () => {
	it('A1: r = \\pi', () => {
		const { symbols } = run('r = \\pi');
		expect(getNumber(symbols, 'r')).toBeCloseTo(Math.PI, 10);
	});

	it('A2: r = e', () => {
		const { symbols } = run('r = e');
		expect(getNumber(symbols, 'r')).toBeCloseTo(Math.E, 10);
	});

	it('A3a: r = 2 * \\pi', () => {
		const { symbols } = run('r = 2 * \\pi');
		expect(getNumber(symbols, 'r')).toBeCloseTo(2 * Math.PI, 10);
	});

	it('A3b: r = \\pi / 2', () => {
		const { symbols } = run('r = \\pi / 2');
		expect(getNumber(symbols, 'r')).toBeCloseTo(Math.PI / 2, 10);
	});

	it('A3c: r = -\\pi', () => {
		const { symbols } = run('r = -\\pi');
		expect(getNumber(symbols, 'r')).toBeCloseTo(-Math.PI, 10);
	});

	it('A3d: r = e^2', () => {
		const { symbols } = run('r = e^2');
		expect(getNumber(symbols, 'r')).toBeCloseTo(Math.E * Math.E, 10);
	});

	it('A4: \\pi accepted in builtin args (slider with named bounds)', () => {
		const { figure, symbols } = run('s = slider(min=-\\pi, max=\\pi, valeur=0)');
		const id = symbols.get('s')?.figureId;
		expect(id).toBeDefined();
		const el = figure.getElementById(id!);
		expect(el?.type).toBe('slider');
	});
});

describe('Phase 3 — Math functions (non-trig) via mathAST', () => {
	it('B1: r = sqrt(2)', () => {
		const { symbols } = run('r = sqrt(2)');
		expect(getNumber(symbols, 'r')).toBeCloseTo(Math.SQRT2, 10);
	});

	it('B2: r = exp(-1)', () => {
		const { symbols } = run('r = exp(-1)');
		expect(getNumber(symbols, 'r')).toBeCloseTo(1 / Math.E, 10);
	});

	it('B3: r = abs(-3) + ceil(2.3) (mathAST: abs and ceil)', () => {
		const { symbols } = run('r = abs(-3) + ceil(2.3)');
		expect(getNumber(symbols, 'r')).toBeCloseTo(6, 10);
	});

	it('B4a: r = ln(e) → 1', () => {
		const { symbols } = run('r = ln(e)');
		expect(getNumber(symbols, 'r')).toBeCloseTo(1, 10);
	});

	it('B4b: r = log(100) → 2 (base-10 log in mathAST)', () => {
		const { symbols } = run('r = log(100)');
		expect(getNumber(symbols, 'r')).toBeCloseTo(2, 10);
	});

	it('B8: unknown function r = wibble(2) → clear error', () => {
		expect(() => run('r = wibble(2)')).toThrow();
	});

	it('B9: combination constants + functions: phi = (1 + sqrt(5)) / 2', () => {
		const { symbols } = run('phi = (1 + sqrt(5)) / 2');
		expect(getNumber(symbols, 'phi')).toBeCloseTo(1.6180339887, 9);
	});
});

describe('Phase 3 — Static variables (no scalar deps)', () => {
	it('C1: r = 3 ; lecture r → 3', () => {
		const { symbols } = run('r = 3');
		expect(getNumber(symbols, 'r')).toBe(3);
	});

	it('C2: r = 2 * \\pi (static)', () => {
		const { symbols } = run('r = 2 * \\pi');
		expect(getNumber(symbols, 'r')).toBeCloseTo(2 * Math.PI, 10);
	});

	it('C3: a = 5 ; b = a + 1 → b = 6 (substitution mathAST)', () => {
		const { symbols } = run('a = 5\nb = a + 1');
		expect(getNumber(symbols, 'b')).toBe(6);
	});

	it('C4: phi = (1 + sqrt(5)) / 2 → 1.618…', () => {
		const { symbols } = run('phi = (1 + sqrt(5)) / 2');
		expect(getNumber(symbols, 'phi')).toBeCloseTo(1.6180339887, 9);
	});

	it('C5: réassignation r = 1 ; r = 2 — la 2e prévaut', () => {
		const { symbols } = run('r = 1\nr = 2');
		expect(getNumber(symbols, 'r')).toBe(2);
	});

	it('C6: référence avant définition → erreur claire', () => {
		expect(() => run('r = inconnue + 1')).toThrow(/inconnue/i);
	});

	it('C7: chained substitution a + b + c', () => {
		const { symbols } = run('a = 1\nb = 2\nc = 3\nd = a + b + c');
		expect(getNumber(symbols, 'd')).toBe(6);
	});
});

describe('Phase 3 — Backward compat: trig functions still on DSL path', () => {
	it('sin(45) in degrees mode (DSL path) ≈ 0.707', () => {
		// V1: trig functions are NOT routed through mathAST yet (Phase 5).
		// They stay on the existing DSL evaluateMathFunction which uses degrees.
		const { symbols } = run('r = sin(45)');
		expect(getNumber(symbols, 'r')).toBeCloseTo(Math.sin((45 * Math.PI) / 180), 10);
	});

	it('cos(60) in degrees mode → 0.5', () => {
		const { symbols } = run('r = cos(60)');
		expect(getNumber(symbols, 'r')).toBeCloseTo(0.5, 10);
	});

	it('mixed: r = sqrt(2) + sin(45) — falls back to DSL path due to trig', () => {
		const { symbols } = run('r = sqrt(2) + sin(45)');
		expect(getNumber(symbols, 'r')).toBeCloseTo(Math.SQRT2 + Math.sin((45 * Math.PI) / 180), 10);
	});
});

describe('Phase 3 — Backward compat: builtins unchanged', () => {
	it('point(2, 3) still creates a point', () => {
		const { symbols, figure } = run('P = point(2, 3)');
		const id = symbols.get('P')?.figureId;
		expect(id).toBeDefined();
		const el = figure.getElementById(id!);
		// `point(x, y)` with literal coords creates a freePoint (draggable).
		expect(el?.type).toBe('freePoint');
	});

	it('mixed builtin + math: P = point(\\pi, 2*\\pi) — math args evaluated', () => {
		const { symbols } = run('P = point(\\pi, 2*\\pi)');
		const id = symbols.get('P')?.figureId;
		expect(id).toBeDefined();
	});
});
