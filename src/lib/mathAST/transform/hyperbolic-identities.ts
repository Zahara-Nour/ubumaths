/**
 * Hyperbolic Identities Module
 *
 * Provides transformation functions for hyperbolic identities.
 * Uses direct AST matching to handle the specific structure of function nodes.
 *
 * @module mathAST/transform/hyperbolic-identities
 */

import type { MathNode, FunctionNode } from '../types';
import {
	isFunction,
	isMultiplication,
	isAddition,
	isSubtraction,
	isDivision,
	isNumber,
	isOpposite
} from '../guards';
import {
	number,
	sinh,
	cosh,
	tanh,
	coth,
	sech,
	csch,
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
 * Result of applying hyperbolic identity transformations
 */
export interface HyperbolicTransformResult {
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
interface HyperbolicRule {
	readonly name: string;
	readonly transform: (node: MathNode) => MathNode | null;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a node is a hyperbolic function with a specific name
 */
function isHyperbolicFunc(node: MathNode, name: string): node is FunctionNode {
	return isFunction(node) && node.name === name && node.args.length === 1;
}

/**
 * Check if a function node has a power of 2
 */
function hasPowerOf2(node: FunctionNode): boolean {
	return node.power !== undefined && isNumber(node.power) && node.power.value === '2';
}

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
 * Triple an expression: a -> 3a
 */
function tripleArg(node: MathNode): MathNode {
	return multiply(number('3'), node, 'implicit');
}

/**
 * Quadruple an expression: a -> 4a
 */
function quadrupleArg(node: MathNode): MathNode {
	return multiply(number('4'), node, 'implicit');
}

/**
 * Halve an expression: a -> a/2
 */
function halveExpr(node: MathNode): MathNode {
	return divide(node, number('2'), 'fraction');
}

// =============================================================================
// Transform Functions - Products and Double Angle
// =============================================================================

/**
 * sinh(a) * cosh(a) -> sinh(2a) / 2
 * Also handles cosh(a) * sinh(a)
 */
function transformSinhCoshProduct(node: MathNode): MathNode | null {
	if (!isMultiplication(node)) return null;

	// Check sinh(a) * cosh(a)
	if (isHyperbolicFunc(node.left, 'sinh') && isHyperbolicFunc(node.right, 'cosh')) {
		const sinhArg = getArg(node.left);
		const coshArg = getArg(node.right);
		if (nodesEqual(sinhArg, coshArg)) {
			return halveExpr(sinh(doubleArg(sinhArg)));
		}
	}

	// Check cosh(a) * sinh(a)
	if (isHyperbolicFunc(node.left, 'cosh') && isHyperbolicFunc(node.right, 'sinh')) {
		const coshArg = getArg(node.left);
		const sinhArg = getArg(node.right);
		if (nodesEqual(coshArg, sinhArg)) {
			return halveExpr(sinh(doubleArg(sinhArg)));
		}
	}

	return null;
}

/**
 * 2 * sinh(a) * cosh(a) -> sinh(2a)
 * Handles various orderings
 */
function transformDoubleAngleSinh(node: MathNode): MathNode | null {
	if (!isMultiplication(node)) return null;

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

	// Find sinh and cosh with same argument
	let sinhFunc: FunctionNode | null = null;
	let coshFunc: FunctionNode | null = null;

	for (const f of factors) {
		if (isHyperbolicFunc(f, 'sinh') && !hasPowerOf2(f)) {
			sinhFunc = f;
		} else if (isHyperbolicFunc(f, 'cosh') && !hasPowerOf2(f)) {
			coshFunc = f;
		}
	}

	if (sinhFunc && coshFunc && nodesEqual(getArg(sinhFunc), getArg(coshFunc))) {
		return sinh(doubleArg(getArg(sinhFunc)));
	}

	return null;
}

// =============================================================================
// Power Reduction
// =============================================================================

/**
 * sinh²(a) -> (cosh(2a) - 1) / 2
 */
function transformSinhSquared(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'sinh') return null;
	if (!hasPowerOf2(node)) return null;

	const a = getArg(node);
	return halveExpr(subtract(cosh(doubleArg(a)), number('1')));
}

/**
 * cosh²(a) -> (cosh(2a) + 1) / 2
 */
function transformCoshSquared(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'cosh') return null;
	if (!hasPowerOf2(node)) return null;

	const a = getArg(node);
	return halveExpr(add(cosh(doubleArg(a)), number('1')));
}

// =============================================================================
// Hyperbolic Pythagorean Identities
// =============================================================================

/**
 * cosh²(a) - sinh²(a) -> 1
 */
function transformHyperbolicPythagorean(node: MathNode): MathNode | null {
	if (!isSubtraction(node)) return null;

	function isSinhSquared(n: MathNode): n is FunctionNode {
		return isFunction(n) && n.name === 'sinh' && hasPowerOf2(n);
	}

	function isCoshSquared(n: MathNode): n is FunctionNode {
		return isFunction(n) && n.name === 'cosh' && hasPowerOf2(n);
	}

	// cosh²(a) - sinh²(a)
	if (isCoshSquared(node.left) && isSinhSquared(node.right)) {
		if (nodesEqual(getArg(node.left), getArg(node.right))) {
			return number('1');
		}
	}

	return null;
}

/**
 * 1 + sinh²(a) -> cosh²(a)
 */
function transformOnePlusSinhSquared(node: MathNode): MathNode | null {
	if (!isAddition(node)) return null;

	// Check 1 + sinh²(a)
	if (isNumber(node.left) && node.left.value === '1') {
		if (isFunction(node.right) && node.right.name === 'sinh' && hasPowerOf2(node.right)) {
			const a = getArg(node.right);
			return superscript(cosh(a), number('2'));
		}
	}

	// Check sinh²(a) + 1
	if (isNumber(node.right) && node.right.value === '1') {
		if (isFunction(node.left) && node.left.name === 'sinh' && hasPowerOf2(node.left)) {
			const a = getArg(node.left);
			return superscript(cosh(a), number('2'));
		}
	}

	return null;
}

/**
 * cosh²(a) - 1 -> sinh²(a)
 */
function transformCoshSquaredMinusOne(node: MathNode): MathNode | null {
	if (!isSubtraction(node)) return null;
	if (!isFunction(node.left) || node.left.name !== 'cosh') return null;
	if (!hasPowerOf2(node.left)) return null;
	if (!isNumber(node.right) || node.right.value !== '1') return null;

	const a = getArg(node.left);
	return superscript(sinh(a), number('2'));
}

/**
 * 1 - tanh²(a) -> sech²(a)
 */
function transformOneMinusTanhSquared(node: MathNode): MathNode | null {
	if (!isSubtraction(node)) return null;
	if (!isNumber(node.left) || node.left.value !== '1') return null;
	if (!isFunction(node.right) || node.right.name !== 'tanh') return null;
	if (!hasPowerOf2(node.right)) return null;

	const a = getArg(node.right);
	return superscript(sech(a), number('2'));
}

/**
 * sech²(a) + tanh²(a) -> 1
 * Also handles tanh²(a) + sech²(a)
 */
function transformSechTanhPythagorean(node: MathNode): MathNode | null {
	if (!isAddition(node)) return null;

	function isTanhSquared(n: MathNode): n is FunctionNode {
		return isFunction(n) && n.name === 'tanh' && hasPowerOf2(n);
	}

	function isSechSquared(n: MathNode): n is FunctionNode {
		return isFunction(n) && n.name === 'sech' && hasPowerOf2(n);
	}

	// sech²(a) + tanh²(a)
	if (isSechSquared(node.left) && isTanhSquared(node.right)) {
		if (nodesEqual(getArg(node.left), getArg(node.right))) {
			return number('1');
		}
	}

	// tanh²(a) + sech²(a)
	if (isTanhSquared(node.left) && isSechSquared(node.right)) {
		if (nodesEqual(getArg(node.left), getArg(node.right))) {
			return number('1');
		}
	}

	return null;
}

/**
 * coth²(a) - 1 -> csch²(a)
 */
function transformCothSquaredMinusOne(node: MathNode): MathNode | null {
	if (!isSubtraction(node)) return null;
	if (!isFunction(node.left) || node.left.name !== 'coth') return null;
	if (!hasPowerOf2(node.left)) return null;
	if (!isNumber(node.right) || node.right.value !== '1') return null;

	const a = getArg(node.left);
	return superscript(csch(a), number('2'));
}

/**
 * coth²(a) - csch²(a) -> 1
 * Also handles the reverse order
 */
function transformCothCschPythagorean(node: MathNode): MathNode | null {
	if (!isSubtraction(node)) return null;

	function isCothSquared(n: MathNode): n is FunctionNode {
		return isFunction(n) && n.name === 'coth' && hasPowerOf2(n);
	}

	function isCschSquared(n: MathNode): n is FunctionNode {
		return isFunction(n) && n.name === 'csch' && hasPowerOf2(n);
	}

	// coth²(a) - csch²(a)
	if (isCothSquared(node.left) && isCschSquared(node.right)) {
		if (nodesEqual(getArg(node.left), getArg(node.right))) {
			return number('1');
		}
	}

	return null;
}

/**
 * 1 + csch²(a) -> coth²(a)
 * Also handles csch²(a) + 1
 */
function transformOnePlusCschSquared(node: MathNode): MathNode | null {
	if (!isAddition(node)) return null;

	function isCschSquared(n: MathNode): n is FunctionNode {
		return isFunction(n) && n.name === 'csch' && hasPowerOf2(n);
	}

	// 1 + csch²(a)
	if (isNumber(node.left) && node.left.value === '1' && isCschSquared(node.right)) {
		const a = getArg(node.right);
		return superscript(coth(a), number('2'));
	}

	// csch²(a) + 1
	if (isCschSquared(node.left) && isNumber(node.right) && node.right.value === '1') {
		const a = getArg(node.left);
		return superscript(coth(a), number('2'));
	}

	return null;
}

// =============================================================================
// Quotient Identities
// =============================================================================

/**
 * sinh(a) / cosh(a) -> tanh(a)
 */
function transformSinhOverCosh(node: MathNode): MathNode | null {
	if (!isDivision(node)) return null;
	if (!isHyperbolicFunc(node.numerator, 'sinh')) return null;
	if (!isHyperbolicFunc(node.denominator, 'cosh')) return null;

	const sinhArg = getArg(node.numerator as FunctionNode);
	const coshArg = getArg(node.denominator as FunctionNode);

	if (nodesEqual(sinhArg, coshArg)) {
		return tanh(sinhArg);
	}

	return null;
}

/**
 * cosh(a) / sinh(a) -> coth(a)
 */
function transformCoshOverSinh(node: MathNode): MathNode | null {
	if (!isDivision(node)) return null;
	if (!isHyperbolicFunc(node.numerator, 'cosh')) return null;
	if (!isHyperbolicFunc(node.denominator, 'sinh')) return null;

	const coshArg = getArg(node.numerator as FunctionNode);
	const sinhArg = getArg(node.denominator as FunctionNode);

	if (nodesEqual(coshArg, sinhArg)) {
		return coth(coshArg);
	}

	return null;
}

/**
 * 1 / cosh(x) -> sech(x)
 */
function transformOneOverCosh(node: MathNode): MathNode | null {
	if (!isDivision(node)) return null;
	if (!isNumber(node.numerator) || node.numerator.value !== '1') return null;
	if (!isHyperbolicFunc(node.denominator, 'cosh')) return null;

	return sech(getArg(node.denominator as FunctionNode));
}

/**
 * 1 / sinh(x) -> csch(x)
 */
function transformOneOverSinh(node: MathNode): MathNode | null {
	if (!isDivision(node)) return null;
	if (!isNumber(node.numerator) || node.numerator.value !== '1') return null;
	if (!isHyperbolicFunc(node.denominator, 'sinh')) return null;

	return csch(getArg(node.denominator as FunctionNode));
}

// =============================================================================
// Linearization Formulas (Product to Sum)
// =============================================================================

/**
 * cosh(a) * cosh(b) -> (cosh(a+b) + cosh(a-b)) / 2
 */
function transformCoshCoshProduct(node: MathNode): MathNode | null {
	if (!isMultiplication(node)) return null;
	if (!isHyperbolicFunc(node.left, 'cosh') || !isHyperbolicFunc(node.right, 'cosh')) return null;

	const a = getArg(node.left);
	const b = getArg(node.right);
	if (nodesEqual(a, b)) return null;

	// cosh(a)cosh(b) = (cosh(a+b) + cosh(a-b)) / 2
	const aPlusB = add(a, b);
	const aMinusB = subtract(a, b);
	return halveExpr(add(cosh(aPlusB), cosh(aMinusB)));
}

/**
 * sinh(a) * sinh(b) -> (cosh(a+b) - cosh(a-b)) / 2
 */
function transformSinhSinhProduct(node: MathNode): MathNode | null {
	if (!isMultiplication(node)) return null;
	if (!isHyperbolicFunc(node.left, 'sinh') || !isHyperbolicFunc(node.right, 'sinh')) return null;

	const a = getArg(node.left);
	const b = getArg(node.right);
	if (nodesEqual(a, b)) return null;

	// sinh(a)sinh(b) = (cosh(a+b) - cosh(a-b)) / 2
	const aPlusB = add(a, b);
	const aMinusB = subtract(a, b);
	return halveExpr(subtract(cosh(aPlusB), cosh(aMinusB)));
}

/**
 * sinh(a) * cosh(b) -> (sinh(a+b) + sinh(a-b)) / 2
 * cosh(a) * sinh(b) -> (sinh(a+b) - sinh(a-b)) / 2
 */
function transformSinhCoshProductDifferent(node: MathNode): MathNode | null {
	if (!isMultiplication(node)) return null;

	// sinh(a) * cosh(b)
	if (isHyperbolicFunc(node.left, 'sinh') && isHyperbolicFunc(node.right, 'cosh')) {
		const a = getArg(node.left);
		const b = getArg(node.right);

		if (nodesEqual(a, b)) return null;

		// sinh(a)cosh(b) = (sinh(a+b) + sinh(a-b)) / 2
		const aPlusB = add(a, b);
		const aMinusB = subtract(a, b);
		return halveExpr(add(sinh(aPlusB), sinh(aMinusB)));
	}

	// cosh(a) * sinh(b)
	if (isHyperbolicFunc(node.left, 'cosh') && isHyperbolicFunc(node.right, 'sinh')) {
		const a = getArg(node.left);
		const b = getArg(node.right);

		if (nodesEqual(a, b)) return null;

		// cosh(a)sinh(b) = (sinh(a+b) - sinh(a-b)) / 2
		const aPlusB = add(a, b);
		const aMinusB = subtract(a, b);
		return halveExpr(subtract(sinh(aPlusB), sinh(aMinusB)));
	}

	return null;
}

// =============================================================================
// Addition Formulas (Angle Sum/Difference Expansion)
// =============================================================================

/**
 * cosh(a + b) -> cosh(a)cosh(b) + sinh(a)sinh(b)
 */
function transformCoshSum(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'cosh') return null;
	if (node.args.length !== 1) return null;

	const arg = node.args[0];
	if (!isAddition(arg)) return null;

	const a = arg.left;
	const b = arg.right;

	// cosh(a+b) = cosh(a)cosh(b) + sinh(a)sinh(b)
	return add(multiply(cosh(a), cosh(b), 'implicit'), multiply(sinh(a), sinh(b), 'implicit'));
}

