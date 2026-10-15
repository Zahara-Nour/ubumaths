/**
 * Une copie par élève (ADR 0030, lot 5) : les élèves imprimés
 * ==========================================================
 *
 * Les copies au nom des élèves partent de la liste de l'affectation
 * (`GET /api/worksheets/assignments/[assignmentId]/students`), résolue par le
 * serveur : membres ACTIFS des classes visées, plus les élèves visés
 * nommément, chacun une seule fois. L'élève archivé (parti de la classe) ne
 * reçoit plus rien : pas de copie à son nom. La liste est au prof seul : un
 * élève, même destinataire, est refusé.
 *
 * Clients CONNECTÉS (prof, élève) : la RLS joue, un mock ne la verrait pas.
 * Noms d'élèves : tous fictifs.
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
import { GET as assignmentStudents } from '../../src/routes/api/worksheets/assignments/[assignmentId]/students/+server';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/** Le client service : SEULEMENT pour semer les données. */
const service = createServiceRoleClient();

interface ListedStudent {
	id: string;
	first_name: string | null;
	last_name: string | null;
	class_name: string | null;
}

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

/** Un élève fictif, nommé */
async function student(
	firstname: string,
	lastname: string
): Promise<{ id: string; email: string }> {
	const profile = await TestData.profile().withRole('student').create();
	const { error } = await service
		.from('profiles')
		.update({ firstname, lastname })
		.eq('id', profile.id)
		.select('id')
		.single();
	if (error) throw new Error(`nom : ${error.message}`);
	return { id: profile.id, email: profile.email };
}

/** La réponse d'une route, qu'elle réponde ou qu'elle lève `error()`. */
async function call(fn: () => unknown): Promise<{ status: number; body: unknown }> {
	try {
		const response = (await fn()) as Response;
		return { status: response.status, body: await response.json() };
	} catch (e) {
		const status = (e as { status?: number }).status;
		if (typeof status === 'number') return { status, body: null };
		throw e;
	}
}

describe('copies par élève : les élèves de l’affectation', () => {
	let teacher: { id: string; client: SupabaseClient };
	let assignmentId: string;
	let inClass: { id: string; email: string };
	let both: { id: string; email: string };
	let archived: { id: string; email: string };
	let individual: { id: string; email: string };
	let outsider: { id: string; email: string };

	beforeAll(async () => {
		await cleanupAllTestData();
		const t = await TestData.profile().withRole('teacher').create();
		teacher = { id: t.id, client: await signedIn(t.email) };

		inClass = await student('Ondine', 'Abricot');
		both = await student('Basile', 'Dupré');
		archived = await student('Gaspard', 'Archive');
		individual = await student('Élise', 'Écureuil');
		outsider = await student('Félix', 'Fougère');

		const classId = ((await TestData.class().create()) as { id: string }).id;
		for (const member of [inClass, both, archived]) {
			await insert('class_members', { class_id: classId, student_id: member.id, status: 'active' });
		}
		// Il quitte la classe : archivé (le trigger pose `left_at`)
		const { data: left, error: leftError } = await service
			.from('class_members')
			.update({ status: 'archived' })
			.eq('class_id', classId)
			.eq('student_id', archived.id)
			.select('id');
		if (leftError || left?.length !== 1) throw new Error('archivage impossible');

		const worksheetId = await insert('worksheets', {
			title: 'Fiche à imprimer',
			type: 'assessment',
			status: 'published',
			created_by: teacher.id
		});
		assignmentId = await insert('worksheet_assignments', {
			worksheet_id: worksheetId,
			status: 'active',
			available_from: new Date(Date.now() - 86_400_000).toISOString(),
			created_by: teacher.id
		});
		await insert('worksheet_assignment_classes', {
			assignment_id: assignmentId,
			class_id: classId
		});
		// Visés nommément : un élève hors classe, et un membre de la classe (doublon)
		for (const named of [individual, both]) {
			await insert('worksheet_assignment_students', {
				assignment_id: assignmentId,
				student_id: named.id
			});
		}
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('le prof reçoit chaque élève visé une fois, sans l’élève archivé', async () => {
		const { status, body } = await call(() =>
			assignmentStudents({
				locals: localsOf(teacher.id, teacher.client),
				params: { assignmentId }
			} as never)
		);
		expect(status).toBe(200);
		const students = (body as { students: ListedStudent[] }).students;
		const ids = students.map((s) => s.id);
		expect(new Set(ids)).toEqual(new Set([inClass.id, both.id, individual.id]));
		expect(ids).toHaveLength(3);
		expect(ids).not.toContain(archived.id);
		expect(ids).not.toContain(outsider.id);
		// Le nom vient de la fiche de l'élève
		expect(students.find((s) => s.id === individual.id)).toMatchObject({
			first_name: 'Élise',
			last_name: 'Écureuil',
			class_name: null
		});
		// Visé par sa classe et nommément : la classe est connue
		expect(students.find((s) => s.id === both.id)?.class_name).not.toBeNull();
	});

	it('un élève de l’affectation est refusé (403) : la liste est au prof', async () => {
		const client = await signedIn(inClass.email);
		const { status } = await call(() =>
			assignmentStudents({
				locals: localsOf(inClass.id, client),
				params: { assignmentId }
			} as never)
		);
		expect(status).toBe(403);
	});
});
