/**
 * Longue absence : 21 jours ou plus entre deux passages (décision du 2026-10-21) ;
 * retour fêté au plus 7 jours, jour du retour compris (décision du 2026-10-21).
 */

import { describe, expect, it } from 'vitest';
import { isLongAbsence, isWelcomeBackDue, lastExpiredWelcomeBackDay } from '../buddy-absence';

describe('isLongAbsence', () => {
	it('tout premier passage : pas triste', () => {
		expect(isLongAbsence(null, '2026-10-21')).toBe(false);
	});

	it('passage la veille ou le jour même : pas triste', () => {
		expect(isLongAbsence('2026-10-21', '2026-10-21')).toBe(false);
		expect(isLongAbsence('2026-10-20', '2026-10-21')).toBe(false);
	});

	it('20 jours : pas triste encore', () => {
		expect(isLongAbsence('2026-10-01', '2026-10-21')).toBe(false);
	});

	it('21 jours tout juste : triste', () => {
		expect(isLongAbsence('2026-09-30', '2026-10-21')).toBe(true);
	});

	it('les grandes vacances : triste', () => {
		expect(isLongAbsence('2026-07-04', '2026-09-01')).toBe(true);
	});

	it('passage de mois et d’année compté en jours UTC', () => {
		expect(isLongAbsence('2026-12-11', '2027-01-01')).toBe(true);
		expect(isLongAbsence('2026-12-12', '2027-01-01')).toBe(false);
	});

	it('jour illisible : pas triste', () => {
		expect(isLongAbsence('pas-un-jour', '2026-10-21')).toBe(false);
	});
});

describe('isWelcomeBackDue', () => {
	it('aucun retour : rien à fêter', () => {
		expect(isWelcomeBackDue(null, '2026-10-21')).toBe(false);
	});

	it('le jour du retour : à fêter', () => {
		expect(isWelcomeBackDue('2026-10-21', '2026-10-21')).toBe(true);
	});

	it('6 jours après : encore à fêter', () => {
		expect(isWelcomeBackDue('2026-10-21', '2026-10-27')).toBe(true);
	});

	it('7 jours après : oublié', () => {
		expect(isWelcomeBackDue('2026-10-21', '2026-10-28')).toBe(false);
	});

	it('passage de mois et d’année compté en jours UTC', () => {
		expect(isWelcomeBackDue('2026-12-28', '2027-01-03')).toBe(true);
		expect(isWelcomeBackDue('2026-12-28', '2027-01-04')).toBe(false);
	});

	it('jour à venir ou illisible : rien à fêter', () => {
		expect(isWelcomeBackDue('2026-10-22', '2026-10-21')).toBe(false);
		expect(isWelcomeBackDue('pas-un-jour', '2026-10-21')).toBe(false);
	});
});

describe('lastExpiredWelcomeBackDay', () => {
	it('7 jours avant : le premier jour qui n’est plus à fêter', () => {
		expect(lastExpiredWelcomeBackDay('2026-10-28')).toBe('2026-10-21');
		expect(isWelcomeBackDue('2026-10-21', '2026-10-28')).toBe(false);
		expect(isWelcomeBackDue('2026-10-22', '2026-10-28')).toBe(true);
	});

	it('par-dessus la fin d’année ; jour illisible : null', () => {
		expect(lastExpiredWelcomeBackDay('2027-01-04')).toBe('2026-12-28');
		expect(lastExpiredWelcomeBackDay('n’importe quoi')).toBeNull();
	});
});
