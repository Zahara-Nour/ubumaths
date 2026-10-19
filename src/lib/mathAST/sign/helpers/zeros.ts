/**
 * Zero Finding Helpers for Sign Analysis
 *
 * Functions for finding zeros (roots) of mathematical expressions
 * within a specified domain using the solve module.
 *
 * Zeros serve as partition points for sign analysis: the domain is split at
 * zeros into sub-intervals where the expression doesn't cross zero.
 * By the intermediate value theorem, on each such sub-interval (assuming
 * continuity), the expression has constant sign.
 *
 * **This is the critical dependency of the entire sign module.** If findZeros
 * misses a zero (because solve cannot handle the equation type), the sign
 * analysis will produce an interval that actually contains a sign change,
 * and sampling may silently "confirm" an incorrect sign. No warning is emitted.
 *
 * ## Exact vs approximate values
 *
 * Each zero is returned as a ZeroInfo with:
 * - `value: MathNode` — the **exact symbolic** representation (e.g. sqrt(2), π/3).
 *   This is used as interval bounds, preserving exactness throughout.
 * - `approximate: number` — a numeric approximation used **only** for sorting,
 *   deduplication (within tolerance), and domain membership checks.
 * - `exact: boolean` — whether the zero was found algebraically (true) or
 *   numerically (false).
 *
 * The distinction matters: interval bounds in the final SignAnalysisResult are
 * always the exact MathNode values, never floating-point approximations.
 *
 * @module mathAST/sign/helpers/zeros
 */

import type { MathNode, RelationNode } from '../../types';
import type { Domain } from '../../domain/types';
import type { ZeroInfo } from '../types';
import type { Solution, PeriodicSolutionFamily } from '../../solve/types';
import { solve } from '../../solve/solve';
import { equals, number } from '../../factory';
import { periodicMember } from '../../common/periodic-member';
import { isRelation } from '../../guards';
import { containsNode } from '../../domain/algebra';
import { computeDomain } from '../../domain/compute';
import { compile } from '../../eval/compile';
import { getEndpoints } from '$lib/math/intervals';
import { endpointToNumber } from '$lib/math/intervals/endpoint';

// =============================================================================
// Zero Finding
// =============================================================================

/**
 * Find zeros of an expression f(x) = 0 within a domain.
 * Uses the solve module to find roots and filters them based on the domain.
 *
 * @param expr - The expression to find zeros for
 * @param variable - The variable name (e.g., 'x')
 * @param domain - The domain to restrict zeros to
 * @returns Array of ZeroInfo objects for zeros within the domain
 *
 * @example
 * // Find zeros of x^2 - 4 in R
 * const zeros = findZeros(parse('x^2 - 4'), 'x', universalDomain());
 * // Returns zeros at -2 and 2
 */
export function findZeros(expr: MathNode, variable: string, domain: Domain): ZeroInfo[] {
	return findZerosWithStatus(expr, variable, domain).zeros;
}

/**
 * Les zéros, ET le fait que f(x) = 0 a bien été résolue.
 *
 * ⚠️ **« Aucun zéro » et « je n'ai pas su résoudre » ne sont pas la même
 * réponse.** `findZeros` rend `[]` dans les deux cas : un échec du solveur
 * (« Type d'equation … non supporte ») devenait « aucun zéro », et le tableau
 * de signes concluait sur un intervalle qui en contenait peut-être. Même
 * distinction que `.variations` (#852) : une erreur n'est une absence
 * DÉMONTRÉE que si le solveur le dit (`conclusive`).
 */
