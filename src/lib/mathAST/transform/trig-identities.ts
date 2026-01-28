/**
 * Trigonometric Identities Module
 *
 * Provides transformation functions for trigonometric identities.
 * Uses the pattern matching system (P.*, match()) for structural detection.
 *
 * @module mathAST/transform/trig-identities
 */

import type { MathNode } from '../types';
import type { GreekLetterNode } from '../types';
import { isPiConstant, isGreek } from '../guards';
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

/** Result of applying trig identity transformations */
export type TrigTransformResult = TransformResult;

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
// Pattern Definitions
// =============================================================================

// --- π helpers ---
const piConstraint = P.custom((node) => isPi(node), 'π');
const PI = P._('_pi', piConstraint);
const PI_OVER_2 = P.div(PI, P.num(2));

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
const PAT_SIN_SQ = P.func('sin', [P._('a')], { power: P.num(2) });
const PAT_COS_SQ = P.func('cos', [P._('a')], { power: P.num(2) });
const PAT_TAN_SQ = P.func('tan', [P._('a')], { power: P.num(2) });
const PAT_COT_SQ = P.func('cot', [P._('a')], { power: P.num(2) });
const PAT_SEC_SQ = P.func('sec', [P._('a')], { power: P.num(2) });
const PAT_CSC_SQ = P.func('csc', [P._('a')], { power: P.num(2) });
const PAT_SIN_CUBED = P.func('sin', [P._('a')], { power: P.num(3) });
const PAT_COS_CUBED = P.func('cos', [P._('a')], { power: P.num(3) });
const PAT_SIN_FOURTH = P.func('sin', [P._('a')], { power: P.num(4) });
const PAT_COS_FOURTH = P.func('cos', [P._('a')], { power: P.num(4) });

// --- Group 3: Pythagorean identities ---
const PAT_SIN_SQ_PLUS_COS_SQ = P.add(
	P.func('sin', [P._('a')], { power: P.num(2) }),
	P.func('cos', [P._('a')], { power: P.num(2) })
);
const PAT_1_MINUS_SIN_SQ = P.sub(P.num(1), PAT_SIN_SQ);
const PAT_1_MINUS_COS_SQ = P.sub(P.num(1), PAT_COS_SQ);
const PAT_TAN_SQ_PLUS_1 = P.add(PAT_TAN_SQ, P.num(1));
const PAT_SEC_SQ_MINUS_1 = P.sub(PAT_SEC_SQ, P.num(1));
const PAT_COT_SQ_PLUS_1 = P.add(PAT_COT_SQ, P.num(1));
const PAT_CSC_SQ_MINUS_1 = P.sub(PAT_CSC_SQ, P.num(1));

// --- Group 4: Quotient identities ---
const PAT_SIN_OVER_COS = P.div(P.func('sin', [P._('a')]), P.func('cos', [P._('a')]));
const PAT_COS_OVER_SIN = P.div(P.func('cos', [P._('a')]), P.func('sin', [P._('a')]));
const PAT_1_OVER_COS = P.div(P.num(1), P.func('cos', [P._('a')]));
const PAT_1_OVER_SIN = P.div(P.num(1), P.func('sin', [P._('a')]));

// --- Group 5: Product patterns ---
const PAT_SIN_COS_SAME = P.mul(P.func('sin', [P._('a')]), P.func('cos', [P._('a')]));
const PAT_2_SIN_COS = P.prod(P.num(2), P.func('sin', [P._('a')]), P.func('cos', [P._('a')]));
const PAT_COS_COS = P.mul(P.func('cos', [P._('a')]), P.func('cos', [P._('b')]));
const PAT_SIN_SIN = P.mul(P.func('sin', [P._('a')]), P.func('sin', [P._('b')]));
const PAT_SIN_COS_DIFF = P.mul(P.func('sin', [P._('a')]), P.func('cos', [P._('b')]));

// --- Group 6: Sum-to-product (factorization) ---
const PAT_SIN_PLUS_SIN = P.add(P.func('sin', [P._('a')]), P.func('sin', [P._('b')]));
const PAT_SIN_MINUS_SIN = P.sub(P.func('sin', [P._('a')]), P.func('sin', [P._('b')]));
const PAT_COS_PLUS_COS = P.add(P.func('cos', [P._('a')]), P.func('cos', [P._('b')]));
const PAT_COS_MINUS_COS = P.sub(P.func('cos', [P._('a')]), P.func('cos', [P._('b')]));

