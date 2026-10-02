/**
 * Verdict du moteur de questions (runAllTestSpecs) pour une case unique :
 * énoncé, attendu, réponses → statut de chaque réponse.
 */
import { runAllTestSpecs } from '$lib/questions/test-spec-runner';
import type { QuestionTemplate } from '$lib/questions/types';

export interface SpecVerdict {
	status: string;
	violations: string[];
}

export function specVerdicts(
	statement: string,
	expected: string,
	answers: string[]
): Record<string, SpecVerdict> {
	const template = {
		id: 'spec-verdicts',
		type: 'fill_in_blanks',
		title: 't',
		grades: ['1_SPE'],
		theme: 'T',
		domain: 'D',
		level: 1,
		delay: 20,
		status: 'draft',
		variations: [{ statement, blanks: [{ expectedAnswer: expected }] }],
		testSpecs: answers.map((answer) => ({
			answers: [answer],
			expected: { status: 'correct' },
			description: answer,
			variationIndex: 0
		}))
	} as unknown as QuestionTemplate;
	return Object.fromEntries(
		runAllTestSpecs(template).map((r) => [
			r.spec.description,
			{
				status: r.actual?.status ?? 'erreur',
				violations: [...(r.actual?.constraintViolations ?? [])]
			}
		])
	);
}
