/**
 * Case texte : casse et accents ignorés ; une faute de frappe (distance de
 * Levenshtein ≤ 1) n'est tolérée que si le mot attendu a au moins 5 lettres.
 * Un mot court exige l'égalité : « A » ne passe plus pour « B ».
 */

import { describe, it, expect } from 'vitest';
import { validateAnswer } from '../answer-validator';
import type { InstanceBlank, QuestionInstance } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';

function check(answer: string, expectedAnswer: string): boolean {
	const blank: InstanceBlank = { expectedAnswer, type: 'text' };
	const instance: QuestionInstance = {
		templateId: 'test-text-fuzzy',
		statement: 'Test' as ResolvedMarkdown,
		blanks: [blank],
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: new Date().toISOString()
	};
	return validateAnswer([answer], instance).isCorrect;
}

describe('Case texte : tolérance aux fautes selon la longueur du mot', () => {
	it.each([
		['A', 'B'],
		['a', 'b'],
		['paire', 'pair'],
		['pai', 'pair'],
		['vrais', 'vrai'],
		['car', 'cas']
	])('mot court : %s refusé pour %s', (answer, expected) => {
		expect(check(answer, expected)).toBe(false);
	});

	it.each([
		['entier', 'entier'],
		['Entier', 'entier'],
		['éntier', 'entier'],
		['CARRÉ', 'carre'],
		['b', 'B'],
		['Pair', 'pair']
	])('égalité à la casse et aux accents près : %s accepté pour %s', (answer, expected) => {
		expect(check(answer, expected)).toBe(true);
	});

	it.each([
		['triangl', 'triangle'],
		['trianngle', 'triangle'],
		['carre', 'carrés'],
		['entiér', 'entiers'],
		['vrai', 'vrais'],
		['pair', 'paire']
	])('mot de 5 lettres ou plus : une faute tolérée (%s pour %s)', (answer, expected) => {
		expect(check(answer, expected)).toBe(true);
	});

	it.each([
		['tringl', 'triangle'],
		['carre', 'triangle']
	])('mot long, deux fautes ou plus : refusé (%s pour %s)', (answer, expected) => {
		expect(check(answer, expected)).toBe(false);
	});
});
