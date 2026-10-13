/**
 * Figures géométriques stockées — accès (Supabase local requis)
 * ==============================================================
 *
 * ADR 0027, décisions de David du 2026-10-13 (docs/wip/figures-geometriques-progress.md) :
 *   - publique = lisible par tous, même sans compte ; privée = l'auteur seul ;
 *   - seuls le prof et l'admin créent ; chacun ne modifie et ne supprime que SES figures ;
 *   - niveaux contrôlés comme ceux des exercices ; tags par `resource_tags`
 *     (type `geometry_figure`), effacés avec la figure.
 *
 * La RLS échoue en silence : une écriture refusée rend zéro ligne. Chaque écriture
 * est donc relue (`.select()` côté client, puis la ligne en base par `pg`).
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

/** Préfixe unique à ce run : les figures et tags créés le portent (nettoyage ciblé). */
const RUN = `itest-figures-${Date.now().toString(36)}`;
const SERVICE_ROLE_KEY =
	process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };
const SCRIPT = 'A = point(0, 0)\nB = point(3, 0)\ns = segment(A, B)';

// ============================================================================
// VARIABLES
// ============================================================================

// Client non typé : la table n'existe dans `database.ts` qu'après `db:types` (PR suivante).
let anonClient: SupabaseClient;
let studentClient: SupabaseClient;
let teacherClient: SupabaseClient;
let adminClient: SupabaseClient;
let teacherId: string;
let adminId: string;
let publicId: string;
let privateId: string;
let adminPrivateId: string;

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

/** Insère une figure en superutilisateur (hors RLS) et rend son identifiant. */
async function seedFigure(authorId: string, suffix: string, isPublic: boolean): Promise<string> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(
		`insert into public.geometry_figures (author_id, title, dsl_script, grades, is_public)
		 values ($1, $2, $3, $4, $5) returning id`,
		[authorId, `${RUN} ${suffix}`, SCRIPT, ['T_SPE'], isPublic]
	);
	return rows[0].id;
}

/** La ligne telle qu'elle est en base (hors RLS), ou `undefined`. */
async function readRow(id: string): Promise<{ title: string } | undefined> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query('select title from public.geometry_figures where id = $1', [id]);
	return rows[0];
}

async function readTitles(client: SupabaseClient): Promise<string[]> {
	const { data, error } = await client
		.from('geometry_figures')
		.select('title')
		.like('title', `${RUN}%`);
	if (error) throw new Error(error.message);
	return (data ?? []).map((row) => row.title as string).sort();
}

// ============================================================================
// SUITE
// ============================================================================

