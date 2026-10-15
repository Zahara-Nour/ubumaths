/**
 * Le style de la fiche, transmis à l'élève (lot 4b)
 * =================================================
 *
 * Question d'accès (D11, David, 2026-10-14) : l'élève DESTINATAIRE d'une fiche
 * reçoit son style et, pour un style de l'AUTEUR de la fiche, sa mise en page
 * (son Typst seul). L'élève n'a aucun droit sur les tables des styles : le
 * serveur la lit en service-role, après avoir vérifié l'accès de l'élève, et
 * seulement si le style appartient à l'auteur (audit du lot 3a).
 *
 * La route est appelée avec le client de l'élève CONNECTÉ.
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
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import { DEFAULT_TEMPLATE_IDS } from '../../src/lib/typst/templates/default-templates';
import { GET as studentWorksheet } from '../../src/routes/api/student/worksheets/[assignmentId]/+server';

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const RUN = `itest-pdf-eleve-${Date.now().toString(36)}`;
const STANDARD = DEFAULT_TEMPLATE_IDS.standard;

/** Le client service : SEULEMENT pour semer les données. */
const service = createServiceRoleClient();

// ============================================================================
// VARIABLES
// ============================================================================

let teacherId: string;
let adminId: string;
let classId: string;
let student: { id: string; client: SupabaseClient };
let outsider: { id: string; client: SupabaseClient };
let profStyleId: string;
let adminStyleId: string;
let exerciseId: string;

interface StudentView {
	style_id?: string | null;
	template_id?: string | null;
	template?: Record<string, unknown> | null;
	exercises?: Array<{ printed_frame_lines?: unknown; correction?: string | null }>;
}

// ============================================================================
// FONCTIONS
// ============================================================================

async function sql(query: string, params: unknown[] = []): Promise<Record<string, string>[]> {
	const pg = await getPostgresClient();
	return (await pg.query(query, params)).rows;
}

