/**
 * Continuity Analysis Module
 *
 * Provides comprehensive continuity analysis for mathematical expressions.
 * Combines domain computation with automatic detection and classification
 * of all discontinuity points.
 *
 * @module mathAST/analysis/continuity
 *
 * @example
 * ```typescript
 * import { analyzeContinuity } from '$lib/mathAST/analysis';
 * import { fraction, variable, number } from '$lib/mathAST/factory';
 *
 * // Analyze 1/x
 * const expr = fraction(number('1'), variable('x'));
 * const result = analyzeContinuity(expr, 'x');
 *
 * console.log(result.discontinuities);
 * // [{ point: 0, type: 'infinite', source: 'division', ... }]
 * console.log(result.isContinuousOnDomain); // true (continuous on ℝ\{0})
 * ```
 */

import type { MathNode } from '../types';
import type { Domain, IntervalSet, PeriodicExclusion } from '../domain/types';
import type { LimitOptions, OneSidedLimitResult } from '../limits/types';
import type { Verbosity } from '../common/verbosity';
import type {
	Discontinuity,
	DiscontinuityType,
	DiscontinuitySource,
	DiscontinuityCandidate,
	ContinuityResult,
	ContinuityStep,
	ContinuityOptions,
	ContinuityRule
} from './continuity-types';

import { computeDomain } from '../domain/compute';
import { containsValue, isEmpty } from '../domain/algebra';
import { analyzeOneSidedLimits } from '../limits/evaluate';
import { analyzeDiscontinuity as classifyDiscontinuity } from '../limits/one-sided';
import { substitute } from '../eval/substitute';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';
import { isInfinity, isFunction } from '../guards';
import { findNodes } from '../transforms';
import { shouldIncludeStep } from '../common/verbosity';
import {
	describeDiscontinuity,
	describePeriodicPattern,
	summarizeContinuityResult
} from './continuity-steps';

// =============================================================================
// Default Options
// =============================================================================

const DEFAULT_OPTIONS: Required<ContinuityOptions> = {
	verbosity: 'summarized',
	standardInterval: { min: -2 * Math.PI, max: 2 * Math.PI },
	maxPeriodicPoints: 10,
	computeFunctionValues: true,
	timeout: 5000
};

// =============================================================================
// Step Recording
// =============================================================================

/**
 * Step recorder for continuity analysis.
 */
class ContinuityStepRecorder {
	private steps: ContinuityStep[] = [];
	private nextId = 1;

	recordStep(
		rule: ContinuityRule,
		description: string,
		verbosityLevel: Verbosity,
		point?: MathNode,
		result?: string,
		technicalNote?: string
	): void {
		this.steps.push({
			id: this.nextId++,
			rule,
			description,
			point,
			result,
			verbosityLevel,
			technicalNote
		});
	}

	getStepsFiltered(verbosity: Verbosity): readonly ContinuityStep[] {
		return this.steps.filter((step) => shouldIncludeStep(step.verbosityLevel, verbosity));
	}
}

// =============================================================================
// Main API
// =============================================================================

/**
 * Analyze the continuity of an expression.
 *
 * Computes the domain, finds all discontinuity points, classifies them,
 * and produces a unified report with pedagogical explanations.
 *
 * @param expr - The mathematical expression to analyze
 * @param variable - The variable name (default: 'x')
 * @param options - Analysis options
 * @returns Complete continuity analysis result
 */
