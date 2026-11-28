/**
 * Une distance écrite à l'envers avec une valeur absolue est juste (outil
 * n° 79, décision de David du 2026-11-28) : attendu `|x − 3|`, l'élève tape
 * `|3 − x|`. Avant : refusée (« pas écrite sous la forme demandée »), car ni
 * l'équivalence ni la comparaison d'écriture ne retournaient l'argument.
 */

import { describe, it, expect } from 'vitest';
import { validateAnswer } from '../answer-validator';
import { checkForm } from '#lib/mathAST/cosmetic-transforms.ts';
import type { InstanceBlank, QuestionInstance } from '#lib/questions/types.ts';
import type { ResolvedMarkdown } from '#lib/ubumark/index.ts';

function check(answer: string, expectedAnswer: string) {
	const blank: InstanceBlank = { expectedAnswer, type: 'math' };
	const instance: QuestionInstance = {
		templateId: 'test-valeur-absolue-opposee',
		statement: 'Test' as ResolvedMarkdown,
		blanks: [blank],
		grades: ['2'],
		level: 1,
		generatedAt: new Date().toISOString(),
		resolvedVariables: []
	};
	return validateAnswer([answer], instance, [answer]);
}

describe('case math : |u| pour |−u|', () => {
	it.each([
		['|3-x|', '|x-3|'],
		['\\left|3-x\\right|', '|x-3|'],
		['|x-3|', '|3-x|'],
		['|b-a|', '|a-b|'],
		['|-3x+2|', '|3x-2|'],
		['|2-3x|', '|3x-2|'],
		['|\\pi-x|', '|x-\\pi|'],
		['|x-3|', '|x-3|']
	])('%s pour %s → juste', (answer, expected) => {
		const result = check(answer, expected);
		expect(result.isCorrect).toBe(true);
		expect(result.status).toBe('correct');
	});

	it.each([
		['|x+3|', '|x-3|'],
		['x-3', '|x-3|'],
		['3-x', '|x-3|'],
		['-|x-3|', '|x-3|']
	])('%s pour %s → faux', (answer, expected) => {
		expect(check(answer, expected).isCorrect).toBe(false);
	});
});

describe('checkForm : |3 − x| et |x − 3| sont la même écriture', () => {
	it.each([
		['|3-x|', '|x-3|'],
		['-\\ln|x-1|', '-\\ln|1-x|'],
		['\\dfrac{3}{2}\\ln|2x-4|', '\\dfrac{3}{2}\\ln|4-2x|']
	])('%s ≡ %s', (answer, expected) => {
		expect(checkForm(answer, expected, {}).status).toBe('correct');
	});

	it('une somme sans valeur absolue garde son signe : 3 − x ≠ x − 3', () => {
		expect(checkForm('3-x', 'x-3', {}).status).toBe('bad_form');
	});
});
