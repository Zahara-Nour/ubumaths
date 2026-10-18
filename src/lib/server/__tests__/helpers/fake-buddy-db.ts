/**
 * Fausse base du Palotin pour les tests des écritures (`buddy-queries.ts`).
 *
 * Une ligne `student_buddies` et une ligne `profiles` en mémoire, derrière le
 * faux client de `fake-supabase.ts` : les filtres `.eq()` d'une écriture sont
 * VRAIMENT appliqués (une écriture dont le filtre ne correspond plus rend
 * 0 ligne, comme PostgREST), et toute écriture de `student_buddies` avance
 * `updated_at` (comme le trigger). `beforeWrite` simule un envoi simultané qui
 * modifie la ligne entre la lecture et l'écriture.
 */

import { createFakeSupabase, type Call, type Result } from './fake-supabase';
import type { StudentBuddy } from '$lib/types/database-helpers';

// Types
type Row = Record<string, unknown>;

export interface FakeBuddyDb {
	buddy: StudentBuddy | null;
	profile: { id: string; gidouilles: number | null };
	/** Appelé avant chaque écriture (table, n° d'écriture sur cette table, à partir de 1). */
	beforeWrite?: (table: string, index: number) => void;
	/** Erreur rendue par la prochaine écriture de cette table. */
	failNextWrite?: { table: string; error: { code?: string; message: string } };
}

// Variables
let tick = 0;

// Functions

/** Horodatage strictement croissant (simule `now()` du trigger). */
export function nextUpdatedAt(): string {
	tick += 1;
	return new Date(Date.UTC(2026, 9, 18, 10, 0, 0, tick)).toISOString();
}

export function buddyRow(studentId: string, overrides: Partial<StudentBuddy> = {}): StudentBuddy {
	return {
		student_id: studentId,
		palotin_type: 'pile',
		xp: 0,
		level: 1,
		current_streak: 0,
		longest_streak: 0,
		last_activity_date: null,
		xp_earned_today: 0,
		last_xp_date: null,
		themes_explored: [],
		change_count: 0,
		equipped_skin_id: null,
		constance_week_start: null,
		constance_days_this_week: 0,
		created_at: '2026-10-01T00:00:00.000Z',
		updated_at: nextUpdatedAt(),
		...overrides
	};
}

/** Le faux client service et ce qu'il a reçu. */
export function createFakeBuddyDb(db: FakeBuddyDb) {
	const writes: Record<string, number> = {};

	function rowOf(table: string): Row | null {
		if (table === 'student_buddies') return db.buddy as Row | null;
		if (table === 'profiles') return db.profile as Row;
		return null;
	}

	function respond(table: string, calls: Call[]): Result {
		const op = calls[0]?.method;
		const filters = calls.filter((c) => c.method === 'eq');
		const filterMatch = (row: Row) => filters.every((c) => row[c.args[0] as string] === c.args[1]);

		if (op === 'select') {
			const row = rowOf(table);
			const data = row && filterMatch(row) ? { ...row } : null;
			return { data, error: null };
		}

		writes[table] = (writes[table] ?? 0) + 1;
		db.beforeWrite?.(table, writes[table]);
		if (db.failNextWrite?.table === table) {
			const { error } = db.failNextWrite;
			db.failNextWrite = undefined;
			return { data: null, error };
		}

		if (op === 'insert') {
			if (table === 'student_buddies' && db.buddy) {
				return { data: null, error: { code: '23505', message: 'duplicate key' } };
			}
			const inserted = calls[0].args[0] as Partial<StudentBuddy> & { student_id: string };
			db.buddy = buddyRow(inserted.student_id, inserted);
			return { data: [{ ...db.buddy }], error: null };
		}

		if (op === 'update') {
			const row = rowOf(table);
			if (!row || !filterMatch(row)) return { data: [], error: null };
			Object.assign(row, calls[0].args[0] as Row);
			if (table === 'student_buddies') row.updated_at = nextUpdatedAt();
			return { data: [{ ...row }], error: null };
		}

		return { data: null, error: null };
	}

	return { ...createFakeSupabase(respond), writes };
}
