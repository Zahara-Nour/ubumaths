/**
 * Tableau des Palotins du prof : la Constance Royale affichée
 * ============================================================
 *
 * Le prof voit la Constance (semaines tenues d'affilée) telle que l'élève la
 * voit : 0 pour une ancienne série en jours (aucune semaine enregistrée) et
 * pour une Constance perdue que le tableau de bord de l'élève n'a pas encore
 * remise à zéro.
 */
import { describe, it, expect, vi } from 'vitest';
import { createFakeSupabase, type Call } from '$lib/server/__tests__/helpers/fake-supabase';
import { utcDay, weekStartOf } from '$lib/utils/buddy-constance';

vi.mock('$lib/server/middleware/auth', () => ({ requireRole: vi.fn(async () => ({})) }));

import { load } from '../+page.server';

// Constantes
const THIS_WEEK = weekStartOf(utcDay());
const TWO_WEEKS_AGO = utcDay(new Date(Date.parse(`${THIS_WEEK}T00:00:00Z`) - 14 * 86_400_000));

// Functions
function member(id: string, buddy: Record<string, unknown>) {
	return {
		student_id: id,
		profiles: { full_name: `Élève ${id}`, firstname: null, lastname: null },
		student_buddies: {
			palotin_type: 'giron',
			xp: 10,
			level: 1,
			longest_streak: 9,
			last_activity_date: null,
			...buddy
		}
	};
}

const members = [
	member('a', { current_streak: 4, constance_week_start: THIS_WEEK, constance_days_this_week: 1 }),
	// Ancienne série en jours
	member('b', { current_streak: 12, constance_week_start: null, constance_days_this_week: 0 }),
	// Constance perdue (dernière semaine il y a deux semaines), pas encore remise à 0
	member('c', {
		current_streak: 3,
		constance_week_start: TWO_WEEKS_AGO,
		constance_days_this_week: 3
	})
];

async function loadPage() {
	const selects: string[] = [];
	const { client } = createFakeSupabase((table: string, calls: Call[]) => {
		if (table === 'classes') return { data: [{ id: 'k1', name: 'Classe' }], error: null };
		selects.push(String(calls[0]?.args[0] ?? ''));
		return { data: members, error: null };
	});
	const result = (await load({ locals: { supabase: client } } as never)) as {
		classesData: {
			students: { studentId: string; currentStreak: number }[];
			stats: { avgStreak: number };
		}[];
	};
	return { result, selects };
}

describe('tableau des Palotins du prof — Constance Royale', () => {
	it('lit la semaine et les jours de la Constance', async () => {
		const { selects } = await loadPage();
		expect(selects[0]).toContain('constance_week_start');
		expect(selects[0]).toContain('constance_days_this_week');
	});

	it('Constance affichée : en cours = N ; ancienne série ou Constance perdue = 0', async () => {
		const { result } = await loadPage();
		const [cls] = result.classesData;
		expect(cls.students.map((s) => s.currentStreak)).toEqual([4, 0, 0]);
		// Moyenne sur la valeur affichée : 4 / 3 ≈ 1,3
		expect(cls.stats.avgStreak).toBe(1.3);
	});
});
