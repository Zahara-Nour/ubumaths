/**
 * Generic root-finding: find x values where h(x) = 0 in [xMin, xMax].
 *
 * Hybrid approach:
 * - Phase 1: Exact symbolic solving via solve()
 * - Phase 2: Numeric fallback via sign-change detection + bisection
 * - Phase 3: Deduplication (prefer exact over numeric)
 *
 * Factored out of findCriticalZeros for reuse (e.g. function intersections).
 *
 * @module mathAST/analysis/roots
 */

import type { MathNode, RelationNode } from '../types';
import type { CompiledFn } from '../eval/compile';
import { equals, number as mathNumber } from '../factory';
import { solve } from '../solve';
import { evaluate } from '../eval/evaluate';
import { calculateComplexity } from './expression-classify';

// =============================================================================
// Types
// =============================================================================

export interface RootResult {
	/** Numeric x value of the root */
	readonly x: number;
	/** Whether the root was found by exact symbolic solving */
	readonly exact: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const NUM_SAMPLES = 200;
const BISECTION_ITERATIONS = 50;
const BISECTION_TOLERANCE = 1e-12;
const DEDUP_TOLERANCE = 1e-8;
/** Skip symbolic solve() for expressions above this complexity threshold.
 *  Prevents solve() from hanging on deeply nested ASTs (e.g., from courbe() + intersectLF). */
const MAX_SOLVE_COMPLEXITY = 30;

// =============================================================================
// Main export
// =============================================================================

/**
 * Find roots of h(x) = 0 in [xMin, xMax].
 *
 * Strategy: exact symbolic via solve() first, numeric bisection fallback.
 * Results are sorted by x ascending and deduplicated.
 */
export function findRoots(
	expression: MathNode,
	compiledFn: CompiledFn,
	variable: string,
	xMin: number,
	xMax: number
): RootResult[] {
	const exactRoots = solveExactRoots(expression, variable, xMin, xMax);
	const numericRoots = findNumericRoots(compiledFn, variable, xMin, xMax);
	return deduplicateRoots(exactRoots, numericRoots);
}

// =============================================================================
// Phase 1: Exact solving
// =============================================================================

function solveExactRoots(
	expression: MathNode,
	variable: string,
	xMin: number,
	xMax: number
): RootResult[] {
	// Skip symbolic solving for overly complex ASTs (e.g., from intersectLF with float coefficients).
	// solve() can hang on deeply nested expressions with non-integer number nodes.
	if (calculateComplexity(expression) > MAX_SOLVE_COMPLEXITY) {
		return [];
	}

	try {
		const equation = equals(expression, mathNumber('0')) as RelationNode;
		const result = solve(equation, { variable });

		if (
			result.status !== 'unique' &&
			result.status !== 'multiple' &&
			result.status !== 'approximate'
		) {
			return [];
		}

		const roots: RootResult[] = [];

		// Direct solutions
		for (const sol of result.solutions) {
			const xNum = sol.approximate ?? evaluateToNumber(sol.value);
			if (xNum === null || !Number.isFinite(xNum)) continue;
			if (xNum < xMin - DEDUP_TOLERANCE || xNum > xMax + DEDUP_TOLERANCE) continue;

			// Avoid duplicates within exact results
			if (roots.some((r) => Math.abs(r.x - xNum) < DEDUP_TOLERANCE)) continue;

			roots.push({ x: xNum, exact: sol.exact });
		}

		// Periodic solutions (e.g., sin(x) = 0 -> x = k*pi)
		if (result.periodicSolutions) {
			const { baseSolutions, periodNumeric } = result.periodicSolutions;
			for (const base of baseSolutions) {
				const baseNum = base.approximate ?? evaluateToNumber(base.value);
				if (baseNum === null) continue;

				const kMin = Math.ceil((xMin - baseNum) / periodNumeric);
				const kMax = Math.floor((xMax - baseNum) / periodNumeric);
				for (let k = kMin; k <= kMax; k++) {
					const xNum = baseNum + k * periodNumeric;
					if (xNum < xMin - DEDUP_TOLERANCE || xNum > xMax + DEDUP_TOLERANCE) continue;
					if (roots.some((r) => Math.abs(r.x - xNum) < DEDUP_TOLERANCE)) continue;

					roots.push({ x: xNum, exact: false });
				}
			}
		}

		return roots;
	} catch {
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

function findNumericRoots(
	compiledFn: CompiledFn,
	variable: string,
	xMin: number,
	xMax: number
): RootResult[] {
	const roots: RootResult[] = [];
	const step = (xMax - xMin) / NUM_SAMPLES;

	let prevX = xMin;
	let prevY = compiledFn({ [variable]: prevX });

	for (let i = 1; i <= NUM_SAMPLES; i++) {
		const x = xMin + i * step;
		const y = compiledFn({ [variable]: x });

		// Near-zero value
		if (Number.isFinite(y) && Math.abs(y) < BISECTION_TOLERANCE) {
			if (!roots.some((r) => Math.abs(r.x - x) < step)) {
				roots.push({ x, exact: false });
			}
		}
		// Sign change -> bisect
		else if (Number.isFinite(prevY) && Number.isFinite(y) && prevY * y < 0) {
			const rootX = bisect(compiledFn, variable, prevX, x);
			if (rootX !== null && !isAsymptote(compiledFn, variable, rootX)) {
				if (!roots.some((r) => Math.abs(r.x - rootX) < DEDUP_TOLERANCE)) {
					roots.push({ x: rootX, exact: false });
				}
			}
		}

		prevX = x;
		prevY = y;
	}

	return roots;
}

function bisect(
	compiledFn: CompiledFn,
	variable: string,
	xLow: number,
	xHigh: number
): number | null {
	let lo = xLow;
	let hi = xHigh;

	for (let i = 0; i < BISECTION_ITERATIONS; i++) {
		const mid = (lo + hi) / 2;
		if (hi - lo < BISECTION_TOLERANCE) return mid;

		const yLo = compiledFn({ [variable]: lo });
		const yMid = compiledFn({ [variable]: mid });

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
function isAsymptote(compiledFn: CompiledFn, variable: string, x: number): boolean {
	const y = compiledFn({ [variable]: x });
	if (!Number.isFinite(y)) return true;

	const yLeft = compiledFn({ [variable]: x - 1e-4 });
	const yRight = compiledFn({ [variable]: x + 1e-4 });
	if (!Number.isFinite(yLeft) || !Number.isFinite(yRight)) return true;

	if (yLeft * yRight < 0 && Math.abs(yLeft) > 1000 && Math.abs(yRight) > 1000) return true;

	return false;
}

// =============================================================================
// Phase 3: Deduplication
// =============================================================================

function deduplicateRoots(exactRoots: RootResult[], numericRoots: RootResult[]): RootResult[] {
	const merged = [...exactRoots];

	for (const nr of numericRoots) {
		if (exactRoots.some((er) => Math.abs(er.x - nr.x) < DEDUP_TOLERANCE)) {
			continue;
		}
		merged.push(nr);
	}

	return merged.sort((a, b) => a.x - b.x);
}
