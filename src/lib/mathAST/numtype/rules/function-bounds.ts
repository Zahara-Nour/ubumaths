/**
 * Symbolic Function Bounds Propagation
 *
 * Computes output bounds for builtin functions given input bounds,
 * using monotonicity analysis with symbolic MathNode endpoints.
 *
 * Like computePowerBounds (power.ts), this exploits single-variable
 * monotonicity — not the four-corners theorem (arithmetic.ts):
 *
 * - **Tier 4 — Monotone functions** (exp, ln, sqrt, arctan, arcsin, sinh, tanh):
 *   f([a,b]) = [f(a), f(b)]  (increasing)
 *   f([a,b]) = [f(b), f(a)]  (decreasing)
 *   Result endpoints are symbolic MathNode trees: e.g., exp([0, π]) → [exp(0), exp(π)]
 *
 * - **Tier 5 — Non-monotone functions** (sin, cos, tan, cot, sec, csc):
 *   Return undefined — these are handled by computeRange in Phase 4.
 */

import type { MathNode } from '../../types';
import type { IntervalDomain, EndpointType } from '$lib/math/intervals/types';
import {
	isPositiveInfinity,
	isNegativeInfinity,
	getEndpoints,
	buildInterval
} from '$lib/math/intervals';
import { func as funcNode, sqrt as sqrtNode, infinity, number as numberNode } from '../../factory';
import { compareNumericNodes } from '../../eval/compare-numeric';

const ZERO = numberNode('0');
const ONE = numberNode('1');
const NEG_ONE = numberNode('-1');

// =============================================================================
// Monotone function registry
// =============================================================================

type Monotonicity = 'increasing' | 'decreasing';

interface MonotoneFunctionInfo {
	monotonicity: Monotonicity;
	/** Build symbolic MathNode for f(endpoint) */
	apply: (endpoint: MathNode) => MathNode;
	/** Domain check: returns false if endpoint is outside the function's domain */
	domainCheck?: (lo: Endpoint, hi: Endpoint) => boolean;
	/** Static lower bound of the function's range (as MathNode), if any */
	rangeLower?: { value: MathNode; type: EndpointType };
	/** Static upper bound of the function's range (as MathNode), if any */
	rangeUpper?: { value: MathNode; type: EndpointType };
}

/**
 * Registry of monotone functions for Tier 4 symbolic bounds propagation.
 */
