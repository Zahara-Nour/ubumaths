/**
 * MathAST Symbolic Differentiation
 *
 * Compute symbolic derivatives of mathematical expressions.
 * Supports basic calculus rules including chain rule, product rule,
 * quotient rule, and derivatives of transcendental functions.
 *
 * @module mathAST/differentiation
 */

import type { MathNode, FunctionNode } from '../types';
import type { DifferentiationOptions } from './types';
import type { FunctionBindings, FunctionDefinition } from '../eval/function-bindings';
import { DEFAULT_DIFFERENTIATION_OPTIONS, DifferentiationError } from './types';
import {
	zero,
	isZero,
	containsVariable,
	constantRule,
	variableRule,
	greekLetterRule,
	sumRule,
	differenceRule,
	productRule,
	quotientRule,
	generalPowerRule,
	powerRuleConstantExp,
	negationRule,
	sinRule,
	cosRule,
	tanRule,
	lnRule,
	logRule,
	expRule,
	sqrtRule,
	arcsinRule,
	arccosRule,
	arctanRule,
	sinhRule,
	coshRule,
	tanhRule,
	simplifiedMultiply
} from './rules';
import { substitute } from '../eval/substitute';
import { derivativeFunc, number, multiply } from '../factory';
import { isDerivativeFunction, isInverseFunction } from '../guards';

// =============================================================================
// Main Differentiation Function
// =============================================================================

/**
 * Compute the symbolic derivative of a MathAST expression.
 *
 * Implements standard differentiation rules:
 * - Constant rule: d/dx(c) = 0
 * - Variable rule: d/dx(x) = 1, d/dx(y) = 0
 * - Sum rule: d/dx(f + g) = f' + g'
 * - Product rule: d/dx(f * g) = f'g + fg'
 * - Quotient rule: d/dx(f/g) = (f'g - fg')/g^2
 * - Chain rule: d/dx(f(g(x))) = f'(g(x)) * g'(x)
 * - Power rule: d/dx(x^n) = n*x^(n-1)
 * - General power: d/dx(f^g) = f^g * (g'*ln(f) + g*f'/f)
 *
 * @param node - The expression to differentiate
 * @param options - Differentiation options
 * @returns The derivative as a MathNode
 *
 * @example
 * // d/dx(x^2) = 2x
 * differentiate(parseLatex('x^2'));
 *
 * // d/dx(sin(x)) = cos(x)
 * differentiate(parseLatex('\\sin(x)'));
 *
 * // d/dx(f(x)) with f(x) = x^2
 * differentiate(parseLatex('f(x)'), {
 *   functions: { f: { expression: parseLatex('x^2'), parameters: ['x'] } }
 * });
 *
 * // d/dy(x*y) = x
 * differentiate(parseLatex('x*y'), { variable: 'y' });
 */
export function differentiate(node: MathNode, options?: DifferentiationOptions): MathNode {
	const variable = options?.variable ?? DEFAULT_DIFFERENTIATION_OPTIONS.variable;
	const simplify = options?.simplify ?? DEFAULT_DIFFERENTIATION_OPTIONS.simplify;
	const functions = options?.functions;

	return differentiateNode(node, variable, simplify, functions);
}

/**
 * Compute the nth derivative of a MathAST expression.
 *
 * @param node - The expression to differentiate
 * @param n - Order of differentiation (1, 2, 3, ...)
 * @param options - Differentiation options
 * @returns The nth derivative as a MathNode
 * @throws Error if n is not a positive integer
 *
 * @example
 * // d^2/dx^2(x^3) = 6x
 * differentiateN(parseLatex('x^3'), 2);
 *
 * // d^3/dx^3(x^4) = 24x
 * differentiateN(parseLatex('x^4'), 3);
 */
export function differentiateN(
	node: MathNode,
	n: number,
	options?: DifferentiationOptions
): MathNode {
	if (!Number.isInteger(n) || n < 1) {
		throw new Error(`Derivative order must be a positive integer, got ${n}`);
	}

	let result = node;
	for (let i = 0; i < n; i++) {
		result = differentiate(result, options);
	}
	return result;
}

// =============================================================================
// Internal Differentiation Logic
// =============================================================================

/**
 * Internal recursive differentiation function
 */
