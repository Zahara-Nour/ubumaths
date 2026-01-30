/**
 * Domain computation for mathematical expressions.
 *
 * Computes the domain of definition for an expression by:
 * 1. Traversing the AST recursively
 * 2. Getting domain requirements for builtin functions
 * 3. Solving preimage constraints for compositions (e.g., sqrt(x-2) → x >= 2)
 * 4. Combining domains via intersection
 * 5. Excluding zeros for division denominators
 */

import type { MathNode } from '../types';
import type { Domain, DomainResult, DomainStep, IntervalSet } from './types';
import {
	universalDomain,
	intervalDomain,
	greaterThanOrEqual,
	fromNumber,
	tanDomain,
	cotDomain,
	secDomain,
	cscDomain
} from './factory';
import { intersect, excludePoints, union, isEmpty } from './algebra';
import { getBuiltinDomain, hasRestrictedDomain, getBuiltinRangeEntry } from './builtins';
import { isNegativeInfinity, isPositiveInfinity } from '$lib/mathAST/guards';
import {
	solveLinearInequality,
	solveQuadraticInequality,
	solveCubicInequality,
	findZeros,
	classifyExpression
} from './preimage';

// =============================================================================
// Range Helper Functions (use builtin range registry)
// =============================================================================

/**
 * Check if a function's output range has a finite lower bound at a specific value.
 */
function rangeHasLowerBound(
	funcName: string,
	bound: number
): { hasBound: boolean; inclusive: boolean } {
	const range = getBuiltinRangeEntry(funcName);
	if (!range || range.lower === null) return { hasBound: false, inclusive: false };

	if (Math.abs(range.lower - bound) < 1e-10) {
		return { hasBound: true, inclusive: range.lowerInclusive };
	}
	return { hasBound: false, inclusive: false };
}

/**
 * Get the outer function's domain requirement (what it needs from its input).
 * Returns null if no specific requirement.
 */
function getOuterFunctionRequirement(
	funcName: string
): { needsPositive: boolean; needsNonNegative: boolean; lowerBound?: number } | null {
	switch (funcName) {
		case 'ln':
		case 'log':
		case 'log10':
		case 'log2':
			// Logarithms need input > 0
			return { needsPositive: true, needsNonNegative: false };
		case 'sqrt':
			// Square root needs input >= 0
			return { needsPositive: false, needsNonNegative: true, lowerBound: 0 };
		case 'asin':
		case 'acos':
			// Inverse trig needs input in [-1, 1] - handled by preimage already
			return null;
		case 'acosh':
			// acosh needs input >= 1
			return { needsPositive: false, needsNonNegative: false, lowerBound: 1 };
		case 'atanh':
			// atanh needs input in ]-1, 1[ - handled by preimage already
			return null;
		default:
			return null;
	}
}

/**
 * Analyze a function composition and apply additional constraints.
 *
 * Generic approach:
 * 1. Determine what outer function needs (e.g., ln needs > 0, sqrt needs >= 0)
 * 2. Check inner function's range
 * 3. If inner's range boundary matches outer's requirement, apply stricter constraint
 *
 * Examples:
 * - ln(sqrt(x)): outer needs > 0, inner range [0,+∞[, so exclude where sqrt = 0 → x = 0
 * - sqrt(ln(x)): outer needs >= 0, inner range ]-∞,+∞[, so need ln(x) >= 0 → x >= 1
 * - ln(exp(x)): outer needs > 0, inner range ]0,+∞[, no additional constraint needed
 *
 * @param outerFunc - Name of outer function
 * @param innerNode - The inner function node
 * @param variable - Variable name
 * @param currentDomain - Domain computed so far
 * @param steps - Step recorder
 * @param options - Computation options
 * @returns Updated domain
 */
