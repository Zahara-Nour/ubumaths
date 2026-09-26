/**
 * Couleur de chaque case après soumission (FlashCard).
 *
 * Une case en `rulesSuffice` est jugée par le validateur : « 6 » est juste
 * pour « un diviseur de 12 » même si la réponse tirée était « 2 ». Les autres
 * cases gardent la comparaison textuelle d'avant (comportement inchangé).
 */

import { describe, it, expect } from 'vitest';
import { computeBlankVerdicts } from '../blank-verdicts';
import { hasRulesSufficeBlank } from '$lib/questions/rules-suffice';
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

	it('case ordinaire : comparaison textuelle inchangée', () => {
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

describe('hasRulesSufficeBlank (titre « Une réponse possible »)', () => {
	it('vrai pour une case en rulesSuffice avec règles', () => {
		expect(hasRulesSufficeBlank(instance([ruleBlank]))).toBe(true);
	});

	it('faux sans règle : le validateur ignore alors le mode', () => {
		expect(hasRulesSufficeBlank(instance([{ ...ruleBlank, validationRules: undefined }]))).toBe(
			false
		);
	});

	it('faux pour une case texte ou avec unité', () => {
		expect(hasRulesSufficeBlank(instance([{ ...ruleBlank, type: 'text' }]))).toBe(false);
		expect(hasRulesSufficeBlank(instance([{ ...ruleBlank, unit: { expected: true } }]))).toBe(
			false
		);
	});
});
