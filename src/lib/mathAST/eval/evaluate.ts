/**
 * MathAST Numeric Evaluation
 *
 * Functions for evaluating mathematical expressions to numeric values.
 * Supports both exact (Rational) and decimal (number) evaluation modes.
 */

import type { MathNode } from '../types';
import type { EvalOptions, EvalResult } from './types';
import type { Rational } from '../normal/types';
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
	isInverseFunction
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
	rationalToNumber,
	isZero as isZeroRational,
	ONE
} from '../normal/rational';
import { number, divide } from '../factory';

// =============================================================================
// Types
// =============================================================================

/**
 * Internal type representing an intermediate evaluation result.
 * Can be either a Rational (exact) or number (decimal/transcendental).
 */
type IntermediateValue = Rational | number;

// =============================================================================
// Constants
// =============================================================================

/** Mathematical constant pi */
const PI_VALUE = Math.PI;

/** Mathematical constant e (Euler's number) - used in symbol evaluation */
const _E_VALUE = Math.E;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Checks if an intermediate value is a Rational.
 */
function isRational(value: IntermediateValue): value is Rational {
	return typeof value === 'object' && 'n' in value && 'd' in value;
}

/**
 * Converts an intermediate value to a number.
 */
function toNumber(value: IntermediateValue): number {
	if (isRational(value)) {
		return rationalToNumber(value);
	}
	return value;
}

/**
 * Parses a number string and returns a Rational if possible, otherwise a number.
 *
 * Handles:
 * - Integers: "5" -> Rational(5, 1)
 * - Decimals: "0.5" -> Rational(1, 2), "0.25" -> Rational(1, 4)
 * - Scientific notation: falls back to number
 */
function parseNumber(value: string): IntermediateValue {
	// Handle scientific notation - use floating point
	if (value.includes('e') || value.includes('E')) {
		return parseFloat(value);
	}

	// Handle negative numbers
	const isNegative = value.startsWith('-');
	const absValue = isNegative ? value.slice(1) : value;

	// Handle integers
	if (!absValue.includes('.')) {
		try {
			const bigVal = BigInt(absValue);
			const n = isNegative ? -bigVal : bigVal;
			return fromInteger(n);
		} catch {
			// If BigInt fails, fall back to float
			return parseFloat(value);
		}
	}

	// Handle decimals
	const [intPart, decPart] = absValue.split('.');
	const decPlaces = decPart.length;

	try {
		const numerator = BigInt(intPart + decPart);
		const denominator = 10n ** BigInt(decPlaces);
		const n = isNegative ? -numerator : numerator;
		return rational(n, denominator);
	} catch {
		// If BigInt fails, fall back to float
		return parseFloat(value);
	}
}

/**
 * Checks if a Rational represents an exact integer.
 */
function isExactInteger(r: Rational): boolean {
	return r.d === 1n;
}

/**
 * Gets the integer value from a Rational if it's an exact integer.
 * Returns null otherwise.
 */
function getExactInteger(r: Rational): bigint | null {
	if (r.d === 1n) {
		return r.n;
	}
	return null;
}

/**
 * Computes integer square root if value is a perfect square.
 * Returns null if not a perfect square or negative.
 */
function exactIntegerSqrt(n: bigint): bigint | null {
	if (n < 0n) return null;
	if (n === 0n) return 0n;
	if (n === 1n) return 1n;

	// Newton's method for integer square root
	let x = n;
	let y = (x + 1n) / 2n;

	while (y < x) {
		x = y;
		y = (x + n / x) / 2n;
	}

	// Check if it's a perfect square
	if (x * x === n) {
		return x;
	}
	return null;
}

/**
 * Tries to compute exact square root of a Rational.
 * Returns Rational if both numerator and denominator are perfect squares.
 */
function exactSqrt(r: Rational): Rational | null {
	if (r.n < 0n) return null; // No real square root of negative

	const sqrtN = exactIntegerSqrt(r.n);
	const sqrtD = exactIntegerSqrt(r.d);

	if (sqrtN !== null && sqrtD !== null) {
		return rational(sqrtN, sqrtD);
	}
	return null;
}

/**
 * Computes power with integer exponent.
 */
function intPow(base: IntermediateValue, exp: number): IntermediateValue {
	if (exp === 0) return ONE;
	if (exp === 1) return base;

	if (isRational(base)) {
		// For rational base with integer exponent, result is rational
		if (exp < 0) {
			if (isZeroRational(base)) {
				throw new Error('Division by zero: 0 raised to negative power');
			}
			// Invert base and negate exponent
			const inverted = rational(base.d, base.n);
			return intPowRational(inverted, -exp);
		}
		return intPowRational(base, exp);
	}

	// For number base, use Math.pow
	return Math.pow(base, exp);
}

