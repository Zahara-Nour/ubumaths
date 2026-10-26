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
import type { TidyCondition } from './types';
import { hashMathNode } from '../normal/hash';
import { rationalToNode } from '../common/numeric';
import { divRational, isNegative, negRational } from '../normal/rational';
import { toPolynomial } from '../factor/polynomial';
import { getVariables } from '../eval/substitute';
import { toLatex } from '../latex-generator';
import { toCustom } from '../custom-generator';

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

/**
 * La condition sur l'expression qui compte : `√u ≠ 0` et `uⁿ ≠ 0` disent
 * `u ≠ 0` (le domaine de `√u` dit déjà `u ≥ 0`).
 */
function essential(condition: TidyCondition): TidyCondition {
	const { expression, relation } = condition;
	if (relation !== 'nonzero') return condition;
	if (expression.type === 'delimiter')
		return essential({ expression: expression.content, relation });
	if (
		expression.type === 'function' &&
		expression.name === 'sqrt' &&
		expression.args.length === 1
	) {
		return essential({ expression: expression.args[0], relation });
	}
	if (expression.type === 'superscript')
		return essential({ expression: expression.base, relation });
	return condition;
}

/** Deux conditions sur la même expression : la plus forte, ou leur réunion. */
function strongest(
	a: TidyCondition['relation'],
	b: TidyCondition['relation']
): TidyCondition['relation'] {
	if (a === b) return a;
	return 'positive';
}

/** Les conditions sans doublon, la plus forte par expression, dans l'ordre de lecture. */
export function mergeConditions(conditions: readonly TidyCondition[]): TidyCondition[] {
	const merged = new Map<string, TidyCondition>();
	for (const condition of conditions.map(essential)) {
		const key = hashMathNode(condition.expression);
		const existing = merged.get(key);
		merged.set(
			key,
			existing === undefined
				? condition
				: {
						expression: existing.expression,
						relation: strongest(existing.relation, condition.relation)
					}
		);
	}
	return [...merged.values()];
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
			text: `${affine.letter} ${text} ${toCustom(root)}`,
			latex: `${affine.letter} ${latex} ${toLatex(root)}`
		};
	}
	return {
		text: `${toCustom(expression)} ${SYMBOLS[relation].text} 0`,
		latex: `${toLatex(expression)} ${SYMBOLS[relation].latex} 0`
	};
}

/** Les conditions écrites, telles que `tidyWithConditions` les rend (déjà réunies). */
export function describeConditions(conditions: readonly TidyCondition[]): ConditionText[] {
	return conditions.map(describe);
}
