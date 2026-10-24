/**
 * Mathoux : les étapes de la Chatterie rapportent des gidouilles
 * (migration 20261024210000, `pay_mathou_milestones`)
 * ===================================================================
 *
 * Phase 0 validée par David le 2026-10-24 (docs/wip/mathoux-accessoires-progress.md,
 * lot A) : naissance +3, matou +5, grand matou +10, étoile +5, une fois chacune.
 * Rattrapage : une ligne déjà là n'a rien de payé, le premier versement paie tout.
 * Plafond (migration 20261024230000, choix de David du 2026-10-24) : 20 gidouilles
 * d'étapes sur 24 heures glissantes, jamais d'étape coupée ; libellés « Chatterie : … ».
 * Les tests qui paient en plusieurs fois « vieillissent » le journal (`ageActivity`)
 * pour libérer le plafond.
 *
 * Question d'accès tranchée par David le 2026-10-24 : personne ne lit rien de neuf ;
 * `rewarded_stage` / `rewarded_grades` se lisent comme le reste de la ligne ; seul
 * le serveur (service_role) écrit et verse.
 *
 * Vrais clients authentifiés. La RLS et les droits échouent en silence
 * (docs/pratiques/rls-echecs-silencieux.md) : chaque refus est prouvé par le code
 * d'erreur ET par le solde relu hors RLS.
 *
 * Client non typé : la fonction et les colonnes n'existent dans `database.ts`
 * qu'après `db:types`.
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

// Types
type Payment = { notion_id: string; delta: number; reason: string };
type Student = { id: string; client: SupabaseClient };

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };
const TABLE = 'student_mathoux';
const RPC = 'pay_mathou_milestones';
const PERMISSION_DENIED = '42501';
const CHECK_VIOLATION = '23514';
const TAG = `zz-mathoux-gid-${crypto.randomUUID().slice(0, 8)}`;

// Variables
let service: SupabaseClient;
let anon: SupabaseClient;
let teacherClient: SupabaseClient;
let adminClient: SupabaseClient;
let adminId: string;
let branchId: string;
let notionCount = 0;

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

async function seedNode(kind: 'branch' | 'notion', name: string, parentId: string | null) {
	const { data, error } = await service
		.from('classification_nodes')
		.insert({ kind, name, parent_id: parentId })
		.select('id')
		.single<{ id: string }>();
	if (error || !data) throw new Error(`décor : nœud « ${name} » refusé : ${error?.message}`);
	return data.id;
}

async function newNotion(): Promise<string> {
	notionCount += 1;
	return seedNode('notion', `${TAG} notion ${notionCount}`, branchId);
}

async function newStudent(): Promise<Student> {
	const profile = await TestData.profile().withRole('student').create();
	return { id: profile.id, client: await signedIn(profile.email) };
}

async function seedMathou(
	studentId: string,
	notionId: string,
	fields: Record<string, unknown>
): Promise<void> {
	const { error } = await service
		.from(TABLE)
		.insert({ student_id: studentId, notion_id: notionId, ...fields }, { defaultToNull: false });
	if (error) throw new Error(`décor ${TABLE} : ${error.message}`);
}

async function setMathou(
	studentId: string,
	notionId: string,
	fields: Record<string, unknown>
): Promise<void> {
	const { data, error } = await service
		.from(TABLE)
		.update(fields)
		.eq('student_id', studentId)
		.eq('notion_id', notionId)
		.select('notion_id');
	if (error || data?.length !== 1) throw new Error(`décor ${TABLE} : ${error?.message}`);
}

async function pay(studentId: string, names: Record<string, string> = {}): Promise<Payment[]> {
	const { data, error } = await service.rpc(RPC, { p_student_id: studentId, p_names: names });
	if (error) throw new Error(`${RPC} : ${error.message}`);
	return (data ?? []) as Payment[];
}

/** Solde relu HORS RLS. */
async function balanceOf(studentId: string): Promise<number> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query('select gidouilles from public.profiles where id = $1', [
		studentId
	]);
	return Number(rows[0].gidouilles);
}

/** Lignes du journal des gidouilles, relues HORS RLS. */
async function activityOf(studentId: string): Promise<{ delta: number; reason: string }[]> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(
		'select delta, reason from public.gidouilles_activity where student_id = $1 order by created_at, id',
		[studentId]
	);
	return rows.map((r: { delta: string; reason: string }) => ({
		delta: Number(r.delta),
		reason: r.reason
	}));
}

