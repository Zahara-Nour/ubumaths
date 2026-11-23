/**
 * Case répondue en QCM depuis ses erreurs prévues (chantier `idees-format`, idée 4, PR 2)
 * =====================================================================================
 *
 * Phase 0 validée par David le 2026-11-21 : une case à erreurs prévues peut se
 * répondre en QCM (la bonne réponse et jusqu'à trois erreurs prévues, mélangées,
 * sans doublon de valeur) ; une erreur prévue égale à la bonne réponse sur le
 * tirage est retirée ; cliquer une erreur prévue affiche son message. Q2 : moins
 * de choix s'il en manque (2 au moins), aucun → la question reste en saisie.
 * Q3 : question à une seule case. L'auteur peut interdire le QCM sur une case.
 */

import { describe, it, expect } from 'vitest';
import { asChoiceInstance, isAnsweredAsChoice } from '../choice-from-errors';
import { buildExpectedResult, type ExpectedResult } from '../expected-result';
import { answerErrorKinds } from '../error-kinds';
import { generateInstance } from '../generator/instance-generator';
import { toPublicQuestion } from '../public-question';
import { questionTemplateSchema } from '../template-schema';
import { correctChoiceIndexesOf, isChoiceBlank, toOriginalChoiceValues } from '../choice-case';
import { validateAnswer, validateAnswerDetailed } from '#lib/utils/answer-validator.ts';
import type { ExpectedError, QuestionInstance, QuestionTemplate, TemplateBlank } from '../types';

// Fixtures

const SOUSTRAIT = 'Tu as soustrait au lieu d’additionner.';
const MULTIPLIE = 'Tu as multiplié.';
const DIVISE = 'Tu as divisé.';
const RECOPIE = 'Tu as recopié un nombre.';

function template(statement: string, blanks: TemplateBlank[]): QuestionTemplate {
	return {
		id: 't',
		level: 1,
		grades: ['6'],
		title: 't',
		variations: [{ statement, blanks, variables: [] }]
	} as unknown as QuestionTemplate;
}

function generate(t: QuestionTemplate, seed = 1): QuestionInstance {
	const r = generateInstance(t, seed);
	if (!r.success) throw new Error(JSON.stringify(r.errors));
	return r.instance;
}

function addition(errors: ExpectedError[], extra: Partial<TemplateBlank> = {}): QuestionTemplate {
	return template('$8+4=?$', [{ expectedAnswer: '12', expectedErrors: errors, ...extra }]);
}

const THREE_ERRORS: ExpectedError[] = [
	{ answer: '4', message: SOUSTRAIT },
	{ answer: '32', message: MULTIPLIE },
	{ answer: '2', message: DIVISE }
];

/** La question en QCM (échoue si elle reste en saisie) */
function asChoice(t: QuestionTemplate, seed = 1): QuestionInstance {
	const instance = asChoiceInstance(generate(t, seed), seed);
	if (!instance) throw new Error('restée en saisie');
	return instance;
}

/** Choix dans l'ordre d'origine (bonne réponse d'abord) */
function choicesOf(instance: QuestionInstance): string[] {
	const blank = instance.blanks?.[0];
	if (!isChoiceBlank(blank)) throw new Error('pas une case choix');
	return blank.choice.choices;
}

/** Indice d'origine du choix qui porte ce contenu */
function indexOf(instance: QuestionInstance, content: string): string {
	return String(choicesOf(instance).indexOf(content));
}

const answer = (values: string[]) => ({ values, latex: values });
const remarks = (r: ExpectedResult) =>
	r.lines.flatMap((l) => (l.kind === 'remark' ? [l.text] : []));

