/**
 * La Descente de la Vistule : fondations en base (chantier `navadra`, étape 1)
 * ===========================================================================
 *
 * Phase 0 validée par David le 2026-11-18 (docs/wip/navadra-progress.md).
 *
 * Question d'accès tranchée par David le 2026-11-18 :
 *   - l'élève LIT ses Bêtes et ses coups gagnés, jamais ceux d'un autre élève ;
 *   - le prof et l'admin n'en lisent RIEN (le carnet reste à l'élève seul) ;
 *   - le visiteur non connecté n'a aucun droit ;
 *   - personne n'écrit au client connecté : seul le serveur (client service) écrit ;
 *   - les réponses en combat sont des traces ordinaires, lieu `descente`, écrites par
 *     le serveur seul (l'élève ne peut pas en forger) ; le prof les lit comme les autres ;
 *   - une victoire verse 1 gidouille (Bête ordinaire), 3 (grosse Bête), 0 (tutoriel),
 *     4 au plus sur 24 heures glissantes, libellés « Descente : … ».
 *
 * Vrais clients authentifiés. La RLS échoue en silence
 * (docs/pratiques/rls-echecs-silencieux.md) : chaque refus est prouvé par le code
 * d'erreur ET par une relecture hors RLS.
 *
 * Client non typé : tables et fonction n'existent dans `database.ts` qu'après `db:types`.
 *
 * DOIT échouer sans la migration `…_descente_fondations.sql`.
 * `pnpm db:start` puis `pnpm test:integration tests/integration/descente-fondations.test.ts`.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	cleanupAllTestData,
	TEST_SERVICE_ROLE_KEY
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';
import { createFakeTemplate } from '../helpers/competence-referentiel.helpers';

// Types
type BeastKind = 'ordinary' | 'big' | 'tutorial';
type Student = { id: string; client: SupabaseClient };
type Victory = { paid: number; cap_reached: boolean };

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };
const BEASTS = 'student_beasts';
const MOVES = 'student_combat_moves';
const RPC = 'record_beast_victory';
const PERMISSION_DENIED = '42501';
const CHECK_VIOLATION = '23514';
const UNIQUE_VIOLATION = '23505';
const NOT_FOUND = 'P0002';
const ALREADY_DONE = '55000';
const PREFIX = 'Descente : ';
const TAG = `zz-descente-${crypto.randomUUID().slice(0, 8)}`;

// Variables
let service: SupabaseClient;
let anon: SupabaseClient;
let teacherClient: SupabaseClient;
let adminClient: SupabaseClient;
let studentA: Student;
let studentB: Student;
let notionId: string;
let beastAId: string;
let beastBId: string;

// Functions
async function signedIn(email: string): Promise<SupabaseClient> {
	const client = createClient(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);
	const { error } = await client.auth.signInWithPassword({
		email,
		password: DEFAULT_TEST_PASSWORD
	});
	if (error) throw new Error(`connexion impossible pour ${email} : ${error.message}`);
	return client;
}

async function newStudent(): Promise<Student> {
	const profile = await TestData.profile().withRole('student').create();
	return { id: profile.id, client: await signedIn(profile.email) };
}

async function seedNode(kind: 'branch' | 'notion', name: string, parentId: string | null) {
	const { data, error } = await service
		.from('classification_nodes')
		.insert({ kind, name, parent_id: parentId })
		.select('id')
		.single<{ id: string }>();
	if (error || !data) throw new Error(`décor : nœud « ${name} » refusé : ${error?.message}`);
	return data.id;
}

async function seedBeast(
	studentId: string,
	fields: Partial<{ kind: BeastKind; max_hp: number; hp: number; leaves_at: string | null }> = {}
): Promise<string> {
	const maxHp = fields.max_hp ?? 30;
	const { data, error } = await service
		.from(BEASTS)
		.insert({
			student_id: studentId,
			beast_key: 'gobe-virgule',
			kind: fields.kind ?? 'ordinary',
			province: 'nombrilie',
			max_hp: maxHp,
			hp: fields.hp ?? maxHp,
			leaves_at: fields.leaves_at ?? null
		})
		.select('id')
		.single<{ id: string }>();
	if (error || !data) throw new Error(`décor ${BEASTS} : ${error?.message}`);
	return data.id;
}

async function victory(studentId: string, beastId: string, name = 'le Gobe-Virgule') {
	const { data, error } = await service.rpc(RPC, {
		p_student_id: studentId,
		p_beast_id: beastId,
		p_beast_name: name
	});
	const rows = (data ?? []) as Victory[];
	return { result: rows[0] ?? null, error };
}

/** Solde relu HORS RLS. */
async function balanceOf(studentId: string): Promise<number> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query('select gidouilles from public.profiles where id = $1', [
		studentId
	]);
	return Number(rows[0].gidouilles ?? 0);
}

