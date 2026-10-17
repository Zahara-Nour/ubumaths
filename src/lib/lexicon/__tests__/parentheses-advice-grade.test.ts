/**
 * Règle « 6e ou avant » de la page de structure : quels niveaux reçoivent le
 * message sur les parenthèses (spécification C4,
 * `docs/systeme/mathast/structure-expression.md`).
 */
import { describe, expect, it } from 'vitest';
import { GRADE_CODES } from '$lib/types/grades';
import { needsParenthesesAdvice } from '../parentheses-advice-grade';

// Constantes
/** Les niveaux qui reçoivent le message : CP à 6e */
const WITH_ADVICE = new Set(['CP', 'CE1', 'CE2', 'CM1', 'CM2', '6']);

describe('needsParenthesesAdvice — C4 : niveau de l’élève', () => {
	it('les 18 niveaux sont couverts', () => {
		expect(GRADE_CODES).toHaveLength(18);
	});

	it.each(GRADE_CODES)('%s', (grade) => {
		expect(needsParenthesesAdvice(grade)).toBe(WITH_ADVICE.has(grade));
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
