/**
 * Réponse en durée composée (« 2 h 15 min ») — lot 3, décisions de David du 2026-09-28
 * ====================================================================================
 *
 * Les saisies sont celles MESURÉES au vrai clavier (MathLive 0.110.0, case comme
 * MathPrompt : readonly + \placeholder, mathModeSpace '\,') : « min » devient
 * toujours `\min`, l'espace tapée devient `\,`.
 */

import { describe, it, expect } from 'vitest';
import { validateQuantityAnswer } from '../validator';
import { compositeDurationFormIssue } from '../composite-duration';

// Chaînes exactes reçues par le correcteur (mesure du 2026-09-28)
const TWO_H_15 = '2\\,h\\,15\\,\\min';
const TWO_H_15_PACKED = '2h15\\min';
const TWO_H_15_NO_UNIT = '2\\,h\\,15';
const ONE_H_5_30 = '1\\,h\\,5\\,\\min\\,30\\,s';
const TWO_MIN_30 = '2\\,\\min\\,30\\,s';
const TWO_H_75 = '2\\,h\\,75\\,\\min';
const TWO_H_15_MN = '2\\,h\\,15\\,mn';

describe('validateQuantityAnswer — durée composée, valeur', () => {
	it.each([
		[TWO_H_15, '135\\unit{min}'],
		[TWO_H_15, '2.25[h]'],
		[TWO_H_15, '8100\\unit{s}'],
		[TWO_H_15_PACKED, '135\\unit{min}'],
		[ONE_H_5_30, '3930\\unit{s}'],
		[TWO_MIN_30, '150\\unit{s}'],
		[TWO_MIN_30, '2.5[min]']
	])('%s pour %s : juste', (answer, expected) => {
		const result = validateQuantityAnswer(answer, expected);
		expect(result.isCorrect).toBe(true);
	});

	it('valeur fausse (2 h 20 min pour 135 min) : faux sur la valeur', () => {
		const result = validateQuantityAnswer('2\\,h\\,20\\,\\min', '135\\unit{min}');
		expect(result.isCorrect).toBe(false);
		expect(result.errorType).toBe('wrong_value');
		expect(result.unitAtFault).toBeUndefined();
	});

	it('2 h 75 min : la valeur (195 min) est lue', () => {
		expect(validateQuantityAnswer(TWO_H_75, '195\\unit{min}').isCorrect).toBe(true);
		expect(validateQuantityAnswer(TWO_H_75, '135\\unit{min}').isCorrect).toBe(false);
	});

	it('2 h 15 (unité finale oubliée) : lu 2 h 15 min', () => {
		expect(validateQuantityAnswer(TWO_H_15_NO_UNIT, '135\\unit{min}').isCorrect).toBe(true);
	});

	it('2 h 15 mn : valeur lue 135 min (la forme est jugée à part)', () => {
		expect(validateQuantityAnswer(TWO_H_15_MN, '135\\unit{min}').isCorrect).toBe(true);
	});

	it('15 mn seul : valeur lue 15 min', () => {
		expect(validateQuantityAnswer('15\\,mn', '15\\unit{min}').isCorrect).toBe(true);
	});

	it('2 h 15 kg : grandeur incompatible', () => {
		const result = validateQuantityAnswer('2\\,h\\,15\\,kg', '135\\unit{min}');
		expect(result.isCorrect).toBe(false);
		expect(result.errorType).toBe('incompatible_units');
		expect(result.unitAtFault).toBe(true);
	});

	it('unité imposée (min) : 2 h 15 min refusé comme une autre unité', () => {
		const composite = validateQuantityAnswer(TWO_H_15, '135\\unit{min}', undefined, 'min');
		const simple = validateQuantityAnswer('2.25\\unit{h}', '135\\unit{min}', undefined, 'min');
		expect(composite.isCorrect).toBe(false);
		expect(composite.errorType).toBe(simple.errorType);
		expect(composite.feedback).toBe(simple.feedback);
		expect(composite.unitAtFault).toBe(true);
	});

	it.each([
		['3\\,h', '180\\unit{min}'],
		['45\\,\\min', '45\\unit{min}'],
		['2,5\\,h', '150\\unit{min}']
	])('durée simple %s : inchangée (juste)', (answer, expected) => {
		expect(validateQuantityAnswer(answer, expected).isCorrect).toBe(true);
	});

	it('attendu qui n’est pas une durée : 2 h 15 min reste refusé', () => {
		expect(validateQuantityAnswer(TWO_H_15, '135\\unit{m}').isCorrect).toBe(false);
	});
});

describe('compositeDurationFormIssue — forme', () => {
	it.each([TWO_H_15, TWO_H_15_PACKED, ONE_H_5_30, TWO_MIN_30, '3\\,h', '45\\,\\min', '2,5\\,h'])(
		'%s : aucune remarque',
		(answer) => {
			expect(compositeDurationFormIssue(answer)).toBeNull();
		}
	);

	it('2 h 75 min : perfectible (forme non normalisée)', () => {
		expect(compositeDurationFormIssue(TWO_H_75)).toEqual({
			severity: 'warning',
			feedback: 'Écris plutôt 3 h 15 min.'
		});
	});

	it('1 min 75 s : perfectible', () => {
		expect(compositeDurationFormIssue('1\\,\\min\\,75\\,s')?.severity).toBe('warning');
	});

	it('2 h 15 : perfectible, « Précise l’unité : 2 h 15 min. »', () => {
		expect(compositeDurationFormIssue(TWO_H_15_NO_UNIT)).toEqual({
			severity: 'warning',
			feedback: "Précise l'unité : 2 h 15 min."
		});
	});

	it.each([TWO_H_15_MN, '15\\,mn'])('%s : mauvaise forme, abréviation', (answer) => {
		expect(compositeDurationFormIssue(answer)).toEqual({
			severity: 'error',
			feedback: "L'abréviation de minute est min."
		});
	});

	it.each(['15\\,\\min\\,2\\,h', '2\\,h\\,3\\,h'])('%s : mauvaise forme (ordre)', (answer) => {
		expect(compositeDurationFormIssue(answer)?.severity).toBe('error');
	});
});
