/**
 * Algebraic Expression Properties for Guess Who Math Game
 *
 * Provides types and utilities for checking properties of algebraic expressions.
 * Uses mathAST for parsing, analysis, and LaTeX rendering.
 *
 * @module utils/guess-who/expression-properties
 */

import {
	type MathNode,
	parseLatex,
	toLatex,
	isVariable,
	isNumber,
	isAddition,
	isSubtraction,
	isMultiplication,
	isDivision,
	isOpposite,
	isSuperscript,
	isFunction,
	mapNode,
	getChildren,
	flattenSumDeep,
	type SignedTerm
} from '$lib/mathAST';

// ============================================================================
// EXPRESSION TYPES
// ============================================================================

/**
 * An algebraic expression with its properties
 */
export interface AlgebraicExpression {
	/** The LaTeX representation */
	latex: string;
	/** The parsed AST */
	ast: MathNode;
	/** Degree of the expression (if polynomial) */
	degree: number;
	/** Variables used in the expression */
	variables: string[];
	/** Whether the expression is a monomial */
	isMonomial: boolean;
	/** Whether the expression is a polynomial */
	isPolynomial: boolean;
	/** Number of terms (for polynomials) */
	termCount: number;
	/** Whether expression contains a fraction */
	hasFraction: boolean;
	/** Whether expression contains a square root */
	hasSquareRoot: boolean;
	/** Coefficient of x (if applicable) */
	coefficientOfX: number | null;
	/** Coefficient of x² (if applicable) */
	coefficientOfX2: number | null;
	/** Constant term */
	constantTerm: number | null;
	/** Leading coefficient */
	leadingCoefficient: number | null;
}

/**
 * Question types for algebraic expressions
 */
export type ExpressionQuestionType =
	| 'degree_equals'
	| 'degree_greater_than'
	| 'degree_less_than'
	| 'variable_count'
	| 'has_variable'
	| 'is_monomial'
	| 'is_polynomial'
	| 'term_count_equals'
	| 'term_count_greater_than'
	| 'has_fraction'
	| 'has_square_root'
	| 'has_x_squared'
	| 'has_x_cubed'
	| 'coeff_x_positive'
	| 'coeff_x_negative'
	| 'coeff_x2_positive'
	| 'coeff_x2_negative'
	| 'constant_positive'
	| 'constant_negative'
	| 'constant_zero'
	| 'leading_coeff_positive'
	| 'leading_coeff_negative';

// ============================================================================
// EXPRESSION ANALYSIS
// ============================================================================

/**
 * Get the degree of a term (e.g., 3x² has degree 2)
 */
function getTermDegree(node: MathNode, variable: string = 'x'): number {
	if (isNumber(node)) {
		return 0;
	}

	if (isVariable(node)) {
		return node.name === variable ? 1 : 0;
	}

	if (isSuperscript(node)) {
		if (isVariable(node.base) && node.base.name === variable) {
			if (isNumber(node.superscript)) {
				return parseInt(node.superscript.value, 10);
			}
		}
		return 0;
	}

	if (isMultiplication(node)) {
		return getTermDegree(node.left, variable) + getTermDegree(node.right, variable);
	}

	if (isOpposite(node)) {
		return getTermDegree(node.operand, variable);
	}

	// For other node types, recursively check children
	const children = getChildren(node);
	if (children.length === 0) return 0;

	return Math.max(...children.map((c) => getTermDegree(c, variable)));
}

/**
 * Extract signed terms from a polynomial expression using flattenSumDeep
 */
function extractSignedTerms(node: MathNode): SignedTerm[] {
	const result = flattenSumDeep(node);
	return result.terms;
}

/**
 * Count number of terms in expression
 */
function countTerms(node: MathNode): number {
	return extractSignedTerms(node).length;
}

/**
 * Check if a node contains only polynomial operations
 */
function isPolynomialNode(node: MathNode, variable: string = 'x'): boolean {
	if (isNumber(node)) return true;
	if (isVariable(node)) return node.name === variable;

	if (isSuperscript(node)) {
		if (isVariable(node.base) && node.base.name === variable && isNumber(node.superscript)) {
			const exp = parseInt(node.superscript.value, 10);
			return Number.isInteger(exp) && exp >= 0;
		}
		return false;
	}

	if (isAddition(node) || isSubtraction(node)) {
		return isPolynomialNode(node.left, variable) && isPolynomialNode(node.right, variable);
	}

	if (isMultiplication(node)) {
		return isPolynomialNode(node.left, variable) && isPolynomialNode(node.right, variable);
	}

	if (isOpposite(node)) {
		return isPolynomialNode(node.operand, variable);
	}

	// Division, functions, etc. are not polynomial
	return false;
}

