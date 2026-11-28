/**
 * Catégorie et notions d'une fiche (ADR 0041)
 * ============================================
 *
 * Migrations : 20261119173341_categorie_notions_fiche.sql,
 * 20261119182829_titre_libre_fiche.sql (case « titre libre »)
 *
 * Décisions de David (2026-11-19) :
 * - catégorie de fiche, liste fermée, fiche d'exercices seulement :
 *   Entraînement technique · Applications · Automatismes · Révisions ;
 * - notions de l'arbre (notion ou sous-notion) : autant qu'on veut, pour
 *   tout type de fiche (la règle « une seule, sauf Révisions et Automatismes »
 *   a été retirée le 2026-11-19 : 20261119…_plusieurs_notions_fiche.sql) ;
 * - question d'accès : le prof (et l'admin) lit et écrit les notions de SES fiches ; on lit
 *   les notions d'une fiche quand on lit la fiche (élève à qui elle est donnée) ;
 *   le visiteur d'un lien de partage reçoit catégorie et notions de la fiche
 *   citée.
 *
 * Le prof et l'élève agissent avec leur client CONNECTÉ (la RLS échoue en
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
import { resolveCourseWorksheetByShareToken } from '#lib/server/course-share-tokens.ts';
import { resolveWorksheetByShareToken } from '#lib/server/journal-share-tokens.ts';

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };

const RUN = `itest-categorie-fiche-${Date.now().toString(36)}`;
const JOURNAL_TOKEN = `catfichecahier${Date.now().toString(36)}abcdefghij`.slice(0, 32);
const COURSE_TOKEN = `catfichecours${Date.now().toString(36)}abcdefghijk`.slice(0, 32);

// ============================================================================
// TYPES
// ============================================================================

interface SharedClassification {
	node_id: string;
	name: string;
	translations?: unknown;
	kind: string;
	position: number;
}

interface SharedWorksheet {
	custom_title: boolean;
	category: string | null;
	classifications: SharedClassification[];
	[key: string]: unknown;
}

// ============================================================================
// VARIABLES
// ============================================================================

let teacherId: string;
let teacherClient: SupabaseClient;
let adminClient: SupabaseClient;
let studentClient: SupabaseClient;
let outsiderStudentClient: SupabaseClient;
let visitor: SupabaseClient;

let branchId: string;
let suitesId: string;
let derivationId: string;
let probabilitesId: string;

/** Fiche d'exercices donnée à la classe de l'élève, citée dans le cahier et le cours */
let worksheetId: string;
/** Évaluation du même prof */
let assessmentId: string;

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

async function worksheet(type: string, category: string | null = null): Promise<string> {
	const [{ id }] = await sql(
		`insert into public.worksheets (title, type, status, created_by, category)
		 values ($1, $2, 'draft', $3, $4) returning id`,
		[RUN, type, teacherId, category]
	);
	return id as string;
}

/** Les notions de la fiche, lues en superutilisateur, dans l'ordre */
async function nodesInDb(id: string): Promise<string[]> {
	const rows = await sql(
		`select node_id from public.worksheet_classifications
		 where worksheet_id = $1 order by position, node_id`,
		[id]
	);
	return rows.map((row) => row.node_id as string);
}

async function resetNodes(id: string, nodeIds: string[] = []): Promise<void> {
	await sql('delete from public.worksheet_classifications where worksheet_id = $1', [id]);
	for (const [position, nodeId] of nodeIds.entries()) {
		await sql(
			`insert into public.worksheet_classifications (worksheet_id, node_id, position)
			 values ($1, $2, $3)`,
			[id, nodeId, position]
		);
	}
}

/** Ajout d'une notion par un client connecté : code d'erreur Postgres, ou null */
async function addNode(
	client: SupabaseClient,
	id: string,
	nodeId: string,
	position = 0
): Promise<string | null> {
	const { error } = await client
		.from('worksheet_classifications')
		.insert({ worksheet_id: id, node_id: nodeId, position })
		.select('node_id');
	return error ? (error.code ?? 'erreur') : null;
}

async function setCategory(id: string, category: string | null): Promise<string | null> {
	const { data, error } = await teacherClient
		.from('worksheets')
		.update({ category })
		.eq('id', id)
		.select('id');
	if (error) return error.code ?? 'erreur';
	// Un refus de la RLS rendrait 0 ligne sans erreur : il fausserait le test
	expect(data).toHaveLength(1);
	return null;
}