// --- Group 7: Patterns involving π ---
// Cofunction: f(π/2 - x)
const PAT_SIN_PI_OVER_2_MINUS = P.func('sin', [P.sub(PI_OVER_2, P._('x'))]);
const PAT_COS_PI_OVER_2_MINUS = P.func('cos', [P.sub(PI_OVER_2, P._('x'))]);
const PAT_TAN_PI_OVER_2_MINUS = P.func('tan', [P.sub(PI_OVER_2, P._('x'))]);

// Supplementary: f(π - x)
const PAT_SIN_PI_MINUS = P.func('sin', [P.sub(PI, P._('x'))]);
const PAT_COS_PI_MINUS = P.func('cos', [P.sub(PI, P._('x'))]);
const PAT_TAN_PI_MINUS = P.func('tan', [P.sub(PI, P._('x'))]);

// Shift π/2: f(x + π/2)
const PAT_SIN_PLUS_PI_OVER_2 = P.func('sin', [P.add(P._('x'), PI_OVER_2)]);
const PAT_COS_PLUS_PI_OVER_2 = P.func('cos', [P.add(P._('x'), PI_OVER_2)]);
const PAT_TAN_PLUS_PI_OVER_2 = P.func('tan', [P.add(P._('x'), PI_OVER_2)]);

// Periodic: f(x + 2π) and f(x + π)
const PAT_SIN_PLUS_2PI = P.func('sin', [P.add(P._('x'), P.mul(P.num(2), PI))]);
const PAT_COS_PLUS_2PI = P.func('cos', [P.add(P._('x'), P.mul(P.num(2), PI))]);
const PAT_SIN_PLUS_PI = P.func('sin', [P.add(P._('x'), PI)]);
const PAT_COS_PLUS_PI = P.func('cos', [P.add(P._('x'), PI)]);

// --- Group 2: Addition/subtraction formulas ---
const PAT_COS_SUM = patFuncSum('cos');
const PAT_COS_DIFF = patFuncDiff('cos');
const PAT_SIN_SUM = patFuncSum('sin');
const PAT_SIN_DIFF = patFuncDiff('sin');
const PAT_TAN_SUM = patFuncSum('tan');
const PAT_TAN_DIFF = patFuncDiff('tan');

// Double angle expansion: f(2x)
const PAT_SIN_DOUBLE = patFuncDouble('sin');
const PAT_COS_DOUBLE = patFuncDouble('cos');
const PAT_TAN_DOUBLE = patFuncDouble('tan');

// Half angle: f(x/2)
const PAT_SIN_HALF = patFuncHalf('sin');
const PAT_COS_HALF = patFuncHalf('cos');
const PAT_TAN_HALF = patFuncHalf('tan');

// Negative angle: f(-x)
const PAT_SIN_NEG = patFuncNeg('sin');
const PAT_COS_NEG = patFuncNeg('cos');
const PAT_TAN_NEG = patFuncNeg('tan');

// =============================================================================
// Transform Functions
// =============================================================================

/**
 * sin(a) * cos(a) -> sin(2a) / 2
 * Also handles cos(a) * sin(a) (commutative matching)
 */
