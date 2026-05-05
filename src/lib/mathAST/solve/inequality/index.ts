/**
 * solveInequality — Public API
 *
 * Solves inequalities (`<`, `>`, `<=`, `>=`, `!=`) by delegating to the
 * existing `analyzeSign` pipeline (which itself delegates zero-finding to the
 * `solve` module). Solution bounds are exact symbolic `MathNode`s — radicals,
 * fractions, and π are preserved.
 *
 * Out of V1 scope (palier 2):
 * - Parametric coefficients (e.g. `mx + 1 < 0` with `m` symbolic) — throw
 *   `InequalityNotSolvable`.
 * - Pedagogical step generation (Δ, sign tables) — palier 2.
 *
 * @module mathAST/solve/inequality
 */

import type { MathNode, RelationNode } from '../../types';
import type { Domain, IntervalSet } from '../../domain/types';
import type { Endpoint, Interval } from '$lib/math/intervals/types';
import type { SignAnalysisResult, SignedInterval } from '../../sign/types';
import {
	SolveInequalityError,
	InequalityNotSolvable,
	type InequalityOp,
	type SolveInequalityOptions,
	type SolveInequalityResult,
	type InequalityStatus
} from './types';
import { isRelation } from '../../guards';
import { analyzeSign } from '../../sign';
import { detectVariable } from '../classify';
import { subtract } from '../../factory';
import { denormalize, normalize } from '../../normal';
import { getVariables } from '../../eval/substitute';
import { isEmpty as isDomainEmpty, union, difference } from '../../domain/algebra';
import { emptyDomain, intervalSet } from '../../domain/factory';
import { computeDomain } from '../../domain/compute';
import { interval, openEndpoint } from '$lib/math/intervals/factory';
import { endpointToNumber } from '$lib/math/intervals/endpoint';

const INEQUALITY_OPS: ReadonlySet<InequalityOp> = new Set(['<', '>', '<=', '>=', '!=']);

// =============================================================================
// Main API
// =============================================================================

/**
 * Solve an inequality `f ⊻ g` for a single variable.
 *
 * @param relation - A `RelationNode` whose `relation` ∈ `{ '<', '>', '<=', '>=', '!=' }`.
 * @param options - See `SolveInequalityOptions`.
 * @returns `SolveInequalityResult` with the solution domain and metadata.
 *
 * @throws `SolveInequalityError` if `relation === '='` or input shape is invalid.
 * @throws `InequalityNotSolvable` if the expression carries free parametric
 *   coefficients, or if `strictMode` is set and the result would be `'partial'`.
 */
export function solveInequality(
	relation: RelationNode,
	options: SolveInequalityOptions = {}
): SolveInequalityResult {
	if (!isRelation(relation)) {
		throw new SolveInequalityError(
			"L'entrée doit être une relation",
			`Reçu: ${(relation as { type?: string }).type}`
		);
	}

	const op = relation.relation as string;
	if (op === '=') {
		throw new SolveInequalityError(
			'solveInequality ne traite pas les égalités — utiliser solve()',
			"L'opérateur '=' n'est pas une inéquation."
		);
	}
	if (!INEQUALITY_OPS.has(op as InequalityOp)) {
		throw new SolveInequalityError(
			`Opérateur de relation non supporté: '${op}'`,
			"Attendu: '<', '>', '<=', '>=' ou '!='."
		);
	}
	const inequalityOp = op as InequalityOp;

	const expression = canon(subtract(relation.left, relation.right));

	const variable = options.variable ?? detectVariable(relation);
	if (variable === null) {
		return resolveConstantInequality(expression, inequalityOp);
	}

	rejectIfParametric(expression, variable);

	// `analyzeSign` partitions the domain at the zeros of `expression`, but it
	// does NOT split at excluded points (it iterates `domain.intervals` only).
	// For inequalities involving rational/log functions where the discontinuity
	// is encoded in `excludedPoints` (e.g. 1/x → R \ {0}), this leaves the whole
	// real line as a single 'unknown' interval. We normalize the domain here:
	// excluded points are converted into open-interval splits before passing to
	// `analyzeSign`, restoring the expected piecewise behaviour.
	const explicitDomain = options.domain ?? computeDomain(expression, variable).domain;
	const normalizedDomain = expandExcludedPoints(explicitDomain);

	const signResult = analyzeSign(expression, {
		variable,
		domain: normalizedDomain,
		numericFallback: options.numericFallback ?? true,
		tolerance: options.tolerance,
		strictMode: false
	});

	const { solution, hasUnknown } = aggregateSolution(signResult, inequalityOp);
	const status = computeStatus(signResult.domain, solution, hasUnknown);

	const warnings = buildWarnings(signResult.warnings, hasUnknown);

	if (status === 'partial' && options.strictMode) {
		throw new InequalityNotSolvable(
			"Le signe n'a pas pu être déterminé sur au moins un sous-intervalle",
			'strictMode actif et résultat partial'
		);
	}

	return {
		variable,
		relation: inequalityOp,
		expression,
		domain: signResult.domain,
		solution,
		status,
		...(warnings.length > 0 && { warnings }),
		signTable: signResult
	};
}

