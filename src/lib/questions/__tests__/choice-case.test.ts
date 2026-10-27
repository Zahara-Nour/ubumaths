/**
 * Case « choix » : réponse, notation, envoi (chantier figure-et-choix § 2.1)
 * ==========================================================================
 *
 * Réponse = une chaîne dans `values[]` comme toute case : indices d'ORIGINE
 * séparés par `;` (« 1 », « 0;2 »), sans doublon. Une question réduite à une case
 * choix est notée EXACTEMENT comme le QCM (`statusFromChoices`) ; mêlée à
 * d'autres cases, le barème des cases (`statusFromBlankStatuses`).
 */
import { describe, it, expect } from 'vitest';
import { generateInstance } from '../generator/instance-generator';
import { gradeQuestion, isKnownForSrs, statusFromChoices } from '../grading';
import {
	choiceAnswerSchema,
	formatChoiceAnswer,
	parseChoiceAnswer,
	toOriginalChoiceValues
} from '../choice-case';
import { toDisplayInstance, toPublicQuestion } from '../public-question';
import type { QuestionInstance, QuestionTemplate } from '../types';
import { templateMarkdown } from '$lib/ubumark';
import { validateAnswer, validateAnswerDetailed } from '$lib/utils/answer-validator';

// Fixtures
function template(statement: string, expected: string[]): QuestionTemplate {
	return {
		id: 'test-choix',
		title: 'Choix',
		status: 'draft',
		type: 'fill_in_blanks',
		variations: [
			{
				statement: templateMarkdown(statement),
				blanks: expected.map((expectedAnswer) => ({ expectedAnswer }))
			}
		],
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1
	} as QuestionTemplate;
}

