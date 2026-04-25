/**
 * Critical Points Analysis — find zeros, extrema, and inflections of functions.
 *
 * Hybrid approach:
 * - Phase 1: Exact symbolic solving via mathAST solve()
 * - Phase 2: Numeric fallback via sign-change detection + bisection
 * - Phase 3: Deduplication (prefer exact over numeric)
 *
 * Used by both geometry-core (builtins zeros/extrema/inflections)
 * and grapheur (analysis module).
 *
 * @module mathAST/analysis/critical-points
 */

import type { MathNode, RelationNode } from '../types';
import type { CompiledFn } from '../eval/compile';
import { equals, number as mathNumber } from '../factory';
import { solve } from '../solve';
import { substitute } from '../eval/substitute';
import { evaluate } from '../eval/evaluate';

// =============================================================================
// Types
// =============================================================================

export interface CriticalPoint {
	/** x value as exact MathNode (symbolic if from solve, number node if numeric) */
	readonly x: MathNode;
	/** Numeric approximation of x */
	readonly xNumeric: number;
	/** y = f(x) as exact MathNode */
	readonly y: MathNode;
	/** Numeric approximation of y */
	readonly yNumeric: number;
	/** Whether the point was found by exact symbolic solving */
	readonly exact: boolean;
	/** Classification */
	readonly type: 'zero' | 'min' | 'max' | 'inflection';
}

// =============================================================================
// Constants
// =============================================================================

const NUM_SAMPLES = 200;
const BISECTION_ITERATIONS = 50;
const BISECTION_TOLERANCE = 1e-12;
const DEDUP_TOLERANCE = 1e-8;
const SIGN_CHECK_EPSILON = 1e-6;

// =============================================================================
// Main exports
// =============================================================================

/**
 * Find zeros of f(x) = 0 in [xMin, xMax].
 * Exact solving first, numeric bisection fallback.
 */
export function findCriticalZeros(
	expression: MathNode,
	compiledFn: CompiledFn,
	variable: string,
	xMin: number,
	xMax: number
): CriticalPoint[] {
	const equation = equals(expression, mathNumber('0')) as RelationNode;
	const exactPoints = solveExact(equation, expression, compiledFn, variable, xMin, xMax, 'zero');
	const numericPoints = findNumericZeros(compiledFn, xMin, xMax, 'zero');
	return deduplicateAndMerge(exactPoints, numericPoints, compiledFn, expression, variable);
}

/**
 * Find local extrema of f(x) in [xMin, xMax].
 * Solves f'(x) = 0, then classifies via sign change of f'.
 */
export function findCriticalExtrema(
	expression: MathNode,
	derivative: MathNode,
	compiledFn: CompiledFn,
	compiledDerivative: CompiledFn,
	variable: string,
	xMin: number,
	xMax: number
): CriticalPoint[] {
	// Find zeros of f'(x)
	const equation = equals(derivative, mathNumber('0')) as RelationNode;
	const exactCandidates = solveExact(
		equation,
		derivative,
		compiledDerivative,
		variable,
		xMin,
		xMax,
		'min' // placeholder, will be reclassified
	);
	const numericCandidates = findNumericZeros(compiledDerivative, xMin, xMax, 'min');
	const allCandidates = deduplicateAndMerge(
		exactCandidates,
		numericCandidates,
		compiledDerivative,
		derivative,
		variable
	);

	// Classify each candidate as min, max, or filter out
	return classifyExtrema(allCandidates, compiledFn, compiledDerivative, expression, variable);
}

/**
 * Find inflection points of f(x) in [xMin, xMax].
 * Solves f''(x) = 0, then verifies sign change of f''.
 */
export function findCriticalInflections(
	expression: MathNode,
	_derivative: MathNode,
	compiledFn: CompiledFn,
	_compiledDerivative: CompiledFn,
	compiledSecondDerivative: CompiledFn,
	variable: string,
	xMin: number,
	xMax: number
): CriticalPoint[] {
	// Find zeros of f''(x) numerically (exact solve of f'' is often complex)
	const numericCandidates = findNumericZeros(compiledSecondDerivative, xMin, xMax, 'inflection');

	// Verify sign change of f'' at each candidate
	return numericCandidates
		.filter((pt) => {
			const left = compiledSecondDerivative({ [variable]: pt.xNumeric - SIGN_CHECK_EPSILON });
			const right = compiledSecondDerivative({ [variable]: pt.xNumeric + SIGN_CHECK_EPSILON });
			if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
			return left * right < 0; // sign change
		})
		.map((pt) => {
			// Recompute y = f(x₀)
			const yNum = compiledFn({ [variable]: pt.xNumeric });
			return {
				...pt,
				yNumeric: Number.isFinite(yNum) ? yNum : 0,
				y: mathNumber(String(Number.isFinite(yNum) ? yNum : 0)),
				type: 'inflection' as const
			};
		});
}

