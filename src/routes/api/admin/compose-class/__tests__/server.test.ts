/**
 * POST /api/admin/compose-class — tests
 * ======================================
 *
 * La route est mince : garde admin, Zod, quelques refus, puis un appel à
 * `admin_compose_class` qui fait l'écriture en une transaction. Ce sont les
 * refus qui comptent ici.
 *
 * Le plus important est le refus du déplacement d'école non consenti :
 * inscrire un élève dans une classe d'une autre école déplace son profil, donc
 * ses trimestres, son calendrier et son marché. Ça ne doit jamais arriver par
 * inadvertance.
 *
 * Les contrôles de classe (archivée, année terminée) font double emploi avec
 * ceux de la fonction Postgres, et c'est voulu : la fonction est le garde, la
 * route est le message.
 */

import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

const CLASSE_CIBLE = '550e8400-e29b-41d4-a716-446655440000';
const ELEVE_A = '550e8400-e29b-41d4-a716-446655440001';
const ELEVE_B = '550e8400-e29b-41d4-a716-446655440002';
const PROF = '550e8400-e29b-41d4-a716-446655440003';
const ADMIN = '550e8400-e29b-41d4-a716-4466554400ff';
const ECOLE_CIBLE = 'ecole-cible';
const ECOLE_AUTRE = 'ecole-autre';

/** Une année largement en cours, pour que la borne de date ne morde pas. */
const ANNEE_OUVERTE = { id: 'y1', name: '2026-2027', end_date: '2099-07-15' };

const CIBLE_OUVERTE = {
	id: CLASSE_CIBLE,
	name: 'Groupe particulier',
	is_active: true,
	school_id: ECOLE_CIBLE,
	school_year: ANNEE_OUVERTE
};

interface Reponses {
	cible?: { data: unknown; error: unknown };
	profiles?: { data: unknown; error: unknown };
	rpc?: { data: unknown; error: unknown };
}

function mockSupabase(r: Reponses) {
	const rpc = vi.fn(() =>
		Promise.resolve(r.rpc ?? { data: [{ enrolled: 0, moved: 0 }], error: null })
	);

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
		throw new Error(`table inattendue : ${table}`);
	});

	return { client: { from, rpc } as unknown as SupabaseClient<Database>, rpc };
}

function locauxAdmin(supabase: SupabaseClient<Database>) {
	return {
		user: { id: ADMIN },
		profile: { id: ADMIN, role: 'admin' },
		supabase
	} as unknown as App.Locals;
}

async function appeler(locals: App.Locals, body: unknown) {
	const { POST } = await import('../+server');
	return POST({ request: { json: async () => body } as Request, locals } as never);
}

const eleve = (id: string, ecole: string) => ({ id, role: 'student', school_id: ecole });

