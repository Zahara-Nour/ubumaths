/**
 * Mathoux : colliers (migration 20261025160000, lot C)
 * ====================================================
 *
 * Phase 0 du 2026-10-25 (docs/wip/mathoux-colliers-progress.md) :
 *   - quatre colliers choisis par David : ruban à grelot 10, nœud papillon 10,
 *     collier de cuir 20, collier de l'Ordre 40 ;
 *   - mêmes règles que la panse : acheté une fois, un seul Mathou à la fois,
 *     déplacement et retrait gratuits, un collier au plus par Mathou ; il se
 *     cumule avec la décoration de panse ;
 *   - un seul catalogue et une seule table d'achats ; le Mathou porte une
 *     décoration par emplacement (panse : `decoration`, cou : `collar`).
 *
 * Question d'accès tranchée en phase 0 : rien de nouveau. L'élève voit ses
 * colliers, le prof ceux de ses élèves, les autres élèves rien ; écriture serveur
 * seule.
 *
 * Vrais clients authentifiés ; chaque refus prouvé par le code d'erreur ET par
 * l'état relu hors RLS (docs/pratiques/rls-echecs-silencieux.md).
 *
 * Client non typé : la colonne et la fonction neuves n'existent dans `database.ts`
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
type Student = { id: string; client: SupabaseClient };
type Outcome = { ok: boolean; reason?: string; missing?: number; balance?: number };

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };
const TABLE = 'student_mathou_decorations';
const BUY = 'buy_mathou_decoration';
const WEAR = 'set_mathou_decoration';
const WEAR_COLLAR = 'set_mathou_collar';
const PERMISSION_DENIED = '42501';
const FOREIGN_KEY_VIOLATION = '23503';
const UNIQUE_VIOLATION = '23505';
const CHECK_VIOLATION = '23514';
const TAG = `zz-mathoux-collier-${crypto.randomUUID().slice(0, 8)}`;

// Variables
let service: SupabaseClient;
let anon: SupabaseClient;
let teacherId: string;
let teacherClient: SupabaseClient;
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

/** Un élève avec un solde donné (posé hors RLS). */
async function newStudent(gidouilles = 0): Promise<Student> {
	const profile = await TestData.profile().withRole('student').create();
	const pg = await getPostgresClient();
	await pg.query('update public.profiles set gidouilles = $2 where id = $1', [
		profile.id,
		gidouilles
	]);
	return { id: profile.id, client: await signedIn(profile.email) };
}

/** Un Mathou né (une ligne de mémoire) pour l'élève. */
async function newMathou(studentId: string): Promise<string> {
	const notion = await newNotion();
	const { error } = await service
		.from('student_mathoux')
		.insert({ student_id: studentId, notion_id: notion, best_stage: 'chaton' });
	if (error) throw new Error(`décor student_mathoux : ${error.message}`);
	return notion;
}

async function buy(studentId: string, decoration: string, notionId: string): Promise<Outcome> {
	const { data, error } = await service.rpc(BUY, {
		p_student_id: studentId,
		p_decoration: decoration,
		p_notion_id: notionId
	});
	if (error) throw new Error(`${BUY} : ${error.message}`);
	return data as Outcome;
}

async function wear(
	studentId: string,
	notionId: string,
	decoration: string | null
): Promise<Outcome> {
	const { data, error } = await service.rpc(WEAR, {
		p_student_id: studentId,
		p_notion_id: notionId,
		p_decoration: decoration
	});
	if (error) throw new Error(`${WEAR} : ${error.message}`);
	return data as Outcome;
}

async function wearCollar(
	studentId: string,
	notionId: string,
	collar: string | null
): Promise<Outcome> {
	const { data, error } = await service.rpc(WEAR_COLLAR, {
		p_student_id: studentId,
		p_notion_id: notionId,
		p_collar: collar
	});
	if (error) throw new Error(`${WEAR_COLLAR} : ${error.message}`);
	return data as Outcome;
}

