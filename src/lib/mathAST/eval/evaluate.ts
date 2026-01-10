/**
 * MathAST Numeric Evaluation
 *
 * Functions for evaluating mathematical expressions to numeric values.
 * Supports both exact (Rational) and decimal (number) evaluation modes.
 */

import type { MathNode } from '../types';
import type { EvalOptions, EvalResult } from './types';
import type { Rational } from '../normal/types';
import type { PrecisionType } from '$lib/questions/types';
import { DEFAULT_EVAL_OPTIONS } from './types';
import { getVariables } from './substitute';
import {
	isNumber,
	isVariable,
	isGreek,
	isSymbol,
	isAddition,
	isSubtraction,
	isMultiplication,
	isDivision,
	isOpposite,
	isPositive,
	isFunction,
	isDelimiter,
	isSuperscript,
	isSubscript,
	isRelation,
	isHole,
	isUnit,
	isComposition,
	isDerivativeFunction,
	isInverseFunction,
	isComplex
} from '../guards';
import { substituteFunction } from './function-bindings';
import {
	rational,
	fromInteger,
	addRational,
	subRational,
	mulRational,
	divRational,
	negRational,
	powRational,
	rationalToNumber,
	isZero as isZeroRational,
	isInteger as isIntegerRational,
	floatToRational
} from '../normal/rational';
import { number, divide } from '../factory';
import { normalize } from '../normal/normalize';
import { denormalize } from '../normal/denormalize';
import { mapNode } from '../transforms';

// =============================================================================
// Core Evaluation
// =============================================================================

/**
 * Maximum recursion depth for expression evaluation.
 * Prevents stack overflow from deeply nested expressions.
 */
const MAX_EVAL_DEPTH = 100;

// =============================================================================
// Precision Helpers
// =============================================================================

/**
 * Applies precision formatting to a number.
 *
 * @param value - The number to format
 * @param precision - The precision specification
 * @returns The formatted number
 */
function applyPrecision(value: number, precision?: PrecisionType): number {
	if (!precision || precision.type === 'none') {
		return value;
	}

	switch (precision.type) {
		case 'decimal':
			return Number(value.toFixed(precision.digits));
		case 'significant':
			return toSignificantFigures(value, precision.digits);
		case 'magnitude':
			return roundToMagnitude(value, precision.digits);
		case 'tolerance':
			// Tolerance doesn't affect the value, only comparison
			return value;
	}
}

/**
 * Rounds a number to a specified number of significant figures.
 */
function toSignificantFigures(num: number, digits: number): number {
	if (num === 0) return 0;
	const magnitude = Math.floor(Math.log10(Math.abs(num)));
	const scale = Math.pow(10, magnitude - digits + 1);
	return Math.round(num / scale) * scale;
}

/**
 * Rounds a number to a specified order of magnitude.
 */
function roundToMagnitude(num: number, magnitude: number): number {
	const scale = Math.pow(10, magnitude);
	return Math.round(num / scale) * scale;
}

// =============================================================================
// Rational Evaluation (New Architecture)
// =============================================================================

/**
 * Parses a number string to a Rational.
 * Handles integers, decimals, and scientific notation.
 */
function parseNumberToRational(value: string): Rational {
	// Handle scientific notation
	if (value.includes('e') || value.includes('E')) {
		const num = parseFloat(value);
		return floatToRational(num);
	}

	// Handle decimals
	if (value.includes('.')) {
		const [intPart, decPart] = value.split('.');
		const sign = value.startsWith('-') ? -1n : 1n;
		const absIntPart = intPart.replace('-', '') || '0';
		const numerator = sign * BigInt(absIntPart + decPart);
		const denominator = 10n ** BigInt(decPart.length);
		return rational(numerator, denominator);
	}

	// Integer
	return fromInteger(BigInt(value));
}

/**
 * Evaluates a function node to a Rational by computing via Math.*
 * and converting the result back to Rational.
 */
