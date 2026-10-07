/**
 * Schéma cible ADR 0020 — points de programme, références, parcours (phase 0)
 * ===========================================================================
 *
 * Spécification : docs/wip/arbre-notions/schema-cible-spec.md (B1-B7 + C1-C27
 * validés par David le 2026-10-07). Migration `<horodatage>_schema_cible_points` :
 *   - `curriculum_points` : `node_id` (nœud de l'arbre), `grade`, `rubrique`,
 *     `objective_id` facultatif, `kind` étendu à `algorithme` ;
 *   - `grade_predecessors` : parcours (prédécesseurs directs) + `grade_ancestors()` ;
 *   - `curriculum_point_automatismes` : contrainte de parcours (C13-C15, C21) ;
 *   - accès : lecture ANONYME des points, références et parcours (B6) ; écriture
 *     des parcours par l'admin seul ; points inchangés (prof + admin, routes
 *     existantes) ; `student_point_state` intact (C27).
 *
 * Chaque refus est mesuré par son CODE (42501, 23514, 23505, 23503) ou par la
 * relecture de la ligne (une écriture refusée par la RLS rend zéro ligne, sans
 * erreur — cf. docs/ref/rls-echecs-silencieux.md).
 *
 * Les colonnes/tables neuves ne sont pas dans `database.ts` (généré depuis la
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

interface PointRow {
	id: string;
	name: string;
	code: string;
	kind: string;
	grade: string | null;
	node_id: string | null;
	rubrique: string | null;
}

interface PointInput {
	name: string;
	code: string;
	kind?: string;
	grade?: string | null;
	node_id?: string | null;
	rubrique?: string | null;
	regime_acquisition?: string;
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

/** Préfixe unique à ce run : tous les noms/codes créés le portent. */
const TAG = `itest-cible-${Date.now().toString(36)}`;

const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };

// ============================================================================
// VARIABLES
// ============================================================================

let service: SupabaseClient;
let anon: SupabaseClient;
let adminClient: SupabaseClient;
let teacherClient: SupabaseClient;
let studentClient: SupabaseClient;
let student2Id: string;

let branchId: string;
let notionId: string;
let subnotionId: string;

/** Points de décor, par étiquette courte. */
const points: Record<string, PointRow> = {};

let codeSeq = 0;

// ============================================================================
// FONCTIONS
// ============================================================================

function name(suffix: string): string {
	return `${TAG} ${suffix}`;
}

function nextCode(): string {
	codeSeq += 1;
	return `${TAG}-${codeSeq}`;
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

/** Insère un point par le service role (contourne la RLS, PAS contraintes/triggers). */
async function insertPoint(input: PointInput) {
	return service
		.from('curriculum_points')
		.insert({ kind: 'savoir_faire', ...input })
		.select('id, name, code, kind, grade, node_id, rubrique')
		.single<PointRow>();
}

/** Comme `insertPoint`, mais échoue bruyamment : pour poser le décor. */
async function seedPoint(label: string, input: PointInput): Promise<PointRow> {
	const { data, error } = await insertPoint(input);
	if (error || !data) throw new Error(`décor : point « ${input.name} » refusé : ${error?.message}`);
	points[label] = data;
	return data;
}

async function insertReference(pointId: string, grade: string) {
	return service.from('curriculum_point_automatismes').insert({ point_id: pointId, grade });
}

async function ancestorsOf(grade: string): Promise<string[]> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query<{ grade_ancestors: string }>(
		'select public.grade_ancestors($1)',
		[grade]
	);
	return rows.map((r) => r.grade_ancestors).sort();
}

// ============================================================================
// SUITE
// ============================================================================

