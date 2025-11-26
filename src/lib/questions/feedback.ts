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
	}
} as const;

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
