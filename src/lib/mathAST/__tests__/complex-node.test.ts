/**
 * Tests for ComplexNode - Complex number support in MathAST
 *
 * TDD: These tests define the expected behavior for ComplexNode.
 */

import { describe, it, expect } from 'vitest';
import { complex, number, variable, sqrt, add, multiply, opposite } from '../factory';
import { isComplex, hasChildren } from '../guards';
import { getChildren, mapNode, cloneNode } from '../transforms';
import type { ComplexNode, MathNode } from '../types';

describe('ComplexNode', () => {
	describe('type definition', () => {
		it('ComplexNode has type "complex"', () => {
			const node = complex(number('3'), number('4'));
			expect(node.type).toBe('complex');
		});

		it('ComplexNode is part of MathNode union', () => {
			const node: MathNode = complex(number('1'), number('2'));
			expect(node.type).toBe('complex');
		});

		it('ComplexNode has real and imaginary parts', () => {
			const node = complex(number('3'), number('4'));
			expect(node.real).toEqual(number('3'));
			expect(node.imaginary).toEqual(number('4'));
		});
	});

	describe('factory function', () => {
		it('complex() creates ComplexNode with real and imaginary parts', () => {
			const node = complex(number('3'), number('4'));
			expect(node.type).toBe('complex');
			expect(node.real).toEqual(number('3'));
			expect(node.imaginary).toEqual(number('4'));
		});

		it('complex() accepts arbitrary expressions for real/imaginary', () => {
			const node = complex(
				sqrt(number('2')), // real = sqrt(2)
				variable('x') // imaginary = x
			);
			expect(node.real.type).toBe('function');
			expect(node.imaginary.type).toBe('variable');
		});

		it('complex() preserves metadata', () => {
			const node = complex(number('1'), number('2'), { color: 'red' });
			expect(node.metadata?.color).toBe('red');
		});

		it('complex() creates pure imaginary (0 + i)', () => {
			const i = complex(number('0'), number('1'));
			expect(i.real).toEqual(number('0'));
			expect(i.imaginary).toEqual(number('1'));
		});

		it('complex() creates pure real in complex form', () => {
			const realOnly = complex(number('5'), number('0'));
			expect(realOnly.real).toEqual(number('5'));
			expect(realOnly.imaginary).toEqual(number('0'));
		});

		it('complex() handles negative imaginary', () => {
			const node = complex(number('3'), opposite(number('4')));
			expect(node.imaginary.type).toBe('opposite');
		});

		it('complex() handles symbolic expressions', () => {
			// (x + yi) where x and y are variables
			const node = complex(variable('x'), variable('y'));
			expect(node.real).toEqual(variable('x'));
			expect(node.imaginary).toEqual(variable('y'));
		});
	});

	describe('type guard', () => {
		it('isComplex() returns true for ComplexNode', () => {
			const node = complex(number('1'), number('2'));
			expect(isComplex(node)).toBe(true);
		});

		it('isComplex() returns false for NumberNode', () => {
			expect(isComplex(number('5'))).toBe(false);
		});

		it('isComplex() returns false for VariableNode', () => {
			expect(isComplex(variable('x'))).toBe(false);
		});

		it('isComplex() returns false for other nodes', () => {
			expect(isComplex(add(number('1'), number('2')))).toBe(false);
			expect(isComplex(sqrt(number('2')))).toBe(false);
		});
	});

	describe('hasChildren predicate', () => {
		it('hasChildren() returns true for ComplexNode', () => {
			const node = complex(number('3'), number('4'));
			expect(hasChildren(node)).toBe(true);
		});
	});

	describe('getChildren transform', () => {
		it('getChildren() returns [real, imaginary]', () => {
			const real = number('3');
			const imag = number('4');
			const node = complex(real, imag);
			const children = getChildren(node);

			expect(children).toHaveLength(2);
			expect(children[0]).toEqual(real);
			expect(children[1]).toEqual(imag);
		});

		it('getChildren() works with complex expressions', () => {
			const real = sqrt(number('2'));
			const imag = variable('y');
			const node = complex(real, imag);
			const children = getChildren(node);

			expect(children).toHaveLength(2);
			expect(children[0]).toEqual(real);
			expect(children[1]).toEqual(imag);
		});
	});

	describe('mapNode transform', () => {
		it('mapNode() transforms children of ComplexNode', () => {
			const node = complex(number('3'), number('4'));

			// Double all numbers
			const doubled = mapNode(node, (n) => {
				if (n.type === 'number') {
					return number(String(parseInt(n.value) * 2));
				}
				return n;
			});

			expect(doubled.type).toBe('complex');
			expect((doubled as ComplexNode).real).toEqual(number('6'));
			expect((doubled as ComplexNode).imaginary).toEqual(number('8'));
		});

		it('mapNode() preserves metadata on ComplexNode', () => {
			const node = complex(number('1'), number('2'), { color: 'blue' });

			const transformed = mapNode(node, (n) => n);

			expect((transformed as ComplexNode).metadata?.color).toBe('blue');
		});
	});

	describe('cloneNode transform', () => {
		it('cloneNode() creates a deep copy of ComplexNode', () => {
			const original = complex(number('3'), number('4'), { color: 'red' });
			const cloned = cloneNode(original);

			expect(cloned).toEqual(original);
			expect(cloned).not.toBe(original);
		});

		it('cloneNode() works with nested expressions', () => {
			const original = complex(
				add(number('1'), number('2')),
				multiply(number('3'), variable('x'), 'implicit')
			);
			const cloned = cloneNode(original);

			expect(cloned).toEqual(original);
			expect(cloned).not.toBe(original);
			expect((cloned as ComplexNode).real).not.toBe(original.real);
		});
	});

	describe('edge cases', () => {
		it('handles zero complex number (0 + 0i)', () => {
			const zero = complex(number('0'), number('0'));
			expect(zero.real).toEqual(number('0'));
			expect(zero.imaginary).toEqual(number('0'));
		});

		it('handles nested complex in expressions', () => {
			const z = complex(number('1'), number('1'));
			const expr = add(z, number('5'));

			expect(expr.type).toBe('addition');
			expect(isComplex(expr)).toBe(false);
		});
	});
});
