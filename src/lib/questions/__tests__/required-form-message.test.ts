/**
 * Forme exigée : message écrit par l'auteur (outils-manquants n° 75)
 * =================================================================
 *
 * Phase 0 du 2026-11-28 (David : « je te suis », recommandations Q1 à Q4) :
 *
 * - Q1 / Q4 : un motif porte un `message` facultatif, `{ pattern, acceptable?, message? }` ;
 *   l'élève dont la réponse juste ne respecte pas le motif le lit à la place de la phrase
 *   générale ; variables résolues ; la note ne change pas (mauvaise forme) ;
 * - Q2 : la forme « acceptable » garde sa phrase ;
 * - Q3 : une erreur prévue de même valeur que la bonne réponse se lit sur une mauvaise forme
 *   quand l'élève l'a écrite telle quelle (comparée sur l'écriture : `14/10` n'est pas `7/5`) ;
 *   elle passe avant le message de forme.
 */

import { describe, it, expect } from 'vitest';
import { buildExpectedResult, type ExpectedResult } from '../expected-result';
import { generateInstance } from '../generator/instance-generator';
import { runTestSpec } from '../test-spec-runner';
import { checkTemplate } from '../review/check-template';
import { questionTemplateSchema, requiredFormSchema } from '../template-schema';
import { REQUIRED_FORM_FEEDBACK, getRequiredFormFeedback } from '../required-form-validator';
import { customRequiredForm, messageOf } from '../form-options';
import { validateAnswer, validateAnswerDetailed } from '#lib/utils/answer-validator.ts';
import { answerErrorKinds } from '../error-kinds';
import type { QuestionInstance, QuestionTemplate, TemplateBlank } from '../types';

// Fixtures

const FORME = 'Écris un entier plus une fraction plus petite que 1.';
const RECOPIE = '7/5 n’est pas plus petite que 1 : il reste un entier dedans.';
/** Entier + fraction : `1 + 2/5` */
const MIXTE = { pattern: 'a:integer + b:integer/c:integer', message: FORME };

function template(
	blanks: TemplateBlank[],
	variables: { name: string; expression: string }[] = []
): QuestionTemplate {
	return {
		id: 't',
		type: 'fill_in_blanks',
		level: 1,
		grades: ['2'],
		title: 't',
		variations: [{ statement: '$\\frac{7}{5}=?$', blanks, variables }]
	} as unknown as QuestionTemplate;
}

function generate(t: QuestionTemplate, seed = 1): QuestionInstance {
	const r = generateInstance(t, seed);
	if (!r.success) throw new Error(JSON.stringify(r.errors));
	return r.instance;
}

const answer = (values: string[]) => ({ values, latex: values });
const remarks = (r: ExpectedResult) =>
	r.lines.flatMap((l) => (l.kind === 'remark' ? [l.text] : []));

const AVEC_MESSAGE = template([{ expectedAnswer: '1+2/5', requiredForm: MIXTE }]);
const AVEC_ERREUR = template([
	{
		expectedAnswer: '1+2/5',
		requiredForm: MIXTE,
		expectedErrors: [{ answer: '7/5', message: RECOPIE }]
	}
]);

/** Modèle minimal valide pour le schéma strict, avec la forme exigée donnée */
const strictTemplate = (requiredForm: object) => ({
	title: 'Entier et fraction',
	status: 'draft',
	variations: [
		{ statement: '$\\frac{7}{5}=?$', blanks: [{ expectedAnswer: '1+2/5', requiredForm }] }
	],
	grades: ['2'],
	level: 1
});

const issues = (requiredForm: object) => {
	const parsed = questionTemplateSchema.safeParse(strictTemplate(requiredForm));
	return parsed.success ? 'ok' : parsed.error.issues.map((i) => i.message).join(' ; ');
};

describe('message de forme : schéma (Q4)', () => {
	it('motif avec message accepté (schéma souple et schéma strict)', () => {
		expect(requiredFormSchema.parse(MIXTE)).toEqual(MIXTE);
		expect(issues(MIXTE)).toBe('ok');
	});

	it.each([
		['vide', '   '],
		['trop long', 'x'.repeat(501)]
	])('message %s → refusé', (_why, message) => {
		expect(requiredFormSchema.safeParse({ pattern: 'a + b/c', message }).success).toBe(false);
		expect(issues({ pattern: 'a + b/c', message })).not.toBe('ok');
	});
});

