/**
 * L'élève archivé garde SES signalements d'erreur (nécessite une base locale)
 * ===========================================================================
 *
 * Depuis la migration 20260912090000, un élève archivé perd l'accès aux fiches
 * de la classe qu'il a quittée. C'est voulu — mais `GET /api/student/reports`
 * joint `worksheet_exercises!inner`, `worksheets!inner` et
 * `worksheet_assignments!inner` pour afficher le contexte de chaque
 * signalement.
 *
 * Un `!inner` exige que la ligne jointe soit VISIBLE. Les trois tables étant
 * désormais fermées à cet élève, sa liste se vide — silencieusement, sans
 * erreur.
 *
 * Or ce sont SES données : ce qu'il a signalé, et ce que le professeur lui a
 * répondu. La fiche appartient à la classe ; le signalement appartient à
 * l'élève. Perdre l'un ne doit pas emporter l'autre.
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
import type { Database } from '$lib/types/database';
import { GET as listReports } from '../../src/routes/api/student/reports/+server';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/** Service client: seeding only. */
const service = createServiceRoleClient();

async function clientFor(email: string): Promise<SupabaseClient<Database>> {
	const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
	return client;
}

function buildLocals(userId: string, client: SupabaseClient<Database>): App.Locals {
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
	if (error) throw new Error(`${table}: ${error.message}`);
	return (data as { id: string }).id;
}

interface ReportRow {
	id: string;
	worksheet_title: string | null;
	assignment_title: string | null;
	exercise_position: number | null;
	response: string | null;
	status: string;
}

describe('un élève archivé et ses propres signalements d’erreur', () => {
	let teacherId: string;
	let worksheetId: string;
	let classId: string;
	let activeStudentId: string;
	let activeStudent: SupabaseClient<Database>;
	let archivedStudentId: string;
	let archivedStudent: SupabaseClient<Database>;
	const WORKSHEET_TITLE = 'Fiche signalements ZZ';

	beforeAll(async () => {
		await cleanupAllTestData();

		const teacher = await TestData.profile().withRole('teacher').create();
		teacherId = teacher.id;

		const klass = await TestData.class().withName('1re A reports ZZ').create();
		classId = klass.id;

		const mk = async (status: string) => {
			const profile = await TestData.profile().withRole('student').create();
			const { error } = await service
				.from('class_members')
				.insert({ class_id: classId, student_id: profile.id, status });
			expect(error).toBeNull();
			return { id: profile.id, client: await clientFor(profile.email) };
		};
		const active = await mk('active');
		activeStudentId = active.id;
		activeStudent = active.client;
		const archived = await mk('archived');
		archivedStudentId = archived.id;
		archivedStudent = archived.client;

		const exercise = (await TestData.exercise(teacherId).create()) as { id: string };

		worksheetId = await insert('worksheets', {
			title: WORKSHEET_TITLE,
			type: 'worksheet',
			status: 'published',
			created_by: teacherId
		});
		const worksheetExerciseId = await insert('worksheet_exercises', {
			worksheet_id: worksheetId,
			exercise_id: exercise.id,
			position: 3
		});
		const assignmentId = await insert('worksheet_assignments', {
			worksheet_id: worksheetId,
			status: 'active',
			title: 'Devoir signalements',
			available_from: new Date(Date.now() - 86_400_000).toISOString(),
			created_by: teacherId
		});
		const { error: junctionError } = await service
			.from('worksheet_assignment_classes')
			.insert({ assignment_id: assignmentId, class_id: classId });
		expect(junctionError).toBeNull();

		// Les deux élèves ont signalé une erreur, du temps où ils étaient actifs,
		// et le professeur a répondu à chacun.
		for (const studentId of [activeStudentId, archivedStudentId]) {
			await insert('worksheet_error_reports', {
				assignment_id: assignmentId,
				worksheet_exercise_id: worksheetExerciseId,
				student_id: studentId,
				description: 'Le résultat annoncé est faux.',
				status: 'fixed',
				response: 'Corrigé, merci de l’avoir signalé.'
			});
		}
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	async function reportsOf(
		studentId: string,
		client: SupabaseClient<Database>
	): Promise<ReportRow[]> {
		const response = await listReports({
			locals: buildLocals(studentId, client),
			url: new URL('http://localhost/api/student/reports')
		} as never);
		expect(response.status).toBe(200);
		const body = (await response.json()) as { reports: ReportRow[] };
		return body.reports;
	}

	it('le témoin — l’élève actif voit son signalement et sa réponse', async () => {
		const reports = await reportsOf(activeStudentId, activeStudent);
		expect(reports).toHaveLength(1);
		expect(reports[0].response).toBe('Corrigé, merci de l’avoir signalé.');
		expect(reports[0].worksheet_title).toBe(WORKSHEET_TITLE);
	});

	it('l’élève archivé retrouve SON signalement', async () => {
		// La fiche appartient à la classe qu'il a quittée ; le signalement, lui,
		// est à lui. Le perdre effacerait la trace d'un échange avec le professeur.
		const reports = await reportsOf(archivedStudentId, archivedStudent);
		expect(reports).toHaveLength(1);
	});

	it('et il retrouve la réponse que le professeur lui a faite', async () => {
		const reports = await reportsOf(archivedStudentId, archivedStudent);
		expect(reports[0]?.response).toBe('Corrigé, merci de l’avoir signalé.');
		expect(reports[0]?.status).toBe('fixed');
	});

	it('avec de quoi savoir de quoi il s’agissait', async () => {
		// Un signalement sans contexte — « signalement du 12/09 sur ??? » — serait
		// illisible. Le titre de la fiche qu'il a lui-même signalée n'est pas un
		// secret pour lui : il l'a lue.
		const reports = await reportsOf(archivedStudentId, archivedStudent);
		expect(reports[0]?.worksheet_title).toBe(WORKSHEET_TITLE);
		expect(reports[0]?.exercise_position).toBe(3);
	});

	it('un élève ne voit jamais les signalements d’un autre', async () => {
		// Le garde-fou : élargir l'accès de l'élève à SES données ne doit pas
		// ouvrir celles des autres.
		const reports = await reportsOf(archivedStudentId, archivedStudent);
		expect(reports.length).toBeGreaterThan(0);

		const { data: allReports, error: allError } = await service
			.from('worksheet_error_reports')
			.select('id, student_id');
		expect(allError).toBeNull();

		// Le signalement de l'élève ACTIF existe bien en base — donc son absence
		// de la liste ci-dessous prouve le cloisonnement, elle ne le suppose pas.
		expect((allReports ?? []).some((r) => r.student_id === activeStudentId)).toBe(true);

		const byId = new Map((allReports ?? []).map((r) => [r.id, r.student_id]));
		for (const report of reports) {
			expect(byId.get(report.id)).toBe(archivedStudentId);
		}
	});
});
