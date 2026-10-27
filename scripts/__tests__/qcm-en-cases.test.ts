/**
 * QCM → case choix (lot 4 de figure-et-choix) : conversion et garde.
 *
 * La garde doit dire NON quand la conversion change ce que voit l'élève ou la
 * bonne réponse : des modèles « convertis » abîmés à la main le prouvent.
 */

import { describe, it, expect } from 'vitest';
import type { QuestionTemplate, QuestionVariation } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark/types/template';
import {
	compareMigration,
	convertQcmTemplate,
	mathQuestionMarksToEllipsis,
	renameExpressionVariables
} from '../lib/qcm-en-cases';

// Fixtures
function qcm(variations: Partial<QuestionVariation>[], extra: Partial<QuestionTemplate> = {}) {
	return {
		id: 'qcm',
		title: 'QCM',
		status: 'draft',
		grades: ['5E'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		variations: variations.map((variation) => ({
			...variation,
			statement: templateMarkdown(String(variation.statement ?? ''))
		})),
		...extra
	} as QuestionTemplate;
}

const SIGN = qcm(
	[
		{
			statement: templateMarkdown(
				'Quel est le signe du facteur manquant ?\n\n$$(-{{a}})*?={{b}}$$'
			),
			variables: [
				{ name: 'a', expression: '30..99' },
				{ name: 'b', expression: '30..99' }
			],
			correctChoiceIndex: ['1'],
			correction: { steps: ['Le facteur manquant est donc {{solution}}.'] }
		}
	],
	{
		shared: {
			choices: [{ content: templateMarkdown('positif') }, { content: templateMarkdown('négatif') }]
		},
		options: { shuffleChoices: false },
		testSpecs: [
			{
				description: 'négatif',
				variables: { a: '30', b: '66' },
				selectedChoices: [1],
				expected: { status: 'correct' }
			}
		]
	}
);

function converted(template: QuestionTemplate): QuestionTemplate {
	const result = convertQcmTemplate(template);
	if (!result.ok) throw new Error(result.reason);
	return result.template;
}

// Tests
describe('conversion', () => {
	it('bloc choix en fin d’énoncé, bonne réponse dans la case, QCM retiré', () => {
		const next = converted(SIGN);
		const [variation] = next.variations;
		expect(String(variation.statement)).toBe(
			'Quel est le signe du facteur manquant ?\n\n$$(-{{a}})*…={{b}}$$\n\n```choix\nmelanger: non\n- positif\n- négatif\n```'
		);
		expect(variation.blanks).toEqual([{ expectedAnswer: '1' }]);
		expect(variation).not.toHaveProperty('choices');
		expect(variation).not.toHaveProperty('correctChoiceIndex');
		expect(next).not.toHaveProperty('shared');
		expect(next).not.toHaveProperty('options');
		expect(next.testSpecs?.[0]).toEqual({
			description: 'négatif',
			variables: { a: '30', b: '66' },
			answers: ['1'],
			expected: { status: 'correct' }
		});
	});

	it('plusieurs réponses, calculées : indices joints par « ; », plusieurs: oui', () => {
		const next = converted(
			qcm(
				[
					{
						statement: templateMarkdown('Lesquels ?'),
						choices: [
							{ content: templateMarkdown('A') },
							{ content: templateMarkdown('B') },
							{ content: templateMarkdown('C') }
						],
						correctChoiceIndex: ['0', '{{f1}}']
					}
				],
				{ multipleAnswers: true }
			)
		);
		expect(String(next.variations[0].statement)).toContain('```choix\nplusieurs: oui\n- A');
		expect(next.variations[0].blanks).toEqual([{ expectedAnswer: '0;{{f1}}' }]);
		expect(next).not.toHaveProperty('multipleAnswers');
	});

	it('énoncé vide de la variation : celui de shared, comme le générateur', () => {
		const next = converted(
			qcm([{ statement: templateMarkdown(''), correctChoiceIndex: ['0'] }], {
				shared: {
					statement: templateMarkdown('Pair ou impair ?'),
					choices: [{ content: templateMarkdown('pair') }, { content: templateMarkdown('impair') }]
				}
			})
		);
		expect(String(next.variations[0].statement)).toMatch(/^Pair ou impair \?\n\n```choix/);
	});

	it('refus : pas un QCM, ou une variation sans bonne réponse', () => {
		const blanks = qcm([
			{ statement: templateMarkdown('$2+3=?$'), blanks: [{ expectedAnswer: '5' }] }
		]);
		expect(convertQcmTemplate(blanks)).toMatchObject({ ok: false });
		const noAnswer = qcm([
			{
				statement: templateMarkdown('?'),
				choices: [{ content: templateMarkdown('A') }, { content: templateMarkdown('B') }]
			}
		]);
		expect(convertQcmTemplate(noAnswer)).toEqual({
			ok: false,
			reason: 'variation 1 : aucune bonne réponse'
		});
	});
});

describe('« ? » de formule → « … »', () => {
	it('dans les formules seulement : le « ? » de la phrase reste', () => {
		expect(mathQuestionMarksToEllipsis('Signe ? $a*?=b$ et $$?:c$$ ?')).toBe(
			'Signe ? $a*…=b$ et $$…:c$$ ?'
		);
	});
});

describe('variables expression… renommées expr…', () => {
	it('déclarations, {{…}}, conditions, specs ; le mot « expression » du texte reste', () => {
		const result = renameExpressionVariables(
			qcm(
				[
					{
						statement: templateMarkdown('Signe de cette expression : $${{expression1}}$$'),
						variables: [{ name: 'expression1', expression: '{{a}}*x' }],
						conditions: ['expression1 != 0'],
						correction: { steps: ['{{eval:expression1}} est une expression.'] }
					}
				],
				{
					testSpecs: [
						{ description: 'd', variables: { expression1: '2x' }, expected: { status: 'correct' } }
					]
				}
			)
		);
		if (!result.ok) throw new Error(result.reason);
		const [variation] = result.template.variations;
		expect(String(variation.statement)).toBe('Signe de cette expression : $${{expr1}}$$');
		expect(variation.variables?.[0].name).toBe('expr1');
		expect(variation.conditions).toEqual(['expr1 != 0']);
		expect(variation.correction?.steps?.[0]).toBe('{{eval:expr1}} est une expression.');
		expect(result.template.testSpecs?.[0].variables).toEqual({ expr1: '2x' });
	});

	it('refus si le nom expr… est déjà pris', () => {
		const result = renameExpressionVariables(
			qcm([
				{
					variables: [
						{ name: 'expression1', expression: '1' },
						{ name: 'expr1', expression: '2' }
					]
				}
			])
		);
		expect(result).toEqual({ ok: false, reason: 'nom déjà pris : expr1' });
	});
});

describe('garde', () => {
	it('modèle bien converti : aucun écart, specs vertes', () => {
		const check = compareMigration(SIGN, converted(SIGN), 10);
		expect(check.compared).toBe(10);
		expect(check.gaps).toEqual([]);
		expect(check.newReasons).toEqual([]);
	});

	it('NON si la bonne réponse change', () => {
		const next = converted(SIGN);
		next.variations[0].blanks = [{ expectedAnswer: '0' }];
		const check = compareMigration(SIGN, next, 3);
		expect(check.gaps.map((gap) => gap.what.split(' :')[0])).toContain('bonne réponse');
	});

	it('NON si le « ? » de la formule devient une case', () => {
		const next = converted(SIGN);
		next.variations[0].statement = templateMarkdown(
			String(next.variations[0].statement).replace('…', '?')
		);
		next.variations[0].blanks = [{ expectedAnswer: '' }, { expectedAnswer: '1' }];
		const check = compareMigration(SIGN, next, 3);
		expect(check.gaps[0]?.what).toBe('2 case(s), il en faut une seule, la case choix');
	});

	it('NON si un choix change de texte', () => {
		const next = converted(SIGN);
		next.variations[0].statement = templateMarkdown(
			String(next.variations[0].statement).replace('- négatif', '- strictement négatif')
		);
		const check = compareMigration(SIGN, next, 3);
		expect(check.gaps.map((gap) => gap.what.split(' :')[0])).toContain('choix');
	});

	it('NON si la correction change', () => {
		const next = converted(SIGN);
		next.variations[0].correction = { steps: ['Autre chose.'] };
		const check = compareMigration(SIGN, next, 3);
		expect(check.gaps.map((gap) => gap.what.split(' :')[0])).toContain('correction');
	});
});
