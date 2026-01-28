/**
 * Hyperbolic Identities Module
 *
 * Provides transformation functions for hyperbolic identities.
 * Uses the pattern matching system (P.*, match()) for structural detection.
 *
 * @module mathAST/transform/hyperbolic-identities
 */

import type { MathNode } from '../types';
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
import { P } from '../pattern/builder';
import { match, nodesEqual } from '../pattern/match';
import {
	type TransformRule,
	type TransformResult,
	getBinding,
	applyIdentityTransforms
} from './identity-engine';

// =============================================================================
// Types
// =============================================================================

/** Result of applying hyperbolic identity transformations */
export type HyperbolicTransformResult = TransformResult;

// =============================================================================
// Helper Functions
// =============================================================================

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
// Pattern Definitions
// =============================================================================

// --- Pattern factory helpers ---
function patFuncSum(name: string) {
	return P.func(name, [P.add(P._('a'), P._('b'))]);
}
function patFuncDiff(name: string) {
	return P.func(name, [P.sub(P._('a'), P._('b'))]);
}
function patFuncDouble(name: string) {
	return P.func(name, [P.mul(P.num(2), P._('x'))]);
}
function patFuncHalf(name: string) {
	return P.func(name, [P.div(P._('x'), P.num(2))]);
}
function patFuncNeg(name: string) {
	return P.func(name, [P.neg(P._('x'))]);
}

// --- Group 1: Functions with power ---
const PAT_SINH_SQ = P.func('sinh', [P._('a')], { power: P.num(2) });
const PAT_COSH_SQ = P.func('cosh', [P._('a')], { power: P.num(2) });
const PAT_TANH_SQ = P.func('tanh', [P._('a')], { power: P.num(2) });
const PAT_COTH_SQ = P.func('coth', [P._('a')], { power: P.num(2) });
const PAT_SECH_SQ = P.func('sech', [P._('a')], { power: P.num(2) });
const PAT_CSCH_SQ = P.func('csch', [P._('a')], { power: P.num(2) });
const PAT_SINH_CUBED = P.func('sinh', [P._('a')], { power: P.num(3) });
const PAT_COSH_CUBED = P.func('cosh', [P._('a')], { power: P.num(3) });
const PAT_SINH_FOURTH = P.func('sinh', [P._('a')], { power: P.num(4) });
const PAT_COSH_FOURTH = P.func('cosh', [P._('a')], { power: P.num(4) });

// --- Group 2: Pythagorean identities ---
const PAT_COSH_SQ_MINUS_SINH_SQ = P.sub(PAT_COSH_SQ, PAT_SINH_SQ);
const PAT_1_PLUS_SINH_SQ = P.add(P.num(1), PAT_SINH_SQ);
const PAT_COSH_SQ_MINUS_1 = P.sub(PAT_COSH_SQ, P.num(1));
const PAT_1_MINUS_TANH_SQ = P.sub(P.num(1), PAT_TANH_SQ);
const PAT_SECH_SQ_PLUS_TANH_SQ = P.add(PAT_SECH_SQ, PAT_TANH_SQ);
const PAT_COTH_SQ_MINUS_1 = P.sub(PAT_COTH_SQ, P.num(1));
const PAT_COTH_SQ_MINUS_CSCH_SQ = P.sub(PAT_COTH_SQ, PAT_CSCH_SQ);
const PAT_1_PLUS_CSCH_SQ = P.add(P.num(1), PAT_CSCH_SQ);

// --- Group 3: Quotient identities ---
const PAT_SINH_OVER_COSH = P.div(P.func('sinh', [P._('a')]), P.func('cosh', [P._('a')]));
const PAT_COSH_OVER_SINH = P.div(P.func('cosh', [P._('a')]), P.func('sinh', [P._('a')]));
const PAT_1_OVER_COSH = P.div(P.num(1), P.func('cosh', [P._('a')]));
const PAT_1_OVER_SINH = P.div(P.num(1), P.func('sinh', [P._('a')]));