describe('Schéma cible (points → nœuds, références, parcours)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();

		service = createClient(SUPABASE_URL, SERVICE_KEY, CLIENT_OPTIONS);
		anon = createClient(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);

		const admin = await TestData.profile().withRole('admin').create();
		const teacher = await TestData.profile().withRole('teacher').create();
		const student = await TestData.profile().withRole('student').create();
		const student2 = await TestData.profile().withRole('student').create();
		student2Id = student2.id;

		adminClient = await signedIn(admin.email);
		teacherClient = await signedIn(teacher.email);
		studentClient = await signedIn(student.email);

		// Décor arbre : une branche > notion > sous-notion, plus une sous-notion archivée.
		const branch = await service
			.from('classification_nodes')
			.insert({ kind: 'branch', name: name('branche'), parent_id: null })
			.select('id')
			.single<{ id: string }>();
		if (branch.error || !branch.data) throw new Error(`décor : branche : ${branch.error?.message}`);
		branchId = branch.data.id;

		const notion = await service
			.from('classification_nodes')
			.insert({ kind: 'notion', name: name('notion'), parent_id: branchId })
			.select('id')
			.single<{ id: string }>();
		if (notion.error || !notion.data) throw new Error(`décor : notion : ${notion.error?.message}`);
		notionId = notion.data.id;

		const sub = await service
			.from('classification_nodes')
			.insert({ kind: 'subnotion', name: name('sous-notion'), parent_id: notionId })
			.select('id')
			.single<{ id: string }>();
		if (sub.error || !sub.data) throw new Error(`décor : sous-notion : ${sub.error?.message}`);
		subnotionId = sub.data.id;
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
		await pg
			.query(
				'delete from public.student_point_state where point_id in (select id from public.curriculum_points where code like $1)',
				[`${TAG}%`]
			)
			.catch(() => undefined);
		await pg
			.query(
				'delete from public.curriculum_point_automatismes where point_id in (select id from public.curriculum_points where code like $1)',
				[`${TAG}%`]
			)
			.catch(() => undefined);
		await pg
			.query('delete from public.curriculum_points where code like $1', [`${TAG}%`])
			.catch(() => undefined);
		await pg
			.query("delete from public.grade_predecessors where grade = 'T_GEN'")
			.catch(() => undefined);
		for (const kind of ['subnotion', 'notion', 'branch']) {
			await pg
				.query('delete from public.classification_nodes where kind = $1 and name like $2', [
					kind,
					`${TAG}%`
				])
				.catch(() => undefined);
		}
		await cleanupAllTestData();
	});

	// --------------------------------------------------------------------------
	// A. Points de programme (C1-C3, C6-C9, C11)
	// --------------------------------------------------------------------------
	describe('points de programme', () => {
		it('C1/C11 — un point neuf complet (nœud, grade, rubrique), SANS objectif, est accepté', async () => {
			const point = await seedPoint('p2', {
				name: name('produit nul'),
				code: nextCode(),
				grade: '2',
				node_id: subnotionId,
				rubrique: 'Algèbre > Équations'
			});
			expect(point.node_id).toBe(subnotionId);
			expect(point.grade).toBe('2');
			expect(point.rubrique).toBe('Algèbre > Équations');
		});

		it('C2 — un point rattaché à une BRANCHE est refusé (23514)', async () => {
			const { error } = await insertPoint({
				name: name('sur branche'),
				code: nextCode(),
				grade: '2',
				node_id: branchId
			});
			expect(error?.code).toBe('23514');
		});

		it('C3 — un point rattaché à un nœud ARCHIVÉ est refusé (23514)', async () => {
			const archived = await service
				.from('classification_nodes')
				.insert({
					kind: 'subnotion',
					name: name('archivée'),
					parent_id: notionId,
					archived_at: new Date().toISOString()
				})
				.select('id')
				.single<{ id: string }>();
			if (archived.error || !archived.data) throw new Error('décor : nœud archivé');
			const { error } = await insertPoint({
				name: name('vers archivé'),
				code: nextCode(),
				grade: '2',
				node_id: archived.data.id
			});
			expect(error?.code).toBe('23514');
		});

		it("C3 — un rattachement existant SURVIT à l'archivage de son nœud", async () => {
			const node = await service
				.from('classification_nodes')
				.insert({ kind: 'subnotion', name: name('à archiver'), parent_id: notionId })
				.select('id')
				.single<{ id: string }>();
			if (node.error || !node.data) throw new Error('décor : nœud à archiver');
			const point = await seedPoint('survivant', {
				name: name('survivant'),
				code: nextCode(),
				grade: '2',
				node_id: node.data.id
			});
			const { error } = await service
				.from('classification_nodes')
				.update({ archived_at: new Date().toISOString() })
				.eq('id', node.data.id);
			expect(error).toBeNull();
			const { data } = await service
				.from('curriculum_points')
				.select('node_id')
				.eq('id', point.id)
				.single<{ node_id: string }>();
			expect(data?.node_id).toBe(node.data.id);
		});

		it('C6 — deux points du même grade sur le même nœud : permis', async () => {
			const { error } = await insertPoint({
				name: name('produit nul bis'),
				code: nextCode(),
				grade: '2',
				node_id: subnotionId
			});
			expect(error).toBeNull();
		});

		it('C7 — des grades parallèles sur le même nœud, chacun ses points : permis', async () => {
			await seedPoint('p1techno', {
				name: name('parabole techno'),
				code: nextCode(),
				grade: '1_TECHNO',
				node_id: subnotionId
			});
			expect(points.p1techno.grade).toBe('1_TECHNO');
		});

		it('C9 — le kind « algorithme » est accepté ; un kind inconnu est refusé (23514)', async () => {
			const ok = await insertPoint({
				name: name('algo balayage'),
				code: nextCode(),
				kind: 'algorithme',
				grade: '2',
				node_id: subnotionId
			});
			expect(ok.error).toBeNull();
			const ko = await insertPoint({
				name: name('kind inconnu'),
				code: nextCode(),
				kind: 'competence',
				grade: '2',
				node_id: subnotionId
			});
			expect(ko.error?.code).toBe('23514');
		});

		it("C8 — le régime « automatisme » n'existe PAS (valeur supprimée le 2026-08-30) : refusé (23514)", async () => {
			const { error } = await insertPoint({
				name: name('faux régime'),
				code: nextCode(),
				grade: '2',
				node_id: subnotionId,
				regime_acquisition: 'automatisme'
			});
			expect(error?.code).toBe('23514');
		});

		it('C8 — un grade hors liste est refusé (23514)', async () => {
			const { error } = await insertPoint({
				name: name('grade inconnu'),
				code: nextCode(),
				grade: 'L1_MATHS',
				node_id: subnotionId
			});
			expect(error?.code).toBe('23514');
		});
	});

	// --------------------------------------------------------------------------
	// B. Parcours (C18-C21)
	// --------------------------------------------------------------------------
	describe('parcours (grade_predecessors, grade_ancestors)', () => {
		it('C18 — le parcours antérieur de 1_TECHNO remonte au CP par la 2de, SANS 1_SPE', async () => {
			const ancestors = await ancestorsOf('1_TECHNO');
			expect(ancestors).toContain('2');
			expect(ancestors).toContain('3');
			expect(ancestors).toContain('CP');
			expect(ancestors).not.toContain('1_SPE');
			expect(ancestors).not.toContain('1_GEN');
		});

		it("C20 — T_EXP descend de 1_SPE, et T_SPE n'est PAS dans son parcours", async () => {
			const ancestors = await ancestorsOf('T_EXP');
			expect(ancestors).toContain('1_SPE');
			expect(ancestors).toContain('2');
			expect(ancestors).not.toContain('T_SPE');
		});

		it('C21 — T_GEN est hors parcours (aucun prédécesseur)', async () => {
			expect(await ancestorsOf('T_GEN')).toEqual([]);
		});

		it('C19 — un cycle dans les prédécesseurs est refusé (23514)', async () => {
			// 1_SPE a déjà « 2 » dans son parcours : déclarer 1_SPE comme
			// prédécesseur de la 2de bouclerait.
			const { error } = await service
				.from('grade_predecessors')
				.insert({ grade: '2', previous_grade: '1_SPE' });
			expect(error?.code).toBe('23514');
		});
	});

	// --------------------------------------------------------------------------
	// C. Références d'automatismes (C12-C15, C21)
	// --------------------------------------------------------------------------
	describe("références d'automatismes", () => {
		beforeAll(async () => {
			await seedPoint('p1spe', {
				name: name('dérivée polynôme'),
				code: nextCode(),
				grade: '1_SPE',
				node_id: subnotionId
			});
			await seedPoint('pTspe', {
				name: name('convexité'),
				code: nextCode(),
				grade: 'T_SPE',
				node_id: subnotionId
			});
			await seedPoint('pTtechno', {
				name: name('indice base 100'),
				code: nextCode(),
				grade: 'T_TECHNO',
				node_id: subnotionId
			});
			// Point « ancienne génération » : sans grade, sans nœud, sans objectif.
			await seedPoint('ancien', { name: name('point ancien'), code: nextCode() });
		});

		it('C12 — un point de 2de référencé par les trois 1res : trois lignes acceptées', async () => {
			for (const grade of ['1_SPE', '1_GEN', '1_TECHNO']) {
				const { error } = await insertReference(points.p2.id, grade);
				expect(error, `référence ${grade}`).toBeNull();
			}
		});

		it("C13 — l'auto-référence (point de Tle techno dans SA liste) est permise", async () => {
			const { error } = await insertReference(points.pTtechno.id, 'T_TECHNO');
			expect(error).toBeNull();
		});

		it('C14 — une référence vers une voie PARALLÈLE est refusée : 1_GEN → point 1_SPE (23514)', async () => {
			const { error } = await insertReference(points.p1spe.id, '1_GEN');
			expect(error?.code).toBe('23514');
		});

		it('C15 — une référence vers un grade POSTÉRIEUR est refusée : 2de → point T_SPE (23514)', async () => {
			const { error } = await insertReference(points.pTspe.id, '2');
			expect(error?.code).toBe('23514');
		});

		it('C21 — T_GEN, hors parcours, ne peut rien référencer (23514)', async () => {
			const { error } = await insertReference(points.p2.id, 'T_GEN');
			expect(error?.code).toBe('23514');
		});

		it("C14 (symétrie) — changer le grade d'un point référencé ne peut pas invalider ses références (23514)", async () => {
			// p2 (grade « 2 ») est référencé par 1_SPE, 1_GEN et 1_TECHNO (C12).
			const ko = await service
				.from('curriculum_points')
				.update({ grade: 'T_SPE' })
				.eq('id', points.p2.id);
			expect(ko.error?.code).toBe('23514');

			const koNull = await service
				.from('curriculum_points')
				.update({ grade: null })
				.eq('id', points.p2.id);
			expect(koNull.error?.code).toBe('23514');

			// « 3 » reste dans le parcours des trois 1res : permis — puis on remet « 2 ».
			const ok = await service
				.from('curriculum_points')
				.update({ grade: '3' })
				.eq('id', points.p2.id)
				.select('grade')
				.single<{ grade: string }>();
			expect(ok.error).toBeNull();
			expect(ok.data?.grade).toBe('3');
			await service.from('curriculum_points').update({ grade: '2' }).eq('id', points.p2.id);
		});

		it('C4/C5 — un point sans grade (ancienne génération) ne peut pas être référencé (23514)', async () => {
			const { error } = await insertReference(points.ancien.id, '1_SPE');
			expect(error?.code).toBe('23514');
		});
	});

	// --------------------------------------------------------------------------
	// D. Accès (C25-C27)
	// --------------------------------------------------------------------------
	describe('accès', () => {
		it('C25 — un ANONYME lit les points, les références et les parcours', async () => {
			const pointRead = await anon
				.from('curriculum_points')
				.select('name')
				.eq('id', points.p2.id)
				.maybeSingle<{ name: string }>();
			expect(pointRead.error).toBeNull();
			expect(pointRead.data?.name).toBe(name('produit nul'));

			const refRead = await anon
				.from('curriculum_point_automatismes')
				.select('grade')
				.eq('point_id', points.p2.id);
			expect(refRead.error).toBeNull();
			expect((refRead.data ?? []).map((r) => r.grade).sort()).toEqual([
				'1_GEN',
				'1_SPE',
				'1_TECHNO'
			]);

			const pathRead = await anon
				.from('grade_predecessors')
				.select('previous_grade')
				.eq('grade', '2')
				.maybeSingle<{ previous_grade: string }>();
			expect(pathRead.error).toBeNull();
			expect(pathRead.data?.previous_grade).toBe('3');
		});

		it("C26 — l'élève n'écrit NI un point (42501), NI une référence, NI un parcours", async () => {
			const insert = await studentClient.from('curriculum_points').insert({
				name: name('intrusion'),
				code: nextCode(),
				kind: 'savoir_faire'
			});
			expect(insert.error?.code).toBe('42501');

			const refInsert = await studentClient
				.from('curriculum_point_automatismes')
				.insert({ point_id: points.p2.id, grade: 'T_SPE' });
			expect(refInsert.error?.code).toBe('42501');

			const pathInsert = await studentClient
				.from('grade_predecessors')
				.insert({ grade: 'T_GEN', previous_grade: '2' });
			expect(pathInsert.error?.code).toBe('42501');
		});

		it("C26 — l'update d'un point par l'élève est refusé EN SILENCE (ligne intacte)", async () => {
			await studentClient
				.from('curriculum_points')
				.update({ name: name('vandalisé') })
				.eq('id', points.p2.id);
			const { data } = await service
				.from('curriculum_points')
				.select('name')
				.eq('id', points.p2.id)
				.single<{ name: string }>();
			expect(data?.name).toBe(name('produit nul'));
		});

		it("C26 — le PROF ne touche pas aux parcours (admin seul) ; l'ADMIN si", async () => {
			const teacherInsert = await teacherClient
				.from('grade_predecessors')
				.insert({ grade: 'T_GEN', previous_grade: '2' });
			expect(teacherInsert.error?.code).toBe('42501');

			const adminInsert = await adminClient
				.from('grade_predecessors')
				.insert({ grade: 'T_GEN', previous_grade: '2' })
				.select('grade')
				.single<{ grade: string }>();
			expect(adminInsert.error).toBeNull();
			expect(adminInsert.data?.grade).toBe('T_GEN');

			const adminDelete = await adminClient
				.from('grade_predecessors')
				.delete()
				.eq('grade', 'T_GEN')
				.select('grade');
			expect(adminDelete.error).toBeNull();
			expect(adminDelete.data).toHaveLength(1);
		});

		it("C26 — le prof garde l'écriture des POINTS (statu quo des routes existantes)", async () => {
			const { data, error } = await teacherClient
				.from('curriculum_points')
				.update({ name: name('produit nul (relu)') })
				.eq('id', points.p2.id)
				.select('name')
				.single<{ name: string }>();
			expect(error).toBeNull();
			expect(data?.name).toBe(name('produit nul (relu)'));
			await service
				.from('curriculum_points')
				.update({ name: name('produit nul') })
				.eq('id', points.p2.id);
		});

		it("C27 — un élève ne lit JAMAIS l'acquisition d'un autre (zéro ligne)", async () => {
			const seeded = await service.from('student_point_state').insert({
				student_id: student2Id,
				point_id: points.p2.id,
				is_acquired: true
			});
			expect(seeded.error).toBeNull();
			const { data, error } = await studentClient
				.from('student_point_state')
				.select('point_id')
				.eq('student_id', student2Id);
			expect(error).toBeNull();
			expect(data).toEqual([]);
		});
	});
});
