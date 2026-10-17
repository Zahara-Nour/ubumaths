/**
 * Styles de fiche en base — accès et contraintes (Supabase local requis)
 * ======================================================================
 *
 * ADR 0028, décisions de David (docs/wip/generateur-pdf-fiches-progress.md) :
 *   - D9 : le prof et l'admin lisent tous les styles (ceux de Chiphre et les
 *     leurs), ne modifient que les leurs ; les élèves n'ont AUCUN accès direct
 *     (le serveur leur fournira le gabarit, lot 4) ;
 *   - les styles de Chiphre ont une ligne en base (id, nom, description),
 *     leur Typst reste dans le code ;
 *   - un gabarit porte son style et sa forme, un seul par (style, forme) ;
 *   - la fiche pointe vers un style ; style supprimé → style par défaut.
 *
 * La RLS échoue en silence : une écriture refusée rend zéro ligne. Chaque
 * écriture est donc relue (`.select()` côté client, puis la ligne par `pg`).
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import { BUILT_IN_STYLES, DEFAULT_STYLE_ID } from '../../src/lib/typst/templates/styles';
import { DEFAULT_TEMPLATE_IDS } from '../../src/lib/typst/templates/default-templates';

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };

/** Préfixe unique à ce run : les styles et fiches créés le portent (nettoyage ciblé). */
const RUN = `itest-styles-${Date.now().toString(36)}`;
const TYPST = '#set page(paper: "a4")\n{{exercises}}';

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
let adminStyleId: string;

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

/** Insère un style en superutilisateur (hors RLS) et rend son identifiant. */
async function seedStyle(ownerId: string | null, suffix: string): Promise<string> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(
		`insert into public.worksheet_styles (owner_id, name) values ($1, $2) returning id`,
		[ownerId, `${RUN} ${suffix}`]
	);
	return rows[0].id;
}

/** Insère un gabarit rattaché à un style, en superutilisateur, et rend son identifiant. */
async function seedTemplate(styleId: string, form: string, ownerId: string): Promise<string> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(
		`insert into public.worksheet_templates (name, template_content, created_by, style_id, form)
		 values ($1, $2, $3, $4, $5) returning id`,
		[`${RUN} ${form}`, TYPST, ownerId, styleId, form]
	);
	return rows[0].id;
}

/** Le style tel qu'il est en base (hors RLS), ou `undefined`. */
async function styleInDb(
	id: string
): Promise<{ name: string; description: string | null; owner_id: string | null } | undefined> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(
		'select name, description, owner_id from public.worksheet_styles where id = $1',
		[id]
	);
	return rows[0];
}

// ============================================================================
// SUITE
// ============================================================================

beforeAll(async () => {
	await cleanupAllTestData();
	const teacher = await TestData.profile().withRole('teacher').create();
	const admin = await TestData.profile().withRole('admin').create();
	const student = await TestData.profile().withRole('student').create();
	teacherId = teacher.id;
	adminId = admin.id;
	anonClient = createClient(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);
	teacherClient = await signedIn(teacher.email);
	adminClient = await signedIn(admin.email);
	studentClient = await signedIn(student.email);
	adminStyleId = await seedStyle(adminId, 'de l’admin');
});

afterAll(async () => {
	const pg = await getPostgresClient();
	await pg
		.query('delete from public.worksheets where title like $1', [`${RUN}%`])
		.catch(() => undefined);
	await pg
		.query('delete from public.worksheet_templates where name like $1', [`${RUN}%`])
		.catch(() => undefined);
	await pg
		.query('delete from public.worksheet_styles where name like $1', [`${RUN}%`])
		.catch(() => undefined);
	await cleanupAllTestData();
});

