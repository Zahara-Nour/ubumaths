/**
 * Couleur de chaque case après soumission (FlashCard).
 *
 * Une case en `rulesSuffice` est jugée par le validateur : « 6 » est juste
 * pour « un diviseur de 12 » même si la réponse tirée était « 2 ». Toute case
 * prend le verdict détaillé du validateur (celui du verso).
 */

import { describe, it, expect } from 'vitest';
import { computeBlankColors, computeBlankVerdicts } from '../blank-verdicts';
import type { InstanceBlank, QuestionInstance } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';

function instance(blanks: InstanceBlank[]): QuestionInstance {
	return {
		templateId: 'test',
		statement: 'Trouve un diviseur de 12' as ResolvedMarkdown,
		blanks,
		grades: ['6'],
		theme: 'Entiers',
		domain: 'Diviser',
		level: 1,
		generatedAt: new Date().toISOString(),
		resolvedVariables: [{ name: 'n', value: '12' }]
	};
}

const ruleBlank: InstanceBlank = {
	expectedAnswer: '2',
	type: 'math',
	rulesSuffice: true,
	validationRules: [
		{ type: 'divisor', dividend: '{{n}}' },
		{ type: 'custom', expression: 'answer != 1' }
	]
};

describe('computeBlankVerdicts', () => {
	it('rulesSuffice : une autre bonne réponse est verte', () => {
		expect(computeBlankVerdicts(['6'], instance([ruleBlank]))).toEqual([true]);
	});

	it('rulesSuffice : une réponse exclue ou fausse est rouge', () => {
		expect(computeBlankVerdicts(['1'], instance([ruleBlank]))).toEqual([false]);
		expect(computeBlankVerdicts(['5'], instance([ruleBlank]))).toEqual([false]);
	});

	it('case ordinaire : verdict du validateur (casse et espaces tolérés en texte)', () => {
		const plain: InstanceBlank = { expectedAnswer: 'Entier', type: 'text' };
		expect(computeBlankVerdicts([' entier '], instance([plain]))).toEqual([true]);
		expect(
			computeBlankVerdicts(['6'], instance([{ ...ruleBlank, rulesSuffice: undefined }]))
		).toEqual([false]);
	});

	it('pas de cases → tableau vide', () => {
		expect(computeBlankVerdicts([], { ...instance([]), blanks: undefined })).toEqual([]);
	});
});

// Relecture de #488 : une case `acceptDecimal` juge le décimal exact par sa valeur
describe('computeBlankVerdicts — acceptDecimal', () => {
	const decimalBlank: InstanceBlank = {
		expectedAnswer: '\\frac{1}{2}',
		type: 'math',
		acceptDecimal: true
	};

	it.each([
		['0{,}5', true],
		['0.5', true],
		['\\frac{1}{2}', true],
		['0{,}6', false]
	])('%s → %s', (value, expected) => {
		expect(computeBlankVerdicts([value], instance([decimalBlank]))).toEqual([expected]);
	});

	it('sans l’option : 0,5 pour ½ reste rouge', () => {
		const plain = { ...decimalBlank, acceptDecimal: undefined };
		expect(computeBlankVerdicts(['0{,}5'], instance([plain]))).toEqual([false]);
	});
});

// Le recto suit le verdict détaillé du verso (fin du chantier correction-cases-unite) :
// verte = juste, ambre = juste perfectible, rouge = le reste
describe('computeBlankColors — même verdict que le verso', () => {
	const colors = (value: string, blank: InstanceBlank) => {
		const { verdicts, unoptimal } = computeBlankColors([value], instance([blank]), [value]);
		return verdicts[0] ? (unoptimal[0] ? 'ambre' : 'verte') : 'rouge';
	};

	const unitBlank: InstanceBlank = {
		expectedAnswer: '6[m]',
		type: 'math',
		unit: { expected: true }
	};
	it.each([
		['6\\operatorname{\\mathrm{m}}', 'verte'],
		['6 m', 'verte'],
		['600\\operatorname{\\mathrm{cm}}', 'verte'],
		['7\\operatorname{\\mathrm{m}}', 'rouge'],
		['6', 'rouge'],
		['2\\times3\\operatorname{\\mathrm{m}}', 'rouge']
	])('case à unité 6 m : %s → %s', (value, expected) => {
		expect(colors(value, unitBlank)).toBe(expected);
	});

	const roundedBlank: InstanceBlank = {
		expectedAnswer: '3{,}1',
		type: 'math',
		precision: { type: 'decimal', digits: 1 }
	};
	it.each([
		['3{,}1', 'verte'],
		['3.1', 'verte'],
		['(3{,}1)', 'ambre'],
		['3{,}14', 'rouge'],
		['3{,}2', 'rouge']
	])('case arrondie au dixième 3,1 : %s → %s', (value, expected) => {
		expect(colors(value, roundedBlank)).toBe(expected);
	});

	const exactBlank: InstanceBlank = { expectedAnswer: '\\frac{1}{2}', type: 'math' };
	it.each([
		['\\frac{1}{2}', 'verte'],
		['\\dfrac{1}{2}', 'verte'],
		['\\frac{2}{4}', 'ambre'],
		['\\frac{1}{3}', 'rouge']
	])('case exacte ½ : %s → %s', (value, expected) => {
		expect(colors(value, exactBlank)).toBe(expected);
	});

	it('orderIndependent : deux réponses justes inversées sont vertes', () => {
		const inst = {
			...instance([
				{ expectedAnswer: '2', type: 'math' },
				{ expectedAnswer: '3', type: 'math' }
			]),
			options: { orderIndependent: true }
		} as QuestionInstance;
		expect(computeBlankColors(['3', '2'], inst).verdicts).toEqual([true, true]);
	});
});
