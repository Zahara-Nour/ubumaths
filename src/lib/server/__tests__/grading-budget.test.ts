/**
 * Budget de temps TOTAL de correction d'un envoi (décision Q59 = a de David)
 * =========================================================================
 *
 * Des écritures courtes passent la garde de complexité mais coûtent cher à
 * corriger (`1.0001^{9999}` ~1,2 s par case) : une copie hostile monopoliserait
 * le serveur. Au-delà de 5 s de correction, les questions RESTANTES ne sont plus
 * corrigées (0 point, message) ; la question en cours finit sa correction ; une
 * copie normale (quelques dizaines de ms) ne voit aucune différence.
 */

import { describe, it, expect, vi } from 'vitest';
import {
	GRADING_BUDGET_EXCEEDED_FEEDBACK,
	SUBMISSION_GRADING_BUDGET_MS,
	gradeWithinBudget,
	type GradingItem
} from '../grading-budget';
import { gradeOutOf20, gradeQuestion, type QuestionVerdict } from '$lib/questions/grading';
import type { InstanceBlank, QuestionInstance } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';

// Fixtures
function blanksInstance(blanks: InstanceBlank[]): QuestionInstance {
	return {
		templateId: 'budget',
		statement: 'Test' as ResolvedMarkdown,
		blanks,
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: new Date().toISOString()
	};
}

function choicesInstance(correct: boolean[]): QuestionInstance {
	return {
		templateId: 'budget-qcm',
		statement: 'Choisis' as ResolvedMarkdown,
		choices: correct.map((isCorrect, i) => ({ content: `c${i}` as ResolvedMarkdown, isCorrect })),
		shuffledChoices: correct.map((_, i) => ({
			content: `c${i}` as ResolvedMarkdown,
			originalIndex: i
		})),
		correctChoiceIndex: correct.flatMap((c, i) => (c ? [String(i)] : [])),
		multipleAnswers: true,
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: new Date().toISOString()
	};
}

const math = (expectedAnswer: string): InstanceBlank => ({ expectedAnswer, type: 'math' });

/** Copie normale : juste, fausse, QCM juste, QCM incomplet, vide, cases en partie vides */
function normalCopy(): GradingItem[] {
	return [
		{ instance: blanksInstance([math('12')]), answer: { values: ['12'] } },
		{ instance: blanksInstance([math('12')]), answer: { values: ['13'] } },
		{ instance: choicesInstance([true, false, false]), answer: { choices: [0] } },
		{ instance: choicesInstance([true, true, false]), answer: { choices: [1] } },
		{ instance: blanksInstance([math('7')]), answer: null },
		{
			instance: blanksInstance([math('2'), math('3'), math('4')]),
			answer: { values: ['2', '3', ''] }
		},
		{ instance: blanksInstance([math('\\frac{1}{2}')]), answer: { values: ['\\frac{2}{4}'] } }
	];
}

/** Horloge factice : rend les valeurs dans l'ordre, puis la dernière indéfiniment */
function clockOf(...times: number[]): () => number {
	let call = 0;
	return () => times[Math.min(call++, times.length - 1)];
}

const right: QuestionVerdict = { status: 'correct', points: 1, isCorrect: true, partial: false };

describe('Q59 : budget de temps total de la correction d’un envoi', () => {
	it('le budget est de 5 s', () => {
		expect(SUBMISSION_GRADING_BUDGET_MS).toBe(5_000);
	});

	it('(1) copie normale, horloge réelle : verdicts identiques à la correction sans budget', () => {
		const copy = normalCopy();
		const before = copy.map(({ instance, answer }) =>
			answer ? gradeQuestion(instance, answer) : 'vide'
		);
		const { verdicts, skipped } = gradeWithinBudget(copy);
		expect(skipped).toBe(0);
		expect(
			verdicts.map((v, i) => (copy[i].answer ? v : v.status === 'empty' ? 'vide' : v))
		).toEqual(before);
		expect(verdicts[4]).toEqual({ status: 'empty', points: 0, isCorrect: false, partial: false });
		// Le décor contient bien toutes les classes de verdict d'une copie ordinaire
		expect(new Set(verdicts.map((v) => v.status))).toEqual(
			new Set(['correct', 'incorrect', 'unoptimal_form', 'empty'])
		);
	});

	it('(2) budget épuisé : les questions RESTANTES valent 0 avec le message, sans être corrigées', () => {
		const grade = vi.fn(() => right);
		const items: GradingItem[] = Array.from({ length: 5 }, () => ({
			instance: blanksInstance([math('1')]),
			answer: { values: ['1'] }
		}));
		// Départ à 0 ; Q0 à 0 ms, Q1 à 4 999 ms (encore dans le budget), Q2 à 5 000 ms (épuisé)
		const { verdicts, skipped } = gradeWithinBudget(items, {
			clock: clockOf(0, 0, 4_999, 5_000),
			grade
		});
		expect(grade).toHaveBeenCalledTimes(2);
		expect(skipped).toBe(3);
		expect(verdicts.slice(0, 2)).toEqual([right, right]);
		for (const verdict of verdicts.slice(2)) {
			expect(verdict).toEqual({
				status: 'incorrect',
				points: 0,
				isCorrect: false,
				partial: false,
				feedback: GRADING_BUDGET_EXCEEDED_FEEDBACK
			});
		}
		expect(GRADING_BUDGET_EXCEEDED_FEEDBACK).toBe(
			'Réponse trop complexe pour être corrigée : simplifie ton écriture.'
		);
		// Note cohérente : 2 points sur 5 → 8/20
		expect(gradeOutOf20(sum(verdicts), items.length)).toBe(8);
	});

	it('(2) la question EN COURS quand le budget s’épuise finit sa correction (correcteur lent)', () => {
		let now = 0;
		// Correcteur factice lent : chaque correction « coûte » 3 s
		const grade = vi.fn(() => {
			now += 3_000;
			return right;
		});
		const items: GradingItem[] = Array.from({ length: 4 }, () => ({
			instance: blanksInstance([math('1')]),
			answer: { values: ['1'] }
		}));
		const { verdicts, skipped } = gradeWithinBudget(items, { clock: () => now, grade });
		// Q0 commence à 0 s, Q1 à 3 s (finit à 6 s, au-delà du budget) ; Q2 et Q3 sautées
		expect(grade).toHaveBeenCalledTimes(2);
		expect(verdicts.map((v) => v.points)).toEqual([1, 1, 0, 0]);
		expect(skipped).toBe(2);
	});

	it('(2) un QCM restant vaut aussi 0 ; une question sans réponse reste « vide »', () => {
		const items: GradingItem[] = [
			{ instance: choicesInstance([true, false]), answer: { choices: [0] } },
			{ instance: blanksInstance([math('1')]), answer: null }
		];
		const { verdicts, skipped } = gradeWithinBudget(items, { budgetMs: 0 });
		expect(verdicts[0]).toMatchObject({
			status: 'incorrect',
			points: 0,
			feedback: GRADING_BUDGET_EXCEEDED_FEEDBACK
		});
		expect(verdicts[1]).toEqual({ status: 'empty', points: 0, isCorrect: false, partial: false });
		expect(skipped).toBe(1);
	});
});

function sum(verdicts: QuestionVerdict[]): number {
	return verdicts.reduce((total, v) => total + v.points, 0);
}
