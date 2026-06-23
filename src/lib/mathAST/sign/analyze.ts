/**
 * Sign Analysis - Main Entry Point
 *
 * Analyzes the sign of a mathematical expression over its domain.
 *
 * ## Algorithm
 *
 * 1. Compute the domain of definition Df (or use the one provided).
 *    This is critical: Df excludes points of non-definition (1/x at 0,
 *    ln at 0, tan at π/2+kπ, …), effectively splitting the real line
 *    into intervals where the function is continuous.
 *
 * 2. Find zeros: solve f(x) = 0 within Df using the solve module.
 *    Zeros are returned with both an exact symbolic value (MathNode)
 *    and a numeric approximation (for ordering).
 *
 * 3. Split Df at zeros into sub-intervals.
 *    Interval bounds are always **exact symbolic MathNodes** (e.g. sqrt(2)),
 *    not floating-point approximations. The numeric `approximate` field
 *    is only used for sorting and comparison.
 *
 * 4. For each sub-interval, determine the sign:
 *    a. Try **algebraic analysis** (structural decomposition into product,
 *       quotient, power, function → apply sign rules recursively).
 *       Note: sums and differences always return 'unknown' because
 *       sign(a) and sign(b) do not determine sign(a+b).
 *    b. If undetermined and numericFallback enabled: use **numeric sampling**
 *       (evaluate at 5 points, check consensus). This is reliable because
 *       between consecutive zeros a continuous function has constant sign
 *       (intermediate value theorem).
 *    c. If still undetermined and strictMode: throw error.
 *    d. Otherwise: mark as 'unknown'.
 *
 * 5. Return SignAnalysisResult with exact bounds and determined signs.
 *
 * ## Critical dependency: completeness of solve
 *
 * The correctness of the entire analysis hinges on step 2 finding **all** zeros.
 * If solve misses a zero, the interval containing it won't be split, and the
 * sampling fallback may "confirm" an incorrect sign (all sample points could
 * land on the same side of the missed zero). No warning is emitted in this case.
 * The reliability of sign analysis — and of the variations module above it —
 * is therefore entirely conditioned by the completeness of solve.
 *
 * ## Continuity assumption
 *
 * The algorithm assumes the expression is continuous on each sub-interval.
 * This holds for standard school-level functions (the target of Chiphre).
 * Functions with jump discontinuities inside their domain (floor, piecewise)
 * are not supported and could yield incorrect sign results.
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
	negInfinityEndpoint,
	posInfinityEndpoint
} from '$lib/math/intervals/factory';
import { endpointToNumber } from '$lib/math/intervals/endpoint';
import { shouldIncludeStep } from '../common/verbosity';

/**
 * Tolerance for considering two partition points (zero / excluded) as the
 * same coordinate during merge+dedupe. Aligned with `DEFAULT_SIGN_OPTIONS.tolerance`
 * — a custom tolerance passed via `analyzeSignOptions` is NOT propagated here
 * (the dedupe is internal to interval splitting, downstream of zero finding).
 * If callers ever start needing different tolerances at this layer, plumb it
 * through `splitIntervalAtPoints`.
 */
