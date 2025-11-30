/**
 * Tests for flatten and unflatten helpers
 */

import { describe, it, expect } from 'vitest';
import {
	variable,
	number,
	add,
	subtract,
	multiply,
	opposite,
	positive,
	parentheses
} from '../factory';
import {
	flattenSumShallow,
	flattenProductShallow,
	flattenSumDeep,
	flattenProductDeep,
	unflattenSum,
	unflattenProduct,
	type FlatSum,
	type FlatProduct
} from '../flatten';

describe('unflattenSum', () => {
	it('returns null for empty array', () => {
		const result = unflattenSum([]);
		expect(result).toBeNull();
	});

	it('returns term for single positive term', () => {
		const a = variable('a');
		const flatSum: FlatSum = [{ sign: '+', term: a }];
		const result = unflattenSum(flatSum);
		expect(result).toEqual(a);
	});

	it('returns opposite for single negative term', () => {
		const a = variable('a');
		const flatSum: FlatSum = [{ sign: '-', term: a }];
		const result = unflattenSum(flatSum);
		expect(result).toEqual(opposite(a));
	});

	it('builds left-associative sum for multiple positive terms', () => {
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		const flatSum: FlatSum = [
			{ sign: '+', term: a },
			{ sign: '+', term: b },
			{ sign: '+', term: c }
		];
		const result = unflattenSum(flatSum);
		// Should be ((a + b) + c)
		expect(result).toEqual(add(add(a, b), c));
	});

	it('builds left-associative sum with mixed signs', () => {
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		const flatSum: FlatSum = [
			{ sign: '+', term: a },
			{ sign: '-', term: b },
			{ sign: '+', term: c }
		];
		const result = unflattenSum(flatSum);
		// Should be ((a - b) + c)
		expect(result).toEqual(add(subtract(a, b), c));
	});

	it('builds left-associative sum starting with negative', () => {
		const a = variable('a');
		const b = variable('b');
		const flatSum: FlatSum = [
			{ sign: '-', term: a },
			{ sign: '+', term: b }
		];
		const result = unflattenSum(flatSum);
		// Should be (-a + b)
		expect(result).toEqual(add(opposite(a), b));
	});

	it('round-trips with flattenSumShallow', () => {
		// Create a sum: (a + b) - c
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		const original = subtract(add(a, b), c);

		// Flatten it
		const flattened = flattenSumShallow(original);

		// Unflatten it back
		const result = unflattenSum(flattened);

		// Should get the same tree structure
		expect(result).toEqual(original);
	});
});

describe('unflattenProduct', () => {
	it('returns null for empty array', () => {
		const result = unflattenProduct([]);
		expect(result).toBeNull();
	});

	it('returns factor for single factor', () => {
		const a = variable('a');
		const flatProduct: FlatProduct = [a];
		const result = unflattenProduct(flatProduct);
		expect(result).toEqual(a);
	});

	it('builds left-associative product with implicit multiplication', () => {
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		const flatProduct: FlatProduct = [a, b, c];
		const result = unflattenProduct(flatProduct);
		// Should be ((a * b) * c) with implicit style
		expect(result).toEqual(multiply(multiply(a, b, 'implicit'), c, 'implicit'));
	});

	it('builds left-associative product with dot multiplication', () => {
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		const flatProduct: FlatProduct = [a, b, c];
		const result = unflattenProduct(flatProduct, 'dot');
		// Should be ((a * b) * c) with dot style
		expect(result).toEqual(multiply(multiply(a, b, 'dot'), c, 'dot'));
	});

	it('builds left-associative product with numbers', () => {
		const two = number('2');
		const x = variable('x');
		const y = variable('y');
		const flatProduct: FlatProduct = [two, x, y];
		const result = unflattenProduct(flatProduct);
		// Should be ((2 * x) * y)
		expect(result).toEqual(multiply(multiply(two, x, 'implicit'), y, 'implicit'));
	});

	it('round-trips with flattenProductShallow', () => {
		// Create a product: (a * b) * c
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		const original = multiply(multiply(a, b, 'implicit'), c, 'implicit');

		// Flatten it
		const flattened = flattenProductShallow(original);

		// Unflatten it back with implicit style
		const result = unflattenProduct(flattened, 'implicit');

		// Should get the same tree structure
		expect(result).toEqual(original);
	});
});

