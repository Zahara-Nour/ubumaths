/**
 * Les conditions de `tidyWithConditions`, réunies et écrites (chantier
 * tidy-conditions, David 2026-10-26).
 *
 * Une condition se dit une fois, la plus forte : `x > 0` contient `x ≠ 0` et
 * `x ≥ 0`, et `x ≥ 0` avec `x ≠ 0` donnent `x > 0`. Elle s'écrit sur la
 * variable quand l'expression est affine en une seule lettre (`x + 1 ≠ 0` →
 * `x ≠ −1`), sinon entière (`x² − 1 ≠ 0`).
 *
 * @module mathAST/tidy/conditions
 */

import type { MathNode } from '../types';
import type { Rational } from '../normal/types';
import type { DomainCondition, TidyCondition } from './types';
import type { TypeContext } from '../numtype';
import { domainConditions, writable, type AcquiredDomain } from './sign';
import { hashMathNode } from '../normal/hash';
import { extractExactRational, extractRational, rationalToNode } from '../common/numeric';
import { divRational, isNegative, negRational } from '../normal/rational';
import { toPolynomial } from '../factor/polynomial';
import { getVariables } from '../eval/substitute';
import { toLatex } from '../latex-generator';
import { toCustom } from '../custom-generator';
import { stripUnnecessaryBrackets } from '../transforms';
import { tidyNode } from './collect';
import type { Domain } from '../domain/types';
import { computeDomain } from '../domain/compute';
import { difference, excludePoints, intersect, isEmpty } from '../domain/algebra';
import { expandExcludedPoints } from '../domain/validation/compare-domains';
import { divide, func, number, opposite, subtract, variable } from '../factory';
import { findNodes, mapNode } from '../transforms';
import { isNumber } from '../guards';
import { evaluate } from '../eval/evaluate';
import { formatEndpointValue } from '$lib/math/intervals/format';
import type { Interval } from '$lib/math/intervals/types';

/** Une condition écrite, pour la ligne (LaTeX) et pour le texte. */
export interface ConditionText {
	readonly latex: string;
	readonly text: string;
}

/** Ce que la réécriture `before → after` fait du domaine (§ 4.2). */
export interface DomainChangeDetail {
	/** Les conditions où la réécriture vaut ; `[]` : le domaine ne change pas. */
	readonly conditions: TidyCondition[];
	/** Le domaine rétrécit : `ln(x²) → 2 ln x` ne vaut que pour x > 0. */
	readonly narrows: boolean;
}

/** Les domaines que l'inclusion (`difference`) lit : pas de famille périodique. */
const INCLUSION_READABLE: ReadonlySet<Domain['kind']> = new Set([
	'empty',
	'universal',
	'interval_set'
]);

const SYMBOLS: Record<TidyCondition['relation'], { text: string; latex: string }> = {
	nonzero: { text: '≠', latex: '\\neq' },
	positive: { text: '>', latex: '>' },
	nonnegative: { text: '≥', latex: '\\geq' }
};

/** L'expression d'une condition, mise au propre et rangée : `1+x` et `(x+1)` sont `x+1`. */
function canonical(expression: MathNode): MathNode {
	return tidyNode(stripUnnecessaryBrackets(expression));
}

/**
 * La clé d'une condition, qui ne dépend pas de son écriture (revue, 2026-10-26 :
 * `1/(1+x)` rangé en `1/(x+1)` passait pour une perte de domaine). Affine en une
 * lettre : la lettre, la racine et le sens (`2x+2` et `x+1` disent tous deux
 * x ≠ −1 ; le sens ne compte pas pour « ≠ ») ; sinon le hash de la forme rangée.
 */
export function conditionKey(condition: DomainCondition): string {
	if (condition.relation === 'defined') return `D${hashMathNode(canonical(condition.expression))}`;
	const affine = affineRoot(condition.expression);
	if (affine !== null) {
		const sense = condition.relation === 'nonzero' || !isNegative(affine.a) ? '+' : '-';
		return `A${affine.letter}:${affine.root.n}/${affine.root.d}:${sense}`;
	}
	return `V${hashMathNode(canonical(condition.expression))}`;
}

/**
 * Les conditions sur les expressions qui comptent : `√u ≠ 0` et `uⁿ ≠ 0`
 * disent `u ≠ 0` (le domaine de `√u` dit déjà `u ≥ 0`), un produit non nul a
 * chaque facteur non nul (`4x ≠ 0` → `x ≠ 0`), et `−u ≠ 0` dit `u ≠ 0`.
 */
