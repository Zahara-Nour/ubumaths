/**
 * Trace : « répondu en QCM » (chantier `idees-format`, idée 4, PR 1)
 * ==================================================================
 *
 * Colonne additive `skill_attempts.answered_as_choice`, fausse par défaut.
 *
 * - Accès (Q5, tranchée par David) : aucune policy touchée ; l'élève lit ses
 *   traces, le prof celles de ses élèves, un autre élève ne lit rien.
 * - Cohérence en base : vrai seulement pour une réponse corrigée (`auto`) en
 *   Saisie, Contrôle blanc, Course aux nombres ou contrôle (un élève insère ses
 *   traces directement par PostgREST, le Zod de l'API ne le protège pas).
 *
 * DOIVENT échouer sans la migration `…_trace_repondu_en_qcm.sql`.
 *
 * `pnpm db:start` puis `pnpm test:integration tests/integration/trace-repondu-en-qcm.test.ts`.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.ts';

import {
	createServiceRoleClient,
	createAuthenticatedClient,
	TestData,
	createFakeTemplate,
	cleanupCompetenceTestData
} from '../helpers/competence-referentiel.helpers';

// Types
/** Colonne neuve : absente de `database.ts` jusqu'au `db:types` d'après merge. */
type TraceColumns = {
	place?: string | null;
	source?: string;
	answered_as_choice?: boolean;
};

type TraceRow = { id: string; place: string | null; answered_as_choice: boolean };

// Constantes
const READ_COLUMNS = 'id, place, answered_as_choice';
const CHOICE_TRACE: TraceColumns = { place: 'typing', answered_as_choice: true };

// Variables
let service: SupabaseClient<Database>;

// Functions
/** Insère une trace de l'élève avec le client donné (RLS appliquée). */
async function insertTrace(
	client: SupabaseClient<Database>,
	studentId: string,
	templateId: string,
	columns: TraceColumns
): Promise<{ id: string | null; code: string | null }> {
	const row = {
		student_id: studentId,
		template_id: templateId,
		success: true,
		source: 'auto',
		...columns
	};
	const { data, error } = await client
		.from('skill_attempts' as never)
		.insert(row as never)
		.select('id');
	const rows = data as { id: string }[] | null;
	return { id: rows?.[0]?.id ?? null, code: error?.code ?? null };
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

describe('trace « répondu en QCM » : accès', () => {
	it("l'élève écrit et relit sa trace en QCM", async () => {
		const { studentId, client, templateId } = await studentWithTemplate();
		const { id, code } = await insertTrace(client, studentId, templateId, CHOICE_TRACE);
		expect(code).toBeNull();

		const rows = await readTraces(client, id!);
		expect(rows).toEqual([{ id, place: 'typing', answered_as_choice: true }]);
	});

	it('le prof lit la forme de la réponse de son élève', async () => {
		const { studentId, client, templateId } = await studentWithTemplate();
		const teacher = await TestData.profile().withRole('teacher').create();
		const { id } = await insertTrace(client, studentId, templateId, CHOICE_TRACE);

		const teacherClient = await createAuthenticatedClient(teacher.email);
		const rows = await readTraces(teacherClient, id!);
		expect(rows).toHaveLength(1);
		expect(rows[0].answered_as_choice).toBe(true);
	});

	it('un autre élève ne lit pas la trace (zéro ligne)', async () => {
		const { studentId, client, templateId } = await studentWithTemplate();
		const other = await TestData.profile().withRole('student').create();
		const { id } = await insertTrace(client, studentId, templateId, CHOICE_TRACE);

		const otherClient = await createAuthenticatedClient(other.email);
		expect(await readTraces(otherClient, id!)).toHaveLength(0);
	});
});

describe('trace « répondu en QCM » : formes acceptées', () => {
	it('sans la colonne, la trace est « en saisie » (faux par défaut)', async () => {
		const { studentId, client, templateId } = await studentWithTemplate();
		const { id, code } = await insertTrace(client, studentId, templateId, { place: 'typing' });
		expect(code).toBeNull();
		expect((await readTraces(client, id!))[0].answered_as_choice).toBe(false);
	});

	it.each(['typing', 'mock_test', 'number_race'])('en QCM accepté au lieu %s', async (place) => {
		const { studentId, client, templateId } = await studentWithTemplate();
		const { code } = await insertTrace(client, studentId, templateId, {
			place,
			answered_as_choice: true
		});
		expect(code).toBeNull();
	});

	it('en QCM accepté en contrôle (écrit par le serveur)', async () => {
		const { studentId, templateId } = await studentWithTemplate();
		const { code } = await insertTrace(service, studentId, templateId, {
			place: 'evaluation',
			answered_as_choice: true
		});
		expect(code).toBeNull();
	});
});

describe('trace « répondu en QCM » : formes refusées (CHECK, 23514)', () => {
	const refused: Array<[string, TraceColumns]> = [
		['en Flash-cards', { place: 'flash_cards', answered_as_choice: true }],
		['en révision', { place: 'review', answered_as_choice: true }],
		['sans lieu', { place: null, answered_as_choice: true }],
		['auto-évaluée', { place: 'typing', source: 'student_self', answered_as_choice: true }]
	];

	it.each(refused)('en QCM refusé %s', async (_label, columns) => {
		const { studentId, client, templateId } = await studentWithTemplate();
		// Témoin : la même trace « en saisie » passe, le refus vient bien de la colonne
		const witness = await insertTrace(client, studentId, templateId, {
			...columns,
			answered_as_choice: false
		});
		expect(witness.code).toBeNull();

		const { code } = await insertTrace(client, studentId, templateId, columns);
		expect(code).toBe('23514');
	});

	it('en QCM refusé dans un combat de la Descente (écrit par le serveur)', async () => {
		const { studentId, templateId } = await studentWithTemplate();
		const witness = await insertTrace(service, studentId, templateId, { place: 'descente' });
		expect(witness.code).toBeNull();

		const { code } = await insertTrace(service, studentId, templateId, {
			place: 'descente',
			answered_as_choice: true
		});
		expect(code).toBe('23514');
	});
});
