import { describe, it, expect } from 'vitest';
import { impossibleAnswerLatex, isImpossibleAnswer } from '../impossible-answer';

describe('isImpossibleAnswer', () => {
	it("reconnaît l'apostrophe typographique relue ' par MathLive", () => {
		expect(isImpossibleAnswer("\\text{n'existe pas}", 'n’existe pas')).toBe(true);
		expect(isImpossibleAnswer(impossibleAnswerLatex('n’existe pas'), 'n’existe pas')).toBe(true);
	});
	it('refuse une autre expression', () => {
		expect(isImpossibleAnswer("\\text{n'existe}", 'n’existe pas')).toBe(false);
		expect(isImpossibleAnswer('2x+1', 'n’existe pas')).toBe(false);
	});
});