// --- Group 4: Product patterns ---
const PAT_SINH_COSH_SAME = P.mul(P.func('sinh', [P._('a')]), P.func('cosh', [P._('a')]));
const PAT_2_SINH_COSH = P.prod(P.num(2), P.func('sinh', [P._('a')]), P.func('cosh', [P._('a')]));
const PAT_COSH_COSH = P.mul(P.func('cosh', [P._('a')]), P.func('cosh', [P._('b')]));
const PAT_SINH_SINH = P.mul(P.func('sinh', [P._('a')]), P.func('sinh', [P._('b')]));
const PAT_SINH_COSH_DIFF = P.mul(P.func('sinh', [P._('a')]), P.func('cosh', [P._('b')]));

// --- Group 5: Sum-to-product (factorization) ---
const PAT_SINH_PLUS_SINH = P.add(P.func('sinh', [P._('a')]), P.func('sinh', [P._('b')]));
const PAT_SINH_MINUS_SINH = P.sub(P.func('sinh', [P._('a')]), P.func('sinh', [P._('b')]));
const PAT_COSH_PLUS_COSH = P.add(P.func('cosh', [P._('a')]), P.func('cosh', [P._('b')]));
const PAT_COSH_MINUS_COSH = P.sub(P.func('cosh', [P._('a')]), P.func('cosh', [P._('b')]));

// --- Group 6: Addition/subtraction formulas ---
const PAT_COSH_SUM = patFuncSum('cosh');
const PAT_COSH_DIFF = patFuncDiff('cosh');
const PAT_SINH_SUM = patFuncSum('sinh');
const PAT_SINH_DIFF = patFuncDiff('sinh');
const PAT_TANH_SUM = patFuncSum('tanh');
const PAT_TANH_DIFF = patFuncDiff('tanh');

// Double angle expansion: f(2x)
const PAT_SINH_DOUBLE = patFuncDouble('sinh');
const PAT_COSH_DOUBLE = patFuncDouble('cosh');
const PAT_TANH_DOUBLE = patFuncDouble('tanh');

// Half angle: f(x/2)
const PAT_SINH_HALF = patFuncHalf('sinh');
const PAT_COSH_HALF = patFuncHalf('cosh');
const PAT_TANH_HALF = patFuncHalf('tanh');

// Negative angle: f(-x)
const PAT_SINH_NEG = patFuncNeg('sinh');
const PAT_COSH_NEG = patFuncNeg('cosh');
const PAT_TANH_NEG = patFuncNeg('tanh');

// =============================================================================
// Transform Functions - Products and Double Angle
// =============================================================================

/**
 * sinh(a) * cosh(a) -> sinh(2a) / 2
 * Also handles cosh(a) * sinh(a) (commutative matching)
 */