describe('POST /api/admin/compose-class', () => {
	it('inscrit les élèves de la même école, sans en déplacer aucun', async () => {
		const { client, rpc } = mockSupabase({
			cible: { data: CIBLE_OUVERTE, error: null },
			profiles: { data: [eleve(ELEVE_A, ECOLE_CIBLE), eleve(ELEVE_B, ECOLE_CIBLE)], error: null },
			rpc: { data: [{ enrolled: 2, moved: 0 }], error: null }
		});

		const reponse = await appeler(locauxAdmin(client), {
			targetClassId: CLASSE_CIBLE,
			studentIds: [ELEVE_A, ELEVE_B]
		});

		expect(await reponse.json()).toEqual({ added: 2, ignored: 0, moved: 0, refused: [] });
		expect(rpc).toHaveBeenCalledWith('admin_compose_class', {
			p_class_id: CLASSE_CIBLE,
			p_student_ids: [ELEVE_A, ELEVE_B]
		});
	});

	it('déduit les ignorés de ce que la fonction a réellement inscrit', async () => {
		// La déduplication est faite par `on conflict do nothing` dans la
		// transaction ; la route ne la refait pas, elle la lit.
		const { client } = mockSupabase({
			cible: { data: CIBLE_OUVERTE, error: null },
			profiles: { data: [eleve(ELEVE_A, ECOLE_CIBLE), eleve(ELEVE_B, ECOLE_CIBLE)], error: null },
			rpc: { data: [{ enrolled: 1, moved: 0 }], error: null }
		});

		const reponse = await appeler(locauxAdmin(client), {
			targetClassId: CLASSE_CIBLE,
			studentIds: [ELEVE_A, ELEVE_B]
		});

		expect(await reponse.json()).toEqual({ added: 1, ignored: 1, moved: 0, refused: [] });
	});

	describe('le déplacement d’école', () => {
		it('refuse tant qu’il n’a pas été consenti, et dit combien', async () => {
			// Déplacer un profil change ses trimestres, son calendrier et son
			// marché. Le faire en silence serait le pire des comportements.
			const { client, rpc } = mockSupabase({
				cible: { data: CIBLE_OUVERTE, error: null },
				profiles: { data: [eleve(ELEVE_A, ECOLE_AUTRE), eleve(ELEVE_B, ECOLE_CIBLE)], error: null }
			});

			await expect(
				appeler(locauxAdmin(client), {
					targetClassId: CLASSE_CIBLE,
					studentIds: [ELEVE_A, ELEVE_B]
				})
			).rejects.toMatchObject({ status: 409 });
			expect(rpc).not.toHaveBeenCalled();
		});

		it('procède une fois consenti, et rapporte les déplacements', async () => {
			const { client, rpc } = mockSupabase({
				cible: { data: CIBLE_OUVERTE, error: null },
				profiles: { data: [eleve(ELEVE_A, ECOLE_AUTRE)], error: null },
				rpc: { data: [{ enrolled: 1, moved: 1 }], error: null }
			});

			const reponse = await appeler(locauxAdmin(client), {
				targetClassId: CLASSE_CIBLE,
				studentIds: [ELEVE_A],
				confirmSchoolChange: true
			});

			expect(await reponse.json()).toEqual({ added: 1, ignored: 0, moved: 1, refused: [] });
			expect(rpc).toHaveBeenCalled();
		});

		it('ne demande rien quand personne ne change d’école', async () => {
			// Le témoin : sans lui, un garde qui refuserait TOUJOURS passerait
			// aussi le test ci-dessus.
			const { client, rpc } = mockSupabase({
				cible: { data: CIBLE_OUVERTE, error: null },
				profiles: { data: [eleve(ELEVE_A, ECOLE_CIBLE)], error: null },
				rpc: { data: [{ enrolled: 1, moved: 0 }], error: null }
			});

			const reponse = await appeler(locauxAdmin(client), {
				targetClassId: CLASSE_CIBLE,
				studentIds: [ELEVE_A]
			});

			expect(reponse.status).toBe(200);
			expect(rpc).toHaveBeenCalled();
		});
	});

	it('refuse nommément un identifiant qui n’est pas un compte d’élève', async () => {
		// Le taire ferait croire à une composition complète.
		const { client, rpc } = mockSupabase({
			cible: { data: CIBLE_OUVERTE, error: null },
			profiles: {
				data: [eleve(ELEVE_A, ECOLE_CIBLE), { id: PROF, role: 'teacher', school_id: ECOLE_CIBLE }],
				error: null
			},
			rpc: { data: [{ enrolled: 1, moved: 0 }], error: null }
		});

		const reponse = await appeler(locauxAdmin(client), {
			targetClassId: CLASSE_CIBLE,
			studentIds: [ELEVE_A, PROF]
		});

		expect(await reponse.json()).toEqual({ added: 1, ignored: 0, moved: 0, refused: [PROF] });
		// Le professeur n'est pas transmis à la fonction : son école ne doit
		// surtout pas être réécrite.
		expect(rpc).toHaveBeenCalledWith('admin_compose_class', {
			p_class_id: CLASSE_CIBLE,
			p_student_ids: [ELEVE_A]
		});
	});

	it('n’appelle pas la fonction quand aucun élève valide ne reste', async () => {
		const { client, rpc } = mockSupabase({
			cible: { data: CIBLE_OUVERTE, error: null },
			profiles: { data: [{ id: PROF, role: 'teacher', school_id: ECOLE_CIBLE }], error: null }
		});

		const reponse = await appeler(locauxAdmin(client), {
			targetClassId: CLASSE_CIBLE,
			studentIds: [PROF]
		});

		expect(await reponse.json()).toEqual({ added: 0, ignored: 0, moved: 0, refused: [PROF] });
		expect(rpc).not.toHaveBeenCalled();
	});

	describe('les refus', () => {
		it('refuse une classe de destination archivée', async () => {
			const { client, rpc } = mockSupabase({
				cible: { data: { ...CIBLE_OUVERTE, is_active: false }, error: null }
			});

			await expect(
				appeler(locauxAdmin(client), { targetClassId: CLASSE_CIBLE, studentIds: [ELEVE_A] })
			).rejects.toMatchObject({ status: 409 });
			expect(rpc).not.toHaveBeenCalled();
		});

		it('refuse une année déjà terminée', async () => {
			const { client, rpc } = mockSupabase({
				cible: {
					data: {
						...CIBLE_OUVERTE,
						school_year: { id: 'y0', name: '2025-2026', end_date: '2026-06-30' }
					},
					error: null
				}
			});

			await expect(
				appeler(locauxAdmin(client), { targetClassId: CLASSE_CIBLE, studentIds: [ELEVE_A] })
			).rejects.toMatchObject({ status: 409 });
			expect(rpc).not.toHaveBeenCalled();
		});

		it('refuse une classe sans année rattachée', async () => {
			const { client } = mockSupabase({
				cible: { data: { ...CIBLE_OUVERTE, school_year: null }, error: null }
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

		it('remonte un échec de la fonction en 500', async () => {
			const { client } = mockSupabase({
				cible: { data: CIBLE_OUVERTE, error: null },
				profiles: { data: [eleve(ELEVE_A, ECOLE_CIBLE)], error: null },
				rpc: { data: null, error: { code: '42501', message: 'Réservé aux administrateurs' } }
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