function essential<C extends DomainCondition>(condition: C): C[] {
	const { expression, relation } = condition;
	if (relation === 'positive' || relation === 'nonnegative') return signOfPower(condition);
	if (relation !== 'nonzero') return [condition];
	const inner = (node: MathNode) => essential({ ...condition, expression: node });
	switch (expression.type) {
		case 'number':
			return [];
		case 'delimiter':
			return inner(expression.content);
		case 'opposite':
		case 'positive':
			return inner(expression.operand);
		case 'multiplication':
			return [...inner(expression.left), ...inner(expression.right)];
		case 'superscript':
			return inner(expression.base);
		case 'function':
			if (expression.name === 'sqrt' && expression.args.length === 1) {
				return inner(expression.args[0]);
			}
			return [condition];
		default:
			return [condition];
	}
}

/**
 * Le signe d'une puissance entière (§ 4.2) : `u²ᵏ > 0` dit `u ≠ 0`, `u²ᵏ ≥ 0`
 * ne dit rien, `u²ᵏ⁺¹` a le signe de `u` (`x³ > 0` → `x > 0`). Revue : la note
 * de `ln(x²) − ln(x²)` disait « pour x^2 > 0 ». Un exposant négatif et `a/u`
 * (`a > 0`) ne sont jamais nuls : `> 0` comme `≥ 0` y disent `u⁻ⁿ > 0`
 * (2ᵉ revue : `ln(x⁻²) − ln(x⁻²)` disait « 1/x^2 > 0 »).
 */
function signOfPower<C extends DomainCondition>(condition: C): C[] {
	const { expression } = condition;
	const node = expression.type === 'delimiter' ? expression.content : expression;
	if (node.type === 'division') {
		const numerator = extractRational(node.numerator);
		if (numerator === null || numerator.n <= 0n) return [condition];
		return essential({ ...condition, expression: node.denominator, relation: 'positive' } as C);
	}
	if (node.type !== 'superscript') return [condition];
	const exponent = extractRational(node.superscript);
	if (exponent === null || exponent.d !== 1n || exponent.n === 0n) return [condition];
	const relation = exponent.n < 0n ? 'positive' : condition.relation;
	const odd = (exponent.n < 0n ? -exponent.n : exponent.n) % 2n === 1n;
	if (odd) return essential({ ...condition, expression: node.base, relation } as C);
	if (relation === 'nonnegative') return [];
	return essential({ ...condition, expression: node.base, relation: 'nonzero' } as C);
}

/** Deux conditions sur la même expression : la plus forte, ou leur réunion. */
function strongest<R extends DomainCondition['relation']>(a: R, b: R): R {
	if (a === b) return a;
	return 'positive' as R;
}

/** Les conditions sans doublon, la plus forte par expression, dans l'ordre de lecture. */
export function mergeConditions<C extends DomainCondition>(conditions: readonly C[]): C[] {
	const merged = new Map<string, C>();
	for (const condition of conditions.flatMap((c) => essential(c))) {
		// « est définie » se compare à part : `tan(x) ≠ 0` ne dit pas que `tan(x)` existe
		const key = conditionKey(condition);
		const existing = merged.get(key);
		merged.set(
			key,
			existing === undefined
				? condition
				: // La même sorte de condition, renforcée : `C` garde sa forme
					({ ...existing, relation: strongest(existing.relation, condition.relation) } as C)
		);
	}
	return [...merged.values()];
}

/** `a` est-elle au moins aussi forte que `b` ? `x > 0` dit `x ≠ 0` et `x ≥ 0`. */
function implies(a: DomainCondition['relation'], b: DomainCondition['relation']): boolean {
	return a === b || (a === 'positive' && b !== 'defined');
}

const NOTHING_ACQUIRED: AcquiredDomain = { nonZero: new Set(), positive: new Set() };

/**
 * Ce que `after` a perdu du domaine de `before` (chantier tidy-conditions) :
 * les conditions qui définissent `before` et que `after` ne dit plus. `[]` :
 * le domaine est gardé, la réécriture est permise sans rien dire ; `null` :
 * une condition de `before` ne s'écrit pas simplement (`tan`), on ne sait pas
 * le dire. La comparaison est STRUCTURELLE (une condition par expression,
 * écrite comme `tidy` l'écrit) : au pire elle redit une condition vraie.
 */
