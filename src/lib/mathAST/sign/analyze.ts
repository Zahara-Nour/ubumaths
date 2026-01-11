/**
 * Sign Analysis - Main Entry Point
 *
 * Analyzes the sign of a mathematical expression over its domain.
 *
 * Algorithm:
 * 1. Compute the domain of definition Df
 * 2. Find zeros: solve f(x) = 0 within Df
 * 3. Split Df at zeros into sub-intervals
 * 4. For each sub-interval:
 *    a. Try algebraic analysis (product, quotient, function rules)
 *    b. If undetermined and numericFallback: use sampling
 *    c. If still undetermined and strictMode: throw error
 *    d. Otherwise: mark as 'unknown'
 * 5. Return SignAnalysisResult
 *
 * @module mathAST/sign/analyze
 */

import type { MathNode } from '../types';
import type { Domain, IntervalSet } from '../domain/types';
import type { Interval } from '$lib/math/intervals/types';
import type {
	SignedInterval,
	ZeroInfo,
	SignAnalysisResult,
	SignAnalysisStep,
	SignAnalysisOptions
} from './types';
import { DEFAULT_SIGN_OPTIONS, SignAnalysisError } from './types';
import { computeDomain } from '../domain/compute';
import { findZeros, sortZerosByValue, getUniqueZeros } from './helpers/zeros';
import { determineSignOnInterval } from './helpers/interval-sign';
import { sampleSignOnInterval } from './helpers/sampling';
import {
	interval,
	openEndpoint,
	closedEndpoint,
	negInfinity,
	posInfinity
} from '$lib/math/intervals/factory';
import { endpointToNumber } from '$lib/math/intervals/endpoint';
import { shouldIncludeStep } from '../common/verbosity';

// =============================================================================
// Main Analysis Function
// =============================================================================

/**
 * Analyze the sign of an expression over its domain.
 *
 * @param expr - The mathematical expression to analyze
 * @param options - Analysis options
 * @returns Complete sign analysis result with zeros and signed intervals
 *
 * @example
 * // Analyze sign of x - 2
 * const result = analyzeSign(parse('x - 2'), { variable: 'x' });
 * // zeros: [{ value: 2, exact: true }]
 * // signedIntervals: [
 * //   { interval: ]-infinity, 2[, sign: 'negative' },
 * //   { interval: {2}, sign: 'zero' },
 * //   { interval: ]2, +infinity[, sign: 'positive' }
 * // ]
 */
export function analyzeSign(expr: MathNode, options?: SignAnalysisOptions): SignAnalysisResult {
	const opts = mergeOptions(options);
	const variable = opts.variable;
	const steps: SignAnalysisStep[] = [];
	const warnings: string[] = [];
	let stepId = 0;

	// Step 1: Get or compute domain
	let domain: Domain;
	if (opts.domain) {
		domain = opts.domain;
		recordStep(steps, stepId++, 'use_provided_domain', 'Using provided domain', opts.verbosity);
	} else {
		const domainResult = computeDomain(expr, variable);
		domain = domainResult.domain;
		recordStep(
			steps,
			stepId++,
			'compute_domain',
			`Computed domain of definition for variable ${variable}`,
			opts.verbosity,
			'summarized'
		);
	}

	// Handle empty domain
	if (domain.kind === 'empty') {
		recordStep(
			steps,
			stepId++,
			'empty_domain',
			'Domain is empty - no values to analyze',
			opts.verbosity
		);
		return {
			expression: expr,
			variable,
			domain,
			zeros: [],
			signedIntervals: [],
			steps: opts.verbosity !== 'result' ? steps : undefined,
			warnings: warnings.length > 0 ? warnings : undefined
		};
	}

	// Step 2: Find zeros
	recordStep(
		steps,
		stepId++,
		'find_zeros',
		'Solving f(x) = 0 to find zeros',
		opts.verbosity,
		'summarized'
	);
	const rawZeros = findZeros(expr, variable, domain);
	const uniqueZeros = getUniqueZeros(rawZeros, opts.tolerance);
	const sortedZeros = sortZerosByValue(uniqueZeros);

	if (sortedZeros.length > 0) {
		recordStep(
			steps,
			stepId++,
			'zeros_found',
			`Found ${sortedZeros.length} zero(s)`,
			opts.verbosity,
			'detailed'
		);
	} else {
		recordStep(steps, stepId++, 'no_zeros', 'No zeros found in domain', opts.verbosity, 'detailed');
	}

	// Step 3: Split domain at zeros into sub-intervals
	recordStep(
		steps,
		stepId++,
		'split_domain',
		'Splitting domain at zeros',
		opts.verbosity,
		'detailed'
	);
	const subIntervals = splitDomainAtZeros(domain, sortedZeros);

	// Step 4: Determine sign on each sub-interval
	recordStep(
		steps,
		stepId++,
		'determine_signs',
		'Determining sign on each interval',
		opts.verbosity,
		'summarized'
	);
	const signedIntervals: SignedInterval[] = [];

	for (const subInterval of subIntervals) {
		const { interval: int, isZeroPoint, zeroValue } = subInterval;

		// If this is a zero point interval, sign is 'zero'
		if (isZeroPoint && zeroValue !== undefined) {
			signedIntervals.push({
				interval: int,
				sign: 'zero',
				reason: 'Zero of the expression'
			});
			continue;
		}

		// Try algebraic analysis first
		let sign = determineSignOnInterval(expr, variable, int);
		let reason: string | undefined;

		// If undetermined, try numeric fallback
		if (sign === 'unknown' && opts.numericFallback) {
			sign = sampleSignOnInterval(expr, variable, int, {
				tolerance: opts.tolerance
			});
			if (sign !== 'unknown') {
				reason = 'Determined by numeric sampling';
				warnings.push(`Sign on interval determined numerically (fallback)`);
			}
		}

		// If still undetermined and strictMode, throw error
		if (sign === 'unknown' && opts.strictMode) {
			throw new SignAnalysisError(
				`Cannot determine sign on interval`,
				expr,
				`Algebraic analysis failed and strictMode is enabled`
			);
		}

		signedIntervals.push({ interval: int, sign, reason });
	}

	return {
		expression: expr,
		variable,
		domain,
		zeros: sortedZeros,
		signedIntervals,
		steps: opts.verbosity !== 'result' ? steps : undefined,
		warnings: warnings.length > 0 ? warnings : undefined
	};
}

