import { describe, it, expect } from 'vitest';
import { numeric, exact, geoValueToMathNode } from '../geo-value';
import { number } from '$lib/mathAST/factory';

describe('geoValueToMathNode handles negative numeric values', () => {
	it('numeric(-5) → opposite(number("5"))', () => {
		const node = geoValueToMathNode(numeric(-5));
		expect(node).toEqual({
			type: 'opposite',
			operand: { type: 'number', value: '5' }
		});
	});

	it('numeric(3.14) → number("3.14")', () => {
		const node = geoValueToMathNode(numeric(3.14));
		expect(node).toEqual({ type: 'number', value: '3.14' });
	});

	it('numeric(0) → number("0")', () => {
		const node = geoValueToMathNode(numeric(0));
		expect(node).toEqual({ type: 'number', value: '0' });
	});

	it('exact(node) passes through unchanged', () => {
		const inner = number('7');
		const node = geoValueToMathNode(exact(inner));
		expect(node).toBe(inner);
	});
});
