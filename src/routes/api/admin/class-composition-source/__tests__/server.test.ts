/**
 * GET /api/admin/class-composition-source — tests
 * ================================================
 *
 * La liste des candidats à la composition. Deux pièges y sont ancrés :
 *
 *  - après une clôture d'année, TOUTES les adhésions des classes sources sont
 *    archivées. Filtrer sur `status = 'active'` donnerait une liste vide au
 *    moment précis où l'écran doit servir ;
 *  - un élève déjà membre de la destination doit apparaître MARQUÉ, pas
 *    disparaître : le masquer laisserait croire qu'on l'a oublié.
 */

import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

const CIBLE = '550e8400-e29b-41d4-a716-446655440000';
const ADMIN = '550e8400-e29b-41d4-a716-4466554400ff';

interface Reponses {
	cible?: { data: unknown; error: unknown };
	sources?: { data: unknown; error: unknown };
	adhesionsSources?: { data: unknown; error: unknown };
	adhesionsCible?: { data: unknown; error: unknown };
}

function mockSupabase(r: Reponses) {
	let appelClassMembers = 0;

	const from = vi.fn((table: string) => {
		if (table === 'classes') {
			// Deux usages : la cible (select→eq→single) et les sources
			// (select→eq→not→neq[→neq], puis await).
			const sources = r.sources ?? { data: [], error: null };
			const chaineSources: Record<string, unknown> = {};
			const relancer = () => chaineSources;
			Object.assign(chaineSources, {
				eq: relancer,
				not: relancer,
				neq: relancer,
				then: (resoudre: (v: unknown) => void) => Promise.resolve(sources).then(resoudre)
			});

			return {
				select: () => ({
					...chaineSources,
					eq: (colonne: string) =>
						colonne === 'id'
							? {
									single: () =>
										Promise.resolve(r.cible ?? { data: null, error: { code: 'PGRST116' } })
								}
							: chaineSources
				})
			};
		}
		if (table === 'class_members') {
			appelClassMembers += 1;
			// 1er appel : les adhésions des classes sources (select→in).
			// 2e appel : les adhésions de la destination (select→eq).
			const premier = appelClassMembers === 1;
			return {
				select: () => ({
					in: () => Promise.resolve(r.adhesionsSources ?? { data: [], error: null }),
					eq: () =>
						Promise.resolve(
							premier
								? (r.adhesionsSources ?? { data: [], error: null })
								: (r.adhesionsCible ?? { data: [], error: null })
						)
				})
			};
		}
		throw new Error(`table inattendue : ${table}`);
	});

	return { from } as unknown as SupabaseClient<Database>;
}

function locauxAdmin(supabase: SupabaseClient<Database>) {
	return {
		user: { id: ADMIN },
		profile: { id: ADMIN, role: 'admin' },
		supabase
	} as unknown as App.Locals;
}

async function appeler(locals: App.Locals, targetClassId: string | null) {
	const { GET } = await import('../+server');
	const url = new URL('http://localhost/api/admin/class-composition-source');
	if (targetClassId !== null) url.searchParams.set('targetClassId', targetClassId);
	return GET({ url, locals } as never);
}

const eleve = (id: string, nom: string, role = 'student') => ({
	id,
	firstname: 'Prénom',
	lastname: nom,
	email: `${nom.toLowerCase()}@test.local`,
	role
});

