/**
 * Intégrale définie : valeur interdite de f dans [a ; b] (bornes comprises).
 *
 * ∫ₐᵇ f(x) dx n'a de sens (au programme de Terminale) que si f est définie —
 * et continue — sur tout [a ; b]. Ce contrôle est EXACT : il lit le domaine de
 * f calculé par `domain/` (`computeDomain`, dont les racines des dénominateurs
 * viennent du noyau de factorisation) et rend la première valeur interdite de
 * [a ; b], écrite exactement (`3/2`, `0`, `π/2`) pour être citée à l'élève.
 *
 * Valeurs examinées : les points exclus (pôles, dénominateurs nuls), les
 * extrémités des intervalles du domaine (ln x sur [−1 ; 1] : 0), les bornes
 * elles-mêmes, et le premier point d'une exclusion périodique (tan).
 *
 * Trois issues (`IntervalCheck`) : f définie sur [a ; b] ; valeur interdite
 * trouvée ; contrôle impossible — bornes littérales (comportement d'avant :
 * la valeur reste symbolique) ou domaine non résolu (dénominateur e^x − 2 :
 * l'appelant ne doit publier aucun nombre).
 *
 * @module mathAST/integration/forbidden-value
 */

import type { MathNode } from '../types';
import { computeDomain, containsValue } from '../domain';
import type { Domain } from '../domain/types';
import { compile } from '../eval/compile';
import { evaluate } from '../eval/evaluate';
import { isEvalValue } from '../eval/types';
import { add, divide, multiply } from '../factory';
import { numericNode } from '../common/numeric';
import { isDivision } from '../guards';
import { mapNode } from '../transforms';
import { tidyTerms } from '../tidy/terms';

// =============================================================================
// Constantes
// =============================================================================

/** Écart toléré (relatif) entre une valeur interdite et une borne */
const BOUND_TOLERANCE = 1e-12;

// =============================================================================
// Outils
// =============================================================================

/** Valeur numérique d'une constante (π, √2 compris), NaN si littérale */
export function numericValueOrNaN(node: MathNode): number {
	try {
		return compile(node)({});
	} catch {
		return Number.NaN;
	}
}

/**
 * Forme exacte réduite, écrite comme à la main : `π/2 + 1·π` → `\dfrac{3\pi}{2}`
 * (`evaluate` seul rend `\dfrac{3}{2}\pi`), ou le nœud tel quel
 */
function reduced(node: MathNode): MathNode {
	try {
		const result = evaluate(node, { mode: 'exact' });
		if (isEvalValue(result)) return tidyTerms(result.node);
	} catch {
		/* forme brute */
	}
	return node;
}

/** Quotients écrits en fraction (`3 / 2` du domaine → `\dfrac{3}{2}`) */
function asFractions(node: MathNode): MathNode {
	return mapNode(node, (n) =>
		isDivision(n) && n.displayStyle !== 'fraction'
			? divide(n.numerator, n.denominator, 'fraction')
			: n
	);
}

/** Valeurs du domaine à examiner (avant tri et filtrage sur [lo ; hi]) */
function candidatesOf(domain: Domain, lo: number): MathNode[] {
	switch (domain.kind) {
		case 'interval_set':
			return [
				...domain.excludedPoints.map((p) => p.value),
				...domain.intervals.flatMap((i) => [i.lower.value, i.upper.value])
			];
		case 'periodic_exclusion': {
			// Premier point interdit ≥ lo : base + k·période
			const base = numericValueOrNaN(domain.basePoint);
			const period = numericValueOrNaN(domain.period);
			if (!Number.isFinite(base) || !Number.isFinite(period) || period === 0) return [];
			const steps = Math.ceil((lo - base) / Math.abs(period) - BOUND_TOLERANCE);
			// Nombre de périodes signé : la période du domaine peut être négative
			const k = period > 0 ? steps : -steps;
			if (k === 0) return [domain.basePoint];
			return [reduced(add(domain.basePoint, multiply(numericNode(k), domain.period, 'implicit')))];
		}
		default:
			return [];
	}
}

// =============================================================================
// Point d'entrée
// =============================================================================

/** Issue du contrôle de f sur [a ; b] */
export type IntervalCheck =
	| { readonly kind: 'defined' }
	| { readonly kind: 'forbidden'; readonly value: MathNode }
	| { readonly kind: 'unchecked'; readonly reason: 'literal-bounds' | 'unresolved-domain' };

/**
 * Première valeur de [a ; b] (bornes comprises, dans un sens ou dans l'autre)
 * où `integrand` n'est pas défini, en écriture exacte (`forbidden`) ;
 * `defined` si f est définie sur tout [a ; b] ; `unchecked` si le contrôle est
 * impossible (bornes littérales, domaine non résolu ou non calculable).
 *
 * @example
 * forbiddenValueOnInterval(parseLatex('\\frac{5}{4x^2-9}'), 'x', number('1'), number('2'))
 * // → { kind: 'forbidden', value: 3/2 }
 */
export function forbiddenValueOnInterval(
	integrand: MathNode,
	variable: string,
	lower: MathNode,
	upper: MathNode
): IntervalCheck {
	const a = numericValueOrNaN(lower);
	const b = numericValueOrNaN(upper);
	if (!Number.isFinite(a) || !Number.isFinite(b)) {
		return { kind: 'unchecked', reason: 'literal-bounds' };
	}
	const lo = Math.min(a, b);
	const hi = Math.max(a, b);

	let domain: Domain;
	try {
		const result = computeDomain(integrand, variable);
		if (result.unresolved && result.unresolved.length > 0) {
			return { kind: 'unchecked', reason: 'unresolved-domain' };
		}
		domain = result.domain;
	} catch {
		return { kind: 'unchecked', reason: 'unresolved-domain' };
	}
	if (domain.kind === 'universal') return { kind: 'defined' };

	const margin = BOUND_TOLERANCE * Math.max(1, Math.abs(lo), Math.abs(hi));
	const inside = [lower, upper, ...candidatesOf(domain, lo)]
		.map((node) => ({ node, value: numericValueOrNaN(node) }))
		.filter(({ value }) => Number.isFinite(value) && value >= lo - margin && value <= hi + margin)
		.sort((p, q) => p.value - q.value);

	const forbidden = inside.find(({ value }) => !containsValue(domain, value));
	return forbidden
		? { kind: 'forbidden', value: asFractions(forbidden.node) }
		: { kind: 'defined' };
}
