/**
 * Réponse « vecteur » : un vecteur écrit dans UNE case
 * ====================================================
 *
 * Case marquée `answerKind: 'vecteur'` (géométrie repérée, produit scalaire).
 * Spécification validée par David le 2026-10-03 :
 *
 * - écritures lues : coordonnées `(a;b)` (aussi `\left(a;b\right)`, `(a\,;\,b)`),
 *   colonne `\begin{pmatrix}a\\b\end{pmatrix}` (le `\\ ` de MathLive compris),
 *   dimension 2 ou 3 ; préfixe `\vec{u}=` / `\overrightarrow{AB}=` toléré ;
 * - coordonnées CONSTANTES (fractions, racines, π, virgule décimale) comparées
 *   EXACTEMENT par mathAST (`normalize`), aucun flottant ;
 * - `vectorMode: 'exact'` (défaut) : mêmes coordonnées ; `'colineaire'` : tout
 *   vecteur colinéaire NON NUL est juste (déterminants 2×2 nuls), quel que soit
 *   le coefficient ; le vecteur nul est faux ;
 * - la valeur seule est jugée : une coordonnée non simplifiée (`\frac{2}{4}`)
 *   est juste ;
 * - illisible, virgule seule (`(2,3)`), lettres, matrice ligne, mauvaise
 *   dimension → `incorrect`, jamais d'exception ; rien d'écrit → `empty`.
 *
 * @module questions/vectors/vector-answer
 */

import type { ValidationStatus, VectorMode } from '$lib/questions/types';
import type { MathNode } from '$lib/mathAST/types';
import { parseLatexSafe } from '$lib/mathAST/parser';
import { normalize } from '$lib/mathAST/normal';
import { multiply, subtract } from '$lib/mathAST/factory';
import { mapNode } from '$lib/mathAST/transforms';
import { getVariables } from '$lib/mathAST/eval/substitute';
import { makeAbortChecker } from '$lib/mathAST/common/abort';
import { stripLatexSpacing } from '$lib/math';
import { isAnswerTooComplex } from '$lib/questions/answer-complexity';

// Types
export interface VectorVerdict {
	status: ValidationStatus;
	/** Message montré à l'élève (écriture illisible, dimension, vecteur nul) */
	feedback?: string;
}

/** Vecteur lu : ses coordonnées (texte brut et nœud) */
interface ReadVectorOk {
	ok: true;
	/** Coordonnées telles qu'écrites (espacements retirés) */
	texts: string[];
	nodes: MathNode[];
}

type ReadVector = ReadVectorOk | { ok: false; error: string; isVectorShaped: boolean };

// Constantes

/** Messages figés (français, tutoiement) */
export const VECTOR_FEEDBACK = {
	notVector:
		'Écris un vecteur : ses coordonnées (a ; b), séparées par un point-virgule, ou en colonne.',
	zero: 'Le vecteur nul ne convient pas : donne un vecteur non nul.',
	dimension: (count: number) => `Le vecteur attendu a ${count} coordonnées.`
} as const;

/** Dimensions admises (plan, espace) */
const MIN_DIMENSION = 2;
const MAX_DIMENSION = 3;

/** Plus grand exposant entier écrit dans une coordonnée (garde contre `(1+\sqrt2)^{999}`) */
const MAX_WRITTEN_EXPONENT = 20;

/** Budget de la réduction d'UNE comparaison (la garde Q58 a déjà filtré l'écriture) */
const NORMALIZE_BUDGET_MS = 200;

/** Commandes d'espacement (`\,` `\;` `\:` `\!` `\ `), jamais le `\\` d'une colonne */
const SPACING_REGEX = /(?<!\\)\\(?:[,;:!]|\s|q?quad(?![a-zA-Z]))|~/g;

/** `\left` / `\right` (pas `\rightarrow`) */
const LEFT_RIGHT_REGEX = /\\(?:left|right)(?![a-zA-Z])/g;

/** Préfixe toléré : `\vec{u}`, `\vec u`, `\overrightarrow{AB}`, suivi ou non de `=` */
const NAME_PREFIX_REGEX = /^\\(?:vec|overrightarrow)\s*(?:\{[^{}]*\}|[A-Za-z])\s*=?\s*/;

/** Colonne `\begin{pmatrix}…\end{pmatrix}` (ou `bmatrix`) */
const COLUMN_REGEX = /^\\begin\{([pb]matrix)\}([\s\S]*)\\end\{\1\}$/;

// Functions

/** Texte sans espacements LaTeX ni `\left` / `\right` (relu aussi par la case « matrice ») */
export function cleaned(text: string): string {
	return text
		.replace(SPACING_REGEX, '')
		.replace(LEFT_RIGHT_REGEX, '')
		.replace(/\\lparen(?![a-zA-Z])/g, '(')
		.replace(/\\rparen(?![a-zA-Z])/g, ')')
		.trim();
}

