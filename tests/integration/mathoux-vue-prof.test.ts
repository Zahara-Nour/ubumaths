/**
 * Chatterie vue par le professeur : lue AUX DROITS DU PROF, sans jamais écrire
 * ============================================================================
 *
 * `readMathouCollection` refait le calcul de la Chatterie avec le client du
 * prof, et `loadMathouxCountsByStudent` compte la mémoire des élèves d'une
 * classe. La RLS refuse EN SILENCE : un accès refusé rendrait une Chatterie
 * vide, sans erreur. Ce fichier prouve, avec de vrais comptes, que :
 *   - le prof lit la même Chatterie que l'élève (états, cartes dues, mémoire) ;
 *   - la lecture du prof n'écrit RIEN : la mémoire reste vide, et l'élève voit
 *     encore ses naissances annoncées à sa visite suivante ;
 *   - les compteurs de classe viennent de la mémoire, sans les notions
 *     archivées ;
 *   - un élève, lui, ne lit ni la Chatterie ni les compteurs d'un autre.
 *
 * Phase 0 : docs/wip/mathoux-prof-progress.md.
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
import { loadMathouCollectionWithNews, readMathouCollection } from '$lib/server/mathoux/collection';
import { buyMathouDecoration, readOwnedDecorations } from '$lib/server/mathoux/decorations';
import { loadMathouxCountsByStudent } from '$lib/server/mathoux/teacher';
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

/** Préfixe unique à ce run ; « -t » final : voir mathoux-collection.test.ts. */
const TAG = `itest-mathoux-prof-${Date.now().toString(36)}-t`;
const GRADE = '1_SPE';

// ============================================================================
// VARIABLES
// ============================================================================

const service = createServiceRoleClient();

let prof: Client;
let eleve: Client;
let eleveId: string;
let autre: Client;
let autreId: string;

let notionFractions: string;
let notionVecteurs: string;
/** Notion archivée : jamais comptée. */
let notionArchivee: string;
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

async function insertNode(
	kind: string,
	name: string,
	parentId: string | null,
	archived = false
): Promise<string> {
	const { data, error } = await service
		.from('classification_nodes')
		.insert({
			kind,
			name: `${TAG} ${name}`,
			parent_id: parentId,
			archived_at: archived ? new Date().toISOString() : null
		})
		.select('id')
		.single();
	if (error || !data) throw new Error(`décor : nœud ${name} : ${error?.message}`);
	return data.id;
}

