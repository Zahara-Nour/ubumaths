/**
 * Trigonometric Identities Module
 *
 * Provides transformation functions for trigonometric identities.
 * Uses direct AST matching to handle the specific structure of function nodes.
 *
 * @module mathAST/transform/trig-identities
 */

import type { MathNode, FunctionNode } from '../types';
import type { GreekLetterNode } from '../types';
import {
	isFunction,
	isMultiplication,
	isAddition,
	isSubtraction,
	isDivision,
	isNumber,
	isOpposite,
	isPiConstant,
	isGreek
} from '../guards';
import {
	number,
	sin,
	cos,
	tan,
	cot,
	sec,
	csc,
	sqrt,
	multiply,
	divide,
	add,
	subtract,
	superscript,
	opposite
} from '../factory';
import { mapNode } from '../transforms';
import { nodesEqual } from '../pattern/match';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of applying trig identity transformations
 */
export interface TrigTransformResult {
	/** The transformed expression */
	readonly result: MathNode;
	/** Whether any transformation was applied */
	readonly changed: boolean;
	/** Names of rules that were applied */
	readonly appliedRules: readonly string[];
}

/**
 * A transformation rule with name and transform function
 */
interface TrigRule {
	readonly name: string;
	readonly transform: (node: MathNode) => MathNode | null;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a node represents π (either as math constant or Greek letter)
 */
function isPi(node: MathNode): boolean {
	if (isPiConstant(node)) return true;
	if (isGreek(node) && (node as GreekLetterNode).letter === 'pi') return true;
	return false;
}

/**
 * Check if a node is a trig function with a specific name
 */
function isTrigFunc(node: MathNode, name: string): node is FunctionNode {
	return isFunction(node) && node.name === name && node.args.length === 1;
}

/**
 * Check if a function node has a power of 2
 */
function hasPowerOf2(node: FunctionNode): boolean {
	return node.power !== undefined && isNumber(node.power) && node.power.value === '2';
}

/**
 * Get the argument of a single-argument function
 */
function getArg(node: FunctionNode): MathNode {
	return node.args[0];
}

/**
 * Double an expression: a -> 2a
 */
function doubleArg(node: MathNode): MathNode {
	return multiply(number('2'), node, 'implicit');
}

/**
 * Halve an expression: a -> a/2
 */
function halveExpr(node: MathNode): MathNode {
	return divide(node, number('2'), 'fraction');
}

// =============================================================================
// Transform Functions
// =============================================================================

/**
 * sin(a) * cos(a) -> sin(2a) / 2
 * Also handles cos(a) * sin(a)
 */
function transformSinCosProduct(node: MathNode): MathNode | null {
	if (!isMultiplication(node)) return null;

	// Check sin(a) * cos(a)
	if (isTrigFunc(node.left, 'sin') && isTrigFunc(node.right, 'cos')) {
		const sinArg = getArg(node.left);
		const cosArg = getArg(node.right);
		if (nodesEqual(sinArg, cosArg)) {
			return halveExpr(sin(doubleArg(sinArg)));
		}
	}

	// Check cos(a) * sin(a)
	if (isTrigFunc(node.left, 'cos') && isTrigFunc(node.right, 'sin')) {
		const cosArg = getArg(node.left);
		const sinArg = getArg(node.right);
		if (nodesEqual(cosArg, sinArg)) {
			return halveExpr(sin(doubleArg(sinArg)));
		}
	}

	return null;
}

/**
 * 2 * sin(a) * cos(a) -> sin(2a)
 * Handles various orderings
 */
function transformDoubleAngleSin(node: MathNode): MathNode | null {
	if (!isMultiplication(node)) return null;

	// Pattern: 2 * (sin(a) * cos(a)) or (2 * sin(a)) * cos(a) etc.
	// We need to find: coefficient 2, sin(a), cos(a) with same argument

	// Helper to extract coefficient and remaining factors
	function extractFactors(n: MathNode): { coeff: number; factors: MathNode[] } {
		const factors: MathNode[] = [];
		let coeff = 1;

		function collect(m: MathNode) {
			if (isMultiplication(m)) {
				collect(m.left);
				collect(m.right);
			} else if (isNumber(m)) {
				coeff *= parseFloat(m.value);
			} else {
				factors.push(m);
			}
		}

		collect(n);
		return { coeff, factors };
	}

	const { coeff, factors } = extractFactors(node);

	if (coeff !== 2) return null;

	// Find sin and cos with same argument
	let sinFunc: FunctionNode | null = null;
	let cosFunc: FunctionNode | null = null;

	for (const f of factors) {
		if (isTrigFunc(f, 'sin') && !hasPowerOf2(f)) {
			sinFunc = f;
		} else if (isTrigFunc(f, 'cos') && !hasPowerOf2(f)) {
			cosFunc = f;
		}
	}

	if (sinFunc && cosFunc && nodesEqual(getArg(sinFunc), getArg(cosFunc))) {
		return sin(doubleArg(getArg(sinFunc)));
	}

	return null;
}

/**
 * sin²(a) -> (1 - cos(2a)) / 2
 */
function transformSinSquared(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'sin') return null;
	if (!hasPowerOf2(node)) return null;

	const a = getArg(node);
	return halveExpr(subtract(number('1'), cos(doubleArg(a))));
}

/**
 * cos²(a) -> (1 + cos(2a)) / 2
 */
function transformCosSquared(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'cos') return null;
	if (!hasPowerOf2(node)) return null;

	const a = getArg(node);
	return halveExpr(add(number('1'), cos(doubleArg(a))));
}

/**
 * sin²(a) + cos²(a) -> 1
 * Also handles cos²(a) + sin²(a)
 */
function transformPythagorean(node: MathNode): MathNode | null {
	if (!isAddition(node)) return null;

	function isSinSquared(n: MathNode): n is FunctionNode {
		return isFunction(n) && n.name === 'sin' && hasPowerOf2(n);
	}

	function isCosSquared(n: MathNode): n is FunctionNode {
		return isFunction(n) && n.name === 'cos' && hasPowerOf2(n);
	}

	// sin²(a) + cos²(a)
	if (isSinSquared(node.left) && isCosSquared(node.right)) {
		if (nodesEqual(getArg(node.left), getArg(node.right))) {
			return number('1');
		}
	}

	// cos²(a) + sin²(a)
	if (isCosSquared(node.left) && isSinSquared(node.right)) {
		if (nodesEqual(getArg(node.left), getArg(node.right))) {
			return number('1');
		}
	}

	return null;
}

