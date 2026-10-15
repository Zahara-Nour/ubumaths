/**
 * Dupliquer une fiche garde les cadres de réponse réglés (ADR 0030, lot 4)
 * ========================================================================
 *
 * Décision de David (2026-10-16) : la copie d'une fiche garde
 * `answer_frame_lines` de chaque exercice — fiche avec ou sans sections (la
 * route a deux chemins de recopie).
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
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };

const RUN = `itest-cadres-dupli-${Date.now().toString(36)}`;

/** Position → réglage : un exercice réglé au plafond, un en auto, un cadre unique */
const LINES_BY_POSITION: Record<number, unknown> = {
	1: { questions: [0, 25] },
	2: null,
	3: { exercise: 7 }
};

// ============================================================================
// VARIABLES
// ============================================================================

let locals: App.Locals;
let teacherId: string;
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

function buildLocals(client: SupabaseClient, userId: string): App.Locals {
	const user = { id: userId } as User;
	return {
		supabase: client as unknown as App.Locals['supabase'],
		safeGetSession: vi.fn().mockResolvedValue({ user }),
		user,
		requestId: crypto.randomUUID()
	} as unknown as App.Locals;
}

/** Une fiche du prof, trois exercices réglés ; dans une section si demandé. */
async function seedWorksheet(withSection: boolean): Promise<string> {
	const [{ id }] = await sql(
		`insert into public.worksheets (title, type, status, created_by)
		 values ($1, 'assessment', 'draft', $2) returning id`,
		[`${RUN} ${withSection ? 'sections' : 'sans section'}`, teacherId]
	);
	let sectionId: unknown = null;
	if (withSection) {
		[{ id: sectionId }] = await sql(
			`insert into public.worksheet_sections (worksheet_id, title, position)
			 values ($1, 'Partie A', 1) returning id`,
			[id]
		);
	}
	for (const [position, lines] of Object.entries(LINES_BY_POSITION)) {
		await sql(
			`insert into public.worksheet_exercises
			 (worksheet_id, exercise_id, section_id, position, answer_frame_lines)
			 values ($1, $2, $3, $4, $5)`,
			[id, exerciseId, sectionId, Number(position), lines === null ? null : JSON.stringify(lines)]
		);
	}
	return id as string;
}

/** Les réglages de la fiche, par position, lus hors RLS */
async function linesByPosition(worksheetId: string): Promise<Record<number, unknown>> {
	const rows = await sql(
		`select position, answer_frame_lines from public.worksheet_exercises
		 where worksheet_id = $1 order by position`,
		[worksheetId]
	);
	return Object.fromEntries(rows.map((row) => [row.position as number, row.answer_frame_lines]));
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

describe('dupliquer une fiche garde les lignes des cadres', () => {
	it.each([
		['sans section', false],
		['avec sections', true]
	])('fiche %s : chaque exercice de la copie a le réglage de l’original', async (_, sections) => {
		const id = await seedWorksheet(sections);
		const response = await duplicateWorksheet({ locals, params: { id } } as never);
		expect(response.status).toBe(201);
		const { worksheet } = await response.json();

		expect(worksheet.id).not.toBe(id);
		expect(await linesByPosition(worksheet.id)).toEqual(LINES_BY_POSITION);
	});
});
