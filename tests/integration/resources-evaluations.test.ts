/**
 * La vue `resources` lit les évaluations (chantier 4) — tests d'intégration
 * =========================================================================
 *
 * Migration `20260930140000_resources_evaluations.sql`. La branche
 * `kind = 'assessment'` de la vue lit `evaluations` jointe à `series` au lieu
 * d'`assessments`. Question d'accès tranchée par David (Q22) : AUCUN accès
 * nouveau. Vue `security_invoker` : prof propriétaire + admin voient leurs
 * évaluations ; un élève ne voit que les évaluations PUBLIÉES qui lui sont
 * assignées ; anon rien.
 *
 * DOIVENT échouer sans la migration (« le prof voit sa nouvelle évaluation »).
 * `pnpm db:start` puis
 * `pnpm test:integration tests/integration/resources-evaluations.test.ts`.
 *
 * Les tables `series` / `evaluations` ne sont pas encore dans `database.ts`
 * (généré depuis la prod) : clients non typés.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';

// Types
type Person = { id: string; client: SupabaseClient };
type Created = { seriesId: string; evaluationId: string };
type ResourceRow = {
	kind: string;
	id: string;
	title: string;
	subtitle: string | null;
	grades: string[] | null;
	status: string | null;
	is_public: boolean;
	owner_id: string | null;
	slug: string | null;
	updated_at: string | null;
};

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_KEY =
	process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const CATEGORIES = [{ category: 'entiers/1', quantity: 2, delay: 20 }];
/** Titre commun, introuvable ailleurs : sert d'aiguille à `search_resources`. */
const NEEDLE = 'Qwxzv catalogue';
/** Les autres branches de la vue et la table qu'elles lisent (une ligne par ligne). */
const OTHER_KINDS: [kind: string, table: string][] = [
	['exercise', 'exercises'],
	['worksheet', 'worksheets'],
	['question', 'question_templates'],
	['chapter', 'class_chapters'],
	['python_exercise', 'python_exercises'],
	['python_notebook', 'python_notebooks'],
	['construction', 'constructions'],
	['document', 'rag_documents']
];

// Variables
/** Pose le décor et relit la vérité, hors RLS. */
const service = createClient(SUPABASE_URL, SERVICE_KEY, {
	auth: { persistSession: false, autoRefreshToken: false }
});
const anon = createClient(SUPABASE_URL, ANON_KEY, {
	auth: { persistSession: false, autoRefreshToken: false }
});

let teacher: Person;
let admin: Person;
/** Membre actif de K1, destinataire (via K1) de `published` et `draft`. */
let studentIn: Person;
/** Membre actif de K2, destinataire de rien. */
let studentOut: Person;

let published: Created;
let draft: Created;

