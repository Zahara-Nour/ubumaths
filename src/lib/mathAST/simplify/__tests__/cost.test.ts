/**
 * Tests for the cost function
 */

import { describe, it, expect } from 'vitest';
import { computeCost, cheapest } from '../cost';
import { variable, number, add, multiply, sin, sqrt, divide, func, opposite } from '../../factory';

describe('computeCost', () => {
	describe('leaf nodes', () => {
		it('should cost 1 for a variable', () => {
			expect(computeCost(variable('x'))).toBe(1);
		});

		it('should cost 1 for a single-digit number', () => {
			expect(computeCost(number('5'))).toBe(1);
		});

		it('should cost 1 for a two-digit number', () => {
			expect(computeCost(number('42'))).toBe(1);
		});

		it('should penalize long numbers', () => {
			expect(computeCost(number('12345'))).toBeGreaterThan(computeCost(number('5')));
		});
	});

	describe('operator costs', () => {
		it('should cost more for multiplication than addition', () => {
			const addCost = computeCost(add(variable('x'), variable('y')));
			const mulCost = computeCost(multiply(variable('x'), variable('y')));
			expect(mulCost).toBeGreaterThan(addCost);
		});

		it('should cost more for division than multiplication', () => {
			const mulCost = computeCost(multiply(variable('x'), variable('y')));
			const divCost = computeCost(divide(variable('x'), variable('y')));
			expect(divCost).toBeGreaterThan(mulCost);
		});
	});

	describe('function costs', () => {
		it('should cost more for sin(x) than x', () => {
			expect(computeCost(sin(variable('x')))).toBeGreaterThan(computeCost(variable('x')));
		});

		it('should cost more for generic function than sqrt', () => {
			expect(computeCost(func('foo', [variable('x')]))).toBeGreaterThan(
				computeCost(sqrt(variable('x')))
			);
		});
	});

	describe('comparative costs', () => {
		it('x + 0 should cost more than x', () => {
			expect(computeCost(add(variable('x'), number('0')))).toBeGreaterThan(
				computeCost(variable('x'))
			);
		});

		it('1 should cost less than sqrt(2)/2', () => {
			expect(computeCost(number('1'))).toBeLessThan(
				computeCost(divide(sqrt(number('2')), number('2')))
			);
		});

		it('-(-x) should cost more than x', () => {
			expect(computeCost(opposite(opposite(variable('x'))))).toBeGreaterThan(
				computeCost(variable('x'))
			);
		});
	});
});

describe('cheapest', () => {
	it('should return the simpler expression', () => {
		const simple = variable('x');
		const complex = add(variable('x'), number('0'));
		expect(cheapest(simple, complex)).toBe(simple);
		expect(cheapest(complex, simple)).toBe(simple);
	});

	it('should return first argument on tie', () => {
		const a = variable('x');
		const b = variable('y');
		expect(cheapest(a, b)).toBe(a);
	});
});
