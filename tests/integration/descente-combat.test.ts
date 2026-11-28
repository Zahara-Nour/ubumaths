/**
 * La Descente de la Vistule : combat de la recrue (chantier `navadra`, étape 3)
 * =============================================================================
 *
 * Phase 0 de l'étape 3 validée par David le 2026-11-18 (docs/wip/navadra-progress.md).
 * Les règles du tour (cœurs, riposte, repli) sont testées à part
 * (`src/lib/descente/__tests__/combat-rules.test.ts`).
 *
 * Ce que ce test prouve sur la vraie base :
 *   - la Bête est lue aux droits de L'ÉLÈVE : celle d'un autre élève est
 *     introuvable ; vaincue ou repartie, pas de combat ;
 *   - ouvrir le combat remet une Bête ordinaire en pleine forme, pas la grosse ;
 *   - la question d'un coup sensible ou d'une esquive vient du point de la Bête ;
 *     modèle dépublié depuis : un autre point de la même Province, à son niveau ;
 *   - une réponse en combat laisse une trace ordinaire (lieu `descente`, origine
 *     `auto`), écrite par le serveur, et compte comme travail ;
 *   - le serveur tient les PV : 20 sur la Province sensible, 8 ailleurs, rien pour
 *     un coup raté ou une esquive ;
 *   - à 0 : victoire, gidouilles versées, Bête vaincue ; plus de combat ensuite ;
 *   - victoire renvoyée : seulement pour une Bête à 0 ;
 *   - l'élève de la session seul : un autre identifiant lève, rien n'est écrit.
 *
 * `pnpm db:start` puis `pnpm test:integration tests/integration/descente-combat.test.ts`.
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
import {
	claimBeastVictory,
	drawCombatQuestion,
	openCombat,
	recordCombatAnswer,
	type CombatAnswerInput
} from '#lib/server/descente/combat.ts';

// Types
type Client = SupabaseClient<Database>;
type Student = { id: string; client: Client };
type BeastFields = Partial<Database['public']['Tables']['student_beasts']['Insert']>;

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const TAG = `itest-combat-${Date.now().toString(36)}`;
const GRADE = '6';
const ONE_BLANK = [{ statement: 'Combien ? $?$', blanks: [{ expectedAnswer: '3' }] }];

// Variables
const service = createServiceRoleClient();
let student: Student;
let other: Student;
/** Point de la Bête (géométrie) */
let beastPoint: string;
const templates: Record<string, string> = {};
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

async function newStudent(): Promise<Student> {
	const profile = await TestData.profile().withRole('student').create();
	const { data, error } = await service
		.from('profiles')
		.update({ grade: GRADE, gidouilles: 0 })
		.eq('id', profile.id)
		.select('id');
	if (error || data?.length !== 1) throw new Error(`décor : niveau : ${error?.message}`);
	return { id: profile.id, client: await clientFor(profile.email) };
}

async function geometryNotion(): Promise<string> {
	const { data: branch, error } = await service
		.from('classification_nodes')
		.select('id')
		.eq('kind', 'branch')
		.eq('name', 'Géométrie')
		.is('archived_at', null)
		.limit(1);
	if (error || branch?.length !== 1)
		throw new Error(`décor : branche Géométrie : ${error?.message}`);
	const { data, error: notionError } = await service
		.from('classification_nodes')
		.insert({ kind: 'notion', name: `${TAG} géométrie`, parent_id: branch[0].id })
		.select('id')
		.single();
	if (notionError || !data) throw new Error(`décor : notion : ${notionError?.message}`);
	return data.id;
}

/** Un point du niveau tagué par un modèle publié à une case. */
async function playablePoint(label: string, notionId: string): Promise<string> {
	const { data: point, error } = await service
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
	if (error || !point) throw new Error(`décor : point ${label} : ${error?.message}`);

	const templateId = await createFakeTemplate(service, student.id);
	templateIds.push(templateId);
	templates[label] = templateId;
	const updated = await service
		.from('question_templates')
		.update({
			classification_node_id: notionId,
			variations:
				ONE_BLANK as Database['public']['Tables']['question_templates']['Update']['variations']
		})
		.eq('id', templateId)
		.select('id');
	if (updated.error || updated.data?.length !== 1)
		throw new Error(`décor : modèle : ${updated.error?.message}`);
	const tagged = await service
		.from('question_template_points')
		.insert({ template_id: templateId, point_id: point.id });
	if (tagged.error) throw new Error(`décor : tag : ${tagged.error.message}`);
	return point.id;
}

async function seedBeast(studentId: string, fields: BeastFields = {}): Promise<string> {
	const { data, error } = await service
		.from('student_beasts')
		.insert({
			student_id: studentId,
			beast_key: 'bedonstan-1',
			kind: 'ordinary',
			province: 'bedonstan',
			point_id: beastPoint,
			max_hp: 120,
			hp: 120,
			...fields
		})
		.select('id')
		.single();
	if (error || !data) throw new Error(`décor : Bête : ${error?.message}`);
	return data.id;
}

