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

	it('throws for non-linear equation y = x^2', () => {
		expect(() => run('d = courbe("y = x^2")')).toThrow(DslRuntimeError);
	});

	it('throws for equation with transcendental: y = sin(x)', () => {
		expect(() => run('d = courbe("y = sin(x)")')).toThrow(DslRuntimeError);
	});

	it('throws for degenerate equation 0 = 0', () => {
		expect(() => run('d = courbe("0 = 0")')).toThrow(DslRuntimeError);
	});

	it('throws when argument is not a string', () => {
		expect(() => run('A = point(0,0)\nd = courbe(A)')).toThrow(DslRuntimeError);
	});
});