export function analyzeContinuity(
	expr: MathNode,
	variable: string = 'x',
	options: ContinuityOptions = {}
): ContinuityResult {
	const opts: Required<ContinuityOptions> = { ...DEFAULT_OPTIONS, ...options };
	const recorder = new ContinuityStepRecorder();

	// Step 1: Compute domain
	recorder.recordStep(
		'domain-computation',
		'Calcul du domaine de définition',
		'summarized',
		undefined,
		undefined,
		'Utilisation de computeDomain()'
	);

	const { domain } = computeDomain(expr, variable);

	// Step 2: Find discontinuity candidates
	recorder.recordStep(
		'candidate-extraction',
		'Recherche des points candidats à une discontinuité',
		'detailed'
	);

	const candidates = findDiscontinuityCandidates(expr, variable, domain, opts);

	// Step 3: Analyze each candidate
	const discontinuities: Discontinuity[] = [];

	for (const candidate of candidates) {
		recorder.recordStep(
			'limit-evaluation',
			`Analyse au point ${formatNodeSimple(candidate.point)}`,
			'detailed',
			candidate.point
		);

		const disc = analyzePointContinuity(expr, variable, candidate, opts);
		if (disc) {
			discontinuities.push(disc);

			recorder.recordStep(
				'discontinuity-classification',
				describeDiscontinuity(disc, variable),
				'summarized',
				disc.point,
				disc.type
			);
		}
	}

	// Step 4: Determine if continuous on domain
	const isContinuousOnDomain = checkContinuousOnDomain(discontinuities, domain);

	// Add summary step
	if (opts.verbosity !== 'result') {
		recorder.recordStep(
			'continuity-check',
			summarizeContinuityResult(discontinuities, isContinuousOnDomain, variable),
			'summarized'
		);
	}

	return {
		domain,
		discontinuities,
		isContinuousOnDomain,
		variable,
		...(opts.verbosity !== 'result' && { steps: recorder.getStepsFiltered(opts.verbosity) })
	};
}

/**
 * Find all potential discontinuity points in an expression.
 *
 * Extracts candidates from:
 * - Domain excluded points (zeros of denominators)
 * - Domain boundaries (sqrt at 0, ln at 0)
 * - Periodic exclusions (tan at π/2 + kπ)
 * - Piecewise function boundaries (abs, sign, floor, ceil)
 *
 * @param expr - The expression
 * @param variable - The variable name
 * @param domain - Pre-computed domain (optional)
 * @param options - Analysis options
 * @returns Array of candidate points with their suspected sources
 */
export function findDiscontinuityCandidates(
	expr: MathNode,
	variable: string,
	domain?: Domain,
	options: ContinuityOptions = {}
): DiscontinuityCandidate[] {
	const opts: Required<ContinuityOptions> = { ...DEFAULT_OPTIONS, ...options };
	const candidates: DiscontinuityCandidate[] = [];
	const seenPoints = new Set<string>();

	// Get domain if not provided
	const actualDomain = domain ?? computeDomain(expr, variable).domain;

	// 1. Extract from domain excluded points (divisions by zero, etc.)
	if (actualDomain.kind === 'interval_set') {
		const intervalSet = actualDomain as IntervalSet;

		// Excluded points
		for (const ep of intervalSet.excludedPoints) {
			const key = getPointKey(ep.value);
			if (!seenPoints.has(key)) {
				seenPoints.add(key);
				candidates.push({
					point: ep.value,
					source: detectSourceFromExpression(expr, ep.value, variable)
				});
			}
		}

		// Domain boundaries (interval endpoints)
		for (const interval of intervalSet.intervals) {
			// Lower bound (if finite and open/closed boundary)
			if (!isInfinityEndpoint(interval.lower.value)) {
				const key = getPointKey(interval.lower.value);
				if (!seenPoints.has(key)) {
					seenPoints.add(key);
					candidates.push({
						point: interval.lower.value,
						source: detectSourceFromExpression(expr, interval.lower.value, variable)
					});
				}
			}

			// Upper bound (if finite)
			if (!isInfinityEndpoint(interval.upper.value)) {
				const key = getPointKey(interval.upper.value);
				if (!seenPoints.has(key)) {
					seenPoints.add(key);
					candidates.push({
						point: interval.upper.value,
						source: detectSourceFromExpression(expr, interval.upper.value, variable)
					});
				}
			}
		}
	}

	// 2. Handle periodic exclusions (tan, cot, sec, csc)
	if (actualDomain.kind === 'periodic_exclusion') {
		const periodic = actualDomain as PeriodicExclusion;
		const periodicCandidates = enumeratePeriodicPoints(periodic, opts);
		for (const pc of periodicCandidates) {
			const key = getPointKey(pc.point);
			if (!seenPoints.has(key)) {
				seenPoints.add(key);
				candidates.push(pc);
			}
		}
	}

	// 2b. Detect periodic functions (tan, cot, sec, csc) even when domain is universal
	// These functions have periodic discontinuities not captured by computeDomain
	const periodicFuncCandidates = findPeriodicFunctionDiscontinuities(expr, variable, opts);
	for (const pc of periodicFuncCandidates) {
		const key = getPointKey(pc.point);
		if (!seenPoints.has(key)) {
			seenPoints.add(key);
			candidates.push(pc);
		}
	}

	// 3. Find piecewise function boundaries (abs, sign, floor, ceil)
	const piecewiseCandidates = findPiecewiseBoundaries(expr, variable, opts);
	for (const pc of piecewiseCandidates) {
		const key = getPointKey(pc.point);
		if (!seenPoints.has(key)) {
			seenPoints.add(key);
			candidates.push(pc);
		}
	}

	return candidates;
}

