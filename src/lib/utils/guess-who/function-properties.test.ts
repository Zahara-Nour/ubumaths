/**
 * Tests for Function Graph Properties
 *
 * @vitest-environment node
 */

import { describe, test, expect } from 'vitest';
import {
	createFunctionGraph,
	createFunctionGraphSafe,
	checkFunctionProperty,
	generateFunctions,
	generateFunctionGrid,
	functionToUbumark,
	functionsEqual,
	FUNCTION_TEMPLATES
} from './function-properties';

// ============================================================================
// FUNCTION CREATION TESTS
// ============================================================================

describe('createFunctionGraph', () => {
	test('creates function from x', () => {
		const fn = createFunctionGraph('x');
		expect(fn.latex).toBe('x');
		expect(fn.ast).toBeDefined();
		expect(fn.analysis).not.toBeNull();
	});

	test('creates function from x^2', () => {
		const fn = createFunctionGraph('x^2');
		expect(fn.latex).toBe('x^2');
		expect(fn.ast).toBeDefined();
	});

	test('creates function from sin(x)', () => {
		const fn = createFunctionGraph('\\sin(x)');
		expect(fn.ast).toBeDefined();
	});

	test('createFunctionGraphSafe returns null for invalid LaTeX', () => {
		const fn = createFunctionGraphSafe('{{invalid');
		expect(fn).toBeNull();
	});
});

// ============================================================================
// ANALYSIS TESTS
// ============================================================================

describe('Function analysis', () => {
	test('x passes through origin', () => {
		const fn = createFunctionGraph('x');
		expect(fn.analysis?.passesOrigin).toBe(true);
	});

	test('x + 1 does not pass through origin', () => {
		const fn = createFunctionGraph('x + 1');
		expect(fn.analysis?.passesOrigin).toBe(false);
	});

	test('x is increasing at zero', () => {
		const fn = createFunctionGraph('x');
		expect(fn.analysis?.increasingAtZero).toBe(true);
		expect(fn.analysis?.decreasingAtZero).toBe(false);
	});

	test('-x is decreasing at zero', () => {
		const fn = createFunctionGraph('-x');
		expect(fn.analysis?.decreasingAtZero).toBe(true);
		expect(fn.analysis?.increasingAtZero).toBe(false);
	});

	test('x^2 has minimum', () => {
		const fn = createFunctionGraph('x^2');
		expect(fn.analysis?.hasMinimum).toBe(true);
	});

	test('-x^2 has maximum', () => {
		const fn = createFunctionGraph('-x^2');
		expect(fn.analysis?.hasMaximum).toBe(true);
	});

	test('x^2 - 1 has roots', () => {
		const fn = createFunctionGraph('x^2 - 1');
		expect(fn.analysis?.hasRoot).toBe(true);
		expect(fn.analysis?.rootCount).toBeGreaterThanOrEqual(2);
	});

	test('x^2 + 1 has no real roots', () => {
		const fn = createFunctionGraph('x^2 + 1');
		expect(fn.analysis?.hasRoot).toBe(false);
	});

	test('x^2 is even', () => {
		const fn = createFunctionGraph('x^2');
		expect(fn.analysis?.isEven).toBe(true);
		expect(fn.analysis?.isOdd).toBe(false);
	});

	test('x^3 is odd', () => {
		const fn = createFunctionGraph('x^3');
		expect(fn.analysis?.isOdd).toBe(true);
		expect(fn.analysis?.isEven).toBe(false);
	});

	test('1/x has vertical asymptote', () => {
		const fn = createFunctionGraph('\\frac{1}{x}');
		expect(fn.analysis?.hasVerticalAsymptote).toBe(true);
	});
});

// ============================================================================
// PROPERTY CHECK TESTS
// ============================================================================