/** Bête relue HORS RLS. */
async function storedBeast(id: string) {
	const { data, error } = await service
		.from('student_beasts')
		.select('hp, defeated_at, rewarded_gidouilles')
		.eq('id', id)
		.single();
	if (error || !data) throw new Error(`relecture : ${error?.message}`);
	return data;
}

/** Traces de l'élève relues HORS RLS. */
async function traces(studentId: string) {
	const { data, error } = await service
		.from('skill_attempts')
		.select('template_id, success, place, source')
		.eq('student_id', studentId)
		.order('created_at');
	if (error) throw new Error(`relecture des traces : ${error.message}`);
	return data ?? [];
}

function answer(beastId: string, fields: Partial<CombatAnswerInput>): CombatAnswerInput {
	return {
		beastId,
		purpose: 'attack',
		province: 'bedonstan',
		templateId: templates.beast,
		success: true,
		answerParts: null,
		partVerdicts: null,
		...fields
	};
}

// Suite
describe('Descente : combat de la recrue sur la vraie base', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		student = await newStudent();
		other = await newStudent();
		const notion = await geometryNotion();
		beastPoint = await playablePoint('bete', notion);
		// Un autre point de géométrie du niveau (repli quand le modèle de la Bête est dépublié)
		await playablePoint('autre', notion);
		// `beast` : modèle du point de la Bête ; `autre` : celui de l'autre point
		templates.beast = templates.bete;
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
		const run = (sql: string, params: unknown[]) => pg.query(sql, params).catch(() => undefined);
		await run('delete from public.skill_attempts where template_id = any($1::uuid[])', [
			templateIds
		]);
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

	describe('ouvrir le combat', () => {
		it('Bête ordinaire blessée : remise en pleine forme ; Province sensible ouverte', async () => {
			const id = await seedBeast(student.id, { hp: 50 });
			const combat = await openCombat(student.client, student.id, id);
			expect(combat.beast).toMatchObject({ id, kind: 'ordinary', province: 'bedonstan', hp: 120 });
			expect(combat.beast.name).toBe('Bête de Bedonstan n° 1');
			expect(combat.openProvinces).toContain('bedonstan');
			expect((await storedBeast(id)).hp).toBe(120);
		});

		it('grosse Bête : elle garde ses blessures', async () => {
			const id = await seedBeast(student.id, { kind: 'big', max_hp: 360, hp: 200 });
			const combat = await openCombat(student.client, student.id, id);
			expect(combat.beast).toMatchObject({ kind: 'big', hp: 200, maxHp: 360 });
			expect((await storedBeast(id)).hp).toBe(200);
		});

		it('Bête d’un autre élève : introuvable (RLS)', async () => {
			const id = await seedBeast(other.id);
			await expect(openCombat(student.client, student.id, id)).rejects.toMatchObject({
				code: 'not_found'
			});
		});

		it('Bête vaincue ou repartie : pas de combat', async () => {
			const defeated = await seedBeast(student.id, {
				hp: 0,
				defeated_at: new Date().toISOString(),
				rewarded_gidouilles: 1
			});
			await expect(openCombat(student.client, student.id, defeated)).rejects.toMatchObject({
				code: 'defeated'
			});
			const gone = await seedBeast(student.id, {
				leaves_at: new Date(Date.now() - 60_000).toISOString()
			});
			await expect(openCombat(student.client, student.id, gone)).rejects.toMatchObject({
				code: 'gone'
			});
		});
	});

	describe('tirer une question', () => {
		it('coup sensible et esquive : du point de la Bête', async () => {
			const id = await seedBeast(student.id);
			for (const purpose of ['attack', 'dodge'] as const) {
				const { instance } = await drawCombatQuestion(student.client, student.id, {
					beastId: id,
					purpose,
					province: 'bedonstan',
					recentTemplateIds: []
				});
				expect(instance.templateId).toBe(templates.beast);
				expect(instance.blanks).toHaveLength(1);
			}
		});

		it('modèle du point de la Bête dépublié : un autre point de la Province, à son niveau', async () => {
			const id = await seedBeast(student.id);
			const draft = await service
				.from('question_templates')
				.update({ status: 'draft' })
				.eq('id', templates.beast)
				.select('id');
			expect(draft.data).toHaveLength(1);
			try {
				// Le référentiel local a d'autres points de géométrie de 6e : on vérifie
				// seulement que la question ne vient plus du modèle dépublié
				const { instance } = await drawCombatQuestion(student.client, student.id, {
					beastId: id,
					purpose: 'dodge',
					province: 'bedonstan',
					recentTemplateIds: []
				});
				expect(instance.templateId).not.toBe(templates.beast);
				expect(instance.blanks).toHaveLength(1);
			} finally {
				await service
					.from('question_templates')
					.update({ status: 'published' })
					.eq('id', templates.beast)
					.select('id');
			}
		});
	});

	describe('répondre', () => {
		it('coup réussi sur la Province sensible : −20, trace `descente` écrite par le serveur', async () => {
			const fighter = await newStudent();
			const id = await seedBeast(fighter.id);
			const result = await recordCombatAnswer(fighter.client, fighter.id, answer(id, {}));
			expect(result).toEqual({ beastHp: 100, recorded: true, victory: null });
			expect((await storedBeast(id)).hp).toBe(100);
			expect(await traces(fighter.id)).toEqual([
				{ template_id: templates.beast, success: true, place: 'descente', source: 'auto' }
			]);
		});

		it('coup réussi d’une autre Province : −8 ; coup raté ou esquive : rien', async () => {
			const fighter = await newStudent();
			const id = await seedBeast(fighter.id);
			const elsewhere = await recordCombatAnswer(
				fighter.client,
				fighter.id,
				answer(id, { province: 'nombrilie', templateId: templates.autre })
			);
			expect(elsewhere.beastHp).toBe(112);

			const missed = await recordCombatAnswer(
				fighter.client,
				fighter.id,
				answer(id, { success: false })
			);
			expect(missed.beastHp).toBe(112);

			const dodge = await recordCombatAnswer(
				fighter.client,
				fighter.id,
				answer(id, { purpose: 'dodge' })
			);
			expect(dodge.beastHp).toBe(112);
			expect((await storedBeast(id)).hp).toBe(112);

			// Trois réponses, trois traces : chacune compte comme travail
			expect((await traces(fighter.id)).map((t) => [t.success, t.place])).toEqual([
				[true, 'descente'],
				[false, 'descente'],
				[true, 'descente']
			]);
		});

		it('le coup qui achève : victoire, gidouille versée, puis plus de combat', async () => {
			const fighter = await newStudent();
			const id = await seedBeast(fighter.id, { hp: 15 });
			const result = await recordCombatAnswer(fighter.client, fighter.id, answer(id, {}));
			expect(result).toEqual({
				beastHp: 0,
				recorded: true,
				victory: { paid: 1, capReached: false }
			});

			const stored = await storedBeast(id);
			expect(stored.defeated_at).not.toBeNull();
			expect(stored.rewarded_gidouilles).toBe(1);
			const { data: profile } = await service
				.from('profiles')
				.select('gidouilles')
				.eq('id', fighter.id)
				.single();
			expect(profile?.gidouilles).toBe(1);

			await expect(
				recordCombatAnswer(fighter.client, fighter.id, answer(id, {}))
			).rejects.toMatchObject({ code: 'defeated' });
		});

		it('modèle inconnu : rien n’est compté', async () => {
			const fighter = await newStudent();
			const id = await seedBeast(fighter.id);
			await expect(
				recordCombatAnswer(
					fighter.client,
					fighter.id,
					answer(id, { templateId: '00000000-0000-4000-8000-000000000000' })
				)
			).rejects.toMatchObject({ code: 'not_found' });
			expect((await storedBeast(id)).hp).toBe(120);
			expect(await traces(fighter.id)).toEqual([]);
		});
	});

	describe('renvoyer la victoire', () => {
		it('Bête à 0, pas encore vaincue : victoire enregistrée', async () => {
			const fighter = await newStudent();
			const id = await seedBeast(fighter.id, { hp: 0 });
			// Ouvrir le combat ne la remet pas en forme : la victoire reste à renvoyer
			const combat = await openCombat(fighter.client, fighter.id, id);
			expect(combat.beast.hp).toBe(0);
			expect(await claimBeastVictory(fighter.client, fighter.id, id)).toEqual({
				paid: 1,
				capReached: false
			});
			expect((await storedBeast(id)).defeated_at).not.toBeNull();
		});

		it('Bête encore debout : refusé', async () => {
			const fighter = await newStudent();
			const id = await seedBeast(fighter.id, { hp: 40 });
			await expect(claimBeastVictory(fighter.client, fighter.id, id)).rejects.toMatchObject({
				code: 'not_won'
			});
			expect((await storedBeast(id)).defeated_at).toBeNull();
		});
	});

	it('la Bête d’un autre élève, avec son propre identifiant : introuvable, rien n’est écrit', async () => {
		const theirs = await seedBeast(other.id, { hp: 0 });
		await expect(
			recordCombatAnswer(student.client, student.id, answer(theirs, {}))
		).rejects.toMatchObject({ code: 'not_found' });
		await expect(claimBeastVictory(student.client, student.id, theirs)).rejects.toMatchObject({
			code: 'not_found'
		});
		const stored = await storedBeast(theirs);
		expect(stored.defeated_at).toBeNull();
		expect(stored.rewarded_gidouilles).toBeNull();
		expect((await traces(student.id)).filter((t) => t.place === 'descente')).toEqual([]);
	});

	it('un autre identifiant que celui de la session lève, et rien n’est écrit', async () => {
		const id = await seedBeast(other.id);
		await expect(recordCombatAnswer(student.client, other.id, answer(id, {}))).rejects.toThrow(
			/session/
		);
		expect((await storedBeast(id)).hp).toBe(120);
		expect(await traces(other.id)).toEqual([]);
	});
});