async function categoryInDb(id: string): Promise<unknown> {
	const [row] = await sql('select category from public.worksheets where id = $1', [id]);
	return row?.category;
}

async function readNodes(client: SupabaseClient, id: string): Promise<string[]> {
	const { data, error } = await client
		.from('worksheet_classifications')
		.select('node_id')
		.eq('worksheet_id', id);
	expect(error).toBeNull();
	return (data ?? []).map((row: { node_id: string }) => row.node_id);
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
	teacherId = teacher.id;
	teacherClient = await signedIn(teacher.email);
	const admin = await TestData.profile().withRole('admin').create();
	adminClient = await signedIn(admin.email);
	const student = await TestData.profile().withRole('student').create();
	studentClient = await signedIn(student.email);
	const outsider = await TestData.profile().withRole('student').create();
	outsiderStudentClient = await signedIn(outsider.email);

	branchId = await node('branch', null, `${RUN} branche`);
	suitesId = await node('notion', branchId, `${RUN} Suites`);
	derivationId = await node('notion', branchId, `${RUN} Dérivation`);
	probabilitesId = await node('notion', branchId, `${RUN} Probabilités`);

	worksheetId = await worksheet('worksheet', 'review');
	assessmentId = await worksheet('assessment');

	// L'élève est dans la classe à qui la fiche est donnée (depuis hier)
	const classId = ((await TestData.class().create()) as { id: string }).id;
	await sql(
		`insert into public.class_members (class_id, student_id, status, joined_at)
		 values ($1, $2, 'active', now() - interval '3 days')`,
		[classId, student.id]
	);
	const [{ id: assignmentId }] = await sql(
		`insert into public.worksheet_assignments (worksheet_id, created_by, status, available_from)
		 values ($1, $2, 'active', now() - interval '1 day') returning id`,
		[worksheetId, teacherId]
	);
	await sql(
		'insert into public.worksheet_assignment_classes (assignment_id, class_id) values ($1, $2)',
		[assignmentId, classId]
	);

	// Liens de partage : fiche citée au cahier, publiée dans un chapitre visible
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
	await sql(`delete from public.classification_nodes where name like $1 and kind <> 'branch'`, [
		`${RUN}%`
	]).catch(() => undefined);
	await sql('delete from public.classification_nodes where id = $1', [branchId]).catch(
		() => undefined
	);
	await cleanupAllTestData();
});

describe('catégorie de la fiche', () => {
	it.each(['technical_practice', 'applications', 'automatisms', 'review'])(
		'le prof pose la catégorie %s sur sa fiche d’exercices',
		async (category) => {
			const id = await worksheet('worksheet');
			expect(await setCategory(id, category)).toBeNull();
			expect(await categoryInDb(id)).toBe(category);
		}
	);

	it('refuse une catégorie hors liste (23514)', async () => {
		const id = await worksheet('worksheet', 'applications');
		expect(await setCategory(id, 'preparation')).toBe('23514');
		expect(await categoryInDb(id)).toBe('applications');
	});

	it.each(['assessment', 'exam', 'quiz', 'homework'])(
		'refuse une catégorie sur un(e) %s (23514)',
		async (type) => {
			const id = await worksheet(type);
			expect(await setCategory(id, 'review')).toBe('23514');
			expect(await categoryInDb(id)).toBeNull();
		}
	);
});

