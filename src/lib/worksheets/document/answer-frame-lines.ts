/**
 * Cadres de réponse en nombre de lignes (ADR 0030, lot 4)
 * =======================================================
 *
 * Le prof règle chaque cadre en **lignes** de `ANSWER_FRAME_LINE_CM` (colonne
 * `worksheet_exercises.answer_frame_lines`, `AnswerFrameLines`) ; ce qu'il ne
 * règle pas reste à l'estimation du lot 3 (`estimateAnswerFrames`), convertie
 * en lignes : petit 3, moyen 5, grand 8 ; le cadre unique, sa hauteur fermée
 * divisée par la ligne, arrondie (2,5 cm → 3 … 14 cm → 18).
 *
 * **Résolution** (`resolveAnswerFrames`) : valeur du prof si elle n'est pas
 * `null` (0 = pas de cadre), sinon l'estimation. Si le nombre de questions de
 * l'énoncé n'est plus la longueur du tableau enregistré (l'exercice a changé,
 * ou la variante imprimée n'a pas le même nombre de questions), TOUTES les
 * valeurs par question repassent en auto ; le cadre unique, lui, ne dépend pas
 * des questions et garde sa valeur.
 *
 * Une seule résolution pour tous les PDF : le prof l'appelle sur sa copie, le
 * serveur sur la copie de l'élève, dont il n'envoie que le résultat
 * (`printed_frame_lines`, audit S1) — ce que le PDF imprime, rien d'autre.
 *
 * @module worksheets/document/answer-frame-lines
 */

import {
	ANSWER_FRAME_MAX_LINES,
	ANSWER_FRAME_MAX_QUESTIONS,
	type AnswerFrameEstimate,
	type AnswerFrameLines,
	type AnswerFrameMode,
	type AnswerFrameSize,
	type PrintedAnswerFrames
} from '$lib/types/worksheets';

// ============================================================================
// CONSTANTES
// ============================================================================

/** Hauteur d'une ligne d'écriture manuscrite, en cm */
export const ANSWER_FRAME_LINE_CM = 0.8;

/** L'estimation par question, en lignes */
export const ANSWER_FRAME_SIZE_LINES: Record<AnswerFrameSize, number> = {
	small: 3,
	medium: 5,
	large: 8
};

/** Cadre sans estimation (ni corrigé, ni taille transmise) : moyen */
const DEFAULT_LINES = ANSWER_FRAME_SIZE_LINES.medium;

// ============================================================================
// UNITÉS
// ============================================================================

/** Hauteur imprimée d'un cadre de tant de lignes, au centième (sans bruit flottant) */
export function answerFrameLinesToCm(lines: number): number {
	return Math.round(lines * ANSWER_FRAME_LINE_CM * 100) / 100;
}

/** L'estimation du lot 3, en lignes */
export function autoAnswerFrameLines(estimate: AnswerFrameEstimate): {
	questions: number[];
	exercise: number;
} {
	return {
		questions: (estimate.questions ?? []).map((size) => ANSWER_FRAME_SIZE_LINES[size]),
		exercise:
			estimate.exercise_cm === undefined
				? DEFAULT_LINES
				: Math.round(estimate.exercise_cm / ANSWER_FRAME_LINE_CM)
	};
}

// ============================================================================
// LECTURE DE LA COLONNE
// ============================================================================

function isLineCount(value: unknown): value is number {
	return (
		typeof value === 'number' &&
		Number.isInteger(value) &&
		value >= 0 &&
		value <= ANSWER_FRAME_MAX_LINES
	);
}

/**
 * La colonne jsonb lue en base, ramenée à sa forme. La contrainte CHECK la
 * garantit déjà ; une valeur abîmée repasse en auto plutôt que de casser le PDF.
 */
export function toAnswerFrameLines(value: unknown): AnswerFrameLines | null {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
	const raw = value as Record<string, unknown>;
	const result: AnswerFrameLines = {};
	if (Array.isArray(raw.questions)) {
		result.questions = raw.questions
			.slice(0, ANSWER_FRAME_MAX_QUESTIONS)
			.map((lines) => (isLineCount(lines) ? lines : null));
	}
	if ('exercise' in raw) result.exercise = isLineCount(raw.exercise) ? raw.exercise : null;
	return result;
}

// ============================================================================
// RÉSOLUTION
// ============================================================================

/**
 * Les réglages par question sont-ils périmés ? Oui si un tableau est enregistré
 * et que sa longueur n'est plus le nombre de questions de l'énoncé.
 */
export function answerFrameLinesOutdated(
	chosen: AnswerFrameLines | null | undefined,
	questionCount: number
): boolean {
	const questions = chosen?.questions ?? [];
	return questions.length > 0 && questions.length !== questionCount;
}

