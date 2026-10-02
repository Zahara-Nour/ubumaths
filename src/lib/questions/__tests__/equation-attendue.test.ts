/**
 * Une case dont l'attendu est une ÉQUATION (`y=x+1`) : une écriture qui ne
 * diffère que par l'ordre des termes ou l'échange des membres est juste.
 *
 * Avant : `y=1+x` et `x+1=y` comptés `incorrect` — la relation était opaque
 * pour `areEquivalent`.
 */
import { describe, it, expect } from 'vitest';
import { runAllTestSpecs } from '$lib/questions/test-spec-runner';
import type { QuestionTemplate } from '$lib/questions/types';

function verdicts(expected: string, answers: string[]): Record<string, string> {
	const template = {
		id: 'equation-attendue',
		type: 'fill_in_blanks',
		title: 't',
		grades: ['2_GT'],
		theme: 'T',
		domain: 'D',
		level: 1,
		delay: 20,
		status: 'draft',
		variations: [{ statement: '$?$', blanks: [{ expectedAnswer: expected }] }],
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

describe('attendu y=x+1', () => {
	it('ordre des termes : juste', () => {
		expect(verdicts('y=x+1', ['y=x+1', 'y=1+x'])).toEqual({
			'y=x+1': 'correct',
			'y=1+x': 'correct'
		});
		expect(verdicts('y=2x-3', ['y=-3+2x'])).toEqual({ 'y=-3+2x': 'correct' });
	});

	// Membres échangés : la VALEUR est juste (plus `incorrect`), mais ce n'est
	// pas l'écriture « y = … » attendue, que la vérification de forme juge.
	it('membres échangés : bonne valeur, mauvaise forme', () => {
		expect(verdicts('y=x+1', ['x+1=y'])).toEqual({ 'x+1=y': 'bad_form' });
	});

	it('une autre droite reste fausse', () => {
		expect(verdicts('y=x+1', ['y=x+2', 'x=y+1'])).toEqual({
			'y=x+2': 'incorrect',
			'x=y+1': 'incorrect'
		});
	});
});
