/**
 * Tagging d'une question à un point de programme.
 * =============================================
 *
 * `question_template_points` est le pivot de l'acquisition : une tentative n'a
 * aucune clé étrangère vers un point, elle s'y relie par le template tagué. Sans
 * ligne ici, aucun point ne peut jamais se valider — c'était l'état de la prod
 * jusqu'ici, la table étant en lecture seule pour le prof et sans aucune UI.
 *
 * Requiert Supabase local (`pnpm db:start` + `pnpm db:reset`).
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

import {
	GET as tagsGET,
	POST as tagsPOST,
	DELETE as tagsDELETE
} from '../../src/routes/api/teacher/curriculum/template-tags/+server';

import {
	createServiceRoleClient,
	TestData,
	cleanupCompetenceTestData
} from '../helpers/competence-referentiel.helpers';

// Grade dédié : les seeds peuplent la 6ᵉ et la 1ʳᵉ spé.
const TEST_GRADE = '5';

let service: SupabaseClient<Database>;

beforeAll(() => {
	service = createServiceRoleClient();
});

afterAll(async () => {
	await cleanup();
	await cleanupCompetenceTestData();
});

beforeEach(async () => {
	await cleanup();
	await cleanupCompetenceTestData();
});

async function cleanup() {
	await service
		.from('curriculum_themes' as never)
		.delete()
		.eq('grade', TEST_GRADE);
	await service.from('question_templates').delete().eq('domain', 'test-tagging');
}

// --- fixtures --------------------------------------------------------------

async function svcPoint(): Promise<{ id: string }> {
	const { data: theme } = await service
		.from('curriculum_themes' as never)
		.insert({ grade: TEST_GRADE, name: `Thème ${crypto.randomUUID().slice(0, 8)}` } as never)
		.select('id')
		.single();
	const { data: obj } = await service
		.from('curriculum_objectives' as never)
		.insert({
			theme_id: (theme as { id: string }).id,
			name: `Objectif ${crypto.randomUUID().slice(0, 8)}`
		} as never)
		.select('id')
		.single();
	const { data, error } = await service
		.from('curriculum_points' as never)
		.insert({
			objective_id: (obj as { id: string }).id,
			name: `Point ${crypto.randomUUID().slice(0, 8)}`,
			kind: 'savoir_faire'
		} as never)
		.select('id')
		.single();
	if (error) throw new Error(error.message);
	return data as { id: string };
}

async function svcTemplate(grades: string[] = [TEST_GRADE]): Promise<{ id: string }> {
	const { data, error } = await service
		.from('question_templates')
		.insert({
			title: `Question ${crypto.randomUUID().slice(0, 8)}`,
			theme: 'Test',
			domain: 'test-tagging',
			level: 1,
			grades,
			type: 'fill_in_blanks',
			// `variations_minimum_one` : un template sans variation est refusé.
			variations: [{ statement: 'Combien font $1+1$ ?' }],
			status: 'draft'
		} as never)
		.select('id')
		.single();
	if (error) throw new Error(error.message);
	return data as { id: string };
}

function buildLocals(userOrNull: User | null): App.Locals {
	return {
		supabase: service as unknown as App.Locals['supabase'],
		safeGetSession: vi.fn().mockResolvedValue({ user: userOrNull }),
		user: userOrNull,
		profile: null,
		requestId: crypto.randomUUID()
	} as unknown as App.Locals;
}

function req(body: unknown): Request {
	return new Request('http://localhost/api/teacher/curriculum/template-tags', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

function urlWith(query: Record<string, string>): URL {
	const u = new URL('http://localhost/api/teacher/curriculum/template-tags');
	for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
	return u;
}

async function teacherUser(): Promise<User> {
	const t = await TestData.profile().withRole('teacher').create();
	return { id: t.id } as User;
}

// ============================================================================

describe('POST /template-tags — cas nominal', () => {
	it('rattache un point à une question et le relit', async () => {
		expect.assertions(3);
		const locals = buildLocals(await teacherUser());
		const tpl = await svcTemplate();
		const pt = await svcPoint();

		const res = await tagsPOST({
			request: req({ template_id: tpl.id, point_id: pt.id }),
			locals
		} as never);
		expect(res.status).toBe(201);

		const list = await tagsGET({ url: urlWith({ template_id: tpl.id }), locals } as never);
		const body = await list.json();
		expect(body.tags).toHaveLength(1);
		expect(body.tags[0].point_id).toBe(pt.id);
	});

	// Le régime `diversite` exige 2 templates distincts par point : le maillage
	// est nécessairement dense dans les deux sens.
	it('accepte plusieurs points sur une question, et plusieurs questions sur un point', async () => {
		expect.assertions(2);
		const locals = buildLocals(await teacherUser());
		const [t1, t2] = [await svcTemplate(), await svcTemplate()];
		const [p1, p2] = [await svcPoint(), await svcPoint()];

		for (const [t, p] of [
			[t1, p1],
			[t1, p2],
			[t2, p1]
		] as const) {
			await tagsPOST({ request: req({ template_id: t.id, point_id: p.id }), locals } as never);
		}

		const l1 = await (
			await tagsGET({ url: urlWith({ template_id: t1.id }), locals } as never)
		).json();
		expect(l1.tags).toHaveLength(2);

		const { data } = await service
			.from('question_template_points')
			.select('template_id')
			.eq('point_id', p1.id);
		expect(data ?? []).toHaveLength(2);
	});

	it('est idempotent : retaguer ne duplique pas et ne lève pas d’erreur', async () => {
		expect.assertions(3);
		const locals = buildLocals(await teacherUser());
		const tpl = await svcTemplate();
		const pt = await svcPoint();
		const body = { template_id: tpl.id, point_id: pt.id };

		expect((await tagsPOST({ request: req(body), locals } as never)).status).toBe(201);
		const second = await tagsPOST({ request: req(body), locals } as never);
		expect(second.status).toBe(200);
		expect((await second.json()).alreadyTagged).toBe(true);
	});
});

describe('DELETE /template-tags', () => {
	it('détache un point', async () => {
		expect.assertions(2);
		const locals = buildLocals(await teacherUser());
		const tpl = await svcTemplate();
		const pt = await svcPoint();
		await tagsPOST({ request: req({ template_id: tpl.id, point_id: pt.id }), locals } as never);

		const res = await tagsDELETE({
			url: urlWith({ template_id: tpl.id, point_id: pt.id }),
			locals
		} as never);
		expect(res.status).toBe(200);

		const list = await (
			await tagsGET({ url: urlWith({ template_id: tpl.id }), locals } as never)
		).json();
		expect(list.tags).toHaveLength(0);
	});

	it('détacher deux fois ne lève pas d’erreur', async () => {
		expect.assertions(1);
		const locals = buildLocals(await teacherUser());
		const tpl = await svcTemplate();
		const pt = await svcPoint();
		const u = urlWith({ template_id: tpl.id, point_id: pt.id });

		await tagsDELETE({ url: u, locals } as never);
		expect((await tagsDELETE({ url: u, locals } as never)).status).toBe(200);
	});
});

describe('template-tags — cas limites et erreurs', () => {
	// Décision : on n'interdit PAS de taguer hors du niveau déclaré par la
	// question. Un exercice de seconde peut légitimement valider un point de 1ʳᵉ.
	it('autorise un point d’un niveau que la question ne déclare pas', async () => {
		expect.assertions(1);
		const locals = buildLocals(await teacherUser());
		const tpl = await svcTemplate(['2']); // question de seconde
		const pt = await svcPoint(); // point de grade '5'

		const res = await tagsPOST({
			request: req({ template_id: tpl.id, point_id: pt.id }),
			locals
		} as never);
		expect(res.status).toBe(201);
	});

	it('renvoie 400 pour un template ou un point inconnu', async () => {
		expect.assertions(2);
		const locals = buildLocals(await teacherUser());
		const tpl = await svcTemplate();
		const pt = await svcPoint();
		const ghost = crypto.randomUUID();

		expect(
			(await tagsPOST({ request: req({ template_id: ghost, point_id: pt.id }), locals } as never))
				.status
		).toBe(400);
		expect(
			(await tagsPOST({ request: req({ template_id: tpl.id, point_id: ghost }), locals } as never))
				.status
		).toBe(400);
	});

	it('renvoie 400 pour un UUID malformé', async () => {
		expect.assertions(1);
		const locals = buildLocals(await teacherUser());
		const res = await tagsPOST({
			request: req({ template_id: 'pas-un-uuid', point_id: 'x' }),
			locals
		} as never);
		expect(res.status).toBe(400);
	});

	it('rejette 401 un visiteur non authentifié', async () => {
		expect.assertions(1);
		const tpl = await svcTemplate();
		const pt = await svcPoint();
		await expect(
			tagsPOST({
				request: req({ template_id: tpl.id, point_id: pt.id }),
				locals: buildLocals(null)
			} as never)
		).rejects.toMatchObject({ status: 401 });
	});

	it('rejette 403 un élève', async () => {
		expect.assertions(1);
		const student = await TestData.profile().withRole('student').create();
		const tpl = await svcTemplate();
		const pt = await svcPoint();
		await expect(
			tagsPOST({
				request: req({ template_id: tpl.id, point_id: pt.id }),
				locals: buildLocals({ id: student.id } as User)
			} as never)
		).rejects.toMatchObject({ status: 403 });
	});
});
