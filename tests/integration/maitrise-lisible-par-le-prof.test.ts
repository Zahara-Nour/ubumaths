/**
 * Le prof lit l'auto-évaluation des élèves de ses classes (base locale requise)
 * ============================================================================
 *
 * La page « Progression » d'une assignation (2026-08-29) lit
 * `student_exercise_mastery` sous RLS. Or seule la règle « l'élève voit les
 * siennes » existait : le prof recevait ZÉRO ligne, sans erreur, et la page
 * passait pour « personne n'a rien fait ». Trouvé le 2026-10-10 grâce à la
 * base locale remplie (`pnpm db:seed-riche`).
 *
 * Accès décidé par David (option b) : le prof lit l'auto-évaluation des élèves
 * DE SES CLASSES (`is_teacher_of_student`, la règle des autres tables). Un
 * élève hors classe reste invisible ; un élève ne lit toujours que la sienne.
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
	if (error) throw new Error(`${table}: ${error.message}`);
	return (data as { id: string }).id;
}

describe('student_exercise_mastery : lecture par le prof', () => {
	let prof: SupabaseClient<Database>;
	let eleveA: SupabaseClient<Database>;
	let eleveAId: string;
	let eleveBId: string;
	let horsClasseId: string;

	beforeAll(async () => {
		await cleanupAllTestData();

		const profProfil = await TestData.profile().withRole('teacher').create();
		const a = await TestData.profile().withRole('student').create();
		const b = await TestData.profile().withRole('student').create();
		const hors = await TestData.profile().withRole('student').create();
		eleveAId = a.id;
		eleveBId = b.id;
		horsClasseId = hors.id;

		const classe = await insert('classes', {
			name: 'Seconde maîtrise',
			join_code: `M${Date.now().toString(36).toUpperCase()}`
		});
		for (const id of [eleveAId, eleveBId]) {
			await insert('class_members', { class_id: classe, student_id: id });
		}

		const exercice = await insert('exercises', {
			created_by: profProfil.id,
			category: 'application',
			title: 'Exercice maîtrise'
		});
		for (const [student_id, status] of [
			[eleveAId, 'mastered'],
			[eleveBId, 'needs_review'],
			[horsClasseId, 'mastered']
		] as const) {
			await insert('student_exercise_mastery', { student_id, exercise_id: exercice, status });
		}

		prof = await clientFor(profProfil.email);
		eleveA = await clientFor(a.email);
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('le prof lit l’auto-évaluation des élèves de ses classes', async () => {
		const { data, error } = await prof
			.from('student_exercise_mastery')
			.select('student_id, status')
			.in('student_id', [eleveAId, eleveBId]);
		expect(error).toBeNull();
		expect(data?.map((d) => d.student_id).sort()).toEqual([eleveAId, eleveBId].sort());
	});

	it('mais pas celle d’un élève hors classe', async () => {
		const { data, error } = await prof
			.from('student_exercise_mastery')
			.select('student_id')
			.eq('student_id', horsClasseId);
		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	it('un élève ne lit toujours que la sienne', async () => {
		const { data, error } = await eleveA.from('student_exercise_mastery').select('student_id');
		expect(error).toBeNull();
		expect(data?.map((d) => d.student_id)).toEqual([eleveAId]);
	});
});
