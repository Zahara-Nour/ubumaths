/**
 * Chatterie de Faustroll : la collection calculée, lue AUX DROITS DE L'ÉLÈVE
 * ==========================================================================
 *
 * `loadMathouCollection` lit `curriculum_points`, `question_template_points`,
 * `classification_nodes`, `student_point_state` et `srs_card_stats` avec le
 * client de l'élève. La RLS refuse EN SILENCE : un accès refusé rendrait une
 * Chatterie vide, sans erreur. Ce fichier prouve, avec de vrais comptes, que :
 *   - un élève de 1re spé avec une réussite sur un point a un chaton ;
 *   - tous les points d'une notion acquis → grand matou ;
 *   - une carte due (FSRS « à renforcer ») met le Mathou en sieste ;
 *   - un autre élève ne lit pas la collection du premier, même en passant son
 *     identifiant (la RLS de `student_point_state` et `srs_card_stats` tient) ;
 *   - le PARCOURS compte (`grade_ancestors` appelé par l'élève) : un élève de
 *     Tle spé dont la notion est entièrement acquise en 1re spé a un grand
 *     matou, et un point de 1re spé dû l'endort ;
 *   - la MÉMOIRE (`student_mathoux`, écrite au client service par le calcul) :
 *     un point acquis puis perdu laisse le Mathou matou, endormi ; une notion
 *     entièrement acquise en 1re spé reste grand matou ★ 1re spé après le passage
 *     en Tle spé, même oubliée ; deux écritures concurrentes ne font jamais
 *     redescendre la mémoire ; l'élève B ne lit pas la mémoire de A.
 *
 * Spec : docs/wip/mathoux-conception.md § 9.
 *
 * `pnpm db:start` puis `pnpm test:integration`.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import { createFakeTemplate } from '../helpers/competence-referentiel.helpers';
import { loadMathouCollection, loadMathouCollectionWithNews } from '$lib/server/mathoux/collection';
import { readMathouMemory, rememberMathoux } from '$lib/server/mathoux/memory';
import type { Mathou, MathouCollection } from '$lib/mathoux/collection-logic';
import { resolveTestLaunch } from '$lib/utils/test-launch';
import { trainingQuery } from '$lib/mathoux/collection-logic';

// ============================================================================
// TYPES
// ============================================================================

type Client = SupabaseClient<Database>;

// ============================================================================
// CONSTANTES
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/**
 * Préfixe unique à ce run : tous les nœuds et codes créés le portent. Il finit
 * par « -t » : en base 36, l'horodatage peut finir par « s » ou « x », et le
 * premier mot du nom passerait au pluriel (« le Mathou des … »).
 */
const TAG = `itest-mathoux-${Date.now().toString(36)}-t`;
const GRADE = '1_SPE';
const GRADE_TLE = 'T_SPE';

// ============================================================================
// VARIABLES
// ============================================================================

const service = createServiceRoleClient();

let eleveA: Client;
let eleveAId: string;
let eleveB: Client;
let eleveBId: string;
let eleveTle: Client;
let eleveTleId: string;

/** Notion « Fractions » : p1 (sur la notion) et p2 (sur une sous-notion). */
let notionFractions: string;
/** Notion « Vecteurs » : p3 seul. */
let notionVecteurs: string;
/** Notion « Brouillons » : p5, tagué par un modèle en brouillon seulement. */
let notionBrouillons: string;
const templates: Record<string, string> = {};
const pointIds: Record<string, string> = {};

// ============================================================================
// FONCTIONS
// ============================================================================