function analyzeComposition(
	outerFunc: string,
	innerNode: { name: string; args: readonly MathNode[] },
	variable: string,
	currentDomain: Domain,
	_steps: DomainStep[],
	_options: ComputeDomainOptions
): Domain {
	let domain = currentDomain;

	const outerReq = getOuterFunctionRequirement(outerFunc);
	if (!outerReq) {
		return domain;
	}

	const innerRange = getBuiltinRangeEntry(innerNode.name);
	const innerArg = innerNode.args[0];

	// Case 1: Outer needs positive (> 0), inner range has 0 as lower bound (inclusive)
	// e.g., ln(sqrt(x)), ln(abs(x))
	if (outerReq.needsPositive) {
		const lowerBoundCheck = rangeHasLowerBound(innerNode.name, 0);
		if (lowerBoundCheck.hasBound && lowerBoundCheck.inclusive) {
			// Inner function can output 0, but outer needs > 0
			// Exclude x values where inner function = 0
			const zeros = findZeros(innerArg, variable);
			if (zeros.length > 0) {
				domain = excludePoints(
					domain,
					zeros.map((z) => fromNumber(z))
				);
			}
		}
	}

	// Case 2: Outer needs non-negative (>= 0), inner range is unbounded below
	// e.g., sqrt(ln(x)) - need ln(x) >= 0
	if (outerReq.needsNonNegative && outerReq.lowerBound !== undefined) {
		if (!innerRange || innerRange.lower === null || innerRange.lower < outerReq.lowerBound) {
			// Inner can produce values below the required bound
			// Need to compute preimage for inner(x) >= lowerBound

			// For ln/log, ln(x) >= 0 means x >= 1
			if (
				(innerNode.name === 'ln' || innerNode.name === 'log') &&
				Math.abs(outerReq.lowerBound) < 1e-10
			) {
				// ln(expr) >= 0 means expr >= 1
				const constraintDomain = intervalDomain([greaterThanOrEqual(fromNumber(1))]);
				const preimage = computePreimage(innerArg, constraintDomain, variable);
				if (preimage) {
					domain = intersect(domain, preimage);
				}
			} else {
				// For other functions, construct the inner node and compute preimage
				const innerExpr: MathNode = { type: 'function', name: innerNode.name, args: [innerArg] };
				const constraintDomain = intervalDomain([
					greaterThanOrEqual(fromNumber(outerReq.lowerBound))
				]);
				const preimage = computePreimage(innerExpr, constraintDomain, variable);
				if (preimage) {
					domain = intersect(domain, preimage);
				}
			}
		}
	}

	// Case 3: Outer needs >= specific bound (like acosh needs >= 1)
	if (outerReq.lowerBound !== undefined && outerReq.lowerBound !== 0) {
		const constraintDomain = intervalDomain([greaterThanOrEqual(fromNumber(outerReq.lowerBound))]);
		const preimage = computePreimage(innerArg, constraintDomain, variable);
		if (preimage) {
			domain = intersect(domain, preimage);
		}
	}

	return domain;
}

// =============================================================================
// Options and Result Types
// =============================================================================

export interface ComputeDomainOptions {
	/** Show computation steps for pedagogical display */
	showSteps?: boolean;
}

// =============================================================================
// Main API
// =============================================================================

/**
 * Compute the domain of definition for an expression.
 *
 * @param expr - The mathematical expression
 * @param variable - The variable to compute domain for (default: 'x')
 * @param options - Optional configuration
 * @returns Domain result with the computed domain and optional steps
 *
 * @example
 * computeDomain(sqrt(x), 'x') // → [0, +∞[
 * computeDomain(ln(x-2), 'x') // → ]2, +∞[
 * computeDomain(1/x, 'x') // → ℝ \ {0}
 */
export function computeDomain(
	expr: MathNode,
	variable: string = 'x',
	options: ComputeDomainOptions = {}
): DomainResult {
	const steps: DomainStep[] = [];
	const domain = computeDomainNode(expr, variable, steps, options);

	return {
		domain,
		variable,
		...(options.showSteps && steps.length > 0 ? { steps } : {})
	};
}

// =============================================================================
// Core Computation
// =============================================================================

/**
 * Recursively compute domain for a node.
 */
