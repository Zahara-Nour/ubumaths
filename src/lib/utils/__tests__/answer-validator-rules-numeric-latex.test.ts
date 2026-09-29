/**
 * Règles de validation HORS `rulesSuffice` : la réponse de l'élève arrive en
 * LaTeX MathLive (`2{,}5`, `12\,000`, `\frac{12}{2}`). La règle doit lire sa
 * valeur numérique, pas `Number(latex)` (NaN → « Ta réponse doit être un
 * nombre » alors que l'élève a bien tapé un nombre).
 */

import { describe, it, expect } from 'vitest';
import { validateAnswer } from '../answer-validator';
import type { InstanceBlank, QuestionInstance, ValidationRule } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';

const NOT_A_NUMBER = 'Ta réponse doit être un nombre.';

function createInstance(blanks: InstanceBlank[]): QuestionInstance {
	return {
		templateId: 'test-rules-numeric-latex',
		statement: 'Test' as ResolvedMarkdown,
		blanks,
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: new Date().toISOString(),
		resolvedVariables: [{ name: 'n', value: '12' }]
	};
}

function blank(expectedAnswer: string, validationRules: ValidationRule[]): InstanceBlank {
	return { expectedAnswer, type: 'math', validationRules };
}

describe('Règle hors rulesSuffice : valeur numérique du LaTeX', () => {
	it('décimal à virgule MathLive `2{,}5` dans un intervalle → juste', () => {
		const instance = createInstance([blank('2.5', [{ type: 'range', min: '2', max: '3' }])]);
		const result = validateAnswer(['2{,}5'], instance, ['2{,}5']);
		expect(result.feedback).not.toBe(NOT_A_NUMBER);
		expect(result.isCorrect).toBe(true);
	});

	it('séparateur de milliers `12\\,000` → la règle passe', () => {
		const instance = createInstance([
			blank('12000', [{ type: 'range', min: '10000', max: '20000' }])
		]);
		const result = validateAnswer(['12\\,000'], instance, ['12\\,000']);
		expect(result.feedback).not.toBe(NOT_A_NUMBER);
		expect(result.isCorrect).toBe(true);
	});

	it('`\\frac{12}{2}` vaut 6 pour la règle « diviseur de 12 » : même verdict que sans règle', () => {
		const withRule = createInstance([blank('6', [{ type: 'divisor', dividend: '{{n}}' }])]);
		const withoutRule = createInstance([blank('6', [])]);
		const result = validateAnswer(['\\frac{12}{2}'], withRule, ['\\frac{12}{2}']);
		const reference = validateAnswer(['\\frac{12}{2}'], withoutRule, ['\\frac{12}{2}']);
		expect(result.feedback).not.toBe(NOT_A_NUMBER);
		// La règle passe : le verdict est celui de la valeur et de la forme seules
		expect(result).toEqual(reference);
	});

	it('une vraie violation de règle garde son message : `2{,}5` n’est pas un entier', () => {
		const instance = createInstance([blank('6', [{ type: 'divisor', dividend: '{{n}}' }])]);
		const result = validateAnswer(['2{,}5'], instance, ['2{,}5']);
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe("2,5 n'est pas un nombre entier : un diviseur est un entier.");
	});
});
