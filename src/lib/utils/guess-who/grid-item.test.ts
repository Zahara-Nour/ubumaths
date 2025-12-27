/**
 * Tests for Grid Item polymorphic utilities
 */
import { describe, it, expect } from 'vitest';
import {
	numberItem,
	fractionItem,
	checkQuestion,
	assignSecretItems,
	gridItemsEqual,
	gridItemToKey,
	type GridItem
} from './grid-item';
import { shape2DItemFrom } from './grid-item';
import { expressionItemFrom } from './grid-item';
import { functionItemFrom } from './grid-item';
import { polyhedronItemFrom } from './grid-item';
import { SHAPES_2D } from './shape2d-properties';
import { generateExpressionGrid } from './expression-properties';
import { generateFunctionGrid } from './function-properties';
import { POLYHEDRA } from './polyhedron-properties';

describe('checkQuestion', () => {
	describe('number items', () => {
		it('checks is_even correctly', () => {
			expect(checkQuestion(numberItem(4), 'is_even')).toBe(true);
			expect(checkQuestion(numberItem(5), 'is_even')).toBe(false);
		});

		it('checks is_prime correctly', () => {
			expect(checkQuestion(numberItem(7), 'is_prime')).toBe(true);
			expect(checkQuestion(numberItem(8), 'is_prime')).toBe(false);
		});

		it('checks is_divisible_by with param', () => {
			expect(checkQuestion(numberItem(15), 'is_divisible_by', 5)).toBe(true);
			expect(checkQuestion(numberItem(15), 'is_divisible_by', 4)).toBe(false);
		});

		it('checks greater_than with param', () => {
			expect(checkQuestion(numberItem(50), 'greater_than', 25)).toBe(true);
			expect(checkQuestion(numberItem(20), 'greater_than', 25)).toBe(false);
		});
	});

	describe('fraction items', () => {
		it('checks is_irreducible correctly', () => {
			expect(checkQuestion(fractionItem(3, 4), 'is_irreducible')).toBe(true);
			expect(checkQuestion(fractionItem(2, 4), 'is_irreducible')).toBe(false);
		});

		it('checks numerator_even correctly', () => {
			expect(checkQuestion(fractionItem(4, 5), 'numerator_even')).toBe(true);
			expect(checkQuestion(fractionItem(3, 5), 'numerator_even')).toBe(false);
		});

		it('checks greater_than_one correctly', () => {
			expect(checkQuestion(fractionItem(5, 3), 'greater_than_one')).toBe(true);
			expect(checkQuestion(fractionItem(2, 5), 'greater_than_one')).toBe(false);
		});

		it('checks equivalent_to_half correctly', () => {
			expect(checkQuestion(fractionItem(3, 6), 'equivalent_to_half')).toBe(true);
			expect(checkQuestion(fractionItem(2, 5), 'equivalent_to_half')).toBe(false);
		});
	});

	describe('shape2d items', () => {
		const square = shape2DItemFrom(SHAPES_2D.square);
		const triangle = shape2DItemFrom(SHAPES_2D.triangle_equilateral);

		it('checks sides_count correctly', () => {
			expect(checkQuestion(square, 'sides_count', 4)).toBe(true);
			expect(checkQuestion(triangle, 'sides_count', 4)).toBe(false);
		});

		it('checks is_regular correctly', () => {
			expect(checkQuestion(square, 'is_regular')).toBe(true);
		});

		it('checks has_right_angles correctly', () => {
			expect(checkQuestion(square, 'has_right_angles')).toBe(true);
			expect(checkQuestion(triangle, 'has_right_angles')).toBe(false);
		});
	});

	describe('expression items', () => {
		const expressions = generateExpressionGrid(5);
		const expr = expressionItemFrom(expressions[0]);

		it('checks expression properties without throwing', () => {
			// Just verify it doesn't throw - specific results depend on generated expression
			expect(() => checkQuestion(expr, 'is_polynomial')).not.toThrow();
			expect(() => checkQuestion(expr, 'degree_equals', 1)).not.toThrow();
		});
	});

	describe('function items', () => {
		const functions = generateFunctionGrid(5);
		const fn = functionItemFrom(functions[0]);

		it('checks function properties without throwing', () => {
			// Just verify it doesn't throw - specific results depend on generated function
			expect(() => checkQuestion(fn, 'passes_origin')).not.toThrow();
			expect(() => checkQuestion(fn, 'has_maximum')).not.toThrow();
		});
	});

	describe('polyhedron items', () => {
		const cube = polyhedronItemFrom({
			...POLYHEDRA.cube,
			id: 'cube',
			name: 'cube'
		});
		const tetrahedron = polyhedronItemFrom({
			...POLYHEDRA.tetrahedron,
			id: 'tetrahedron',
			name: 'tetrahedron'
		});

		it('checks face_count_equals correctly', () => {
			expect(checkQuestion(cube, 'face_count_equals', 6)).toBe(true);
			expect(checkQuestion(tetrahedron, 'face_count_equals', 4)).toBe(true);
		});

		it('checks is_regular correctly', () => {
			expect(checkQuestion(cube, 'is_regular')).toBe(true);
		});

		it('checks is_platonic_solid correctly', () => {
			expect(checkQuestion(cube, 'is_platonic_solid')).toBe(true);
		});
	});
});

