/**
 * La démo « la forme compte » ne ment pas : chaque verdict qu'elle affiche est celui
 * du vrai correcteur, sur le cas réel #553 (décision de David : un carré écrit en
 * produit est perfectible, la recopie est refusée, la valeur passe avant la forme).
 */
import { describe, expect, it } from 'vitest';
import { validateAnswer } from '$lib/utils/answer-validator';
import { gradeQuestion } from '$lib/questions/grading';
import { REQUIRED_FORM_FEEDBACK } from '$lib/questions/required-form-validator';
import type { QuestionInstance } from '$lib/questions/types';
import { FORM_DEMO } from '../tour';

const instance = {
	blanks: [
		{ expectedAnswer: FORM_DEMO.expected, type: 'math', requiredForm: FORM_DEMO.requiredForm }
	],
	statement: '$$?$$',
	options: {}
} as unknown as QuestionInstance;

/** Statut et points : la note que reçoit l'élève */
const grade = (latex: string) => gradeQuestion(instance, { values: [latex] });

describe('FORM_DEMO', () => {
	it('montre les quatre verdicts : juste, perfectible, mauvaise forme, faux', () => {
		expect(FORM_DEMO.answers.map((a) => a.status)).toEqual([
			'correct',
			'unoptimal_form',
			'bad_form',
			'incorrect'
		]);
	});

	it.each(FORM_DEMO.answers.map((a) => [a.display, a]))(
		'« %s » : le correcteur rend le statut annoncé',
		(_display, answer) => {
			expect(grade(answer.latex).status).toBe(answer.status);
		}
	);

	it('les remarques de forme sont celles du correcteur, mot pour mot', () => {
		const byStatus = Object.fromEntries(FORM_DEMO.answers.map((a) => [a.status, a]));
		expect(byStatus.unoptimal_form.remark).toBe(REQUIRED_FORM_FEEDBACK.acceptable);
		expect(byStatus.bad_form.remark).toBe(REQUIRED_FORM_FEEDBACK.pattern);
		for (const answer of [byStatus.unoptimal_form, byStatus.bad_form]) {
			const { feedback } = validateAnswer([answer.latex], instance, [answer.latex]);
			expect(feedback, answer.display).toContain(answer.remark);
		}
	});

	it('les points annoncés sont ceux du barème', () => {
		const announced = FORM_DEMO.answers.map((a) => a.points);
		const graded = FORM_DEMO.answers.map((a) => grade(a.latex).points);
		expect(graded).toEqual([1, 0.5, 0, 0]);
		expect(announced).toEqual(['1 point', '½ point', '0 point', '0 point']);
	});
});