function differentiateNode(
	node: MathNode,
	variable: string,
	simplify: boolean,
	functions?: FunctionBindings
): MathNode {
	// If the expression doesn't contain the variable, it's a constant
	if (!containsVariable(node, variable)) {
		return constantRule();
	}

	switch (node.type) {
		case 'number':
			return constantRule();

		case 'variable':
			return variableRule(node.name, variable);

		case 'greek':
			return greekLetterRule();

		case 'symbol':
			return constantRule();

		case 'hole':
			// Holes are treated as constants (they're placeholders)
			return constantRule();

		case 'addition': {
			const df = differentiateNode(node.left, variable, simplify, functions);
			const dg = differentiateNode(node.right, variable, simplify, functions);
			return sumRule(df, dg, simplify);
		}

		case 'subtraction': {
			const df = differentiateNode(node.left, variable, simplify, functions);
			const dg = differentiateNode(node.right, variable, simplify, functions);
			return differenceRule(df, dg, simplify);
		}

		case 'multiplication': {
			const f = node.left;
			const g = node.right;
			const df = differentiateNode(f, variable, simplify, functions);
			const dg = differentiateNode(g, variable, simplify, functions);
			return productRule(f, g, df, dg, simplify);
		}

		case 'division': {
			const f = node.numerator;
			const g = node.denominator;
			const df = differentiateNode(f, variable, simplify, functions);
			const dg = differentiateNode(g, variable, simplify, functions);
			return quotientRule(f, g, df, dg, simplify);
		}

		case 'opposite': {
			const df = differentiateNode(node.operand, variable, simplify, functions);
			return negationRule(df, simplify);
		}

		case 'positive':
			// +x has the same derivative as x
			return differentiateNode(node.operand, variable, simplify, functions);

		case 'superscript': {
			// Handle x^n (power)
			const base = node.base;
			const exp = node.superscript;
			const dBase = differentiateNode(base, variable, simplify, functions);
			const dExp = differentiateNode(exp, variable, simplify, functions);

			// Check if exponent is constant
			if (!containsVariable(exp, variable)) {
				return powerRuleConstantExp(base, exp, dBase, simplify);
			}

			return generalPowerRule(base, exp, dBase, dExp, simplify);
		}

		case 'function':
			return differentiateFunctionNode(node, variable, simplify, functions);

		case 'delimiter':
			// Parentheses don't change the derivative
			return differentiateNode(node.content, variable, simplify, functions);

		case 'subscript':
			// Subscript is typically used for indexed variables
			// Treat the whole subscripted expression as a single entity
			// For example, x_1 should be treated as a variable
			// If it matches the differentiation variable, return 1; otherwise 0
			// This is a simplification - in practice, subscripts are often constants
			return constantRule();

		case 'relation':
			throw new DifferentiationError(
				'Cannot differentiate a relation',
				'relation',
				'Differentiation is only defined for expressions, not equations or inequalities'
			);

		case 'unit':
			// Units should be handled carefully - for now, differentiate the expression
			// and keep the same unit (this may need refinement for dimensional analysis)
			throw new DifferentiationError(
				'Cannot differentiate expressions with units',
				'unit',
				'Remove units before differentiating or use dimensionless expressions'
			);

		case 'composition':
			// Composition node represents f o g (function composition as an expression)
			// We need to handle this with chain rule conceptually
			throw new DifferentiationError(
				'Cannot directly differentiate composition nodes',
				'composition',
				'Apply the composition to an argument first, e.g., (f o g)(x)'
			);

		case 'matrix':
			// Matrix differentiation is not yet supported in Phase 1
			throw new DifferentiationError(
				'Cannot differentiate matrix nodes',
				'matrix',
				'Matrix calculus is not yet implemented'
			);

		case 'complex':
			// Complex differentiation: d/dx(a+bi) = da/dx + (db/dx)i
			// For now, throw error as complex expressions with variables are not common
			throw new DifferentiationError(
				'Cannot differentiate complex nodes with variables',
				'complex',
				'Complex differentiation is not yet implemented'
			);

		default: {
			const _exhaustive: never = node;
			return _exhaustive;
		}
	}
}

// =============================================================================
// Function Differentiation
// =============================================================================

/**
 * Differentiate a function node
 * Handles built-in functions (sin, cos, etc.) and generic functions with bindings
 */
