/**
 * Case « équation » (`answerKind: 'equation'`) dans toute la chaîne : validateur
 * (navigateur), barème serveur, `orderIndependent`, générateur, schémas Zod,
 * specs de test du modèle. Comportements : docs/wip/reponse-equation-progress.md.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../generator/instance-generator';
import { questionTemplateSchema, blankSchema, blankDefaultsSchema } from '../template-schema';
import { runTestSpec } from '../test-spec-runner';
import { gradeQuestion } from '../grading';
import { toPublicQuestion } from '../public-question';
import {
	validateAnswer,
	validateBlanksDetailed,
	isBlankValueCorrect
} from '$lib/utils/answer-validator';
import { computeBlankVerdicts } from '$lib/components/questions/blank-verdicts';
import type { InstanceBlank, QuestionInstance, QuestionTemplate, RequiredForm } from '../types';
import { templateMarkdown, type ResolvedMarkdown } from '$lib/ubumark';

// Fixtures
const LINE = '2x-y+1=0';
const CIRCLE = '(x-1)^2+(y+2)^2=9';

function instanceWith(
	blanks: InstanceBlank[],
	options?: QuestionInstance['options']
): QuestionInstance {
	return {
		templateId: 'equation',
		statement: 'Donner une équation' as ResolvedMarkdown,
		blanks,
		grades: ['1_SPE'],
		theme: 'Géométrie',
		domain: 'Géométrie repérée',
		level: 3,
		generatedAt: new Date().toISOString(),
		...(options && { options })
	};
}

function equationBlank(expectedAnswer: string, requiredForm?: RequiredForm): InstanceBlank {
	return {
		expectedAnswer,
		type: 'math',
		answerKind: 'equation',
		...(requiredForm && { requiredForm })
	};
}

function statusOf(answer: string, blank: InstanceBlank): string {
	const result = validateAnswer([answer], instanceWith([blank]), [answer]);
	return result.status ?? (result.isCorrect ? 'correct' : 'incorrect');
}

function lineTemplate(expected = '{{a}}x-y+{{b}}=0'): QuestionTemplate {
	return {
		id: 'test-equation',
		title: 'Équation de droite',
		status: 'draft',
		variations: [
			{
				statement: templateMarkdown('Une équation de la droite : $?$'),
				variables: [
					{ name: 'a', expression: '2' },
					{ name: 'b', expression: '1' }
				],
				blanks: [{ expectedAnswer: expected, answerKind: 'equation' }]
			}
		],
		grades: ['1_SPE'],
		theme: 'Géométrie',
		domain: 'Géométrie repérée',
		level: 3
	};
}

describe('constat : une case équation jugée sur l’ensemble de points', () => {
	it.each(['-2x+y-1=0', '4x-2y+2=0', 'y=2x+1', '2x-y=-1'])('%s pour 2x-y+1=0', (answer) => {
		expect(statusOf(answer, equationBlank(LINE))).toBe('correct');
	});

	it.each(['x^2+y^2-2x+4y-4=0', '(x-1)^2+(y+2)^2=3^2'])('%s pour le cercle', (answer) => {
		expect(statusOf(answer, equationBlank(CIRCLE))).toBe('correct');
	});

	it.each(['x-4=0', '2x=8'])('%s pour x=4', (answer) => {
		expect(statusOf(answer, equationBlank('x=4'))).toBe('correct');
	});

	it('cercle multiplié : ½ avec la violation form', () => {
		const answer = '2x^2+2y^2-4x+8y-8=0';
		const result = validateAnswer([answer], instanceWith([equationBlank(CIRCLE)]), [answer]);
		expect(result.status).toBe('unoptimal_form');
		expect(result.constraintViolations?.map((v) => v.constraint)).toEqual(['form']);
		expect(result.feedback).toMatch(/coefficient de x²/);
	});

	it('forme réduite exigée : x+1=y → mauvaise forme', () => {
		const result = validateAnswer(['x+1=y'], instanceWith([equationBlank('y=x+1', 'reduite')]), [
			'x+1=y'
		]);
		expect(result.status).toBe('bad_form');
		expect(result.feedback).toMatch(/réduite/);
	});

	it('pas une équation : incorrect', () => {
		expect(statusOf('2x-y+1', equationBlank(LINE))).toBe('incorrect');
		expect(statusOf('', equationBlank(LINE))).toBe('empty');
	});

	it('couleur des cases (FlashCard) et verdict de valeur', () => {
		const instance = instanceWith([equationBlank(LINE)]);
		expect(computeBlankVerdicts(['y=2x+1'], instance)).toEqual([true]);
		expect(isBlankValueCorrect('y=2x+2', instance.blanks![0], instance)).toBe(false);
	});
});

describe('16 — sans answerKind : rien ne change', () => {
	const plain = (expectedAnswer: string): InstanceBlank => ({ expectedAnswer, type: 'math' });
	it('le jugement d’écriture est conservé', () => {
		expect(statusOf('-2x+y-1=0', plain(LINE))).toBe('incorrect');
		expect(statusOf('2x=8', plain('x=4'))).toBe('incorrect');
		expect(statusOf('(x-1)^2+(y+2)^2=3^2', plain(CIRCLE))).toBe('bad_form');
		expect(statusOf(LINE, plain(LINE))).toBe('correct');
	});
});

describe('14 — barème serveur = verdict du navigateur', () => {
	it.each([
		['y=2x+1', LINE, 'correct', 1],
		['x^2+y^2-2x+4y-4=0', CIRCLE, 'correct', 1],
		['-x^2-y^2+2x-4y+4=0', CIRCLE, 'unoptimal_form', 0.5],
		['2x-y+2=0', LINE, 'incorrect', 0],
		['', LINE, 'empty', 0]
	])('%s (attendu %s) → %s', (answer, expected, status, points) => {
		const instance = instanceWith([equationBlank(expected)]);
		const browser = validateAnswer([answer], instance, [answer]);
		expect(browser.status ?? (browser.isCorrect ? 'correct' : 'incorrect')).toBe(status);
		const server = gradeQuestion(instance, { values: [answer] });
		expect(server.status).toBe(status);
		expect(server.points).toBe(points);
	});

	it('forme exigée non respectée : 0 point', () => {
		const instance = instanceWith([equationBlank(LINE, 'cartesienne')]);
		expect(gradeQuestion(instance, { values: ['y=2x+1'] }).status).toBe('bad_form');
	});
});

describe('13 — orderIndependent', () => {
	const options = { orderIndependent: true };
	const blanks = [equationBlank('x=4'), equationBlank(CIRCLE)];

	it('dans le désordre : juste', () => {
		const answers = ['x^2+y^2-2x+4y-4=0', '2x=8'];
		const result = validateAnswer(answers, instanceWith(blanks, options), answers);
		expect(result.isCorrect).toBe(true);
		expect(result.status ?? 'correct').toBe('correct');
	});

	it('cercle multiplié dans le désordre : ½', () => {
		const answers = ['2x^2+2y^2-4x+8y-8=0', 'x-4=0'];
		const instance = instanceWith(blanks, options);
		const result = validateAnswer(answers, instance, answers);
		expect(result.status).toBe('unoptimal_form');
		// Statuts dans l'ordre des réponses
		expect(validateBlanksDetailed(answers, instance, answers).statuses).toEqual([
			'unoptimal_form',
			'correct'
		]);
	});
});

describe('générateur, schémas, version publique', () => {
	it('recopie answerKind et rend la réponse attendue en LaTeX', () => {
		const result = generateInstance(lineTemplate(), 1);
		expect(result.success).toBe(true);
		if (!result.success) return;
		const blank = result.instance.blanks![0];
		expect(blank.answerKind).toBe('equation');
		expect(blank.expectedAnswer).toBe('2x-y+1=0');
		const question = toPublicQuestion(result.instance, { position: 0, delaySeconds: 60 });
		expect(question.blanks?.[0].answerKind).toBe('equation');
		expect(JSON.stringify(question)).not.toContain('expectedAnswer');
	});

	it('schémas : answerKind equation et formes d’équation acceptés', () => {
		const { id: _id, ...withoutId } = lineTemplate();
		expect(questionTemplateSchema.safeParse(withoutId).success).toBe(true);
		expect(blankSchema.safeParse({ expectedAnswer: LINE, answerKind: 'equation' }).success).toBe(
			true
		);
		expect(blankDefaultsSchema.safeParse({ answerKind: 'equation' }).success).toBe(true);
		for (const requiredForm of ['reduite', 'cartesienne', 'centre-rayon']) {
			expect(blankSchema.safeParse({ expectedAnswer: LINE, requiredForm }).success).toBe(true);
			const strict = {
				...withoutId,
				variations: [
					{ ...withoutId.variations[0], blanks: [{ expectedAnswer: LINE, requiredForm }] }
				]
			};
			expect(questionTemplateSchema.safeParse(strict).success).toBe(true);
		}
		expect(blankSchema.safeParse({ expectedAnswer: LINE, requiredForm: 'droite' }).success).toBe(
			false
		);
	});
});

describe('15 — specs de test du modèle', () => {
	it('réponse attendue lisible : la spec passe', () => {
		const result = runTestSpec(lineTemplate(), {
			description: 'réduite',
			variables: { a: '2', b: '1' },
			answers: ['y=2x+1'],
			expected: { status: 'correct' }
		});
		expect(result.passed).toBe(true);
	});

	it('réponse attendue qui n’est pas une équation : la spec échoue avec un message', () => {
		const result = runTestSpec(lineTemplate('{{a}}x-y+{{b}}'), {
			description: 'modèle fautif',
			variables: { a: '2', b: '1' },
			answers: ['y=2x+1'],
			expected: { status: 'incorrect' }
		});
		expect(result.passed).toBe(false);
		expect(result.error).toMatch(/illisible/);
	});
});
