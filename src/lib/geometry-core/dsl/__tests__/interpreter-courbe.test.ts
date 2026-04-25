/**
 * Integration tests for the courbe() builtin — line detection from equations.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';
import { geoToNumber } from '../../compute/to-number';
import { DslRuntimeError } from '../errors';

function run(script: string) {
	const program = parse(script);
	return interpret(program);
}

describe('courbe — line detection from equation', () => {
	it('creates a line from explicit equation y = 2*x + 3', () => {
		const { figure } = run('d = courbe("y = 2*x + 3")');
		const lines = figure.getAllElements().filter((e) => e.type === 'line');
		expect(lines).toHaveLength(1);
	});

	it('creates hidden support points', () => {
		const { figure } = run('d = courbe("y = 2*x + 3")');
		const points = figure.getAllElements().filter((e) => e.type === 'freePoint');
		expect(points).toHaveLength(2);
		expect(points[0].visible).toBe(false);
		expect(points[1].visible).toBe(false);
	});

	it('creates a line from implicit equation 2*x - y + 3 = 0', () => {
		const { figure } = run('d = courbe("2*x - y + 3 = 0")');
		const lines = figure.getAllElements().filter((e) => e.type === 'line');
		expect(lines).toHaveLength(1);
	});

	it('creates correct points for y = 2*x + 3', () => {
		const { figure } = run('d = courbe("y = 2*x + 3")');
		const points = figure.getAllElements().filter((e) => e.type === 'freePoint');

		// y = 2x + 3 → at x=0, y=3; at x=1, y=5
		const pos0 = figure.getPosition(points[0].id);
		const pos1 = figure.getPosition(points[1].id);
		expect(pos0).toBeDefined();
		expect(pos1).toBeDefined();

		// One point should be (0, 3) and the other (1, 5)
		const p0x = geoToNumber(pos0!.x);
		const p0y = geoToNumber(pos0!.y);
		const p1x = geoToNumber(pos1!.x);
		const p1y = geoToNumber(pos1!.y);

		expect(p0x).toBeCloseTo(0);
		expect(p0y).toBeCloseTo(3);
		expect(p1x).toBeCloseTo(1);
		expect(p1y).toBeCloseTo(5);
	});

	it('creates a vertical line from x = 3', () => {
		const { figure } = run('d = courbe("x = 3")');
		const lines = figure.getAllElements().filter((e) => e.type === 'line');
		expect(lines).toHaveLength(1);

		const points = figure.getAllElements().filter((e) => e.type === 'freePoint');
		const pos0 = figure.getPosition(points[0].id);
		const pos1 = figure.getPosition(points[1].id);

		// Both x values should be 3
		expect(geoToNumber(pos0!.x)).toBeCloseTo(3);
		expect(geoToNumber(pos1!.x)).toBeCloseTo(3);
		// y values should differ
		expect(geoToNumber(pos0!.y)).not.toBeCloseTo(geoToNumber(pos1!.y));
	});

	it('creates a horizontal line from y = -1', () => {
		const { figure } = run('d = courbe("y = -1")');
		const lines = figure.getAllElements().filter((e) => e.type === 'line');
		expect(lines).toHaveLength(1);

		const points = figure.getAllElements().filter((e) => e.type === 'freePoint');
		const pos0 = figure.getPosition(points[0].id);
		const pos1 = figure.getPosition(points[1].id);

		// Both y values should be -1
		expect(geoToNumber(pos0!.y)).toBeCloseTo(-1);
		expect(geoToNumber(pos1!.y)).toBeCloseTo(-1);
	});

	it('handles implicit form without = 0: courbe("2*x - y + 3")', () => {
		const { figure } = run('d = courbe("2*x - y + 3")');
		const lines = figure.getAllElements().filter((e) => e.type === 'line');
		expect(lines).toHaveLength(1);
	});

	it('throws for degenerate equation 0 = 0', () => {
		expect(() => run('d = courbe("0 = 0")')).toThrow(DslRuntimeError);
	});

	it('throws when argument is not a string', () => {
		expect(() => run('A = point(0,0)\nd = courbe(A)')).toThrow(DslRuntimeError);
	});
});

describe('courbe — function curves y=f(x)', () => {
	it('creates a GeoFunction for y = x^2', () => {
		const { figure } = run('c = courbe("y = x^2")');
		const functions = figure.getAllElements().filter((e) => e.type === 'function');
		expect(functions).toHaveLength(1);
	});

	it('creates a GeoFunction for y = sin(x)', () => {
		const { figure } = run('c = courbe("y = sin(x)")');
		const functions = figure.getAllElements().filter((e) => e.type === 'function');
		expect(functions).toHaveLength(1);
	});

	it('creates a GeoFunction for implicit form x^2 - y = 0', () => {
		const { figure } = run('c = courbe("x^2 - y = 0")');
		const functions = figure.getAllElements().filter((e) => e.type === 'function');
		expect(functions).toHaveLength(1);
	});

	it('stores the equation string', () => {
		const { figure } = run('c = courbe("y = exp(x)")');
		const fn = figure.getAllElements().find((e) => e.type === 'function');
		expect(fn).toBeDefined();
		if (fn && fn.type === 'function') {
			expect(fn.equation).toBe('y = exp(x)');
		}
	});

	it('compiles a working evaluator', () => {
		const { figure } = run('c = courbe("y = x^2")');
		const fn = figure.getAllElements().find((e) => e.type === 'function');
		if (fn && fn.type === 'function') {
			expect(fn.compiledFn({ x: 3 })).toBeCloseTo(9);
			expect(fn.compiledFn({ x: -2 })).toBeCloseTo(4);
		}
	});

	it('compiles a working derivative', () => {
		const { figure } = run('c = courbe("y = x^2")');
		const fn = figure.getAllElements().find((e) => e.type === 'function');
		if (fn && fn.type === 'function') {
			// f(x) = x^2, f'(x) = 2x
			expect(fn.compiledDerivative({ x: 3 })).toBeCloseTo(6);
			expect(fn.compiledDerivative({ x: -1 })).toBeCloseTo(-2);
		}
	});

	it('handles x*y = 1 as y = 1/x', () => {
		const { figure } = run('c = courbe("x*y = 1")');
		const fn = figure.getAllElements().find((e) => e.type === 'function');
		expect(fn).toBeDefined();
		if (fn && fn.type === 'function') {
			expect(fn.compiledFn({ x: 2 })).toBeCloseTo(0.5);
		}
	});

	it('handles 2*y - x^2 = 0 as y = x^2/2', () => {
		const { figure } = run('c = courbe("2*y - x^2 = 0")');
		const fn = figure.getAllElements().find((e) => e.type === 'function');
		if (fn && fn.type === 'function') {
			expect(fn.compiledFn({ x: 4 })).toBeCloseTo(8);
		}
	});

	it('throws for implicit curve y^2 = x (not linear in y)', () => {
		expect(() => run('c = courbe("y^2 = x")')).toThrow(DslRuntimeError);
	});
});
