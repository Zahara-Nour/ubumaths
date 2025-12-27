/**
 * Tests for Algebraic Expression Properties
 *
 * @vitest-environment node
 */

import { describe, test, expect } from 'vitest';
import {
	createExpression,
	createExpressionSafe,
	checkExpressionProperty,
	generateExpressions,
	generateExpressionGrid,
	expressionToUbumark,
	expressionToLatex,
	expressionsEqual,
	EXPRESSION_TEMPLATES
} from './expression-properties';

// ============================================================================
// EXPRESSION CREATION TESTS
// ============================================================================

describe('createExpression', () => {
	test('creates expression from simple variable', () => {
		const expr = createExpression('x');
		expect(expr.latex).toBe('x');
		expect(expr.variables).toContain('x');
		expect(expr.degree).toBe(1);
	});

	test('creates expression from number', () => {
		const expr = createExpression('5');
		expect(expr.degree).toBe(0);
		expect(expr.isMonomial).toBe(true);
		expect(expr.variables).toHaveLength(0);
	});

	test('creates linear expression', () => {
		const expr = createExpression('2x + 3');
		expect(expr.degree).toBe(1);
		expect(expr.isPolynomial).toBe(true);
		expect(expr.termCount).toBeGreaterThan(1);
	});

	test('creates quadratic expression', () => {
		const expr = createExpression('x^2 + 2x + 1');
		expect(expr.degree).toBe(2);
		expect(expr.isPolynomial).toBe(true);
	});

	test('creates cubic expression', () => {
		const expr = createExpression('x^3 - x + 1');
		expect(expr.degree).toBe(3);
	});

	test('detects fractions', () => {
		const expr = createExpression('\\frac{x}{2}');
		expect(expr.hasFraction).toBe(true);
	});

	test('detects square roots', () => {
		const expr = createExpression('\\sqrt{x}');
		expect(expr.hasSquareRoot).toBe(true);
	});

	test('createExpressionSafe returns null for invalid LaTeX', () => {
		const expr = createExpressionSafe('{{invalid');
		expect(expr).toBeNull();
	});
});

// ============================================================================
// MONOMIAL DETECTION TESTS
// ============================================================================

describe('Monomial detection', () => {
	test('number is a monomial', () => {
		const expr = createExpression('5');
		expect(expr.isMonomial).toBe(true);
	});

	test('simple variable is a monomial', () => {
		const expr = createExpression('x');
		expect(expr.isMonomial).toBe(true);
	});

	test('coefficient times variable is a monomial', () => {
		const expr = createExpression('3x');
		expect(expr.isMonomial).toBe(true);
	});

	test('variable with exponent is a monomial', () => {
		const expr = createExpression('x^2');
		expect(expr.isMonomial).toBe(true);
	});

	test('coefficient times power is a monomial', () => {
		const expr = createExpression('5x^3');
		expect(expr.isMonomial).toBe(true);
	});

	test('sum is not a monomial', () => {
		const expr = createExpression('x + 1');
		expect(expr.isMonomial).toBe(false);
	});
});

// ============================================================================
// POLYNOMIAL DETECTION TESTS
// ============================================================================

describe('Polynomial detection', () => {
	test('linear expression is polynomial', () => {
		const expr = createExpression('3x + 2');
		expect(expr.isPolynomial).toBe(true);
	});

	test('quadratic is polynomial', () => {
		const expr = createExpression('x^2 - 4');
		expect(expr.isPolynomial).toBe(true);
	});

	test('expression with fraction is not polynomial', () => {
		const expr = createExpression('\\frac{1}{x}');
		expect(expr.isPolynomial).toBe(false);
	});

	test('expression with square root is not polynomial', () => {
		const expr = createExpression('\\sqrt{x}');
		expect(expr.isPolynomial).toBe(false);
	});
});

// ============================================================================
// COEFFICIENT EXTRACTION TESTS
// ============================================================================

