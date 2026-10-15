/**
 * Cadres de réponse automatiques (ADR 0030, lot 3)
 * ================================================
 *
 * Avec « réponses sur le sujet » (évaluation écrite, examen blanc), l'élève
 * répond dans des cadres imprimés sur la fiche :
 * - mode `question` (défaut) : un cadre à la fin de chaque question, après ses
 *   sous-questions ; énoncé sans question numérotée : un seul cadre à la fin ;
 * - mode `exercise` : un seul cadre à la fin de l'énoncé.
 *
 * **Question** : un élément de PREMIER niveau d'une liste numérotée de premier
 * niveau de l'énoncé (« Partie A » 1-5 puis « Partie B » 1-4 : neuf questions).
 * Les sous-questions restent dans le cadre de leur question.
 *
 * **Hauteur** : estimée d'après le corrigé de la MÊME variante, découpé de la
 * même façon. Autant d'éléments que de questions : la question k prend la
 * taille de la réponse k ; sinon (ou corrigé vide) : taille moyenne partout.
 *
 * **Mesure de la longueur d'une réponse** (`answerLines`) : un nombre de
 * lignes imprimées, estimé simplement. Un paragraphe compte ses caractères
 * visibles (texte, et formules SANS leurs commandes : `\dfrac{\sqrt{2}}{2}`
 * compte 4 symboles), à `CHARS_PER_LINE` par ligne, au moins une ligne ; une
 * formule centrée, une ligne par ligne de formule ; un tableau, une ligne par
 * rangée ; une figure (image, courbe, tableau de variation…) `FIGURE_LINES`.
 * Le corrigé est rédigé ; l'élève écrit plus gros mais moins : une ligne du
 * corrigé ≈ une ligne manuscrite.
 *
 * Une seule fonction d'estimation (`estimateAnswerFrames`) : le PDF du prof
 * l'appelle sur sa copie, le serveur l'appelle sur la copie de l'élève (dont il
 * n'envoie que les lignes résolues, même quand la correction est masquée) —
 * mêmes cadres. Depuis le lot 4, l'estimation est le point de départ « auto »
 * d'un réglage en lignes : `answer-frame-lines.ts`.
 *
 * @module worksheets/document/answer-frames
 */

import { parseMarkdown } from '$lib/ubumark';
import type { ASTNode, DocumentNode, InlineNode, ListItemNode } from '$lib/ubumark/types';
import {
	ANSWER_FRAME_MAX_QUESTIONS,
	type AnswerFrameEstimate,
	type AnswerFrameSize,
	type ExerciseFrameCm
} from '$lib/types/worksheets';

// ============================================================================
// CONSTANTES
// ============================================================================

/** Hauteur d'un cadre selon sa taille, pour l'écriture manuscrite d'un élève */
export const ANSWER_FRAME_HEIGHT_CM: Record<AnswerFrameSize, ExerciseFrameCm> = {
	small: 2.5,
	medium: 4.5,
	large: 7
};

/** Réponse d'au plus 2 lignes : petit cadre */
export const SMALL_MAX_LINES = 2;
/** Réponse d'au plus 5 lignes : cadre moyen ; au-delà : grand */
export const MEDIUM_MAX_LINES = 5;

/** Caractères visibles d'une ligne imprimée du corrigé */
export const CHARS_PER_LINE = 60;
/** Une figure (image, courbe, tableau de variation…) : autant de lignes */
export const FIGURE_LINES = 6;

/** Cadre unique : corrigé d'au plus 9 lignes, grand cadre (7 cm) */
export const LARGE_MAX_LINES = 9;
/** Cadre unique : au plus 14 lignes, 10 cm ; au-delà, le plafond */
export const EXTRA_LARGE_MAX_LINES = 14;
/** Plafond du cadre unique : il doit tenir sur une page avec son énoncé */
export const EXERCISE_FRAME_MAX_CM = 14;

/**
 * Lignes par question envoyées à l'élève, au plus : la borne du schéma de
 * réponse ; au-delà, le serveur tronque (le rendu met « moyen ») plutôt que de
 * faire échouer toute la copie
 */
export const MAX_VIEW_QUESTIONS = ANSWER_FRAME_MAX_QUESTIONS;

/** Le cadre lui-même : pointillé gris clair, toute la largeur disponible */
const FRAME_STROKE = '(paint: rgb("#c8c8c8"), thickness: 0.5pt, dash: "dashed")';

// ============================================================================
// DÉCOUPAGE EN QUESTIONS
// ============================================================================

/**
 * Les questions d'un énoncé (ou les réponses d'un corrigé) : les éléments de
 * premier niveau des listes numérotées de premier niveau, dans l'ordre.
 */
export function questionItems(document: DocumentNode): ListItemNode[] {
	return document.children.flatMap((node) =>
		node.type === 'list' && node.ordered ? node.items : []
	);
}

// ============================================================================
// LONGUEUR D'UNE RÉPONSE
// ============================================================================

