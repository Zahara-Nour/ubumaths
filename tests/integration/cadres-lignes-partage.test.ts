/**
 * Cadres de réponse : plafond de 25 lignes, lignes transmises par les liens partagés
 * ===================================================================================
 *
 * Migration : 20261016104000_cadres_lignes_partage.sql (ADR 0030, lot 4)
 *
 * Décisions de David (2026-10-15/16) :
 * - un cadre fait au plus 25 lignes (20 cm), au lieu de 40 ;
 * - question d'accès : le visiteur d'un lien de partage (cahier de texte, cours
 *   partagé) lit le NOMBRE DE LIGNES des cadres de chaque exercice d'une fiche
 *   citée, et rien d'autre de nouveau — son PDF a les mêmes cadres que celui du
 *   prof.
 *
 * Le prof écrit avec son client CONNECTÉ (la RLS échoue en silence : chaque
 * écriture est relue en superutilisateur). Le visiteur est `anon`, exactement
 * comme le porteur du lien. Le décor (fiche, jetons, séance, chapitre) est posé
 * en superutilisateur (`pg`), hors RLS.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };

const RUN = `itest-cadres-partage-${Date.now().toString(36)}`;
const JOURNAL_TOKEN = `cadrescahier${Date.now().toString(36)}abcdefghij`.slice(0, 32);
const COURSE_TOKEN = `cadrescours${Date.now().toString(36)}abcdefghijk`.slice(0, 32);
const UNKNOWN_TOKEN = 'inconnuinconnuinconnu0123456789';

/** Le réglage du prof sur le premier exercice, au plafond */
const FIRST_LINES = { questions: [null, 0, 25], exercise: null };
/** Le second exercice : cadre unique réglé */
const SECOND_LINES = { exercise: 12 };

/** Clés de la fiche rendue : celles de la migration 20261016103500, inchangées */
const WORKSHEET_KEYS = [
	'config',
	'description',
	'estimated_duration_minutes',
	'exercises',
	'grades',
	'id',
	'sections',
	'status',
	'style_id',
	'template',
	'template_id',
	'title',
	'total_points',
	'translations',
	'type'
];

/** Clés d'un exercice rendu : celles d'avant, plus `answer_frame_lines` SEULEMENT */
const EXERCISE_KEYS = [
	'answer_frame_lines',
	'custom_instructions',
	'exercise',
	'exercise_id',
	'id',
	'is_essential',
	'points',
	'position',
	'section_id',
	'translations',
	'variant_config',
	'variant_mode',
	'variation_index',
	'worksheet_id'
];

/** Clés du contenu de l'exercice (énoncé ET corrigé) : inchangées */
const CONTENT_KEYS = ['generic_functions', 'id', 'shared', 'title', 'variables', 'variations'];

// ============================================================================
// TYPES
// ============================================================================

interface SharedExercise {
	id: string;
	answer_frame_lines: unknown;
	exercise: Record<string, unknown>;
	[key: string]: unknown;
}

interface SharedWorksheet {
	id: string;
	exercises: SharedExercise[];
	[key: string]: unknown;
}

// ============================================================================
// VARIABLES
// ============================================================================

let teacherClient: SupabaseClient;
let visitor: SupabaseClient;
let worksheetId: string;
let firstRowId: string;
let secondRowId: string;
let exerciseId: string;

// ============================================================================
// FONCTIONS
// ============================================================================