/**
 * Check continuity at a specific point.
 *
 * Evaluates one-sided limits and the function value to determine
 * if the function is continuous at the point, and if not, classifies
 * the type of discontinuity.
 *
 * @param expr - The expression
 * @param variable - The variable name
 * @param point - The point to check
 * @returns Discontinuity info if discontinuous, null if continuous
 */
export function checkContinuityAtPoint(
	expr: MathNode,
	variable: string,
	point: MathNode
): Discontinuity | null {
	const candidate: DiscontinuityCandidate = {
		point,
		source: detectSourceFromExpression(expr, point, variable)
	};

	return analyzePointContinuity(expr, variable, candidate, DEFAULT_OPTIONS);
}

// =============================================================================
// Internal Analysis Functions
// =============================================================================

/**
 * Analyze continuity at a candidate point.
 */
function analyzePointContinuity(
	expr: MathNode,
	variable: string,
	candidate: DiscontinuityCandidate,
	opts: Required<ContinuityOptions>
): Discontinuity | null {
	const { point, source, periodic } = candidate;

	// Special handling for known jump discontinuity functions (floor, ceil, sign)
	// The limits module doesn't correctly detect these as jump discontinuities,
	// so we handle them explicitly based on their known mathematical behavior.
	if (['floor', 'ceil', 'sign'].includes(source)) {
		const jumpResult = analyzeKnownJumpDiscontinuity(expr, variable, point, source);
		if (jumpResult) {
			return jumpResult;
		}
	}

	// Evaluate one-sided limits
	const limitOpts: LimitOptions = {
		verbosity: 'result',
		timeout: opts.timeout
	};

	let oneSided: OneSidedLimitResult;
	try {
		oneSided = analyzeOneSidedLimits(expr, variable, point, limitOpts);
	} catch {
		// If limit evaluation fails, assume discontinuous
		return {
			point,
			type: 'essential',
			leftLimit: null,
			rightLimit: null,
			functionValue: null,
			source,
			description: "Impossible d'évaluer les limites en ce point",
			periodic
		};
	}

	// Try to compute function value at point
	let functionValue: MathNode | null = null;
	let functionValueUndefined = false;
	if (opts.computeFunctionValues) {
		functionValue = tryEvaluateAtPoint(expr, variable, point);
		if (functionValue === null) {
			// Function is not defined at this point
			functionValueUndefined = true;
		}
	}

	// Classify the discontinuity
	// Pass undefined to classifyDiscontinuity when function is not defined
	// (this is important for detecting removable discontinuities)
	const classification = classifyDiscontinuity(
		oneSided,
		functionValueUndefined ? undefined : functionValue
	);

	// Special handling for known periodic functions (tan, cot, sec, csc)
	// These functions have vertical asymptotes at their discontinuity points.
	// The limit module may not correctly detect infinity (returns large values instead),
	// so we override the classification for these known cases.
	if (periodic && functionValueUndefined && ['tan', 'cot', 'sec', 'csc'].includes(source)) {
		// For periodic function discontinuities, if the function is undefined at the point,
		// it's an infinite discontinuity (vertical asymptote), not a removable one
		return {
			point,
			type: 'infinite',
			leftLimit: oneSided.left?.value ?? null,
			rightLimit: oneSided.right?.value ?? null,
			functionValue: null,
			source,
			description: 'Discontinuité infinie (asymptote verticale)',
			periodic
		};
	}

	// If continuous, return null
	if (classification.type === 'none') {
		return null;
	}

	// Build discontinuity info
	return {
		point,
		type: classification.type as DiscontinuityType,
		leftLimit: classification.leftLimit ?? null,
		rightLimit: classification.rightLimit ?? null,
		functionValue,
		source,
		description: classification.description,
		periodic
	};
}