// =============================================================================
// flattenSumShallow Tests
// =============================================================================

describe('flattenSumShallow', () => {
	it('flattens single number to single positive term', () => {
		const num = number('5');
		const result = flattenSumShallow(num);
		expect(result).toEqual([{ sign: '+', term: num }]);
	});

	it('flattens single variable to single positive term', () => {
		const a = variable('a');
		const result = flattenSumShallow(a);
		expect(result).toEqual([{ sign: '+', term: a }]);
	});

	it('flattens addition: a + b', () => {
		const a = variable('a');
		const b = variable('b');
		const expr = add(a, b);
		const result = flattenSumShallow(expr);
		expect(result).toEqual([
			{ sign: '+', term: a },
			{ sign: '+', term: b }
		]);
	});

	it('flattens subtraction: a - b', () => {
		const a = variable('a');
		const b = variable('b');
		const expr = subtract(a, b);
		const result = flattenSumShallow(expr);
		expect(result).toEqual([
			{ sign: '+', term: a },
			{ sign: '-', term: b }
		]);
	});

	it('flattens mixed operations: a + b - c + d', () => {
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		const d = variable('d');
		// ((a + b) - c) + d
		const expr = add(subtract(add(a, b), c), d);
		const result = flattenSumShallow(expr);
		expect(result).toEqual([
			{ sign: '+', term: a },
			{ sign: '+', term: b },
			{ sign: '-', term: c },
			{ sign: '+', term: d }
		]);
	});

	it('flattens with opposite: -a + b', () => {
		const a = variable('a');
		const b = variable('b');
		const expr = add(opposite(a), b);
		const result = flattenSumShallow(expr);
		expect(result).toEqual([
			{ sign: '-', term: a },
			{ sign: '+', term: b }
		]);
	});

	it('flattens with positive: +a + b', () => {
		const a = variable('a');
		const b = variable('b');
		const expr = add(positive(a), b);
		const result = flattenSumShallow(expr);
		expect(result).toEqual([
			{ sign: '+', term: a },
			{ sign: '+', term: b }
		]);
	});

	it('stops at delimiter boundary: a + (b + c)', () => {
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		const delim = parentheses(add(b, c));
		const expr = add(a, delim);
		const result = flattenSumShallow(expr);
		// Should NOT flatten inside the delimiter
		expect(result).toEqual([
			{ sign: '+', term: a },
			{ sign: '+', term: delim }
		]);
	});

	it('handles delimiter with negative sign: a - (b + c)', () => {
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		const delim = parentheses(add(b, c));
		const expr = subtract(a, delim);
		const result = flattenSumShallow(expr);
		expect(result).toEqual([
			{ sign: '+', term: a },
			{ sign: '-', term: delim }
		]);
	});

	it('handles nested structure: -(a + b) + c', () => {
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		const delim = parentheses(add(a, b));
		const expr = add(opposite(delim), c);
		const result = flattenSumShallow(expr);
		expect(result).toEqual([
			{ sign: '-', term: delim },
			{ sign: '+', term: c }
		]);
	});

	it('handles complex chain: (a - b) + (c - d)', () => {
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		const d = variable('d');
		const expr = add(subtract(a, b), subtract(c, d));
		const result = flattenSumShallow(expr);
		// Flattens left and right sides
		expect(result).toEqual([
			{ sign: '+', term: a },
			{ sign: '-', term: b },
			{ sign: '+', term: c },
			{ sign: '-', term: d }
		]);
	});
});

// =============================================================================
// flattenProductShallow Tests
// =============================================================================