/**
 * cosh(a - b) -> cosh(a)cosh(b) - sinh(a)sinh(b)
 */
function transformCoshDifference(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'cosh') return null;
	if (node.args.length !== 1) return null;

	const arg = node.args[0];
	if (!isSubtraction(arg)) return null;

	const a = arg.left;
	const b = arg.right;

	// cosh(a-b) = cosh(a)cosh(b) - sinh(a)sinh(b)
	return subtract(multiply(cosh(a), cosh(b), 'implicit'), multiply(sinh(a), sinh(b), 'implicit'));
}

/**
 * sinh(a + b) -> sinh(a)cosh(b) + cosh(a)sinh(b)
 */
function transformSinhSum(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'sinh') return null;
	if (node.args.length !== 1) return null;

	const arg = node.args[0];
	if (!isAddition(arg)) return null;

	const a = arg.left;
	const b = arg.right;

	// sinh(a+b) = sinh(a)cosh(b) + cosh(a)sinh(b)
	return add(multiply(sinh(a), cosh(b), 'implicit'), multiply(cosh(a), sinh(b), 'implicit'));
}

/**
 * sinh(a - b) -> sinh(a)cosh(b) - cosh(a)sinh(b)
 */
function transformSinhDifference(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'sinh') return null;
	if (node.args.length !== 1) return null;

	const arg = node.args[0];
	if (!isSubtraction(arg)) return null;

	const a = arg.left;
	const b = arg.right;

	// sinh(a-b) = sinh(a)cosh(b) - cosh(a)sinh(b)
	return subtract(multiply(sinh(a), cosh(b), 'implicit'), multiply(cosh(a), sinh(b), 'implicit'));
}