describe('Coefficient extraction', () => {
	test('extracts coefficient of x in linear', () => {
		const expr = createExpression('3x + 2');
		expect(expr.coefficientOfX).toBe(3);
	});

	test('extracts constant term', () => {
		const expr = createExpression('x + 5');
		expect(expr.constantTerm).toBe(5);
	});

	test('extracts coefficient of x² in quadratic', () => {
		const expr = createExpression('2x^2 + x + 1');
		expect(expr.coefficientOfX2).toBe(2);
	});

	test('negative coefficient', () => {
		const expr = createExpression('-3x + 1');
		expect(expr.coefficientOfX).toBe(-3);
	});

	test('null coefficient when term missing', () => {
		const expr = createExpression('5');
		expect(expr.coefficientOfX).toBeNull();
	});
});

// ============================================================================
// PROPERTY CHECK TESTS
// ============================================================================

describe('checkExpressionProperty', () => {
	const linear = createExpression('2x + 3');
	const quadratic = createExpression('x^2 - 2x + 1');
	const cubic = createExpression('x^3 + x');
	const monomial = createExpression('5x^2');

	test('degree_equals checks exact degree', () => {
		expect(checkExpressionProperty(linear, 'degree_equals', 1)).toBe(true);
		expect(checkExpressionProperty(quadratic, 'degree_equals', 2)).toBe(true);
		expect(checkExpressionProperty(cubic, 'degree_equals', 3)).toBe(true);
		expect(checkExpressionProperty(linear, 'degree_equals', 2)).toBe(false);
	});

	test('degree_greater_than comparison', () => {
		expect(checkExpressionProperty(quadratic, 'degree_greater_than', 1)).toBe(true);
		expect(checkExpressionProperty(quadratic, 'degree_greater_than', 2)).toBe(false);
	});

	test('degree_less_than comparison', () => {
		expect(checkExpressionProperty(linear, 'degree_less_than', 2)).toBe(true);
		expect(checkExpressionProperty(quadratic, 'degree_less_than', 2)).toBe(false);
	});

	test('is_monomial check', () => {
		expect(checkExpressionProperty(monomial, 'is_monomial')).toBe(true);
		expect(checkExpressionProperty(linear, 'is_monomial')).toBe(false);
	});

	test('is_polynomial check', () => {
		expect(checkExpressionProperty(linear, 'is_polynomial')).toBe(true);
		expect(checkExpressionProperty(quadratic, 'is_polynomial')).toBe(true);
	});

	test('has_x_squared check', () => {
		expect(checkExpressionProperty(quadratic, 'has_x_squared')).toBe(true);
		expect(checkExpressionProperty(linear, 'has_x_squared')).toBe(false);
	});

	test('has_x_cubed check', () => {
		expect(checkExpressionProperty(cubic, 'has_x_cubed')).toBe(true);
		expect(checkExpressionProperty(quadratic, 'has_x_cubed')).toBe(false);
	});

	test('coeff_x_positive check', () => {
		expect(checkExpressionProperty(linear, 'coeff_x_positive')).toBe(true);
	});

	test('coeff_x_negative check', () => {
		const negCoeff = createExpression('-3x + 1');
		expect(checkExpressionProperty(negCoeff, 'coeff_x_negative')).toBe(true);
		expect(checkExpressionProperty(linear, 'coeff_x_negative')).toBe(false);
	});

	test('constant_positive check', () => {
		expect(checkExpressionProperty(linear, 'constant_positive')).toBe(true);
	});

	test('constant_negative check', () => {
		const negConst = createExpression('x - 5');
		expect(checkExpressionProperty(negConst, 'constant_negative')).toBe(true);
	});

	test('has_fraction check', () => {
		const withFrac = createExpression('\\frac{x}{2}');
		expect(checkExpressionProperty(withFrac, 'has_fraction')).toBe(true);
		expect(checkExpressionProperty(linear, 'has_fraction')).toBe(false);
	});

	test('has_square_root check', () => {
		const withRoot = createExpression('\\sqrt{x}');
		expect(checkExpressionProperty(withRoot, 'has_square_root')).toBe(true);
		expect(checkExpressionProperty(linear, 'has_square_root')).toBe(false);
	});

	test('variable_count check', () => {
		expect(checkExpressionProperty(linear, 'variable_count', 1)).toBe(true);
	});

	test('has_variable check', () => {
		expect(checkExpressionProperty(linear, 'has_variable', 'x')).toBe(true);
		expect(checkExpressionProperty(linear, 'has_variable', 'y')).toBe(false);
	});

	test('term_count_equals check', () => {
		expect(checkExpressionProperty(monomial, 'term_count_equals', 1)).toBe(true);
	});

	test('throws error when param is missing', () => {
		expect(() => checkExpressionProperty(linear, 'degree_equals')).toThrow();
		expect(() => checkExpressionProperty(linear, 'degree_greater_than')).toThrow();
	});
});