export function domainLoss(
	before: MathNode,
	after: MathNode,
	typeCtx?: TypeContext
): TidyCondition[] | null {
	const still = mergeConditions(domainConditions(after, typeCtx, NOTHING_ACQUIRED));
	const lost = mergeConditions(domainConditions(before, typeCtx, NOTHING_ACQUIRED)).filter(
		(condition) =>
			!still.some(
				(other) =>
					conditionKey(other) === conditionKey(condition) &&
					implies(other.relation, condition.relation)
			)
	);
	return writable(lost);
}

/** Les conditions de `conditions` que `others` ne dit pas. */
function notSaidBy<C extends DomainCondition>(
	conditions: readonly C[],
	others: readonly DomainCondition[]
): C[] {
	return conditions.filter(
		(condition) =>
			!others.some(
				(other) =>
					conditionKey(other) === conditionKey(condition) &&
					implies(other.relation, condition.relation)
			)
	);
}

/**
 * L'ensemble où une condition vaut, pour sa lettre : celui où `1/u`, `ln(u)`
 * ou `√u` est défini. `null` : plusieurs lettres, « est définie » (`tan`), ou
 * un domaine que l'inclusion ne lit pas.
 */
export function conditionSet(
	condition: DomainCondition
): { letter: string; domain: Domain } | null {
	const { expression, relation } = condition;
	if (relation === 'defined') return null;
	const letters = getVariables(expression);
	if (letters.size !== 1) return null;
	const [letter] = letters;
	const inverse = relation === 'nonzero' ? inverseCircularZero(expression, letter) : null;
	if (inverse !== null) return { letter, domain: inverse };
	// `x − tan(1) ≠ 0`, écrit par `asPoints` : le point se dit tel quel
	const point = relation === 'nonzero' ? pointOf(expression) : null;
	if (point !== null && isExactPoint(point.point) && decimalValue(point.point) !== null) {
		return { letter, domain: excludePoints({ kind: 'universal' }, [point.point]) };
	}
	const witness: MathNode =
		relation === 'nonzero'
			? divide(number(1), expression, 'fraction')
			: func(relation === 'positive' ? 'ln' : 'sqrt', [expression]);
	const computed = computeDomain(witness, letter);
	if ((computed.unresolved?.length ?? 0) > 0) return null;
	// Des intervalles et des points seulement (`1/ln x` → ]0;+∞[ \ {1}) : `cos(x) ≠ 0`
	// exclut une famille π/2 + kπ que l'inclusion ne voit pas (revue : `cos(x)/cos(x)
	// avec x > 0` donnait 1) — on ne sait pas, on ne garantit rien
	if (!INCLUSION_READABLE.has(computed.domain.kind)) return null;
	return { letter, domain: computed.domain };
}

/** Les réciproques circulaires : leur réciproque, l'image de 0, leurs valeurs. */
const INVERSE_CIRCULAR: Record<
	string,
	{ inverse: string; atZero: number; low: number; high: number }
> = {
	arctan: { inverse: 'tan', atZero: 0, low: -Math.PI / 2, high: Math.PI / 2 },
	arcsin: { inverse: 'sin', atZero: 0, low: -Math.PI / 2, high: Math.PI / 2 },
	arccos: { inverse: 'cos', atZero: 1, low: 0, high: Math.PI }
};

/** La valeur décimale d'un nombre sans lettre (π et e compris) ; `null` sinon. */
function decimalValue(node: MathNode): number | null {
	try {
		const result = evaluate(node, { mode: 'decimal' });
		return result.status === 'value' && typeof result.value === 'number' && isFinite(result.value)
			? result.value
			: null;
	} catch {
		return null;
	}
}

/**
 * `f(u) − c ≠ 0`, f réciproque circulaire, c sans lettre (§ 5, L3) :
 * `computeDomain` ne le résout pas. `f(u) = c` ⇔ `u = F(c)` quand c est une
 * valeur de f (`arctan(x) − 1 ≠ 0` → x ≠ tan(1), `arcsin(x) ≠ 0` → x ≠ 0 et
 * −1 ≤ x ≤ 1) ; sinon f ne vaut jamais c, reste le domaine de f(u). `null` :
 * une autre forme. Une valeur au bord (`arcsin(x) − π/2`) : `null`, prudent.
 */
