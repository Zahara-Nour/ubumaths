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
 *     matou, et un point de 1re spé dû l'endort.
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
import { loadMathouCollection } from '$lib/server/mathoux/collection';
import type { Mathou, MathouCollection } from '$lib/mathoux/collection-logic';

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
	state: { is_acquired: boolean; total_successes: number }
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

		pointIds.p1 = await insertPoint('p1', notionFractions);
		pointIds.p2 = await insertPoint('p2', sousNotion);
		pointIds.p3 = await insertPoint('p3', notionVecteurs);
		// Point de Tle spé sur la même notion : hors parcours d'un élève de 1re spé
		pointIds.p4 = await insertPoint('p4', notionVecteurs, GRADE_TLE);

		const nodeOf: Record<string, string> = {
			p1: notionFractions,
			p2: sousNotion,
			p3: notionVecteurs,
			p4: notionVecteurs
		};
		for (const label of ['p1', 'p2', 'p3', 'p4']) {
			templates[label] = await createFakeTemplate(service, eleveAId);
			await tag(templates[label], pointIds[label], nodeOf[label]);
		}
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
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

	it('une réussite sur un point → un chaton', async () => {
		await setState(eleveAId, pointIds.p2, { is_acquired: false, total_successes: 1 });
		const collection = await loadMathouCollection(eleveA, eleveAId, GRADE);
		expect(mathouOf(collection, notionFractions)).toMatchObject({
			growth: 'chaton',
			name: `le Mathou « ${TAG} Fractions »`
		});
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

		// Le client de B, l'identifiant de A : la RLS ne rend aucun état de A.
		const volee = await loadMathouCollection(eleveB, eleveAId, GRADE);
		expect(mathouOf(volee, notionFractions)?.growth).toBe('a_decouvrir');
		expect(mathouOf(volee, notionVecteurs)).toMatchObject({
			growth: 'a_decouvrir',
			asleep: false
		});

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
});