function evaluateFunctionToRational(
	name: string,
	args: readonly MathNode[],
	depth: number
): Rational {
	// Evaluate arguments to numbers (converting from Rational)
	const numArgs = args.map((arg) => {
		const r = evaluateToRational(arg, depth + 1);
		return rationalToNumber(r);
	});

	let result: number;

	switch (name.toLowerCase()) {
		case 'sin':
			if (numArgs.length !== 1) throw new Error('sin requires exactly 1 argument');
			result = Math.sin(numArgs[0]);
			break;
		case 'cos':
			if (numArgs.length !== 1) throw new Error('cos requires exactly 1 argument');
			result = Math.cos(numArgs[0]);
			break;
		case 'tan':
			if (numArgs.length !== 1) throw new Error('tan requires exactly 1 argument');
			result = Math.tan(numArgs[0]);
			break;
		case 'asin':
		case 'arcsin':
			if (numArgs.length !== 1) throw new Error('asin requires exactly 1 argument');
			if (numArgs[0] < -1 || numArgs[0] > 1) throw new Error('asin argument must be in [-1, 1]');
			result = Math.asin(numArgs[0]);
			break;
		case 'acos':
		case 'arccos':
			if (numArgs.length !== 1) throw new Error('acos requires exactly 1 argument');
			if (numArgs[0] < -1 || numArgs[0] > 1) throw new Error('acos argument must be in [-1, 1]');
			result = Math.acos(numArgs[0]);
			break;
		case 'atan':
		case 'arctan':
			if (numArgs.length !== 1) throw new Error('atan requires exactly 1 argument');
			result = Math.atan(numArgs[0]);
			break;
		case 'exp':
			if (numArgs.length !== 1) throw new Error('exp requires exactly 1 argument');
			result = Math.exp(numArgs[0]);
			break;
		case 'ln':
			if (numArgs.length !== 1) throw new Error('ln requires exactly 1 argument');
			if (numArgs[0] <= 0) throw new Error('ln argument must be positive');
			result = Math.log(numArgs[0]);
			break;
		case 'log':
		case 'log10':
			if (numArgs.length !== 1) throw new Error('log requires exactly 1 argument');
			if (numArgs[0] <= 0) throw new Error('log argument must be positive');
			result = Math.log10(numArgs[0]);
			break;
		case 'sqrt':
			if (numArgs.length !== 1) throw new Error('sqrt requires exactly 1 argument');
			if (numArgs[0] < 0) throw new Error('sqrt argument must be non-negative');
			result = Math.sqrt(numArgs[0]);
			break;
		case 'cbrt':
			if (numArgs.length !== 1) throw new Error('cbrt requires exactly 1 argument');
			result = Math.cbrt(numArgs[0]);
			break;
		case 'abs':
			if (numArgs.length !== 1) throw new Error('abs requires exactly 1 argument');
			result = Math.abs(numArgs[0]);
			break;
		case 'floor':
			if (numArgs.length !== 1) throw new Error('floor requires exactly 1 argument');
			result = Math.floor(numArgs[0]);
			break;
		case 'ceil':
			if (numArgs.length !== 1) throw new Error('ceil requires exactly 1 argument');
			result = Math.ceil(numArgs[0]);
			break;
		case 'round':
			if (numArgs.length !== 1) throw new Error('round requires exactly 1 argument');
			result = Math.round(numArgs[0]);
			break;
		case 'min':
			if (numArgs.length < 1) throw new Error('min requires at least 1 argument');
			result = Math.min(...numArgs);
			break;
		case 'max':
			if (numArgs.length < 1) throw new Error('max requires at least 1 argument');
			result = Math.max(...numArgs);
			break;
		case 'sinh':
			if (numArgs.length !== 1) throw new Error('sinh requires exactly 1 argument');
			result = Math.sinh(numArgs[0]);
			break;
		case 'cosh':
			if (numArgs.length !== 1) throw new Error('cosh requires exactly 1 argument');
			result = Math.cosh(numArgs[0]);
			break;
		case 'tanh':
			if (numArgs.length !== 1) throw new Error('tanh requires exactly 1 argument');
			result = Math.tanh(numArgs[0]);
			break;
		default:
			throw new Error(`Unknown function: ${name}`);
	}

	// Convert result back to Rational
	return floatToRational(result);
}

