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

import type { QuestionInstance, ValidationStatus } from './types';
import { gradeQuestion } from './grading';
import type { StudentAnswer } from '$lib/utils/answer-validator';
import type { AnswerData } from '$lib/types/question-display';
import { withoutBuildCases, withoutFigureCases } from './expected-result';

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
 * forme non optimale ET pour une réponse partielle (cases en partie vides, case
 * choix incomplète).
 */
export function trainingStatus(
	instance: QuestionInstance,
	answer: StudentAnswer
): ValidationStatus {
	return gradeQuestion(instance, { values: answer.values ?? [] }).status;
}

/** Formule de l'énoncé qui porte la case (marqueur ou convention « expression ») */
const MATH_WITH_BLANK = /\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g;
const HAS_BLANK = /\\placeholder\[\d+\]|<<expr:/;

/**
 * Consigne d'un énoncé R1 (Q104) : l'énoncé sans la formule qui contient la
 * case, ni le bloc d'une case « figure » ; chaîne vide s'il ne reste ni lettre
 * ni chiffre.
 */
export function instructionOf(statement: string): string {
	const rest = withoutBuildCases(withoutFigureCases(statement))
		.replace(MATH_WITH_BLANK, (zone) => (HAS_BLANK.test(zone) ? '' : zone))
		.replace(/[ \t]+/g, ' ')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
	return /[\p{L}\p{N}]/u.test(rest) ? rest : '';
}