describe('assignSecretItems', () => {
	it('returns two different items', () => {
		const grid: GridItem[] = [numberItem(1), numberItem(2), numberItem(3), numberItem(4)];
		const [secret1, secret2] = assignSecretItems(grid);

		expect(gridItemsEqual(secret1, secret2)).toBe(false);
	});

	it('returns items from the grid', () => {
		const grid: GridItem[] = [numberItem(10), numberItem(20), numberItem(30)];
		const [secret1, secret2] = assignSecretItems(grid);

		const gridKeys = grid.map(gridItemToKey);
		expect(gridKeys).toContain(gridItemToKey(secret1));
		expect(gridKeys).toContain(gridItemToKey(secret2));
	});

	it('throws for grid with less than 2 items', () => {
		expect(() => assignSecretItems([numberItem(1)])).toThrow();
		expect(() => assignSecretItems([])).toThrow();
	});

	it('works with mixed item types', () => {
		const grid: GridItem[] = [
			numberItem(42),
			fractionItem(1, 2),
			shape2DItemFrom(SHAPES_2D.square)
		];
		const [secret1, secret2] = assignSecretItems(grid);

		expect(secret1).toBeDefined();
		expect(secret2).toBeDefined();
		expect(gridItemsEqual(secret1, secret2)).toBe(false);
	});

	it('works with exactly 2 items', () => {
		const grid: GridItem[] = [numberItem(1), numberItem(2)];
		const [secret1, secret2] = assignSecretItems(grid);

		expect(gridItemsEqual(secret1, secret2)).toBe(false);
		// One should be 1, one should be 2
		const values = [
			(secret1 as { value: number }).value,
			(secret2 as { value: number }).value
		].sort();
		expect(values).toEqual([1, 2]);
	});
});

describe('gridItemsEqual', () => {
	it('compares number items correctly', () => {
		expect(gridItemsEqual(numberItem(5), numberItem(5))).toBe(true);
		expect(gridItemsEqual(numberItem(5), numberItem(6))).toBe(false);
	});

	it('compares fraction items correctly', () => {
		expect(gridItemsEqual(fractionItem(1, 2), fractionItem(1, 2))).toBe(true);
		// Note: fractionsEqual compares exact numerator/denominator, not equivalence
		expect(gridItemsEqual(fractionItem(1, 2), fractionItem(2, 4))).toBe(false);
		expect(gridItemsEqual(fractionItem(1, 2), fractionItem(1, 3))).toBe(false);
	});

	it('returns false for different types', () => {
		expect(gridItemsEqual(numberItem(2), fractionItem(2, 1))).toBe(false);
	});
});