/**
 * Découpe au niveau 0 (hors accolades, parenthèses, crochets) sur `separator`.
 * `null` si les délimiteurs sont mal équilibrés.
 */
export function splitTopLevel(text: string, separator: ';' | '\\\\' | '&'): string[] | null {
	const parts: string[] = [];
	let depth = 0;
	let start = 0;
	let i = 0;
	while (i < text.length) {
		if (depth === 0 && text.startsWith(separator, i)) {
			parts.push(text.slice(start, i));
			i += separator.length;
			start = i;
			continue;
		}
		const char = text[i];
		if (char === '\\') {
			// Commande : `\frac`, ou caractère échappé (`\{`, `\\`) sans effet sur la profondeur
			const command = /^\\(?:[a-zA-Z]+|.)/.exec(text.slice(i));
			i += command ? command[0].length : 1;
			continue;
		}
		if (char === '{' || char === '(' || char === '[') depth++;
		else if (char === '}' || char === ')' || char === ']') depth--;
		if (depth < 0) return null;
		i++;
	}
	if (depth !== 0) return null;
	parts.push(text.slice(start));
	return parts;
}

/** Contenu d'une parenthèse englobant TOUT le texte (`(2;3)`), `null` sinon */
function parenthesizedContent(text: string): string | null {
	if (!text.startsWith('(') || !text.endsWith(')')) return null;
	const inner = text.slice(1, -1);
	// `(2;3)(4;5)` : la parenthèse ouvrante se referme avant la fin
	return splitTopLevel(inner, ';') ? inner : null;
}

/** Coordonnées écrites : texte de chaque coordonnée, ou `null` si ce n'est pas un vecteur */
export function coordinateTexts(text: string): string[] | null {
	const body = cleaned(text).replace(NAME_PREFIX_REGEX, '');
	const column = COLUMN_REGEX.exec(body);
	if (column) {
		const rows = splitTopLevel(column[2], '\\\\');
		if (!rows) return null;
		// Matrice ligne ou rectangulaire : pas un vecteur colonne
		if (rows.some((row) => (splitTopLevel(row, '&') ?? []).length !== 1)) return null;
		return rows.map((row) => row.trim());
	}
	const inner = parenthesizedContent(body);
	if (inner === null) return null;
	const parts = splitTopLevel(inner, ';');
	return parts && parts.length >= 2 ? parts.map((part) => part.trim()) : null;
}

/** Valeur d'un nombre écrit (`2`, `10`), NaN sinon */
function writtenInteger(node: MathNode): number {
	const inner = node.type === 'delimiter' ? node.content : node;
	return inner.type === 'number' ? Number(inner.value) : Number.NaN;
}

/** Un exposant entier écrit au-delà de MAX_WRITTEN_EXPONENT */
function hasHugeExponent(node: MathNode): boolean {
	let huge = false;
	mapNode(node, (n) => {
		if (n.type === 'superscript' && writtenInteger(n.superscript) > MAX_WRITTEN_EXPONENT) {
			huge = true;
		}
		return n;
	});
	return huge;
}

/** Une coordonnée (ou un coefficient de matrice) : expression constante lisible, `null` sinon */
export function parseCoordinate(text: string): MathNode | null {
	if (!text) return null;
	try {
		const { ast, errors } = parseLatexSafe(stripLatexSpacing(text, 'decimal'));
		if (!ast || (errors && errors.length > 0)) return null;
		if (ast.type === 'relation' || getVariables(ast).size > 0) return null;
		if (hasHugeExponent(ast)) return null;
		return ast;
	} catch {
		return null;
	}
}

/** Lecture d'un vecteur ; jamais d'exception */
function readVector(text: string): ReadVector {
	if (isAnswerTooComplex(text)) {
		return { ok: false, error: 'écriture trop complexe', isVectorShaped: true };
	}
	const texts = coordinateTexts(text);
	if (!texts) return { ok: false, error: 'pas un vecteur', isVectorShaped: false };
	const nodes: MathNode[] = [];
	for (const coordinate of texts) {
		const node = parseCoordinate(coordinate);
		if (!node) {
			return { ok: false, error: `coordonnée illisible « ${coordinate} »`, isVectorShaped: true };
		}
		nodes.push(node);
	}
	return { ok: true, texts, nodes };
}

/**
 * L'expression vaut exactement 0. Lève une erreur si la réduction échoue ou
 * dépasse son budget (l'appelant juge alors la réponse fausse).
 */
export function isExactlyZero(node: MathNode): boolean {
	const form = normalize(node, {
		abortChecker: makeAbortChecker(undefined, NORMALIZE_BUDGET_MS)
	});
	const real = [...form.numerator, ...form.denominator].every((term) =>
		term.coefficient.terms.every((part) => !part.hasImaginaryUnit)
	);
	if (!real) throw new Error('coordonnée non réelle');
	return form.numerator.length === 0;
}

