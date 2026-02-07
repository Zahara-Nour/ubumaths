/**
 * Infinity Transforms for Simplification
 *
 * TransformRules for evaluating functions at ±∞.
 * These are used by the simplify pipeline to reduce expressions
 * involving infinity to their known limits.
 *
 * @module mathAST/simplify/infinity-transforms
 */

import type { TransformRule } from '../transform/identity-engine';
import type { MathNode } from '../types';
import { isFunction, isInfinity } from '../guards';
import { greek, number, opposite, divide, positiveInfinity, negativeInfinity } from '../factory';

// =============================================================================
// Helpers
// =============================================================================

function isPositiveInfinity(node: MathNode): boolean {
	return isInfinity(node) && node.sign === 'positive';
}

function isNegativeInfinity(node: MathNode): boolean {
	return isInfinity(node) && node.sign === 'negative';
}

function piOver2(): MathNode {
	return divide(greek('pi'), number('2'), 'fraction');
}

// =============================================================================
// Infinity Transforms
// =============================================================================

/**
 * arctan(+∞) -> π/2
 */
const arctanPosInf: TransformRule = {
	name: 'arctan-pos-inf',
	transform(node: MathNode): MathNode | null {
		if (!isFunction(node) || node.name !== 'arctan' || node.args.length !== 1) return null;
		if (!isPositiveInfinity(node.args[0])) return null;
		return piOver2();
	}
};

/**
 * arctan(-∞) -> -π/2
 */
const arctanNegInf: TransformRule = {
	name: 'arctan-neg-inf',
	transform(node: MathNode): MathNode | null {
		if (!isFunction(node) || node.name !== 'arctan' || node.args.length !== 1) return null;
		if (!isNegativeInfinity(node.args[0])) return null;
		return opposite(piOver2());
	}
};

/**
 * sinh(+∞) -> +∞
 */
const sinhPosInf: TransformRule = {
	name: 'sinh-pos-inf',
	transform(node: MathNode): MathNode | null {
		if (!isFunction(node) || node.name !== 'sinh' || node.args.length !== 1) return null;
		if (!isPositiveInfinity(node.args[0])) return null;
		return positiveInfinity();
	}
};

/**
 * sinh(-∞) -> -∞
 */
const sinhNegInf: TransformRule = {
	name: 'sinh-neg-inf',
	transform(node: MathNode): MathNode | null {
		if (!isFunction(node) || node.name !== 'sinh' || node.args.length !== 1) return null;
		if (!isNegativeInfinity(node.args[0])) return null;
		return negativeInfinity();
	}
};

/**
 * cosh(+∞) -> +∞
 */
const coshPosInf: TransformRule = {
	name: 'cosh-pos-inf',
	transform(node: MathNode): MathNode | null {
		if (!isFunction(node) || node.name !== 'cosh' || node.args.length !== 1) return null;
		if (!isPositiveInfinity(node.args[0])) return null;
		return positiveInfinity();
	}
};

/**
 * cosh(-∞) -> +∞
 */
const coshNegInf: TransformRule = {
	name: 'cosh-neg-inf',
	transform(node: MathNode): MathNode | null {
		if (!isFunction(node) || node.name !== 'cosh' || node.args.length !== 1) return null;
		if (!isNegativeInfinity(node.args[0])) return null;
		return positiveInfinity();
	}
};

/**
 * tanh(+∞) -> 1
 */
const tanhPosInf: TransformRule = {
	name: 'tanh-pos-inf',
	transform(node: MathNode): MathNode | null {
		if (!isFunction(node) || node.name !== 'tanh' || node.args.length !== 1) return null;
		if (!isPositiveInfinity(node.args[0])) return null;
		return number('1');
	}
};

/**
 * tanh(-∞) -> -1
 */
const tanhNegInf: TransformRule = {
	name: 'tanh-neg-inf',
	transform(node: MathNode): MathNode | null {
		if (!isFunction(node) || node.name !== 'tanh' || node.args.length !== 1) return null;
		if (!isNegativeInfinity(node.args[0])) return null;
		return opposite(number('1'));
	}
};

/**
 * exp(+∞) -> +∞
 */
const expPosInf: TransformRule = {
	name: 'exp-pos-inf',
	transform(node: MathNode): MathNode | null {
		if (!isFunction(node) || node.name !== 'exp' || node.args.length !== 1) return null;
		if (!isPositiveInfinity(node.args[0])) return null;
		return positiveInfinity();
	}
};

/**
 * exp(-∞) -> 0
 */
const expNegInf: TransformRule = {
	name: 'exp-neg-inf',
	transform(node: MathNode): MathNode | null {
		if (!isFunction(node) || node.name !== 'exp' || node.args.length !== 1) return null;
		if (!isNegativeInfinity(node.args[0])) return null;
		return number('0');
	}
};

/**
 * ln(+∞) -> +∞
 */
const lnPosInf: TransformRule = {
	name: 'ln-pos-inf',
	transform(node: MathNode): MathNode | null {
		if (!isFunction(node) || node.name !== 'ln' || node.args.length !== 1) return null;
		if (!isPositiveInfinity(node.args[0])) return null;
		return positiveInfinity();
	}
};

/**
 * arcsinh(+∞) -> +∞
 */
const arcsinhPosInf: TransformRule = {
	name: 'arcsinh-pos-inf',
	transform(node: MathNode): MathNode | null {
		if (!isFunction(node) || node.name !== 'arcsinh' || node.args.length !== 1) return null;
		if (!isPositiveInfinity(node.args[0])) return null;
		return positiveInfinity();
	}
};

/**
 * arccosh(+∞) -> +∞
 */
const arccoshPosInf: TransformRule = {
	name: 'arccosh-pos-inf',
	transform(node: MathNode): MathNode | null {
		if (!isFunction(node) || node.name !== 'arccosh' || node.args.length !== 1) return null;
		if (!isPositiveInfinity(node.args[0])) return null;
		return positiveInfinity();
	}
};

// =============================================================================
// Export
// =============================================================================

/**
 * All infinity transform rules.
 */
export const infinityTransforms: readonly TransformRule[] = [
	arctanPosInf,
	arctanNegInf,
	sinhPosInf,
	sinhNegInf,
	coshPosInf,
	coshNegInf,
	tanhPosInf,
	tanhNegInf,
	expPosInf,
	expNegInf,
	lnPosInf,
	arcsinhPosInf,
	arccoshPosInf
] as const;