/**
 * Evaluates a MathNode recursively to a Rational.
 *
 * ALL internal arithmetic is done in BigInt via Rational operations.
 * Transcendental functions (sin, cos, exp, etc.) use Math.* and then
 * convert the result back to Rational via floatToRational.
 *
 * @param node - The MathNode to evaluate
 * @param depth - Current recursion depth (for stack overflow protection)
 * @returns The computed value as a Rational
 * @throws Error for unevaluable nodes or mathematical errors
 */
function evaluateToRational(node: MathNode, depth: number = 0): Rational {
	if (depth > MAX_EVAL_DEPTH) {
		throw new Error(`Expression too deeply nested (max depth: ${MAX_EVAL_DEPTH})`);
	}

	// NumberNode
	if (isNumber(node)) {
		return parseNumberToRational(node.value);
	}

	// VariableNode - handle 'e' as Euler's constant, throw on others
	if (isVariable(node)) {
		if (node.name === 'e') {
			return floatToRational(Math.E);
		}
		throw new Error(`Cannot evaluate expression with unsubstituted variable: ${node.name}`);
	}

	// GreekLetterNode - handle constants (pi)
	if (isGreek(node)) {
		if (node.letter === 'pi') {
			return floatToRational(Math.PI);
		}
		throw new Error(`Cannot evaluate expression with unsubstituted Greek letter: ${node.letter}`);
	}

	// SymbolNode - handle known constants
	if (isSymbol(node)) {
		switch (node.symbol) {
			case 'infinity':
				throw new Error('Cannot represent infinity as Rational');
			default:
				throw new Error(`Cannot evaluate symbol: ${node.symbol}`);
		}
	}

	// HoleNode - cannot be evaluated
	if (isHole(node)) {
		throw new Error('Cannot evaluate expression with holes');
	}

	// AdditionNode
	if (isAddition(node)) {
		const left = evaluateToRational(node.left, depth + 1);
		const right = evaluateToRational(node.right, depth + 1);
		return addRational(left, right);
	}

	// SubtractionNode
	if (isSubtraction(node)) {
		const left = evaluateToRational(node.left, depth + 1);
		const right = evaluateToRational(node.right, depth + 1);
		return subRational(left, right);
	}

	// MultiplicationNode
	if (isMultiplication(node)) {
		const left = evaluateToRational(node.left, depth + 1);
		const right = evaluateToRational(node.right, depth + 1);
		return mulRational(left, right);
	}

	// DivisionNode
	if (isDivision(node)) {
		const num = evaluateToRational(node.numerator, depth + 1);
		const den = evaluateToRational(node.denominator, depth + 1);
		if (isZeroRational(den)) {
			throw new Error('Division by zero');
		}
		return divRational(num, den);
	}

	// OppositeNode (negation)
	if (isOpposite(node)) {
		const operand = evaluateToRational(node.operand, depth + 1);
		return negRational(operand);
	}

	// PositiveNode
	if (isPositive(node)) {
		return evaluateToRational(node.operand, depth + 1);
	}

	// SuperscriptNode (power)
	if (isSuperscript(node)) {
		const base = evaluateToRational(node.base, depth + 1);
		const exp = evaluateToRational(node.superscript, depth + 1);

		// For integer exponent, use exact Rational power
		if (isIntegerRational(exp)) {
			const expNum = Number(exp.n);
			if (Number.isSafeInteger(expNum) && Math.abs(expNum) <= 1000) {
				return powRational(base, expNum);
			}
		}

		// For non-integer exponent, compute via floating point
		const baseNum = rationalToNumber(base);
		const expNum = rationalToNumber(exp);

		// Handle negative base with non-integer exponent
		if (baseNum < 0 && !Number.isInteger(expNum)) {
			throw new Error('Cannot compute non-integer power of negative number');
		}

		return floatToRational(Math.pow(baseNum, expNum));
	}

	// FunctionNode (includes sqrt, cbrt, nthroot)
	if (isFunction(node)) {
		const funcName = node.name;
		const funcArgs = node.args; // Capture before narrowing

		// Check for derivative or inverse functions
		if (isDerivativeFunction(node)) {
			throw new Error(`Cannot evaluate derivative function '${funcName}'(x) without a definition.`);
		}
		if (isInverseFunction(node)) {
			throw new Error(
				`Cannot evaluate inverse function '${funcName}^{-1}(x)' without a definition.`
			);
		}

		return evaluateFunctionToRational(funcName, funcArgs, depth);
	}

	// DelimiterNode (parentheses)
	if (isDelimiter(node)) {
		return evaluateToRational(node.content, depth + 1);
	}

	// SubscriptNode - cannot evaluate numerically
	if (isSubscript(node)) {
		throw new Error('Cannot evaluate subscript expressions numerically');
	}

	// RelationNode - cannot evaluate to a single value
	if (isRelation(node)) {
		throw new Error('Cannot evaluate relation expressions to a numeric value');
	}

	// UnitNode - evaluate the expression part (ignore the unit)
	if (isUnit(node)) {
		return evaluateToRational(node.expression, depth + 1);
	}

	// ComplexNode - not supported in pure Rational mode
	if (isComplex(node)) {
		throw new Error('Complex numbers not supported in evaluateToRational');
	}

	// CompositionNode - cannot evaluate directly
	if (isComposition(node)) {
		throw new Error('Cannot evaluate composition expression directly.');
	}

	// Unknown node type
	throw new Error(`Cannot evaluate node type: ${(node as MathNode).type}`);
}