// =============================================================================
// Phase 1: Exact solving
// =============================================================================

function solveExact(
	equation: RelationNode,
	_expression: MathNode,
	compiledFn: CompiledFn,
	variable: string,
	xMin: number,
	xMax: number,
	type: CriticalPoint['type']
): CriticalPoint[] {
	try {
		const result = solve(equation, { variable });

		if (
			result.status !== 'unique' &&
			result.status !== 'multiple' &&
			result.status !== 'approximate'
		) {
			return [];
		}

		const points: CriticalPoint[] = [];

		// Direct solutions
		for (const sol of result.solutions) {
			const xNum = sol.approximate ?? evaluateToNumber(sol.value);
			if (xNum === null || !Number.isFinite(xNum)) continue;
			if (xNum < xMin - DEDUP_TOLERANCE || xNum > xMax + DEDUP_TOLERANCE) continue;

			const yNum = compiledFn({ [variable]: xNum });
			points.push({
				x: sol.value,
				xNumeric: xNum,
				y: mathNumber(String(Number.isFinite(yNum) ? yNum : 0)),
				yNumeric: Number.isFinite(yNum) ? yNum : 0,
				exact: sol.exact,
				type
			});
		}

		// Periodic solutions (e.g., sin(x) = 0 → x = kπ)
		if (result.periodicSolutions) {
			const { baseSolutions, periodNumeric } = result.periodicSolutions;
			for (const base of baseSolutions) {
				const baseNum = base.approximate ?? evaluateToNumber(base.value);
				if (baseNum === null) continue;

				// Enumerate all instances in [xMin, xMax]
				const kMin = Math.ceil((xMin - baseNum) / periodNumeric);
				const kMax = Math.floor((xMax - baseNum) / periodNumeric);
				for (let k = kMin; k <= kMax; k++) {
					const xNum = baseNum + k * periodNumeric;
					if (xNum < xMin - DEDUP_TOLERANCE || xNum > xMax + DEDUP_TOLERANCE) continue;

					// Check not already present
					if (points.some((p) => Math.abs(p.xNumeric - xNum) < DEDUP_TOLERANCE)) continue;

					const yNum = compiledFn({ [variable]: xNum });
					points.push({
						x: mathNumber(String(xNum)),
						xNumeric: xNum,
						y: mathNumber(String(Number.isFinite(yNum) ? yNum : 0)),
						yNumeric: Number.isFinite(yNum) ? yNum : 0,
						exact: false, // expanded periodic, not symbolically exact
						type
					});
				}
			}
		}

		return points;
	} catch {
		// solve() threw — not solvable algebraically
		return [];
	}
}

function evaluateToNumber(node: MathNode): number | null {
	try {
		const result = evaluate(node, { mode: 'decimal' });
		if (result.status !== 'value') return null;
		const val = typeof result.value === 'number' ? result.value : Number(result.value);
		return Number.isFinite(val) ? val : null;
	} catch {
		return null;
	}
}

// =============================================================================
// Phase 2: Numeric fallback (sign-change + bisection)
// =============================================================================

function findNumericZeros(
	compiledFn: CompiledFn,
	xMin: number,
	xMax: number,
	type: CriticalPoint['type']
): CriticalPoint[] {
	const points: CriticalPoint[] = [];
	const step = (xMax - xMin) / NUM_SAMPLES;

	let prevX = xMin;
	let prevY = compiledFn({ x: prevX });

	for (let i = 1; i <= NUM_SAMPLES; i++) {
		const x = xMin + i * step;
		const y = compiledFn({ x });

		// Near-zero value
		if (Number.isFinite(y) && Math.abs(y) < BISECTION_TOLERANCE) {
			if (!points.some((p) => Math.abs(p.xNumeric - x) < step)) {
				points.push(makeNumericPoint(x, compiledFn({ x }), type));
			}
		}
		// Sign change → bisect
		else if (Number.isFinite(prevY) && Number.isFinite(y) && prevY * y < 0) {
			const rootX = bisect(compiledFn, prevX, x);
			if (rootX !== null && !isAsymptote(compiledFn, rootX)) {
				if (!points.some((p) => Math.abs(p.xNumeric - rootX) < DEDUP_TOLERANCE)) {
					points.push(makeNumericPoint(rootX, compiledFn({ x: rootX }), type));
				}
			}
		}

		prevX = x;
		prevY = y;
	}

	return points;
}

