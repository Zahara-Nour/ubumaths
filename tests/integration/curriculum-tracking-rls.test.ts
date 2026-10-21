/**
 * Integration Tests: Curriculum tracking — schema & RLS des points (Phase 1)
 * ==========================================================================
 *
 * Valide la table `curriculum_points` (la seule du programme depuis la suppression des
 * thèmes et des objectifs, étape 4 de C5) :
 *   - RLS mono-professeur : prof/admin gèrent ; l'élève lit, n'écrit pas (is_teacher_or_admin()).
 *   - CHECK : grade valide, nom non vide, kind valide.
 *   - UNIQUE : le code d'un point est unique.
 *
 * Les tests sur les thèmes / objectifs (unicité, cascade) ont disparu avec les tables.
 *
 * Requires local Supabase (`pnpm db:start` + `pnpm db:reset`) then `pnpm test:integration`.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { present } from '../helpers/present';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

import {
	createServiceRoleClient,
	createAuthenticatedClient,
	TestData,
	cleanupCompetenceTestData
} from '../helpers/competence-referentiel.helpers';

// Grade dédié aux fixtures : les seeds du programme peuplent la 6ᵉ et la 1ʳᵉ spé, donc
// poser les tests sur '5' les isole du référentiel réel (et de sa purge).
const TEST_GRADE = '5';

// ---------------------------------------------------------------------------
// Shared service client + fixtures
// ---------------------------------------------------------------------------

let service: SupabaseClient<Database>;
const createdNodeIds: string[] = [];
let notionId = '';

beforeAll(() => {
	service = createServiceRoleClient();
});

afterAll(async () => {
	await cleanupCurriculum();
	await cleanupCompetenceTestData();
});

beforeEach(async () => {
	await cleanupCurriculum();
	await cleanupCompetenceTestData();
	await makeNotion();
});

/** Purge : points de test, puis nœuds (enfants d'abord : parent_id est en RESTRICT). */
async function cleanupCurriculum() {
	if (createdNodeIds.length === 0) return;
	await service.from('curriculum_points').delete().in('node_id', createdNodeIds);
	for (const kind of ['notion', 'branch']) {
		await service.from('classification_nodes').delete().in('id', createdNodeIds).eq('kind', kind);
	}
	createdNodeIds.length = 0;
}

/** Une notion neuve (branche > notion) qui porte les points du test. */
async function makeNotion() {
	const tag = crypto.randomUUID().slice(0, 8);
	const { data: branch, error: bErr } = await service
		.from('classification_nodes')
		.insert({ kind: 'branch', name: `TEST branche ${tag}`, parent_id: null, position: 900 })
		.select('id')
		.single();
	if (bErr) throw new Error(`branche : ${bErr.message}`);
	createdNodeIds.push(branch.id);
	const { data: notion, error: nErr } = await service
		.from('classification_nodes')
		.insert({ kind: 'notion', name: `TEST notion ${tag}`, parent_id: branch.id, position: 0 })
		.select('id')
		.single();
	if (nErr) throw new Error(`notion : ${nErr.message}`);
	createdNodeIds.push(notion.id);
	notionId = notion.id;
}

/** Les champs d'un point valide ; `code` unique, tout se surcharge. */
function pointFields(overrides: Record<string, unknown> = {}) {
	return {
		code: `TST-${crypto.randomUUID().slice(0, 8)}`,
		name: `Point ${crypto.randomUUID().slice(0, 8)}`,
		kind: 'savoir_faire',
		grade: TEST_GRADE,
		node_id: notionId,
		...overrides
	};
}

async function createPoint(overrides: Record<string, unknown> = {}): Promise<{ id: string }> {
	const { data, error } = await service
		.from('curriculum_points')
		.insert(pointFields(overrides) as never)
		.select('id')
		.single();
	if (error) throw new Error(`createPoint failed: ${error.message}`);
	return data;
}

async function clientOf(role: 'teacher' | 'student' | 'admin') {
	const profile = await TestData.profile().withRole(role).create();
	return (await createAuthenticatedClient(profile.email)) as unknown as SupabaseClient<Database>;
}

// ============================================================================
// 1. RLS — mono-teacher gating (is_teacher_or_admin())
// ============================================================================