/** Les réglages par question encore valables pour cet énoncé (sinon : tous auto) */
function validQuestionLines(
	chosen: AnswerFrameLines | null | undefined,
	questionCount: number
): (number | null)[] {
	if (!chosen?.questions || answerFrameLinesOutdated(chosen, questionCount)) {
		return Array<number | null>(questionCount).fill(null);
	}
	return chosen.questions;
}

/**
 * Les cadres imprimés d'un exercice : lignes par question (mode question, énoncé
 * à questions numérotées), sinon le cadre unique. Tronqué à
 * `ANSWER_FRAME_MAX_QUESTIONS` (la borne du schéma de réponse de l'élève).
 */
export function resolveAnswerFrames(
	estimate: AnswerFrameEstimate,
	chosen: AnswerFrameLines | null | undefined,
	mode: AnswerFrameMode
): PrintedAnswerFrames {
	const auto = autoAnswerFrameLines(estimate);
	if (mode === 'exercise' || auto.questions.length === 0) {
		return { exercise: chosen?.exercise ?? auto.exercise };
	}
	const valid = validQuestionLines(chosen, auto.questions.length);
	return {
		questions: auto.questions
			.map((lines, index) => valid[index] ?? lines)
			.slice(0, ANSWER_FRAME_MAX_QUESTIONS)
	};
}

/** Lignes du cadre de la question `index` (0 = aucun cadre) ; inconnue : moyen */
export function printedQuestionLines(printed: PrintedAnswerFrames, index: number): number {
	return printed.questions?.[index] ?? DEFAULT_LINES;
}

/** Lignes du cadre unique (0 = aucun cadre) ; inconnu : moyen */
export function printedExerciseLines(printed: PrintedAnswerFrames): number {
	return printed.exercise ?? DEFAULT_LINES;
}

// ============================================================================
// ÉCRAN DU PROF
// ============================================================================

/** Une ligne du réglage : lignes imprimées, et si c'est l'estimation */
export interface AnswerFrameRow {
	lines: number;
	auto: boolean;
}

/** Le bloc « Cadres de réponse » d'un exercice */
export interface AnswerFrameRows {
	/** `questions` : une ligne par question ; `exercise` : une ligne « Cadre » */
	kind: 'questions' | 'exercise';
	rows: AnswerFrameRow[];
	/** Réglages par question enregistrés pour un autre nombre de questions */
	outdated: boolean;
}

/** Ce que l'écran montre pour un exercice (même résolution que le PDF) */
export function answerFrameRows(
	estimate: AnswerFrameEstimate,
	chosen: AnswerFrameLines | null | undefined,
	mode: AnswerFrameMode
): AnswerFrameRows {
	const auto = autoAnswerFrameLines(estimate);
	if (mode === 'exercise' || auto.questions.length === 0) {
		const value = chosen?.exercise ?? null;
		return {
			kind: 'exercise',
			outdated: false,
			rows: [{ lines: value ?? auto.exercise, auto: value === null }]
		};
	}
	const valid = validQuestionLines(chosen, auto.questions.length);
	return {
		kind: 'questions',
		outdated: answerFrameLinesOutdated(chosen, auto.questions.length),
		rows: auto.questions.map((lines, index) => {
			const value = valid[index] ?? null;
			return { lines: value ?? lines, auto: value === null };
		})
	};
}

/** Plus rien de réglé : `null` (tout auto) plutôt qu'un objet vide */
function normalized(lines: AnswerFrameLines): AnswerFrameLines | null {
	const result: AnswerFrameLines = {};
	if (lines.questions?.some((value) => value !== null)) result.questions = lines.questions;
	if (lines.exercise !== undefined && lines.exercise !== null) result.exercise = lines.exercise;
	return Object.keys(result).length > 0 ? result : null;
}

/**
 * Régler la question `index` (`null` = remettre en auto). Le tableau prend la
 * longueur de l'énoncé ; des réglages périmés repartent de zéro.
 */
export function setQuestionLines(
	chosen: AnswerFrameLines | null | undefined,
	questionCount: number,
	index: number,
	lines: number | null
): AnswerFrameLines | null {
	const questions = [...validQuestionLines(chosen, questionCount)];
	questions[index] = lines;
	return normalized({ ...chosen, questions });
}

/** Régler le cadre unique (`null` = remettre en auto) */
export function setExerciseLines(
	chosen: AnswerFrameLines | null | undefined,
	lines: number | null
): AnswerFrameLines | null {
	return normalized({ ...chosen, exercise: lines });
}