function bisect(compiledFn: CompiledFn, xLow: number, xHigh: number): number | null {
	let lo = xLow;
	let hi = xHigh;

	for (let i = 0; i < BISECTION_ITERATIONS; i++) {
		const mid = (lo + hi) / 2;
		if (hi - lo < BISECTION_TOLERANCE) return mid;

		const yLo = compiledFn({ x: lo });
		const yMid = compiledFn({ x: mid });

		if (!Number.isFinite(yLo) || !Number.isFinite(yMid)) return null;

		if (yLo * yMid <= 0) {
			hi = mid;
		} else {
			lo = mid;
		}
	}

	return (lo + hi) / 2;
}

/** Filter out false positives from asymptotes (like 1/x crossing zero axis). */
function isAsymptote(compiledFn: CompiledFn, x: number): boolean {
	const y = compiledFn({ x });
	if (!Number.isFinite(y)) return true;

	// Check if function is very large near x (asymptote signature)
	const yLeft = compiledFn({ x: x - 1e-4 });
	const yRight = compiledFn({ x: x + 1e-4 });
	if (!Number.isFinite(yLeft) || !Number.isFinite(yRight)) return true;

	// If nearby values have very large magnitude and opposite signs → asymptote
	if (yLeft * yRight < 0 && Math.abs(yLeft) > 1000 && Math.abs(yRight) > 1000) return true;

	return false;
}

function makeNumericPoint(x: number, y: number, type: CriticalPoint['type']): CriticalPoint {
	const yVal = Number.isFinite(y) ? y : 0;
	return {
		x: mathNumber(String(x)),
		xNumeric: x,
		y: mathNumber(String(yVal)),
		yNumeric: yVal,
		exact: false,
		type
	};
}

// =============================================================================
// Phase 3: Deduplication
// =============================================================================

function deduplicateAndMerge(
	exactPoints: CriticalPoint[],
	numericPoints: CriticalPoint[],
	compiledFn: CompiledFn,
	expression: MathNode,
	variable: string
): CriticalPoint[] {
	const merged = [...exactPoints];

	for (const numPt of numericPoints) {
		// Skip if an exact point is nearby
		if (exactPoints.some((ep) => Math.abs(ep.xNumeric - numPt.xNumeric) < DEDUP_TOLERANCE)) {
			continue;
		}
		merged.push(numPt);
	}

	// Recompute exact y values where possible
	return merged
		.map((pt) => {
			if (pt.exact) {
				// Try exact evaluation of f(x)
				try {
					const substituted = substitute(expression, { [variable]: pt.x });
					const result = evaluate(substituted, { mode: 'decimal' });
					if (result.status === 'value') {
						const yExact = typeof result.value === 'number' ? result.value : Number(result.value);
						if (Number.isFinite(yExact)) {
							return { ...pt, y: substituted, yNumeric: yExact };
						}
					}
				} catch {
					// fallback to compiled
				}
			}
			return pt;
		})
		.sort((a, b) => a.xNumeric - b.xNumeric);
}

// =============================================================================
// Extrema classification
// =============================================================================

function classifyExtrema(
	candidates: CriticalPoint[],
	compiledFn: CompiledFn,
	compiledDerivative: CompiledFn,
	expression: MathNode,
	variable: string
): CriticalPoint[] {
	const result: CriticalPoint[] = [];

	for (const pt of candidates) {
		const x0 = pt.xNumeric;
		const leftDeriv = compiledDerivative({ [variable]: x0 - SIGN_CHECK_EPSILON });
		const rightDeriv = compiledDerivative({ [variable]: x0 + SIGN_CHECK_EPSILON });

		if (!Number.isFinite(leftDeriv) || !Number.isFinite(rightDeriv)) continue;

		// No sign change → not an extremum (e.g., x^3 at 0)
		if (leftDeriv * rightDeriv >= 0) continue;

		const type: 'min' | 'max' = leftDeriv > 0 && rightDeriv < 0 ? 'max' : 'min';

		// Compute y = f(x₀)
		const yNum = compiledFn({ [variable]: x0 });
		if (!Number.isFinite(yNum)) continue;

		// Try exact y if point was exact
		let y: MathNode = mathNumber(String(yNum));
		if (pt.exact) {
			try {
				const substituted = substitute(expression, { [variable]: pt.x });
				const evalResult = evaluate(substituted, { mode: 'decimal' });
				if (evalResult.status === 'value') {
					y = substituted;
				}
			} catch {
				// keep numeric y
			}
		}

		result.push({
			x: pt.x,
			xNumeric: x0,
			y,
			yNumeric: yNum,
			exact: pt.exact,
			type
		});
	}

	return result;
}
