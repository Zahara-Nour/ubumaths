/**
 * QCM à une seule bonne réponse : normalisation d'une liste de choix et d'une
 * bonne réponse déclarée par indice.
 */
import { describe, it, expect } from 'vitest';
import { keepFirstCorrectChoice, keepFirstDeclaredChoice } from '../single-answer';

describe('keepFirstCorrectChoice', () => {
	it('plusieurs bonnes réponses : seule la première reste', () => {
		const result = keepFirstCorrectChoice([
			{ content: 'a', isCorrect: false },
			{ content: 'b', isCorrect: true },
			{ content: 'c', isCorrect: true }
		]);
		expect(result.map((c) => c.isCorrect)).toEqual([false, true, false]);
		expect(result.map((c) => c.content)).toEqual(['a', 'b', 'c']);
	});

	it('aucune bonne réponse : aucune n’est inventée', () => {
		const result = keepFirstCorrectChoice([{ isCorrect: false }, {}]);
		expect(result.map((c) => c.isCorrect)).toEqual([false, false]);
	});

	it('liste vide : vide', () => {
		expect(keepFirstCorrectChoice([])).toEqual([]);
	});
});

describe('keepFirstDeclaredChoice', () => {
	it('plusieurs indices : le premier seulement', () => {
		expect(keepFirstDeclaredChoice(['2', '0'])).toEqual(['2']);
	});

	it('un indice, une chaîne ou rien : inchangé', () => {
		expect(keepFirstDeclaredChoice(['1'])).toEqual(['1']);
		expect(keepFirstDeclaredChoice('1')).toBe('1');
		expect(keepFirstDeclaredChoice(undefined)).toBeUndefined();
	});
});
