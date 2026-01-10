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
import { universalDomain, intervalDomain, greaterThanOrEqual, fromNumber } from './factory';
import { intersect, excludePoints } from './algebra';
import { getBuiltinDomain, hasRestrictedDomain } from './builtins';
import { isNegativeInfinity, isPositiveInfinity } from '$lib/mathAST/guards';
import {
	solveLinearInequality,
	solveQuadraticInequality,
	findZeros,
	classifyExpression
} from './preimage';

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

	// Special handling for nested functions:
	// If arg is a function call, we need stricter constraints
	// e.g., ln(sqrt(x)): sqrt(x) needs to be > 0 (not >= 0), so x > 0
	if (arg.type === 'function') {
		// Check if inner function's range includes the boundary
		// For sqrt(x) -> [0, +inf[, if outer needs > 0, exclude where sqrt = 0
		if (
			node.name === 'ln' ||
			node.name === 'log' ||
			node.name === 'log10' ||
			node.name === 'log2'
		) {
			// ln needs arg > 0, so if arg is sqrt(x), sqrt(x) > 0 means x > 0
			// Find where inner function = 0 and exclude those x values
			if (arg.name === 'sqrt' && arg.args.length > 0) {
				const innerArg = arg.args[0];
				const zeros = findZeros(innerArg, variable);
				if (zeros.length > 0) {
					domain = excludePoints(
						domain,
						zeros.map((z) => fromNumber(z))
					);
				}
			}
		}

		// sqrt(ln(x)): need ln(x) >= 0, which means x >= 1
		if (node.name === 'sqrt' && (arg.name === 'ln' || arg.name === 'log') && arg.args.length > 0) {
			const innerArg = arg.args[0];
			// ln(expr) >= 0 means expr >= 1
			// Solve expr >= 1 by computing preimage of [1, +inf[
			const lnGeqZeroDomain = intervalDomain([greaterThanOrEqual(fromNumber(1))]);
			const lnPreimage = computePreimage(innerArg, lnGeqZeroDomain, variable);
			if (lnPreimage) {
				domain = intersect(domain, lnPreimage);
			}
		}
	}

	return domain;
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
	if (intervals.length !== 1) {
		// Multiple intervals - handle each separately and union
		return null; // Simplification for now
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
	for (const ep of intDomain.excludedPoints) {
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