function transformSinhCoshProduct(node: MathNode): MathNode | null {
	const result = match(PAT_SINH_COSH_SAME, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	if (!a) return null;
	return halveExpr(sinh(doubleArg(a)));
}

/**
 * 2 * sinh(a) * cosh(a) -> sinh(2a)
 * Handles various orderings via n-ary product matching
 */
function transformDoubleAngleSinh(node: MathNode): MathNode | null {
	const result = match(PAT_2_SINH_COSH, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	if (!a) return null;
	return sinh(doubleArg(a));
}

// =============================================================================
// Power Reduction
// =============================================================================

/**
 * sinh²(a) -> (cosh(2a) - 1) / 2
 */
function transformSinhSquared(node: MathNode): MathNode | null {
	const result = match(PAT_SINH_SQ, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	if (!a) return null;
	return halveExpr(subtract(cosh(doubleArg(a)), number('1')));
}

/**
 * cosh²(a) -> (cosh(2a) + 1) / 2
 */
function transformCoshSquared(node: MathNode): MathNode | null {
	const result = match(PAT_COSH_SQ, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	if (!a) return null;
	return halveExpr(add(cosh(doubleArg(a)), number('1')));
}

// =============================================================================
// Hyperbolic Pythagorean Identities
// =============================================================================

/**
 * cosh²(a) - sinh²(a) -> 1
 * Same wildcard 'a' ensures same argument
 */
function transformHyperbolicPythagorean(node: MathNode): MathNode | null {
	const result = match(PAT_COSH_SQ_MINUS_SINH_SQ, node);
	if (!result.success) return null;
	return number('1');
}

/**
 * 1 + sinh²(a) -> cosh²(a)
 * Also handles sinh²(a) + 1 (commutative matching)
 */
function transformOnePlusSinhSquared(node: MathNode): MathNode | null {
	const result = match(PAT_1_PLUS_SINH_SQ, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	if (!a) return null;
	return superscript(cosh(a), number('2'));
}

/**
 * cosh²(a) - 1 -> sinh²(a)
 */
function transformCoshSquaredMinusOne(node: MathNode): MathNode | null {
	const result = match(PAT_COSH_SQ_MINUS_1, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	if (!a) return null;
	return superscript(sinh(a), number('2'));
}

/**
 * 1 - tanh²(a) -> sech²(a)
 */
function transformOneMinusTanhSquared(node: MathNode): MathNode | null {
	const result = match(PAT_1_MINUS_TANH_SQ, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	if (!a) return null;
	return superscript(sech(a), number('2'));
}

/**
 * sech²(a) + tanh²(a) -> 1
 * Also handles tanh²(a) + sech²(a) (commutative matching)
 * Same wildcard 'a' ensures same argument
 */
function transformSechTanhPythagorean(node: MathNode): MathNode | null {
	const result = match(PAT_SECH_SQ_PLUS_TANH_SQ, node);
	if (!result.success) return null;
	return number('1');
}

/**
 * coth²(a) - 1 -> csch²(a)
 */
function transformCothSquaredMinusOne(node: MathNode): MathNode | null {
	const result = match(PAT_COTH_SQ_MINUS_1, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	if (!a) return null;
	return superscript(csch(a), number('2'));
}

/**
 * coth²(a) - csch²(a) -> 1
 * Same wildcard 'a' ensures same argument
 */
function transformCothCschPythagorean(node: MathNode): MathNode | null {
	const result = match(PAT_COTH_SQ_MINUS_CSCH_SQ, node);
	if (!result.success) return null;
	return number('1');
}

/**
 * 1 + csch²(a) -> coth²(a)
 * Also handles csch²(a) + 1 (commutative matching)
 */
function transformOnePlusCschSquared(node: MathNode): MathNode | null {
	const result = match(PAT_1_PLUS_CSCH_SQ, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	if (!a) return null;
	return superscript(coth(a), number('2'));
}

// =============================================================================
// Quotient Identities
// =============================================================================

/**
 * sinh(a) / cosh(a) -> tanh(a)
 * Same wildcard 'a' ensures same argument
 */
function transformSinhOverCosh(node: MathNode): MathNode | null {
	const result = match(PAT_SINH_OVER_COSH, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	if (!a) return null;
	return tanh(a);
}

/**
 * cosh(a) / sinh(a) -> coth(a)
 * Same wildcard 'a' ensures same argument
 */
function transformCoshOverSinh(node: MathNode): MathNode | null {
	const result = match(PAT_COSH_OVER_SINH, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	if (!a) return null;
	return coth(a);
}

/**
 * 1 / cosh(x) -> sech(x)
 */
function transformOneOverCosh(node: MathNode): MathNode | null {
	const result = match(PAT_1_OVER_COSH, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	if (!a) return null;
	return sech(a);
}

/**
 * 1 / sinh(x) -> csch(x)
 */
function transformOneOverSinh(node: MathNode): MathNode | null {
	const result = match(PAT_1_OVER_SINH, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	if (!a) return null;
	return csch(a);
}

// =============================================================================
// Linearization Formulas (Product to Sum)
// =============================================================================

/**
 * cosh(a) * cosh(b) -> (cosh(a+b) + cosh(a-b)) / 2
 */
function transformCoshCoshProduct(node: MathNode): MathNode | null {
	const result = match(PAT_COSH_COSH, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;

	// Skip if same argument (handled by cosh-squared)
	if (nodesEqual(a, b)) return null;

	// cosh(a)cosh(b) = (cosh(a+b) + cosh(a-b)) / 2
	return halveExpr(add(cosh(add(a, b)), cosh(subtract(a, b))));
}

/**
 * sinh(a) * sinh(b) -> (cosh(a+b) - cosh(a-b)) / 2
 */
function transformSinhSinhProduct(node: MathNode): MathNode | null {
	const result = match(PAT_SINH_SINH, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;

	// Skip if same argument (handled by sinh-squared)
	if (nodesEqual(a, b)) return null;

	// sinh(a)sinh(b) = (cosh(a+b) - cosh(a-b)) / 2
	return halveExpr(subtract(cosh(add(a, b)), cosh(subtract(a, b))));
}

/**
 * sinh(a) * cosh(b) -> (sinh(a+b) + sinh(a-b)) / 2
 * cosh(a) * sinh(b) -> handled by commutative matching (a gets sinh arg, b gets cosh arg)
 *
 * Note: When a = b, this is handled by transformSinhCoshProduct instead
 */
function transformSinhCoshProductDifferent(node: MathNode): MathNode | null {
	const result = match(PAT_SINH_COSH_DIFF, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;

	// Skip if same argument (handled by sinh-cosh-product)
	if (nodesEqual(a, b)) return null;

	// sinh(a)cosh(b) = (sinh(a+b) + sinh(a-b)) / 2
	return halveExpr(add(sinh(add(a, b)), sinh(subtract(a, b))));
}

// =============================================================================
// Addition Formulas (Angle Sum/Difference Expansion)
// =============================================================================

/**
 * cosh(a + b) -> cosh(a)cosh(b) + sinh(a)sinh(b)
 */
function transformCoshSum(node: MathNode): MathNode | null {
	const result = match(PAT_COSH_SUM, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;
	return add(multiply(cosh(a), cosh(b), 'implicit'), multiply(sinh(a), sinh(b), 'implicit'));
}

/**
 * cosh(a - b) -> cosh(a)cosh(b) - sinh(a)sinh(b)
 */
function transformCoshDifference(node: MathNode): MathNode | null {
	const result = match(PAT_COSH_DIFF, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;
	return subtract(multiply(cosh(a), cosh(b), 'implicit'), multiply(sinh(a), sinh(b), 'implicit'));
}

/**
 * sinh(a + b) -> sinh(a)cosh(b) + cosh(a)sinh(b)
 */
function transformSinhSum(node: MathNode): MathNode | null {
	const result = match(PAT_SINH_SUM, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;
	return add(multiply(sinh(a), cosh(b), 'implicit'), multiply(cosh(a), sinh(b), 'implicit'));
}

/**
 * sinh(a - b) -> sinh(a)cosh(b) - cosh(a)sinh(b)
 */
function transformSinhDifference(node: MathNode): MathNode | null {
	const result = match(PAT_SINH_DIFF, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;
	return subtract(multiply(sinh(a), cosh(b), 'implicit'), multiply(cosh(a), sinh(b), 'implicit'));
}

/**
 * tanh(a + b) -> (tanh(a) + tanh(b)) / (1 + tanh(a)tanh(b))
 */
function transformTanhSum(node: MathNode): MathNode | null {
	const result = match(PAT_TANH_SUM, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;
	const tanhA = tanh(a);
	const tanhB = tanh(b);
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
	const result = match(PAT_TANH_DIFF, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;
	const tanhA = tanh(a);
	const tanhB = tanh(b);
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
 * sinh(2x) -> 2sinh(x)cosh(x)
 */
function transformExpandDoubleSinh(node: MathNode): MathNode | null {
	const result = match(PAT_SINH_DOUBLE, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
	return multiply(number('2'), multiply(sinh(x), cosh(x), 'implicit'), 'implicit');
}

/**
 * cosh(2x) -> cosh²(x) + sinh²(x)
 */
function transformExpandDoubleCosh(node: MathNode): MathNode | null {
	const result = match(PAT_COSH_DOUBLE, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
	return add(superscript(cosh(x), number('2')), superscript(sinh(x), number('2')));
}

/**
 * tanh(2x) -> 2tanh(x) / (1 + tanh²(x))
 */
function transformExpandDoubleTanh(node: MathNode): MathNode | null {
	const result = match(PAT_TANH_DOUBLE, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
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
	const result = match(PAT_SINH_NEG, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
	return opposite(sinh(x));
}

/**
 * cosh(-x) -> cosh(x)
 */
function transformCoshNegative(node: MathNode): MathNode | null {
	const result = match(PAT_COSH_NEG, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
	return cosh(x);
}

/**
 * tanh(-x) -> -tanh(x)
 */
function transformTanhNegative(node: MathNode): MathNode | null {
	const result = match(PAT_TANH_NEG, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
	return opposite(tanh(x));
}

// =============================================================================
// Sum-to-Product (Factorization) Formulas
// =============================================================================

/**
 * sinh(a) + sinh(b) -> 2sinh((a+b)/2)cosh((a-b)/2)
 */
function transformSinhPlusSinh(node: MathNode): MathNode | null {
	const result = match(PAT_SINH_PLUS_SINH, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;

	const halfSum = divide(add(a, b), number('2'), 'fraction');
	const halfDiff = divide(subtract(a, b), number('2'), 'fraction');
	return multiply(number('2'), multiply(sinh(halfSum), cosh(halfDiff), 'implicit'), 'implicit');
}

/**
 * sinh(a) - sinh(b) -> 2cosh((a+b)/2)sinh((a-b)/2)
 */
function transformSinhMinusSinh(node: MathNode): MathNode | null {
	const result = match(PAT_SINH_MINUS_SINH, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;

	const halfSum = divide(add(a, b), number('2'), 'fraction');
	const halfDiff = divide(subtract(a, b), number('2'), 'fraction');
	return multiply(number('2'), multiply(cosh(halfSum), sinh(halfDiff), 'implicit'), 'implicit');
}

/**
 * cosh(a) + cosh(b) -> 2cosh((a+b)/2)cosh((a-b)/2)
 */
function transformCoshPlusCosh(node: MathNode): MathNode | null {
	const result = match(PAT_COSH_PLUS_COSH, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;

	const halfSum = divide(add(a, b), number('2'), 'fraction');
	const halfDiff = divide(subtract(a, b), number('2'), 'fraction');
	return multiply(number('2'), multiply(cosh(halfSum), cosh(halfDiff), 'implicit'), 'implicit');
}

/**
 * cosh(a) - cosh(b) -> 2sinh((a+b)/2)sinh((a-b)/2)
 */
function transformCoshMinusCosh(node: MathNode): MathNode | null {
	const result = match(PAT_COSH_MINUS_COSH, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;

	const halfSum = divide(add(a, b), number('2'), 'fraction');
	const halfDiff = divide(subtract(a, b), number('2'), 'fraction');
	return multiply(number('2'), multiply(sinh(halfSum), sinh(halfDiff), 'implicit'), 'implicit');
}

// =============================================================================
// Half-Angle Formulas
// =============================================================================

/**
 * sinh(x/2) -> √((cosh(x) - 1)/2)
 */
function transformSinhHalfAngle(node: MathNode): MathNode | null {
	const result = match(PAT_SINH_HALF, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
	return sqrt(divide(subtract(cosh(x), number('1')), number('2'), 'fraction'));
}

/**
 * cosh(x/2) -> √((cosh(x) + 1)/2)
 */
function transformCoshHalfAngle(node: MathNode): MathNode | null {
	const result = match(PAT_COSH_HALF, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
	return sqrt(divide(add(cosh(x), number('1')), number('2'), 'fraction'));
}

/**
 * tanh(x/2) -> sinh(x) / (1 + cosh(x))
 */
function transformTanhHalfAngle(node: MathNode): MathNode | null {
	const result = match(PAT_TANH_HALF, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
	return divide(sinh(x), add(number('1'), cosh(x)), 'fraction');
}

// =============================================================================
// Higher Power Formulas
// =============================================================================

/**
 * sinh³(x) -> (sinh(3x) - 3sinh(x)) / 4
 */
function transformSinhCubed(node: MathNode): MathNode | null {
	const result = match(PAT_SINH_CUBED, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'a');
	if (!x) return null;

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
	const result = match(PAT_COSH_CUBED, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'a');
	if (!x) return null;

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
	const result = match(PAT_SINH_FOURTH, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'a');
	if (!x) return null;

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
	const result = match(PAT_COSH_FOURTH, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'a');
	if (!x) return null;

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

const DOUBLE_ANGLE_TRANSFORMS: TransformRule[] = [
	{ name: 'double-angle-sinh', transform: transformDoubleAngleSinh },
	{ name: 'sinh-cosh-product', transform: transformSinhCoshProduct }
];

const POWER_REDUCTION_TRANSFORMS: TransformRule[] = [
	{ name: 'sinh-squared', transform: transformSinhSquared },
	{ name: 'cosh-squared', transform: transformCoshSquared }
];

const PYTHAGOREAN_TRANSFORMS: TransformRule[] = [
	{ name: 'hyperbolic-pythagorean', transform: transformHyperbolicPythagorean },
	{ name: 'one-plus-sinh-squared', transform: transformOnePlusSinhSquared },
	{ name: 'cosh-squared-minus-one', transform: transformCoshSquaredMinusOne },
	{ name: 'one-minus-tanh-squared', transform: transformOneMinusTanhSquared },
	{ name: 'sech-tanh-pythagorean', transform: transformSechTanhPythagorean },
	{ name: 'coth-squared-minus-one', transform: transformCothSquaredMinusOne },
	{ name: 'coth-csch-pythagorean', transform: transformCothCschPythagorean },
	{ name: 'one-plus-csch-squared', transform: transformOnePlusCschSquared }
];

const QUOTIENT_TRANSFORMS: TransformRule[] = [
	{ name: 'sinh-over-cosh', transform: transformSinhOverCosh },
	{ name: 'cosh-over-sinh', transform: transformCoshOverSinh },
	{ name: 'one-over-cosh', transform: transformOneOverCosh },
	{ name: 'one-over-sinh', transform: transformOneOverSinh }
];

const LINEARIZATION_TRANSFORMS: TransformRule[] = [
	{ name: 'cosh-cosh-product', transform: transformCoshCoshProduct },
	{ name: 'sinh-sinh-product', transform: transformSinhSinhProduct },
	{ name: 'sinh-cosh-different', transform: transformSinhCoshProductDifferent }
];

const ADDITION_TRANSFORMS: TransformRule[] = [
	{ name: 'cosh-sum', transform: transformCoshSum },
	{ name: 'cosh-difference', transform: transformCoshDifference },
	{ name: 'sinh-sum', transform: transformSinhSum },
	{ name: 'sinh-difference', transform: transformSinhDifference },
	{ name: 'tanh-sum', transform: transformTanhSum },
	{ name: 'tanh-difference', transform: transformTanhDifference }
];

const DOUBLE_ANGLE_EXPANSION_TRANSFORMS: TransformRule[] = [
	{ name: 'expand-double-sinh', transform: transformExpandDoubleSinh },
	{ name: 'expand-double-cosh', transform: transformExpandDoubleCosh },
	{ name: 'expand-double-tanh', transform: transformExpandDoubleTanh }
];

const NEGATIVE_ARGUMENT_TRANSFORMS: TransformRule[] = [
	{ name: 'sinh-negative', transform: transformSinhNegative },
	{ name: 'cosh-negative', transform: transformCoshNegative },
	{ name: 'tanh-negative', transform: transformTanhNegative }
];

const FACTORIZATION_TRANSFORMS: TransformRule[] = [
	{ name: 'sinh-plus-sinh', transform: transformSinhPlusSinh },
	{ name: 'sinh-minus-sinh', transform: transformSinhMinusSinh },
	{ name: 'cosh-plus-cosh', transform: transformCoshPlusCosh },
	{ name: 'cosh-minus-cosh', transform: transformCoshMinusCosh }
];

const HALF_ANGLE_TRANSFORMS: TransformRule[] = [
	{ name: 'sinh-half-angle', transform: transformSinhHalfAngle },
	{ name: 'cosh-half-angle', transform: transformCoshHalfAngle },
	{ name: 'tanh-half-angle', transform: transformTanhHalfAngle }
];

const HIGHER_POWER_TRANSFORMS: TransformRule[] = [
	{ name: 'sinh-cubed', transform: transformSinhCubed },
	{ name: 'cosh-cubed', transform: transformCoshCubed },
	{ name: 'sinh-fourth', transform: transformSinhFourth },
	{ name: 'cosh-fourth', transform: transformCoshFourth }
];

// Default transforms (excludes inverse pairs to avoid loops)
const ALL_TRANSFORMS: TransformRule[] = [
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
 * Apply all hyperbolic identity transforms to an expression.
 *
 * @param node - The expression to transform
 * @param transforms - The transforms to apply (defaults to all)
 * @returns Transformation result with applied rules
 */
export function applyHyperbolicIdentities(
	node: MathNode,
	transforms: TransformRule[] = ALL_TRANSFORMS
): HyperbolicTransformResult {
	return applyIdentityTransforms(node, transforms);
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
