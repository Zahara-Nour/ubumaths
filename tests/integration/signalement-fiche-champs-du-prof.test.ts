/**
 * Signalement d'erreur sur une fiche : les champs du prof restent au prof
 * ======================================================================
 *
 * Constat I4 (audit RGPD) : la RLS laissait l'élève écrire `reviewed_by` (l'identifiant
 * d'un autre élève, qui bloquait sa suppression) et, à la création, fixer lui-même
 * `status`, `reviewed_at` et `response` — un signalement « traité par le prof » forgé.
 * Décision de David (2026-10-13) : seuls le prof et l'admin remplissent ces champs.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import type { Database } from '$lib/types/database';

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const service = createServiceRoleClient();

// ============================================================================
// HELPERS
// ============================================================================

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

// ============================================================================
// TESTS
// ============================================================================

describe('signalement d’erreur sur une fiche : champs du prof', () => {
	let prof: { id: string; email: string };
	let eleve: { id: string; email: string };
	let autre: { id: string; email: string };
	let assignmentId: string;
	let worksheetExerciseId: string;
	let reportId: string;
	/** Affectation d'une autre fiche, à laquelle l'élève n'a pas accès. */
	let autreAffectationId: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		prof = await TestData.profile().withRole('teacher').create();
		eleve = await TestData.profile().withRole('student').create();
		autre = await TestData.profile().withRole('student').create();

		const exercise = (await TestData.exercise(prof.id).create()) as { id: string };
		const worksheetId = await insert('worksheets', {
			title: 'Fiche signalement ZZ',
			type: 'worksheet',
			status: 'published',
			created_by: prof.id
		});
		worksheetExerciseId = await insert('worksheet_exercises', {
			worksheet_id: worksheetId,
			exercise_id: exercise.id,
			position: 1
		});
		assignmentId = await insert('worksheet_assignments', {
			worksheet_id: worksheetId,
			status: 'active',
			available_from: new Date(Date.now() - 86_400_000).toISOString(),
			created_by: prof.id
		});
		const { error } = await service
			.from('worksheet_assignment_students')
			.insert({ assignment_id: assignmentId, student_id: eleve.id });
		expect(error).toBeNull();

		autreAffectationId = await insert('worksheet_assignments', {
			worksheet_id: worksheetId,
			status: 'active',
			available_from: new Date(Date.now() - 86_400_000).toISOString(),
			created_by: prof.id
		});
	});

	afterAll(async () => {
		await cleanupAllTestData();
	});

	const base = () => ({
		assignment_id: assignmentId,
		worksheet_exercise_id: worksheetExerciseId,
		student_id: eleve.id,
		description: 'zz-l’énoncé a une coquille'
	});

	it.each([
		['un statut « corrigé »', () => ({ status: 'fixed' })],
		['une réponse du prof', () => ({ response: 'zz-réponse forgée' })],
		['une date de relecture', () => ({ reviewed_at: new Date().toISOString() })],
		['un « relu par » (un autre élève)', () => ({ reviewed_by: autre.id })]
	])('l’élève ne crée pas un signalement avec %s', async (_cas, champs) => {
		const client = await clientFor(eleve.email);
		const { error } = await client
			.from('worksheet_error_reports')
			.insert({ ...base(), ...champs() } as never);
		expect(error?.code).toBe('42501');
	});

	it('l’élève crée son signalement en attente, puis en corrige la description', async () => {
		const client = await clientFor(eleve.email);
		const { data, error } = await client
			.from('worksheet_error_reports')
			.insert(base())
			.select('id, status');
		expect(error).toBeNull();
		expect(data).toEqual([{ id: expect.any(String), status: 'pending' }]);
		reportId = data![0].id;

		const maj = await client
			.from('worksheet_error_reports')
			.update({ description: 'zz-l’énoncé a deux coquilles' })
			.eq('id', reportId)
			.select('id');
		expect(maj.error).toBeNull();
		expect(maj.data).toHaveLength(1);
	});

	it.each([
		['« relu par »', () => ({ reviewed_by: autre.id })],
		['la réponse', () => ({ response: 'zz-réponse forgée' })],
		['la date de relecture', () => ({ reviewed_at: new Date().toISOString() })],
		// Audit de #1266 : la policy ne revérifie pas l'affectation en modification.
		['l’affectation visée', () => ({ assignment_id: autreAffectationId })]
	])('l’élève ne change pas %s de son signalement', async (_cas, champs) => {
		const client = await clientFor(eleve.email);
		const { error } = await client
			.from('worksheet_error_reports')
			.update(champs() as never)
			.eq('id', reportId)
			.select('id');
		expect(error?.code).toBe('42501');
	});

	it('le prof traite le signalement : statut, relu par, réponse', async () => {
		const client = await clientFor(prof.email);
		const { data, error } = await client
			.from('worksheet_error_reports')
			.update({
				status: 'fixed',
				reviewed_by: prof.id,
				reviewed_at: new Date().toISOString(),
				response: 'Corrigé, merci !'
			})
			.eq('id', reportId)
			.select('status, reviewed_by');
		expect(error).toBeNull();
		expect(data).toEqual([{ status: 'fixed', reviewed_by: prof.id }]);
	});
});