/**
 * Analyze known jump discontinuity functions.
 *
 * These functions have well-defined mathematical behavior at their
 * discontinuity points that we can determine without relying on
 * the limits module (which doesn't handle them correctly).
 */
function analyzeKnownJumpDiscontinuity(
	expr: MathNode,
	variable: string,
	point: MathNode,
	source: DiscontinuitySource
): Discontinuity | null {
	const pointValue = tryEvaluateNumeric(point);
	if (pointValue === null) return null;

	// For floor(x): discontinuous at every integer
	// Left limit: n (the integer below), Right limit: n, but function jumps
	if (source === 'floor') {
		// Check if point is an integer
		if (Math.abs(pointValue - Math.round(pointValue)) > 1e-10) {
			return null; // Not an integer, no discontinuity
		}

		const n = Math.round(pointValue);
		// floor(n-) = n-1, floor(n+) = n, floor(n) = n
		// Jump discontinuity: left limit ≠ right limit
		return {
			point,
			type: 'jump',
			leftLimit: { type: 'number', value: String(n - 1) },
			rightLimit: { type: 'number', value: String(n) },
			functionValue: { type: 'number', value: String(n) },
			source: 'floor',
			description: `Discontinuité de première espèce (saut) en x = ${n}`
		};
	}

	// For ceil(x): discontinuous at every integer
	if (source === 'ceil') {
		// Check if point is an integer
		if (Math.abs(pointValue - Math.round(pointValue)) > 1e-10) {
			return null; // Not an integer, no discontinuity
		}

		const n = Math.round(pointValue);
		// ceil(n-) = n, ceil(n+) = n+1, ceil(n) = n
		// Jump discontinuity: left limit ≠ right limit
		return {
			point,
			type: 'jump',
			leftLimit: { type: 'number', value: String(n) },
			rightLimit: { type: 'number', value: String(n) },
			functionValue: { type: 'number', value: String(n) },
			source: 'ceil',
			description: `Discontinuité de première espèce (saut) en x = ${n}`
		};
	}

	// For sign(x): discontinuous at x = 0
	if (source === 'sign') {
		// Check if point is zero
		if (Math.abs(pointValue) > 1e-10) {
			return null; // Not zero, no discontinuity
		}

		// sign(0-) = -1, sign(0+) = 1, sign(0) = 0
		// Jump discontinuity
		return {
			point,
			type: 'jump',
			leftLimit: { type: 'number', value: '-1' },
			rightLimit: { type: 'number', value: '1' },
			functionValue: { type: 'number', value: '0' },
			source: 'sign',
			description: 'Discontinuité de première espèce (saut) en x = 0'
		};
	}

	return null;
}

/**
 * Enumerate periodic discontinuity points within a standard interval.
 */
