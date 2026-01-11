/**
 * Monotonicity - Converting sign of f'(x) to monotonicity
 *
 * This module provides functions to convert sign analysis results of a derivative
 * into monotonicity information (increasing, decreasing, constant).
 *
 * The relationship between derivative sign and monotonicity:
 * - f'(x) > 0 on interval => f is increasing on interval
 * - f'(x) < 0 on interval => f is decreasing on interval
 * - f'(x) = 0 on interval => f is constant on interval
 *
 * @module mathAST/variations/monotonicity
 */

import type { Interval } from '$lib/math/intervals/types';
import type { Sign, SignedInterval, SignAnalysisResult } from '../sign/types';
import type { Monotonicity, MonotonicInterval } from './types';
import { endpointToNumber } from '$lib/math/intervals/endpoint';

// =============================================================================
// Sign to Monotonicity Conversion
// =============================================================================

/**
 * Convert a sign to monotonicity.
 *
 * The derivative's sign determines the function's monotonicity:
 * - positive => increasing (f' > 0 means f goes up)
 * - negative => decreasing (f' < 0 means f goes down)
 * - zero => constant (f' = 0 means f is flat)
 * - unknown => unknown (cannot determine)
 *
 * @param sign - The sign of the derivative
 * @returns The corresponding monotonicity
 *
 * @example
 * signToMonotonicity('positive') // 'increasing'
 * signToMonotonicity('negative') // 'decreasing'
 * signToMonotonicity('zero')     // 'constant'
 * signToMonotonicity('unknown')  // 'unknown'
 */
export function signToMonotonicity(sign: Sign): Monotonicity {
	switch (sign) {
		case 'positive':
			return 'increasing';
		case 'negative':
			return 'decreasing';
		case 'zero':
			return 'constant';
		case 'unknown':
			return 'unknown';
	}
}

/**
 * Convert monotonicity back to derivative sign.
 *
 * Inverse of signToMonotonicity.
 *
 * @param monotonicity - The monotonicity
 * @returns The corresponding derivative sign
 */
export function monotonicityToSign(monotonicity: Monotonicity): Sign {
	switch (monotonicity) {
		case 'increasing':
			return 'positive';
		case 'decreasing':
			return 'negative';
		case 'constant':
			return 'zero';
		case 'unknown':
			return 'unknown';
	}
}

// =============================================================================
// Building Monotonic Intervals
// =============================================================================

/**
 * Build monotonic intervals from a sign analysis result.
 *
 * Converts each signed interval from the derivative's sign analysis
 * into a monotonic interval showing where the function increases/decreases.
 *
 * @param signResult - The sign analysis result of the derivative
 * @returns Array of monotonic intervals
 *
 * @example
 * // Sign analysis of f'(x) = 2x:
 * // - negative on ]-infinity, 0[
 * // - zero at x = 0
 * // - positive on ]0, +infinity[
 * //
 * // Monotonic intervals:
 * // - decreasing on ]-infinity, 0[
 * // - constant at x = 0 (point interval)
 * // - increasing on ]0, +infinity[
 */
export function buildMonotonicIntervals(signResult: SignAnalysisResult): MonotonicInterval[] {
	const monotonicIntervals: MonotonicInterval[] = [];

	for (const signedInterval of signResult.signedIntervals) {
		const monotonicity = signToMonotonicity(signedInterval.sign);
		const derivativeSign = signToDerivativeSignLabel(signedInterval.sign);

		monotonicIntervals.push({
			interval: signedInterval.interval,
			monotonicity,
			derivativeSign,
			reason: buildMonotonicityReason(signedInterval, signResult.variable)
		});
	}

	return monotonicIntervals;
}

/**
 * Merge adjacent intervals with the same monotonicity.
 *
 * This simplifies the output by combining intervals that have the same behavior.
 * Point intervals at zeros are excluded from merging (they represent critical points).
 *
 * @param intervals - Array of monotonic intervals to merge
 * @returns Array with adjacent same-monotonicity intervals merged
 *
 * @example
 * // Input: [decreasing on ]-2, 0[, constant at 0, increasing on ]0, 2[, increasing on ]2, 3[]
 * // Output: [decreasing on ]-2, 0[, constant at 0, increasing on ]0, 3[]
 */
export function mergeMonotonicIntervals(
	intervals: readonly MonotonicInterval[]
): MonotonicInterval[] {
	if (intervals.length === 0) {
		return [];
	}

	const result: MonotonicInterval[] = [];
	let current = intervals[0];

	for (let i = 1; i < intervals.length; i++) {
		const next = intervals[i];

		// Check if we can merge: same monotonicity and adjacent
		if (
			current.monotonicity === next.monotonicity &&
			!isPointInterval(current.interval) &&
			!isPointInterval(next.interval) &&
			areIntervalsAdjacent(current.interval, next.interval)
		) {
			// Merge by extending current interval to include next
			current = {
				interval: mergeAdjacentIntervals(current.interval, next.interval),
				monotonicity: current.monotonicity,
				derivativeSign: current.derivativeSign,
				reason: current.reason // Keep the first reason
			};
		} else {
			// Can't merge, push current and move to next
			result.push(current);
			current = next;
		}
	}

	// Push the last interval
	result.push(current);

	return result;
}

// =============================================================================
// French Description Functions
// =============================================================================

