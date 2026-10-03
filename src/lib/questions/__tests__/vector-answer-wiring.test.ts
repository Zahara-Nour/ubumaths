/**
 * Case « vecteur » (`answerKind: 'vecteur'`, option `vectorMode`) dans toute la
 * chaîne : validateur (navigateur), barème serveur, `orderIndependent`,
 * générateur, schémas Zod, specs de test du modèle, verdicts par case.
 * Comportements : docs/wip/reponse-vecteur-premier-progress.md.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../generator/instance-generator';
import { questionTemplateSchema, blankSchema, blankDefaultsSchema } from '../template-schema';
import { runTestSpec } from '../test-spec-runner';
import { gradeQuestion } from '../grading';
import { toPublicQuestion } from '../public-question';
import { validateAnswer, validateBlanksDetailed } from '$lib/utils/answer-validator';
import { computeBlankVerdicts } from '$lib/components/questions/blank-verdicts';
import type { InstanceBlank, QuestionInstance, QuestionTemplate, VectorMode } from '../types';
import { templateMarkdown, type ResolvedMarkdown } from '$lib/ubumark';

// Fixtures
const U = '(2;-3)';

function instanceWith(
	blanks: InstanceBlank[],
	options?: QuestionInstance['options']
): QuestionInstance {
	return {
		templateId: 'vecteur',
		statement: 'Donner un vecteur' as ResolvedMarkdown,
		blanks,
		grades: ['1_SPE'],
		theme: 'Géométrie',
		domain: 'Géométrie repérée',
		level: 1,
		generatedAt: new Date().toISOString(),
		...(options && { options })
	};
}

function vectorBlank(expectedAnswer: string, vectorMode?: VectorMode): InstanceBlank {
	return {
		expectedAnswer,
		type: 'math',
		answerKind: 'vecteur',
		...(vectorMode && { vectorMode })
	};
}

function statusOf(answer: string, blank: InstanceBlank): string {
	const result = validateAnswer([answer], instanceWith([blank]), [answer]);
	return result.status ?? (result.isCorrect ? 'correct' : 'incorrect');
}

function normalTemplate(
	expected = '({{a}};{{b}})',
	vectorMode: VectorMode = 'colineaire'
): QuestionTemplate {
	return {
		id: 'test-vecteur',
		title: 'Vecteur normal',
		status: 'draft',
		shared: { blankDefaults: { answerKind: 'vecteur', vectorMode } },
		variations: [
			{
				statement: templateMarkdown('Un vecteur normal : $\\vec{n}\\,?$'),
				variables: [
					{ name: 'a', expression: '2' },
					{ name: 'b', expression: '-3' }
				],
				blanks: [{ expectedAnswer: expected }]
			}
		],
		grades: ['1_SPE'],
		theme: 'Géométrie',
		domain: 'Géométrie repérée',
		level: 1
	};
}

describe('validateAnswer : case vecteur', () => {
	it.each([
		['(2;-3)', undefined, 'correct'],
		['\\begin{pmatrix}2\\\\ -3\\end{pmatrix}', undefined, 'correct'],
		['(-2;3)', undefined, 'incorrect'],
		['(-2;3)', 'colineaire', 'correct'],
		['(4;-6)', 'colineaire', 'correct'],
		['(0;0)', 'colineaire', 'incorrect'],
		['(3;2)', 'colineaire', 'incorrect'],
		['(2,3)', 'colineaire', 'incorrect'],
		['', 'colineaire', 'empty']
	] as const)('%s (%s) → %s', (answer, mode, status) => {
		expect(statusOf(answer, vectorBlank(U, mode))).toBe(status);
	});

	it('vecteur nul en mode colinéaire : message sous la case', () => {
		const result = validateAnswer(['(0;0)'], instanceWith([vectorBlank(U, 'colineaire')]), [
			'(0;0)'
		]);
		expect(result.feedback).toMatch(/nul/);
	});
});

describe('V12 — sans answerKind : rien ne change', () => {
	it('(2;-3) dans une case ordinaire reste faux, sans exception', () => {
		const plain: InstanceBlank = { expectedAnswer: U, type: 'math' };
		expect(statusOf('(-2;3)', plain)).toBe('incorrect');
	});
});

describe('V9 — barème serveur = verdict du navigateur', () => {
	it.each([
		['(2;-3)', 'exact', 'correct', 1],
		['(-4;6)', 'colineaire', 'correct', 1],
		['(-4;6)', 'exact', 'incorrect', 0],
		['(0;0)', 'colineaire', 'incorrect', 0],
		['', 'exact', 'empty', 0]
	] as const)('%s (%s) → %s', (answer, mode, status, points) => {
		const instance = instanceWith([vectorBlank(U, mode)]);
		const browser = validateAnswer([answer], instance, [answer]);
		expect(browser.status ?? (browser.isCorrect ? 'correct' : 'incorrect')).toBe(status);
		const server = gradeQuestion(instance, { values: [answer] });
		expect(server.status).toBe(status);
		expect(server.points).toBe(points);
	});
});

describe('V8 — orderIndependent', () => {
	const options = { orderIndependent: true };
	const blanks = [vectorBlank('(1;0)', 'colineaire'), vectorBlank('(0;1)', 'colineaire')];

	it('dans le désordre : juste', () => {
		const answers = ['(0;-2)', '(3;0)'];
		const instance = instanceWith(blanks, options);
		const result = validateAnswer(answers, instance, answers);
		expect(result.isCorrect).toBe(true);
		expect(validateBlanksDetailed(answers, instance, answers).statuses).toEqual([
			'correct',
			'correct'
		]);
	});

	it('un vecteur nul : faux', () => {
		const answers = ['(0;0)', '(3;0)'];
		const result = validateAnswer(answers, instanceWith(blanks, options), answers);
		expect(result.isCorrect).toBe(false);
	});
});

describe('verdicts par case (couleur des cases)', () => {
	it('colinéaire : la case est verte', () => {
		const instance = instanceWith([vectorBlank(U, 'colineaire')]);
		expect(computeBlankVerdicts(['(-4;6)'], instance)).toEqual([true]);
	});
});

describe('générateur, schémas, version publique', () => {
	it('recopie answerKind et vectorMode, rend l’attendue en colonne', () => {
		const result = generateInstance(normalTemplate(), 1);
		expect(result.success).toBe(true);
		if (!result.success) return;
		const blank = result.instance.blanks![0];
		expect(blank.answerKind).toBe('vecteur');
		expect(blank.vectorMode).toBe('colineaire');
		expect(blank.expectedAnswer).toBe('(2;-3)');
		expect(blank.expectedAnswerLatex).toBe('\\begin{pmatrix}2\\\\-3\\end{pmatrix}');
		const question = toPublicQuestion(result.instance, { position: 0, delaySeconds: 60 });
		expect(question.blanks?.[0].answerKind).toBe('vecteur');
		expect(JSON.stringify(question)).not.toContain('expectedAnswer');
	});

	it('cleanCoefficients ne touche pas un vecteur', () => {
		const template = normalTemplate('\\begin{pmatrix}{{a}}\\\\0\\end{pmatrix}');
		const result = generateInstance(
			{ ...template, shared: { ...template.shared, cleanCoefficients: true } },
			1
		);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.instance.blanks![0].expectedAnswer).toBe('\\begin{pmatrix}2\\\\0\\end{pmatrix}');
	});

	it('schémas : answerKind vecteur et vectorMode acceptés, valeur inconnue refusée', () => {
		const { id: _id, ...withoutId } = normalTemplate();
		expect(questionTemplateSchema.safeParse(withoutId).success).toBe(true);
		expect(
			blankSchema.safeParse({ expectedAnswer: U, answerKind: 'vecteur', vectorMode: 'exact' })
				.success
		).toBe(true);
		expect(
			blankDefaultsSchema.safeParse({ answerKind: 'vecteur', vectorMode: 'colineaire' }).success
		).toBe(true);
		expect(blankSchema.safeParse({ expectedAnswer: U, vectorMode: 'colinear' }).success).toBe(
			false
		);
		const strictCase = {
			...withoutId,
			variations: [
				{
					...withoutId.variations[0],
					blanks: [{ expectedAnswer: U, answerKind: 'vecteur', vectorMode: 'exact' }]
				}
			]
		};
		expect(questionTemplateSchema.safeParse(strictCase).success).toBe(true);
	});
});

describe('V10 — specs de test du modèle', () => {
	it('réponse colinéaire : la spec passe', () => {
		const result = runTestSpec(normalTemplate(), {
			description: 'opposé',
			variables: { a: '2', b: '-3' },
			answers: ['(-2;3)'],
			expected: { status: 'correct' }
		});
		expect(result.passed).toBe(true);
	});

	it('attendue illisible : la spec échoue avec un message', () => {
		const result = runTestSpec(normalTemplate('{{a}};{{b}}'), {
			description: 'modèle fautif',
			variables: { a: '2', b: '-3' },
			answers: ['(2;-3)'],
			expected: { status: 'incorrect' }
		});
		expect(result.passed).toBe(false);
		expect(result.error).toMatch(/illisible/);
	});

	it('attendue nulle en mode colinéaire : la spec échoue', () => {
		const result = runTestSpec(normalTemplate('(0;0)'), {
			description: 'modèle fautif',
			variables: { a: '2', b: '-3' },
			answers: ['(1;1)'],
			expected: { status: 'incorrect' }
		});
		expect(result.passed).toBe(false);
		expect(result.error).toMatch(/nul/);
	});
});
