/**
 * Semaines actives du Palotin (chantier `regularite`, PR B2) : calcul pur.
 * Jour actif = 5 traces autonomes le même jour de Paris ; semaine active = au
 * moins un jour actif ; une semaine de vacances sans activité ne coupe pas le
 * compte ; le compte part de la rentrée (R4, T5, T6).
 */
import { describe, expect, it } from 'vitest';
import {
	activeDaysOf,
	activeWeekStreak,
	isWeekToCelebrate,
	weekMomentFor
} from '$lib/server/buddy-weeks';

// Constantes
/** Lundis de septembre-octobre 2026 */
const W1 = '2026-09-07';
const W2 = '2026-09-14';
const W3 = '2026-09-21';
const W4 = '2026-09-28';
const W5 = '2026-10-05';

// Functions
function traces(day: string, count: number, place: string | null = 'typing') {
	return Array.from({ length: count }, () => ({
		student_id: 's',
		// 10 h à Paris
		created_at: `${day}T08:00:00Z`,
		source: 'auto',
		place
	}));
}

// Tests
describe('activeDaysOf', () => {
	it('un jour de Paris avec 5 traces autonomes est actif, 4 ne suffisent pas', () => {
		const days = activeDaysOf([...traces('2026-09-08', 5), ...traces('2026-09-09', 4)]);
		expect([...days]).toEqual(['2026-09-08']);
	});

	it('les traces de contrôle ne comptent pas, les traces sans lieu comptent (R6)', () => {
		const days = activeDaysOf([
			...traces('2026-09-08', 5, 'evaluation'),
			...traces('2026-09-09', 5, null)
		]);
		expect([...days]).toEqual(['2026-09-09']);
	});

	it('jour de Paris : 23 h 30 UTC le dimanche compte pour le lundi', () => {
		const late = Array.from({ length: 5 }, () => ({
			student_id: 's',
			created_at: '2026-09-13T23:30:00Z',
			source: 'srs',
			place: null
		}));
		expect([...activeDaysOf(late)]).toEqual(['2026-09-14']);
	});
});

describe('activeWeekStreak', () => {
	const firstDay = '2026-09-01';

	it('semaine en cours inactive → 0', () => {
		const days = new Set(['2026-09-08']);
		expect(
			activeWeekStreak({ activeDays: days, holidays: [], firstDay, today: '2026-09-15' })
		).toBe(0);
	});

	it('trois semaines actives d’affilée → 3', () => {
		const days = new Set(['2026-09-08', '2026-09-18', '2026-09-21']);
		expect(
			activeWeekStreak({ activeDays: days, holidays: [], firstDay, today: '2026-09-21' })
		).toBe(3);
	});

	it('une semaine sans activité hors vacances coupe le compte', () => {
		const days = new Set(['2026-09-08', '2026-09-22', '2026-09-29']);
		expect(
			activeWeekStreak({ activeDays: days, holidays: [], firstDay, today: '2026-09-29' })
		).toBe(2);
	});

	it('une semaine de vacances sans activité est sautée, sans compter', () => {
		const days = new Set(['2026-09-08', '2026-09-15', '2026-09-29']);
		const holidays = [{ start_date: '2026-09-26', end_date: '2026-09-27' }];
		// W3 (21-27) touche les vacances : sautée ; W4, W2, W1 actives
		expect(activeWeekStreak({ activeDays: days, holidays, firstDay, today: '2026-09-29' })).toBe(3);
	});

	it('une semaine de vacances avec activité compte', () => {
		const days = new Set(['2026-09-15', '2026-09-22', '2026-09-29']);
		const holidays = [{ start_date: '2026-09-21', end_date: '2026-09-27' }];
		expect(activeWeekStreak({ activeDays: days, holidays, firstDay, today: '2026-09-29' })).toBe(3);
	});

	it('le compte part de la rentrée : rien avant le premier jour', () => {
		const days = new Set(['2026-08-25', '2026-09-01', '2026-09-08']);
		expect(
			activeWeekStreak({ activeDays: days, holidays: [], firstDay, today: '2026-09-08' })
		).toBe(2);
	});
});

describe('weekMomentFor', () => {
	it('paliers 3, 5 et 10 ; sinon la 1re activité de la semaine', () => {
		expect(weekMomentFor(1)).toBe('week_first_activity');
		expect(weekMomentFor(2)).toBe('week_first_activity');
		expect(weekMomentFor(3)).toBe('active_weeks_3');
		expect(weekMomentFor(4)).toBe('week_first_activity');
		expect(weekMomentFor(5)).toBe('active_weeks_5');
		expect(weekMomentFor(10)).toBe('active_weeks_10');
		expect(weekMomentFor(11)).toBe('week_first_activity');
	});

	it('aucune semaine active → rien', () => {
		expect(weekMomentFor(0)).toBeNull();
	});
});

describe('isWeekToCelebrate', () => {
	it('semaine jamais fêtée → à fêter', () => {
		expect(isWeekToCelebrate(null, W3)).toBe(true);
		expect(isWeekToCelebrate(W2, W3)).toBe(true);
	});

	it('semaine déjà fêtée → plus rien', () => {
		expect(isWeekToCelebrate(W3, W3)).toBe(false);
	});

	it('une semaine fêtée plus tard (horloge) ne refait pas fêter', () => {
		expect(isWeekToCelebrate(W5, W4)).toBe(false);
		expect(isWeekToCelebrate(W1, W4)).toBe(true);
	});
});
