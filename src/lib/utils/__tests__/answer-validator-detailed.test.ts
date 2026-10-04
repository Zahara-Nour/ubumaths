/**
 * Statut de chaque case + remarques rattachées (R11, chantier « résultat attendu »)
 * ===============================================================================
 *
 * `validateAnswerDetailed` rend, pour une instance et une réponse d'élève, le
 * statut global (IDENTIQUE à celui de `validateAnswer`) et, pour chaque case,
 * son statut et ses remarques de forme. Un QCM rend en plus l'issue de chaque
 * choix (bon coché, bon oublié, faux coché).
 */

import { describe, it, expect } from 'vitest';
import { validateAnswer, validateAnswerDetailed } from '../answer-validator';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { REAL_TEMPLATES } from '$lib/server/validation/__tests__/fixtures/real-templates';
import { CONSTRAINT_FEEDBACK, FORGOTTEN_PERCENT_SIGN } from '$lib/questions/feedback';
import type { InstanceBlank, QuestionInstance, ValidationStatus } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';

// Fixtures
function instanceWith(
	blanks: InstanceBlank[],
	options?: QuestionInstance['options'],
	extra?: Partial<QuestionInstance>
): QuestionInstance {
	return {
		templateId: 'detailed',
		statement: 'Test' as ResolvedMarkdown,
		blanks,
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: new Date().toISOString(),
		resolvedVariables: [{ name: 'n', value: '12' }],
		...(options && { options }),
		...extra
	};
}

const math = (expectedAnswer: string, more?: Partial<InstanceBlank>): InstanceBlank => ({
	expectedAnswer,
	type: 'math',
	...more
});

/** Statut global de validateAnswer, lu comme le lanceur de specs */
function globalStatus(values: string[], instance: QuestionInstance): ValidationStatus {
	const r = validateAnswer(values, instance, values);
	return r.status ?? (r.isCorrect ? 'correct' : 'incorrect');
}

