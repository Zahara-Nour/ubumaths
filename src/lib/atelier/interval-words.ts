/**
 * Atelier — les mots d'une définition qui suivent la formule : « sur » suivi
 * d'un ensemble, « pour » suivi d'une condition (`interval.ts`), et les
 * morceaux d'une fonction par morceaux (`piecewise.ts`).
 *
 * Texte seulement, sans lecture d'expression : `parse.ts` s'en sert pour lire
 * une définition par morceaux sans dépendre de `interval.ts`.
 *
 * @module atelier/interval-words
 */

import type { ReadingMode } from './parse';

// =============================================================================
// Constantes
// =============================================================================

/**
 * Une condition illisible : une autre lettre que celle de la fonction, ou une
 * borne illisible (`pour x > 2 > 1`). Une borne qui cite une valeur (`pour x > k`) est lue.
 */
export const UNREADABLE_CONDITION =
	"Je n'ai pas su lire la condition : elle compare la lettre de la fonction à des nombres ou à des valeurs, par exemple pour x > 2 ou pour x > k.";

/** « sur » écrit en mot par MathLive ou par la carte (`\text{ sur }`). */
export const SUR_AS_TEXT = /\\(?:text|textrm|mathrm|operatorname)\s*\{\s*sur\s*\}/g;

/**
 * Le mot « sur ». En LaTeX (champ MathLive), collé à ce qui précède (`x^2sur`),
 * jamais une commande (`\surd`). En texte, un mot entier. Dans les deux cas,
 * c'est ce qui SUIT qui décide (`SET_START`).
 */
const SUR_IN_LATEX = /(?<!\\)sur/g;
const SUR_IN_TEXT = /(?<![A-Za-z\\])sur(?![A-Za-z])/g;

/** « pour », mêmes règles que « sur » : c'est une comparaison derrière qui décide (`COMPARISON`). */
export const POUR_AS_TEXT = /\\(?:text|textrm|mathrm|operatorname)\s*\{\s*pour\s*\}/g;
const POUR_IN_LATEX = /(?<!\\)pour/g;
const POUR_IN_TEXT = /(?<![A-Za-z\\])pour(?![A-Za-z])/g;

/** Une comparaison, en texte ou en LaTeX : ce qui fait d'une écriture une condition. */
export const COMPARISON = /[<>≤≥≠⩽⩾]|\\(?:lt|gt|leq?|geq?|leqslant|geqslant|neq?)(?![A-Za-z])/;

/** « ou », « et » d'une condition, écrits en mot par MathLive (`\text{ ou }`). */
export const JOIN_AS_TEXT = /\\(?:text|textrm|mathrm)\s*\{\s*(ou|et)\s*\}/g;

/**
 * « ou », « et » collés par MathLive (`x<0oux>1`) : seulement derrière un
 * chiffre, une accolade ou une espace — `\theta` n'est pas coupé.
 */
export const JOIN_GLUED = /(?<=[0-9}\s])(ou|et)(?=\s*[A-Za-z0-9\\-])/g;

/** « ou », « et » d'une condition écrite en texte, entre deux comparaisons. */
export const JOIN_IN_TEXT = /\s+(ou|et)\s+/;

/**
 * Le début d'un ensemble que `parseStudentDomain` lit : un crochet (aussi en
 * LaTeX), une accolade échappée, ℝ (`ℝ`, `\R`, `\mathbb{R}`, `R` seul, `R*`,
 * `R+`). `\left` compte seulement devant un crochet ou une accolade :
 * `\left(` et `\left|` (smartFence) sont des parenthèses, pas un ensemble.
 * Sans lui, « sur » n'est pas le mot de l'intervalle : `a = 3 sur 4`,
 * `x^{sur}`, `\text{surélevé}` restent entiers, comme avant le lot 1.
 */
export const SET_START =
	/^(?:\\[,;:! ]|~|\s)*(?:\[|\]|\\left(?:\[|\]|\\lbrack|\\rbrack|\\\{|\\lbrace)|\\lbrack|\\rbrack|\\\{|\\lbrace|ℝ|\\R(?![A-Za-z])|\\mathbb|R(?![A-Za-z0-9]))/;

/**
 * `ℝ\{1}` tapé collé : le parseur y lirait l'accolade échappée de LaTeX. En
 * texte, c'est la différence `ℝ \ {1}` (revue de #1337). `\R\{1\}` (LaTeX,
 * accolade fermante échappée) n'est pas touché.
 */
const GLUED_SETMINUS = /(ℝ|(?<![A-Za-z\\])R|\\R)\\\{([^{}\\]*)\}/g;

/** Seulement des espaces après « sur » : l'élève est en train de l'écrire. */
const NOTHING_YET = /^(?:\\[,;:! ]|~|\s)*$/;

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Où commence le mot « sur » d'un intervalle, et ce qui le suit — ou `null`.
 *
 * @param typing - Accepter aussi « sur » en fin de saisie (rien encore derrière) :
 *   la carte coupe `smartFence` avant que le crochet ne soit tapé.
 */
export function intervalWord(
	typed: string,
	mode: ReadingMode,
	typing = false
): { readonly before: string; readonly after: string } | null {
	const text = typed.replace(SUR_AS_TEXT, ' sur ').replace(POUR_AS_TEXT, ' pour ');
	for (const match of text.matchAll(mode === 'latex' ? SUR_IN_LATEX : SUR_IN_TEXT)) {
		const after = text.slice(match.index + match[0].length);
		if (SET_START.test(after) || (typing && NOTHING_YET.test(after))) {
			return { before: text.slice(0, match.index), after };
		}
	}
	// « pour » : une condition derrière (`x > 2`), sinon le mot reste dans la saisie
	for (const match of text.matchAll(mode === 'latex' ? POUR_IN_LATEX : POUR_IN_TEXT)) {
		const after = text.slice(match.index + match[0].length);
		if (isConditionWritten(after)) return { before: text.slice(0, match.index), after };
	}
	return null;
}

/** L'écriture rangée est une condition (`x > 2`, écrite après « pour »), pas un ensemble. */
export function isConditionWritten(written: string): boolean {
	return !SET_START.test(written) && COMPARISON.test(written);
}

/** Le mot qui précède l'écriture rangée, dans le champ de la carte. */
export function intervalKeyword(written: string): 'sur' | 'pour' {
	return isConditionWritten(written) ? 'pour' : 'sur';
}

/** L'écriture lue par `parseStudentDomain` : `ℝ\{1}` collé devient une différence. */
export function domainText(written: string): string {
	if (isConditionWritten(written)) {
		return written.replace(JOIN_AS_TEXT, ' $1 ').replace(JOIN_GLUED, ' $1 ');
	}
	return written.replace(GLUED_SETMINUS, '$1 \\ {$2}');
}