describe('notions : plusieurs pour toute fiche (ADR 0041, amendé le 2026-11-19)', () => {
	it.each([null, 'technical_practice', 'applications', 'review', 'automatisms'])(
		'fiche d’exercices (%s) : plusieurs notions acceptées, dans l’ordre',
		async (category) => {
			const id = await worksheet('worksheet', category);
			expect(await addNode(teacherClient, id, suitesId, 0)).toBeNull();
			expect(await addNode(teacherClient, id, derivationId, 1)).toBeNull();
			expect(await addNode(teacherClient, id, probabilitesId, 2)).toBeNull();
			expect(await nodesInDb(id)).toEqual([suitesId, derivationId, probabilitesId]);
		}
	);

	it.each(['assessment', 'exam', 'quiz', 'homework'])(
		'%s : plusieurs notions acceptées, sans catégorie',
		async (type) => {
			const id = await worksheet(type);
			expect(await addNode(teacherClient, id, suitesId, 0)).toBeNull();
			expect(await addNode(teacherClient, id, derivationId, 1)).toBeNull();
			expect(await nodesInDb(id)).toEqual([suitesId, derivationId]);
		}
	);

	it('Révisions à deux notions → Entraînement technique : accepté, notions gardées', async () => {
		const id = await worksheet('worksheet', 'review');
		await resetNodes(id, [suitesId, derivationId]);
		expect(await setCategory(id, 'technical_practice')).toBeNull();
		expect(await categoryInDb(id)).toBe('technical_practice');
		expect(await nodesInDb(id)).toEqual([suitesId, derivationId]);
	});

	it('évaluation à deux notions → fiche d’exercices : accepté', async () => {
		const id = await worksheet('assessment');
		await resetNodes(id, [suitesId, derivationId]);
		const { error } = await teacherClient
			.from('worksheets')
			.update({ type: 'worksheet' })
			.eq('id', id)
			.select('id');
		expect(error).toBeNull();
		const [row] = await sql('select type from public.worksheets where id = $1', [id]);
		expect(row?.type).toBe('worksheet');
		expect(await nodesInDb(id)).toEqual([suitesId, derivationId]);
	});

	it('refuse une branche : notion ou sous-notion seulement', async () => {
		const id = await worksheet('worksheet', 'applications');
		expect(await addNode(teacherClient, id, branchId)).toBe('23514');
		expect(await nodesInDb(id)).toEqual([]);
	});
});

describe('qui écrit les notions', () => {
	it('l’admin pose une notion sur la fiche du prof (comme il modifie la fiche)', async () => {
		const id = await worksheet('assessment');
		expect(await addNode(adminClient, id, suitesId)).toBeNull();
		expect(await nodesInDb(id)).toEqual([suitesId]);
	});

	it('un élève ne peut pas poser de notion sur une fiche qu’il ne lit pas', async () => {
		const id = await worksheet('assessment');
		expect(await addNode(outsiderStudentClient, id, suitesId)).toBe('42501');
		expect(await nodesInDb(id)).toEqual([]);
	});

	it('l’élève ne peut pas poser de notion sur la fiche qu’on lui a donnée', async () => {
		await resetNodes(worksheetId, []);
		expect(await addNode(studentClient, worksheetId, suitesId)).toBe('42501');
		expect(await nodesInDb(worksheetId)).toEqual([]);
	});

	it('l’élève ne peut pas retirer une notion de la fiche qu’on lui a donnée', async () => {
		const id = worksheetId;
		await resetNodes(id, [suitesId]);
		const { data } = await studentClient
			.from('worksheet_classifications')
			.delete()
			.eq('worksheet_id', id)
			.select('node_id');
		expect(data ?? []).toHaveLength(0);
		expect(await nodesInDb(id)).toEqual([suitesId]);
	});
});

describe('qui lit les notions', () => {
	beforeAll(async () => {
		await resetNodes(worksheetId, [suitesId, derivationId]);
		await resetNodes(assessmentId, [probabilitesId]);
	});

	it('le prof lit les notions de ses fiches', async () => {
		expect((await readNodes(teacherClient, worksheetId)).sort()).toEqual(
			[suitesId, derivationId].sort()
		);
		expect(await readNodes(teacherClient, assessmentId)).toEqual([probabilitesId]);
	});

	it('l’élève lit les notions de la fiche qu’on lui a donnée, pas des autres', async () => {
		expect((await readNodes(studentClient, worksheetId)).sort()).toEqual(
			[suitesId, derivationId].sort()
		);
		expect(await readNodes(studentClient, assessmentId)).toEqual([]);
	});

	it('un élève sans la fiche ne lit rien', async () => {
		expect(await readNodes(outsiderStudentClient, worksheetId)).toEqual([]);
	});

	it('l’admin lit les notions', async () => {
		expect((await readNodes(adminClient, worksheetId)).sort()).toEqual(
			[suitesId, derivationId].sort()
		);
	});

	it('anon ne lit pas la table', async () => {
		const { data, error } = await visitor
			.from('worksheet_classifications')
			.select('node_id')
			.eq('worksheet_id', worksheetId);
		// Aucun droit pour anon (privilèges par défaut sans anon) : refus franc
		expect(error?.code).toBe('42501');
		expect(data).toBeNull();
	});
});

