/**
 * Nombres complexes dans une réponse d'élève (points validés par David le 2026-10-05,
 * constatés par sondes sur les cartes de maths expertes).
 *
 * Chaque bloc fige un point : notation `\imaginaryI`, formes algébriques
 * équivalentes, formule d'Euler, argument modulo 2π, ensemble fini de complexes.
 */
import { describe, it, expect } from 'vitest';
import { runAllTestSpecs } from '$lib/questions/test-spec-runner';
import type { QuestionTemplate } from '$lib/questions/types';

function verdicts(
	expected: string,
	answers: string[],
	blankOptions: Record<string, unknown> = {}
): Record<string, string> {
	const template = {
		id: 'complexes',
		type: 'fill_in_blanks',
		title: 't',
		grades: ['T_EXP'],
		theme: 'T',
		domain: 'D',
		level: 1,
		delay: 20,
		status: 'draft',
		variations: [{ statement: '$z=?$', blanks: [{ expectedAnswer: expected, ...blankOptions }] }],
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
			r.error && r.actual.status === 'incorrect' && !r.passed && r.error.startsWith('Réponse')
				? `erreur : ${r.error}`
				: r.actual.status
		])
	);
}

describe('\\imaginaryI (MathLive) : même notation que i', () => {
	it('2-3\\imaginaryI juste pour 2-3i, comme \\mathrm{i}', () => {
		expect(verdicts('2-3i', ['2-3\\imaginaryI', '2-3\\mathrm{i}', '2-3i'])).toEqual({
			'2-3\\imaginaryI': 'correct',
			'2-3\\mathrm{i}': 'correct',
			'2-3i': 'correct'
		});
	});

	it('attendue écrite \\imaginaryI : i juste ; valeur fausse reste fausse', () => {
		expect(
			verdicts('1+\\imaginaryI\\sqrt{3}', ['1+i\\sqrt{3}', '1-\\imaginaryI\\sqrt{3}'])
		).toEqual({
			'1+i\\sqrt{3}': 'correct',
			'1-\\imaginaryI\\sqrt{3}': 'incorrect'
		});
	});

	it('\\imaginaryI seul juste pour i', () => {
		expect(verdicts('i', ['\\imaginaryI'])).toEqual({ '\\imaginaryI': 'correct' });
	});
});