/**
 * tanh(a + b) -> (tanh(a) + tanh(b)) / (1 + tanh(a)tanh(b))
 */
function transformTanhSum(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'tanh') return null;
	if (node.args.length !== 1) return null;

	const arg = node.args[0];
	if (!isAddition(arg)) return null;

	const a = arg.left;
	const b = arg.right;
	const tanhA = tanh(a);
	const tanhB = tanh(b);

	// tanh(a+b) = (tanh(a) + tanh(b)) / (1 + tanh(a)tanh(b))
	return divide(
		add(tanhA, tanhB),
		add(number('1'), multiply(tanh(a), tanh(b), 'implicit')),
		'fraction'
	);
}

/**
 * tanh(a - b) -> (tanh(a) - tanh(b)) / (1 - tanh(a)tanh(b))
 */
function transformTanhDifference(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'tanh') return null;
	if (node.args.length !== 1) return null;

	const arg = node.args[0];
	if (!isSubtraction(arg)) return null;

	const a = arg.left;
	const b = arg.right;
	const tanhA = tanh(a);
	const tanhB = tanh(b);

	// tanh(a-b) = (tanh(a) - tanh(b)) / (1 - tanh(a)tanh(b))
	return divide(
		subtract(tanhA, tanhB),
		subtract(number('1'), multiply(tanh(a), tanh(b), 'implicit')),
		'fraction'
	);
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
 * sinh(2x) -> 2sinh(x)cosh(x)
 */