// Tests
describe('validateAnswerDetailed — statut de chaque case', () => {
	const two = instanceWith([math('7'), math('8')]);

	it.each<[string[], ValidationStatus[]]>([
		[
			['7', '8'],
			['correct', 'correct']
		],
		[
			['7', '9'],
			['correct', 'incorrect']
		],
		[
			['', '8'],
			['empty', 'correct']
		],
		[
			['', ''],
			['empty', 'empty']
		]
	])('%j → %j', (values, statuses) => {
		const v = validateAnswerDetailed(two, { values, latex: values });
		expect(v.blanks.map((b) => b.status)).toEqual(statuses);
		expect(v.blanks.map((b) => b.index)).toEqual([0, 1]);
		expect(v.status).toBe(globalStatus(values, two));
	});

	it('forme non optimale : remarque rattachée à SA case, pas à l’autre', () => {
		// `08` : zéro inutile (contrainte `zeros`, avertissement par défaut)
		const v = validateAnswerDetailed(two, { values: ['7', '08'], latex: ['7', '08'] });
		expect(v.blanks[0]).toEqual({ index: 0, status: 'correct', remarks: [], answer: '7' });
		expect(v.blanks[1].status).toBe('unoptimal_form');
		expect(v.blanks[1].remarks).toContain(CONSTRAINT_FEEDBACK.zeros.single);
		expect(v.status).toBe('unoptimal_form');
		expect(v.status).toBe(globalStatus(['7', '08'], two));
	});

	it('mauvaise forme : bad_form, sa remarque sur sa case', () => {
		// `4+4` pour 8 : forme exigée stricte par défaut (ADR 0013)
		const v = validateAnswerDetailed(two, { values: ['7', '4+4'], latex: ['7', '4+4'] });
		expect(v.blanks[1].status).toBe('bad_form');
		expect(v.blanks[1].remarks).toContain(CONSTRAINT_FEEDBACK.form.single);
		expect(v.blanks[0].remarks).toEqual([]);
		expect(v.status).toBe(globalStatus(['7', '4+4'], two));
	});

	it('vide partiel : statut global identique à validateAnswer', () => {
		const three = instanceWith([math('1'), math('2'), math('3')]);
		const values = ['1', '', '3'];
		const v = validateAnswerDetailed(three, { values, latex: values });
		expect(v.blanks.map((b) => b.status)).toEqual(['correct', 'empty', 'correct']);
		expect(v.status).toBe(globalStatus(values, three));
	});

	it('sans `values` : cases préremplies lues, les autres vides', () => {
		const inst = instanceWith([math('7', { prefilled: '7' }), math('8')]);
		const v = validateAnswerDetailed(inst, {});
		expect(v.blanks.map((b) => b.status)).toEqual(['correct', 'empty']);
	});

	it('unité : la remarque d’unité reste sur la case', () => {
		const inst = instanceWith([math('20[km.h^{-1}]', { unit: { expected: true } })]);
		const ok = '20\\operatorname{km}\\cdot\\operatorname{h}^{-1}';
		const v = validateAnswerDetailed(inst, { values: [ok], latex: [ok] });
		expect(v.status).toBe(globalStatus([ok], inst));
		const bad = '20\\operatorname{m}';
		const w = validateAnswerDetailed(inst, { values: [bad], latex: [bad] });
		expect(w.blanks[0].status).toBe('incorrect');
		expect(w.blanks[0].remarks.length).toBeGreaterThan(0);
		expect(w.status).toBe(globalStatus([bad], inst));
	});

	it('intervalles : statut de la case', () => {
		const inst = instanceWith([
			math(']-\\infty;-2[\\cup]3;+\\infty[', { answerKind: 'intervalles' })
		]);
		const ok = ']-\\infty;-2[\\cup]3;+\\infty[';
		expect(validateAnswerDetailed(inst, { values: [ok], latex: [ok] }).blanks[0].status).toBe(
			'correct'
		);
		const bad = ']-2;3[';
		expect(validateAnswerDetailed(inst, { values: [bad], latex: [bad] }).blanks[0].status).toBe(
			'incorrect'
		);
	});

	it('acceptDecimal : `0{,}5` pour ½ est juste', () => {
		const inst = instanceWith([math('\\frac{1}{2}', { acceptDecimal: true })]);
		const v = validateAnswerDetailed(inst, { values: ['0{,}5'], latex: ['0{,}5'] });
		expect(v.blanks[0].status).toBe('correct');
		expect(v.status).toBe(globalStatus(['0{,}5'], inst));
	});

	it('rulesSuffice : toute réponse qui respecte la règle est juste', () => {
		const inst = instanceWith([
			math('3', { validationRules: [{ type: 'divisor', dividend: '{{n}}' }], rulesSuffice: true })
		]);
		expect(validateAnswerDetailed(inst, { values: ['4'], latex: ['4'] }).blanks[0].status).toBe(
			'correct'
		);
		expect(validateAnswerDetailed(inst, { values: ['5'], latex: ['5'] }).blanks[0].status).toBe(
			'incorrect'
		);
	});

	it('orderIndependent : un statut par réponse, remarque sur la réponse concernée', () => {
		const inst = instanceWith([math('2'), math('3')], { orderIndependent: true });
		const values = ['03', '2'];
		const v = validateAnswerDetailed(inst, { values, latex: values });
		expect(v.blanks.map((b) => b.status)).toEqual(['unoptimal_form', 'correct']);
		expect(v.blanks[0].remarks).toContain(CONSTRAINT_FEEDBACK.zeros.single);
		expect(v.blanks[1].remarks).toEqual([]);
		expect(v.status).toBe(globalStatus(values, inst));
		const wrong = ['3', '5'];
		const w = validateAnswerDetailed(inst, { values: wrong, latex: wrong });
		expect(w.blanks.map((b) => b.status)).toEqual(['correct', 'incorrect']);
		expect(w.status).toBe(globalStatus(wrong, inst));
	});

	it('nombre de réponses différent : jamais d’exception, toutes incorrect', () => {
		const v = validateAnswerDetailed(two, { values: ['7'] });
		expect(v.status).toBe('incorrect');
		expect(v.blanks.map((b) => b.status)).toEqual(['incorrect', 'incorrect']);
	});
});

