/**
 * La Descente de la Vistule : apparition des Bêtes (chantier `navadra`, étape 2)
 * =============================================================================
 *
 * Phase 0 de l'étape 2 validée par David le 2026-11-18 (docs/wip/navadra-progress.md).
 *
 * Ce que ce test prouve sur la vraie base (les règles de choix sont testées à part,
 * `src/lib/descente/__tests__/spawn-logic.test.ts`) :
 *   - les lectures passent aux droits de L'ÉLÈVE (RLS) : ses Bêtes, son état par
 *     point ; le chemin JSON de la première variation des modèles est lisible ;
 *   - un point à remédier jouable fait naître la grosse Bête, avec la Province de
 *     sa branche (correspondance de la question A) ;
 *   - un point à remédier fait naître une Bête qui reste jusqu'à sa défaite ;
 *   - un point sans modèle jouable (deux cases, ou modèle en brouillon) ne fait
 *     naître aucune Bête ;
 *   - une seconde visite aussitôt après ne fait rien naître ;
 *   - l'élève de la session seul : un autre identifiant lève, rien n'est écrit ;
 *   - sans niveau scolaire, aucune Bête.
 *
 * Le décor s'appuie sur les branches du référentiel local (leurs NOMS fixent la
 * Province) ; nos notions et points y sont ajoutés sous un préfixe de test.
 *
 * `pnpm db:start` puis `pnpm test:integration tests/integration/descente-apparition.test.ts`.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.ts';
import {
	createServiceRoleClient,
	cleanupAllTestData
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { TestData } from '../helpers/database/test-data-factory';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { createFakeTemplate } from '../helpers/competence-referentiel.helpers';
import { spawnBeasts } from '#lib/server/descente/spawn.ts';

// Types
type Client = SupabaseClient<Database>;
type Student = { id: string; client: Client };

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const TAG = `itest-descente-${Date.now().toString(36)}`;
const GRADE = '6';
const DAY_MS = 24 * 60 * 60 * 1000;
const ONE_BLANK = [{ statement: 'Combien ? $?$', blanks: [{ expectedAnswer: '3' }] }];
const TWO_BLANKS = [
	{ statement: '$? + ?$', blanks: [{ expectedAnswer: '1' }, { expectedAnswer: '2' }] }
];
/** Tirage déterministe : toujours le premier élément. */
const first = () => 0;

// Variables
const service = createServiceRoleClient();
let student: Student;
let other: Student;
const points: Record<string, string> = {};
const templateIds: string[] = [];

// Functions
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

async function newStudent(grade: string | null): Promise<Student> {
	const profile = await TestData.profile().withRole('student').create();
	const { data, error } = await service
		.from('profiles')
		.update({ grade })
		.eq('id', profile.id)
		.select('id');
	if (error || data?.length !== 1) throw new Error(`décor : niveau : ${error?.message}`);
	return { id: profile.id, client: await clientFor(profile.email) };
}

async function branchId(name: string): Promise<string> {
	const { data, error } = await service
		.from('classification_nodes')
		.select('id')
		.eq('kind', 'branch')
		.eq('name', name)
		.is('archived_at', null)
		.limit(1);
	if (error || data?.length !== 1)
		throw new Error(`décor : branche « ${name} » absente : ${error?.message}`);
	return data[0].id;
}

async function insertNotion(label: string, parentId: string): Promise<string> {
	const { data, error } = await service
		.from('classification_nodes')
		.insert({ kind: 'notion', name: `${TAG} ${label}`, parent_id: parentId })
		.select('id')
		.single();
	if (error || !data) throw new Error(`décor : notion ${label} : ${error?.message}`);
	return data.id;
}

/**
 * Un point du niveau, marqué à remédier pour l'élève, tagué par un modèle aux
 * variations données (publié ou brouillon).
 */
async function remediationPoint(
	label: string,
	notionId: string,
	variations: unknown[],
	status: 'published' | 'draft' = 'published'
): Promise<string> {
	const { data: point, error: pointError } = await service
		.from('curriculum_points')
		.insert({
			kind: 'savoir_faire',
			name: `${TAG} ${label}`,
			code: `${TAG}-${label}`,
			grade: GRADE,
			node_id: notionId
		})
		.select('id')
		.single();
	if (pointError || !point) throw new Error(`décor : point ${label} : ${pointError?.message}`);

	const templateId = await createFakeTemplate(service, student.id);
	templateIds.push(templateId);
	const updated = await service
		.from('question_templates')
		.update({
			classification_node_id: notionId,
			variations:
				variations as Database['public']['Tables']['question_templates']['Update']['variations']
		})
		.eq('id', templateId)
		.select('id');
	if (updated.error || updated.data?.length !== 1)
		throw new Error(`décor : modèle : ${updated.error?.message}`);

	const tagged = await service
		.from('question_template_points')
		.insert({ template_id: templateId, point_id: point.id });
	if (tagged.error) throw new Error(`décor : tag : ${tagged.error.message}`);

	if (status === 'draft') {
		const draft = await service
			.from('question_templates')
			.update({ status: 'draft' })
			.eq('id', templateId)
			.select('id');
		if (draft.error || draft.data?.length !== 1)
			throw new Error(`décor : brouillon : ${draft.error?.message}`);
	}

	const state = await service
		.from('student_point_state')
		.upsert({
			student_id: student.id,
			point_id: point.id,
			is_acquired: false,
			needs_remediation: true
		})
		.select('point_id');
	if (state.error || state.data?.length !== 1)
		throw new Error(`décor : état : ${state.error?.message}`);
	return point.id;
}

