/**
 * Forme exigée « produit de facteurs premiers » (outils-manquants n° 76)
 * =====================================================================
 *
 * Phase 0 du 2026-11-28 (David : « ok pour tout ») :
 *
 * - nominal : toute décomposition juste, dans n'importe quel ordre ; puissances permises
 *   (`primeFactors`) ou exigées (`primeFactorsPowers`) ; la remarque « produits » est coupée
 *   pour cette case seulement ;
 * - limites : `2^1` juste (puissances permises) ; un nombre premier s'écrit seul (`37`) ;
 * - erreurs : facteur non premier nommé (« 4 et 21 ne sont pas des nombres premiers. »), base
 *   d'une puissance comprise ; nombre composé écrit seul (« Écris 84 comme un produit de
 *   facteurs premiers. ») ; facteur oublié = faux (juge de valeur) ;
 * - Q1 : puissances exigées, facteurs égaux non regroupés → demi-point, « Regroupe les facteurs
 *   égaux en puissance : 2² × 3 × 7. » ;
 * - Q2 : facteur 1 → refusé, « 1 n'est pas un nombre premier. » ;
 * - Q3 : tous les facteurs non premiers nommés ;
 * - Q4 : cette forme écrit toujours son propre message (pas de message d'auteur) ;
 * - Q5 : nombres négatifs hors champ (refusés pour la forme).
 */

import { describe, it, expect } from 'vitest';
import { buildExpectedResult, type ExpectedResult } from '../expected-result';
import { generateInstance } from '../generator/instance-generator';
import { questionTemplateSchema, requiredFormSchema } from '../template-schema';
import { judgeRequiredForm, requiredFormVerdict } from '../required-form-validator';
import { validateAnswer } from '#lib/utils/answer-validator.ts';
import type { QuestionInstance, QuestionTemplate, RequiredForm, TemplateBlank } from '../types';

// Fixtures