export function findZerosWithStatus(
	expr: MathNode,
	variable: string,
	domain: Domain
): {
	readonly zeros: ZeroInfo[];
	readonly resolved: boolean;
	/**
	 * La famille des zéros PÉRIODIQUES, quand le domaine n'est pas borné : la
	 * liste `zeros` s'arrête aux zéros connus (`sin(πx/180)` sur ℝ : 0 et 180),
	 * un intervalle non borné en contient d'autres (360, −180…). Entre le plus
	 * petit et le plus grand zéro connu, elle est complète.
	 */
	readonly periodicFamily?: PeriodicSolutionFamily;
} {
	// Handle empty domain
	if (domain.kind === 'empty') {
		return { zeros: [], resolved: true };
	}

	try {
		// Create equation expr = 0
		const equation: RelationNode = equals(expr, number('0'));

		// Validate that we created a valid relation
		if (!isRelation(equation)) {
			return { zeros: [], resolved: false };
		}

		// Solve the equation
		const result = solve(equation, { variable });

		// Un échec du solveur n'est pas une absence de zéro (voir plus haut).
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

		// Handle infinite solutions (e.g., 0 = 0)
		if (result.status === 'infinite') {
			// Expression is identically zero - no isolated zeros to report
			return { zeros: [], resolved: true };
		}

		// Famille ÉCARTÉE par le solveur (`cos x/√x`, `sin x/x`) : la liste ne
		// couvre qu'une période. On l'énumère quand même, en ne gardant que les
		// membres où l'expression est définie (et nulle) ; domaine de
		// l'expression non déterminé : les zéros ne sont pas tous connus.
		const dropped = result.droppedPeriodicSolutions;
		const keep = dropped === undefined ? undefined : definedMemberFilter(expr, variable);
		if (keep === null) {
			return { zeros: filterSolutionsInDomain(result.solutions, domain), resolved: false };
		}
		const family = result.periodicSolutions ?? dropped;

		// Handle periodic solutions on bounded domains
		if (family && domain.kind === 'interval_set') {
			const bounds = getDomainBounds(domain);
			if (
				bounds &&
				bounds.lower !== null &&
				bounds.upper !== null &&
				isFinite(bounds.lower) &&
				isFinite(bounds.upper)
			) {
				// La famille ET les solutions isolées : `x(sin²x − 1/4)` a x = 0
				// hors de la famille ±π/6 + kπ, `(x − 1)·sin x` a x = 1. Ne
				// parcourir que la famille les perdait.
				// Énumération tronquée (trop de zéros) : la liste est incomplète,
				// f(x) = 0 n'est pas résolue sur le domaine.
				const periodic = enumeratePeriodicZeros(family, bounds, domain, keep);
				return {
					zeros: mergeZeros(periodic.zeros, filterSolutionsInDomain(result.solutions, domain)),
					resolved: periodic.complete
				};
			}
		}

		// Filter solutions within the domain (default non-periodic path)
		const listed = filterSolutionsInDomain(result.solutions, domain);
		if (!family) return { zeros: listed, resolved: true };

		// Domaine non borné, zéros périodiques : les membres de la famille situés
		// ENTRE les zéros connus (et la borne finie du domaine) manquaient.
		// `(x − 20)·sin x` rendait 0, π et 20 : ]π ; 20[ contient 2π… 6π, et
		// l'échantillonnage y aurait « confirmé » un signe faux.
		const inner = familyBetweenKnownZeros(family, listed, domain, keep);
		return {
			zeros: mergeZeros(inner.zeros, listed),
			resolved: inner.complete,
			periodicFamily: family
		};
	} catch {
		// Le solveur a levé une exception : f(x) = 0 n'est pas résolue.
		return { zeros: [], resolved: false };
	}
}

/**
 * Réunion de deux listes de zéros, dédoublonnée sur la valeur numérique et
 * triée. Un zéro sans valeur numérique est gardé tel quel.
 *
 * @internal
 */
function mergeZeros(periodic: readonly ZeroInfo[], isolated: readonly ZeroInfo[]): ZeroInfo[] {
	const merged: ZeroInfo[] = [...periodic];
	for (const zero of isolated) {
		const value = zero.approximate;
		const duplicate =
			value !== undefined &&
			merged.some((z) => z.approximate !== undefined && Math.abs(z.approximate - value) < 1e-9);
		if (!duplicate) merged.push(zero);
	}
	return merged.sort(
		(a, b) =>
			(a.approximate ?? Number.POSITIVE_INFINITY) - (b.approximate ?? Number.POSITIVE_INFINITY)
	);
}

/**
 * Filter solutions to only those within the specified domain.
 *
 * @param solutions - Solutions from the solve module
 * @param domain - Domain to filter by
 * @returns Array of ZeroInfo for solutions within the domain
 *
 * @internal
 */
function filterSolutionsInDomain(solutions: readonly Solution[], domain: Domain): ZeroInfo[] {
	const result: ZeroInfo[] = [];

	for (const solution of solutions) {
		if (!containsNode(domain, solution.value)) {
			continue;
		}

		// Convert to ZeroInfo
		result.push({
			value: solution.value,
			approximate: solution.approximate,
			exact: solution.exact
		});
	}

	return result;
}

// =============================================================================
// Periodic Zero Enumeration
// =============================================================================

