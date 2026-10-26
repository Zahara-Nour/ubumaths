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
import { rationalToNode } from '../common/numeric';
import { divRational, isNegative, negRational } from '../normal/rational';
import { toPolynomial } from '../factor/polynomial';
import { getVariables } from '../eval/substitute';
import { toLatex } from '../latex-generator';
import { toCustom } from '../custom-generator';
import { stripUnnecessaryBrackets } from '../transforms';
import { tidyNode } from './collect';
import type { Domain } from '../domain/types';
import { computeDomain } from '../domain/compute';
import { difference, intersect, isEmpty } from '../domain/algebra';
import { expandExcludedPoints } from '../domain/validation/compare-domains';
import { divide, func, number, subtract, variable } from '../factory';

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
 * de `ln(x²) − ln(x²)` disait « pour x^2 > 0 ».
 */
function signOfPower<C extends DomainCondition>(condition: C): C[] {
	const { expression, relation } = condition;
	const node = expression.type === 'delimiter' ? expression.content : expression;
	if (node.type !== 'superscript' || node.superscript.type !== 'number') return [condition];
	const exponent = Number(node.superscript.value);
	if (!Number.isInteger(exponent) || exponent < 1) return [condition];
	if (exponent % 2 === 1) return essential({ ...condition, expression: node.base });
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
	const points = where.domain.excludedPoints.map((p) => p.value);
	if (points.length === 0 || points.some((p) => p.type !== 'number')) return [condition];
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

/**
 * Les conditions écrites au plus simple pour la réponse `answer` : `u ≠ 0`
 * en points exclus quand on sait (`asPoints`), sans doublon.
 */
export function plainConditions(
	conditions: readonly TidyCondition[],
	answer: MathNode,
	typeCtx?: TypeContext
): TidyCondition[] {
	const domainOfAnswer = mergeConditions(domainConditions(answer, typeCtx, NOTHING_ACQUIRED));
	const written = conditions.flatMap((condition) =>
		asPoints(condition, [...domainOfAnswer, ...conditions.filter((c) => c !== condition)], typeCtx)
	);
	return mergeConditions(written);
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
	return text.replace(/-/g, '−');
}

/** Une condition écrite : sur la lettre si l'expression est affine, entière sinon. */
function describe({ expression, relation }: TidyCondition): ConditionText {
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

/** Les conditions écrites, telles que `tidyWithConditions` les rend (déjà réunies). */
export function describeConditions(conditions: readonly TidyCondition[]): ConditionText[] {
	return conditions.map(describe);
}
