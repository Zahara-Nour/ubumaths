/**
 * Critical Points - Finding where f'(x) = 0 or undefined
 *
 * Finds critical points of a function within a domain. Critical points are
 * locations where the derivative is zero or undefined, which are candidates
 * for extrema (minima/maxima).
 *
 * @module mathAST/variations/critical-points
 */

import type { MathNode, RelationNode } from '../types';
import type { Domain } from '../domain/types';
import type { CriticalPointInfo, CriticalPointNature } from './types';
import type { Solution } from '../solve/types';
import { solve } from '../solve/solve';
import { equals, number } from '../factory';
import { isRelation } from '../guards';
import { computeDomain } from '../domain/compute';
import { evaluate } from '../eval';
import { substitute } from '../eval/substitute';
import { tidy } from '../tidy';
import { cheapest } from '../simplify/cost';
import { endpointToNumber } from '$lib/math/intervals/endpoint';
import { containsNode } from '../domain/algebra';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of evaluating f(x) at a critical point.
 */
export interface CriticalPointEvaluation {
	/** The y-value as a MathNode (exact form) */
	readonly y: MathNode;
	/** Numeric approximation of y (for display/ordering) */
	readonly yApproximate?: number;
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Find all critical points of f(x) within a domain.
 *
 * Critical points are where:
 * 1. f'(x) = 0 (stationary points)
 * 2. f'(x) is undefined but f(x) is defined (singular points)
 *
 * @param derivative - The derivative f'(x) as a MathNode
 * @param variable - The variable name (e.g., 'x')
 * @param domain - The domain to search within
 * @param originalExpr - Optional: the original expression f(x) for evaluating y-values
 * @returns Array of CriticalPointInfo, sorted by x-value
 *
 * @example
 * // Find critical points of f(x) = x^2 (derivative = 2x)
 * const derivative = multiply(number('2'), variable('x'), 'implicit');
 * const criticalPoints = findCriticalPoints(derivative, 'x', universalDomain());
 * // Returns: [{ x: number('0'), xApproximate: 0, nature: 'derivative_zero', exact: true }]
 */
export function findCriticalPoints(
	derivative: MathNode,
	variable: string,
	domain: Domain,
	originalExpr?: MathNode
): CriticalPointInfo[] {
	return findCriticalPointsWithStatus(derivative, variable, domain, originalExpr).points;
}

/**
 * Les points critiques, ET le fait que f'(x) = 0 a bien été résolue.
 *
 * ⚠️ **« Aucun zéro » et « je n'ai pas su résoudre » ne sont pas la même
 * réponse.** `findCriticalPoints` rend `[]` dans les deux cas ; c'est ce qui
 * faisait annoncer « Points critiques : aucun » pour eˣ − x − 2 = 0, que le
 * solveur ne sait pas résoudre, et en déduire un signe constant. Le
 * drapeau `derivativeZerosResolved` les sépare.
 */
export function findCriticalPointsWithStatus(
	derivative: MathNode,
	variable: string,
	domain: Domain,
	originalExpr?: MathNode
): { readonly points: CriticalPointInfo[]; readonly derivativeZerosResolved: boolean } {
	// Handle empty domain
	if (domain.kind === 'empty') {
		return { points: [], derivativeZerosResolved: true };
	}

	const criticalPoints: CriticalPointInfo[] = [];

	// 1. Find zeros of the derivative: f'(x) = 0
	const { zeros, resolved } = findDerivativeZeros(derivative, variable, domain);
	for (const zero of zeros) {
		const evalResult = originalExpr
			? evaluateAtCriticalPoint(originalExpr, variable, zero.value)
			: null;

		criticalPoints.push({
			x: zero.value,
			xApproximate: zero.approximate,
			y: evalResult?.y,
			yApproximate: evalResult?.yApproximate,
			nature: 'derivative_zero',
			exact: zero.exact
		});
	}

	// 2. Find points where derivative is undefined (within f's domain)
	const undefinedPoints = findDerivativeUndefinedPoints(derivative, variable, domain);
	for (const point of undefinedPoints) {
		// Only include if f(x) is defined at this point
		const evalResult = originalExpr
			? evaluateAtCriticalPoint(originalExpr, variable, point.value)
			: null;

		// Skip if we can't evaluate f(x) at this point (means f is also undefined there)
		if (originalExpr && !evalResult) {
			continue;
		}

		criticalPoints.push({
			x: point.value,
			xApproximate: point.approximate,
			y: evalResult?.y,
			yApproximate: evalResult?.yApproximate,
			nature: 'derivative_undefined',
			exact: point.exact
		});
	}

	// 3. Sort by x-value and remove duplicates
	return {
		points: sortCriticalPoints(removeDuplicateCriticalPoints(criticalPoints)),
		derivativeZerosResolved: resolved
	};
}

/**
 * Classify a critical point as zero or undefined derivative.
 *
 * @param x - The x-value to classify
 * @param derivative - The derivative expression
 * @param derivativeDomain - Domain of the derivative
 * @param variable - The variable name
 * @returns The nature of the critical point
 */
export function classifyCriticalPoint(
	x: MathNode,
	derivative: MathNode,
	derivativeDomain: Domain,
	variable: string
): CriticalPointNature {
	// Try to evaluate derivative at x
	try {
		const substituted = substitute(derivative, { [variable]: x });
		const result = evaluate(substituted, { mode: 'decimal' });

		if (result.status === 'value' && typeof result.value === 'number') {
			// If the result is close to zero, it's a zero of the derivative
			if (Math.abs(result.value) < 1e-10) {
				return 'derivative_zero';
			}
		}
	} catch {
		// Evaluation failed - derivative is undefined at this point
		return 'derivative_undefined';
	}

	// Check if x is in the domain of the derivative
	if (!containsNode(derivativeDomain, x)) {
		return 'derivative_undefined';
	}

	return 'derivative_zero';
}

/**
 * Evaluate f(x) at a critical point.
 *
 * @param expr - The expression f(x) to evaluate
 * @param variable - The variable name
 * @param x - The x-value at which to evaluate
 * @returns The y-value and its approximation, or null if evaluation fails
 */
export function evaluateAtCriticalPoint(
	expr: MathNode,
	variable: string,
	x: MathNode
): CriticalPointEvaluation | null {
	try {
		// Substitute x into the expression
		const substituted = substitute(expr, { [variable]: x });

		// Try exact evaluation first
		const exactResult = evaluate(substituted, { mode: 'exact' });
		const exactNode = exactResult.status === 'value' ? exactResult.node : null;

		// Get numeric approximation
		let yApproximate: number | undefined;
		try {
			const decimalResult = evaluate(substituted, { mode: 'decimal' });
			if (
				decimalResult.status === 'value' &&
				typeof decimalResult.value === 'number' &&
				Number.isFinite(decimalResult.value)
			) {
				yApproximate = decimalResult.value;
			}
		} catch {
			// Numeric evaluation failed, leave yApproximate undefined
		}

		// Ni valeur exacte ni valeur approchée : f n'est pas définie en x.
		// ⚠️ L'évaluation exacte peut échouer sur une valeur bien définie —
		// mesuré : `-1/2·e^{2·(−1/2)}` pour x e^{2x} —, le décimal tranche alors.
		if (exactNode === null && yApproximate === undefined) return null;

		return { y: tidyExactValue(substituted, exactNode), yApproximate };
	} catch {
		// Evaluation failed (e.g., division by zero, domain error)
		return null;
	}
}

/**
 * La valeur exacte f(x₀), mise au propre par `tidy` pour l'affichage.
 *
 * Deux écritures candidates de la même valeur : celle de l'évaluation exacte
 * (`-exp(-1)` pour x eˣ en −1) et la substitution elle-même
 * (`-1·e^{-1}`, que `tidy` rend −1/e). `cheapest` garde la plus simple ; la
 * substitution mise au propre gagne les égalités. Mesuré avant : le minimum de
 * x e^{2x} s'affichait `-1/2·e^{2·(−1/2)}`.
 *
 * ⚠️ Celui de x² ln x reste `ln(e^{−1/2})(e^{−1/2})²` : `tidy` n'applique
 * aucune identité (ln(eᵃ) = a est exclu, docs/wip/tidy-phase0.md) — décision
 * de David en attente, voir le `it.todo` de tidy-exp-ln.test.ts.
 *
 * @param substituted - f(x₀), x₀ substitué, non évalué
 * @param evaluated - Ce que rend l'évaluation exacte, `null` si elle a échoué
 */
export function tidyExactValue(substituted: MathNode, evaluated: MathNode | null): MathNode {
	const fromSubstitution = tidySafe(substituted);
	if (evaluated === null) return fromSubstitution;
	return cheapest(tidySafe(evaluated), fromSubstitution);
}

/** `tidy` peut relancer une exception imprévue : on garde alors la forme brute. */
function tidySafe(node: MathNode): MathNode {
	try {
		return tidy(node);
	} catch {
		return node;
	}
}

/**
 * Sort critical points by x-value.
 *
 * Points without numeric approximations are placed at the end.
 *
 * @param points - Array of critical points to sort
 * @returns New sorted array (original is not modified)
 */
export function sortCriticalPoints(points: readonly CriticalPointInfo[]): CriticalPointInfo[] {
	return [...points].sort((a, b) => {
		// Handle missing approximations - put at end
		if (a.xApproximate === undefined && b.xApproximate === undefined) {
			return 0;
		}
		if (a.xApproximate === undefined) {
			return 1;
		}
		if (b.xApproximate === undefined) {
			return -1;
		}

		// Sort by numeric value
		return a.xApproximate - b.xApproximate;
	});
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Find zeros of the derivative (stationary points).
 */
function findDerivativeZeros(
	derivative: MathNode,
	variable: string,
	domain: Domain
): {
	readonly zeros: Array<{ value: MathNode; approximate?: number; exact: boolean }>;
	/** `false` quand le solveur n'a pas su résoudre f'(x) = 0 — ce n'est pas « aucun zéro ». */
	readonly resolved: boolean;
} {
	try {
		// Create equation f'(x) = 0
		const equation: RelationNode = equals(derivative, number('0'));

		if (!isRelation(equation)) {
			return { zeros: [], resolved: false };
		}

		// Solve the equation
		const result = solve(equation, { variable });

		// Le solveur signale un échec par `error` (« Type d'equation … non
		// supporte ») avec un statut `no-solution` : ce n'est PAS une absence
		// de zéro — sauf quand l'erreur explique une absence DÉMONTRÉE
		// (`conclusive`, ex. racines étrangères de 1/(2√x) = 0).
		if (result.error !== undefined && !result.conclusive && result.solutions.length === 0) {
			return { zeros: [], resolved: false };
		}

		// Handle cases where solving failed or no solutions
		if (
			result.status === 'no-solution' ||
			result.status === 'no-real-solution' ||
			result.solutions.length === 0
		) {
			return { zeros: [], resolved: true };
		}

		// Handle infinite solutions
		if (result.status === 'infinite') {
			// Derivative is identically zero - constant function
			return { zeros: [], resolved: true };
		}

		// Filter solutions within the domain
		return { zeros: filterSolutionsInDomain(result.solutions, domain), resolved: true };
	} catch {
		// Le solveur a levé une exception : f'(x) = 0 n'est pas résolue.
		return { zeros: [], resolved: false };
	}
}

/**
 * Find points where derivative is undefined but original function is defined.
 *
 * These are points in the original function's domain but not in the derivative's domain.
 * Examples: cusps, corners, vertical tangents.
 */
function findDerivativeUndefinedPoints(
	derivative: MathNode,
	variable: string,
	functionDomain: Domain
): Array<{ value: MathNode; approximate?: number; exact: boolean }> {
	// Compute domain of the derivative
	const derivativeDomainResult = computeDomain(derivative, variable);
	const derivativeDomain = derivativeDomainResult.domain;

	// If derivative has universal domain, no undefined points
	if (derivativeDomain.kind === 'universal') {
		return [];
	}

	// If derivative domain is empty but function domain is not, all points are undefined
	// This is unusual and likely indicates an error
	if (derivativeDomain.kind === 'empty') {
		return [];
	}

	// Find excluded points from derivative domain that are in function domain
	if (derivativeDomain.kind === 'interval_set') {
		const undefinedPoints: Array<{ value: MathNode; approximate?: number; exact: boolean }> = [];

		for (const excludedPoint of derivativeDomain.excludedPoints) {
			// Check if this point is in the function's domain
			if (containsNode(functionDomain, excludedPoint.value)) {
				const numericValue = endpointToNumber(excludedPoint.value);
				undefinedPoints.push({
					value: excludedPoint.value,
					approximate: Number.isFinite(numericValue) ? numericValue : undefined,
					exact: true
				});
			}
		}

		return undefinedPoints;
	}

	return [];
}

/**
 * Filter solutions to only those within the specified domain.
 */
function filterSolutionsInDomain(
	solutions: readonly Solution[],
	domain: Domain
): Array<{ value: MathNode; approximate?: number; exact: boolean }> {
	const result: Array<{ value: MathNode; approximate?: number; exact: boolean }> = [];

	for (const solution of solutions) {
		if (!containsNode(domain, solution.value)) {
			continue;
		}

		result.push({
			value: solution.value,
			approximate: solution.approximate,
			exact: solution.exact
		});
	}

	return result;
}

/**
 * Remove duplicate critical points based on approximate x-value.
 */
function removeDuplicateCriticalPoints(
	points: readonly CriticalPointInfo[],
	tolerance: number = 1e-10
): CriticalPointInfo[] {
	if (points.length === 0) {
		return [];
	}

	const result: CriticalPointInfo[] = [];

	for (const point of points) {
		const isDuplicate = result.some((existing) => {
			if (existing.xApproximate === undefined || point.xApproximate === undefined) {
				return false;
			}
			return Math.abs(existing.xApproximate - point.xApproximate) < tolerance;
		});

		if (!isDuplicate) {
			result.push(point);
		}
	}

	return result;
}