async function signedIn(email: string): Promise<SupabaseClient> {
	const client = createClient(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

function localsOf(userId: string, client: SupabaseClient): App.Locals {
	return {
		supabase: client as unknown as App.Locals['supabase'],
		safeGetSession: vi.fn().mockResolvedValue({ user: { id: userId } as User }),
		user: { id: userId } as User,
		requestId: crypto.randomUUID()
	} as unknown as App.Locals;
}

/** Un style et sa forme « fiche », au même identifiant (comme la page « Gabarits »). */
async function seedStyle(ownerId: string, marker: string): Promise<string> {
	const [{ id }] = await sql(
		'insert into public.worksheet_styles (owner_id, name) values ($1, $2) returning id',
		[ownerId, `${RUN} ${marker}`]
	);
	await sql(
		`insert into public.worksheet_templates (id, name, template_content, created_by, style_id, form)
		 values ($1, $2, $3, $4, $1, 'worksheet')`,
		[id, `${RUN} ${marker}`, `// ${marker}\n{{exercises}}`, ownerId]
	);
	return id;
}

/** Une fiche publiée du prof, distribuée à la classe ; rend l'identifiant de l'affectation. */
async function assigned(ids: { style_id?: string | null; template_id?: string | null }) {
	const [{ id: worksheetId }] = await sql(
		`insert into public.worksheets (title, type, status, created_by, style_id, template_id)
		 values ($1, 'worksheet', 'published', $2, $3, $4) returning id`,
		[`${RUN} fiche`, teacherId, ids.style_id ?? null, ids.template_id ?? null]
	);
	await sql(
		'insert into public.worksheet_exercises (worksheet_id, exercise_id, position) values ($1, $2, 1)',
		[worksheetId, exerciseId]
	);
	const [{ id: assignmentId }] = await sql(
		`insert into public.worksheet_assignments (worksheet_id, status, available_from, created_by)
		 values ($1, 'active', now() - interval '1 day', $2) returning id`,
		[worksheetId, teacherId]
	);
	await sql(
		'insert into public.worksheet_assignment_classes (assignment_id, class_id) values ($1, $2)',
		[assignmentId, classId]
	);
	return assignmentId;
}

async function viewOf(
	who: { id: string; client: SupabaseClient },
	assignmentId: string
): Promise<{ status: number; body: StudentView | null }> {
	try {
		const response = await studentWorksheet({
			locals: localsOf(who.id, who.client),
			params: { assignmentId }
		} as never);
		return { status: response.status, body: (await response.json()) as StudentView };
	} catch (e) {
		const status = (e as { status?: number }).status;
		if (typeof status === 'number') return { status, body: null };
		throw e;
	}
}

// ============================================================================
// SUITE
// ============================================================================

beforeAll(async () => {
	await cleanupAllTestData();
	const teacher = await TestData.profile().withRole('teacher').create();
	const admin = await TestData.profile().withRole('admin').create();
	const s = await TestData.profile().withRole('student').create();
	const o = await TestData.profile().withRole('student').create();
	teacherId = teacher.id;
	adminId = admin.id;
	student = { id: s.id, client: await signedIn(s.email) };
	outsider = { id: o.id, client: await signedIn(o.email) };
	classId = ((await TestData.class().create()) as { id: string }).id;
	const { error } = await service
		.from('class_members')
		.insert({ class_id: classId, student_id: student.id, status: 'active' });
	if (error) throw new Error(`membre : ${error.message}`);
	exerciseId = ((await TestData.exercise(teacherId).create()) as { id: string }).id;
	profStyleId = await seedStyle(teacherId, 'MISE-EN-PAGE-DU-PROF');
	adminStyleId = await seedStyle(adminId, 'MISE-EN-PAGE-ADMIN');
});

afterAll(async () => {
	await sql('delete from public.worksheets where title like $1', [`${RUN}%`]).catch(
		() => undefined
	);
	await sql('delete from public.worksheet_styles where name like $1', [`${RUN}%`]).catch(
		() => undefined
	);
	await cleanupAllTestData();
});

describe('la fiche de l’élève destinataire', () => {
	it('style du prof : le style et sa mise en page (son Typst seul)', async () => {
		const { status, body } = await viewOf(student, await assigned({ style_id: profStyleId }));

		expect(status).toBe(200);
		expect(body?.style_id).toBe(profStyleId);
		expect(body?.template).toEqual({
			template_content: '// MISE-EN-PAGE-DU-PROF\n{{exercises}}'
		});
	});

	it('fiche d’avant le lot 3 : le style se lit dans `template_id`', async () => {
		const { body } = await viewOf(student, await assigned({ template_id: profStyleId }));
		expect(body?.template_id).toBe(profStyleId);
		expect(body?.template?.template_content).toContain('MISE-EN-PAGE-DU-PROF');
	});

	it('style de Chiphre : l’identifiant, aucune mise en page (elle est dans le code)', async () => {
		const { body } = await viewOf(
			student,
			await assigned({ style_id: STANDARD, template_id: STANDARD })
		);
		expect(body?.style_id).toBe(STANDARD);
		expect(body?.template).toBeNull();
	});

	it('jamais la mise en page d’un autre compte que l’auteur de la fiche', async () => {
		// Posé en superutilisateur, que le trigger laisse passer comme une migration
		const { body } = await viewOf(student, await assigned({ style_id: adminStyleId }));
		expect(body?.template).toBeNull();
		expect(JSON.stringify(body)).not.toContain('MISE-EN-PAGE-ADMIN');
	});
});

describe('le cartouche du gabarit', () => {
	it('durée, total et options du type de la fiche transmis (ADR 0030)', async () => {
		const assignmentId = await assigned({ style_id: STANDARD });
		await sql(
			`update public.worksheets set total_points = 20, estimated_duration_minutes = 55,
			   config = '{"show_date": false, "calculator": "forbidden", "show_points": true}'::jsonb
			 where id = (select worksheet_id from public.worksheet_assignments where id = $1)`,
			[assignmentId]
		);
		const { body } = await viewOf(student, assignmentId);
		expect(body).toMatchObject({
			total_points: 20,
			estimated_duration_minutes: 55,
			calculator: 'forbidden',
			show_points: true
		});
		// Ancienne case d'affichage : plus transmise
		expect(body).not.toHaveProperty('show_date');
	});
});

// ADR 0030, lot 4 : les lignes des cadres réglées par le prof, lues avec la
// ligne `worksheet_exercises` (vraie base, vraie RLS de l'élève destinataire),
// arrivent résolues dans la vue : ce que son PDF imprime, rien d'autre.
describe('les cadres de réponse réglés par le prof', () => {
	it('évaluation, un cadre après l’exercice réglé à 7 lignes : l’élève reçoit 7', async () => {
		const assignmentId = await assigned({ style_id: STANDARD });
		await sql(
			`update public.worksheets set type = 'assessment',
			   config = '{"answers_on_sheet": true, "answer_frames": "exercise"}'::jsonb
			 where id = (select worksheet_id from public.worksheet_assignments where id = $1)`,
			[assignmentId]
		);
		await sql(
			`update public.worksheet_exercises set answer_frame_lines = '{"exercise": 7}'::jsonb
			 where worksheet_id = (select worksheet_id from public.worksheet_assignments where id = $1)`,
			[assignmentId]
		);
		const { status, body } = await viewOf(student, assignmentId);
		expect(status).toBe(200);
		// 7 n'est pas une estimation possible (3, 6, 9, 13 ou 18 lignes) : c'est le réglage
		expect(body?.exercises?.[0].printed_frame_lines).toEqual({ exercise: 7 });
		expect(body?.exercises?.[0]).not.toHaveProperty('answer_frame_lines');
	});
});

describe('ce qui reste fermé', () => {
	it('élève non destinataire : 404, rien du style', async () => {
		const { status, body } = await viewOf(outsider, await assigned({ style_id: profStyleId }));
		expect(status).toBe(404);
		expect(body).toBeNull();
	});

	it('l’élève ne lit toujours pas les tables des styles lui-même', async () => {
		const { data: styles } = await student.client.from('worksheet_styles').select('id');
		const { data: templates } = await student.client
			.from('worksheet_templates')
			.select('id')
			.eq('id', profStyleId);
		expect(styles ?? []).toEqual([]);
		expect(templates ?? []).toEqual([]);
	});
});