/**
 * 1 - sin²(a) -> cos²(a)
 */
function transformOneMinusSinSquared(node: MathNode): MathNode | null {
	if (!isSubtraction(node)) return null;
	if (!isNumber(node.left) || node.left.value !== '1') return null;
	if (!isFunction(node.right) || node.right.name !== 'sin') return null;
	if (!hasPowerOf2(node.right)) return null;

	const a = getArg(node.right);
	return superscript(cos(a), number('2'));
}

/**
 * 1 - cos²(a) -> sin²(a)
 */
function transformOneMinusCosSquared(node: MathNode): MathNode | null {
	if (!isSubtraction(node)) return null;
	if (!isNumber(node.left) || node.left.value !== '1') return null;
	if (!isFunction(node.right) || node.right.name !== 'cos') return null;
	if (!hasPowerOf2(node.right)) return null;

	const a = getArg(node.right);
	return superscript(sin(a), number('2'));
}

/**
 * sin(a) / cos(a) -> tan(a)
 */
function transformSinOverCos(node: MathNode): MathNode | null {
	if (!isDivision(node)) return null;
	if (!isTrigFunc(node.numerator, 'sin')) return null;
	if (!isTrigFunc(node.denominator, 'cos')) return null;

	const sinArg = getArg(node.numerator as FunctionNode);
	const cosArg = getArg(node.denominator as FunctionNode);

	if (nodesEqual(sinArg, cosArg)) {
		return tan(sinArg);
	}

	return null;
}

// =============================================================================
// Linearization Formulas (Product to Sum)
// =============================================================================

/**
 * cos(a) * cos(b) -> (cos(a-b) + cos(a+b)) / 2
 */
function transformCosCosProduct(node: MathNode): MathNode | null {
	if (!isMultiplication(node)) return null;
	if (!isTrigFunc(node.left, 'cos') || !isTrigFunc(node.right, 'cos')) return null;

	// Skip if same argument (handled by sin-cos-product via double angle)
	const a = getArg(node.left);
	const b = getArg(node.right);
	if (nodesEqual(a, b)) return null;

	// cos(a)cos(b) = (cos(a-b) + cos(a+b)) / 2
	const aPlusB = add(a, b);
	const aMinusB = subtract(a, b);
	return halveExpr(add(cos(aMinusB), cos(aPlusB)));
}

/**
 * sin(a) * sin(b) -> (cos(a-b) - cos(a+b)) / 2
 */
function transformSinSinProduct(node: MathNode): MathNode | null {
	if (!isMultiplication(node)) return null;
	if (!isTrigFunc(node.left, 'sin') || !isTrigFunc(node.right, 'sin')) return null;

	// Skip if same argument (handled by power reduction)
	const a = getArg(node.left);
	const b = getArg(node.right);
	if (nodesEqual(a, b)) return null;

	// sin(a)sin(b) = (cos(a-b) - cos(a+b)) / 2
	const aPlusB = add(a, b);
	const aMinusB = subtract(a, b);
	return halveExpr(subtract(cos(aMinusB), cos(aPlusB)));
}

/**
 * sin(a) * cos(b) -> (sin(a+b) + sin(a-b)) / 2
 * cos(a) * sin(b) -> (sin(a+b) - sin(a-b)) / 2
 *
 * Note: When a = b, this is handled by transformSinCosProduct instead
 */
function transformSinCosProductDifferent(node: MathNode): MathNode | null {
	if (!isMultiplication(node)) return null;

	// sin(a) * cos(b)
	if (isTrigFunc(node.left, 'sin') && isTrigFunc(node.right, 'cos')) {
		const a = getArg(node.left);
		const b = getArg(node.right);

		// Skip if same argument (handled by sin-cos-product)
		if (nodesEqual(a, b)) return null;

		// sin(a)cos(b) = (sin(a+b) + sin(a-b)) / 2
		const aPlusB = add(a, b);
		const aMinusB = subtract(a, b);
		return halveExpr(add(sin(aPlusB), sin(aMinusB)));
	}

	// cos(a) * sin(b)
	if (isTrigFunc(node.left, 'cos') && isTrigFunc(node.right, 'sin')) {
		const a = getArg(node.left);
		const b = getArg(node.right);

		// Skip if same argument (handled by sin-cos-product)
		if (nodesEqual(a, b)) return null;

		// cos(a)sin(b) = (sin(a+b) - sin(a-b)) / 2
		const aPlusB = add(a, b);
		const aMinusB = subtract(a, b);
		return halveExpr(subtract(sin(aPlusB), sin(aMinusB)));
	}

	return null;
}

// =============================================================================
// Addition Formulas (Angle Sum/Difference Expansion)
// =============================================================================

/**
 * cos(a + b) -> cos(a)cos(b) - sin(a)sin(b)
 */
function transformCosSum(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'cos') return null;
	if (node.args.length !== 1) return null;

	const arg = node.args[0];
	if (!isAddition(arg)) return null;

	const a = arg.left;
	const b = arg.right;

	// cos(a+b) = cos(a)cos(b) - sin(a)sin(b)
	return subtract(multiply(cos(a), cos(b), 'implicit'), multiply(sin(a), sin(b), 'implicit'));
}

/**
 * cos(a - b) -> cos(a)cos(b) + sin(a)sin(b)
 */
function transformCosDifference(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'cos') return null;
	if (node.args.length !== 1) return null;

	const arg = node.args[0];
	if (!isSubtraction(arg)) return null;

	const a = arg.left;
	const b = arg.right;

	// cos(a-b) = cos(a)cos(b) + sin(a)sin(b)
	return add(multiply(cos(a), cos(b), 'implicit'), multiply(sin(a), sin(b), 'implicit'));
}

/**
 * sin(a + b) -> sin(a)cos(b) + cos(a)sin(b)
 */
function transformSinSum(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'sin') return null;
	if (node.args.length !== 1) return null;

	const arg = node.args[0];
	if (!isAddition(arg)) return null;

	const a = arg.left;
	const b = arg.right;

	// sin(a+b) = sin(a)cos(b) + cos(a)sin(b)
	return add(multiply(sin(a), cos(b), 'implicit'), multiply(cos(a), sin(b), 'implicit'));
}