function transformSinCosProduct(node: MathNode): MathNode | null {
	const result = match(PAT_SIN_COS_SAME, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	if (!a) return null;
	return halveExpr(sin(doubleArg(a)));
}

/**
 * 2 * sin(a) * cos(a) -> sin(2a)
 * Handles various orderings via n-ary product matching
 */
function transformDoubleAngleSin(node: MathNode): MathNode | null {
	const result = match(PAT_2_SIN_COS, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	if (!a) return null;
	return sin(doubleArg(a));
}

/**
 * sin²(a) -> (1 - cos(2a)) / 2
 */
function transformSinSquared(node: MathNode): MathNode | null {
	const result = match(PAT_SIN_SQ, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	if (!a) return null;
	return halveExpr(subtract(number('1'), cos(doubleArg(a))));
}

/**
 * cos²(a) -> (1 + cos(2a)) / 2
 */
function transformCosSquared(node: MathNode): MathNode | null {
	const result = match(PAT_COS_SQ, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	if (!a) return null;
	return halveExpr(add(number('1'), cos(doubleArg(a))));
}

/**
 * sin²(a) + cos²(a) -> 1
 * Also handles cos²(a) + sin²(a) (commutative matching)
 */
function transformPythagorean(node: MathNode): MathNode | null {
	const result = match(PAT_SIN_SQ_PLUS_COS_SQ, node);
	if (!result.success) return null;
	return number('1');
}

/**
 * 1 - sin²(a) -> cos²(a)
 */
function transformOneMinusSinSquared(node: MathNode): MathNode | null {
	const result = match(PAT_1_MINUS_SIN_SQ, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	if (!a) return null;
	return superscript(cos(a), number('2'));
}

/**
 * 1 - cos²(a) -> sin²(a)
 */
function transformOneMinusCosSquared(node: MathNode): MathNode | null {
	const result = match(PAT_1_MINUS_COS_SQ, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	if (!a) return null;
	return superscript(sin(a), number('2'));
}

/**
 * tan²(a) + 1 -> sec²(a)
 * Also handles 1 + tan²(a) (commutative matching)
 */
function transformTanSquaredPlusOne(node: MathNode): MathNode | null {
	const result = match(PAT_TAN_SQ_PLUS_1, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	if (!a) return null;
	return superscript(sec(a), number('2'));
}

/**
 * sec²(a) - 1 -> tan²(a)
 */
function transformSecSquaredMinusOne(node: MathNode): MathNode | null {
	const result = match(PAT_SEC_SQ_MINUS_1, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	if (!a) return null;
	return superscript(tan(a), number('2'));
}

/**
 * cot²(a) + 1 -> csc²(a)
 * Also handles 1 + cot²(a) (commutative matching)
 */
function transformCotSquaredPlusOne(node: MathNode): MathNode | null {
	const result = match(PAT_COT_SQ_PLUS_1, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	if (!a) return null;
	return superscript(csc(a), number('2'));
}

/**
 * csc²(a) - 1 -> cot²(a)
 */
function transformCscSquaredMinusOne(node: MathNode): MathNode | null {
	const result = match(PAT_CSC_SQ_MINUS_1, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	if (!a) return null;
	return superscript(cot(a), number('2'));
}

/**
 * sin(a) / cos(a) -> tan(a)
 */
function transformSinOverCos(node: MathNode): MathNode | null {
	const result = match(PAT_SIN_OVER_COS, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	if (!a) return null;
	return tan(a);
}

// =============================================================================
// Linearization Formulas (Product to Sum)
// =============================================================================

/**
 * cos(a) * cos(b) -> (cos(a-b) + cos(a+b)) / 2
 */
function transformCosCosProduct(node: MathNode): MathNode | null {
	const result = match(PAT_COS_COS, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;

	// Skip if same argument (handled by sin-cos-product via double angle)
	if (nodesEqual(a, b)) return null;

	// cos(a)cos(b) = (cos(a-b) + cos(a+b)) / 2
	return halveExpr(add(cos(subtract(a, b)), cos(add(a, b))));
}

/**
 * sin(a) * sin(b) -> (cos(a-b) - cos(a+b)) / 2
 */
function transformSinSinProduct(node: MathNode): MathNode | null {
	const result = match(PAT_SIN_SIN, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;

	// Skip if same argument (handled by power reduction)
	if (nodesEqual(a, b)) return null;

	// sin(a)sin(b) = (cos(a-b) - cos(a+b)) / 2
	return halveExpr(subtract(cos(subtract(a, b)), cos(add(a, b))));
}

/**
 * sin(a) * cos(b) -> (sin(a+b) + sin(a-b)) / 2
 * cos(a) * sin(b) -> handled by commutative matching (a gets sin arg, b gets cos arg)
 *
 * Note: When a = b, this is handled by transformSinCosProduct instead
 */
function transformSinCosProductDifferent(node: MathNode): MathNode | null {
	const result = match(PAT_SIN_COS_DIFF, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;

	// Skip if same argument (handled by sin-cos-product)
	if (nodesEqual(a, b)) return null;

	// sin(a)cos(b) = (sin(a+b) + sin(a-b)) / 2
	return halveExpr(add(sin(add(a, b)), sin(subtract(a, b))));
}

// =============================================================================
// Addition Formulas (Angle Sum/Difference Expansion)
// =============================================================================

/**
 * cos(a + b) -> cos(a)cos(b) - sin(a)sin(b)
 */
function transformCosSum(node: MathNode): MathNode | null {
	const result = match(PAT_COS_SUM, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;
	return subtract(multiply(cos(a), cos(b), 'implicit'), multiply(sin(a), sin(b), 'implicit'));
}

/**
 * cos(a - b) -> cos(a)cos(b) + sin(a)sin(b)
 */
function transformCosDifference(node: MathNode): MathNode | null {
	const result = match(PAT_COS_DIFF, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;
	return add(multiply(cos(a), cos(b), 'implicit'), multiply(sin(a), sin(b), 'implicit'));
}

/**
 * sin(a + b) -> sin(a)cos(b) + cos(a)sin(b)
 */
function transformSinSum(node: MathNode): MathNode | null {
	const result = match(PAT_SIN_SUM, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;
	return add(multiply(sin(a), cos(b), 'implicit'), multiply(cos(a), sin(b), 'implicit'));
}

/**
 * sin(a - b) -> sin(a)cos(b) - cos(a)sin(b)
 */
function transformSinDifference(node: MathNode): MathNode | null {
	const result = match(PAT_SIN_DIFF, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;
	return subtract(multiply(sin(a), cos(b), 'implicit'), multiply(cos(a), sin(b), 'implicit'));
}

// =============================================================================
// Double Angle Expansion
// =============================================================================

/**
 * sin(2x) -> 2sin(x)cos(x)
 */
function transformExpandDoubleSin(node: MathNode): MathNode | null {
	const result = match(PAT_SIN_DOUBLE, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
	return multiply(number('2'), multiply(sin(x), cos(x), 'implicit'), 'implicit');
}

/**
 * cos(2x) -> cos²(x) - sin²(x)
 */
function transformExpandDoubleCos(node: MathNode): MathNode | null {
	const result = match(PAT_COS_DOUBLE, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
	return subtract(superscript(cos(x), number('2')), superscript(sin(x), number('2')));
}

/**
 * tan(2x) -> 2tan(x) / (1 - tan²(x))
 */
function transformExpandDoubleTan(node: MathNode): MathNode | null {
	const result = match(PAT_TAN_DOUBLE, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
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
	const result = match(PAT_COS_OVER_SIN, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	if (!a) return null;
	return cot(a);
}

/**
 * 1 / cos(x) -> sec(x)
 */
function transformOneOverCos(node: MathNode): MathNode | null {
	const result = match(PAT_1_OVER_COS, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	if (!a) return null;
	return sec(a);
}

/**
 * 1 / sin(x) -> csc(x)
 */
function transformOneOverSin(node: MathNode): MathNode | null {
	const result = match(PAT_1_OVER_SIN, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	if (!a) return null;
	return csc(a);
}

// =============================================================================
// Tangent Addition Formulas
// =============================================================================

/**
 * tan(a + b) -> (tan(a) + tan(b)) / (1 - tan(a)tan(b))
 */
function transformTanSum(node: MathNode): MathNode | null {
	const result = match(PAT_TAN_SUM, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;
	const tanA = tan(a);
	const tanB = tan(b);
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
	const result = match(PAT_TAN_DIFF, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;
	const tanA = tan(a);
	const tanB = tan(b);
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
	const result = match(PAT_SIN_NEG, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
	return opposite(sin(x));
}

/**
 * cos(-x) -> cos(x)
 */
function transformCosNegative(node: MathNode): MathNode | null {
	const result = match(PAT_COS_NEG, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
	return cos(x);
}

/**
 * tan(-x) -> -tan(x)
 */
function transformTanNegative(node: MathNode): MathNode | null {
	const result = match(PAT_TAN_NEG, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
	return opposite(tan(x));
}

// =============================================================================
// Cofunction Identities
// =============================================================================

/**
 * sin(π/2 - x) -> cos(x)
 */
function transformSinCofunction(node: MathNode): MathNode | null {
	const result = match(PAT_SIN_PI_OVER_2_MINUS, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
	return cos(x);
}

/**
 * cos(π/2 - x) -> sin(x)
 */
function transformCosCofunction(node: MathNode): MathNode | null {
	const result = match(PAT_COS_PI_OVER_2_MINUS, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
	return sin(x);
}

/**
 * tan(π/2 - x) -> cot(x)
 */
function transformTanCofunction(node: MathNode): MathNode | null {
	const result = match(PAT_TAN_PI_OVER_2_MINUS, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
	return cot(x);
}

// =============================================================================
// Supplementary Angle Identities (π - x)
// =============================================================================

/**
 * sin(π - x) -> sin(x)
 */
function transformSinSupplementary(node: MathNode): MathNode | null {
	const result = match(PAT_SIN_PI_MINUS, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
	return sin(x);
}

/**
 * cos(π - x) -> -cos(x)
 */
function transformCosSupplementary(node: MathNode): MathNode | null {
	const result = match(PAT_COS_PI_MINUS, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
	return opposite(cos(x));
}

/**
 * tan(π - x) -> -tan(x)
 */
function transformTanSupplementary(node: MathNode): MathNode | null {
	const result = match(PAT_TAN_PI_MINUS, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
	return opposite(tan(x));
}

// =============================================================================
// Shifted by π/2 Identities (x + π/2)
// =============================================================================

/**
 * sin(x + π/2) -> cos(x)
 */
function transformSinPlusPiOver2(node: MathNode): MathNode | null {
	const result = match(PAT_SIN_PLUS_PI_OVER_2, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
	return cos(x);
}

/**
 * cos(x + π/2) -> -sin(x)
 */
function transformCosPlusPiOver2(node: MathNode): MathNode | null {
	const result = match(PAT_COS_PLUS_PI_OVER_2, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
	return opposite(sin(x));
}

/**
 * tan(x + π/2) -> -cot(x)
 */
function transformTanPlusPiOver2(node: MathNode): MathNode | null {
	const result = match(PAT_TAN_PLUS_PI_OVER_2, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
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
	const result = match(PAT_SIN_PLUS_SIN, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;

	const halfSum = divide(add(a, b), number('2'), 'fraction');
	const halfDiff = divide(subtract(a, b), number('2'), 'fraction');
	return multiply(number('2'), multiply(sin(halfSum), cos(halfDiff), 'implicit'), 'implicit');
}

/**
 * sin(a) - sin(b) -> 2cos((a+b)/2)sin((a-b)/2)
 */
function transformSinMinusSin(node: MathNode): MathNode | null {
	const result = match(PAT_SIN_MINUS_SIN, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;

	const halfSum = divide(add(a, b), number('2'), 'fraction');
	const halfDiff = divide(subtract(a, b), number('2'), 'fraction');
	return multiply(number('2'), multiply(cos(halfSum), sin(halfDiff), 'implicit'), 'implicit');
}

/**
 * cos(a) + cos(b) -> 2cos((a+b)/2)cos((a-b)/2)
 */
function transformCosPlusCos(node: MathNode): MathNode | null {
	const result = match(PAT_COS_PLUS_COS, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;

	const halfSum = divide(add(a, b), number('2'), 'fraction');
	const halfDiff = divide(subtract(a, b), number('2'), 'fraction');
	return multiply(number('2'), multiply(cos(halfSum), cos(halfDiff), 'implicit'), 'implicit');
}

/**
 * cos(a) - cos(b) -> -2sin((a+b)/2)sin((a-b)/2)
 */
function transformCosMinusCos(node: MathNode): MathNode | null {
	const result = match(PAT_COS_MINUS_COS, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;

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
 * sin(x + 2π) -> sin(x)
 */
function transformSinPeriod2Pi(node: MathNode): MathNode | null {
	const result = match(PAT_SIN_PLUS_2PI, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
	return sin(x);
}

/**
 * cos(x + 2π) -> cos(x)
 */
function transformCosPeriod2Pi(node: MathNode): MathNode | null {
	const result = match(PAT_COS_PLUS_2PI, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
	return cos(x);
}

/**
 * sin(x + π) -> -sin(x)
 */
function transformSinPlusPi(node: MathNode): MathNode | null {
	const result = match(PAT_SIN_PLUS_PI, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
	return opposite(sin(x));
}

/**
 * cos(x + π) -> -cos(x)
 */
function transformCosPlusPi(node: MathNode): MathNode | null {
	const result = match(PAT_COS_PLUS_PI, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
	return opposite(cos(x));
}

// =============================================================================
// Half-Angle Formulas
// =============================================================================

/**
 * sin(x/2) -> ±√((1 - cos(x))/2)
 * Note: We use positive root; sign depends on quadrant
 */
function transformSinHalfAngle(node: MathNode): MathNode | null {
	const result = match(PAT_SIN_HALF, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
	return sqrt(divide(subtract(number('1'), cos(x)), number('2'), 'fraction'));
}

/**
 * cos(x/2) -> ±√((1 + cos(x))/2)
 * Note: We use positive root; sign depends on quadrant
 */
function transformCosHalfAngle(node: MathNode): MathNode | null {
	const result = match(PAT_COS_HALF, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
	return sqrt(divide(add(number('1'), cos(x)), number('2'), 'fraction'));
}

/**
 * tan(x/2) -> sin(x) / (1 + cos(x))
 * Alternative: (1 - cos(x)) / sin(x)
 */
function transformTanHalfAngle(node: MathNode): MathNode | null {
	const result = match(PAT_TAN_HALF, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'x');
	if (!x) return null;
	return divide(sin(x), add(number('1'), cos(x)), 'fraction');
}

// =============================================================================
// Higher Power Formulas
// =============================================================================

/**
 * sin³(x) -> (3sin(x) - sin(3x)) / 4
 */
function transformSinCubed(node: MathNode): MathNode | null {
	const result = match(PAT_SIN_CUBED, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'a');
	if (!x) return null;

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
	const result = match(PAT_COS_CUBED, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'a');
	if (!x) return null;

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
	const result = match(PAT_SIN_FOURTH, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'a');
	if (!x) return null;

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
	const result = match(PAT_COS_FOURTH, node);
	if (!result.success) return null;
	const x = getBinding(result.bindings, 'a');
	if (!x) return null;

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

const DOUBLE_ANGLE_TRANSFORMS: TransformRule[] = [
	{ name: 'double-angle-sin', transform: transformDoubleAngleSin },
	{ name: 'sin-cos-product', transform: transformSinCosProduct }
];

const POWER_REDUCTION_TRANSFORMS: TransformRule[] = [
	{ name: 'sin-squared', transform: transformSinSquared },
	{ name: 'cos-squared', transform: transformCosSquared }
];

const PYTHAGOREAN_TRANSFORMS: TransformRule[] = [
	{ name: 'pythagorean', transform: transformPythagorean },
	{ name: 'one-minus-sin-squared', transform: transformOneMinusSinSquared },
	{ name: 'one-minus-cos-squared', transform: transformOneMinusCosSquared },
	{ name: 'tan-squared-plus-one', transform: transformTanSquaredPlusOne },
	{ name: 'sec-squared-minus-one', transform: transformSecSquaredMinusOne },
	{ name: 'cot-squared-plus-one', transform: transformCotSquaredPlusOne },
	{ name: 'csc-squared-minus-one', transform: transformCscSquaredMinusOne }
];

const QUOTIENT_TRANSFORMS: TransformRule[] = [
	{ name: 'sin-over-cos', transform: transformSinOverCos },
	{ name: 'cos-over-sin', transform: transformCosOverSin },
	{ name: 'one-over-cos', transform: transformOneOverCos },
	{ name: 'one-over-sin', transform: transformOneOverSin }
];

const LINEARIZATION_TRANSFORMS: TransformRule[] = [
	{ name: 'cos-cos-product', transform: transformCosCosProduct },
	{ name: 'sin-sin-product', transform: transformSinSinProduct },
	{ name: 'sin-cos-different', transform: transformSinCosProductDifferent }
];

const ADDITION_TRANSFORMS: TransformRule[] = [
	{ name: 'cos-sum', transform: transformCosSum },
	{ name: 'cos-difference', transform: transformCosDifference },
	{ name: 'sin-sum', transform: transformSinSum },
	{ name: 'sin-difference', transform: transformSinDifference },
	{ name: 'tan-sum', transform: transformTanSum },
	{ name: 'tan-difference', transform: transformTanDifference }
];

const DOUBLE_ANGLE_EXPANSION_TRANSFORMS: TransformRule[] = [
	{ name: 'expand-double-sin', transform: transformExpandDoubleSin },
	{ name: 'expand-double-cos', transform: transformExpandDoubleCos },
	{ name: 'expand-double-tan', transform: transformExpandDoubleTan }
];

const NEGATIVE_ANGLE_TRANSFORMS: TransformRule[] = [
	{ name: 'sin-negative', transform: transformSinNegative },
	{ name: 'cos-negative', transform: transformCosNegative },
	{ name: 'tan-negative', transform: transformTanNegative }
];

const COFUNCTION_TRANSFORMS: TransformRule[] = [
	{ name: 'sin-cofunction', transform: transformSinCofunction },
	{ name: 'cos-cofunction', transform: transformCosCofunction },
	{ name: 'tan-cofunction', transform: transformTanCofunction }
];

const SUPPLEMENTARY_TRANSFORMS: TransformRule[] = [
	{ name: 'sin-supplementary', transform: transformSinSupplementary },
	{ name: 'cos-supplementary', transform: transformCosSupplementary },
	{ name: 'tan-supplementary', transform: transformTanSupplementary }
];

const SHIFT_PI_OVER_2_TRANSFORMS: TransformRule[] = [
	{ name: 'sin-plus-pi-over-2', transform: transformSinPlusPiOver2 },
	{ name: 'cos-plus-pi-over-2', transform: transformCosPlusPiOver2 },
	{ name: 'tan-plus-pi-over-2', transform: transformTanPlusPiOver2 }
];

const FACTORIZATION_TRANSFORMS: TransformRule[] = [
	{ name: 'sin-plus-sin', transform: transformSinPlusSin },
	{ name: 'sin-minus-sin', transform: transformSinMinusSin },
	{ name: 'cos-plus-cos', transform: transformCosPlusCos },
	{ name: 'cos-minus-cos', transform: transformCosMinusCos }
];

const PERIODIC_TRANSFORMS: TransformRule[] = [
	{ name: 'sin-period-2pi', transform: transformSinPeriod2Pi },
	{ name: 'cos-period-2pi', transform: transformCosPeriod2Pi },
	{ name: 'sin-plus-pi', transform: transformSinPlusPi },
	{ name: 'cos-plus-pi', transform: transformCosPlusPi }
];

const HALF_ANGLE_TRANSFORMS: TransformRule[] = [
	{ name: 'sin-half-angle', transform: transformSinHalfAngle },
	{ name: 'cos-half-angle', transform: transformCosHalfAngle },
	{ name: 'tan-half-angle', transform: transformTanHalfAngle }
];

const HIGHER_POWER_TRANSFORMS: TransformRule[] = [
	{ name: 'sin-cubed', transform: transformSinCubed },
	{ name: 'cos-cubed', transform: transformCosCubed },
	{ name: 'sin-fourth', transform: transformSinFourth },
	{ name: 'cos-fourth', transform: transformCosFourth }
];

// Note: Some transforms are NOT included in ALL_TRANSFORMS because they are
// inverse to other transforms and would cause loops (e.g., ADDITION vs LINEARIZATION,
// DOUBLE_ANGLE_EXPANSION vs DOUBLE_ANGLE contraction)
const ALL_TRANSFORMS: TransformRule[] = [
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
 * Apply all trig identity transforms to an expression.
 *
 * @param node - The expression to transform
 * @param transforms - The transforms to apply (defaults to all)
 * @returns Transformation result with applied rules
 */
export function applyTrigIdentities(
	node: MathNode,
	transforms: TransformRule[] = ALL_TRANSFORMS
): TrigTransformResult {
	return applyIdentityTransforms(node, transforms);
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
export const TRANSFORM_TAN_HALF_ANGLE = transformTanHalfAngle;

// Tan/Cot Pythagorean
export const TRANSFORM_TAN_SQUARED_PLUS_ONE = transformTanSquaredPlusOne;
export const TRANSFORM_SEC_SQUARED_MINUS_ONE = transformSecSquaredMinusOne;
export const TRANSFORM_COT_SQUARED_PLUS_ONE = transformCotSquaredPlusOne;
export const TRANSFORM_CSC_SQUARED_MINUS_ONE = transformCscSquaredMinusOne;

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
