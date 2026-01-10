/**
 * Integrand Classification
 *
 * Functions to classify integrands and detect integration variables.
 *
 * @module mathAST/integration/classify
 */

import type { MathNode } from '../types';
import type { IntegrandType } from './types';
import { IntegrationError } from './types';
import { isNumber, isVariable, isEulerConstant } from '../guards';
import { containsVariable } from './rules';

// =============================================================================
// Variable Detection
// =============================================================================

/**
 * Detect the integration variable from an expression.
 *
 * If the expression contains exactly one variable, return it.
 * If it contains no variables, return null (constant).
 * If it contains multiple variables, throw an error.
 *
 * @param expr - The expression to analyze
 * @returns The variable name, or null if constant
 * @throws IntegrationError if multiple variables are present
 */
export function detectVariable(expr: MathNode): string | null {
	const variables = new Set<string>();

	function collect(node: MathNode): void {
		switch (node.type) {
			case 'variable':
				variables.add(node.name);
				break;

			case 'addition':
			case 'subtraction':
			case 'multiplication':
				collect(node.left);
				collect(node.right);
				break;

			case 'division':
				collect(node.numerator);
				collect(node.denominator);
				break;

			case 'opposite':
			case 'positive':
				collect(node.operand);
				break;

			case 'function':
				node.args.forEach(collect);
				if (node.power) collect(node.power);
				if (node.base) collect(node.base);
				break;

			case 'delimiter':
				collect(node.content);
				break;

			case 'subscript':
				collect(node.base);
				collect(node.subscript);
				break;

			case 'superscript':
				collect(node.base);
				collect(node.superscript);
				break;

			case 'relation':
				collect(node.left);
				collect(node.right);
				break;

			case 'unit':
				collect(node.expression);
				break;

			case 'composition':
				collect(node.outer);
				collect(node.inner);
				break;

			case 'matrix':
				node.rows.forEach((row) => row.forEach(collect));
				break;

			case 'number':
			case 'greek':
			case 'symbol':
			case 'hole':
			case 'constant':
				// These don't contain variables
				break;

			case 'complex':
				// Complex nodes have real and imaginary parts
				collect(node.real);
				collect(node.imaginary);
				break;

			case 'infinity':
				// Infinity doesn't contain variables
				break;

			case 'limit':
				// Limit has expression and approach that may contain variables
				collect(node.expression);
				collect(node.approach);
				break;

			default: {
				const _exhaustive: never = node;
				return _exhaustive;
			}
		}
	}

	collect(expr);

	if (variables.size === 0) {
		return null; // Constant expression
	}

	if (variables.size === 1) {
		return Array.from(variables)[0];
	}

	// Multiple variables
	throw new IntegrationError(
		`Expression contains multiple variables: ${Array.from(variables).join(', ')}`,
		'unknown',
		'Please specify which variable to integrate with respect to'
	);
}

// =============================================================================
// Integrand Classification
// =============================================================================

/**
 * Classify an integrand to determine which integration technique to use.
 *
 * @param expr - The expression to classify
 * @param variable - The variable of integration
 * @returns The integrand type
 */
export function classifyIntegrand(expr: MathNode, variable: string): IntegrandType {
	// Check if expression is constant (doesn't contain the variable)
	if (!containsVariable(expr, variable)) {
		return 'polynomial'; // Treat constants as degree-0 polynomials
	}

	// Check specific patterns
	switch (expr.type) {
		case 'variable':
			// Simple variable: x
			return 'polynomial';

		case 'number':
			// Constant
			return 'polynomial';

		case 'superscript':
			// Power: x^n or f(x)^n or e^x
			// Check for e^x (Euler constant as base)
			if (isEulerConstant(expr.base)) {
				return 'exponential';
			}
			if (isVariable(expr.base) && expr.base.name === variable) {
				// x^n is polynomial (including fractional exponents -> radical)
				if (isNumber(expr.superscript)) {
					const n = parseFloat(expr.superscript.value);
					if (n < 0) {
						// x^(-n) is rational
						return 'rational';
					}
					if (n !== Math.floor(n)) {
						// Fractional exponent
						return 'radical';
					}
					return 'polynomial';
				}
				// x^(expression) could be many things
				return 'mixed';
			}
			// f(x)^n
			return 'product'; // Will need chain rule or other techniques

		case 'division':
			// Rational function: P(x)/Q(x)
			if (
				containsVariable(expr.numerator, variable) ||
				containsVariable(expr.denominator, variable)
			) {
				return 'rational';
			}
			return 'polynomial'; // Constant / constant

		case 'function':
			switch (expr.name) {
				case 'sin':
				case 'cos':
				case 'tan':
				case 'sec':
				case 'csc':
				case 'cot':
					return 'trigonometric';

				case 'arcsin':
				case 'arccos':
				case 'arctan':
				case 'arcsec':
				case 'arccsc':
				case 'arccot':
					return 'inverse-trig';

				case 'exp':
					return 'exponential';

				case 'ln':
				case 'log':
					return 'logarithmic';

				case 'sqrt':
					return 'radical';

				case 'abs':
					// |f(x)| - could be many things
					return classifyIntegrand(expr.args[0], variable);

				default:
					// Unknown function
					return 'unknown';
			}

		case 'multiplication': {
			// Product of functions
			const leftClass = classifyIntegrand(expr.left, variable);
			const rightClass = classifyIntegrand(expr.right, variable);

			// If one side is constant, classify by the other
			if (!containsVariable(expr.left, variable)) {
				return rightClass;
			}
			if (!containsVariable(expr.right, variable)) {
				return leftClass;
			}

			// Both sides contain the variable - it's a product
			return 'product';
		}

		case 'addition':
		case 'subtraction': {
			// Sum/difference: classify by the most complex term
			const leftType = classifyIntegrand(expr.left, variable);
			const rightType = classifyIntegrand(expr.right, variable);

			// Polynomial + polynomial = polynomial
			if (leftType === 'polynomial' && rightType === 'polynomial') {
				return 'polynomial';
			}

			// Otherwise, it's mixed
			return 'mixed';
		}

		case 'opposite':
		case 'positive':
			// Unary operations: classify the operand
			return classifyIntegrand(expr.operand, variable);

		case 'delimiter':
			// Parentheses: classify the content
			return classifyIntegrand(expr.content, variable);

		case 'greek':
		case 'symbol':
			// Greek letters and symbols are constants
			return 'polynomial';

		case 'composition':
			// f∘g composition
			return 'composite';

		default:
			return 'unknown';
	}
}
