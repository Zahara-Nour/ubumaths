/**
 * Tests for the global angle mode and the `unite_angle()` builtin.
 *
 * Phase 5 of dsl-mathast-routing plan.
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
	if (entry.type !== 'nombre') throw new Error(`Symbol "${name}" is not a number`);
	return entry.value!;
}

describe('Phase 5 — Default mode is degrees', () => {
	it('F1a: r = sin(45) (no unite_angle) ≈ 0.707 (degrees default)', () => {
		const { symbols } = run('r = sin(45)');
		expect(getNumber(symbols, 'r')).toBeCloseTo(Math.sin((45 * Math.PI) / 180), 10);
	});

	it('F1b: r = cos(60) (no unite_angle) → 0.5', () => {
		const { symbols } = run('r = cos(60)');
		expect(getNumber(symbols, 'r')).toBeCloseTo(0.5, 10);
	});

	it('F1c: existing arc(O, debut=45, fin=180) builtin unchanged in degrees default', () => {
		// Smoke test: builtin still accepts degree values without modification.
		const { figure, symbols } = run('O = point(0, 0)\na = arc(O, rayon=1, debut=0, fin=90)');
		const id = symbols.get('a')?.figureId;
		expect(id).toBeDefined();
		// arc(O, rayon, debut, fin) creates an `arcByAngles` element.
		expect(figure.getElementById(id!)?.type).toBe('arcByAngles');
	});
});

describe('Phase 5 — unite_angle("radians") switches to radians', () => {
	it('F2: unite_angle("radians") then sin(\\pi/4) ≈ 0.707', () => {
		const { symbols } = run('unite_angle("radians")\nr = sin(\\pi/4)');
		expect(getNumber(symbols, 'r')).toBeCloseTo(Math.SQRT2 / 2, 10);
	});

	it('F3: cos(\\pi/3) in radians mode → 0.5', () => {
		const { symbols } = run('unite_angle("radians")\nr = cos(\\pi/3)');
		expect(getNumber(symbols, 'r')).toBeCloseTo(0.5, 10);
	});

	it('F4a: unite_angle("foo") → erreur', () => {
		expect(() => run('unite_angle("foo")')).toThrow(/foo/);
	});

	it('F4b: unite_angle() (no arg) → erreur', () => {
		expect(() => run('unite_angle()')).toThrow();
	});

	it('F4c: unite_angle("radians") then back to "degres"', () => {
		const { symbols } = run('unite_angle("radians")\nunite_angle("degres")\nr = sin(45)');
		expect(getNumber(symbols, 'r')).toBeCloseTo(Math.sin((45 * Math.PI) / 180), 10);
	});
});

describe('Phase 5 — Inverse trig in degrees mode', () => {
	it('asin(0.7071) in degrees mode → ~45', () => {
		const { symbols } = run('r = asin(0.7071067811865475)');
		expect(getNumber(symbols, 'r')).toBeCloseTo(45, 4);
	});

	it('acos(0.5) in degrees mode → 60', () => {
		const { symbols } = run('r = acos(0.5)');
		expect(getNumber(symbols, 'r')).toBeCloseTo(60, 6);
	});

	it('atan(1) in degrees mode → 45', () => {
		const { symbols } = run('r = atan(1)');
		expect(getNumber(symbols, 'r')).toBeCloseTo(45, 6);
	});

	it('asin(1) in radians mode → \\pi/2', () => {
		const { symbols } = run('unite_angle("radians")\nr = asin(1)');
		expect(getNumber(symbols, 'r')).toBeCloseTo(Math.PI / 2, 10);
	});
});

describe('Phase 5 — Mode swap mid-script', () => {
	it('F5: deg before swap, rad after', () => {
		// First sin(90) in degrees → 1
		// Then unite_angle("radians"); cos(0) → 1
		const { symbols } = run(['a = sin(90)', 'unite_angle("radians")', 'b = cos(0)'].join('\n'));
		expect(getNumber(symbols, 'a')).toBeCloseTo(1, 10);
		expect(getNumber(symbols, 'b')).toBeCloseTo(1, 10);
	});
});

describe('Phase 5 — Builtins angles also follow the mode (regression)', () => {
	it('arc in default degrees mode still works (existing behavior)', () => {
		const { symbols } = run('O = point(0, 0)\na = arc(O, rayon=2, debut=0, fin=90)');
		const id = symbols.get('a')?.figureId;
		expect(id).toBeDefined();
	});

	it('mode radians: arc(O, debut=0, fin=\\pi) — half circle', () => {
		const { symbols } = run(
			['unite_angle("radians")', 'O = point(0, 0)', 'a = arc(O, rayon=2, debut=0, fin=\\pi)'].join(
				'\n'
			)
		);
		const id = symbols.get('a')?.figureId;
		expect(id).toBeDefined();
	});
});