/** Solde relu HORS RLS. */
async function balanceOf(studentId: string): Promise<number> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query('select gidouilles from public.profiles where id = $1', [
		studentId
	]);
	return Number(rows[0].gidouilles);
}

/** Décorations achetées, relues HORS RLS. */
async function ownedBy(studentId: string): Promise<{ decoration: string; price_paid: number }[]> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(
		`select decoration, price_paid from public.${TABLE} where student_id = $1 order by decoration`,
		[studentId]
	);
	return rows.map((r: { decoration: string; price_paid: number }) => ({
		decoration: r.decoration,
		price_paid: Number(r.price_paid)
	}));
}

/** Décoration de panse et collier portés par chaque Mathou de l'élève, relus HORS RLS. */
async function wornBy(
	studentId: string
): Promise<Record<string, { decoration: string | null; collar: string | null }>> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(
		'select notion_id, decoration, collar from public.student_mathoux where student_id = $1',
		[studentId]
	);
	return Object.fromEntries(
		rows.map((r: { notion_id: string; decoration: string | null; collar: string | null }) => [
			r.notion_id,
			{ decoration: r.decoration, collar: r.collar }
		])
	);
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

// Tests
describe('Colliers des Mathoux', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		service = createClient(SUPABASE_URL, TEST_SERVICE_ROLE_KEY, CLIENT_OPTIONS);
		anon = createClient(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);
		const teacher = await TestData.profile().withRole('teacher').create();
		teacherId = teacher.id;
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

	describe('achat', () => {
		it('achète le collier de cuir (20) : débit, collier donné et posé au cou, ligne au journal', async () => {
			const student = await newStudent(50);
			const mathou = await newMathou(student.id);

			expect(await buy(student.id, 'leather', mathou)).toEqual({ ok: true, balance: 30 });
			expect(await balanceOf(student.id)).toBe(30);
			expect(await ownedBy(student.id)).toEqual([{ decoration: 'leather', price_paid: 20 }]);
			expect(await wornBy(student.id)).toEqual({
				[mathou]: { decoration: null, collar: 'leather' }
			});
			expect(await activityOf(student.id)).toEqual([
				{ delta: -20, reason: 'Chatterie : collier de cuir acheté' }
			]);
		});

		it('les quatre prix et libellés des colliers', async () => {
			const catalog: [string, number, string][] = [
				['bell', 10, 'Chatterie : ruban à grelot acheté'],
				['bow_tie', 10, 'Chatterie : nœud papillon acheté'],
				['leather', 20, 'Chatterie : collier de cuir acheté'],
				['order_chain', 40, "Chatterie : collier de l'Ordre acheté"]
			];
			const student = await newStudent(80);
			const mathou = await newMathou(student.id);

			for (const [collar] of catalog) {
				expect((await buy(student.id, collar, mathou)).ok).toBe(true);
			}
			expect(await balanceOf(student.id)).toBe(0);
			expect((await activityOf(student.id)).map((a) => [a.delta, a.reason])).toEqual(
				catalog.map(([, price, reason]) => [-price, reason])
			);
			// Chaque achat se pose sur le Mathou choisi : le dernier reste au cou
			expect(await wornBy(student.id)).toEqual({
				[mathou]: { decoration: null, collar: 'order_chain' }
			});
		});

		it('collier et décoration de panse se cumulent sur le même Mathou', async () => {
			const student = await newStudent(30);
			const mathou = await newMathou(student.id);

			await buy(student.id, 'heart', mathou);
			await buy(student.id, 'bell', mathou);
			expect(await wornBy(student.id)).toEqual({
				[mathou]: { decoration: 'heart', collar: 'bell' }
			});
		});

		it('solde insuffisant : refus avec ce qui manque, rien débité ni donné', async () => {
			const student = await newStudent(15);
			const mathou = await newMathou(student.id);

			expect(await buy(student.id, 'order_chain', mathou)).toEqual({
				ok: false,
				reason: 'insufficient_funds',
				missing: 25
			});
			expect(await balanceOf(student.id)).toBe(15);
			expect(await ownedBy(student.id)).toEqual([]);
			expect(await activityOf(student.id)).toEqual([]);
		});

		it('déjà acheté : pas de second achat ni de second débit', async () => {
			const student = await newStudent(50);
			const mathou = await newMathou(student.id);
			const other = await newMathou(student.id);
			await buy(student.id, 'bow_tie', mathou);

			expect(await buy(student.id, 'bow_tie', other)).toEqual({
				ok: false,
				reason: 'already_owned'
			});
			expect(await balanceOf(student.id)).toBe(40);
			expect(await activityOf(student.id)).toHaveLength(1);
		});

		it('double clic : deux achats simultanés, un seul débit', async () => {
			const student = await newStudent(50);
			const mathou = await newMathou(student.id);

			const outcomes = await Promise.all([
				buy(student.id, 'order_chain', mathou),
				buy(student.id, 'order_chain', mathou)
			]);
			expect(outcomes.filter((o) => o.ok)).toHaveLength(1);
			expect(await balanceOf(student.id)).toBe(10);
			expect(await activityOf(student.id)).toHaveLength(1);
		});

		it('refus : collier inconnu, Mathou pas né ou d’un autre élève ; achat réservé aux élèves', async () => {
			const student = await newStudent(50);
			const other = await newStudent(50);
			const mathou = await newMathou(student.id);
			const othersMathou = await newMathou(other.id);

			expect(await buy(student.id, 'pearls', mathou)).toEqual({
				ok: false,
				reason: 'unknown_decoration'
			});
			expect(await buy(student.id, 'bell', othersMathou)).toEqual({
				ok: false,
				reason: 'mathou_not_found'
			});
			expect(await balanceOf(student.id)).toBe(50);

			const { error } = await service.rpc(BUY, {
				p_student_id: teacherId,
				p_decoration: 'bell',
				p_notion_id: mathou
			});
			expect(error?.message).toContain('Élève introuvable');
		});
	});

	describe('pose', () => {
		it('poser sur un autre Mathou le déplace, gratuitement ; la panse ne bouge pas', async () => {
			const student = await newStudent(30);
			const first = await newMathou(student.id);
			const second = await newMathou(student.id);
			await buy(student.id, 'heart', first);
			await buy(student.id, 'bell', first);

			expect(await wearCollar(student.id, second, 'bell')).toEqual({ ok: true });
			expect(await wornBy(student.id)).toEqual({
				[first]: { decoration: 'heart', collar: null },
				[second]: { decoration: null, collar: 'bell' }
			});
			expect(await balanceOf(student.id)).toBe(10);
		});

		it('poser un collier sur un Mathou qui en porte un remplace l’ancien, qui reste acheté', async () => {
			const student = await newStudent(30);
			const mathou = await newMathou(student.id);
			await buy(student.id, 'bell', mathou);
			await buy(student.id, 'leather', mathou);

			expect(await wornBy(student.id)).toEqual({
				[mathou]: { decoration: null, collar: 'leather' }
			});
			expect(await wearCollar(student.id, mathou, 'bell')).toEqual({ ok: true });
			expect(await wornBy(student.id)).toEqual({ [mathou]: { decoration: null, collar: 'bell' } });
			expect((await ownedBy(student.id)).map((o) => o.decoration)).toEqual(['bell', 'leather']);
		});

		it('retrait gratuit du collier, sans toucher la panse', async () => {
			const student = await newStudent(30);
			const mathou = await newMathou(student.id);
			await buy(student.id, 'heart', mathou);
			await buy(student.id, 'bell', mathou);

			expect(await wearCollar(student.id, mathou, null)).toEqual({ ok: true });
			expect(await wornBy(student.id)).toEqual({ [mathou]: { decoration: 'heart', collar: null } });
			expect(await balanceOf(student.id)).toBe(10);
		});

		it('retirer la décoration de panse laisse le collier', async () => {
			const student = await newStudent(30);
			const mathou = await newMathou(student.id);
			await buy(student.id, 'heart', mathou);
			await buy(student.id, 'bell', mathou);

			expect(await wear(student.id, mathou, null)).toEqual({ ok: true });
			expect(await wornBy(student.id)).toEqual({ [mathou]: { decoration: null, collar: 'bell' } });
		});

		it('chaque décoration à son emplacement : pas de collier sur la panse, pas de cœur au cou', async () => {
			const student = await newStudent(30);
			const mathou = await newMathou(student.id);
			await buy(student.id, 'heart', mathou);
			await buy(student.id, 'bell', mathou);
			await wear(student.id, mathou, null);
			await wearCollar(student.id, mathou, null);

			expect(await wear(student.id, mathou, 'bell')).toEqual({
				ok: false,
				reason: 'unknown_decoration'
			});
			expect(await wearCollar(student.id, mathou, 'heart')).toEqual({
				ok: false,
				reason: 'unknown_decoration'
			});
			expect(await wornBy(student.id)).toEqual({ [mathou]: { decoration: null, collar: null } });
		});

		it('refus : collier pas acheté, inconnu, ou Mathou d’un autre élève', async () => {
			const student = await newStudent(10);
			const other = await newStudent(10);
			const mathou = await newMathou(student.id);
			const othersMathou = await newMathou(other.id);
			await buy(student.id, 'bell', mathou);

			expect(await wearCollar(student.id, mathou, 'leather')).toEqual({
				ok: false,
				reason: 'not_owned'
			});
			expect(await wearCollar(student.id, mathou, 'pearls')).toEqual({
				ok: false,
				reason: 'unknown_decoration'
			});
			expect(await wearCollar(student.id, othersMathou, 'bell')).toEqual({
				ok: false,
				reason: 'mathou_not_found'
			});
			expect(await wornBy(other.id)).toEqual({
				[othersMathou]: { decoration: null, collar: null }
			});
		});

		it('un élève connecté ne peut pas appeler la pose, ni le visiteur', async () => {
			const student = await newStudent(10);
			const mathou = await newMathou(student.id);
			await buy(student.id, 'bell', mathou);

			for (const client of [student.client, anon]) {
				const { error } = await client.rpc(WEAR_COLLAR, {
					p_student_id: student.id,
					p_notion_id: mathou,
					p_collar: null
				});
				expect(error?.code).toBe(PERMISSION_DENIED);
			}
			expect(await wornBy(student.id)).toEqual({ [mathou]: { decoration: null, collar: 'bell' } });
		});
	});

	describe('garanties de la base', () => {
		it('un Mathou ne peut porter qu’un collier acheté par SON élève', async () => {
			const student = await newStudent(10);
			const mathou = await newMathou(student.id);
			const other = await newStudent(10);
			await buy(other.id, 'bell', await newMathou(other.id));

			const pg = await getPostgresClient();
			await expect(
				pg.query(
					`update public.student_mathoux set collar = 'bell'
						where student_id = $1 and notion_id = $2`,
					[student.id, mathou]
				)
			).rejects.toMatchObject({ code: FOREIGN_KEY_VIOLATION });
		});

		it('un collier n’orne qu’un seul Mathou à la fois', async () => {
			const student = await newStudent(10);
			const first = await newMathou(student.id);
			const second = await newMathou(student.id);
			await buy(student.id, 'bell', first);

			const pg = await getPostgresClient();
			await expect(
				pg.query(
					`update public.student_mathoux set collar = 'bell'
						where student_id = $1 and notion_id = $2`,
					[student.id, second]
				)
			).rejects.toMatchObject({ code: UNIQUE_VIOLATION });
		});

		it('la panse refuse un collier et le cou une décoration de panse, même hors fonctions', async () => {
			const student = await newStudent(30);
			const mathou = await newMathou(student.id);
			await buy(student.id, 'heart', mathou);
			await buy(student.id, 'bell', mathou);

			const pg = await getPostgresClient();
			for (const sql of [
				`update public.student_mathoux set decoration = 'bell' where student_id = $1`,
				`update public.student_mathoux set collar = 'heart' where student_id = $1`
			]) {
				await expect(pg.query(sql, [student.id])).rejects.toMatchObject({
					code: CHECK_VIOLATION
				});
			}
		});

		it('un achat supprimé seul laisse le cou nu, la panse intacte', async () => {
			const student = await newStudent(30);
			const mathou = await newMathou(student.id);
			await buy(student.id, 'heart', mathou);
			await buy(student.id, 'bell', mathou);

			const pg = await getPostgresClient();
			await pg.query(`delete from public.${TABLE} where student_id = $1 and decoration = 'bell'`, [
				student.id
			]);
			expect(await wornBy(student.id)).toEqual({ [mathou]: { decoration: 'heart', collar: null } });
		});

		it('supprimer le compte supprime ses colliers (effacement RGPD)', async () => {
			const student = await newStudent(10);
			expect((await buy(student.id, 'bell', await newMathou(student.id))).ok).toBe(true);
			expect(await ownedBy(student.id)).toHaveLength(1);

			const pg = await getPostgresClient();
			await pg.query('delete from public.profiles where id = $1', [student.id]);
			const { rows } = await pg.query(
				`select count(*)::int as n from public.${TABLE} where student_id = $1`,
				[student.id]
			);
			expect(rows[0].n).toBe(0);
		});
	});

	describe('accès', () => {
		it('l’emplacement des décorations est réservé au serveur', async () => {
			const { data, error } = await service.rpc('mathou_decoration_slot', {
				p_decoration: 'bell'
			});
			expect(error).toBeNull();
			expect(data).toBe('neck');

			const student = await newStudent(0);
			for (const client of [student.client, anon]) {
				const refused = await client.rpc('mathou_decoration_slot', { p_decoration: 'bell' });
				expect(refused.error?.code).toBe(PERMISSION_DENIED);
			}
		});

		it('l’élève lit ses colliers et le collier de ses Mathoux, pas ceux d’un autre ; le prof lit ; le visiteur rien', async () => {
			const student = await newStudent(10);
			const other = await newStudent(10);
			const mathou = await newMathou(student.id);
			await buy(student.id, 'bell', mathou);
			await buy(other.id, 'bow_tie', await newMathou(other.id));
			const ids = [student.id, other.id];

			const own = await student.client
				.from(TABLE)
				.select('student_id, decoration')
				.in('student_id', ids);
			expect(own.error).toBeNull();
			expect(own.data).toEqual([{ student_id: student.id, decoration: 'bell' }]);

			const worn = await student.client
				.from('student_mathoux')
				.select('student_id, collar')
				.in('student_id', ids);
			expect(worn.error).toBeNull();
			expect(worn.data).toEqual([{ student_id: student.id, collar: 'bell' }]);

			const teacher = await teacherClient
				.from('student_mathoux')
				.select('collar')
				.in('student_id', ids)
				.order('collar');
			expect(teacher.error).toBeNull();
			expect(teacher.data?.map((r) => r.collar)).toEqual(['bell', 'bow_tie']);

			const visitor = await anon.from('student_mathoux').select('collar').in('student_id', ids);
			expect(visitor.error?.code).toBe(PERMISSION_DENIED);
			expect(visitor.data ?? []).toEqual([]);
		});

		it('l’élève ne peut ni s’offrir un collier ni en poser un lui-même', async () => {
			const student = await newStudent(0);
			const mathou = await newMathou(student.id);

			const insert = await student.client
				.from(TABLE)
				.insert({ student_id: student.id, decoration: 'order_chain', price_paid: 0 });
			expect(insert.error?.code).toBe(PERMISSION_DENIED);

			const update = await student.client
				.from('student_mathoux')
				.update({ collar: null })
				.eq('student_id', student.id)
				.select('notion_id');
			expect(update.error?.code).toBe(PERMISSION_DENIED);

			expect(await ownedBy(student.id)).toEqual([]);
			expect(await wornBy(student.id)).toEqual({ [mathou]: { decoration: null, collar: null } });
		});
	});
});
