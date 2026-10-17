/**
 * Réponse saisie avec la touche « valeur absolue » du clavier virtuel
 * ===================================================================
 *
 * MathLive rend `\left\vert … \right\vert` (touche du clavier virtuel) ou
 * `\vert … \vert` (touche `|` du calque symboles), mesuré dans Chromium. La
 * réponse juste de l'élève doit être acceptée comme `|…|`.
 */

import { describe, it, expect } from 'vitest';
import { validateAnswer } from '../answer-validator';
import type { QuestionInstance } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';

function status(expected: string, answer: string): string {
	const instance: QuestionInstance = {
		templateId: 'test-vert',
		statement: 'Valeur absolue' as ResolvedMarkdown,
		blanks: [{ expectedAnswer: expected, type: 'math' }],
		grades: ['2'],
		theme: 'Algèbre',
		domain: 'Valeur absolue',
		level: 1,
		generatedAt: new Date().toISOString()
	};
	const result = validateAnswer([answer], instance, [answer]);
	return result.status ?? (result.isCorrect ? 'correct' : 'incorrect');
}

describe('valeur absolue écrite par MathLive', () => {
	it.each([
		['|x|', '\\left\\vert x\\right\\vert'],
		['3|2x+1|', '3\\left\\vert2x+1\\right\\vert'],
		['3|2x+1|', '3\\vert 2x+1\\vert'],
		['-2|x-1|', '-2\\left\\lvert x-1\\right\\rvert']
	])('attendu %s, réponse %s : juste', (expected, answer) => {
		expect(status(expected, answer)).toBe('correct');
	});

	it('une réponse fausse reste fausse', () => {
		expect(status('3|2x+1|', '2\\left\\vert2x+1\\right\\vert')).toBe('incorrect');
	});
});
