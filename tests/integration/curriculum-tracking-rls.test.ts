/**
 * Integration Tests: Curriculum tracking — schema & RLS (Phase 1)
 * ===============================================================
 *
 * Validates migration 20260621100000_curriculum_tracking.sql:
 *   - RLS mono-teacher: teacher/admin can manage; students cannot (is_teacher_or_admin()).
 *   - CHECK constraints: valid grade, non-blank name, valid kind.
 *   - UNIQUE constraints: (grade, name) themes, (theme_id, name) items, (objective_id, name) points.
 *   - Cascade delete: theme → items → points.
 *
 * Requires local Supabase (`pnpm db:start` + `pnpm db:reset`) then `pnpm test:integration`.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
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
const TEST_GRADE_ALT = '4';

// ---------------------------------------------------------------------------
// Shared service client + fixtures
// ---------------------------------------------------------------------------

let service: SupabaseClient<Database>;

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
});

/** Purge curriculum rows. Cascade handles items/points/tags/coverage. */
async function cleanupCurriculum() {
	await service
		.from('curriculum_themes' as never)
		.delete()
		.in('grade', [TEST_GRADE, TEST_GRADE_ALT]);
}

interface ThemeRow {
	id: string;
	grade: string;
	name: string;
}
interface ItemRow {
	id: string;
	theme_id: string;
	name: string;
}
interface PointRow {
	id: string;
	objective_id: string;
	name: string;
}

async function createTheme(
	overrides: { grade?: string; name?: string; display_order?: number } = {}
): Promise<ThemeRow> {
	const { data, error } = await service
		.from('curriculum_themes' as never)
		.insert({
			grade: overrides.grade ?? '6',
			name: overrides.name ?? `Thème ${crypto.randomUUID().slice(0, 8)}`,
			display_order: overrides.display_order ?? 0
		} as never)
		.select('id, grade, name')
		.single();
	if (error) throw new Error(`createTheme failed: ${error.message}`);
	return data as ThemeRow;
}

async function createItem(themeId: string, name?: string): Promise<ItemRow> {
	const { data, error } = await service
		.from('curriculum_objectives' as never)
		.insert({ theme_id: themeId, name: name ?? `Item ${crypto.randomUUID().slice(0, 8)}` } as never)
		.select('id, theme_id, name')
		.single();
	if (error) throw new Error(`createItem failed: ${error.message}`);
	return data as ItemRow;
}

async function createPoint(
	objectiveId: string,
	overrides: { name?: string; kind?: string | null } = {}
): Promise<PointRow> {
	const { data, error } = await service
		.from('curriculum_points' as never)
		.insert({
			objective_id: objectiveId,
			name: overrides.name ?? `Point ${crypto.randomUUID().slice(0, 8)}`,
			kind: overrides.kind ?? 'savoir_faire'
		} as never)
		.select('id, objective_id, name')
		.single();
	if (error) throw new Error(`createPoint failed: ${error.message}`);
	return data as PointRow;
}

// ============================================================================
// 1. RLS — mono-teacher gating (is_teacher_or_admin())
// ============================================================================

