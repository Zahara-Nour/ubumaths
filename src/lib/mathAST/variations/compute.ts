/**
 * Variation Study - Main Entry Point
 *
 * Computes the complete variation study of a mathematical expression.
 *
 * Algorithm:
 * 1. Compute the domain of f(x)
 * 2. Compute the derivative f'(x) using differentiate()
 * 3. Find critical points: solve f'(x) = 0
 * 4. Analyze sign of f'(x) using analyzeSign()
 * 5. Convert sign intervals to monotonic intervals
 * 6. Find and classify extrema (local and global)
 * 7. Compute boundary limits (optional)
 * 8. Return complete VariationResult
 *
 * @module mathAST/variations/compute
 */

import type { MathNode } from '../types';
import type { Domain } from '../domain/types';
import type {
	VariationResult,
	VariationStep,
	VariationOptions,
	VariationPhase,
	MonotonicInterval,
	ExtremumInfo,
	BoundaryLimit
} from './types';
import { DEFAULT_VARIATION_OPTIONS, VariationError } from './types';
import { differentiate } from '../differentiation';
import { computeDomain } from '../domain/compute';
import { analyzeSign } from '../sign';
import { findCriticalPoints, sortCriticalPoints } from './critical-points';
import { buildMonotonicIntervals, mergeMonotonicIntervals } from './monotonicity';
import { findExtrema, classifyGlobalExtrema } from './extrema';
import { computeBoundaryLimits } from './boundary-limits';
import { toCustom } from '../custom-generator';
import { shouldIncludeStep } from '../common/verbosity';
import type { Verbosity } from '../common/verbosity';

// =============================================================================
// Types
// =============================================================================

/**
 * Merged options with defaults applied.
 */
interface ResolvedOptions {
	readonly variable: string;
	readonly domain: Domain | undefined;
	readonly verbosity: Verbosity;
	readonly includeBoundaryLimits: boolean;
	readonly numericFallback: boolean;
	readonly tolerance: number;
	readonly strictMode: boolean;
}

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Compute the complete variation study of an expression.
 *
 * This is the main entry point for variation analysis. It orchestrates
 * all the steps needed to produce a complete VariationResult.
 *
 * @param expr - The mathematical expression f(x) to analyze
 * @param options - Optional configuration for the analysis
 * @returns Complete variation result with derivative, critical points,
 *          monotonic intervals, extrema, and optionally boundary limits
 * @throws {VariationError} If the analysis cannot be completed
 *
 * @example
 * // Analyze f(x) = x^2
 * const expr = parseLatex('x^2');
 * const result = computeVariations(expr);
 * // result.derivative = 2x
 * // result.criticalPoints = [{ x: 0, y: 0, nature: 'derivative_zero' }]
 * // result.monotonicIntervals = [
 * //   { interval: ]-inf, 0[, monotonicity: 'decreasing' },
 * //   { interval: ]0, +inf[, monotonicity: 'increasing' }
 * // ]
 * // result.extrema = [{ x: 0, y: 0, type: 'global_minimum' }]
 *
 * @example
 * // Analyze with respect to a different variable
 * const result = computeVariations(parseLatex('t^3 - 3t'), { variable: 't' });
 */
