/**
 * Mathoux : décorations de panse (migration 20261024235000, lot B)
 * ===================================================================
 *
 * Phase 0 validée par David le 2026-10-24 (docs/wip/mathoux-accessoires-progress.md,
 * « Lot B : comportements validés ») :
 *   - six décorations, prix fixés : cœur 10, étoile 10, petite gidouille 20,
 *     cocarde 20, médaille 40, blason 40 ;
 *   - achetée une fois, ornant UN SEUL Mathou à la fois ; la poser ailleurs la
 *     déplace, gratuitement ; retrait gratuit ; une décoration au plus par Mathou ;
 *   - achat atomique : solde vérifié, débit, décoration donnée et posée, ligne au
 *     journal (« Chatterie : cocarde achetée », −20) ; solde insuffisant → refus
 *     avec ce qui manque ; déjà achetée → pas de second débit ; double clic → un
 *     seul débit ;
 *   - refus : décoration inconnue, Mathou d'un autre élève ou pas né ; achat
 *     réservé aux élèves.
 *
 * Question d'accès tranchée par David en phase 0 : l'élève voit ses décorations,
 * le prof celles de ses élèves, les autres élèves rien ; écriture serveur seule.
 *
 * Vrais clients authentifiés. La RLS et les droits échouent en silence
 * (docs/pratiques/rls-echecs-silencieux.md) : chaque refus est prouvé par le code
 * d'erreur ET par l'état relu hors RLS.
 *
 * Client non typé : la table, la colonne et les fonctions n'existent dans
 * `database.ts` qu'après `db:types`.
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
import { MATHOU_DECORATIONS, MATHOU_DECORATION_IDS } from '$lib/mathoux/decorations';

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
const PERMISSION_DENIED = '42501';
const FOREIGN_KEY_VIOLATION = '23503';
const UNIQUE_VIOLATION = '23505';
const TAG = `zz-mathoux-deco-${crypto.randomUUID().slice(0, 8)}`;

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

/** Décoration portée par chaque Mathou de l'élève, relue HORS RLS. */
async function wornBy(studentId: string): Promise<Record<string, string | null>> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(
		'select notion_id, decoration from public.student_mathoux where student_id = $1',
		[studentId]
	);
	return Object.fromEntries(
		rows.map((r: { notion_id: string; decoration: string | null }) => [r.notion_id, r.decoration])
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
describe('Décorations de panse des Mathoux', () => {
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
		it('achète la cocarde (20) : débit, décoration donnée et posée, ligne au journal', async () => {
			const student = await newStudent(50);
			const mathou = await newMathou(student.id);

			expect(await buy(student.id, 'cockade', mathou)).toEqual({ ok: true, balance: 30 });
			expect(await balanceOf(student.id)).toBe(30);
			expect(await ownedBy(student.id)).toEqual([{ decoration: 'cockade', price_paid: 20 }]);
			expect(await wornBy(student.id)).toEqual({ [mathou]: 'cockade' });
			expect(await activityOf(student.id)).toEqual([
				{ delta: -20, reason: 'Chatterie : cocarde achetée' }
			]);
		});

		it('les six prix et libellés du catalogue', async () => {
			const catalog: [string, number, string][] = [
				['heart', 10, 'Chatterie : cœur acheté'],
				['star', 10, 'Chatterie : étoile achetée'],
				['gidouille', 20, 'Chatterie : petite gidouille achetée'],
				['cockade', 20, 'Chatterie : cocarde achetée'],
				['medal', 40, 'Chatterie : médaille achetée'],
				['coat_of_arms', 40, 'Chatterie : blason acheté']
			];
			const student = await newStudent(140);
			const mathou = await newMathou(student.id);

			for (const [decoration] of catalog) {
				expect((await buy(student.id, decoration, mathou)).ok).toBe(true);
			}
			expect(await balanceOf(student.id)).toBe(0);
			expect((await activityOf(student.id)).map((a) => [a.delta, a.reason])).toEqual(
				catalog.map(([, price, reason]) => [-price, reason])
			);
		});

		it('le journal des récompenses montre la dépense', async () => {
			const student = await newStudent(20);
			const mathou = await newMathou(student.id);
			await buy(student.id, 'heart', mathou);

			const pg = await getPostgresClient();
			const { rows } = await pg.query(
				`select event_type, amount from public.reward_events
					where student_id = $1 and source_table = 'gidouilles_activity'`,
				[student.id]
			);
			expect(
				rows.map((r: { event_type: string; amount: string }) => [r.event_type, Number(r.amount)])
			).toEqual([['spent', 10]]);
		});

		it('solde insuffisant : refus avec ce qui manque, rien débité ni donné', async () => {
			const student = await newStudent(15);
			const mathou = await newMathou(student.id);

			expect(await buy(student.id, 'medal', mathou)).toEqual({
				ok: false,
				reason: 'insufficient_funds',
				missing: 25
			});
			expect(await balanceOf(student.id)).toBe(15);
			expect(await ownedBy(student.id)).toEqual([]);
			expect(await wornBy(student.id)).toEqual({ [mathou]: null });
			expect(await activityOf(student.id)).toEqual([]);
		});

		it('ce qui manque est arrondi au-dessus quand le solde a des centimes', async () => {
			const student = await newStudent(9.5);
			const mathou = await newMathou(student.id);

			expect(await buy(student.id, 'heart', mathou)).toEqual({
				ok: false,
				reason: 'insufficient_funds',
				missing: 1
			});
		});

		it('déjà achetée : pas de second achat ni de second débit', async () => {
			const student = await newStudent(50);
			const mathou = await newMathou(student.id);
			const other = await newMathou(student.id);
			await buy(student.id, 'cockade', mathou);

			expect(await buy(student.id, 'cockade', other)).toEqual({
				ok: false,
				reason: 'already_owned'
			});
			expect(await balanceOf(student.id)).toBe(30);
			expect(await wornBy(student.id)).toEqual({ [mathou]: 'cockade', [other]: null });
			expect(await activityOf(student.id)).toHaveLength(1);
		});

		it('double clic : deux achats simultanés, un seul débit', async () => {
			const student = await newStudent(50);
			const mathou = await newMathou(student.id);

			const outcomes = await Promise.all([
				buy(student.id, 'medal', mathou),
				buy(student.id, 'medal', mathou)
			]);
			expect(outcomes.filter((o) => o.ok)).toHaveLength(1);
			expect(outcomes.filter((o) => !o.ok)).toEqual([{ ok: false, reason: 'already_owned' }]);
			expect(await balanceOf(student.id)).toBe(10);
			expect(await activityOf(student.id)).toHaveLength(1);
		});

		it('deux achats différents simultanés qui dépassent le solde : un seul passe', async () => {
			const student = await newStudent(50);
			const mathou = await newMathou(student.id);

			const outcomes = await Promise.all([
				buy(student.id, 'medal', mathou),
				buy(student.id, 'coat_of_arms', mathou)
			]);
			expect(outcomes.filter((o) => o.ok)).toHaveLength(1);
			expect(outcomes.find((o) => !o.ok)).toEqual({
				ok: false,
				reason: 'insufficient_funds',
				missing: 30
			});
			expect(await balanceOf(student.id)).toBe(10);
		});

		it('l’achat sur un Mathou déjà décoré remplace sa décoration, l’ancienne reste achetée', async () => {
			const student = await newStudent(50);
			const mathou = await newMathou(student.id);
			await buy(student.id, 'heart', mathou);

			expect((await buy(student.id, 'star', mathou)).ok).toBe(true);
			expect(await wornBy(student.id)).toEqual({ [mathou]: 'star' });
			expect((await ownedBy(student.id)).map((o) => o.decoration)).toEqual(['heart', 'star']);
		});

		it('refus : décoration inconnue (le croissant est réservé au Lunaire)', async () => {
			const student = await newStudent(50);
			const mathou = await newMathou(student.id);

			expect(await buy(student.id, 'crescent', mathou)).toEqual({
				ok: false,
				reason: 'unknown_decoration'
			});
			expect(await balanceOf(student.id)).toBe(50);
			expect(await ownedBy(student.id)).toEqual([]);
		});

		it('refus : Mathou pas né (aucune ligne) ou Mathou d’un autre élève', async () => {
			const student = await newStudent(50);
			const other = await newStudent(0);
			const othersMathou = await newMathou(other.id);
			const unborn = await newNotion();

			for (const notion of [unborn, othersMathou]) {
				expect(await buy(student.id, 'heart', notion)).toEqual({
					ok: false,
					reason: 'mathou_not_found'
				});
			}
			expect(await balanceOf(student.id)).toBe(50);
			expect(await ownedBy(student.id)).toEqual([]);
			expect(await wornBy(other.id)).toEqual({ [othersMathou]: null });
		});

		it('achat réservé aux élèves : un prof est refusé', async () => {
			const { error } = await service.rpc(BUY, {
				p_student_id: teacherId,
				p_decoration: 'heart',
				p_notion_id: await newNotion()
			});
			expect(error?.message).toContain('Élève introuvable');
			expect(await ownedBy(teacherId)).toEqual([]);
		});

		it('un élève connecté ne peut pas appeler l’achat, ni le visiteur', async () => {
			const student = await newStudent(50);
			const mathou = await newMathou(student.id);
			const args = { p_student_id: student.id, p_decoration: 'heart', p_notion_id: mathou };

			for (const client of [student.client, anon]) {
				const { error } = await client.rpc(BUY, args);
				expect(error?.code).toBe(PERMISSION_DENIED);
			}
			expect(await balanceOf(student.id)).toBe(50);
			expect(await ownedBy(student.id)).toEqual([]);
		});

		it('un achat ne libère pas le plafond des étapes (20 sur 24 h, gains seuls)', async () => {
			const student = await newStudent(40);
			const mathou = await newMathou(student.id);
			await buy(student.id, 'medal', mathou);
			// Grand matou jamais payé : 3 + 5 + 10 = 18 tiennent sous le plafond, l'étoile (5) non
			const pg = await getPostgresClient();
			await pg.query(
				`update public.student_mathoux set best_stage = 'grand_matou', starred_grades = '{2}'
					where student_id = $1 and notion_id = $2`,
				[student.id, mathou]
			);

			const { data, error } = await service.rpc('pay_mathou_milestones', {
				p_student_id: student.id
			});
			expect(error).toBeNull();
			expect((data as { delta: number }[]).map((p) => p.delta)).toEqual([3, 5, 10]);
			expect(await balanceOf(student.id)).toBe(18);
		});
	});

	describe('pose', () => {
		it('poser sur un autre Mathou la déplace, gratuitement', async () => {
			const student = await newStudent(20);
			const first = await newMathou(student.id);
			const second = await newMathou(student.id);
			await buy(student.id, 'heart', first);

			expect(await wear(student.id, second, 'heart')).toEqual({ ok: true });
			expect(await wornBy(student.id)).toEqual({ [first]: null, [second]: 'heart' });
			expect(await balanceOf(student.id)).toBe(10);
			expect(await activityOf(student.id)).toHaveLength(1);
		});

		it('poser une décoration sur un Mathou décoré libère l’ancienne', async () => {
			const student = await newStudent(20);
			const mathou = await newMathou(student.id);
			const other = await newMathou(student.id);
			await buy(student.id, 'heart', mathou);
			await buy(student.id, 'star', other);

			expect(await wear(student.id, mathou, 'star')).toEqual({ ok: true });
			expect(await wornBy(student.id)).toEqual({ [mathou]: 'star', [other]: null });
		});

		it('retrait gratuit ; reposer ensuite', async () => {
			const student = await newStudent(20);
			const mathou = await newMathou(student.id);
			await buy(student.id, 'heart', mathou);

			expect(await wear(student.id, mathou, null)).toEqual({ ok: true });
			expect(await wornBy(student.id)).toEqual({ [mathou]: null });
			expect(await wear(student.id, mathou, 'heart')).toEqual({ ok: true });
			expect(await wornBy(student.id)).toEqual({ [mathou]: 'heart' });
			expect(await balanceOf(student.id)).toBe(10);
		});

		it('refus : décoration pas achetée, inconnue, ou Mathou d’un autre élève', async () => {
			const student = await newStudent(20);
			const mathou = await newMathou(student.id);
			const other = await newStudent(20);
			const othersMathou = await newMathou(other.id);
			await buy(other.id, 'heart', othersMathou);
			await buy(student.id, 'heart', mathou);

			expect(await wear(student.id, mathou, 'medal')).toEqual({ ok: false, reason: 'not_owned' });
			expect(await wear(student.id, mathou, 'crescent')).toEqual({
				ok: false,
				reason: 'unknown_decoration'
			});
			expect(await wear(student.id, othersMathou, 'heart')).toEqual({
				ok: false,
				reason: 'mathou_not_found'
			});
			expect(await wear(student.id, othersMathou, null)).toEqual({
				ok: false,
				reason: 'mathou_not_found'
			});
			expect(await wornBy(student.id)).toEqual({ [mathou]: 'heart' });
			expect(await wornBy(other.id)).toEqual({ [othersMathou]: 'heart' });
		});

		it('un élève connecté ne peut pas appeler la pose, ni le visiteur', async () => {
			const student = await newStudent(20);
			const mathou = await newMathou(student.id);
			await buy(student.id, 'heart', mathou);
			const args = { p_student_id: student.id, p_notion_id: mathou, p_decoration: null };

			for (const client of [student.client, anon]) {
				const { error } = await client.rpc(WEAR, args);
				expect(error?.code).toBe(PERMISSION_DENIED);
			}
			expect(await wornBy(student.id)).toEqual({ [mathou]: 'heart' });
		});
	});

	describe('garanties de la base', () => {
		it('un Mathou ne peut porter qu’une décoration achetée par SON élève', async () => {
			const student = await newStudent(20);
			const mathou = await newMathou(student.id);
			const other = await newStudent(20);
			await buy(other.id, 'heart', await newMathou(other.id));

			const pg = await getPostgresClient();
			await expect(
				pg.query(
					`update public.student_mathoux set decoration = 'heart'
						where student_id = $1 and notion_id = $2`,
					[student.id, mathou]
				)
			).rejects.toMatchObject({ code: FOREIGN_KEY_VIOLATION });
		});

		it('une décoration n’orne qu’un seul Mathou à la fois', async () => {
			const student = await newStudent(20);
			const first = await newMathou(student.id);
			const second = await newMathou(student.id);
			await buy(student.id, 'heart', first);

			const pg = await getPostgresClient();
			await expect(
				pg.query(
					`update public.student_mathoux set decoration = 'heart'
						where student_id = $1 and notion_id = $2`,
					[student.id, second]
				)
			).rejects.toMatchObject({ code: UNIQUE_VIOLATION });
		});

		it('supprimer le compte supprime ses décorations (effacement RGPD)', async () => {
			const student = await newStudent(20);
			await buy(student.id, 'heart', await newMathou(student.id));

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
		it('le catalogue du code (prix, libellés) est celui de la base, qui débite', async () => {
			for (const info of MATHOU_DECORATIONS) {
				const { data, error } = await service.rpc('mathou_decoration_catalog', {
					p_decoration: info.id
				});
				expect(error).toBeNull();
				expect(data).toEqual([{ price: info.price, label: info.purchaseLabel }]);
			}
			// Une clé hors du catalogue n'a pas de prix
			const { data: unknown } = await service.rpc('mathou_decoration_catalog', {
				p_decoration: 'crescent'
			});
			expect(unknown).toEqual([]);
			expect(MATHOU_DECORATIONS.map((d) => d.id)).toEqual([...MATHOU_DECORATION_IDS]);
		});

		it('le catalogue est réservé au serveur', async () => {
			const student = await newStudent(0);
			for (const client of [student.client, anon]) {
				const { error } = await client.rpc('mathou_decoration_catalog', {
					p_decoration: 'heart'
				});
				expect(error?.code).toBe(PERMISSION_DENIED);
			}
		});

		it('l’élève lit ses décorations, pas celles d’un autre ; le prof lit ; le visiteur rien', async () => {
			const student = await newStudent(20);
			const other = await newStudent(20);
			await buy(student.id, 'heart', await newMathou(student.id));
			await buy(other.id, 'star', await newMathou(other.id));
			const ids = [student.id, other.id];

			const own = await student.client
				.from(TABLE)
				.select('student_id, decoration')
				.in('student_id', ids);
			expect(own.error).toBeNull();
			expect(own.data).toEqual([{ student_id: student.id, decoration: 'heart' }]);

			const teacher = await teacherClient
				.from(TABLE)
				.select('decoration')
				.in('student_id', ids)
				.order('decoration');
			expect(teacher.error).toBeNull();
			expect(teacher.data?.map((r) => r.decoration)).toEqual(['heart', 'star']);

			const visitor = await anon.from(TABLE).select('decoration').in('student_id', ids);
			expect(visitor.data ?? []).toEqual([]);
		});

		it('l’élève ne peut ni s’offrir une décoration ni décorer lui-même un Mathou', async () => {
			const student = await newStudent(0);
			const mathou = await newMathou(student.id);

			const insert = await student.client
				.from(TABLE)
				.insert({ student_id: student.id, decoration: 'medal', price_paid: 0 });
			expect(insert.error?.code).toBe(PERMISSION_DENIED);

			const update = await student.client
				.from('student_mathoux')
				.update({ decoration: null })
				.eq('student_id', student.id)
				.select('notion_id');
			expect(update.error?.code).toBe(PERMISSION_DENIED);

			expect(await ownedBy(student.id)).toEqual([]);
			expect(await wornBy(student.id)).toEqual({ [mathou]: null });
		});
	});
});
