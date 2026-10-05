/**
 * Réponse « matrice » : une matrice écrite dans UNE case
 * ======================================================
 *
 * Case marquée `answerKind: 'matrice'` (Terminale maths expertes : produit,
 * somme, inverse, puissance, matrice d'adjacence, de transition). Décision de
 * David du 2026-10-05, câblage calqué sur la case « vecteur »
 * (`vectors/vector-answer.ts`) :
 *
 * - écritures lues : `\begin{pmatrix}…\end{pmatrix}`, `\begin{bmatrix}…\end{bmatrix}`,
 *   `\left(\begin{matrix}…\end{matrix}\right)` ; coefficients séparés par `&`,
 *   lignes par `\\` (les espaces de MathLive compris, une ligne vide finale
 *   ignorée) ; préfixe `A=`, `AB=`, `M^{2}=`, `A^{-1}=` toléré ;
 * - dimensions comparées d'abord (message clair : « La matrice attendue a
 *   2 lignes et 2 colonnes. ») ; lignes de longueurs différentes, case du
 *   gabarit non remplie : faux avec un message ;
 * - coefficients CONSTANTS comparés PAR VALEUR, exactement (`normalize` de
 *   mathAST, aucun flottant) : `1+1`, `\frac{4}{2}`, `2.0` valent 2 ;
 * - l'écriture de chaque coefficient est jugée ensuite comme une case ordinaire
 *   (dans le validateur, cf. `matrixEntriesForm`) ;
 * - illisible, lettres, division par zéro : `incorrect`, jamais d'exception ;
 *   rien d'écrit : `empty`.
 *
 * @module questions/matrices/matrix-answer
 */

import type { ValidationStatus } from '$lib/questions/types';
import type { MathNode } from '$lib/mathAST/types';
import { subtract } from '$lib/mathAST/factory';
import { isAnswerTooComplex } from '$lib/questions/answer-complexity';
import {
	cleaned,
	isExactlyZero,
	parseCoordinate,
	splitTopLevel
} from '$lib/questions/vectors/vector-answer';

// Types
export interface MatrixVerdict {
	status: ValidationStatus;
	/** Message montré à l'élève (écriture, dimension, coefficient manquant) */
	feedback?: string;
}

/** Raison d'un refus de lecture (le message montré en dépend) */
type ReadFailure = 'complex' | 'notMatrix' | 'ragged' | 'incomplete' | 'unreadable';

type ReadMatrix =
	| { ok: true; texts: string[][]; nodes: MathNode[][] }
	| { ok: false; reason: ReadFailure; error: string; texts?: string[][] };

// Constantes

/** Messages figés (français, tutoiement) */
export const MATRIX_FEEDBACK = {
	notMatrix:
		'Écris une matrice : ses coefficients entre parenthèses, rangés en lignes et en colonnes.',
	ragged: 'Chaque ligne de la matrice doit avoir le même nombre de coefficients.',
	incomplete: 'Complète tous les coefficients de la matrice.',
	dimension: (rows: number, columns: number) =>
		`La matrice attendue a ${rows} ligne${rows > 1 ? 's' : ''} et ${columns} colonne${columns > 1 ? 's' : ''}.`
} as const;

/** Plus grande dimension d'une matrice attendue (graphe à 6 sommets) */
const MAX_DIMENSION = 6;

/** Environnement `pmatrix` / `bmatrix` englobant tout le texte */
const MATRIX_REGEX = /^\\begin\{([pb]matrix)\}([\s\S]*)\\end\{\1\}$/;

/** `matrix` nu entre parenthèses ou crochets (`\left(` / `\right)` déjà retirés) */
const WRAPPED_MATRIX_REGEX = /^[([]\s*\\begin\{matrix\}([\s\S]*)\\end\{matrix\}\s*[)\]]$/;