/** Journal des gidouilles relu HORS RLS. */
async function activityOf(studentId: string): Promise<{ delta: number; reason: string }[]> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(
		'select delta, reason from public.gidouilles_activity where student_id = $1 order by created_at, id',
		[studentId]
	);
	return rows.map((r: { delta: number; reason: string }) => ({
		delta: Number(r.delta),
		reason: r.reason
	}));
}

/** Bête relue HORS RLS. */
async function beastOf(beastId: string) {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(
		'select hp, defeated_at, rewarded_gidouilles from public.student_beasts where id = $1',
		[beastId]
	);
	return rows[0] as
		{ hp: number; defeated_at: Date | null; rewarded_gidouilles: number | null } | undefined;
}

/** Recule de 25 heures le journal « Descente » de l'élève : libère le plafond. */
async function ageActivity(studentId: string): Promise<void> {
	const pg = await getPostgresClient();
	await pg.query(
		`update public.gidouilles_activity set created_at = created_at - interval '25 hours'
		where student_id = $1 and reason like $2`,
		[studentId, `${PREFIX}%`]
	);
}

async function readBeastOwners(client: SupabaseClient): Promise<string[]> {
	const { data, error } = await client
		.from(BEASTS)
		.select('student_id')
		.in('id', [beastAId, beastBId]);
	if (error) throw new Error(`lecture ${BEASTS} : ${error.message}`);
	return ((data ?? []) as { student_id: string }[]).map((r) => r.student_id).sort();
}

async function readMoveOwners(client: SupabaseClient): Promise<string[]> {
	const { data, error } = await client
		.from(MOVES)
		.select('student_id')
		.in('student_id', [studentA.id, studentB.id]);
	if (error) throw new Error(`lecture ${MOVES} : ${error.message}`);
	return ((data ?? []) as { student_id: string }[]).map((r) => r.student_id).sort();
}

