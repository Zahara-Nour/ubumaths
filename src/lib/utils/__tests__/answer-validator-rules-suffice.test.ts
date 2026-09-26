/**
 * Mode « la règle suffit » (`rulesSuffice`)
 * =========================================
 *
 * Questions à plusieurs bonnes réponses (« Trouve un diviseur de 12, autre que
 * 1 et 12 ») : avec `rulesSuffice`, une réponse est juste si et seulement si
 * elle respecte toutes les règles ; `expectedAnswer` n'est plus qu'un exemple.
 * Sans le mode, rien ne change : les règles restent une pré-condition.
 */

import { describe, it, expect } from 'vitest';
import { isBlankValueCorrect, validateAnswer } from '../answer-validator';
import type { InstanceBlank, QuestionInstance, ValidationRule } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';

// ============================================================================
// HELPERS
// ============================================================================

/** Règles de « Trouve un diviseur de a×b (autre que 1 et a×b) » */
const DIVISOR_RULES: ValidationRule[] = [
	{ type: 'divisor', dividend: '{{a}}*{{b}}' },
	{ type: 'custom', expression: 'answer != 1' },
	{ type: 'custom', expression: 'answer != {{a}}*{{b}}' }
];

function createInstance(blanks: InstanceBlank[]): QuestionInstance {
	return {
		templateId: 'test-rules-suffice',
		statement: 'Trouve un diviseur de 12' as ResolvedMarkdown,
		blanks,
		grades: ['6'],
		theme: 'Entiers',
		domain: 'Diviser',
		level: 1,
		generatedAt: new Date().toISOString(),
		resolvedVariables: [
			{ name: 'a', value: '3' },
			{ name: 'b', value: '4' }
		]
	};
}

function divisorBlank(overrides?: Partial<InstanceBlank>): InstanceBlank {
	return {
		expectedAnswer: '2',
		type: 'math',
		validationRules: DIVISOR_RULES,
		rulesSuffice: true,
		...overrides
	};
}

function check(answer: string, blank: InstanceBlank = divisorBlank(), latex = answer) {
	return validateAnswer([answer], createInstance([blank]), [latex]);
}

// ============================================================================
// NOMINAL
// ============================================================================

describe('rulesSuffice — cas nominal', () => {
	it('accepte la réponse tirée', () => {
		expect(check('2')).toMatchObject({ isCorrect: true, status: 'correct' });
	});

	it.each(['3', '4', '6'])('accepte un autre diviseur juste : %s', (answer) => {
		expect(check(answer)).toMatchObject({ isCorrect: true, status: 'correct' });
	});

	it('refuse un non-diviseur, sans message technique en anglais', () => {
		const verdict = check('5');
		expect(verdict.isCorrect).toBe(false);
		expect(verdict.feedback ?? '').not.toMatch(/divide/);
		expect(verdict.blankFeedback ?? []).not.toContainEqual(expect.stringMatching(/divide/));
	});
});

// ============================================================================
// LIMITES
// ============================================================================

describe('rulesSuffice — cas limites', () => {
	it.each(['1', '12'])('refuse une valeur exclue : %s', (answer) => {
		expect(check(answer).isCorrect).toBe(false);
	});

	it('juge la forme : 6 écrit 12/2 est une forme incorrecte', () => {
		expect(check('12/2', divisorBlank(), '\\frac{12}{2}')).toMatchObject({
			isCorrect: false,
			status: 'bad_form'
		});
	});

	it('sans le mode, seule la réponse tirée est juste (comportement inchangé)', () => {
		const blank = divisorBlank({ rulesSuffice: undefined });
		expect(check('2', blank).isCorrect).toBe(true);
		expect(check('3', blank).isCorrect).toBe(false);
	});

	it('sans le mode, 12/2 garde le verdict historique de la règle (non-régression)', () => {
		const blank = divisorBlank({ rulesSuffice: undefined });
		const verdict = check('12/2', blank, '\\frac{12}{2}');
		expect(verdict.isCorrect).toBe(false);
		// `Number('12/2')` = NaN → la règle échoue, comme avant ce correctif
		expect(verdict.feedback).toBe('Invalid numeric answer');
	});

	it('case texte : le mode est ignoré (comparaison à la réponse attendue)', () => {
		// 3 passe la règle de divisibilité : refusé parce que comparé à « deux »
		const blank = divisorBlank({ type: 'text', expectedAnswer: 'deux' });
		expect(check('3', blank).isCorrect).toBe(false);
	});

	it('case avec unité : le mode est ignoré (comparaison à la réponse attendue)', () => {
		const blank = divisorBlank({ unit: { expected: true } });
		expect(check('3', blank).isCorrect).toBe(false);
	});

	it('avec le mode mais sans aucune règle, ne devient jamais « tout est juste »', () => {
		const blank = divisorBlank({ validationRules: undefined });
		expect(check('2', blank).isCorrect).toBe(true);
		expect(check('7', blank).isCorrect).toBe(false);
	});
});

// ============================================================================
// ERREURS
// ============================================================================

describe('rulesSuffice — cas d’erreur', () => {
	it('case vide → empty', () => {
		expect(check('')).toMatchObject({ isCorrect: false, status: 'empty' });
	});

	it('réponse non numérique → incorrecte, sans exception', () => {
		expect(() => check('abc')).not.toThrow();
		expect(check('abc').isCorrect).toBe(false);
	});

	it('règle qui référence une variable absente → incorrecte, sans exception', () => {
		const blank = divisorBlank({
			validationRules: [{ type: 'divisor', dividend: '{{inconnue}}' }]
		});
		expect(() => check('3', blank)).not.toThrow();
		expect(check('3', blank).isCorrect).toBe(false);
	});
});

// ============================================================================
// ORDRE INDIFFÉRENT ET VERDICT PAR CASE
// ============================================================================

describe('rulesSuffice — autres chemins', () => {
	it('ordre indifférent : chaque case est jugée par ses règles', () => {
		const instance = {
			...createInstance([divisorBlank(), divisorBlank({ expectedAnswer: '3' })]),
			options: { orderIndependent: true }
		};
		expect(validateAnswer(['4', '6'], instance, ['4', '6']).isCorrect).toBe(true);
		expect(validateAnswer(['4', '5'], instance, ['4', '5']).isCorrect).toBe(false);
	});

	it('isBlankValueCorrect suit le même verdict que validateAnswer', () => {
		const instance = createInstance([divisorBlank()]);
		expect(isBlankValueCorrect('6', instance.blanks![0], instance)).toBe(true);
		expect(isBlankValueCorrect('5', instance.blanks![0], instance)).toBe(false);
		expect(isBlankValueCorrect('1', instance.blanks![0], instance)).toBe(false);
	});
});