const MONOTONE_FUNCTIONS: Record<string, MonotoneFunctionInfo> = {
	exp: {
		monotonicity: 'increasing',
		apply: (x) => funcNode('exp', [x]),
		// exp: ℝ → (0, +∞), static lower bound is 0 (open)
		rangeLower: { value: ZERO, type: 'open' }
	},
	ln: {
		monotonicity: 'increasing',
		apply: (x) => funcNode('ln', [x]),
		// ln requires x > 0
		domainCheck: (lo) => {
			if (isNegativeInfinity(lo.value)) return false;
			const cmp = compareNumericNodes(lo.value, ZERO);
			return cmp === 1 || (cmp === 0 && lo.type === 'open');
		}
	},
	log: {
		monotonicity: 'increasing',
		apply: (x) => funcNode('log', [x]),
		domainCheck: (lo) => {
			if (isNegativeInfinity(lo.value)) return false;
			const cmp = compareNumericNodes(lo.value, ZERO);
			return cmp === 1 || (cmp === 0 && lo.type === 'open');
		}
	},
	sqrt: {
		monotonicity: 'increasing',
		apply: (x) => sqrtNode(x),
		// sqrt requires x >= 0
		domainCheck: (lo) => {
			if (isNegativeInfinity(lo.value)) return false;
			const cmp = compareNumericNodes(lo.value, ZERO);
			return cmp === 1 || cmp === 0;
		},
		rangeLower: { value: ZERO, type: 'closed' }
	},
	arctan: {
		monotonicity: 'increasing',
		apply: (x) => funcNode('arctan', [x])
		// arctan: ℝ → (-π/2, π/2), no domain restriction
	},
	arcsin: {
		monotonicity: 'increasing',
		apply: (x) => funcNode('arcsin', [x]),
		// arcsin requires -1 <= x <= 1
		domainCheck: (lo, hi) => {
			if (isNegativeInfinity(lo.value) || isPositiveInfinity(hi.value)) return false;
			const loCmp = compareNumericNodes(lo.value, NEG_ONE);
			const hiCmp = compareNumericNodes(hi.value, ONE);
			if (loCmp === undefined || hiCmp === undefined) return false;
			return loCmp >= 0 && hiCmp <= 0;
		}
	},
	arccos: {
		monotonicity: 'decreasing',
		apply: (x) => funcNode('arccos', [x]),
		// arccos requires -1 <= x <= 1
		domainCheck: (lo, hi) => {
			if (isNegativeInfinity(lo.value) || isPositiveInfinity(hi.value)) return false;
			const loCmp = compareNumericNodes(lo.value, NEG_ONE);
			const hiCmp = compareNumericNodes(hi.value, ONE);
			if (loCmp === undefined || hiCmp === undefined) return false;
			return loCmp >= 0 && hiCmp <= 0;
		}
	},
	sinh: {
		monotonicity: 'increasing',
		apply: (x) => funcNode('sinh', [x])
		// sinh: ℝ → ℝ, no domain restriction
	},
	tanh: {
		monotonicity: 'increasing',
		apply: (x) => funcNode('tanh', [x])
		// tanh: ℝ → (-1, 1), no domain restriction
	},
	arcsinh: {
		monotonicity: 'increasing',
		apply: (x) => funcNode('arcsinh', [x])
	},
	arctanh: {
		monotonicity: 'increasing',
		apply: (x) => funcNode('arctanh', [x]),
		domainCheck: (lo, hi) => {
			if (isNegativeInfinity(lo.value) || isPositiveInfinity(hi.value)) return false;
			const loCmp = compareNumericNodes(lo.value, NEG_ONE);
			const hiCmp = compareNumericNodes(hi.value, ONE);
			if (loCmp === undefined || hiCmp === undefined) return false;
			// Strict: -1 < x < 1
			return loCmp === 1 && hiCmp === -1;
		}
	},
	arccosh: {
		monotonicity: 'increasing',
		apply: (x) => funcNode('arccosh', [x]),
		// arccosh requires x >= 1
		domainCheck: (lo) => {
			if (isNegativeInfinity(lo.value)) return false;
			const cmp = compareNumericNodes(lo.value, ONE);
			return cmp === 1 || cmp === 0;
		}
	}
};

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Apply a builtin function to input bounds using symbolic monotonicity analysis.
 *
 * For Tier 4 monotone functions: builds symbolic MathNode endpoints.
 * For Tier 5 non-monotone functions: returns undefined.
 *
 * @param name - Function name (case-insensitive)
 * @param inputBounds - IntervalDomain bounds of the function argument
 * @returns Computed output IntervalDomain, or undefined for non-monotone / unknown
 */
export function applyFunctionToBounds(
	name: string,
	inputBounds: IntervalDomain
): IntervalDomain | undefined {
	const lowerName = name.toLowerCase();
	const info = MONOTONE_FUNCTIONS[lowerName];
	if (!info) {
		// Tier 5: non-monotone or unknown function — no symbolic propagation
		return undefined;
	}

	const endpoints = getEndpoints(inputBounds);
	if (!endpoints) return undefined;

	// Check domain requirement
	if (info.domainCheck && !info.domainCheck(endpoints.lo, endpoints.hi)) {
		return undefined;
	}

	const { lo, hi } = endpoints;
	const loIsInf = isNegativeInfinity(lo.value);
	const hiIsInf = isPositiveInfinity(hi.value);

	if (info.monotonicity === 'increasing') {
		// f([a, b]) = [f(a), f(b)]
		const resultLo = loIsInf
			? (info.rangeLower ?? { value: infinity('negative'), type: 'open' as EndpointType })
			: { value: info.apply(lo.value), type: lo.type };
		const resultHi = hiIsInf
			? (info.rangeUpper ?? { value: infinity('positive'), type: 'open' as EndpointType })
			: { value: info.apply(hi.value), type: hi.type };

		return buildInterval(resultLo, resultHi);
	}

	// Decreasing: f([a, b]) = [f(b), f(a)]
	const resultLo = hiIsInf
		? (info.rangeLower ?? { value: infinity('negative'), type: 'open' as EndpointType })
		: { value: info.apply(hi.value), type: hi.type };
	const resultHi = loIsInf
		? (info.rangeUpper ?? { value: infinity('positive'), type: 'open' as EndpointType })
		: { value: info.apply(lo.value), type: lo.type };

	return buildInterval(resultLo, resultHi);
}
