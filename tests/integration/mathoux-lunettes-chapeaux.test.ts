/**
 * Mathoux : lunettes et chapeaux (migration 20261025235500, lot D)
 * ================================================================
 *
 * Phase 0 du 2026-10-25 (docs/wip/mathoux-chapeaux-lunettes-progress.md) :
 *   - dix pièces choisies par David : lunettes rondes 10, lunettes de soleil 10,
 *     monocle 20, pince-nez 20, lunettes à gidouille 40 (yeux) ; chapeau melon 10,
 *     béret 10, canotier 10, haut-de-forme 20, chapeau pointu 20 (tête) ;
 *   - mêmes règles que la panse et le cou : achetée une fois, un seul Mathou à la
 *     fois, déplacement et retrait gratuits, une pièce au plus par emplacement ;
 *     les quatre emplacements se cumulent ;
 *   - un seul catalogue et une seule table d'achats ; le Mathou porte une
 *     décoration par emplacement (yeux : `glasses`, tête : `hat`).
 *
 * Question d'accès tranchée en phase 0 : rien de nouveau. L'élève voit les
 * siennes, le prof celles de ses élèves, les autres élèves rien ; écriture
 * serveur seule.
 *
 * Vrais clients authentifiés ; chaque refus prouvé par le code d'erreur ET par
 * l'état relu hors RLS (docs/pratiques/rls-echecs-silencieux.md).
 *
 * Client non typé : les colonnes et les fonctions neuves n'existent dans `database.ts`
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
const WEAR_GLASSES = 'set_mathou_glasses';
const WEAR_HAT = 'set_mathou_hat';
const PERMISSION_DENIED = '42501';
const FOREIGN_KEY_VIOLATION = '23503';
const UNIQUE_VIOLATION = '23505';
const CHECK_VIOLATION = '23514';
const TAG = `zz-mathoux-tete-${crypto.randomUUID().slice(0, 8)}`;

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

async function wearAt(
	fn: typeof WEAR_COLLAR | typeof WEAR_GLASSES | typeof WEAR_HAT,
	studentId: string,
	notionId: string,
	piece: string | null
): Promise<Outcome> {
	const param = { [WEAR_COLLAR]: 'p_collar', [WEAR_GLASSES]: 'p_glasses', [WEAR_HAT]: 'p_hat' }[fn];
	const { data, error } = await service.rpc(fn, {
		p_student_id: studentId,
		p_notion_id: notionId,
		[param]: piece
	});
	if (error) throw new Error(`${fn} : ${error.message}`);
	return data as Outcome;
}

const wearGlasses = (s: string, n: string, p: string | null): Promise<Outcome> =>
	wearAt(WEAR_GLASSES, s, n, p);
const wearHat = (s: string, n: string, p: string | null): Promise<Outcome> =>
	wearAt(WEAR_HAT, s, n, p);

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

type Worn = {
	decoration: string | null;
	collar: string | null;
	glasses: string | null;
	hat: string | null;
};

const BARE: Worn = { decoration: null, collar: null, glasses: null, hat: null };

/** Ce que porte chaque Mathou de l'élève (quatre emplacements), relu HORS RLS. */
async function wornBy(studentId: string): Promise<Record<string, Worn>> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(
		'select notion_id, decoration, collar, glasses, hat from public.student_mathoux where student_id = $1',
		[studentId]
	);
	return Object.fromEntries(
		rows.map((r: Worn & { notion_id: string }) => [
			r.notion_id,
			{ decoration: r.decoration, collar: r.collar, glasses: r.glasses, hat: r.hat }
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
describe('Lunettes et chapeaux des Mathoux', () => {
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
		it('achète le monocle (20) : débit, posé sur les yeux, ligne au journal', async () => {
			const student = await newStudent(50);
			const mathou = await newMathou(student.id);

			expect(await buy(student.id, 'monocle', mathou)).toEqual({ ok: true, balance: 30 });
			expect(await balanceOf(student.id)).toBe(30);
			expect(await ownedBy(student.id)).toEqual([{ decoration: 'monocle', price_paid: 20 }]);
			expect(await wornBy(student.id)).toEqual({ [mathou]: { ...BARE, glasses: 'monocle' } });
			expect(await activityOf(student.id)).toEqual([
				{ delta: -20, reason: 'Chatterie : monocle acheté' }
			]);
		});

		it('achète le béret (10) : posé sur la tête', async () => {
			const student = await newStudent(10);
			const mathou = await newMathou(student.id);

			expect(await buy(student.id, 'beret', mathou)).toEqual({ ok: true, balance: 0 });
			expect(await wornBy(student.id)).toEqual({ [mathou]: { ...BARE, hat: 'beret' } });
		});

		it('les dix prix et libellés, et l’emplacement de chaque pièce', async () => {
			const catalog: [string, number, string, 'eyes' | 'head'][] = [
				['round_glasses', 10, 'Chatterie : lunettes rondes achetées', 'eyes'],
				['sunglasses', 10, 'Chatterie : lunettes de soleil achetées', 'eyes'],
				['monocle', 20, 'Chatterie : monocle acheté', 'eyes'],
				['pince_nez', 20, 'Chatterie : pince-nez acheté', 'eyes'],
				['spiral_glasses', 40, 'Chatterie : lunettes à gidouille achetées', 'eyes'],
				['bowler', 10, 'Chatterie : chapeau melon acheté', 'head'],
				['beret', 10, 'Chatterie : béret acheté', 'head'],
				['boater', 10, 'Chatterie : canotier acheté', 'head'],
				['top_hat', 20, 'Chatterie : haut-de-forme acheté', 'head'],
				['pointed_hat', 20, 'Chatterie : chapeau pointu acheté', 'head']
			];
			const student = await newStudent(170);
			const mathou = await newMathou(student.id);

			for (const [piece] of catalog) {
				expect([piece, (await buy(student.id, piece, mathou)).ok]).toEqual([piece, true]);
			}
			expect(await balanceOf(student.id)).toBe(0);
			expect((await activityOf(student.id)).map((a) => [a.delta, a.reason])).toEqual(
				catalog.map(([, price, reason]) => [-price, reason])
			);
			for (const [piece, , , slot] of catalog) {
				const { data, error } = await service.rpc('mathou_decoration_slot', {
					p_decoration: piece
				});
				expect(error).toBeNull();
				expect([piece, data]).toEqual([piece, slot]);
			}
			// Chaque achat se pose sur le Mathou choisi : le dernier de chaque emplacement reste
			expect(await wornBy(student.id)).toEqual({
				[mathou]: { ...BARE, glasses: 'spiral_glasses', hat: 'pointed_hat' }
			});
		});

		it('les quatre emplacements se cumulent sur le même Mathou', async () => {
			const student = await newStudent(40);
			const mathou = await newMathou(student.id);

			await buy(student.id, 'heart', mathou);
			await buy(student.id, 'bell', mathou);
			await buy(student.id, 'round_glasses', mathou);
			await buy(student.id, 'bowler', mathou);
			expect(await wornBy(student.id)).toEqual({
				[mathou]: { decoration: 'heart', collar: 'bell', glasses: 'round_glasses', hat: 'bowler' }
			});
		});

		it('solde insuffisant : refus avec ce qui manque, rien débité ni donné', async () => {
			const student = await newStudent(15);
			const mathou = await newMathou(student.id);

			expect(await buy(student.id, 'spiral_glasses', mathou)).toEqual({
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
			await buy(student.id, 'top_hat', mathou);

			expect(await buy(student.id, 'top_hat', other)).toEqual({
				ok: false,
				reason: 'already_owned'
			});
			expect(await balanceOf(student.id)).toBe(30);
			expect(await activityOf(student.id)).toHaveLength(1);
		});

		it('double clic : deux achats simultanés, un seul débit', async () => {
			const student = await newStudent(50);
			const mathou = await newMathou(student.id);

			const outcomes = await Promise.all([
				buy(student.id, 'spiral_glasses', mathou),
				buy(student.id, 'spiral_glasses', mathou)
			]);
			expect(outcomes.filter((o) => o.ok)).toHaveLength(1);
			expect(await balanceOf(student.id)).toBe(10);
			expect(await activityOf(student.id)).toHaveLength(1);
		});

		it('refus : pièce inconnue (le bicorne écarté compris), Mathou d’un autre élève ; achat réservé aux élèves', async () => {
			const student = await newStudent(50);
			const other = await newStudent(50);
			const mathou = await newMathou(student.id);
			const othersMathou = await newMathou(other.id);

			expect(await buy(student.id, 'bicorne', mathou)).toEqual({
				ok: false,
				reason: 'unknown_decoration'
			});
			expect(await buy(student.id, 'beret', othersMathou)).toEqual({
				ok: false,
				reason: 'mathou_not_found'
			});
			expect(await balanceOf(student.id)).toBe(50);

			const { error } = await service.rpc(BUY, {
				p_student_id: teacherId,
				p_decoration: 'beret',
				p_notion_id: mathou
			});
			expect(error?.message).toContain('Élève introuvable');
		});
	});

	describe('pose', () => {
		it('poser sur un autre Mathou déplace lunettes et chapeau, gratuitement ; le reste ne bouge pas', async () => {
			const student = await newStudent(40);
			const first = await newMathou(student.id);
			const second = await newMathou(student.id);
			await buy(student.id, 'heart', first);
			await buy(student.id, 'bell', first);
			await buy(student.id, 'sunglasses', first);
			await buy(student.id, 'boater', first);

			expect(await wearGlasses(student.id, second, 'sunglasses')).toEqual({ ok: true });
			expect(await wearHat(student.id, second, 'boater')).toEqual({ ok: true });
			expect(await wornBy(student.id)).toEqual({
				[first]: { ...BARE, decoration: 'heart', collar: 'bell' },
				[second]: { ...BARE, glasses: 'sunglasses', hat: 'boater' }
			});
			expect(await balanceOf(student.id)).toBe(0);
		});

		it('poser une pièce sur un Mathou qui en porte une la remplace ; l’ancienne reste achetée', async () => {
			const student = await newStudent(60);
			const mathou = await newMathou(student.id);
			await buy(student.id, 'round_glasses', mathou);
			await buy(student.id, 'pince_nez', mathou);
			await buy(student.id, 'bowler', mathou);
			await buy(student.id, 'top_hat', mathou);

			expect(await wearGlasses(student.id, mathou, 'round_glasses')).toEqual({ ok: true });
			expect(await wearHat(student.id, mathou, 'bowler')).toEqual({ ok: true });
			expect(await wornBy(student.id)).toEqual({
				[mathou]: { ...BARE, glasses: 'round_glasses', hat: 'bowler' }
			});
			expect((await ownedBy(student.id)).map((o) => o.decoration)).toEqual([
				'bowler',
				'pince_nez',
				'round_glasses',
				'top_hat'
			]);
		});

		it('retrait gratuit des lunettes, puis du chapeau, sans toucher le reste', async () => {
			const student = await newStudent(50);
			const mathou = await newMathou(student.id);
			await buy(student.id, 'heart', mathou);
			await buy(student.id, 'bell', mathou);
			await buy(student.id, 'monocle', mathou);

			expect(await wearGlasses(student.id, mathou, null)).toEqual({ ok: true });
			expect(await wornBy(student.id)).toEqual({
				[mathou]: { ...BARE, decoration: 'heart', collar: 'bell' }
			});
			await buy(student.id, 'beret', await newMathou(student.id));
			expect(await wearHat(student.id, mathou, 'beret')).toEqual({ ok: true });
			expect(await wearHat(student.id, mathou, null)).toEqual({ ok: true });
			expect((await wornBy(student.id))[mathou]).toEqual({
				...BARE,
				decoration: 'heart',
				collar: 'bell'
			});
			expect(await balanceOf(student.id)).toBe(0);
		});

		it('retirer la panse ou le collier laisse lunettes et chapeau', async () => {
			const student = await newStudent(40);
			const mathou = await newMathou(student.id);
			await buy(student.id, 'heart', mathou);
			await buy(student.id, 'bell', mathou);
			await buy(student.id, 'sunglasses', mathou);
			await buy(student.id, 'beret', mathou);

			expect(await wear(student.id, mathou, null)).toEqual({ ok: true });
			expect(await wearAt(WEAR_COLLAR, student.id, mathou, null)).toEqual({ ok: true });
			expect(await wornBy(student.id)).toEqual({
				[mathou]: { ...BARE, glasses: 'sunglasses', hat: 'beret' }
			});
		});

		it('chaque pièce à son emplacement, dans les quatre fonctions de pose', async () => {
			const student = await newStudent(40);
			const mathou = await newMathou(student.id);
			for (const piece of ['heart', 'bell', 'sunglasses', 'beret']) {
				await buy(student.id, piece, mathou);
			}
			await wear(student.id, mathou, null);
			await wearAt(WEAR_COLLAR, student.id, mathou, null);
			await wearGlasses(student.id, mathou, null);
			await wearHat(student.id, mathou, null);

			const refused = { ok: false, reason: 'unknown_decoration' };
			expect(await wear(student.id, mathou, 'beret')).toEqual(refused);
			expect(await wearAt(WEAR_COLLAR, student.id, mathou, 'sunglasses')).toEqual(refused);
			for (const wrong of ['heart', 'bell', 'beret']) {
				expect([wrong, await wearGlasses(student.id, mathou, wrong)]).toEqual([wrong, refused]);
			}
			for (const wrong of ['heart', 'bell', 'sunglasses']) {
				expect([wrong, await wearHat(student.id, mathou, wrong)]).toEqual([wrong, refused]);
			}
			expect(await wornBy(student.id)).toEqual({ [mathou]: BARE });
		});

		it('refus : pièce pas achetée, inconnue, ou Mathou d’un autre élève', async () => {
			const student = await newStudent(20);
			const other = await newStudent(10);
			const mathou = await newMathou(student.id);
			const othersMathou = await newMathou(other.id);
			await buy(student.id, 'round_glasses', mathou);
			await buy(student.id, 'bowler', mathou);

			expect(await wearGlasses(student.id, mathou, 'monocle')).toEqual({
				ok: false,
				reason: 'not_owned'
			});
			expect(await wearHat(student.id, mathou, 'top_hat')).toEqual({
				ok: false,
				reason: 'not_owned'
			});
			expect(await wearHat(student.id, mathou, 'bicorne')).toEqual({
				ok: false,
				reason: 'unknown_decoration'
			});
			expect(await wearGlasses(student.id, othersMathou, 'round_glasses')).toEqual({
				ok: false,
				reason: 'mathou_not_found'
			});
			expect(await wearHat(student.id, othersMathou, 'bowler')).toEqual({
				ok: false,
				reason: 'mathou_not_found'
			});
			expect(await wornBy(other.id)).toEqual({ [othersMathou]: BARE });
		});

		it('un élève connecté ne peut pas appeler les poses, ni le visiteur', async () => {
			const student = await newStudent(20);
			const mathou = await newMathou(student.id);
			await buy(student.id, 'round_glasses', mathou);
			await buy(student.id, 'bowler', mathou);

			for (const client of [student.client, anon]) {
				for (const [fn, param] of [
					[WEAR_GLASSES, 'p_glasses'],
					[WEAR_HAT, 'p_hat']
				] as const) {
					const { error } = await client.rpc(fn, {
						p_student_id: student.id,
						p_notion_id: mathou,
						[param]: null
					});
					expect([fn, error?.code]).toEqual([fn, PERMISSION_DENIED]);
				}
			}
			expect(await wornBy(student.id)).toEqual({
				[mathou]: { ...BARE, glasses: 'round_glasses', hat: 'bowler' }
			});
		});
	});

	describe('garanties de la base', () => {
		it('un Mathou ne porte que des lunettes et un chapeau achetés par SON élève', async () => {
			const student = await newStudent(10);
			const mathou = await newMathou(student.id);
			const other = await newStudent(20);
			const othersMathou = await newMathou(other.id);
			await buy(other.id, 'round_glasses', othersMathou);
			await buy(other.id, 'beret', othersMathou);

			const pg = await getPostgresClient();
			for (const column of ['glasses', 'hat']) {
				const piece = column === 'glasses' ? 'round_glasses' : 'beret';
				await expect(
					pg.query(
						`update public.student_mathoux set ${column} = $3
							where student_id = $1 and notion_id = $2`,
						[student.id, mathou, piece]
					)
				).rejects.toMatchObject({ code: FOREIGN_KEY_VIOLATION });
			}
		});

		it('une pièce n’orne qu’un seul Mathou à la fois', async () => {
			const student = await newStudent(20);
			const first = await newMathou(student.id);
			const second = await newMathou(student.id);
			await buy(student.id, 'round_glasses', first);
			await buy(student.id, 'beret', first);

			const pg = await getPostgresClient();
			for (const [column, piece] of [
				['glasses', 'round_glasses'],
				['hat', 'beret']
			]) {
				await expect(
					pg.query(
						`update public.student_mathoux set ${column} = $3
							where student_id = $1 and notion_id = $2`,
						[student.id, second, piece]
					)
				).rejects.toMatchObject({ code: UNIQUE_VIOLATION });
			}
		});

		it('chaque colonne refuse les pièces des autres emplacements, même hors fonctions', async () => {
			const student = await newStudent(40);
			const mathou = await newMathou(student.id);
			for (const piece of ['heart', 'bell', 'sunglasses', 'beret']) {
				await buy(student.id, piece, mathou);
			}

			const pg = await getPostgresClient();
			for (const [column, wrong] of [
				['decoration', 'sunglasses'],
				['collar', 'beret'],
				['glasses', 'beret'],
				['glasses', 'heart'],
				['hat', 'sunglasses'],
				['hat', 'bell']
			]) {
				await expect(
					pg.query(`update public.student_mathoux set ${column} = $2 where student_id = $1`, [
						student.id,
						wrong
					])
				).rejects.toMatchObject({ code: CHECK_VIOLATION });
			}
		});

		it('un achat supprimé seul laisse les yeux ou la tête nus, le reste intact', async () => {
			const student = await newStudent(40);
			const mathou = await newMathou(student.id);
			for (const piece of ['heart', 'bell', 'sunglasses', 'beret']) {
				await buy(student.id, piece, mathou);
			}

			const pg = await getPostgresClient();
			await pg.query(
				`delete from public.${TABLE} where student_id = $1 and decoration in ('sunglasses', 'beret')`,
				[student.id]
			);
			expect(await wornBy(student.id)).toEqual({
				[mathou]: { ...BARE, decoration: 'heart', collar: 'bell' }
			});
		});

		it('supprimer le compte supprime ses lunettes et chapeaux (effacement RGPD)', async () => {
			const student = await newStudent(20);
			const mathou = await newMathou(student.id);
			expect((await buy(student.id, 'sunglasses', mathou)).ok).toBe(true);
			expect((await buy(student.id, 'beret', mathou)).ok).toBe(true);
			expect(await ownedBy(student.id)).toHaveLength(2);

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
		it('l’élève lit ses pièces et ce que portent ses Mathoux, pas ceux d’un autre ; le prof lit ; le visiteur rien', async () => {
			const student = await newStudent(20);
			const other = await newStudent(20);
			const mathou = await newMathou(student.id);
			await buy(student.id, 'monocle', mathou);
			await buy(other.id, 'top_hat', await newMathou(other.id));
			const ids = [student.id, other.id];

			const own = await student.client
				.from(TABLE)
				.select('student_id, decoration')
				.in('student_id', ids);
			expect(own.error).toBeNull();
			expect(own.data).toEqual([{ student_id: student.id, decoration: 'monocle' }]);

			const worn = await student.client
				.from('student_mathoux')
				.select('student_id, glasses, hat')
				.in('student_id', ids);
			expect(worn.error).toBeNull();
			expect(worn.data).toEqual([{ student_id: student.id, glasses: 'monocle', hat: null }]);

			const teacher = await teacherClient
				.from('student_mathoux')
				.select('glasses, hat')
				.in('student_id', ids)
				.order('glasses');
			expect(teacher.error).toBeNull();
			expect(teacher.data).toEqual([
				{ glasses: 'monocle', hat: null },
				{ glasses: null, hat: 'top_hat' }
			]);

			const visitor = await anon
				.from('student_mathoux')
				.select('glasses, hat')
				.in('student_id', ids);
			expect(visitor.error?.code).toBe(PERMISSION_DENIED);
			expect(visitor.data ?? []).toEqual([]);
		});

		it('l’élève ne peut ni s’offrir une pièce ni en poser une lui-même', async () => {
			const student = await newStudent(0);
			const mathou = await newMathou(student.id);

			const insert = await student.client
				.from(TABLE)
				.insert({ student_id: student.id, decoration: 'spiral_glasses', price_paid: 0 });
			expect(insert.error?.code).toBe(PERMISSION_DENIED);

			for (const column of ['glasses', 'hat']) {
				const update = await student.client
					.from('student_mathoux')
					.update({ [column]: null })
					.eq('student_id', student.id)
					.select('notion_id');
				expect([column, update.error?.code]).toEqual([column, PERMISSION_DENIED]);
			}

			expect(await ownedBy(student.id)).toEqual([]);
			expect(await wornBy(student.id)).toEqual({ [mathou]: BARE });
		});
	});
});