async function sql(query: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
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

async function linesInDb(id: string): Promise<unknown> {
	const [row] = await sql(
		'select answer_frame_lines from public.worksheet_exercises where id = $1',
		[id]
	);
	return row?.answer_frame_lines;
}

async function setInDb(id: string, value: unknown): Promise<void> {
	await sql('update public.worksheet_exercises set answer_frame_lines = $2 where id = $1', [
		id,
		value === null ? null : JSON.stringify(value)
	]);
}

/** Écriture par le prof connecté : code d'erreur Postgres, ou null. */
async function teacherWrite(id: string, value: unknown): Promise<string | null> {
	const { data, error } = await teacherClient
		.from('worksheet_exercises')
		.update({ answer_frame_lines: value } as never)
		.eq('id', id)
		.select('id');
	if (error) return error.code ?? 'erreur';
	// Un refus de la RLS rendrait 0 ligne sans erreur : il fausserait le test
	expect(data).toHaveLength(1);
	return null;
}

async function viaJournal(token = JOURNAL_TOKEN): Promise<SharedWorksheet | null> {
	const { data, error } = await visitor.rpc('get_worksheet_by_share_token', {
		p_token: token,
		p_worksheet_id: worksheetId
	});
	expect(error).toBeNull();
	return data as SharedWorksheet | null;
}

async function viaCourse(token = COURSE_TOKEN): Promise<SharedWorksheet | null> {
	const { data, error } = await visitor.rpc('get_course_worksheet_by_share_token', {
		p_token: token,
		p_worksheet_id: worksheetId
	});
	expect(error).toBeNull();
	return data as SharedWorksheet | null;
}

const OPEN = [
	['cahier de texte', viaJournal],
	['cours partagé', viaCourse]
] as const;

// ============================================================================
// SUITE
// ============================================================================

beforeAll(async () => {
	await cleanupAllTestData();
	visitor = createClient(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);
	const teacher = await TestData.profile().withRole('teacher').create();
	teacherClient = await signedIn(teacher.email);
	const classId = ((await TestData.class().create()) as { id: string }).id;
	exerciseId = ((await TestData.exercise(teacher.id).create()) as { id: string }).id;

	const [{ id }] = await sql(
		`insert into public.worksheets (title, type, status, created_by)
		 values ($1, 'assessment', 'draft', $2) returning id`,
		[RUN, teacher.id]
	);
	worksheetId = id as string;
	const rows = await sql(
		`insert into public.worksheet_exercises (worksheet_id, exercise_id, position)
		 values ($1, $2, 1), ($1, $2, 2) returning id, position`,
		[worksheetId, exerciseId]
	);
	firstRowId = rows.find((row) => row.position === 1)?.id as string;
	secondRowId = rows.find((row) => row.position === 2)?.id as string;

	// Jetons du cahier et du cours de la classe
	await sql(
		`insert into public.class_journal_share_tokens (class_id, token, created_by, is_active)
		 values ($1, $2, $3, true)`,
		[classId, JOURNAL_TOKEN, teacher.id]
	);
	await sql(
		`insert into public.class_course_share_tokens (class_id, token, created_by, is_active)
		 values ($1, $2, $3, true)`,
		[classId, COURSE_TOKEN, teacher.id]
	);
	// Fiche citée dans une séance visible du cahier
	await sql(
		`insert into public.class_journal_entries (class_id, entry_date, is_published, lesson_content)
		 values ($1, current_date, true, $2)`,
		[classId, `<p>[[worksheet:${worksheetId}|${RUN}]]</p>`]
	);
	// Fiche publiée dans un chapitre visible ET distribuée à la classe
	const [{ id: chapterId }] = await sql(
		`insert into public.class_chapters (class_id, title, is_visible) values ($1, $2, true) returning id`,
		[classId, RUN]
	);
	await sql(
		`insert into public.chapter_worksheets (chapter_id, worksheet_id, published_at)
		 values ($1, $2, now() - interval '1 minute')`,
		[chapterId, worksheetId]
	);
	const [{ id: assignmentId }] = await sql(
		`insert into public.worksheet_assignments (worksheet_id, created_by, status)
		 values ($1, $2, 'active') returning id`,
		[worksheetId, teacher.id]
	);
	await sql(
		'insert into public.worksheet_assignment_classes (assignment_id, class_id) values ($1, $2)',
		[assignmentId, classId]
	);
});

afterAll(async () => {
	await sql('delete from public.class_journal_share_tokens where token = $1', [
		JOURNAL_TOKEN
	]).catch(() => undefined);
	await sql('delete from public.class_course_share_tokens where token = $1', [COURSE_TOKEN]).catch(
		() => undefined
	);
	await sql('delete from public.class_chapters where title = $1', [RUN]).catch(() => undefined);
	await sql('delete from public.worksheets where title = $1', [RUN]).catch(() => undefined);
	await cleanupAllTestData();
});

describe('plafond : 25 lignes par cadre', () => {
	it.each([
		['une question à 25 lignes', { questions: [25, 0] }],
		['le cadre unique à 25 lignes', { exercise: 25 }]
	])('le prof enregistre %s', async (_label, value) => {
		await setInDb(firstRowId, null);
		expect(await teacherWrite(firstRowId, value)).toBeNull();
		expect(await linesInDb(firstRowId)).toEqual(value);
	});

	it.each([
		['une question à 26 lignes', { questions: [3, 26] }],
		['le cadre unique à 26 lignes', { exercise: 26 }],
		['40 lignes (l’ancien plafond)', { questions: [40] }]
	])('refuse %s (23514), valeur inchangée', async (_label, value) => {
		await setInDb(firstRowId, FIRST_LINES);
		expect(await teacherWrite(firstRowId, value)).toBe('23514');
		expect(await linesInDb(firstRowId)).toEqual(FIRST_LINES);
	});
});

describe.each(OPEN)('par le lien du %s', (_, open) => {
	beforeAll(async () => {
		await setInDb(firstRowId, FIRST_LINES);
		await setInDb(secondRowId, SECOND_LINES);
	});

	it('chaque exercice rend les lignes de ses cadres', async () => {
		const fiche = await open();
		const byId = new Map(fiche?.exercises.map((exercise) => [exercise.id, exercise]));

		expect(byId.get(firstRowId)?.answer_frame_lines).toEqual(FIRST_LINES);
		expect(byId.get(secondRowId)?.answer_frame_lines).toEqual(SECOND_LINES);
	});

	it('exercice sans réglage : null (estimation automatique)', async () => {
		await setInDb(secondRowId, null);
		try {
			const fiche = await open();
			const second = fiche?.exercises.find((exercise) => exercise.id === secondRowId);
			expect(second).toBeDefined();
			expect(second?.answer_frame_lines).toBeNull();
		} finally {
			await setInDb(secondRowId, SECOND_LINES);
		}
	});

	it('aucune autre clé nouvelle : fiche, exercice et contenu', async () => {
		const fiche = await open();

		expect(Object.keys(fiche ?? {}).sort()).toEqual(WORKSHEET_KEYS);
		expect(fiche?.exercises).toHaveLength(2);
		for (const exercise of fiche?.exercises ?? []) {
			expect(Object.keys(exercise).sort()).toEqual(EXERCISE_KEYS);
			expect(Object.keys(exercise.exercise).sort()).toEqual(CONTENT_KEYS);
		}
	});

	it('le corrigé suit les mêmes règles qu’avant : le contenu de l’exercice tel qu’en base', async () => {
		const [stored] = await sql(
			`select id, title, variables, shared, variations, generic_functions
			 from public.exercises where id = $1`,
			[exerciseId]
		);
		const fiche = await open();

		for (const exercise of fiche?.exercises ?? []) {
			expect(exercise.exercise).toEqual(stored);
		}
	});
});

describe('ce qui reste fermé', () => {
	beforeAll(async () => {
		await setInDb(firstRowId, FIRST_LINES);
	});

	it('jeton inconnu : rien, lignes comprises', async () => {
		expect(await viaJournal(UNKNOWN_TOKEN)).toBeNull();
		expect(await viaCourse(UNKNOWN_TOKEN)).toBeNull();
	});

	it('lien révoqué : rien, lignes comprises', async () => {
		await sql('update public.class_journal_share_tokens set is_active = false where token = $1', [
			JOURNAL_TOKEN
		]);
		await sql('update public.class_course_share_tokens set is_active = false where token = $1', [
			COURSE_TOKEN
		]);
		try {
			expect(await viaJournal()).toBeNull();
			expect(await viaCourse()).toBeNull();
		} finally {
			await sql('update public.class_journal_share_tokens set is_active = true where token = $1', [
				JOURNAL_TOKEN
			]);
			await sql('update public.class_course_share_tokens set is_active = true where token = $1', [
				COURSE_TOKEN
			]);
		}
	});

	it('le visiteur anonyme ne lit toujours pas la table elle-même', async () => {
		const { data, error } = await visitor
			.from('worksheet_exercises')
			.select('answer_frame_lines')
			.eq('id', firstRowId);
		// Refus par le droit (aucun GRANT à anon), pas une simple absence de ligne
		expect(error?.code).toBe('42501');
		expect(data ?? []).toHaveLength(0);
	});
});
