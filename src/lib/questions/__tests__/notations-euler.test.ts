/**
 * Notations du nombre e dans une réponse (décision de David du 2026-10-02)
 *
 * `e^{x}`, `\exponentialE^{x}` (MathLive), `\mathrm{e}^{x}` (e droit) et `\exp(x)`
 * (notation du programme) désignent la même fonction : même valeur ET même forme.
 * Avant : `\exponentialE` et `\exp` comptés « mauvaise forme », `\mathrm{e}` faux
 * (`\mathrm` inconnu du parseur).
 */
import { describe, it, expect } from 'vitest';
import { runAllTestSpecs } from '$lib/questions/test-spec-runner';
import { parseLatex } from '$lib/mathAST';
import type { QuestionTemplate } from '$lib/questions/types';

function verdicts(expected: string, answers: string[]): Record<string, string> {
	const template = {
		id: 'notations-euler',
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

describe('notations du nombre e : même valeur, même forme', () => {
	it('e^{3x} attendu : \\exp(3x), \\exponentialE^{3x}, \\mathrm{e}^{3x} sont justes', () => {
		expect(
			verdicts('e^{3x}', ['e^{3x}', '\\exp(3x)', '\\exponentialE^{3x}', '\\mathrm{e}^{3x}'])
		).toEqual({
			'e^{3x}': 'correct',
			'\\exp(3x)': 'correct',
			'\\exponentialE^{3x}': 'correct',
			'\\mathrm{e}^{3x}': 'correct'
		});
	});

	it('produit avec un coefficient : 3\\exp(3x) juste pour 3e^{3x}', () => {
		expect(verdicts('3e^{3x}', ['3\\exp(3x)', '3\\mathrm{e}^{3x}'])).toEqual({
			'3\\exp(3x)': 'correct',
			'3\\mathrm{e}^{3x}': 'correct'
		});
	});

	it('attendu écrit \\exp : e^{3x} juste', () => {
		expect(verdicts('\\exp(3x)', ['e^{3x}'])).toEqual({ 'e^{3x}': 'correct' });
	});

	it('la forme reste exigée : produit non réduit et e^0 toujours refusés', () => {
		expect(verdicts('e^{3x}', ['\\exp(x)\\times\\exp(2x)', 'e^{x}\\times e^{2x}'])).toEqual({
			'\\exp(x)\\times\\exp(2x)': 'bad_form',
			'e^{x}\\times e^{2x}': 'bad_form'
		});
		expect(verdicts('1', ['\\mathrm{e}^{0}'])).toEqual({ '\\mathrm{e}^{0}': 'bad_form' });
	});

	it('une valeur fausse reste fausse', () => {
		expect(verdicts('e^{3x}', ['\\exp(2x)', '\\mathrm{e}^{2x}'])).toEqual({
			'\\exp(2x)': 'incorrect',
			'\\mathrm{e}^{2x}': 'incorrect'
		});
	});
});

describe('parseur : lettre droite \\mathrm{x}', () => {
	it('\\mathrm{e} se lit comme la lettre e', () => {
		expect(parseLatex('\\mathrm{e}^{x}')).toEqual(parseLatex('e^{x}'));
		expect(parseLatex('\\mathrm e')).toEqual(parseLatex('e'));
	});
});