describe('validateAnswerDetailed — QCM', () => {
	const choices = [
		{ content: 'a' as ResolvedMarkdown, isCorrect: true },
		{ content: 'b' as ResolvedMarkdown, isCorrect: false },
		{ content: 'c' as ResolvedMarkdown, isCorrect: true }
	];
	const multi = instanceWith([], undefined, {
		blanks: undefined,
		choices,
		correctChoiceIndex: ['0', '2'],
		multipleAnswers: true
	});
	const single = instanceWith([], undefined, {
		blanks: undefined,
		choices: [choices[0], choices[1]],
		correctChoiceIndex: '0'
	});

	it('simple, bon coché : correct, issues par choix', () => {
		const v = validateAnswerDetailed(single, { choiceIndexes: [0] });
		expect(v.status).toBe('correct');
		expect(v.choices?.map((c) => c.outcome)).toEqual(['checked-correct', 'unchecked']);
	});

	it('simple, faux coché : le bon est oublié, le faux coché à tort', () => {
		const v = validateAnswerDetailed(single, { choiceIndexes: [1] });
		expect(v.status).toBe('incorrect');
		expect(v.choices?.map((c) => c.outcome)).toEqual(['missed', 'checked-wrong']);
	});

	it('multiple, un bon oublié : statut global = validateAnswer, issue « missed »', () => {
		const v = validateAnswerDetailed(multi, { choiceIndexes: [0] });
		const r = validateAnswer([0], multi);
		expect(v.status).toBe(r.status ?? (r.isCorrect ? 'correct' : 'incorrect'));
		expect(v.choices?.map((c) => c.outcome)).toEqual(['checked-correct', 'unchecked', 'missed']);
		expect(v.blanks).toEqual([]);
	});
});

describe('validateAnswerDetailed — non-régression sur des modèles réels', () => {
	function real(name: keyof typeof REAL_TEMPLATES, seed: number): QuestionInstance {
		const r = generateInstance(REAL_TEMPLATES[name], seed);
		if (!r.success) throw new Error('génération');
		return r.instance;
	}

	it.each([1, 2, 3, 4, 5])('une case (graine %i) : juste, faux, vide, non optimal', (seed) => {
		const inst = real('singleBlank', seed);
		const expected = inst.blanks![0].expectedAnswer;
		for (const value of [expected, `${expected}1`, '', `0${expected}`]) {
			const v = validateAnswerDetailed(inst, { values: [value], latex: [value] });
			expect(v.status).toBe(globalStatus([value], inst));
		}
	});

	it.each([1, 2, 3])('plusieurs cases (graine %i)', (seed) => {
		const inst = real('multiBlank', seed);
		const [a, b] = inst.blanks!.map((x) => x.expectedAnswer);
		for (const values of [
			[a, b],
			[a, ''],
			[b, a],
			['', '']
		]) {
			expect(validateAnswerDetailed(inst, { values, latex: values }).status).toBe(
				globalStatus(values, inst)
			);
		}
	});

	it.each([1, 2, 3])('unité (graine %i)', (seed) => {
		const inst = real('unit', seed);
		const latex = inst.blanks![0].expectedAnswerLatex!;
		for (const value of [latex, '3', '']) {
			expect(validateAnswerDetailed(inst, { values: [value], latex: [value] }).status).toBe(
				globalStatus([value], inst)
			);
		}
	});

	it.each([1, 2, 3])('QCM réel (graine %i)', (seed) => {
		const inst = real('multipleChoice', seed);
		for (const idx of [0, 1]) {
			const r = validateAnswer(idx, inst);
			expect(validateAnswerDetailed(inst, { choiceIndexes: [idx] }).status).toBe(
				r.status ?? (r.isCorrect ? 'correct' : 'incorrect')
			);
		}
	});
});

