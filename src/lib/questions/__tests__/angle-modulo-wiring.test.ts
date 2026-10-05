/**
 * Option de case `angleModulo: "2pi"` dans toute la chaîne : validateur (navigateur),
 * barème serveur, `orderIndependent`, verdicts par case, générateur (case et
 * blankDefaults), schémas Zod, specs de test du modèle. Décision de David du
 * 2026-10-05 : « donne UN argument de z » — une réponse qui diffère de l'attendue
 * d'un multiple entier de 2π est juste ; sans l'option, rien ne change.
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

function instanceWith(
	blanks: InstanceBlank[],
	options?: QuestionInstance['options']
): QuestionInstance {
	return {
		templateId: 'argument',
		statement: 'Donne un argument de z' as ResolvedMarkdown,
		blanks,
		grades: ['T_EXP'],
		theme: 'Nombres complexes',
		domain: 'Forme exponentielle',
		level: 2,
		generatedAt: new Date().toISOString(),
		...(options && { options })
	};
}

function angleBlank(expectedAnswer = '\\frac{\\pi}{4}', modulo = true): InstanceBlank {
	return {
		expectedAnswer,
		type: 'math',
		...(modulo && { angleModulo: '2pi' as const })
	};
}

function statusOf(answer: string, blank: InstanceBlank): string {
	const result = validateAnswer([answer], instanceWith([blank]), [answer]);
	return result.status ?? (result.isCorrect ? 'correct' : 'incorrect');
}

function argumentTemplate(where: 'blank' | 'blankDefaults'): QuestionTemplate {
	return {
		id: 'test-argument',
		title: 'Argument',
		status: 'draft',
		...(where === 'blankDefaults' && {
			shared: { blankDefaults: { angleModulo: '2pi' } }
		}),
		variations: [
			{
				statement: templateMarkdown('Un argument de $e^{i\\frac{\\pi}{{{n}}}}$ : $?$'),
				variables: [{ name: 'n', expression: '4' }],
				blanks: [
					where === 'blank'
						? { expectedAnswer: '\\frac{\\pi}{{{n}}}', angleModulo: '2pi' }
						: { expectedAnswer: '\\frac{\\pi}{{{n}}}' }
				]
			}
		],
		grades: ['T_EXP'],
		theme: 'Nombres complexes',
		domain: 'Forme exponentielle',
		level: 2
	} as QuestionTemplate;
}

describe('validateAnswer : argument modulo 2π', () => {
	it.each([
		['\\frac{\\pi}{4}', 'correct'],
		['-\\frac{7\\pi}{4}', 'correct'],
		['\\frac{9\\pi}{4}', 'correct'],
		['\\frac{17\\pi}{4}', 'correct'],
		['\\frac{5\\pi}{4}', 'incorrect'],
		['\\frac{\\pi}{4}+2\\pi', 'bad_form'],
		['-\\frac{14\\pi}{8}', 'unoptimal_form'],
		['\\frac{2\\pi}{8}', 'unoptimal_form']
	])('%s pour π/4 → %s', (answer, status) => {
		expect(statusOf(answer, angleBlank())).toBe(status);
	});

	it('attendue négative ou nulle', () => {
		expect(statusOf('\\frac{4\\pi}{3}', angleBlank('-\\frac{2\\pi}{3}'))).toBe('correct');
		expect(statusOf('2\\pi', angleBlank('0'))).toBe('correct');
		expect(statusOf('\\pi', angleBlank('0'))).toBe('incorrect');
	});

	it('sans l’option : rien ne change', () => {
		expect(statusOf('-\\frac{7\\pi}{4}', angleBlank('\\frac{\\pi}{4}', false))).toBe('incorrect');
	});
});

describe('barème serveur = verdict du navigateur', () => {
	it.each([
		['-\\frac{7\\pi}{4}', 'correct', 1],
		['-\\frac{14\\pi}{8}', 'unoptimal_form', 0.5],
		['\\frac{5\\pi}{4}', 'incorrect', 0]
	] as const)('%s → %s', (answer, status, points) => {
		const instance = instanceWith([angleBlank()]);
		const server = gradeQuestion(instance, { values: [answer] });
		expect(statusOf(answer, angleBlank())).toBe(status);
		expect(server.status).toBe(status);
		expect(server.points).toBe(points);
	});
});

describe('orderIndependent et verdicts par case', () => {
	it('dans le désordre, à 2π près : juste', () => {
		const instance = instanceWith([angleBlank('\\frac{\\pi}{4}'), angleBlank('\\frac{3\\pi}{4}')], {
			orderIndependent: true
		});
		const answers = ['-\\frac{5\\pi}{4}', '-\\frac{7\\pi}{4}'];
		expect(validateAnswer(answers, instance, answers).isCorrect).toBe(true);
		expect(validateBlanksDetailed(answers, instance, answers).statuses).toEqual([
			'correct',
			'correct'
		]);
		expect(gradeQuestion(instance, { values: answers }).points).toBe(1);
	});

	it('la case juste à 2π près est verte', () => {
		expect(computeBlankVerdicts(['-\\frac{7\\pi}{4}'], instanceWith([angleBlank()]))).toEqual([
			true
		]);
	});
});

describe('générateur et schémas', () => {
	it.each(['blank', 'blankDefaults'] as const)('angleModulo recopié depuis %s', (where) => {
		const result = generateInstance(argumentTemplate(where), 1);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.instance.blanks![0].angleModulo).toBe('2pi');
	});

	it('schémas : "2pi" accepté, autre valeur refusée', () => {
		const { id: _id, ...withoutId } = argumentTemplate('blankDefaults');
		expect(questionTemplateSchema.safeParse(withoutId).success).toBe(true);
		const { id: _id2, ...strictCase } = argumentTemplate('blank');
		expect(questionTemplateSchema.safeParse(strictCase).success).toBe(true);
		expect(blankSchema.safeParse({ expectedAnswer: '0', angleModulo: '2pi' }).success).toBe(true);
		expect(blankDefaultsSchema.safeParse({ angleModulo: 'pi' }).success).toBe(false);
	});
});

describe('specs de test du modèle', () => {
	it('argument à 2π près attendu correct : la spec passe', () => {
		const spec = runTestSpec(argumentTemplate('blankDefaults'), {
			description: 'à 2π près',
			variables: { n: '4' },
			answers: ['-\\frac{7\\pi}{4}'],
			expected: { status: 'correct' }
		});
		expect(spec.passed).toBe(true);
	});
});
