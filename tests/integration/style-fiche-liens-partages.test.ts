/**
 * Le style d'une fiche, transmis par les liens partagés (lot 4a)
 * ==============================================================
 *
 * Migration : 20261016103500_style_fiche_liens_partages.sql
 *
 * Question d'accès (D11, David, 2026-10-14) : le visiteur d'un cahier de texte
 * ou d'un cours partagé reçoit le style de la fiche et, pour un style de
 * l'AUTEUR de la fiche, sa mise en page (Typst) — pour une fiche CITÉE dans
 * ce cahier ou ce cours seulement. Jamais la mise en page d'un autre compte ;
 * un style de Chiphre n'en transmet aucune (son Typst est dans le code).
 *
 * L'appelant est `anon`, exactement comme le porteur du lien. Les lignes sont
 * posées en superutilisateur (`pg`), hors RLS.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import { DEFAULT_TEMPLATE_IDS } from '../../src/lib/typst/templates/default-templates';

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const RUN = `itest-style-partage-${Date.now().toString(36)}`;
const JOURNAL_TOKEN = `cahier${Date.now().toString(36)}abcdefghij`.slice(0, 32);
const COURSE_TOKEN = `cours${Date.now().toString(36)}abcdefghijk`.slice(0, 32);
const STANDARD = DEFAULT_TEMPLATE_IDS.standard;
const PROF_TYPST = '#set page(paper: "a4")\n// MISE-EN-PAGE-DU-PROF\n{{exercises}}';

// ============================================================================
// VARIABLES
// ============================================================================

let visitor: SupabaseClient;
let teacherId: string;
let adminId: string;
let classId: string;
let profStyleId: string;
let adminStyleId: string;

interface SharedWorksheet {
	id: string;
	style_id: string | null;
	template_id: string | null;
	template: { style_id: string; template_content: string } | null;
}

// ============================================================================
// FONCTIONS
// ============================================================================

async function sql(query: string, params: unknown[] = []): Promise<Record<string, string>[]> {
	const pg = await getPostgresClient();
	return (await pg.query(query, params)).rows;
}

/** Un style et sa fiche, au même identifiant (comme la page « Gabarits »). */
async function seedStyle(ownerId: string, suffix: string): Promise<string> {
	const [{ id }] = await sql(
		'insert into public.worksheet_styles (owner_id, name) values ($1, $2) returning id',
		[ownerId, `${RUN} ${suffix}`]
	);
	await sql(
		`insert into public.worksheet_templates (id, name, template_content, created_by, style_id, form)
		 values ($1, $2, $3, $4, $1, 'worksheet')`,
		[id, `${RUN} ${suffix}`, `${PROF_TYPST}\n// ${suffix}`, ownerId]
	);
	return id;
}

/** Une fiche publiée du prof, citée dans le cahier ET visible dans le cours partagé. */
async function sharedWorksheet(
	suffix: string,
	ids: { style_id?: string | null; template_id?: string | null }
): Promise<string> {
	const [{ id }] = await sql(
		`insert into public.worksheets (title, type, status, created_by, style_id, template_id)
		 values ($1, 'worksheet', 'published', $2, $3, $4) returning id`,
		[`${RUN} ${suffix}`, teacherId, ids.style_id ?? null, ids.template_id ?? null]
	);
	// Une séance par classe et par jour : chaque fiche s'ajoute à celle du jour
	await sql(
		`update public.class_journal_entries set lesson_content = lesson_content || $2
		 where class_id = $1 and entry_date = current_date`,
		[classId, `<p>[[worksheet:${id}|${suffix}]]</p>`]
	);
	const [{ id: chapterId }] = await sql(
		`insert into public.class_chapters (class_id, title, is_visible) values ($1, $2, true) returning id`,
		[classId, `${RUN} ${suffix}`]
	);
	await sql(
		`insert into public.chapter_worksheets (chapter_id, worksheet_id, published_at)
		 values ($1, $2, now() - interval '1 minute')`,
		[chapterId, id]
	);
	const [{ id: assignmentId }] = await sql(
		`insert into public.worksheet_assignments (worksheet_id, created_by, status)
		 values ($1, $2, 'active') returning id`,
		[id, teacherId]
	);
	await sql(
		'insert into public.worksheet_assignment_classes (assignment_id, class_id) values ($1, $2)',
		[assignmentId, classId]
	);
	return id;
}

async function viaJournal(
	worksheetId: string,
	token = JOURNAL_TOKEN
): Promise<SharedWorksheet | null> {
	const { data, error } = await visitor.rpc('get_worksheet_by_share_token', {
		p_token: token,
		p_worksheet_id: worksheetId
	});
	expect(error).toBeNull();
	return data as SharedWorksheet | null;
}