/** Toutes les coordonnées nulles */
function isZeroVector(nodes: readonly MathNode[]): boolean {
	return nodes.every(isExactlyZero);
}

/** Mêmes coordonnées : a_i − e_i = 0 pour tout i */
function haveSameCoordinates(answer: readonly MathNode[], expected: readonly MathNode[]): boolean {
	return answer.every((a, i) => isExactlyZero(subtract(a, expected[i])));
}

/** Colinéaires : tous les déterminants 2×2 a_i·e_j − a_j·e_i sont nuls */
function areCollinear(answer: readonly MathNode[], expected: readonly MathNode[]): boolean {
	for (let i = 0; i < answer.length; i++) {
		for (let j = i + 1; j < answer.length; j++) {
			const determinant = subtract(
				multiply(answer[i], expected[j], 'cross'),
				multiply(answer[j], expected[i], 'cross')
			);
			if (!isExactlyZero(determinant)) return false;
		}
	}
	return true;
}

/**
 * Chaque coordonnée se réduit : réelle et définie. Lève une erreur sinon
 * (`\frac{1}{0}` : division par zéro ; `i` : non réelle ; budget dépassé).
 */
function assertDefinedCoordinates(nodes: readonly MathNode[]): void {
	for (const node of nodes) isExactlyZero(node);
}

/**
 * Réponse attendue écrite par l'auteur : un vecteur lisible de dimension 2 ou 3,
 * non nul en mode colinéaire. Sert aux specs de test (une attendue illisible est
 * une erreur du MODÈLE, pas de l'élève).
 */
export function readExpectedVector(
	text: string,
	mode: VectorMode = 'exact'
): { ok: true } | { ok: false; error: string } {
	const read = readVector(text);
	if (!read.ok) return { ok: false, error: read.error };
	const dimension = read.nodes.length;
	if (dimension < MIN_DIMENSION || dimension > MAX_DIMENSION) {
		return { ok: false, error: `dimension ${dimension} (2 ou 3 attendue)` };
	}
	try {
		assertDefinedCoordinates(read.nodes);
		if (mode === 'colineaire' && isZeroVector(read.nodes)) {
			return { ok: false, error: 'vecteur nul : aucun vecteur ne lui est colinéaire' };
		}
	} catch {
		return { ok: false, error: 'coordonnée non définie, non réelle ou impossible à réduire' };
	}
	return { ok: true };
}

/**
 * Réponse attendue affichée (correction) : en colonne. Une attendue illisible
 * est rendue telle quelle.
 */
export function expectedVectorLatex(expected: string): string {
	const texts = coordinateTexts(expected);
	return texts ? `\\begin{pmatrix}${texts.join('\\\\')}\\end{pmatrix}` : expected;
}

/**
 * Verdict d'une case « vecteur ».
 *
 * @param answer - réponse de l'élève (LaTeX de MathLive)
 * @param expected - réponse attendue (vecteur écrit par l'auteur)
 * @param mode - `'exact'` (défaut) ou `'colineaire'`
 */
export function judgeVectorAnswer(
	answer: string,
	expected: string,
	mode: VectorMode = 'exact'
): VectorVerdict {
	if (!answer.trim()) return { status: 'empty' };

	const expectedRead = readVector(expected);
	if (!expectedRead.ok) return { status: 'incorrect' };

	const answerRead = readVector(answer);
	if (!answerRead.ok) {
		return answerRead.isVectorShaped
			? { status: 'incorrect' }
			: { status: 'incorrect', feedback: VECTOR_FEEDBACK.notVector };
	}

	const dimension = expectedRead.nodes.length;
	if (answerRead.nodes.length !== dimension) {
		return { status: 'incorrect', feedback: VECTOR_FEEDBACK.dimension(dimension) };
	}

	try {
		assertDefinedCoordinates(answerRead.nodes);
		if (mode === 'exact') {
			return haveSameCoordinates(answerRead.nodes, expectedRead.nodes)
				? { status: 'correct' }
				: { status: 'incorrect' };
		}
		// Colinéaire : le vecteur nul l'est à tout vecteur, il est pourtant faux
		if (isZeroVector(answerRead.nodes)) {
			return { status: 'incorrect', feedback: VECTOR_FEEDBACK.zero };
		}
		if (isZeroVector(expectedRead.nodes)) return { status: 'incorrect' };
		return areCollinear(answerRead.nodes, expectedRead.nodes)
			? { status: 'correct' }
			: { status: 'incorrect' };
	} catch {
		// Budget dépassé, coordonnée non réelle ou que la réduction ne sait pas lire
		return { status: 'incorrect' };
	}
}
