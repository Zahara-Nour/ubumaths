/**
 * Résultat attendu : la phrase du type d'erreur sous une case fausse
 * (chantier `type-erreur`, PR 3)
 * ==================================================================
 *
 * Saisie, Contrôle blanc et copie de contrôle corrigée montrent tous le
 * résultat attendu : la phrase y est une remarque de case, comme « N'oublie pas
 * le symbole % ». La note ne change jamais ; un message existant prime.
 */

import { describe, it, expect } from 'vitest';
import { buildExpectedResult, type ExpectedResult } from '../expected-result';
import { generateInstance } from '../generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '../types';
import type { DetailedVerdict } from '#lib/utils/answer-validator.ts';

// Fixtures
function generate(
	statement: string,
	expected: (string | Record<string, unknown>)[],
	options?: Record<string, unknown>
): QuestionInstance {
	const t = {
		id: 't',
		type: 'fill_in_blanks',
		level: 1,
		grades: ['6'],
		title: 't',
		...(options && { options }),
		variations: [
			{
				statement,
				blanks: expected.map((e) => (typeof e === 'string' ? { expectedAnswer: e } : e)),
				variables: []
			}
		]
	} as unknown as QuestionTemplate;
	const r = generateInstance(t, 1);
	if (!r.success) throw new Error(JSON.stringify(r.errors));
	return r.instance;
}

const answer = (values: string[]) => ({ values, latex: values });
const remarks = (r: ExpectedResult) =>
	r.lines.flatMap((l) => (l.kind === 'remark' ? [{ index: l.index, text: l.text }] : []));

const SIGN = "Ta réponse est l'opposé du résultat : vérifie le signe.";

describe('phrase du type d’erreur', () => {
	it('nominal : opposé du résultat → la phrase sous la réponse, la note ne change pas', () => {
		const r = buildExpectedResult(generate('$5-17=?$', ['-12']), answer(['12']));
		expect(r.status).toBe('incorrect');
		expect(remarks(r)).toEqual([{ index: 0, text: SIGN }]);
	});

	it('carré en trop : `4` pour `-2`', () => {
		const r = buildExpectedResult(generate('$x=?$', ['-2']), answer(['4']));
		expect(remarks(r)).toEqual([
			{
				index: 0,
				text: "Ta réponse est le carré du résultat : vérifie si tu n'as pas mis un carré en trop."
			}
		]);
	});

	it('carré oublié : `-5` pour `25`', () => {
		const r = buildExpectedResult(generate('$(-5)^2=?$', ['25']), answer(['-5']));
		expect(remarks(r)).toEqual([
			{
				index: 0,
				text: "Le carré de ta réponse donne le résultat : vérifie si tu n'as pas oublié un carré."
			}
		]);
	});

	it('puissance de 10 : le facteur et le sens', () => {
		const r = buildExpectedResult(generate('$3{,}5\\times 10=?$', ['35']), answer(['3,5']));
		expect(remarks(r)).toEqual([
			{ index: 0, text: 'Ta réponse est 10 fois trop petite : vérifie la place de la virgule.' }
		]);
	});

	it('réponse juste : aucune phrase', () => {
		const r = buildExpectedResult(generate('$5-17=?$', ['-12']), answer(['-12']));
		expect(remarks(r)).toEqual([]);
	});

	it('type non reconnu ou ambigu : aucune phrase (attendu 4, réponse 2)', () => {
		expect(remarks(buildExpectedResult(generate('$2+2=?$', ['4']), answer(['2'])))).toEqual([]);
		expect(remarks(buildExpectedResult(generate('$2+2=?$', ['4']), answer(['7'])))).toEqual([]);
	});

	it('plusieurs cases : une phrase par case fausse typée, à son numéro', () => {
		const r = buildExpectedResult(
			generate('$a=?$ et $b=?$ et $c=?$', ['-12', '8', '35']),
			answer(['12', '8', '7'])
		);
		expect(remarks(r)).toEqual([{ index: 0, text: SIGN }]);
	});

	it('cases appariées librement : aucune phrase', () => {
		const r = buildExpectedResult(
			generate('Les solutions : $?$ et $?$', ['3', '-12'], { orderIndependent: true }),
			answer(['3', '12'])
		);
		expect(remarks(r)).toEqual([]);
	});

	it('case jugée par ses règles (`rulesSuffice`) : l’attendu est un exemple, aucune phrase', () => {
		const inst = generate('Donne un diviseur de 12 autre que 1 et 12 : $?$', [
			{
				expectedAnswer: '3',
				rulesSuffice: true,
				validationRules: [{ type: 'divisor', dividend: '12' }]
			}
		]);
		for (const wrong of ['30', '9', '1,5']) {
			const r = buildExpectedResult(inst, answer([wrong]));
			expect(r.status).toBe('incorrect');
			expect(remarks(r)).toEqual([]);
		}
	});

	it('verdict du serveur (copie corrigée) : sa remarque prime, pas de phrase en plus', () => {
		const inst = generate('$5-17=?$', ['-12']);
		const verdict: DetailedVerdict = {
			status: 'incorrect',
			blanks: [{ index: 0, status: 'incorrect', remarks: ['Message du validateur.'], answer: '12' }]
		};
		expect(remarks(buildExpectedResult(inst, answer(['12']), verdict))).toEqual([
			{ index: 0, text: 'Message du validateur.' }
		]);
	});

	it('verdict du serveur sans remarque : la phrase est ajoutée', () => {
		const inst = generate('$5-17=?$', ['-12']);
		const verdict: DetailedVerdict = {
			status: 'incorrect',
			blanks: [{ index: 0, status: 'incorrect', remarks: [], answer: '12' }]
		};
		expect(remarks(buildExpectedResult(inst, answer(['12']), verdict))).toEqual([
			{ index: 0, text: SIGN }
		]);
	});
});
