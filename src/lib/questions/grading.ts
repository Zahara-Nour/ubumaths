/**
 * Barème d'une évaluation notée (chantier 5, ADR 0015)
 * ====================================================
 *
 * Repris de TinyMath (`assessItem`, décision Q35 de David, 2026-09-30) :
 * - une question vaut 1 (juste), ½ (forme non optimale, cases vides ≤ moitié,
 *   QCM incomplet sans erreur) ou 0 (une case fausse ou mal écrite, trop de
 *   cases vides, un mauvais choix coché) ;
 * - la note est ramenée sur 20, au demi-point le plus proche (un quart arrondit
 *   au-dessus).
 *
 * Pur : appelé par le SERVEUR à l'envoi d'une tentative. Seules les évaluations
 * sont notées ; ailleurs, `validateAnswer` reste le seul verdict (ADR 0001).
 */

import { getQuestionType, type QuestionInstance, type ValidationStatus } from './types';
import { validateAnswer, validateBlanksDetailed } from '$lib/utils/answer-validator';

// Types
export type QuestionPoints = 0 | 0.5 | 1;

/** Réponse d'un élève à une question, telle que l'envoi la transmet */
export interface SubmittedAnswer {
	/**
	 * Question à cases : une valeur par case (chaîne vide = case vide). Pour une
	 * case math, c'est le LaTeX tapé (MathLive) : il sert AUSSI à juger la forme.
	 * Aucun LaTeX séparé n'est accepté du navigateur : un LaTeX « trompeur »
	 * contournerait la forme exigée (audit de sécurité, chantier 5).
	 */
	values?: string[];
	/** QCM : positions COCHÉES dans l'ordre affiché (`shuffledChoices`) */
	choices?: number[];
}

export interface QuestionVerdict {
	status: ValidationStatus;
	points: QuestionPoints;
	/** Juste au sens de la note : tous les points (cf. `test_answers.is_correct`) */
	isCorrect: boolean;
	/** Message pour l'élève (forme, unité, case vide…), s'il y en a un */
	feedback?: string;
	/** Message propre à chaque case */
	blankFeedback?: (string | undefined)[];
}

// Functions
/**
 * « Su » pour le SRS (décision Q40 de David, 2026-10-01) : une forme non
 * optimale (½ point) compte « Bien », comme en entraînement libre.
 */
export function isKnownForSrs(status: ValidationStatus): boolean {
	return status === 'correct' || status === 'unoptimal_form';
}

export function pointsOfStatus(status: ValidationStatus): QuestionPoints {
	if (status === 'correct') return 1;
	if (status === 'unoptimal_form') return 0.5;
	return 0;
}

/**
 * Statut d'une question à cases depuis le statut de chaque case (A1-A3) :
 * tout vide → empty ; une case fausse → incorrect ; une case mal écrite →
 * bad_form ; vides > moitié → incorrect ; vides ≤ moitié ou une forme non
 * optimale → unoptimal_form ; sinon correct.
 */
export function statusFromBlankStatuses(statuses: readonly ValidationStatus[]): ValidationStatus {
	if (statuses.length === 0) return 'empty';
	const empty = statuses.filter((s) => s === 'empty').length;
	if (empty === statuses.length) return 'empty';
	if (statuses.includes('incorrect')) return 'incorrect';
	if (statuses.includes('bad_form')) return 'bad_form';
	if (empty > statuses.length / 2) return 'incorrect';
	if (empty > 0 || statuses.includes('unoptimal_form')) return 'unoptimal_form';
	return 'correct';
}

/**
 * Statut d'un QCM (A4), indices d'ORIGINE : rien coché → empty ; un mauvais
 * coché → incorrect ; exactement les bons → correct ; des bons seulement, mais
 * pas tous → unoptimal_form (½).
 */
export function statusFromChoices(
	selected: readonly number[],
	correct: readonly number[]
): ValidationStatus {
	const chosen = new Set(selected);
	if (chosen.size === 0) return 'empty';
	const good = new Set(correct);
	for (const index of chosen) {
		if (!good.has(index)) return 'incorrect';
	}
	return chosen.size === good.size ? 'correct' : 'unoptimal_form';
}

