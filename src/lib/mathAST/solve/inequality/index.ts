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
import type { Domain } from '../../domain/types';
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
import { promoteEulerInRelation } from '../promote-euler';

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

	// Promote bare `e` (parsed as a regular variable) to `euler()` when it
	// appears as the base of a superscript. Without this, `detectVariable`
	// treats `e^x - 1 > 0` as having two unknowns `{e, x}` and returns null,
	// short-circuiting into the constant-inequality path.
	const promoted = promoteEulerInRelation(relation);
	const expression = canon(subtract(promoted.left, promoted.right));

	const variable = options.variable ?? detectVariable(promoted);
	if (variable === null) {
		return resolveConstantInequality(expression, inequalityOp);
	}

	rejectIfParametric(expression, variable);

	const signResult = analyzeSign(expression, {
		variable,
		domain: options.domain,
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
function computeStatus(domain: Domain, solution: Domain, hasUnknown: boolean): InequalityStatus {
	if (isDomainEmpty(domain)) return 'empty-domain';
	if (hasUnknown) return 'partial';
	if (isDomainEmpty(solution)) return 'no-solution';
	if (isDomainEmpty(difference(domain, solution))) return 'all-real';
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
