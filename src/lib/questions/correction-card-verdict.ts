/**
 * Verdict d'une carte de correction (chantier « résultat attendu », lot 2)
 * =======================================================================
 *
 * - Entraînement : la réponse enregistrée côté client (`AnswerData`) redevient
 *   la réponse du validateur, exactement comme `QuestionCard` l'a jugée (une
 *   case math porte son LaTeX ; une case texte n'en a pas).
 * - Statut global affiché : juste / ½ point / faux, calculé par le barème des
 *   évaluations (`gradeQuestion`, Q105) — aucune seconde règle.
 * - Consigne d'une comparaison R1 (Q104) : l'énoncé sans la formule à case.
 */

import { getQuestionType, type QuestionInstance, type ValidationStatus } from './types';
import { gradeQuestion } from './grading';
import type { StudentAnswer } from '$lib/utils/answer-validator';
import type { AnswerData } from '$lib/types/question-display';

// Types
export type GlobalVerdictKind = 'correct' | 'half' | 'incorrect';

export interface GlobalVerdict {
	kind: GlobalVerdictKind;
	label: string;
}

// Functions
/** Réponse d'entraînement → réponse du validateur ; absente → réponse vide */
export function studentAnswerFromAnswerData(
	instance: QuestionInstance,
	data: AnswerData | undefined
): StudentAnswer {
	const value = data?.value;
	if (getQuestionType(instance) === 'multiple_choice') {
		const list = value === undefined || value === '' ? [] : [value].flat();
		return { choiceIndexes: list.map(Number).filter((n) => Number.isInteger(n)) };
	}
	const blanks = instance.blanks ?? [];
	const raw = Array.isArray(value) ? value.map(String) : [];
	const values = blanks.map((_, index) => raw[index] ?? '');
	return {
		values,
		latex: values.map((v, index) => (blanks[index]?.type === 'math' ? v : ''))
	};
}

/** Statut global : juste (1), ½ (forme non optimale, réponse incomplète), faux (0) */
export function globalVerdictOf(status: ValidationStatus): GlobalVerdict {
	if (status === 'correct') return { kind: 'correct', label: 'Juste' };
	if (status === 'unoptimal_form') return { kind: 'half', label: '½ point' };
	return { kind: 'incorrect', label: 'Faux' };
}

/**
 * Statut global d'entraînement par le barème de l'évaluation (Q105) : ½ pour une
 * forme non optimale ET pour une réponse partielle (cases en partie vides, QCM
 * incomplet). `gradeQuestion` lit les positions AFFICHÉES d'un QCM : les indices
 * d'origine y sont ramenés (ordre d'origine si la question n'est pas mélangée).
 */
export function trainingStatus(
	instance: QuestionInstance,
	answer: StudentAnswer
): ValidationStatus {
	if (getQuestionType(instance) !== 'multiple_choice') {
		return gradeQuestion(instance, { values: answer.values ?? [] }).status;
	}
	const shuffled =
		instance.shuffledChoices && instance.shuffledChoices.length > 0
			? instance.shuffledChoices
			: (instance.choices ?? []).map((choice, originalIndex) => ({
					content: choice.content,
					originalIndex
				}));
	const choices = (answer.choiceIndexes ?? []).map((index) =>
		shuffled.findIndex((c) => c.originalIndex === index)
	);
	return gradeQuestion({ ...instance, shuffledChoices: shuffled }, { choices }).status;
}

/** Formule de l'énoncé qui porte la case (marqueur ou convention « expression ») */
const MATH_WITH_BLANK = /\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g;
const HAS_BLANK = /\\placeholder\[\d+\]|<<expr:/;

/**
 * Consigne d'un énoncé R1 (Q104) : l'énoncé sans la formule qui contient la
 * case ; chaîne vide s'il ne reste ni lettre ni chiffre.
 */
export function instructionOf(statement: string): string {
	const rest = statement
		.replace(MATH_WITH_BLANK, (zone) => (HAS_BLANK.test(zone) ? '' : zone))
		.replace(/[ \t]+/g, ' ')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
	return /[\p{L}\p{N}]/u.test(rest) ? rest : '';
}
