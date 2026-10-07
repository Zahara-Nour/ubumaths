/**
 * Arbre des notions — base de données (Supabase local requis)
 * ===========================================================
 *
 * Migration `<horodatage>_arbre_des_notions` (ADR 0019, 0020) :
 *   - `classification_nodes` : arbre branche > notion > sous-notion, SANS
 *     niveaux scolaires (ADR 0020 : les niveaux vivent dans la couche
 *     programme, qui pointera les nœuds) ;
 *   - `source_types` : liste fermée des types de source d'exercice ;
 *   - `exercises.source_type_id`, `question_templates.classification_node_id` ;
 *   - `exercise_classifications` : rangement d'un exercice dans un ou plusieurs
 *     nœuds (notion ou sous-notion), au plus un principal.
 *
 * Accès tranché par David (2026-10-07) :
 *   - arbre et types de source lisibles par TOUS (anon compris, archivés compris) ;
 *     écriture par l'admin seul ;
 *   - rangement d'un exercice : lisible si l'exercice l'est ; écrit avec les
 *     mêmes droits que la modification de l'exercice (prof auteur).
 *
 * Chaque refus est mesuré par son CODE (42501, 23514, 23505, 23503) ou par la
 * relecture de la ligne (une écriture refusée par la RLS rend zéro ligne, sans
 * erreur — cf. docs/ref/rls-echecs-silencieux.md).
 *
 * Les tables neuves ne sont pas encore dans `database.ts` (généré depuis la
 * production) : les clients sont donc créés sans le type `Database`.
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
// TYPES
// ============================================================================

type NodeKind = 'branch' | 'notion' | 'subnotion';

interface NodeRow {
	id: string;
	kind: NodeKind;
	parent_id: string | null;
	name: string;
	position: number;
	archived_at: string | null;
}

interface NodeInput {
	kind: NodeKind;
	name: string;
	parent_id?: string | null;
	archived_at?: string | null;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_KEY =
	process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

/** Préfixe unique à ce run : tous les noms créés le portent (nettoyage ciblé). */
const TAG = `itest-arbre-${Date.now().toString(36)}`;

const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };

// ============================================================================
// VARIABLES
// ============================================================================

let service: SupabaseClient;
let anon: SupabaseClient;
let adminClient: SupabaseClient;
let teacherClient: SupabaseClient;
let studentClient: SupabaseClient;

let adminId: string;
let teacherId: string;

const createdExerciseIds: string[] = [];
const createdTemplateIds: string[] = [];

// ============================================================================
// FONCTIONS
// ============================================================================

