/**
 * Type d'erreur deviné (chantier `type-erreur`)
 * =============================================
 *
 * Compare une réponse fausse à la réponse attendue du MÊME tirage et reconnaît
 * une relation connue entre les deux : opposé, puissance de 10, inverse,
 * double / moitié, carré oublié / en trop. Le type ne dépend pas des nombres
 * tirés : il se compte d'un élève à l'autre (panneaux d'erreurs du prof) et se
 * dit à l'élève à la correction. La note ne change jamais.
 *
 * Règles (décisions de David, 2026-11-15) :
 * - réponse = écriture finale de nombre (`-3`, `0,25`, `\frac{1}{4}`) ;
 *   attendu = constante numérique, hors pourcentage et unité (√2 se lit, mais
 *   une réponse décimale finie n'égale jamais exactement π : rien ne sort) ;
 * - attendu 0, 1 ou −1 → rien (trop de relations se confondent) ;
 * - deux types vrais à la fois (attendu 4, réponse 2 : moitié et carré oublié)
 *   → rien : on ne devine jamais entre deux.
 *
 * @module mathAST/error-kind
 */

import type { MathNode } from './types';
import { parseLatexSafe } from './parser';
import { compile } from './eval/compile';
import {
	isFinalNumberWriting,
	isPercentWriting,
	normalizeDecimalComma,
	removeSpaces
} from './cosmetic-transforms';

// =============================================================================
// Types
// =============================================================================

export type ErrorKind =
	'sign' | 'power-of-ten' | 'inverse' | 'double' | 'half' | 'square-missing' | 'square-extra';

export type ErrorGuess =
	/** Réponse = attendu × 10^exponent (exponent ≠ 0) */
	{ kind: 'power-of-ten'; exponent: number } | { kind: Exclude<ErrorKind, 'power-of-ten'> };

// =============================================================================
// Constantes
// =============================================================================

/** Écart relatif toléré : les nombres d'école sont exacts à cette échelle */
const RELATIVE_TOLERANCE = 1e-12;

/** Puissances de 10 reconnues : × ou ÷ 10, 100, 1 000 */
const MAX_EXPONENT = 3;

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Le type d'erreur d'une réponse fausse, ou `null` s'il n'est pas reconnu
 * sans ambiguïté (réponse juste comprise).
 *
 * @example
 * guessErrorKind('-12', '12')   // { kind: 'sign' }
 * guessErrorKind('3,5', '35')   // { kind: 'power-of-ten', exponent: -1 }
 * guessErrorKind('2', '4')     // null (moitié ET carré oublié)
 */
export function guessErrorKind(answerLatex: string, expectedLatex: string): ErrorGuess | null {
	const answer = parseNode(answerLatex);
	const expected = parseNode(expectedLatex);
	if (!answer || !expected) return null;
	if (!isFinalNumberWriting(answer) || isPercentWriting(expected)) return null;

	const a = numericValue(answer);
	const e = numericValue(expected);
	if (a === null || e === null) return null;
	if (close(e, 0) || close(Math.abs(e), 1)) return null;
	if (close(a, e)) return null;

	const guesses: ErrorGuess[] = [];
	if (close(a, -e)) guesses.push({ kind: 'sign' });
	for (let exponent = -MAX_EXPONENT; exponent <= MAX_EXPONENT; exponent++) {
		if (exponent !== 0 && close(a, e * 10 ** exponent)) {
			guesses.push({ kind: 'power-of-ten', exponent });
		}
	}
	if (close(a, 1 / e)) guesses.push({ kind: 'inverse' });
	if (close(a, 2 * e)) guesses.push({ kind: 'double' });
	if (close(a, e / 2)) guesses.push({ kind: 'half' });
	if (close(a * a, e)) guesses.push({ kind: 'square-missing' });
	if (close(a, e * e)) guesses.push({ kind: 'square-extra' });

	return guesses.length === 1 ? guesses[0] : null;
}

/** Nœud d'une écriture LaTeX, `null` si elle ne se lit pas */
function parseNode(latex: string): MathNode | null {
	if (!latex.trim()) return null;
	const parsed = parseLatexSafe(normalizeDecimalComma(removeSpaces(latex)));
	if (!parsed.ast || parsed.errors.length > 0) return null;
	return parsed.ast;
}

/** Valeur d'une constante numérique, `null` si littérale ou infinie */
function numericValue(node: MathNode): number | null {
	try {
		const value = compile(node)({});
		return Number.isFinite(value) ? value : null;
	} catch {
		return null;
	}
}

/** Égalité à l'écart relatif près */
function close(x: number, y: number): boolean {
	const scale = Math.max(Math.abs(x), Math.abs(y), 1);
	return Math.abs(x - y) <= RELATIVE_TOLERANCE * scale;
}
