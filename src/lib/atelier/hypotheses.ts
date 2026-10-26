/**
 * Atelier — préciser le domaine : `avec CONDITION`, `dans ENSEMBLE`
 * (chantier tidy-conditions, § 3, décisions de David du 2026-10-26)
 *
 * Sur une expression tapée et sur `.simplifier`, `.factoriser`, `.développer` :
 * `x/x avec x ≠ 0` → `1` ; `.simplifier ln(x) − ln(x) dans ]0;+∞[ ∩ ]-∞;5]`
 * → `0`. La simplification a lieu si l'hypothèse GARANTIT chaque condition
 * du bouton de la ligne (« Simplifier pour x ≠ 0 ») ; sinon la ligne garde
 * l'écriture et dit ce qui n'est pas garanti.
 *
 * `avec` lit les conditions de `parseStudentDomain` (`x > 0`,
 * `x ≠ 0 et x ≠ 1`, `x < 0 ou x > 2`, `0 < x ≤ 5`), une lettre par condition
 * (`x > 0 et y ≠ 0`) ; `dans`, un ensemble (intervalles, `ℝ \ {0}`, `∪`,
 * `∩`), pour une seule lettre.
 *
 * Limite : une hypothèse ne lève que les conditions du bouton — une
 * réécriture qui RÉTRÉCIT le domaine (`ln(x²) → 2 ln x`, refusée par
 * `domainChange`) n'a pas lieu même `avec x > 0`.
 *
 * @module atelier/hypotheses
 */

import type { MathNode } from '$lib/mathAST/types';
import type { Domain } from '$lib/mathAST/domain/types';
import { describeConditions, type TidyCondition } from '$lib/mathAST/tidy';
import { parseStudentDomain } from '$lib/mathAST/domain/validation/parse-student-domain';
import { computeDomain } from '$lib/mathAST/domain/compute';
import { difference, intersect, isEmpty } from '$lib/mathAST/domain/algebra';
import { expandExcludedPoints } from '$lib/mathAST/domain/validation/compare-domains';
import { formatInterval } from '$lib/mathAST/domain/format';
import { divide, func, number } from '$lib/mathAST/factory';
import { getVariables } from '$lib/mathAST/eval/substitute';

// =============================================================================
// Types
// =============================================================================

/** Une ligne coupée à son mot-clé : l'expression, puis l'hypothèse telle qu'écrite. */
export interface HypothesisSplit {
	readonly expression: string;
	readonly keyword: 'avec' | 'dans';
	readonly written: string;
}

/** L'ensemble que l'hypothèse donne à chaque lettre. */
export type Hypotheses = ReadonlyMap<string, Domain>;

export type HypothesesReading =
	| { readonly ok: true; readonly hypotheses: Hypotheses }
	| { readonly ok: false; readonly message: string };

// =============================================================================
// Constantes
// =============================================================================

/** Le premier `avec` ou `dans`, mot entier, après l'expression. */
const KEYWORD = /\s(avec|dans)\s/i;

/** Une lettre de condition : `x`, `y`, pas les mots `et` / `ou`. */
const LETTER = /(?<![A-Za-z])[A-Za-z](?![A-Za-z])/g;

const AVEC_EXAMPLE = 'avec x > 0, avec x ≠ 0 et x ≠ 1, avec 0 < x ≤ 5';
const DANS_EXAMPLE = 'dans ]0;+∞[, dans ℝ \\ {0}, dans ]0;+∞[ ∩ ]-∞;5]';

// =============================================================================
// Fonctions
// =============================================================================

/** `x/x avec x ≠ 0` → `x/x`, `avec`, `x ≠ 0` ; `null` sans mot-clé. */
export function splitHypotheses(text: string): HypothesisSplit | null {
	const match = KEYWORD.exec(text);
	if (match === null) return null;
	const expression = text.slice(0, match.index).trim();
	const written = text.slice(match.index + match[0].length).trim();
	if (expression === '') return null;
	return { expression, keyword: match[1].toLowerCase() as 'avec' | 'dans', written };
}

/**
 * Lire l'hypothèse. `letters` : les lettres de l'expression, pour `dans`, qui
 * ne vaut que pour une seule.
 */