const PARTITION_DEDUPE_TOLERANCE = DEFAULT_SIGN_OPTIONS.tolerance;

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

	// Step 1: Get or compute domain.
	// The domain excludes points of non-definition (e.g. 0 for 1/x, x≤0 for ln(x)),
	// which naturally splits the real line at discontinuities. This ensures that
	// each resulting sub-interval contains only points where the function is continuous.
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

	// Step 2: Find zeros by solving f(x) = 0 within the domain.
	// Zeros are returned as ZeroInfo objects with:
	//   - value: MathNode (exact symbolic form, e.g. sqrt(2))
	//   - approximate: number (numeric value for sorting/comparison only)
	// Duplicates are removed using the configured tolerance.
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

	// Step 3: Split domain at zeros into sub-intervals.
	// Each zero creates a point interval {z} (sign = 'zero') and two open intervals
	// on either side. Bounds are exact symbolic MathNodes, not numeric approximations.
	// Example: f(x) = x - 2, zero at 2 → ]-∞, 2[, {2}, ]2, +∞[
	recordStep(
		steps,
		stepId++,
		'split_domain',
		'Splitting domain at zeros',
		opts.verbosity,
		'detailed'
	);
	const subIntervals = splitDomainAtZeros(domain, sortedZeros);

	// Step 4: Determine sign on each sub-interval.
	// Two-phase strategy:
	//   a) Algebraic analysis: recursively decompose expression structure
	//      (product → sign rule, quotient → sign rule, power → parity, function → known sign).
	//      Sums/differences return 'unknown' because sign(a)+sign(b) ≠ sign(a+b).
	//   b) Numeric sampling fallback: evaluate at 5 points, check consensus.
	//      Reliable because the function is continuous between zeros (IVT guarantees
	//      constant sign), assuming all zeros were found in step 2.
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

		// Phase a: algebraic analysis.
		// Decomposes the expression structurally and applies sign rules.
		// Returns 'unknown' for sums/differences (magnitude comparison needed).
		let sign = determineSignOnInterval(expr, variable, int);
		let reason: string | undefined;

		// Phase b: numeric sampling fallback.
		// Evaluates the expression at several points inside the interval.
		// Between consecutive zeros, a continuous function has constant sign (IVT),
		// so if all samples agree, the sign is determined.
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
		return splitIntervalAtPoints(
			interval(negInfinityEndpoint(), posInfinityEndpoint()),
			zeros.filter((z) => z.approximate !== undefined),
			[]
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
		return splitIntervalAtPoints(
			interval(negInfinityEndpoint(), posInfinityEndpoint()),
			zeros.filter((z) => z.approximate !== undefined),
			[]
		);
	}

	return [];
}

/**
 * A point at which an interval should be split. Either a zero of the
 * expression (which produces a `{z}` point sub-interval marked
 * `isZeroPoint: true`) or an excluded point of the domain (which only opens
 * a gap, no point sub-interval is emitted).
 *
 * Used to unify the zero-and-discontinuity partitioning logic.
 */
interface PartitionPoint {
	readonly value: MathNode;
	readonly approximate: number;
	readonly isZero: boolean;
}

/**
 * Split an interval set at zeros AND at the domain's excluded points.
 *
 * Excluded points (e.g. 0 for 1/x, 2 for 1/(x-2)) are treated as
 * additional split points — their numeric value opens a gap with open
 * endpoints on both sides — but no `{p}` point sub-interval is emitted
 * (the expression is not defined at p, so it cannot be marked `sign='zero'`).
 *
 * Zeros and excluded points are merged into a single sorted list of
 * `PartitionPoint`s before iteration. If a zero coincides with an excluded
 * point (degenerate case like an undefined removable singularity), the
 * excluded-point semantics win — no zero-point interval is emitted at that
 * coordinate.
 */
function splitIntervalSetAtZeros(
	domain: IntervalSet,
	zeros: readonly ZeroInfo[]
): SubIntervalInfo[] {
	const result: SubIntervalInfo[] = [];

	// Tolerate domains constructed via the bare `intervals/factory.ts:intervalSet`
	// (no `excludedPoints` field) — that variant predates the domain-level
	// `excludedPoints` extension and is still used in some test helpers and
	// older call sites.
	const allExcluded = domain.excludedPoints ?? [];
	for (const int of domain.intervals) {
		const zerosInInterval = zeros.filter((z) => isZeroInInterval(z, int));
		const excludedInInterval = allExcluded.filter((ep) => isExcludedPointInInterval(ep.value, int));
		const subIntervals = splitIntervalAtPoints(int, zerosInInterval, excludedInInterval);
		result.push(...subIntervals);
	}

	return result;
}

/**
 * Split a single interval at zeros and excluded points combined. Both kinds
 * partition the interval; only zeros emit a `{z}` point sub-interval.
 */
