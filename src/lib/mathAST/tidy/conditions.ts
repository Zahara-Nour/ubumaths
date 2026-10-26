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

/** Une condition écrite, pour la ligne (LaTeX) et pour le texte. */
export interface ConditionText {
	readonly latex: string;
	readonly text: string;
}

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

/**
 * Ce que la réécriture `before → after` perd du domaine, si elle ne fait QUE
 * le perdre ; `null` si elle en gagne aussi (revue, 2026-10-26 : `ln(x²) →
 * 2 ln(x)` n'est vraie que pour x > 0, pas « pour x² > 0 ») ou si une
 * condition ne s'écrit pas. `[]` : le domaine ne change pas.
 */
export function domainChange(
	before: MathNode,
	after: MathNode,
	typeCtx?: TypeContext
): TidyCondition[] | null {
	const gained = domainLoss(after, before, typeCtx);
	if (gained === null || gained.length > 0) return null;
	return domainLoss(before, after, typeCtx);
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
