/**
 * Constraint Validation Feedback Messages
 * =======================================
 *
 * French-language feedback messages shown to students when
 * their answer has constraint violations.
 *
 * @module questions/feedback
 */

import type { ConstraintId } from './types';

/**
 * Feedback messages for each constraint type
 *
 * Each constraint has:
 * - single: Message for single answer questions
 * - multiple: Message for multiple answer questions
 */
export const CONSTRAINT_FEEDBACK: Record<ConstraintId, { single: string; multiple: string }> = {
	// Existing validators (text/regex based)
	spaces: {
		single: 'Les chiffres sont mal espacés.',
		multiple: 'Les chiffres sont mal espacés.'
	},
	products: {
		single: 'Tu peux simplifier certains symboles de multiplication.',
		multiple: 'Tu peux simplifier certains symboles de multiplication.'
	},
	brackets: {
		single: 'Il y a des parenthèses inutiles.',
		multiple: 'Il y a des parenthèses inutiles.'
	},
	zeros: {
		single: 'Il y a un ou des zéros inutiles.',
		multiple: 'Il y a un ou des zéros inutiles.'
	},
	form: {
		single: "Ta réponse n'est pas écrite sous la forme demandée.",
		multiple: "Ta réponse n'est pas écrite sous la forme demandée."
	},
	// New validators (Compute Engine pattern matching)
	nullTerms: {
		single: 'Il y a des termes nuls (comme +0) qui peuvent être supprimés.',
		multiple: 'Il y a des termes nuls (comme +0) qui peuvent être supprimés.'
	},
	factorOne: {
		single: 'Il y a des facteurs 1 (comme ×1) qui peuvent être simplifiés.',
		multiple: 'Il y a des facteurs 1 (comme ×1) qui peuvent être simplifiés.'
	},
	factorZero: {
		single: 'Une multiplication par 0 peut être simplifiée en 0.',
		multiple: 'Une multiplication par 0 peut être simplifiée en 0.'
	},
	signs: {
		single: 'Il y a des signes superflus (comme ++, --, ou +x).',
		multiple: 'Il y a des signes superflus (comme ++, --, ou +x).'
	},
	reducedFractions: {
		single: 'La fraction peut être simplifiée.',
		multiple: 'Une ou plusieurs fractions peuvent être simplifiées.'
	},
	// Racine carrée à facteur carré (√12 pour 2√3), décision du 2026-10-04
	reducedRadicals: {
		single: 'La racine peut être simplifiée.',
		multiple: 'Une ou plusieurs racines peuvent être simplifiées.'
	},
	// Pourcentage attendu, réponse de même valeur sans le symbole
	percent: {
		single: 'Écris le résultat en pourcentage.',
		multiple: 'Écris les résultats en pourcentage.'
	},
	// Unit matching
	unit: {
		single: "L'unité n'est pas celle attendue.",
		multiple: "L'unité n'est pas celle attendue."
	},
	// Réponse « intervalles » juste mais à réécrire (message précis : interval-answer.ts)
	intervalForm: {
		single: "L'ensemble est juste, mais son écriture peut être simplifiée.",
		multiple: 'Un ensemble est juste, mais son écriture peut être simplifiée.'
	},
	// Trop de chiffres, mais bon arrondi (message précis : questions/rounding)
	rounding: {
		single: 'Arrondis comme demandé.',
		multiple: 'Arrondis comme demandé.'
	}
} as const;

/** Pourcentage attendu, réponse fausse qui en est la valeur sans le symbole (`20` pour `20 %`) */
export const FORGOTTEN_PERCENT_SIGN = "N'oublie pas le symbole %.";

/** QCM à plusieurs réponses coché en partie, sans erreur (½ point, V3) */
export const MISSING_CHOICES_FEEDBACK = 'Il manque des réponses.';

/**
 * Consigne d'un QCM à plusieurs réponses, sous l'énoncé (V2, Q107 b). « la ou
 * les » : vraie aussi quand le tirage n'a qu'une bonne réponse, sans en révéler
 * le nombre (ce serait un indice).
 */
export const MULTIPLE_ANSWERS_INSTRUCTION = 'Coche la ou les bonnes réponses.';

/**
 * Get feedback message for a constraint violation
 *
 * @param constraintId - The violated constraint
 * @param isMultiple - Whether the question has multiple answers
 * @returns French feedback message
 */
export function getConstraintFeedback(
	constraintId: ConstraintId,
	isMultiple: boolean = false
): string {
	return CONSTRAINT_FEEDBACK[constraintId][isMultiple ? 'multiple' : 'single'];
}
