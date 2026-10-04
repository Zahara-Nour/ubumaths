/**
 * Case « vecteur » : forme des coordonnées (2026-10-04)
 *
 * Une coordonnée est jugée comme une case ordinaire. Avant, un vecteur juste
 * l'était sans réserve : `\frac{2}{4}` pour ½ (juste avec « La fraction peut être
 * simplifiée » dans une case) ou `0.5` pour ½ (mauvaise forme dans une case).
 * En mode colinéaire, la valeur est libre (comme une case à plusieurs bonnes
 * réponses) : seule une fraction simplifiable est signalée.
 */
import { describe, it, expect } from 'vitest';
import { validateAnswer } from '$lib/utils/answer-validator';
import type { InstanceBlank, QuestionInstance, VectorMode } from '../types';
import type { ResolvedMarkdown } from '$lib/ubumark';

function instanceWith(blanks: InstanceBlank[]): QuestionInstance {
	return {
		templateId: 'vecteur-forme',
		statement: 'Donner un vecteur' as ResolvedMarkdown,
		blanks,
		grades: ['1_SPE'],
		theme: 'Géométrie',
		domain: 'Géométrie repérée',
		level: 1,
		generatedAt: new Date().toISOString()
	};
}

function judge(answer: string, expected: string, vectorMode?: VectorMode) {
	const blank: InstanceBlank = {
		expectedAnswer: expected,
		type: 'math',
		answerKind: 'vecteur',
		...(vectorMode && { vectorMode })
	};
	const result = validateAnswer([answer], instanceWith([blank]), [answer]);
	return { status: result.status ?? (result.isCorrect ? 'correct' : 'incorrect'), result };
}

function ordinary(answer: string, expected: string) {
	const blank: InstanceBlank = { expectedAnswer: expected, type: 'math' };
	const result = validateAnswer([answer], instanceWith([blank]), [answer]);
	return result.status ?? (result.isCorrect ? 'correct' : 'incorrect');
}

describe('vecteur exact : chaque coordonnée jugée comme une case ordinaire', () => {
	it('fraction simplifiable : juste avec avertissement, comme une case', () => {
		expect(ordinary('\\frac{2}{4}', '\\frac{1}{2}')).toBe('unoptimal_form');
		const { status, result } = judge('\\left(\\frac{2}{4};3\\right)', '(\\frac{1}{2};3)');
		expect(status).toBe('unoptimal_form');
		expect(result.isCorrect).toBe(true);
	});

	it('fraction égale à un entier : juste avec avertissement, comme une case', () => {
		expect(ordinary('\\frac{4}{2}', '2')).toBe('unoptimal_form');
		const { status, result } = judge('\\left(3;\\frac{4}{2}\\right)', '(3;2)');
		expect(status).toBe('unoptimal_form');
		expect(result.isCorrect).toBe(true);
		expect(result.feedback).toBe('La fraction peut être simplifiée.');
	});

	it('décimal pour une fraction attendue : même verdict qu’une case', () => {
		expect(ordinary('0.5', '\\frac{1}{2}')).toBe('bad_form');
		expect(judge('\\left(0.5;3\\right)', '(\\frac{1}{2};3)').status).toBe('bad_form');
	});

	it('écriture attendue, en ligne ou en colonne : juste', () => {
		expect(judge('\\left(\\frac{1}{2};3\\right)', '(\\frac{1}{2};3)').status).toBe('correct');
		expect(judge('\\begin{pmatrix}2\\\\-3\\end{pmatrix}', '(2;-3)').status).toBe('correct');
	});

	it('valeur fausse : faux, sans message de forme', () => {
		const { status, result } = judge('\\left(\\frac{2}{4};4\\right)', '(\\frac{1}{2};3)');
		expect(status).toBe('incorrect');
		expect(result.constraintViolations ?? []).toEqual([]);
	});
});

describe('vecteur colinéaire : valeur libre, fraction simplifiable signalée', () => {
	it('fraction simplifiable : juste avec avertissement', () => {
		const { status, result } = judge('\\left(\\frac{2}{4};1\\right)', '(1;2)', 'colineaire');
		expect(status).toBe('unoptimal_form');
		expect(result.isCorrect).toBe(true);
	});

	it('autre multiple, écrit simplement : juste', () => {
		expect(judge('\\left(2;4\\right)', '(1;2)', 'colineaire').status).toBe('correct');
		expect(judge('\\left(-\\frac{1}{2};-1\\right)', '(1;2)', 'colineaire').status).toBe('correct');
	});
});

describe('vecteurs dans le désordre (orderIndependent)', () => {
	it('fraction simplifiable dans un vecteur apparié : même avertissement qu’en place', () => {
		const blanks: InstanceBlank[] = [
			{ expectedAnswer: '(1;0)', type: 'math', answerKind: 'vecteur', vectorMode: 'colineaire' },
			{ expectedAnswer: '(0;1)', type: 'math', answerKind: 'vecteur', vectorMode: 'colineaire' }
		];
		const answers = ['\\left(0;\\frac{4}{2}\\right)', '(3;0)'];
		const instance = { ...instanceWith(blanks), options: { orderIndependent: true } };
		const result = validateAnswer(answers, instance, answers);
		expect(result.isCorrect).toBe(true);
		expect(result.status).toBe('unoptimal_form');
	});
});