/**
 * Evaluates a MathNode to an approximated number.
 *
 * ALL internal calculations use Rational (BigInt) arithmetic to avoid
 * floating-point precision errors. The result is converted to a number
 * only at the very end, with optional precision formatting.
 *
 * Transcendental functions (sin, cos, exp, ln, etc.) are evaluated
 * via Math.* and then converted back to Rational for continued calculations.
 *
 * @param node - MathNode to evaluate (must be numeric, no free variables)
 * @param precision - Optional precision specification for the result
 * @returns The computed number at the requested precision
 */
export function evaluateNodeToApproximatedNumber(
	node: MathNode,
	precision?: PrecisionType
): number {
	const rationalResult = evaluateToRational(node, 0);
	const numericResult = rationalToNumber(rationalResult);
	return applyPrecision(numericResult, precision);
}

// =============================================================================
// Validation for Evaluable Expressions
// =============================================================================

/**
 * Set of known functions that can be evaluated.
 */
const KNOWN_FUNCTIONS = new Set([
	'sin',
	'cos',
	'tan',
	'asin',
	'acos',
	'atan',
	'arcsin',
	'arccos',
	'arctan',
	'sinh',
	'cosh',
	'tanh',
	'asinh',
	'acosh',
	'atanh',
	'exp',
	'ln',
	'log',
	'log10',
	'log2',
	'sqrt',
	'cbrt',
	'abs',
	'floor',
	'ceil',
	'round',
	'min',
	'max',
	'sum',
	'mean',
	'median',
	'variance',
	'stdev',
	'conj',
	're',
	'im',
	'cabs',
	'arg',
	'cis',
	'frompolar',
	'rootofunity',
	'nthroot',
	'principalroot'
]);

/**
 * Validates that an expression can be evaluated.
 * Throws an error if the expression contains:
 * - Unknown functions
 * - Relation expressions (=, <, >, etc.)
 * - Other non-evaluable constructs
 *
 * @param node - The MathNode to validate
 * @throws Error if the expression cannot be evaluated
 */
