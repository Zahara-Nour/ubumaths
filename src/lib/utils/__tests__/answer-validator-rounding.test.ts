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
import { validateAnswer } from '../answer-validator';
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