function inverseCircularZero(expression: MathNode, letter: string): Domain | null {
	const node = expression.type === 'delimiter' ? expression.content : expression;
	let call: MathNode = node;
	let shift: MathNode | null = null;
	let negated = false;
	if (node.type === 'subtraction' || node.type === 'addition') {
		call = node.left;
		shift = node.right;
		negated = node.type === 'addition';
	}
	if (call.type !== 'function' || call.args.length !== 1) return null;
	const known = INVERSE_CIRCULAR[call.name];
	if (known === undefined) return null;
	if (shift !== null && getVariables(shift).size > 0) return null;
	const [inner] = call.args;
	const own = computeDomain(call, letter);
	if ((own.unresolved?.length ?? 0) > 0 || !INCLUSION_READABLE.has(own.domain.kind)) return null;
	const value = shift === null ? 0 : decimalValue(shift);
	if (value === null) return null;
	const target = negated ? -value : value;
	const epsilon = 1e-9;
	if (Math.abs(target - known.low) < epsilon || Math.abs(target - known.high) < epsilon)
		return null;
	if (target < known.low || target > known.high) return own.domain;
	const point: MathNode =
		shift === null
			? number(known.atZero)
			: func(known.inverse, [negated ? opposite(shift) : shift]);
	// `computeDomain` ne résout pas `tan(1)` (il cherche où tan existe) : la lettre
	// seule (`arctan(x)`) se dit directement, sinon il faut une résolution sans reste
	if (inner.type === 'variable' && inner.name === letter) {
		return excludePoints(own.domain, [point]);
	}
	const zero = computeDomain(divide(number(1), subtract(inner, point), 'fraction'), letter);
	if ((zero.unresolved?.length ?? 0) > 0 || !INCLUSION_READABLE.has(zero.domain.kind)) return null;
	return intersect(own.domain, zero.domain);
}

/**
 * `assumed` évite-t-il tous les points d'une famille `a + kp` (`cos(x) ≠ 0`,
 * π/2 + kπ) ? Seulement sur des intervalles bornés, où ils se comptent
 * (§ 5, L4) : `cos(x)/cos(x) avec 0 < x < 1` → 1. Un point sur une borne
 * (à 1e-9 près pour une borne écrite avec π, exactement sinon) ne compte que si elle est ouverte : `]−π/2 ; π/2[` oui,
 * `]−π/2 ; π/2]` non.
 */
export function avoidsPeriodicPoints(condition: DomainCondition, assumed: Domain): boolean {
	if (condition.relation !== 'nonzero') return false;
	// `cos u` ou `sin u` seul : `computeDomain(1/(sin x cos x))` rend kπ au lieu
	// de kπ/2, une famille fausse qu'on ne doit pas croire (revue Opus)
	const { expression } = condition;
	if (expression.type !== 'function' || !['cos', 'sin'].includes(expression.name)) return false;
	const letters = getVariables(expression);
	if (letters.size !== 1 || assumed.kind !== 'interval_set') return false;
	const [letter] = letters;
	const computed = computeDomain(divide(number(1), condition.expression, 'fraction'), letter);
	if ((computed.unresolved?.length ?? 0) > 0) return false;
	if (computed.domain.kind !== 'periodic_exclusion') return false;
	const base = decimalValue(computed.domain.basePoint);
	const period = decimalValue(computed.domain.period);
	if (base === null || period === null || period <= 0) return false;
	const epsilon = 1e-9;
	// Seule une borne écrite avec π peut tomber sur un point a + kπ : la tolérance
	// ne vaut que pour elle ; une borne décimale (`1.5707963267`) se compare
	// exactement, sinon π/2, à l'intérieur, passerait pour la borne (revue Opus)
	const hasPi = (value: MathNode) =>
		findNodes(value, (n) => n.type === 'constant' && n.constant === 'pi').length > 0;
	const onBound = (point: number, value: number, symbolic: boolean) =>
		symbolic ? Math.abs(point - value) < epsilon : point === value;
	return assumed.intervals.every((interval) => {
		const low = decimalValue(interval.lower.value);
		const high = decimalValue(interval.upper.value);
		if (low === null || high === null) return false;
		const [lowPi, highPi] = [hasPi(interval.lower.value), hasPi(interval.upper.value)];
		// Un point sur une borne ouverte n'est pas dans l'intervalle (`]0 ; π[`)
		for (let k = Math.ceil((low - epsilon - base) / period) - 1; ; k++) {
			const point = base + k * period;
			if (onBound(point, low, lowPi)) {
				if (interval.lower.type === 'open') continue;
				return false;
			}
			if (onBound(point, high, highPi)) return interval.upper.type === 'open';
			if (point < low) continue;
			return point > high;
		}
	});
}

/** `a ⊆ b`, points exclus compris. */
export function isIncluded(a: Domain, b: Domain): boolean {
	return isEmpty(difference(expandExcludedPoints(a), expandExcludedPoints(b)));
}

