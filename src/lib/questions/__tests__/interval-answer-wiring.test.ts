/**
 * Case « intervalles » (`answerKind: 'intervalles'`) dans toute la chaîne :
 * générateur, schémas Zod, validateur (navigateur), barème serveur, version
 * publique d'une évaluation, specs de test du modèle (comportements 30 et 31).
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../generator/instance-generator';
import { questionTemplateSchema, blankSchema, blankDefaultsSchema } from '../template-schema';
import { runTestSpec } from '../test-spec-runner';
import { gradeQuestion } from '../grading';
import { toDisplayInstance, toPublicQuestion } from '../public-question';
import { INTERVAL_FEEDBACK } from '../intervals/interval-answer';
import {
	validateAnswer,
	validateBlanksDetailed,
	isBlankValueCorrect
} from '$lib/utils/answer-validator';
import { computeBlankVerdicts } from '$lib/components/questions/blank-verdicts';
import type { InstanceBlank, QuestionInstance, QuestionTemplate } from '../types';
import { templateMarkdown, type ResolvedMarkdown } from '$lib/ubumark';

// Fixtures
const SOLUTION = ']-\\infty;-2[\\cup]3;+\\infty[';

function instanceWith(
	blanks: InstanceBlank[],
	options?: QuestionInstance['options']
): QuestionInstance {
	return {
		templateId: 'intervalles',
		statement: 'Résoudre' as ResolvedMarkdown,
		blanks,
		grades: ['1_SPE'],
		theme: 'Fonctions',
		domain: 'Second degré',
		level: 3,
		generatedAt: new Date().toISOString(),
		...(options && { options })
	};
}

function intervalBlank(expectedAnswer = SOLUTION): InstanceBlank {
	return { expectedAnswer, type: 'math', answerKind: 'intervalles' };
}

function inequalityTemplate(
	blankExpected = ']-\\infty;{{x1}}[\\cup]{{x2}};+\\infty['
): QuestionTemplate {
	return {
		id: 'test-intervalles',
		title: 'Inéquation du second degré',
		status: 'draft',
		variations: [
			{
				statement: templateMarkdown('Résoudre $$(x-{{x1}})(x-{{x2}})>0$$ : $S=?$'),
				variables: [
					{ name: 'x1', expression: '-2' },
					{ name: 'x2', expression: '3' }
				],
				blanks: [{ expectedAnswer: blankExpected, answerKind: 'intervalles' }]
			}
		],
		grades: ['1_SPE'],
		theme: 'Fonctions',
		domain: 'Second degré',
		level: 3
	};
}

function check(answer: string, options?: QuestionInstance['options']) {
	return validateAnswer([answer], instanceWith([intervalBlank()], options), [answer]);
}

describe('validateAnswer — case intervalles', () => {
	it('17 — juste, et dans l’ordre inverse', () => {
		expect(check(SOLUTION)).toMatchObject({ isCorrect: true });
		expect(check(SOLUTION).status ?? 'correct').toBe('correct');
		expect(check(']3;+\\infty[\\cup]-\\infty;-2[')).toMatchObject({ isCorrect: true });
	});

	it('écriture à reprendre : ½ avec le message et la contrainte intervalForm', () => {
		const result = validateAnswer([']1;2]\\cup[2;3]'], instanceWith([intervalBlank(']1;3]')]), [
			']1;2]\\cup[2;3]'
		]);
		expect(result.isCorrect).toBe(true);
		expect(result.status).toBe('unoptimal_form');
		expect(result.feedback).toBe(INTERVAL_FEEDBACK.contiguous);
		expect(result.constraintViolations?.map((v) => v.constraint)).toEqual(['intervalForm']);
	});

	it('intervalForm strict : mauvaise forme', () => {
		const result = validateAnswer(
			[']1;2]\\cup[2;3]'],
			instanceWith([intervalBlank(']1;3]')], { constraints: { intervalForm: 'strict' } }),
			[']1;2]\\cup[2;3]']
		);
		expect(result.isCorrect).toBe(false);
		expect(result.status).toBe('bad_form');
	});

	it('faux : le message de l’erreur reconnue est rendu', () => {
		const result = check(']-\\infty;-2]\\cup]3;+\\infty[');
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe('Tu as inclus une borne qui devrait être exclue.');
	});

	it('29 — « S = » seul : vide', () => {
		expect(check('S=').status).toBe('empty');
	});

	it('valeur seule (couleur des cases) : juste ou faux', () => {
		const instance = instanceWith([intervalBlank()]);
		expect(isBlankValueCorrect(']3;+\\infty[\\cup]-\\infty;-2[', intervalBlank(), instance)).toBe(
			true
		);
		expect(isBlankValueCorrect(']3;+\\infty[', intervalBlank(), instance)).toBe(false);
		expect(computeBlankVerdicts([']3;+\\infty[\\cup]-\\infty;-2['], instance)).toEqual([true]);
	});
});

describe('30 — barème serveur = verdict du navigateur', () => {
	it.each([
		[SOLUTION, 'correct', 1],
		[']3;+\\infty[\\cup]-\\infty;-2[', 'correct', 1],
		[']-\\infty;-2[\\cup]3;4]\\cup[4;+\\infty[', 'unoptimal_form', 0.5],
		[']-\\infty;-2]\\cup]3;+\\infty[', 'incorrect', 0],
		[']3;-2[', 'incorrect', 0],
		['', 'empty', 0]
	])('%s → %s (%s point)', (answer, status, points) => {
		const instance = instanceWith([intervalBlank()]);
		const browser = validateBlanksDetailed([answer], instance, [answer]).statuses[0];
		const server = gradeQuestion(instance, { values: [answer] });
		expect(browser).toBe(status);
		expect(server.points).toBe(points);
	});

	it('version publique : le drapeau passe, la réponse non', () => {
		const result = generateInstance(inequalityTemplate(), 1);
		expect(result.success).toBe(true);
		if (!result.success) return;
		const question = toPublicQuestion(result.instance, { position: 0, delaySeconds: 60 });
		expect(question.blanks?.[0].answerKind).toBe('intervalles');
		const serialized = JSON.stringify(question);
		expect(serialized).not.toContain('expectedAnswer');
		expect(serialized).not.toContain('infty');
		expect(toDisplayInstance(question).blanks?.[0].answerKind).toBe('intervalles');
	});
});

describe('générateur et schémas', () => {
	it('recopie answerKind et rend la réponse attendue en LaTeX', () => {
		const result = generateInstance(inequalityTemplate(), 1);
		expect(result.success).toBe(true);
		if (!result.success) return;
		const blank = result.instance.blanks![0];
		expect(blank.answerKind).toBe('intervalles');
		expect(blank.expectedAnswer).toBe(']-\\infty;-2[\\cup]3;+\\infty[');
		expect(blank.expectedAnswerLatex).toBe(']-\\infty;-2[\\cup]3;+\\infty[');
	});

	it('hérite de blankDefaults', () => {
		const template = inequalityTemplate();
		template.variations[0].blanks = [{ expectedAnswer: ']-\\infty;{{x1}}[' }];
		template.variations[0].blankDefaults = { answerKind: 'intervalles' };
		const result = generateInstance(template, 1);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.instance.blanks![0].answerKind).toBe('intervalles');
	});

	it('schémas : answerKind accepté (strict et souple), valeur inconnue refusée', () => {
		const { id: _id, ...withoutId } = inequalityTemplate();
		expect(questionTemplateSchema.safeParse(withoutId).success).toBe(true);
		expect(
			blankSchema.safeParse({ expectedAnswer: ']2;3[', answerKind: 'intervalles' }).success
		).toBe(true);
		expect(blankDefaultsSchema.safeParse({ answerKind: 'intervalles' }).success).toBe(true);
		expect(blankSchema.safeParse({ expectedAnswer: ']2;3[', answerKind: 'ensemble' }).success).toBe(
			false
		);
		const withConstraint = { ...withoutId, options: { constraints: { intervalForm: 'off' } } };
		expect(questionTemplateSchema.safeParse(withConstraint).success).toBe(true);
	});

	it('schéma : une spec de test peut attendre la contrainte intervalForm', () => {
		const { id: _id, ...withoutId } = inequalityTemplate();
		const withSpec = {
			...withoutId,
			testSpecs: [
				{
					description: 'contigus',
					variables: { x1: '-2', x2: '3' },
					answers: [']-\\infty;-2[\\cup]3;4]\\cup[4;+\\infty['],
					expected: { status: 'unoptimal_form', constraintViolations: ['intervalForm'] }
				}
			]
		};
		expect(questionTemplateSchema.safeParse(withSpec).success).toBe(true);
	});
});

describe('31 — specs de test du modèle', () => {
	it('réponse attendue lisible : la spec passe', () => {
		const result = runTestSpec(inequalityTemplate(), {
			description: 'juste',
			variables: { x1: '-2', x2: '3' },
			answers: [']3;+\\infty[\\cup]-\\infty;-2['],
			expected: { status: 'correct' }
		});
		expect(result.passed).toBe(true);
	});

	it('réponse attendue illisible : la spec échoue avec un message', () => {
		const result = runTestSpec(inequalityTemplate(']-\\infty;{{x1}}[\\cup]{{x2}};y['), {
			description: 'modèle fautif',
			variables: { x1: '-2', x2: '3' },
			answers: [']3;+\\infty['],
			expected: { status: 'incorrect' }
		});
		expect(result.passed).toBe(false);
		expect(result.error).toMatch(/illisible/);
	});
});