/**
 * sin(a - b) -> sin(a)cos(b) - cos(a)sin(b)
 */
function transformSinDifference(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'sin') return null;
	if (node.args.length !== 1) return null;

	const arg = node.args[0];
	if (!isSubtraction(arg)) return null;

	const a = arg.left;
	const b = arg.right;

	// sin(a-b) = sin(a)cos(b) - cos(a)sin(b)
	return subtract(multiply(sin(a), cos(b), 'implicit'), multiply(cos(a), sin(b), 'implicit'));
}

// =============================================================================
// Double Angle Expansion
// =============================================================================

/**
 * Check if expression is 2*x (coefficient of 2)
 */
function isDoubleOf(node: MathNode): MathNode | null {
	if (!isMultiplication(node)) return null;
	if (isNumber(node.left) && node.left.value === '2') {
		return node.right;
	}
	if (isNumber(node.right) && node.right.value === '2') {
		return node.left;
	}
	return null;
}

/**
 * sin(2x) -> 2sin(x)cos(x)
 */
function transformExpandDoubleSin(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'sin') return null;
	if (node.args.length !== 1) return null;

	const x = isDoubleOf(node.args[0]);
	if (!x) return null;

	// sin(2x) = 2sin(x)cos(x)
	return multiply(number('2'), multiply(sin(x), cos(x), 'implicit'), 'implicit');
}

/**
 * cos(2x) -> cos²(x) - sin²(x)
 */
function transformExpandDoubleCos(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'cos') return null;
	if (node.args.length !== 1) return null;

	const x = isDoubleOf(node.args[0]);
	if (!x) return null;

	// cos(2x) = cos²(x) - sin²(x)
	return subtract(superscript(cos(x), number('2')), superscript(sin(x), number('2')));
}

/**
 * tan(2x) -> 2tan(x) / (1 - tan²(x))
 */
function transformExpandDoubleTan(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'tan') return null;
	if (node.args.length !== 1) return null;

	const x = isDoubleOf(node.args[0]);
	if (!x) return null;

	// tan(2x) = 2tan(x) / (1 - tan²(x))
	const tanX = tan(x);
	return divide(
		multiply(number('2'), tanX, 'implicit'),
		subtract(number('1'), superscript(tan(x), number('2'))),
		'fraction'
	);
}

// =============================================================================
// Additional Quotient Identities
// =============================================================================

/**
 * cos(x) / sin(x) -> cot(x)
 */
function transformCosOverSin(node: MathNode): MathNode | null {
	if (!isDivision(node)) return null;
	if (!isTrigFunc(node.numerator, 'cos')) return null;
	if (!isTrigFunc(node.denominator, 'sin')) return null;

	const cosArg = getArg(node.numerator as FunctionNode);
	const sinArg = getArg(node.denominator as FunctionNode);

	if (nodesEqual(cosArg, sinArg)) {
		return cot(cosArg);
	}
	return null;
}

/**
 * 1 / cos(x) -> sec(x)
 */
function transformOneOverCos(node: MathNode): MathNode | null {
	if (!isDivision(node)) return null;
	if (!isNumber(node.numerator) || node.numerator.value !== '1') return null;
	if (!isTrigFunc(node.denominator, 'cos')) return null;

	return sec(getArg(node.denominator as FunctionNode));
}

/**
 * 1 / sin(x) -> csc(x)
 */
function transformOneOverSin(node: MathNode): MathNode | null {
	if (!isDivision(node)) return null;
	if (!isNumber(node.numerator) || node.numerator.value !== '1') return null;
	if (!isTrigFunc(node.denominator, 'sin')) return null;

	return csc(getArg(node.denominator as FunctionNode));
}

// =============================================================================
// Tangent Addition Formulas
// =============================================================================

/**
 * tan(a + b) -> (tan(a) + tan(b)) / (1 - tan(a)tan(b))
 */
function transformTanSum(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'tan') return null;
	if (node.args.length !== 1) return null;

	const arg = node.args[0];
	if (!isAddition(arg)) return null;

	const a = arg.left;
	const b = arg.right;
	const tanA = tan(a);
	const tanB = tan(b);

	// tan(a+b) = (tan(a) + tan(b)) / (1 - tan(a)tan(b))
	return divide(
		add(tanA, tanB),
		subtract(number('1'), multiply(tan(a), tan(b), 'implicit')),
		'fraction'
	);
}

/**
 * tan(a - b) -> (tan(a) - tan(b)) / (1 + tan(a)tan(b))
 */
function transformTanDifference(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'tan') return null;
	if (node.args.length !== 1) return null;

	const arg = node.args[0];
	if (!isSubtraction(arg)) return null;

	const a = arg.left;
	const b = arg.right;
	const tanA = tan(a);
	const tanB = tan(b);

	// tan(a-b) = (tan(a) - tan(b)) / (1 + tan(a)tan(b))
	return divide(
		subtract(tanA, tanB),
		add(number('1'), multiply(tan(a), tan(b), 'implicit')),
		'fraction'
	);
}

// =============================================================================
// Negative Angle Identities
// =============================================================================

/**
 * sin(-x) -> -sin(x)
 */
function transformSinNegative(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'sin') return null;
	if (node.args.length !== 1) return null;

	const arg = node.args[0];
	if (!isOpposite(arg)) return null;

	// sin(-x) = -sin(x)
	return opposite(sin(arg.operand));
}

/**
 * cos(-x) -> cos(x)
 */
function transformCosNegative(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'cos') return null;
	if (node.args.length !== 1) return null;

	const arg = node.args[0];
	if (!isOpposite(arg)) return null;

	// cos(-x) = cos(x)
	return cos(arg.operand);
}

/**
 * tan(-x) -> -tan(x)
 */
function transformTanNegative(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'tan') return null;
	if (node.args.length !== 1) return null;

	const arg = node.args[0];
	if (!isOpposite(arg)) return null;

	// tan(-x) = -tan(x)
	return opposite(tan(arg.operand));
}

// =============================================================================
// Cofunction Identities
// =============================================================================

/**
 * Check if expression is π/2 - x
 */