function validateEvaluable(node: MathNode): void {
	if (isFunction(node)) {
		const funcName = node.name.toLowerCase();
		// Check for derivative or inverse functions
		if (isDerivativeFunction(node)) {
			throw new Error(
				`Cannot evaluate derivative function '${node.name}'(x) without a definition. ` +
					'Derivative functions remain symbolic and require differentiation rules.'
			);
		}
		if (isInverseFunction(node)) {
			throw new Error(
				`Cannot evaluate inverse function '${node.name}^{-1}(x)' without a definition. ` +
					'Inverse functions remain symbolic.'
			);
		}
		if (!KNOWN_FUNCTIONS.has(funcName)) {
			throw new Error(
				`Unknown function: ${node.name}. ` +
					'If this is a generic function (like f, g, h), provide its definition in EvalOptions.functions'
			);
		}
		// Validate arguments recursively
		for (const arg of node.args) {
			validateEvaluable(arg);
		}
		return;
	}

	if (isRelation(node)) {
		throw new Error('Cannot evaluate relation expressions to a numeric value');
	}

	if (isSubscript(node)) {
		throw new Error('Cannot evaluate subscript expressions numerically');
	}

	if (isComposition(node)) {
		throw new Error(
			'Cannot evaluate composition expression directly. ' +
				'Compositions must be applied to arguments first (e.g., (f o g)(x) not f o g)'
		);
	}

	// Recursively validate children
	if (isAddition(node) || isSubtraction(node) || isMultiplication(node)) {
		validateEvaluable(node.left);
		validateEvaluable(node.right);
	} else if (isDivision(node)) {
		validateEvaluable(node.numerator);
		validateEvaluable(node.denominator);
	} else if (isOpposite(node) || isPositive(node)) {
		validateEvaluable(node.operand);
	} else if (isSuperscript(node)) {
		validateEvaluable(node.base);
		validateEvaluable(node.superscript);
	} else if (isDelimiter(node)) {
		validateEvaluable(node.content);
	} else if (isUnit(node)) {
		validateEvaluable(node.expression);
	} else if (isComplex(node)) {
		validateEvaluable(node.real);
		validateEvaluable(node.imaginary);
	}
	// NumberNode, VariableNode, GreekLetterNode, SymbolNode, HoleNode are leaf nodes
}

// =============================================================================
// Post-processing for Exact Mode
// =============================================================================

/**
 * Evaluates rounding functions (floor, ceil, round) in an AST when their
 * arguments can be computed to a numeric value.
 *
 * In exact mode, normalize/denormalize don't evaluate these functions.
 * However, floor(37/10) should return 3, not remain as floor(37/10).
 *
 * @param node - The MathNode to process
 * @returns The processed node with evaluated rounding functions
 */
function evaluateRoundingFunctions(node: MathNode): MathNode {
	return mapNode(node, (n) => {
		if (!isFunction(n)) {
			return n;
		}

		const funcName = n.name.toLowerCase();
		if (!['floor', 'ceil', 'round', 'abs'].includes(funcName)) {
			return n;
		}

		if (n.args.length !== 1) {
			return n;
		}

		// First, recursively process the argument
		const processedArg = evaluateRoundingFunctions(n.args[0]);

		// Try to evaluate the argument to a Rational
		try {
			const argRational = evaluateToRational(processedArg, 0);
			const argNum = rationalToNumber(argRational);

			let result: number;
			switch (funcName) {
				case 'floor':
					result = Math.floor(argNum);
					break;
				case 'ceil':
					result = Math.ceil(argNum);
					break;
				case 'round':
					result = Math.round(argNum);
					break;
				case 'abs':
					result = Math.abs(argNum);
					break;
				default:
					return n;
			}

			// For abs, preserve exact rational form
			if (funcName === 'abs') {
				// Get absolute value of the rational
				const absRational =
					argRational.n < 0n ? { n: -argRational.n, d: argRational.d } : argRational;
				if (absRational.d === 1n) {
					return number(absRational.n.toString());
				}
				return divide(
					number(absRational.n.toString()),
					number(absRational.d.toString()),
					'fraction'
				);
			}

			// Return integer result
			return number(result.toString());
		} catch {
			// If evaluation fails (e.g., contains variables), keep symbolic
			return n;
		}
	});
}

// =============================================================================
// Main Export
// =============================================================================

