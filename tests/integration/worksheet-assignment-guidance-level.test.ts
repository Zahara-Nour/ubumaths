/**
 * Niveau de guidage d'une affectation de fiche (ADR 0023) — base locale requise
 * =============================================================================
 *
 * `worksheet_assignments.guidance_level` : guidé / intermédiaire / autonome,
 * guidé par défaut, toute autre valeur refusée par la base.
 *
 * Accès (question tranchée par David, ADR 0023 Q4 = a) : la colonne suit la
 * ligne. L'élève visé lit le niveau de SA propre affectation ; il ne lit pas
 * l'affectation d'un autre groupe, donc ni son niveau ni sa composition.
 *
 * Décor des groupes de niveau tel que le prof le monte : la même fiche affectée
 * deux fois, chaque affectation visant ses élèves nommément.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/** Service client : décor seulement, jamais pour une assertion d'accès. */
const service = createServiceRoleClient();

async function clientFor(email: string): Promise<SupabaseClient<Database>> {
	const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
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

/** Lecture non typée : la colonne n'existe pas encore dans `database.ts` (PR 1) */
async function levelAs(client: SupabaseClient<Database>, assignmentId: string) {
	const { data, error } = await client
		.from('worksheet_assignments')
		.select('id, guidance_level' as never)
		.eq('id', assignmentId);
	return { rows: (data ?? []) as unknown as { id: string; guidance_level: string }[], error };
}

describe('niveau de guidage d’une affectation', () => {
	let teacher: SupabaseClient<Database>;
	let guidedStudent: SupabaseClient<Database>;
	let autonomousStudent: SupabaseClient<Database>;
	let guidedAssignment: string;
	let autonomousAssignment: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		const teacherProfile = await TestData.profile().withRole('teacher').create();
		teacher = await clientFor(teacherProfile.email);
		const klass = await TestData.class().withName('1re guidage ZZ').create();

		const mkStudent = async () => {
			const profile = await TestData.profile().withRole('student').create();
			const { error } = await service
				.from('class_members')
				.insert({ class_id: klass.id, student_id: profile.id, status: 'active' });
			expect(error).toBeNull();
			return { id: profile.id, client: await clientFor(profile.email) };
		};
		const guided = await mkStudent();
		const autonomous = await mkStudent();
		guidedStudent = guided.client;
		autonomousStudent = autonomous.client;

		const exercise = (await TestData.exercise(teacherProfile.id).create()) as { id: string };
		const worksheetId = await insert('worksheets', {
			title: 'Fiche à niveaux ZZ',
			type: 'worksheet',
			status: 'published',
			created_by: teacherProfile.id
		});
		await insert('worksheet_exercises', {
			worksheet_id: worksheetId,
			exercise_id: exercise.id,
			position: 1
		});

		// Deux affectations de la même fiche, chacune visant ses élèves nommément
		const assign = async (studentId: string) => {
			const id = await insert('worksheet_assignments', {
				worksheet_id: worksheetId,
				status: 'active',
				available_from: new Date(Date.now() - 86_400_000).toISOString(),
				created_by: teacherProfile.id
			});
			const { error } = await service
				.from('worksheet_assignment_students')
				.insert({ assignment_id: id, student_id: studentId });
			expect(error).toBeNull();
			return id;
		};
		guidedAssignment = await assign(guided.id);
		autonomousAssignment = await assign(autonomous.id);
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('une affectation sans niveau vaut « guidé »', async () => {
		const { rows, error } = await levelAs(teacher, guidedAssignment);
		expect(error).toBeNull();
		expect(rows).toEqual([{ id: guidedAssignment, guidance_level: 'guided' }]);
	});

	it('le prof règle le niveau de son affectation (ligne rendue, pas un refus silencieux)', async () => {
		const { data, error } = await teacher
			.from('worksheet_assignments')
			.update({ guidance_level: 'autonomous' } as never)
			.eq('id', autonomousAssignment)
			.select('id, guidance_level' as never);
		expect(error).toBeNull();
		expect(data).toEqual([{ id: autonomousAssignment, guidance_level: 'autonomous' }]);
	});

	it('la base refuse un niveau inconnu', async () => {
		const { error } = await teacher
			.from('worksheet_assignments')
			.update({ guidance_level: 'expert' } as never)
			.eq('id', guidedAssignment)
			.select('id');
		expect(error?.code).toBe('23514');
	});

	it('l’élève lit le niveau de SA propre affectation', async () => {
		const { rows, error } = await levelAs(guidedStudent, guidedAssignment);
		expect(error).toBeNull();
		expect(rows).toEqual([{ id: guidedAssignment, guidance_level: 'guided' }]);
	});

	it('témoin : l’autre élève lit SA propre affectation, au niveau réglé par le prof', async () => {
		const { rows, error } = await levelAs(autonomousStudent, autonomousAssignment);
		expect(error).toBeNull();
		expect(rows).toEqual([{ id: autonomousAssignment, guidance_level: 'autonomous' }]);
	});

	// `error` vérifié : sans la colonne, la lecture rendrait aussi `[]` (42703)
	it('l’élève ne lit pas l’affectation de l’autre groupe, ni donc son niveau', async () => {
		for (const [client, other] of [
			[guidedStudent, autonomousAssignment],
			[autonomousStudent, guidedAssignment]
		] as const) {
			const { rows, error } = await levelAs(client, other);
			expect(error).toBeNull();
			expect(rows).toEqual([]);
		}
	});

	it('l’élève ne peut pas changer le niveau de sa propre affectation', async () => {
		const { data, error } = await guidedStudent
			.from('worksheet_assignments')
			.update({ guidance_level: 'autonomous' } as never)
			.eq('id', guidedAssignment)
			.select('id');
		// Refus RLS silencieux : zéro ligne, sans erreur
		expect(error).toBeNull();
		expect(data).toEqual([]);
		const { rows } = await levelAs(teacher, guidedAssignment);
		expect(rows).toEqual([{ id: guidedAssignment, guidance_level: 'guided' }]);
	});
});