/**
 * Computes power of a Rational with a positive integer exponent.
 */
function intPowRational(base: Rational, exp: number): Rational {
	if (exp === 0) return ONE;
	if (exp === 1) return base;

	// Use repeated squaring for efficiency
	let result = ONE;
	let current = base;
	let e = exp;

	while (e > 0) {
		if (e % 2 === 1) {
			result = mulRational(result, current);
		}
		current = mulRational(current, current);
		e = Math.floor(e / 2);
	}

	return result;
}

// =============================================================================
// Supported Functions
// =============================================================================

/**
 * Map of supported function names to their evaluation logic.
 */
const SUPPORTED_FUNCTIONS: Record<
	string,
	(args: IntermediateValue[], exactMode: boolean) => IntermediateValue
> = {
	sqrt: (args, exactMode) => {
		if (args.length !== 1) throw new Error('sqrt requires exactly 1 argument');
		const arg = args[0];

		// Try exact evaluation first
		if (exactMode && isRational(arg)) {
			const exact = exactSqrt(arg);
			if (exact !== null) {
				return exact;
			}
		}

		// Fall back to decimal
		const num = toNumber(arg);
		if (num < 0) throw new Error('Cannot compute square root of negative number');
		return Math.sqrt(num);
	},

	sin: (args) => {
		if (args.length !== 1) throw new Error('sin requires exactly 1 argument');
		return Math.sin(toNumber(args[0]));
	},

	cos: (args) => {
		if (args.length !== 1) throw new Error('cos requires exactly 1 argument');
		return Math.cos(toNumber(args[0]));
	},

	tan: (args) => {
		if (args.length !== 1) throw new Error('tan requires exactly 1 argument');
		return Math.tan(toNumber(args[0]));
	},

	asin: (args) => {
		if (args.length !== 1) throw new Error('asin requires exactly 1 argument');
		const val = toNumber(args[0]);
		if (val < -1 || val > 1) throw new Error('asin argument must be in [-1, 1]');
		return Math.asin(val);
	},

	acos: (args) => {
		if (args.length !== 1) throw new Error('acos requires exactly 1 argument');
		const val = toNumber(args[0]);
		if (val < -1 || val > 1) throw new Error('acos argument must be in [-1, 1]');
		return Math.acos(val);
	},

	atan: (args) => {
		if (args.length !== 1) throw new Error('atan requires exactly 1 argument');
		return Math.atan(toNumber(args[0]));
	},

	ln: (args) => {
		if (args.length !== 1) throw new Error('ln requires exactly 1 argument');
		const val = toNumber(args[0]);
		if (val <= 0) throw new Error('ln argument must be positive');
		return Math.log(val);
	},

	log: (args) => {
		// log without base is log base 10
		if (args.length !== 1) throw new Error('log requires exactly 1 argument');
		const val = toNumber(args[0]);
		if (val <= 0) throw new Error('log argument must be positive');
		return Math.log10(val);
	},

	exp: (args, exactMode) => {
		if (args.length !== 1) throw new Error('exp requires exactly 1 argument');
		const arg = args[0];

		// exp(0) = 1 exactly
		if (isRational(arg) && isZeroRational(arg)) {
			return exactMode ? ONE : 1;
		}

		return Math.exp(toNumber(arg));
	},

	abs: (args, _exactMode) => {
		if (args.length !== 1) throw new Error('abs requires exactly 1 argument');
		const arg = args[0];

		if (isRational(arg)) {
			if (arg.n < 0n) {
				return { n: -arg.n, d: arg.d };
			}
			return arg;
		}

		return Math.abs(arg);
	},

	floor: (args, _exactMode) => {
		if (args.length !== 1) throw new Error('floor requires exactly 1 argument');
		const arg = args[0];

		if (isRational(arg)) {
			// For rational, floor is integer division of n by d
			const n = arg.n;
			const d = arg.d;
			if (n >= 0n) {
				return fromInteger(n / d);
			} else {
				// For negative, we need to round toward negative infinity
				const absN = -n;
				const q = absN / d;
				const r = absN % d;
				return fromInteger(r === 0n ? -q : -(q + 1n));
			}
		}

		return Math.floor(arg);
	},

	ceil: (args, _exactMode) => {
		if (args.length !== 1) throw new Error('ceil requires exactly 1 argument');
		const arg = args[0];

		if (isRational(arg)) {
			const n = arg.n;
			const d = arg.d;
			if (n >= 0n) {
				const q = n / d;
				const r = n % d;
				return fromInteger(r === 0n ? q : q + 1n);
			} else {
				// For negative, round toward zero
				return fromInteger(-(-n / d));
			}
		}

		return Math.ceil(arg);
	},

	round: (args) => {
		if (args.length !== 1) throw new Error('round requires exactly 1 argument');
		return Math.round(toNumber(args[0]));
	}
};