function isPiOver2Minus(node: MathNode): MathNode | null {
	if (!isSubtraction(node)) return null;

	// Check if left side is π/2
	const left = node.left;
	if (isDivision(left)) {
		if (isPi(left.numerator) && isNumber(left.denominator) && left.denominator.value === '2') {
			return node.right;
		}
	}
	return null;
}

/**
 * sin(π/2 - x) -> cos(x)
 */
function transformSinCofunction(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'sin') return null;
	if (node.args.length !== 1) return null;

	const x = isPiOver2Minus(node.args[0]);
	if (!x) return null;

	return cos(x);
}

/**
 * cos(π/2 - x) -> sin(x)
 */
function transformCosCofunction(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'cos') return null;
	if (node.args.length !== 1) return null;

	const x = isPiOver2Minus(node.args[0]);
	if (!x) return null;

	return sin(x);
}

/**
 * tan(π/2 - x) -> cot(x)
 */
function transformTanCofunction(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'tan') return null;
	if (node.args.length !== 1) return null;

	const x = isPiOver2Minus(node.args[0]);
	if (!x) return null;

	return cot(x);
}

// =============================================================================
// Supplementary Angle Identities (π - x)
// =============================================================================

/**
 * Check if expression is π - x
 */
function isPiMinus(node: MathNode): MathNode | null {
	if (!isSubtraction(node)) return null;
	if (!isPi(node.left)) return null;
	return node.right;
}

/**
 * sin(π - x) -> sin(x)
 */
function transformSinSupplementary(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'sin') return null;
	if (node.args.length !== 1) return null;

	const x = isPiMinus(node.args[0]);
	if (!x) return null;

	return sin(x);
}

/**
 * cos(π - x) -> -cos(x)
 */
function transformCosSupplementary(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'cos') return null;
	if (node.args.length !== 1) return null;

	const x = isPiMinus(node.args[0]);
	if (!x) return null;

	return opposite(cos(x));
}

/**
 * tan(π - x) -> -tan(x)
 */
function transformTanSupplementary(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'tan') return null;
	if (node.args.length !== 1) return null;

	const x = isPiMinus(node.args[0]);
	if (!x) return null;

	return opposite(tan(x));
}

// =============================================================================
// Shifted by π/2 Identities (x + π/2)
// =============================================================================

/**
 * Check if expression is x + π/2
 */
function isPlusPiOver2(node: MathNode): MathNode | null {
	if (!isAddition(node)) return null;

	// Check if right side is π/2
	if (isDivision(node.right)) {
		if (
			isPi(node.right.numerator) &&
			isNumber(node.right.denominator) &&
			node.right.denominator.value === '2'
		) {
			return node.left;
		}
	}
	// Check if left side is π/2
	if (isDivision(node.left)) {
		if (
			isPi(node.left.numerator) &&
			isNumber(node.left.denominator) &&
			node.left.denominator.value === '2'
		) {
			return node.right;
		}
	}
	return null;
}

/**
 * sin(x + π/2) -> cos(x)
 */
function transformSinPlusPiOver2(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'sin') return null;
	if (node.args.length !== 1) return null;

	const x = isPlusPiOver2(node.args[0]);
	if (!x) return null;

	return cos(x);
}

/**
 * cos(x + π/2) -> -sin(x)
 */
function transformCosPlusPiOver2(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'cos') return null;
	if (node.args.length !== 1) return null;

	const x = isPlusPiOver2(node.args[0]);
	if (!x) return null;

	return opposite(sin(x));
}

/**
 * tan(x + π/2) -> -cot(x)
 */
function transformTanPlusPiOver2(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'tan') return null;
	if (node.args.length !== 1) return null;

	const x = isPlusPiOver2(node.args[0]);
	if (!x) return null;

	return opposite(cot(x));
}

// =============================================================================
// Sum-to-Product (Factorization) Formulas
// =============================================================================

/**
 * sin(a) + sin(b) -> 2sin((a+b)/2)cos((a-b)/2)
 */
function transformSinPlusSin(node: MathNode): MathNode | null {
	if (!isAddition(node)) return null;
	if (!isTrigFunc(node.left, 'sin') || !isTrigFunc(node.right, 'sin')) return null;

	const a = getArg(node.left);
	const b = getArg(node.right);

	// sin(a) + sin(b) = 2sin((a+b)/2)cos((a-b)/2)
	const halfSum = divide(add(a, b), number('2'), 'fraction');
	const halfDiff = divide(subtract(a, b), number('2'), 'fraction');

	return multiply(number('2'), multiply(sin(halfSum), cos(halfDiff), 'implicit'), 'implicit');
}

/**
 * sin(a) - sin(b) -> 2cos((a+b)/2)sin((a-b)/2)
 */
function transformSinMinusSin(node: MathNode): MathNode | null {
	if (!isSubtraction(node)) return null;
	if (!isTrigFunc(node.left, 'sin') || !isTrigFunc(node.right, 'sin')) return null;

	const a = getArg(node.left);
	const b = getArg(node.right);

	// sin(a) - sin(b) = 2cos((a+b)/2)sin((a-b)/2)
	const halfSum = divide(add(a, b), number('2'), 'fraction');
	const halfDiff = divide(subtract(a, b), number('2'), 'fraction');

	return multiply(number('2'), multiply(cos(halfSum), sin(halfDiff), 'implicit'), 'implicit');
}

/**
 * cos(a) + cos(b) -> 2cos((a+b)/2)cos((a-b)/2)
 */
function transformCosPlusCos(node: MathNode): MathNode | null {
	if (!isAddition(node)) return null;
	if (!isTrigFunc(node.left, 'cos') || !isTrigFunc(node.right, 'cos')) return null;

	const a = getArg(node.left);
	const b = getArg(node.right);

	// cos(a) + cos(b) = 2cos((a+b)/2)cos((a-b)/2)
	const halfSum = divide(add(a, b), number('2'), 'fraction');
	const halfDiff = divide(subtract(a, b), number('2'), 'fraction');

	return multiply(number('2'), multiply(cos(halfSum), cos(halfDiff), 'implicit'), 'implicit');
}

/**
 * cos(a) - cos(b) -> -2sin((a+b)/2)sin((a-b)/2)
 */
