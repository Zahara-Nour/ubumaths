/**
 * Un élève ne quitte pas seul sa classe (base locale requise)
 * ===========================================================
 *
 * La policy `students_can_leave` (DELETE sur `class_members`, `student_id =
 * auth.uid()`) datait d'avant le mono-professeur. Aucun écran ne l'utilisait,
 * mais un élève connecté pouvait, par l'API, effacer sa propre ligne de classe :
 * il sortait de la classe à l'insu du professeur, et sa trace disparaissait
 * (depuis le 2026-09-13, retirer un élève l'ARCHIVE : la ligne doit rester).
 * Retirée par 20261111081528_retrait_students_can_leave (#1788, point 4).
 *
 * ⚠️ La RLS refuse en silence : le DELETE de l'élève rend zéro ligne, sans
 * erreur. On vérifie donc la ligne en base, pas l'erreur.
 *
 * Contre-épreuve : le professeur garde son geste (`teachers_remove_members`).
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

/** Client service-role : pose le décor et relit la base. */
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

async function membershipExists(classId: string, studentId: string): Promise<boolean> {
	const { data, error } = await service
		.from('class_members')
		.select('id')
		.eq('class_id', classId)
		.eq('student_id', studentId);
	if (error) throw new Error(error.message);
	return (data ?? []).length === 1;
}

describe('class_members — un élève ne quitte pas seul sa classe', () => {
	let classId: string;
	let studentId: string;
	let student: SupabaseClient<Database>;
	let otherStudentId: string;
	let teacher: SupabaseClient<Database>;

	beforeAll(async () => {
		await cleanupAllTestData();

		const teacherProfile = await TestData.profile().withRole('teacher').create();
		teacher = await clientFor(teacherProfile.email);
		const klass = await TestData.class().withName('5e C départ YY').create();
		classId = klass.id;

		const member = async () => {
			const profile = await TestData.profile().withRole('student').create();
			const { error } = await service
				.from('class_members')
				.insert({ class_id: classId, student_id: profile.id, status: 'active' });
			expect(error, 'le décor n’a pas pu être posé').toBeNull();
			return profile;
		};

		const s = await member();
		studentId = s.id;
		student = await clientFor(s.email);
		otherStudentId = (await member()).id;
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('le DELETE de l’élève sur sa propre ligne n’efface rien', async () => {
		const { data, error } = await student
			.from('class_members')
			.delete()
			.eq('class_id', classId)
			.eq('student_id', studentId)
			.select('id');

		expect(error).toBeNull();
		expect(data ?? []).toHaveLength(0);
		expect(await membershipExists(classId, studentId)).toBe(true);
	});

	it('le professeur peut toujours retirer un élève', async () => {
		const { data, error } = await teacher
			.from('class_members')
			.delete()
			.eq('class_id', classId)
			.eq('student_id', otherStudentId)
			.select('id');

		expect(error).toBeNull();
		expect(data ?? []).toHaveLength(1);
		expect(await membershipExists(classId, otherStudentId)).toBe(false);
	});
});
