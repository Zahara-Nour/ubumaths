import { describe, it, expect } from 'vitest';
import { IMPOSSIBLE_ANSWER, impossibleAnswerLatex, isImpossibleAnswer } from '../impossible-answer';

describe('isImpossibleAnswer', () => {
	it('reconnaît la marque du bouton, et elle seule', () => {
		expect(isImpossibleAnswer(IMPOSSIBLE_ANSWER)).toBe(true);
	});
	it('le texte du bouton tapé dans la case n’est pas le bouton', () => {
		expect(isImpossibleAnswer(impossibleAnswerLatex('pas factorisable'))).toBe(false);
		expect(isImpossibleAnswer('\\text{impossible}')).toBe(false);
		expect(isImpossibleAnswer('impossible')).toBe(false);
	});
	it('refuse une expression ou une case vide', () => {
		expect(isImpossibleAnswer('2x+1')).toBe(false);
		expect(isImpossibleAnswer('')).toBe(false);
		expect(isImpossibleAnswer(undefined)).toBe(false);
	});
	it('marque impossible à taper : un caractère de contrôle, jamais du LaTeX', () => {
		expect(IMPOSSIBLE_ANSWER.codePointAt(0)).toBeLessThan(0x20);
		expect(IMPOSSIBLE_ANSWER.trim()).toBe(IMPOSSIBLE_ANSWER);
	});
});
