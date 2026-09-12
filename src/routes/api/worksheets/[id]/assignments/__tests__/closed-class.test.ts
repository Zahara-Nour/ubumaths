/**
 * POST /api/worksheets/[id]/assignments — une classe fermée ne reçoit rien
 * =========================================================================
 *
 * La validation des classes ne vérifiait que leur EXISTENCE. Distribuer une
 * fiche à une classe fermée ne sert aucun élève en cours d'année — mais depuis
 * la lecture seule rétroactive, ça ÉLARGIT ce que ses anciens membres peuvent
 * relire : le prédicat se borne sur la fenêtre de l'année, pas sur la date de
 * fermeture de la classe.
 *
 * L'interface ne propose que des classes actives
 * (`get_teacher_classes_with_data` filtre sur `is_active`), donc ce garde ne
 * ferme rien d'atteignable aujourd'hui. Il empêche la dérive, et ce test
 * l'ancre.
 */

import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

const FICHE = '550e8400-e29b-41d4-a716-446655440000';
const PROF = '550e8400-e29b-41d4-a716-446655440001';
const CLASSE_ACTIVE = '550e8400-e29b-41d4-a716-446655440002';
const CLASSE_FERMEE = '550e8400-e29b-41d4-a716-446655440003';

interface Classe {
	id: string;
	name: string;
	is_active: boolean;
}

/**
 * Mock dispatché par table. La route enchaîne `worksheets`, `profiles` puis
 * `classes` avant d'atteindre le garde ; un mock à chaîne unique les
 * confondrait.
 */
function mockSupabase(classes: Classe[]) {
	const insertSpy = vi.fn();

	const from = vi.fn((table: string) => {
		if (table === 'worksheets') {
			return {
				select: () => ({
					eq: () => ({
						single: () =>
							Promise.resolve({
								data: { id: FICHE, created_by: PROF, status: 'published' },
								error: null
							})
					})
				})
			};
		}
		if (table === 'profiles') {
			return {
				select: () => ({
					eq: () => ({
						single: () => Promise.resolve({ data: { role: 'teacher' }, error: null })
					})
				})
			};
		}
		if (table === 'classes') {
			return { select: () => ({ in: () => Promise.resolve({ data: classes, error: null }) }) };
		}
		if (table === 'worksheet_assignments') {
			// Repère : si on arrive ici, le garde des classes a laissé passer.
			return {
				insert: () => ({
					select: () => ({
						single: () => {
							insertSpy();
							return Promise.resolve({
								data: null,
								error: { code: 'ZZTEST', message: 'repère : garde franchi' }
							});
						}
					})
				})
			};
		}
		throw new Error(`table inattendue : ${table}`);
	});

	return { client: { from } as unknown as SupabaseClient<Database>, insertSpy };
}

function locauxProf(supabase: SupabaseClient<Database>) {
	return {
		safeGetSession: async () => ({ user: { id: PROF }, session: {} }),
		supabase
	} as unknown as App.Locals;
}

async function appeler(supabase: SupabaseClient<Database>, classIds: string[]) {
	const { POST } = await import('../+server');
	return POST({
		params: { id: FICHE },
		locals: locauxProf(supabase),
		request: {
			json: async () => ({
				class_ids: classIds,
				student_ids: [],
				status: 'active'
			})
		}
	} as never);
}

describe('POST /api/worksheets/[id]/assignments — classes fermées', () => {
	it('refuse une classe fermée, et nomme laquelle', async () => {
		const { client, insertSpy } = mockSupabase([
			{ id: CLASSE_FERMEE, name: '2DE 3 (fermée)', is_active: false }
		]);

		await expect(appeler(client, [CLASSE_FERMEE])).rejects.toMatchObject({ status: 400 });
		// Rien n'a été créé : le refus tombe avant toute écriture.
		expect(insertSpy).not.toHaveBeenCalled();
	});

	it('refuse le lot entier dès qu’une seule classe est fermée', async () => {
		// Distribuer aux actives et taire l'autre laisserait croire à une
		// distribution complète.
		const { client, insertSpy } = mockSupabase([
			{ id: CLASSE_ACTIVE, name: '1SPE', is_active: true },
			{ id: CLASSE_FERMEE, name: '2DE 3 (fermée)', is_active: false }
		]);

		await expect(appeler(client, [CLASSE_ACTIVE, CLASSE_FERMEE])).rejects.toMatchObject({
			status: 400
		});
		expect(insertSpy).not.toHaveBeenCalled();
	});

	it('laisse passer des classes actives', async () => {
		// Le témoin : sans lui, un garde qui refuserait TOUT passerait aussi les
		// deux tests ci-dessus.
		const { client, insertSpy } = mockSupabase([
			{ id: CLASSE_ACTIVE, name: '1SPE', is_active: true }
		]);

		await expect(appeler(client, [CLASSE_ACTIVE])).rejects.toMatchObject({ status: 500 });
		expect(insertSpy).toHaveBeenCalled();
	});
});
