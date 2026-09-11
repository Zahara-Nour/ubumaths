/**
 * Accès élève à une fiche — les DEUX voies de distribution
 * ========================================================
 *
 * Migration : 20260908200000_worksheet_access_all_distribution_paths.sql
 *
 * `student_has_worksheet_access` garde les policies SELECT de `worksheets`,
 * `worksheet_exercises` et `worksheet_sections`. Elle ne connaissait que la
 * colonne historique `worksheet_assignments.class_id` — or la création
 * d'affectation n'y écrit que la PREMIÈRE classe (`classIds[0] || null`). Une
 * fiche distribuée à deux classes n'était donc lisible que par la première, et
 * une distribution purement individuelle par personne.
 *
 * La colonne a été supprimée le 2026-09-12 ; restent la jonction et la
 * désignation nominale. Ces tests les posent côte à côte, et surtout la
 * troisième situation : celle d'un élève à qui RIEN n'a été distribué, qui ne
 * doit rien voir. Élargir un accès sans vérifier qu'il reste fermé ailleurs ne
 * prouve rien.
 *
 * ⚠️ Aucune assertion ne se contente d'un `error === null` : chaque cas compare
 * des identifiants précis.
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

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

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

/** Le service role contourne la RLS : c'est lui qui pose les fixtures. */
const service = createServiceRoleClient();

/** `as never` : ces tables ne sont pas dans les types générés du helper. */
async function insert(table: string, row: Record<string, unknown>): Promise<void> {
	const { error } = await service.from(table as never).insert(row as never);
	if (error) throw new Error(`${table} : ${error.message}`);
}

describe('accès élève à une fiche selon la voie de distribution', () => {
	let worksheetId: string;
	let exerciseId: string;
	let assignmentId: string;

	/** Un élève par voie, plus un témoin sans aucune distribution. */
	let viaLegacy: SupabaseClient<Database>;
	let viaJunction: SupabaseClient<Database>;
	let viaIndividual: SupabaseClient<Database>;
	let outsider: SupabaseClient<Database>;

	beforeAll(async () => {
		await cleanupAllTestData();

		const teacher = await TestData.profile().withRole('teacher').create();
		const classA = (await TestData.class().create()) as { id: string };
		const classB = (await TestData.class().create()) as { id: string };

		const sLegacy = await TestData.profile().withRole('student').create();
		const sJunction = await TestData.profile().withRole('student').create();
		const sIndividual = await TestData.profile().withRole('student').create();
		const sOutsider = await TestData.profile().withRole('student').create();

		// A → classe historique, B → classe de la seule jonction.
		await insert('class_members', { class_id: classA.id, student_id: sLegacy.id });
		await insert('class_members', { class_id: classB.id, student_id: sJunction.id });
		// L'élève individuel n'est dans AUCUNE classe : c'est tout l'intérêt.

		const exercise = (await TestData.exercise(teacher.id).create()) as { id: string };
		exerciseId = exercise.id;

		const { data: ws, error: wsError } = await service
			.from('worksheets')
			.insert({
				title: 'Fiche distribuée de trois façons',
				type: 'worksheet',
				status: 'published',
				created_by: teacher.id
			})
			.select('id')
			.single();
		if (wsError) throw new Error(`fiche : ${wsError.message}`);
		worksheetId = ws.id;

		await insert('worksheet_exercises', {
			worksheet_id: worksheetId,
			exercise_id: exerciseId,
			position: 1
		});

		// Une SEULE affectation, exactement comme l'API en crée : la jonction porte
		// les deux classes, plus un élève nommé.
		const { data: assignment, error: aError } = await service
			.from('worksheet_assignments')
			.insert({
				worksheet_id: worksheetId,
				status: 'active',
				created_by: teacher.id
			})
			.select('id')
			.single();
		if (aError) throw new Error(`affectation : ${aError.message}`);
		assignmentId = assignment.id;

		await insert('worksheet_assignment_classes', {
			assignment_id: assignmentId,
			class_id: classA.id
		});
		await insert('worksheet_assignment_classes', {
			assignment_id: assignmentId,
			class_id: classB.id
		});
		await insert('worksheet_assignment_students', {
			assignment_id: assignmentId,
			student_id: sIndividual.id
		});

		viaLegacy = await clientFor(sLegacy.email);
		viaJunction = await clientFor(sJunction.email);
		viaIndividual = await clientFor(sIndividual.email);
		outsider = await clientFor(sOutsider.email);
	});

	afterAll(async () => {
		await service.from('worksheets').delete().eq('id', worksheetId);
		await cleanupAllTestData();
	});

	/** Ce que voit réellement un élève : la fiche ET son contenu. */
	async function canRead(client: SupabaseClient<Database>): Promise<boolean> {
		const sheet = await client.from('worksheets').select('id').eq('id', worksheetId);
		const content = await client
			.from('worksheet_exercises')
			.select('id')
			.eq('worksheet_id', worksheetId);

		expect(sheet.error).toBeNull();
		expect(content.error).toBeNull();
		return (sheet.data ?? []).length === 1 && (content.data ?? []).length === 1;
	}

	it('par la classe — la 1re classe visée', async () => {
		expect(await canRead(viaLegacy)).toBe(true);
	});

	it('par la classe — la 2ᵉ classe visée, celle que la colonne oubliait', async () => {
		// C'est le cas qui échouait : `classIds[0]` seul entre dans `class_id`.
		expect(await canRead(viaJunction)).toBe(true);
	});

	it('par le nom — élève désigné, membre d’aucune classe', async () => {
		expect(await canRead(viaIndividual)).toBe(true);
	});

	it('un élève SANS distribution ne voit toujours rien', async () => {
		// L'élargissement ne vaut que s'il reste fermé ici.
		expect(await canRead(outsider)).toBe(false);
	});

	it('une affectation non active ne donne accès par AUCUN chemin', async () => {
		const { error } = await service
			.from('worksheet_assignments')
			.update({ status: 'cancelled' })
			.eq('id', assignmentId);
		expect(error).toBeNull();

		expect(await canRead(viaLegacy)).toBe(false);
		expect(await canRead(viaJunction)).toBe(false);
		expect(await canRead(viaIndividual)).toBe(false);

		await service.from('worksheet_assignments').update({ status: 'active' }).eq('id', assignmentId);
	});

	it('une affectation datée dans le futur reste fermée', async () => {
		const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
		const { error } = await service
			.from('worksheet_assignments')
			.update({ available_from: tomorrow })
			.eq('id', assignmentId);
		expect(error).toBeNull();

		expect(await canRead(viaJunction)).toBe(false);
		expect(await canRead(viaIndividual)).toBe(false);

		await service
			.from('worksheet_assignments')
			.update({ available_from: null })
			.eq('id', assignmentId);
		expect(await canRead(viaJunction)).toBe(true);
	});
});