describe('Styles de fiche : accès (D9)', () => {
	describe('lecture', () => {
		it('un élève lit 0 style, même ceux de Chiphre', async () => {
			const { data, error } = await studentClient.from('worksheet_styles').select('id');
			expect(error).toBeNull();
			expect(data).toEqual([]);
		});

		it('un visiteur non connecté est refusé', async () => {
			const { data, error } = await anonClient.from('worksheet_styles').select('id');
			expect(data).toBeNull();
			expect(error?.code).toBe('42501');
		});

		it('le prof lit tous les styles de Chiphre et les siens, pas ceux de l’admin', async () => {
			const ownId = await seedStyle(teacherId, 'du prof');
			const { data, error } = await teacherClient.from('worksheet_styles').select('id');
			expect(error).toBeNull();
			const ids = (data ?? []).map((row: { id: string }) => row.id);
			for (const style of BUILT_IN_STYLES) expect(ids).toContain(style.id);
			expect(ids).toContain(ownId);
			expect(ids).not.toContain(adminStyleId);
		});
	});

	describe('écriture', () => {
		it('un élève ne peut pas créer de style', async () => {
			const { data } = await studentClient
				.from('worksheet_styles')
				.insert({ name: `${RUN} élève`, owner_id: null })
				.select('id');
			expect(data ?? []).toEqual([]);
			const pg = await getPostgresClient();
			const { rows } = await pg.query('select 1 from public.worksheet_styles where name = $1', [
				`${RUN} élève`
			]);
			expect(rows).toHaveLength(0);
		});

		it('le prof crée un style à son nom', async () => {
			const { data, error } = await teacherClient
				.from('worksheet_styles')
				.insert({ name: `${RUN} créé`, owner_id: teacherId })
				.select('id')
				.single();
			expect(error).toBeNull();
			expect((await styleInDb(data?.id))?.owner_id).toBe(teacherId);
		});

		it('un style au nom d’un autre, ou sans propriétaire, est refusé au prof', async () => {
			for (const owner of [adminId, null]) {
				const name = `${RUN} usurpé ${owner ?? 'chiphre'}`;
				const { error } = await teacherClient
					.from('worksheet_styles')
					.insert({ name, owner_id: owner })
					.select('id');
				expect(error).not.toBeNull();
				const pg = await getPostgresClient();
				const { rows } = await pg.query('select 1 from public.worksheet_styles where name = $1', [
					name
				]);
				expect(rows).toHaveLength(0);
			}
		});

		it('le prof modifie puis supprime son style', async () => {
			const id = await seedStyle(teacherId, 'à modifier');
			const { data: updated } = await teacherClient
				.from('worksheet_styles')
				.update({ description: 'Ma mise en page' })
				.eq('id', id)
				.select('id');
			expect(updated).toHaveLength(1);
			expect((await styleInDb(id))?.description).toBe('Ma mise en page');

			const { data: deleted } = await teacherClient
				.from('worksheet_styles')
				.delete()
				.eq('id', id)
				.select('id');
			expect(deleted).toHaveLength(1);
			expect(await styleInDb(id)).toBeUndefined();
		});

		it('un style de Chiphre ne bouge pas quand le prof le modifie ou le supprime', async () => {
			const before = await styleInDb(DEFAULT_STYLE_ID);
			const { data: updated } = await teacherClient
				.from('worksheet_styles')
				.update({ description: 'piratée' })
				.eq('id', DEFAULT_STYLE_ID)
				.select('id');
			expect(updated ?? []).toHaveLength(0);
			const { data: deleted } = await teacherClient
				.from('worksheet_styles')
				.delete()
				.eq('id', DEFAULT_STYLE_ID)
				.select('id');
			expect(deleted ?? []).toHaveLength(0);
			expect(await styleInDb(DEFAULT_STYLE_ID)).toEqual(before);
		});

		it('le prof ne modifie pas le style de l’admin', async () => {
			const { data } = await teacherClient
				.from('worksheet_styles')
				.update({ description: 'piratée' })
				.eq('id', adminStyleId)
				.select('id');
			expect(data ?? []).toHaveLength(0);
			expect((await styleInDb(adminStyleId))?.description).toBeNull();
		});

		it('l’admin peut tout faire : style de Chiphre, style du prof, création', async () => {
			const before = await styleInDb(DEFAULT_STYLE_ID);
			const { data: chiphre } = await adminClient
				.from('worksheet_styles')
				.update({ description: `${RUN} admin` })
				.eq('id', DEFAULT_STYLE_ID)
				.select('id');
			expect(chiphre).toHaveLength(1);
			const pg = await getPostgresClient();
			await pg.query('update public.worksheet_styles set description = $1 where id = $2', [
				before?.description,
				DEFAULT_STYLE_ID
			]);

			const teacherStyleId = await seedStyle(teacherId, 'revu par l’admin');
			const { data: teacherStyle } = await adminClient
				.from('worksheet_styles')
				.update({ description: 'revue par l’admin' })
				.eq('id', teacherStyleId)
				.select('id');
			expect(teacherStyle).toHaveLength(1);
			expect((await styleInDb(teacherStyleId))?.description).toBe('revue par l’admin');

			const { data: created, error } = await adminClient
				.from('worksheet_styles')
				.insert({ name: `${RUN} admin`, owner_id: null })
				.select('id')
				.single();
			expect(error).toBeNull();
			expect((await styleInDb(created?.id))?.owner_id).toBeNull();
		});
	});
});