function transformCosMinusCos(node: MathNode): MathNode | null {
	if (!isSubtraction(node)) return null;
	if (!isTrigFunc(node.left, 'cos') || !isTrigFunc(node.right, 'cos')) return null;

	const a = getArg(node.left);
	const b = getArg(node.right);

	// cos(a) - cos(b) = -2sin((a+b)/2)sin((a-b)/2)
	const halfSum = divide(add(a, b), number('2'), 'fraction');
	const halfDiff = divide(subtract(a, b), number('2'), 'fraction');

	return opposite(
		multiply(number('2'), multiply(sin(halfSum), sin(halfDiff), 'implicit'), 'implicit')
	);
}

// =============================================================================
// Periodic Reduction
// =============================================================================

/**
 * Check if expression is x + 2π
 */
function isPlus2Pi(node: MathNode): MathNode | null {
	if (!isAddition(node)) return null;

	// Check if right side is 2π
	if (isMultiplication(node.right)) {
		const mult = node.right;
		if (
			(isNumber(mult.left) && mult.left.value === '2' && isPi(mult.right)) ||
			(isNumber(mult.right) && mult.right.value === '2' && isPi(mult.left))
		) {
			return node.left;
		}
	}
	// Also check left side
	if (isMultiplication(node.left)) {
		const mult = node.left;
		if (
			(isNumber(mult.left) && mult.left.value === '2' && isPi(mult.right)) ||
			(isNumber(mult.right) && mult.right.value === '2' && isPi(mult.left))
		) {
			return node.right;
		}
	}
	return null;
}

/**
 * Check if expression is x + π
 */
function isPlusPi(node: MathNode): MathNode | null {
	if (!isAddition(node)) return null;

	if (isPi(node.right)) return node.left;
	if (isPi(node.left)) return node.right;

	return null;
}

/**
 * sin(x + 2π) -> sin(x)
 */
function transformSinPeriod2Pi(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'sin') return null;
	if (node.args.length !== 1) return null;

	const x = isPlus2Pi(node.args[0]);
	if (!x) return null;

	return sin(x);
}

/**
 * cos(x + 2π) -> cos(x)
 */
function transformCosPeriod2Pi(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'cos') return null;
	if (node.args.length !== 1) return null;

	const x = isPlus2Pi(node.args[0]);
	if (!x) return null;

	return cos(x);
}

/**
 * sin(x + π) -> -sin(x)
 */
function transformSinPlusPi(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'sin') return null;
	if (node.args.length !== 1) return null;

	const x = isPlusPi(node.args[0]);
	if (!x) return null;

	return opposite(sin(x));
}

/**
 * cos(x + π) -> -cos(x)
 */
function transformCosPlusPi(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'cos') return null;
	if (node.args.length !== 1) return null;

	const x = isPlusPi(node.args[0]);
	if (!x) return null;

	return opposite(cos(x));
}

// =============================================================================
// Half-Angle Formulas
// =============================================================================

/**
 * Check if expression is x/2
 */
function isHalfOf(node: MathNode): MathNode | null {
	if (!isDivision(node)) return null;
	if (!isNumber(node.denominator) || node.denominator.value !== '2') return null;
	return node.numerator;
}

/**
 * sin(x/2) -> ±√((1 - cos(x))/2)
 * Note: We use positive root; sign depends on quadrant
 */
function transformSinHalfAngle(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'sin') return null;
	if (node.args.length !== 1) return null;

	const x = isHalfOf(node.args[0]);
	if (!x) return null;

	// sin(x/2) = √((1 - cos(x))/2)
	return sqrt(divide(subtract(number('1'), cos(x)), number('2'), 'fraction'));
}

/**
 * cos(x/2) -> ±√((1 + cos(x))/2)
 * Note: We use positive root; sign depends on quadrant
 */
function transformCosHalfAngle(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'cos') return null;
	if (node.args.length !== 1) return null;

	const x = isHalfOf(node.args[0]);
	if (!x) return null;

	// cos(x/2) = √((1 + cos(x))/2)
	return sqrt(divide(add(number('1'), cos(x)), number('2'), 'fraction'));
}

// =============================================================================
// Higher Power Formulas
// =============================================================================

/**
 * Check if a function node has a power of 3
 */
function hasPowerOf3(node: FunctionNode): boolean {
	return node.power !== undefined && isNumber(node.power) && node.power.value === '3';
}

/**
 * Check if a function node has a power of 4
 */
function hasPowerOf4(node: FunctionNode): boolean {
	return node.power !== undefined && isNumber(node.power) && node.power.value === '4';
}

/**
 * sin³(x) -> (3sin(x) - sin(3x)) / 4
 */
function transformSinCubed(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'sin') return null;
	if (!hasPowerOf3(node)) return null;

	const x = getArg(node);

	// sin³(x) = (3sin(x) - sin(3x)) / 4
	const threeX = multiply(number('3'), x, 'implicit');
	return divide(
		subtract(multiply(number('3'), sin(x), 'implicit'), sin(threeX)),
		number('4'),
		'fraction'
	);
}

/**
 * cos³(x) -> (3cos(x) + cos(3x)) / 4
 */
function transformCosCubed(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'cos') return null;
	if (!hasPowerOf3(node)) return null;

	const x = getArg(node);

	// cos³(x) = (3cos(x) + cos(3x)) / 4
	const threeX = multiply(number('3'), x, 'implicit');
	return divide(
		add(multiply(number('3'), cos(x), 'implicit'), cos(threeX)),
		number('4'),
		'fraction'
	);
}

/**
 * sin⁴(x) -> (3 - 4cos(2x) + cos(4x)) / 8
 */
function transformSinFourth(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'sin') return null;
	if (!hasPowerOf4(node)) return null;

	const x = getArg(node);

	// sin⁴(x) = (3 - 4cos(2x) + cos(4x)) / 8
	const twoX = multiply(number('2'), x, 'implicit');
	const fourX = multiply(number('4'), x, 'implicit');
	return divide(
		add(subtract(number('3'), multiply(number('4'), cos(twoX), 'implicit')), cos(fourX)),
		number('8'),
		'fraction'
	);
}

/**
 * cos⁴(x) -> (3 + 4cos(2x) + cos(4x)) / 8
 */
