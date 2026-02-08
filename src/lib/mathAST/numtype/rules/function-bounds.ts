/**
 * Function Bounds Propagation
 *
 * Computes output bounds for builtin functions given input bounds,
 * using monotonicity data from the BUILTIN_RANGES registry.
 *
 * For monotone functions: f([a,b]) = [f(a), f(b)] or [f(b), f(a)]
 * For piecewise monotone: uses sampling at endpoints + critical points
 */

import type { Bounds } from '$lib/math/intervals/algebra';
import {
	getBuiltinRangeEntry,
	type BuiltinRangeEntry,
	type MonotonicInterval
} from '$lib/mathAST/domain/builtins';

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Apply a builtin function to input bounds using monotonicity analysis.
 *
 * Returns tighter bounds than the static range when input bounds are known.
 * Returns undefined when:
 * - Function is unknown (no registry entry)
 * - Function has no evaluator
 * - Input bounds are completely infinite (no finite endpoint)
 * - Computed output bounds are completely infinite
 *
 * @param name - Function name (case-insensitive)
 * @param inputBounds - Bounds of the function argument
 * @returns Computed output bounds, or undefined to fall back to static range
 */
export function applyFunctionToBounds(name: string, inputBounds: Bounds): Bounds | undefined {
	// No finite endpoint → can't improve on static range
	if (inputBounds.lower === null && inputBounds.upper === null) {
		return undefined;
	}

	const entry = getBuiltinRangeEntry(name);
	if (!entry || !entry.evaluate) {
		return undefined;
	}

	// Globally monotonic
	if (entry.monotonicity === 'increasing' || entry.monotonicity === 'decreasing') {
		return applyMonotoneToBounds(entry, inputBounds, entry.monotonicity);
	}

	// Piecewise monotonic
	if (entry.monotonicIntervals && entry.monotonicIntervals.length > 0) {
		// Check if input fits in a single piece
		const piece = findContainingPiece(inputBounds, entry.monotonicIntervals);
		if (piece) {
			return applyMonotoneToBounds(entry, inputBounds, piece.monotonicity);
		}
		// Spans multiple pieces → sampling
		return applySamplingToBounds(entry, inputBounds);
	}

	return undefined;
}

// =============================================================================
// Monotone Application
// =============================================================================

/**
 * Apply a monotone function to bounds.
 *
 * increasing: f([a,b]) = [f(a), f(b)]
 * decreasing: f([a,b]) = [f(b), f(a)]
 *
 * Handles infinite endpoints by falling back to the entry's static range.
 * Clamps output to the function's natural range.
 */
function applyMonotoneToBounds(
	entry: BuiltinRangeEntry,
	inputBounds: Bounds,
	monotonicity: 'increasing' | 'decreasing'
): Bounds | undefined {
	const evaluate = entry.evaluate!;

	let outputLower: number | null;
	let outputLowerInclusive: boolean;
	let outputUpper: number | null;
	let outputUpperInclusive: boolean;

	if (monotonicity === 'increasing') {
		// f([a, b]) = [f(a), f(b)]
		if (inputBounds.lower !== null) {
			const val = evaluate(inputBounds.lower);
			if (!isFinite(val)) {
				outputLower = val === -Infinity ? null : null;
				outputLowerInclusive = false;
			} else {
				outputLower = val;
				outputLowerInclusive = inputBounds.lowerInclusive;
			}
		} else {
			// x → -∞: use function's static lower bound
			outputLower = entry.lower;
			outputLowerInclusive = entry.lowerInclusive;
		}

		if (inputBounds.upper !== null) {
			const val = evaluate(inputBounds.upper);
			if (!isFinite(val)) {
				outputUpper = null;
				outputUpperInclusive = false;
			} else {
				outputUpper = val;
				outputUpperInclusive = inputBounds.upperInclusive;
			}
		} else {
			outputUpper = entry.upper;
			outputUpperInclusive = entry.upperInclusive;
		}
	} else {
		// Decreasing: f([a, b]) = [f(b), f(a)]
		if (inputBounds.upper !== null) {
			const val = evaluate(inputBounds.upper);
			if (!isFinite(val)) {
				outputLower = null;
				outputLowerInclusive = false;
			} else {
				outputLower = val;
				outputLowerInclusive = inputBounds.upperInclusive;
			}
		} else {
			outputLower = entry.lower;
			outputLowerInclusive = entry.lowerInclusive;
		}

		if (inputBounds.lower !== null) {
			const val = evaluate(inputBounds.lower);
			if (!isFinite(val)) {
				outputUpper = null;
				outputUpperInclusive = false;
			} else {
				outputUpper = val;
				outputUpperInclusive = inputBounds.lowerInclusive;
			}
		} else {
			outputUpper = entry.upper;
			outputUpperInclusive = entry.upperInclusive;
		}
	}

	// Clamp to function's natural range
	if (entry.lower !== null) {
		if (outputLower === null || outputLower < entry.lower) {
			outputLower = entry.lower;
			outputLowerInclusive = entry.lowerInclusive;
		}
	}
	if (entry.upper !== null) {
		if (outputUpper === null || outputUpper > entry.upper) {
			outputUpper = entry.upper;
			outputUpperInclusive = entry.upperInclusive;
		}
	}

	// If both sides are infinite, no improvement over static range
	if (outputLower === null && outputUpper === null) {
		return undefined;
	}

	return {
		lower: outputLower,
		lowerInclusive: outputLowerInclusive,
		upper: outputUpper,
		upperInclusive: outputUpperInclusive
	};
}