// =============================================================================
// Helper Types
// =============================================================================

/**
 * Internal representation of a sub-interval with metadata.
 */
interface SubIntervalInfo {
	/** The interval */
	readonly interval: Interval;
	/** Whether this is a single-point interval at a zero */
	readonly isZeroPoint: boolean;
	/** The zero value if this is a zero point */
	readonly zeroValue?: MathNode;
}

// =============================================================================
// Domain Splitting
// =============================================================================

/**
 * Split a domain at zero points into sub-intervals.
 *
 * Example: domain = ]-infinity, +infinity[, zeros = [-2, 1]
 * Result: ]-infinity, -2[, {-2}, ]-2, 1[, {1}, ]1, +infinity[
 *
 * @param domain - The domain to split
 * @param zeros - Sorted zeros to split at
 * @returns Array of sub-intervals with metadata
 */
function splitDomainAtZeros(domain: Domain, zeros: readonly ZeroInfo[]): SubIntervalInfo[] {
	// Handle empty domain
	if (domain.kind === 'empty') {
		return [];
	}

	// Handle universal domain - treat as ]-infinity, +infinity[
	if (domain.kind === 'universal') {
		return splitIntervalAtZeros(
			interval(negInfinity(), posInfinity()),
			zeros.filter((z) => z.approximate !== undefined)
		);
	}

	// Handle interval_set domain
	if (domain.kind === 'interval_set') {
		return splitIntervalSetAtZeros(domain, zeros);
	}

	// Handle periodic_exclusion and condition_domain - convert to interval approximation
	// For periodic exclusions, we'd need special handling; for now, treat as universal
	if (domain.kind === 'periodic_exclusion' || domain.kind === 'condition_domain') {
		// Fall back to treating as universal domain
		return splitIntervalAtZeros(
			interval(negInfinity(), posInfinity()),
			zeros.filter((z) => z.approximate !== undefined)
		);
	}

	return [];
}

/**
 * Split an interval set at zeros.
 */
function splitIntervalSetAtZeros(
	domain: IntervalSet,
	zeros: readonly ZeroInfo[]
): SubIntervalInfo[] {
	const result: SubIntervalInfo[] = [];

	for (const int of domain.intervals) {
		// Filter zeros that are in this interval
		const zerosInInterval = zeros.filter((z) => isZeroInInterval(z, int));
		const subIntervals = splitIntervalAtZeros(int, zerosInInterval);
		result.push(...subIntervals);
	}

	return result;
}

/**
 * Split a single interval at zeros.
 */