describe('checkFunctionProperty', () => {
	const linear = createFunctionGraph('x');
	const quadratic = createFunctionGraph('x^2');
	const cubic = createFunctionGraph('x^3');

	test('passes_origin check', () => {
		expect(checkFunctionProperty(linear, 'passes_origin')).toBe(true);
		expect(checkFunctionProperty(quadratic, 'passes_origin')).toBe(true);
		const shifted = createFunctionGraph('x + 1');
		expect(checkFunctionProperty(shifted, 'passes_origin')).toBe(false);
	});

	test('increasing_at_zero check', () => {
		expect(checkFunctionProperty(linear, 'increasing_at_zero')).toBe(true);
		expect(checkFunctionProperty(cubic, 'increasing_at_zero')).toBe(true);
	});

	test('has_minimum check', () => {
		expect(checkFunctionProperty(quadratic, 'has_minimum')).toBe(true);
	});

	test('has_maximum check', () => {
		const negQuad = createFunctionGraph('-x^2');
		expect(checkFunctionProperty(negQuad, 'has_maximum')).toBe(true);
	});

	test('is_even check', () => {
		expect(checkFunctionProperty(quadratic, 'is_even')).toBe(true);
		expect(checkFunctionProperty(cubic, 'is_even')).toBe(false);
	});

	test('is_odd check', () => {
		expect(checkFunctionProperty(cubic, 'is_odd')).toBe(true);
		expect(checkFunctionProperty(quadratic, 'is_odd')).toBe(false);
	});

	test('y_intercept_positive check', () => {
		const fn = createFunctionGraph('x^2 + 1');
		expect(checkFunctionProperty(fn, 'y_intercept_positive')).toBe(true);
	});

	test('y_intercept_negative check', () => {
		const fn = createFunctionGraph('x^2 - 1');
		expect(checkFunctionProperty(fn, 'y_intercept_negative')).toBe(true);
	});

	test('has_root check', () => {
		const withRoot = createFunctionGraph('x^2 - 1');
		expect(checkFunctionProperty(withRoot, 'has_root')).toBe(true);
		const noRoot = createFunctionGraph('x^2 + 1');
		expect(checkFunctionProperty(noRoot, 'has_root')).toBe(false);
	});

	test('root_count check', () => {
		const withRoots = createFunctionGraph('x^2 - 4');
		expect(checkFunctionProperty(withRoots, 'root_count', 2)).toBe(true);
	});

	test('throws error when param is missing', () => {
		expect(() => checkFunctionProperty(linear, 'root_count')).toThrow();
		expect(() => checkFunctionProperty(linear, 'root_count_greater_than')).toThrow();
	});
});

// ============================================================================
// GENERATION TESTS
// ============================================================================

describe('generateFunctions', () => {
	test('generates linear functions', () => {
		const fns = generateFunctions('linear', 3);
		expect(fns).toHaveLength(3);
	});

	test('generates quadratic functions', () => {
		const fns = generateFunctions('quadratic', 3);
		expect(fns).toHaveLength(3);
	});

	test('generates unique functions', () => {
		const fns = generateFunctions('linear', 4);
		const latexSet = new Set(fns.map((f) => f.latex));
		expect(latexSet.size).toBe(4);
	});
});

describe('generateFunctionGrid', () => {
	test('generates correct count', () => {
		const grid = generateFunctionGrid(10);
		expect(grid).toHaveLength(10);
	});

	test('generates unique functions', () => {
		const grid = generateFunctionGrid(10);
		const latexSet = new Set(grid.map((f) => f.latex));
		expect(latexSet.size).toBe(10);
	});
});

// ============================================================================
// DISPLAY TESTS
// ============================================================================

describe('Display functions', () => {
	test('functionToUbumark wraps in y= format', () => {
		const fn = createFunctionGraph('x^2');
		expect(functionToUbumark(fn)).toBe('$y = x^2$');
	});
});

// ============================================================================
// EQUALITY TESTS
// ============================================================================

describe('functionsEqual', () => {
	test('same function returns true', () => {
		const f1 = createFunctionGraph('x^2');
		const f2 = createFunctionGraph('x^2');
		expect(functionsEqual(f1, f2)).toBe(true);
	});

	test('different functions return false', () => {
		const f1 = createFunctionGraph('x^2');
		const f2 = createFunctionGraph('x^3');
		expect(functionsEqual(f1, f2)).toBe(false);
	});
});

// ============================================================================
// TEMPLATE TESTS
// ============================================================================

describe('FUNCTION_TEMPLATES', () => {
	test('all template categories exist', () => {
		expect(FUNCTION_TEMPLATES.linear).toBeDefined();
		expect(FUNCTION_TEMPLATES.quadratic).toBeDefined();
		expect(FUNCTION_TEMPLATES.polynomial).toBeDefined();
		expect(FUNCTION_TEMPLATES.trigonometric).toBeDefined();
		expect(FUNCTION_TEMPLATES.rational).toBeDefined();
		expect(FUNCTION_TEMPLATES.exponential).toBeDefined();
		expect(FUNCTION_TEMPLATES.absolute).toBeDefined();
	});

	test('templates have functions', () => {
		expect(FUNCTION_TEMPLATES.linear.length).toBeGreaterThan(0);
		expect(FUNCTION_TEMPLATES.quadratic.length).toBeGreaterThan(0);
	});
});