// Tests
describe('La Descente de la Vistule : fondations', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		service = createClient(SUPABASE_URL, TEST_SERVICE_ROLE_KEY, CLIENT_OPTIONS);
		anon = createClient(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);

		const admin = await TestData.profile().withRole('admin').create();
		const teacher = await TestData.profile().withRole('teacher').create();
		adminClient = await signedIn(admin.email);
		teacherClient = await signedIn(teacher.email);
		studentA = await newStudent();
		studentB = await newStudent();

		const branchId = await seedNode('branch', `${TAG} branche`, null);
		notionId = await seedNode('notion', `${TAG} notion`, branchId);

		// A dans une classe : le prof est le sien (is_my_student). Une future policy « le prof
		// lit les Bêtes de ses élèves » ferait échouer les tests de lecture du prof.
		const pg = await getPostgresClient();
		const {
			rows: [cls]
		} = await pg.query(
			'insert into public.classes (name, join_code) values ($1, $2) returning id',
			[
				`${TAG} classe`,
				TAG.replace(/[^a-z0-9]/gi, '')
					.toUpperCase()
					.slice(0, 12)
			]
		);
		await pg.query(
			`insert into public.class_members (class_id, student_id, status) values ($1, $2, 'active')`,
			[cls.id, studentA.id]
		);

		beastAId = await seedBeast(studentA.id);
		beastBId = await seedBeast(studentB.id);

		const { error } = await service.from(MOVES).insert([
			{ student_id: studentA.id, move_key: 'coup-de-pif', notion_id: notionId },
			{ student_id: studentB.id, move_key: 'coup-de-pif', notion_id: notionId }
		]);
		if (error) throw new Error(`décor ${MOVES} : ${error.message}`);
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
		// Clé des coups vers l'arbre en RESTRICT : les coups, puis la notion, puis la branche.
		await pg
			.query(
				`delete from public.student_combat_moves where notion_id in
					(select id from public.classification_nodes where name like $1)`,
				[`${TAG}%`]
			)
			.catch(() => undefined);
		await pg
			.query(
				'delete from public.class_members where class_id in (select id from public.classes where name like $1)',
				[`${TAG}%`]
			)
			.catch(() => undefined);
		await pg
			.query('delete from public.classes where name like $1', [`${TAG}%`])
			.catch(() => undefined);
		for (const kind of ['notion', 'branch']) {
			await pg
				.query('delete from public.classification_nodes where kind = $1 and name like $2', [
					kind,
					`${TAG}%`
				])
				.catch(() => undefined);
		}
		await cleanupAllTestData();
	});

	describe('lecture des Bêtes', () => {
		it("l'élève A lit sa Bête et pas celle de B", async () => {
			expect(await readBeastOwners(studentA.client)).toEqual([studentA.id]);
		});

		it("l'élève B lit la sienne seulement", async () => {
			expect(await readBeastOwners(studentB.client)).toEqual([studentB.id]);
		});

		it("le décor est juste : A est bien l'élève du prof", async () => {
			const { data, error } = await teacherClient.rpc('is_my_student', {
				p_student_id: studentA.id
			});
			expect(error).toBeNull();
			expect(data).toBe(true);
		});

		it('le prof ne lit aucune Bête, pas même celle de son élève', async () => {
			expect(await readBeastOwners(teacherClient)).toEqual([]);
		});

		it("l'admin ne lit aucune Bête", async () => {
			expect(await readBeastOwners(adminClient)).toEqual([]);
		});

		it('le visiteur non connecté est refusé (42501)', async () => {
			const { data, error } = await anon.from(BEASTS).select('id');
			expect(error?.code).toBe(PERMISSION_DENIED);
			expect(data).toBeNull();
		});
	});

	describe('lecture des coups et sorts gagnés', () => {
		it("l'élève A lit ses coups et pas ceux de B", async () => {
			expect(await readMoveOwners(studentA.client)).toEqual([studentA.id]);
		});

		it('le prof et l’admin ne lisent aucun coup, pas même ceux de son élève', async () => {
			expect(await readMoveOwners(teacherClient)).toEqual([]);
			expect(await readMoveOwners(adminClient)).toEqual([]);
		});

		it('le visiteur non connecté est refusé (42501)', async () => {
			const { error } = await anon.from(MOVES).select('student_id');
			expect(error?.code).toBe(PERMISSION_DENIED);
		});
	});

	describe('écritures au client connecté : toutes refusées', () => {
		it("l'élève ne fait pas naître de Bête (42501), rien en base", async () => {
			const { error } = await studentA.client.from(BEASTS).insert({
				student_id: studentA.id,
				beast_key: 'gobe-virgule',
				kind: 'ordinary',
				province: 'nombrilie',
				max_hp: 1,
				hp: 1
			});
			expect(error?.code).toBe(PERMISSION_DENIED);
			const pg = await getPostgresClient();
			const { rows } = await pg.query(
				'select count(*)::int as n from public.student_beasts where student_id = $1',
				[studentA.id]
			);
			expect(rows[0].n).toBe(1);
		});

		it("l'élève ne se déclare pas vainqueur (42501), la Bête reste en vie", async () => {
			const { data, error } = await studentA.client
				.from(BEASTS)
				.update({ hp: 0, defeated_at: new Date().toISOString() })
				.eq('id', beastAId)
				.select();
			expect(error?.code).toBe(PERMISSION_DENIED);
			expect(data).toBeNull();
			const beast = await beastOf(beastAId);
			expect(beast?.hp).toBe(30);
			expect(beast?.defeated_at).toBeNull();
		});

		it("l'élève ne supprime pas sa Bête (42501)", async () => {
			const { error } = await studentA.client.from(BEASTS).delete().eq('id', beastAId).select();
			expect(error?.code).toBe(PERMISSION_DENIED);
			expect(await beastOf(beastAId)).toBeDefined();
		});

		it("l'élève ne s'offre pas un coup (42501)", async () => {
			const { error } = await studentA.client
				.from(MOVES)
				.insert({ student_id: studentA.id, move_key: 'sort-interdit', notion_id: notionId });
			expect(error?.code).toBe(PERMISSION_DENIED);
			const pg = await getPostgresClient();
			const { rows } = await pg.query(
				'select 1 from public.student_combat_moves where student_id = $1 and move_key = $2',
				[studentA.id, 'sort-interdit']
			);
			expect(rows).toHaveLength(0);
		});

		it('le prof ne modifie pas une Bête (42501)', async () => {
			const { error } = await teacherClient
				.from(BEASTS)
				.update({ hp: 0 })
				.eq('id', beastBId)
				.select();
			expect(error?.code).toBe(PERMISSION_DENIED);
			expect((await beastOf(beastBId))?.hp).toBe(30);
		});
	});

	describe('bornes', () => {
		it('une Province inconnue est refusée (23514)', async () => {
			const { error } = await service.from(BEASTS).insert({
				student_id: studentA.id,
				beast_key: 'gobe-virgule',
				kind: 'ordinary',
				province: 'atlantide',
				max_hp: 10,
				hp: 10
			});
			expect(error?.code).toBe(CHECK_VIOLATION);
		});

		it('des points de vie au-dessus du maximum sont refusés (23514)', async () => {
			const { error } = await service.from(BEASTS).insert({
				student_id: studentA.id,
				beast_key: 'gobe-virgule',
				kind: 'ordinary',
				province: 'nombrilie',
				max_hp: 10,
				hp: 11
			});
			expect(error?.code).toBe(CHECK_VIOLATION);
		});

		it('un nom de Bête hors format est refusé (23514)', async () => {
			const { error } = await service.from(BEASTS).insert({
				student_id: studentA.id,
				beast_key: 'Gobe Virgule !',
				kind: 'ordinary',
				province: 'nombrilie',
				max_hp: 10,
				hp: 10
			});
			expect(error?.code).toBe(CHECK_VIOLATION);
		});

		it('un seul tutoriel par élève (23505)', async () => {
			const student = await newStudent();
			await seedBeast(student.id, { kind: 'tutorial' });
			const { error } = await service.from(BEASTS).insert({
				student_id: student.id,
				beast_key: 'gobe-virgule',
				kind: 'tutorial',
				province: 'bedonstan',
				max_hp: 10,
				hp: 10
			});
			expect(error?.code).toBe(UNIQUE_VIOLATION);
		});
	});

	describe('victoire et gidouilles (record_beast_victory)', () => {
		it("l'élève ne peut pas appeler la fonction (42501), rien versé", async () => {
			const student = await newStudent();
			const beastId = await seedBeast(student.id);
			const before = await balanceOf(student.id);
			const { error } = await student.client.rpc(RPC, {
				p_student_id: student.id,
				p_beast_id: beastId,
				p_beast_name: 'le Gobe-Virgule'
			});
			expect(error?.code).toBe(PERMISSION_DENIED);
			expect(await balanceOf(student.id)).toBe(before);
			expect((await beastOf(beastId))?.defeated_at).toBeNull();
		});

		it('une Bête ordinaire vaincue rapporte 1, inscrit au journal, marque la défaite', async () => {
			const student = await newStudent();
			const beastId = await seedBeast(student.id);
			const before = await balanceOf(student.id);

			const { result, error } = await victory(student.id, beastId);

			expect(error).toBeNull();
			expect(result).toEqual({ paid: 1, cap_reached: false });
			expect(await balanceOf(student.id)).toBe(before + 1);
			expect(await activityOf(student.id)).toEqual([
				{ delta: 1, reason: `${PREFIX}victoire contre le Gobe-Virgule` }
			]);
			const beast = await beastOf(beastId);
			expect(beast?.hp).toBe(0);
			expect(beast?.defeated_at).not.toBeNull();
			expect(beast?.rewarded_gidouilles).toBe(1);
		});

		it('une grosse Bête rapporte 3', async () => {
			const student = await newStudent();
			const beastId = await seedBeast(student.id, { kind: 'big', max_hp: 120, hp: 40 });
			const { result } = await victory(student.id, beastId, 'le Grand Pifomètre');
			expect(result).toEqual({ paid: 3, cap_reached: false });
			expect(await activityOf(student.id)).toEqual([
				{ delta: 3, reason: `${PREFIX}victoire contre le Grand Pifomètre` }
			]);
		});

		it('le tutoriel ne rapporte rien et n’écrit rien au journal', async () => {
			const student = await newStudent();
			const beastId = await seedBeast(student.id, { kind: 'tutorial' });
			const before = await balanceOf(student.id);
			const { result, error } = await victory(student.id, beastId);
			expect(error).toBeNull();
			expect(result).toEqual({ paid: 0, cap_reached: false });
			expect(await balanceOf(student.id)).toBe(before);
			expect(await activityOf(student.id)).toEqual([]);
			expect((await beastOf(beastId))?.defeated_at).not.toBeNull();
		});

		it('une Bête déjà vaincue ne se revend pas : erreur, solde inchangé', async () => {
			const student = await newStudent();
			const beastId = await seedBeast(student.id);
			await victory(student.id, beastId);
			const before = await balanceOf(student.id);
			const { error } = await victory(student.id, beastId);
			expect(error?.code).toBe(ALREADY_DONE);
			expect(await balanceOf(student.id)).toBe(before);
			expect(await activityOf(student.id)).toHaveLength(1);
		});

		it("la Bête d'un autre élève : erreur, rien versé, elle reste en vie", async () => {
			const thief = await newStudent();
			const victim = await newStudent();
			const beastId = await seedBeast(victim.id);
			const before = await balanceOf(thief.id);
			const { error } = await victory(thief.id, beastId);
			expect(error?.code).toBe(NOT_FOUND);
			expect(await balanceOf(thief.id)).toBe(before);
			expect(await activityOf(thief.id)).toEqual([]);
			expect((await beastOf(beastId))?.defeated_at).toBeNull();
		});

		it('une Bête repartie : erreur, rien versé', async () => {
			const student = await newStudent();
			const past = new Date(Date.now() - 3600_000).toISOString();
			const beastId = await seedBeast(student.id, { leaves_at: past });
			const before = await balanceOf(student.id);
			const { error } = await victory(student.id, beastId);
			expect(error?.code).toBe(ALREADY_DONE);
			expect(await balanceOf(student.id)).toBe(before);
			expect(await activityOf(student.id)).toEqual([]);
			expect((await beastOf(beastId))?.defeated_at).toBeNull();
		});

		it('plafond de 4 sur 24 heures : la victoire est gardée, les gidouilles s’arrêtent', async () => {
			const student = await newStudent();
			const ordinary = [
				await seedBeast(student.id),
				await seedBeast(student.id),
				await seedBeast(student.id)
			];
			const big = await seedBeast(student.id, { kind: 'big', max_hp: 120 });
			const last = await seedBeast(student.id);
			const before = await balanceOf(student.id);

			for (const id of ordinary) {
				expect((await victory(student.id, id)).result).toEqual({ paid: 1, cap_reached: false });
			}
			// 3 déjà versées : la grosse Bête ne reçoit que la dernière gidouille sous le plafond
			expect((await victory(student.id, big)).result).toEqual({ paid: 1, cap_reached: true });
			expect((await beastOf(big))?.rewarded_gidouilles).toBe(1);
			// Plafond atteint : rien de plus, mais la victoire compte
			expect((await victory(student.id, last)).result).toEqual({ paid: 0, cap_reached: true });
			expect((await beastOf(last))?.defeated_at).not.toBeNull();
			expect(await balanceOf(student.id)).toBe(before + 4);
			expect((await activityOf(student.id)).map((a) => a.delta)).toEqual([1, 1, 1, 1]);
		});

		it('24 heures plus tard, le plafond est libéré', async () => {
			const student = await newStudent();
			for (let i = 0; i < 4; i += 1) await victory(student.id, await seedBeast(student.id));
			await ageActivity(student.id);
			const { result } = await victory(student.id, await seedBeast(student.id));
			expect(result).toEqual({ paid: 1, cap_reached: false });
		});

		it('deux victoires simultanées sur la même Bête : payée une seule fois', async () => {
			const student = await newStudent();
			const beastId = await seedBeast(student.id);
			const before = await balanceOf(student.id);
			const outcomes = await Promise.all([
				victory(student.id, beastId),
				victory(student.id, beastId)
			]);
			expect(outcomes.map((o) => o.error?.code ?? null).sort()).toEqual([ALREADY_DONE, null]);
			expect(await balanceOf(student.id)).toBe(before + 1);
			expect(await activityOf(student.id)).toHaveLength(1);
		});

		it('deux victoires simultanées quand il reste 1 sous le plafond : 1 versée en tout', async () => {
			const student = await newStudent();
			for (let i = 0; i < 3; i += 1) await victory(student.id, await seedBeast(student.id));
			const beastIds = [await seedBeast(student.id), await seedBeast(student.id)];
			const before = await balanceOf(student.id);
			const [first, second] = await Promise.all(beastIds.map((id) => victory(student.id, id)));
			expect([first.result?.paid, second.result?.paid].sort()).toEqual([0, 1]);
			expect(await balanceOf(student.id)).toBe(before + 1);
			expect((await activityOf(student.id)).map((a) => a.delta)).toEqual([1, 1, 1, 1]);
		});

		it('un nom de Bête vide ou trop long reste borné', async () => {
			const student = await newStudent();
			await victory(student.id, await seedBeast(student.id), '   ');
			await victory(student.id, await seedBeast(student.id), 'x'.repeat(500));
			const reasons = (await activityOf(student.id)).map((a) => a.reason);
			expect(reasons[0]).toBe(`${PREFIX}victoire contre une Bête imprévue`);
			expect(reasons[1].length).toBeLessThanOrEqual(PREFIX.length + 'victoire contre '.length + 80);
		});
	});

	describe('réponses en combat : traces au lieu « descente »', () => {
		async function insertTrace(
			client: SupabaseClient,
			studentId: string,
			templateId: string,
			place = 'descente'
		) {
			const { data, error } = await client
				.from('skill_attempts')
				.insert({
					student_id: studentId,
					template_id: templateId,
					success: true,
					source: 'auto',
					place
				})
				.select('id');
			return { rows: (data ?? []) as { id: string }[], code: error?.code ?? null };
		}

		it("l'élève ne forge pas de trace « descente » (42501), rien d'écrit", async () => {
			const student = await newStudent();
			const templateId = await createFakeTemplate(service as never, student.id);
			const { rows, code } = await insertTrace(student.client, student.id, templateId);
			expect(code).toBe(PERMISSION_DENIED);
			expect(rows).toEqual([]);
			const pg = await getPostgresClient();
			const { rows: inDb } = await pg.query(
				'select 1 from public.skill_attempts where student_id = $1',
				[student.id]
			);
			expect(inDb).toHaveLength(0);
			// Contrôle : le même élève, le même modèle, un autre lieu passe — le refus vient du lieu
			const control = await insertTrace(student.client, student.id, templateId, 'flash_cards');
			expect(control.code).toBeNull();
			expect(control.rows).toHaveLength(1);
		});

		it('le serveur écrit la trace « descente »', async () => {
			const student = await newStudent();
			const templateId = await createFakeTemplate(service as never, student.id);
			const { rows, code } = await insertTrace(service, student.id, templateId);
			expect(code).toBeNull();
			expect(rows).toHaveLength(1);
		});
	});
});
