/**
 * Notation combinatoire non calculée dans une case ordinaire (2026-10-05)
 * ======================================================================
 *
 * Décision de David : par défaut, `6!`, `\binom{10}{3}` ou `\frac{10!}{7!}` pour un
 * attendu numérique est jugé comme `10\times9\times8` aujourd'hui (calcul non
 * effectué : `bad_form`, contrainte `form`). L'option de case
 * `acceptCombinatorialNotation` la rend `correct` : au bac, en dénombrement,
 * `\binom{32}{5}` est une réponse acceptée.
 */

import { describe, it, expect } from 'vitest';
import { validateAnswer } from '../answer-validator';
import { computeBlankVerdicts } from '$lib/components/questions/blank-verdicts';
import type { InstanceBlank, QuestionInstance } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';

function createInstance(blanks: InstanceBlank[]): QuestionInstance {
	return {
		templateId: 'test-combinatorial-notation',
		statement: 'Combien ?' as ResolvedMarkdown,
		blanks,
		grades: ['T_SPE'],
		theme: 'Probabilités',
		domain: 'Dénombrement',
		level: 1,
		generatedAt: new Date().toISOString()
	};
}

function blank(expectedAnswer: string, acceptCombinatorialNotation?: boolean): InstanceBlank {
	return {
		expectedAnswer,
		type: 'math',
		...(acceptCombinatorialNotation !== undefined && { acceptCombinatorialNotation })
	};
}

function verdict(answer: string, expected: string, option?: boolean) {
	const result = validateAnswer([answer], createInstance([blank(expected, option)]), [answer]);
	return {
		status: result.status ?? (result.isCorrect ? 'correct' : 'incorrect'),
		violations: (result.constraintViolations ?? []).map((v) => v.constraint)
	};
}

describe('Par défaut : même statut qu’un produit non calculé', () => {
	const reference = verdict('10\\times9\\times8', '720');

	it('10×9×8 pour 720 : bad_form (form) — la référence', () => {
		expect(reference).toEqual({ status: 'bad_form', violations: ['form'] });
	});

	it.each([
		['6!', '720'],
		['\\frac{10!}{7!}', '720'],
		['\\binom{10}{3}', '120'],
		['\\binom{32}{5}', '201376'],
		['\\dbinom{32}{5}', '201376']
	])('%s pour %s : bad_form (form)', (answer, expected) => {
		expect(verdict(answer, expected)).toEqual({ status: 'bad_form', violations: ['form'] });
	});

	it('valeur fausse : incorrect', () => {
		expect(verdict('5!', '720').status).toBe('incorrect');
		expect(verdict('\\binom{10}{4}', '120').status).toBe('incorrect');
	});

	it('la valeur calculée reste correcte', () => {
		expect(verdict('720', '720').status).toBe('correct');
	});
});

describe('Option acceptCombinatorialNotation', () => {
	it.each([
		['6!', '720'],
		['\\frac{10!}{7!}', '720'],
		['\\binom{10}{3}', '120'],
		['\\binom{32}{5}', '201376'],
		['\\tbinom{32}{5}', '201376'],
		['\\frac{30!}{3!27!}', '4060'],
		['\\binom{4}{2}\\times\\binom{28}{3}', '19656'],
		['\\binom{32}{5}-\\binom{28}{5}', '103096']
	])('%s pour %s : correct', (answer, expected) => {
		expect(verdict(answer, expected, true)).toEqual({ status: 'correct', violations: [] });
	});

	it('la valeur calculée reste correcte', () => {
		expect(verdict('120', '120', true).status).toBe('correct');
	});

	it('un produit sans notation combinatoire garde son statut (bad_form)', () => {
		expect(verdict('10\\times9\\times8', '720', true)).toEqual(
			verdict('10\\times9\\times8', '720')
		);
	});

	it('valeur fausse : incorrect', () => {
		expect(verdict('\\binom{32}{4}', '201376', true).status).toBe('incorrect');
		expect(verdict('5!', '720', true).status).toBe('incorrect');
	});

	it('n! symbolique pour un attendu numérique : incorrect, sans erreur', () => {
		expect(verdict('n!', '720', true).status).toBe('incorrect');
	});

	it('factorielle démesurée : incorrect, sans bloquer', () => {
		expect(verdict('1000000000!', '720', true).status).toBe('incorrect');
	});
});

describe('Couleur des cases (FlashCard)', () => {
	it('\\binom{32}{5} vert avec l’option, pas sans', () => {
		const withOption = createInstance([blank('201376', true)]);
		const without = createInstance([blank('201376')]);
		expect(computeBlankVerdicts(['\\binom{32}{5}'], withOption)).toEqual([true]);
		expect(computeBlankVerdicts(['\\binom{32}{5}'], without)).toEqual([false]);
	});
});

describe('Textes avec « ! » : aucun changement', () => {
	it('réponse texte « Bravo ! » jugée comme avant (texte)', () => {
		const instance = createInstance([{ expectedAnswer: 'Bravo !', type: 'text' }]);
		expect(validateAnswer(['Bravo !'], instance, ['Bravo !']).isCorrect).toBe(true);
	});
});
