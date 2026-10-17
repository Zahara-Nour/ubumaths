/**
 * La fiche distribuée s'ouvre : plus de colonne `exercises.tags` demandée
 * =======================================================================
 *
 * `GET /api/student/worksheets/[assignmentId]` (page de l'élève) et
 * `GET /api/worksheets/assignments/[assignmentId]/preview` (aperçu « vue
 * élève » du prof) lisaient `exercises.tags`, une colonne qui n'existe pas en
 * production (absente de la baseline du 2026-06-16). Postgres refuse toute la
 * requête : les deux routes répondaient 500, la fiche ne s'ouvrait pas.
 *
 * Les routes sont appelées avec les clients CONNECTÉS (élève, prof) : un mock
 * de la base ne voit pas une colonne qui manque.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import { GET as studentWorksheet } from '../../src/routes/api/student/worksheets/[assignmentId]/+server';
import { GET as teacherPreview } from '../../src/routes/api/worksheets/assignments/[assignmentId]/preview/+server';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/** Le client service : SEULEMENT pour semer les données. */
const service = createServiceRoleClient();

async function signedIn(email: string): Promise<SupabaseClient> {
	const client = createClient(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

function localsOf(userId: string, client: SupabaseClient): App.Locals {
	return {
		supabase: client as unknown as App.Locals['supabase'],
		safeGetSession: vi.fn().mockResolvedValue({ user: { id: userId } as User }),
		user: { id: userId } as User,
		requestId: crypto.randomUUID()
	} as unknown as App.Locals;
}

async function insert(table: string, row: Record<string, unknown>): Promise<string> {
	const { data, error } = await service
		.from(table as never)
		.insert(row as never)
		.select('id')
		.single();
	if (error) throw new Error(`${table} : ${error.message}`);
	return (data as { id: string }).id;
}

/** Le statut d'une route, qu'elle réponde ou qu'elle lève `error()`. */
async function statusOf(call: () => unknown): Promise<number> {
	try {
		return ((await call()) as Response).status;
	} catch (e) {
		const status = (e as { status?: number }).status;
		if (typeof status === 'number') return status;
		throw e;
	}
}

describe('une fiche distribuée s’ouvre', () => {
	let teacher: { id: string; client: SupabaseClient };
	let student: { id: string; client: SupabaseClient };
	let assignmentId: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		const t = await TestData.profile().withRole('teacher').create();
		const s = await TestData.profile().withRole('student').create();
		teacher = { id: t.id, client: await signedIn(t.email) };
		student = { id: s.id, client: await signedIn(s.email) };

		const classId = ((await TestData.class().create()) as { id: string }).id;
		const { error } = await service
			.from('class_members')
			.insert({ class_id: classId, student_id: student.id, status: 'active' });
		if (error) throw new Error(`membre : ${error.message}`);

		const exerciseId = ((await TestData.exercise(teacher.id).create()) as { id: string }).id;
		const worksheetId = await insert('worksheets', {
			title: 'Fiche distribuée',
			type: 'worksheet',
			status: 'published',
			created_by: teacher.id
		});
		await insert('worksheet_exercises', {
			worksheet_id: worksheetId,
			exercise_id: exerciseId,
			position: 1
		});
		assignmentId = await insert('worksheet_assignments', {
			worksheet_id: worksheetId,
			status: 'active',
			available_from: new Date(Date.now() - 86_400_000).toISOString(),
			created_by: teacher.id
		});
		const { error: jonctionError } = await service
			.from('worksheet_assignment_classes')
			.insert({ assignment_id: assignmentId, class_id: classId });
		if (jonctionError) throw new Error(`jonction : ${jonctionError.message}`);
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('l’élève destinataire reçoit sa fiche (200)', async () => {
		const status = await statusOf(() =>
			studentWorksheet({
				locals: localsOf(student.id, student.client),
				params: { assignmentId }
			} as never)
		);
		expect(status).toBe(200);
	});

	it('le prof voit l’aperçu « vue élève » (200)', async () => {
		const status = await statusOf(() =>
			teacherPreview({
				locals: localsOf(teacher.id, teacher.client),
				params: { assignmentId },
				url: new URL(`http://localhost/api/worksheets/assignments/${assignmentId}/preview`)
			} as never)
		);
		expect(status).toBe(200);
	});
});