// Functions
async function signIn(email: string): Promise<SupabaseClient> {
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

async function person(role: 'student' | 'teacher' | 'admin'): Promise<Person> {
	const profile = await TestData.profile().withRole(role).create();
	return { id: profile.id, client: await signIn(profile.email) };
}

/** Série + évaluation posées par le service, au nom du prof, assignées à une classe. */
async function createEvaluation(
	status: 'draft' | 'published',
	title: string,
	classId: string
): Promise<Created> {
	const { data: series, error: seriesError } = await service
		.from('series')
		.insert({
			title,
			description: `Description de ${title}`,
			grade: '5',
			categories: CATEGORIES,
			created_by: teacher.id
		})
		.select('id')
		.single();
	expect(seriesError, 'décor : série').toBeNull();
	const { data: evaluation, error: evaluationError } = await service
		.from('evaluations')
		.insert({ series_id: series!.id, form: 'interactive', status, created_by: teacher.id })
		.select('id')
		.single();
	expect(evaluationError, 'décor : évaluation').toBeNull();
	const { error } = await service.from('evaluation_assignments').insert({
		evaluation_id: evaluation!.id,
		assigned_by: teacher.id,
		class_id: classId
	});
	expect(error, 'décor : assignation').toBeNull();
	return { seriesId: series!.id, evaluationId: evaluation!.id };
}

/** Les ids d'évaluation visibles par `client` dans la vue (kind 'assessment'). */
async function viewIds(client: SupabaseClient): Promise<string[]> {
	const { data, error } = await client
		.from('resources')
		.select('id')
		.eq('kind', 'assessment')
		.in('id', [published.evaluationId, draft.evaluationId]);
	expect(error).toBeNull();
	return (data ?? []).map((row: { id: string }) => row.id).sort();
}

/** Les ids d'évaluation rendus par `search_resources` à `client`. */
async function searchIds(client: SupabaseClient): Promise<string[]> {
	const { data, error } = await client.rpc('search_resources', {
		p_query: NEEDLE,
		p_kinds: ['assessment']
	});
	expect(error).toBeNull();
	return ((data ?? []) as ResourceRow[]).map((row) => row.id).sort();
}

describe('vue resources : branche évaluations (20260930140000)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();

		teacher = await person('teacher');
		admin = await person('admin');
		studentIn = await person('student');
		studentOut = await person('student');

		const k1 = await TestData.class().withName('5e A catalogue ZZ').create();
		const k2 = await TestData.class().withName('5e B catalogue ZZ').create();
		const { error } = await service.from('class_members').insert([
			{ class_id: k1.id, student_id: studentIn.id, status: 'active' },
			{ class_id: k2.id, student_id: studentOut.id, status: 'active' }
		]);
		expect(error, 'décor : inscriptions').toBeNull();

		published = await createEvaluation('published', `${NEEDLE} publiée`, k1.id);
		draft = await createEvaluation('draft', `${NEEDLE} brouillon`, k1.id);
	}, 180_000);

	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('le prof voit sa nouvelle évaluation dans la vue, colonnes issues de la série', async () => {
		const { data, error } = await teacher.client
			.from('resources')
			.select('*')
			.eq('id', published.evaluationId)
			.single();
		expect(error).toBeNull();
		const row = data as ResourceRow;
		expect(row.kind).toBe('assessment');
		expect(row.id).toBe(published.evaluationId);
		expect(row.title).toBe(`${NEEDLE} publiée`);
		expect(row.subtitle).toBe(`Description de ${NEEDLE} publiée`);
		expect(row.grades).toEqual(['5']);
		expect(row.status).toBe('published');
		expect(row.is_public).toBe(false);
		expect(row.owner_id).toBe(teacher.id);
		expect(row.slug).toBeNull();
		expect(await viewIds(teacher.client)).toEqual(
			[published.evaluationId, draft.evaluationId].sort()
		);
	});

	it('updated_at = le plus récent de la série et de l’évaluation', async () => {
		// Le trigger update_updated_at_column ré-écrit updated_at sur UPDATE :
		// on lit donc les deux valeurs réelles plutôt que d'en imposer une.
		const { error: e1 } = await service
			.from('series')
			.update({ description: `Description de ${NEEDLE} publiée` })
			.eq('id', published.seriesId);
		expect(e1).toBeNull();
		const { data: s } = await service
			.from('series')
			.select('updated_at')
			.eq('id', published.seriesId)
			.single();
		const { data: ev } = await service
			.from('evaluations')
			.select('updated_at')
			.eq('id', published.evaluationId)
			.single();
		const expected = [s!.updated_at as string, ev!.updated_at as string]
			.map((value) => new Date(value).getTime())
			.reduce((a, b) => Math.max(a, b));
		const { data } = await teacher.client
			.from('resources')
			.select('updated_at')
			.eq('id', published.evaluationId)
			.single();
		expect(new Date((data as ResourceRow).updated_at!).getTime()).toBe(expected);
	});

	it('le prof la trouve aussi par search_resources', async () => {
		expect(await searchIds(teacher.client)).toEqual(
			[published.evaluationId, draft.evaluationId].sort()
		);
	});

	it('l’admin voit les évaluations du prof', async () => {
		expect(await viewIds(admin.client)).toEqual(
			[published.evaluationId, draft.evaluationId].sort()
		);
	});

	it('l’élève destinataire voit l’évaluation publiée, pas le brouillon', async () => {
		expect(await viewIds(studentIn.client)).toEqual([published.evaluationId]);
		expect(await searchIds(studentIn.client)).toEqual([published.evaluationId]);
	});

	it('l’élève non destinataire ne voit rien', async () => {
		expect(await viewIds(studentOut.client)).toEqual([]);
		expect(await searchIds(studentOut.client)).toEqual([]);
	});

	it('anon ne lit ni la vue ni la recherche', async () => {
		const { data: rows, error: viewError } = await anon
			.from('resources')
			.select('id')
			.eq('id', published.evaluationId);
		// Aucun droit sur la vue : refus explicite, ou zéro ligne — jamais la ligne.
		expect(viewError !== null || (rows ?? []).length === 0).toBe(true);
		expect(rows ?? []).toEqual([]);
		const { data, error } = await anon.rpc('search_resources', {
			p_query: NEEDLE,
			p_kinds: ['assessment']
		});
		expect(error).not.toBeNull();
		expect(data).toBeNull();
	});

	it('les autres branches sont inchangées : une ligne de vue par ligne de table', async () => {
		for (const [kind, table] of OTHER_KINDS) {
			const { count: inView, error: e1 } = await service
				.from('resources')
				.select('id', { count: 'exact', head: true })
				.eq('kind', kind);
			expect(e1, kind).toBeNull();
			const { count: inTable, error: e2 } = await service
				.from(table)
				.select('id', { count: 'exact', head: true });
			expect(e2, table).toBeNull();
			expect(inView, `${kind} ↔ ${table}`).toBe(inTable);
		}
	});

	it('la branche assessment compte exactement les évaluations (plus les assessments)', async () => {
		const { count: inView } = await service
			.from('resources')
			.select('id', { count: 'exact', head: true })
			.eq('kind', 'assessment');
		const { count: inTable } = await service
			.from('evaluations')
			.select('id', { count: 'exact', head: true });
		expect(inView).toBe(inTable);
	});
});