/**
 * Check if expression is a monomial (single term polynomial)
 */
function isMonomialNode(node: MathNode, variable: string = 'x'): boolean {
	if (isNumber(node)) return true;
	if (isVariable(node)) return true;

	if (isSuperscript(node)) {
		return isVariable(node.base) && isNumber(node.superscript);
	}

	if (isMultiplication(node)) {
		return isMonomialNode(node.left, variable) && isMonomialNode(node.right, variable);
	}

	if (isOpposite(node)) {
		return isMonomialNode(node.operand, variable);
	}

	return false;
}

/**
 * Extract coefficient of a specific power of x
 */
function extractCoefficient(ast: MathNode, power: number, variable: string = 'x'): number | null {
	try {
		const signedTerms = extractSignedTerms(ast);
		let coefficient = 0;
		let found = false;

		for (const signedTerm of signedTerms) {
			const termDegree = getTermDegree(signedTerm.term, variable);
			if (termDegree === power) {
				found = true;
				// Get the unsigned coefficient and apply the sign
				const unsignedCoeff = extractTermCoefficient(signedTerm.term, power, variable);
				coefficient += signedTerm.sign === '+' ? unsignedCoeff : -unsignedCoeff;
			}
		}

		return found ? coefficient : null;
	} catch {
		return null;
	}
}

/**
 * Extract the numeric coefficient from a term (with sign preserved)
 * Note: Sign may come from Opposite nodes wrapping numbers
 */
function extractTermCoefficient(term: MathNode, power: number, variable: string = 'x'): number {
	if (power === 0) {
		// Constant term
		if (isNumber(term)) {
			return parseFloat(term.value);
		}
		if (isOpposite(term) && isNumber(term.operand)) {
			return -parseFloat(term.operand.value);
		}
		return 0;
	}

	if (isVariable(term) && term.name === variable && power === 1) {
		return 1;
	}

	if (isSuperscript(term) && isVariable(term.base) && term.base.name === variable) {
		if (isNumber(term.superscript) && parseInt(term.superscript.value, 10) === power) {
			return 1;
		}
	}

	if (isMultiplication(term)) {
		// Handle cases like 3*x, (-3)*x, x*3, etc.
		const leftDegree = getTermDegree(term.left, variable);
		const rightDegree = getTermDegree(term.right, variable);

		if (rightDegree === power && leftDegree === 0) {
			// Left is the coefficient, right has the variable
			if (isNumber(term.left)) {
				return parseFloat(term.left.value);
			}
			if (isOpposite(term.left) && isNumber(term.left.operand)) {
				return -parseFloat(term.left.operand.value);
			}
		}

		if (leftDegree === power && rightDegree === 0) {
			// Right is the coefficient, left has the variable
			if (isNumber(term.right)) {
				return parseFloat(term.right.value);
			}
			if (isOpposite(term.right) && isNumber(term.right.operand)) {
				return -parseFloat(term.right.operand.value);
			}
		}
	}

	// For Opposite nodes wrapping the whole term
	if (isOpposite(term)) {
		return -extractTermCoefficient(term.operand, power, variable);
	}

	return 0;
}

/**
 * Check if AST contains a square root function
 */
function hasSquareRootNode(node: MathNode): boolean {
	if (isFunction(node) && node.name === 'sqrt') {
		return true;
	}
	const children = getChildren(node);
	return children.some((c) => hasSquareRootNode(c));
}

/**
 * Check if AST contains a division (fraction)
 */
function hasFractionNode(node: MathNode): boolean {
	if (isDivision(node)) {
		return true;
	}
	const children = getChildren(node);
	return children.some((c) => hasFractionNode(c));
}

/**
 * Find all variables used in the expression
 */
function findVariables(node: MathNode): string[] {
	const variables = new Set<string>();
	mapNode(node, (n) => {
		if (isVariable(n)) {
			variables.add(n.name);
		}
		return n;
	});
	return Array.from(variables).sort();
}

