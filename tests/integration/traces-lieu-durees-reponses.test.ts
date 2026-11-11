/**
 * Traces : lieu, durées, graine, réponse et verdict par case (ADR 0038)
 * =====================================================================
 *
 * Chantier `formes-de-serie`, PR 1 : colonnes additives sur `skill_attempts`.
 *
 * - Accès (ADR 0038, tranché par David) : l'élève lit ses traces, le prof lit
 *   individuellement réponses, temps et lieu de ses élèves ; un autre élève
 *   ne lit rien. Aucune policy touchée : celles de `skill_attempts` sont par
 *   ligne, les colonnes neuves les suivent.
 * - Bornes en base : un élève insère ses traces directement par PostgREST,
 *   le Zod de l'API ne le protège pas.
 * - Cohérence par lieu en base (N10, N11 du journal).
 *
 * DOIVENT échouer sans la migration `…_traces_lieu_durees_reponses.sql`.
 *
 * `pnpm db:start` puis `pnpm test:integration tests/integration/traces-lieu-durees-reponses.test.ts`.
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

// Types
/** Colonnes neuves : absentes de `database.ts` jusqu'au `db:types` de la PR 2. */
type TraceColumns = {
	place?: string | null;
	response_ms?: number | null;
	allotted_ms?: number | null;
	end_reason?: string | null;
	seed?: number | null;
	answer_parts?: string[] | null;
	part_verdicts?: boolean[] | null;
};

type TraceRow = TraceColumns & { id: string; student_id: string };

// Constantes
const READ_COLUMNS =
	'id, student_id, place, response_ms, allotted_ms, end_reason, seed, answer_parts, part_verdicts';

/** Trace complète d'un Contrôle blanc : chrono, réponse tapée, verdicts. */
const MOCK_TEST_TRACE: TraceColumns = {
	place: 'mock_test',
	response_ms: 12_345,
	allotted_ms: 30_000,
	end_reason: 'validated',
	seed: 424_242,
	answer_parts: ['\\frac{3}{4}', '12'],
	part_verdicts: [true, false]
};

// Variables
let service: SupabaseClient<Database>;

// Functions
/** Insère une trace « corrigé » de l'élève, avec le client donné (RLS appliquée). */
async function insertTrace(
	client: SupabaseClient<Database>,
	studentId: string,
	templateId: string,
	columns: TraceColumns
): Promise<{ id: string | null; error: string | null; code: string | null }> {
	const row = {
		student_id: studentId,
		template_id: templateId,
		success: false,
		source: 'auto',
		...columns
	};
	const { data, error } = await client
		.from('skill_attempts' as never)
		.insert(row as never)
		.select('id');
	const rows = data as { id: string }[] | null;
	return { id: rows?.[0]?.id ?? null, error: error?.message ?? null, code: error?.code ?? null };
}

async function readTraces(client: SupabaseClient<Database>, id: string): Promise<TraceRow[]> {
	const { data, error } = await client
		.from('skill_attempts' as never)
		.select(READ_COLUMNS)
		.eq('id', id);
	if (error) throw new Error(`readTraces: ${error.message}`);
	return (data ?? []) as TraceRow[];
}

/** Un élève connecté et un modèle publié. */
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

beforeAll(() => {
	service = createServiceRoleClient();
});

afterAll(async () => {
	await cleanupCompetenceTestData();
});

beforeEach(async () => {
	await cleanupCompetenceTestData();
});

describe('traces : accès aux colonnes neuves', () => {
	it("l'élève écrit et relit sa trace complète", async () => {
		const { studentId, client, templateId } = await studentWithTemplate();

		const { id, error } = await insertTrace(client, studentId, templateId, MOCK_TEST_TRACE);
		expect(error).toBeNull();

		const rows = await readTraces(client, id!);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject(MOCK_TEST_TRACE);
	});

	it('le prof lit réponses, temps et lieu de son élève', async () => {
		const { studentId, client, templateId } = await studentWithTemplate();
		const teacher = await TestData.profile().withRole('teacher').create();
		const { id } = await insertTrace(client, studentId, templateId, MOCK_TEST_TRACE);

		const teacherClient = await createAuthenticatedClient(teacher.email);
		const rows = await readTraces(teacherClient, id!);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject(MOCK_TEST_TRACE);
	});

	it('un autre élève ne lit pas la trace (zéro ligne)', async () => {
		const { studentId, client, templateId } = await studentWithTemplate();
		const other = await TestData.profile().withRole('student').create();
		const { id } = await insertTrace(client, studentId, templateId, MOCK_TEST_TRACE);

		const otherClient = await createAuthenticatedClient(other.email);
		expect(await readTraces(otherClient, id!)).toHaveLength(0);
	});

	it("un élève n'écrit pas de trace au nom d'un autre", async () => {
		const { client, templateId } = await studentWithTemplate();
		const other = await TestData.profile().withRole('student').create();

		const { code } = await insertTrace(client, other.id, templateId, MOCK_TEST_TRACE);
		// 42501 : refus RLS (pas une colonne inconnue)
		expect(code).toBe('42501');
	});
});

