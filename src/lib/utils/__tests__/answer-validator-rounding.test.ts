/**
 * Arrondis (`precision` decimal / significant) : la réponse de l'élève n'est
 * plus arrondie avant comparaison.
 *
 * - plus de décimales (resp. de chiffres significatifs) que demandé → faux,
 *   avec un message qui dit quoi faire (« Arrondis au centième. ») ;
 * - moins de décimales → accepté si la valeur est exactement l'arrondi
 *   (3,1 pour 3,10).
 */

import { describe, it, expect } from 'vitest';
import { blankStatuses, validateAnswer, validateAnswerDetailed } from '../answer-validator';
import { roundToPrecision } from '$lib/questions/rounding';
import type { InstanceBlank, PrecisionType, QuestionInstance } from '$lib/questions/types';
import type { ResolvedMarkdown } from '$lib/ubumark';

function check(answer: string, expectedAnswer: string, precision: PrecisionType) {
	const blank: InstanceBlank = { expectedAnswer, type: 'math', precision };
	const instance: QuestionInstance = {
		templateId: 'test-rounding',
		statement: 'Test' as ResolvedMarkdown,
		blanks: [blank],
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: new Date().toISOString()
	};
	return validateAnswer([answer], instance, [answer]);
}

/** Statut de la case, celui que lit le barème (grading.ts) */
function statusOf(answer: string, expectedAnswer: string, precision: PrecisionType) {
	const blank: InstanceBlank = { expectedAnswer, type: 'math', precision };
	const instance: QuestionInstance = {
		templateId: 'test-rounding',
		statement: 'Test' as ResolvedMarkdown,
		blanks: [blank],
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: new Date().toISOString()
	};
	return blankStatuses([answer], instance, [answer])[0];
}

const HUNDREDTH: PrecisionType = { type: 'decimal', digits: 2 };

describe('Arrondi décimal', () => {
	it('valeur non arrondie (3,14159 pour « au centième ») → faux, « Arrondis au centième. »', () => {
		const result = check('3{,}14159', '3.14159', HUNDREDTH);
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe('Arrondis au centième.');
	});

	it('une décimale de trop, même juste (3,140) → faux avec le message', () => {
		const result = check('3{,}140', '3.14159', HUNDREDTH);
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe('Arrondis au centième.');
	});

	it.each(['3{,}14', '3.14'])('arrondi juste %s → juste', (answer) => {
		expect(check(answer, '3.14159', HUNDREDTH).isCorrect).toBe(true);
	});

	it('mauvais arrondi (3,15) → faux, sans message d’arrondi', () => {
		const result = check('3{,}15', '3.14159', HUNDREDTH);
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).not.toBe('Arrondis au centième.');
	});

	it('moins de décimales mais valeur différente (3,1 pour 3,14) → faux', () => {
		expect(check('3{,}1', '3.14159', HUNDREDTH).isCorrect).toBe(false);
	});

	it.each(['3{,}1', '3{,}10'])(
		'moins de décimales, valeur exacte : %s pour 3,10 → juste',
		(answer) => {
			expect(check(answer, '3.1', HUNDREDTH).isCorrect).toBe(true);
		}
	);

	it('arrondi d’un négatif, moitié loin de zéro : -2,345 → -2,35', () => {
		expect(check('-2{,}35', '-2.345', HUNDREDTH).isCorrect).toBe(true);
		expect(check('-2{,}34', '-2.345', HUNDREDTH).isCorrect).toBe(false);
	});

	it.each<[number, string]>([
		[0, "Arrondis à l'unité."],
		[1, 'Arrondis au dixième.'],
		[3, 'Arrondis au millième.'],
		[4, 'Arrondis à 4 décimales.']
	])('message pour %i décimale(s)', (digits, message) => {
		const result = check('3{,}1415926', '3.1415926', { type: 'decimal', digits });
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe(message);
	});
});

describe('Chiffres significatifs', () => {
	const THREE: PrecisionType = { type: 'significant', digits: 3 };

	it('trop de chiffres (0,01235 pour 3 c.s.) → faux, « Donne 3 chiffres significatifs. »', () => {
		const result = check('0{,}01235', '0.0123456', THREE);
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe('Donne 3 chiffres significatifs.');
	});

	it('valeur non arrondie → faux avec le message', () => {
		const result = check('0{,}0123456', '0.0123456', THREE);
		expect(result.isCorrect).toBe(false);
		expect(result.feedback).toBe('Donne 3 chiffres significatifs.');
	});

	it('arrondi juste (0,0123) → juste', () => {
		expect(check('0{,}0123', '0.0123456', THREE).isCorrect).toBe(true);
	});

	it('moins de chiffres, valeur exacte (0,012 pour 0,0120) → juste', () => {
		expect(check('0{,}012', '0.012', THREE).isCorrect).toBe(true);
	});

	it('moins de chiffres, valeur différente (0,012 pour 0,0123) → faux', () => {
		expect(check('0{,}012', '0.0123456', THREE).isCorrect).toBe(false);
	});

	it('entier à zéros finaux : 1 200 pour 2 c.s. de 1 234,5 → juste ; 1 234 → message', () => {
		const TWO: PrecisionType = { type: 'significant', digits: 2 };
		expect(check('1\\,200', '1234.5', TWO).isCorrect).toBe(true);
		expect(check('1200', '1234.5', TWO).isCorrect).toBe(true);
		const tooPrecise = check('1\\,234', '1234.5', TWO);
		expect(tooPrecise.isCorrect).toBe(false);
		expect(tooPrecise.feedback).toBe('Donne 2 chiffres significatifs.');
	});

	it('singulier : « Donne 1 chiffre significatif. »', () => {
		const result = check('3{,}1', '3.14', { type: 'significant', digits: 1 });
		expect(result.feedback).toBe('Donne 1 chiffre significatif.');
	});
});

