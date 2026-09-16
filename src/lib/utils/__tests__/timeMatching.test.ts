import { describe, it, expect } from 'vitest';
import { findCurrentSchedule, isWeekend, getNoClassMessage } from '../timeMatching';
import type { WeekConfig } from '../week-config';
import type { Class } from '$lib/types/database-helpers';
import type { Tables } from '$lib/types/database';

type ClassSchedule = Tables<'class_schedules'>;

/**
 * Lycée polyvalent Blaise Pascal : lundi → vendredi, week-end samedi/dimanche.
 * C'est la configuration RÉELLE de l'école (`schools.timetable.week_config`).
 */
const FRENCH_WEEK: WeekConfig = {
	first_day: 1,
	last_day: 0,
	school_days: [1, 2, 3, 4, 5],
	weekend_days: [0, 6]
};

/** L'ancienne école : dimanche → jeudi, week-end vendredi/samedi. */
const GULF_WEEK: WeekConfig = {
	first_day: 0,
	last_day: 6,
	school_days: [0, 1, 2, 3, 4],
	weekend_days: [5, 6]
};

function scheduleAt(dayOfWeek: number): ClassSchedule {
	return {
		id: 'schedule-1',
		class_id: 'class-1',
		day_of_week: dayOfWeek,
		start_time: '08:00:00',
		end_time: '08:55:00',
		period_number: 1,
		subject: 'Maths',
		room: null,
		notes: null,
		created_at: '2026-09-16T06:00:00Z',
		updated_at: '2026-09-16T06:00:00Z'
	};
}

function classWithSchedules(schedules: ClassSchedule[]) {
	return [
		{ id: 'class-1', name: '2DE 3', schedules } as unknown as Class & {
			schedules?: ClassSchedule[];
		}
	];
}

describe('findCurrentSchedule', () => {
	// Le bug : un garde `day > 4`, hérité de la semaine dimanche→jeudi, rendait
	// `null` tous les vendredis — la classe existait, le créneau aussi.
	it('trouve le cours du vendredi', () => {
		const match = findCurrentSchedule(classWithSchedules([scheduleAt(5)]), 5, '08:30:00');

		expect(match?.schedule.day_of_week).toBe(5);
	});

	it('trouve le cours du samedi', () => {
		const match = findCurrentSchedule(classWithSchedules([scheduleAt(6)]), 6, '08:30:00');

		expect(match?.schedule.day_of_week).toBe(6);
	});

	it('trouve le cours du lundi', () => {
		const match = findCurrentSchedule(classWithSchedules([scheduleAt(1)]), 1, '08:30:00');

		expect(match?.schedule.day_of_week).toBe(1);
	});

	// La source de vérité reste l'emploi du temps : un jour sans créneau ne
	// rend rien, quel que soit le jour.
	it('ne rend rien un jour sans créneau', () => {
		const match = findCurrentSchedule(classWithSchedules([scheduleAt(5)]), 3, '08:30:00');

		expect(match).toBeNull();
	});

	it('ne rend rien hors de la plage horaire du créneau', () => {
		const match = findCurrentSchedule(classWithSchedules([scheduleAt(5)]), 5, '14:00:00');

		expect(match).toBeNull();
	});
});

describe('isWeekend', () => {
	it.each([
		['vendredi', 5, false],
		['samedi', 6, true],
		['dimanche', 0, true],
		['lundi', 1, false]
	])('semaine française : %s', (_label, day, expected) => {
		expect(isWeekend(FRENCH_WEEK, day as number)).toBe(expected);
	});

	it.each([
		['vendredi', 5, true],
		['dimanche', 0, false]
	])('semaine du Golfe : %s', (_label, day, expected) => {
		expect(isWeekend(GULF_WEEK, day as number)).toBe(expected);
	});
});

describe('getNoClassMessage', () => {
	// Le message qui mentait : « Pas de cours aujourd'hui (weekend) », un
	// vendredi de semaine française.
	it('ne parle pas de week-end un vendredi travaillé', () => {
		const message = getNoClassMessage(classWithSchedules([scheduleAt(5)]), FRENCH_WEEK, 5);

		expect(message).not.toMatch(/weekend|week-end/i);
	});

	it('parle de week-end un dimanche', () => {
		const message = getNoClassMessage(classWithSchedules([scheduleAt(5)]), FRENCH_WEEK, 0);

		expect(message).toMatch(/week-end/i);
	});

	it('parle de week-end un vendredi de semaine du Golfe', () => {
		const message = getNoClassMessage(classWithSchedules([scheduleAt(0)]), GULF_WEEK, 5);

		expect(message).toMatch(/week-end/i);
	});

	it('signale une classe sans emploi du temps', () => {
		const message = getNoClassMessage(classWithSchedules([]), FRENCH_WEEK, 5);

		expect(message).toBe('Aucun emploi du temps configuré');
	});
});