describe('flattenProductShallow', () => {
	it('flattens single factor to single-element array', () => {
		const a = variable('a');
		const result = flattenProductShallow(a);
		expect(result).toEqual([a]);
	});

	it('flattens multiplication chain: a * b * c', () => {
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		// (a * b) * c
		const expr = multiply(multiply(a, b, 'dot'), c, 'dot');
		const result = flattenProductShallow(expr);
		expect(result).toEqual([a, b, c]);
	});

	it('stops at delimiter boundary: a * (b * c)', () => {
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		const delim = parentheses(multiply(b, c, 'dot'));
		const expr = multiply(a, delim, 'dot');
		const result = flattenProductShallow(expr);
		// Should NOT flatten inside the delimiter
		expect(result).toEqual([a, delim]);
	});

	it('handles mixed display styles', () => {
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		// (a * b) * c with different display styles
		const expr = multiply(multiply(a, b, 'dot'), c, 'implicit');
		const result = flattenProductShallow(expr);
		// Display styles are preserved in the nodes but not in the flat array
		expect(result).toEqual([a, b, c]);
	});

	it('handles numeric coefficients: 2 * x * y', () => {
		const two = number('2');
		const x = variable('x');
		const y = variable('y');
		const expr = multiply(multiply(two, x, 'dot'), y, 'dot');
		const result = flattenProductShallow(expr);
		expect(result).toEqual([two, x, y]);
	});

	it('handles long multiplication chain: a * b * c * d * e', () => {
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		const d = variable('d');
		const e = variable('e');
		// ((((a * b) * c) * d) * e)
		const expr = multiply(multiply(multiply(multiply(a, b, 'dot'), c, 'dot'), d, 'dot'), e, 'dot');
		const result = flattenProductShallow(expr);
		expect(result).toEqual([a, b, c, d, e]);
	});

	it('stops at multiple delimiters: (a * b) * (c * d)', () => {
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		const d = variable('d');
		const delim1 = parentheses(multiply(a, b, 'dot'));
		const delim2 = parentheses(multiply(c, d, 'dot'));
		const expr = multiply(delim1, delim2, 'dot');
		const result = flattenProductShallow(expr);
		expect(result).toEqual([delim1, delim2]);
	});
});

// =============================================================================
// flattenSumDeep Tests
// =============================================================================

describe('flattenSumDeep', () => {
	it('flattens simple sum same as shallow', () => {
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		const expr = add(add(a, b), c);
		const result = flattenSumDeep(expr);

		expect(result.terms).toEqual([
			{ sign: '+', term: a },
			{ sign: '+', term: b },
			{ sign: '+', term: c }
		]);
		expect(result.subLists.size).toBe(0);
	});

	it('creates subList entry for delimiter: a + (b + c)', () => {
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		const delim = parentheses(add(b, c));
		const expr = add(a, delim);
		const result = flattenSumDeep(expr);

		// Shallow terms include the delimiter
		expect(result.terms).toEqual([
			{ sign: '+', term: a },
			{ sign: '+', term: delim }
		]);

		// SubList should contain the flattened content of the delimiter
		expect(result.subLists.size).toBe(1);
		expect(result.subLists.has(delim)).toBe(true);

		const delimContent = result.subLists.get(delim);
		expect(delimContent).toBeDefined();
		if (delimContent && 'terms' in delimContent) {
			expect(delimContent.terms).toEqual([
				{ sign: '+', term: b },
				{ sign: '+', term: c }
			]);
		}
	});

	it('creates subList entry for nested multiplication: a + b * c', () => {
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		const prod = multiply(b, c, 'dot');
		const expr = add(a, prod);
		const result = flattenSumDeep(expr);

		// Shallow terms
		expect(result.terms).toEqual([
			{ sign: '+', term: a },
			{ sign: '+', term: prod }
		]);

		// SubList should contain the product
		expect(result.subLists.size).toBe(1);
		expect(result.subLists.has(prod)).toBe(true);

		const prodContent = result.subLists.get(prod);
		expect(prodContent).toBeDefined();
		if (prodContent && 'factors' in prodContent) {
			expect(prodContent.factors).toEqual([b, c]);
		}
	});

	it('handles multiple levels of nesting: (a + (b + c)) + d', () => {
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		const d = variable('d');
		const innerDelim = parentheses(add(b, c));
		const outerDelim = parentheses(add(a, innerDelim));
		const expr = add(outerDelim, d);
		const result = flattenSumDeep(expr);

		// Top level has the outer delimiter and d
		expect(result.terms).toEqual([
			{ sign: '+', term: outerDelim },
			{ sign: '+', term: d }
		]);

		// Should have subList for outerDelim
		expect(result.subLists.has(outerDelim)).toBe(true);

		const outerContent = result.subLists.get(outerDelim);
		if (outerContent && 'terms' in outerContent) {
			expect(outerContent.terms).toEqual([
				{ sign: '+', term: a },
				{ sign: '+', term: innerDelim }
			]);

			// Should also have subList for innerDelim
			expect(outerContent.subLists.has(innerDelim)).toBe(true);

			const innerContent = outerContent.subLists.get(innerDelim);
			if (innerContent && 'terms' in innerContent) {
				expect(innerContent.terms).toEqual([
					{ sign: '+', term: b },
					{ sign: '+', term: c }
				]);
			}
		}
	});

	it('handles mixed operations with nested structures: a * b + (c + d)', () => {
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		const d = variable('d');
		const prod = multiply(a, b, 'dot');
		const delim = parentheses(add(c, d));
		const expr = add(prod, delim);
		const result = flattenSumDeep(expr);

		// Shallow level
		expect(result.terms).toEqual([
			{ sign: '+', term: prod },
			{ sign: '+', term: delim }
		]);

		// Should have subLists for both
		expect(result.subLists.size).toBe(2);
		expect(result.subLists.has(prod)).toBe(true);
		expect(result.subLists.has(delim)).toBe(true);
	});
});