export function computeVariations(expr: MathNode, options?: VariationOptions): VariationResult {
	const opts = resolveOptions(options);
	const variable = opts.variable;
	const steps: VariationStep[] = [];
	const warnings: string[] = [];
	let stepId = 0;

	// Step 1: Compute domain
	let domain: Domain;
	if (opts.domain) {
		domain = opts.domain;
		stepId = recordStep(
			steps,
			stepId,
			'derivative',
			'Utilisation du domaine fourni',
			undefined,
			'summarized',
			opts.verbosity
		);
	} else {
		try {
			const domainResult = computeDomain(expr, variable);
			domain = domainResult.domain;
			stepId = recordStep(
				steps,
				stepId,
				'derivative',
				`Domaine de definition: ${formatDomain(domain)}`,
				undefined,
				'summarized',
				opts.verbosity
			);
		} catch (err) {
			throw new VariationError(
				'Cannot compute domain',
				expr,
				'derivative',
				err instanceof Error ? err.message : 'Domain computation failed'
			);
		}
	}

	// Handle empty domain
	if (domain.kind === 'empty') {
		throw new VariationError(
			'Domain is empty',
			expr,
			'derivative',
			'Cannot study variations on empty domain'
		);
	}

	// Step 2: Compute derivative
	let derivative: MathNode;
	try {
		derivative = differentiate(expr, { variable, simplify: true });
		stepId = recordStep(
			steps,
			stepId,
			'derivative',
			`Derivee: f'(${variable}) = ${toCustom(derivative)}`,
			`Calcul de la derivee de f(${variable}) = ${toCustom(expr)}`,
			'summarized',
			opts.verbosity
		);
	} catch (err) {
		throw new VariationError(
			'Cannot compute derivative',
			expr,
			'derivative',
			err instanceof Error ? err.message : 'Differentiation failed'
		);
	}

	// Step 3: Find critical points
	const criticalPoints = findCriticalPoints(derivative, variable, domain, expr);
	const sortedCriticalPoints = sortCriticalPoints(criticalPoints);
	stepId = recordStep(
		steps,
		stepId,
		'zeros',
		`Points critiques trouves: ${sortedCriticalPoints.length}`,
		formatCriticalPoints(sortedCriticalPoints),
		'summarized',
		opts.verbosity
	);

	// Step 4: Analyze sign of derivative
	let derivativeSign;
	try {
		derivativeSign = analyzeSign(derivative, {
			variable,
			domain,
			numericFallback: opts.numericFallback,
			verbosity: opts.verbosity
		});
		stepId = recordStep(
			steps,
			stepId,
			'sign',
			`Analyse du signe de f'(${variable})`,
			`Intervalles signes: ${derivativeSign.signedIntervals.length}`,
			'detailed',
			opts.verbosity
		);
	} catch (err) {
		if (opts.strictMode) {
			throw new VariationError(
				'Cannot analyze derivative sign',
				derivative,
				'sign',
				err instanceof Error ? err.message : 'Sign analysis failed'
			);
		}
		warnings.push(
			`Could not fully analyze derivative sign: ${err instanceof Error ? err.message : 'Unknown error'}`
		);
		// Create a minimal sign result with unknown sign
		derivativeSign = {
			expression: derivative,
			variable,
			domain,
			zeros: [],
			signedIntervals: [],
			steps: [],
			warnings: ['Sign analysis failed']
		};
	}

	// Step 5: Build monotonic intervals
	const rawMonotonicIntervals = buildMonotonicIntervals(derivativeSign);
	const monotonicIntervals = mergeMonotonicIntervals(rawMonotonicIntervals);
	stepId = recordStep(
		steps,
		stepId,
		'monotonicity',
		`Intervalles de monotonie: ${monotonicIntervals.length}`,
		formatMonotonicIntervals(monotonicIntervals, variable),
		'summarized',
		opts.verbosity
	);

	// Step 6: Find extrema
	const localExtrema = findExtrema(
		expr,
		variable,
		sortedCriticalPoints,
		monotonicIntervals,
		domain
	);
	stepId = recordStep(
		steps,
		stepId,
		'extrema',
		`Extrema locaux trouves: ${localExtrema.length}`,
		undefined,
		'detailed',
		opts.verbosity
	);

	// Step 7: Compute boundary limits (optional)
	let boundaryLimits: BoundaryLimit[] | undefined = undefined;
	if (opts.includeBoundaryLimits) {
		try {
			boundaryLimits = computeBoundaryLimits(expr, variable, domain);
			stepId = recordStep(
				steps,
				stepId,
				'limits',
				`Limites aux bornes calculees: ${boundaryLimits.length}`,
				undefined,
				'detailed',
				opts.verbosity
			);
		} catch (err) {
			warnings.push('Could not compute all boundary limits');
			if (opts.strictMode) {
				throw new VariationError(
					'Cannot compute boundary limits',
					expr,
					'limits',
					err instanceof Error ? err.message : 'Limit computation failed'
				);
			}
		}
	}

	// Step 8: Classify global extrema
	const extrema = classifyGlobalExtrema(localExtrema, expr, variable, domain, boundaryLimits);
	recordStep(
		steps,
		stepId,
		'extrema',
		`Classification des extrema: ${extrema.length} extremum(s)`,
		formatExtrema(extrema),
		'summarized',
		opts.verbosity
	);

	return {
		expression: expr,
		derivative,
		variable,
		domain,
		derivativeSign,
		criticalPoints: sortedCriticalPoints,
		monotonicIntervals,
		extrema,
		boundaryLimits,
		steps: opts.verbosity !== 'result' ? steps : undefined,
		warnings: warnings.length > 0 ? warnings : undefined
	};
}