/** Fait passer les versements de l'élève au-delà des 24 heures (libère le plafond). */
async function ageActivity(studentId: string): Promise<void> {
	const pg = await getPostgresClient();
	await pg.query(
		`update public.gidouilles_activity set created_at = now() - interval '25 hours'
			where student_id = $1`,
		[studentId]
	);
}

function total(payments: Payment[]): number {
	return payments.reduce((sum, p) => sum + p.delta, 0);
}

// Tests
describe('Étapes de la Chatterie payées en gidouilles (pay_mathou_milestones)', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		service = createClient(SUPABASE_URL, TEST_SERVICE_ROLE_KEY, CLIENT_OPTIONS);
		anon = createClient(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);
		const admin = await TestData.profile().withRole('admin').create();
		adminId = admin.id;
		const teacher = await TestData.profile().withRole('teacher').create();
		adminClient = await signedIn(admin.email);
		teacherClient = await signedIn(teacher.email);
		branchId = await seedNode('branch', `${TAG} branche`, null);
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
		// Ordre imposé par la clé en RESTRICT : les Mathoux, puis les notions, puis la branche.
		await pg
			.query(
				`delete from public.student_mathoux where notion_id in
					(select id from public.classification_nodes where name like $1)`,
				[`${TAG}%`]
			)
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

	describe('versement', () => {
		it('un chaton né rapporte +3, une fois ; le second appel ne paie rien', async () => {
			const student = await newStudent();
			const notion = await newNotion();
			await seedMathou(student.id, notion, { best_stage: 'chaton' });
			const before = await balanceOf(student.id);

			const first = await pay(student.id, { [notion]: 'Tangentin' });
			expect(first).toEqual([
				{ notion_id: notion, delta: 3, reason: 'Chatterie : naissance de Tangentin' }
			]);
			expect(await balanceOf(student.id)).toBe(before + 3);

			expect(await pay(student.id, { [notion]: 'Tangentin' })).toEqual([]);
			expect(await balanceOf(student.id)).toBe(before + 3);
			expect(await activityOf(student.id)).toEqual([
				{ delta: 3, reason: 'Chatterie : naissance de Tangentin' }
			]);
		});

		it('rattrapage : un grand matou à deux étoiles jamais payé rapporte 3 + 5 + 10, puis ses étoiles', async () => {
			const student = await newStudent();
			const notion = await newNotion();
			await seedMathou(student.id, notion, {
				best_stage: 'grand_matou',
				starred_grades: ['2', '1_SPE']
			});
			const before = await balanceOf(student.id);

			const payments = await pay(student.id, { [notion]: 'Tangentin' });
			expect(payments.map((p) => [p.delta, p.reason])).toEqual([
				[3, 'Chatterie : naissance de Tangentin'],
				[5, 'Chatterie : Tangentin devient matou'],
				[10, 'Chatterie : Tangentin devient grand matou']
			]);
			// 18 versés : une étoile (5) dépasserait le plafond de 20, elle attend
			expect(await balanceOf(student.id)).toBe(before + 18);
			await ageActivity(student.id);
			const stars = await pay(student.id, { [notion]: 'Tangentin' });
			expect(stars.map((p) => [p.delta, p.reason])).toEqual([
				[5, 'Chatterie : Tangentin gagne une étoile'],
				[5, 'Chatterie : Tangentin gagne une étoile']
			]);
			expect(await balanceOf(student.id)).toBe(before + 28);
			expect(await activityOf(student.id)).toHaveLength(5);
		});

		it('un Mathou déjà payé matou qui devient grand matou ne rapporte que +10', async () => {
			const student = await newStudent();
			const notion = await newNotion();
			await seedMathou(student.id, notion, { best_stage: 'matou' });
			await pay(student.id);
			const before = await balanceOf(student.id);

			await setMathou(student.id, notion, { best_stage: 'grand_matou' });
			const payments = await pay(student.id, { [notion]: 'Tangentin' });
			expect(payments.map((p) => [p.delta, p.reason])).toEqual([
				[10, 'Chatterie : Tangentin devient grand matou']
			]);
			expect(await balanceOf(student.id)).toBe(before + 10);
		});

		it('une étoile ajoutée rapporte +5, les étoiles déjà payées rien', async () => {
			const student = await newStudent();
			const notion = await newNotion();
			await seedMathou(student.id, notion, { best_stage: 'grand_matou', starred_grades: ['2'] });
			await pay(student.id);
			await ageActivity(student.id);
			await pay(student.id);
			await ageActivity(student.id);
			const before = await balanceOf(student.id);

			await setMathou(student.id, notion, { starred_grades: ['2', '1_SPE'] });
			expect(total(await pay(student.id))).toBe(5);
			expect(await balanceOf(student.id)).toBe(before + 5);
		});

		it('ce qui a été payé est retenu dans la ligne', async () => {
			const student = await newStudent();
			const notion = await newNotion();
			await seedMathou(student.id, notion, { best_stage: 'matou', starred_grades: ['2'] });
			await pay(student.id);
			const pg = await getPostgresClient();
			const { rows } = await pg.query(
				'select rewarded_stage, rewarded_grades from public.student_mathoux where student_id = $1',
				[student.id]
			);
			expect(rows).toEqual([{ rewarded_stage: 'matou', rewarded_grades: ['2'] }]);
		});

		it('sans nom fourni, le libellé reprend le nom de la notion', async () => {
			const student = await newStudent();
			const notion = await newNotion();
			await seedMathou(student.id, notion, { best_stage: 'chaton' });
			const [payment] = await pay(student.id);
			expect(payment.reason).toBe(
				`Chatterie : naissance de Mathou « ${TAG} notion ${notionCount} »`
			);
		});

		it('un nom trop long est tronqué à 80 signes', async () => {
			const student = await newStudent();
			const notion = await newNotion();
			await seedMathou(student.id, notion, { best_stage: 'chaton' });
			const [payment] = await pay(student.id, { [notion]: 'x'.repeat(200) });
			expect(payment.reason).toBe(`Chatterie : naissance de ${'x'.repeat(80)}`);
		});

		it('plusieurs Mathoux sont payés dans le même appel', async () => {
			const student = await newStudent();
			const notionA = await newNotion();
			const notionB = await newNotion();
			await seedMathou(student.id, notionA, { best_stage: 'chaton' });
			await seedMathou(student.id, notionB, { best_stage: 'matou' });
			const before = await balanceOf(student.id);
			expect(total(await pay(student.id))).toBe(3 + 3 + 5);
			expect(await balanceOf(student.id)).toBe(before + 11);
		});

		it('les Mathoux d’un autre élève ne sont pas payés', async () => {
			const student = await newStudent();
			const other = await newStudent();
			const notion = await newNotion();
			await seedMathou(other.id, notion, { best_stage: 'chaton' });
			const before = await balanceOf(other.id);
			expect(await pay(student.id)).toEqual([]);
			expect(await balanceOf(other.id)).toBe(before);
		});

		it('deux versements simultanés ne paient qu’une fois', async () => {
			const student = await newStudent();
			const notion = await newNotion();
			await seedMathou(student.id, notion, { best_stage: 'grand_matou' });
			const before = await balanceOf(student.id);
			const [a, b] = await Promise.all([pay(student.id), pay(student.id)]);
			expect(total(a) + total(b)).toBe(18);
			expect(await balanceOf(student.id)).toBe(before + 18);
			expect(await activityOf(student.id)).toHaveLength(3);
		});

		it('la ligne arrive au journal des récompenses (reward_events)', async () => {
			const student = await newStudent();
			const notion = await newNotion();
			await seedMathou(student.id, notion, { best_stage: 'chaton' });
			await pay(student.id, { [notion]: 'Tangentin' });
			const pg = await getPostgresClient();
			const { rows } = await pg.query(
				`select event_type, amount, description from public.reward_events
					where student_id = $1 and reward_type = 'gidouilles'`,
				[student.id]
			);
			expect(rows).toEqual([
				{
					event_type: 'earned',
					amount: expect.anything(),
					description: 'Chatterie : naissance de Tangentin'
				}
			]);
			expect(Number(rows[0].amount)).toBe(3);
		});

		it('un compte qui n’est pas élève est refusé', async () => {
			const { error } = await service.rpc(RPC, { p_student_id: adminId });
			expect(error).not.toBeNull();
		});

		it('un Mathou payé qui s’endort puis se réveille ne repaie rien', async () => {
			const student = await newStudent();
			const notion = await newNotion();
			await seedMathou(student.id, notion, { best_stage: 'matou', starred_grades: ['2'] });
			await pay(student.id);
			const before = await balanceOf(student.id);

			await setMathou(student.id, notion, { asleep: true });
			expect(await pay(student.id)).toEqual([]);
			await setMathou(student.id, notion, { asleep: false });
			expect(await pay(student.id)).toEqual([]);
			expect(await balanceOf(student.id)).toBe(before);
		});

		it('stade et étoile gagnés entre deux versements sont payés tous les deux', async () => {
			const student = await newStudent();
			const notion = await newNotion();
			await seedMathou(student.id, notion, { best_stage: 'matou' });
			await pay(student.id);
			await ageActivity(student.id);

			await setMathou(student.id, notion, { best_stage: 'grand_matou', starred_grades: ['2'] });
			const payments = await pay(student.id, { [notion]: 'Tangentin' });
			expect(payments.map((p) => [p.delta, p.reason])).toEqual([
				[10, 'Chatterie : Tangentin devient grand matou'],
				[5, 'Chatterie : Tangentin gagne une étoile']
			]);
		});

		it('une étoile écrite en double n’est payée qu’une fois', async () => {
			const student = await newStudent();
			const notion = await newNotion();
			await seedMathou(student.id, notion, { best_stage: 'chaton', starred_grades: ['2', '2'] });
			expect(total(await pay(student.id))).toBe(3 + 5);
		});

		it('un stade corrigé sous le payé ne fait pas repayer quand il remonte', async () => {
			const student = await newStudent();
			const notion = await newNotion();
			await seedMathou(student.id, notion, { best_stage: 'grand_matou' });
			await pay(student.id);

			await setMathou(student.id, notion, { best_stage: 'matou' });
			expect(await pay(student.id)).toEqual([]);
			await setMathou(student.id, notion, { best_stage: 'grand_matou' });
			expect(await pay(student.id)).toEqual([]);
		});

		it('la ligne du journal porte la classe active de l’élève (visibilité du prof)', async () => {
			const student = await newStudent();
			const notion = await newNotion();
			const { data: classe, error: classeError } = await service
				.from('classes')
				.insert({
					name: `${TAG} classe`,
					join_code: `MG${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
					grade: '2'
				})
				.select('id')
				.single<{ id: string }>();
			if (classeError || !classe) throw new Error(`décor classe : ${classeError?.message}`);
			const { error: membreError } = await service
				.from('class_members')
				.insert({ class_id: classe.id, student_id: student.id, status: 'active' });
			expect(membreError).toBeNull();
			await seedMathou(student.id, notion, { best_stage: 'chaton' });

			await pay(student.id);
			const pg = await getPostgresClient();
			const { rows } = await pg.query(
				'select class_id from public.gidouilles_activity where student_id = $1',
				[student.id]
			);
			expect(rows).toEqual([{ class_id: classe.id }]);

			await service.from('class_members').delete().eq('class_id', classe.id);
			await service.from('classes').delete().eq('id', classe.id);
		});
	});

	describe('plafond : 20 gidouilles d’étapes sur 24 heures glissantes', () => {
		it('le premier Mathou passe, les suivants attendent ; 24 heures plus tard, ils sont payés', async () => {
			const student = await newStudent();
			const notionA = await newNotion();
			const notionB = await newNotion();
			await seedMathou(student.id, notionA, { best_stage: 'grand_matou' });
			await seedMathou(student.id, notionB, { best_stage: 'grand_matou' });
			const before = await balanceOf(student.id);

			expect(total(await pay(student.id))).toBe(18);
			expect(await pay(student.id)).toEqual([]);
			expect(await balanceOf(student.id)).toBe(before + 18);

			await ageActivity(student.id);
			const later = await pay(student.id);
			expect(later.every((p) => p.notion_id === notionB)).toBe(true);
			expect(total(later)).toBe(18);
		});

		it('une étape qui ne tient plus attend entière : jamais coupée, rien de marqué payé', async () => {
			const student = await newStudent();
			const notionA = await newNotion();
			const notionB = await newNotion();
			await seedMathou(student.id, notionA, { best_stage: 'grand_matou' });
			await pay(student.id); // 18 versés, reste 2
			await seedMathou(student.id, notionB, { best_stage: 'chaton' });
			expect(await pay(student.id)).toEqual([]);
			const pg = await getPostgresClient();
			const { rows } = await pg.query(
				'select rewarded_stage from public.student_mathoux where student_id = $1 and notion_id = $2',
				[student.id, notionB]
			);
			expect(rows).toEqual([{ rewarded_stage: null }]);
		});

		it('les gidouilles d’autres sources ne comptent pas dans le plafond', async () => {
			const student = await newStudent();
			const notion = await newNotion();
			const pg = await getPostgresClient();
			await pg.query(
				`insert into public.gidouilles_activity (student_id, delta, reason)
					values ($1, 50, 'daily_game_reward:minesweeper'), ($1, 30, 'Succès : test')`,
				[student.id]
			);
			await seedMathou(student.id, notion, { best_stage: 'grand_matou' });
			expect(total(await pay(student.id))).toBe(18);
		});

		it('deux versements simultanés ne dépassent pas le plafond à eux deux', async () => {
			const student = await newStudent();
			const notionA = await newNotion();
			const notionB = await newNotion();
			await seedMathou(student.id, notionA, { best_stage: 'grand_matou' });
			await seedMathou(student.id, notionB, { best_stage: 'grand_matou' });
			const before = await balanceOf(student.id);
			const [a, b] = await Promise.all([pay(student.id), pay(student.id)]);
			expect(total(a) + total(b)).toBe(18);
			expect(await balanceOf(student.id)).toBe(before + 18);
		});
	});

	describe('accès : seul le serveur verse', () => {
		let victim: Student;
		let notion: string;

		beforeAll(async () => {
			victim = await newStudent();
			notion = await newNotion();
			await seedMathou(victim.id, notion, { best_stage: 'grand_matou' });
		});

		it.each([
			['l’élève lui-même', () => victim.client],
			['le prof', () => teacherClient],
			['l’admin', () => adminClient],
			['le visiteur non connecté', () => anon]
		])(
			'%s ne peut pas appeler le versement (42501), le solde ne bouge pas',
			async (_who, client) => {
				const before = await balanceOf(victim.id);
				const { data, error } = await client().rpc(RPC, { p_student_id: victim.id });
				expect(error?.code).toBe(PERMISSION_DENIED);
				expect(data).toBeNull();
				expect(await balanceOf(victim.id)).toBe(before);
				expect(await activityOf(victim.id)).toEqual([]);
			}
		);

		it('l’élève lit ses colonnes « payé » comme le reste de sa ligne', async () => {
			const { data, error } = await victim.client
				.from(TABLE)
				.select('rewarded_stage, rewarded_grades')
				.eq('notion_id', notion);
			expect(error).toBeNull();
			expect(data).toEqual([{ rewarded_stage: null, rewarded_grades: [] }]);
		});

		it('l’élève ne se marque pas « payé » (42501), la ligne reste intacte', async () => {
			const { data, error } = await victim.client
				.from(TABLE)
				.update({ rewarded_stage: 'grand_matou' })
				.eq('notion_id', notion)
				.select();
			expect(error?.code).toBe(PERMISSION_DENIED);
			expect(data).toBeNull();
			const pg = await getPostgresClient();
			const { rows } = await pg.query(
				'select rewarded_stage from public.student_mathoux where student_id = $1',
				[victim.id]
			);
			expect(rows).toEqual([{ rewarded_stage: null }]);
		});
	});

	describe('contraintes', () => {
		it("un stade payé 'tigre' est refusé (23514)", async () => {
			const student = await newStudent();
			const notion = await newNotion();
			await seedMathou(student.id, notion, { best_stage: 'chaton' });
			const { error } = await service
				.from(TABLE)
				.update({ rewarded_stage: 'tigre' })
				.eq('student_id', student.id);
			expect(error?.code).toBe(CHECK_VIOLATION);
		});

		it('une étoile payée sur un niveau inconnu est refusée (23514)', async () => {
			const student = await newStudent();
			const notion = await newNotion();
			await seedMathou(student.id, notion, { best_stage: 'chaton' });
			const { error } = await service
				.from(TABLE)
				.update({ rewarded_grades: ['CE3'] })
				.eq('student_id', student.id);
			expect(error?.code).toBe(CHECK_VIOLATION);
		});
	});
});