describe('GET /api/admin/class-composition-source', () => {
	it('liste les élèves archivés des années précédentes', async () => {
		// Le cas réel d'après une clôture : toutes les adhésions sont archivées.
		const client = mockSupabase({
			cible: { data: { id: CIBLE, school_id: 's1', school_year_id: 'y2' }, error: null },
			sources: {
				data: [
					{
						id: 'c1',
						name: '2DE 3',
						school_year: { id: 'y1', name: '2025-2026', start_date: '2025-09-01' }
					}
				],
				error: null
			},
			adhesionsSources: {
				data: [
					{ class_id: 'c1', student_id: 'e2', profiles: eleve('e2', 'Zulu') },
					{ class_id: 'c1', student_id: 'e1', profiles: eleve('e1', 'Alpha') }
				],
				error: null
			}
		});

		const corps = await (await appeler(locauxAdmin(client), CIBLE)).json();

		expect(corps.classes).toHaveLength(1);
		expect(corps.classes[0].class_name).toBe('2DE 3');
		// Tri par nom : la liste doit être lisible telle quelle.
		expect(corps.classes[0].students.map((e: { id: string }) => e.id)).toEqual(['e1', 'e2']);
		expect(
			corps.classes[0].students.every((e: { already_member: boolean }) => !e.already_member)
		).toBe(true);
	});

	it('marque, sans le masquer, un élève déjà membre de la destination', async () => {
		const client = mockSupabase({
			cible: { data: { id: CIBLE, school_id: 's1', school_year_id: 'y2' }, error: null },
			sources: {
				data: [
					{
						id: 'c1',
						name: '2DE 3',
						school_year: { id: 'y1', name: '2025-2026', start_date: '2025-09-01' }
					}
				],
				error: null
			},
			adhesionsSources: {
				data: [{ class_id: 'c1', student_id: 'e1', profiles: eleve('e1', 'Alpha') }],
				error: null
			},
			adhesionsCible: { data: [{ student_id: 'e1' }], error: null }
		});

		const corps = await (await appeler(locauxAdmin(client), CIBLE)).json();

		expect(corps.classes[0].students).toHaveLength(1);
		expect(corps.classes[0].students[0].already_member).toBe(true);
	});

	it('écarte un profil qui n’est pas un élève', async () => {
		const client = mockSupabase({
			cible: { data: { id: CIBLE, school_id: 's1', school_year_id: 'y2' }, error: null },
			sources: {
				data: [
					{
						id: 'c1',
						name: '2DE 3',
						school_year: { id: 'y1', name: '2025-2026', start_date: '2025-09-01' }
					}
				],
				error: null
			},
			adhesionsSources: {
				data: [
					{ class_id: 'c1', student_id: 'e1', profiles: eleve('e1', 'Alpha') },
					{ class_id: 'c1', student_id: 't1', profiles: eleve('t1', 'Prof', 'teacher') }
				],
				error: null
			}
		});

		const corps = await (await appeler(locauxAdmin(client), CIBLE)).json();
		expect(corps.classes[0].students.map((e: { id: string }) => e.id)).toEqual(['e1']);
	});

	it('n’expose pas une classe source vidée de ses élèves', async () => {
		const client = mockSupabase({
			cible: { data: { id: CIBLE, school_id: 's1', school_year_id: 'y2' }, error: null },
			sources: {
				data: [
					{
						id: 'c1',
						name: 'Classe vide',
						school_year: { id: 'y1', name: '2025-2026', start_date: '2025-09-01' }
					}
				],
				error: null
			}
		});

		const corps = await (await appeler(locauxAdmin(client), CIBLE)).json();
		expect(corps.classes).toEqual([]);
	});

	it('répond 404 sur une destination inexistante', async () => {
		const client = mockSupabase({ cible: { data: null, error: { code: 'PGRST116' } } });
		await expect(appeler(locauxAdmin(client), CIBLE)).rejects.toMatchObject({ status: 404 });
	});

	it('distingue une panne de lecture d’une destination absente', async () => {
		const client = mockSupabase({
			cible: { data: null, error: { code: '57014', message: 'canceling statement' } }
		});
		await expect(appeler(locauxAdmin(client), CIBLE)).rejects.toMatchObject({ status: 500 });
	});

	it('refuse une destination sans école', async () => {
		const client = mockSupabase({
			cible: { data: { id: CIBLE, school_id: null, school_year_id: 'y2' }, error: null }
		});
		await expect(appeler(locauxAdmin(client), CIBLE)).rejects.toMatchObject({ status: 409 });
	});

	it('refuse un identifiant qui n’est pas un UUID', async () => {
		const client = mockSupabase({});
		await expect(appeler(locauxAdmin(client), 'pas-un-uuid')).rejects.toMatchObject({
			status: 400
		});
	});

	it('exige une élévation admin', async () => {
		const client = mockSupabase({});
		const locauxProf = {
			user: { id: 't1' },
			profile: { id: 't1', role: 'teacher' },
			supabase: client
		} as unknown as App.Locals;
		await expect(appeler(locauxProf, CIBLE)).rejects.toMatchObject({ status: 403 });
	});
});