/** L'ensemble où toutes les conditions valent, pour `letter` ; `null` si l'une ne se lit pas. */
function setOf(conditions: readonly DomainCondition[], letter: string): Domain | null {
	let domain: Domain = { kind: 'universal' };
	for (const condition of conditions) {
		const where = conditionSet(condition);
		if (where === null || where.letter !== letter) return null;
		domain = intersect(domain, where.domain);
	}
	return domain;
}

/**
 * Les conditions sans celles que les autres impliquent : `x² > 0` et `x > 0`
 * → `x > 0`. `context` (les conditions communes aux deux écritures) compte
 * parmi les autres sans être rendu. Une condition qu'on ne lit pas reste.
 */
function pruned(
	conditions: readonly TidyCondition[],
	context: readonly DomainCondition[],
	letter: string
): TidyCondition[] {
	const kept = [...conditions];
	for (const condition of conditions) {
		const where = conditionSet(condition);
		if (where === null) continue;
		const others = [...kept.filter((c) => c !== condition), ...context];
		const elsewhere = setOf(others, letter);
		if (elsewhere !== null && isIncluded(elsewhere, where.domain)) {
			kept.splice(kept.indexOf(condition), 1);
		}
	}
	return kept;
}

/**
 * Ce que la réécriture `before → after` fait du domaine (§ 4.2). Une lettre,
 * domaines lisibles : les ENSEMBLES se comparent (`ln(x³) → 3 ln x` garde
 * ]0 ; +∞[, `[]`). Sinon, ou s'ils diffèrent : les conditions perdues puis
 * gagnées (`ln(x²) → 2 ln x` : `x² > 0`, `x > 0`), chacune retirée si les
 * autres l'impliquent (« x > 0 ») ; élagage impossible (plusieurs lettres) :
 * tout est dit, jamais une condition fausse. `null` : une condition ne
 * s'écrit pas (`tan`).
 */
export function domainChanges(
	before: MathNode,
	after: MathNode,
	typeCtx?: TypeContext
): DomainChangeDetail | null {
	const was = mergeConditions(domainConditions(before, typeCtx, NOTHING_ACQUIRED));
	const now = mergeConditions(domainConditions(after, typeCtx, NOTHING_ACQUIRED));
	const lost = notSaidBy(was, now);
	const gained = notSaidBy(now, was);
	if (lost.length === 0 && gained.length === 0) return { conditions: [], narrows: false };
	const letters = new Set([...getVariables(before), ...getVariables(after)]);
	const letter = letters.size === 1 ? [...letters][0] : null;
	const setBefore = letter === null ? null : setOf(was, letter);
	const setAfter = letter === null ? null : setOf(now, letter);
	const readable = setBefore !== null && setAfter !== null;
	const narrows = readable ? !isIncluded(setBefore, setAfter) : gained.length > 0;
	// Le domaine rétrécit sans qu'on lise les ensembles (plusieurs lettres) : on ne
	// voit pas s'il reste un point — ne rien dire. Lus et sans point commun
	// (revue : `ln(x²) + ln(−x)`, défini pour x < 0, donnait « pour x > 0 ») : idem
	if (narrows && (!readable || isEmpty(intersect(setBefore, setAfter)))) return null;
	// Jamais définie (2ᵉ revue : `ln(x)/ln(x) + √(−x)`) : aucune condition n'a de sens
	if (setBefore !== null && isEmpty(setBefore)) return null;
	if (!narrows && readable && isIncluded(setAfter, setBefore)) {
		return { conditions: [], narrows };
	}
	const written = writable([...lost, ...gained]);
	if (written === null) return null;
	const common = was.filter((c) => !lost.includes(c));
	return { conditions: letter === null ? written : pruned(written, common, letter), narrows };
}

/**
 * `u ≠ 0` dit en points exclus, quand `u` ne s'annule qu'en des nombres
 * (`ln(x) ≠ 0` → `x ≠ 1`, revue du § 4.2) : l'ensemble de `1/u` est celui de
 * `u` privé de ces points. Le domaine de `u` (x > 0) n'est redit que si
 * `context` (la réponse, les autres conditions) ne le garantit pas :
 * `(ln x)²/ln x → ln x` dit `x ≠ 1`, `ln(x)/ln(x) → 1` dit `x > 0 et x ≠ 1`.
 */