function differentiateFunctionNode(
	node: FunctionNode,
	variable: string,
	simplify: boolean,
	functions?: FunctionBindings
): MathNode {
	const funcName = node.name.toLowerCase();
	const nodeArgs = node.args;
	const nodeName = node.name;
	const nodeBase = node.base;

	// Handle derivative functions like f'(x)
	if (isDerivativeFunction(node)) {
		return differentiateDerivativeFunction(node, variable, simplify, functions);
	}

	// Handle inverse functions like f^{-1}(x)
	if (isInverseFunction(node)) {
		return differentiateInverseFunction(node, variable, simplify, functions);
	}

	// Check for generic function with binding
	if (functions && nodeName in functions) {
		return differentiateGenericFunction(node, variable, simplify, functions);
	}

	// Handle built-in functions
	// Most functions have exactly one argument
	if (nodeArgs.length === 1) {
		const u = nodeArgs[0];
		const du = differentiateNode(u, variable, simplify, functions);

		switch (funcName) {
			case 'sin':
				return sinRule(u, du, simplify);

			case 'cos':
				return cosRule(u, du, simplify);

			case 'tan':
				return tanRule(u, du, simplify);

			case 'ln':
				return lnRule(u, du, simplify);

			case 'log': {
				// log without base is log_10 by default
				const base = nodeBase ?? number('10');
				return logRule(u, base, du, simplify);
			}

			case 'exp':
				return expRule(u, du, simplify);

			case 'sqrt':
				return sqrtRule(u, du, simplify);

			case 'arcsin':
			case 'asin':
				return arcsinRule(u, du, simplify);

			case 'arccos':
			case 'acos':
				return arccosRule(u, du, simplify);

			case 'arctan':
			case 'atan':
				return arctanRule(u, du, simplify);

			case 'sinh':
				return sinhRule(u, du, simplify);

			case 'cosh':
				return coshRule(u, du, simplify);

			case 'tanh':
				return tanhRule(u, du, simplify);

			case 'abs':
				// d/dx(|u|) = u'/|u| * u (for u != 0)
				// This is a simplification; the true derivative involves sign(u)
				throw new DifferentiationError(
					'Cannot differentiate absolute value',
					'function',
					'The derivative of |x| is not defined at x = 0 and requires sign function'
				);

			case 'floor':
			case 'ceil':
			case 'round':
				throw new DifferentiationError(
					`Cannot differentiate ${funcName}`,
					'function',
					`The ${funcName} function is not differentiable at integer points`
				);

			case 'min':
			case 'max':
				throw new DifferentiationError(
					`Cannot differentiate ${funcName}`,
					'function',
					`The ${funcName} function is not differentiable at points where arguments are equal`
				);

			default:
				// Unknown function - if it's a user-defined function that's not in bindings,
				// we need to treat it symbolically using the chain rule
				return differentiateUnknownFunction(node, variable, simplify, functions);
		}
	}

	// Handle multi-argument functions
	throw new DifferentiationError(
		`Cannot differentiate multi-argument function ${nodeName}`,
		'function',
		'Only single-argument functions are supported for automatic differentiation'
	);
}

/**
 * Differentiate a derivative function like f'(x) or f''(x)
 * Returns f''(x) or f'''(x) respectively
 */
function differentiateDerivativeFunction(
	node: FunctionNode,
	variable: string,
	simplify: boolean,
	functions?: FunctionBindings
): MathNode {
	const order = node.derivativeOrder ?? 1;
	const funcDef = functions?.[node.name];

	// If we have a function definition with a pre-computed derivative
	if (funcDef?.derivative && order === 1) {
		// Substitute the argument into the derivative and differentiate that
		const substituted = substituteDerivative(funcDef, node.args);
		return differentiateNode(substituted, variable, simplify, functions);
	}

	// If we have the original function definition, compute higher-order derivative
	if (funcDef) {
		// Compute the (order)th derivative of the expression
		let expr = funcDef.expression;
		for (let i = 0; i < order; i++) {
			expr = differentiateNode(expr, funcDef.parameters[0], simplify, functions);
		}
		// Now differentiate once more (we're differentiating f^(n)(x))
		// Apply chain rule: d/dx[f^(n)(g(x))] = f^(n+1)(g(x)) * g'(x)
		const substituted = substitute(expr, {
			[funcDef.parameters[0]]: node.args[0]
		});
		return differentiateNode(substituted, variable, simplify, functions);
	}

	// For unknown functions, return symbolic representation
	// d/dx[f'(u)] = f''(u) * u'
	const u = node.args[0];
	const du = differentiateNode(u, variable, simplify, functions);

	if (isZero(du)) {
		return zero();
	}

	// Create f''(u) (or increase derivative order)
	const higherDerivative = derivativeFunc(node.name, node.args, order + 1);

	if (simplify) {
		return simplifiedMultiply(higherDerivative, du);
	}
	return multiply(higherDerivative, du, 'implicit');
}

/**
 * Differentiate an inverse function like f^{-1}(x)
 */
function differentiateInverseFunction(
	node: FunctionNode,
	variable: string,
	simplify: boolean,
	functions?: FunctionBindings
): MathNode {
	const funcDef = functions?.[node.name];

	// If we have the inverse defined explicitly
	if (funcDef?.inverse) {
		// Substitute the argument into the inverse and differentiate
		const substituted = substituteInverse(funcDef, node.args);
		return differentiateNode(substituted, variable, simplify, functions);
	}

	// For inverse functions without explicit definition:
	// d/dx[f^{-1}(u)] = u' / f'(f^{-1}(u))
	// This requires knowing f', which we might not have

	throw new DifferentiationError(
		`Cannot differentiate inverse function ${node.name}^{-1}`,
		'function',
		'Provide the inverse function definition or its derivative in function bindings'
	);
}