// =============================================================================
// Pipeline pieces
// =============================================================================

function canon(node: MathNode): MathNode {
	return denormalize(normalize(node));
}

/**
 * Reject expressions that contain free variables other than the unknown.
 * `getVariables` collects both `variable` nodes and Greek letters, so this
 * also catches `mx + 1 < 0` with `m` either as a regular variable or a Greek
 * parameter.
 */
function rejectIfParametric(expression: MathNode, variable: string): void {
	const vars = getVariables(expression);
	const free = [...vars].filter((v) => v !== variable);
	if (free.length > 0) {
		throw new InequalityNotSolvable(
			`Coefficients paramétriques détectés: ${free.join(', ')}`,
			'Hors scope V1 — fournir des coefficients numériques, ou attendre le palier 2.'
		);
	}
}

/**
 * Handle inequalities with no variable: e.g. `0 < 1`, `1 < 0`.
 *
 * Strategy: route through `analyzeSign` to keep a uniform code path. The
 * "variable" passed to `analyzeSign` is irrelevant for a constant expression
 * (it simply isn't found anywhere), but `analyzeSign`'s API requires a name —
 * we pass a sentinel `'__const__'` rather than `'x'` so that a future addition
 * of "variable must occur in expression" validation in `analyzeSign` would not
 * silently break this path. The returned `domain` field is `universal`
 * (unrestricted ℝ), which is the correct domain for a constant expression.
 */
function resolveConstantInequality(expression: MathNode, op: InequalityOp): SolveInequalityResult {
	const signResult = analyzeSign(expression, { variable: '__const__' });
	const sign = signResult.signedIntervals[0]?.sign ?? 'unknown';
	const matches = matchesOperator(sign, op);
	const universal = signResult.domain;
	const solution = matches ? universal : emptyDomain();
	const status: InequalityStatus = matches ? 'all-real' : 'no-solution';
	return {
		variable: '',
		relation: op,
		expression,
		domain: universal,
		solution,
		status,
		signTable: signResult
	};
}

/**
 * Aggregate signed sub-intervals matching the operator into a single domain.
 */
function aggregateSolution(
	signResult: SignAnalysisResult,
	op: InequalityOp
): { solution: Domain; hasUnknown: boolean } {
	let solution: Domain = emptyDomain();
	let hasUnknown = false;

	for (const si of signResult.signedIntervals) {
		if (si.sign === 'unknown') {
			hasUnknown = true;
			continue;
		}
		if (matchesOperator(si.sign, op)) {
			solution = union(solution, intervalSet([si.interval]));
		}
	}

	return { solution, hasUnknown };
}

function matchesOperator(sign: SignedInterval['sign'], op: InequalityOp): boolean {
	switch (op) {
		case '<':
			return sign === 'negative';
		case '<=':
			return sign === 'negative' || sign === 'zero';
		case '>':
			return sign === 'positive';
		case '>=':
			return sign === 'positive' || sign === 'zero';
		case '!=':
			return sign === 'positive' || sign === 'negative';
	}
}