async function viaCourse(
	worksheetId: string,
	token = COURSE_TOKEN
): Promise<SharedWorksheet | null> {
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
	visitor = createClient(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const teacher = await TestData.profile().withRole('teacher').create();
	const admin = await TestData.profile().withRole('admin').create();
	teacherId = teacher.id;
	adminId = admin.id;
	classId = ((await TestData.class().create()) as { id: string }).id;
	await sql('delete from public.class_journal_share_tokens where token = $1', [JOURNAL_TOKEN]);
	await sql('delete from public.class_course_share_tokens where token = $1', [COURSE_TOKEN]);
	await sql(
		`insert into public.class_journal_share_tokens (class_id, token, created_by, is_active)
		 values ($1, $2, $3, true)`,
		[classId, JOURNAL_TOKEN, teacherId]
	);
	await sql(
		`insert into public.class_course_share_tokens (class_id, token, created_by, is_active)
		 values ($1, $2, $3, true)`,
		[classId, COURSE_TOKEN, teacherId]
	);
	await sql(
		`insert into public.class_journal_entries (class_id, entry_date, is_published, lesson_content)
		 values ($1, current_date, true, '')`,
		[classId]
	);
	profStyleId = await seedStyle(teacherId, 'du prof');
	adminStyleId = await seedStyle(adminId, 'de l’admin');
});

afterAll(async () => {
	await sql('delete from public.class_journal_share_tokens where token = $1', [
		JOURNAL_TOKEN
	]).catch(() => undefined);
	await sql('delete from public.class_course_share_tokens where token = $1', [COURSE_TOKEN]).catch(
		() => undefined
	);
	await sql('delete from public.class_chapters where title like $1', [`${RUN}%`]).catch(
		() => undefined
	);
	await sql('delete from public.worksheets where title like $1', [`${RUN}%`]).catch(
		() => undefined
	);
	await sql('delete from public.worksheet_styles where name like $1', [`${RUN}%`]).catch(
		() => undefined
	);
	await cleanupAllTestData();
});

describe.each(OPEN)('par le lien du %s', (_, open) => {
	it('fiche à un style du prof : le style et sa mise en page', async () => {
		const id = await sharedWorksheet('style du prof', { style_id: profStyleId });
		const fiche = await open(id);

		expect(fiche?.style_id).toBe(profStyleId);
		expect(fiche?.template?.style_id).toBe(profStyleId);
		expect(fiche?.template?.template_content).toContain('MISE-EN-PAGE-DU-PROF');
	});

	it('fiche d’avant le lot 3 : le style se lit dans `template_id`', async () => {
		const id = await sharedWorksheet('ancienne', { template_id: profStyleId });
		const fiche = await open(id);

		expect(fiche?.template_id).toBe(profStyleId);
		expect(fiche?.template?.template_content).toContain('MISE-EN-PAGE-DU-PROF');
	});

	it('style de Chiphre : son identifiant, aucune mise en page (elle est dans le code)', async () => {
		const id = await sharedWorksheet('Standard', { style_id: STANDARD, template_id: STANDARD });
		const fiche = await open(id);

		expect(fiche?.style_id).toBe(STANDARD);
		expect(fiche?.template).toBeNull();
	});

	it('fiche sans style : ni style ni mise en page', async () => {
		const id = await sharedWorksheet('sans style', {});
		const fiche = await open(id);

		expect(fiche?.id).toBe(id);
		expect(fiche?.style_id).toBeNull();
		expect(fiche?.template).toBeNull();
	});

	it('jamais la mise en page d’un autre compte que l’auteur de la fiche', async () => {
		// Posée en superutilisateur, que le trigger laisse passer comme une
		// migration : la fonction doit se garder seule
		const id = await sharedWorksheet('style de l’admin', { style_id: adminStyleId });
		const fiche = await open(id);

		expect(fiche?.template).toBeNull();
		expect(JSON.stringify(fiche)).not.toContain('MISE-EN-PAGE-DU-PROF');
	});
});

describe('ce qui reste fermé', () => {
	it('fiche non citée : rien, style compris', async () => {
		const [{ id }] = await sql(
			`insert into public.worksheets (title, type, status, created_by, style_id)
			 values ($1, 'worksheet', 'published', $2, $3) returning id`,
			[`${RUN} non citée`, teacherId, profStyleId]
		);
		expect(await viaJournal(id)).toBeNull();
		expect(await viaCourse(id)).toBeNull();
	});

	it('lien révoqué : rien', async () => {
		const id = await sharedWorksheet('lien révoqué', { style_id: profStyleId });
		await sql('update public.class_journal_share_tokens set is_active = false where token = $1', [
			JOURNAL_TOKEN
		]);
		await sql('update public.class_course_share_tokens set is_active = false where token = $1', [
			COURSE_TOKEN
		]);
		try {
			expect(await viaJournal(id)).toBeNull();
			expect(await viaCourse(id)).toBeNull();
		} finally {
			await sql('update public.class_journal_share_tokens set is_active = true where token = $1', [
				JOURNAL_TOKEN
			]);
			await sql('update public.class_course_share_tokens set is_active = true where token = $1', [
				COURSE_TOKEN
			]);
		}
	});
});