/**
 * Enumerate all periodic zeros within bounded domain.
 *
 * For each base solution x₀ with period T, enumerates all values
 * x₀ + k*T that fall within the domain bounds.
 *
 * @param family - The periodic solution family from the solver
 * @param bounds - Numeric bounds of the domain
 * @param domain - The full domain for membership checks
 * @returns Array of ZeroInfo for all periodic zeros in the domain
 *
 * @internal
 */
function enumeratePeriodicZeros(
	family: PeriodicSolutionFamily,
	bounds: {
		lower: number | null;
		upper: number | null;
		lowerInclusive: boolean;
		upperInclusive: boolean;
	},
	domain: Domain,
	keep?: MemberFilter
): { readonly zeros: ZeroInfo[]; readonly complete: boolean } {
	const zeros: ZeroInfo[] = [];
	const { baseSolutions, period, periodNumeric } = family;

	if (periodNumeric <= 0 || !isFinite(periodNumeric)) return { zeros: [], complete: false };
	// Une solution sautée ou un plafond atteint : la liste n'est plus complète,
	// et un intervalle « entre deux zéros » en cacherait d'autres.
	let complete = true;

	const lower = bounds.lower!;
	const upper = bounds.upper!;

	// Tolerance for floating-point boundary comparisons.
	// Math.PI + 2*Math.PI may not equal 3*Math.PI exactly.
	// Looser than the 1e-10 duplicate tolerance in the solver because
	// boundary comparisons involve accumulated floating-point errors from k*period.
	const eps = 1e-9;

	// Safety: limit the number of points to avoid runaway enumeration
	const maxPoints = 500;

	for (const baseSolution of baseSolutions) {
		const baseNumeric = baseSolution.approximate;
		if (baseNumeric === undefined) {
			complete = false;
			continue;
		}

		// Slightly expand k range to catch boundary values
		const kMin = Math.ceil((lower - eps - baseNumeric) / periodNumeric);
		const kMax = Math.floor((upper + eps - baseNumeric) / periodNumeric);

		// Safety: prevent excessive iteration for very large domains or tiny periods
		if (kMax - kMin > 1000) {
			complete = false;
			continue;
		}

		for (let k = kMin; k <= kMax; k++) {
			if (zeros.length >= maxPoints) {
				complete = false;
				break;
			}
			const numericValue = baseNumeric + k * periodNumeric;

			// Check if value is within bounds (with tolerance)
			if (numericValue < lower - eps || numericValue > upper + eps) continue;

			// Check inclusive/exclusive bounds
			const atLower = Math.abs(numericValue - lower) < eps;
			const atUpper = Math.abs(numericValue - upper) < eps;
			if (atLower && !bounds.lowerInclusive) continue;
			if (atUpper && !bounds.upperInclusive) continue;

			// Build symbolic value
			const symbolicValue = periodicMember(baseSolution.value, k, period);

			// For non-contiguous domains (interval unions), check membership
			if (!atLower && !atUpper && !containsNode(domain, symbolicValue)) continue;
			// Famille écartée : membre hors du domaine de l'expression
			if (keep !== undefined && !keep(symbolicValue, numericValue)) continue;

			zeros.push({
				value: symbolicValue,
				approximate: numericValue,
				exact: true
			});
		}
	}

	return { zeros, complete };
}

/**
 * Les zéros de la famille compris entre le plus petit et le plus grand des
 * points connus : zéros listés, bornes FINIES du domaine, et le premier membre
 * de la famille au-delà de chaque borne finie.
 *
 * Ce premier membre compte : `ln(2 + sin x)` sur [0 ; +∞[ a pour zéros
 * −π/2 + 2kπ, le solveur rend −π/2 (hors du domaine), et le tableau disait
 * « positif sur [0 ; +∞[ » sans aucun zéro, au lieu de 0 en 3π/2.
 *
 * @internal
 */