function transformExpandDoubleSinh(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'sinh') return null;
	if (node.args.length !== 1) return null;

	const x = isDoubleOf(node.args[0]);
	if (!x) return null;

	// sinh(2x) = 2sinh(x)cosh(x)
	return multiply(number('2'), multiply(sinh(x), cosh(x), 'implicit'), 'implicit');
}

/**
 * cosh(2x) -> cosh²(x) + sinh²(x)
 */
function transformExpandDoubleCosh(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'cosh') return null;
	if (node.args.length !== 1) return null;

	const x = isDoubleOf(node.args[0]);
	if (!x) return null;

	// cosh(2x) = cosh²(x) + sinh²(x)
	return add(superscript(cosh(x), number('2')), superscript(sinh(x), number('2')));
}

/**
 * tanh(2x) -> 2tanh(x) / (1 + tanh²(x))
 */
function transformExpandDoubleTanh(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'tanh') return null;
	if (node.args.length !== 1) return null;

	const x = isDoubleOf(node.args[0]);
	if (!x) return null;

	// tanh(2x) = 2tanh(x) / (1 + tanh²(x))
	const tanhX = tanh(x);
	return divide(
		multiply(number('2'), tanhX, 'implicit'),
		add(number('1'), superscript(tanh(x), number('2'))),
		'fraction'
	);
}

// =============================================================================
// Negative Argument Identities
// =============================================================================

/**
 * sinh(-x) -> -sinh(x)
 */
function transformSinhNegative(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'sinh') return null;
	if (node.args.length !== 1) return null;

	const arg = node.args[0];
	if (!isOpposite(arg)) return null;

	// sinh(-x) = -sinh(x)
	return opposite(sinh(arg.operand));
}

/**
 * cosh(-x) -> cosh(x)
 */
function transformCoshNegative(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'cosh') return null;
	if (node.args.length !== 1) return null;

	const arg = node.args[0];
	if (!isOpposite(arg)) return null;

	// cosh(-x) = cosh(x)
	return cosh(arg.operand);
}

/**
 * tanh(-x) -> -tanh(x)
 */
function transformTanhNegative(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'tanh') return null;
	if (node.args.length !== 1) return null;

	const arg = node.args[0];
	if (!isOpposite(arg)) return null;

	// tanh(-x) = -tanh(x)
	return opposite(tanh(arg.operand));
}

