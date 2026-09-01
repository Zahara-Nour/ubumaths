/**
 * Cahier de texte — activités choisies AVANT enregistrement d'une séance.
 *
 * Sur une séance neuve il n'y a pas d'entrée à référencer : la page garde les
 * activités et l'action `create` les écrit après création, puis réconcilie la
 * couverture. Ces tests exercent l'action elle-même, pas l'API des activités —
 * c'est le seul chemin par lequel une séance neuve reçoit des activités.
 *
 * Requires local Supabase (`pnpm db:start` + `pnpm db:reset`).
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

import { actions } from '../../src/routes/(protected)/dashboard/teacher/cahier-texte/[classId]/[date]/+page.server';
import {
	createServiceRoleClient,
	TestData,
	cleanupCompetenceTestData
} from '../helpers/competence-referentiel.helpers';

const TEST_GRADE = '5';
const DATE = '2026-02-10';

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
	// Les templates avant les points : `question_template_points.point_id` est
	// ON DELETE RESTRICT (cf. curriculum-coverage.test.ts).
	await service
		.from('question_templates' as never)
		.delete()
		.contains('grades', [TEST_GRADE]);
	await service
		.from('curriculum_themes' as never)
		.delete()
		.eq('grade', TEST_GRADE);
}

/** Un point de programme neuf, avec son thème et son item. */
async function makePoint(): Promise<string> {
	const { data: theme } = await service
		.from('curriculum_themes' as never)
		.insert({ grade: TEST_GRADE, name: `T ${crypto.randomUUID().slice(0, 8)}` } as never)
		.select('id')
		.single();
	const { data: item } = await service
		.from('curriculum_objectives' as never)
		.insert({ theme_id: (theme as { id: string }).id, name: 'Item' } as never)
		.select('id')
		.single();
	const { data: point } = await service
		.from('curriculum_points' as never)
		.insert({
			objective_id: (item as { id: string }).id,
			name: `P ${crypto.randomUUID().slice(0, 8)}`,
			kind: 'savoir_faire'
		} as never)
		.select('id')
		.single();
	return (point as { id: string }).id;
}

/** Une question publiée, taguée sur les points donnés. */
async function makeTaggedTemplate(pointIds: string[]): Promise<string> {
	const { data, error } = await service
		.from('question_templates' as never)
		.insert({
			title: 'Question de test',
			status: 'published',
			type: 'fill_in_blanks',
			grades: [TEST_GRADE],
			theme: `Thème ${crypto.randomUUID().slice(0, 8)}`,
			domain: 'Domaine',
			subdomain: null,
			level: 1,
			variations: [{ blanks: [{ expectedAnswer: '2' }], statement: 'Calculer $1 + 1 = ?$' }]
		} as never)
		.select('id')
		.single();
	if (error) throw new Error(error.message);
	const id = (data as { id: string }).id;
	if (pointIds.length > 0) {
		await service
			.from('question_template_points' as never)
			.insert(pointIds.map((point_id) => ({ template_id: id, point_id })) as never);
	}
	return id;
}

function buildLocals(user: User): App.Locals {
	return {
		supabase: service as unknown as App.Locals['supabase'],
		safeGetSession: vi.fn().mockResolvedValue({ user }),
		user,
		requestId: crypto.randomUUID()
	} as unknown as App.Locals;
}

/** Appelle l'action `create` comme le ferait le formulaire de la page. */
async function createEntry(
	teacherId: string,
	classId: string,
	fields: Record<string, string>
): Promise<{ entryId?: string; warning?: string }> {
	const body = new URLSearchParams({
		lessonContent: 'Séance de test',
		isPublished: 'false',
		...fields
	});
	const request = new Request(`http://localhost/x`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body
	});
	const result = await actions.create({
		request,
		locals: buildLocals({ id: teacherId } as User),
		params: { classId, date: DATE }
	} as never);
	return result as { entryId?: string; warning?: string };
}

async function coverageOf(entryId: string): Promise<Map<string, string>> {
	const { data } = await service
		.from('journal_entry_points')
		.select('point_id, source')
		.eq('entry_id', entryId);
	return new Map((data ?? []).map((r) => [r.point_id, r.source]));
}

describe('Séance neuve — activités choisies avant enregistrement', () => {
	it('écrit les activités et la couverture qu’elles apportent', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();
		const klass = (await TestData.class().create()) as { id: string };
		const point = await makePoint();
		const template = await makeTaggedTemplate([point]);

		const { entryId } = await createEntry(teacher.id, klass.id, {
			pendingActivities: JSON.stringify([{ kind: 'question', id: template }])
		});
		expect(entryId).toBeTruthy();

		const { data: acts } = await service
			.from('journal_entry_activities')
			.select('kind, question_template_id')
			.eq('entry_id', entryId!);
		expect(acts).toEqual([{ kind: 'question', question_template_id: template }]);

		const cov = await coverageOf(entryId!);
		expect(cov.get(point)).toBe('auto');
	});

	it('cumule les points cochés à la main et ceux des activités', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();
		const klass = (await TestData.class().create()) as { id: string };
		const [manuel, auto] = [await makePoint(), await makePoint()];
		const template = await makeTaggedTemplate([auto]);

		const { entryId } = await createEntry(teacher.id, klass.id, {
			coveredPointIds: manuel,
			pendingActivities: JSON.stringify([{ kind: 'question', id: template }])
		});

		const cov = await coverageOf(entryId!);
		expect(cov.get(manuel)).toBe('manual');
		expect(cov.get(auto)).toBe('auto');
	});

	it('crée la séance même sans activité', async () => {
		const teacher = await TestData.profile().withRole('teacher').create();
		const klass = (await TestData.class().create()) as { id: string };

		const { entryId } = await createEntry(teacher.id, klass.id, {});
		expect(entryId).toBeTruthy();
		expect((await coverageOf(entryId!)).size).toBe(0);
	});
});