function splitIntervalAtPoints(
	int: Interval,
	zeros: readonly ZeroInfo[],
	excluded: readonly { readonly value: MathNode }[]
): SubIntervalInfo[] {
	const partitionPoints = mergeAndSortPartitionPoints(zeros, excluded);

	if (partitionPoints.length === 0) {
		return [{ interval: int, isZeroPoint: false }];
	}

	const result: SubIntervalInfo[] = [];
	const lowerBound = endpointToNumber(int.lower.value);
	const upperBound = endpointToNumber(int.upper.value);

	let currentLower = int.lower;

	for (const pp of partitionPoints) {
		// Defensive re-check : the upstream filters
		// (`isZeroInInterval` / `isExcludedPointInInterval`) already guarantee
		// the point lies strictly inside `int`. Keep this guard as a safety
		// net against future divergence between filter and split logic — the
		// cost is negligible vs. the risk of silently dropping a valid split.
		if (!isValidSplitPoint(pp.approximate, lowerBound, upperBound, int)) {
			continue;
		}

		const pointEndpoint = openEndpoint(pp.value);
		const intervalToPoint = interval(currentLower, pointEndpoint);

		if (!isEmptyInterval(intervalToPoint)) {
			result.push({ interval: intervalToPoint, isZeroPoint: false });
		}

		// Only zeros produce a `{p}` point sub-interval. Excluded points
		// just open a gap and move on.
		if (pp.isZero) {
			result.push({
				interval: pointInterval(pp.value),
				isZeroPoint: true,
				zeroValue: pp.value
			});
		}

		currentLower = openEndpoint(pp.value);
	}

	const finalInterval = interval(currentLower, int.upper);
	if (!isEmptyInterval(finalInterval)) {
		result.push({ interval: finalInterval, isZeroPoint: false });
	}

	return result;
}

/**
 * Merge zeros and excluded points into a single sorted list of
 * `PartitionPoint`s. Deduplicates by approximate value (within a small
 * tolerance) — when a zero and an excluded point coincide, the excluded
 * semantics win (no zero-point interval emitted).
 */
function mergeAndSortPartitionPoints(
	zeros: readonly ZeroInfo[],
	excluded: readonly { readonly value: MathNode }[]
): PartitionPoint[] {
	const points: PartitionPoint[] = [];

	for (const z of zeros) {
		if (z.approximate === undefined) continue;
		points.push({ value: z.value, approximate: z.approximate, isZero: true });
	}
	for (const ep of excluded) {
		const approx = endpointToNumber(ep.value);
		if (!Number.isFinite(approx)) continue;
		points.push({ value: ep.value, approximate: approx, isZero: false });
	}

	points.sort((a, b) => a.approximate - b.approximate);

	// Deduplicate: when a zero coincides with an excluded point (within
	// `PARTITION_DEDUPE_TOLERANCE`, defined at module top), keep only the
	// excluded point — the expression is undefined there, so no
	// `sign='zero'` interval makes sense.
	const deduped: PartitionPoint[] = [];
	for (const pp of points) {
		const last = deduped[deduped.length - 1];
		if (
			last !== undefined &&
			Math.abs(last.approximate - pp.approximate) < PARTITION_DEDUPE_TOLERANCE
		) {
			// Same coordinate — prefer the excluded variant.
			if (last.isZero && !pp.isZero) {
				deduped[deduped.length - 1] = pp;
			}
			continue;
		}
		deduped.push(pp);
	}

	return deduped;
}

/**
 * Check if an excluded point lies strictly inside `int`. Mirrors
 * `isZeroInInterval` (numeric path).
 */
function isExcludedPointInInterval(value: MathNode, int: Interval): boolean {
	const v = endpointToNumber(value);
	if (!Number.isFinite(v)) return false;
	const lower = endpointToNumber(int.lower.value);
	const upper = endpointToNumber(int.upper.value);

	if (int.lower.type === 'closed') {
		if (v < lower) return false;
	} else {
		if (v <= lower) return false;
	}
	if (int.upper.type === 'closed') {
		if (v > upper) return false;
	} else {
		if (v >= upper) return false;
	}
	return true;
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