function generate(t: QuestionTemplate, seed = 42): QuestionInstance {
	const result = generateInstance(t, seed);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

const SINGLE = generate(template('Choisis.\n\n```choix\n- A\n- B\n- C\n```', ['1']));
const MULTIPLE = generate(
	template('Choisis.\n\n```choix\nplusieurs: oui\n- A\n- B\n- C\n- D\n```', ['0;2'])
);
const MIXED = generate(
	template('Calcule $2+3=?$.\n\n```choix\nmelanger: non\n- pair\n- impair\n```', ['5', '1'])
);

/** Réponse au format de la case : indices séparés par « ; » */
const asValue = (indexes: number[]) => indexes.join(';');

// Tests
describe('format de la réponse', () => {
	it('lecture : vide, un indice, plusieurs (triés à l’écriture)', () => {
		expect(parseChoiceAnswer('', 3)).toEqual([]);
		expect(parseChoiceAnswer('1', 3)).toEqual([1]);
		expect(parseChoiceAnswer('2;0', 3)).toEqual([0, 2]);
		expect(formatChoiceAnswer([2, 0])).toBe('0;2');
	});

	it('illisible, hors bornes, doublon → null', () => {
		for (const value of ['x', '5', '3', '1;1', '-1', '1;', ';', ' 1', '1.0', '01']) {
			expect(parseChoiceAnswer(value, 3), value).toBeNull();
		}
	});

	it('schéma Zod : refuse « x », « 5 » hors bornes, « 1;1 »', () => {
		const schema = choiceAnswerSchema(3);
		expect(schema.safeParse('0;2').success).toBe(true);
		expect(schema.safeParse('').success).toBe(true);
		for (const value of ['x', '5', '1;1']) {
			expect(schema.safeParse(value).success, value).toBe(false);
		}
	});
});

describe('bonne réponse calculée qui répète un indice (QCM migrés, lot 4)', () => {
	// `["0","{{f1}}","{{eval:2*f2}}"]` : un choix faux rend 0, déjà compté
	const repeated = (f1: number) => ({
		...template('Choisis.\n\n```choix\nplusieurs: oui\n- A\n- B\n- C\n```', [
			'0;{{f1}};{{eval:2*f2}}'
		]),
		variations: [
			{
				statement: templateMarkdown('Choisis.\n\n```choix\nplusieurs: oui\n- A\n- B\n- C\n```'),
				variables: [
					{ name: 'f1', expression: String(f1) },
					{ name: 'f2', expression: '1' }
				],
				blanks: [{ expectedAnswer: '0;{{f1}};{{eval:2*f2}}' }]
			}
		]
	});

	it('un indice répété compte une fois', () => {
		expect(generate(repeated(0)).blanks?.[0].expectedAnswer).toBe('0;2');
		expect(generate(repeated(1)).blanks?.[0].expectedAnswer).toBe('0;1;2');
	});

	it('la réponse d’un élève qui répète un indice reste refusée', () => {
		expect(choiceAnswerSchema(3).safeParse('0;0;2').success).toBe(false);
	});
});

describe('notation : une case choix seule = le QCM d’aujourd’hui', () => {
	const cases: { name: string; instance: QuestionInstance; checked: number[] }[] = [
		{ name: '1 réponse, juste', instance: SINGLE, checked: [1] },
		{ name: '1 réponse, fausse', instance: SINGLE, checked: [0] },
		{ name: '1 réponse, vide', instance: SINGLE, checked: [] },
		{ name: 'plusieurs, tous bons', instance: MULTIPLE, checked: [0, 2] },
		{ name: 'plusieurs, partiel', instance: MULTIPLE, checked: [2] },
		{ name: 'plusieurs, un faux', instance: MULTIPLE, checked: [0, 1, 2] },
		{ name: 'plusieurs, vide', instance: MULTIPLE, checked: [] }
	];

	it.each(cases)('$name : statut et points du QCM', ({ instance, checked }) => {
		const correct = parseChoiceAnswer(instance.blanks?.[0].expectedAnswer ?? '', 99) ?? [];
		const expected = statusFromChoices(checked, correct);
		const verdict = gradeQuestion(instance, { values: [asValue(checked)] });
		expect(verdict.status).toBe(expected);
		expect(verdict.points).toBe(
			expected === 'correct' ? 1 : expected === 'unoptimal_form' ? 0.5 : 0
		);
		expect(validateAnswerDetailed(instance, { values: [asValue(checked)] }).status).toBe(expected);
	});

	it('partiel : ½ PARTIEL (à revoir pour le SRS), « Il manque des réponses. »', () => {
		const verdict = gradeQuestion(MULTIPLE, { values: ['2'] });
		expect(verdict).toMatchObject({ status: 'unoptimal_form', points: 0.5, partial: true });
		expect(isKnownForSrs(verdict)).toBe(false);
		const result = validateAnswer(['2'], MULTIPLE);
		expect(result).toMatchObject({ isCorrect: false, status: 'unoptimal_form' });
		expect(result.feedback).toBe('Il manque des réponses.');
	});

	it('faux : la lettre AFFICHÉE du bon choix', () => {
		const order = SINGLE.blanks?.[0].choice?.order ?? [];
		const letter = String.fromCharCode(65 + order.indexOf(1));
		expect(validateAnswer(['0'], SINGLE).feedback).toBe(`Le choix correct est: ${letter}`);
	});

	it('réponse illisible côté navigateur : case fausse', () => {
		for (const value of ['x', '7', '1;1']) {
			expect(gradeQuestion(SINGLE, { values: [value] }).status, value).toBe('incorrect');
			expect(validateAnswer([value], SINGLE).isCorrect).toBe(false);
		}
	});
});

describe('notation : case choix mêlée à d’autres cases (barème des cases)', () => {
	it('tout juste → 1', () => {
		expect(gradeQuestion(MIXED, { values: ['5', '1'] }).points).toBe(1);
	});

	it('choix faux → 0', () => {
		expect(gradeQuestion(MIXED, { values: ['5', '0'] })).toMatchObject({
			status: 'incorrect',
			points: 0
		});
	});

	it('choix vide, le reste juste → ½ (une case vide sur deux)', () => {
		expect(gradeQuestion(MIXED, { values: ['5', ''] })).toMatchObject({
			status: 'unoptimal_form',
			points: 0.5,
			partial: true
		});
	});

	it('statut de chaque case', () => {
		expect(
			validateAnswerDetailed(MIXED, { values: ['6', '1'] }).blanks.map((b) => b.status)
		).toEqual(['incorrect', 'correct']);
	});
});

describe('évaluation : ce que reçoit le navigateur, ce que convertit le serveur', () => {
	it('PublicQuestion : choix dans l’ordre affiché, ni bonne réponse ni ordre d’origine', () => {
		const question = toPublicQuestion(SINGLE, { position: 0, delaySeconds: 30 });
		const blank = question.blanks?.[0];
		const order = SINGLE.blanks?.[0].choice?.order ?? [];
		expect(blank).toEqual({
			type: 'choice',
			choice: { choices: order.map((i) => ['A', 'B', 'C'][i]), multiple: false }
		});
		const json = JSON.stringify(question);
		expect(json).not.toContain('expectedAnswer');
		expect(json).not.toContain('"order"');
		expect(json).not.toContain('isCorrect');
		// L'énoncé ne liste les choix que dans l'ordre affiché
		expect(question.statement).toBe(String(SINGLE.statement));
	});

	it('toDisplayInstance : ordre affiché = ordre d’origine du navigateur (identité)', () => {
		const display = toDisplayInstance(
			toPublicQuestion(MULTIPLE, { position: 0, delaySeconds: 30 })
		);
		expect(display.blanks?.[0]).toMatchObject({
			type: 'choice',
			expectedAnswer: '',
			choice: { order: [0, 1, 2, 3], multiple: true }
		});
	});

	it('serveur : positions affichées → indices d’origine, triés', () => {
		const order = MULTIPLE.blanks?.[0].choice?.order ?? [];
		const positions = [order.indexOf(2), order.indexOf(0)];
		expect(toOriginalChoiceValues(MULTIPLE, [positions.join(';')])).toEqual({ values: ['0;2'] });
		expect(toOriginalChoiceValues(MIXED, ['5', '1'])).toEqual({ values: ['5', '1'] });
		expect(toOriginalChoiceValues(MULTIPLE, [''])).toEqual({ values: [''] });
	});

	it('serveur : réponse illisible, hors bornes, doublon → erreur (400)', () => {
		for (const value of ['x', '5', '1;1']) {
			expect(toOriginalChoiceValues(SINGLE, [value]), value).toEqual({
				error: 'Réponse à une case choix illisible'
			});
		}
	});
});