function computeDomainNode(
	node: MathNode,
	variable: string,
	steps: DomainStep[],
	options: ComputeDomainOptions
): Domain {
	switch (node.type) {
		// Literals - universal domain
		case 'number':
		case 'greek':
		case 'symbol':
		case 'hole':
			return universalDomain();

		case 'variable':
			// Any variable has universal domain
			return universalDomain();

		// Binary operations - intersection of operand domains
		case 'addition':
		case 'subtraction':
		case 'multiplication':
			return intersect(
				computeDomainNode(node.left, variable, steps, options),
				computeDomainNode(node.right, variable, steps, options)
			);

		// Division - intersection + exclude zeros of denominator
		case 'division':
			return computeDivisionDomain(node, variable, steps, options);

		// Unary operations
		case 'opposite':
		case 'positive':
			return computeDomainNode(node.operand, variable, steps, options);

		// Functions - main complexity
		case 'function':
			return computeFunctionDomain(node, variable, steps, options);

		// Power/superscript
		case 'superscript':
			return computePowerDomain(node, variable, steps, options);

		// Structural nodes
		case 'delimiter':
			return computeDomainNode(node.content, variable, steps, options);

		case 'subscript':
			return intersect(
				computeDomainNode(node.base, variable, steps, options),
				computeDomainNode(node.subscript, variable, steps, options)
			);

		// Relations - compute domain for both sides
		case 'relation':
			return intersect(
				computeDomainNode(node.left, variable, steps, options),
				computeDomainNode(node.right, variable, steps, options)
			);

		// Composition - special handling
		case 'composition':
			// For f ∘ g, need domain of g and then constraint from f
			return intersect(
				computeDomainNode(node.outer, variable, steps, options),
				computeDomainNode(node.inner, variable, steps, options)
			);

		// Unit nodes
		case 'unit':
			return computeDomainNode(node.expression, variable, steps, options);

		default:
			return universalDomain();
	}
}

/**
 * Compute domain for division, excluding zeros of denominator.
 */
function computeDivisionDomain(
	node: { numerator: MathNode; denominator: MathNode },
	variable: string,
	steps: DomainStep[],
	options: ComputeDomainOptions
): Domain {
	// Get domain from numerator and denominator
	const numDomain = computeDomainNode(node.numerator, variable, steps, options);
	const denDomain = computeDomainNode(node.denominator, variable, steps, options);

	// Find zeros of denominator
	const zeros = findZeros(node.denominator, variable);

	// Combine domains
	let domain = intersect(numDomain, denDomain);

	// Exclude zeros (convert to EndpointValue[])
	if (zeros.length > 0) {
		domain = excludePoints(
			domain,
			zeros.map((z) => fromNumber(z))
		);
	}

	return domain;
}

/**
 * Compute domain for a function application.
 */
function computeFunctionDomain(
	node: { name: string; args: readonly MathNode[] },
	variable: string,
	steps: DomainStep[],
	options: ComputeDomainOptions
): Domain {
	if (node.args.length === 0) {
		return universalDomain();
	}

	// Start with domain of argument (recursively compute for nested functions)
	const arg = node.args[0];
	let domain = computeDomainNode(arg, variable, steps, options);

	// Handle functions with periodic exclusions (tan, cot, sec, csc)
	// For simple argument (just the variable), return PeriodicExclusion directly
	const periodicDomain = getPeriodicExclusionDomain(node.name, arg, variable);
	if (periodicDomain) {
		return intersect(domain, periodicDomain);
	}

	// Check if this function has a restricted domain
	if (!hasRestrictedDomain(node.name)) {
		return domain;
	}

	// Get the function's domain requirement
	const funcDomain = getBuiltinDomain(node.name);
	if (!funcDomain || funcDomain.kind === 'universal') {
		return domain;
	}

	// Compute preimage: find values of variable such that arg is in funcDomain
	const preimage = computePreimage(arg, funcDomain, variable);
	if (preimage) {
		domain = intersect(domain, preimage);
	}

	// Handle nested function compositions using range analysis
	if (arg.type === 'function' && arg.args.length > 0) {
		domain = analyzeComposition(node.name, arg, variable, domain, steps, options);
	}

	return domain;
}

/**
 * Get periodic exclusion domain for trigonometric functions with periodic discontinuities.
 *
 * Returns PeriodicExclusion for tan, cot, sec, csc when the argument is simple enough
 * to compute the preimage of the periodic exclusion.
 *
 * @param funcName - The function name
 * @param arg - The function argument
 * @param variable - The variable name
 * @returns PeriodicExclusion domain if applicable, null otherwise
 */