function name(suffix: string): string {
	return `${TAG} ${suffix}`;
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

/** Insère un nœud par le service role (contourne la RLS, PAS les contraintes ni triggers). */
async function insertNode(input: NodeInput) {
	return service
		.from('classification_nodes')
		.insert({ parent_id: null, ...input })
		.select('id, kind, parent_id, name, position, archived_at')
		.single<NodeRow>();
}

/** Comme `insertNode`, mais échoue bruyamment : pour poser le décor. */
async function seedNode(input: NodeInput): Promise<NodeRow> {
	const { data, error } = await insertNode(input);
	if (error || !data) throw new Error(`décor : nœud « ${input.name} » refusé : ${error?.message}`);
	return data;
}

async function readNodeName(id: string): Promise<string | null> {
	const { data, error } = await service
		.from('classification_nodes')
		.select('name')
		.eq('id', id)
		.maybeSingle<{ name: string }>();
	if (error) throw error;
	return data?.name ?? null;
}

async function seedExercise(createdBy: string, isPublic: boolean): Promise<string> {
	const exercise = await TestData.exercise(createdBy).create();
	createdExerciseIds.push(exercise.id);
	if (isPublic) {
		const { error } = await service
			.from('exercises')
			.update({ is_public: true })
			.eq('id', exercise.id);
		if (error) throw error;
	}
	return exercise.id;
}

async function seedClassification(exerciseId: string, nodeId: string, isPrimary = false) {
	const { error } = await service
		.from('exercise_classifications')
		.insert({ exercise_id: exerciseId, node_id: nodeId, is_primary: isPrimary });
	if (error) throw new Error(`décor : rangement refusé : ${error.message}`);
}

// ============================================================================
// SUITE
// ============================================================================

describe('Arbre des notions (classification_nodes, source_types, rangements)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();

		service = createClient(SUPABASE_URL, SERVICE_KEY, CLIENT_OPTIONS);
		anon = createClient(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);

		const admin = await TestData.profile().withRole('admin').create();
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		adminId = admin.id;
		teacherId = teacher.id;

		adminClient = await signedIn(admin.email);
		teacherClient = await signedIn(teacher.email);
		studentClient = await signedIn(student.email);
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
		// Ordre imposé par les clés en RESTRICT : contenus, puis feuilles, puis racines.
		if (createdExerciseIds.length) {
			await pg.query('delete from public.exercises where id = any($1::uuid[])', [
				createdExerciseIds
			]);
		}
		if (createdTemplateIds.length) {
			await pg.query('delete from public.question_templates where id = any($1::uuid[])', [
				createdTemplateIds
			]);
		}
		for (const kind of ['subnotion', 'notion', 'branch']) {
			await pg
				.query('delete from public.classification_nodes where kind = $1 and name like $2', [
					kind,
					`${TAG}%`
				])
				.catch(() => undefined);
		}
		await pg
			.query('delete from public.source_types where name like $1', [`${TAG}%`])
			.catch(() => undefined);
		await cleanupAllTestData();
	});

	// --------------------------------------------------------------------------
	// Lecture : tout le monde, archivés compris
	// --------------------------------------------------------------------------
	describe('lecture', () => {
		const expectedNames = [
			name('L branche'),
			name('L notion'),
			name('L sous-notion'),
			name('L archivée')
		];

		beforeAll(async () => {
			const branch = await seedNode({ kind: 'branch', name: name('L branche') });
			const notion = await seedNode({
				kind: 'notion',
				name: name('L notion'),
				parent_id: branch.id
			});
			await seedNode({ kind: 'subnotion', name: name('L sous-notion'), parent_id: notion.id });
			await seedNode({
				kind: 'subnotion',
				name: name('L archivée'),
				parent_id: notion.id,
				archived_at: new Date().toISOString()
			});
			const { error } = await service.from('source_types').insert({ name: name('L Bac') });
			if (error) throw error;
		});

		it.each([
			['anon', () => anon],
			['élève', () => studentClient],
			['prof', () => teacherClient]
		])("%s lit l'arbre entier, nœuds archivés compris", async (_who, getClient) => {
			const { data, error } = await getClient()
				.from('classification_nodes')
				.select('name, kind')
				.like('name', `${TAG} L %`)
				.order('name');
			expect(error).toBeNull();
			expect((data ?? []).map((r) => r.name).sort()).toEqual([...expectedNames].sort());
			const notion = (data ?? []).find((r) => r.name === name('L notion'));
			expect(notion?.kind).toBe('notion');
		});

		it.each([
			['anon', () => anon],
			['élève', () => studentClient]
		])('%s lit les types de source', async (_who, getClient) => {
			const { data, error } = await getClient()
				.from('source_types')
				.select('name')
				.eq('name', name('L Bac'));
			expect(error).toBeNull();
			expect(data).toEqual([{ name: name('L Bac') }]);
		});
	});

	// --------------------------------------------------------------------------
	// Écriture : admin seul
	// --------------------------------------------------------------------------
	describe('écriture', () => {
		let target: NodeRow;

		beforeAll(async () => {
			target = await seedNode({ kind: 'branch', name: name('E cible') });
		});

		it("l'admin crée, renomme et supprime un nœud (lignes rendues)", async () => {
			const created = await adminClient
				.from('classification_nodes')
				.insert({ kind: 'branch', name: name('E admin') })
				.select('id, name, kind')
				.single<{ id: string; name: string; kind: string }>();
			expect(created.error).toBeNull();
			expect(created.data?.name).toBe(name('E admin'));
			expect(created.data?.kind).toBe('branch');

			const renamed = await adminClient
				.from('classification_nodes')
				.update({ name: name('E admin renommée') })
				.eq('id', created.data!.id)
				.select('name');
			expect(renamed.error).toBeNull();
			expect(renamed.data).toEqual([{ name: name('E admin renommée') }]);

			const deleted = await adminClient
				.from('classification_nodes')
				.delete()
				.eq('id', created.data!.id)
				.select('id');
			expect(deleted.error).toBeNull();
			expect(deleted.data).toEqual([{ id: created.data!.id }]);
		});

		it("l'admin crée un type de source", async () => {
			const { data, error } = await adminClient
				.from('source_types')
				.insert({ name: name('E Brevet') })
				.select('name')
				.single<{ name: string }>();
			expect(error).toBeNull();
			expect(data?.name).toBe(name('E Brevet'));
		});

		it.each([
			['prof', () => teacherClient],
			['élève', () => studentClient],
			['anon', () => anon]
		])('%s ne peut pas créer de nœud (42501)', async (_who, getClient) => {
			const { data, error } = await getClient()
				.from('classification_nodes')
				.insert({ kind: 'branch', name: name(`E intrus ${_who}`) })
				.select('id');
			expect(data).toBeNull();
			expect(error?.code).toBe('42501');
		});

		it.each([
			['prof', () => teacherClient],
			['élève', () => studentClient]
		])('%s ne peut ni renommer ni supprimer un nœud (ligne intacte)', async (_who, getClient) => {
			const upd = await getClient()
				.from('classification_nodes')
				.update({ name: name('E piratée') })
				.eq('id', target.id)
				.select('id');
			expect(upd.error).toBeNull();
			expect(upd.data).toEqual([]);

			const del = await getClient()
				.from('classification_nodes')
				.delete()
				.eq('id', target.id)
				.select('id');
			expect(del.error).toBeNull();
			expect(del.data).toEqual([]);

			expect(await readNodeName(target.id)).toBe(name('E cible'));
		});

		it('anon ne peut ni renommer ni supprimer un nœud (42501)', async () => {
			const upd = await anon
				.from('classification_nodes')
				.update({ name: name('E piratée') })
				.eq('id', target.id);
			expect(upd.error?.code).toBe('42501');

			const del = await anon.from('classification_nodes').delete().eq('id', target.id);
			expect(del.error?.code).toBe('42501');

			expect(await readNodeName(target.id)).toBe(name('E cible'));
		});

		it.each([
			['prof', () => teacherClient],
			['élève', () => studentClient],
			['anon', () => anon]
		])('%s ne peut pas créer de type de source (42501)', async (_who, getClient) => {
			const { error } = await getClient()
				.from('source_types')
				.insert({ name: name(`E source ${_who}`) });
			expect(error?.code).toBe('42501');
		});

		it.each([
			['prof', () => teacherClient],
			['élève', () => studentClient]
		])(
			'%s ne peut ni renommer ni supprimer un type de source (ligne intacte)',
			async (_who, getClient) => {
				const { data: st, error: stErr } = await service
					.from('source_types')
					.insert({ name: name(`E source cible ${_who}`) })
					.select('id')
					.single<{ id: string }>();
				if (stErr || !st) throw new Error(`décor : type de source refusé : ${stErr?.message}`);

				const upd = await getClient()
					.from('source_types')
					.update({ name: name(`E source piratée ${_who}`) })
					.eq('id', st.id)
					.select('id');
				expect(upd.error).toBeNull();
				expect(upd.data).toEqual([]);

				const del = await getClient().from('source_types').delete().eq('id', st.id).select('id');
				expect(del.error).toBeNull();
				expect(del.data).toEqual([]);

				const still = await service.from('source_types').select('name').eq('id', st.id);
				expect(still.data).toEqual([{ name: name(`E source cible ${_who}`) }]);
			}
		);
	});

	// --------------------------------------------------------------------------
	// Règles de structure (contraintes et triggers : le service role les subit)
	// --------------------------------------------------------------------------
	describe('structure', () => {
		let branch: NodeRow;
		let notion: NodeRow;
		let subnotion: NodeRow;

		beforeAll(async () => {
			branch = await seedNode({ kind: 'branch', name: name('S branche') });
			notion = await seedNode({
				kind: 'notion',
				name: name('S notion'),
				parent_id: branch.id
			});
			subnotion = await seedNode({
				kind: 'subnotion',
				name: name('S sous-notion'),
				parent_id: notion.id
			});
		});

		it('nom vide refusé (23514)', async () => {
			const { error } = await insertNode({ kind: 'branch', name: '   ' });
			expect(error?.code).toBe('23514');
		});

		it('branche avec parent refusée (23514)', async () => {
			const withParent = await insertNode({
				kind: 'branch',
				name: name('S b1'),
				parent_id: branch.id
			});
			expect(withParent.error?.code).toBe('23514');
		});

		it('notion sans parent refusée (23514)', async () => {
			const noParent = await insertNode({ kind: 'notion', name: name('S n1') });
			expect(noParent.error?.code).toBe('23514');
		});

		it('parent de mauvais genre refusé : notion sous notion, sous-notion sous branche', async () => {
			const notionUnderNotion = await insertNode({
				kind: 'notion',
				name: name('S n5'),
				parent_id: notion.id
			});
			expect(notionUnderNotion.error?.code).toBe('23514');
			expect(notionUnderNotion.error?.message).toMatch(/branche|branch/i);

			const subUnderBranch = await insertNode({
				kind: 'subnotion',
				name: name('S s1'),
				parent_id: branch.id
			});
			expect(subUnderBranch.error?.code).toBe('23514');
		});

		it('4ᵉ niveau refusé : sous-notion sous une sous-notion', async () => {
			const { data, error } = await insertNode({
				kind: 'subnotion',
				name: name('S niveau 4'),
				parent_id: subnotion.id
			});
			expect(data).toBeNull();
			expect(error?.code).toBe('23514');
		});

		it("le genre d'un nœud ne change pas", async () => {
			const { error } = await service
				.from('classification_nodes')
				.update({ kind: 'notion', parent_id: branch.id })
				.eq('id', subnotion.id);
			expect(error?.code).toBe('23514');
		});

		it('doublon de nom entre frères refusé (casse ignorée), même nom sous deux parents accepté', async () => {
			const notionB = await seedNode({
				kind: 'notion',
				name: name('S notion B'),
				parent_id: branch.id
			});
			const first = await insertNode({
				kind: 'subnotion',
				name: name('S Tables'),
				parent_id: notion.id
			});
			expect(first.error).toBeNull();

			const dup = await insertNode({
				kind: 'subnotion',
				name: name('S TABLES'),
				parent_id: notion.id
			});
			expect(dup.error?.code).toBe('23505');

			const elsewhere = await insertNode({
				kind: 'subnotion',
				name: name('S Tables'),
				parent_id: notionB.id
			});
			expect(elsewhere.error).toBeNull();
			expect(elsewhere.data?.parent_id).toBe(notionB.id);
		});

		it('deux branches du même nom refusées (23505)', async () => {
			const dup = await insertNode({ kind: 'branch', name: name('S branche') });
			expect(dup.error?.code).toBe('23505');
		});

		it('archiver un parent à enfant actif : refusé ; après archivage des enfants : accepté', async () => {
			const b = await seedNode({ kind: 'branch', name: name('A branche') });
			const n = await seedNode({
				kind: 'notion',
				name: name('A notion'),
				parent_id: b.id
			});
			const now = new Date().toISOString();

			const tooEarly = await service
				.from('classification_nodes')
				.update({ archived_at: now })
				.eq('id', b.id)
				.select('archived_at');
			expect(tooEarly.error?.code).toBe('23514');

			const child = await service
				.from('classification_nodes')
				.update({ archived_at: now })
				.eq('id', n.id)
				.select('archived_at');
			expect(child.error).toBeNull();
			expect(child.data?.[0]?.archived_at).not.toBeNull();

			const parent = await service
				.from('classification_nodes')
				.update({ archived_at: now })
				.eq('id', b.id)
				.select('archived_at');
			expect(parent.error).toBeNull();
			expect(parent.data?.[0]?.archived_at).not.toBeNull();
		});

		it('supprimer un nœud qui a un enfant : refusé (23503)', async () => {
			const { error } = await service.from('classification_nodes').delete().eq('id', branch.id);
			expect(error?.code).toBe('23503');
			expect(await readNodeName(branch.id)).toBe(name('S branche'));
		});

		it('supprimer un nœud qui range un exercice : refusé (23503)', async () => {
			const leaf = await seedNode({
				kind: 'subnotion',
				name: name('S feuille utilisée'),
				parent_id: notion.id
			});
			const exerciseId = await seedExercise(teacherId, false);
			await seedClassification(exerciseId, leaf.id);

			const { error } = await service.from('classification_nodes').delete().eq('id', leaf.id);
			expect(error?.code).toBe('23503');
			expect(await readNodeName(leaf.id)).toBe(name('S feuille utilisée'));
		});
	});

	// --------------------------------------------------------------------------
	// Rangement des exercices
	// --------------------------------------------------------------------------
	describe('exercise_classifications', () => {
		let branch: NodeRow;
		let notion: NodeRow;
		let subnotion: NodeRow;
		let teacherExercise: string;
		let adminExercise: string;
		let publicExercise: string;

		beforeAll(async () => {
			branch = await seedNode({ kind: 'branch', name: name('C branche') });
			notion = await seedNode({
				kind: 'notion',
				name: name('C notion'),
				parent_id: branch.id
			});
			subnotion = await seedNode({
				kind: 'subnotion',
				name: name('C sous-notion'),
				parent_id: notion.id
			});
			teacherExercise = await seedExercise(teacherId, false);
			adminExercise = await seedExercise(adminId, false);
			publicExercise = await seedExercise(teacherId, true);
		});

		it('le prof auteur range son exercice (ligne rendue), dans une notion puis une sous-notion', async () => {
			const primary = await teacherClient
				.from('exercise_classifications')
				.insert({ exercise_id: teacherExercise, node_id: notion.id, is_primary: true })
				.select('exercise_id, node_id, is_primary');
			expect(primary.error).toBeNull();
			expect(primary.data).toEqual([
				{ exercise_id: teacherExercise, node_id: notion.id, is_primary: true }
			]);

			const secondary = await teacherClient
				.from('exercise_classifications')
				.insert({ exercise_id: teacherExercise, node_id: subnotion.id, position: 1 })
				.select('node_id, is_primary, position');
			expect(secondary.error).toBeNull();
			expect(secondary.data).toEqual([{ node_id: subnotion.id, is_primary: false, position: 1 }]);
		});

		it('deux rangements principaux pour un même exercice : refusé (23505)', async () => {
			const { error } = await teacherClient
				.from('exercise_classifications')
				.update({ is_primary: true })
				.eq('exercise_id', teacherExercise)
				.eq('node_id', subnotion.id)
				.select('is_primary');
			expect(error?.code).toBe('23505');
		});

		it('ranger dans une branche : refusé (23514)', async () => {
			const { error } = await teacherClient
				.from('exercise_classifications')
				.insert({ exercise_id: teacherExercise, node_id: branch.id });
			expect(error?.code).toBe('23514');
		});

		it("le prof ne range pas l'exercice d'un autre auteur (42501), l'élève non plus", async () => {
			for (const client of [teacherClient, studentClient]) {
				const { error } = await client
					.from('exercise_classifications')
					.insert({ exercise_id: adminExercise, node_id: notion.id });
				expect(error?.code).toBe('42501');
			}
		});

		it("l'admin ne range pas l'exercice du prof (mêmes droits que la modification de l'exercice)", async () => {
			// Couple (exercice, nœud) neuf : seul un refus de RLS peut faire échouer l'insertion.
			const fresh = await seedNode({
				kind: 'subnotion',
				name: name('C admin cible'),
				parent_id: notion.id
			});
			const attempt = await adminClient
				.from('exercise_classifications')
				.insert({ exercise_id: teacherExercise, node_id: fresh.id });
			expect(attempt.error?.code).toBe('42501');
		});

		it("le prof ne retire pas le rangement d'un exercice dont il n'est pas l'auteur (ligne intacte)", async () => {
			await seedClassification(adminExercise, notion.id, true);
			const { data, error } = await teacherClient
				.from('exercise_classifications')
				.delete()
				.eq('exercise_id', adminExercise)
				.select('node_id');
			expect(error).toBeNull();
			expect(data).toEqual([]);

			const still = await service
				.from('exercise_classifications')
				.select('node_id')
				.eq('exercise_id', adminExercise);
			expect(still.data).toEqual([{ node_id: notion.id }]);
		});

		// S'appuie sur le rangement (exercice de l'admin → notion, principal) posé
		// par le test précédent.
		it.each([
			['prof', () => teacherClient],
			['élève', () => studentClient]
		])(
			"%s ne modifie pas le rangement d'un exercice dont il n'est pas l'auteur (ligne intacte)",
			async (_who, getClient) => {
				const unprimary = await getClient()
					.from('exercise_classifications')
					.update({ is_primary: false })
					.eq('exercise_id', adminExercise)
					.select('node_id');
				expect(unprimary.error).toBeNull();
				expect(unprimary.data).toEqual([]);

				const moved = await getClient()
					.from('exercise_classifications')
					.update({ node_id: subnotion.id })
					.eq('exercise_id', adminExercise)
					.select('node_id');
				expect(moved.error).toBeNull();
				expect(moved.data).toEqual([]);

				const still = await service
					.from('exercise_classifications')
					.select('node_id, is_primary')
					.eq('exercise_id', adminExercise);
				expect(still.data).toEqual([{ node_id: notion.id, is_primary: true }]);
			}
		);

		// Cas où la policy UPDATE est SEULE à protéger : la ligne est lisible
		// (exercice public), donc la policy SELECT ne la masque pas.
		it.each([
			['élève', () => studentClient],
			['admin', () => adminClient]
		])(
			"%s voit le rangement d'un exercice public mais ne le modifie pas (ligne intacte)",
			async (_who, getClient) => {
				const exerciseId = await seedExercise(teacherId, true);
				await seedClassification(exerciseId, notion.id, true);

				const seen = await getClient()
					.from('exercise_classifications')
					.select('node_id')
					.eq('exercise_id', exerciseId);
				expect(seen.data).toEqual([{ node_id: notion.id }]);

				const upd = await getClient()
					.from('exercise_classifications')
					.update({ is_primary: false, node_id: subnotion.id })
					.eq('exercise_id', exerciseId)
					.select('node_id');
				expect(upd.error).toBeNull();
				expect(upd.data).toEqual([]);

				const still = await service
					.from('exercise_classifications')
					.select('node_id, is_primary')
					.eq('exercise_id', exerciseId);
				expect(still.data).toEqual([{ node_id: notion.id, is_primary: true }]);
			}
		);

		it("le prof ne déplace pas son rangement vers l'exercice d'un autre auteur (42501)", async () => {
			const { data, error } = await teacherClient
				.from('exercise_classifications')
				.update({ exercise_id: adminExercise })
				.eq('exercise_id', teacherExercise)
				.eq('node_id', subnotion.id)
				.select('exercise_id');
			expect(data).toBeNull();
			expect(error?.code).toBe('42501');

			const still = await service
				.from('exercise_classifications')
				.select('exercise_id')
				.eq('node_id', subnotion.id)
				.in('exercise_id', [teacherExercise, adminExercise]);
			expect(still.data).toEqual([{ exercise_id: teacherExercise }]);
		});

		it('anon ne peut ni ranger, ni modifier, ni retirer un rangement (42501)', async () => {
			const ins = await anon
				.from('exercise_classifications')
				.insert({ exercise_id: publicExercise, node_id: notion.id });
			expect(ins.error?.code).toBe('42501');

			const upd = await anon
				.from('exercise_classifications')
				.update({ is_primary: false })
				.eq('exercise_id', adminExercise);
			expect(upd.error?.code).toBe('42501');

			const del = await anon
				.from('exercise_classifications')
				.delete()
				.eq('exercise_id', adminExercise);
			expect(del.error?.code).toBe('42501');

			const still = await service
				.from('exercise_classifications')
				.select('node_id, is_primary')
				.eq('exercise_id', adminExercise);
			expect(still.data).toEqual([{ node_id: notion.id, is_primary: true }]);
		});

		it("anon ne voit pas le rangement d'un exercice privé (l'auteur, si)", async () => {
			const hidden = await anon
				.from('exercise_classifications')
				.select('node_id')
				.eq('exercise_id', teacherExercise);
			expect(hidden.error).toBeNull();
			expect(hidden.data).toEqual([]);

			const own = await teacherClient
				.from('exercise_classifications')
				.select('node_id')
				.eq('exercise_id', teacherExercise);
			expect((own.data ?? []).length).toBe(2);
		});

		it("l'élève ne voit pas le rangement d'un exercice qu'il ne voit pas, mais voit celui d'un exercice public", async () => {
			await seedClassification(publicExercise, subnotion.id, true);

			const hidden = await studentClient
				.from('exercise_classifications')
				.select('node_id')
				.eq('exercise_id', teacherExercise);
			expect(hidden.error).toBeNull();
			expect(hidden.data).toEqual([]);

			// Contre-épreuve : le même rangement est bien là pour l'auteur.
			const own = await teacherClient
				.from('exercise_classifications')
				.select('node_id')
				.eq('exercise_id', teacherExercise)
				.order('position');
			expect((own.data ?? []).map((r) => r.node_id)).toEqual([notion.id, subnotion.id]);

			for (const client of [studentClient, anon]) {
				const visible = await client
					.from('exercise_classifications')
					.select('node_id, is_primary')
					.eq('exercise_id', publicExercise);
				expect(visible.error).toBeNull();
				expect(visible.data).toEqual([{ node_id: subnotion.id, is_primary: true }]);
			}
		});

		it('ranger dans un nœud archivé : refusé (23514), à la création comme au déplacement', async () => {
			const archived = await seedNode({
				kind: 'subnotion',
				name: name('C archivée'),
				parent_id: notion.id,
				archived_at: new Date().toISOString()
			});
			const exerciseId = await seedExercise(teacherId, false);

			const ins = await teacherClient
				.from('exercise_classifications')
				.insert({ exercise_id: exerciseId, node_id: archived.id })
				.select('node_id');
			expect(ins.data).toBeNull();
			expect(ins.error?.code).toBe('23514');
			expect(ins.error?.message).toMatch(/archivé/);

			await seedClassification(exerciseId, notion.id);
			const move = await teacherClient
				.from('exercise_classifications')
				.update({ node_id: archived.id })
				.eq('exercise_id', exerciseId)
				.select('node_id');
			expect(move.error?.code).toBe('23514');

			const still = await service
				.from('exercise_classifications')
				.select('node_id')
				.eq('exercise_id', exerciseId);
			expect(still.data).toEqual([{ node_id: notion.id }]);
		});

		it('nœud archivé après rangement : le rangement reste et is_primary se modifie', async () => {
			const leaf = await seedNode({
				kind: 'subnotion',
				name: name('C archivée après'),
				parent_id: notion.id
			});
			const exerciseId = await seedExercise(teacherId, false);
			const ins = await teacherClient
				.from('exercise_classifications')
				.insert({ exercise_id: exerciseId, node_id: leaf.id })
				.select('node_id');
			expect(ins.data).toEqual([{ node_id: leaf.id }]);

			const arch = await service
				.from('classification_nodes')
				.update({ archived_at: new Date().toISOString() })
				.eq('id', leaf.id)
				.select('archived_at');
			expect(arch.data?.[0]?.archived_at).not.toBeNull();

			const upd = await teacherClient
				.from('exercise_classifications')
				.update({ is_primary: true })
				.eq('exercise_id', exerciseId)
				.select('node_id, is_primary');
			expect(upd.error).toBeNull();
			expect(upd.data).toEqual([{ node_id: leaf.id, is_primary: true }]);

			// Même valeur réécrite (le trigger `UPDATE OF node_id` se déclenche) : passe aussi.
			const same = await teacherClient
				.from('exercise_classifications')
				.update({ node_id: leaf.id, position: 3 })
				.eq('exercise_id', exerciseId)
				.select('node_id, position');
			expect(same.error).toBeNull();
			expect(same.data).toEqual([{ node_id: leaf.id, position: 3 }]);
		});

		it("supprimer l'exercice supprime ses rangements (cascade)", async () => {
			const tmp = await seedExercise(teacherId, false);
			await seedClassification(tmp, notion.id);
			const pg = await getPostgresClient();
			await pg.query('delete from public.exercises where id = $1', [tmp]);
			const { rows } = await pg.query(
				'select count(*)::int as n from public.exercise_classifications where exercise_id = $1',
				[tmp]
			);
			expect(rows[0].n).toBe(0);
		});
	});

	// --------------------------------------------------------------------------
	// Modèles de questions et types de source
	// --------------------------------------------------------------------------
	describe('question_templates.classification_node_id et exercises.source_type_id', () => {
		let branch: NodeRow;
		let notion: NodeRow;
		let templateId: string;

		beforeAll(async () => {
			branch = await seedNode({ kind: 'branch', name: name('Q branche') });
			notion = await seedNode({
				kind: 'notion',
				name: name('Q notion'),
				parent_id: branch.id
			});
			const { data, error } = await service
				.from('question_templates')
				.insert({
					type: 'numerical_exact',
					title: name('Q modèle'),
					grades: ['1_SPE'],
					theme: 'Test',
					domain: 'Test',
					level: 1,
					variations: [{ statement: '1+1', answer: '2' }],
					status: 'draft'
				})
				.select('id')
				.single<{ id: string }>();
			if (error || !data) throw new Error(`décor : modèle refusé : ${error?.message}`);
			templateId = data.id;
			createdTemplateIds.push(templateId);
		});

		it('un modèle rangé dans une branche : refusé (23514)', async () => {
			const { error } = await service
				.from('question_templates')
				.update({ classification_node_id: branch.id })
				.eq('id', templateId);
			expect(error?.code).toBe('23514');
		});

		it("l'admin range un modèle dans une notion (valeur relue)", async () => {
			const { data, error } = await adminClient
				.from('question_templates')
				.update({ classification_node_id: notion.id })
				.eq('id', templateId)
				.select('classification_node_id');
			expect(error).toBeNull();
			expect(data).toEqual([{ classification_node_id: notion.id }]);
		});

		it('ranger un modèle dans un nœud archivé : refusé (23514)', async () => {
			const archived = await seedNode({
				kind: 'subnotion',
				name: name('Q archivée'),
				parent_id: notion.id,
				archived_at: new Date().toISOString()
			});
			const { data, error } = await adminClient
				.from('question_templates')
				.update({ classification_node_id: archived.id })
				.eq('id', templateId)
				.select('classification_node_id');
			expect(data).toBeNull();
			expect(error?.code).toBe('23514');
			expect(error?.message).toMatch(/archivé/);
		});

		it("modifier un autre champ d'un modèle rangé dans un nœud archivé passe", async () => {
			const leaf = await seedNode({
				kind: 'subnotion',
				name: name('Q archivée après'),
				parent_id: notion.id
			});
			const put = await adminClient
				.from('question_templates')
				.update({ classification_node_id: leaf.id })
				.eq('id', templateId)
				.select('classification_node_id');
			expect(put.data).toEqual([{ classification_node_id: leaf.id }]);

			const arch = await service
				.from('classification_nodes')
				.update({ archived_at: new Date().toISOString() })
				.eq('id', leaf.id)
				.select('archived_at');
			expect(arch.data?.[0]?.archived_at).not.toBeNull();

			const retitle = await adminClient
				.from('question_templates')
				.update({ title: name('Q modèle renommé') })
				.eq('id', templateId)
				.select('title, classification_node_id');
			expect(retitle.error).toBeNull();
			expect(retitle.data).toEqual([
				{ title: name('Q modèle renommé'), classification_node_id: leaf.id }
			]);

			// Valeur inchangée réécrite (formulaire qui renvoie tout) : passe aussi.
			const same = await adminClient
				.from('question_templates')
				.update({ classification_node_id: leaf.id, level: 2 })
				.eq('id', templateId)
				.select('level, classification_node_id');
			expect(same.error).toBeNull();
			expect(same.data).toEqual([{ level: 2, classification_node_id: leaf.id }]);
		});

		it('le prof auteur affecte un type de source à son exercice ; ce type ne se supprime plus', async () => {
			const { data: st, error: stErr } = await service
				.from('source_types')
				.insert({ name: name('Q Manuel') })
				.select('id')
				.single<{ id: string }>();
			if (stErr || !st) throw new Error(`décor : type de source refusé : ${stErr?.message}`);

			const exerciseId = await seedExercise(teacherId, false);
			const { data, error } = await teacherClient
				.from('exercises')
				.update({ source_type_id: st.id })
				.eq('id', exerciseId)
				.select('source_type_id');
			expect(error).toBeNull();
			expect(data).toEqual([{ source_type_id: st.id }]);

			const del = await service.from('source_types').delete().eq('id', st.id);
			expect(del.error?.code).toBe('23503');
		});

		it('un type de source au nom vide ou en doublon : refusé', async () => {
			const blank = await service.from('source_types').insert({ name: ' ' });
			expect(blank.error?.code).toBe('23514');
			const dup = await service.from('source_types').insert({ name: name('Q MANUEL') });
			expect(dup.error?.code).toBe('23505');
		});
	});
});