// =============================================================================
// flattenProductDeep Tests
// =============================================================================

describe('flattenProductDeep', () => {
	it('flattens simple product same as shallow', () => {
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		const expr = multiply(multiply(a, b, 'dot'), c, 'dot');
		const result = flattenProductDeep(expr);

		expect(result.factors).toEqual([a, b, c]);
		expect(result.subLists.size).toBe(0);
	});

	it('creates subList entry for delimiter with sum: a * (b + c)', () => {
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		const delim = parentheses(add(b, c));
		const expr = multiply(a, delim, 'dot');
		const result = flattenProductDeep(expr);

		// Shallow factors include the delimiter
		expect(result.factors).toEqual([a, delim]);

		// SubList should contain the sum content
		expect(result.subLists.size).toBe(1);
		expect(result.subLists.has(delim)).toBe(true);

		const delimContent = result.subLists.get(delim);
		expect(delimContent).toBeDefined();
		if (delimContent && 'terms' in delimContent) {
			expect(delimContent.terms).toEqual([
				{ sign: '+', term: b },
				{ sign: '+', term: c }
			]);
		}
	});

	it('creates subList entry for delimiter with product: a * (b * c)', () => {
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		const delim = parentheses(multiply(b, c, 'dot'));
		const expr = multiply(a, delim, 'dot');
		const result = flattenProductDeep(expr);

		// Shallow factors include the delimiter
		expect(result.factors).toEqual([a, delim]);

		// SubList should contain the product content
		expect(result.subLists.size).toBe(1);
		expect(result.subLists.has(delim)).toBe(true);

		const delimContent = result.subLists.get(delim);
		expect(delimContent).toBeDefined();
		if (delimContent && 'factors' in delimContent) {
			expect(delimContent.factors).toEqual([b, c]);
		}
	});

	it('creates subList for addition within product: a * (b + c) * d', () => {
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		const d = variable('d');
		const delim = parentheses(add(b, c));
		const expr = multiply(multiply(a, delim, 'dot'), d, 'dot');
		const result = flattenProductDeep(expr);

		// Shallow factors
		expect(result.factors).toEqual([a, delim, d]);

		// Should have subList for the delimiter
		expect(result.subLists.size).toBe(1);
		expect(result.subLists.has(delim)).toBe(true);
	});

	it('handles multiple levels of nesting: (a * (b * c)) * d', () => {
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		const d = variable('d');
		const innerDelim = parentheses(multiply(b, c, 'dot'));
		const outerDelim = parentheses(multiply(a, innerDelim, 'dot'));
		const expr = multiply(outerDelim, d, 'dot');
		const result = flattenProductDeep(expr);

		// Top level has outer delimiter and d
		expect(result.factors).toEqual([outerDelim, d]);

		// Should have subList for outerDelim
		expect(result.subLists.has(outerDelim)).toBe(true);

		const outerContent = result.subLists.get(outerDelim);
		if (outerContent && 'factors' in outerContent) {
			expect(outerContent.factors).toEqual([a, innerDelim]);

			// Should also have subList for innerDelim
			expect(outerContent.subLists.has(innerDelim)).toBe(true);

			const innerContent = outerContent.subLists.get(innerDelim);
			if (innerContent && 'factors' in innerContent) {
				expect(innerContent.factors).toEqual([b, c]);
			}
		}
	});

	it('handles mixed sum and product: (a + b) * (c * d)', () => {
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		const d = variable('d');
		const sumDelim = parentheses(add(a, b));
		const prodDelim = parentheses(multiply(c, d, 'dot'));
		const expr = multiply(sumDelim, prodDelim, 'dot');
		const result = flattenProductDeep(expr);

		// Shallow level
		expect(result.factors).toEqual([sumDelim, prodDelim]);

		// Should have subLists for both
		expect(result.subLists.size).toBe(2);
		expect(result.subLists.has(sumDelim)).toBe(true);
		expect(result.subLists.has(prodDelim)).toBe(true);

		// First should be a sum
		const sumContent = result.subLists.get(sumDelim);
		if (sumContent && 'terms' in sumContent) {
			expect(sumContent.terms).toEqual([
				{ sign: '+', term: a },
				{ sign: '+', term: b }
			]);
		}

		// Second should be a product
		const prodContent = result.subLists.get(prodDelim);
		if (prodContent && 'factors' in prodContent) {
			expect(prodContent.factors).toEqual([c, d]);
		}
	});
});