// =============================================================================
// Sum-to-Product (Factorization) Formulas
// =============================================================================

/**
 * sinh(a) + sinh(b) -> 2sinh((a+b)/2)cosh((a-b)/2)
 */
function transformSinhPlusSinh(node: MathNode): MathNode | null {
	if (!isAddition(node)) return null;
	if (!isHyperbolicFunc(node.left, 'sinh') || !isHyperbolicFunc(node.right, 'sinh')) return null;

	const a = getArg(node.left);
	const b = getArg(node.right);

	// sinh(a) + sinh(b) = 2sinh((a+b)/2)cosh((a-b)/2)
	const halfSum = divide(add(a, b), number('2'), 'fraction');
	const halfDiff = divide(subtract(a, b), number('2'), 'fraction');

	return multiply(number('2'), multiply(sinh(halfSum), cosh(halfDiff), 'implicit'), 'implicit');
}

/**
 * sinh(a) - sinh(b) -> 2cosh((a+b)/2)sinh((a-b)/2)
 */
function transformSinhMinusSinh(node: MathNode): MathNode | null {
	if (!isSubtraction(node)) return null;
	if (!isHyperbolicFunc(node.left, 'sinh') || !isHyperbolicFunc(node.right, 'sinh')) return null;

	const a = getArg(node.left);
	const b = getArg(node.right);

	// sinh(a) - sinh(b) = 2cosh((a+b)/2)sinh((a-b)/2)
	const halfSum = divide(add(a, b), number('2'), 'fraction');
	const halfDiff = divide(subtract(a, b), number('2'), 'fraction');

	return multiply(number('2'), multiply(cosh(halfSum), sinh(halfDiff), 'implicit'), 'implicit');
}

/**
 * cosh(a) + cosh(b) -> 2cosh((a+b)/2)cosh((a-b)/2)
 */
function transformCoshPlusCosh(node: MathNode): MathNode | null {
	if (!isAddition(node)) return null;
	if (!isHyperbolicFunc(node.left, 'cosh') || !isHyperbolicFunc(node.right, 'cosh')) return null;

	const a = getArg(node.left);
	const b = getArg(node.right);

	// cosh(a) + cosh(b) = 2cosh((a+b)/2)cosh((a-b)/2)
	const halfSum = divide(add(a, b), number('2'), 'fraction');
	const halfDiff = divide(subtract(a, b), number('2'), 'fraction');

	return multiply(number('2'), multiply(cosh(halfSum), cosh(halfDiff), 'implicit'), 'implicit');
}

/**
 * cosh(a) - cosh(b) -> 2sinh((a+b)/2)sinh((a-b)/2)
 */
function transformCoshMinusCosh(node: MathNode): MathNode | null {
	if (!isSubtraction(node)) return null;
	if (!isHyperbolicFunc(node.left, 'cosh') || !isHyperbolicFunc(node.right, 'cosh')) return null;

	const a = getArg(node.left);
	const b = getArg(node.right);

	// cosh(a) - cosh(b) = 2sinh((a+b)/2)sinh((a-b)/2)
	const halfSum = divide(add(a, b), number('2'), 'fraction');
	const halfDiff = divide(subtract(a, b), number('2'), 'fraction');

	return multiply(number('2'), multiply(sinh(halfSum), sinh(halfDiff), 'implicit'), 'implicit');
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
 * sinh(x/2) -> ±√((cosh(x) - 1)/2)
 * Note: Sign depends on quadrant; we use signed form based on sinh sign
 */
function transformSinhHalfAngle(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'sinh') return null;
	if (node.args.length !== 1) return null;

	const x = isHalfOf(node.args[0]);
	if (!x) return null;

	// sinh(x/2) = sign(x) * √((cosh(x) - 1)/2)
	// We return positive root; actual sign depends on x
	return sqrt(divide(subtract(cosh(x), number('1')), number('2'), 'fraction'));
}

/**
 * cosh(x/2) -> √((cosh(x) + 1)/2)
 * Note: cosh is always positive
 */
function transformCoshHalfAngle(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'cosh') return null;
	if (node.args.length !== 1) return null;

	const x = isHalfOf(node.args[0]);
	if (!x) return null;

	// cosh(x/2) = √((cosh(x) + 1)/2)
	return sqrt(divide(add(cosh(x), number('1')), number('2'), 'fraction'));
}

/**
 * tanh(x/2) -> sinh(x) / (1 + cosh(x))
 * Alternative: (cosh(x) - 1) / sinh(x)
 */
function transformTanhHalfAngle(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'tanh') return null;
	if (node.args.length !== 1) return null;

	const x = isHalfOf(node.args[0]);
	if (!x) return null;

	// tanh(x/2) = sinh(x) / (1 + cosh(x))
	return divide(sinh(x), add(number('1'), cosh(x)), 'fraction');
}

// =============================================================================
// Higher Power Formulas
// =============================================================================

/**
 * sinh³(x) -> (sinh(3x) - 3sinh(x)) / 4
 */
function transformSinhCubed(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'sinh') return null;
	if (!hasPowerOf3(node)) return null;

	const x = getArg(node);

	// sinh³(x) = (sinh(3x) - 3sinh(x)) / 4
	const threeX = tripleArg(x);
	return divide(
		subtract(sinh(threeX), multiply(number('3'), sinh(x), 'implicit')),
		number('4'),
		'fraction'
	);
}

