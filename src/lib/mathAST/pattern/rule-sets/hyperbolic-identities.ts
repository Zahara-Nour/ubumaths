/**
 * Hyperbolic Identity Pattern Rules
 *
 * Declarative pattern rules for hyperbolic function identities.
 * All rules use createRule(pattern, replacement, { name }) format.
 */

import type { MathNode } from '../../types';
import type { Rule, MatchBindings } from '../types';
import { getBindingNode } from '../types';
import { createRule } from '../rule';
import { nodesEqual } from '../match';
import { P } from '../builder';
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
} from '../../factory';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function doubleArg(node: MathNode): MathNode {
	return multiply(number('2'), node, 'implicit');
}

function tripleArg(node: MathNode): MathNode {
	return multiply(number('3'), node, 'implicit');
}

function quadrupleArg(node: MathNode): MathNode {
	return multiply(number('4'), node, 'implicit');
}

function halveExpr(node: MathNode): MathNode {
	return divide(node, number('2'), 'fraction');
}

function get(b: MatchBindings, name: string): MathNode {
	const node = getBindingNode(b, name);
	if (!node) throw new Error(`Missing binding '${name}'`);
	return node;
}

// ============================================================================
// PATTERN HELPERS
// ============================================================================

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

// ============================================================================
// DOUBLE ANGLE RULES (2)
// ============================================================================

export const hypDoubleAngleRules: Rule[] = [
	// 2sinh(a)cosh(a) → sinh(2a)
	createRule(
		P.prod(P.num(2), P.func('sinh', [P._('a')]), P.func('cosh', [P._('a')])),
		(b) => sinh(doubleArg(get(b, 'a'))),
		{ name: 'double-angle-sinh' }
	),

	// sinh(a)cosh(a) → sinh(2a)/2
	createRule(
		P.mul(P.func('sinh', [P._('a')]), P.func('cosh', [P._('a')])),
		(b) => halveExpr(sinh(doubleArg(get(b, 'a')))),
		{ name: 'sinh-cosh-product' }
	)
];

// ============================================================================
// POWER REDUCTION RULES (2)
// ============================================================================

export const hypPowerReductionRules: Rule[] = [
	// sinh²(a) → (cosh(2a) - 1) / 2
	createRule(
		P.func('sinh', [P._('a')], { power: P.num(2) }),
		(b) => halveExpr(subtract(cosh(doubleArg(get(b, 'a'))), number('1'))),
		{ name: 'sinh-squared' }
	),

	// cosh²(a) → (cosh(2a) + 1) / 2
	createRule(
		P.func('cosh', [P._('a')], { power: P.num(2) }),
		(b) => halveExpr(add(cosh(doubleArg(get(b, 'a'))), number('1'))),
		{ name: 'cosh-squared' }
	)
];

// ============================================================================
// PYTHAGOREAN IDENTITIES (8)
// ============================================================================