function getPeriodicExclusionDomain(
	funcName: string,
	arg: MathNode,
	variable: string
): Domain | null {
	const name = funcName.toLowerCase();

	// Only handle tan, cot, sec, csc
	if (!['tan', 'cot', 'sec', 'csc'].includes(name)) {
		return null;
	}

	// Case 1: Simple argument - just the variable (tan(x), cot(x), etc.)
	if (arg.type === 'variable' && arg.name === variable) {
		switch (name) {
			case 'tan':
				return tanDomain();
			case 'sec':
				return secDomain();
			case 'cot':
				return cotDomain();
			case 'csc':
				return cscDomain();
		}
	}

	// Case 2: Linear argument (tan(ax + b)) - more complex preimage computation
	// For now, return null and let the continuity module handle detection
	// TODO: Implement preimage computation for linear arguments

	return null;
}

/**
 * Compute domain for power expressions (superscript).
 */
function computePowerDomain(
	node: { base: MathNode; superscript: MathNode },
	variable: string,
	steps: DomainStep[],
	options: ComputeDomainOptions
): Domain {
	const baseDomain = computeDomainNode(node.base, variable, steps, options);
	const expDomain = computeDomainNode(node.superscript, variable, steps, options);

	let domain = intersect(baseDomain, expDomain);

	// Check for negative exponent
	const expValue = tryGetNumericValue(node.superscript);
	if (expValue !== null && expValue < 0) {
		// base^(-n) requires base != 0
		const zeros = findZeros(node.base, variable);
		if (zeros.length > 0) {
			domain = excludePoints(
				domain,
				zeros.map((z) => fromNumber(z))
			);
		}
	}

	// Check for fractional exponent with even denominator (like 1/2, 1/4)
	const fracInfo = tryGetFractionValue(node.superscript);
	if (fracInfo !== null) {
		const { numerator, denominator } = fracInfo;
		if (denominator % 2 === 0 && numerator > 0) {
			// Even root requires base >= 0
			const preimage = computePreimage(
				node.base,
				intervalDomain([greaterThanOrEqual(fromNumber(0))]),
				variable
			);
			if (preimage) {
				domain = intersect(domain, preimage);
			}
		}
	}

	return domain;
}

// =============================================================================
// Preimage Computation
// =============================================================================

/**
 * Compute the preimage of a domain under an expression.
 * Given expr and domain D, find {x : expr(x) ∈ D}
 *
 * @param expr - The expression (argument to a function)
 * @param targetDomain - The domain constraint (function's domain)
 * @param variable - The variable to solve for
 * @returns The preimage domain, or null if cannot compute
 */
function computePreimage(expr: MathNode, targetDomain: Domain, variable: string): Domain | null {
	if (targetDomain.kind === 'universal') {
		return universalDomain();
	}

	if (targetDomain.kind === 'empty') {
		return targetDomain;
	}

	if (targetDomain.kind !== 'interval_set') {
		return null;
	}

	const intDomain = targetDomain as IntervalSet;

	// Handle based on expression structure and interval type
	const intervals = intDomain.intervals;

	if (intervals.length === 0) {
		return { kind: 'empty' };
	}

	// For multiple intervals, compute preimage for each and union results
	if (intervals.length > 1) {
		let combinedDomain: Domain = { kind: 'empty' };
		for (const interval of intervals) {
			const singleDomain = intervalDomain([interval], intDomain.excludedPoints);
			const preimage = computePreimageForSingleInterval(expr, singleDomain, variable);
			if (preimage && !isEmpty(preimage)) {
				combinedDomain = union(combinedDomain, preimage);
			}
		}
		return isEmpty(combinedDomain) ? null : combinedDomain;
	}

	// Single interval - delegate to helper
	return computePreimageForSingleInterval(expr, intDomain, variable);
}

/**
 * Compute preimage for a single interval domain.
 * Helper for computePreimage that handles one interval at a time.
 */