// ============================================================================
// EXPRESSION CREATION
// ============================================================================

/**
 * Create an AlgebraicExpression from a LaTeX string
 */
export function createExpression(latex: string): AlgebraicExpression {
	const ast = parseLatex(latex);
	const variables = findVariables(ast);
	const mainVar = variables.includes('x') ? 'x' : variables[0] || 'x';

	const degree = getTermDegree(ast, mainVar);
	const isPolynomialExpr = isPolynomialNode(ast, mainVar);
	const isMonomialExpr = isMonomialNode(ast, mainVar);
	const termCount = countTerms(ast);

	const coeffX = extractCoefficient(ast, 1, mainVar);
	const coeffX2 = extractCoefficient(ast, 2, mainVar);
	const constantTerm = extractCoefficient(ast, 0, mainVar);
	const leadingCoeff = extractCoefficient(ast, degree, mainVar);

	return {
		latex,
		ast,
		degree,
		variables,
		isMonomial: isMonomialExpr,
		isPolynomial: isPolynomialExpr,
		termCount,
		hasFraction: hasFractionNode(ast),
		hasSquareRoot: hasSquareRootNode(ast),
		coefficientOfX: coeffX,
		coefficientOfX2: coeffX2,
		constantTerm,
		leadingCoefficient: leadingCoeff
	};
}

/**
 * Safe version of createExpression that returns null on parse errors
 */
export function createExpressionSafe(latex: string): AlgebraicExpression | null {
	try {
		return createExpression(latex);
	} catch {
		return null;
	}
}

// ============================================================================
// PROPERTY CHECKS
// ============================================================================

/**
 * Check an expression property by type
 */
export function checkExpressionProperty(
	expr: AlgebraicExpression,
	type: ExpressionQuestionType,
	param?: number | string
): boolean {
	switch (type) {
		case 'degree_equals':
			if (param === undefined) throw new Error('degree_equals requires param');
			return expr.degree === param;
		case 'degree_greater_than':
			if (param === undefined) throw new Error('degree_greater_than requires param');
			return expr.degree > (param as number);
		case 'degree_less_than':
			if (param === undefined) throw new Error('degree_less_than requires param');
			return expr.degree < (param as number);
		case 'variable_count':
			if (param === undefined) throw new Error('variable_count requires param');
			return expr.variables.length === param;
		case 'has_variable':
			if (param === undefined) throw new Error('has_variable requires param');
			return expr.variables.includes(param as string);
		case 'is_monomial':
			return expr.isMonomial;
		case 'is_polynomial':
			return expr.isPolynomial;
		case 'term_count_equals':
			if (param === undefined) throw new Error('term_count_equals requires param');
			return expr.termCount === param;
		case 'term_count_greater_than':
			if (param === undefined) throw new Error('term_count_greater_than requires param');
			return expr.termCount > (param as number);
		case 'has_fraction':
			return expr.hasFraction;
		case 'has_square_root':
			return expr.hasSquareRoot;
		case 'has_x_squared':
			return expr.coefficientOfX2 !== null && expr.coefficientOfX2 !== 0;
		case 'has_x_cubed':
			return expr.degree >= 3;
		case 'coeff_x_positive':
			return expr.coefficientOfX !== null && expr.coefficientOfX > 0;
		case 'coeff_x_negative':
			return expr.coefficientOfX !== null && expr.coefficientOfX < 0;
		case 'coeff_x2_positive':
			return expr.coefficientOfX2 !== null && expr.coefficientOfX2 > 0;
		case 'coeff_x2_negative':
			return expr.coefficientOfX2 !== null && expr.coefficientOfX2 < 0;
		case 'constant_positive':
			return expr.constantTerm !== null && expr.constantTerm > 0;
		case 'constant_negative':
			return expr.constantTerm !== null && expr.constantTerm < 0;
		case 'constant_zero':
			return expr.constantTerm === 0;
		case 'leading_coeff_positive':
			return expr.leadingCoefficient !== null && expr.leadingCoefficient > 0;
		case 'leading_coeff_negative':
			return expr.leadingCoefficient !== null && expr.leadingCoefficient < 0;
	}
}

// ============================================================================
// EXPRESSION GENERATION
// ============================================================================

/**
 * Predefined expression templates for generating varied expressions
 */