function transformCosFourth(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'cos') return null;
	if (!hasPowerOf4(node)) return null;

	const x = getArg(node);

	// cos⁴(x) = (3 + 4cos(2x) + cos(4x)) / 8
	const twoX = multiply(number('2'), x, 'implicit');
	const fourX = multiply(number('4'), x, 'implicit');
	return divide(
		add(add(number('3'), multiply(number('4'), cos(twoX), 'implicit')), cos(fourX)),
		number('8'),
		'fraction'
	);
}

// =============================================================================
// Rule Collections
// =============================================================================

const DOUBLE_ANGLE_TRANSFORMS: TrigRule[] = [
	{ name: 'double-angle-sin', transform: transformDoubleAngleSin },
	{ name: 'sin-cos-product', transform: transformSinCosProduct }
];

const POWER_REDUCTION_TRANSFORMS: TrigRule[] = [
	{ name: 'sin-squared', transform: transformSinSquared },
	{ name: 'cos-squared', transform: transformCosSquared }
];

const PYTHAGOREAN_TRANSFORMS: TrigRule[] = [
	{ name: 'pythagorean', transform: transformPythagorean },
	{ name: 'one-minus-sin-squared', transform: transformOneMinusSinSquared },
	{ name: 'one-minus-cos-squared', transform: transformOneMinusCosSquared }
];

const QUOTIENT_TRANSFORMS: TrigRule[] = [
	{ name: 'sin-over-cos', transform: transformSinOverCos },
	{ name: 'cos-over-sin', transform: transformCosOverSin },
	{ name: 'one-over-cos', transform: transformOneOverCos },
	{ name: 'one-over-sin', transform: transformOneOverSin }
];

const LINEARIZATION_TRANSFORMS: TrigRule[] = [
	{ name: 'cos-cos-product', transform: transformCosCosProduct },
	{ name: 'sin-sin-product', transform: transformSinSinProduct },
	{ name: 'sin-cos-different', transform: transformSinCosProductDifferent }
];

const ADDITION_TRANSFORMS: TrigRule[] = [
	{ name: 'cos-sum', transform: transformCosSum },
	{ name: 'cos-difference', transform: transformCosDifference },
	{ name: 'sin-sum', transform: transformSinSum },
	{ name: 'sin-difference', transform: transformSinDifference },
	{ name: 'tan-sum', transform: transformTanSum },
	{ name: 'tan-difference', transform: transformTanDifference }
];

const DOUBLE_ANGLE_EXPANSION_TRANSFORMS: TrigRule[] = [
	{ name: 'expand-double-sin', transform: transformExpandDoubleSin },
	{ name: 'expand-double-cos', transform: transformExpandDoubleCos },
	{ name: 'expand-double-tan', transform: transformExpandDoubleTan }
];

const NEGATIVE_ANGLE_TRANSFORMS: TrigRule[] = [
	{ name: 'sin-negative', transform: transformSinNegative },
	{ name: 'cos-negative', transform: transformCosNegative },
	{ name: 'tan-negative', transform: transformTanNegative }
];

const COFUNCTION_TRANSFORMS: TrigRule[] = [
	{ name: 'sin-cofunction', transform: transformSinCofunction },
	{ name: 'cos-cofunction', transform: transformCosCofunction },
	{ name: 'tan-cofunction', transform: transformTanCofunction }
];

const SUPPLEMENTARY_TRANSFORMS: TrigRule[] = [
	{ name: 'sin-supplementary', transform: transformSinSupplementary },
	{ name: 'cos-supplementary', transform: transformCosSupplementary },
	{ name: 'tan-supplementary', transform: transformTanSupplementary }
];

const SHIFT_PI_OVER_2_TRANSFORMS: TrigRule[] = [
	{ name: 'sin-plus-pi-over-2', transform: transformSinPlusPiOver2 },
	{ name: 'cos-plus-pi-over-2', transform: transformCosPlusPiOver2 },
	{ name: 'tan-plus-pi-over-2', transform: transformTanPlusPiOver2 }
];

const FACTORIZATION_TRANSFORMS: TrigRule[] = [
	{ name: 'sin-plus-sin', transform: transformSinPlusSin },
	{ name: 'sin-minus-sin', transform: transformSinMinusSin },
	{ name: 'cos-plus-cos', transform: transformCosPlusCos },
	{ name: 'cos-minus-cos', transform: transformCosMinusCos }
];

const PERIODIC_TRANSFORMS: TrigRule[] = [
	{ name: 'sin-period-2pi', transform: transformSinPeriod2Pi },
	{ name: 'cos-period-2pi', transform: transformCosPeriod2Pi },
	{ name: 'sin-plus-pi', transform: transformSinPlusPi },
	{ name: 'cos-plus-pi', transform: transformCosPlusPi }
];

const HALF_ANGLE_TRANSFORMS: TrigRule[] = [
	{ name: 'sin-half-angle', transform: transformSinHalfAngle },
	{ name: 'cos-half-angle', transform: transformCosHalfAngle }
];

const HIGHER_POWER_TRANSFORMS: TrigRule[] = [
	{ name: 'sin-cubed', transform: transformSinCubed },
	{ name: 'cos-cubed', transform: transformCosCubed },
	{ name: 'sin-fourth', transform: transformSinFourth },
	{ name: 'cos-fourth', transform: transformCosFourth }
];

// Note: Some transforms are NOT included in ALL_TRANSFORMS because they are
// inverse to other transforms and would cause loops (e.g., ADDITION vs LINEARIZATION,
// DOUBLE_ANGLE_EXPANSION vs DOUBLE_ANGLE contraction)
const ALL_TRANSFORMS: TrigRule[] = [
	...DOUBLE_ANGLE_TRANSFORMS,
	...POWER_REDUCTION_TRANSFORMS,
	...PYTHAGOREAN_TRANSFORMS,
	...QUOTIENT_TRANSFORMS,
	...LINEARIZATION_TRANSFORMS,
	...NEGATIVE_ANGLE_TRANSFORMS,
	...PERIODIC_TRANSFORMS
];

// =============================================================================
// Application Functions
// =============================================================================

/**
 * Apply transforms to a single node (not recursive)
 */
function applyTransformsToNode(
	node: MathNode,
	transforms: TrigRule[]
): { result: MathNode; applied: string | null } {
	for (const rule of transforms) {
		const result = rule.transform(node);
		if (result !== null) {
			return { result, applied: rule.name };
		}
	}
	return { result: node, applied: null };
}

