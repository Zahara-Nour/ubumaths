/**
 * Nombre de lignes des cadres de réponse, par exercice dans la fiche (ADR 0030, lot 4)
 * ===================================================================================
 *
 * `worksheet_exercises.answer_frame_lines` (jsonb, NULL par défaut) garde le
 * réglage du prof pour CET exercice DANS CETTE fiche :
 * `{ "questions": [int|null, …], "exercise": int|null }` — null = estimation
 * automatique, 0 = pas de cadre, au plus 40 lignes, au plus 200 questions.
 *
 * Question d'accès tranchée par David : aucun nouvel accès. La colonne hérite
 * des policies de la ligne : le prof auteur (et l'admin) la lit et l'écrit,
 * l'élève à qui la fiche est distribuée la lit, personne d'autre.
 *
 * Écritures faites avec les clients CONNECTÉS ; la RLS échoue en silence, donc
 * chaque écriture est relue en superutilisateur (`pg`).
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
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

/** Un réglage valide : question 1 auto, question 2 sans cadre, question 3 huit lignes */
const VALID = { questions: [null, 0, 8], exercise: null };

// ============================================================================
// VARIABLES
// ============================================================================

/** Le client service : SEULEMENT pour semer les données. */
const service = createServiceRoleClient();

let teacherClient: SupabaseClient;
let assignedStudentClient: SupabaseClient;
let otherStudentClient: SupabaseClient;
let anonClient: SupabaseClient;
let rowId: string;

// ============================================================================
// FONCTIONS
// ============================================================================

async function signedIn(email: string): Promise<SupabaseClient> {
	const client = createClient(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);
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

/** La valeur en base, lue en superutilisateur (hors RLS). */
async function linesInDb(id: string): Promise<unknown> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(
		'select answer_frame_lines from public.worksheet_exercises where id = $1',
		[id]
	);
	return rows[0]?.answer_frame_lines;
}

/** Remet la valeur à un état connu, en superutilisateur. */
async function setInDb(id: string, value: unknown): Promise<void> {
	const pg = await getPostgresClient();
	await pg.query('update public.worksheet_exercises set answer_frame_lines = $2 where id = $1', [
		id,
		value === null ? null : JSON.stringify(value)
	]);
}

/** Écriture par le prof : rend le code d'erreur Postgres, ou null. */
async function teacherWrite(value: unknown): Promise<string | null> {
	const { error } = await teacherClient
		.from('worksheet_exercises')
		.update({ answer_frame_lines: value } as never)
		.eq('id', rowId)
		.select('id');
	return error?.code ?? null;
}

// ============================================================================
// SUITE
// ============================================================================