function template(blanks: TemplateBlank[], statement = '$84=?$'): QuestionTemplate {
	return {
		id: 't',
		type: 'fill_in_blanks',
		level: 1,
		grades: ['2'],
		title: 't',
		variations: [{ statement, blanks }]
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

const PERMISES = generate(template([{ expectedAnswer: '84', requiredForm: 'primeFactors' }]));
const EXIGEES = generate(template([{ expectedAnswer: '84', requiredForm: 'primeFactorsPowers' }]));

/** Une réponse à la case unique : statut et message lu par l'élève */
function judge(instance: QuestionInstance, latex: string) {
	const r = validateAnswer([latex], instance, [latex]);
	return { status: r.status, feedback: r.feedback };
}

const verdict = (latex: string, form: RequiredForm) => judgeRequiredForm(latex, form);

// =============================================================================
// Schéma
// =============================================================================

describe('facteurs premiers : schéma', () => {
	it.each(['primeFactors', 'primeFactorsPowers'])('%s accepté (souple et strict)', (form) => {
		expect(requiredFormSchema.parse(form)).toBe(form);
		const parsed = questionTemplateSchema.safeParse({
			title: 'Décomposer',
			status: 'draft',
			variations: [{ statement: '$84=?$', blanks: [{ expectedAnswer: '84', requiredForm: form }] }],
			grades: ['2'],
			level: 1
		});
		expect(parsed.success).toBe(true);
	});
});

// =============================================================================
// Juge de forme seul
// =============================================================================

describe('facteurs premiers : juge de forme', () => {
	it.each([
		'2^{2}\\times3\\times7',
		'7\\times3\\times2^{2}',
		'3\\times2^{2}\\times7',
		'2\\times2\\times3\\times7',
		'2\\times3\\times2\\times7',
		'2^{1}\\times2\\times3\\times7',
		'2\\cdot2\\cdot3\\cdot7'
	])('puissances permises : %s juste', (latex) => {
		expect(verdict(latex, 'primeFactors')).toEqual({ verdict: 'ok' });
	});

	it.each(['2^{2}\\times3\\times7', '7\\times2^{2}\\times3'])(
		'puissances exigées : %s juste',
		(latex) => {
			expect(verdict(latex, 'primeFactorsPowers')).toEqual({ verdict: 'ok' });
		}
	);

	it('limite : un nombre premier écrit seul est juste', () => {
		expect(verdict('37', 'primeFactors')).toEqual({ verdict: 'ok' });
		expect(verdict('37', 'primeFactorsPowers')).toEqual({ verdict: 'ok' });
	});

	it.each([
		['2\\times2\\times3\\times7', '$2^{2} \\times 3 \\times 7$'],
		['2^{2}\\times2\\times3', '$2^{3} \\times 3$'],
		['7\\times2\\times3\\times2', '$2^{2} \\times 3 \\times 7$'],
		['3\\times3\\times5^{2}\\times5', '$3^{2} \\times 5^{3}$']
	])('Q1 : puissances exigées, %s → demi-point, regroupé %s', (latex, grouped) => {
		expect(verdict(latex, 'primeFactorsPowers')).toEqual({
			verdict: 'acceptable',
			feedback: `Regroupe les facteurs égaux en puissance : ${grouped}.`
		});
	});

	it.each([
		['4\\times21', '$4$ et $21$ ne sont pas des nombres premiers.'],
		['2^{2}\\times21', '$21$ n’est pas un nombre premier.'],
		['4^{2}\\times3', '$4$ n’est pas un nombre premier.'],
		['1\\times2^{2}\\times3\\times7', '$1$ n’est pas un nombre premier.'],
		['4\\times6\\times9', '$4$, $6$ et $9$ ne sont pas des nombres premiers.'],
		['4\\times3\\times4', '$4$ n’est pas un nombre premier.']
	])('facteur non premier : %s → « %s »', (latex, feedback) => {
		expect(verdict(latex, 'primeFactors')).toEqual({ verdict: 'violated', feedback });
		expect(verdict(latex, 'primeFactorsPowers')).toEqual({ verdict: 'violated', feedback });
	});

	it('nombre composé écrit seul → « Écris 84 comme un produit de facteurs premiers. »', () => {
		expect(verdict('84', 'primeFactors')).toEqual({
			verdict: 'violated',
			feedback: 'Écris $84$ comme un produit de facteurs premiers.'
		});
	});

	it.each(['-2^{2}\\times3\\times7', '\\frac{168}{2}', '80+4', '2^{0}\\times84', '2^{x}\\times3'])(
		'autre écriture (%s) → refusée, phrase générale',
		(latex) => {
			expect(verdict(latex, 'primeFactors')).toEqual({
				verdict: 'violated',
				feedback: 'La réponse doit être écrite comme un produit de facteurs premiers.'
			});
		}
	);

	it('requiredFormVerdict suit le juge (rejeu des modèles)', () => {
		expect(requiredFormVerdict('2\\times2\\times21', 'primeFactors')).toBe('violated');
		expect(requiredFormVerdict('2\\times2\\times3\\times7', 'primeFactors')).toBe('ok');
		expect(requiredFormVerdict('2\\times2\\times3\\times7', 'primeFactorsPowers')).toBe(
			'acceptable'
		);
	});
});

// =============================================================================
// Correcteur de bout en bout
// =============================================================================

describe('facteurs premiers : correcteur', () => {
	it('nominal : 2² × 3 × 7 juste, sans remarque « produits » (réglage par défaut)', () => {
		expect(judge(PERMISES, '2^{2}\\times3\\times7')).toEqual({
			status: 'correct',
			feedback: undefined
		});
		expect(judge(EXIGEES, '2^{2}\\times3\\times7')).toEqual({
			status: 'correct',
			feedback: undefined
		});
		const r = buildExpectedResult(EXIGEES, answer(['2^{2}\\times3\\times7']));
		expect(r.status).toBe('correct');
		expect(remarks(r)).toEqual([]);
	});

	it('remarque « produits » en strict sur le modèle : coupée quand même pour cette case', () => {
		const t = template([{ expectedAnswer: '84', requiredForm: 'primeFactors' }]);
		const instance = generate({ ...t, options: { constraints: { products: 'strict' } } });
		expect(judge(instance, '2^{2}\\times3\\times7').status).toBe('correct');
	});

	it('facteur non premier → mauvaise forme, le facteur est nommé', () => {
		expect(judge(PERMISES, '4\\times21')).toEqual({
			status: 'bad_form',
			feedback: '$4$ et $21$ ne sont pas des nombres premiers.'
		});
		expect(remarks(buildExpectedResult(PERMISES, answer(['4\\times21'])))).toEqual([
			'$4$ et $21$ ne sont pas des nombres premiers.'
		]);
	});

	it('Q1 : facteurs non regroupés, puissances exigées → demi-point et message', () => {
		expect(judge(EXIGEES, '2\\times2\\times3\\times7')).toEqual({
			status: 'unoptimal_form',
			feedback: 'Regroupe les facteurs égaux en puissance : $2^{2} \\times 3 \\times 7$.'
		});
		expect(judge(PERMISES, '2\\times2\\times3\\times7').status).toBe('correct');
	});

	it('facteur oublié (2 × 3 × 7 = 42) → faux, pas un message de forme', () => {
		const r = buildExpectedResult(PERMISES, answer(['2\\times3\\times7']));
		expect(r.status).toBe('incorrect');
		expect(remarks(r)).not.toContain(
			'La réponse doit être écrite comme un produit de facteurs premiers.'
		);
	});

	it('erreur prévue de même valeur, écrite telle quelle : son message passe avant', () => {
		const message = 'Tu peux encore décomposer 4.';
		const instance = generate(
			template([
				{
					expectedAnswer: '84',
					requiredForm: 'primeFactors',
					expectedErrors: [{ answer: '4\\times21', message }]
				}
			])
		);
		expect(remarks(buildExpectedResult(instance, answer(['4\\times21'])))).toEqual([message]);
	});

	it('réponse attendue écrite décomposée (2² × 3 × 7) : même comportement', () => {
		const instance = generate(
			template([{ expectedAnswer: '2^{2}\\times3\\times7', requiredForm: 'primeFactorsPowers' }])
		);
		expect(judge(instance, '7\\times3\\times2^{2}')).toEqual({
			status: 'correct',
			feedback: undefined
		});
		expect(judge(instance, '2\\times2\\times3\\times7').status).toBe('unoptimal_form');
		expect(judge(instance, '4\\times21')).toEqual({
			status: 'bad_form',
			feedback: '$4$ et $21$ ne sont pas des nombres premiers.'
		});
	});

	it('deux cases : chacune son message', () => {
		const instance = generate(
			template(
				[
					{ expectedAnswer: '84', requiredForm: 'primeFactors' },
					{ expectedAnswer: '60', requiredForm: 'primeFactorsPowers' }
				],
				'$84=?$ et $60=?$'
			)
		);
		const values = ['4\\times21', '2\\times2\\times3\\times5'];
		const r = buildExpectedResult(instance, answer(values));
		expect(remarks(r)).toEqual([
			'$4$ et $21$ ne sont pas des nombres premiers.',
			'Regroupe les facteurs égaux en puissance : $2^{2} \\times 3 \\times 5$.'
		]);
	});
});