/**
 * Evaluates a mathematical expression.
 *
 * **Mode exact** (default):
 * - Returns the simplified MathNode via normalize/denormalize
 * - The value is a MathNode representing the exact simplified form
 * - Example: sqrt(2) returns sqrt(2), cos(pi/6) returns sqrt(3)/2
 *
 * **Mode decimal**:
 * - Returns a numeric approximation
 * - ALL internal calculations use Rational (BigInt) arithmetic to avoid
 *   floating-point precision errors
 * - Transcendental functions use Math.* then convert back to Rational
 * - Final conversion to number happens only at the end
 * - Example: sqrt(2) returns 1.4142135623730951
 *
 * The expression must not contain free variables. Use the `substitute`
 * function first if your expression contains variables.
 *
 * @param node - The MathAST node to evaluate
 * @param options - Evaluation options
 * @returns An EvalResult containing the value, a node representation, and exactness flag
 *
 * @throws Error if:
 * - Expression contains free variables (except pi, e)
 * - Division by zero occurs
 * - Unknown function is called
 * - Mathematical error (e.g., sqrt of negative in real mode)
 *
 * @example
 * // Exact mode: returns simplified MathNode
 * const result = evaluate(parseLatex('\\sqrt{2}'), { mode: 'exact' });
 * // result.value = MathNode for sqrt(2)
 * // result.exact = true
 *
 * @example
 * // Exact mode: simplifies known values
 * const result = evaluate(parseLatex('\\cos(\\frac{\\pi}{6})'), { mode: 'exact' });
 * // result.value = MathNode for sqrt(3)/2
 * // result.exact = true
 *
 * @example
 * // Decimal mode: avoids float precision errors
 * const result = evaluate(parseLatex('0.1 + 0.2'), { mode: 'decimal' });
 * // result.value = 0.3 (exact, not 0.30000000000000004!)
 *
 * @example
 * // Decimal mode with precision
 * const result = evaluate(parseLatex('\\sqrt{2}'), {
 *   mode: 'decimal',
 *   precision: { type: 'decimal', digits: 2 }
 * });
 * // result.value = 1.41
 *
 * @example
 * // With function bindings: f(3) where f(x) = x^2
 * const result = evaluate(
 *   parseLatex('f(3)', { genericFunctions: { names: ['f'] } }),
 *   { functions: { f: { expression: parseLatex('x^2'), parameters: ['x'] } } }
 * );
 * // result.value = MathNode for 9
 */
export function evaluate(node: MathNode, options?: EvalOptions): EvalResult {
	const opts = { ...DEFAULT_EVAL_OPTIONS, ...options };

	// 1. Substitute generic functions if bindings are provided
	let processedNode = node;
	if (opts.functions && Object.keys(opts.functions).length > 0) {
		processedNode = substituteFunction(node, opts.functions);
	}

	// 2. Check for free variables (exclude known constants)
	const variables = getVariables(processedNode);
	const freeVars = [...variables].filter((v) => !['pi', 'e', 'i'].includes(v));

	if (freeVars.length > 0) {
		throw new Error(`Cannot evaluate: free variables: ${freeVars.join(', ')}`);
	}

	// 3. Validate the expression is evaluable (no unknown functions, relations, etc.)
	validateEvaluable(processedNode);

	// 4. Mode exact: use normalize/denormalize for exact symbolic simplification
	if (opts.mode === 'exact') {
		const normalForm = normalize(processedNode);
		let simplifiedNode = denormalize(normalForm);

		// Post-process to evaluate rounding functions (floor, ceil, round, abs)
		// that normalize/denormalize don't handle
		simplifiedNode = evaluateRoundingFunctions(simplifiedNode);

		return {
			value: simplifiedNode,
			node: simplifiedNode,
			exact: true
		};
	}

	// 5. Mode decimal: evaluate numerically with Rational arithmetic
	const numericValue = evaluateNodeToApproximatedNumber(processedNode, opts.precision);

	// Create a MathNode for the numeric result
	const resultNode = Number.isInteger(numericValue)
		? number(numericValue.toString())
		: number(numericValue.toPrecision(15));

	return {
		value: numericValue,
		node: resultNode,
		exact: false
	};
}
