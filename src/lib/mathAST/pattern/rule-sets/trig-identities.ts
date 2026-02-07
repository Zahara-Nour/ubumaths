import type { MathNode } from '../../types';
import type { Rule, MatchBindings } from '../types';
import { getBindingNode } from '../types';
import { createRule } from '../rule';
import { nodesEqual } from '../match';
import { P } from '../builder';
import { isPiConstant, isGreek } from '../../guards';
import type { GreekLetterNode } from '../../types';
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
} from '../../factory';

// ============================================================================
// Helper Functions
// ============================================================================

function isPi(node: MathNode): boolean {
	if (isPiConstant(node)) return true;
	if (isGreek(node) && (node as GreekLetterNode).letter === 'pi') return true;
	return false;
}

function doubleArg(node: MathNode): MathNode {
	return multiply(number('2'), node, 'implicit');
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
// Pattern Constants
// ============================================================================

const piConstraint = P.custom((node) => isPi(node), 'π');
const PI = P._('_pi', piConstraint);
const PI_OVER_2 = P.div(PI, P.num(2));

// ============================================================================
// Pattern Factory Helpers
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
// DOUBLE_ANGLE Group
// ============================================================================

export const trigDoubleAngleRules: Rule[] = [
	createRule(
		P.prod(P.num(2), P.func('sin', [P._('a')]), P.func('cos', [P._('a')])),
		(b) => sin(doubleArg(get(b, 'a'))),
		{ name: 'double-angle-sin', group: 'DOUBLE_ANGLE' }
	),
	createRule(
		P.mul(P.func('sin', [P._('a')]), P.func('cos', [P._('a')])),
		(b) => divide(sin(doubleArg(get(b, 'a'))), number('2'), 'fraction'),
		{ name: 'sin-cos-product', group: 'DOUBLE_ANGLE' }
	)
];

// ============================================================================
// POWER_REDUCTION Group
// ============================================================================

export const trigPowerReductionRules: Rule[] = [
	createRule(
		P.func('sin', [P._('a')], { power: P.num(2) }),
		(b) => {
			const a = get(b, 'a');
			return divide(subtract(number('1'), cos(doubleArg(a))), number('2'), 'fraction');
		},
		{ name: 'sin-squared', group: 'POWER_REDUCTION' }
	),
	createRule(
		P.func('cos', [P._('a')], { power: P.num(2) }),
		(b) => {
			const a = get(b, 'a');
			return divide(add(number('1'), cos(doubleArg(a))), number('2'), 'fraction');
		},
		{ name: 'cos-squared', group: 'POWER_REDUCTION' }
	)
];

// ============================================================================
// PYTHAGOREAN Group
// ============================================================================

export const trigPythagoreanRules: Rule[] = [
	createRule(
		P.add(
			P.func('sin', [P._('a')], { power: P.num(2) }),
			P.func('cos', [P._('a')], { power: P.num(2) })
		),
		() => number('1'),
		{ name: 'pythagorean', group: 'PYTHAGOREAN' }
	),
	createRule(
		P.sub(P.num(1), P.func('sin', [P._('a')], { power: P.num(2) })),
		(b) => superscript(cos(get(b, 'a')), number('2')),
		{ name: 'one-minus-sin-squared', group: 'PYTHAGOREAN' }
	),
	createRule(
		P.sub(P.num(1), P.func('cos', [P._('a')], { power: P.num(2) })),
		(b) => superscript(sin(get(b, 'a')), number('2')),
		{ name: 'one-minus-cos-squared', group: 'PYTHAGOREAN' }
	),
	createRule(
		P.add(P.func('tan', [P._('a')], { power: P.num(2) }), P.num(1)),
		(b) => superscript(sec(get(b, 'a')), number('2')),
		{ name: 'tan-squared-plus-one', group: 'PYTHAGOREAN' }
	),
	createRule(
		P.sub(P.func('sec', [P._('a')], { power: P.num(2) }), P.num(1)),
		(b) => superscript(tan(get(b, 'a')), number('2')),
		{ name: 'sec-squared-minus-one', group: 'PYTHAGOREAN' }
	),
	createRule(
		P.add(P.func('cot', [P._('a')], { power: P.num(2) }), P.num(1)),
		(b) => superscript(csc(get(b, 'a')), number('2')),
		{ name: 'cot-squared-plus-one', group: 'PYTHAGOREAN' }
	),
	createRule(
		P.sub(P.func('csc', [P._('a')], { power: P.num(2) }), P.num(1)),
		(b) => superscript(cot(get(b, 'a')), number('2')),
		{ name: 'csc-squared-minus-one', group: 'PYTHAGOREAN' }
	)
];

// ============================================================================
// QUOTIENT Group
// ============================================================================

export const trigQuotientRules: Rule[] = [
	createRule(P.div(P.func('sin', [P._('a')]), P.func('cos', [P._('a')])), (b) => tan(get(b, 'a')), {
		name: 'sin-over-cos',
		group: 'QUOTIENT'
	}),
	createRule(P.div(P.func('cos', [P._('a')]), P.func('sin', [P._('a')])), (b) => cot(get(b, 'a')), {
		name: 'cos-over-sin',
		group: 'QUOTIENT'
	}),
	createRule(P.div(P.num(1), P.func('cos', [P._('a')])), (b) => sec(get(b, 'a')), {
		name: 'one-over-cos',
		group: 'QUOTIENT'
	}),
	createRule(P.div(P.num(1), P.func('sin', [P._('a')])), (b) => csc(get(b, 'a')), {
		name: 'one-over-sin',
		group: 'QUOTIENT'
	})
];

// ============================================================================
// LINEARIZATION Group
// ============================================================================

export const trigLinearizationRules: Rule[] = [
	createRule(
		P.mul(P.func('cos', [P._('a')]), P.func('cos', [P._('b')])),
		(b) => {
			const a = get(b, 'a');
			const bNode = get(b, 'b');
			return divide(add(cos(subtract(a, bNode)), cos(add(a, bNode))), number('2'), 'fraction');
		},
		{
			name: 'cos-cos-product',
			group: 'LINEARIZATION',
			condition: (b) => !nodesEqual(get(b, 'a'), get(b, 'b'))
		}
	),
	createRule(
		P.mul(P.func('sin', [P._('a')]), P.func('sin', [P._('b')])),
		(b) => {
			const a = get(b, 'a');
			const bNode = get(b, 'b');
			return divide(subtract(cos(subtract(a, bNode)), cos(add(a, bNode))), number('2'), 'fraction');
		},
		{
			name: 'sin-sin-product',
			group: 'LINEARIZATION',
			condition: (b) => !nodesEqual(get(b, 'a'), get(b, 'b'))
		}
	),
	createRule(
		P.mul(P.func('sin', [P._('a')]), P.func('cos', [P._('b')])),
		(b) => {
			const a = get(b, 'a');
			const bNode = get(b, 'b');
			return divide(add(sin(add(a, bNode)), sin(subtract(a, bNode))), number('2'), 'fraction');
		},
		{
			name: 'sin-cos-different',
			group: 'LINEARIZATION',
			condition: (b) => !nodesEqual(get(b, 'a'), get(b, 'b'))
		}
	)
];

// ============================================================================
// NEGATIVE_ANGLE Group
// ============================================================================

export const trigNegativeAngleRules: Rule[] = [
	createRule(patFuncNeg('sin'), (b) => opposite(sin(get(b, 'x'))), {
		name: 'sin-negative',
		group: 'NEGATIVE_ANGLE'
	}),
	createRule(patFuncNeg('cos'), (b) => cos(get(b, 'x')), {
		name: 'cos-negative',
		group: 'NEGATIVE_ANGLE'
	}),
	createRule(patFuncNeg('tan'), (b) => opposite(tan(get(b, 'x'))), {
		name: 'tan-negative',
		group: 'NEGATIVE_ANGLE'
	})
];

// ============================================================================
// PERIODIC Group
// ============================================================================

export const trigPeriodicRules: Rule[] = [
	createRule(P.func('sin', [P.add(P._('x'), P.mul(P.num(2), PI))]), (b) => sin(get(b, 'x')), {
		name: 'sin-period-2pi',
		group: 'PERIODIC'
	}),
	createRule(P.func('cos', [P.add(P._('x'), P.mul(P.num(2), PI))]), (b) => cos(get(b, 'x')), {
		name: 'cos-period-2pi',
		group: 'PERIODIC'
	}),
	createRule(P.func('sin', [P.add(P._('x'), PI)]), (b) => opposite(sin(get(b, 'x'))), {
		name: 'sin-plus-pi',
		group: 'PERIODIC'
	}),
	createRule(P.func('cos', [P.add(P._('x'), PI)]), (b) => opposite(cos(get(b, 'x'))), {
		name: 'cos-plus-pi',
		group: 'PERIODIC'
	})
];

// ============================================================================
// ADDITION Group (excluded from simplify)
// ============================================================================

export const trigAdditionRules: Rule[] = [
	createRule(
		patFuncSum('cos'),
		(b) => {
			const a = get(b, 'a');
			const bNode = get(b, 'b');
			return subtract(
				multiply(cos(a), cos(bNode), 'implicit'),
				multiply(sin(a), sin(bNode), 'implicit')
			);
		},
		{ name: 'cos-sum', group: 'ADDITION' }
	),
	createRule(
		patFuncDiff('cos'),
		(b) => {
			const a = get(b, 'a');
			const bNode = get(b, 'b');
			return add(
				multiply(cos(a), cos(bNode), 'implicit'),
				multiply(sin(a), sin(bNode), 'implicit')
			);
		},
		{ name: 'cos-difference', group: 'ADDITION' }
	),
	createRule(
		patFuncSum('sin'),
		(b) => {
			const a = get(b, 'a');
			const bNode = get(b, 'b');
			return add(
				multiply(sin(a), cos(bNode), 'implicit'),
				multiply(cos(a), sin(bNode), 'implicit')
			);
		},
		{ name: 'sin-sum', group: 'ADDITION' }
	),
	createRule(
		patFuncDiff('sin'),
		(b) => {
			const a = get(b, 'a');
			const bNode = get(b, 'b');
			return subtract(
				multiply(sin(a), cos(bNode), 'implicit'),
				multiply(cos(a), sin(bNode), 'implicit')
			);
		},
		{ name: 'sin-difference', group: 'ADDITION' }
	),
	createRule(
		patFuncSum('tan'),
		(b) => {
			const a = get(b, 'a');
			const bNode = get(b, 'b');
			return divide(
				add(tan(a), tan(bNode)),
				subtract(number('1'), multiply(tan(a), tan(bNode), 'implicit')),
				'fraction'
			);
		},
		{ name: 'tan-sum', group: 'ADDITION' }
	),
	createRule(
		patFuncDiff('tan'),
		(b) => {
			const a = get(b, 'a');
			const bNode = get(b, 'b');
			return divide(
				subtract(tan(a), tan(bNode)),
				add(number('1'), multiply(tan(a), tan(bNode), 'implicit')),
				'fraction'
			);
		},
		{ name: 'tan-difference', group: 'ADDITION' }
	)
];

// ============================================================================
// DOUBLE_ANGLE_EXPANSION Group (excluded from simplify)
// ============================================================================

export const trigDoubleAngleExpansionRules: Rule[] = [
	createRule(
		patFuncDouble('sin'),
		(b) => {
			const x = get(b, 'x');
			return multiply(multiply(number('2'), sin(x), 'implicit'), cos(x), 'implicit');
		},
		{ name: 'expand-double-sin', group: 'DOUBLE_ANGLE_EXPANSION' }
	),
	createRule(
		patFuncDouble('cos'),
		(b) => {
			const x = get(b, 'x');
			return subtract(superscript(cos(x), number('2')), superscript(sin(x), number('2')));
		},
		{ name: 'expand-double-cos', group: 'DOUBLE_ANGLE_EXPANSION' }
	),
	createRule(
		patFuncDouble('tan'),
		(b) => {
			const x = get(b, 'x');
			return divide(
				multiply(number('2'), tan(x), 'implicit'),
				subtract(number('1'), superscript(tan(x), number('2'))),
				'fraction'
			);
		},
		{ name: 'expand-double-tan', group: 'DOUBLE_ANGLE_EXPANSION' }
	)
];

// ============================================================================
// COFUNCTION Group (excluded from simplify)
// ============================================================================

export const trigCofunctionRules: Rule[] = [
	createRule(P.func('sin', [P.sub(PI_OVER_2, P._('x'))]), (b) => cos(get(b, 'x')), {
		name: 'sin-cofunction',
		group: 'COFUNCTION'
	}),
	createRule(P.func('cos', [P.sub(PI_OVER_2, P._('x'))]), (b) => sin(get(b, 'x')), {
		name: 'cos-cofunction',
		group: 'COFUNCTION'
	}),
	createRule(P.func('tan', [P.sub(PI_OVER_2, P._('x'))]), (b) => cot(get(b, 'x')), {
		name: 'tan-cofunction',
		group: 'COFUNCTION'
	})
];

// ============================================================================
// SUPPLEMENTARY Group (excluded from simplify)
// ============================================================================

export const trigSupplementaryRules: Rule[] = [
	createRule(P.func('sin', [P.sub(PI, P._('x'))]), (b) => sin(get(b, 'x')), {
		name: 'sin-supplementary',
		group: 'SUPPLEMENTARY'
	}),
	createRule(P.func('cos', [P.sub(PI, P._('x'))]), (b) => opposite(cos(get(b, 'x'))), {
		name: 'cos-supplementary',
		group: 'SUPPLEMENTARY'
	}),
	createRule(P.func('tan', [P.sub(PI, P._('x'))]), (b) => opposite(tan(get(b, 'x'))), {
		name: 'tan-supplementary',
		group: 'SUPPLEMENTARY'
	})
];

// ============================================================================
// SHIFT_PI_OVER_2 Group (excluded from simplify)
// ============================================================================

export const trigShiftPiOver2Rules: Rule[] = [
	createRule(P.func('sin', [P.add(P._('x'), PI_OVER_2)]), (b) => cos(get(b, 'x')), {
		name: 'sin-plus-pi-over-2',
		group: 'SHIFT_PI_OVER_2'
	}),
	createRule(P.func('cos', [P.add(P._('x'), PI_OVER_2)]), (b) => opposite(sin(get(b, 'x'))), {
		name: 'cos-plus-pi-over-2',
		group: 'SHIFT_PI_OVER_2'
	}),
	createRule(P.func('tan', [P.add(P._('x'), PI_OVER_2)]), (b) => opposite(cot(get(b, 'x'))), {
		name: 'tan-plus-pi-over-2',
		group: 'SHIFT_PI_OVER_2'
	})
];

// ============================================================================
// FACTORIZATION Group (excluded from simplify)
// ============================================================================

export const trigFactorizationRules: Rule[] = [
	createRule(
		P.add(P.func('sin', [P._('a')]), P.func('sin', [P._('b')])),
		(b) => {
			const a = get(b, 'a');
			const bNode = get(b, 'b');
			return multiply(
				multiply(number('2'), sin(halveExpr(add(a, bNode))), 'implicit'),
				cos(halveExpr(subtract(a, bNode))),
				'implicit'
			);
		},
		{ name: 'sin-plus-sin', group: 'FACTORIZATION' }
	),
	createRule(
		P.sub(P.func('sin', [P._('a')]), P.func('sin', [P._('b')])),
		(b) => {
			const a = get(b, 'a');
			const bNode = get(b, 'b');
			return multiply(
				multiply(number('2'), cos(halveExpr(add(a, bNode))), 'implicit'),
				sin(halveExpr(subtract(a, bNode))),
				'implicit'
			);
		},
		{ name: 'sin-minus-sin', group: 'FACTORIZATION' }
	),
	createRule(
		P.add(P.func('cos', [P._('a')]), P.func('cos', [P._('b')])),
		(b) => {
			const a = get(b, 'a');
			const bNode = get(b, 'b');
			return multiply(
				multiply(number('2'), cos(halveExpr(add(a, bNode))), 'implicit'),
				cos(halveExpr(subtract(a, bNode))),
				'implicit'
			);
		},
		{ name: 'cos-plus-cos', group: 'FACTORIZATION' }
	),
	createRule(
		P.sub(P.func('cos', [P._('a')]), P.func('cos', [P._('b')])),
		(b) => {
			const a = get(b, 'a');
			const bNode = get(b, 'b');
			return opposite(
				multiply(
					multiply(number('2'), sin(halveExpr(add(a, bNode))), 'implicit'),
					sin(halveExpr(subtract(a, bNode))),
					'implicit'
				)
			);
		},
		{ name: 'cos-minus-cos', group: 'FACTORIZATION' }
	)
];

// ============================================================================
// HALF_ANGLE Group (excluded from simplify)
// ============================================================================

export const trigHalfAngleRules: Rule[] = [
	createRule(
		patFuncHalf('sin'),
		(b) => {
			const x = get(b, 'x');
			return sqrt(divide(subtract(number('1'), cos(x)), number('2'), 'fraction'));
		},
		{ name: 'sin-half-angle', group: 'HALF_ANGLE' }
	),
	createRule(
		patFuncHalf('cos'),
		(b) => {
			const x = get(b, 'x');
			return sqrt(divide(add(number('1'), cos(x)), number('2'), 'fraction'));
		},
		{ name: 'cos-half-angle', group: 'HALF_ANGLE' }
	),
	createRule(
		patFuncHalf('tan'),
		(b) => {
			const x = get(b, 'x');
			return divide(sin(x), add(number('1'), cos(x)), 'fraction');
		},
		{ name: 'tan-half-angle', group: 'HALF_ANGLE' }
	)
];

// ============================================================================
// HIGHER_POWER Group (excluded from simplify)
// ============================================================================

export const trigHigherPowerRules: Rule[] = [
	createRule(
		P.func('sin', [P._('a')], { power: P.num(3) }),
		(b) => {
			const a = get(b, 'a');
			return divide(
				subtract(
					multiply(number('3'), sin(a), 'implicit'),
					sin(multiply(number('3'), a, 'implicit'))
				),
				number('4'),
				'fraction'
			);
		},
		{ name: 'sin-cubed', group: 'HIGHER_POWER' }
	),
	createRule(
		P.func('cos', [P._('a')], { power: P.num(3) }),
		(b) => {
			const a = get(b, 'a');
			return divide(
				add(multiply(number('3'), cos(a), 'implicit'), cos(multiply(number('3'), a, 'implicit'))),
				number('4'),
				'fraction'
			);
		},
		{ name: 'cos-cubed', group: 'HIGHER_POWER' }
	),
	createRule(
		P.func('sin', [P._('a')], { power: P.num(4) }),
		(b) => {
			const a = get(b, 'a');
			return divide(
				add(
					subtract(number('3'), multiply(number('4'), cos(doubleArg(a)), 'implicit')),
					cos(multiply(number('4'), a, 'implicit'))
				),
				number('8'),
				'fraction'
			);
		},
		{ name: 'sin-fourth', group: 'HIGHER_POWER' }
	),
	createRule(
		P.func('cos', [P._('a')], { power: P.num(4) }),
		(b) => {
			const a = get(b, 'a');
			return divide(
				add(
					add(number('3'), multiply(number('4'), cos(doubleArg(a)), 'implicit')),
					cos(multiply(number('4'), a, 'implicit'))
				),
				number('8'),
				'fraction'
			);
		},
		{ name: 'cos-fourth', group: 'HIGHER_POWER' }
	)
];

// ============================================================================
// Exports
// ============================================================================

export const trigSimplifyRules: Rule[] = [
	...trigDoubleAngleRules,
	...trigPowerReductionRules,
	...trigPythagoreanRules,
	...trigQuotientRules,
	...trigLinearizationRules,
	...trigNegativeAngleRules,
	...trigPeriodicRules
];

export const allTrigRules: Rule[] = [
	...trigSimplifyRules,
	...trigAdditionRules,
	...trigDoubleAngleExpansionRules,
	...trigCofunctionRules,
	...trigSupplementaryRules,
	...trigShiftPiOver2Rules,
	...trigFactorizationRules,
	...trigHalfAngleRules,
	...trigHigherPowerRules
];