describe('Arrondi : moitiés exactes malgré le flottant', () => {
	it('2,675 au centième → 2,68 juste, 2,67 faux', () => {
		expect(check('2{,}68', '2.675', HUNDREDTH).isCorrect).toBe(true);
		const wrong = check('2{,}67', '2.675', HUNDREDTH);
		expect(wrong.isCorrect).toBe(false);
		expect(wrong.feedback).not.toBe('Arrondis au centième.');
	});

	it('valeur calculée bruitée (268 − 273,15 = −5,1499…) au dixième → −5,2', () => {
		expect(roundToPrecision(268 - 273.15, { type: 'decimal', digits: 1 })).toBe(-5.2);
	});
});

// Décision de David (2026-10-03) : trop de chiffres, mais l'arrondi de la
// réponse (même règle que le moteur) redonne l'attendu → mauvaise forme, avec
// la violation `rounding` ; sinon (troncature, calcul faux) → faux comme avant.
describe('Trop de chiffres : mauvaise forme si l’arrondi de la réponse redonne l’attendu', () => {
	it('décimal : 1,136 pour 1,136 au centième → bad_form, violation rounding, message', () => {
		const result = check('1{,}136', '1.136', HUNDREDTH);
		expect(result.isCorrect).toBe(false);
		expect(result.status).toBe('bad_form');
		expect(result.feedback).toBe('Arrondis au centième.');
		expect(result.constraintViolations).toEqual([
			{ constraint: 'rounding', severity: 'error', feedback: 'Arrondis au centième.' }
		]);
	});

	it('décimal : 3,140 pour 3,14159 au centième → bad_form', () => {
		const result = check('3{,}140', '3.14159', HUNDREDTH);
		expect(result.status).toBe('bad_form');
		expect(result.constraintViolations?.map((v) => v.constraint)).toEqual(['rounding']);
	});

	it('décimal : troncature fausse 1,13 pour 1,136 → incorrect (pas de violation)', () => {
		const result = check('1{,}13', '1.136', HUNDREDTH);
		expect(result.isCorrect).toBe(false);
		expect(statusOf('1{,}13', '1.136', HUNDREDTH)).toBe('incorrect');
		expect(result.constraintViolations ?? []).toEqual([]);
	});

	it('décimal : trop de chiffres ET faux (1,131 pour 1,136) → incorrect, message conservé', () => {
		const result = check('1{,}131', '1.136', HUNDREDTH);
		expect(result.isCorrect).toBe(false);
		expect(statusOf('1{,}131', '1.136', HUNDREDTH)).toBe('incorrect');
		expect(result.feedback).toBe('Arrondis au centième.');
		expect(result.constraintViolations ?? []).toEqual([]);
	});

	it('décimal : nombre de chiffres exact (1,14) → correct, inchangé', () => {
		const result = check('1{,}14', '1.136', HUNDREDTH);
		expect(result.isCorrect).toBe(true);
		expect(result.status).toBe('correct');
	});

	it('décimal : moins de chiffres (3,1 pour 3,10) → correct, inchangé', () => {
		const result = check('3{,}1', '3.1', HUNDREDTH);
		expect(result.isCorrect).toBe(true);
		expect(result.status).toBe('correct');
	});

	const THREE: PrecisionType = { type: 'significant', digits: 3 };

	it('significatif : 0,01234 pour 0,0123456 à 3 c.s. → bad_form, violation rounding', () => {
		expect(statusOf('0{,}01234', '0.0123456', THREE)).toBe('bad_form');
		const result = check('0{,}01234', '0.0123456', THREE);
		expect(result.isCorrect).toBe(false);
		expect(result.status).toBe('bad_form');
		expect(result.feedback).toBe('Donne 3 chiffres significatifs.');
		expect(result.constraintViolations?.map((v) => v.constraint)).toEqual(['rounding']);
	});

	// Double arrondi : 0,01235 (4 c.s. justes) s'arrondit en 0,0124 ≠ 0,0123
	it('significatif : 0,01235 pour 0,0123456 à 3 c.s. → incorrect (double arrondi)', () => {
		expect(statusOf('0{,}01235', '0.0123456', THREE)).toBe('incorrect');
	});

	it('significatif : 0,01239 pour 0,0123456 à 3 c.s. → incorrect, message conservé', () => {
		const result = check('0{,}01239', '0.0123456', THREE);
		expect(result.isCorrect).toBe(false);
		expect(statusOf('0{,}01239', '0.0123456', THREE)).toBe('incorrect');
		expect(result.feedback).toBe('Donne 3 chiffres significatifs.');
	});

	it('significatif : nombre exact (1,23) → correct ; moins (1,2 pour 1,20) → correct', () => {
		expect(check('1{,}23', '1.23456', THREE).status).toBe('correct');
		expect(check('1{,}2', '1.2', THREE).status).toBe('correct');
	});
});

