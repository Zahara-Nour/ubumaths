/**
 * Saisie mal écrite ou qui ne s'évalue pas, hors du cas « une case, ordre fixé » :
 * - cases à ordre libre : même règle que E53 (`58,` pour 58 → message de forme) ;
 * - V126 : une saisie qui ne s'évalue pas dans une case à arrondi (`58,5,`) ne
 *   fait plus lever la correction case par case — elle seule est fausse.
 */

import { describe, it, expect } from 'vitest';
import {
	validateAnswer,
	validateAnswerDetailed,
	validateBlanksDetailed
} from '../answer-validator';
import { gradeQuestion } from '#lib/questions/grading.ts';
import type { InstanceBlank, QuestionInstance } from '#lib/questions/types.ts';
import type { ResolvedMarkdown } from '#lib/ubumark/index.ts';

const FORM = "Ta réponse n'est pas écrite sous la forme demandée.";
const TENTH: InstanceBlank = {
	expectedAnswer: '58.46',
	type: 'math',
	precision: { type: 'decimal', digits: 1 }
};
const SEVEN: InstanceBlank = { expectedAnswer: '7', type: 'math' };
const WHOLE: InstanceBlank = { expectedAnswer: '58', type: 'math' };
const HALF: InstanceBlank = { expectedAnswer: '0.5', type: 'math' };
const UNEVALUABLE = ['58,5,', '58,,5', '58.5.', '(', '\\frac{1}{', '58,5+', '='];

function instanceOf(blanks: InstanceBlank[], orderIndependent = false): QuestionInstance {
	return {
		templateId: 'test-saisie-illisible',
		statement: 'Test' as ResolvedMarkdown,
		blanks,
		grades: ['6'],
		level: 1,
		generatedAt: new Date().toISOString(),
		resolvedVariables: [],
		...(orderIndependent && { options: { orderIndependent: true } })
	};
}

describe('V126 — saisie qui ne s’évalue pas dans une case à arrondi (ordre fixé)', () => {
	it.each(UNEVALUABLE)('« %s » : elle seule est fausse, l’autre case reste juste', (typed) => {
		const instance = instanceOf([TENTH, SEVEN]);
		const answers = [typed, '7'];
		expect(validateBlanksDetailed(answers, instance, answers).statuses).toEqual([
			'incorrect',
			'correct'
		]);
		const detailed = validateAnswerDetailed(instance, { values: answers, latex: answers });
		expect(detailed.status).toBe('incorrect');
		expect(detailed.blanks.map((b) => b.status)).toEqual(['incorrect', 'correct']);
	});

	it('la note ne change pas : 0, une case fausse', () => {
		const verdict = gradeQuestion(instanceOf([TENTH, SEVEN]), { values: ['58,5,', '7'] });
		expect(verdict.status).toBe('incorrect');
		expect(verdict.points).toBe(0);
	});

	it('seule dans sa question : refusée, comme dans une case sans arrondi', () => {
		for (const typed of UNEVALUABLE) {
			const result = validateAnswer([typed], instanceOf([TENTH]), [typed]);
			expect(result.isCorrect, typed).toBe(false);
			expect(result.status, typed).not.toBe('bad_form');
		}
	});

	it('une erreur de MODÈLE lève encore : attendu illisible', () => {
		const broken: InstanceBlank = { ...TENTH, expectedAnswer: '(' };
		const answers = ['58', '7'];
		expect(() => validateBlanksDetailed(answers, instanceOf([broken, SEVEN]), answers)).toThrow();
	});

	it('limite : 58,5 et 7 → juste', () => {
		const answers = ['58,5', '7'];
		expect(validateBlanksDetailed(answers, instanceOf([TENTH, SEVEN]), answers).statuses).toEqual([
			'correct',
			'correct'
		]);
	});
});

describe('ordre libre — nombre mal écrit : la règle de E53', () => {
	it('58, pour 58 (et 7 juste) → message de forme, mauvaise forme', () => {
		for (const typed of ['58,', '58{,}', '58.']) {
			for (const answers of [
				[typed, '7'],
				['7', typed]
			]) {
				const instance = instanceOf([WHOLE, SEVEN], true);
				const result = validateAnswer(answers, instance, answers);
				expect(result.isCorrect, typed).toBe(false);
				expect(result.status, typed).toBe('bad_form');
				expect(result.feedback, typed).toBe(FORM);
				const detailed = validateAnswerDetailed(instance, { values: answers, latex: answers });
				expect(detailed.blanks.map((b) => b.status)).toEqual(
					answers.map((a) => (a === typed ? 'bad_form' : 'correct'))
				);
				expect(detailed.blanks[answers.indexOf(typed)].remarks).toEqual([FORM]);
			}
		}
	});

	it(',5 pour 0,5 → message de forme', () => {
		const answers = [',5', '7'];
		const result = validateAnswer(answers, instanceOf([SEVEN, HALF], true), answers);
		expect(result.status).toBe('bad_form');
		expect(result.feedback).toBe(FORM);
	});

	it('la note ne change pas : 0 avant, 0 après', () => {
		const verdict = gradeQuestion(instanceOf([WHOLE, SEVEN], true), { values: ['58,', '7'] });
		expect(verdict.status).toBe('bad_form');
		expect(verdict.points).toBe(0);
	});

	it('une réponse bien écrite passe avant la mal écrite pour la même case', () => {
		// Deux cases 58 : « 58 » et « 58, » → les deux appariées, la seconde mal écrite
		const answers = ['58,', '58'];
		const instance = instanceOf([WHOLE, WHOLE], true);
		expect(validateBlanksDetailed(answers, instance, answers).statuses).toEqual([
			'bad_form',
			'correct'
		]);
	});

	it('valeur fausse mal écrite : 57, → faux, pas le message de forme', () => {
		const answers = ['57,', '7'];
		const instance = instanceOf([WHOLE, SEVEN], true);
		const result = validateAnswer(answers, instance, answers);
		expect(result.isCorrect).toBe(false);
		expect(result.status).not.toBe('bad_form');
		expect(result.feedback).not.toBe(FORM);
		expect(validateBlanksDetailed(answers, instance, answers).statuses).toEqual([
			'incorrect',
			'correct'
		]);
	});

	it('limite : 58 et 7, dans le désordre → juste', () => {
		const answers = ['7', '58'];
		expect(validateAnswer(answers, instanceOf([WHOLE, SEVEN], true), answers).isCorrect).toBe(true);
	});

	it('case à arrondi : 58, pour 58,46 à l’unité → message de forme ; 58, au dixième → faux', () => {
		const unit: InstanceBlank = { ...TENTH, precision: { type: 'decimal', digits: 0 } };
		const answers = ['58,', '7'];
		const atUnit = validateAnswer(answers, instanceOf([unit, SEVEN], true), answers);
		expect(atUnit.status).toBe('bad_form');
		expect(atUnit.feedback).toBe(FORM);
		const atTenth = validateAnswer(answers, instanceOf([TENTH, SEVEN], true), answers);
		expect(atTenth.isCorrect).toBe(false);
		expect(atTenth.status).not.toBe('bad_form');
	});

	it.each(UNEVALUABLE)(
		'case à arrondi, « %s » ne s’évalue pas : elle seule est fausse',
		(typed) => {
			const answers = [typed, '7'];
			const instance = instanceOf([TENTH, SEVEN], true);
			expect(validateBlanksDetailed(answers, instance, answers).statuses).toEqual([
				'incorrect',
				'correct'
			]);
			expect(validateAnswer(answers, instance, answers).isCorrect).toBe(false);
		}
	);
});
