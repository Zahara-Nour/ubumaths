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

import { reservedVariableRefusal } from '../../common/reserved-letters';
import type { MathNode, RelationNode } from '../../types';
import type { Domain, PeriodicExclusion } from '../../domain/types';
import { evaluateNodeToApproximatedNumber } from '../../eval/evaluate';
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
import { isEmpty as isDomainEmpty, union, difference, intersect } from '../../domain/algebra';
import { computeDomain, normalizeExcludedPoints } from '../../domain/compute';
import { endpointToNumber } from '$lib/math/intervals/endpoint';
import { emptyDomain, intervalSet } from '../../domain/factory';

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

	const refusal = reservedVariableRefusal(options.variable, relation);
	if (refusal !== null) {
		throw new SolveInequalityError(refusal, `variable: ${options.variable}`);
	}

	const expression = canon(subtract(relation.left, relation.right));

	const variable = options.variable ?? detectVariable(relation);
	if (variable === null) {
		return resolveConstantInequality(expression, inequalityOp);
	}

	rejectIfParametric(expression, variable);

	// Le domaine de définition se lit sur l'inéquation ÉCRITE, pas sur la forme
	// canonique : `normalize` simplifie \frac{3x}{3x} en 1 et \ln x − \ln x en 0,
	// et 0 ou x ≤ 0 rentraient dans l'ensemble solution (écart V47)
	const definition = computeDomain(subtract(relation.left, relation.right), variable);
	if (definition.unresolved !== undefined && definition.unresolved.length > 0) {
		// x⁵ − x + 1 ≠ 0 non résolue : le domaine serait trop grand, on ne conclut pas
		throw new InequalityNotSolvable(
			"Le domaine de définition n'a pas pu être déterminé exactement",
			definition.unresolved.join(' ; ')
		);
	}
	// Points interdits écrits en intervalles (ℝ \ {0} → ]-∞ ; 0[ ∪ ]0 ; +∞[), sans
	// quoi `difference` ne reconnaît pas « tout le domaine » ; sur une borne du
	// domaine imposé, le point l'ouvre : [0 ; 1] \ {0} → ]0 ; 1]
	const domain = normalizeExcludedPoints(
		options.domain ? intersect(definition.domain, options.domain) : definition.domain
	);
	// Exclusion périodique (\frac{\sin x}{\sin x}) : le découpage du signe ne la
	// suit pas (il la lit comme ℝ), le résultat ne peut être que partiel — sauf
	// si aucun pôle ne tombe dans le domaine imposé (\tan x ≥ 0 sur [-1 ; 1]), ou
	// si le domaine imposé est BORNÉ : `intersect` y énumère alors les pôles
	// (\tan x > 0 sur [0 ; π] → ]0 ; π/2[, complet)
	const periodicDomain =
		definition.domain.kind === 'condition_domain' ||
		(definition.domain.kind === 'periodic_exclusion' &&
			(options.domain === undefined ||
				(periodicPoleInside(definition.domain, options.domain) && !isBoundedSet(domain))));

	const signResult = analyzeSign(expression, {
		variable,
		domain,
		numericFallback: options.numericFallback ?? true,
		tolerance: options.tolerance,
		strictMode: false
	});

	const aggregated = aggregateSolution(signResult, inequalityOp);
	const solution = aggregated.solution;
	const hasUnknown = aggregated.hasUnknown || periodicDomain;
	const status = computeStatus(signResult.domain, solution, hasUnknown, aggregated.everyMatches);

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

/** Un ensemble d'intervalles aux bornes toutes finies. */
function isBoundedSet(domain: Domain): boolean {
	return (
		domain.kind === 'interval_set' &&
		domain.intervals.every(
			(int) =>
				Number.isFinite(endpointToNumber(int.lower.value)) &&
				Number.isFinite(endpointToNumber(int.upper.value))
		)
	);
}

/**
 * Un point de `base + k·période` tombe-t-il dans `imposed` (bornes comprises) ?
 * Dans le doute (borne ou période non évaluable, domaine non intervalle) : oui.
 */
function periodicPoleInside(periodic: PeriodicExclusion, imposed: Domain): boolean {
	if (imposed.kind === 'empty') return false;
	if (imposed.kind !== 'interval_set') return true;
	const base = numericValue(periodic.basePoint);
	const period = numericValue(periodic.period);
	if (base === null || period === null || period <= 0) return true;
	for (const piece of imposed.intervals) {
		const lo = numericValue(piece.lower.value);
		const hi = numericValue(piece.upper.value);
		if (lo === null || hi === null) return true;
		if (!Number.isFinite(lo) || !Number.isFinite(hi)) return true;
		// Premier pôle ≥ lo, à une tolérance près (un pôle sur une borne compte)
		const first = base + Math.ceil((lo - base) / period - 1e-9) * period;
		if (first <= hi + 1e-9) return true;
	}
	return false;
}

function numericValue(node: MathNode): number | null {
	if (node.type === 'infinity') return node.sign === 'positive' ? Infinity : -Infinity;
	try {
		const value = evaluateNodeToApproximatedNumber(node);
		return Number.isNaN(value) ? null : value;
	} catch {
		return null;
	}
}

/**
 * Aggregate signed sub-intervals matching the operator into a single domain.
 */
function aggregateSolution(
	signResult: SignAnalysisResult,
	op: InequalityOp
): { solution: Domain; hasUnknown: boolean; everyMatches: boolean } {
	let solution: Domain = emptyDomain();
	let hasUnknown = false;
	let everyMatches = true;

	for (const si of signResult.signedIntervals) {
		if (si.sign === 'unknown') {
			hasUnknown = true;
			continue;
		}
		if (matchesOperator(si.sign, op)) {
			solution = union(solution, intervalSet([si.interval]));
		} else {
			everyMatches = false;
		}
	}

	return { solution, hasUnknown, everyMatches };
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
 * Branch order: `empty-domain` → `partial` → `no-solution` → `all-real` →
 * `complete`. `partial` is reported BEFORE `no-solution` when at least one
 * sub-interval has an undetermined sign — even if the known part of the
 * solution is empty.
 *
 * Rationale (revised 2026-05-06): the V1 spec listed `no-solution` first,
 * but real-world cases like `e^x − 1 > 0` (sampling overflows on the right
 * tail and reports `'unknown'` for `]0, +∞[`) expose the issue. The known
 * portion of the solution is empty, but the actual answer `]0, +∞[` lives
 * inside the unknown region. Reporting `'no-solution'` would actively
 * mislead the caller — `'partial'` honestly says "we couldn't decide on
 * some regions; check `signTable` and `warnings`".
 *
 * Edge case: a genuinely empty solution that ALSO has an unknown region
 * elsewhere will report `'partial'`. This is acceptable — the caller can
 * inspect the matching intervals to confirm; reporting `'no-solution'`
 * would hide the unresolved region.
 */
function computeStatus(
	domain: Domain,
	solution: Domain,
	hasUnknown: boolean,
	everyMatches: boolean
): InequalityStatus {
	if (isDomainEmpty(domain)) return 'empty-domain';
	if (hasUnknown) return 'partial';
	if (isDomainEmpty(solution)) return 'no-solution';
	// Chaque morceau du découpage convient : tout le domaine. `difference` seule
	// ne le voit pas sur ℝ \ {0}, dont le point exclu reste à part (V47)
	if (everyMatches || isDomainEmpty(difference(domain, solution))) return 'all-real';
	return 'complete';
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