function asPoints(
	condition: TidyCondition,
	context: readonly DomainCondition[],
	typeCtx?: TypeContext
): TidyCondition[] {
	if (condition.relation !== 'nonzero' || affineRoot(condition.expression) !== null) {
		return [condition];
	}
	const where = conditionSet(condition);
	if (where === null || where.domain.kind !== 'interval_set') return [condition];
	// Lus en rationnels : `x² − 1 ≠ 0` exclut `−1` écrit en opposé, `4x² − 1`, `±1/2` ;
	// sinon exacts (`±√2`, `(−1 ± √5)/2`, `tan(1)`, § 5, L2) — jamais un décimal
	// approché (`x³ − 2` → 1.2599…)
	const excludedPoints = where.domain.excludedPoints.map((p) => p.value);
	if (excludedPoints.length === 0 || !excludedPoints.every(isExactPoint)) return [condition];
	const points = excludedPoints.map((value) => {
		const rational = extractExactRational(value);
		return rational === null ? value : rationalToNode(rational);
	});
	const own = computeDomain(condition.expression, where.letter);
	if ((own.unresolved?.length ?? 0) > 0 || !INCLUSION_READABLE.has(own.domain.kind)) {
		return [condition];
	}
	const withoutPoints: Domain = { ...where.domain, excludedPoints: [] };
	if (!isIncluded(withoutPoints, own.domain) || !isIncluded(own.domain, withoutPoints)) {
		return [condition];
	}
	const excluded = points.map((p): TidyCondition => ({
		expression: subtract(variable(where.letter), p),
		relation: 'nonzero'
	}));
	const ownConditions = writable(
		mergeConditions(domainConditions(condition.expression, typeCtx, NOTHING_ACQUIRED))
	);
	if (ownConditions === null) return [condition];
	const assumed = setOf(context, where.letter);
	const implied = assumed !== null && isIncluded(assumed, own.domain);
	return implied ? excluded : [...ownConditions, ...excluded];
}

/** Un point exclu écrit exactement : sans lettre, ses nombres entiers (pas `1.2599…`). */
function isExactPoint(value: MathNode): boolean {
	return (
		getVariables(value).size === 0 &&
		findNodes(value, isNumber).every((n) => /^-?\d+$/.test(n.value))
	);
}

/**
 * `tan(u) ≠ 0` sous-entend que `tan(u)` existe, comme `ln(x) ≠ 0` que `ln x`
 * existe : `cos(u) ≠ 0` n'est pas redit (§ 5, Q11).
 */
function withoutImpliedCosine(conditions: readonly TidyCondition[]): TidyCondition[] {
	const tangents = new Set(
		conditions.flatMap((c) =>
			c.relation === 'nonzero' &&
			c.expression.type === 'function' &&
			c.expression.name === 'tan' &&
			c.expression.args.length === 1
				? [hashMathNode(canonical(c.expression.args[0]))]
				: []
		)
	);
	if (tangents.size === 0) return [...conditions];
	return conditions.filter(
		(c) =>
			!(
				c.relation === 'nonzero' &&
				c.expression.type === 'function' &&
				c.expression.name === 'cos' &&
				c.expression.args.length === 1 &&
				tangents.has(hashMathNode(canonical(c.expression.args[0])))
			)
	);
}

/**
 * Les conditions écrites au plus simple pour la réponse `answer` : `u ≠ 0`
 * en points exclus quand on sait (`asPoints`), sans doublon.
 */
export function plainConditions(
	conditions: readonly TidyCondition[],
	answer: MathNode,
	typeCtx?: TypeContext
): TidyCondition[] {
	const kept = withoutImpliedCosine(conditions);
	if (kept.length < conditions.length) return mergeConditions(kept);
	const domainOfAnswer = mergeConditions(domainConditions(answer, typeCtx, NOTHING_ACQUIRED));
	const written = mergeConditions(
		conditions.flatMap((condition) =>
			asPoints(
				condition,
				[...domainOfAnswer, ...conditions.filter((c) => c !== condition)],
				typeCtx
			)
		)
	);
	// Deux `ln(…) ≠ 0` se garantissaient l'un l'autre x > 0 (revue : `ln(x)/ln(x) +
	// ln(x/2)/ln(x/2)` disait « x ≠ 1 et x ≠ 2 ») : l'ensemble écrit, avec la
	// réponse, doit tenir dans celui des conditions d'origine — sinon elles restent
	const letters = new Set(conditions.flatMap((c) => [...getVariables(c.expression)]));
	if (letters.size !== 1) return mergeConditions([...conditions]);
	const [letter] = letters;
	const said = setOf([...written, ...domainOfAnswer], letter);
	const meant = setOf(conditions, letter);
	if (said === null || meant === null || !isIncluded(said, meant)) {
		return mergeConditions([...conditions]);
	}
	return written;
}