/**
 * Get a French description of the monotonicity.
 *
 * Used for pedagogical display in the variation table.
 *
 * @param monotonicity - The monotonicity type
 * @param variable - The variable name (e.g., 'x')
 * @returns French description string
 *
 * @example
 * getMonotonicityDescription('increasing', 'x')
 * // "f est strictement croissante"
 *
 * getMonotonicityDescription('decreasing', 't')
 * // "f est strictement decroissante"
 */
export function getMonotonicityDescription(monotonicity: Monotonicity, _variable: string): string {
	switch (monotonicity) {
		case 'increasing':
			return `f est strictement croissante`;
		case 'decreasing':
			return `f est strictement decroissante`;
		case 'constant':
			return `f est constante`;
		case 'unknown':
			return `La monotonie de f ne peut pas etre determinee`;
	}
}

/**
 * Get a French description of the derivative sign.
 *
 * @param sign - The sign of the derivative
 * @param variable - The variable name
 * @returns French description of why the function has this monotonicity
 */
export function getDerivativeSignDescription(sign: Sign, variable: string): string {
	switch (sign) {
		case 'positive':
			return `f'(${variable}) > 0`;
		case 'negative':
			return `f'(${variable}) < 0`;
		case 'zero':
			return `f'(${variable}) = 0`;
		case 'unknown':
			return `Le signe de f'(${variable}) est indéterminé`;
	}
}

/**
 * Get the French symbol for monotonicity (for variation tables).
 *
 * @param monotonicity - The monotonicity type
 * @returns Arrow symbol or text
 */
export function getMonotonicitySymbol(monotonicity: Monotonicity): string {
	switch (monotonicity) {
		case 'increasing':
			return '↗'; // or '\nearrow' in LaTeX
		case 'decreasing':
			return '↘'; // or '\searrow' in LaTeX
		case 'constant':
			return '→'; // or '\rightarrow' in LaTeX
		case 'unknown':
			return '?';
	}
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert sign to derivative sign label for MonotonicInterval.
 */
function signToDerivativeSignLabel(sign: Sign): 'positive' | 'negative' | 'zero' | 'unknown' {
	return sign;
}

/**
 * Build a pedagogical reason for the monotonicity.
 */
function buildMonotonicityReason(signedInterval: SignedInterval, variable: string): string {
	const signDescription = getDerivativeSignDescription(signedInterval.sign, variable);
	const monotonicityDescription = getMonotonicityDescription(
		signToMonotonicity(signedInterval.sign),
		variable
	);

	if (signedInterval.reason) {
		return `${signDescription} donc ${monotonicityDescription.toLowerCase()} (${signedInterval.reason})`;
	}

	return `${signDescription} donc ${monotonicityDescription.toLowerCase()}`;
}

/**
 * Check if an interval is a point interval (single value).
 */
function isPointInterval(interval: Interval): boolean {
	const lower = endpointToNumber(interval.lower.value);
	const upper = endpointToNumber(interval.upper.value);

	if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
		return false;
	}

	// Point interval: lower === upper and both endpoints are closed
	return (
		Math.abs(lower - upper) < 1e-10 &&
		interval.lower.type === 'closed' &&
		interval.upper.type === 'closed'
	);
}

/**
 * Check if two intervals are adjacent (share an endpoint).
 */
function areIntervalsAdjacent(a: Interval, b: Interval): boolean {
	const aUpper = endpointToNumber(a.upper.value);
	const bLower = endpointToNumber(b.lower.value);

	if (!Number.isFinite(aUpper) || !Number.isFinite(bLower)) {
		return false;
	}

	// Adjacent if a's upper bound equals b's lower bound
	return Math.abs(aUpper - bLower) < 1e-10;
}

/**
 * Merge two adjacent intervals into one.
 * Assumes intervals are adjacent (a.upper ≈ b.lower).
 */
function mergeAdjacentIntervals(a: Interval, b: Interval): Interval {
	return {
		kind: 'interval',
		lower: a.lower,
		upper: b.upper
	};
}

/**
 * Get the length of an interval (for sorting/comparison).
 * Returns Infinity for unbounded intervals.
 */
export function getIntervalLength(interval: Interval): number {
	const lower = endpointToNumber(interval.lower.value);
	const upper = endpointToNumber(interval.upper.value);

	if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
		return Infinity;
	}

	return upper - lower;
}

/**
 * Check if a monotonic interval represents an extremum candidate.
 *
 * An extremum candidate is a point where monotonicity changes:
 * - decreasing -> increasing = local minimum candidate
 * - increasing -> decreasing = local maximum candidate
 */
export function isExtremumCandidate(
	before: MonotonicInterval | undefined,
	point: MonotonicInterval,
	after: MonotonicInterval | undefined
): 'minimum' | 'maximum' | 'none' {
	// Must be a point interval (critical point)
	if (!isPointInterval(point.interval)) {
		return 'none';
	}

	const beforeMono = before?.monotonicity;
	const afterMono = after?.monotonicity;

	// Local minimum: decreasing before, increasing after
	if (beforeMono === 'decreasing' && afterMono === 'increasing') {
		return 'minimum';
	}

	// Local maximum: increasing before, decreasing after
	if (beforeMono === 'increasing' && afterMono === 'decreasing') {
		return 'maximum';
	}

	return 'none';
}
