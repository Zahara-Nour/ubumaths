/**
 * Coefficient fractionnaire d'un monôme (défaut validé par David, 2026-10-04)
 *
 * `\frac{x^3}{3}` et `\frac{1}{3}x^3` écrivent le même monôme : ce sont deux notations,
 * pas deux formes. Avant : l'une était « pas sous la forme demandée » quand l'autre
 * était attendue. Même chose pour le signe placé au numérateur (`\frac{-x^2}{4}`).
 * Restent jugées : une fraction simplifiable (perfectible, comme `\frac{2\pi}{6}`), une
 * somme non réduite, un produit explicite, une parenthèse (`\frac{1}{3}(x+1)`).
 * Sœur de la décision du 2026-10-02 sur les angles en π (notations-angle.test.ts).
 */
import { describe, it, expect } from 'vitest';
import { runAllTestSpecs } from '$lib/questions/test-spec-runner';
import type { QuestionTemplate } from '$lib/questions/types';

function verdicts(expected: string, answers: string[]): Record<string, string> {
	const template = {
		id: 'notations-fraction-monome',
		type: 'fill_in_blanks',
		title: 't',
		grades: ['T_SPE'],
		theme: 'T',
		domain: 'D',
		level: 1,
		delay: 20,
		status: 'draft',
		variations: [{ statement: '$F(x)=?$', blanks: [{ expectedAnswer: expected }] }],
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

describe('coefficient fractionnaire d’un monôme : même valeur, même forme', () => {
	it.each([
		['\\frac{1}{3}x^3', '\\frac{x^3}{3}'],
		['\\frac{x^3}{3}', '\\frac{1}{3}x^3'],
		['\\frac{2}{5}x', '\\frac{2x}{5}'],
		['\\frac{2x}{5}', '\\frac{2}{5}x'],
		['-\\frac{1}{4}x^2', '\\frac{-x^2}{4}'],
		['-\\frac{1}{4}x^2', '-\\frac{x^2}{4}'],
		['\\frac{-x^2}{4}', '-\\frac{1}{4}x^2'],
		['-\\frac{3}{4}x', '\\frac{-3x}{4}'],
		['\\frac{3}{2}e^{x}', '\\frac{3e^{x}}{2}'],
		['\\frac{3e^{x}}{2}', '\\frac{3}{2}e^{x}'],
		['\\frac{1}{3}x^3+x', '\\frac{x^3}{3}+x'],
		['\\frac{x^3}{3}-\\frac{x^2}{2}', '\\frac{1}{3}x^3-\\frac{1}{2}x^2']
	])('attendue %s : %s est juste', (expected, answer) => {
		expect(verdicts(expected, [answer])).toEqual({ [answer]: 'correct' });
	});
});

describe('la forme reste exigée', () => {
	it('fraction simplifiable : perfectible, comme \\frac{2\\pi}{6}', () => {
		expect(verdicts('\\frac{1}{2}x', ['\\frac{2x}{4}', '\\frac{2}{4}x'])).toEqual({
			'\\frac{2x}{4}': 'unoptimal_form',
			'\\frac{2}{4}x': 'unoptimal_form'
		});
	});

	it('somme non réduite, parenthèse, produit explicite : mauvaise forme', () => {
		expect(verdicts('\\frac{2}{3}x', ['\\frac{x}{3}+\\frac{x}{3}'])).toEqual({
			'\\frac{x}{3}+\\frac{x}{3}': 'bad_form'
		});
		expect(verdicts('\\frac{x+1}{3}', ['\\frac{1}{3}(x+1)'])).toEqual({
			'\\frac{1}{3}(x+1)': 'bad_form'
		});
	});

	it('une valeur fausse reste fausse', () => {
		expect(verdicts('\\frac{1}{3}x^3', ['\\frac{x^3}{2}', '\\frac{-x^3}{3}'])).toEqual({
			'\\frac{x^3}{2}': 'incorrect',
			'\\frac{-x^3}{3}': 'incorrect'
		});
	});
});