/**
 * Ce que la réécriture `before → after` change du domaine : `[]` s'il ne
 * change pas, sinon les conditions où elle vaut (`domainChanges`) ; `null` si
 * une condition ne s'écrit pas.
 */
export function domainChange(
	before: MathNode,
	after: MathNode,
	typeCtx?: TypeContext
): TidyCondition[] | null {
	return domainChanges(before, after, typeCtx)?.conditions ?? null;
}

/** `a x + b`, une seule lettre, `a ≠ 0` : la lettre et la racine −b/a. */
function affineRoot(expression: MathNode): { letter: string; root: Rational; a: Rational } | null {
	const letters = [...getVariables(expression)];
	if (letters.length !== 1) return null;
	const poly = toPolynomial(expression, letters[0]);
	if (poly === null || poly.length !== 2) return null;
	const [b, a] = poly;
	return { letter: letters[0], root: divRational(negRational(b), a), a };
}

/** Le texte d'une condition se lit comme un titre d'étape : le vrai signe moins, `x ≠ −1`. */
function readable(text: string): string {
	return text.replace(/-/g, '−').replace(/\\pi/g, 'π');
}

/** `x − c`, c sans lettre (`x − √2`, écrit par `asPoints`) : la lettre et c. */
function pointOf(expression: MathNode): { letter: string; point: MathNode } | null {
	if (expression.type !== 'subtraction' || expression.left.type !== 'variable') return null;
	if (getVariables(expression.right).size > 0) return null;
	return { letter: expression.left.name, point: expression.right };
}

/** Un nombre exact dans une condition : `√2`, `(−1−√5)/2` en texte, `\dfrac` en LaTeX. */
function writtenNumber(value: MathNode): ConditionText {
	const fraction = mapNode(value, (n) =>
		n.type === 'division' ? { ...n, displayStyle: 'fraction' as const } : n
	);
	return { text: readable(formatEndpointValue(value)), latex: toLatex(fraction) };
}

/** `x < a`, `x ≥ b`, `a < x ≤ b` : un intervalle aux bornes exactes ; `null` sinon. */
function describeInterval(interval: Interval, letter: string): ConditionText | null {
	const finite = (value: MathNode) => value.type !== 'infinity';
	const { lower, upper } = interval;
	for (const end of [lower, upper]) {
		if (finite(end.value) && !isExactPoint(end.value)) return null;
	}
	const below = (open: boolean) =>
		open ? { text: '<', latex: '<' } : { text: '≤', latex: '\\leq' };
	const above = (open: boolean) =>
		open ? { text: '>', latex: '>' } : { text: '≥', latex: '\\geq' };
	if (finite(lower.value) && finite(upper.value)) {
		const [a, b] = [writtenNumber(lower.value), writtenNumber(upper.value)];
		// [0 ; 0] : « x = 0 », pas « 0 ≤ x ≤ 0 »
		if (a.text === b.text)
			return { text: `${letter} = ${a.text}`, latex: `${letter} = ${a.latex}` };
		const [l, u] = [below(lower.type === 'open'), below(upper.type === 'open')];
		return {
			text: `${a.text} ${l.text} ${letter} ${u.text} ${b.text}`,
			latex: `${a.latex} ${l.latex} ${letter} ${u.latex} ${b.latex}`
		};
	}
	if (finite(upper.value)) {
		const [b, u] = [writtenNumber(upper.value), below(upper.type === 'open')];
		return { text: `${letter} ${u.text} ${b.text}`, latex: `${letter} ${u.latex} ${b.latex}` };
	}
	if (finite(lower.value)) {
		const [a, l] = [writtenNumber(lower.value), above(lower.type === 'open')];
		return { text: `${letter} ${l.text} ${a.text}`, latex: `${letter} ${l.latex} ${a.latex}` };
	}
	return null;
}

/**
 * `x² − 2 > 0` dit sur la lettre, d'après son ensemble (§ 5, L2) :
 * « x < −√2 ou x > √2 », « −1 < x < 1 ». `null` : des points exclus, une
 * borne approchée, une autre forme.
 */
function describeAsIntervals(condition: TidyCondition): ConditionText | null {
	if (condition.relation === 'nonzero') return null;
	const where = conditionSet(condition);
	if (where === null || where.domain.kind !== 'interval_set') return null;
	const { intervals, excludedPoints } = where.domain;
	if (excludedPoints.length > 0 || intervals.length === 0 || intervals.length > 2) return null;
	const pieces = intervals.map((interval) => describeInterval(interval, where.letter));
	if (pieces.some((p) => p === null)) return null;
	const written = pieces as ConditionText[];
	return {
		text: written.map((p) => p.text).join(' ou '),
		latex: written.map((p) => p.latex).join('\\text{ ou }')
	};
}

