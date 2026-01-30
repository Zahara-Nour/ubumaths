/**
 * Differentiability Analysis Module
 *
 * Provides comprehensive differentiability analysis for mathematical expressions.
 * Identifies non-differentiable points (angular, cusp, vertical tangent,
 * discontinuity, boundary) and computes the domain of differentiability.
 *
 * @module mathAST/analysis/differentiability
 *
 * @example
 * ```typescript
 * import { analyzeDifferentiability } from '$lib/mathAST/analysis';
 * import { parse } from '$lib/mathAST/parser';
 *
 * // Analyze |x|
 * const expr = parse('abs(x)');
 * const result = analyzeDifferentiability(expr, 'x');
 *
 * console.log(result.nonDifferentiablePoints);
 * // [{ point: 0, type: 'angular', leftDerivative: -1, rightDerivative: 1 }]
 * ```
 */

import type { MathNode, FunctionNode, SuperscriptNode } from '../types';
import type { Domain, IntervalSet } from '../domain/types';
import type { Verbosity } from '../common/verbosity';
import type {
	NonDifferentiablePoint,
	NonDifferentiabilitySource,
	NonDifferentiabilityCandidate,
	BoundaryBehavior,
	DifferentiabilityResult,
	DifferentiabilityStep,
	DifferentiabilityOptions,
	DifferentiabilityRule,
	DerivativeLimit
} from './differentiability-types';
import type { Discontinuity } from './continuity-types';

import { computeDomain, containsValue, isEmpty, findZeros, excludePoints } from '../domain';
import { analyzeContinuity } from './continuity';
import { differentiate } from '../differentiation';
import { analyzeOneSidedLimits } from '../limits/evaluate';
import { substitute } from '../eval/substitute';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';
import { isInfinity, isFunction } from '../guards';
import { findNodes } from '../transforms';
import { shouldIncludeStep } from '../common/verbosity';
import { solveEquation } from '../solve';
import { equals, number as numNode } from '../factory';
import {
	describeNonDifferentiablePoint,
	describeBoundary,
	describePeriodicNonDifferentiability,
	summarizeDifferentiabilityResult
} from './differentiability-steps';

// =============================================================================
// Default Options
// =============================================================================

const DEFAULT_OPTIONS: Required<DifferentiabilityOptions> = {
	verbosity: 'summarized',
	standardInterval: { min: -2 * Math.PI, max: 2 * Math.PI },
	maxPeriodicPoints: 10,
	computeDerivativeLimits: true,
	includeContinuityAnalysis: true,
	timeout: 5000
};

// =============================================================================
// Step Recording
// =============================================================================

/**
 * Step recorder for differentiability analysis.
 */
class DifferentiabilityStepRecorder {
	private steps: DifferentiabilityStep[] = [];
	private nextId = 1;