export const hypPythagoreanRules: Rule[] = [
	// cosh²(a) - sinh²(a) → 1
	createRule(
		P.sub(
			P.func('cosh', [P._('a')], { power: P.num(2) }),
			P.func('sinh', [P._('a')], { power: P.num(2) })
		),
		() => number('1'),
		{ name: 'hyperbolic-pythagorean' }
	),

	// 1 + sinh²(a) → cosh²(a)
	createRule(
		P.add(P.num(1), P.func('sinh', [P._('a')], { power: P.num(2) })),
		(b) => superscript(cosh(get(b, 'a')), number('2')),
		{ name: 'one-plus-sinh-squared' }
	),

	// cosh²(a) - 1 → sinh²(a)
	createRule(
		P.sub(P.func('cosh', [P._('a')], { power: P.num(2) }), P.num(1)),
		(b) => superscript(sinh(get(b, 'a')), number('2')),
		{ name: 'cosh-squared-minus-one' }
	),

	// 1 - tanh²(a) → sech²(a)
	createRule(
		P.sub(P.num(1), P.func('tanh', [P._('a')], { power: P.num(2) })),
		(b) => superscript(sech(get(b, 'a')), number('2')),
		{ name: 'one-minus-tanh-squared' }
	),

	// sech²(a) + tanh²(a) → 1
	createRule(
		P.add(
			P.func('sech', [P._('a')], { power: P.num(2) }),
			P.func('tanh', [P._('a')], { power: P.num(2) })
		),
		() => number('1'),
		{ name: 'sech-tanh-pythagorean' }
	),

	// coth²(a) - 1 → csch²(a)
	createRule(
		P.sub(P.func('coth', [P._('a')], { power: P.num(2) }), P.num(1)),
		(b) => superscript(csch(get(b, 'a')), number('2')),
		{ name: 'coth-squared-minus-one' }
	),

	// coth²(a) - csch²(a) → 1
	createRule(
		P.sub(
			P.func('coth', [P._('a')], { power: P.num(2) }),
			P.func('csch', [P._('a')], { power: P.num(2) })
		),
		() => number('1'),
		{ name: 'coth-csch-pythagorean' }
	),

	// 1 + csch²(a) → coth²(a)
	createRule(
		P.add(P.num(1), P.func('csch', [P._('a')], { power: P.num(2) })),
		(b) => superscript(coth(get(b, 'a')), number('2')),
		{ name: 'one-plus-csch-squared' }
	)
];

// ============================================================================
// QUOTIENT IDENTITIES (4)
// ============================================================================

export const hypQuotientRules: Rule[] = [
	// sinh(a) / cosh(a) → tanh(a)
	createRule(
		P.div(P.func('sinh', [P._('a')]), P.func('cosh', [P._('a')])),
		(b) => tanh(get(b, 'a')),
		{ name: 'sinh-over-cosh' }
	),

	// cosh(a) / sinh(a) → coth(a)
	createRule(
		P.div(P.func('cosh', [P._('a')]), P.func('sinh', [P._('a')])),
		(b) => coth(get(b, 'a')),
		{ name: 'cosh-over-sinh' }
	),

	// 1 / cosh(a) → sech(a)
	createRule(P.div(P.num(1), P.func('cosh', [P._('a')])), (b) => sech(get(b, 'a')), {
		name: 'one-over-cosh'
	}),

	// 1 / sinh(a) → csch(a)
	createRule(P.div(P.num(1), P.func('sinh', [P._('a')])), (b) => csch(get(b, 'a')), {
		name: 'one-over-sinh'
	})
];

// ============================================================================
// LINEARIZATION RULES (3)
// ============================================================================

export const hypLinearizationRules: Rule[] = [
	// cosh(a)cosh(b) → (cosh(a+b) + cosh(a-b)) / 2
	createRule(
		P.mul(P.func('cosh', [P._('a')]), P.func('cosh', [P._('b')])),
		(b) => {
			const a = get(b, 'a');
			const bNode = get(b, 'b');
			return halveExpr(add(cosh(add(a, bNode)), cosh(subtract(a, bNode))));
		},
		{ name: 'cosh-cosh-product', condition: (b) => !nodesEqual(get(b, 'a'), get(b, 'b')) }
	),

	// sinh(a)sinh(b) → (cosh(a+b) - cosh(a-b)) / 2
	createRule(
		P.mul(P.func('sinh', [P._('a')]), P.func('sinh', [P._('b')])),
		(b) => {
			const a = get(b, 'a');
			const bNode = get(b, 'b');
			return halveExpr(subtract(cosh(add(a, bNode)), cosh(subtract(a, bNode))));
		},
		{ name: 'sinh-sinh-product', condition: (b) => !nodesEqual(get(b, 'a'), get(b, 'b')) }
	),

	// sinh(a)cosh(b) → (sinh(a+b) + sinh(a-b)) / 2 (when a ≠ b)
	createRule(
		P.mul(P.func('sinh', [P._('a')]), P.func('cosh', [P._('b')])),
		(b) => {
			const a = get(b, 'a');
			const bNode = get(b, 'b');
			return halveExpr(add(sinh(add(a, bNode)), sinh(subtract(a, bNode))));
		},
		{ name: 'sinh-cosh-different', condition: (b) => !nodesEqual(get(b, 'a'), get(b, 'b')) }
	)
];