function computePreimageForSingleInterval(
	expr: MathNode,
	targetDomain: IntervalSet,
	variable: string
): Domain | null {
	const intervals = targetDomain.intervals;
	if (intervals.length !== 1) {
		return null;
	}

	const interval = intervals[0];
	let resultDomain: Domain = universalDomain();

	// Check lower bound constraint
	const lowerValue = interval.lower.value;
	if (!isNegativeInfinity(lowerValue) && !isPositiveInfinity(lowerValue)) {
		const bound = tryEvaluateConstant(lowerValue);

		if (bound !== null) {
			const strict = interval.lower.type === 'open';
			const ineqDomain = solveInequalityForPreimage(expr, '>=', bound, strict, variable);
			if (ineqDomain) {
				resultDomain = intersect(resultDomain, ineqDomain);
			}
		}
	}

	// Check upper bound constraint
	const upperValue = interval.upper.value;
	if (!isPositiveInfinity(upperValue) && !isNegativeInfinity(upperValue)) {
		const bound = tryEvaluateConstant(upperValue);

		if (bound !== null) {
			const strict = interval.upper.type === 'open';
			const ineqDomain = solveInequalityForPreimage(expr, '<=', bound, strict, variable);
			if (ineqDomain) {
				resultDomain = intersect(resultDomain, ineqDomain);
			}
		}
	}

	// Handle excluded points
	for (const ep of targetDomain.excludedPoints) {
		const val = tryEvaluateConstant(ep.value);
		if (val !== null) {
			const zeros = findZeros(subtractConstant(expr, val), variable);
			if (zeros.length > 0) {
				resultDomain = excludePoints(
					resultDomain,
					zeros.map((z) => fromNumber(z))
				);
			}
		}
	}

	return resultDomain;
}

/**
 * Solve an inequality for preimage computation.
 * Handles >= and <= with strict/non-strict variants.
 */
function solveInequalityForPreimage(
	expr: MathNode,
	op: '>=' | '<=',
	bound: number,
	strict: boolean,
	variable: string
): Domain | null {
	const exprType = classifyExpression(expr, variable);

	switch (exprType.kind) {
		case 'linear':
			// expr = a*x + b, solve a*x + b >= bound or a*x + b <= bound
			return solveLinearInequality(exprType.a, exprType.b, op, bound, strict, variable);

		case 'quadratic':
			// expr = a*x² + b*x + c, solve inequality
			return solveQuadraticInequality(
				exprType.a,
				exprType.b,
				exprType.c,
				op,
				bound,
				strict,
				variable
			);

		case 'cubic':
			// expr = a*x³ + b*x² + c*x + d, solve inequality
			return solveCubicInequality(
				exprType.a,
				exprType.b,
				exprType.c,
				exprType.d,
				op,
				bound,
				strict,
				variable
			);

		case 'constant': {
			// Check if constant satisfies the constraint
			const val = exprType.value;
			const satisfied = checkBound(val, op, bound, strict);
			return satisfied ? universalDomain() : { kind: 'empty' };
		}

		case 'complex':
			// Cannot solve analytically
			return null;
	}
}

/**
 * Check if a value satisfies a bound constraint.
 */
function checkBound(value: number, op: '>=' | '<=', bound: number, strict: boolean): boolean {
	if (op === '>=') {
		return strict ? value > bound : value >= bound;
	} else {
		return strict ? value < bound : value <= bound;
	}
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Try to get a numeric value from a node.
 */
function tryGetNumericValue(node: MathNode): number | null {
	if (node.type === 'number') {
		return parseFloat(node.value);
	}
	if (node.type === 'opposite' && node.operand.type === 'number') {
		return -parseFloat(node.operand.value);
	}
	return null;
}

/**
 * Try to get a fraction value (numerator/denominator) from a node.
 */
function tryGetFractionValue(node: MathNode): { numerator: number; denominator: number } | null {
	if (node.type === 'division') {
		const num = tryGetNumericValue(node.numerator);
		const den = tryGetNumericValue(node.denominator);
		if (num !== null && den !== null && den !== 0) {
			return { numerator: num, denominator: den };
		}
	}
	return null;
}

/**
 * Try to evaluate a constant MathNode to a number.
 */
function tryEvaluateConstant(node: MathNode): number | null {
	if (node.type === 'number') {
		return parseFloat(node.value);
	}
	if (node.type === 'opposite' && node.operand.type === 'number') {
		return -parseFloat(node.operand.value);
	}
	if (node.type === 'greek' && node.letter === 'pi') {
		return Math.PI;
	}
	return null;
}

/**
 * Create an expression representing (expr - constant).
 */
function subtractConstant(expr: MathNode, constant: number): MathNode {
	return {
		type: 'subtraction',
		left: expr,
		right: { type: 'number', value: String(constant) }
	};
}
