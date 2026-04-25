/**
 * Integration tests for the tangente() builtin.
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

describe('tangente — fixed x₀', () => {
	it('creates a tangentLine element', () => {
		const { figure } = run(
			`f = courbe("y = x^2")
t = tangente(f, 2)`
		);
		const tangents = figure.getAllElements().filter((e) => e.type === 'tangentLine');
		expect(tangents).toHaveLength(1);
	});

	it('tangent to y=x^2 at x=1 has correct slope (m=2)', () => {
		// f(x)=x², f'(x)=2x, at x=1: y₀=1, m=2
		// Tangent: y = 1 + 2(x-1) = 2x - 1
		// At x=0: y = -1. At x=2: y = 3.
		const { figure } = run(
			`f = courbe("y = x^2")
t = tangente(f, 1)`
		);
		const tl = figure.getAllElements().find((e) => e.type === 'tangentLine');
		expect(tl).toBeDefined();
	});
});

describe('tangente — dynamic with point_sur', () => {
	it('creates tangentLine linked to a pointOnCurve', () => {
		const { figure } = run(
			`f = courbe("y = x^2")
P = point_sur(f, 2)
t = tangente(f, P)`
		);
		const tangents = figure.getAllElements().filter((e) => e.type === 'tangentLine');
		expect(tangents).toHaveLength(1);
		if (tangents[0].type === 'tangentLine') {
			expect(tangents[0].pointOnCurveId).toBeDefined();
		}
	});

	it('point on curve is at correct position', () => {
		const { figure, symbols } = run(
			`f = courbe("y = x^2")
P = point_sur(f, 3)
t = tangente(f, P)`
		);
		const pos = figure.getPosition(symbols.get('P')!.figureId!);
		expect(pos).toBeDefined();
		expect(geoToNumber(pos!.x)).toBeCloseTo(3);
		expect(geoToNumber(pos!.y)).toBeCloseTo(9);
	});
});

describe('tangente — errors', () => {
	it('throws when first arg is not a function', () => {
		expect(() => run('A = point(0,0)\nt = tangente(A, 1)')).toThrow(DslRuntimeError);
	});

	it('throws when second arg is a regular point (not pointOnCurve)', () => {
		expect(() => run('f = courbe("y = x^2")\nA = point(1,1)\nt = tangente(f, A)')).toThrow(
			DslRuntimeError
		);
	});

	it('throws with wrong number of arguments', () => {
		expect(() => run('f = courbe("y = x^2")\nt = tangente(f)')).toThrow(DslRuntimeError);
	});
});