async function insertPoint(label: string, nodeId: string): Promise<string> {
	const { data, error } = await service
		.from('curriculum_points')
		.insert({
			kind: 'savoir_faire',
			name: `${TAG} ${label}`,
			code: `${TAG}-${label}`,
			grade: GRADE,
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

/** Lignes de mémoire de l'élève, relues HORS RLS : ce que la base contient vraiment. */
async function storedMemoryCount(studentId: string): Promise<number> {
	const { count, error } = await service
		.from('student_mathoux')
		.select('notion_id', { count: 'exact', head: true })
		.eq('student_id', studentId);
	if (error) throw new Error(`relecture mémoire : ${error.message}`);
	return count ?? 0;
}

async function newStudent(): Promise<{ id: string; client: Client }> {
	const profil = await TestData.profile().withRole('student').create();
	const { data, error } = await service
		.from('profiles')
		.update({ grade: GRADE })
		.eq('id', profil.id)
		.select('id');
	if (error || data?.length !== 1) throw new Error(`décor : niveau : ${error?.message}`);
	return { id: profil.id, client: await clientFor(profil.email) };
}

function mathouOf(collection: MathouCollection, notionId: string): Mathou | undefined {
	return collection.races.flatMap((r) => r.mathoux).find((m) => m.notionId === notionId);
}

// ============================================================================
// SUITE
// ============================================================================

describe('Chatterie vue par le professeur', () => {
	beforeAll(async () => {
		await cleanupAllTestData();

		const profilProf = await TestData.profile().withRole('teacher').create();
		prof = await clientFor(profilProf.email);
		({ id: eleveId, client: eleve } = await newStudent());
		({ id: autreId, client: autre } = await newStudent());

		const cls = await TestData.class().create();
		const { error: memberError } = await service.from('class_members').insert([
			{ class_id: cls.id, student_id: eleveId, status: 'active' },
			{ class_id: cls.id, student_id: autreId, status: 'active' }
		]);
		if (memberError) throw new Error(`décor : classe : ${memberError.message}`);

		const branche = await insertNode('branch', 'branche', null);
		notionFractions = await insertNode('notion', 'Fractions', branche);
		notionVecteurs = await insertNode('notion', 'Vecteurs', branche);
		notionArchivee = await insertNode('notion', 'Archivée', branche, true);

		pointIds.p1 = await insertPoint('p1', notionFractions);
		pointIds.p3 = await insertPoint('p3', notionVecteurs);
		for (const [label, node] of [
			['p1', notionFractions],
			['p3', notionVecteurs]
		]) {
			templates[label] = await createFakeTemplate(service, eleveId);
			await tag(templates[label], pointIds[label], node);
		}

		// Fractions : une réussite → chaton ; Vecteurs : acquis et dû → grand matou endormi
		await setState(eleveId, pointIds.p1, { is_acquired: false, total_successes: 1 });
		await setState(eleveId, pointIds.p3, { is_acquired: true, total_successes: 3 });
		const { error: cardError } = await service.from('srs_card_stats').insert({
			user_id: eleveId,
			card_reference_type: 'template',
			card_reference_id: templates.p3,
			state: 'review',
			next_review: new Date(Date.now() - 86_400_000).toISOString()
		});
		if (cardError) throw new Error(`décor : carte : ${cardError.message}`);
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
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

	it('le prof lit la Chatterie de l’élève, siestes comprises, sans rien écrire', async () => {
		const vueProf = await readMathouCollection(prof, eleveId, GRADE);
		expect(mathouOf(vueProf, notionFractions)).toMatchObject({ growth: 'chaton', asleep: false });
		expect(mathouOf(vueProf, notionVecteurs)).toMatchObject({
			growth: 'grand_matou',
			asleep: true
		});
		expect(vueProf.counts).toMatchObject({ born: 2, napping: 1 });

		// Rien d'écrit : la mémoire de l'élève est toujours vide
		expect(await storedMemoryCount(eleveId)).toBe(0);
	});

	it('après la visite du prof, l’élève voit encore ses naissances annoncées, et la même Chatterie', async () => {
		await readMathouCollection(prof, eleveId, GRADE);
		const vueEleve = await loadMathouCollectionWithNews(eleve, eleveId, GRADE);
		expect(vueEleve.news).toMatchObject({ firstVisit: true, total: 2 });

		const vueProf = await readMathouCollection(prof, eleveId, GRADE);
		expect(vueProf).toEqual(vueEleve.collection);
	});

	it('le prof lit la mémoire : un Mathou oublié reste à son meilleur stade', async () => {
		// Fractions mémorisé grand matou ; le calcul seul ne donnerait qu'un chaton
		const { error } = await service
			.from('student_mathoux')
			.update({ best_stage: 'grand_matou' })
			.eq('student_id', eleveId)
			.eq('notion_id', notionFractions)
			.select('notion_id')
			.single();
		if (error) throw new Error(`décor : mémoire : ${error.message}`);

		const vueProf = await readMathouCollection(prof, eleveId, GRADE);
		expect(mathouOf(vueProf, notionFractions)?.growth).toBe('grand_matou');
	});

	it('décoration de panse : l’élève et le prof la voient sur le Mathou, un autre élève rien', async () => {
		const { error } = await service
			.from('profiles')
			.update({ gidouilles: 20 })
			.eq('id', eleveId)
			.select('id')
			.single();
		if (error) throw new Error(`décor : gidouilles : ${error.message}`);
		const achat = await buyMathouDecoration(service, eleveId, 'cockade', notionFractions);
		expect(achat).toEqual({ ok: true, balance: 0 });

		const vueEleve = await loadMathouCollectionWithNews(eleve, eleveId, GRADE);
		expect(mathouOf(vueEleve.collection, notionFractions)?.decoration).toBe('cockade');
		expect(mathouOf(vueEleve.collection, notionVecteurs)?.decoration).toBeNull();
		const vueProf = await readMathouCollection(prof, eleveId, GRADE);
		expect(mathouOf(vueProf, notionFractions)?.decoration).toBe('cockade');

		expect(await readOwnedDecorations(eleve, eleveId)).toEqual(['cockade']);
		expect(await readOwnedDecorations(prof, eleveId)).toEqual(['cockade']);
		// RLS : zéro ligne, sans erreur
		expect(await readOwnedDecorations(autre, eleveId)).toEqual([]);
	});

	it('collier : l’élève et le prof le voient au cou du Mathou, un autre élève rien', async () => {
		const { error } = await service
			.from('profiles')
			.update({ gidouilles: 10 })
			.eq('id', eleveId)
			.select('id')
			.single();
		if (error) throw new Error(`décor : gidouilles : ${error.message}`);
		const achat = await buyMathouDecoration(service, eleveId, 'bow_tie', notionVecteurs);
		expect(achat).toEqual({ ok: true, balance: 0 });

		const vueEleve = await loadMathouCollectionWithNews(eleve, eleveId, GRADE);
		expect(mathouOf(vueEleve.collection, notionVecteurs)?.collar).toBe('bow_tie');
		expect(mathouOf(vueEleve.collection, notionFractions)?.collar).toBeNull();
		const vueProf = await readMathouCollection(prof, eleveId, GRADE);
		expect(mathouOf(vueProf, notionVecteurs)?.collar).toBe('bow_tie');

		expect(await readOwnedDecorations(eleve, eleveId)).toContain('bow_tie');
		expect(await readOwnedDecorations(prof, eleveId)).toContain('bow_tie');
		expect(await readOwnedDecorations(autre, eleveId)).toEqual([]);
	});

	it('compteurs de classe : la mémoire, sans les notions archivées', async () => {
		const { error } = await service
			.from('student_mathoux')
			.insert({ student_id: eleveId, notion_id: notionArchivee, best_stage: 'grand_matou' });
		if (error) throw new Error(`décor : mémoire archivée : ${error.message}`);

		const counts = await loadMathouxCountsByStudent(prof, [eleveId, autreId]);
		// Fractions et Vecteurs, tous deux grands matous ; l'archivée ignorée
		expect(counts.get(eleveId)).toEqual({ born: 2, grandMatous: 2 });
		expect(counts.get(autreId)).toEqual({ born: 0, grandMatous: 0 });
	});

	it('un élève ne lit ni la Chatterie ni les compteurs d’un autre (RLS)', async () => {
		const vue = await readMathouCollection(autre, eleveId, GRADE);
		expect(vue.counts.born).toBe(0);
		expect(mathouOf(vue, notionVecteurs)?.growth).toBe('a_decouvrir');

		const counts = await loadMathouxCountsByStudent(autre, [eleveId]);
		expect(counts.get(eleveId)).toEqual({ born: 0, grandMatous: 0 });
	});
});