/** Arrondi au demi-point le plus proche, quart au-dessus (12,46 → 12,5 ; 12,25 → 12,5) */
export function roundToHalfPoint(value: number): number {
	// Epsilon : 1,25 calculé peut valoir 1,2499999… ; un quart doit monter
	return Math.floor(value * 2 + 0.5 + 1e-9) / 2;
}

/**
 * Note sur 20 (A5), toujours un multiple de 0,5 : la colonne `numeric(3,1)`
 * arrondirait elle-même AVANT son CHECK, on ne lui laisse rien à arrondir.
 */
export function gradeOutOf20(pointsEarned: number, totalQuestions: number): number {
	if (totalQuestions <= 0) return 0;
	const grade = roundToHalfPoint((pointsEarned / totalQuestions) * 20);
	return Math.min(20, Math.max(0, grade));
}

/** Indices d'origine des bons choix d'une instance de QCM */
function correctChoiceIndexes(instance: QuestionInstance): number[] {
	if (instance.choices && instance.choices.length > 0) {
		return instance.choices.flatMap((choice, index) => (choice.isCorrect ? [index] : []));
	}
	const raw = instance.correctChoiceIndex;
	const list = Array.isArray(raw) ? raw : raw !== undefined ? [raw] : [];
	return list.map(Number).filter((n) => Number.isInteger(n));
}

function gradeChoices(instance: QuestionInstance, answer: SubmittedAnswer): QuestionVerdict {
	const shuffled = instance.shuffledChoices ?? [];
	const positions = answer.choices ?? [];
	// Position inconnue : elle ne désigne aucun choix, donc un mauvais choix
	const outOfRange = positions.some((p) => !Number.isInteger(p) || p < 0 || p >= shuffled.length);
	const selected = outOfRange ? [-1] : positions.map((p) => shuffled[p].originalIndex);

	// Règles de validation propres au QCM (rare) : le verdict de validateAnswer, tout ou rien
	if (instance.validationRules && instance.validationRules.length > 0 && !outOfRange) {
		if (selected.length === 0) return { status: 'empty', points: 0, isCorrect: false };
		const result = validateAnswer(instance.multipleAnswers ? selected : selected[0], instance);
		const status: ValidationStatus = result.isCorrect ? 'correct' : 'incorrect';
		return { status, points: pointsOfStatus(status), isCorrect: result.isCorrect };
	}

	const status = statusFromChoices(selected, correctChoiceIndexes(instance));
	const points = pointsOfStatus(status);
	return { status, points, isCorrect: points === 1 };
}

function gradeBlanks(instance: QuestionInstance, answer: SubmittedAnswer): QuestionVerdict {
	const blanks = instance.blanks ?? [];
	const values = answer.values ?? blanks.map(() => '');
	// Nombre de cases différent : réponse fabriquée ou périmée, jamais une exception
	if (values.length !== blanks.length) {
		return { status: 'incorrect', points: 0, isCorrect: false };
	}
	// Forme jugée sur la valeur elle-même (cf. `SubmittedAnswer.values`)
	const { result, statuses } = validateBlanksDetailed(values, instance, values);
	const status = statusFromBlankStatuses(statuses);
	const points = pointsOfStatus(status);
	return {
		status,
		points,
		isCorrect: points === 1,
		...(result.feedback && { feedback: result.feedback }),
		...(result.blankFeedback && { blankFeedback: result.blankFeedback })
	};
}

/**
 * Corrige une réponse à une question d'évaluation (verdict SERVEUR). Ne lève
 * jamais : une réponse illisible vaut 0.
 */
export function gradeQuestion(
	instance: QuestionInstance,
	answer: SubmittedAnswer
): QuestionVerdict {
	try {
		return getQuestionType(instance) === 'multiple_choice'
			? gradeChoices(instance, answer)
			: gradeBlanks(instance, answer);
	} catch {
		return { status: 'incorrect', points: 0, isCorrect: false };
	}
}