// =============================================================================
// Summary Generation
// =============================================================================

/**
 * Generate a French summary string of the variation study.
 *
 * Produces a human-readable text summarizing the key findings:
 * - Derivative formula
 * - Critical points
 * - Monotonicity intervals
 * - Extrema (if any)
 *
 * @param result - The variation result to summarize
 * @returns A multi-line French summary string
 *
 * @example
 * const result = computeVariations(parseLatex('x^2'));
 * console.log(getVariationSummary(result));
 * // "Etude des variations de f(x) = x^2
 * //  Derivee: f'(x) = 2x
 * //  Point critique: x = 0
 * //  f est decroissante sur ]-infini, 0[
 * //  f est croissante sur ]0, +infini[
 * //  Minimum global en x = 0, f(0) = 0"
 */
export function getVariationSummary(result: VariationResult): string {
	const v = result.variable;
	const lines: string[] = [];

	// Header
	lines.push(`Etude des variations de f(${v}) = ${toCustom(result.expression)}`);
	lines.push('');

	// Derivative
	lines.push(`Derivee: f'(${v}) = ${toCustom(result.derivative)}`);

	// Domain
	lines.push(`Domaine: ${formatDomain(result.domain)}`);
	lines.push('');

	// Critical points
	if (result.criticalPoints.length === 0) {
		lines.push('Aucun point critique');
	} else if (result.criticalPoints.length === 1) {
		const cp = result.criticalPoints[0];
		lines.push(`Point critique: ${v} = ${toCustom(cp.x)}`);
	} else {
		lines.push(
			`Points critiques: ${result.criticalPoints.map((cp) => `${v} = ${toCustom(cp.x)}`).join(', ')}`
		);
	}
	lines.push('');

	// Monotonicity
	lines.push('Monotonie:');
	for (const mi of result.monotonicIntervals) {
		const monotonicityFr = getMonotonicityFr(mi.monotonicity);
		lines.push(`  f est ${monotonicityFr} sur ${formatInterval(mi.interval)}`);
	}
	lines.push('');

	// Extrema
	if (result.extrema.length === 0) {
		lines.push('Aucun extremum');
	} else {
		lines.push('Extrema:');
		for (const ext of result.extrema) {
			const typeFr = getExtremumTypeFr(ext.type);
			const xStr = toCustom(ext.x);
			const yStr = toCustom(ext.y);
			lines.push(`  ${typeFr} en ${v} = ${xStr}, f(${xStr}) = ${yStr}`);
		}
	}

	// Boundary limits (if available)
	if (result.boundaryLimits && result.boundaryLimits.length > 0) {
		lines.push('');
		lines.push('Limites aux bornes:');
		for (const bl of result.boundaryLimits) {
			const pointStr = toCustom(bl.point);
			const limitStr = formatLimitValue(bl.limit);
			const dirStr = bl.direction === 'left' ? '^-' : bl.direction === 'right' ? '^+' : '';
			lines.push(`  lim_{${v} -> ${pointStr}${dirStr}} f(${v}) = ${limitStr}`);
		}
	}

	return lines.join('\n');
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Resolve options by merging with defaults.
 */
function resolveOptions(options?: VariationOptions): ResolvedOptions {
	return {
		variable: options?.variable ?? 'x',
		domain: options?.domain,
		verbosity: options?.verbosity ?? DEFAULT_VARIATION_OPTIONS.verbosity,
		includeBoundaryLimits:
			options?.includeBoundaryLimits ?? DEFAULT_VARIATION_OPTIONS.includeBoundaryLimits,
		numericFallback: options?.numericFallback ?? DEFAULT_VARIATION_OPTIONS.numericFallback,
		tolerance: options?.tolerance ?? DEFAULT_VARIATION_OPTIONS.tolerance,
		strictMode: options?.strictMode ?? DEFAULT_VARIATION_OPTIONS.strictMode
	};
}

/**
 * Record a step if verbosity allows.
 * Returns the next step ID.
 */
function recordStep(
	steps: VariationStep[],
	id: number,
	phase: VariationPhase,
	description: string,
	detail: string | undefined,
	stepVerbosity: Verbosity,
	requestedVerbosity: Verbosity
): number {
	if (shouldIncludeStep(stepVerbosity, requestedVerbosity)) {
		steps.push({
			id,
			phase,
			description,
			detail,
			verbosityLevel: stepVerbosity
		});
	}
	return id + 1;
}

/**
 * Format a domain for display.
 */
function formatDomain(domain: Domain): string {
	switch (domain.kind) {
		case 'empty':
			return 'ensemble vide';
		case 'universal':
			return 'R (tous les reels)';
		case 'interval_set': {
			if (domain.intervals.length === 0) {
				return 'ensemble vide';
			}
			const intervalStrs = domain.intervals.map((i) => formatInterval(i));
			let result = intervalStrs.join(' U ');
			if (domain.excludedPoints.length > 0) {
				const excluded = domain.excludedPoints.map((ep) => toCustom(ep.value)).join(', ');
				result += ` \\ {${excluded}}`;
			}
			return result;
		}
		case 'condition_domain':
			return 'domaine conditionnel';
		case 'periodic_exclusion':
			return `R \\ {${toCustom(domain.basePoint)} + k*${toCustom(domain.period)}, k entier}`;
	}
}

/**
 * Format an interval for display.
 */
function formatInterval(interval: {
	lower: { type: string; value: MathNode };
	upper: { type: string; value: MathNode };
}): string {
	const lowerBracket = interval.lower.type === 'closed' ? '[' : ']';
	const upperBracket = interval.upper.type === 'closed' ? ']' : '[';
	const lowerStr = formatEndpointValue(interval.lower.value);
	const upperStr = formatEndpointValue(interval.upper.value);
	return `${lowerBracket}${lowerStr}, ${upperStr}${upperBracket}`;
}

/**
 * Format an endpoint value.
 */
function formatEndpointValue(value: MathNode): string {
	if (value.type === 'infinity') {
		return value.sign === 'positive' ? '+infini' : '-infini';
	}
	return toCustom(value);
}

/**
 * Format critical points for step detail.
 */
function formatCriticalPoints(
	points: readonly { x: MathNode; nature: string }[]
): string | undefined {
	if (points.length === 0) return undefined;
	return points
		.map((p) => {
			const nature = p.nature === 'derivative_zero' ? "f'=0" : "f' non defini";
			return `x = ${toCustom(p.x)} (${nature})`;
		})
		.join(', ');
}

/**
 * Format monotonic intervals for step detail.
 */
function formatMonotonicIntervals(
	intervals: readonly MonotonicInterval[],
	_variable: string
): string | undefined {
	if (intervals.length === 0) return undefined;
	return intervals
		.map((mi) => {
			const monotonicity = getMonotonicityFr(mi.monotonicity);
			return `${monotonicity} sur ${formatInterval(mi.interval)}`;
		})
		.join('; ');
}

/**
 * Format extrema for step detail.
 */
function formatExtrema(extrema: readonly ExtremumInfo[]): string | undefined {
	if (extrema.length === 0) return undefined;
	return extrema
		.map((e) => {
			const typeFr = getExtremumTypeFr(e.type);
			return `${typeFr} en x = ${toCustom(e.x)}`;
		})
		.join('; ');
}

/**
 * Get French monotonicity description.
 */
function getMonotonicityFr(monotonicity: string): string {
	switch (monotonicity) {
		case 'increasing':
			return 'strictement croissante';
		case 'decreasing':
			return 'strictement decroissante';
		case 'constant':
			return 'constante';
		default:
			return 'monotonie indéterminée';
	}
}

/**
 * Get French extremum type description.
 */
function getExtremumTypeFr(type: string): string {
	switch (type) {
		case 'local_minimum':
			return 'Minimum local';
		case 'local_maximum':
			return 'Maximum local';
		case 'global_minimum':
			return 'Minimum global';
		case 'global_maximum':
			return 'Maximum global';
		default:
			return 'Extremum';
	}
}

/**
 * Format a limit value for display.
 */
function formatLimitValue(
	value: MathNode | 'infinity' | 'negative_infinity' | 'indeterminate'
): string {
	if (value === 'infinity') return '+infini';
	if (value === 'negative_infinity') return '-infini';
	if (value === 'indeterminate') return 'indéterminé';
	return toCustom(value);
}