/** Lignes imprimées estimées pour ces nœuds (voir l'en-tête du module) */
export function answerLines(nodes: readonly ASTNode[]): number {
	return nodes.reduce((sum, node) => sum + nodeLines(node), 0);
}

function nodeLines(node: ASTNode): number {
	switch (node.type) {
		case 'paragraph':
			return inlineLines(node.children);
		case 'heading':
		case 'horizontal-rule':
			return 1;
		case 'list':
			return node.items.reduce((sum, item) => sum + Math.max(1, answerLines(item.children)), 0);
		case 'list-item':
			return answerLines(node.children);
		case 'math-block':
			return node.expression.split('\\\\').length;
		case 'table':
			return node.rows.length;
		case 'blockquote':
			return answerLines(node.children);
		case 'code-block':
			return node.code.split('\n').length;
		case 'image':
		case 'video':
		case 'variation-table':
		case 'probability-tree':
		case 'trig-circle':
		case 'number-line':
		case 'courbe':
		case 'figure':
		case 'stat-chart':
			return FIGURE_LINES;
		default:
			// Nœud en ligne isolé : une ligne de texte
			return inlineLines([node]);
	}
}

/** Un texte en ligne : ses segments entre sauts de ligne, à `CHARS_PER_LINE` par ligne */
function inlineLines(nodes: readonly InlineNode[]): number {
	let lines = 0;
	let chars = 0;
	const flush = () => {
		lines += Math.max(1, Math.ceil(chars / CHARS_PER_LINE));
		chars = 0;
	};
	for (const node of nodes) {
		if (node.type === 'line-break') flush();
		else chars += visibleChars(node);
	}
	flush();
	return lines;
}

function visibleChars(node: InlineNode): number {
	switch (node.type) {
		case 'text':
			return node.content.length;
		case 'math-inline':
			return mathSymbols(node.expression);
		case 'link':
			return node.text.length;
		case 'blank':
			// Un trou à compléter : la place d'un mot
			return 6;
		case 'hashtag':
			return node.tag.length + 1;
		case 'mention':
			return node.username.length + 1;
		case 'internal-link':
			return node.label.length;
		case 'hint-reference':
			// Renvoi à un indice : une marque
			return 2;
		case 'line-break':
			return 0;
	}
}

/**
 * Symboles visibles d'une formule : chaque commande (`\sqrt`, `\dfrac`…) compte
 * pour un, accolades, indices, exposants, espaces et `\left`/`\right` pour rien
 */
function mathSymbols(expression: string): number {
	return expression
		.replace(/\\(left|right)\b/g, '')
		.replace(/\\[a-zA-Z]+/g, 'x')
		.replace(/[{}^_&\s]/g, '').length;
}

/** Taille du cadre pour une réponse de tant de lignes */
export function answerFrameSize(lines: number): AnswerFrameSize {
	if (lines <= SMALL_MAX_LINES) return 'small';
	if (lines <= MEDIUM_MAX_LINES) return 'medium';
	return 'large';
}

// ============================================================================
// ESTIMATION D'UN EXERCICE
// ============================================================================

/**
 * Les cadres d'un exercice, d'après son énoncé et le corrigé de la même
 * variante (`null` ou vide : taille moyenne partout).
 */
export function estimateAnswerFrames(
	statement: string,
	solution: string | null
): AnswerFrameEstimate {
	const questionCount = questionItems(parseMarkdown(statement)).length;
	const written = solution?.trim() ? parseMarkdown(solution) : null;
	if (!written) {
		return {
			questions: Array<AnswerFrameSize>(questionCount).fill('medium'),
			exercise_cm: ANSWER_FRAME_HEIGHT_CM.medium
		};
	}

	const answers = questionItems(written);
	const questions =
		answers.length === questionCount
			? answers.map((item) => answerFrameSize(answerLines(item.children)))
			: Array<AnswerFrameSize>(questionCount).fill('medium');

	return { questions, exercise_cm: exerciseFrameCm(answerLines(written.children)) };
}

/**
 * Cadre unique : la taille de tout le corrigé ; au-delà du grand cadre, 10 cm
 * puis le plafond (hauteurs fermées, `EXERCISE_FRAME_HEIGHTS_CM`)
 */
function exerciseFrameCm(lines: number): ExerciseFrameCm {
	const size = answerFrameSize(lines);
	if (size !== 'large' || lines <= LARGE_MAX_LINES) return ANSWER_FRAME_HEIGHT_CM[size];
	return lines <= EXTRA_LARGE_MAX_LINES ? 10 : EXERCISE_FRAME_MAX_CM;
}

// ============================================================================
// RENDU TYPST
// ============================================================================

/** Un cadre de réponse vide, sur toute la largeur disponible */
export function answerFrameTypst(heightCm: number): string {
	return `#block(width: 100%, above: 0.8em, below: 0.6em, rect(width: 100%, height: ${heightCm}cm, stroke: ${FRAME_STROKE}, fill: none))`;
}