describe('Styles de fiche : contraintes', () => {
	it('un deuxième gabarit pour le même (style, forme) est refusé', async () => {
		const styleId = await seedStyle(teacherId, 'unicité');
		await seedTemplate(styleId, 'correction', teacherId);
		await expect(seedTemplate(styleId, 'correction', teacherId)).rejects.toThrow(
			/unique|duplicate/i
		);
		await expect(seedTemplate(styleId, 'answers', teacherId)).resolves.toBeTruthy();
	});

	it('une forme inconnue est refusée', async () => {
		const styleId = await seedStyle(teacherId, 'forme inconnue');
		await expect(seedTemplate(styleId, 'brouillon', teacherId)).rejects.toThrow(/check|violates/i);
	});

	it('supprimer un style : ses gabarits partent, la fiche revient au style par défaut', async () => {
		const pg = await getPostgresClient();
		const styleId = await seedStyle(teacherId, 'supprimé');
		const templateId = await seedTemplate(styleId, 'worksheet', teacherId);
		const { rows } = await pg.query(
			`insert into public.worksheets (title, type, status, created_by, style_id)
			 values ($1, 'worksheet', 'draft', $2, $3) returning id`,
			[`${RUN} fiche`, teacherId, styleId]
		);
		const worksheetId = rows[0].id;

		await pg.query('delete from public.worksheet_styles where id = $1', [styleId]);

		const sheet = await pg.query('select style_id from public.worksheets where id = $1', [
			worksheetId
		]);
		expect(sheet.rows[0].style_id).toBeNull();
		const template = await pg.query('select 1 from public.worksheet_templates where id = $1', [
			templateId
		]);
		expect(template.rows).toHaveLength(0);
	});
});

