/**
 * `GET /api/worksheets` — les étiquettes après la suppression de la colonne
 * ========================================================================
 *
 * Migration `20260908180000_drop_legacy_tag_shapes.sql` a supprimé
 * `worksheets.tags` au profit de la jonction `resource_tags`. Trois points
 * d'entrée continuaient pourtant de renvoyer la ligne brute à
 * `worksheetResponseSchema`, qui exige `tags: z.array(z.string())`.
 *
 * Résultat en production : `tags` valait `undefined`, la validation de réponse
 * rejetait les DOUZE fiches d'un coup, l'API renvoyait 500, et la page affichait
 * « Aucune feuille trouvée. Créez votre première feuille » — un message qui
 * accuse la base d'être vide alors qu'elle ne l'était pas.
 *
 * Ces tests appellent les vraies routes, parce que c'est la seule façon de
 * traverser `validateJsonResponse` : un test qui interrogerait la table
 * directement passerait au vert sans rien prouver.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';

import { GET as listWorksheets } from '../../src/routes/api/worksheets/+server';
import { GET as getWorksheet } from '../../src/routes/api/worksheets/[id]/+server';
import { POST as duplicateWorksheet } from '../../src/routes/api/worksheets/[id]/duplicate/+server';

import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';

const service = createServiceRoleClient();
const TAG_NAME = 'Étiquette ZZ fiche';

function buildLocals(user: User): App.Locals {
	return {
		supabase: service as unknown as App.Locals['supabase'],
		safeGetSession: vi.fn().mockResolvedValue({ user }),
		user,
		requestId: crypto.randomUUID()
	} as unknown as App.Locals;
}

function urlWith(query: Record<string, string> = {}): URL {
	const u = new URL('http://localhost/api/worksheets');
	for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
	return u;
}

describe('API des fiches après la suppression de la colonne `tags`', () => {
	let teacher: { id: string; email: string };
	let locals: App.Locals;
	let worksheetId: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		teacher = await TestData.profile().withRole('teacher').create();
		locals = buildLocals({ id: teacher.id } as User);

		const { data: ws, error: wsError } = await service
			.from('worksheets')
			.insert({
				title: 'Fiche à étiquettes',
				type: 'worksheet',
				status: 'draft',
				created_by: teacher.id
			})
			.select('id')
			.single();
		if (wsError) throw new Error(`fiche : ${wsError.message}`);
		worksheetId = ws.id;

		// L'étiquette vit dans la jonction, plus dans une colonne.
		const loose = service as unknown as {
			from: (t: string) => {
				delete: () => { eq: (c: string, v: string) => PromiseLike<unknown> };
				insert: (rows: unknown) => PromiseLike<{ error: unknown }>;
				select: (c: string) => {
					eq: (c: string, v: string) => PromiseLike<{ data: { id: string }[] | null }>;
				};
			};
		};
		await loose.from('tags').delete().eq('name', TAG_NAME);
		await loose.from('tags').insert({ name: TAG_NAME });
		const { data: tagRows } = await loose.from('tags').select('id').eq('name', TAG_NAME);
		expect(tagRows).toHaveLength(1);
		await loose
			.from('resource_tags')
			.insert({ resource_kind: 'worksheet', resource_id: worksheetId, tag_id: tagRows![0].id });
	});

	afterAll(async () => {
		await (
			service as unknown as {
				from: (t: string) => {
					delete: () => { eq: (c: string, v: string) => PromiseLike<unknown> };
				};
			}
		)
			.from('tags')
			.delete()
			.eq('name', TAG_NAME);
		await service.from('worksheets').delete().eq('created_by', teacher.id);
		await cleanupAllTestData();
	});

	it('la LISTE renvoie les fiches, avec leurs étiquettes', async () => {
		// Le test qui aurait évité l'incident : sans `tags`, la validation de
		// réponse rejette la fiche et la route lève un 500.
		const response = await listWorksheets({ locals, url: urlWith() } as never);
		expect(response.status).toBe(200);

		const payload = await response.json();
		const fiche = payload.worksheets.find((w: { id: string }) => w.id === worksheetId);

		expect(fiche).toBeDefined();
		expect(fiche.tags).toEqual([TAG_NAME]);
	});

	it('une fiche SANS étiquette renvoie un tableau vide, pas `undefined`', async () => {
		const { data: nue, error: nueError } = await service
			.from('worksheets')
			.insert({
				title: 'Fiche sans étiquette',
				type: 'worksheet',
				status: 'draft',
				created_by: teacher.id
			})
			.select('id')
			.single();
		expect(nueError).toBeNull();

		const response = await listWorksheets({ locals, url: urlWith() } as never);
		expect(response.status).toBe(200);

		const payload = await response.json();
		const fiche = payload.worksheets.find((w: { id: string }) => w.id === nue.id);
		expect(fiche.tags).toEqual([]);
	});

	it('le DÉTAIL d’une fiche renvoie aussi ses étiquettes', async () => {
		const response = await getWorksheet({
			locals,
			params: { id: worksheetId },
			url: new URL(`http://localhost/api/worksheets/${worksheetId}`)
		} as never);
		expect(response.status).toBe(200);

		const payload = await response.json();
		expect(payload.worksheet.tags).toEqual([TAG_NAME]);
	});

	it('DUPLIQUER une fiche emporte ses étiquettes', async () => {
		// La colonne ayant disparu, l'insertion qui recopie la ligne ne les
		// emportait plus : la copie perdait ses étiquettes en silence.
		const response = await duplicateWorksheet({
			locals,
			params: { id: worksheetId },
			request: new Request('http://localhost/x', { method: 'POST' })
		} as never);
		expect(response.status).toBe(201);

		const payload = await response.json();
		expect(payload.worksheet.tags).toEqual([TAG_NAME]);

		// Et elles sont bien PERSISTÉES sur la copie, pas seulement dans la réponse.
		const detail = await getWorksheet({
			locals,
			params: { id: payload.worksheet.id },
			url: new URL(`http://localhost/api/worksheets/${payload.worksheet.id}`)
		} as never);
		expect((await detail.json()).worksheet.tags).toEqual([TAG_NAME]);
	});
});
