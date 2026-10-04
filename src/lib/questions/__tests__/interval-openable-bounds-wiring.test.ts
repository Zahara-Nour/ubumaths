/**
 * Case « intervalles » avec l'option `openableBounds` dans toute la chaîne :
 * validateur (navigateur), barème serveur, `orderIndependent`, verdicts par case,
 * générateur (case et blankDefaults), schémas Zod, specs de test du modèle.
 * Sémantique validée par David le 2026-10-04 : l'élève peut OUVRIR une borne
 * finie que l'attendu ferme, jamais FERMER une borne que l'attendu ouvre.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../generator/instance-generator';
import { questionTemplateSchema, blankSchema, blankDefaultsSchema } from '../template-schema';
import { runTestSpec } from '../test-spec-runner';
import { gradeQuestion } from '../grading';
import { validateAnswer, validateBlanksDetailed } from '$lib/utils/answer-validator';
import { computeBlankVerdicts } from '$lib/components/questions/blank-verdicts';
import type { InstanceBlank, QuestionInstance, QuestionTemplate } from '../types';
import { templateMarkdown, type ResolvedMarkdown } from '$lib/ubumark';

// Fixtures
const INCREASING = '[2;+\\infty[';

function instanceWith(
	blanks: InstanceBlank[],
	options?: QuestionInstance['options']
): QuestionInstance {
	return {
		templateId: 'variations',
		statement: 'Intervalle où f est croissante' as ResolvedMarkdown,
		blanks,
		grades: ['1_SPE'],
		theme: 'Fonctions',
		domain: 'Dérivation',
		level: 2,
		generatedAt: new Date().toISOString(),
		...(options && { options })
	};
}

function intervalBlank(expectedAnswer = INCREASING, openableBounds = true): InstanceBlank {
	return {
		expectedAnswer,
		type: 'math',
		answerKind: 'intervalles',
		...(openableBounds && { openableBounds: true })
	};
}

function statusOf(answer: string, blank: InstanceBlank): string {
	const result = validateAnswer([answer], instanceWith([blank]), [answer]);
	return result.status ?? (result.isCorrect ? 'correct' : 'incorrect');
}

function variationsTemplate(where: 'blank' | 'blankDefaults'): QuestionTemplate {
	return {
		id: 'test-variations',
		title: 'Intervalle de croissance',
		status: 'draft',
		...(where === 'blankDefaults' && {
			shared: { blankDefaults: { answerKind: 'intervalles', openableBounds: true } }
		}),
		variations: [
			{
				statement: templateMarkdown('$f(x)=(x-{{a}})^2$ est croissante sur $?$'),
				variables: [{ name: 'a', expression: '2' }],
				blanks: [
					where === 'blank'
						? {
								expectedAnswer: '[{{a}};+\\infty[',
								answerKind: 'intervalles',
								openableBounds: true
							}
						: { expectedAnswer: '[{{a}};+\\infty[' }
				]
			}
		],
		grades: ['1_SPE'],
		theme: 'Fonctions',
		domain: 'Dérivation',
		level: 2
	} as QuestionTemplate;
}

describe('validateAnswer : bornes ouvrables', () => {
	it.each([
		['[2;+\\infty[', 'correct'],
		[']2;+\\infty[', 'correct'],
		[']3;+\\infty[', 'incorrect']
	])('%s → %s', (answer, status) => {
		expect(statusOf(answer, intervalBlank())).toBe(status);
	});

	it('fermer une borne que l’attendu ouvre : faux', () => {
		expect(statusOf('[0;+\\infty[', intervalBlank(']0;+\\infty['))).toBe('incorrect');
	});

	it('sans l’option : rien ne change (ensemble de solutions d’inéquation)', () => {
		expect(statusOf(']2;+\\infty[', intervalBlank(INCREASING, false))).toBe('incorrect');
	});
});

describe('barème serveur = verdict du navigateur', () => {
	it.each([
		[']2;+\\infty[', 'correct', 1],
		['[2;+\\infty[', 'correct', 1],
		[']2;3]\\cup[3;+\\infty[', 'unoptimal_form', 0.5],
		['[1;+\\infty[', 'incorrect', 0]
	] as const)('%s → %s', (answer, status, points) => {
		const instance = instanceWith([intervalBlank()]);
		const server = gradeQuestion(instance, { values: [answer] });
		expect(statusOf(answer, intervalBlank())).toBe(status);
		expect(server.status).toBe(status);
		expect(server.points).toBe(points);
	});
});

describe('orderIndependent et verdicts par case', () => {
	const options = { orderIndependent: true };
	const blanks = [intervalBlank('[-1;1]'), intervalBlank('[3;+\\infty[')];

	it('dans le désordre, bornes ouvertes : juste', () => {
		const answers = [']3;+\\infty[', ']-1;1['];
		const instance = instanceWith(blanks, options);
		expect(validateAnswer(answers, instance, answers).isCorrect).toBe(true);
		expect(validateBlanksDetailed(answers, instance, answers).statuses).toEqual([
			'correct',
			'correct'
		]);
		expect(gradeQuestion(instance, { values: answers }).points).toBe(1);
	});

	it('la case ouverte est verte', () => {
		expect(computeBlankVerdicts([']2;+\\infty['], instanceWith([intervalBlank()]))).toEqual([true]);
	});
});

describe('générateur et schémas', () => {
	it.each(['blank', 'blankDefaults'] as const)('openableBounds recopié depuis %s', (where) => {
		const result = generateInstance(variationsTemplate(where), 1);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.instance.blanks![0].openableBounds).toBe(true);
	});

	it('ignoré hors case intervalles', () => {
		const template = variationsTemplate('blank');
		template.variations[0].blanks = [{ expectedAnswer: '{{a}}', openableBounds: true }];
		const result = generateInstance(template, 1);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.instance.blanks![0].openableBounds).toBeUndefined();
	});

	it('schémas : booléen accepté, autre valeur refusée', () => {
		const { id: _id, ...withoutId } = variationsTemplate('blankDefaults');
		expect(questionTemplateSchema.safeParse(withoutId).success).toBe(true);
		const { id: _id2, ...strictCase } = variationsTemplate('blank');
		expect(questionTemplateSchema.safeParse(strictCase).success).toBe(true);
		expect(
			blankSchema.safeParse({ expectedAnswer: INCREASING, openableBounds: true }).success
		).toBe(true);
		expect(blankDefaultsSchema.safeParse({ openableBounds: 'oui' }).success).toBe(false);
	});
});

describe('specs de test du modèle', () => {
	it('borne ouverte attendue correct : la spec passe', () => {
		const template = variationsTemplate('blankDefaults');
		const open = runTestSpec(template, {
			description: 'borne ouverte',
			variables: { a: '2' },
			answers: [']2;+\\infty['],
			expected: { status: 'correct' }
		});
		expect(open.passed).toBe(true);
	});
});