/** Marque des points « à remédier » pour un élève (client service). */
async function markRemediation(studentId: string, pointIds: string[]): Promise<void> {
	const { data, error } = await service
		.from('student_point_state')
		.upsert(
			pointIds.map((pointId) => ({
				student_id: studentId,
				point_id: pointId,
				is_acquired: false,
				needs_remediation: true
			}))
		)
		.select('point_id');
	if (error || data?.length !== pointIds.length)
		throw new Error(`décor : états : ${error?.message}`);
}

/** Une Bête posée par le client service, sans point (ne bloque aucun point). */
async function seedBeast(
	studentId: string,
	fields: { kind: 'ordinary' | 'big'; appeared_at: string; leaves_at: string | null }
): Promise<string> {
	const { data, error } = await service
		.from('student_beasts')
		.insert({
			student_id: studentId,
			beast_key: 'nombrilie-1',
			province: 'nombrilie',
			max_hp: 100,
			hp: 100,
			...fields
		})
		.select('id')
		.single();
	if (error || !data) throw new Error(`décor : Bête : ${error?.message}`);
	return data.id;
}

/** Bêtes relues HORS RLS : ce que la base contient vraiment. */
async function storedBeasts(studentId: string) {
	const { data, error } = await service
		.from('student_beasts')
		.select('kind, beast_key, province, point_id, max_hp, hp, appeared_at, leaves_at, defeated_at')
		.eq('student_id', studentId);
	if (error) throw new Error(`relecture : ${error.message}`);
	return data ?? [];
}