describe('liens de partage : catégorie et notions de la fiche citée', () => {
	beforeAll(async () => {
		// Ordre d'impression : Dérivation puis Suites
		await resetNodes(worksheetId, [derivationId, suitesId]);
	});

	it.each([
		['cahier de texte', viaJournal],
		['cours partagé', viaCourse]
	] as const)('%s : catégorie et notions dans l’ordre', async (_label, open) => {
		const shared = await open();
		expect(shared).not.toBeNull();
		expect(shared?.category).toBe('review');
		expect(shared?.classifications).toEqual([
			{
				node_id: derivationId,
				name: `${RUN} Dérivation`,
				// Noms anglais du nœud (ADR 0043) : aucun ici
				translations: {},
				kind: 'notion',
				position: 0
			},
			{ node_id: suitesId, name: `${RUN} Suites`, translations: {}, kind: 'notion', position: 1 }
		]);
	});

	it.each([
		[
			'cahier de texte',
			() => resolveWorksheetByShareToken(visitor as never, JOURNAL_TOKEN, worksheetId)
		],
		[
			'cours partagé',
			() => resolveCourseWorksheetByShareToken(visitor as never, COURSE_TOKEN, worksheetId)
		]
	] as const)(
		'%s : la lecture côté serveur garde catégorie, case et notions (le PDF du lien)',
		async (_label, open) => {
			const shared = (await open()) as unknown as SharedWorksheet | null;
			expect(shared).toMatchObject({
				category: 'review',
				custom_title: expect.any(Boolean),
				classifications: [
					{ node_id: derivationId, name: `${RUN} Dérivation`, position: 0 },
					{ node_id: suitesId, name: `${RUN} Suites`, position: 1 }
				]
			});
		}
	);

	it.each([
		['cahier de texte', viaJournal],
		['cours partagé', viaCourse]
	] as const)('%s : fiche sans notion → liste vide', async (_label, open) => {
		await resetNodes(worksheetId, []);
		const shared = await open();
		expect(shared?.classifications).toEqual([]);
		await resetNodes(worksheetId, [derivationId, suitesId]);
	});
});

describe('titre libre : la case qui dit si le titre est écrit à la main', () => {
	async function customTitleInDb(id: string): Promise<unknown> {
		const [row] = await sql('select custom_title from public.worksheets where id = $1', [id]);
		return row?.custom_title;
	}

	async function setCustomTitle(id: string, value: boolean): Promise<void> {
		const { data, error } = await teacherClient
			.from('worksheets')
			.update({ custom_title: value })
			.eq('id', id)
			.select('id');
		expect(error).toBeNull();
		// Un refus de la RLS rendrait 0 ligne sans erreur
		expect(data).toHaveLength(1);
	}

	it('une fiche créée sans préciser la case a un titre libre', async () => {
		const id = await worksheet('worksheet');
		expect(await customTitleInDb(id)).toBe(true);
	});

	it('le prof passe sa fiche en titre composé, puis en titre libre', async () => {
		const id = await worksheet('worksheet', 'applications');
		await setCustomTitle(id, false);
		expect(await customTitleInDb(id)).toBe(false);
		await setCustomTitle(id, true);
		expect(await customTitleInDb(id)).toBe(true);
	});

	it('l’élève lit la case de la fiche qu’on lui a donnée, pas un élève sans la fiche', async () => {
		await sql('update public.worksheets set custom_title = false where id = $1', [worksheetId]);
		const { data } = await studentClient
			.from('worksheets')
			.select('custom_title')
			.eq('id', worksheetId);
		expect(data).toEqual([{ custom_title: false }]);
		const { data: outsider } = await outsiderStudentClient
			.from('worksheets')
			.select('custom_title')
			.eq('id', worksheetId);
		expect(outsider ?? []).toEqual([]);
	});

	it('l’élève ne peut pas changer la case de la fiche qu’on lui a donnée', async () => {
		await sql('update public.worksheets set custom_title = false where id = $1', [worksheetId]);
		const { data, error } = await studentClient
			.from('worksheets')
			.update({ custom_title: true })
			.eq('id', worksheetId)
			.select('id');
		// Refus de la RLS : aucune erreur, zéro ligne
		expect(error).toBeNull();
		expect(data).toEqual([]);
		expect(await customTitleInDb(worksheetId)).toBe(false);
	});

	it.each([
		['cahier de texte', viaJournal],
		['cours partagé', viaCourse]
	] as const)('%s : le lien de partage transmet la case', async (_label, open) => {
		await sql('update public.worksheets set custom_title = false where id = $1', [worksheetId]);
		expect((await open())?.custom_title).toBe(false);
		await sql('update public.worksheets set custom_title = true where id = $1', [worksheetId]);
		expect((await open())?.custom_title).toBe(true);
	});
});
