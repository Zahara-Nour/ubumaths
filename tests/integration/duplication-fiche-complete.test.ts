/**
 * Dupliquer une fiche recopie TOUT son contenu
 * ============================================
 *
 * Bug validé par David (2026-10-15) : la copie perdait les traductions (fiche,
 * sections, exercices), « indispensable », la variante choisie et la visibilité
 * de la correction. Ce test compare l'original et la copie COLONNE PAR COLONNE,
 * sur toutes les colonnes de la table (`select *`) : une colonne ajoutée plus
 * tard et oubliée par la route fait échouer le test, sauf si elle est ajoutée
 * à la liste des colonnes volontairement exclues ci-dessous.
 *
 * La route est appelée avec le client du prof CONNECTÉ (RLS comme en
 * production) ; la RLS échoue en silence, donc la copie est relue en
 * superutilisateur (`pg`).
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import { POST as duplicateWorksheet } from '../../src/routes/api/worksheets/[id]/duplicate/+server';

// ============================================================================
// TYPES
// ============================================================================

type Row = Record<string, unknown>;

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };

const RUN = `itest-dupli-complete-${Date.now().toString(36)}`;

/**
 * Colonnes volontairement différentes entre l'original et la copie (miroir du
 * commentaire de la route) : identité, horodatages, cycle de vie, propriétaire,
 * et le lien vers la fiche / section parente (remappé, vérifié à part).
 */
const EXCLUDED = {
	worksheets: [
		'id',
		'created_at',
		'updated_at',
		'published_at',
		'archived_at',
		'status',
		'version',
		'created_by',
		'school_id',
		'title'
	],
	worksheet_sections: ['id', 'created_at', 'updated_at', 'worksheet_id'],
	worksheet_exercises: ['id', 'created_at', 'updated_at', 'worksheet_id', 'section_id']
} as const;

// ============================================================================
// VARIABLES
// ============================================================================

let locals: App.Locals;
let teacherId: string;
let exerciseId: string;

// ============================================================================
// FONCTIONS
// ============================================================================

async function sql(query: string, params: unknown[] = []): Promise<Row[]> {
	const pg = await getPostgresClient();
	return (await pg.query(query, params)).rows;
}

async function signedIn(email: string): Promise<SupabaseClient> {
	const client = createClient(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

function buildLocals(client: SupabaseClient, userId: string): App.Locals {
	const user = { id: userId } as User;
	return {
		supabase: client as unknown as App.Locals['supabase'],
		safeGetSession: vi.fn().mockResolvedValue({ user }),
		user,
		requestId: crypto.randomUUID()
	} as unknown as App.Locals;
}

function without(row: Row, columns: readonly string[]): Row {
	return Object.fromEntries(Object.entries(row).filter(([key]) => !columns.includes(key)));
}

/** Fiche publiée, une section traduite, un exercice dedans, un hors section. */
async function seedWorksheet(): Promise<string> {
	const [{ id }] = await sql(
		`insert into public.worksheets
		 (title, description, type, status, created_by, config, translations,
		  estimated_duration_minutes, total_points, grades)
		 values ($1, 'Une description', 'homework', 'published', $2, $3, $4, 45, 20, $5)
		 returning id`,
		[
			`${RUN} fiche`,
			teacherId,
			JSON.stringify({ answersOnSubject: true, columns: 2 }),
			JSON.stringify({ en: { title: 'Worksheet', description: 'A description' } }),
			['5', '4']
		]
	);
	const [{ id: sectionId }] = await sql(
		`insert into public.worksheet_sections
		 (worksheet_id, title, instructions, position, points_total, translations)
		 values ($1, 'Partie A', 'Consignes A', 1, 12, $2) returning id`,
		[id, JSON.stringify({ en: { title: 'Part A', instructions: 'Instructions A' } })]
	);
	await sql(
		`insert into public.worksheet_exercises
		 (worksheet_id, exercise_id, section_id, position, points, variant_mode, variant_config,
		  custom_instructions, answer_frame_lines, translations, is_essential, variation_index,
		  correction_visible)
		 values
		 ($1, $2, $3, 1, 7, 'n_versions', $4, 'Fais-le', $5, $6, true, 2, false),
		 ($1, $2, null, 2, 3, 'none', null, null, null, null, false, null, true)`,
		[
			id,
			exerciseId,
			sectionId,
			JSON.stringify({ versions: 3 }),
			JSON.stringify({ exercise: 7 }),
			JSON.stringify({ en: { custom_instructions: 'Do it' } })
		]
	);
	return id as string;
}

// ============================================================================
// SUITE
// ============================================================================

beforeAll(async () => {
	await cleanupAllTestData();
	const teacher = await TestData.profile().withRole('teacher').create();
	teacherId = teacher.id;
	locals = buildLocals(await signedIn(teacher.email), teacherId);
	exerciseId = ((await TestData.exercise(teacherId).create()) as { id: string }).id;
});

afterAll(async () => {
	await sql('delete from public.worksheets where title like $1', [`${RUN}%`]).catch(
		() => undefined
	);
	await cleanupAllTestData();
});

describe('dupliquer une fiche recopie tout son contenu', () => {
	it('fiche, sections et exercices identiques colonne par colonne (hors exclusions)', async () => {
		const id = await seedWorksheet();
		const response = await duplicateWorksheet({ locals, params: { id } } as never);
		expect(response.status).toBe(201);
		const { worksheet } = await response.json();
		const copyId = worksheet.id as string;
		expect(copyId).not.toBe(id);

		// Fiche
		const [original] = await sql('select * from public.worksheets where id = $1', [id]);
		const [copy] = await sql('select * from public.worksheets where id = $1', [copyId]);
		expect.soft(without(copy, EXCLUDED.worksheets)).toEqual(without(original, EXCLUDED.worksheets));
		expect(copy.title).toBe(`${original.title} (copie)`);
		expect(copy.status).toBe('draft');
		expect(copy.created_by).toBe(teacherId);

		// Sections
		const sectionsOf = (wid: string) =>
			sql('select * from public.worksheet_sections where worksheet_id = $1 order by position', [
				wid
			]);
		const originalSections = await sectionsOf(id);
		const copySections = await sectionsOf(copyId);
		expect
			.soft(copySections.map((s) => without(s, EXCLUDED.worksheet_sections)))
			.toEqual(originalSections.map((s) => without(s, EXCLUDED.worksheet_sections)));

		// Exercices
		const exercisesOf = (wid: string) =>
			sql('select * from public.worksheet_exercises where worksheet_id = $1 order by position', [
				wid
			]);
		const originalExercises = await exercisesOf(id);
		const copyExercises = await exercisesOf(copyId);
		expect
			.soft(copyExercises.map((e) => without(e, EXCLUDED.worksheet_exercises)))
			.toEqual(originalExercises.map((e) => without(e, EXCLUDED.worksheet_exercises)));
		// La section de l'exercice pointe vers la section COPIÉE
		expect(copyExercises.map((e) => e.section_id)).toEqual([copySections[0].id, null]);
	});
});