	recordStep(
		rule: DifferentiabilityRule,
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

	getStepsFiltered(verbosity: Verbosity): readonly DifferentiabilityStep[] {
		return this.steps.filter((step) => shouldIncludeStep(step.verbosityLevel, verbosity));
	}
}

// =============================================================================
// Main API
// =============================================================================

/**
 * Analyze the differentiability of an expression.
 *
 * Computes the domain, finds all non-differentiable points, classifies them,
 * and produces a unified report with pedagogical explanations.
 *
 * @param expr - The mathematical expression to analyze
 * @param variable - The variable name (default: 'x')
 * @param options - Analysis options
 * @returns Complete differentiability analysis result
 */
export function analyzeDifferentiability(
	expr: MathNode,
	variable: string = 'x',
	options: DifferentiabilityOptions = {}
): DifferentiabilityResult {
	const opts: Required<DifferentiabilityOptions> = { ...DEFAULT_OPTIONS, ...options };
	const recorder = new DifferentiabilityStepRecorder();

	// Step 1: Compute domain of definition
	recorder.recordStep(
		'domain-computation',
		'Calcul du domaine de définition',
		'summarized',
		undefined,
		undefined,
		'Utilisation de computeDomain()'
	);

	const { domain: definitionDomain } = computeDomain(expr, variable);

	// Step 2: Continuity analysis (discontinuities are non-differentiable)
	let discontinuities: readonly Discontinuity[] = [];
	if (opts.includeContinuityAnalysis) {
		recorder.recordStep(
			'continuity-analysis',
			'Analyse de la continuité (les discontinuités sont des points de non-dérivabilité)',
			'detailed'
		);

		const continuityResult = analyzeContinuity(expr, variable, {
			verbosity: 'result',
			standardInterval: opts.standardInterval,
			maxPeriodicPoints: opts.maxPeriodicPoints,
			timeout: opts.timeout
		});
		discontinuities = continuityResult.discontinuities;
	}

	// Step 3: Find non-differentiability candidates
	recorder.recordStep(
		'candidate-extraction',
		'Recherche des points candidats à une non-dérivabilité',
		'detailed'
	);

	const candidates = findNonDifferentiabilityCandidates(expr, variable, definitionDomain, opts);

	// Step 4: Analyze each candidate
	const nonDifferentiablePoints: NonDifferentiablePoint[] = [];
	const seenPoints = new Set<string>();

	// First, add discontinuities as non-differentiable points
	// But filter out domain boundaries that are actually continuous from one side
	for (const disc of discontinuities) {
		const key = getPointKey(disc.point);
		if (seenPoints.has(key)) continue;

		// Check if this "discontinuity" is actually a domain boundary
		// For sources like sqrt, ln, log - the point may be a boundary where the function
		// is continuous from one side (not a true discontinuity)
		const isBoundarySource = ['sqrt', 'ln', 'log'].includes(disc.source);
		if (isBoundarySource) {
			// This will be handled as a boundary in the candidate analysis below
			// Skip adding it as a discontinuity
			continue;
		}

		seenPoints.add(key);
		nonDifferentiablePoints.push({
			point: disc.point,
			type: 'discontinuity',
			source: disc.source,
			isContinuous: false,
			leftDerivative: 'undefined',
			rightDerivative: 'undefined',
			discontinuity: disc,
			description: 'Point de discontinuité (non dérivable)',
			periodic: disc.periodic
				? {
						basePoint: disc.periodic.basePoint,
						period: disc.periodic.period,
						description: disc.periodic.description
					}
				: undefined
		});

		recorder.recordStep(
			'classification',
			describeNonDifferentiablePoint(
				nonDifferentiablePoints[nonDifferentiablePoints.length - 1],
				variable
			),
			'summarized',
			disc.point,
			'discontinuity'
		);
	}

	// Then analyze other candidates (abs patterns, fractional powers)
	for (const candidate of candidates) {
		const key = getPointKey(candidate.point);
		if (seenPoints.has(key)) continue; // Skip if already identified as discontinuity

		recorder.recordStep(
			'derivative-limit-evaluation',
			`Analyse au point ${formatNodeSimple(candidate.point)}`,
			'detailed',
			candidate.point
		);

		const ndp = analyzePointDifferentiability(expr, variable, candidate, opts);
		if (ndp) {
			seenPoints.add(key);
			nonDifferentiablePoints.push(ndp);

			recorder.recordStep(
				'classification',
				describeNonDifferentiablePoint(ndp, variable),
				'summarized',
				ndp.point,
				ndp.type
			);
		}
	}

	// Step 5: Analyze boundary behavior
	recorder.recordStep(
		'boundary-analysis',
		'Analyse du comportement aux bornes du domaine',
		'detailed'
	);

	const boundaryBehavior = analyzeBoundaryBehavior(expr, variable, definitionDomain, opts);

	// Step 6: Compute differentiability domain
	const differentiabilityDomain = computeDifferentiabilityDomainFromPoints(
		definitionDomain,
		nonDifferentiablePoints
	);

	// Step 7: Check if differentiable on domain
	const isDifferentiableOnDomain = checkDifferentiableOnDomain(
		nonDifferentiablePoints,
		definitionDomain
	);

	// Add summary step
	if (opts.verbosity !== 'result') {
		recorder.recordStep(
			'classification',
			summarizeDifferentiabilityResult(nonDifferentiablePoints, isDifferentiableOnDomain, variable),
			'summarized'
		);
	}

	return {
		domain: differentiabilityDomain,
		nonDifferentiablePoints,
		boundaryBehavior,
		isDifferentiableOnDomain,
		variable,
		...(opts.verbosity !== 'result' && { steps: recorder.getStepsFiltered(opts.verbosity) })
	};
}

/**
 * Find all potential non-differentiability points in an expression.
 *
 * Extracts candidates from:
 * - Absolute value patterns: |f(x)| at zeros of f
 * - Fractional powers: g(x)^(p/q) with 0 < p/q < 1 at zeros of g
 * - Domain boundaries
 *
 * @param expr - The expression
 * @param variable - The variable name
 * @param domain - Pre-computed domain (optional)
 * @param options - Analysis options
 * @returns Array of candidate points with their suspected sources
 */
export function findNonDifferentiabilityCandidates(
	expr: MathNode,
	variable: string,
	domain?: Domain,
	options: DifferentiabilityOptions = {}
): NonDifferentiabilityCandidate[] {
	const opts: Required<DifferentiabilityOptions> = { ...DEFAULT_OPTIONS, ...options };
	const candidates: NonDifferentiabilityCandidate[] = [];
	const seenPoints = new Set<string>();

	// Get domain if not provided
	const actualDomain = domain ?? computeDomain(expr, variable).domain;

	// 1. Find absolute value patterns: |f(x)| has angular points at zeros of f
	const absCandidates = findAbsPatterns(expr, variable, opts);
	for (const pc of absCandidates) {
		const key = getPointKey(pc.point);
		if (!seenPoints.has(key)) {
			seenPoints.add(key);
			candidates.push(pc);
		}
	}

	// 2. Find fractional power patterns: g(x)^(p/q) with 0 < p/q < 1
	const fractionalPowerCandidates = findFractionalPowerPatterns(expr, variable, opts);
	for (const pc of fractionalPowerCandidates) {
		const key = getPointKey(pc.point);
		if (!seenPoints.has(key)) {
			seenPoints.add(key);
			candidates.push(pc);
		}
	}

	// 3. Find domain boundaries (sqrt(f(x)) at zeros of f, etc.)
	const boundaryCandidates = findDomainBoundaries(actualDomain, expr, variable);
	for (const pc of boundaryCandidates) {
		const key = getPointKey(pc.point);
		if (!seenPoints.has(key)) {
			seenPoints.add(key);
			candidates.push(pc);
		}
	}

	return candidates;
}

/**
 * Check differentiability at a specific point.
 *
 * Evaluates one-sided derivative limits to determine
 * if the function is differentiable at the point, and if not,
 * classifies the type of non-differentiability.
 *
 * @param expr - The expression
 * @param variable - The variable name
 * @param point - The point to check
 * @returns NonDifferentiablePoint info if non-differentiable, null if differentiable
 */
export function checkDifferentiabilityAtPoint(
	expr: MathNode,
	variable: string,
	point: MathNode
): NonDifferentiablePoint | null {
	const candidate: NonDifferentiabilityCandidate = {
		point,
		source: detectSourceFromExpression(expr, point, variable)
	};

	return analyzePointDifferentiability(expr, variable, candidate, DEFAULT_OPTIONS);
}

/**
 * Compute only the domain of differentiability.
 *
 * @param expr - The expression
 * @param variable - The variable name
 * @returns The domain where the function is differentiable
 */
export function computeDifferentiabilityDomain(expr: MathNode, variable: string = 'x'): Domain {
	const result = analyzeDifferentiability(expr, variable, { verbosity: 'result' });
	return result.domain;
}

// =============================================================================
// Pattern Detection
// =============================================================================

/**
 * Find absolute value patterns: |f(x)| at zeros of f.
 * These create angular points (corners) where the left and right derivatives differ.
 */
function findAbsPatterns(
	expr: MathNode,
	variable: string,
	opts: Required<DifferentiabilityOptions>
): NonDifferentiabilityCandidate[] {
	const candidates: NonDifferentiabilityCandidate[] = [];

	// Find all abs() function calls
	const absFuncs = findNodes(
		expr,
		(node) => isFunction(node) && node.name.toLowerCase() === 'abs'
	) as FunctionNode[];

	for (const absFunc of absFuncs) {
		if (absFunc.args.length === 0) continue;

		const arg = absFunc.args[0];

		// Find zeros of the argument
		const zeros = findArgumentZeros(arg, variable);

		for (const zero of zeros) {
			// Check if zero is in the standard interval
			const zeroValue = tryEvaluateNumeric(zero);
			if (zeroValue !== null) {
				if (zeroValue < opts.standardInterval.min || zeroValue > opts.standardInterval.max) {
					continue;
				}
			}

			candidates.push({
				point: zero,
				source: 'abs_composed'
			});
		}

		// Check for periodic patterns (e.g., |sin(x)| has zeros at k*pi)
		const periodicInfo = detectPeriodicZeros(arg, variable);
		if (periodicInfo) {
			const periodicCandidates = enumeratePeriodicPoints(
				periodicInfo.basePoint,
				periodicInfo.period,
				'abs_composed',
				opts
			);
			for (const pc of periodicCandidates) {
				candidates.push(pc);
			}
		}
	}

	return candidates;
}

/**
 * Find fractional power patterns: g(x)^(p/q) with 0 < p/q < 1.
 * These create cusps (p even) or vertical tangents (p odd) at zeros of g.
 */
function findFractionalPowerPatterns(
	expr: MathNode,
	variable: string,
	opts: Required<DifferentiabilityOptions>
): NonDifferentiabilityCandidate[] {
	const candidates: NonDifferentiabilityCandidate[] = [];

	// Find all superscript nodes (powers)
	const powers = findNodes(expr, (node) => node.type === 'superscript') as SuperscriptNode[];

	for (const power of powers) {
		const base = power.base;
		const exponent = power.superscript;

		// Try to extract fraction from exponent
		// Handle direct division nodes (e.g., x^{2/3} where exponent is division)
		// or numeric values that are fractions
		const fractionInfo = extractFractionFromExponent(exponent);
		if (!fractionInfo) continue;

		const { p, q, value: exponentValue } = fractionInfo;

		// Only interested in 0 < p/q < 1
		if (exponentValue <= 0 || exponentValue >= 1) continue;
		if (q === 1) continue; // Not a proper fraction

		// Determine the type based on p
		const source: NonDifferentiabilitySource =
			p % 2 === 0 ? 'fractional_power_cusp' : 'fractional_power_vertical';

		// Find zeros of the base
		const zeros = findArgumentZeros(base, variable);

		for (const zero of zeros) {
			// Check if zero is in the standard interval
			const zeroValue = tryEvaluateNumeric(zero);
			if (zeroValue !== null) {
				if (zeroValue < opts.standardInterval.min || zeroValue > opts.standardInterval.max) {
					continue;
				}
			}

			candidates.push({
				point: zero,
				source
			});
		}
	}

	// Also check for sqrt(g(x)) = g(x)^(1/2) which has vertical tangent at zeros
	const sqrtFuncs = findNodes(
		expr,
		(node) => isFunction(node) && node.name.toLowerCase() === 'sqrt'
	) as FunctionNode[];

	for (const sqrtFunc of sqrtFuncs) {
		if (sqrtFunc.args.length === 0) continue;

		const arg = sqrtFunc.args[0];
		const zeros = findArgumentZeros(arg, variable);

		for (const zero of zeros) {
			const zeroValue = tryEvaluateNumeric(zero);
			if (zeroValue !== null) {
				if (zeroValue < opts.standardInterval.min || zeroValue > opts.standardInterval.max) {
					continue;
				}
			}

			candidates.push({
				point: zero,
				source: 'sqrt_boundary' // sqrt boundary = vertical tangent or boundary
			});
		}
	}

	return candidates;
}

/**
 * Find domain boundaries that may affect differentiability.
 */
function findDomainBoundaries(
	domain: Domain,
	expr: MathNode,
	variable: string
): NonDifferentiabilityCandidate[] {
	const candidates: NonDifferentiabilityCandidate[] = [];

	if (domain.kind === 'interval_set') {
		const intervalSet = domain as IntervalSet;

		// Check interval endpoints (domain boundaries)
		for (const interval of intervalSet.intervals) {
			// Lower bound
			if (!isInfinityEndpoint(interval.lower.value)) {
				candidates.push({
					point: interval.lower.value,
					source: detectSourceFromExpression(expr, interval.lower.value, variable)
				});
			}

			// Upper bound
			if (!isInfinityEndpoint(interval.upper.value)) {
				candidates.push({
					point: interval.upper.value,
					source: detectSourceFromExpression(expr, interval.upper.value, variable)
				});
			}
		}
	}

	return candidates;
}

// =============================================================================
// Point Analysis
// =============================================================================

/**
 * Analyze differentiability at a candidate point.
 */
function analyzePointDifferentiability(
	expr: MathNode,
	variable: string,
	candidate: NonDifferentiabilityCandidate,
	opts: Required<DifferentiabilityOptions>
): NonDifferentiablePoint | null {
	const { point, source, periodic } = candidate;

	// Check if point is in domain
	const { domain } = computeDomain(expr, variable);
	const pointValue = tryEvaluateNumeric(point);

	// If point is exactly on domain boundary
	const isOnBoundary = pointValue !== null && !containsValue(domain, pointValue);

	// Special handling for abs patterns: |f(x)| has angular point at zeros of f
	// The derivative of |x| is sign(x), which has left limit = -1 and right limit = +1 at 0
	if (source === 'abs_composed' || source === 'abs') {
		// For abs patterns, we know it's an angular point without computing derivatives
		// The left derivative of |f(x)| at a zero approaches -|f'(x₀)|
		// The right derivative approaches +|f'(x₀)|
		// For simple |x|, this is -1 and +1
		const absDerivatives = computeAbsDerivativesAtZero(expr, variable, point);

		return {
			point,
			type: 'angular',
			source,
			isContinuous: true, // |f(x)| is continuous at zeros of f
			leftDerivative: absDerivatives.left,
			rightDerivative: absDerivatives.right,
			description: '',
			periodic
		};
	}

	// Evaluate one-sided derivative limits
	let leftDerivative: DerivativeLimit = 'undefined';
	let rightDerivative: DerivativeLimit = 'undefined';

	if (opts.computeDerivativeLimits) {
		leftDerivative = evaluateOneSidedDerivativeLimit(expr, variable, point, 'left');
		rightDerivative = evaluateOneSidedDerivativeLimit(expr, variable, point, 'right');
	}

	// Classify the type of non-differentiability
	const type = classifyNonDifferentiability(leftDerivative, rightDerivative, isOnBoundary, source);

	// If derivatives exist and are equal, the function is differentiable
	if (type === null) {
		return null;
	}

	// Check continuity at this point (unless it's a boundary)
	let isContinuous = true;
	if (!isOnBoundary) {
		try {
			const funcValue = tryEvaluateAtPoint(expr, variable, point);
			isContinuous = funcValue !== null;
		} catch {
			isContinuous = true; // Assume continuous if can't evaluate
		}
	}

	return {
		point,
		type,
		source,
		isContinuous,
		leftDerivative,
		rightDerivative,
		description: '', // Will be filled by describeNonDifferentiablePoint
		periodic
	};
}

/**
 * Compute one-sided derivatives for |f(x)| at a zero of f.
 * For |f(x)|, the derivative is sign(f(x)) * f'(x).
 * At a zero: left derivative = -|f'(x₀)|, right derivative = +|f'(x₀)|
 * (or the opposite depending on the sign of f near the zero)
 */
function computeAbsDerivativesAtZero(
	expr: MathNode,
	variable: string,
	point: MathNode
): { left: DerivativeLimit; right: DerivativeLimit } {
	// Find the abs function and its argument
	const absFuncs = findNodes(
		expr,
		(node) => isFunction(node) && node.name.toLowerCase() === 'abs'
	) as FunctionNode[];

	if (absFuncs.length === 0) {
		// Default for simple |x|
		return {
			left: numNode('-1'),
			right: numNode('1')
		};
	}

	const absFunc = absFuncs[0];
	const arg = absFunc.args[0];

	if (!arg) {
		return { left: numNode('-1'), right: numNode('1') };
	}

	// Try to compute f'(x₀)
	try {
		const argDerivative = differentiate(arg, { variable });
		const derivAtPoint = substitute(argDerivative, { [variable]: point });
		const derivValue = evaluateNodeToApproximatedNumber(derivAtPoint);

		if (Number.isFinite(derivValue) && Math.abs(derivValue) > 1e-10) {
			// Determine sign of f(x) on each side of the zero
			// to know which side gives positive vs negative derivative
			const epsilon = 1e-6;
			const pointValue = tryEvaluateNumeric(point) ?? 0;

			const leftX = pointValue - epsilon;
			const rightX = pointValue + epsilon;

			const leftFNode = substitute(arg, { [variable]: numNode(String(leftX)) });
			const rightFNode = substitute(arg, { [variable]: numNode(String(rightX)) });

			const leftFValue = evaluateNodeToApproximatedNumber(leftFNode);
			const rightFValue = evaluateNodeToApproximatedNumber(rightFNode);

			// |f(x)|' = sign(f(x)) * f'(x)
			// On left of zero: sign(f) determines if derivative is positive or negative
			const leftSign = leftFValue >= 0 ? 1 : -1;
			const rightSign = rightFValue >= 0 ? 1 : -1;

			const leftDeriv = leftSign * derivValue;
			const rightDeriv = rightSign * derivValue;

			return {
				left: numNode(formatNumber(leftDeriv)),
				right: numNode(formatNumber(rightDeriv))
			};
		}
	} catch {
		// Differentiation failed, use default
	}

	// Default: assume simple |x| behavior
	return {
		left: numNode('-1'),
		right: numNode('1')
	};
}

/**
 * Classify the type of non-differentiability based on derivative limits.
 */
function classifyNonDifferentiability(
	leftDerivative: DerivativeLimit,
	rightDerivative: DerivativeLimit,
	isOnBoundary: boolean,
	source: NonDifferentiabilitySource
): NonDifferentiabilityType | null {
	// If both derivatives are undefined, could be a boundary
	if (leftDerivative === 'undefined' && rightDerivative === 'undefined') {
		if (isOnBoundary) {
			return 'boundary';
		}
		return null; // Can't determine
	}

	// Boundary case: only one side exists
	if (leftDerivative === 'undefined' || rightDerivative === 'undefined') {
		return 'boundary';
	}

	// Check for infinite derivatives
	const leftInfinite = leftDerivative === 'infinite' || leftDerivative === '-infinite';
	const rightInfinite = rightDerivative === 'infinite' || rightDerivative === '-infinite';

	if (leftInfinite && rightInfinite) {
		// Both infinite: cusp or vertical tangent
		const leftSign = leftDerivative === 'infinite' ? 1 : -1;
		const rightSign = rightDerivative === 'infinite' ? 1 : -1;

		if (leftSign === rightSign) {
			return 'cusp'; // Same sign -> cusp (e.g., x^(2/3))
		} else {
			return 'vertical_tangent'; // Opposite signs -> vertical tangent (e.g., x^(1/3))
		}
	}

	if (leftInfinite || rightInfinite) {
		return 'vertical_tangent'; // One side infinite
	}

	// Both finite: check if equal
	const leftValue = getNumericDerivativeValue(leftDerivative);
	const rightValue = getNumericDerivativeValue(rightDerivative);

	if (leftValue !== null && rightValue !== null) {
		if (Math.abs(leftValue - rightValue) < 1e-10) {
			return null; // Derivatives are equal -> differentiable
		}
		return 'angular'; // Different finite derivatives -> angular point
	}

	// Source-based fallback
	if (source === 'abs_composed' || source === 'abs') {
		return 'angular';
	}
	if (source === 'fractional_power_cusp') {
		return 'cusp';
	}
	if (source === 'fractional_power_vertical' || source === 'sqrt_boundary') {
		return 'vertical_tangent';
	}

	return null;
}

/**
 * Evaluate the one-sided derivative limit at a point.
 */
function evaluateOneSidedDerivativeLimit(
	expr: MathNode,
	variable: string,
	point: MathNode,
	direction: 'left' | 'right'
): DerivativeLimit {
	let derivative: MathNode;

	try {
		// Compute symbolic derivative
		derivative = differentiate(expr, { variable });
	} catch {
		// Differentiation failed - try numeric approximation
		return approximateDerivativeLimit(expr, variable, point, direction);
	}

	try {
		// Evaluate limit of derivative
		const oneSided = analyzeOneSidedLimits(derivative, variable, point, {
			verbosity: 'result',
			timeout: 2000
		});

		const result = direction === 'left' ? oneSided.left : oneSided.right;

		if (!result || result.status === 'does-not-exist') {
			return 'undefined';
		}

		// Handle 'unsupported' status by falling back to numeric approximation
		if (result.status === 'unsupported') {
			return approximateDerivativeLimitFromDerivative(derivative, variable, point, direction);
		}

		if (result.status === 'infinite' && result.value) {
			if (isInfinity(result.value)) {
				return result.value.sign === 'positive' ? 'infinite' : '-infinite';
			}
			// Check if it's a very large number
			const numValue = tryEvaluateNumeric(result.value);
			if (numValue !== null && Math.abs(numValue) > 1e10) {
				return numValue > 0 ? 'infinite' : '-infinite';
			}
		}

		if (result.value) {
			return result.value;
		}

		// Fallback to numeric approximation for other unhandled cases
		return approximateDerivativeLimitFromDerivative(derivative, variable, point, direction);
	} catch {
		// Try numeric approximation with the already computed derivative
		return approximateDerivativeLimitFromDerivative(derivative, variable, point, direction);
	}
}

/**
 * Approximate derivative limit numerically by computing derivative first.
 */
function approximateDerivativeLimit(
	expr: MathNode,
	variable: string,
	point: MathNode,
	direction: 'left' | 'right'
): DerivativeLimit {
	try {
		const derivative = differentiate(expr, { variable });
		return approximateDerivativeLimitFromDerivative(derivative, variable, point, direction);
	} catch {
		return 'undefined';
	}
}

/**
 * Approximate derivative limit numerically from pre-computed derivative.
 * Evaluates the derivative at points approaching the target point.
 */
function approximateDerivativeLimitFromDerivative(
	derivative: MathNode,
	variable: string,
	point: MathNode,
	direction: 'left' | 'right'
): DerivativeLimit {
	const pointValue = tryEvaluateNumeric(point);
	if (pointValue === null) return 'undefined';

	// Use progressively smaller epsilon values to detect behavior
	const epsilons = [1e-4, 1e-6, 1e-8];
	const sign = direction === 'left' ? -1 : 1;

	try {
		const values: number[] = [];

		for (const epsilon of epsilons) {
			const x = pointValue + sign * epsilon;
			const substituted = substitute(derivative, { [variable]: numNode(String(x)) });
			const value = evaluateNodeToApproximatedNumber(substituted);

			if (!Number.isFinite(value)) {
				// If we get NaN/Infinity early, the limit is likely undefined or infinite
				if (values.length > 0) {
					const lastValue = values[values.length - 1];
					if (Math.abs(lastValue) > 1e6) {
						return lastValue > 0 ? 'infinite' : '-infinite';
					}
				}
				return 'undefined';
			}

			values.push(value);
		}

		// Check if values are growing unboundedly (indicating infinity)
		if (values.length >= 2) {
			const ratio = Math.abs(values[values.length - 1]) / Math.abs(values[0]);
			// If the ratio is large and values are getting bigger, it's likely infinite
			if (ratio > 10 && Math.abs(values[values.length - 1]) > 1e6) {
				return values[values.length - 1] > 0 ? 'infinite' : '-infinite';
			}
		}

		// Check if the last value indicates infinity
		const lastValue = values[values.length - 1];
		if (Math.abs(lastValue) > 1e10) {
			return lastValue > 0 ? 'infinite' : '-infinite';
		}

		// Return the finite limit
		return numNode(formatNumber(lastValue));
	} catch {
		return 'undefined';
	}
}

// =============================================================================
// Boundary Analysis
// =============================================================================

/**
 * Analyze derivative behavior at domain boundaries.
 */
function analyzeBoundaryBehavior(
	expr: MathNode,
	variable: string,
	domain: Domain,
	_opts: Required<DifferentiabilityOptions>
): BoundaryBehavior[] {
	const behaviors: BoundaryBehavior[] = [];

	if (domain.kind !== 'interval_set') {
		return behaviors;
	}

	const intervalSet = domain as IntervalSet;

	for (const interval of intervalSet.intervals) {
		// Lower bound (if finite)
		if (!isInfinityEndpoint(interval.lower.value)) {
			const derivLimit = evaluateOneSidedDerivativeLimit(
				expr,
				variable,
				interval.lower.value,
				'right'
			);

			behaviors.push({
				point: interval.lower.value,
				side: 'right',
				derivativeLimit: derivLimit,
				description: describeBoundary(
					{
						point: interval.lower.value,
						side: 'right',
						derivativeLimit: derivLimit,
						description: ''
					},
					variable
				)
			});
		}

		// Upper bound (if finite)
		if (!isInfinityEndpoint(interval.upper.value)) {
			const derivLimit = evaluateOneSidedDerivativeLimit(
				expr,
				variable,
				interval.upper.value,
				'left'
			);

			behaviors.push({
				point: interval.upper.value,
				side: 'left',
				derivativeLimit: derivLimit,
				description: describeBoundary(
					{
						point: interval.upper.value,
						side: 'left',
						derivativeLimit: derivLimit,
						description: ''
					},
					variable
				)
			});
		}
	}

	return behaviors;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Compute differentiability domain from definition domain and non-differentiable points.
 */
function computeDifferentiabilityDomainFromPoints(
	definitionDomain: Domain,
	nonDifferentiablePoints: readonly NonDifferentiablePoint[]
): Domain {
	if (nonDifferentiablePoints.length === 0) {
		return definitionDomain;
	}

	// Collect points to exclude (only interior non-differentiable points)
	const pointsToExclude: MathNode[] = [];

	for (const ndp of nonDifferentiablePoints) {
		// Don't exclude boundary points (they're not in the domain anyway)
		if (ndp.type !== 'boundary') {
			pointsToExclude.push(ndp.point);
		}
	}

	if (pointsToExclude.length === 0) {
		return definitionDomain;
	}

	return excludePoints(definitionDomain, pointsToExclude);
}

/**
 * Check if function is differentiable on its entire domain of definition.
 */
function checkDifferentiableOnDomain(
	nonDifferentiablePoints: readonly NonDifferentiablePoint[],
	domain: Domain
): boolean {
	if (isEmpty(domain)) {
		return true; // Vacuously differentiable on empty domain
	}

	for (const ndp of nonDifferentiablePoints) {
		// Boundary points don't count against differentiability on domain
		if (ndp.type === 'boundary') {
			continue;
		}

		const pointValue = tryEvaluateNumeric(ndp.point);
		if (pointValue === null) continue;

		// Check if the non-differentiable point is in the domain
		if (containsValue(domain, pointValue)) {
			return false;
		}
	}

	return true;
}

/**
 * Find zeros of an argument expression.
 */
function findArgumentZeros(arg: MathNode, variable: string): MathNode[] {
	// Tier 1: Try algebraic method from domain module
	try {
		const algebraicZeros = findZeros(arg, variable);
		if (algebraicZeros.length > 0) {
			return algebraicZeros.map((z) => numNode(formatNumber(z)));
		}
	} catch {
		// findZeros failed, try solver
	}

	// Tier 2: Try equation solver
	try {
		const equation = equals(arg, numNode('0'));
		const result = solveEquation(equation, {
			variable,
			verbosity: 'result',
			maxIterations: 50
		});

		if (result.status === 'unique' || result.status === 'multiple') {
			return result.solutions.map((s) => normalizeSolutionToNumber(s.value));
		}
	} catch {
		// Solver also failed
	}

	return [];
}

/**
 * Detect periodic zeros in an expression (e.g., sin(x) has zeros at k*pi).
 */
function detectPeriodicZeros(
	expr: MathNode,
	variable: string
): { basePoint: MathNode; period: MathNode } | null {
	// Check for sin(x) or cos(x)
	if (isFunction(expr)) {
		const name = expr.name.toLowerCase();
		const arg = expr.args[0];

		// Only handle simple case: argument is the variable
		if (arg?.type !== 'variable' || arg.name !== variable) {
			return null;
		}

		if (name === 'sin') {
			// sin(x) = 0 at x = k*pi
			return {
				basePoint: numNode('0'),
				period: numNode(String(Math.PI))
			};
		}

		if (name === 'cos') {
			// cos(x) = 0 at x = pi/2 + k*pi
			return {
				basePoint: numNode(String(Math.PI / 2)),
				period: numNode(String(Math.PI))
			};
		}
	}

	return null;
}

/**
 * Enumerate periodic points within the standard interval.
 */
function enumeratePeriodicPoints(
	basePoint: MathNode,
	period: MathNode,
	source: NonDifferentiabilitySource,
	opts: Required<DifferentiabilityOptions>
): NonDifferentiabilityCandidate[] {
	const candidates: NonDifferentiabilityCandidate[] = [];

	const baseValue = tryEvaluateNumeric(basePoint);
	const periodValue = tryEvaluateNumeric(period);

	if (baseValue === null || periodValue === null || periodValue <= 0) {
		return candidates;
	}

	const { min, max } = opts.standardInterval;
	let count = 0;

	let k = Math.ceil((min - baseValue) / periodValue);

	while (count < opts.maxPeriodicPoints) {
		const pointValue = baseValue + k * periodValue;
		if (pointValue > max) break;

		if (pointValue >= min) {
			candidates.push({
				point: numNode(formatNumber(pointValue)),
				source,
				periodic: {
					basePoint,
					period,
					description: describePeriodicNonDifferentiability(basePoint, period, source)
				}
			});
			count++;
		}

		k++;
	}

	return candidates;
}

/**
 * Extract fraction information from an exponent node.
 * Handles both division nodes (like x^{2/3}) and numeric values.
 */
function extractFractionFromExponent(
	exponent: MathNode
): { p: number; q: number; value: number } | null {
	// Unwrap delimiter if present (e.g., {2/3} is often wrapped)
	let node = exponent;
	if (node.type === 'delimiter') {
		node = node.content;
	}

	// Handle direct division node: 2/3
	if (node.type === 'division') {
		const numValue = tryEvaluateNumeric(node.numerator);
		const denValue = tryEvaluateNumeric(node.denominator);

		if (numValue !== null && denValue !== null && denValue !== 0) {
			const p = Math.round(numValue);
			const q = Math.round(denValue);
			// Check that the numbers are actually integers
			if (Math.abs(numValue - p) < 1e-10 && Math.abs(denValue - q) < 1e-10) {
				return { p, q, value: numValue / denValue };
			}
		}
	}

	// Handle numeric value (evaluate and extract fraction)
	const numericValue = tryEvaluateNumeric(node);
	if (numericValue !== null) {
		const frac = extractFraction(numericValue);
		return { p: frac.p, q: frac.q, value: numericValue };
	}

	return null;
}

/**
 * Extract fraction p/q from a decimal value.
 */
function extractFraction(value: number): { p: number; q: number } {
	// Common fractions for p/q < 1
	const commonFractions = [
		{ p: 1, q: 2 }, // 0.5
		{ p: 1, q: 3 }, // 0.333...
		{ p: 2, q: 3 }, // 0.666...
		{ p: 1, q: 4 }, // 0.25
		{ p: 3, q: 4 }, // 0.75
		{ p: 1, q: 5 }, // 0.2
		{ p: 2, q: 5 }, // 0.4
		{ p: 3, q: 5 }, // 0.6
		{ p: 4, q: 5 } // 0.8
	];

	for (const frac of commonFractions) {
		if (Math.abs(value - frac.p / frac.q) < 1e-10) {
			return frac;
		}
	}

	return { p: 1, q: 1 }; // Default: not a recognized fraction
}

/**
 * Normalize a solution node to a number node if possible.
 */
function normalizeSolutionToNumber(node: MathNode): MathNode {
	if (node.type === 'number') {
		return node;
	}

	if (node.type === 'opposite' && node.operand.type === 'number') {
		const val = -parseFloat(node.operand.value);
		return numNode(formatNumber(val));
	}

	const numericValue = tryEvaluateNumeric(node);
	if (numericValue !== null) {
		return numNode(formatNumber(numericValue));
	}

	return node;
}

/**
 * Detect the source of non-differentiability from expression structure.
 */
function detectSourceFromExpression(
	expr: MathNode,
	_point: MathNode,
	_variable: string
): NonDifferentiabilitySource {
	// Check for abs
	const absFuncs = findNodes(expr, (node) => isFunction(node) && node.name.toLowerCase() === 'abs');
	if (absFuncs.length > 0) {
		return 'abs_composed';
	}

	// Check for sqrt
	const sqrtFuncs = findNodes(
		expr,
		(node) => isFunction(node) && node.name.toLowerCase() === 'sqrt'
	);
	if (sqrtFuncs.length > 0) {
		return 'sqrt_boundary';
	}

	// Check for fractional powers
	const powers = findNodes(expr, (node) => node.type === 'superscript') as SuperscriptNode[];
	for (const power of powers) {
		const expValue = tryEvaluateNumeric(power.superscript);
		if (expValue !== null && expValue > 0 && expValue < 1) {
			const { p } = extractFraction(expValue);
			return p % 2 === 0 ? 'fractional_power_cusp' : 'fractional_power_vertical';
		}
	}

	// Check for ln
	const lnFuncs = findNodes(
		expr,
		(node) => isFunction(node) && ['ln', 'log'].includes(node.name.toLowerCase())
	);
	if (lnFuncs.length > 0) {
		return 'ln_boundary';
	}

	return 'other';
}

/**
 * Get numeric value from a derivative limit.
 */
function getNumericDerivativeValue(limit: DerivativeLimit): number | null {
	if (limit === 'infinite' || limit === '-infinite' || limit === 'undefined') {
		return null;
	}
	return tryEvaluateNumeric(limit);
}

/**
 * Try to evaluate expression at a point.
 */
function tryEvaluateAtPoint(expr: MathNode, variable: string, point: MathNode): MathNode | null {
	try {
		const substituted = substitute(expr, { [variable]: point });
		const value = evaluateNodeToApproximatedNumber(substituted);

		if (Number.isFinite(value) && Math.abs(value) < 1e8) {
			return numNode(formatNumber(value));
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
		return String(Math.round(value * 1e10) / 1e10);
	}
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