function enumeratePeriodicPoints(
	periodic: PeriodicExclusion,
	opts: Required<ContinuityOptions>
): DiscontinuityCandidate[] {
	const candidates: DiscontinuityCandidate[] = [];

	// Try to evaluate base point and period numerically
	const baseValue = tryEvaluateNumeric(periodic.basePoint);
	const periodValue = tryEvaluateNumeric(periodic.period);

	if (baseValue === null || periodValue === null || periodValue <= 0) {
		// Can't enumerate, just return the base point
		return [
			{
				point: periodic.basePoint,
				source: detectSourceFromPeriodicExclusion(periodic),
				periodic: {
					basePoint: periodic.basePoint,
					period: periodic.period,
					description: describePeriodicPattern(
						periodic.basePoint,
						periodic.period,
						detectSourceFromPeriodicExclusion(periodic)
					)
				}
			}
		];
	}

	// Enumerate points in standard interval
	const { min, max } = opts.standardInterval;
	let count = 0;

	// Find starting k
	let k = Math.ceil((min - baseValue) / periodValue);

	while (count < opts.maxPeriodicPoints) {
		const pointValue = baseValue + k * periodValue;
		if (pointValue > max) break;

		if (pointValue >= min) {
			const source = detectSourceFromPeriodicExclusion(periodic);
			candidates.push({
				point: { type: 'number', value: formatNumber(pointValue) },
				source,
				periodic: {
					basePoint: periodic.basePoint,
					period: periodic.period,
					description: describePeriodicPattern(periodic.basePoint, periodic.period, source)
				}
			});
			count++;
		}

		k++;
	}

	return candidates;
}

/**
 * Find boundaries of piecewise functions (abs, sign, floor, ceil).
 */
function findPiecewiseBoundaries(
	expr: MathNode,
	variable: string,
	opts: Required<ContinuityOptions>
): DiscontinuityCandidate[] {
	const candidates: DiscontinuityCandidate[] = [];

	// Find all piecewise function calls
	const piecewiseFuncs = findNodes(
		expr,
		(node) =>
			isFunction(node) &&
			['abs', 'sign', 'sgn', 'floor', 'ceil', 'round', 'trunc'].includes(node.name.toLowerCase())
	);

	for (const funcNode of piecewiseFuncs) {
		if (!isFunction(funcNode) || funcNode.args.length === 0) continue;

		const arg = funcNode.args[0];
		const funcName = funcNode.name.toLowerCase();

		// For abs and sign: find zeros of the argument
		if (funcName === 'abs' || funcName === 'sign' || funcName === 'sgn') {
			const zeros = findArgumentZeros(arg, variable);
			for (const zero of zeros) {
				candidates.push({
					point: zero,
					source: funcName === 'abs' ? 'abs' : 'sign'
				});
			}
		}

		// For floor, ceil: find integer points in standard interval
		if (funcName === 'floor' || funcName === 'ceil') {
			// Check if argument is simply the variable
			if (arg.type === 'variable' && arg.name === variable) {
				const { min, max } = opts.standardInterval;
				const source: DiscontinuitySource = funcName === 'floor' ? 'floor' : 'ceil';

				for (let n = Math.ceil(min); n <= Math.floor(max); n++) {
					candidates.push({
						point: { type: 'number', value: String(n) },
						source
					});
				}
			}
		}
	}

	return candidates;
}

/**
 * Find periodic function discontinuities (tan, cot, sec, csc).
 *
 * These functions have discontinuities at periodic points that are
 * not captured by computeDomain (which returns universal domain).
 */