function familyBetweenKnownZeros(
	family: PeriodicSolutionFamily,
	listed: readonly ZeroInfo[],
	domain: Domain,
	keep?: MemberFilter
): { readonly zeros: ZeroInfo[]; readonly complete: boolean } {
	const bounds = getDomainBounds(domain);
	const known: { value: number; inclusive: boolean }[] = listed
		.filter((z) => z.approximate !== undefined && isFinite(z.approximate))
		.map((z) => ({ value: z.approximate as number, inclusive: true }));
	if (bounds?.lower != null && isFinite(bounds.lower)) {
		known.push({ value: bounds.lower, inclusive: bounds.lowerInclusive });
		const first = firstMemberBeyond(family, bounds.lower, 1);
		if (first !== null) known.push({ value: first, inclusive: true });
	}
	if (bounds?.upper != null && isFinite(bounds.upper)) {
		known.push({ value: bounds.upper, inclusive: bounds.upperInclusive });
		const last = firstMemberBeyond(family, bounds.upper, -1);
		if (last !== null) known.push({ value: last, inclusive: true });
	}
	if (known.length < 2) return { zeros: [], complete: true };

	known.sort((a, b) => a.value - b.value);
	const low = known[0];
	const high = known[known.length - 1];
	if (high.value - low.value <= 0) return { zeros: [], complete: true };
	return enumeratePeriodicZeros(
		family,
		{
			lower: low.value,
			upper: high.value,
			lowerInclusive: low.inclusive,
			upperInclusive: high.inclusive
		},
		domain,
		keep
	);
}

/** Marge relative (en périodes) du premier membre au-delà d'une borne. */
const BEYOND_EPS = 1e-9;

/**
 * Le membre de la famille le plus proche de `bound`, du côté `direction`
 * (1 : au-dessus, −1 : en dessous), `bound` exclu ; `null` sans valeur
 * numérique. Un membre égal à la borne est déjà couvert par l'énumération.
 *
 * @internal
 */
function firstMemberBeyond(
	family: PeriodicSolutionFamily,
	bound: number,
	direction: 1 | -1
): number | null {
	const period = family.periodNumeric;
	if (!(period > 0) || !isFinite(period)) return null;
	let best: number | null = null;
	for (const base of family.baseSolutions) {
		const start = base.approximate;
		if (start === undefined || !isFinite(start)) return null;
		// Marge : un membre égal à la borne aux arrondis près (0 pour kπ sur
		// ]0 ; +∞[) n'est pas « au-delà » — il serait compté sur une borne ouverte
		const steps = (bound - start) / period;
		const k =
			direction === 1 ? Math.floor(steps + BEYOND_EPS) + 1 : Math.ceil(steps - BEYOND_EPS) - 1;
		const member = start + k * period;
		if (best === null || (direction === 1 ? member < best : member > best)) best = member;
	}
	return best;
}

/** Garde un membre d'une famille (valeur exacte, valeur approchée) ? */
type MemberFilter = (value: MathNode, approximate: number) => boolean;

/** Demi-largeur relative du voisinage où l'expression doit être définie. */
const NEIGHBOURHOOD = 1e-6;

/**
 * Les membres d'une famille écartée qui sont de vrais zéros.
 *
 * - Domaine de l'expression déterminé : membre dans ce domaine (`√x` : x > 0 ;
 *   `x` : x ≠ 0 ; `tan x` : x ≠ π/2 + kπ) où elle prend une valeur finie.
 * - Domaine NON déterminé (f′ de `2√(sin x)` : cos x/√(sin x)) : contrôle
 *   numérique — l'expression est finie au membre ET de part et d'autre (un
 *   membre où elle n'est pas définie, 3π/2 ici, n'est jamais un zéro). Le
 *   domaine d'étude, lui, est déjà vérifié par l'énumération.
 *
 * `null` seulement quand l'expression ne se compile pas.
 *
 * @internal
 */
function definedMemberFilter(expr: MathNode, variable: string): MemberFilter | null {
	let f: (scope: Record<string, number>) => number;
	try {
		f = compile(expr);
	} catch {
		return null;
	}
	const finiteAt = (x: number) => Number.isFinite(f({ [variable]: x }));
	let exprDomain: Domain | undefined;
	try {
		const result = computeDomain(expr, variable);
		if (result.unresolved === undefined && result.domain.kind !== 'condition_domain') {
			exprDomain = result.domain;
		}
	} catch {
		exprDomain = undefined;
	}
	if (exprDomain !== undefined) {
		const known = exprDomain;
		return (value, approximate) => containsNode(known, value) && finiteAt(approximate);
	}
	return (_value, approximate) => {
		const h = NEIGHBOURHOOD * Math.max(1, Math.abs(approximate));
		return finiteAt(approximate) && finiteAt(approximate - h) && finiteAt(approximate + h);
	};
}

// =============================================================================
// Zero Sorting
// =============================================================================