/**
 * Apply transforms recursively to all subexpressions (single pass, bottom-up)
 */
function applyTransformsDeep(
	node: MathNode,
	transforms: TrigRule[]
): { result: MathNode; appliedRules: Set<string> } {
	const appliedRules = new Set<string>();

	// mapNode already handles recursion bottom-up (children first, then parent)
	// We just need to apply transforms at each node
	const result = mapNode(node, (n) => {
		const { result: transformed, applied } = applyTransformsToNode(n, transforms);
		if (applied) {
			appliedRules.add(applied);
		}
		return transformed;
	});

	return { result, appliedRules };
}

/**
 * Apply all trig identity transforms to an expression.
 *
 * @param node - The expression to transform
 * @param transforms - The transforms to apply (defaults to all)
 * @returns Transformation result with applied rules
 */
export function applyTrigIdentities(
	node: MathNode,
	transforms: TrigRule[] = ALL_TRANSFORMS
): TrigTransformResult {
	let current = node;
	const allAppliedRules = new Set<string>();
	let changed = false;

	// Apply repeatedly until no more changes
	const maxIterations = 10;
	for (let i = 0; i < maxIterations; i++) {
		const { result, appliedRules } = applyTransformsDeep(current, transforms);

		if (appliedRules.size === 0) {
			break;
		}

		appliedRules.forEach((rule) => allAppliedRules.add(rule));
		current = result;
		changed = true;
	}

	return {
		result: current,
		changed,
		appliedRules: Array.from(allAppliedRules)
	};
}