// Même décision en `orderIndependent` : une réponse trop précise mais juste est
// appariée à sa case (après les réponses exactes), puis jugée de mauvaise forme.
describe('orderIndependent : trop de chiffres mais bon arrondi → mauvaise forme', () => {
	/** Deux cases sans ordre, au centième : 2,50 et 1,14 */
	function unordered(): QuestionInstance {
		return {
			templateId: 'test-rounding-unordered',
			statement: 'Test' as ResolvedMarkdown,
			blanks: [
				{ expectedAnswer: '2.5', type: 'math', precision: HUNDREDTH },
				{ expectedAnswer: '1.136', type: 'math', precision: HUNDREDTH }
			],
			grades: ['6'],
			theme: 'Test',
			domain: 'Test',
			level: 1,
			generatedAt: new Date().toISOString(),
			options: { orderIndependent: true }
		};
	}

	it('1,136 et 2,5 dans l’autre ordre → bad_form, violation rounding, message', () => {
		const answers = ['1{,}136', '2{,}5'];
		const result = validateAnswer(answers, unordered(), answers);
		expect(result.isCorrect).toBe(false);
		expect(result.status).toBe('bad_form');
		expect(result.feedback).toBe('Arrondis au centième.');
		expect(result.constraintViolations).toEqual([
			{ constraint: 'rounding', severity: 'error', feedback: 'Arrondis au centième.' }
		]);
		// Statut par réponse (rang de saisie), celui que lit le barème
		expect(blankStatuses(answers, unordered(), answers)).toEqual(['bad_form', 'correct']);
		const detailed = validateAnswerDetailed(unordered(), { values: answers, latex: answers });
		expect(detailed.status).toBe('bad_form');
		expect(detailed.blanks.map((b) => b.remarks)).toEqual([['Arrondis au centième.'], []]);
	});

	it('troncature 1,13 (et 2,5) → incorrect', () => {
		const answers = ['1{,}13', '2{,}5'];
		const result = validateAnswer(answers, unordered(), answers);
		expect(result.isCorrect).toBe(false);
		expect(result.status ?? 'incorrect').toBe('incorrect');
		expect(blankStatuses(answers, unordered(), answers)).toEqual(['incorrect', 'correct']);
	});

	it('réponses exactes dans le désordre (1,14 et 2,5) → correct (forme : un nombre simple, pas l’écriture de l’attendu 1,136)', () => {
		const answers = ['1{,}14', '2{,}5'];
		const result = validateAnswer(answers, unordered(), answers);
		expect(result.isCorrect).toBe(true);
		expect(blankStatuses(answers, unordered(), answers)).toEqual(['correct', 'correct']);
	});

	it('grandeurs : 1,136 m et 2,5 m dans l’autre ordre → bad_form, violation rounding', () => {
		const instance = unordered();
		instance.blanks = [
			{
				expectedAnswer: '2.5\\unit{m}',
				type: 'math',
				precision: HUNDREDTH,
				unit: { expected: true }
			},
			{
				expectedAnswer: '1.136\\unit{m}',
				type: 'math',
				precision: HUNDREDTH,
				unit: { expected: true }
			}
		];
		const answers = ['1{,}136\\unit{m}', '2{,}5\\unit{m}'];
		const result = validateAnswer(answers, instance, answers);
		expect(result.status).toBe('bad_form');
		expect(result.constraintViolations?.map((v) => v.constraint)).toEqual(['rounding']);
		expect(blankStatuses(answers, instance, answers)).toEqual(['bad_form', 'correct']);
		const detailed = validateAnswerDetailed(instance, { values: answers, latex: answers });
		expect(detailed.blanks[0].remarks).toEqual(['Arrondis au centième.']);
	});

	it('une réponse exacte passe AVANT une trop précise pour la même case', () => {
		// 1,136 et 1,14 visent la même case : 1,14 (exacte) l'obtient, 1,136 reste sans case
		const answers = ['1{,}136', '1{,}14'];
		const result = validateAnswer(answers, unordered(), answers);
		expect(result.isCorrect).toBe(false);
		expect(blankStatuses(answers, unordered(), answers)).toEqual(['incorrect', 'correct']);
	});
});