describe('message de forme : correcteur', () => {
	it('nominal : réponse juste hors motif → mauvaise forme et message de l’auteur', () => {
		const instance = generate(AVEC_MESSAGE);
		const result = validateAnswer(['\\frac{7}{5}'], instance, ['\\frac{7}{5}']);
		expect(result.status).toBe('bad_form');
		expect(result.feedback).toBe(FORME);
		expect(remarks(buildExpectedResult(instance, answer(['\\frac{7}{5}'])))).toEqual([FORME]);
	});

	it('sans message : la phrase générale, comme avant', () => {
		expect(getRequiredFormFeedback({ pattern: 'a + b/c' }, false)).toBe(
			REQUIRED_FORM_FEEDBACK.pattern
		);
	});

	it('bonne forme : juste, aucun message', () => {
		const r = buildExpectedResult(generate(AVEC_MESSAGE), answer(['1+\\frac{2}{5}']));
		expect(r.status).toBe('correct');
		expect(remarks(r)).toEqual([]);
	});

	it('Q2 : la forme acceptable garde sa phrase', () => {
		const instance = generate(
			template([
				{
					expectedAnswer: '7/5',
					requiredForm: { pattern: 'u/v', acceptable: 'a + b/c', message: FORME }
				}
			])
		);
		const result = validateAnswer(['1+\\frac{2}{5}'], instance, ['1+\\frac{2}{5}']);
		expect(result.status).toBe('unoptimal_form');
		expect(result.constraintViolations?.[0]?.feedback).toBe(REQUIRED_FORM_FEEDBACK.acceptable);
	});

	it('variables du tirage résolues dans le message', () => {
		const t = template(
			[
				{
					expectedAnswer: '1+2/{{d}}',
					requiredForm: {
						pattern: 'a:integer + b:integer/c:integer',
						message: 'Le numérateur doit être plus petit que {{d}}.'
					}
				}
			],
			[{ name: 'd', expression: '5' }]
		);
		const instance = generate(t);
		const form = instance.blanks?.[0].requiredForm;
		expect(form && typeof form === 'object' ? form.message : undefined).toBe(
			'Le numérateur doit être plus petit que 5.'
		);
	});

	it('le message ne décale aucun tirage (même graine, avec ou sans message)', () => {
		const variables = [{ name: 'd', expression: '3..9' }];
		const blank = (message?: string): TemplateBlank => ({
			expectedAnswer: '1+2/{{d}}',
			requiredForm: {
				pattern: 'a:integer + b:integer/c:integer',
				...(message && { message })
			}
		});
		for (let seed = 1; seed <= 20; seed++) {
			const sans = generate(template([blank()], variables), seed);
			const avec = generate(template([blank('Plus petit que {{1..9}}.')], variables), seed);
			expect(avec.resolvedVariables).toEqual(sans.resolvedVariables);
		}
	});
});

describe('erreur prévue de même valeur, sur une mauvaise forme (Q3)', () => {
	it('nominal : l’élève écrit l’erreur prévue → son message, à la place du message de forme', () => {
		const r = buildExpectedResult(generate(AVEC_ERREUR), answer(['\\frac{7}{5}']));
		expect(r.status).toBe('bad_form');
		expect(remarks(r)).toEqual([RECOPIE]);
	});

	it('même écriture tapée autrement (`7/5`) → son message', () => {
		expect(remarks(buildExpectedResult(generate(AVEC_ERREUR), answer(['7/5'])))).toEqual([RECOPIE]);
	});

	it('limite : même valeur, autre écriture (`14/10`) → message de forme', () => {
		const r = buildExpectedResult(generate(AVEC_ERREUR), answer(['\\frac{14}{10}']));
		expect(r.status).toBe('bad_form');
		expect(remarks(r)).toEqual([FORME]);
	});

	it('spec de test : le message de l’erreur prévue est vu', () => {
		const result = runTestSpec(AVEC_ERREUR, {
			description: 'recopie',
			variables: {},
			answers: ['\\frac{7}{5}'],
			expected: {
				status: 'bad_form',
				constraintViolations: ['form'],
				expectedErrorMessage: RECOPIE
			}
		});
		expect(result.passed).toBe(true);
	});

	it('forme nommée (fraction) : l’erreur prévue écrite telle quelle est lue aussi', () => {
		const t = template([
			{
				expectedAnswer: '7/5',
				requiredForm: 'fraction',
				expectedErrors: [{ answer: '1,4', message: 'On attend une fraction, pas un décimal.' }]
			}
		]);
		const r = buildExpectedResult(generate(t), answer(['1{,}4']));
		expect(r.status).toBe('bad_form');
		expect(remarks(r)).toEqual(['On attend une fraction, pas un décimal.']);
	});

	it('types d’erreur du prof : l’erreur prévue lue sur une mauvaise forme compte sous son nom', () => {
		const instance = generate(AVEC_ERREUR);
		const detail = validateAnswerDetailed(instance, answer(['\\frac{7}{5}']));
		const kinds = answerErrorKinds(instance, detail, ['\\frac{7}{5}'], 'bad_form');
		expect(kinds.kinds).toEqual([{ blank: 1, expected: expect.any(String) }]);
	});

	it('rejeu de publication : le modèle passe', () => {
		expect(checkTemplate(AVEC_ERREUR).generation.failures).toEqual([]);
	});
});

describe('éditeur : motif, acceptable et message', () => {
	it('message renseigné → gardé, vide → absent', () => {
		expect(customRequiredForm('a+b/c', '', ` ${FORME} `)).toEqual({
			pattern: 'a+b/c',
			message: FORME
		});
		expect(customRequiredForm('a+b/c', 'u', '')).toEqual({ pattern: 'a+b/c', acceptable: 'u' });
		expect(messageOf(MIXTE)).toBe(FORME);
		expect(messageOf('product')).toBe('');
	});
});