// Suite
describe('Descente : apparition des Bêtes aux droits de l’élève', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		student = await newStudent(GRADE);
		other = await newStudent(GRADE);

		const geometry = await insertNotion('géométrie', await branchId('Géométrie'));
		const functions = await insertNotion('fonctions', await branchId('Fonctions'));

		points.big = await remediationPoint('grosse', geometry, ONE_BLANK);
		points.stays = await remediationPoint('reste', functions, ONE_BLANK);
		points.twoBlanks = await remediationPoint('deux-cases', geometry, TWO_BLANKS);
		points.draft = await remediationPoint('brouillon', functions, ONE_BLANK, 'draft');
	});

	// Le décor ajouté au référentiel (notions, points, modèles) doit partir : les tests du
	// seed comparent l'arbre et les points à leurs fixtures
	afterAll(async () => {
		const pg = await getPostgresClient();
		const run = (sql: string, params: unknown[]) => pg.query(sql, params).catch(() => undefined);
		await run(
			'delete from public.student_point_state where point_id in (select id from public.curriculum_points where code like $1)',
			[`${TAG}%`]
		);
		await run('delete from public.question_template_points where template_id = any($1::uuid[])', [
			templateIds
		]);
		await run('delete from public.question_templates where id = any($1::uuid[])', [templateIds]);
		await run('delete from public.curriculum_points where code like $1', [`${TAG}%`]);
		await run("delete from public.classification_nodes where kind = 'notion' and name like $1", [
			`${TAG}%`
		]);
		await cleanupAllTestData();
	});

	it('première visite : des Bêtes ordinaires nées des points jouables, pas de grosse Bête', async () => {
		const now = new Date();
		const result = await spawnBeasts(student.client, student.id, now, first);

		const beasts = await storedBeasts(student.id);
		expect(result.created).toBe(beasts.length);
		// 3 ordinaires au plus (moins si le référentiel local manque de points jouables)
		expect(beasts.length).toBeGreaterThanOrEqual(2);
		expect(beasts.length).toBeLessThanOrEqual(3);
		expect(beasts.filter((b) => b.kind !== 'ordinary')).toEqual([]);

		// Les deux points à remédier jouables passent d'abord : leurs Bêtes restent jusqu'à
		// leur défaite. La Province est celle de la branche du point (Géométrie → Bedonstan,
		// Fonctions → Yoyolande).
		expect(beasts.find((b) => b.point_id === points.big)).toMatchObject({
			province: 'bedonstan',
			max_hp: 120,
			hp: 120,
			leaves_at: null
		});
		expect(beasts.find((b) => b.point_id === points.stays)).toMatchObject({
			province: 'yoyolande',
			leaves_at: null
		});

		// Aucun point sans modèle jouable (deux cases, brouillon)
		const born = beasts.map((b) => b.point_id);
		expect(born).not.toContain(points.twoBlanks);
		expect(born).not.toContain(points.draft);
		// Jamais deux Bêtes sur le même point
		expect(new Set(born).size).toBe(born.length);
	});

	it('l’élève lit ses Bêtes à ses droits (RLS), pas celles d’un autre', async () => {
		const own = await student.client.from('student_beasts').select('id');
		expect(own.error).toBeNull();
		expect(own.data?.length).toBe((await storedBeasts(student.id)).length);

		const fromOther = await other.client
			.from('student_beasts')
			.select('id')
			.eq('student_id', student.id);
		expect(fromOther.error).toBeNull();
		expect(fromOther.data).toEqual([]);
	});

	it('seconde visite aussitôt après : rien de plus', async () => {
		const before = (await storedBeasts(student.id)).length;
		const result = await spawnBeasts(student.client, student.id, new Date(), first);
		expect(result.created).toBe(0);
		expect(await storedBeasts(student.id)).toHaveLength(before);
	});

	it('carte pleine (5 Bêtes vivantes, lues à ses droits) : rien, même 2 jours après', async () => {
		const full = await newStudent(GRADE);
		await markRemediation(full.id, [points.big, points.stays]);
		const twoDaysAgo = new Date(Date.now() - 2 * DAY_MS).toISOString();
		const ids: string[] = [];
		for (let i = 0; i < 5; i++) {
			ids.push(
				await seedBeast(full.id, { kind: 'ordinary', appeared_at: twoDaysAgo, leaves_at: null })
			);
		}
		// Une grosse Bête vivante : seule la place des ordinaires est en jeu
		await seedBeast(full.id, { kind: 'big', appeared_at: twoDaysAgo, leaves_at: null });

		const result = await spawnBeasts(full.client, full.id, new Date(), first);
		expect(result.created).toBe(0);
		expect(await storedBeasts(full.id)).toHaveLength(6);

		// Une Bête repartie (départ passé, filtre `leaves_at` en date ISO) libère une place
		const left = await service
			.from('student_beasts')
			.update({ leaves_at: new Date(Date.now() - 60_000).toISOString() })
			.eq('id', ids[0])
			.select('id');
		expect(left.data).toHaveLength(1);

		const again = await spawnBeasts(full.client, full.id, new Date(), first);
		expect(again.created).toBe(1);
		const born = (await storedBeasts(full.id)).filter((b) => b.point_id !== null);
		expect(born).toHaveLength(1);
		expect([points.big, points.stays]).toContain(born[0].point_id);
	});

	it('7 jours après l’arrivée : la grosse Bête, née d’un point à remédier', async () => {
		const veteran = await newStudent(GRADE);
		await markRemediation(veteran.id, [points.big, points.stays]);
		// Arrivée il y a 8 jours ; une Bête ordinaire récente (aucune ordinaire due)
		const eightDaysAgo = new Date(Date.now() - 8 * DAY_MS).toISOString();
		await seedBeast(veteran.id, { kind: 'ordinary', appeared_at: eightDaysAgo, leaves_at: null });
		await seedBeast(veteran.id, {
			kind: 'ordinary',
			appeared_at: new Date(Date.now() - 60_000).toISOString(),
			leaves_at: null
		});

		const now = new Date();
		const result = await spawnBeasts(veteran.client, veteran.id, now, first);
		expect(result.created).toBe(1);

		const big = (await storedBeasts(veteran.id)).filter((b) => b.kind === 'big');
		expect(big).toHaveLength(1);
		const provinceOf: Record<string, string> = {
			[points.big]: 'bedonstan',
			[points.stays]: 'yoyolande'
		};
		expect(Object.keys(provinceOf)).toContain(big[0].point_id);
		expect(big[0]).toMatchObject({
			province: provinceOf[big[0].point_id ?? ''],
			max_hp: 360,
			hp: 360
		});
		expect(new Date(big[0].leaves_at ?? 0).getTime()).toBe(now.getTime() + 7 * DAY_MS);
	});

	it('un autre identifiant que celui de la session lève, et rien n’est écrit', async () => {
		await expect(spawnBeasts(student.client, other.id, new Date(), first)).rejects.toThrow(
			/session/
		);
		expect(await storedBeasts(other.id)).toEqual([]);
	});

	it('sans niveau scolaire : aucune Bête', async () => {
		const noGrade = await newStudent(null);
		const result = await spawnBeasts(noGrade.client, noGrade.id, new Date(), first);
		expect(result.created).toBe(0);
		expect(await storedBeasts(noGrade.id)).toEqual([]);
	});
});