// ============================================================================
// NEGATIVE ARGUMENT RULES (3)
// ============================================================================

export const hypNegativeArgumentRules: Rule[] = [
	// sinh(-x) → -sinh(x) (odd function)
	createRule(patFuncNeg('sinh'), (b) => opposite(sinh(get(b, 'x'))), { name: 'sinh-negative' }),

	// cosh(-x) → cosh(x) (even function)
	createRule(patFuncNeg('cosh'), (b) => cosh(get(b, 'x')), { name: 'cosh-negative' }),

	// tanh(-x) → -tanh(x) (odd function)
	createRule(patFuncNeg('tanh'), (b) => opposite(tanh(get(b, 'x'))), { name: 'tanh-negative' })
];

// ============================================================================
// ADDITION FORMULAS (6) - excluded from simplify
// ============================================================================

export const hypAdditionRules: Rule[] = [
	// cosh(a+b) → cosh(a)cosh(b) + sinh(a)sinh(b)
	createRule(
		patFuncSum('cosh'),
		(b) => {
			const a = get(b, 'a');
			const bNode = get(b, 'b');
			return add(
				multiply(cosh(a), cosh(bNode), 'implicit'),
				multiply(sinh(a), sinh(bNode), 'implicit')
			);
		},
		{ name: 'cosh-sum' }
	),

	// cosh(a-b) → cosh(a)cosh(b) - sinh(a)sinh(b)
	createRule(
		patFuncDiff('cosh'),
		(b) => {
			const a = get(b, 'a');
			const bNode = get(b, 'b');
			return subtract(
				multiply(cosh(a), cosh(bNode), 'implicit'),
				multiply(sinh(a), sinh(bNode), 'implicit')
			);
		},
		{ name: 'cosh-difference' }
	),

	// sinh(a+b) → sinh(a)cosh(b) + cosh(a)sinh(b)
	createRule(
		patFuncSum('sinh'),
		(b) => {
			const a = get(b, 'a');
			const bNode = get(b, 'b');
			return add(
				multiply(sinh(a), cosh(bNode), 'implicit'),
				multiply(cosh(a), sinh(bNode), 'implicit')
			);
		},
		{ name: 'sinh-sum' }
	),

	// sinh(a-b) → sinh(a)cosh(b) - cosh(a)sinh(b)
	createRule(
		patFuncDiff('sinh'),
		(b) => {
			const a = get(b, 'a');
			const bNode = get(b, 'b');
			return subtract(
				multiply(sinh(a), cosh(bNode), 'implicit'),
				multiply(cosh(a), sinh(bNode), 'implicit')
			);
		},
		{ name: 'sinh-difference' }
	),

	// tanh(a+b) → (tanh(a) + tanh(b)) / (1 + tanh(a)tanh(b))
	createRule(
		patFuncSum('tanh'),
		(b) => {
			const a = get(b, 'a');
			const bNode = get(b, 'b');
			return divide(
				add(tanh(a), tanh(bNode)),
				add(number('1'), multiply(tanh(a), tanh(bNode), 'implicit')),
				'fraction'
			);
		},
		{ name: 'tanh-sum' }
	),

	// tanh(a-b) → (tanh(a) - tanh(b)) / (1 - tanh(a)tanh(b))
	createRule(
		patFuncDiff('tanh'),
		(b) => {
			const a = get(b, 'a');
			const bNode = get(b, 'b');
			return divide(
				subtract(tanh(a), tanh(bNode)),
				subtract(number('1'), multiply(tanh(a), tanh(bNode), 'implicit')),
				'fraction'
			);
		},
		{ name: 'tanh-difference' }
	)
];

