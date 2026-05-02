/**
 * E2E tests: `courbe()` with a piecewise body.
 *
 *   courbe("y = { -x si x < 0, x^2 si x >= 0 }")
 *   courbe("y = { -x sur ]-infini ; 0[, x^2 sur [0 ; +infini[ }")
 *
 * Expected: produces a GeoFunction whose `expression` is a PiecewiseNode and
 * whose `compiledFn` evaluates with first-match-wins semantics.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';
import type { GeoFunction } from '../../types/elements';
import { isPiecewise } from '$lib/mathAST';

function run(script: string) {
	return interpret(parse(script));
}

function getFunction(figure: ReturnType<typeof run>['figure']): GeoFunction {
	const fns = figure.getAllElements().filter((e) => e.type === 'function');
	expect(fns).toHaveLength(1);
	return fns[0] as GeoFunction;
}

describe('courbe() — piecewise (condition form)', () => {
	it('builds a GeoFunction with PiecewiseNode expression', () => {
		const { figure } = run('f = courbe("y = { -x si x < 0, x si x >= 0 }")');
		const fn = getFunction(figure);
		expect(isPiecewise(fn.expression)).toBe(true);
	});

	it('compiles |x| correctly', () => {
		const { figure } = run('f = courbe("y = { -x si x < 0, x si x >= 0 }")');
		const fn = getFunction(figure);
		expect(fn.compiledFn({ x: -3 })).toBe(3);
		expect(fn.compiledFn({ x: 0 })).toBe(0);
		expect(fn.compiledFn({ x: 4 })).toBe(4);
	});

	it('respects first-match-wins ordering', () => {
		const { figure } = run('f = courbe("y = { 1 si x >= -1, 2 si x >= 0 }")');
		const fn = getFunction(figure);
		// At x=0 both branches match; first wins → 1
		expect(fn.compiledFn({ x: 0 })).toBe(1);
		expect(fn.compiledFn({ x: -2 })).toBeNaN();
	});

	it('supports default branch (no si/sur on last piece)', () => {
		const { figure } = run('f = courbe("y = { -x si x < 0, x }")');
		const fn = getFunction(figure);
		expect(fn.compiledFn({ x: -3 })).toBe(3);
		expect(fn.compiledFn({ x: 5 })).toBe(5);
	});

	it('supports compound conditions via relation chains', () => {
		const { figure } = run('f = courbe("y = { 1 si 0 < x < 5, 0 }")');
		const fn = getFunction(figure);
		expect(fn.compiledFn({ x: 3 })).toBe(1);
		expect(fn.compiledFn({ x: 0 })).toBe(0); // 0 < 0 fails → otherwise
		expect(fn.compiledFn({ x: 5 })).toBe(0); // 5 < 5 fails → otherwise
	});
});

describe('courbe() — piecewise (interval form)', () => {
	it('builds a GeoFunction from the sur-form', () => {
		const { figure } = run('f = courbe("y = { -x sur ]-infini ; 0[, x^2 sur [0 ; +infini[ }")');
		const fn = getFunction(figure);
		expect(isPiecewise(fn.expression)).toBe(true);
		expect(fn.compiledFn({ x: -3 })).toBe(3);
		expect(fn.compiledFn({ x: 0 })).toBe(0);
		expect(fn.compiledFn({ x: 4 })).toBe(16);
	});

	it('respects open/closed bracket semantics', () => {
		const { figure } = run('f = courbe("y = { x sur ]0 ; 1[, 0 }")');
		const fn = getFunction(figure);
		expect(fn.compiledFn({ x: 0.5 })).toBe(0.5);
		expect(fn.compiledFn({ x: 0 })).toBe(0); // open bound → otherwise
		expect(fn.compiledFn({ x: 1 })).toBe(0);
	});

	it('builds a 3-piece bounded definition', () => {
		const { figure } = run(
			'f = courbe("y = { -1 sur ]-infini ; 0[, 0 sur [0 ; 1], 1 sur ]1 ; +infini[ }")'
		);
		const fn = getFunction(figure);
		expect(fn.compiledFn({ x: -2 })).toBe(-1);
		expect(fn.compiledFn({ x: 0.5 })).toBe(0);
		expect(fn.compiledFn({ x: 5 })).toBe(1);
	});
});

describe('courbe() — piecewise reactive bounds', () => {
	it('collects slider dependencies from condition form', () => {
		const { figure } = run(`
a = slider(min=-5, max=5, valeur=0)
f = courbe("y = { -x si x < a, x si x >= a }")
		`);
		const fn = getFunction(figure);
		expect(fn.dependsOn.length).toBeGreaterThan(0);
	});

	it('collects slider dependencies from interval form', () => {
		const { figure } = run(`
a = slider(min=-5, max=5, valeur=-2)
b = slider(min=-5, max=5, valeur=2)
f = courbe("y = { -x sur ]-infini ; a[, x sur [a ; b], x^2 sur ]b ; +infini[ }")
		`);
		const fn = getFunction(figure);
		expect(fn.dependsOn.length).toBe(2);
	});

	it('compilation needs slider values in bindings (free variables)', () => {
		// The compiled function treats slider names like `a` as free variables.
		// The renderer is responsible for passing scalar values in the bindings
		// alongside `x`. This test verifies the contract.
		const { figure } = run(`
a = slider(min=-5, max=5, valeur=0)
f = courbe("y = { 1 si x < a, 0 }")
		`);
		const fn = getFunction(figure);

		expect(fn.compiledFn({ x: -1, a: 0 })).toBe(1); // -1 < 0 → 1
		expect(fn.compiledFn({ x: -1, a: -5 })).toBe(0); // -1 not < -5 → 0
		expect(fn.compiledFn({ x: -10, a: -5 })).toBe(1); // -10 < -5 → 1
	});
});

describe('courbe() — piecewise serialization round-trip', () => {
	it('preserves the original piecewise string in equation', () => {
		const dsl = 'y = { -x si x < 0, x si x >= 0 }';
		const { figure } = run(`f = courbe("${dsl}")`);
		const fn = getFunction(figure);
		expect(fn.equation).toBe(dsl);
	});

	it('serializes a piecewise courbe back to the same DSL form', async () => {
		const original = 'f = courbe("y = { -x si x < 0, x }")';
		const { figure: f1 } = run(original);
		const { serialize } = await import('../serializer');
		const dsl = serialize(f1);
		expect(dsl).toContain('courbe("y = { -x si x < 0, x }")');
	});

	it('round-trip: parse → serialize → parse produces equivalent piecewise', async () => {
		const { figure: f1 } = run('f = courbe("y = { -x si x < 0, x si x >= 0 }")');
		const { serialize } = await import('../serializer');
		const dsl = serialize(f1);
		const { figure: f2 } = run(dsl);
		const fn = getFunction(f2);
		expect(isPiecewise(fn.expression)).toBe(true);
		expect(fn.compiledFn({ x: -3 })).toBe(3);
		expect(fn.compiledFn({ x: 4 })).toBe(4);
	});
});

describe('courbe() — piecewise errors', () => {
	it('rejects mixed si and sur', () => {
		expect(() => run('f = courbe("y = { x si x > 0, -x sur ]-infini ; 0[ }")')).toThrow();
	});

	it('rejects empty piecewise', () => {
		expect(() => run('f = courbe("y = {}")')).toThrow();
	});

	it('rejects malformed piecewise', () => {
		expect(() => run('f = courbe("y = { x si }")')).toThrow();
	});
});

describe('courbe() — piecewise rejects external domain restriction', () => {
	it('rejects sur-suffix on a piecewise (conceptually redundant)', () => {
		// A piecewise already defines the function case by case; combining it
		// with an external `sur` suffix is confusing — encode the restriction
		// directly in the piecewise conditions instead.
		expect(() => run('f = courbe("y = { -x si x < 0, x } sur [-5 ; 5]")')).toThrow(
			/déjà la fonction par cas/
		);
	});

	it('rejects avec-suffix on a piecewise', () => {
		expect(() => run('f = courbe("y = { -x si x < 0, x } avec -5 < x <= 5")')).toThrow(
			/déjà la fonction par cas/
		);
	});

	it('encodes domain restriction inside the piecewise conditions instead', () => {
		// User-friendly alternative: write the restriction as conditions.
		const { figure } = run('f = courbe("y = { -x si -5 <= x < 0, x si 0 <= x <= 5 }")');
		const fn = getFunction(figure);
		expect(isPiecewise(fn.expression)).toBe(true);
		expect(fn.compiledFn({ x: -3 })).toBe(3);
		expect(fn.compiledFn({ x: 3 })).toBe(3);
		expect(Number.isNaN(fn.compiledFn({ x: -10 }))).toBe(true);
		expect(Number.isNaN(fn.compiledFn({ x: 10 }))).toBe(true);
	});
});
