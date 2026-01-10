/**
 * MathAST Numeric Comparison
 *
 * Compares two MathNodes by their numeric values.
 * Uses exact arithmetic where possible to avoid floating-point precision issues.
 */

import type { MathNode } from '../types';
import type { ComparisonResult } from '../normal/types';
import { isNumber, isInfinity, isPositiveInfinity, isNegativeInfinity } from '../guards';
import { subtract } from '../factory';
import { evaluate } from './evaluate';

/**
 * Compares two MathNodes by their numeric values.
 *
 * Algorithm:
 * 1. Handle InfinityNode specially (evaluate doesn't support it)
 * 2. Compute diff = a - b
 * 3. Evaluate in exact mode to detect exact equality (e.g., sqrt(2) - sqrt(2) = 0)
 * 4. If not zero, evaluate in decimal mode to determine sign
 *
 * @param a - First MathNode
 * @param b - Second MathNode
 * @returns -1 if a < b, 0 if a = b, 1 if a > b, undefined if incomparable
 *
 * @example
 * compareNumericNodes(number('5'), number('3')) // 1
 * compareNumericNodes(number('2'), number('7')) // -1
 * compareNumericNodes(number('4'), number('4')) // 0
 * compareNumericNodes(variable('x'), number('3')) // undefined
 */
export function compareNumericNodes(a: MathNode, b: MathNode): ComparisonResult | undefined {
	// Step 0: Handle InfinityNode specially (evaluate doesn't support it)
	const aIsInfinity = isInfinity(a);
	const bIsInfinity = isInfinity(b);

	if (aIsInfinity || bIsInfinity) {
		return compareWithInfinity(a, b, aIsInfinity, bIsInfinity);
	}

	try {
		// Step 1: Compute difference
		const diff = subtract(a, b);

		// Step 2: Evaluate in exact mode
		const exactResult = evaluate(diff, { mode: 'exact' });

		// Step 3: Check for exact zero
		// In exact mode, value is always a MathNode (not number or ComplexValueResult)
		const exactValue = exactResult.value;
		if (
			typeof exactValue === 'object' &&
			'type' in exactValue &&
			isNumber(exactValue) &&
			exactValue.value === '0'
		) {
			return 0;
		}

		// Step 4: Evaluate in decimal mode to get numeric value
		const decimalResult = evaluate(exactResult.node, { mode: 'decimal' });

		// Step 5: Determine sign
		if (typeof decimalResult.value === 'number') {
			if (Number.isNaN(decimalResult.value)) {
				return undefined;
			}
			if (decimalResult.value > 0) return 1;
			if (decimalResult.value < 0) return -1;
			return 0;
		}

		// Complex number result - no total ordering
		return undefined;
	} catch {
		// Evaluation failed (free variables, etc.)
		return undefined;
	}
}

/**
 * Handles comparison when at least one operand is an InfinityNode.
 */
function compareWithInfinity(
	a: MathNode,
	b: MathNode,
	aIsInfinity: boolean,
	bIsInfinity: boolean
): ComparisonResult | undefined {
	const aPosInf = isPositiveInfinity(a);
	const aNegInf = isNegativeInfinity(a);
	const bPosInf = isPositiveInfinity(b);
	const bNegInf = isNegativeInfinity(b);

	// Both are infinity
	if (aIsInfinity && bIsInfinity) {
		// Same sign → equal
		if ((aPosInf && bPosInf) || (aNegInf && bNegInf)) {
			return 0;
		}
		// +∞ > -∞
		if (aPosInf && bNegInf) return 1;
		// -∞ < +∞
		if (aNegInf && bPosInf) return -1;
	}

	// a is infinity, b is finite
	if (aIsInfinity && !bIsInfinity) {
		return aPosInf ? 1 : -1;
	}

	// a is finite, b is infinity
	if (!aIsInfinity && bIsInfinity) {
		return bPosInf ? -1 : 1;
	}

	// Should not reach here
	return undefined;
}