/** Nom toléré devant la matrice : `A=`, `AB=`, `M^{2}=`, `A^{-1}=`, `P_{1}=` */
const NAME_PREFIX_REGEX =
	/^[A-Za-z](?:[A-Za-z0-9']|\^\{?-?[0-9A-Za-z]+\}?|_\{?[0-9A-Za-z]+\}?)*\s*=\s*/;

/** Case de gabarit non remplie (touche du clavier : `#?` → `\placeholder{}`) */
const PLACEHOLDER_REGEX = /\\placeholder(?![a-zA-Z])/;

// Functions

/**
 * Coefficients écrits, ligne par ligne (texte de chaque coefficient), ou `null`
 * si ce n'est pas une matrice. Les lignes peuvent être de longueurs différentes
 * (refus jugé par l'appelant).
 */
export function matrixEntryTexts(text: string): string[][] | null {
	const body = cleaned(text)
		.replace(/\\lbrack(?![a-zA-Z])/g, '[')
		.replace(/\\rbrack(?![a-zA-Z])/g, ']')
		.replace(NAME_PREFIX_REGEX, '');
	const content = MATRIX_REGEX.exec(body)?.[2] ?? WRAPPED_MATRIX_REGEX.exec(body)?.[1];
	if (content === undefined) return null;
	const rows = splitTopLevel(content, '\\\\');
	if (!rows) return null;
	// `\\` final (ligne vide) : ignoré
	if (rows.length > 1 && rows[rows.length - 1].trim() === '') rows.pop();
	const entries: string[][] = [];
	for (const row of rows) {
		const cells = splitTopLevel(row, '&');
		if (!cells) return null;
		entries.push(cells.map((cell) => cell.trim()));
	}
	return entries;
}

/** Lecture d'une matrice ; jamais d'exception */
function readMatrix(text: string): ReadMatrix {
	if (isAnswerTooComplex(text)) {
		return { ok: false, reason: 'complex', error: 'écriture trop complexe' };
	}
	const texts = matrixEntryTexts(text);
	if (!texts) return { ok: false, reason: 'notMatrix', error: 'pas une matrice' };
	if (texts.some((row) => row.length !== texts[0].length)) {
		return {
			ok: false,
			reason: 'ragged',
			error: 'lignes de longueurs différentes',
			texts
		};
	}
	if (texts.flat().some((cell) => cell === '' || PLACEHOLDER_REGEX.test(cell))) {
		return { ok: false, reason: 'incomplete', error: 'coefficient manquant', texts };
	}
	const nodes: MathNode[][] = [];
	for (const row of texts) {
		const parsedRow: MathNode[] = [];
		for (const cell of row) {
			const node = parseCoordinate(cell);
			if (!node) {
				return {
					ok: false,
					reason: 'unreadable',
					error: `coefficient illisible « ${cell} »`,
					texts
				};
			}
			parsedRow.push(node);
		}
		nodes.push(parsedRow);
	}
	return { ok: true, texts, nodes };
}

/** Dimensions (lignes, colonnes) de coefficients rectangulaires */
function dimensionsOf(texts: readonly (readonly string[])[]): [number, number] {
	return [texts.length, texts[0]?.length ?? 0];
}

/**
 * Chaque coefficient se réduit : réel et défini. Lève une erreur sinon
 * (`\frac{1}{0}`, `i`, budget de réduction dépassé).
 */
function assertDefinedEntries(nodes: readonly (readonly MathNode[])[]): void {
	for (const node of nodes.flat()) isExactlyZero(node);
}

/** Mêmes coefficients, un à un : a_ij − e_ij = 0 */
function haveSameEntries(
	answer: readonly (readonly MathNode[])[],
	expected: readonly (readonly MathNode[])[]
): boolean {
	return answer.every((row, i) => row.every((a, j) => isExactlyZero(subtract(a, expected[i][j]))));
}

/**
 * Réponse attendue écrite par l'auteur : une matrice lisible, rectangulaire,
 * de dimensions 1 à 6, coefficients définis. Sert aux specs de test (une
 * attendue illisible est une erreur du MODÈLE, pas de l'élève).
 */
export function readExpectedMatrix(text: string): { ok: true } | { ok: false; error: string } {
	const read = readMatrix(text);
	if (!read.ok) return { ok: false, error: read.error };
	const [rows, columns] = dimensionsOf(read.texts);
	if (rows > MAX_DIMENSION || columns > MAX_DIMENSION) {
		return { ok: false, error: `dimension ${rows} × ${columns} (${MAX_DIMENSION} au plus)` };
	}
	try {
		assertDefinedEntries(read.nodes);
	} catch {
		return { ok: false, error: 'coefficient non défini, non réel ou impossible à réduire' };
	}
	return { ok: true };
}

/**
 * Réponse attendue affichée (correction) : en `pmatrix`. Une attendue illisible
 * est rendue telle quelle.
 */
export function expectedMatrixLatex(expected: string): string {
	const texts = matrixEntryTexts(expected);
	return texts
		? `\\begin{pmatrix}${texts.map((row) => row.join('&')).join('\\\\')}\\end{pmatrix}`
		: expected;
}

/**
 * Verdict d'une case « matrice » (valeur seule ; l'écriture des coefficients
 * est jugée ensuite par le validateur).
 *
 * @param answer - réponse de l'élève (LaTeX de MathLive)
 * @param expected - réponse attendue (matrice écrite par l'auteur)
 */
export function judgeMatrixAnswer(answer: string, expected: string): MatrixVerdict {
	if (!answer.trim()) return { status: 'empty' };

	const expectedRead = readMatrix(expected);
	if (!expectedRead.ok) return { status: 'incorrect' };
	const [rows, columns] = dimensionsOf(expectedRead.texts);

	const answerRead = readMatrix(answer);
	if (!answerRead.ok) {
		switch (answerRead.reason) {
			case 'notMatrix':
				return { status: 'incorrect', feedback: MATRIX_FEEDBACK.notMatrix };
			case 'ragged':
				return { status: 'incorrect', feedback: MATRIX_FEEDBACK.ragged };
			case 'incomplete':
			case 'unreadable': {
				// Mauvaise taille : la dimension est le premier message utile
				const texts = answerRead.texts ?? [];
				const [answerRows, answerColumns] = dimensionsOf(texts);
				if (answerRows !== rows || answerColumns !== columns) {
					return { status: 'incorrect', feedback: MATRIX_FEEDBACK.dimension(rows, columns) };
				}
				return answerRead.reason === 'incomplete'
					? { status: 'incorrect', feedback: MATRIX_FEEDBACK.incomplete }
					: { status: 'incorrect' };
			}
			default:
				return { status: 'incorrect' };
		}
	}

	const [answerRows, answerColumns] = dimensionsOf(answerRead.texts);
	if (answerRows !== rows || answerColumns !== columns) {
		return { status: 'incorrect', feedback: MATRIX_FEEDBACK.dimension(rows, columns) };
	}

	try {
		assertDefinedEntries(answerRead.nodes);
		return haveSameEntries(answerRead.nodes, expectedRead.nodes)
			? { status: 'correct' }
			: { status: 'incorrect' };
	} catch {
		// Budget dépassé, coefficient non réel ou que la réduction ne sait pas lire
		return { status: 'incorrect' };
	}
}
