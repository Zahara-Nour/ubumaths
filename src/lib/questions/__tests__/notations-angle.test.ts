/**
 * Notations d'un angle en π dans une réponse (décision de David du 2026-10-02)
 *
 * `\frac{1}{3}\pi`, `\pi/3`, `\frac{5}{6}\pi`, `5\frac{\pi}{6}` écrivent le même
 * angle que `\frac{\pi}{3}` ou `\frac{5\pi}{6}` : ce sont des notations, pas des
 * calculs inachevés. Avant : comptées « mauvaise forme ». Un produit explicite
 * (`\frac{\pi}{6}\times2`) et une fraction non réduite restent refusés.
 */
import { describe, it, expect } from 'vitest';
import { runAllTestSpecs } from '$lib/questions/test-spec-runner';
import type { QuestionTemplate } from '$lib/questions/types';

function verdicts(expected: string, answers: string[]): Record<string, string> {
	const template = {
		id: 'notations-angle',
		type: 'fill_in_blanks',
		title: 't',
		grades: ['1_SPE'],
		theme: 'T',
		domain: 'D',
		level: 1,
		delay: 20,
		status: 'draft',
		variations: [{ statement: '$y=?$', blanks: [{ expectedAnswer: expected }] }],
		testSpecs: answers.map((answer) => ({
			answers: [answer],
			expected: { status: 'correct' },
			description: answer,
			variationIndex: 0
		}))
	} as unknown as QuestionTemplate;
	return Object.fromEntries(
		runAllTestSpecs(template).map((r) => [r.spec.description, r.actual?.status ?? 'erreur'])
	);
}

describe('notations d’un angle en π : même valeur, même forme', () => {
	it('\\frac{\\pi}{3} attendu : \\frac{1}{3}\\pi et \\pi/3 sont justes', () => {
		expect(verdicts('\\frac{\\pi}{3}', ['\\frac{\\pi}{3}', '\\frac{1}{3}\\pi', '\\pi/3'])).toEqual({
			'\\frac{\\pi}{3}': 'correct',
			'\\frac{1}{3}\\pi': 'correct',
			'\\pi/3': 'correct'
		});
	});

	it('\\frac{5\\pi}{6} attendu : \\frac{5}{6}\\pi et 5\\frac{\\pi}{6} sont justes', () => {
		expect(verdicts('\\frac{5\\pi}{6}', ['\\frac{5}{6}\\pi', '5\\frac{\\pi}{6}'])).toEqual({
			'\\frac{5}{6}\\pi': 'correct',
			'5\\frac{\\pi}{6}': 'correct'
		});
	});

	it('angle négatif : -\\frac{1}{4}\\pi et \\frac{-\\pi}{4} sont justes', () => {
		expect(verdicts('-\\frac{\\pi}{4}', ['-\\frac{1}{4}\\pi', '\\frac{-\\pi}{4}'])).toEqual({
			'-\\frac{1}{4}\\pi': 'correct',
			'\\frac{-\\pi}{4}': 'correct'
		});
	});

	it('attendu écrit \\frac{5}{6}\\pi : \\frac{5\\pi}{6} juste', () => {
		expect(verdicts('\\frac{5}{6}\\pi', ['\\frac{5\\pi}{6}'])).toEqual({
			'\\frac{5\\pi}{6}': 'correct'
		});
	});

	it('la forme reste exigée : produit explicite et fraction non réduite refusés', () => {
		expect(
			verdicts('\\frac{\\pi}{3}', [
				'\\frac{\\pi}{6}\\times2',
				'\\frac{2\\pi}{6}',
				'\\frac{3\\pi}{9}',
				'\\frac{2}{6}\\pi'
			])
		).toEqual({
			'\\frac{\\pi}{6}\\times2': 'bad_form',
			'\\frac{2\\pi}{6}': 'unoptimal_form',
			'\\frac{3\\pi}{9}': 'unoptimal_form',
			'\\frac{2}{6}\\pi': 'unoptimal_form'
		});
	});

	it('une valeur fausse reste fausse', () => {
		expect(verdicts('\\frac{\\pi}{3}', ['\\frac{1}{6}\\pi', '\\pi/6', '2\\frac{\\pi}{3}'])).toEqual(
			{
				'\\frac{1}{6}\\pi': 'incorrect',
				'\\pi/6': 'incorrect',
				'2\\frac{\\pi}{3}': 'incorrect'
			}
		);
	});
});

describe('hors π', () => {
	// \\frac{1}{3}x : même notation que \\frac{x}{3} depuis le 2026-10-04
	// (notations-fraction-monome.test.ts) ; l'écriture en ligne x/3 garde son verdict
	it('\\frac{x}{3} attendu : \\frac{1}{3}x juste, x/3 mauvaise forme', () => {
		expect(verdicts('\\frac{x}{3}', ['\\frac{1}{3}x', 'x/3'])).toEqual({
			'\\frac{1}{3}x': 'correct',
			'x/3': 'bad_form'
		});
	});
});
