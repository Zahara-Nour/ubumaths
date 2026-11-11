/**
 * Traces d'un contrôle réservées au serveur (ADR 0038, chantier `formes-de-serie`)
 * ===============================================================================
 *
 * Question d'accès tranchée par David (2026-11-11) : un élève n'écrit plus, par
 * PostgREST, de trace `place = 'evaluation'` — le prof la lirait « faite en
 * contrôle ». Seul le serveur (client service) écrit les traces d'un contrôle.
 * Qui perd quoi : l'élève, l'écriture de traces « contrôle » (aucune n'existait
 * en prod avant la migration : 33 traces, toutes sans lieu).
 *
 * Ce qui ne change pas : l'élève écrit ses traces sans lieu (contrôles actuels,
 * `recordSeriesReviews` avec son jeton) et celles des autres lieux.
 *
 * DOIT échouer sans la migration `…_traces_evaluation_reservees_au_serveur.sql`.
 *
 * `pnpm db:start` puis `pnpm test:integration tests/integration/traces-evaluation-serveur.test.ts`.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

import {
	createServiceRoleClient,
	createAuthenticatedClient,
	TestData,
	createFakeTemplate,
	cleanupCompetenceTestData
} from '../helpers/competence-referentiel.helpers';

// Variables
let service: SupabaseClient<Database>;

// Functions
async function studentWithTemplate(): Promise<{
	studentId: string;
	client: SupabaseClient<Database>;
	templateId: string;
}> {
	const student = await TestData.profile().withRole('student').create();
	const templateId = await createFakeTemplate(service, student.id);
	const client = await createAuthenticatedClient(student.email);
	return { studentId: student.id, client, templateId };
}

async function insertTrace(
	client: SupabaseClient<Database>,
	studentId: string,
	templateId: string,
	place: string | null
): Promise<{ id: string | null; code: string | null }> {
	// `place` : absente de `database.ts` sur `main` jusqu'au `db:types` de la PR 2 (#2547)
	const row = {
		student_id: studentId,
		template_id: templateId,
		success: true,
		source: 'auto',
		place
	};
	const { data, error } = await client
		.from('skill_attempts' as never)
		.insert(row as never)
		.select('id');
	const rows = data as { id: string }[] | null;
	return { id: rows?.[0]?.id ?? null, code: error?.code ?? null };
}

async function countTraces(studentId: string): Promise<number> {
	const { count, error } = await service
		.from('skill_attempts')
		.select('id', { count: 'exact', head: true })
		.eq('student_id', studentId);
	if (error) throw new Error(`countTraces: ${error.message}`);
	return count ?? 0;
}

beforeAll(() => {
	service = createServiceRoleClient();
});

afterAll(async () => {
	await cleanupCompetenceTestData();
});

beforeEach(async () => {
	await cleanupCompetenceTestData();
});

describe("traces d'un contrôle : réservées au serveur", () => {
	it("l'élève ne peut pas écrire une trace « contrôle » (RLS, rien d'écrit)", async () => {
		const { studentId, client, templateId } = await studentWithTemplate();

		const { id, code } = await insertTrace(client, studentId, templateId, 'evaluation');

		// 42501 : refus de la policy d'insertion
		expect(code).toBe('42501');
		expect(id).toBeNull();
		expect(await countTraces(studentId)).toBe(0);
	});

	it('le serveur écrit la trace « contrôle » de l’élève', async () => {
		const { studentId, templateId } = await studentWithTemplate();

		const { id, code } = await insertTrace(service, studentId, templateId, 'evaluation');

		expect(code).toBeNull();
		expect(id).not.toBeNull();
		expect(await countTraces(studentId)).toBe(1);
	});

	it("l'élève écrit toujours une trace sans lieu (contrôles d'aujourd'hui)", async () => {
		const { studentId, client, templateId } = await studentWithTemplate();

		const { id, code } = await insertTrace(client, studentId, templateId, null);

		expect(code).toBeNull();
		expect(id).not.toBeNull();
	});

	it.each(['flash_cards', 'typing', 'mock_test', 'number_race', 'review'])(
		"l'élève écrit toujours une trace « %s »",
		async (place) => {
			const { studentId, client, templateId } = await studentWithTemplate();

			const { id, code } = await insertTrace(client, studentId, templateId, place);

			expect(code).toBeNull();
			expect(id).not.toBeNull();
		}
	);
});