/**
 * cosh³(x) -> (cosh(3x) + 3cosh(x)) / 4
 */
function transformCoshCubed(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'cosh') return null;
	if (!hasPowerOf3(node)) return null;

	const x = getArg(node);

	// cosh³(x) = (cosh(3x) + 3cosh(x)) / 4
	const threeX = tripleArg(x);
	return divide(
		add(cosh(threeX), multiply(number('3'), cosh(x), 'implicit')),
		number('4'),
		'fraction'
	);
}

/**
 * sinh⁴(x) -> (3 - 4cosh(2x) + cosh(4x)) / 8
 */
function transformSinhFourth(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'sinh') return null;
	if (!hasPowerOf4(node)) return null;

	const x = getArg(node);

	// sinh⁴(x) = (3 - 4cosh(2x) + cosh(4x)) / 8
	const twoX = doubleArg(x);
	const fourX = quadrupleArg(x);
	return divide(
		add(subtract(number('3'), multiply(number('4'), cosh(twoX), 'implicit')), cosh(fourX)),
		number('8'),
		'fraction'
	);
}

/**
 * cosh⁴(x) -> (3 + 4cosh(2x) + cosh(4x)) / 8
 */
function transformCoshFourth(node: MathNode): MathNode | null {
	if (!isFunction(node) || node.name !== 'cosh') return null;
	if (!hasPowerOf4(node)) return null;

	const x = getArg(node);

	// cosh⁴(x) = (3 + 4cosh(2x) + cosh(4x)) / 8
	const twoX = doubleArg(x);
	const fourX = quadrupleArg(x);
	return divide(
		add(add(number('3'), multiply(number('4'), cosh(twoX), 'implicit')), cosh(fourX)),
		number('8'),
		'fraction'
	);
}

// =============================================================================
// Rule Collections
// =============================================================================

const DOUBLE_ANGLE_TRANSFORMS: HyperbolicRule[] = [
	{ name: 'double-angle-sinh', transform: transformDoubleAngleSinh },
	{ name: 'sinh-cosh-product', transform: transformSinhCoshProduct }
];

const POWER_REDUCTION_TRANSFORMS: HyperbolicRule[] = [
	{ name: 'sinh-squared', transform: transformSinhSquared },
	{ name: 'cosh-squared', transform: transformCoshSquared }
];

const PYTHAGOREAN_TRANSFORMS: HyperbolicRule[] = [
	{ name: 'hyperbolic-pythagorean', transform: transformHyperbolicPythagorean },
	{ name: 'one-plus-sinh-squared', transform: transformOnePlusSinhSquared },
	{ name: 'cosh-squared-minus-one', transform: transformCoshSquaredMinusOne },
	{ name: 'one-minus-tanh-squared', transform: transformOneMinusTanhSquared },
	{ name: 'sech-tanh-pythagorean', transform: transformSechTanhPythagorean },
	{ name: 'coth-squared-minus-one', transform: transformCothSquaredMinusOne },
	{ name: 'coth-csch-pythagorean', transform: transformCothCschPythagorean },
	{ name: 'one-plus-csch-squared', transform: transformOnePlusCschSquared }
];

const QUOTIENT_TRANSFORMS: HyperbolicRule[] = [
	{ name: 'sinh-over-cosh', transform: transformSinhOverCosh },
	{ name: 'cosh-over-sinh', transform: transformCoshOverSinh },
	{ name: 'one-over-cosh', transform: transformOneOverCosh },
	{ name: 'one-over-sinh', transform: transformOneOverSinh }
];

const LINEARIZATION_TRANSFORMS: HyperbolicRule[] = [
	{ name: 'cosh-cosh-product', transform: transformCoshCoshProduct },
	{ name: 'sinh-sinh-product', transform: transformSinhSinhProduct },
	{ name: 'sinh-cosh-different', transform: transformSinhCoshProductDifferent }
];

const ADDITION_TRANSFORMS: HyperbolicRule[] = [
	{ name: 'cosh-sum', transform: transformCoshSum },
	{ name: 'cosh-difference', transform: transformCoshDifference },
	{ name: 'sinh-sum', transform: transformSinhSum },
	{ name: 'sinh-difference', transform: transformSinhDifference },
	{ name: 'tanh-sum', transform: transformTanhSum },
	{ name: 'tanh-difference', transform: transformTanhDifference }
];

const DOUBLE_ANGLE_EXPANSION_TRANSFORMS: HyperbolicRule[] = [
	{ name: 'expand-double-sinh', transform: transformExpandDoubleSinh },
	{ name: 'expand-double-cosh', transform: transformExpandDoubleCosh },
	{ name: 'expand-double-tanh', transform: transformExpandDoubleTanh }
];

const NEGATIVE_ARGUMENT_TRANSFORMS: HyperbolicRule[] = [
	{ name: 'sinh-negative', transform: transformSinhNegative },
	{ name: 'cosh-negative', transform: transformCoshNegative },
	{ name: 'tanh-negative', transform: transformTanhNegative }
];

