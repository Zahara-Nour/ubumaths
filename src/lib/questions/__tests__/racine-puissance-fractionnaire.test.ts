/**
 * Une racine écrite en puissance fractionnaire n'est pas une réponse fausse.
 *
 * Mesuré sur `main` à `6b773b4c3` : pour l'attendu `\frac{1}{2\sqrt{x}}`
 * (dérivée de `√x`), `\frac{1}{2}x^{-\frac12}` et `0.5x^{-0.5}` étaient
 * comptés `incorrect`. C'est la même valeur sous une autre écriture : au pire
 * une mauvaise forme. Correctif dans `mathAST/normal/rules/fractional-power.ts`.
 */
import { describe, it, expect } from 'vitest';
import { runAllTestSpecs } from '$lib/questions/test-spec-runner';
import type { QuestionTemplate } from '$lib/questions/types';

function verdicts(expected: string, answers: string[]): Record<string, string> {
	const template = {
		id: 'racine-puissance-fractionnaire',
		type: 'fill_in_blanks',
		title: 't',
		grades: ['1_SPE'],
		theme: 'T',
		domain: 'D',
		level: 1,
		delay: 20,
		status: 'draft',
		variations: [{ statement: "$f'(x)=?$", blanks: [{ expectedAnswer: expected }] }],
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

describe('racine écrite en puissance fractionnaire', () => {
	it('attendu \\frac{1}{2\\sqrt{x}} : les puissances fractionnaires sont de mauvaise forme, pas fausses', () => {
		const result = verdicts('\\frac{1}{2\\sqrt{x}}', [
			'\\frac{1}{2\\sqrt{x}}',
			'\\frac{1}{2}x^{-\\frac12}',
			'0.5x^{-0.5}'
		]);
		// `bad_form` : même valeur, autre écriture que la forme attendue.
		expect(result).toEqual({
			'\\frac{1}{2\\sqrt{x}}': 'correct',
			'\\frac{1}{2}x^{-\\frac12}': 'bad_form',
			'0.5x^{-0.5}': 'bad_form'
		});
	});

	it('une valeur fausse reste fausse', () => {
		expect(
			verdicts('\\frac{1}{2\\sqrt{x}}', ['x^{-\\frac12}', '\\frac{1}{2}x^{\\frac12}'])
		).toEqual({
			'x^{-\\frac12}': 'incorrect',
			'\\frac{1}{2}x^{\\frac12}': 'incorrect'
		});
	});
});