// ============================================================================
// GENERATION TESTS
// ============================================================================

describe('generateExpressions', () => {
	test('generates linear expressions', () => {
		const exprs = generateExpressions('linear', 5);
		expect(exprs).toHaveLength(5);
		for (const expr of exprs) {
			expect(expr.degree).toBeLessThanOrEqual(1);
		}
	});

	test('generates quadratic expressions', () => {
		const exprs = generateExpressions('quadratic', 5);
		expect(exprs).toHaveLength(5);
		for (const expr of exprs) {
			expect(expr.degree).toBeLessThanOrEqual(2);
		}
	});

	test('generates monomials', () => {
		const exprs = generateExpressions('monomials', 3);
		expect(exprs).toHaveLength(3);
		for (const expr of exprs) {
			expect(expr.isMonomial).toBe(true);
		}
	});

	test('generates unique expressions', () => {
		const exprs = generateExpressions('quadratic', 5);
		const latexSet = new Set(exprs.map((e) => e.latex));
		expect(latexSet.size).toBe(5);
	});
});

describe('generateExpressionGrid', () => {
	test('generates correct count', () => {
		const grid = generateExpressionGrid(10);
		expect(grid).toHaveLength(10);
	});

	test('generates unique expressions', () => {
		const grid = generateExpressionGrid(15);
		const latexSet = new Set(grid.map((e) => e.latex));
		expect(latexSet.size).toBe(15);
	});

	test('includes variety of degrees', () => {
		const grid = generateExpressionGrid(20);
		const degrees = new Set(grid.map((e) => e.degree));
		expect(degrees.size).toBeGreaterThan(1);
	});
});

// ============================================================================
// DISPLAY TESTS
// ============================================================================

describe('Display functions', () => {
	test('expressionToUbumark wraps in dollar signs', () => {
		const expr = createExpression('x^2 + 1');
		expect(expressionToUbumark(expr)).toBe('$x^2 + 1$');
	});

	test('expressionToLatex returns LaTeX string', () => {
		const expr = createExpression('x^2');
		const latex = expressionToLatex(expr);
		expect(latex).toContain('x');
	});
});

// ============================================================================
// EQUALITY TESTS
// ============================================================================

describe('expressionsEqual', () => {
	test('same expression returns true', () => {
		const e1 = createExpression('x^2 + 1');
		const e2 = createExpression('x^2 + 1');
		expect(expressionsEqual(e1, e2)).toBe(true);
	});

	test('different expressions return false', () => {
		const e1 = createExpression('x^2 + 1');
		const e2 = createExpression('x^2 + 2');
		expect(expressionsEqual(e1, e2)).toBe(false);
	});
});

// ============================================================================
// TEMPLATE TESTS
// ============================================================================

describe('EXPRESSION_TEMPLATES', () => {
	test('all template categories exist', () => {
		expect(EXPRESSION_TEMPLATES.linear).toBeDefined();
		expect(EXPRESSION_TEMPLATES.quadratic).toBeDefined();
		expect(EXPRESSION_TEMPLATES.cubic).toBeDefined();
		expect(EXPRESSION_TEMPLATES.monomials).toBeDefined();
		expect(EXPRESSION_TEMPLATES.withFractions).toBeDefined();
		expect(EXPRESSION_TEMPLATES.withRoots).toBeDefined();
	});

	test('linear templates have correct count', () => {
		expect(EXPRESSION_TEMPLATES.linear.length).toBeGreaterThan(0);
	});

	test('quadratic templates have correct count', () => {
		expect(EXPRESSION_TEMPLATES.quadratic.length).toBeGreaterThan(0);
	});
});