export function readHypotheses(
	split: HypothesisSplit,
	letters: ReadonlySet<string>
): HypothesesReading {
	const { keyword, written } = split;
	if (written === '') return { ok: false, message: `Il manque ce qui suit « ${keyword} ».` };
	if (keyword === 'dans') {
		if (letters.size > 1) {
			return {
				ok: false,
				message: `« dans » vaut pour une seule lettre : avec plusieurs, écris par exemple « avec x > 0 et y ≠ 0 ».`
			};
		}
		const letter = letters.size === 1 ? [...letters][0] : 'x';
		const read = parseStudentDomain(written, letter, { intersections: true });
		if (!read.success) {
			return {
				ok: false,
				message: `« ${written} » ne se lit pas comme un ensemble : écris par exemple ${DANS_EXAMPLE}.`
			};
		}
		return { ok: true, hypotheses: new Map([[letter, read.domain]]) };
	}

	// `et` et `ou` mêlés : la priorité se dit mieux avec des intervalles
	if (/\bet\b/i.test(written) && /\bou\b/i.test(written)) {
		return {
			ok: false,
			message: `« et » et « ou » ensemble ne se lisent pas : écris l'ensemble avec des intervalles, ∪ et ∩ (${DANS_EXAMPLE}).`
		};
	}
	const unreadable = {
		ok: false as const,
		message: `« ${written} » ne se lit pas : écris par exemple ${AVEC_EXAMPLE}.`
	};
	// Une condition par morceau ; les morceaux d'une même lettre se lisent ensemble
	const parts = /\bou\b/i.test(written) ? [written] : written.split(/\bet\b/i).map((p) => p.trim());
	const byLetter = new Map<string, string[]>();
	for (const part of parts) {
		const named = new Set(part.match(LETTER) ?? []);
		if (named.size !== 1) return unreadable;
		const [letter] = named;
		byLetter.set(letter, [...(byLetter.get(letter) ?? []), part]);
	}
	const hypotheses = new Map<string, Domain>();
	for (const [letter, texts] of byLetter) {
		const read = parseStudentDomain(texts.join(' et '), letter, { intersections: true });
		if (!read.success) return unreadable;
		hypotheses.set(letter, read.domain);
	}
	return { ok: true, hypotheses };
}

/**
 * L'ensemble où une condition vaut, pour sa lettre : celui où `1/u`, `ln(u)`
 * ou `√u` est défini. `null` : plusieurs lettres, ou un domaine non établi.
 */
function conditionDomain(condition: TidyCondition): { letter: string; domain: Domain } | null {
	const letters = getVariables(condition.expression);
	if (letters.size !== 1) return null;
	const [letter] = letters;
	const { expression, relation } = condition;
	const witness: MathNode =
		relation === 'nonzero'
			? divide(number(1), expression, 'fraction')
			: func(relation === 'positive' ? 'ln' : 'sqrt', [expression]);
	const computed = computeDomain(witness, letter);
	if ((computed.unresolved?.length ?? 0) > 0) return null;
	return { letter, domain: computed.domain };
}

/** L'hypothèse garantit-elle la condition ? Prudent : `false` si on ne sait pas. */
export function guarantees(hypotheses: Hypotheses, condition: TidyCondition): boolean {
	const where = conditionDomain(condition);
	if (where === null) return false;
	const assumed = hypotheses.get(where.letter);
	if (assumed === undefined) return false;
	return isEmpty(difference(expandExcludedPoints(assumed), expandExcludedPoints(where.domain)));
}

/** Les conditions écrites, reliées par « et » : `x ≠ 0 et y ≠ 0`. */
export function conditionsText(conditions: readonly TidyCondition[]): string {
	return describeConditions(conditions)
		.map((c) => c.text)
		.join(' et ');
}

/**
 * La note du mode « garder l'écriture » (Q5) : on peut simplifier davantage,
 * et comment le dire — `avec` toujours, `dans` si une seule lettre.
 */
export function simplifyFurtherNote(conditions: readonly TidyCondition[]): string {
	const text = conditionsText(conditions);
	const set = conditionsSet(conditions);
	const dans = set === null ? '' : ` (ou « dans ${set} »)`;
	return `On peut simplifier davantage pour ${text} : ajoute « avec ${text} »${dans}.`;
}

/** L'ensemble où toutes les conditions valent, écrit ; `null` sur plusieurs lettres. */
function conditionsSet(conditions: readonly TidyCondition[]): string | null {
	let letter: string | null = null;
	let domain: Domain | null = null;
	for (const condition of conditions) {
		const where = conditionDomain(condition);
		if (where === null || (letter !== null && where.letter !== letter)) return null;
		letter = where.letter;
		domain = domain === null ? where.domain : intersect(domain, where.domain);
	}
	return domain === null ? null : formatInterval(domain);
}
