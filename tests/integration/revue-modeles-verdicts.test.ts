/**
 * Verdicts de relecture des modèles — admin seul (Supabase local requis)
 * =====================================================================
 *
 * Chantier revue-modeles, accès tranché par David le 2026-10-28 :
 *   - l'admin lit, pose, remplace et retire le verdict d'un modèle ;
 *   - l'auteur et la date sont posés par la base, jamais par l'appelant ;
 *   - un prof, un élève, un visiteur ne lisent rien et n'écrivent rien ;
 *   - le verdict disparaît avec son modèle.
 *
 * Client non typé : la table n'est pas encore dans `database.ts` (généré depuis la prod).
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

/** Préfixe unique à ce run : les modèles créés le portent (nettoyage ciblé) */
const TAG = `itest-revue-${Date.now().toString(36)}`;
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };
const TABLE = 'question_template_reviews';

// ============================================================================
// VARIABLES
// ============================================================================

let adminClient: SupabaseClient;
let teacherClient: SupabaseClient;
let studentClient: SupabaseClient;
let anonClient: SupabaseClient;
let adminId: string;

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

async function insertTemplate(suffix: string): Promise<string> {
	const pg = await getPostgresClient();
	const r = await pg.query<{ id: string }>(
		`insert into public.question_templates
		   (id, type, grades, theme, domain, level, variations, status, title)
		 values (gen_random_uuid(), 'numerical_exact', array['6'], 'revue', 'revue', 1, '[{}]'::jsonb,
		         'draft', $1)
		 returning id`,
		[`${TAG} ${suffix}`]
	);
	return r.rows[0].id;
}

async function readReview(templateId: string) {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(
		`select verdict, comment, reviewed_at, reviewed_by from public.${TABLE} where template_id = $1`,
		[templateId]
	);
	return rows[0];
}

async function insertReviewAsOwner(templateId: string): Promise<void> {
	const pg = await getPostgresClient();
	await pg.query(
		`insert into public.${TABLE} (template_id, verdict, comment) values ($1, 'a_revoir', 'intact')`,
		[templateId]
	);
}

// ============================================================================
// SUITE
// ============================================================================

describe('Verdicts de relecture des modèles : admin seul', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		const admin = await TestData.profile().withRole('admin').create();
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		adminId = admin.id;
		adminClient = await signedIn(admin.email);
		teacherClient = await signedIn(teacher.email);
		studentClient = await signedIn(student.email);
		anonClient = createClient(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
		await pg
			.query('delete from public.question_templates where title like $1', [`${TAG}%`])
			.catch(() => undefined);
		await cleanupAllTestData();
	});

	it("l'admin pose un verdict : auteur et date posés par la base", async () => {
		const id = await insertTemplate('pose');
		const forged = '2000-01-01T00:00:00Z';
		const { data, error } = await adminClient
			.from(TABLE)
			.insert({ template_id: id, verdict: 'valide', comment: 'RAS', reviewed_at: forged })
			.select();
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		const row = await readReview(id);
		expect(row.verdict).toBe('valide');
		expect(row.reviewed_by).toBe(adminId);
		expect(new Date(row.reviewed_at).getFullYear()).toBeGreaterThan(2000);
	});

	it("l'admin remplace son verdict (upsert) et le relit", async () => {
		const id = await insertTemplate('remplace');
		await adminClient.from(TABLE).insert({ template_id: id, verdict: 'valide' });
		const { data, error } = await adminClient
			.from(TABLE)
			.upsert({ template_id: id, verdict: 'a_revoir', comment: 'borne fausse' })
			.select();
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		const { data: lu } = await adminClient
			.from(TABLE)
			.select('verdict, comment')
			.eq('template_id', id);
		expect(lu).toEqual([{ verdict: 'a_revoir', comment: 'borne fausse' }]);
	});

	it("l'admin retire un verdict", async () => {
		const id = await insertTemplate('retire');
		await insertReviewAsOwner(id);
		const { data } = await adminClient.from(TABLE).delete().eq('template_id', id).select();
		expect(data).toHaveLength(1);
		expect(await readReview(id)).toBeUndefined();
	});

	it('un verdict hors des deux valeurs ou un commentaire trop long est refusé', async () => {
		const id = await insertTemplate('bornes');
		const { error: e1 } = await adminClient.from(TABLE).insert({ template_id: id, verdict: 'ok' });
		expect(e1).not.toBeNull();
		const { error: e2 } = await adminClient
			.from(TABLE)
			.insert({ template_id: id, verdict: 'valide', comment: 'x'.repeat(4001) });
		expect(e2).not.toBeNull();
		expect(await readReview(id)).toBeUndefined();
	});

	it.each([
		['un prof', () => teacherClient],
		['un élève', () => studentClient]
	])('%s ne lit, ne pose, ne modifie ni ne retire aucun verdict', async (_qui, client) => {
		const id = await insertTemplate(`refus-${_qui}`);
		await insertReviewAsOwner(id);

		const { data: lu } = await client().from(TABLE).select('*').eq('template_id', id);
		expect(lu ?? []).toHaveLength(0);

		const autre = await insertTemplate(`refus-pose-${_qui}`);
		const { error: ePose } = await client()
			.from(TABLE)
			.insert({ template_id: autre, verdict: 'valide' });
		expect(ePose).not.toBeNull();
		expect(await readReview(autre)).toBeUndefined();

		const { data: modif } = await client()
			.from(TABLE)
			.update({ verdict: 'valide', comment: 'forcé' })
			.eq('template_id', id)
			.select();
		expect(modif ?? []).toHaveLength(0);
		const { data: retire } = await client().from(TABLE).delete().eq('template_id', id).select();
		expect(retire ?? []).toHaveLength(0);
		expect(await readReview(id)).toMatchObject({ verdict: 'a_revoir', comment: 'intact' });
	});

	it('un visiteur est refusé net (42501)', async () => {
		const id = await insertTemplate('anon');
		await insertReviewAsOwner(id);
		const { error } = await anonClient.from(TABLE).select('*').eq('template_id', id);
		expect(error?.code).toBe('42501');
		const { error: ePose } = await anonClient
			.from(TABLE)
			.insert({ template_id: id, verdict: 'valide' });
		expect(ePose?.code).toBe('42501');
	});

	it('hors appli (reprise des verdicts des artefacts) : la date fournie est gardée', async () => {
		const id = await insertTemplate('reprise');
		const pg = await getPostgresClient();
		await pg.query(
			`insert into public.${TABLE} (template_id, verdict, reviewed_at) values ($1, 'valide', '2026-10-20T10:00:00Z')`,
			[id]
		);
		const row = await readReview(id);
		expect(new Date(row.reviewed_at).toISOString()).toBe('2026-10-20T10:00:00.000Z');
		expect(row.reviewed_by).toBeNull();
	});

	it('le verdict disparaît avec son modèle', async () => {
		const id = await insertTemplate('cascade');
		await insertReviewAsOwner(id);
		const pg = await getPostgresClient();
		await pg.query('delete from public.question_templates where id = $1', [id]);
		expect(await readReview(id)).toBeUndefined();
	});
});