/**
 * Pick the right `InequalityStatus` from the resolved solution.
 *
 * Branch order matches the spec (`solve-inequality-spec.md`, step 9):
 * `empty-domain` → `no-solution` → `partial` → `all-real` → `complete`.
 *
 * Crucially, `no-solution` must be checked before `partial`: a 'partial' result
 * with an actually-empty solution is contradictory information for the caller.
 * If every known signed interval failed to match the operator (or there was
 * none), the solution is empty regardless of any `'unknown'` regions; reporting
 * `'no-solution'` is the more useful answer. The spec accepts a slight loss of
 * precision here (a hidden `'unknown'` region might in theory contain
 * solutions), but `signTable` and `warnings` still expose the unresolved
 * regions so the caller can inspect them.
 */
function computeStatus(domain: Domain, solution: Domain, hasUnknown: boolean): InequalityStatus {
	if (isDomainEmpty(domain)) return 'empty-domain';
	if (isDomainEmpty(solution)) return 'no-solution';
	if (hasUnknown) return 'partial';
	if (isDomainEmpty(difference(domain, solution))) return 'all-real';
	return 'complete';
}

/**
 * Expand `excludedPoints` of an `IntervalSet` into open-interval splits so that
 * `analyzeSign`'s `splitDomainAtZeros` produces sensible sub-intervals around
 * discontinuities. Idempotent for domains without excluded points.
 *
 * Input  : intervals = [int], excludedPoints = [p1, …, pn]
 * Output : intervals split at each pi (each pi excluded with an open endpoint),
 *          excludedPoints emptied.
 *
 * Excluded points outside the intervals are dropped silently (they cannot be
 * part of the solution either way, so this is a benign simplification).
 *
 * Non-`interval_set` domains (`empty`, `universal`, `condition_domain`,
 * `periodic_exclusion`) are returned unchanged. Only `IntervalSet` carries
 * `excludedPoints` in this codebase, so there is nothing to do for the others;
 * `analyzeSign` handles them through its own logic.
 */
function expandExcludedPoints(domain: Domain): Domain {
	if (domain.kind !== 'interval_set') return domain;
	const set = domain as IntervalSet;
	if (set.excludedPoints.length === 0) return domain;

	const newIntervals: Interval[] = [];
	for (const int of set.intervals) {
		newIntervals.push(...splitIntervalAtExcluded(int, set.excludedPoints));
	}
	return intervalSet(newIntervals, []);
}

function splitIntervalAtExcluded(
	int: Interval,
	excluded: readonly { value: MathNode }[]
): Interval[] {
	// Sort excluded points that fall within this interval, ascending.
	const lowerN = endpointToNumber(int.lower.value);
	const upperN = endpointToNumber(int.upper.value);
	const inside = excluded
		.map((ep) => ({ value: ep.value, num: endpointToNumber(ep.value) }))
		.filter((ep) => Number.isFinite(ep.num) && ep.num > lowerN && ep.num < upperN)
		.sort((a, b) => a.num - b.num);

	if (inside.length === 0) return [int];

	const result: Interval[] = [];
	let currentLower: Endpoint = int.lower;
	for (const ep of inside) {
		const upperEp = openEndpoint(ep.value);
		result.push(interval(currentLower, upperEp));
		currentLower = openEndpoint(ep.value);
	}
	result.push(interval(currentLower, int.upper));
	return result;
}

function buildWarnings(signWarnings: readonly string[] | undefined, hasUnknown: boolean): string[] {
	const warnings: string[] = [];
	if (signWarnings) warnings.push(...signWarnings);
	if (hasUnknown) {
		warnings.push(
			'Le signe est resté indéterminé sur au moins un sous-intervalle — résultat partiel.'
		);
	}
	return warnings;
}

// =============================================================================
// Re-exports
// =============================================================================

export type {
	InequalityOp,
	InequalityStatus,
	SolveInequalityOptions,
	SolveInequalityResult
} from './types';
export { SolveInequalityError, InequalityNotSolvable } from './types';