describe('case → choix au tirage', () => {
	it('nominal : la bonne réponse et les trois erreurs prévues deviennent les choix', () => {
		const instance = asChoice(addition(THREE_ERRORS));
		expect(choicesOf(instance)).toEqual(['$12$', '$4$', '$32$', '$2$']);
		const blank = instance.blanks?.[0];
		if (!isChoiceBlank(blank)) throw new Error('pas une case choix');
		expect(correctChoiceIndexesOf(blank)).toEqual([0]);
		expect(blank.choice.multiple).toBe(false);
		expect([...blank.choice.order].sort()).toEqual([0, 1, 2, 3]);
	});

	it('l’énoncé garde la formule, la case devient des pointillés, les choix suivent', () => {
		const statement = String(asChoice(addition(THREE_ERRORS)).statement);
		expect(statement).not.toContain('\\placeholder');
		expect(statement).toContain('$8 + 4 = \\ldots$');
		expect(statement).toMatch(/```choix\ncase: 0\n/);
	});

	it('les nombres du tirage ne changent pas (même graine, même question)', () => {
		const t = template('$a+b=?$', [
			{
				expectedAnswer: '{{eval:{{a}}+{{b}}}}',
				expectedErrors: [{ answer: '{{eval:{{a}}-{{b}}}}', message: SOUSTRAIT }]
			}
		]);
		(t.variations![0] as { variables: unknown[] }).variables = [
			{ name: 'a', expression: '{{random:20..30}}' },
			{ name: 'b', expression: '{{random:2..9}}' }
		];
		const typed = generate(t, 42);
		const qcm = asChoice(t, 42);
		expect(typed.resolvedVariables?.length).toBe(2);
		expect(qcm.resolvedVariables).toEqual(typed.resolvedVariables);
		expect(choicesOf(qcm)[0]).toBe(`$${typed.blanks?.[0].expectedAnswerLatex}$`);
	});

	it('même graine, même ordre des choix', () => {
		const a = asChoice(addition(THREE_ERRORS), 7);
		const b = asChoice(addition(THREE_ERRORS), 7);
		expect(a.blanks?.[0].choice?.order).toEqual(b.blanks?.[0].choice?.order);
	});

	it('trois erreurs prévues au plus : les trois premières utilisables', () => {
		const instance = asChoice(
			addition([...THREE_ERRORS, { answer: '48', message: 'Tu as multiplié par 4.' }])
		);
		expect(choicesOf(instance)).toEqual(['$12$', '$4$', '$32$', '$2$']);
	});

	it('limite : une erreur prévue égale à la bonne réponse sur ce tirage est retirée', () => {
		const instance = asChoice(
			addition([{ answer: '12', message: RECOPIE }, ...THREE_ERRORS.slice(0, 2)])
		);
		expect(choicesOf(instance)).toEqual(['$12$', '$4$', '$32$']);
	});

	it('limite : même valeur que la bonne réponse, autre écriture (`24/2`) : retirée', () => {
		const instance = asChoice(addition([{ answer: '24/2', message: RECOPIE }, THREE_ERRORS[0]]));
		expect(choicesOf(instance)).toEqual(['$12$', '$4$']);
	});

	it('limite : deux erreurs prévues de même valeur, la première écrite reste', () => {
		const instance = asChoice(
			addition([THREE_ERRORS[0], { answer: '8/2', message: 'Autre message.' }])
		);
		expect(choicesOf(instance)).toEqual(['$12$', '$4$']);
		expect(instance.blanks?.[0].expectedErrors?.map((e) => e.message)).toEqual([SOUSTRAIT]);
	});

	it('limite : une erreur prévue de même écriture que la bonne réponse n’est jamais un choix', () => {
		const instance = asChoiceInstance(generate(addition(THREE_ERRORS)), 1)!;
		const blank = instance.blanks![0];
		expect(new Set(blank.choice!.choices).size).toBe(blank.choice!.choices.length);
	});

	it('case à unité : même valeur dans une autre unité (`1.5 km` pour `1500 m`) : retirée', () => {
		const t = template('Convertis : $1{,}5\\text{ km} = ?$', [
			{
				expectedAnswer: '1500[m]',
				unit: { expected: true },
				expectedErrors: [
					{ answer: '1.5[km]', message: RECOPIE },
					{ answer: '150[m]', message: 'Un zéro de trop ou de moins.' },
					{ answer: '15000[cm]', message: 'Autre écriture de 150 m.' }
				]
			}
		]);
		const instance = asChoice(t);
		expect(choicesOf(instance)).toHaveLength(2);
		expect(instance.blanks?.[0].expectedErrors?.map((e) => e.answer)).toEqual(['150[m]']);
	});

	it('case à arrondir : la bonne réponse montrée est l’arrondi demandé, jugé juste', () => {
		const t = template('Arrondis $\\sqrt{2}$ au centième : $?$', [
			{
				expectedAnswer: '{{eval:sqrt(2)}}',
				precision: { type: 'decimal', digits: 2 },
				expectedErrors: [
					{ answer: '1.41', message: 'Égale à l’arrondi : jamais un choix.' },
					{ answer: '1.42', message: 'Tu as arrondi au-dessus.' },
					{ answer: '1.4', message: 'Un seul chiffre après la virgule.' }
				]
			}
		]);
		const instance = asChoice(t);
		expect(choicesOf(instance)).toEqual(['$1.41$', '$1.42$', '$1.4$']);
		expect(validateAnswer(['0'], instance).isCorrect).toBe(true);
	});

	it('case à arrondir : zéros finaux gardés (`1.40` au centième de 1.4)', () => {
		const t = template('$?$', [
			{
				expectedAnswer: '1.4',
				precision: { type: 'decimal', digits: 2 },
				expectedErrors: [{ answer: '1.5', message: 'Non.' }]
			}
		]);
		expect(choicesOf(asChoice(t))[0]).toBe('$1.40$');
	});

	it('chiffres significatifs : l’arrondi à 3 chiffres', () => {
		const t = template('$?$', [
			{
				expectedAnswer: '2/3',
				precision: { type: 'significant', digits: 3 },
				expectedErrors: [{ answer: '0.666', message: 'Tronqué.' }]
			}
		]);
		expect(choicesOf(asChoice(t))).toEqual(['$0.667$', '$0.666$']);
	});

	it('tolérance, ordre de grandeur : pas un arrondi à montrer → reste en saisie', () => {
		const tolerance = addition(THREE_ERRORS, {
			precision: { type: 'tolerance', tolerance: 0.5, mode: 'absolute' }
		});
		expect(asChoiceInstance(generate(tolerance), 1)).toBeNull();
	});

	it('Q2 : une seule erreur prévue utilisable → deux choix', () => {
		expect(choicesOf(asChoice(addition([THREE_ERRORS[0]])))).toEqual(['$12$', '$4$']);
	});

	it('Q2 : aucune erreur prévue utilisable sur ce tirage → reste en saisie', () => {
		const t = addition([{ answer: '12', message: RECOPIE }]);
		expect(asChoiceInstance(generate(t), 1)).toBeNull();
	});

	it('case sans erreur prévue → reste en saisie', () => {
		expect(
			asChoiceInstance(generate(template('$8+4=?$', [{ expectedAnswer: '12' }])), 1)
		).toBeNull();
	});

	it('Q3 : question à deux cases → reste en saisie', () => {
		const t = template('$8+4=?$ et $8-4=?$', [
			{ expectedAnswer: '12', expectedErrors: [THREE_ERRORS[0]] },
			{ expectedAnswer: '4' }
		]);
		expect(asChoiceInstance(generate(t), 1)).toBeNull();
	});

	it('veto de l’auteur (« jamais en QCM ») → reste en saisie', () => {
		const t = addition(THREE_ERRORS, { neverChoice: true });
		expect(generate(t).blanks?.[0].neverChoice).toBe(true);
		expect(asChoiceInstance(generate(t), 1)).toBeNull();
	});

	it('la question d’origine n’est pas modifiée', () => {
		const typed = generate(addition(THREE_ERRORS));
		const before = JSON.stringify(typed);
		asChoiceInstance(typed, 1);
		expect(JSON.stringify(typed)).toBe(before);
	});
});

describe('correction de la question en QCM', () => {
	const t = addition(THREE_ERRORS);

	it('la bonne réponse cochée est juste', () => {
		const instance = asChoice(t);
		expect(validateAnswer(['0'], instance).isCorrect).toBe(true);
		const r = buildExpectedResult(instance, answer(['0']));
		expect(r.status).toBe('correct');
		expect(remarks(r)).toEqual([]);
	});

	it('une erreur prévue cochée est fausse, avec son message', () => {
		const instance = asChoice(t);
		const r = buildExpectedResult(instance, answer([indexOf(instance, '$32$')]));
		expect(r.status).toBe('incorrect');
		expect(remarks(r)).toEqual([MULTIPLIE]);
	});

	it('côté prof, l’erreur prévue cochée compte sous son nom', () => {
		const named = addition([{ answer: '4', message: SOUSTRAIT, label: 'Soustraction' }]);
		const instance = asChoice(named);
		const values = [indexOf(instance, '$4$')];
		const detail = validateAnswerDetailed(instance, answer(values));
		const kinds = answerErrorKinds(instance, detail, values, 'incorrect');
		expect(kinds.kinds).toEqual([{ blank: 1, expected: 'Soustraction' }]);
	});
});

describe('évaluation notée : version envoyée à l’élève', () => {
	it('les choix partent dans l’ordre affiché, sans les erreurs prévues ni la bonne réponse', () => {
		const instance = asChoice(addition(THREE_ERRORS));
		const question = toPublicQuestion(instance, { position: 0, delaySeconds: 20 });
		const json = JSON.stringify(question);
		expect(json).not.toContain(SOUSTRAIT);
		expect(json).not.toContain('expectedErrors');
		const blank = instance.blanks![0];
		expect(question.blanks?.[0].choice?.choices).toEqual(
			blank.choice!.order.map((i) => blank.choice!.choices[i])
		);
	});
});

describe('évaluation notée : trajet du serveur', () => {
	it('positions affichées → indices d’origine → faux, avec le message de la bonne erreur', () => {
		const instance = asChoice(addition(THREE_ERRORS), 5);
		const order = instance.blanks![0].choice!.order;
		for (const [k, message] of [SOUSTRAIT, MULTIPLIE, DIVISE].entries()) {
			const shown = String(order.indexOf(k + 1));
			const converted = toOriginalChoiceValues(instance, [shown]);
			if ('error' in converted) throw new Error(converted.error);
			expect(converted.values).toEqual([String(k + 1)]);
			const r = buildExpectedResult(instance, answer(converted.values));
			expect(r.status).toBe('incorrect');
			expect(remarks(r)).toEqual([message]);
		}
		const right = toOriginalChoiceValues(instance, [String(order.indexOf(0))]);
		if ('error' in right) throw new Error(right.error);
		expect(validateAnswer(right.values, instance).isCorrect).toBe(true);
	});
});

describe('schéma du modèle : veto « jamais en QCM »', () => {
	it('accepte `neverChoice: true` sur une case', () => {
		const { id: _id, ...rest } = addition(THREE_ERRORS, { neverChoice: true });
		void _id;
		const parsed = questionTemplateSchema.safeParse({ ...rest, status: 'draft' });
		expect(parsed.success ? [] : parsed.error.issues).toEqual([]);
	});
});

describe('question répondue en QCM : repère (PR 3)', () => {
	it('la question passée en QCM le dit', () => {
		expect(isAnsweredAsChoice(asChoice(addition(THREE_ERRORS)))).toBe(true);
	});

	it('la même question en saisie ne le dit pas', () => {
		expect(isAnsweredAsChoice(generate(addition(THREE_ERRORS)))).toBe(false);
	});

	it('un QCM écrit par l’auteur n’est pas « répondu en QCM »', () => {
		const authored = {
			...generate(addition(THREE_ERRORS)),
			blanks: [
				{
					type: 'choice',
					expectedAnswer: '0',
					choice: { choices: ['$12$', '$4$'], order: [0, 1], multiple: false }
				}
			]
		} as unknown as QuestionInstance;
		expect(isAnsweredAsChoice(authored)).toBe(false);
	});

	it('le repère survit au passage en JSON (copie figée d’un contrôle)', () => {
		const stored: unknown = JSON.parse(JSON.stringify(asChoice(addition(THREE_ERRORS))));
		expect(isAnsweredAsChoice(stored)).toBe(true);
	});

	it('rien de lisible → faux', () => {
		expect(isAnsweredAsChoice(null)).toBe(false);
		expect(isAnsweredAsChoice({ blanks: 'x' })).toBe(false);
	});
});