/**
 * Differentiate a generic function with a binding (like f(x) where f is defined)
 */
function differentiateGenericFunction(
	node: FunctionNode,
	variable: string,
	simplify: boolean,
	functions: FunctionBindings
): MathNode {
	const funcDef = functions[node.name];

	// Validate argument count
	if (node.args.length !== funcDef.parameters.length) {
		throw new DifferentiationError(
			`Function ${node.name} expects ${funcDef.parameters.length} arguments but got ${node.args.length}`,
			'function',
			`Parameters: [${funcDef.parameters.join(', ')}]`
		);
	}

	// If derivative is pre-computed, use it with chain rule
	if (funcDef.derivative) {
		return applyChainRuleWithDerivative(node, funcDef, variable, simplify, functions);
	}

	// Otherwise, compute derivative from the expression
	return applyChainRuleFromExpression(node, funcDef, variable, simplify, functions);
}

/**
 * Apply chain rule using pre-computed derivative
 * d/dx[f(u)] = f'(u) * u'
 */
function applyChainRuleWithDerivative(
	node: FunctionNode,
	funcDef: FunctionDefinition,
	variable: string,
	simplify: boolean,
	functions: FunctionBindings
): MathNode {
	const u = node.args[0];
	const du = differentiateNode(u, variable, simplify, functions);

	// If u' = 0, the whole thing is 0
	if (isZero(du)) {
		return zero();
	}

	// Substitute u into f'
	const dfSubstituted = substitute(funcDef.derivative!, {
		[funcDef.parameters[0]]: u
	});

	if (simplify) {
		return simplifiedMultiply(dfSubstituted, du);
	}
	return multiply(dfSubstituted, du, 'implicit');
}

/**
 * Apply chain rule by computing derivative from expression
 * d/dx[f(u)] where f(t) = expr(t)
 * = (d/dt expr)(u) * du/dx
 */
function applyChainRuleFromExpression(
	node: FunctionNode,
	funcDef: FunctionDefinition,
	variable: string,
	simplify: boolean,
	functions: FunctionBindings
): MathNode {
	const u = node.args[0];
	const du = differentiateNode(u, variable, simplify, functions);

	// If u' = 0, the whole thing is 0
	if (isZero(du)) {
		return zero();
	}

	// Compute f'(t) with respect to the parameter
	const param = funcDef.parameters[0];
	const df = differentiateNode(funcDef.expression, param, simplify, functions);

	// Substitute u for the parameter in f'
	const dfSubstituted = substitute(df, {
		[param]: u
	});

	if (simplify) {
		return simplifiedMultiply(dfSubstituted, du);
	}
	return multiply(dfSubstituted, du, 'implicit');
}

/**
 * Differentiate an unknown function symbolically
 * d/dx[f(u)] = f'(u) * u'
 */
function differentiateUnknownFunction(
	node: FunctionNode,
	variable: string,
	simplify: boolean,
	functions?: FunctionBindings
): MathNode {
	if (node.args.length !== 1) {
		throw new DifferentiationError(
			`Cannot differentiate multi-argument function ${node.name}`,
			'function',
			'Only single-argument functions can be differentiated symbolically'
		);
	}

	const u = node.args[0];
	const du = differentiateNode(u, variable, simplify, functions);

	// If u' = 0, the derivative is 0
	if (isZero(du)) {
		return zero();
	}

	// Create f'(u)
	const fPrime = derivativeFunc(node.name, [u], 1);

	// f'(u) * u'
	if (simplify) {
		return simplifiedMultiply(fPrime, du);
	}
	return multiply(fPrime, du, 'implicit');
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Substitute arguments into a function's derivative expression
 */
function substituteDerivative(funcDef: FunctionDefinition, args: readonly MathNode[]): MathNode {
	const bindings: Record<string, MathNode> = {};
	for (let i = 0; i < funcDef.parameters.length; i++) {
		bindings[funcDef.parameters[i]] = args[i];
	}
	return substitute(funcDef.derivative!, bindings);
}

/**
 * Substitute arguments into a function's inverse expression
 */
function substituteInverse(funcDef: FunctionDefinition, args: readonly MathNode[]): MathNode {
	const bindings: Record<string, MathNode> = {};
	for (let i = 0; i < funcDef.parameters.length; i++) {
		bindings[funcDef.parameters[i]] = args[i];
	}
	return substitute(funcDef.inverse!, bindings);
}
