/**
 * Erreurs prévues d'une case (chantier `idees-format`, idée 3)
 * ============================================================
 *
 * Phase 0 validée par David le 2026-11-21 : l'élève dont la réponse a la même
 * VALEUR qu'une erreur prévue lit son message à la correction, à la place du
 * type d'erreur deviné ; la note ne change pas. Cases à écriture mathématique
 * ordinaire seulement.
 */

import { describe, it, expect } from 'vitest';
import { buildExpectedResult, type ExpectedResult } from '../expected-result';
import { generateInstance } from '../generator/instance-generator';
import { runTestSpec } from '../test-spec-runner';
import { checkTemplate } from '../review/check-template';
import { toPublicQuestion } from '../public-question';
import { questionTemplateSchema } from '../template-schema';
import type { QuestionInstance, QuestionTemplate, TemplateBlank, TestSpec } from '../types';

// Fixtures

const SOUSTRAIT = 'Tu as soustrait au lieu d’additionner.';

function template(
	statement: string,
	blanks: TemplateBlank[],
	extra: { variables?: { name: string; expression: string }[]; options?: object } = {}
): QuestionTemplate {
	return {
		id: 't',
		type: 'fill_in_blanks',
		level: 1,
		grades: ['6'],
		title: 't',
		...(extra.options && { options: extra.options }),
		variations: [{ statement, blanks, variables: extra.variables ?? [] }]
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

/** « 7 + 4 », erreur prévue « 3 » */
const ADDITION = template('$7+4=?$', [
	{ expectedAnswer: '11', expectedErrors: [{ answer: '3', message: SOUSTRAIT }] }
]);

describe('erreur prévue : message à l’élève', () => {
	it('nominal : la réponse prévue reçoit son message, la note ne change pas', () => {
		const r = buildExpectedResult(generate(ADDITION), answer(['3']));
		expect(r.status).toBe('incorrect');
		expect(remarks(r)).toEqual([SOUSTRAIT]);
	});

	it('une autre réponse fausse ne reçoit pas le message', () => {
		const r = buildExpectedResult(generate(ADDITION), answer(['12']));
		expect(r.status).toBe('incorrect');
		expect(remarks(r)).not.toContain(SOUSTRAIT);
	});

	it('une réponse juste ne reçoit rien', () => {
		const r = buildExpectedResult(generate(ADDITION), answer(['11']));
		expect(r.status).toBe('correct');
		expect(remarks(r)).toEqual([]);
	});

	it('Q1 : même valeur, autre écriture (`8/6` pour l’erreur `4/3`)', () => {
		const t = template('L’inverse de $\\frac{4}{3}$ est $?$', [
			{
				expectedAnswer: '3/4',
				expectedErrors: [{ answer: '4/3', message: 'Tu as recopié la fraction.' }]
			}
		]);
		const r = buildExpectedResult(generate(t), answer(['\\frac{8}{6}']));
		expect(r.status).toBe('incorrect');
		expect(remarks(r)).toEqual(['Tu as recopié la fraction.']);
	});

	it('le message prime sur le type d’erreur deviné (opposé du résultat)', () => {
		const t = template('$5-17=?$', [
			{
				expectedAnswer: '-12',
				expectedErrors: [{ answer: '12', message: 'Tu as calculé 17 − 5.' }]
			}
		]);
		const r = buildExpectedResult(generate(t), answer(['12']));
		expect(remarks(r)).toEqual(['Tu as calculé 17 − 5.']);
	});

	it('variables : réponse et message résolus pour le tirage', () => {
		const t = template(
			'${{a}}+{{b}}=?$',
			[
				{
					expectedAnswer: '{{eval:a+b}}',
					expectedErrors: [{ answer: '{{eval:a-b}}', message: 'Tu as calculé ${{a}}-{{b}}$.' }]
				}
			],
			{
				variables: [
					{ name: 'a', expression: '7' },
					{ name: 'b', expression: '4' }
				]
			}
		);
		const instance = generate(t);
		expect(instance.blanks?.[0].expectedErrors?.[0]).toMatchObject({
			answer: '3',
			message: 'Tu as calculé $7 - 4$.'
		});
		expect(remarks(buildExpectedResult(instance, answer(['3'])))).toEqual([
			'Tu as calculé $7 - 4$.'
		]);
	});

	it('limite : erreur prévue qui tombe sur la bonne réponse → ignorée, l’élève a juste', () => {
		const t = template('$3-3=?$', [
			{ expectedAnswer: '0', expectedErrors: [{ answer: '-0', message: 'Erreur de signe.' }] }
		]);
		const r = buildExpectedResult(generate(t), answer(['0']));
		expect(r.status).toBe('correct');
		expect(remarks(r)).toEqual([]);
	});

	it('limite : deux erreurs prévues de même valeur → la première écrite', () => {
		const t = template('$7+4=?$', [
			{
				expectedAnswer: '11',
				expectedErrors: [
					{ answer: '3', message: 'Premier.' },
					{ answer: '6/2', message: 'Second.' }
				]
			}
		]);
		expect(remarks(buildExpectedResult(generate(t), answer(['3'])))).toEqual(['Premier.']);
	});
});

describe('erreur prévue : le hasard de l’instance n’est pas décalé', () => {
	it('même graine, avec ou sans erreur prévue → même tirage', () => {
		const variables = [
			{ name: 'a', expression: '1..9' },
			{ name: 'b', expression: '1..9' }
		];
		const sans = template('${{a}}+{{b}}=?$', [{ expectedAnswer: '{{eval:a+b}}' }], { variables });
		const avec = template(
			'${{a}}+{{b}}=?$',
			[
				{
					expectedAnswer: '{{eval:a+b}}',
					// `{{1..9}}` consomme un tirage : il doit venir d'une autre source
					expectedErrors: [{ answer: '{{eval:a-b}}+{{1..9}}', message: 'Soustraction.' }]
				}
			],
			{ variables }
		);
		for (let seed = 1; seed <= 20; seed++) {
			const a = generate(sans, seed);
			const b = generate(avec, seed);
			expect(b.statement).toBe(a.statement);
			expect(b.resolvedVariables).toEqual(a.resolvedVariables);
		}
	});
});

describe('erreur prévue : erreurs de l’auteur', () => {
	it('cases appariées librement → génération refusée, message situé', () => {
		const t = template(
			'$?$ et $?$',
			[
				{ expectedAnswer: '2', expectedErrors: [{ answer: '3', message: 'Non.' }] },
				{ expectedAnswer: '5' }
			],
			{ options: { orderIndependent: true } }
		);
		const r = generateInstance(t, 1);
		expect(r.success).toBe(false);
		if (!r.success) expect(r.errors.join(' ')).toMatch(/Case 1 : une erreur prévue/);
	});

	it('message vide → schéma refusé', () => {
		const t = template('$7+4=?$', [
			{ expectedAnswer: '11', expectedErrors: [{ answer: '3', message: '  ' }] }
		]);
		const { id: _id, ...rest } = t;
		void _id;
		expect(questionTemplateSchema.safeParse(rest).success).toBe(false);
	});

	it('rejeu de publication : un modèle juste passe, un modèle refusé dit la case', () => {
		const ok = checkTemplate({
			...ADDITION,
			testSpecs: [
				{ description: 'juste', variables: {}, answers: ['11'], expected: { status: 'correct' } }
			]
		});
		expect(ok.generation.failures).toEqual([]);
		const refuse = checkTemplate(
			template(
				'$?$ et $?$',
				[
					{ expectedAnswer: '2', expectedErrors: [{ answer: '3', message: 'Non.' }] },
					{ expectedAnswer: '5' }
				],
				{ options: { orderIndependent: true } }
			)
		);
		expect(refuse.passed).toBe(false);
		expect(refuse.generation.failures[0]?.errors.join(' ')).toMatch(/erreur prévue/);
	});
});

describe('erreur prévue : primitive', () => {
	it('case primitive → génération refusée (jugée sur la fonction, jamais sur l’attendu)', () => {
		const t = template('Une primitive de $2x$ : $?$', [
			{
				expectedAnswer: 'x^2',
				answerKind: 'primitive',
				integrand: '2x',
				expectedErrors: [{ answer: '2', message: 'Tu as dérivé.' }]
			} as TemplateBlank
		]);
		const r = generateInstance(t, 1);
		expect(r.success).toBe(false);
		if (!r.success) expect(r.errors.join(' ')).toMatch(/ni primitive/);
	});
});

describe('erreur prévue : spec de test', () => {
	const spec = (message: string): TestSpec => ({
		description: 'soustraction',
		variables: {},
		answers: ['3'],
		expected: { status: 'incorrect', expectedErrorMessage: message }
	});

	it('la spec qui attend le bon message passe', () => {
		const result = runTestSpec(ADDITION, spec(SOUSTRAIT));
		expect(result.passed).toBe(true);
		expect(result.actual.expectedErrorMessages).toEqual([SOUSTRAIT]);
	});

	it('la spec qui attend un autre message échoue', () => {
		expect(runTestSpec(ADDITION, spec('Autre chose.')).passed).toBe(false);
	});
});

describe('erreur prévue : évaluation notée', () => {
	it('la version publique de la question ne porte pas les erreurs prévues', () => {
		const question = toPublicQuestion(generate(ADDITION), { position: 0, delaySeconds: 30 });
		expect(JSON.stringify(question)).not.toContain(SOUSTRAIT);
		expect(JSON.stringify(question)).not.toContain('expectedErrors');
	});
});