const FACTORIZATION_TRANSFORMS: HyperbolicRule[] = [
	{ name: 'sinh-plus-sinh', transform: transformSinhPlusSinh },
	{ name: 'sinh-minus-sinh', transform: transformSinhMinusSinh },
	{ name: 'cosh-plus-cosh', transform: transformCoshPlusCosh },
	{ name: 'cosh-minus-cosh', transform: transformCoshMinusCosh }
];

const HALF_ANGLE_TRANSFORMS: HyperbolicRule[] = [
	{ name: 'sinh-half-angle', transform: transformSinhHalfAngle },
	{ name: 'cosh-half-angle', transform: transformCoshHalfAngle },
	{ name: 'tanh-half-angle', transform: transformTanhHalfAngle }
];

const HIGHER_POWER_TRANSFORMS: HyperbolicRule[] = [
	{ name: 'sinh-cubed', transform: transformSinhCubed },
	{ name: 'cosh-cubed', transform: transformCoshCubed },
	{ name: 'sinh-fourth', transform: transformSinhFourth },
	{ name: 'cosh-fourth', transform: transformCoshFourth }
];

// Default transforms (excludes inverse pairs to avoid loops)
const ALL_TRANSFORMS: HyperbolicRule[] = [
	...DOUBLE_ANGLE_TRANSFORMS,
	...POWER_REDUCTION_TRANSFORMS,
	...PYTHAGOREAN_TRANSFORMS,
	...QUOTIENT_TRANSFORMS,
	...LINEARIZATION_TRANSFORMS,
	...NEGATIVE_ARGUMENT_TRANSFORMS
];

// =============================================================================
// Application Functions
// =============================================================================

/**
 * Apply transforms to a single node (not recursive)
 */
