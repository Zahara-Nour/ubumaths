/**
 * Le cahier de texte grise-t-il les bons jours ?
 * ==============================================
 *
 * `isWeekend` décide quels jours de la grille sont chômés — donc non
 * cliquables, et affichés en retrait. La réponse doit venir de `week_config`
 * de l'école, jamais d'un littéral : le vendredi est travaillé dans un lycée
 * français et chômé dans l'ancien établissement du Golfe.
 *
 * @module server/journal-weekend.test
 */

import { describe, it, expect, vi } from 'vitest';
import { getJournalEntriesForWeek } from '../journal';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

const CLASS_ID = '550e8400-e29b-41d4-a716-446655440020';
/** Lundi 14 septembre 2026. */
const WEEK_START = '2026-09-14';

const FRENCH_WEEK = {
	first_day: 1,
	last_day: 0,
	school_days: [1, 2, 3, 4, 5],
	weekend_days: [0, 6]
};

const GULF_WEEK = {
	first_day: 0,
	last_day: 6,
	school_days: [0, 1, 2, 3, 4],
	weekend_days: [5, 6]
};

/**
 * Chaîne Supabase pilotable par table : `classes` rend la classe et sa
 * configuration d'école, les autres rendent des listes vides.
 */
function createSupabase(weekConfig: unknown) {
	function chain(finalResult: { data: unknown; error: unknown }) {
		const c: Record<string, unknown> = {};
		for (const m of ['select', 'eq', 'gte', 'lte', 'in', 'order', 'limit']) {
			c[m] = vi.fn(() => c);
		}
		c.single = vi.fn().mockResolvedValue(finalResult);
		c.maybeSingle = vi.fn().mockResolvedValue(finalResult);
		c.then = (resolve: (v: unknown) => unknown) => Promise.resolve(finalResult).then(resolve);
		return c;
	}

	const chains: Record<string, ReturnType<typeof chain>> = {
		classes: chain({
			data: {
				id: CLASS_ID,
				name: '2DE 3',
				grade: '2de',
				schools: weekConfig === null ? null : { timetable: { week_config: weekConfig } }
			},
			error: null
		}),
		class_journal_entries: chain({ data: [], error: null }),
		class_schedules: chain({ data: [{ day_of_week: 5 }], error: null }),
		journal_entry_homework: chain({ data: [], error: null })
	};

	return { from: vi.fn((table: string) => chains[table]) } as unknown as SupabaseClient<Database>;
}

async function weekendFlags(weekConfig: unknown): Promise<Record<number, boolean>> {
	const { data, error } = await getJournalEntriesForWeek(
		createSupabase(weekConfig),
		CLASS_ID,
		WEEK_START
	);

	expect(error).toBeNull();
	const flags: Record<number, boolean> = {};
	for (const day of data!.days) flags[day.dayOfWeek] = day.isWeekend;
	return flags;
}

describe('getJournalEntriesForWeek · jours chômés', () => {
	it('semaine française : le vendredi est travaillé, le week-end est samedi-dimanche', async () => {
		const flags = await weekendFlags(FRENCH_WEEK);

		expect(flags[5]).toBe(false); // vendredi
		expect(flags[6]).toBe(true); // samedi
		expect(flags[0]).toBe(true); // dimanche
	});

	it('semaine du Golfe : le vendredi est chômé, le dimanche travaillé', async () => {
		const flags = await weekendFlags(GULF_WEEK);

		expect(flags[5]).toBe(true); // vendredi
		expect(flags[0]).toBe(false); // dimanche
	});

	// Sans configuration lisible, le repli ne doit pas inventer une semaine qui
	// grise le vendredi dans un lycée qui y fait cours.
	it('sans configuration, retombe sur une semaine où le vendredi est travaillé', async () => {
		const flags = await weekendFlags(null);

		expect(flags[5]).toBe(false);
		expect(flags[6]).toBe(true);
	});
});
