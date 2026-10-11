/**
 * Règle « 6e ou avant » de la page de structure : quels niveaux reçoivent le
 * message sur les parenthèses (spécification C4,
 * `docs/wip/structure-expression-progress.md`).
 */
import { describe, expect, it } from 'vitest';
import { needsParenthesesAdvice } from '../parentheses-advice-grade';

describe('needsParenthesesAdvice — C4 : niveau de l’élève', () => {
	it.each(['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6'])('%s : oui', (grade) => {
		expect(needsParenthesesAdvice(grade)).toBe(true);
	});

	it.each(['5', '4', '3', '2', '1_SPE', 'T_EXP', '1_TECHNO'])('%s : non', (grade) => {
		expect(needsParenthesesAdvice(grade)).toBe(false);
	});

	it('visiteur (null, undefined) : non', () => {
		expect(needsParenthesesAdvice(null)).toBe(false);
		expect(needsParenthesesAdvice(undefined)).toBe(false);
	});

	it('niveau inconnu : non', () => {
		expect(needsParenthesesAdvice('6e')).toBe(false);
		expect(needsParenthesesAdvice('')).toBe(false);
	});
});