function applyTransformsToNode(
	node: MathNode,
	transforms: HyperbolicRule[]
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
	transforms: HyperbolicRule[]
): { result: MathNode; appliedRules: Set<string> } {
	const appliedRules = new Set<string>();

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
 * Apply all hyperbolic identity transforms to an expression.
 *
 * @param node - The expression to transform
 * @param transforms - The transforms to apply (defaults to all)
 * @returns Transformation result with applied rules
 */
export function applyHyperbolicIdentities(
	node: MathNode,
	transforms: HyperbolicRule[] = ALL_TRANSFORMS
): HyperbolicTransformResult {
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
 * - sinh(x) * cosh(x) -> sinh(2x) / 2
 * - sinh²(x) -> (cosh(2x) - 1) / 2
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function contractToDoubleAngleH(node: MathNode): HyperbolicTransformResult {
	return applyHyperbolicIdentities(node, [
		...DOUBLE_ANGLE_TRANSFORMS,
		...POWER_REDUCTION_TRANSFORMS
	]);
}

/**
 * Simplify using hyperbolic Pythagorean identities.
 *
 * Examples:
 * - cosh²(x) - sinh²(x) -> 1
 * - 1 + sinh²(x) -> cosh²(x)
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function simplifyHyperbolicPythagorean(node: MathNode): HyperbolicTransformResult {
	return applyHyperbolicIdentities(node, PYTHAGOREAN_TRANSFORMS);
}

/**
 * Convert ratios to tanh/coth.
 *
 * Examples:
 * - sinh(x) / cosh(x) -> tanh(x)
 * - cosh(x) / sinh(x) -> coth(x)
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function simplifyHyperbolicQuotients(node: MathNode): HyperbolicTransformResult {
	return applyHyperbolicIdentities(node, QUOTIENT_TRANSFORMS);
}

/**
 * Linearize products of hyperbolic functions (product-to-sum formulas).
 *
 * Examples:
 * - cosh(a) * cosh(b) -> (cosh(a+b) + cosh(a-b)) / 2
 * - sinh(a) * sinh(b) -> (cosh(a+b) - cosh(a-b)) / 2
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function linearizeH(node: MathNode): HyperbolicTransformResult {
	return applyHyperbolicIdentities(node, LINEARIZATION_TRANSFORMS);
}

/**
 * Expand argument sums and differences (addition formulas).
 *
 * Examples:
 * - cosh(a + b) -> cosh(a)cosh(b) + sinh(a)sinh(b)
 * - sinh(a + b) -> sinh(a)cosh(b) + cosh(a)sinh(b)
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function expandAdditionH(node: MathNode): HyperbolicTransformResult {
	return applyHyperbolicIdentities(node, ADDITION_TRANSFORMS);
}

/**
 * Expand double arguments to single argument expressions.
 *
 * Examples:
 * - sinh(2x) -> 2sinh(x)cosh(x)
 * - cosh(2x) -> cosh²(x) + sinh²(x)
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function expandDoubleAngleH(node: MathNode): HyperbolicTransformResult {
	return applyHyperbolicIdentities(node, DOUBLE_ANGLE_EXPANSION_TRANSFORMS);
}

/**
 * Simplify negative argument expressions.
 *
 * Examples:
 * - sinh(-x) -> -sinh(x)
 * - cosh(-x) -> cosh(x)
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function simplifyNegativeArgumentH(node: MathNode): HyperbolicTransformResult {
	return applyHyperbolicIdentities(node, NEGATIVE_ARGUMENT_TRANSFORMS);
}

/**
 * Factorize sums/differences of hyperbolic functions (sum-to-product formulas).
 *
 * Examples:
 * - sinh(a) + sinh(b) -> 2sinh((a+b)/2)cosh((a-b)/2)
 * - cosh(a) - cosh(b) -> 2sinh((a+b)/2)sinh((a-b)/2)
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function factorizeH(node: MathNode): HyperbolicTransformResult {
	return applyHyperbolicIdentities(node, FACTORIZATION_TRANSFORMS);
}

/**
 * Expand half-argument expressions.
 *
 * Examples:
 * - sinh(x/2) -> √((cosh(x) - 1)/2)
 * - cosh(x/2) -> √((cosh(x) + 1)/2)
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function expandHalfAngleH(node: MathNode): HyperbolicTransformResult {
	return applyHyperbolicIdentities(node, HALF_ANGLE_TRANSFORMS);
}

/**
 * Reduce higher powers of hyperbolic functions.
 *
 * Examples:
 * - sinh³(x) -> (sinh(3x) - 3sinh(x)) / 4
 * - cosh³(x) -> (cosh(3x) + 3cosh(x)) / 4
 *
 * @param node - The expression to transform
 * @returns Transformation result
 */
export function reduceHigherPowersH(node: MathNode): HyperbolicTransformResult {
	return applyHyperbolicIdentities(node, HIGHER_POWER_TRANSFORMS);
}

// =============================================================================
// Exports for individual transforms (for testing)
// =============================================================================

// Double angle
export const TRANSFORM_SINH_COSH_PRODUCT = transformSinhCoshProduct;
export const TRANSFORM_DOUBLE_ANGLE_SINH = transformDoubleAngleSinh;

// Power reduction
export const TRANSFORM_SINH_SQUARED = transformSinhSquared;
export const TRANSFORM_COSH_SQUARED = transformCoshSquared;

// Pythagorean
export const TRANSFORM_HYPERBOLIC_PYTHAGOREAN = transformHyperbolicPythagorean;
export const TRANSFORM_ONE_PLUS_SINH_SQUARED = transformOnePlusSinhSquared;
export const TRANSFORM_COSH_SQUARED_MINUS_ONE = transformCoshSquaredMinusOne;

// Quotients
export const TRANSFORM_SINH_OVER_COSH = transformSinhOverCosh;
export const TRANSFORM_COSH_OVER_SINH = transformCoshOverSinh;
export const TRANSFORM_ONE_OVER_COSH = transformOneOverCosh;
export const TRANSFORM_ONE_OVER_SINH = transformOneOverSinh;

// Linearization
export const TRANSFORM_COSH_COSH_PRODUCT = transformCoshCoshProduct;
export const TRANSFORM_SINH_SINH_PRODUCT = transformSinhSinhProduct;
export const TRANSFORM_SINH_COSH_DIFFERENT = transformSinhCoshProductDifferent;

// Addition formulas
export const TRANSFORM_COSH_SUM = transformCoshSum;
export const TRANSFORM_COSH_DIFFERENCE = transformCoshDifference;
export const TRANSFORM_SINH_SUM = transformSinhSum;
export const TRANSFORM_SINH_DIFFERENCE = transformSinhDifference;
export const TRANSFORM_TANH_SUM = transformTanhSum;
export const TRANSFORM_TANH_DIFFERENCE = transformTanhDifference;

// Double angle expansion
export const TRANSFORM_EXPAND_DOUBLE_SINH = transformExpandDoubleSinh;
export const TRANSFORM_EXPAND_DOUBLE_COSH = transformExpandDoubleCosh;
export const TRANSFORM_EXPAND_DOUBLE_TANH = transformExpandDoubleTanh;

// Negative argument
export const TRANSFORM_SINH_NEGATIVE = transformSinhNegative;
export const TRANSFORM_COSH_NEGATIVE = transformCoshNegative;
export const TRANSFORM_TANH_NEGATIVE = transformTanhNegative;

// Factorization
export const TRANSFORM_SINH_PLUS_SINH = transformSinhPlusSinh;
export const TRANSFORM_SINH_MINUS_SINH = transformSinhMinusSinh;
export const TRANSFORM_COSH_PLUS_COSH = transformCoshPlusCosh;
export const TRANSFORM_COSH_MINUS_COSH = transformCoshMinusCosh;

// Half angle
export const TRANSFORM_SINH_HALF_ANGLE = transformSinhHalfAngle;
export const TRANSFORM_COSH_HALF_ANGLE = transformCoshHalfAngle;
export const TRANSFORM_TANH_HALF_ANGLE = transformTanhHalfAngle;

// Tanh/Coth Pythagorean
export const TRANSFORM_ONE_MINUS_TANH_SQUARED = transformOneMinusTanhSquared;
export const TRANSFORM_SECH_TANH_PYTHAGOREAN = transformSechTanhPythagorean;
export const TRANSFORM_COTH_SQUARED_MINUS_ONE = transformCothSquaredMinusOne;
export const TRANSFORM_COTH_CSCH_PYTHAGOREAN = transformCothCschPythagorean;
export const TRANSFORM_ONE_PLUS_CSCH_SQUARED = transformOnePlusCschSquared;

// Higher powers
export const TRANSFORM_SINH_CUBED = transformSinhCubed;
export const TRANSFORM_COSH_CUBED = transformCoshCubed;
export const TRANSFORM_SINH_FOURTH = transformSinhFourth;
export const TRANSFORM_COSH_FOURTH = transformCoshFourth;
