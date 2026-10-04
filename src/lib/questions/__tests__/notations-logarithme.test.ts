/**
 * Logarithme d'une puissance (défaut validé par David, 2026-10-04)
 *
 * `\ln 9` et `2\ln 3` écrivent le même nombre sous la même forme : `\ln(a^k)` et
 * `k\ln a` sont deux notations, pas deux formes (sœur des règles du monôme
 * fractionnaire et des angles en π). Couvert : argument entier puissance parfaite
 * (`\ln 8` = `3\ln 2`), puissance écrite (`\ln(3^2)`), inverse (`\ln\frac{1}{2}` =
 * `-\ln 2`), racine (`\ln\sqrt{3}` = `\frac{1}{2}\ln 3`), avec un coefficient
 * entier ou fractionnaire (`3\ln 4` = `\ln 64` = `6\ln 2`).
 * Exclus (gardent leur jugement) : `\ln(ab)` / `\ln a+\ln b`, `\ln\frac{a}{b}` /
 * `\ln a-\ln b` (a ≠ 1), `\frac{\ln 3}{2}`, `\ln e^2`, un produit explicite.
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
		id: 'notations-logarithme',
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

describe('ln d’une puissance et multiple d’un ln : même forme', () => {
	it.each([
		['\\ln 9', '2\\ln 3'],
		['2\\ln(3)', '\\ln(9)'],
		['\\ln(8)', '3\\ln(2)'],
		['3\\ln 2', '\\ln 8'],
		['\\ln\\frac{1}{2}', '-\\ln 2'],
		['-\\ln(2)', '\\ln\\left(\\frac{1}{2}\\right)'],
		['\\ln(3^2)', '2\\ln 3'],
		['3\\ln(4)', '\\ln(64)'],
		['3\\ln(4)', '6\\ln 2'],
		['-2\\ln 3', '\\ln\\frac{1}{9}'],
		['\\ln 9+1', '2\\ln 3+1'],
		['x\\ln 4', 'x\\ln 4']
	])('attendue %s : %s est juste', (expected, answer) => {
		expect(verdicts(expected, [answer])).toEqual({ [answer]: 'correct' });
	});
});

describe('racine : la forme est unifiée, la VALEUR ne l’est pas encore', () => {
	// `areEquivalent` ne relie pas \ln\sqrt{3} et \frac{1}{2}\ln 3 (verdict « faux » avant
	// comme après cette règle, hors périmètre : ni simplify ni la valeur ne sont touchés).
	// La règle de forme les écrit déjà pareil : ces cas passeront le jour où la valeur suivra.
	it('comparaison de forme seule : même forme', () => {
		expect(checkForm('\\ln\\sqrt{3}', '\\frac{1}{2}\\ln 3', {}).status).toBe('correct');
		expect(checkForm('\\frac{1}{2}\\ln 3', '\\ln\\sqrt{3}', {}).status).toBe('correct');
		expect(checkForm('\\ln\\sqrt[3]{4}', '\\frac{2}{3}\\ln 2', {}).status).toBe('correct');
	});

	it.fails.each([
		['\\ln\\sqrt{3}', '\\frac{1}{2}\\ln 3'],
		['\\frac{1}{2}\\ln(3)', '\\ln\\sqrt{3}']
	])('attendue %s : %s est juste', (expected, answer) => {
		expect(verdicts(expected, [answer])).toEqual({ [answer]: 'correct' });
	});
});

describe('la forme reste exigée', () => {
	it('ln d’un produit ou d’un quotient : hors règle', () => {
		expect(verdicts('\\ln 6', ['\\ln 2+\\ln 3'])).toEqual({ '\\ln 2+\\ln 3': 'bad_form' });
		expect(verdicts('\\ln(4)-\\ln(3)', ['\\ln\\frac{4}{3}'])).toEqual({
			'\\ln\\frac{4}{3}': 'bad_form'
		});
	});

	it('somme de ln non réduite : mauvaise forme', () => {
		expect(verdicts('2\\ln 3', ['\\ln 3+\\ln 3'])).toEqual({ '\\ln 3+\\ln 3': 'bad_form' });
	});

	it('coefficient fractionnaire simplifiable : toujours signalé', () => {
		expect(verdicts('\\frac{1}{2}\\ln 3', ['\\frac{2}{4}\\ln 3'])).toEqual({
			'\\frac{2}{4}\\ln 3': 'unoptimal_form'
		});
	});

	it('forme imposée (requiredForm) : la règle ne s’applique pas', () => {
		const product: RequiredForm = { pattern: 'u*ln(v)' };
		const result = verdicts('2\\ln 3', ['\\ln 9', '2\\ln 3'], product);
		expect(result['2\\ln 3']).toBe('correct');
		expect(result['\\ln 9']).not.toBe('correct');
	});

	it('une valeur fausse reste fausse', () => {
		expect(verdicts('\\ln 9', ['3\\ln 2', '\\ln 3'])).toEqual({
			'3\\ln 2': 'incorrect',
			'\\ln 3': 'incorrect'
		});
	});
});