describe('Curriculum RLS — mono-teacher gating', () => {
	it('lets a teacher insert and read a theme', async () => {
		expect.assertions(3);
		const teacher = await TestData.profile().withRole('teacher').create();
		const client = (await createAuthenticatedClient(
			teacher.email
		)) as unknown as SupabaseClient<Database>;

		const { data: inserted, error: insErr } = await client
			.from('curriculum_themes' as never)
			.insert({ grade: TEST_GRADE, name: 'Calcul', display_order: 0 } as never)
			.select('id, name')
			.single();
		expect(insErr).toBeNull();
		expect((inserted as { name: string }).name).toBe('Calcul');

		const { data: rows } = await client
			.from('curriculum_themes' as never)
			.select('id')
			.eq('grade', '6');
		expect((rows ?? []).length).toBeGreaterThanOrEqual(1);
	});

	it('forbids a student from inserting a theme (RLS 42501)', async () => {
		expect.assertions(1);
		const student = await TestData.profile().withRole('student').create();
		const client = (await createAuthenticatedClient(
			student.email
		)) as unknown as SupabaseClient<Database>;

		const { error } = await client
			.from('curriculum_themes' as never)
			.insert({ grade: TEST_GRADE, name: 'Hack', display_order: 0 } as never);
		expect(error?.code).toBe('42501');
	});

	// Contrat changé par la fusion des référentiels (2026-08-29) : l'arbre porte
	// désormais l'acquisition élève en plus du suivi de programme, donc lecture
	// publique authentifiée (décision Q3, héritée de skill_themes). Sans elle,
	// « Mes objectifs » serait vide. L'écriture reste réservée au prof/admin —
	// vérifié par les tests d'INSERT/UPDATE/DELETE ci-dessous.
	it('lets students SELECT curriculum themes (lecture publique authentifiée)', async () => {
		expect.assertions(1);
		await createTheme({ name: `Géométrie ${crypto.randomUUID().slice(0, 8)}` }); // service role
		const student = await TestData.profile().withRole('student').create();
		const client = (await createAuthenticatedClient(
			student.email
		)) as unknown as SupabaseClient<Database>;

		const { data } = await client.from('curriculum_themes' as never).select('id');
		expect((data ?? []).length).toBeGreaterThan(0);
	});

	it('lets an admin manage curriculum points (is_admin ⊂ is_teacher_or_admin)', async () => {
		expect.assertions(1);
		const theme = await createTheme();
		const item = await createItem(theme.id);
		const admin = await TestData.profile().withRole('admin').create();
		const client = (await createAuthenticatedClient(
			admin.email
		)) as unknown as SupabaseClient<Database>;

		const { error } = await client.from('curriculum_points' as never).insert({
			objective_id: item.id,
			name: 'Additionner deux fractions',
			kind: 'savoir_faire'
		} as never);
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
			.from('curriculum_themes' as never)
			.insert({ grade: '6e', name: 'Bad grade', display_order: 0 } as never);
		// '6e' is not a canonical code ('6' is) → CHECK violation 23514
		expect(error?.code).toBe('23514');
	});

	it('rejects a blank theme name', async () => {
		expect.assertions(1);
		const { error } = await service
			.from('curriculum_themes' as never)
			.insert({ grade: TEST_GRADE, name: '   ', display_order: 0 } as never);
		expect(error?.code).toBe('23514');
	});

	it('rejects an invalid point kind', async () => {
		expect.assertions(1);
		const theme = await createTheme();
		const item = await createItem(theme.id);
		const { error } = await service
			.from('curriculum_points' as never)
			.insert({ objective_id: item.id, name: 'X', kind: 'competence' } as never);
		expect(error?.code).toBe('23514');
	});

	it('accepts the two valid point kinds', async () => {
		expect.assertions(2);
		const theme = await createTheme();
		const item = await createItem(theme.id);
		const a = await service
			.from('curriculum_points' as never)
			.insert({ objective_id: item.id, name: 'Connaissance X', kind: 'connaissance' } as never);
		const b = await service
			.from('curriculum_points' as never)
			.insert({ objective_id: item.id, name: 'Savoir-faire Y', kind: 'savoir_faire' } as never);
		expect(a.error).toBeNull();
		expect(b.error).toBeNull();
	});
});

// ============================================================================
// 3. UNIQUE constraints
// ============================================================================

describe('Curriculum UNIQUE constraints', () => {
	it('forbids two themes with the same (grade, name)', async () => {
		expect.assertions(1);
		await createTheme({ grade: TEST_GRADE, name: 'Calcul' });
		const { error } = await service
			.from('curriculum_themes' as never)
			.insert({ grade: TEST_GRADE, name: 'Calcul', display_order: 1 } as never);
		expect(error?.code).toBe('23505');
	});

	it('allows the same theme name in two different grades', async () => {
		expect.assertions(1);
		await createTheme({ grade: TEST_GRADE, name: 'Calcul' });
		const { error } = await service
			.from('curriculum_themes' as never)
			.insert({ grade: TEST_GRADE_ALT, name: 'Calcul', display_order: 0 } as never);
		expect(error).toBeNull();
	});

	it('forbids two points with the same (objective_id, name)', async () => {
		expect.assertions(1);
		const theme = await createTheme();
		const item = await createItem(theme.id);
		await createPoint(item.id, { name: 'Additionner deux fractions' });
		const { error } = await service.from('curriculum_points' as never).insert({
			objective_id: item.id,
			name: 'Additionner deux fractions',
			kind: 'savoir_faire'
		} as never);
		expect(error?.code).toBe('23505');
	});
});

// ============================================================================
// 4. Cascade delete
// ============================================================================

describe('Curriculum cascade delete', () => {
	it('deletes items and points when their theme is deleted', async () => {
		expect.assertions(2);
		const theme = await createTheme();
		const item = await createItem(theme.id);
		const point = await createPoint(item.id);

		const { error: delErr } = await service
			.from('curriculum_themes' as never)
			.delete()
			.eq('id', theme.id);
		expect(delErr).toBeNull();

		const { data: pointRows } = await service
			.from('curriculum_points' as never)
			.select('id')
			.eq('id', point.id);
		expect(pointRows ?? []).toHaveLength(0);
	});
});