// =============================================================================
// Round-trip Tests (flatten then unflatten)
// =============================================================================

describe('Round-trip tests', () => {
	it('sum: flatten preserves term order and signs', () => {
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		const d = variable('d');
		// (a + b) - (c + d)
		const original = subtract(add(a, b), add(c, d));

		const flattened = flattenSumShallow(original);

		// Should flatten to [+a, +b, -c, -d]
		expect(flattened).toEqual([
			{ sign: '+', term: a },
			{ sign: '+', term: b },
			{ sign: '-', term: c },
			{ sign: '-', term: d }
		]);

		// Unflatten creates left-associative structure: (((a + b) - c) - d)
		const reconstructed = unflattenSum(flattened);
		expect(reconstructed).toEqual(subtract(subtract(add(a, b), c), d));
	});

	it('product: shallow flatten then unflatten preserves structure', () => {
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		const d = variable('d');
		// ((a * b) * c) * d
		const original = multiply(multiply(multiply(a, b, 'dot'), c, 'dot'), d, 'dot');

		const flattened = flattenProductShallow(original);
		const reconstructed = unflattenProduct(flattened, 'dot');

		expect(reconstructed).toEqual(original);
	});

	it('complex expression: flatten preserves signs correctly', () => {
		const a = variable('a');
		const b = variable('b');
		const c = variable('c');
		// -(a + b) - c
		const original = subtract(opposite(add(a, b)), c);

		const flattened = flattenSumShallow(original);

		// opposite(a + b) should flatten to [-a, -b]
		// Then - c adds [-c]
		// Result: [-a, -b, -c]
		expect(flattened).toEqual([
			{ sign: '-', term: a },
			{ sign: '-', term: b },
			{ sign: '-', term: c }
		]);

		// Unflatten creates left-associative: ((-a - b) - c)
		const reconstructed = unflattenSum(flattened);
		expect(reconstructed).toEqual(subtract(subtract(opposite(a), b), c));
	});
});