// ============================================================================
// DOUBLE ANGLE EXPANSION (3) - excluded from simplify
// ============================================================================

export const hypDoubleAngleExpansionRules: Rule[] = [
	// sinh(2x) → 2sinh(x)cosh(x)
	createRule(
		patFuncDouble('sinh'),
		(b) =>
			multiply(number('2'), multiply(sinh(get(b, 'x')), cosh(get(b, 'x')), 'implicit'), 'implicit'),
		{ name: 'expand-double-sinh' }
	),

	// cosh(2x) → cosh²(x) + sinh²(x)
	createRule(
		patFuncDouble('cosh'),
		(b) =>
			add(superscript(cosh(get(b, 'x')), number('2')), superscript(sinh(get(b, 'x')), number('2'))),
		{ name: 'expand-double-cosh' }
	),

	// tanh(2x) → 2tanh(x) / (1 + tanh²(x))
	createRule(
		patFuncDouble('tanh'),
		(b) => {
			const x = get(b, 'x');
			return divide(
				multiply(number('2'), tanh(x), 'implicit'),
				add(number('1'), superscript(tanh(x), number('2'))),
				'fraction'
			);
		},
		{ name: 'expand-double-tanh' }
	)
];

// ============================================================================
// FACTORIZATION RULES (4) - excluded from simplify
// ============================================================================

export const hypFactorizationRules: Rule[] = [
	// sinh(a) + sinh(b) → 2sinh((a+b)/2)cosh((a-b)/2)
	createRule(
		P.add(P.func('sinh', [P._('a')]), P.func('sinh', [P._('b')])),
		(b) => {
			const a = get(b, 'a');
			const bNode = get(b, 'b');
			return multiply(
				number('2'),
				multiply(sinh(halveExpr(add(a, bNode))), cosh(halveExpr(subtract(a, bNode))), 'implicit'),
				'implicit'
			);
		},
		{ name: 'sinh-plus-sinh' }
	),

	// sinh(a) - sinh(b) → 2cosh((a+b)/2)sinh((a-b)/2)
	createRule(
		P.sub(P.func('sinh', [P._('a')]), P.func('sinh', [P._('b')])),
		(b) => {
			const a = get(b, 'a');
			const bNode = get(b, 'b');
			return multiply(
				number('2'),
				multiply(cosh(halveExpr(add(a, bNode))), sinh(halveExpr(subtract(a, bNode))), 'implicit'),
				'implicit'
			);
		},
		{ name: 'sinh-minus-sinh' }
	),

	// cosh(a) + cosh(b) → 2cosh((a+b)/2)cosh((a-b)/2)
	createRule(
		P.add(P.func('cosh', [P._('a')]), P.func('cosh', [P._('b')])),
		(b) => {
			const a = get(b, 'a');
			const bNode = get(b, 'b');
			return multiply(
				number('2'),
				multiply(cosh(halveExpr(add(a, bNode))), cosh(halveExpr(subtract(a, bNode))), 'implicit'),
				'implicit'
			);
		},
		{ name: 'cosh-plus-cosh' }
	),

	// cosh(a) - cosh(b) → 2sinh((a+b)/2)sinh((a-b)/2)
	createRule(
		P.sub(P.func('cosh', [P._('a')]), P.func('cosh', [P._('b')])),
		(b) => {
			const a = get(b, 'a');
			const bNode = get(b, 'b');
			return multiply(
				number('2'),
				multiply(sinh(halveExpr(add(a, bNode))), sinh(halveExpr(subtract(a, bNode))), 'implicit'),
				'implicit'
			);
		},
		{ name: 'cosh-minus-cosh' }
	)
];