/**
 * Contract products and powers to double-angle form.
 *
 * Examples:
 * - sin(x) * cos(x) -> sin(2x) / 2
 * - sin²(x) -> (1 - cos(2x)) / 2
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function contractToDoubleAngle(node: MathNode): TrigTransformResult {
	return applyTrigIdentities(node, [...DOUBLE_ANGLE_TRANSFORMS, ...POWER_REDUCTION_TRANSFORMS]);
}

/**
 * Simplify using Pythagorean identities.
 *
 * Examples:
 * - sin²(x) + cos²(x) -> 1
 * - 1 - sin²(x) -> cos²(x)
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function simplifyPythagorean(node: MathNode): TrigTransformResult {
	return applyTrigIdentities(node, PYTHAGOREAN_TRANSFORMS);
}

/**
 * Convert ratios to tangent/cotangent.
 *
 * Examples:
 * - sin(x) / cos(x) -> tan(x)
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function simplifyQuotients(node: MathNode): TrigTransformResult {
	return applyTrigIdentities(node, QUOTIENT_TRANSFORMS);
}

/**
 * Linearize products of trig functions (product-to-sum formulas).
 *
 * Examples:
 * - cos(a) * cos(b) -> (cos(a-b) + cos(a+b)) / 2
 * - sin(a) * sin(b) -> (cos(a-b) - cos(a+b)) / 2
 * - sin(a) * cos(b) -> (sin(a+b) + sin(a-b)) / 2
 * - cos(a) * sin(b) -> (sin(a+b) - sin(a-b)) / 2
 *
 * Note: Products with same argument (e.g., sin(x)*cos(x)) are handled
 * by contractToDoubleAngle instead.
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function linearize(node: MathNode): TrigTransformResult {
	return applyTrigIdentities(node, LINEARIZATION_TRANSFORMS);
}

/**
 * Expand angle sums and differences (addition formulas).
 *
 * Examples:
 * - cos(a + b) -> cos(a)cos(b) - sin(a)sin(b)
 * - cos(a - b) -> cos(a)cos(b) + sin(a)sin(b)
 * - sin(a + b) -> sin(a)cos(b) + cos(a)sin(b)
 * - sin(a - b) -> sin(a)cos(b) - cos(a)sin(b)
 *
 * Note: This is the inverse of linearize(). Applying both in sequence
 * will not return to the original form.
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function expandAddition(node: MathNode): TrigTransformResult {
	return applyTrigIdentities(node, ADDITION_TRANSFORMS);
}

/**
 * Expand double angles to single angle expressions.
 *
 * Examples:
 * - sin(2x) -> 2sin(x)cos(x)
 * - cos(2x) -> cos²(x) - sin²(x)
 * - tan(2x) -> 2tan(x) / (1 - tan²(x))
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function expandDoubleAngle(node: MathNode): TrigTransformResult {
	return applyTrigIdentities(node, DOUBLE_ANGLE_EXPANSION_TRANSFORMS);
}

/**
 * Simplify negative angle expressions.
 *
 * Examples:
 * - sin(-x) -> -sin(x)
 * - cos(-x) -> cos(x)
 * - tan(-x) -> -tan(x)
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function simplifyNegativeAngle(node: MathNode): TrigTransformResult {
	return applyTrigIdentities(node, NEGATIVE_ANGLE_TRANSFORMS);
}

/**
 * Convert cofunctions (complementary angle identities).
 *
 * Examples:
 * - sin(π/2 - x) -> cos(x)
 * - cos(π/2 - x) -> sin(x)
 * - tan(π/2 - x) -> cot(x)
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function simplifyCofunction(node: MathNode): TrigTransformResult {
	return applyTrigIdentities(node, COFUNCTION_TRANSFORMS);
}

/**
 * Simplify supplementary angle expressions (π - x).
 *
 * Examples:
 * - sin(π - x) -> sin(x)
 * - cos(π - x) -> -cos(x)
 * - tan(π - x) -> -tan(x)
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function simplifySupplementary(node: MathNode): TrigTransformResult {
	return applyTrigIdentities(node, SUPPLEMENTARY_TRANSFORMS);
}

/**
 * Simplify expressions shifted by π/2 (x + π/2).
 *
 * Examples:
 * - sin(x + π/2) -> cos(x)
 * - cos(x + π/2) -> -sin(x)
 * - tan(x + π/2) -> -cot(x)
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function simplifyShiftPiOver2(node: MathNode): TrigTransformResult {
	return applyTrigIdentities(node, SHIFT_PI_OVER_2_TRANSFORMS);
}

/**
 * Factorize sums/differences of trig functions (sum-to-product formulas).
 *
 * Examples:
 * - sin(a) + sin(b) -> 2sin((a+b)/2)cos((a-b)/2)
 * - sin(a) - sin(b) -> 2cos((a+b)/2)sin((a-b)/2)
 * - cos(a) + cos(b) -> 2cos((a+b)/2)cos((a-b)/2)
 * - cos(a) - cos(b) -> -2sin((a+b)/2)sin((a-b)/2)
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function factorize(node: MathNode): TrigTransformResult {
	return applyTrigIdentities(node, FACTORIZATION_TRANSFORMS);
}

/**
 * Reduce expressions using periodicity.
 *
 * Examples:
 * - sin(x + 2π) -> sin(x)
 * - cos(x + 2π) -> cos(x)
 * - sin(x + π) -> -sin(x)
 * - cos(x + π) -> -cos(x)
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function reducePeriodic(node: MathNode): TrigTransformResult {
	return applyTrigIdentities(node, PERIODIC_TRANSFORMS);
}

/**
 * Expand half-angle expressions.
 *
 * Examples:
 * - sin(x/2) -> √((1 - cos(x))/2)
 * - cos(x/2) -> √((1 + cos(x))/2)
 *
 * Note: Uses positive root; actual sign depends on quadrant.
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function expandHalfAngle(node: MathNode): TrigTransformResult {
	return applyTrigIdentities(node, HALF_ANGLE_TRANSFORMS);
}

/**
 * Reduce higher powers of trig functions.
 *
 * Examples:
 * - sin³(x) -> (3sin(x) - sin(3x)) / 4
 * - cos³(x) -> (3cos(x) + cos(3x)) / 4
 * - sin⁴(x) -> (3 - 4cos(2x) + cos(4x)) / 8
 * - cos⁴(x) -> (3 + 4cos(2x) + cos(4x)) / 8
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function reduceHigherPowers(node: MathNode): TrigTransformResult {
	return applyTrigIdentities(node, HIGHER_POWER_TRANSFORMS);
}

// =============================================================================
// Exports for individual transforms (for testing)
// =============================================================================

export const TRANSFORM_SIN_COS_PRODUCT = transformSinCosProduct;
export const TRANSFORM_DOUBLE_ANGLE_SIN = transformDoubleAngleSin;
export const TRANSFORM_SIN_SQUARED = transformSinSquared;
export const TRANSFORM_COS_SQUARED = transformCosSquared;
export const TRANSFORM_PYTHAGOREAN = transformPythagorean;
export const TRANSFORM_ONE_MINUS_SIN_SQUARED = transformOneMinusSinSquared;
export const TRANSFORM_ONE_MINUS_COS_SQUARED = transformOneMinusCosSquared;
export const TRANSFORM_SIN_OVER_COS = transformSinOverCos;
export const TRANSFORM_COS_COS_PRODUCT = transformCosCosProduct;
export const TRANSFORM_SIN_SIN_PRODUCT = transformSinSinProduct;
export const TRANSFORM_SIN_COS_DIFFERENT = transformSinCosProductDifferent;
export const TRANSFORM_COS_SUM = transformCosSum;
export const TRANSFORM_COS_DIFFERENCE = transformCosDifference;
export const TRANSFORM_SIN_SUM = transformSinSum;
export const TRANSFORM_SIN_DIFFERENCE = transformSinDifference;

// Double angle expansion
export const TRANSFORM_EXPAND_DOUBLE_SIN = transformExpandDoubleSin;
export const TRANSFORM_EXPAND_DOUBLE_COS = transformExpandDoubleCos;
export const TRANSFORM_EXPAND_DOUBLE_TAN = transformExpandDoubleTan;

// Additional quotients
export const TRANSFORM_COS_OVER_SIN = transformCosOverSin;
export const TRANSFORM_ONE_OVER_COS = transformOneOverCos;
export const TRANSFORM_ONE_OVER_SIN = transformOneOverSin;

// Tangent addition
export const TRANSFORM_TAN_SUM = transformTanSum;
export const TRANSFORM_TAN_DIFFERENCE = transformTanDifference;

// Negative angle
export const TRANSFORM_SIN_NEGATIVE = transformSinNegative;
export const TRANSFORM_COS_NEGATIVE = transformCosNegative;
export const TRANSFORM_TAN_NEGATIVE = transformTanNegative;

// Cofunction
export const TRANSFORM_SIN_COFUNCTION = transformSinCofunction;
export const TRANSFORM_COS_COFUNCTION = transformCosCofunction;
export const TRANSFORM_TAN_COFUNCTION = transformTanCofunction;

// Factorization (sum-to-product)
export const TRANSFORM_SIN_PLUS_SIN = transformSinPlusSin;
export const TRANSFORM_SIN_MINUS_SIN = transformSinMinusSin;
export const TRANSFORM_COS_PLUS_COS = transformCosPlusCos;
export const TRANSFORM_COS_MINUS_COS = transformCosMinusCos;

// Periodic reduction
export const TRANSFORM_SIN_PERIOD_2PI = transformSinPeriod2Pi;
export const TRANSFORM_COS_PERIOD_2PI = transformCosPeriod2Pi;
export const TRANSFORM_SIN_PLUS_PI = transformSinPlusPi;
export const TRANSFORM_COS_PLUS_PI = transformCosPlusPi;

// Half angle
export const TRANSFORM_SIN_HALF_ANGLE = transformSinHalfAngle;
export const TRANSFORM_COS_HALF_ANGLE = transformCosHalfAngle;

// Higher powers
export const TRANSFORM_SIN_CUBED = transformSinCubed;
export const TRANSFORM_COS_CUBED = transformCosCubed;
export const TRANSFORM_SIN_FOURTH = transformSinFourth;
export const TRANSFORM_COS_FOURTH = transformCosFourth;

// Supplementary angle (π - x)
export const TRANSFORM_SIN_SUPPLEMENTARY = transformSinSupplementary;
export const TRANSFORM_COS_SUPPLEMENTARY = transformCosSupplementary;
export const TRANSFORM_TAN_SUPPLEMENTARY = transformTanSupplementary;

// Shift by π/2 (x + π/2)
export const TRANSFORM_SIN_PLUS_PI_OVER_2 = transformSinPlusPiOver2;
export const TRANSFORM_COS_PLUS_PI_OVER_2 = transformCosPlusPiOver2;
export const TRANSFORM_TAN_PLUS_PI_OVER_2 = transformTanPlusPiOver2;