// =============================================================================
// Core Evaluation
// =============================================================================

/**
 * Evaluates a MathNode to an intermediate value (Rational or number).
 *
 * @param node - The node to evaluate
 * @param exactMode - Whether to prefer exact (rational) results
 * @returns The computed value
 * @throws Error for unevaluable nodes or mathematical errors
 */
function evaluateNode(node: MathNode, exactMode: boolean): IntermediateValue {
	// NumberNode
	if (isNumber(node)) {
		return parseNumber(node.value);
	}

	// VariableNode - should have been substituted
	if (isVariable(node)) {
		throw new Error(`Cannot evaluate expression with unsubstituted variable: ${node.name}`);
	}

	// GreekLetterNode - handle constants (pi) or throw
	if (isGreek(node)) {
		if (node.letter === 'pi') {
			return PI_VALUE;
		}
		throw new Error(`Cannot evaluate expression with unsubstituted Greek letter: ${node.letter}`);
	}

	// SymbolNode - handle known constants
	if (isSymbol(node)) {
		switch (node.symbol) {
			case 'infinity':
				return Infinity;
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
		const left = evaluateNode(node.left, exactMode);
		const right = evaluateNode(node.right, exactMode);

		if (isRational(left) && isRational(right)) {
			return addRational(left, right);
		}
		return toNumber(left) + toNumber(right);
	}

	// SubtractionNode
	if (isSubtraction(node)) {
		const left = evaluateNode(node.left, exactMode);
		const right = evaluateNode(node.right, exactMode);

		if (isRational(left) && isRational(right)) {
			return subRational(left, right);
		}
		return toNumber(left) - toNumber(right);
	}

	// MultiplicationNode
	if (isMultiplication(node)) {
		const left = evaluateNode(node.left, exactMode);
		const right = evaluateNode(node.right, exactMode);

		if (isRational(left) && isRational(right)) {
			return mulRational(left, right);
		}
		return toNumber(left) * toNumber(right);
	}

	// DivisionNode
	if (isDivision(node)) {
		const num = evaluateNode(node.numerator, exactMode);
		const den = evaluateNode(node.denominator, exactMode);

		// Check for division by zero
		if (isRational(den)) {
			if (isZeroRational(den)) {
				throw new Error('Division by zero');
			}
		} else if (den === 0) {
			throw new Error('Division by zero');
		}

		if (isRational(num) && isRational(den)) {
			return divRational(num, den);
		}
		return toNumber(num) / toNumber(den);
	}

	// OppositeNode (negation)
	if (isOpposite(node)) {
		const operand = evaluateNode(node.operand, exactMode);

		if (isRational(operand)) {
			return negRational(operand);
		}
		return -operand;
	}

	// PositiveNode
	if (isPositive(node)) {
		return evaluateNode(node.operand, exactMode);
	}

	// SuperscriptNode (power)
	if (isSuperscript(node)) {
		const base = evaluateNode(node.base, exactMode);
		const exp = evaluateNode(node.superscript, exactMode);

		// Check for integer exponent for exact evaluation
		if (isRational(exp) && isExactInteger(exp)) {
			const intExp = getExactInteger(exp);
			if (intExp !== null) {
				// Convert to JS number for exponent (BigInt could be too large)
				const expNum = Number(intExp);
				if (Number.isSafeInteger(expNum) && Math.abs(expNum) <= 1000) {
					return intPow(base, expNum);
				}
			}
		}

		// Fall back to floating point
		return Math.pow(toNumber(base), toNumber(exp));
	}

	// FunctionNode
	if (isFunction(node)) {
		const originalName = node.name; // Store name before any narrowing
		const funcName = originalName.toLowerCase();
		const funcNode = node;
		const handler = SUPPORTED_FUNCTIONS[funcName];

		if (!handler) {
			// Check if this is a derivative or inverse function that wasn't substituted
			if (isDerivativeFunction(funcNode)) {
				throw new Error(
					`Cannot evaluate derivative function '${originalName}'(x) without a definition. ` +
						'Derivative functions remain symbolic and require differentiation rules.'
				);
			}
			if (isInverseFunction(funcNode)) {
				throw new Error(
					`Cannot evaluate inverse function '${originalName}^{-1}(x)' without a definition. ` +
						'Inverse functions remain symbolic.'
				);
			}
			// Unknown generic function
			throw new Error(
				`Unknown function: ${originalName}. ` +
					'If this is a generic function (like f, g, h), provide its definition in EvalOptions.functions'
			);
		}

		// Evaluate all arguments
		const evaluatedArgs = node.args.map((arg) => evaluateNode(arg, exactMode));

		return handler(evaluatedArgs, exactMode);
	}

	// DelimiterNode (parentheses)
	if (isDelimiter(node)) {
		return evaluateNode(node.content, exactMode);
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
		return evaluateNode(node.expression, exactMode);
	}

	// CompositionNode - cannot evaluate directly without application
	if (isComposition(node)) {
		throw new Error(
			'Cannot evaluate composition expression directly. ' +
				'Compositions must be applied to arguments first (e.g., (f o g)(x) not f o g)'
		);
	}

	// Should never reach here with proper typing
	throw new Error(`Cannot evaluate node type: ${(node as MathNode).type}`);
}

/**
 * Creates the result AST node from an intermediate value.
 */
function valueToNode(value: IntermediateValue): MathNode {
	if (isRational(value)) {
		if (value.d === 1n) {
			// Integer
			return number(value.n.toString());
		}
		// Fraction
		return divide(number(value.n.toString()), number(value.d.toString()), 'fraction');
	}

	// Number
	if (Number.isInteger(value)) {
		return number(value.toString());
	}

	// Decimal - use reasonable precision
	return number(value.toPrecision(15));
}

// =============================================================================
// Main Export
// =============================================================================

/**
 * Evaluates a mathematical expression to a numeric value.
 *
 * The expression must not contain unsubstituted variables. Use the `substitute`
 * function first if your expression contains variables.
 *
 * @param node - The MathAST node to evaluate
 * @param options - Evaluation options (mode: 'exact' or 'decimal', functions: FunctionBindings)
 * @returns An EvalResult containing the value, a node representation, and exactness flag
 *
 * @throws Error if:
 * - Expression contains unsubstituted variables
 * - Division by zero occurs
 * - Unknown function is called
 * - Mathematical error (e.g., sqrt of negative)
 *
 * @example
 * // Exact evaluation: 1/3 + 1/3 + 1/3 = 1
 * const result = evaluate(parseLatex('\\frac{1}{3}+\\frac{1}{3}+\\frac{1}{3}'));
 * // result.value = { n: 1n, d: 1n }
 * // result.exact = true
 *
 * @example
 * // Decimal evaluation: sqrt(2)
 * const result = evaluate(parseLatex('\\sqrt{2}'), { mode: 'decimal' });
 * // result.value = 1.4142135623730951
 * // result.exact = false
 *
 * @example
 * // With function bindings: f(3) where f(x) = x^2
 * const result = evaluate(
 *   parseLatex('f(3)', { genericFunctions: { names: ['f'] } }),
 *   { functions: { f: { expression: parseLatex('x^2'), parameters: ['x'] } } }
 * );
 * // result.value = { n: 9n, d: 1n }
 */
export function evaluate(node: MathNode, options?: EvalOptions): EvalResult {
	const opts = { ...DEFAULT_EVAL_OPTIONS, ...options };
	const exactMode = opts.mode === 'exact';

	// If function bindings are provided, substitute functions first
	let processedNode = node;
	if (opts.functions && Object.keys(opts.functions).length > 0) {
		processedNode = substituteFunction(node, opts.functions);
	}

	// Check for unsubstituted variables
	const variables = getVariables(processedNode);

	// Filter out 'pi' as it's a known constant
	const unsubstituted = [...variables].filter((v) => v !== 'pi');

	if (unsubstituted.length > 0) {
		throw new Error(
			`Cannot evaluate expression with unsubstituted variables: ${unsubstituted.join(', ')}`
		);
	}

	// Evaluate the expression
	const value = evaluateNode(processedNode, exactMode);

	// Determine if result is exact
	const isExact = isRational(value);

	// Convert to final result based on mode
	if (opts.mode === 'decimal') {
		const numValue = toNumber(value);
		return {
			value: numValue,
			node: valueToNode(numValue),
			exact: false
		};
	}

	// Exact mode - keep Rational if possible
	return {
		value,
		node: valueToNode(value),
		exact: isExact
	};
}