function splitIntervalAtZeros(int: Interval, zeros: readonly ZeroInfo[]): SubIntervalInfo[] {
	// No zeros - return the original interval
	if (zeros.length === 0) {
		return [{ interval: int, isZeroPoint: false }];
	}

	const result: SubIntervalInfo[] = [];

	// Get numeric bounds for comparison
	const lowerBound = endpointToNumber(int.lower.value);
	const upperBound = endpointToNumber(int.upper.value);

	// Sort zeros by approximate value
	const sortedZeros = [...zeros]
		.filter((z) => z.approximate !== undefined)
		.sort((a, b) => a.approximate! - b.approximate!);

	let currentLower = int.lower;

	for (let i = 0; i < sortedZeros.length; i++) {
		const zero = sortedZeros[i];
		const zeroValue = zero.approximate!;

		// Skip if zero is at or beyond the lower bound (depending on type)
		if (!isValidSplitPoint(zeroValue, lowerBound, upperBound, int)) {
			continue;
		}

		// Create interval from current lower to zero (open at zero)
		const zeroEndpoint = openEndpoint(zero.value);
		const intervalToZero = interval(currentLower, zeroEndpoint);

		// Only add if interval is non-degenerate
		if (!isEmptyInterval(intervalToZero)) {
			result.push({ interval: intervalToZero, isZeroPoint: false });
		}

		// Create point interval for the zero itself
		result.push({
			interval: pointInterval(zero.value),
			isZeroPoint: true,
			zeroValue: zero.value
		});

		// Update current lower to just after zero
		currentLower = openEndpoint(zero.value);
	}

	// Create final interval from last zero to upper bound
	const finalInterval = interval(currentLower, int.upper);
	if (!isEmptyInterval(finalInterval)) {
		result.push({ interval: finalInterval, isZeroPoint: false });
	}

	return result;
}

/**
 * Check if a zero is inside an interval.
 */
function isZeroInInterval(zero: ZeroInfo, int: Interval): boolean {
	if (zero.approximate === undefined) {
		// Cannot determine - assume it might be in the interval
		return true;
	}

	const value = zero.approximate;
	const lower = endpointToNumber(int.lower.value);
	const upper = endpointToNumber(int.upper.value);

	// Check lower bound
	if (int.lower.type === 'closed') {
		if (value < lower) return false;
	} else {
		if (value <= lower) return false;
	}

	// Check upper bound
	if (int.upper.type === 'closed') {
		if (value > upper) return false;
	} else {
		if (value >= upper) return false;
	}

	return true;
}

/**
 * Check if a value is a valid split point within the interval bounds.
 */
function isValidSplitPoint(
	value: number,
	lowerBound: number,
	upperBound: number,
	int: Interval
): boolean {
	// Check if value is strictly inside the interval
	if (int.lower.type === 'closed') {
		if (value < lowerBound) return false;
	} else {
		if (value <= lowerBound) return false;
	}

	if (int.upper.type === 'closed') {
		if (value > upperBound) return false;
	} else {
		if (value >= upperBound) return false;
	}

	return true;
}

/**
 * Check if an interval is empty (degenerate).
 */
function isEmptyInterval(int: Interval): boolean {
	const lower = endpointToNumber(int.lower.value);
	const upper = endpointToNumber(int.upper.value);

	if (Number.isNaN(lower) || Number.isNaN(upper)) {
		// Cannot determine - assume not empty
		return false;
	}

	// Inverted interval
	if (lower > upper) return true;

	// Same endpoints - only valid if both are closed
	if (lower === upper) {
		return !(int.lower.type === 'closed' && int.upper.type === 'closed');
	}

	return false;
}

/**
 * Create a point interval (single value).
 * Represents the degenerate interval [a, a].
 */
function pointInterval(value: MathNode): Interval {
	return interval(closedEndpoint(value), closedEndpoint(value));
}

// =============================================================================
// Options Handling
// =============================================================================

/**
 * Merged options type with all required fields.
 */
interface MergedOptions {
	readonly variable: string;
	readonly domain?: Domain;
	readonly verbosity: 'result' | 'summarized' | 'detailed';
	readonly strictMode: boolean;
	readonly numericFallback: boolean;
	readonly tolerance: number;
}

/**
 * Merge user options with defaults.
 */
function mergeOptions(options?: SignAnalysisOptions): MergedOptions {
	return {
		variable: options?.variable ?? 'x',
		domain: options?.domain,
		verbosity: options?.verbosity ?? DEFAULT_SIGN_OPTIONS.verbosity,
		strictMode: options?.strictMode ?? DEFAULT_SIGN_OPTIONS.strictMode,
		numericFallback: options?.numericFallback ?? DEFAULT_SIGN_OPTIONS.numericFallback,
		tolerance: options?.tolerance ?? DEFAULT_SIGN_OPTIONS.tolerance
	};
}

// =============================================================================
// Step Recording
// =============================================================================

/**
 * Record a step for pedagogical display.
 *
 * @param steps - Array to add step to
 * @param id - Step ID
 * @param rule - Rule or technique name
 * @param description - Human-readable description
 * @param verbosity - Current verbosity level
 * @param stepLevel - Minimum verbosity level for this step (default: 'summarized')
 */
function recordStep(
	steps: SignAnalysisStep[],
	id: number,
	rule: string,
	description: string,
	verbosity: 'result' | 'summarized' | 'detailed',
	stepLevel: 'summarized' | 'detailed' = 'summarized'
): void {
	if (verbosity === 'result') return;
	if (!shouldIncludeStep(stepLevel, verbosity)) return;

	steps.push({
		id,
		rule,
		description,
		verbosityLevel: stepLevel
	});
}