describe('Figures géométriques : qui lit, qui écrit', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		const teacher = await TestData.profile().withRole('teacher').create();
		const admin = await TestData.profile().withRole('admin').create();
		const student = await TestData.profile().withRole('student').create();
		teacherId = teacher.id;
		adminId = admin.id;
		anonClient = createClient(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);
		studentClient = await signedIn(student.email);
		teacherClient = await signedIn(teacher.email);
		adminClient = await signedIn(admin.email);
		publicId = await seedFigure(teacherId, 'publique', true);
		privateId = await seedFigure(teacherId, 'privée', false);
		adminPrivateId = await seedFigure(adminId, 'privée admin', false);
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
		await pg
			.query('delete from public.geometry_figures where title like $1', [`${RUN}%`])
			.catch(() => undefined);
		await pg
			.query('delete from public.tags where name like $1', [`${RUN}%`])
			.catch(() => undefined);
		await cleanupAllTestData();
	});

	// --- Lecture --------------------------------------------------------------

	it('1. sans compte : la figure publique se lit, les privées rendent zéro ligne', async () => {
		expect(await readTitles(anonClient)).toEqual([`${RUN} publique`]);
	});

	it('2. élève connecté : même chose', async () => {
		expect(await readTitles(studentClient)).toEqual([`${RUN} publique`]);
	});

	it('3. le prof lit la publique et SES privées, pas celle de l’admin', async () => {
		expect(await readTitles(teacherClient)).toEqual([`${RUN} privée`, `${RUN} publique`]);
	});

	// --- Écriture par l'auteur -------------------------------------------------

	it('4. le prof crée, modifie, puis supprime sa figure ; chaque écriture rend sa ligne', async () => {
		const { data: created, error: e1 } = await teacherClient
			.from('geometry_figures')
			.insert({ title: `${RUN} cycle`, dsl_script: SCRIPT, grades: ['2'] })
			.select('id, author_id, is_public')
			.single();
		expect(e1).toBeNull();
		expect(created?.author_id).toBe(teacherId);
		expect(created?.is_public).toBe(false);

		const { data: updated } = await teacherClient
			.from('geometry_figures')
			.update({ title: `${RUN} cycle modifiée` })
			.eq('id', created!.id)
			.select('id');
		expect(updated).toHaveLength(1);
		expect((await readRow(created!.id))?.title).toBe(`${RUN} cycle modifiée`);

		const { data: deleted } = await teacherClient
			.from('geometry_figures')
			.delete()
			.eq('id', created!.id)
			.select('id');
		expect(deleted).toHaveLength(1);
		expect(await readRow(created!.id)).toBeUndefined();
	});

	// --- Refus ----------------------------------------------------------------

	it('5. un élève ne crée pas de figure, et ne modifie ni ne supprime la publique', async () => {
		const { data: inserted, error } = await studentClient
			.from('geometry_figures')
			.insert({ title: `${RUN} élève`, dsl_script: SCRIPT })
			.select('id');
		expect(error).not.toBeNull();
		expect(inserted).toBeNull();

		const { data: updated } = await studentClient
			.from('geometry_figures')
			.update({ title: `${RUN} piratée` })
			.eq('id', publicId)
			.select('id');
		expect(updated).toEqual([]);
		const { data: deleted } = await studentClient
			.from('geometry_figures')
			.delete()
			.eq('id', publicId)
			.select('id');
		expect(deleted).toEqual([]);
		expect((await readRow(publicId))?.title).toBe(`${RUN} publique`);
	});

	it('6. sans compte : aucune écriture', async () => {
		const { error } = await anonClient
			.from('geometry_figures')
			.insert({ title: `${RUN} anonyme`, dsl_script: SCRIPT });
		expect(error).not.toBeNull();
		await anonClient
			.from('geometry_figures')
			.update({ title: `${RUN} piratée` })
			.eq('id', publicId);
		await anonClient.from('geometry_figures').delete().eq('id', publicId);
		expect((await readRow(publicId))?.title).toBe(`${RUN} publique`);
		const pg = await getPostgresClient();
		const { rows } = await pg.query(
			'select count(*)::int as n from public.geometry_figures where title = $1',
			[`${RUN} anonyme`]
		);
		expect(rows[0].n).toBe(0);
	});

	it('7. l’admin ne modifie ni ne supprime la figure du prof, et inversement', async () => {
		const { data: byAdmin } = await adminClient
			.from('geometry_figures')
			.update({ title: `${RUN} par l’admin` })
			.eq('id', publicId)
			.select('id');
		expect(byAdmin).toEqual([]);
		const { data: delByAdmin } = await adminClient
			.from('geometry_figures')
			.delete()
			.eq('id', publicId)
			.select('id');
		expect(delByAdmin).toEqual([]);
		expect((await readRow(publicId))?.title).toBe(`${RUN} publique`);

		const { data: byTeacher } = await teacherClient
			.from('geometry_figures')
			.update({ title: `${RUN} par le prof` })
			.eq('id', adminPrivateId)
			.select('id');
		expect(byTeacher).toEqual([]);
		expect((await readRow(adminPrivateId))?.title).toBe(`${RUN} privée admin`);
	});

	it('8. le prof ne crée pas une figure au nom d’un autre, ni ne la lui donne', async () => {
		const { error } = await teacherClient
			.from('geometry_figures')
			.insert({ title: `${RUN} au nom de l’admin`, dsl_script: SCRIPT, author_id: adminId });
		expect(error).not.toBeNull();

		const { error: e2 } = await teacherClient
			.from('geometry_figures')
			.update({ author_id: adminId })
			.eq('id', privateId)
			.select('id');
		expect(e2).not.toBeNull();
		const pg = await getPostgresClient();
		const { rows } = await pg.query('select author_id from public.geometry_figures where id = $1', [
			privateId
		]);
		expect(rows[0].author_id).toBe(teacherId);
	});

	// --- Contraintes ----------------------------------------------------------

	it.each([
		['un titre vide', { title: '   ', dsl_script: SCRIPT }],
		['un script vide', { title: `${RUN} vide`, dsl_script: '' }],
		[
			'un script de plus de 100 000 caractères',
			{ title: `${RUN} long`, dsl_script: 'x'.repeat(100_001) }
		],
		['un niveau inconnu', { title: `${RUN} niveau`, dsl_script: SCRIPT, grades: ['T_ESPACE'] }]
	])('9. refuse %s', async (_label, row) => {
		const { error } = await teacherClient.from('geometry_figures').insert(row).select('id');
		expect(error?.code).toBe('23514');
	});

	it('9 bis. accepte un script de 77 000 caractères (le flocon de Koch)', async () => {
		const { data, error } = await teacherClient
			.from('geometry_figures')
			.insert({ title: `${RUN} flocon`, dsl_script: 'x'.repeat(77_000) })
			.select('id');
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
	});

	// --- Tags -----------------------------------------------------------------

	it('10. le prof tague sa figure ; un élève ne la tague pas ; les tags partent avec la figure', async () => {
		const { data: tag, error: e0 } = await teacherClient
			.from('tags')
			.insert({ name: `${RUN} fractale` })
			.select('id')
			.single();
		expect(e0).toBeNull();
		const figureId = await seedFigure(teacherId, 'taguée', true);

		const { data: byStudent } = await studentClient
			.from('resource_tags')
			.insert({ resource_kind: 'geometry_figure', resource_id: figureId, tag_id: tag!.id })
			.select('tag_id');
		expect(byStudent ?? []).toEqual([]);

		const { data: tagged, error } = await teacherClient
			.from('resource_tags')
			.insert({ resource_kind: 'geometry_figure', resource_id: figureId, tag_id: tag!.id })
			.select('tag_id');
		expect(error).toBeNull();
		expect(tagged).toHaveLength(1);

		const { data: deleted } = await teacherClient
			.from('geometry_figures')
			.delete()
			.eq('id', figureId)
			.select('id');
		expect(deleted).toHaveLength(1);
		const pg = await getPostgresClient();
		const { rows } = await pg.query(
			"select count(*)::int as n from public.resource_tags where resource_kind = 'geometry_figure' and resource_id = $1",
			[figureId]
		);
		expect(rows[0].n).toBe(0);
	});

	// --- Audit de sécurité (2026-10-13) ---------------------------------------

	it('11. un élève ne lit pas la figure privée du prof, même par son identifiant', async () => {
		const { data, error } = await studentClient
			.from('geometry_figures')
			.select('id')
			.eq('id', privateId);
		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	it('12. sans compte : les liens de tag d’une figure ne se lisent pas', async () => {
		const pg = await getPostgresClient();
		const { rows: tag } = await pg.query(
			'insert into public.tags (name) values ($1) returning id',
			[`${RUN} anon`]
		);
		await pg.query(
			"insert into public.resource_tags (resource_kind, resource_id, tag_id) values ('geometry_figure', $1, $2)",
			[publicId, tag[0].id]
		);
		const { data } = await anonClient
			.from('resource_tags')
			.select('tag_id')
			.eq('resource_kind', 'geometry_figure')
			.eq('resource_id', publicId);
		expect(data ?? []).toEqual([]);
	});

	it('13. l’auteur ne change pas l’identifiant de sa figure (ses tags resteraient orphelins)', async () => {
		const { error } = await teacherClient
			.from('geometry_figures')
			.update({ id: '00000000-0000-4000-8000-000000000027' })
			.eq('id', privateId)
			.select('id');
		expect(error).not.toBeNull();
		expect(await readRow(privateId)).toBeDefined();
	});

	it('14. supprimer le compte d’un auteur de figure taguée réussit, figures et tags compris', async () => {
		// Dernier test : il supprime le prof de la suite (un seul prof autorisé, invariant mono-prof).
		const figureId = await seedFigure(teacherId, 'compte supprimé', true);
		const pg = await getPostgresClient();
		const { rows: tag } = await pg.query(
			'insert into public.tags (name) values ($1) returning id',
			[`${RUN} compte`]
		);
		await pg.query(
			"insert into public.resource_tags (resource_kind, resource_id, tag_id) values ('geometry_figure', $1, $2)",
			[figureId, tag[0].id]
		);

		const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, CLIENT_OPTIONS);
		const { error } = await service.auth.admin.deleteUser(teacherId);
		expect(error).toBeNull();
		expect(await readRow(figureId)).toBeUndefined();
		const { rows } = await pg.query(
			"select count(*)::int as n from public.resource_tags where resource_kind = 'geometry_figure' and resource_id = $1",
			[figureId]
		);
		expect(rows[0].n).toBe(0);
	});
});