// =============================================================================
// Piecewise Containment Check
// =============================================================================

/**
 * Find if input bounds are contained within a single monotonic piece.
 */
function findContainingPiece(
	inputBounds: Bounds,
	pieces: MonotonicInterval[]
): MonotonicInterval | null {
	const inputStart = inputBounds.lower ?? -Infinity;
	const inputEnd = inputBounds.upper ?? Infinity;

	for (const piece of pieces) {
		const pieceStart = piece.inputStart ?? -Infinity;
		const pieceEnd = piece.inputEnd ?? Infinity;

		if (inputStart >= pieceStart && inputEnd <= pieceEnd) {
			return piece;
		}
	}
	return null;
}

// =============================================================================
// Sampling Fallback
// =============================================================================

/**
 * Apply a non-globally-monotone function using sampling at endpoints + critical points.
 *
 * Samples at:
 * 1. Input endpoints (if finite)
 * 2. Boundaries of monotonic intervals that fall within input range
 * 3. Additional uniform samples for periodic functions
 */
function applySamplingToBounds(entry: BuiltinRangeEntry, inputBounds: Bounds): Bounds | undefined {
	const evaluate = entry.evaluate!;
	const samples: number[] = [];

	const lo = inputBounds.lower ?? -10;
	const hi = inputBounds.upper ?? 10;

	// Sample at endpoints
	if (inputBounds.lower !== null) {
		const val = evaluate(inputBounds.lower);
		if (isFinite(val)) samples.push(val);
	}
	if (inputBounds.upper !== null) {
		const val = evaluate(inputBounds.upper);
		if (isFinite(val)) samples.push(val);
	}

	// Sample at critical points (monotonic interval boundaries within input range)
	if (entry.monotonicIntervals) {
		for (const piece of entry.monotonicIntervals) {
			if (piece.inputStart !== null && piece.inputStart >= lo && piece.inputStart <= hi) {
				const val = evaluate(piece.inputStart);
				if (isFinite(val)) samples.push(val);
			}
			if (piece.inputEnd !== null && piece.inputEnd >= lo && piece.inputEnd <= hi) {
				const val = evaluate(piece.inputEnd);
				if (isFinite(val)) samples.push(val);
			}
		}
	}

	// Additional uniform samples for better coverage
	const numSamples = 20;
	const step = (hi - lo) / numSamples;
	for (let i = 1; i < numSamples; i++) {
		const x = lo + i * step;
		if (isFinite(x)) {
			const val = evaluate(x);
			if (isFinite(val)) samples.push(val);
		}
	}

	if (samples.length === 0) {
		return undefined;
	}

	let minVal = Math.min(...samples);
	let maxVal = Math.max(...samples);

	// Clamp to function's natural range
	if (entry.lower !== null) minVal = Math.max(minVal, entry.lower);
	if (entry.upper !== null) maxVal = Math.min(maxVal, entry.upper);

	return {
		lower: minVal,
		lowerInclusive: true, // Conservative for sampling
		upper: maxVal,
		upperInclusive: true
	};
}