describe('Revue PR #643', () => {
	it('orderIndependent : réponse non appariée, son message propre est gardé (% oublié)', () => {
		const inst = instanceWith([math('20\\%'), math('30\\%')], { orderIndependent: true });
		const v = validateAnswerDetailed(inst, { values: ['20', '30'], latex: ['20', '30'] });
		expect(v.blanks.map((b) => b.status)).toEqual(['incorrect', 'incorrect']);
		expect(v.blanks[0].remarks).toEqual([FORGOTTEN_PERCENT_SIGN]);
	});

	it('réponse retenue sans « x = » recopié (`answer`)', () => {
		const inst = instanceWith([math('5')]);
		const v = validateAnswerDetailed(inst, { values: ['x=5'], latex: ['x=5'] });
		expect(v.blanks[0]).toMatchObject({ status: 'correct', answer: '5' });
	});

	it('QCM à règles : issue de chaque choix selon les règles', () => {
		const inst = instanceWith([], undefined, {
			blanks: undefined,
			choices: [
				{ content: '3' as ResolvedMarkdown, isCorrect: true },
				{ content: '4' as ResolvedMarkdown, isCorrect: false }
			],
			correctChoiceIndex: '0',
			validationRules: [{ type: 'custom', expression: 'answer == 1' }]
		});
		const v = validateAnswerDetailed(inst, { choiceIndexes: [1] });
		expect(v.status).toBe('correct');
		expect(v.choices?.map((c) => c.outcome)).toEqual(['unchecked', 'checked-correct']);
		const w = validateAnswerDetailed(inst, { choiceIndexes: [0] });
		expect(w.status).toBe('incorrect');
		expect(w.choices?.map((c) => c.outcome)).toEqual(['checked-wrong', 'missed']);
	});

	it('QCM : le LaTeX est transmis à validateAnswer (forme exigée)', () => {
		const inst = instanceWith([], undefined, {
			blanks: undefined,
			choices: [
				{ content: 'a' as ResolvedMarkdown, isCorrect: true },
				{ content: 'b' as ResolvedMarkdown, isCorrect: false }
			],
			correctChoiceIndex: '0',
			requiredForm: 'fraction'
		} as Partial<QuestionInstance>);
		const latex = ['3'];
		const r = validateAnswer(0, inst, latex);
		const v = validateAnswerDetailed(inst, { choiceIndexes: [0], latex });
		expect(v.status).toBe(r.status ?? (r.isCorrect ? 'correct' : 'incorrect'));
	});
});

describe('case ordinaire — +\\infty est l’écriture du lycée', () => {
	it.each([
		['+\\infty', '+\\infty', 'correct'],
		['+\\infty', '\\infty', 'correct'],
		['\\infty', '+\\infty', 'correct'],
		['-\\infty', '-\\infty', 'correct'],
		['++\\infty', '+\\infty', 'unoptimal_form'],
		['-\\infty', '+\\infty', 'incorrect']
	] as const)('réponse %s, attendue %s : %s', (answer, expected, status) => {
		expect(globalStatus([answer], instanceWith([math(expected)]))).toBe(status);
	});
});

describe('case ordinaire — racine simplifiable (décision du 2026-10-04)', () => {
	it.each([
		['\\sqrt{12}', '2\\sqrt{3}', 'unoptimal_form'],
		['\\sqrt{4}', '2', 'unoptimal_form'],
		['2\\sqrt{3}', '2\\sqrt{3}', 'correct'],
		['\\sqrt{13}', '2\\sqrt{3}', 'incorrect'],
		['\\sqrt{3}', '2\\sqrt{3}', 'incorrect']
	] as const)('réponse %s, attendue %s : %s', (answer, expected, status) => {
		expect(globalStatus([answer], instanceWith([math(expected)]))).toBe(status);
	});

	it('message et contrainte reducedRadicals', () => {
		const result = validateAnswer(['\\sqrt{12}'], instanceWith([math('2\\sqrt{3}')]), [
			'\\sqrt{12}'
		]);
		expect(result.isCorrect).toBe(true);
		expect(result.constraintViolations?.map((v) => v.constraint)).toEqual(['reducedRadicals']);
		expect(JSON.stringify(result)).toContain(CONSTRAINT_FEEDBACK.reducedRadicals.single);
		expect(CONSTRAINT_FEEDBACK.reducedRadicals.single).toBe('La racine peut être simplifiée.');
	});

	it('option du modèle reducedRadicals: strict → mauvaise forme (exercice « réduire une racine »)', () => {
		const instance = instanceWith([math('2\\sqrt{3}')], {
			constraints: { reducedRadicals: 'strict' }
		});
		expect(globalStatus(['\\sqrt{12}'], instance)).toBe('bad_form');
		expect(globalStatus(['2\\sqrt{3}'], instance)).toBe('correct');
	});
});
