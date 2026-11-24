/**
 * Noms anglais des nœuds de l'arbre (ADR 0043)
 * =============================================
 *
 * Migration : 20261124180821_noms_anglais_noeuds.sql
 *
 * Décisions de David (2026-11-23) :
 * - chaque nœud (branche, notion, sous-notion) reçoit un champ de traductions,
 *   `{"en": {"name": "…"}}`, vide par défaut ;
 * - l'admin l'écrit (par migration), comme le nom français ; pas d'écran ;
 * - question d'accès : personne ne lit rien de nouveau. Le nom anglais se lit
 *   comme le nom français (tout le monde, visiteur compris) ; les liens de
 *   partage rendent aussi les traductions des notions de la fiche citée.
 *
 * Le prof et l'admin agissent avec leur client CONNECTÉ (la RLS échoue en
 * silence : chaque écriture est relue en superutilisateur). Le décor est posé
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

const RUN = `itest-noms-anglais-${Date.now().toString(36)}`;
const JOURNAL_TOKEN = `nomsanglaiscahier${Date.now().toString(36)}abcdefghij`.slice(0, 32);
const COURSE_TOKEN = `nomsanglaiscours${Date.now().toString(36)}abcdefghijk`.slice(0, 32);

const SEQUENCES = { en: { name: 'Arithmetic sequences' } };

// ============================================================================
// TYPES
// ============================================================================

interface SharedWorksheet {
	classifications: { node_id: string; name: string; translations?: unknown }[];
	[key: string]: unknown;
}

// ============================================================================
// VARIABLES
// ============================================================================

let teacherClient: SupabaseClient;
let adminClient: SupabaseClient;
let visitor: SupabaseClient;

let branchId: string;
let notionId: string;
let subnotionId: string;
let worksheetId: string;

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

async function node(kind: string, parentId: string | null, name: string): Promise<string> {
	const [{ id }] = await sql(
		`insert into public.classification_nodes (kind, parent_id, name) values ($1, $2, $3) returning id`,
		[kind, parentId, name]
	);
	return id as string;
}

async function translationsInDb(id: string): Promise<unknown> {
	const [row] = await sql('select translations from public.classification_nodes where id = $1', [
		id
	]);
	return row?.translations;
}

/** Écriture en superutilisateur : code d'erreur Postgres, ou null */
async function setTranslations(id: string, translations: string): Promise<string | null> {
	try {
		await sql('update public.classification_nodes set translations = $2::jsonb where id = $1', [
			id,
			translations
		]);
		return null;
	} catch (error) {
		return (error as { code?: string }).code ?? 'erreur';
	}
}

async function viaJournal(): Promise<SharedWorksheet | null> {
	const { data, error } = await visitor.rpc('get_worksheet_by_share_token', {
		p_token: JOURNAL_TOKEN,
		p_worksheet_id: worksheetId
	});
	expect(error).toBeNull();
	return data as SharedWorksheet | null;
}

async function viaCourse(): Promise<SharedWorksheet | null> {
	const { data, error } = await visitor.rpc('get_course_worksheet_by_share_token', {
		p_token: COURSE_TOKEN,
		p_worksheet_id: worksheetId
	});
	expect(error).toBeNull();
	return data as SharedWorksheet | null;
}

// ============================================================================
// SUITE
// ============================================================================