/** Une condition écrite : sur la lettre si l'expression est affine, entière sinon. */
function describe({ expression, relation }: TidyCondition): ConditionText {
	const point = relation === 'nonzero' ? pointOf(expression) : null;
	if (point !== null && affineRoot(expression) === null) {
		const value = writtenNumber(point.point);
		return {
			text: `${point.letter} ≠ ${value.text}`,
			latex: `${point.letter} \\neq ${value.latex}`
		};
	}
	const affine = affineRoot(expression);
	if (affine !== null) {
		// Un coefficient négatif renverse l'inégalité : `1 − x > 0` → `x < 1`
		const flipped = relation !== 'nonzero' && isNegative(affine.a);
		const text = flipped ? (relation === 'positive' ? '<' : '≤') : SYMBOLS[relation].text;
		const latex = flipped ? (relation === 'positive' ? '<' : '\\leq') : SYMBOLS[relation].latex;
		const root = rationalToNode(affine.root);
		return {
			text: readable(`${affine.letter} ${text} ${toCustom(root)}`),
			latex: `${affine.letter} ${latex} ${toLatex(root)}`
		};
	}
	const written = canonical(expression);
	return {
		text: readable(`${toCustom(written)} ${SYMBOLS[relation].text} 0`),
		latex: `${toLatex(written)} ${SYMBOLS[relation].latex} 0`
	};
}

/** `x ≥ a` (ou `>`) d'une lettre : la lettre, la borne, ouverte ou non ; `null` sinon. */
function boundOf(
	condition: TidyCondition
): { letter: string; side: 'lower' | 'upper'; open: boolean; root: Rational } | null {
	if (condition.relation === 'nonzero') return null;
	const affine = affineRoot(condition.expression);
	if (affine === null) return null;
	return {
		letter: affine.letter,
		side: isNegative(affine.a) ? 'upper' : 'lower',
		open: condition.relation === 'positive',
		root: affine.root
	};
}

/**
 * Les conditions écrites, telles que `tidyWithConditions` les rend (déjà
 * réunies). Une seule, non affine, se dit sur la lettre quand on sait
 * (« x < −√2 ou x > √2 ») ; `x ≥ −1` et `x ≤ 1` se disent « −1 ≤ x ≤ 1 » ;
 * les inégalités avant les points exclus (`−1 ≤ x ≤ 1 et x ≠ 0`).
 */
export function describeConditions(conditions: readonly TidyCondition[]): ConditionText[] {
	if (conditions.length === 1) {
		const intervals = describeAsIntervals(conditions[0]);
		if (intervals !== null) return [intervals];
	}
	const ordered = [
		...conditions.filter((c) => c.relation !== 'nonzero'),
		...conditions.filter((c) => c.relation === 'nonzero')
	];
	const written: ConditionText[] = [];
	const used = new Set<TidyCondition>();
	for (const condition of ordered) {
		if (used.has(condition)) continue;
		const bound = boundOf(condition);
		const partner =
			bound === null
				? undefined
				: ordered.find((other) => {
						const b = boundOf(other);
						return (
							!used.has(other) && b !== null && b.letter === bound.letter && b.side !== bound.side
						);
					});
		if (bound === null || partner === undefined) {
			written.push(describe(condition));
			used.add(condition);
			continue;
		}
		const other = boundOf(partner)!;
		const [low, high] = bound.side === 'lower' ? [bound, other] : [other, bound];
		used.add(condition).add(partner);
		const a = rationalToNode(low.root);
		const b = rationalToNode(high.root);
		if (toCustom(a) === toCustom(b)) {
			written.push({
				text: readable(`${bound.letter} = ${toCustom(a)}`),
				latex: `${bound.letter} = ${toLatex(a)}`
			});
			continue;
		}
		const l = low.open ? { text: '<', latex: '<' } : { text: '≤', latex: '\\leq' };
		const u = high.open ? { text: '<', latex: '<' } : { text: '≤', latex: '\\leq' };
		written.push({
			text: readable(`${toCustom(a)} ${l.text} ${bound.letter} ${u.text} ${toCustom(b)}`),
			latex: `${toLatex(a)} ${l.latex} ${bound.letter} ${u.latex} ${toLatex(b)}`
		});
	}
	return written;
}
