/**
 * Fonctions BORNÉES, bornes lues sur la structure de l'expression.
 *
 * sin x, cos x n'ont pas de limite en +∞, mais restent dans [−1, 1] : c'est
 * assez pour conclure x + sin x → +∞, (2 + sin x)/x → 0, x(2 + sin x) → +∞.
 * L'échantillonnage numérique ne le voit pas (les valeurs ne se stabilisent
 * pas) : les bornes viennent donc de la forme, jamais d'évaluations en des
 * points.
 *
 * @module mathAST/limits/bounded
 */

import type { MathNode } from '../types';
import {
	isAddition,
	isSubtraction,
	isMultiplication,
	isDivision,
	isOpposite,
	isPositive,
	isDelimiter,
	isFunction,
	isSuperscript
} from '../guards';
import { containsVariable } from '../common/contains-variable';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';

/** Intervalle fermé [min, max] contenant toutes les valeurs de l'expression. */
export interface Bounds {
	readonly min: number;
	readonly max: number;
}

/** Fonctions à valeurs dans [−1, 1] quel que soit leur argument. */
const UNIT_BOUNDED_FUNCTIONS = new Set(['sin', 'cos']);

/**
 * Bornes structurelles de `expr` vue comme fonction de `varName`, ou `null`
 * si la forme ne prouve pas qu'elle est bornée. Une constante c est bornée
 * par [c, c].
 */
export function structuralBounds(expr: MathNode, varName: string): Bounds | null {
	if (!containsVariable(expr, varName)) {
		const value = constantValue(expr);
		return value === null ? null : { min: value, max: value };
	}

	if (isDelimiter(expr)) return structuralBounds(expr.content, varName);
	if (isPositive(expr)) return structuralBounds(expr.operand, varName);

	if (isOpposite(expr)) {
		const inner = structuralBounds(expr.operand, varName);
		return inner === null ? null : { min: -inner.max, max: -inner.min };
	}

	if (isFunction(expr) && expr.args.length === 1 && !expr.power && !expr.isInverse) {
		if (UNIT_BOUNDED_FUNCTIONS.has(expr.name)) return { min: -1, max: 1 };
		if (expr.name === 'abs') {
			const inner = structuralBounds(expr.args[0], varName);
			return inner === null ? null : absBounds(inner);
		}
		return null;
	}

	if (isAddition(expr) || isSubtraction(expr)) {
		const left = structuralBounds(expr.left, varName);
		const right = structuralBounds(expr.right, varName);
		if (left === null || right === null) return null;
		return isAddition(expr)
			? { min: left.min + right.min, max: left.max + right.max }
			: { min: left.min - right.max, max: left.max - right.min };
	}

	if (isMultiplication(expr)) {
		const left = structuralBounds(expr.left, varName);
		const right = structuralBounds(expr.right, varName);
		if (left === null || right === null) return null;
		return productBounds(left, right);
	}

	if (isDivision(expr)) {
		const numerator = structuralBounds(expr.numerator, varName);
		const denominator = structuralBounds(expr.denominator, varName);
		if (numerator === null || denominator === null || !hasStrictSign(denominator)) return null;
		return productBounds(numerator, { min: 1 / denominator.max, max: 1 / denominator.min });
	}

	if (isSuperscript(expr) && !containsVariable(expr.superscript, varName)) {
		const exponent = constantValue(expr.superscript);
		if (exponent === null || !Number.isInteger(exponent) || exponent < 1) return null;
		const base = structuralBounds(expr.base, varName);
		if (base === null) return null;
		if (exponent % 2 === 0) {
			const abs = absBounds(base);
			return { min: abs.min ** exponent, max: abs.max ** exponent };
		}
		return { min: base.min ** exponent, max: base.max ** exponent };
	}

	return null;
}

/** Les bornes excluent 0 : la fonction garde un signe strict. */
export function hasStrictSign(bounds: Bounds): boolean {
	return bounds.min > 0 || bounds.max < 0;
}

function absBounds(bounds: Bounds): Bounds {
	if (bounds.min >= 0) return bounds;
	if (bounds.max <= 0) return { min: -bounds.max, max: -bounds.min };
	return { min: 0, max: Math.max(-bounds.min, bounds.max) };
}

function productBounds(a: Bounds, b: Bounds): Bounds {
	const products = [a.min * b.min, a.min * b.max, a.max * b.min, a.max * b.max];
	return { min: Math.min(...products), max: Math.max(...products) };
}

function constantValue(node: MathNode): number | null {
	try {
		const value = evaluateNodeToApproximatedNumber(node);
		return Number.isFinite(value) ? value : null;
	} catch {
		return null;
	}
}
