/**
 * TDD Tests for Matrix Traversal (transforms.ts)
 *
 * Phase 1: Types and Factory - Test-Driven Development
 */

import { describe, it, expect } from 'vitest';
import { number, add, matrix, rowVector, columnVector } from '../../factory';
import { getChildren, mapNode, cloneNode, mapNodeTopDown } from '../../transforms';
import { isNumber, isMatrix, hasChildren } from '../../guards';

describe('Matrix Transforms', () => {
	// =============================================================================
	// getChildren
	// =============================================================================

	describe('getChildren', () => {
		it('returns all matrix elements as children', () => {
			const n1 = number('1');
			const n2 = number('2');
			const n3 = number('3');
			const n4 = number('4');
			const node = matrix([
				[n1, n2],
				[n3, n4]
			]);
			const children = getChildren(node);

			expect(children).toHaveLength(4);
			expect(children).toContain(n1);
			expect(children).toContain(n2);
			expect(children).toContain(n3);
			expect(children).toContain(n4);
		});

		it('returns children in row-major order', () => {
			const n1 = number('1');
			const n2 = number('2');
			const n3 = number('3');
			const n4 = number('4');
			const node = matrix([
				[n1, n2],
				[n3, n4]
			]);
			const children = getChildren(node);

			// Row-major order: [1, 2, 3, 4]
			expect(children[0]).toBe(n1);
			expect(children[1]).toBe(n2);
			expect(children[2]).toBe(n3);
			expect(children[3]).toBe(n4);
		});

		it('returns children for row vector', () => {
			const n1 = number('1');
			const n2 = number('2');
			const n3 = number('3');
			const node = rowVector([n1, n2, n3]);
			const children = getChildren(node);

			expect(children).toHaveLength(3);
			expect(children).toEqual([n1, n2, n3]);
		});

		it('returns children for column vector', () => {
			const n1 = number('1');
			const n2 = number('2');
			const n3 = number('3');
			const node = columnVector([n1, n2, n3]);
			const children = getChildren(node);

			expect(children).toHaveLength(3);
			expect(children).toEqual([n1, n2, n3]);
		});

		it('returns single child for 1x1 matrix', () => {
			const n1 = number('1');
			const node = matrix([[n1]]);
			const children = getChildren(node);

			expect(children).toHaveLength(1);
			expect(children[0]).toBe(n1);
		});
	});

	// =============================================================================
	// cloneNode
	// =============================================================================

	describe('cloneNode', () => {
		it('clones matrix structure', () => {
			const n1 = number('1');
			const n2 = number('2');
			const n3 = number('3');
			const n4 = number('4');
			const original = matrix([
				[n1, n2],
				[n3, n4]
			]);
			const cloned = cloneNode(original);

			expect(cloned).not.toBe(original);
			expect(cloned.type).toBe('matrix');
			expect(cloned.rows).toHaveLength(2);
		});

		it('deep clones matrix elements', () => {
			const expr = add(number('1'), number('2'));
			const original = matrix([[expr]]);
			const cloned = cloneNode(original);

			// Elements should be cloned, not the same reference
			expect(cloned.rows[0][0]).not.toBe(original.rows[0][0]);
			expect(cloned.rows[0][0].type).toBe('addition');
		});

		it('preserves matrixType', () => {
			const n1 = number('1');
			const original = matrix([[n1]], { matrixType: 'bmatrix' });
			const cloned = cloneNode(original);

			expect(cloned.matrixType).toBe('bmatrix');
		});

		it('preserves metadata', () => {
			const n1 = number('1');
			const original = matrix([[n1]], { metadata: { color: 'red' } });
			const cloned = cloneNode(original);

			expect(cloned.metadata?.color).toBe('red');
		});
	});

	// =============================================================================
	// mapNode
	// =============================================================================

	describe('mapNode', () => {
		it('maps over matrix elements (bottom-up)', () => {
			const n1 = number('1');
			const n2 = number('2');
			const n3 = number('3');
			const n4 = number('4');
			const node = matrix([
				[n1, n2],
				[n3, n4]
			]);

			// Double all numbers
			const result = mapNode(node, (n) => {
				if (isNumber(n)) {
					return number((parseInt(n.value) * 2).toString());
				}
				return n;
			});

			expect(result.type).toBe('matrix');
			if (isMatrix(result)) {
				expect(result.rows[0][0]).toEqual(expect.objectContaining({ type: 'number', value: '2' }));
				expect(result.rows[0][1]).toEqual(expect.objectContaining({ type: 'number', value: '4' }));
				expect(result.rows[1][0]).toEqual(expect.objectContaining({ type: 'number', value: '6' }));
				expect(result.rows[1][1]).toEqual(expect.objectContaining({ type: 'number', value: '8' }));
			}
		});

		it('can replace entire matrix', () => {
			const n1 = number('1');
			const node = matrix([[n1]]);

			// Replace matrix with a number
			const result = mapNode(node, (n) => {
				if (n.type === 'matrix') {
					return number('42');
				}
				return n;
			});

			expect(result.type).toBe('number');
			if (isNumber(result)) {
				expect(result.value).toBe('42');
			}
		});

		it('preserves structure when no changes', () => {
			const n1 = number('1');
			const n2 = number('2');
			const node = matrix([[n1, n2]]);

			const result = mapNode(node, (n) => n);

			expect(result.type).toBe('matrix');
			if (isMatrix(result)) {
				expect(result.rows).toHaveLength(1);
				expect(result.rows[0]).toHaveLength(2);
			}
		});
	});

	// =============================================================================
	// mapNodeTopDown
	// =============================================================================

	describe('mapNodeTopDown', () => {
		it('visits matrix before elements (top-down)', () => {
			const n1 = number('1');
			const n2 = number('2');
			const node = matrix([[n1, n2]]);
			const visited: string[] = [];

			mapNodeTopDown(node, (n) => {
				visited.push(n.type);
				return n;
			});

			// Matrix should be visited first, then elements
			expect(visited[0]).toBe('matrix');
			expect(visited.slice(1)).toContain('number');
		});

		it('can short-circuit traversal by replacing matrix', () => {
			const expr = add(number('1'), number('2'));
			const node = matrix([[expr]]);
			const visited: string[] = [];

			const result = mapNodeTopDown(node, (n) => {
				visited.push(n.type);
				// Replace matrix immediately, don't traverse children
				if (n.type === 'matrix') {
					return number('42');
				}
				return n;
			});

			// Should only visit matrix, not traverse into elements
			expect(result.type).toBe('number');
			expect(visited).toEqual(['matrix']);
		});
	});

	// =============================================================================
	// hasChildren integration
	// =============================================================================

	describe('hasChildren', () => {
		it('returns true for matrix', () => {
			const n1 = number('1');
			const node = matrix([[n1]]);

			expect(hasChildren(node)).toBe(true);
		});
	});
});
