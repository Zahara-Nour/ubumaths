/**
 * POST /api/admin/compose-class — tests
 * ======================================
 *
 * Le geste de masse de la bascule d'année. La route est mince : garde admin,
 * Zod, quelques refus, un INSERT. Ce sont précisément les refus qui comptent —
 * composer vers une classe archivée ou vers une année terminée fabriquerait des
 * adhésions que plus rien ne gouverne, et rien en base ne l'interdit.
 *
 * Le mock dispatche par table : la route enchaîne quatre lectures sur trois
 * tables, et un mock à chaîne unique les confondrait.
 */

import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

const CLASSE_CIBLE = '550e8400-e29b-41d4-a716-446655440000';
const ELEVE_A = '550e8400-e29b-41d4-a716-446655440001';
const ELEVE_B = '550e8400-e29b-41d4-a716-446655440002';
const PROF = '550e8400-e29b-41d4-a716-446655440003';
const ADMIN = '550e8400-e29b-41d4-a716-4466554400ff';

/** Une année largement en cours, pour que la borne de date ne morde pas. */
const ANNEE_OUVERTE = { id: 'y1', name: '2026-2027', end_date: '2099-07-15' };

interface Reponses {
	cible?: { data: unknown; error: unknown };
	profiles?: { data: unknown; error: unknown };
	membres?: { data: unknown; error: unknown };
	insert?: { error: unknown };
}

function mockSupabase(r: Reponses) {
	const insertSpy = vi.fn().mockResolvedValue({ error: r.insert?.error ?? null });

	const from = vi.fn((table: string) => {
		if (table === 'classes') {
			return {
				select: () => ({
					eq: () => ({
						single: () => Promise.resolve(r.cible ?? { data: null, error: { code: 'PGRST116' } })
					})
				})
			};
		}
		if (table === 'profiles') {
			return {
				select: () => ({
					in: () => Promise.resolve(r.profiles ?? { data: [], error: null })
				})
			};
		}
		if (table === 'class_members') {
			return {
				select: () => ({
					eq: () => ({
						in: () => Promise.resolve(r.membres ?? { data: [], error: null })
					})
				}),
				insert: insertSpy
			};
		}
		throw new Error(`table inattendue : ${table}`);
	});

	return {
		client: { from } as unknown as SupabaseClient<Database>,
		insertSpy
	};
}

function locauxAdmin(supabase: SupabaseClient<Database>) {
	return {
		user: { id: ADMIN },
		profile: { id: ADMIN, role: 'admin' },
		supabase
	} as unknown as App.Locals;
}

function requete(body: unknown) {
	return { json: async () => body } as Request;
}

async function appeler(locals: App.Locals, body: unknown) {
	const { POST } = await import('../+server');
	return POST({ request: requete(body), locals } as never);
}

