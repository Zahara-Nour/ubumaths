import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ClassScheduleGrid from '../ClassScheduleGrid.svelte';
import type { SchoolPeriod } from '$lib/utils/timetable';

/**
 * Les colonnes doivent être les jours de classe de l'école. Elles étaient
 * écrites en dur dimanche→jeudi : un lycée en Lun-Ven voyait une grille qui ne
 * correspondait à aucun de ses jours de cours.
 */
describe('ClassScheduleGrid', () => {
	const periods: SchoolPeriod[] = [
		{ number: 1, name: null, start_time: '08:00:00', end_time: '09:00:00' }
	];

	function entetes(container: HTMLElement): string[] {
		return [...container.querySelectorAll('th')].map((th) => th.textContent?.trim() ?? '');
	}

	it('affiche les jours de classe de la semaine occidentale', () => {
		const { container } = render(ClassScheduleGrid, {
			schedules: [],
			periods,
			weekConfig: {
				first_day: 1,
				last_day: 0,
				school_days: [1, 2, 3, 4, 5],
				weekend_days: [0, 6]
			}
		});

		const jours = entetes(container);
		expect(jours).toContain('Lundi');
		expect(jours).toContain('Vendredi');
		expect(jours).not.toContain('Dimanche');
	});

	it('ordonne les colonnes depuis le premier jour de la semaine', () => {
		const { container } = render(ClassScheduleGrid, {
			schedules: [],
			periods,
			weekConfig: {
				first_day: 6,
				last_day: 5,
				school_days: [0, 1, 2, 3, 6],
				weekend_days: [4, 5]
			}
		});

		// Samedi ouvre la semaine, même si school_days est trié par numéro.
		const jours = entetes(container).filter((j) => j !== '');
		expect(jours[1]).toBe('Samedi');
		expect(jours[2]).toBe('Dimanche');
	});

	it('retombe sur la configuration par défaut sans semaine fournie', () => {
		const { container } = render(ClassScheduleGrid, { schedules: [], periods });

		const jours = entetes(container);
		expect(jours).toContain('Dimanche');
		expect(jours).toContain('Jeudi');
	});
});