beforeAll(async () => {
	await cleanupAllTestData();
	visitor = createClient(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);

	const teacher = await TestData.profile().withRole('teacher').create();
	teacherClient = await signedIn(teacher.email);
	const admin = await TestData.profile().withRole('admin').create();
	adminClient = await signedIn(admin.email);

	branchId = await node('branch', null, `${RUN} branche`);
	notionId = await node('notion', branchId, `${RUN} Suites arithmétiques`);
	subnotionId = await node('subnotion', notionId, `${RUN} terme général`);

	const [{ id }] = await sql(
		`insert into public.worksheets (title, type, status, created_by, category)
		 values ($1, 'worksheet', 'draft', $2, 'technical_practice') returning id`,
		[RUN, teacher.id]
	);
	worksheetId = id as string;
	await sql(
		`insert into public.worksheet_classifications (worksheet_id, node_id, position)
		 values ($1, $2, 0), ($1, $3, 1)`,
		[worksheetId, notionId, subnotionId]
	);

	// Liens de partage : fiche donnée à la classe (le cours partagé l'exige),
	// citée au cahier, publiée dans un chapitre visible
	const classId = ((await TestData.class().create()) as { id: string }).id;
	const [{ id: assignmentId }] = await sql(
		`insert into public.worksheet_assignments (worksheet_id, created_by, status, available_from)
		 values ($1, $2, 'active', now() - interval '1 day') returning id`,
		[worksheetId, teacher.id]
	);
	await sql(
		'insert into public.worksheet_assignment_classes (assignment_id, class_id) values ($1, $2)',
		[assignmentId, classId]
	);
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
	await sql(
		`insert into public.class_journal_entries (class_id, entry_date, is_published, lesson_content)
		 values ($1, current_date, true, $2)`,
		[classId, `<p>[[worksheet:${worksheetId}|${RUN}]]</p>`]
	);
	const [{ id: chapterId }] = await sql(
		`insert into public.class_chapters (class_id, title, is_visible) values ($1, $2, true) returning id`,
		[classId, RUN]
	);
	await sql(
		`insert into public.chapter_worksheets (chapter_id, worksheet_id, published_at)
		 values ($1, $2, now() - interval '1 minute')`,
		[chapterId, worksheetId]
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
	for (const id of [subnotionId, notionId, branchId]) {
		await sql('delete from public.classification_nodes where id = $1', [id]).catch(() => undefined);
	}
	await cleanupAllTestData();
});

describe('le champ de traductions d’un nœud', () => {
	it('un nœud créé sans traduction a un champ vide', async () => {
		expect(await translationsInDb(notionId)).toEqual({});
	});

	it('branche, notion et sous-notion reçoivent un nom anglais', async () => {
		for (const id of [branchId, notionId, subnotionId]) {
			expect(await setTranslations(id, JSON.stringify({ en: { name: `${RUN} en` } }))).toBeNull();
			expect(await translationsInDb(id)).toEqual({ en: { name: `${RUN} en` } });
		}
		await setTranslations(branchId, '{}');
		await setTranslations(subnotionId, '{}');
	});

	it.each([
		['un nom anglais vide', { en: { name: '' } }],
		['un nom anglais fait d’espaces', { en: { name: '   ' } }],
		['un nom anglais qui n’est pas un texte', { en: { name: 3 } }],
		['une traduction anglaise sans nom', { en: {} }],
		['une traduction anglaise qui n’est pas un objet', { en: 'Sequences' }],
		['un champ qui n’est pas un objet', ['en']]
	])('refuse %s (23514)', async (_label, value) => {
		expect(await setTranslations(notionId, JSON.stringify(value))).toBe('23514');
	});

	it('refuse un champ nul (23502)', async () => {
		let code: string | null = null;
		try {
			await sql('update public.classification_nodes set translations = null where id = $1', [
				notionId
			]);
		} catch (error) {
			code = (error as { code?: string }).code ?? 'erreur';
		}
		expect(code).toBe('23502');
	});
});

describe('qui écrit et qui lit le nom anglais', () => {
	beforeAll(async () => {
		await setTranslations(notionId, JSON.stringify(SEQUENCES));
	});

	it('l’admin écrit le nom anglais d’un nœud', async () => {
		const { data, error } = await adminClient
			.from('classification_nodes')
			.update({ translations: { en: { name: `${RUN} Sequences` } } })
			.eq('id', branchId)
			.select('id');
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect(await translationsInDb(branchId)).toEqual({ en: { name: `${RUN} Sequences` } });
		await setTranslations(branchId, '{}');
	});

	it('le prof ne peut pas écrire le nom anglais d’un nœud', async () => {
		const { data, error } = await teacherClient
			.from('classification_nodes')
			.update({ translations: { en: { name: 'Something else' } } })
			.eq('id', notionId)
			.select('id');
		// Refus de la RLS : aucune erreur, zéro ligne
		expect(error).toBeNull();
		expect(data).toEqual([]);
		expect(await translationsInDb(notionId)).toEqual(SEQUENCES);
	});

	it('le visiteur lit le nom anglais, comme le nom français', async () => {
		const { data, error } = await visitor
			.from('classification_nodes')
			.select('name, translations')
			.eq('id', notionId);
		expect(error).toBeNull();
		expect(data).toEqual([{ name: `${RUN} Suites arithmétiques`, translations: SEQUENCES }]);
	});

	it('le prof lit le nom anglais', async () => {
		const { data } = await teacherClient
			.from('classification_nodes')
			.select('translations')
			.eq('id', notionId);
		expect(data).toEqual([{ translations: SEQUENCES }]);
	});
});

describe('liens de partage : traductions des notions de la fiche citée', () => {
	beforeAll(async () => {
		await setTranslations(notionId, JSON.stringify(SEQUENCES));
		await setTranslations(subnotionId, '{}');
	});

	it.each([
		['cahier de texte', viaJournal],
		['cours partagé', viaCourse]
	] as const)(
		'%s : chaque notion avec ses traductions, vides si absentes',
		async (_label, open) => {
			const shared = await open();
			expect(shared).not.toBeNull();
			expect(
				shared?.classifications.map(({ node_id, translations }) => ({ node_id, translations }))
			).toEqual([
				{ node_id: notionId, translations: SEQUENCES },
				{ node_id: subnotionId, translations: {} }
			]);
		}
	);
});