describe('POST /api/admin/compose-class', () => {
	it('inscrit les élèves sélectionnés dans la classe de destination', async () => {
		const { client, insertSpy } = mockSupabase({
			cible: {
				data: {
					id: CLASSE_CIBLE,
					name: '1SPE',
					is_active: true,
					school_id: 's1',
					school_year: ANNEE_OUVERTE
				},
				error: null
			},
			profiles: {
				data: [
					{ id: ELEVE_A, role: 'student' },
					{ id: ELEVE_B, role: 'student' }
				],
				error: null
			}
		});

		const reponse = await appeler(locauxAdmin(client), {
			targetClassId: CLASSE_CIBLE,
			studentIds: [ELEVE_A, ELEVE_B]
		});

		expect(await reponse.json()).toEqual({ added: 2, ignored: 0, refused: [] });
		expect(insertSpy).toHaveBeenCalledWith([
			{ student_id: ELEVE_A, class_id: CLASSE_CIBLE, status: 'active' },
			{ student_id: ELEVE_B, class_id: CLASSE_CIBLE, status: 'active' }
		]);
	});

	it('ignore un élève déjà membre au lieu de le dupliquer', async () => {
		const { client, insertSpy } = mockSupabase({
			cible: {
				data: {
					id: CLASSE_CIBLE,
					name: '1SPE',
					is_active: true,
					school_id: 's1',
					school_year: ANNEE_OUVERTE
				},
				error: null
			},
			profiles: {
				data: [
					{ id: ELEVE_A, role: 'student' },
					{ id: ELEVE_B, role: 'student' }
				],
				error: null
			},
			membres: { data: [{ student_id: ELEVE_A }], error: null }
		});

		const reponse = await appeler(locauxAdmin(client), {
			targetClassId: CLASSE_CIBLE,
			studentIds: [ELEVE_A, ELEVE_B]
		});

		expect(await reponse.json()).toEqual({ added: 1, ignored: 1, refused: [] });
		expect(insertSpy).toHaveBeenCalledWith([
			{ student_id: ELEVE_B, class_id: CLASSE_CIBLE, status: 'active' }
		]);
	});

	it('refuse nommément un identifiant qui n’est pas un compte d’élève', async () => {
		// Le taire ferait croire à une composition complète. L'appelant doit
		// savoir que sa sélection ne s'est pas appliquée entière.
		const { client, insertSpy } = mockSupabase({
			cible: {
				data: {
					id: CLASSE_CIBLE,
					name: '1SPE',
					is_active: true,
					school_id: 's1',
					school_year: ANNEE_OUVERTE
				},
				error: null
			},
			profiles: {
				data: [
					{ id: ELEVE_A, role: 'student' },
					{ id: PROF, role: 'teacher' }
				],
				error: null
			}
		});

		const reponse = await appeler(locauxAdmin(client), {
			targetClassId: CLASSE_CIBLE,
			studentIds: [ELEVE_A, PROF]
		});

		expect(await reponse.json()).toEqual({ added: 1, ignored: 0, refused: [PROF] });
		expect(insertSpy).toHaveBeenCalledWith([
			{ student_id: ELEVE_A, class_id: CLASSE_CIBLE, status: 'active' }
		]);
	});

	it('n’insère rien quand tout le monde est déjà membre', async () => {
		const { client, insertSpy } = mockSupabase({
			cible: {
				data: {
					id: CLASSE_CIBLE,
					name: '1SPE',
					is_active: true,
					school_id: 's1',
					school_year: ANNEE_OUVERTE
				},
				error: null
			},
			profiles: { data: [{ id: ELEVE_A, role: 'student' }], error: null },
			membres: { data: [{ student_id: ELEVE_A }], error: null }
		});

		const reponse = await appeler(locauxAdmin(client), {
			targetClassId: CLASSE_CIBLE,
			studentIds: [ELEVE_A]
		});

		expect(await reponse.json()).toEqual({ added: 0, ignored: 1, refused: [] });
		expect(insertSpy).not.toHaveBeenCalled();
	});

	describe('les refus', () => {
		it('refuse une classe de destination archivée', async () => {
			const { client, insertSpy } = mockSupabase({
				cible: {
					data: {
						id: CLASSE_CIBLE,
						name: '1SPE',
						is_active: false,
						school_id: 's1',
						school_year: ANNEE_OUVERTE
					},
					error: null
				}
			});

			await expect(
				appeler(locauxAdmin(client), { targetClassId: CLASSE_CIBLE, studentIds: [ELEVE_A] })
			).rejects.toMatchObject({ status: 409 });
			expect(insertSpy).not.toHaveBeenCalled();
		});

		it('refuse une année déjà terminée', async () => {
			const { client, insertSpy } = mockSupabase({
				cible: {
					data: {
						id: CLASSE_CIBLE,
						name: '2DE 3',
						is_active: true,
						school_id: 's1',
						school_year: { id: 'y0', name: '2025-2026', end_date: '2026-06-30' }
					},
					error: null
				}
			});

			await expect(
				appeler(locauxAdmin(client), { targetClassId: CLASSE_CIBLE, studentIds: [ELEVE_A] })
			).rejects.toMatchObject({ status: 409 });
			expect(insertSpy).not.toHaveBeenCalled();
		});

		it('refuse une classe sans année rattachée', async () => {
			const { client } = mockSupabase({
				cible: {
					data: {
						id: CLASSE_CIBLE,
						name: 'orpheline',
						is_active: true,
						school_id: 's1',
						school_year: null
					},
					error: null
				}
			});

			await expect(
				appeler(locauxAdmin(client), { targetClassId: CLASSE_CIBLE, studentIds: [ELEVE_A] })
			).rejects.toMatchObject({ status: 409 });
		});

		it('répond 404 sur une classe inexistante', async () => {
			const { client } = mockSupabase({ cible: { data: null, error: { code: 'PGRST116' } } });

			await expect(
				appeler(locauxAdmin(client), { targetClassId: CLASSE_CIBLE, studentIds: [ELEVE_A] })
			).rejects.toMatchObject({ status: 404 });
		});

		it('distingue une panne de lecture d’une classe absente', async () => {
			// Sans cette distinction, une base injoignable annonce « classe
			// introuvable » — un message qui accuse la donnée plutôt que la panne.
			const { client } = mockSupabase({
				cible: { data: null, error: { code: '57014', message: 'canceling statement' } }
			});

			await expect(
				appeler(locauxAdmin(client), { targetClassId: CLASSE_CIBLE, studentIds: [ELEVE_A] })
			).rejects.toMatchObject({ status: 500 });
		});

		it('exige une élévation admin', async () => {
			const { client } = mockSupabase({});
			const locauxEleve = {
				user: { id: ELEVE_A },
				profile: { id: ELEVE_A, role: 'student' },
				supabase: client
			} as unknown as App.Locals;

			await expect(
				appeler(locauxEleve, { targetClassId: CLASSE_CIBLE, studentIds: [ELEVE_B] })
			).rejects.toMatchObject({ status: 403 });
		});
	});

	describe('la validation', () => {
		it('refuse une sélection vide', async () => {
			const { client } = mockSupabase({});
			await expect(
				appeler(locauxAdmin(client), { targetClassId: CLASSE_CIBLE, studentIds: [] })
			).rejects.toMatchObject({ status: 400 });
		});

		it('plafonne la sélection à 200 élèves', async () => {
			const { client } = mockSupabase({});
			const trop = Array.from(
				{ length: 201 },
				(_, i) => `550e8400-e29b-41d4-a716-${(446655440000 + i).toString().padStart(12, '0')}`
			);
			await expect(
				appeler(locauxAdmin(client), { targetClassId: CLASSE_CIBLE, studentIds: trop })
			).rejects.toMatchObject({ status: 400 });
		});

		it('refuse un identifiant de classe qui n’est pas un UUID', async () => {
			const { client } = mockSupabase({});
			await expect(
				appeler(locauxAdmin(client), { targetClassId: 'pas-un-uuid', studentIds: [ELEVE_A] })
			).rejects.toMatchObject({ status: 400 });
		});
	});
});
