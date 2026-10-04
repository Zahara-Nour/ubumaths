/**
 * Inverse d'une exponentielle (décision de David, 2026-10-04)
 *
 * `\frac{1}{e^a}` et `e^{-a}` écrivent le même nombre sous la même forme : ce sont
 * deux notations, pas deux formes (sœur des règles du logarithme d'une puissance et
 * du monôme fractionnaire). De même `\frac{k}{e^a}` et `ke^{-a}`, `\frac{1}{e}` et
 * `e^{-1}`, avec un exposant entier, fractionnaire ou monôme (`\frac{1}{e^{2x}}`).
 * Exclus (gardent leur jugement) : écriture développée / combinée
 * (`\frac{e^3}{2}-\frac12` / `\frac{e^3-1}{2}`), quotient d'exponentielles
 * (`\frac{e^3}{e^5}` / `e^{-2}`, calcul non fait), dénominateur produit
 * (`\frac{1}{2e^3}`), exposant somme (`\frac{1}{e^{x+1}}`), forme imposée.
 */
import { describe, it, expect } from 'vitest';
import { runAllTestSpecs } from '$lib/questions/test-spec-runner';
import { checkForm } from '$lib/mathAST/cosmetic-transforms';
import type { QuestionTemplate, RequiredForm } from '$lib/questions/types';

function verdicts(
	expected: string,
	answers: string[],
	requiredForm?: RequiredForm
): Record<string, string> {
	const template = {
		id: 'notations-exponentielle-negative',
		type: 'fill_in_blanks',
		title: 't',
		grades: ['T_SPE'],
		theme: 'T',
		domain: 'D',
		level: 1,
		delay: 20,
		status: 'draft',
		variations: [
			{
				statement: '$I=?$',
				blanks: [{ expectedAnswer: expected, ...(requiredForm && { requiredForm }) }]
			}
		],
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

describe('inverse d’une exponentielle et exposant négatif : même forme', () => {
	it.each([
		['e^{-2}', '\\frac{1}{e^2}'],
		['\\frac{1}{e^2}', 'e^{-2}'],
		['e^{-1}', '\\frac{1}{e}'],
		['\\frac{1}{e}', 'e^{-1}'],
		['3e^{-2}', '\\frac{3}{e^2}'],
		['\\frac{3}{e^{2}}', '3e^{-2}'],
		['-3e^{-2}', '-\\frac{3}{e^2}'],
		['-\\frac{3}{e^2}', '-3e^{-2}'],
		['e^{-2x}', '\\frac{1}{e^{2x}}'],
		['\\frac{1}{e^{x}}', 'e^{-x}'],
		['e^{-\\frac{1}{2}}', '\\frac{1}{e^{\\frac{1}{2}}}'],
		['2-e^{-3}', '2-\\frac{1}{e^3}'],
		['\\frac{1}{e^2}', '\\exp(-2)']
	])('attendue %s : %s est juste', (expected, answer) => {
		expect(verdicts(expected, [answer])).toEqual({ [answer]: 'correct' });
	});

	it('comparaison de forme seule : même forme', () => {
		expect(checkForm('\\frac{1}{e^2}', 'e^{-2}', {}).status).toBe('correct');
		expect(checkForm('\\frac{5}{e^{3x}}', '5e^{-3x}', {}).status).toBe('correct');
	});
});

describe('la forme reste exigée', () => {
	it('écriture développée / combinée : deux formes', () => {
		expect(verdicts('\\frac{e^3-1}{2}', ['\\frac{e^3}{2}-\\frac{1}{2}'])).toEqual({
			'\\frac{e^3}{2}-\\frac{1}{2}': 'bad_form'
		});
	});

	it('quotient d’exponentielles : calcul non fait', () => {
		expect(verdicts('e^{-2}', ['\\frac{e^3}{e^5}'])).toEqual({ '\\frac{e^3}{e^5}': 'bad_form' });
	});

	it('dénominateur produit ou exposant somme : hors règle', () => {
		expect(checkForm('\\frac{1}{2e^3}', '\\frac{1}{2}e^{-3}', {}).status).toBe('bad_form');
		expect(checkForm('\\frac{1}{e^{x+1}}', 'e^{-x-1}', {}).status).toBe('bad_form');
	});

	it('forme imposée (requiredForm) : la règle ne s’applique pas', () => {
		const power: RequiredForm = { pattern: 'e^u' };
		const result = verdicts('e^{-2}', ['\\frac{1}{e^2}', 'e^{-2}'], power);
		expect(result['e^{-2}']).toBe('correct');
		expect(result['\\frac{1}{e^2}']).not.toBe('correct');
	});

	it('une valeur fausse reste fausse', () => {
		expect(verdicts('e^{-2}', ['\\frac{1}{e^3}', 'e^{2}'])).toEqual({
			'\\frac{1}{e^3}': 'incorrect',
			'e^{2}': 'incorrect'
		});
	});
});
