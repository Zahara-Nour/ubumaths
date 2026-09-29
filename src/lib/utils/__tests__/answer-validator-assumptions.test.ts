/**
 * Hypothèses de l'énoncé (ADR 0012) — propagation dans la correction
 * ==================================================================
 *
 * `instance.options.answerAssumptions` (copié du modèle) doit atteindre CHAQUE
 * comparaison de valeur : case ordonnée, appariement `orderIndependent`, règle
 * `equivalent`. « Soit x > 0 » : `x^{a+b}` est juste pour `x^{a}x^{b}` ;
 * sans l'hypothèse, il reste faux (x = −1, a = 2, b = ½).
 */

import { describe, it, expect } from 'vitest';
import { isBlankValueCorrect, validateAlgebraic, validateAnswer } from '../answer-validator';
import { evaluateRule } from '$lib/questions/validation-rule-evaluator';
import type { InstanceBlank, QuestionInstance } from '$lib/questions/types';
import type { AnswerAssumptions } from '$lib/math';
import type { ResolvedMarkdown } from '$lib/ubumark';

// ============================================================================
// FIXTURES
// ============================================================================

const X_POSITIVE: AnswerAssumptions = { x: 'positive' };

function createInstance(
	blanks: InstanceBlank[],
	options: QuestionInstance['options'] = undefined
): QuestionInstance {
	return {
		templateId: 'test-assumptions',
		statement: 'Soit x > 0' as ResolvedMarkdown,
		blanks,
		grades: ['2'],
		theme: 'Algèbre',
		domain: 'Puissances',
		level: 1,
		generatedAt: new Date().toISOString(),
		options
	};
}

/** Forme « puissance » exigée : le contrôle de forme ne compare pas à l'attendu */
const productOfPowers: InstanceBlank = {
	expectedAnswer: 'x^{a}x^{b}',
	type: 'math',
	requiredForm: 'power'
};

// ============================================================================
// Case ordonnée
// ============================================================================

describe('case ordonnée : hypothèse transmise à areEquivalent', () => {
	it('valeur seule : juste avec x > 0, faux sans', () => {
		const withAssumption = createInstance([productOfPowers], { answerAssumptions: X_POSITIVE });
		const without = createInstance([productOfPowers]);
		expect(isBlankValueCorrect('x^{a+b}', productOfPowers, withAssumption)).toBe(true);
		expect(isBlankValueCorrect('x^{a+b}', productOfPowers, without)).toBe(false);
	});

	it('validateAnswer complet : correct avec x > 0, incorrect sans', () => {
		const withAssumption = createInstance([productOfPowers], { answerAssumptions: X_POSITIVE });
		const without = createInstance([productOfPowers]);
		expect(validateAnswer(['x^{a+b}'], withAssumption, ['x^{a+b}']).isCorrect).toBe(true);
		expect(validateAnswer(['x^{a+b}'], without, ['x^{a+b}']).isCorrect).toBe(false);
	});

	it('hypothèse sur une AUTRE variable : reste faux', () => {
		const instance = createInstance([productOfPowers], { answerAssumptions: { y: 'positive' } });
		expect(isBlankValueCorrect('x^{a+b}', productOfPowers, instance)).toBe(false);
	});

	it('hypothèse vraie, réponse fausse : reste faux (x^{ab})', () => {
		const instance = createInstance([productOfPowers], { answerAssumptions: X_POSITIVE });
		expect(isBlankValueCorrect('x^{ab}', productOfPowers, instance)).toBe(false);
	});
});

// ============================================================================
// orderIndependent
// ============================================================================

describe('orderIndependent : l’appariement voit l’hypothèse', () => {
	const other: InstanceBlank = { expectedAnswer: '4', type: 'math' };

	it('[4, x^{a+b}] : juste avec x > 0, faux sans', () => {
		const withAssumption = createInstance([productOfPowers, other], {
			orderIndependent: true,
			answerAssumptions: X_POSITIVE
		});
		const without = createInstance([productOfPowers, other], { orderIndependent: true });
		const answers = ['4', 'x^{a+b}'];
		expect(validateAnswer(answers, withAssumption, answers).isCorrect).toBe(true);
		expect(validateAnswer(answers, without, answers).isCorrect).toBe(false);
	});
});

// ============================================================================
// Règle `equivalent`
// ============================================================================

describe('règle equivalent : hypothèse transmise', () => {
	const rule = { type: 'equivalent' as const, expression: 'x^{a}x^{b}' };

	it('evaluateRule : valide avec l’hypothèse dans le contexte, invalide sans', () => {
		expect(
			evaluateRule(rule, { variables: {}, answer: 'x^{a+b}', assumptions: X_POSITIVE }).valid
		).toBe(true);
		expect(evaluateRule(rule, { variables: {}, answer: 'x^{a+b}' }).valid).toBe(false);
	});

	it('case à règle (rulesSuffice) : la correction transmet l’hypothèse de l’instance', () => {
		const blank: InstanceBlank = {
			expectedAnswer: 'x^{a}x^{b}',
			type: 'math',
			validationRules: [rule],
			rulesSuffice: true
		};
		const withAssumption = createInstance([blank], { answerAssumptions: X_POSITIVE });
		const without = createInstance([blank]);
		expect(isBlankValueCorrect('x^{a+b}', blank, withAssumption)).toBe(true);
		expect(isBlankValueCorrect('x^{a+b}', blank, without)).toBe(false);
	});
});

// ============================================================================
// validateAlgebraic (API exportée)
// ============================================================================

describe('validateAlgebraic', () => {
	it('accepte les hypothèses en option', () => {
		expect(validateAlgebraic('x^{a+b}', 'x^{a}x^{b}', X_POSITIVE).isCorrect).toBe(true);
		expect(validateAlgebraic('x^{a+b}', 'x^{a}x^{b}').isCorrect).toBe(false);
	});
});
