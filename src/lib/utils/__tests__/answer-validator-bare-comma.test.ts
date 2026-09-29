/**
 * Virgule décimale NUE dans une case (`3,14` collé ou tapé au clavier
 * physique, sans les accolades de MathLive) : même verdict que `3{,}14`.
 */

import { describe, it, expect } from 'vitest';
import { validateAnswer } from '../answer-validator';
import type { InstanceBlank, QuestionInstance } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';

function check(answer: string, blank: InstanceBlank) {
	const instance: QuestionInstance = {
		templateId: 'test-bare-comma',
		statement: 'Test' as ResolvedMarkdown,
		blanks: [blank],
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: new Date().toISOString(),
		resolvedVariables: [{ name: 'n', value: '10' }]
	};
	return validateAnswer([answer], instance, [answer]);
}

const HUNDREDTH: InstanceBlank = {
	expectedAnswer: '3.14159',
	type: 'math',
	precision: { type: 'decimal', digits: 2 }
};

describe('virgule nue — arrondi (`precision`)', () => {
	it('3,14 au centième → juste', () => {
		const result = check('3,14', HUNDREDTH);
		expect(result.isCorrect).toBe(true);
		expect(result.status).toBe('correct');
	});

	it('3,14159 au centième → « Arrondis au centième. »', () => {
		const result = check('3,14159', HUNDREDTH);
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe('Arrondis au centième.');
	});

	it('1\\,200,5 au dixième → juste', () => {
		const blank: InstanceBlank = {
			expectedAnswer: '1200.48',
			type: 'math',
			precision: { type: 'decimal', digits: 1 }
		};
		expect(check('1\\,200,5', blank).isCorrect).toBe(true);
	});
});

describe('virgule nue — règles (`rulesSuffice`)', () => {
	const blank: InstanceBlank = {
		expectedAnswer: '2.5',
		type: 'math',
		validationRules: [{ type: 'custom', expression: 'answer < {{n}}' }],
		rulesSuffice: true
	};

	it('2,5 < 10 → juste', () => {
		const result = check('2,5', blank);
		expect(result.isCorrect).toBe(true);
		expect(result.status).toBe('correct');
	});

	it('12,5 ≥ 10 → faux (la règle, pas la forme)', () => {
		const result = check('12,5', blank);
		expect(result.isCorrect).toBe(false);
		expect(result.status).not.toBe('bad_form');
	});
});

describe('virgule nue — grandeur', () => {
	it('12,5\\unit{cm} pour 12,5 cm → juste', () => {
		const result = check('12,5\\unit{cm}', {
			expectedAnswer: '12.5\\unit{cm}',
			type: 'math',
			unit: { expected: true }
		});
		expect(result.isCorrect).toBe(true);
		expect(result.status).toBe('correct');
	});
});

describe('virgule nue — équivalence simple', () => {
	it('-0,5 pour -0.5 → juste', () => {
		expect(check('-0,5', { expectedAnswer: '-0.5', type: 'math' }).isCorrect).toBe(true);
	});

	it('le couple (3,14) n’est pas le décimal 3,14', () => {
		expect(check('(3,14)', { expectedAnswer: '3.14', type: 'math' }).isCorrect).toBe(false);
	});
});