export const EXPRESSION_TEMPLATES = {
	// Linear expressions (degree 1)
	linear: ['x + {a}', '{a}x + {b}', '{a}x - {b}', '-{a}x + {b}', '{a}x', '{b} - {a}x'],
	// Quadratic expressions (degree 2)
	quadratic: [
		'x^2 + {a}x + {b}',
		'x^2 - {a}x + {b}',
		'{a}x^2 + {b}x + {c}',
		'{a}x^2 - {b}x + {c}',
		'x^2 + {a}',
		'{a}x^2 - {b}',
		'-x^2 + {a}x + {b}',
		'-{a}x^2 + {b}'
	],
	// Cubic expressions (degree 3)
	cubic: [
		'x^3 + {a}x^2 + {b}x + {c}',
		'x^3 - {a}x + {b}',
		'{a}x^3 + {b}x^2 + {c}',
		'-x^3 + {a}x^2 - {b}x'
	],
	// Monomials
	monomials: ['{a}', '{a}x', '{a}x^2', '{a}x^3', '-{a}x^2'],
	// With fractions
	withFractions: ['\\frac{x + {a}}{b}', '\\frac{x^2}{a}', 'x + \\frac{{a}}{{b}}'],
	// With square roots
	withRoots: ['\\sqrt{x}', '\\sqrt{x + {a}}', 'x + \\sqrt{{a}}']
} as const;

/**
 * Generate a random coefficient
 */
function randomCoeff(min: number = 1, max: number = 9): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Fill template with random coefficients
 */
function fillTemplate(template: string): string {
	return template
		.replace(/\{a\}/g, String(randomCoeff()))
		.replace(/\{b\}/g, String(randomCoeff()))
		.replace(/\{c\}/g, String(randomCoeff()));
}

/**
 * Generate expressions from a category
 */
export function generateExpressions(
	category: keyof typeof EXPRESSION_TEMPLATES,
	count: number
): AlgebraicExpression[] {
	const templates = EXPRESSION_TEMPLATES[category];
	const expressions: AlgebraicExpression[] = [];
	const usedLatex = new Set<string>();

	let attempts = 0;
	const maxAttempts = count * 10;

	while (expressions.length < count && attempts < maxAttempts) {
		attempts++;
		const template = templates[Math.floor(Math.random() * templates.length)];
		const latex = fillTemplate(template);

		if (usedLatex.has(latex)) continue;

		const expr = createExpressionSafe(latex);
		if (expr) {
			usedLatex.add(latex);
			expressions.push(expr);
		}
	}

	if (expressions.length < count) {
		throw new Error(`Could not generate ${count} unique expressions (got ${expressions.length})`);
	}

	return expressions;
}

/**
 * Generate a mixed grid of expressions
 */
export function generateExpressionGrid(count: number): AlgebraicExpression[] {
	const categories: (keyof typeof EXPRESSION_TEMPLATES)[] = [
		'linear',
		'quadratic',
		'cubic',
		'monomials'
	];

	const expressions: AlgebraicExpression[] = [];
	const usedLatex = new Set<string>();

	let attempts = 0;
	const maxAttempts = count * 20;

	while (expressions.length < count && attempts < maxAttempts) {
		attempts++;
		const category = categories[Math.floor(Math.random() * categories.length)];
		const templates = EXPRESSION_TEMPLATES[category];
		const template = templates[Math.floor(Math.random() * templates.length)];
		const latex = fillTemplate(template);

		if (usedLatex.has(latex)) continue;

		const expr = createExpressionSafe(latex);
		if (expr) {
			usedLatex.add(latex);
			expressions.push(expr);
		}
	}

	if (expressions.length < count) {
		throw new Error(`Could not generate ${count} unique expressions (got ${expressions.length})`);
	}

	return expressions;
}

// ============================================================================
// DISPLAY
// ============================================================================

/**
 * Convert expression to ubumark for display
 */
export function expressionToUbumark(expr: AlgebraicExpression): string {
	return `$${expr.latex}$`;
}

/**
 * Get LaTeX string for display
 */
export function expressionToLatex(expr: AlgebraicExpression): string {
	return toLatex(expr.ast);
}

/**
 * Check if two expressions are equivalent
 */
export function expressionsEqual(e1: AlgebraicExpression, e2: AlgebraicExpression): boolean {
	return e1.latex === e2.latex;
}
