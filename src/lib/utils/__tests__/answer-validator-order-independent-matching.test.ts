/**
 * `orderIndependent` : l'appariement réponses ↔ cases doit trouver une
 * affectation valide s'il en existe une. L'ancien appariement glouton (chaque
 * réponse prend la première case libre qui l'accepte) pouvait « voler » la
 * seule case d'une autre réponse et refuser une copie juste.
 */

import { describe, it, expect } from 'vitest';
import { validateAnswer } from '../answer-validator';
import type { InstanceBlank, QuestionInstance } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';

function createInstance(blanks: InstanceBlank[]): QuestionInstance {
	return {
		templateId: 'test-order-independent-matching',
		statement: 'Test' as ResolvedMarkdown,
		blanks,
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: new Date().toISOString(),
		options: { orderIndependent: true },
		resolvedVariables: [{ name: 'n', value: '12' }]
	};
}

/** Case « un diviseur de 12 » : toute réponse qui respecte la règle est juste */
const anyDivisor: InstanceBlank = {
	expectedAnswer: '3',
	type: 'math',
	validationRules: [{ type: 'divisor', dividend: '{{n}}' }],
	rulesSuffice: true
};

/** Case qui attend exactement 2 */
const exactlyTwo: InstanceBlank = { expectedAnswer: '2', type: 'math' };

describe('orderIndependent : appariement complet (pas glouton)', () => {
	it('[2, 3] pour (diviseur de 12, 2) : 2 → case « 2 », 3 → case « diviseur » → juste', () => {
		const instance = createInstance([anyDivisor, exactlyTwo]);
		const result = validateAnswer(['2', '3'], instance, ['2', '3']);
		expect(result.isCorrect).toBe(true);
	});

	it('ordre des réponses inversé [3, 2] → juste aussi', () => {
		const instance = createInstance([anyDivisor, exactlyTwo]);
		expect(validateAnswer(['3', '2'], instance, ['3', '2']).isCorrect).toBe(true);
	});

	it('[4, 3] : aucune réponse ne vaut 2 → faux', () => {
		const instance = createInstance([anyDivisor, exactlyTwo]);
		expect(validateAnswer(['4', '3'], instance, ['4', '3']).isCorrect).toBe(false);
	});

	it('[2, 2] : une seule case peut prendre chaque 2 ; les deux cases acceptent 2 → juste', () => {
		const instance = createInstance([anyDivisor, exactlyTwo]);
		expect(validateAnswer(['2', '2'], instance, ['2', '2']).isCorrect).toBe(true);
	});

	it('trois cases, chaîne d’échanges : [2, 4, 6] pour (diviseur de 12, diviseur de 8, 2)', () => {
		const divisorOf8: InstanceBlank = {
			expectedAnswer: '4',
			type: 'math',
			validationRules: [{ type: 'divisor', dividend: '8' }],
			rulesSuffice: true
		};
		const instance = createInstance([anyDivisor, divisorOf8, exactlyTwo]);
		// Glouton : 2 → diviseur de 12, 4 → diviseur de 8, 6 → « 2 » échoue.
		// Affectation valide : 6 → diviseur de 12, 4 → diviseur de 8, 2 → « 2 ».
		expect(validateAnswer(['2', '4', '6'], instance, ['2', '4', '6']).isCorrect).toBe(true);
	});
});