async function clientFor(email: string): Promise<Client> {
	const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

async function insertNode(kind: string, name: string, parentId: string | null): Promise<string> {
	const { data, error } = await service
		.from('classification_nodes')
		.insert({ kind, name: `${TAG} ${name}`, parent_id: parentId })
		.select('id')
		.single();
	if (error || !data) throw new Error(`décor : nœud ${name} : ${error?.message}`);
	return data.id;
}

async function insertPoint(label: string, nodeId: string, grade = GRADE): Promise<string> {
	const { data, error } = await service
		.from('curriculum_points')
		.insert({
			kind: 'savoir_faire',
			name: `${TAG} ${label}`,
			code: `${TAG}-${label}`,
			grade,
			node_id: nodeId
		})
		.select('id')
		.single();
	if (error || !data) throw new Error(`décor : point ${label} : ${error?.message}`);
	return data.id;
}

/** Range le modèle dans le nœud du point (exigé par la garde des tags), puis le tague. */
async function tag(templateId: string, pointId: string, nodeId: string): Promise<void> {
	const ranged = await service
		.from('question_templates')
		.update({ classification_node_id: nodeId })
		.eq('id', templateId)
		.select('id');
	if (ranged.error || ranged.data?.length !== 1) {
		throw new Error(`décor : rangement : ${ranged.error?.message}`);
	}
	const { error } = await service
		.from('question_template_points')
		.insert({ template_id: templateId, point_id: pointId });
	if (error) throw new Error(`décor : tag : ${error.message}`);
}

async function setState(
	studentId: string,
	pointId: string,
	state: { is_acquired: boolean; total_successes: number; distinct_template_successes?: number }
): Promise<void> {
	const { data, error } = await service
		.from('student_point_state')
		.upsert({
			student_id: studentId,
			point_id: pointId,
			...state,
			last_success_at: state.total_successes > 0 ? new Date().toISOString() : null
		})
		.select('point_id');
	if (error || data?.length !== 1) throw new Error(`décor : état : ${error?.message}`);
}

/** Mémoire relue HORS RLS (client service) : ce que la base contient vraiment. */
async function storedMemory(studentId: string, notionId: string) {
	const { data, error } = await service
		.from('student_mathoux')
		.select('best_stage, starred_grades, updated_at')
		.eq('student_id', studentId)
		.eq('notion_id', notionId)
		.maybeSingle();
	if (error) throw new Error(`relecture mémoire : ${error.message}`);
	return data;
}

async function newStudent(grade: string): Promise<{ id: string; client: Client }> {
	const profil = await TestData.profile().withRole('student').create();
	const { data, error } = await service
		.from('profiles')
		.update({ grade })
		.eq('id', profil.id)
		.select('id');
	if (error || data?.length !== 1) throw new Error(`décor : niveau : ${error?.message}`);
	return { id: profil.id, client: await clientFor(profil.email) };
}

async function setGrade(studentId: string, grade: string): Promise<void> {
	const { data, error } = await service
		.from('profiles')
		.update({ grade })
		.eq('id', studentId)
		.select('id');
	if (error || data?.length !== 1) throw new Error(`décor : niveau : ${error?.message}`);
}

function mathouOf(collection: MathouCollection, notionId: string): Mathou | undefined {
	return collection.races.flatMap((r) => r.mathoux).find((m) => m.notionId === notionId);
}

// ============================================================================
// SUITE
// ============================================================================

describe('Chatterie : collection calculée aux droits de l’élève', () => {
	beforeAll(async () => {
		await cleanupAllTestData();

		const profilA = await TestData.profile().withRole('student').create();
		const profilB = await TestData.profile().withRole('student').create();
		const profilTle = await TestData.profile().withRole('student').create();
		eleveAId = profilA.id;
		eleveBId = profilB.id;
		eleveTleId = profilTle.id;
		for (const [id, grade] of [
			[eleveAId, GRADE],
			[eleveBId, GRADE],
			[eleveTleId, GRADE_TLE]
		]) {
			const { data, error } = await service
				.from('profiles')
				.update({ grade })
				.eq('id', id)
				.select('id');
			if (error || data?.length !== 1) throw new Error(`décor : niveau : ${error?.message}`);
		}
		eleveA = await clientFor(profilA.email);
		eleveB = await clientFor(profilB.email);
		eleveTle = await clientFor(profilTle.email);

		const branche = await insertNode('branch', 'branche', null);
		notionFractions = await insertNode('notion', 'Fractions', branche);
		notionVecteurs = await insertNode('notion', 'Vecteurs', branche);
		const sousNotion = await insertNode('subnotion', 'Somme', notionFractions);
		notionBrouillons = await insertNode('notion', 'Brouillons', branche);

		pointIds.p1 = await insertPoint('p1', notionFractions);
		pointIds.p2 = await insertPoint('p2', sousNotion);
		pointIds.p3 = await insertPoint('p3', notionVecteurs);
		// Point de Tle spé sur la même notion : hors parcours d'un élève de 1re spé
		pointIds.p4 = await insertPoint('p4', notionVecteurs, GRADE_TLE);
		pointIds.p5 = await insertPoint('p5', notionBrouillons);

		const nodeOf: Record<string, string> = {
			p1: notionFractions,
			p2: sousNotion,
			p3: notionVecteurs,
			p4: notionVecteurs,
			p5: notionBrouillons
		};
		for (const label of ['p1', 'p2', 'p3', 'p4', 'p5']) {
			templates[label] = await createFakeTemplate(service, eleveAId);
			await tag(templates[label], pointIds[label], nodeOf[label]);
		}
		// Le modèle de p5 repasse en brouillon : p5 n'est plus travaillable
		const brouillon = await service
			.from('question_templates')
			.update({ status: 'draft' })
			.eq('id', templates.p5)
			.select('id');
		if (brouillon.error || brouillon.data?.length !== 1) {
			throw new Error(`décor : brouillon : ${brouillon.error?.message}`);
		}
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
		// Mémoire d'abord : sa clé vers l'arbre est en RESTRICT
		await pg
			.query(
				'delete from public.student_mathoux where notion_id in (select id from public.classification_nodes where name like $1)',
				[`${TAG}%`]
			)
			.catch(() => undefined);
		await pg
			.query('delete from public.srs_card_stats where card_reference_id = any($1::uuid[])', [
				Object.values(templates)
			])
			.catch(() => undefined);
		await pg
			.query(
				'delete from public.student_point_state where point_id in (select id from public.curriculum_points where code like $1)',
				[`${TAG}%`]
			)
			.catch(() => undefined);
		await pg
			.query('delete from public.question_template_points where template_id = any($1::uuid[])', [
				Object.values(templates)
			])
			.catch(() => undefined);
		await pg
			.query('delete from public.question_templates where id = any($1::uuid[])', [
				Object.values(templates)
			])
			.catch(() => undefined);
		await pg
			.query('delete from public.curriculum_points where code like $1', [`${TAG}%`])
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

	it('sans rien travaillé, les deux notions sont à découvrir (l’arbre et les tags sont lisibles)', async () => {
		const collection = await loadMathouCollection(eleveA, eleveAId, GRADE);
		expect(mathouOf(collection, notionFractions)?.growth).toBe('a_decouvrir');
		expect(mathouOf(collection, notionVecteurs)?.growth).toBe('a_decouvrir');
		// La sous-notion compte pour sa notion
		expect(mathouOf(collection, notionFractions)?.workablePoints).toBe(2);
	});

	it('un point tagué seulement par un brouillon n’est pas travaillable : aucune silhouette', async () => {
		const collection = await loadMathouCollection(eleveA, eleveAId, GRADE);
		expect(mathouOf(collection, notionBrouillons)).toBeUndefined();
	});

	it('une réussite sur un point → un chaton', async () => {
		await setState(eleveAId, pointIds.p2, { is_acquired: false, total_successes: 1 });
		const collection = await loadMathouCollection(eleveA, eleveAId, GRADE);
		expect(mathouOf(collection, notionFractions)).toMatchObject({
			growth: 'chaton',
			name: `le Mathou « ${TAG} Fractions »`
		});
	});

	it('« Faire grandir » : modèles PUBLIÉS de la notion, perdus puis non acquis puis acquis, aucun brouillon', async () => {
		// Notion à elle : trois points, un modèle publié chacun, plus un brouillon sur le point perdu
		const parent = await service
			.from('classification_nodes')
			.select('parent_id')
			.eq('id', notionFractions)
			.single();
		if (parent.error || !parent.data?.parent_id) {
			throw new Error(`décor : branche : ${parent.error?.message}`);
		}
		const notionOrdre = await insertNode('notion', 'Ordre', parent.data.parent_id);
		const ordre: Record<string, string> = {};
		for (const label of ['o-perdu', 'o-neuf', 'o-acquis']) {
			const pointId = await insertPoint(label, notionOrdre);
			ordre[label] = pointId;
			templates[label] = await createFakeTemplate(service, eleveAId);
			await tag(templates[label], pointId, notionOrdre);
		}
		templates.brouillonOrdre = await createFakeTemplate(service, eleveAId);
		await tag(templates.brouillonOrdre, ordre['o-perdu'], notionOrdre);
		const draft = await service
			.from('question_templates')
			.update({ status: 'draft' })
			.eq('id', templates.brouillonOrdre)
			.select('id');
		if (draft.error || draft.data?.length !== 1) {
			throw new Error(`décor : brouillon : ${draft.error?.message}`);
		}

		const { id, client } = await newStudent(GRADE);
		// Perdu (régime diversité par défaut : 2 modèles réussis, plus acquis), acquis ; o-neuf jamais tenté
		await setState(id, ordre['o-perdu'], {
			is_acquired: false,
			total_successes: 2,
			distinct_template_successes: 2
		});
		await setState(id, ordre['o-acquis'], { is_acquired: true, total_successes: 3 });

		const collection = await loadMathouCollection(client, id, GRADE);
		const mathou = mathouOf(collection, notionOrdre);
		expect(mathou).toMatchObject({ asleep: true, dueForRevision: false });
		const query = trainingQuery(mathou?.trainingCategories ?? null);
		expect(query).toBeTruthy();
		const launch = resolveTestLaunch(new URLSearchParams(query ?? ''));
		expect(launch.kind).toBe('start');
		if (launch.kind !== 'start') return;
		expect(launch.mode).toBe('interactive');

		// L'ordre attendu, relu dans la base : perdu, puis non acquis, puis acquis
		const expected = await service
			.from('question_templates')
			.select('id, theme')
			.in('id', [templates['o-perdu'], templates['o-neuf'], templates['o-acquis']]);
		expect(expected.error).toBeNull();
		const themeOf = new Map((expected.data ?? []).map((t) => [t.id, t.theme]));
		expect(launch.categories.map((c) => c.category.theme)).toEqual([
			themeOf.get(templates['o-perdu']),
			themeOf.get(templates['o-neuf']),
			themeOf.get(templates['o-acquis'])
		]);
		expect(launch.categories.every((c) => c.quantity === 1)).toBe(true);
	});

	it('tous les points d’une notion acquis → grand matou', async () => {
		await setState(eleveAId, pointIds.p3, { is_acquired: true, total_successes: 3 });
		const collection = await loadMathouCollection(eleveA, eleveAId, GRADE);
		expect(mathouOf(collection, notionVecteurs)).toMatchObject({
			growth: 'grand_matou',
			acquiredPoints: 1,
			workablePoints: 1,
			asleep: false
		});
	});

	it('une carte due (« à renforcer ») met le Mathou en sieste', async () => {
		const { error } = await service.from('srs_card_stats').insert({
			user_id: eleveAId,
			card_reference_type: 'template',
			card_reference_id: templates.p3,
			state: 'review',
			next_review: new Date(Date.now() - 86_400_000).toISOString()
		});
		if (error) throw new Error(`décor : carte : ${error.message}`);

		const collection = await loadMathouCollection(eleveA, eleveAId, GRADE);
		expect(mathouOf(collection, notionVecteurs)?.asleep).toBe(true);
		expect(collection.counts.napping).toBeGreaterThanOrEqual(1);
	});

	it('un autre élève ne lit pas la collection du premier, même avec son identifiant', async () => {
		const sienne = await loadMathouCollection(eleveB, eleveBId, GRADE);
		expect(mathouOf(sienne, notionVecteurs)?.growth).toBe('a_decouvrir');

		// Le client de B, l'identifiant de A : refusé d'emblée (garde d'identité)…
		await expect(loadMathouCollection(eleveB, eleveAId, GRADE)).rejects.toThrow(
			/n’est pas l’utilisateur de la session/
		);
		// … et, derrière, la RLS ne rend aucun état ni aucune carte de A (en silence).
		const etats = await eleveB
			.from('student_point_state')
			.select('point_id')
			.eq('student_id', eleveAId);
		expect(etats.error).toBeNull();
		expect(etats.data).toEqual([]);
		const cartes = await eleveB.from('srs_card_stats').select('id').eq('user_id', eleveAId);
		expect(cartes.error).toBeNull();
		expect(cartes.data).toEqual([]);

		// Témoin : A, lui, voit toujours son grand matou endormi.
		const sienneA = await loadMathouCollection(eleveA, eleveAId, GRADE);
		expect(mathouOf(sienneA, notionVecteurs)).toMatchObject({
			growth: 'grand_matou',
			asleep: true
		});
	});

	it('parcours : Tle spé, notion entièrement acquise en 1re spé → grand matou ; point de 1re spé dû → sieste', async () => {
		const avant = await loadMathouCollection(eleveTle, eleveTleId, GRADE_TLE);
		// Les points de 1re spé sont lus : la notion compte les deux niveaux
		expect(mathouOf(avant, notionVecteurs)).toMatchObject({
			growth: 'a_decouvrir',
			workablePoints: 2
		});

		await setState(eleveTleId, pointIds.p3, { is_acquired: true, total_successes: 2 });
		const acquise = await loadMathouCollection(eleveTle, eleveTleId, GRADE_TLE);
		expect(mathouOf(acquise, notionVecteurs)).toMatchObject({
			growth: 'grand_matou',
			asleep: false,
			byGrade: [
				{ grade: GRADE, workablePoints: 1, acquiredPoints: 1, growth: 'grand_matou' },
				{ grade: GRADE_TLE, workablePoints: 1, acquiredPoints: 0, growth: 'a_decouvrir' }
			]
		});

		const { error } = await service.from('srs_card_stats').insert({
			user_id: eleveTleId,
			card_reference_type: 'template',
			card_reference_id: templates.p3,
			state: 'review',
			next_review: new Date(Date.now() - 86_400_000).toISOString()
		});
		if (error) throw new Error(`décor : carte : ${error.message}`);
		const due = await loadMathouCollection(eleveTle, eleveTleId, GRADE_TLE);
		expect(mathouOf(due, notionVecteurs)?.asleep).toBe(true);
	});
	// ---------------------------------------------------------------------------
	// Mémoire : un Mathou ne rapetisse jamais (§ 9, « Changement d'année et oubli »)
	// ---------------------------------------------------------------------------

	it('mémoire : un point acquis puis perdu → le Mathou reste matou et dort', async () => {
		const { id, client } = await newStudent(GRADE);
		// Fractions : p1 et p2 ; 1 acquis sur 2 → matou
		await setState(id, pointIds.p1, { is_acquired: true, total_successes: 2 });
		const acquis = await loadMathouCollection(client, id, GRADE);
		expect(mathouOf(acquis, notionFractions)).toMatchObject({ growth: 'matou', asleep: false });
		// Le calcul a écrit la mémoire (client service)
		expect(await storedMemory(id, notionFractions)).toMatchObject({
			best_stage: 'matou',
			starred_grades: []
		});

		// p1 n'est plus acquis, seuil du régime diversité atteint (2 modèles) : PERDU
		await setState(id, pointIds.p1, {
			is_acquired: false,
			total_successes: 2,
			distinct_template_successes: 2
		});
		const oublie = await loadMathouCollection(client, id, GRADE);
		expect(mathouOf(oublie, notionFractions)).toMatchObject({
			growth: 'matou',
			asleep: true,
			acquiredPoints: 0
		});
		// La mémoire n'a pas redescendu
		expect((await storedMemory(id, notionFractions))?.best_stage).toBe('matou');
	});

	it('mémoire : notion acquise en 1re spé, élève passé en Tle spé → grand matou ★ 1re spé', async () => {
		const { id, client } = await newStudent(GRADE);
		// Vecteurs : p3 (1re spé), p4 (Tle spé, hors parcours en 1re spé)
		await setState(id, pointIds.p3, { is_acquired: true, total_successes: 2 });
		const premiere = await loadMathouCollection(client, id, GRADE);
		expect(mathouOf(premiere, notionVecteurs)).toMatchObject({
			growth: 'grand_matou',
			stars: [GRADE]
		});
		expect(await storedMemory(id, notionVecteurs)).toMatchObject({
			best_stage: 'grand_matou',
			starred_grades: [GRADE]
		});

		// Rentrée : passage en Tle spé, p4 pas acquis
		await setGrade(id, GRADE_TLE);
		const terminale = await loadMathouCollection(client, id, GRADE_TLE);
		expect(mathouOf(terminale, notionVecteurs)).toMatchObject({
			growth: 'grand_matou',
			stars: [GRADE],
			asleep: false,
			workablePoints: 2
		});

		// Et même le point de 1re spé perdu : grand matou ★ 1re spé, endormi
		await setState(id, pointIds.p3, {
			is_acquired: false,
			total_successes: 2,
			distinct_template_successes: 2
		});
		const oublie = await loadMathouCollection(client, id, GRADE_TLE);
		expect(mathouOf(oublie, notionVecteurs)).toMatchObject({
			growth: 'grand_matou',
			stars: [GRADE],
			asleep: true
		});
		expect(await storedMemory(id, notionVecteurs)).toMatchObject({
			best_stage: 'grand_matou',
			starred_grades: [GRADE]
		});
	});

	it('mémoire : deux écritures concurrentes ne font jamais redescendre le stade ni perdre une étoile', async () => {
		const { id } = await newStudent(GRADE);
		const vide = new Map();
		// Deux calculs partis de la même lecture (aucune ligne) : l'un a vu grand matou ★ 1re spé,
		// l'autre seulement un chaton ★ 2nde. Plusieurs tours, pour croiser les ordres d'arrivée.
		for (let round = 0; round < 5; round += 1) {
			await service.from('student_mathoux').delete().eq('student_id', id).select('notion_id');
			await Promise.all([
				rememberMathoux(
					service,
					id,
					[{ notionId: notionVecteurs, bestStage: 'grand_matou', starredGrades: [GRADE] }],
					vide
				),
				rememberMathoux(
					service,
					id,
					[{ notionId: notionVecteurs, bestStage: 'chaton', starredGrades: ['2'] }],
					vide
				)
			]);
			expect(await storedMemory(id, notionVecteurs)).toMatchObject({
				best_stage: 'grand_matou',
				starred_grades: ['2', GRADE]
			});
		}

		// Lecture périmée : un calcul qui a lu la ligne AVANT qu'elle grandisse écrit un
		// stade plus bas sur cette vieille lecture → relue, fusionnée, pas de baisse.
		const perimee = await readMathouMemory(service, id);
		await rememberMathoux(
			service,
			id,
			[
				{
					notionId: notionVecteurs,
					bestStage: 'grand_matou',
					starredGrades: ['2', GRADE, GRADE_TLE]
				}
			],
			perimee
		);
		await rememberMathoux(
			service,
			id,
			[{ notionId: notionVecteurs, bestStage: 'matou', starredGrades: ['2', GRADE, '6'] }],
			perimee
		);
		expect(await storedMemory(id, notionVecteurs)).toMatchObject({
			best_stage: 'grand_matou',
			starred_grades: ['6', '2', GRADE, GRADE_TLE]
		});

		// Et deux calculs complets en parallèle, de bout en bout
		const { id: id2, client: client2 } = await newStudent(GRADE);
		await setState(id2, pointIds.p3, { is_acquired: true, total_successes: 1 });
		const [c1, c2] = await Promise.all([
			loadMathouCollection(client2, id2, GRADE),
			loadMathouCollection(client2, id2, GRADE)
		]);
		expect(mathouOf(c1, notionVecteurs)?.growth).toBe('grand_matou');
		expect(mathouOf(c2, notionVecteurs)?.growth).toBe('grand_matou');
		expect((await storedMemory(id2, notionVecteurs))?.best_stage).toBe('grand_matou');
	});

	// ---------------------------------------------------------------------------
	// Nouveautés annoncées en fin de séance (spec du 2026-10-21) : une fois, jamais deux
	// ---------------------------------------------------------------------------

	it('nouveautés : naissance annoncée une fois, puis plus ; puis la croissance, étoile jointe', async () => {
		const { id, client } = await newStudent(GRADE);
		// Fractions : p1 acquis sur 2 → né matou, premier passage
		await setState(id, pointIds.p1, { is_acquired: true, total_successes: 2 });
		const premier = await loadMathouCollectionWithNews(client, id, GRADE);
		expect(premier.news).toMatchObject({
			firstVisit: true,
			total: 1,
			items: [{ kind: 'birth', notionId: notionFractions, stage: 'matou', newStars: [] }]
		});

		// Même état, nouveau calcul : déjà en mémoire, rien à annoncer
		const second = await loadMathouCollectionWithNews(client, id, GRADE);
		expect(second.news).toEqual({ firstVisit: false, total: 0, items: [] });

		// p2 acquis : grand matou ★ 1re spé
		await setState(id, pointIds.p2, { is_acquired: true, total_successes: 2 });
		const grandi = await loadMathouCollectionWithNews(client, id, GRADE);
		expect(grandi.news).toMatchObject({
			firstVisit: false,
			total: 1,
			items: [
				{ kind: 'growth', notionId: notionFractions, stage: 'grand_matou', newStars: [GRADE] }
			]
		});
	});

	it('nouveautés : deux calculs en parallèle n’annoncent la naissance qu’une fois en tout', async () => {
		const { id, client } = await newStudent(GRADE);
		await setState(id, pointIds.p1, { is_acquired: true, total_successes: 2 });
		const [a, b] = await Promise.all([
			loadMathouCollectionWithNews(client, id, GRADE),
			loadMathouCollectionWithNews(client, id, GRADE)
		]);
		const annonces = [...a.news.items, ...b.news.items].filter(
			(item) => item.notionId === notionFractions
		);
		expect(annonces).toHaveLength(1);
		expect((await storedMemory(id, notionFractions))?.best_stage).toBe('matou');
	});

	it('mémoire : l’élève B ne lit pas la mémoire de A, ni ne l’écrit en passant son identifiant', async () => {
		const a = await newStudent(GRADE);
		const b = await newStudent(GRADE);
		await setState(a.id, pointIds.p3, { is_acquired: true, total_successes: 1 });
		await loadMathouCollection(a.client, a.id, GRADE);
		const avant = await storedMemory(a.id, notionVecteurs);
		expect(avant?.best_stage).toBe('grand_matou');

		// Le client de B, l'identifiant de A : la RLS ne rend aucune ligne (en silence)
		const lue = await readMathouMemory(b.client, a.id);
		expect(lue.size).toBe(0);
		const direct = await b.client
			.from('student_mathoux')
			.select('notion_id')
			.eq('student_id', a.id);
		expect(direct.error).toBeNull();
		expect(direct.data).toEqual([]);

		// Le calcul par B avec l'identifiant de A est refusé avant toute écriture…
		await expect(loadMathouCollection(b.client, a.id, GRADE)).rejects.toThrow(
			/n’est pas l’utilisateur de la session/
		);
		// … et la mémoire de A n'a pas bougé
		expect(await storedMemory(a.id, notionVecteurs)).toEqual(avant);
	});
	it('règle d’oubli : un point nouvellement tagué n’endort pas un grand matou ★ (David, 2026-10-18)', async () => {
		const { id, client } = await newStudent(GRADE);
		const branche = await insertNode('branch', 'branche neuve', null);
		const notion = await insertNode('notion', 'Suites', branche);
		const ancien = await insertPoint('p-suites-1', notion);
		templates.suites1 = await createFakeTemplate(service, id);
		await tag(templates.suites1, ancien, notion);
		await setState(id, ancien, { is_acquired: true, total_successes: 3 });

		const avant = await loadMathouCollection(client, id, GRADE);
		expect(mathouOf(avant, notion)).toMatchObject({
			growth: 'grand_matou',
			stars: [GRADE],
			asleep: false
		});

		// Un modèle publié tague un point neuf de la même classe : jamais tenté
		const neuf = await insertPoint('p-suites-2', notion);
		templates.suites2 = await createFakeTemplate(service, id);
		await tag(templates.suites2, neuf, notion);

		const apres = await loadMathouCollection(client, id, GRADE);
		expect(mathouOf(apres, notion)).toMatchObject({
			growth: 'grand_matou',
			stars: [GRADE],
			asleep: false,
			workablePoints: 2,
			acquiredPoints: 1
		});
		// Calcul seul : matou (1 sur 2) ; la mémoire garde grand matou et l'étoile
		expect(await storedMemory(id, notion)).toMatchObject({
			best_stage: 'grand_matou',
			starred_grades: [GRADE]
		});
	});
});