beforeAll(async () => {
	await cleanupAllTestData();
	const teacher = await TestData.profile().withRole('teacher').create();
	const assigned = await TestData.profile().withRole('student').create();
	const other = await TestData.profile().withRole('student').create();
	teacherClient = await signedIn(teacher.email);
	assignedStudentClient = await signedIn(assigned.email);
	otherStudentClient = await signedIn(other.email);
	anonClient = createClient(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);

	const classId = ((await TestData.class().create()) as { id: string }).id;
	const { error } = await service
		.from('class_members')
		.insert({ class_id: classId, student_id: assigned.id, status: 'active' });
	if (error) throw new Error(`membre : ${error.message}`);

	const exerciseId = ((await TestData.exercise(teacher.id).create()) as { id: string }).id;
	const worksheetId = await insert('worksheets', {
		title: 'Fiche aux cadres réglés',
		type: 'assessment',
		status: 'published',
		created_by: teacher.id
	});
	rowId = await insert('worksheet_exercises', {
		worksheet_id: worksheetId,
		exercise_id: exerciseId,
		position: 1
	});
	const assignmentId = await insert('worksheet_assignments', {
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

describe('answer_frame_lines : valeur par défaut', () => {
	it('une ligne créée sans réglage vaut NULL (estimation automatique)', async () => {
		expect(await linesInDb(rowId)).toBeNull();
	});
});

describe('answer_frame_lines : le prof auteur', () => {
	it('écrit son réglage, la ligne est rendue, et relit la même valeur', async () => {
		const { data, error } = await teacherClient
			.from('worksheet_exercises')
			.update({ answer_frame_lines: VALID } as never)
			.eq('id', rowId)
			.select('id, answer_frame_lines');
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect((data as { answer_frame_lines: unknown }[])[0].answer_frame_lines).toEqual(VALID);
		expect(await linesInDb(rowId)).toEqual(VALID);
	});

	it('peut revenir à l’estimation automatique (NULL)', async () => {
		expect(await teacherWrite(null)).toBeNull();
		expect(await linesInDb(rowId)).toBeNull();
	});

	it.each([
		['cadre unique seul', { exercise: 12 }],
		['aucune question réglée', { questions: [] }],
		['bornes 0 et 40', { questions: [0, 40], exercise: 0 }],
		['200 questions', { questions: Array.from({ length: 200 }, () => 3) }]
	])('accepte : %s', async (_label, value) => {
		expect(await teacherWrite(value)).toBeNull();
		expect(await linesInDb(rowId)).toEqual(value);
	});
});

describe('answer_frame_lines : la CHECK refuse une valeur invalide', () => {
	beforeEach(async () => {
		await setInDb(rowId, VALID);
	});

	it.each([
		['un tableau à la racine', [1, 2]],
		['un nombre à la racine', 3],
		['une clé inconnue', { questions: [1], rows: 2 }],
		['questions qui n’est pas un tableau', { questions: 3 }],
		['plus de 40 lignes', { questions: [41] }],
		['un nombre négatif', { questions: [-1] }],
		['un nombre non entier', { questions: [2.5] }],
		['une chaîne dans questions', { questions: ['3'] }],
		['un booléen dans questions', { questions: [true] }],
		['un tableau dans questions', { questions: [[5]] }],
		['un objet dans questions', { questions: [{ n: 5 }] }],
		['plus de 200 questions', { questions: Array.from({ length: 201 }, () => 3) }],
		['exercise hors bornes', { exercise: 41 }],
		['exercise non entier', { exercise: 1.5 }],
		['exercise en chaîne', { exercise: '4' }],
		['exercise en tableau', { exercise: [5] }]
	])('refuse : %s', async (_label, value) => {
		expect(await teacherWrite(value)).toBe('23514');
		expect(await linesInDb(rowId)).toEqual(VALID);
	});
});

describe('answer_frame_lines : ceux qui ne sont pas l’auteur', () => {
	beforeAll(async () => {
		await setInDb(rowId, VALID);
	});

	it('l’élève destinataire LIT la valeur (comme le reste de la ligne)', async () => {
		const { data, error } = await assignedStudentClient
			.from('worksheet_exercises')
			.select('answer_frame_lines')
			.eq('id', rowId);
		expect(error).toBeNull();
		expect(data).toEqual([{ answer_frame_lines: VALID }]);
	});

	it('l’élève destinataire ne l’ÉCRIT pas (0 ligne, valeur inchangée)', async () => {
		const { data } = await assignedStudentClient
			.from('worksheet_exercises')
			.update({ answer_frame_lines: { questions: [40] } } as never)
			.eq('id', rowId)
			.select('id');
		expect(data ?? []).toHaveLength(0);
		expect(await linesInDb(rowId)).toEqual(VALID);
	});

	it('un élève sans la fiche ne la lit pas et ne l’écrit pas', async () => {
		const { data: read } = await otherStudentClient
			.from('worksheet_exercises')
			.select('answer_frame_lines')
			.eq('id', rowId);
		expect(read ?? []).toHaveLength(0);

		const { data } = await otherStudentClient
			.from('worksheet_exercises')
			.update({ answer_frame_lines: { questions: [40] } } as never)
			.eq('id', rowId)
			.select('id');
		expect(data ?? []).toHaveLength(0);
		expect(await linesInDb(rowId)).toEqual(VALID);
	});

	it('un visiteur anonyme est refusé (aucun droit sur la table)', async () => {
		const { data, error } = await anonClient
			.from('worksheet_exercises')
			.update({ answer_frame_lines: { questions: [40] } } as never)
			.eq('id', rowId)
			.select('id');
		expect(data ?? []).toHaveLength(0);
		expect(error).not.toBeNull();
		expect(await linesInDb(rowId)).toEqual(VALID);
	});
});