/**
 * Sort zeros by their numeric value for interval splitting.
 * Zeros without numeric approximations are placed at the end.
 *
 * @param zeros - Array of ZeroInfo objects to sort
 * @returns New sorted array (original is not modified)
 *
 * @example
 * const sorted = sortZerosByValue(zeros);
 * // Zeros are now in ascending order by approximate value
 */
export function sortZerosByValue(zeros: readonly ZeroInfo[]): ZeroInfo[] {
	return [...zeros].sort((a, b) => {
		// Handle missing approximations - put at end
		if (a.approximate === undefined && b.approximate === undefined) {
			return 0;
		}
		if (a.approximate === undefined) {
			return 1;
		}
		if (b.approximate === undefined) {
			return -1;
		}

		// Sort by numeric value
		return a.approximate - b.approximate;
	});
}

// =============================================================================
// Zero Utilities
// =============================================================================

/**
 * Get unique zeros, removing duplicates based on approximate value.
 * Uses a tolerance for comparing approximate values.
 *
 * @param zeros - Array of ZeroInfo objects
 * @param tolerance - Tolerance for considering values equal (default: 1e-10)
 * @returns Array with duplicate zeros removed
 *
 * @example
 * const unique = getUniqueZeros(zeros, 1e-8);
 */
export function getUniqueZeros(zeros: readonly ZeroInfo[], tolerance: number = 1e-10): ZeroInfo[] {
	if (zeros.length === 0) {
		return [];
	}

	const result: ZeroInfo[] = [];

	for (const zero of zeros) {
		// Check if we already have a zero with similar value
		const isDuplicate = result.some((existing) => {
			if (existing.approximate === undefined || zero.approximate === undefined) {
				// Can't compare without approximations - assume different
				return false;
			}
			return Math.abs(existing.approximate - zero.approximate) < tolerance;
		});

		if (!isDuplicate) {
			result.push(zero);
		}
	}

	return result;
}

/**
 * Get zeros that fall within an interval.
 *
 * @param zeros - Array of ZeroInfo objects
 * @param lowerBound - Lower bound (null for -infinity)
 * @param upperBound - Upper bound (null for +infinity)
 * @param lowerInclusive - Whether lower bound is inclusive
 * @param upperInclusive - Whether upper bound is inclusive
 * @returns Zeros within the interval
 *
 * @example
 * const inInterval = getZerosInInterval(zeros, 0, 10, false, true);
 * // Gets zeros in (0, 10]
 */
export function getZerosInInterval(
	zeros: readonly ZeroInfo[],
	lowerBound: number | null,
	upperBound: number | null,
	lowerInclusive: boolean = true,
	upperInclusive: boolean = true
): ZeroInfo[] {
	return zeros.filter((zero) => {
		if (zero.approximate === undefined) {
			// Can't determine - conservatively include
			return true;
		}

		const value = zero.approximate;

		// Check lower bound
		if (lowerBound !== null) {
			if (lowerInclusive) {
				if (value < lowerBound) return false;
			} else {
				if (value <= lowerBound) return false;
			}
		}

		// Check upper bound
		if (upperBound !== null) {
			if (upperInclusive) {
				if (value > upperBound) return false;
			} else {
				if (value >= upperBound) return false;
			}
		}

		return true;
	});
}

/**
 * Get numeric bounds from a domain for zero filtering.
 *
 * Uses getEndpoints + endpointToNumber (irréductible — the periodic zero
 * enumeration loop needs float for kMin/kMax).
 *
 * @param domain - The domain to extract bounds from
 * @returns Object with lower and upper bounds, or null if unbounded
 *
 * @internal
 */
export function getDomainBounds(domain: Domain): {
	lower: number | null;
	upper: number | null;
	lowerInclusive: boolean;
	upperInclusive: boolean;
} | null {
	if (domain.kind === 'empty') {
		return null;
	}

	if (domain.kind !== 'interval_set') {
		return { lower: null, upper: null, lowerInclusive: false, upperInclusive: false };
	}

	const ep = getEndpoints(domain);
	if (!ep) return null;

	const lo = endpointToNumber(ep.lo.value);
	const hi = endpointToNumber(ep.hi.value);

	return {
		lower: lo === -Infinity ? null : lo,
		upper: hi === Infinity ? null : hi,
		lowerInclusive: ep.lo.type === 'closed',
		upperInclusive: ep.hi.type === 'closed'
	};
}