function findPeriodicFunctionDiscontinuities(
	expr: MathNode,
	variable: string,
	opts: Required<ContinuityOptions>
): DiscontinuityCandidate[] {
	const candidates: DiscontinuityCandidate[] = [];

	// Find all periodic trig function calls
	const periodicFuncs = findNodes(
		expr,
		(node) => isFunction(node) && ['tan', 'cot', 'sec', 'csc'].includes(node.name.toLowerCase())
	);

	for (const funcNode of periodicFuncs) {
		if (!isFunction(funcNode) || funcNode.args.length === 0) continue;

		const arg = funcNode.args[0];
		const funcName = funcNode.name.toLowerCase();

		// Only handle simple case: argument is the variable
		if (arg.type !== 'variable' || arg.name !== variable) continue;

		// Determine base point and period based on function
		let baseValue: number;
		const periodValue: number = Math.PI;
		let source: DiscontinuitySource;

		switch (funcName) {
			case 'tan':
			case 'sec':
				// Discontinuities at π/2 + kπ
				baseValue = Math.PI / 2;
				source = funcName === 'tan' ? 'tan' : 'sec';
				break;
			case 'cot':
			case 'csc':
				// Discontinuities at kπ
				baseValue = 0;
				source = funcName === 'cot' ? 'cot' : 'csc';
				break;
			default:
				continue;
		}

		// Create periodic info
		const basePoint: MathNode = { type: 'number', value: formatNumber(baseValue) };
		const period: MathNode = { type: 'number', value: formatNumber(periodValue) };

		// Enumerate points in standard interval
		const { min, max } = opts.standardInterval;
		let count = 0;
		let k = Math.ceil((min - baseValue) / periodValue);

		while (count < opts.maxPeriodicPoints) {
			const pointValue = baseValue + k * periodValue;
			if (pointValue > max) break;

			if (pointValue >= min) {
				candidates.push({
					point: { type: 'number', value: formatNumber(pointValue) },
					source,
					periodic: {
						basePoint,
						period,
						description: describePeriodicPattern(basePoint, period, source)
					}
				});
				count++;
			}

			k++;
		}
	}

	return candidates;
}

/**
 * Find zeros of an argument expression.
 * Simple cases: linear expressions like x, x-a, ax+b
 */