describe('traces : formes acceptées', () => {
	it('une ancienne trace, sans lieu ni colonne neuve, reste acceptée', async () => {
		const { studentId, client, templateId } = await studentWithTemplate();
		const { error } = await insertTrace(client, studentId, templateId, {});
		expect(error).toBeNull();
	});

	const accepted: Array<[string, TraceColumns]> = [
		['flash_cards', { place: 'flash_cards', seed: 1 }],
		['review', { place: 'review', seed: 0 }],
		['typing', { place: 'typing', seed: 7, answer_parts: ['5'], part_verdicts: [true] }],
		[
			'number_race',
			{
				place: 'number_race',
				response_ms: 0,
				allotted_ms: 10_000,
				end_reason: 'timeout',
				seed: 2 ** 31 - 1,
				answer_parts: [''],
				part_verdicts: [false]
			}
		],
		[
			'evaluation',
			{ place: 'evaluation', response_ms: 8_000, allotted_ms: 20_000, end_reason: 'validated' }
		]
	];

	it.each(accepted)('lieu %s : trace cohérente acceptée', async (_place, columns) => {
		const { studentId, client, templateId } = await studentWithTemplate();
		const { error } = await insertTrace(client, studentId, templateId, columns);
		expect(error).toBeNull();
	});

	it('bornes atteintes : 50 cases de 2 000 caractères, 24 h', async () => {
		const { studentId, client, templateId } = await studentWithTemplate();
		const { error } = await insertTrace(client, studentId, templateId, {
			...MOCK_TEST_TRACE,
			response_ms: 86_400_000,
			allotted_ms: 86_400_000,
			answer_parts: Array.from({ length: 50 }, () => 'x'.repeat(2_000)),
			part_verdicts: Array.from({ length: 50 }, () => true)
		});
		expect(error).toBeNull();
	});
});

describe('traces : refusées par la base', () => {
	const refused: Array<[string, TraceColumns]> = [
		// Bornes
		['lieu inconnu', { ...MOCK_TEST_TRACE, place: 'interactive' }],
		[
			'51 cases',
			{
				...MOCK_TEST_TRACE,
				answer_parts: Array.from({ length: 51 }, () => '1'),
				part_verdicts: Array.from({ length: 51 }, () => true)
			}
		],
		['case de 2 001 caractères', { ...MOCK_TEST_TRACE, answer_parts: ['x'.repeat(2_001), '1'] }],
		['réponse vide (aucune case)', { ...MOCK_TEST_TRACE, answer_parts: [], part_verdicts: [] }],
		[
			'case NULL dans la réponse',
			{
				...MOCK_TEST_TRACE,
				part_verdicts: [true, false],
				answer_parts: ['1', null as unknown as string]
			}
		],
		['verdict NULL', { ...MOCK_TEST_TRACE, part_verdicts: [true, null as unknown as boolean] }],
		['durée négative', { ...MOCK_TEST_TRACE, response_ms: -1 }],
		['durée au-delà de 24 h', { ...MOCK_TEST_TRACE, response_ms: 86_400_001 }],
		['durée allouée nulle', { ...MOCK_TEST_TRACE, allotted_ms: 0 }],
		['durée allouée au-delà de 24 h', { ...MOCK_TEST_TRACE, allotted_ms: 86_400_001 }],
		['graine négative', { ...MOCK_TEST_TRACE, seed: -1 }],
		['fin inconnue', { ...MOCK_TEST_TRACE, end_reason: 'abandoned' }],
		// Cohérence par lieu
		['colonne neuve sans lieu', { seed: 3 }],
		['durée en Flash-cards', { place: 'flash_cards', response_ms: 1_000 }],
		['durée en Saisie', { place: 'typing', response_ms: 1_000 }],
		['durée allouée en révision', { place: 'review', allotted_ms: 1_000 }],
		['fin en Saisie', { place: 'typing', end_reason: 'validated' }],
		[
			'réponse en Flash-cards',
			{ place: 'flash_cards', answer_parts: ['1'], part_verdicts: [true] }
		],
		['réponse en révision', { place: 'review', answer_parts: ['1'], part_verdicts: [true] }],
		[
			'réponse dans un contrôle',
			{ place: 'evaluation', answer_parts: ['1'], part_verdicts: [true] }
		],
		['réponse sans verdicts', { ...MOCK_TEST_TRACE, part_verdicts: null }],
		['verdicts sans réponse', { ...MOCK_TEST_TRACE, answer_parts: null }],
		['moins de verdicts que de cases', { ...MOCK_TEST_TRACE, part_verdicts: [true] }],
		['durée allouée sans fin', { ...MOCK_TEST_TRACE, end_reason: null }],
		['fin sans durée allouée', { ...MOCK_TEST_TRACE, allotted_ms: null }]
	];

	it.each(refused)('%s', async (_label, columns) => {
		const { studentId, client, templateId } = await studentWithTemplate();
		const { id, code } = await insertTrace(client, studentId, templateId, columns);
		// 23514 : violation d'une contrainte CHECK (pas une colonne inconnue ni la RLS)
		expect(code).toBe('23514');
		expect(id).toBeNull();
	});
});