// Une clé étrangère se vérifie hors RLS : sans garde, le prof rattacherait sa
// fiche ou son gabarit à un style qui n'est pas le sien (audit du lot 3a).
describe('Styles de fiche : rattachement par le prof', () => {
	async function teacherTemplate(): Promise<string> {
		const pg = await getPostgresClient();
		const { rows } = await pg.query(
			`insert into public.worksheet_templates (name, template_content, created_by)
			 values ($1, $2, $3) returning id`,
			[`${RUN} gabarit libre`, TYPST, teacherId]
		);
		return rows[0].id;
	}

	async function teacherWorksheet(): Promise<string> {
		const pg = await getPostgresClient();
		const { rows } = await pg.query(
			`insert into public.worksheets (title, type, status, created_by)
			 values ($1, 'worksheet', 'draft', $2) returning id`,
			[`${RUN} fiche du prof`, teacherId]
		);
		return rows[0].id;
	}

	async function templateStyle(id: string): Promise<string | null> {
		const pg = await getPostgresClient();
		const { rows } = await pg.query(
			'select style_id from public.worksheet_templates where id = $1',
			[id]
		);
		return rows[0].style_id;
	}

	async function worksheetStyle(id: string): Promise<string | null> {
		const pg = await getPostgresClient();
		const { rows } = await pg.query('select style_id from public.worksheets where id = $1', [id]);
		return rows[0].style_id;
	}

	it('son gabarit ne rejoint ni un style de Chiphre, ni le style de l’admin', async () => {
		const templateId = await teacherTemplate();
		for (const styleId of [DEFAULT_STYLE_ID, adminStyleId]) {
			const { error } = await teacherClient
				.from('worksheet_templates')
				.update({ style_id: styleId, form: 'answers' })
				.eq('id', templateId)
				.select('id');
			expect(error).not.toBeNull();
			expect(await templateStyle(templateId)).toBeNull();
		}
	});

	it('son gabarit rejoint son propre style', async () => {
		const templateId = await teacherTemplate();
		const styleId = await seedStyle(teacherId, 'rattachement');
		const { data, error } = await teacherClient
			.from('worksheet_templates')
			.update({ style_id: styleId, form: 'answers' })
			.eq('id', templateId)
			.select('id');
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect(await templateStyle(templateId)).toBe(styleId);
	});

	it('sa fiche ne prend pas le style de l’admin', async () => {
		const worksheetId = await teacherWorksheet();
		const { error } = await teacherClient
			.from('worksheets')
			.update({ style_id: adminStyleId })
			.eq('id', worksheetId)
			.select('id');
		expect(error).not.toBeNull();
		expect(await worksheetStyle(worksheetId)).toBeNull();
	});

	it('sa fiche prend un style de Chiphre ou le sien', async () => {
		const worksheetId = await teacherWorksheet();
		const ownStyleId = await seedStyle(teacherId, 'pour la fiche');
		for (const styleId of [DEFAULT_STYLE_ID, ownStyleId]) {
			const { data, error } = await teacherClient
				.from('worksheets')
				.update({ style_id: styleId })
				.eq('id', worksheetId)
				.select('id');
			expect(error).toBeNull();
			expect(data).toHaveLength(1);
			expect(await worksheetStyle(worksheetId)).toBe(styleId);
		}
	});

	it('sa fiche prend « 2 colonnes - paysage », par son style et par son gabarit', async () => {
		// L'API remplit `template_id` avec l'identifiant d'un style de Chiphre
		const worksheetId = await teacherWorksheet();
		const styleId = DEFAULT_TEMPLATE_IDS.studentStyleLandscape;
		const { data, error } = await teacherClient
			.from('worksheets')
			.update({ style_id: styleId, template_id: styleId })
			.eq('id', worksheetId)
			.select('id');
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect(await worksheetStyle(worksheetId)).toBe(styleId);
	});
});

describe('Styles de fiche : données', () => {
	it('les styles de Chiphre en base : mêmes identifiants, mêmes noms que dans le code', async () => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query(
			'select id, name, description from public.worksheet_styles where owner_id is null order by id'
		);
		const inDb = rows.filter((row: { name: string }) => !row.name.startsWith('itest-'));
		expect(inDb).toEqual(
			BUILT_IN_STYLES.map((style) => ({
				id: style.id,
				name: style.name,
				description: style.description
			})).sort((a, b) => a.id.localeCompare(b.id))
		);
	});

	it('chaque gabarit de Chiphre est la forme « fiche » de son style', async () => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query(
			`select id, style_id, form from public.worksheet_templates
			 where id = any($1::uuid[]) order by id`,
			[BUILT_IN_STYLES.map((style) => style.id)]
		);
		expect(rows).toHaveLength(BUILT_IN_STYLES.length);
		for (const row of rows) {
			expect(row.style_id).toBe(row.id);
			expect(row.form).toBe('worksheet');
		}
	});
});