function findArgumentZeros(arg: MathNode, variable: string): MathNode[] {
	// Case 1: argument is just the variable
	if (arg.type === 'variable' && arg.name === variable) {
		return [{ type: 'number', value: '0' }];
	}

	// Case 2: argument is variable - constant
	if (arg.type === 'subtraction') {
		if (arg.left.type === 'variable' && arg.left.name === variable) {
			if (arg.right.type === 'number') {
				return [arg.right];
			}
		}
	}

	// Case 3: argument is constant - variable
	if (arg.type === 'subtraction') {
		if (arg.right.type === 'variable' && arg.right.name === variable) {
			if (arg.left.type === 'number') {
				return [arg.left];
			}
		}
	}

	// Case 4: argument is variable + constant
	if (arg.type === 'addition') {
		if (arg.left.type === 'variable' && arg.left.name === variable) {
			if (arg.right.type === 'number') {
				const val = -parseFloat(arg.right.value);
				return [{ type: 'number', value: formatNumber(val) }];
			}
		}
	}

	// For more complex cases, we'd need equation solving
	return [];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if function is continuous on its domain.
 *
 * A function is continuous on its domain if all discontinuities
 * are at points excluded from the domain.
 *
 * - For 1/x: discontinuity at x=0 is OUTSIDE domain ℝ\{0}, so continuous on domain
 * - For floor(x): discontinuities at integers are IN domain ℝ, so NOT continuous on domain
 */
function checkContinuousOnDomain(
	discontinuities: readonly Discontinuity[],
	domain: Domain
): boolean {
	if (isEmpty(domain)) {
		return true; // Vacuously continuous on empty domain
	}

	for (const disc of discontinuities) {
		const pointValue = tryEvaluateNumeric(disc.point);
		if (pointValue === null) continue;

		// Check if the discontinuity point is IN the domain
		const pointInDomain = containsValue(domain, pointValue);

		if (pointInDomain) {
			// Discontinuity is inside the domain - function is not continuous on its domain
			// This applies to jump discontinuities (floor at integers) and essential discontinuities
			if (disc.type === 'jump' || disc.type === 'essential') {
				return false;
			}
			// Removable discontinuities inside domain also break continuity
			if (disc.type === 'removable') {
				return false;
			}
		}
		// Infinite and removable discontinuities at excluded points don't affect continuity on domain
		// (e.g., 1/x at x=0 is continuous on ℝ\{0})
	}

	return true;
}

/**
 * Detect the source of a discontinuity from expression structure.
 */
function detectSourceFromExpression(
	expr: MathNode,
	_point: MathNode,
	_variable: string
): DiscontinuitySource {
	// Check for division
	if (expr.type === 'division') {
		return 'division';
	}

	// Check for functions
	const functions = findNodes(expr, isFunction);
	for (const func of functions) {
		if (!isFunction(func)) continue;
		const name = func.name.toLowerCase();

		if (name === 'tan') return 'tan';
		if (name === 'cot') return 'cot';
		if (name === 'sec') return 'sec';
		if (name === 'csc') return 'csc';
		if (name === 'ln' || name === 'log') return 'ln';
		if (name === 'sqrt') return 'sqrt';
		if (name === 'abs') return 'abs';
		if (name === 'sign' || name === 'sgn') return 'sign';
		if (name === 'floor') return 'floor';
		if (name === 'ceil') return 'ceil';
	}

	// Check for divisions in subexpressions
	const divisions = findNodes(expr, (node) => node.type === 'division');
	if (divisions.length > 0) {
		return 'division';
	}

	return 'other';
}

/**
 * Detect source from periodic exclusion pattern.
 */
function detectSourceFromPeriodicExclusion(periodic: PeriodicExclusion): DiscontinuitySource {
	// Heuristic based on base point and period
	const baseValue = tryEvaluateNumeric(periodic.basePoint);
	const periodValue = tryEvaluateNumeric(periodic.period);

	if (periodValue !== null && Math.abs(periodValue - Math.PI) < 0.01) {
		// Period is π
		if (baseValue !== null) {
			if (Math.abs(baseValue - Math.PI / 2) < 0.01) {
				return 'tan'; // π/2 + kπ
			}
			if (Math.abs(baseValue) < 0.01) {
				return 'cot'; // kπ
			}
		}
	}

	return 'other';
}

/**
 * Threshold for considering a value as "effectively infinite".
 * Values above this are treated as if the function is undefined.
 * Use 1e8 to catch most practical cases of vertical asymptotes.
 */
const INFINITY_THRESHOLD = 1e8;

/**
 * Try to evaluate expression at a point.
 * Returns null if evaluation fails or produces extremely large values
 * (which typically indicate vertical asymptotes).
 */
function tryEvaluateAtPoint(expr: MathNode, variable: string, point: MathNode): MathNode | null {
	try {
		const substituted = substitute(expr, { [variable]: point });
		const value = evaluateNodeToApproximatedNumber(substituted);

		if (Number.isFinite(value) && Math.abs(value) < INFINITY_THRESHOLD) {
			return { type: 'number', value: formatNumber(value) };
		}
	} catch {
		// Evaluation failed
	}

	return null;
}

/**
 * Try to evaluate a node to a number.
 */
function tryEvaluateNumeric(node: MathNode): number | null {
	try {
		const value = evaluateNodeToApproximatedNumber(node);
		return Number.isFinite(value) ? value : null;
	} catch {
		return null;
	}
}

/**
 * Get a unique key for a point (for deduplication).
 */
function getPointKey(point: MathNode): string {
	const value = tryEvaluateNumeric(point);
	if (value !== null) {
		// Round to avoid floating point comparison issues
		return String(Math.round(value * 1e10) / 1e10);
	}
	// Fallback to string representation
	return JSON.stringify(point);
}

/**
 * Check if an endpoint value represents infinity.
 */
function isInfinityEndpoint(value: MathNode): boolean {
	if (isInfinity(value)) return true;
	if (value.type === 'symbol' && value.symbol === 'infinity') return true;
	return false;
}

/**
 * Format a number nicely.
 */
function formatNumber(value: number): string {
	if (Math.abs(value - Math.round(value)) < 1e-10) {
		return String(Math.round(value));
	}
	return value.toPrecision(10).replace(/\.?0+$/, '');
}

/**
 * Simple node formatting for step descriptions.
 */
function formatNodeSimple(node: MathNode): string {
	if (node.type === 'number') return node.value;
	if (node.type === 'infinity') return node.sign === 'positive' ? '+∞' : '-∞';
	if (node.type === 'symbol' && node.symbol === 'infinity') return '∞';
	return '...';
}