// ============================================================================
// HALF ANGLE FORMULAS (3) - excluded from simplify
// ============================================================================

export const hypHalfAngleRules: Rule[] = [
	// sinh(x/2) → sqrt((cosh(x) - 1) / 2)
	createRule(
		patFuncHalf('sinh'),
		(b) => sqrt(halveExpr(subtract(cosh(get(b, 'x')), number('1')))),
		{ name: 'sinh-half-angle' }
	),

	// cosh(x/2) → sqrt((cosh(x) + 1) / 2)
	createRule(patFuncHalf('cosh'), (b) => sqrt(halveExpr(add(cosh(get(b, 'x')), number('1')))), {
		name: 'cosh-half-angle'
	}),

	// tanh(x/2) → sinh(x) / (1 + cosh(x))
	createRule(
		patFuncHalf('tanh'),
		(b) => divide(sinh(get(b, 'x')), add(number('1'), cosh(get(b, 'x'))), 'fraction'),
		{ name: 'tanh-half-angle' }
	)
];

// ============================================================================
// HIGHER POWER RULES (4) - excluded from simplify
// ============================================================================

export const hypHigherPowerRules: Rule[] = [
	// sinh³(a) → (sinh(3a) - 3sinh(a)) / 4
	createRule(
		P.func('sinh', [P._('a')], { power: P.num(3) }),
		(b) => {
			const a = get(b, 'a');
			return divide(
				subtract(sinh(tripleArg(a)), multiply(number('3'), sinh(a), 'implicit')),
				number('4'),
				'fraction'
			);
		},
		{ name: 'sinh-cubed' }
	),

	// cosh³(a) → (cosh(3a) + 3cosh(a)) / 4
	createRule(
		P.func('cosh', [P._('a')], { power: P.num(3) }),
		(b) => {
			const a = get(b, 'a');
			return divide(
				add(cosh(tripleArg(a)), multiply(number('3'), cosh(a), 'implicit')),
				number('4'),
				'fraction'
			);
		},
		{ name: 'cosh-cubed' }
	),

	// sinh⁴(a) → (3 - 4cosh(2a) + cosh(4a)) / 8
	createRule(
		P.func('sinh', [P._('a')], { power: P.num(4) }),
		(b) => {
			const a = get(b, 'a');
			return divide(
				add(
					subtract(number('3'), multiply(number('4'), cosh(doubleArg(a)), 'implicit')),
					cosh(quadrupleArg(a))
				),
				number('8'),
				'fraction'
			);
		},
		{ name: 'sinh-fourth' }
	),

	// cosh⁴(a) → (3 + 4cosh(2a) + cosh(4a)) / 8
	createRule(
		P.func('cosh', [P._('a')], { power: P.num(4) }),
		(b) => {
			const a = get(b, 'a');
			return divide(
				add(
					add(number('3'), multiply(number('4'), cosh(doubleArg(a)), 'implicit')),
					cosh(quadrupleArg(a))
				),
				number('8'),
				'fraction'
			);
		},
		{ name: 'cosh-fourth' }
	)
];

// ============================================================================
// COMBINED RULE SETS
// ============================================================================

/**
 * Rules used for automatic simplification (excluded: addition, expansion, factorization, half-angle, higher-power)
 */
export const hypSimplifyRules: Rule[] = [...hypPythagoreanRules, ...hypQuotientRules];

/**
 * All hyperbolic identity rules (for targeted transformations)
 */
export const allHyperbolicRules: Rule[] = [
	...hypDoubleAngleRules,
	...hypPowerReductionRules,
	...hypPythagoreanRules,
	...hypQuotientRules,
	...hypLinearizationRules,
	...hypNegativeArgumentRules,
	...hypAdditionRules,
	...hypDoubleAngleExpansionRules,
	...hypFactorizationRules,
	...hypHalfAngleRules,
	...hypHigherPowerRules
];
