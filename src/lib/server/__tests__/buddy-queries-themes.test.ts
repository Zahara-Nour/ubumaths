/**
 * Thèmes explorés du Palotin : une écriture par séance, vérifiée
 * ===============================================================
 *
 * La RLS échoue en silence (docs/pratiques/rls-echecs-silencieux.md) : une
 * écriture refusée rend 0 ligne sans erreur. Un thème n'est donc « nouveau »
 * (et ne rapporte son bonus) que si la ligne relue le contient vraiment.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { BuddyState } from '$lib/types/buddy';

vi.mock('$lib/server/serviceRoleClient', () => ({ createServiceRoleClient: () => ({}) }));

import { addExploredThemes } from '../buddy-queries';

// Constantes
const STUDENT = '11111111-1111-4111-8111-111111111111';

// Variables
let updates: Record<string, unknown>[];
let writtenRows: { themes_explored: string[] }[] | null;

// Functions
function buddy(themes: string[]): BuddyState {
	return {
		student_id: STUDENT,
		palotin_type: 'pile',
		xp: 0,
		level: 1,
		current_streak: 0,
		longest_streak: 0,
		last_activity_date: null,
		xp_earned_today: 0,
		last_xp_date: null,
		themes_explored: themes,
		change_count: 0,
		equipped_skin_id: null
	};
}

function fakeSupabase(): SupabaseClient<Database> {
	return {
		from: () => ({
			update: (row: Record<string, unknown>) => {
				updates.push(row);
				return {
					eq: () => ({
						select: async () => ({
							data: writtenRows ?? [{ themes_explored: row.themes_explored as string[] }],
							error: null
						})
					})
				};
			}
		})
	} as unknown as SupabaseClient<Database>;
}

describe('addExploredThemes', () => {
	beforeEach(() => {
		updates = [];
		writtenRows = null;
	});

	it('ajoute les seuls thèmes nouveaux, en une écriture, et les rend', async () => {
		const added = await addExploredThemes(fakeSupabase(), buddy(['t1']), ['t1', 't2', 't3', 't2']);

		expect([...added].sort()).toEqual(['t2', 't3']);
		expect(updates).toEqual([{ themes_explored: ['t1', 't2', 't3'] }]);
	});

	it('rien de nouveau : aucune écriture', async () => {
		const added = await addExploredThemes(fakeSupabase(), buddy(['t1']), ['t1']);
		expect(added.size).toBe(0);
		expect(updates).toEqual([]);
	});

	it('écriture refusée en silence (0 ligne) : aucun thème nouveau', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		writtenRows = [];
		const added = await addExploredThemes(fakeSupabase(), buddy([]), ['t1']);
		expect(added.size).toBe(0);
	});
});