describe('Curriculum RLS — mono-teacher gating', () => {
	it('lets a teacher insert and read a point', async () => {
		expect.assertions(3);
		const client = await clientOf('teacher');

		const { data: inserted, error: insErr } = await client
			.from('curriculum_points')
			.insert(pointFields({ name: 'Calcul' }) as never)
			.select('id, name')
			.single();
		expect(insErr).toBeNull();
		expect(present(inserted, 'point inséré').name).toBe('Calcul');

		const { data: rows } = await client
			.from('curriculum_points')
			.select('id')
			.eq('node_id', notionId);
		expect((rows ?? []).length).toBe(1);
	});

	it('forbids a student from inserting a point (RLS 42501)', async () => {
		expect.assertions(1);
		const client = await clientOf('student');

		const { error } = await client
			.from('curriculum_points')
			.insert(pointFields({ name: 'Hack' }) as never);
		expect(error?.code).toBe('42501');
	});

	// Lecture publique authentifiée (décision Q3, héritée de skill_themes) : sans elle,
	// « Mes objectifs » serait vide. L'écriture reste réservée au prof/admin.
	it('lets students SELECT curriculum points (lecture publique authentifiée)', async () => {
		expect.assertions(2);
		const point = await createPoint(); // service role
		const client = await clientOf('student');

		const { data } = await client.from('curriculum_points').select('id').eq('id', point.id);
		expect(data ?? []).toHaveLength(1);
		expect(data?.[0]?.id).toBe(point.id);
	});

	it('forbids a student from updating a point (zéro ligne, la RLS échoue en silence)', async () => {
		expect.assertions(2);
		const point = await createPoint({ name: 'Intact' });
		const client = await clientOf('student');

		const { data } = await client
			.from('curriculum_points')
			.update({ name: 'Piraté' })
			.eq('id', point.id)
			.select('id');
		expect(data ?? []).toHaveLength(0);

		const { data: after } = await service
			.from('curriculum_points')
			.select('name')
			.eq('id', point.id)
			.single();
		expect(after?.name).toBe('Intact');
	});

	it('lets an admin manage curriculum points (is_admin ⊂ is_teacher_or_admin)', async () => {
		expect.assertions(1);
		const client = await clientOf('admin');

		const { error } = await client
			.from('curriculum_points')
			.insert(pointFields({ name: 'Additionner deux fractions' }) as never);
		expect(error).toBeNull();
	});
});

// ============================================================================
// 2. CHECK constraints
// ============================================================================

describe('Curriculum CHECK constraints', () => {
	it('rejects an invalid grade code', async () => {
		expect.assertions(1);
		const { error } = await service
			.from('curriculum_points')
			.insert(pointFields({ grade: '6e' }) as never);
		// '6e' is not a canonical code ('6' is) → CHECK violation 23514
		expect(error?.code).toBe('23514');
	});

	it('rejects a blank point name', async () => {
		expect.assertions(1);
		const { error } = await service
			.from('curriculum_points')
			.insert(pointFields({ name: '   ' }) as never);
		expect(error?.code).toBe('23514');
	});

	it('rejects an invalid point kind', async () => {
		expect.assertions(1);
		const { error } = await service
			.from('curriculum_points')
			.insert(pointFields({ kind: 'competence' }) as never);
		expect(error?.code).toBe('23514');
	});

	it('accepts the valid point kinds', async () => {
		expect.assertions(4);
		for (const kind of ['connaissance', 'savoir_faire', 'demonstration', 'algorithme']) {
			const { error } = await service
				.from('curriculum_points')
				.insert(pointFields({ kind }) as never);
			expect(error).toBeNull();
		}
	});

	it('rejects a point without node (node_id obligatoire)', async () => {
		expect.assertions(1);
		const { error } = await service
			.from('curriculum_points')
			.insert(pointFields({ node_id: null }) as never);
		expect(error?.code).toBe('23502');
	});
});

// ============================================================================
// 3. UNIQUE constraints
// ============================================================================

describe('Curriculum UNIQUE constraints', () => {
	it('forbids two points with the same code', async () => {
		expect.assertions(1);
		await createPoint({ code: 'TST-DOUBLON' });
		const { error } = await service
			.from('curriculum_points')
			.insert(pointFields({ code: 'TST-DOUBLON' }) as never);
		expect(error?.code).toBe('23505');
	});

	it('allows two points with the same name under different codes', async () => {
		expect.assertions(1);
		await createPoint({ name: 'Additionner deux fractions' });
		const { error } = await service
			.from('curriculum_points')
			.insert(pointFields({ name: 'Additionner deux fractions' }) as never);
		expect(error).toBeNull();
	});
});
