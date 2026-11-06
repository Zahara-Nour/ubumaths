/**
 * Boutique d'avatars : catalogue, collection, achat et port (migration 20261106164739)
 * ===================================================================================
 *
 * Phase 0 validée par David le 2026-11-06 (docs/wip/boutique-avatars-progress.md) :
 *   - avatars achetés en gidouilles seulement, à prix fixe, une fois pour toutes ;
 *   - achat atomique : solde vérifié, débit, avatar dans la collection, ligne au
 *     journal (« Avatar : <nom> acheté », −prix) ; solde insuffisant → refus avec ce
 *     qui manque ; déjà acheté → pas de second débit ; double clic → un seul débit ;
 *   - refus : avatar inconnu, retiré de la vente, hors de sa fenêtre (séries de
 *     l'Almanach) ; achat réservé aux élèves ;
 *   - l'avatar porté remplace la photo Google (`avatar_url`) ; le retirer rend la
 *     photo Google ; un avatar acheté reste portable, même retiré de la vente.
 *
 * Question d'accès tranchée par David : catalogue lisible par tout utilisateur
 * connecté ; collection lisible par l'élève seul (ni prof ni admin) ; écriture
 * serveur seule. En miroir : plus personne n'écrit sa propre `avatar_url` à la main.
 *
 * Vrais clients authentifiés. La RLS et les droits échouent en silence
 * (docs/pratiques/rls-echecs-silencieux.md) : chaque refus est prouvé par le code
 * d'erreur ET par l'état relu hors RLS.
 *
 * Client non typé : tables, colonnes et fonctions n'existent dans `database.ts`
 * qu'après `db:types`.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	cleanupAllTestData,
	generateTestEmail,
	TEST_SERVICE_ROLE_KEY
} from '../helpers/database/trigger-test-helpers';
import { DEFAULT_TEST_PASSWORD } from '../helpers/database/supabase-client';
import { connectPostgresClient, getPostgresClient } from '../helpers/database/postgres-client';
import { TestData } from '../helpers/database/test-data-factory';

// Types
type Account = { id: string; client: SupabaseClient };
type Outcome = {
	ok: boolean;
	reason?: string;
	missing?: number;
	balance?: number;
	avatar_url?: string | null;
};
type CatalogRow = {
	key: string;
	family: string;
	name: string;
	price: number;
	image_path: string;
	available_from?: string | null;
	available_until?: string | null;
	active?: boolean;
	sort_order?: number;
};

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const ANON_KEY =
	process.env.SUPABASE_TEST_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };
const CATALOG = 'avatar_catalog';
const COLLECTION = 'student_avatars';
const BUY = 'buy_avatar';
const WEAR = 'set_worn_avatar';
const PERMISSION_DENIED = '42501';
const CHECK_VIOLATION = '23514';
const FOREIGN_KEY_VIOLATION = '23503';
const GOOGLE_PHOTO = 'https://lh3.googleusercontent.com/a/photo-de-test=s96-c';
const NEW_GOOGLE_PHOTO = 'https://lh3.googleusercontent.com/a/nouvelle-photo=s96-c';
// Clés du catalogue de test : `^[a-z0-9_]{1,50}$`, préfixe unique par lancement
const TAG = `zzt${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
const DAY = 24 * 3600 * 1000;

// Variables
let service: SupabaseClient;
let anon: SupabaseClient;
let teacher: Account;
let admin: Account;
let itemCount = 0;
let classCount = 0;
const authUsersToDelete: string[] = [];

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

/** Un élève avec un solde et une photo Google donnés (posés hors RLS). */
async function newStudent(gidouilles = 0, googlePhoto: string | null = GOOGLE_PHOTO) {
	const profile = await TestData.profile().withRole('student').create();
	const pg = await getPostgresClient();
	await pg.query(
		`update public.profiles set gidouilles = $2, avatar_url = $3, google_avatar_url = $3
			where id = $1`,
		[profile.id, gidouilles, googlePhoto]
	);
	return { id: profile.id, email: profile.email, client: await signedIn(profile.email) };
}

/** Un article du catalogue, inséré par le serveur. */
async function newItem(overrides: Partial<CatalogRow> = {}): Promise<CatalogRow> {
	itemCount += 1;
	const key = `${TAG}_${itemCount}`;
	const row: CatalogRow = {
		key,
		family: 'galopin',
		name: `Galopin de test ${itemCount}`,
		price: 30,
		image_path: `/avatars/galopin/${key}.webp`,
		sort_order: itemCount,
		...overrides
	};
	const { error } = await service.from(CATALOG).insert(row);
	if (error) throw new Error(`décor ${CATALOG} : ${error.message}`);
	return row;
}

async function buy(studentId: string, avatar: string): Promise<Outcome> {
	const { data, error } = await service.rpc(BUY, { p_student_id: studentId, p_avatar: avatar });
	if (error) throw new Error(`${BUY} : ${error.message}`);
	return data as Outcome;
}

async function wear(studentId: string, avatar: string | null): Promise<Outcome> {
	const { data, error } = await service.rpc(WEAR, { p_student_id: studentId, p_avatar: avatar });
	if (error) throw new Error(`${WEAR} : ${error.message}`);
	return data as Outcome;
}

/** Profil relu HORS RLS. */
async function profileOf(id: string): Promise<{
	gidouilles: number;
	avatar_url: string | null;
	google_avatar_url: string | null;
	worn_avatar: string | null;
}> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(
		`select gidouilles, avatar_url, google_avatar_url, worn_avatar
			from public.profiles where id = $1`,
		[id]
	);
	return { ...rows[0], gidouilles: Number(rows[0].gidouilles) };
}

/** Collection relue HORS RLS. */
async function ownedBy(studentId: string): Promise<{ avatar_key: string; price_paid: number }[]> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(
		`select avatar_key, price_paid from public.${COLLECTION}
			where student_id = $1 order by avatar_key`,
		[studentId]
	);
	return rows.map((r: { avatar_key: string; price_paid: number }) => ({
		avatar_key: r.avatar_key,
		price_paid: Number(r.price_paid)
	}));
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

/** Inscription : une ligne auth.users insérée en direct déclenche handle_new_user(). */
async function signupViaAuth(id: string, email: string, meta: Record<string, unknown>) {
	const pg = await getPostgresClient();
	await pg.query(
		`insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
			values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, $3, now(), now())`,
		[id, email, JSON.stringify(meta)]
	);
	authUsersToDelete.push(id);
}

/** Inscrit l'élève (actif) dans une classe neuve, posée hors RLS ; rend son id. */
async function enrollInNewClass(studentId: string): Promise<string> {
	classCount += 1;
	const pg = await getPostgresClient();
	const {
		rows: [cls]
	} = await pg.query(`insert into public.classes (name, join_code) values ($1, $2) returning id`, [
		`${TAG} classe ${classCount}`,
		`${TAG}${classCount}`.toUpperCase()
	]);
	await pg.query(
		`insert into public.class_members (class_id, student_id, status) values ($1, $2, 'active')`,
		[cls.id, studentId]
	);
	return cls.id as string;
}

// Tests
describe('Boutique d’avatars', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		service = createClient(SUPABASE_URL, TEST_SERVICE_ROLE_KEY, CLIENT_OPTIONS);
		anon = createClient(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);
		const t = await TestData.profile().withRole('teacher').create();
		teacher = { id: t.id, client: await signedIn(t.email) };
		const a = await TestData.profile().withRole('admin').create();
		admin = { id: a.id, client: await signedIn(a.email) };
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
		// Les collections d'abord (clé en RESTRICT vers le catalogue), puis le catalogue.
		await pg
			.query(`delete from public.${COLLECTION} where avatar_key like $1`, [`${TAG}%`])
			.catch(() => undefined);
		await pg
			.query(`delete from public.${CATALOG} where key like $1`, [`${TAG}%`])
			.catch(() => undefined);
		for (const id of authUsersToDelete) {
			await pg.query('delete from auth.users where id = $1', [id]).catch(() => undefined);
		}
		await cleanupAllTestData();
	});

	describe('achat', () => {
		it('achat nominal : débit, avatar dans la collection, ligne au journal, rien porté', async () => {
			const student = await newStudent(50);
			const item = await newItem({ name: 'Galopin au cerf-volant', price: 30 });

			expect(await buy(student.id, item.key)).toEqual({ ok: true, balance: 20 });
			const profile = await profileOf(student.id);
			expect(profile.gidouilles).toBe(20);
			expect(await ownedBy(student.id)).toEqual([{ avatar_key: item.key, price_paid: 30 }]);
			expect(await activityOf(student.id)).toEqual([
				{ delta: -30, reason: 'Avatar : Galopin au cerf-volant acheté' }
			]);
			// L'achat n'équipe pas
			expect(profile.worn_avatar).toBeNull();
			expect(profile.avatar_url).toBe(GOOGLE_PHOTO);
		});

		it('la ligne au journal porte la classe active de l’élève', async () => {
			const student = await newStudent(20);
			const item = await newItem({ price: 15 });
			const classId = await enrollInNewClass(student.id);

			await buy(student.id, item.key);
			const pg = await getPostgresClient();
			const { rows } = await pg.query(
				'select class_id from public.gidouilles_activity where student_id = $1',
				[student.id]
			);
			expect(rows).toEqual([{ class_id: classId }]);
		});

		it('solde insuffisant : refus avec ce qui manque, rien ne bouge', async () => {
			const student = await newStudent(9.5);
			const item = await newItem({ price: 15 });

			expect(await buy(student.id, item.key)).toEqual({
				ok: false,
				reason: 'insufficient_funds',
				missing: 6
			});
			expect((await profileOf(student.id)).gidouilles).toBe(9.5);
			expect(await ownedBy(student.id)).toEqual([]);
			expect(await activityOf(student.id)).toEqual([]);
		});

		it('déjà possédé : pas de second achat ni de second débit', async () => {
			const student = await newStudent(100);
			const item = await newItem({ price: 30 });
			await buy(student.id, item.key);

			expect(await buy(student.id, item.key)).toEqual({ ok: false, reason: 'already_owned' });
			expect((await profileOf(student.id)).gidouilles).toBe(70);
			expect(await activityOf(student.id)).toHaveLength(1);
		});

		it('refus : avatar inconnu', async () => {
			const student = await newStudent(100);

			expect(await buy(student.id, `${TAG}_inexistant`)).toEqual({
				ok: false,
				reason: 'unknown_avatar'
			});
			expect((await profileOf(student.id)).gidouilles).toBe(100);
			expect(await ownedBy(student.id)).toEqual([]);
		});

		it('refus : avatar retiré de la vente, ou hors de sa fenêtre (avant, après)', async () => {
			const student = await newStudent(100);
			const now = Date.now();
			const inactive = await newItem({ active: false });
			const notYet = await newItem({
				available_from: new Date(now + DAY).toISOString(),
				available_until: new Date(now + 2 * DAY).toISOString()
			});
			const over = await newItem({
				available_from: new Date(now - 2 * DAY).toISOString(),
				available_until: new Date(now - DAY).toISOString()
			});

			for (const item of [inactive, notYet, over]) {
				expect(await buy(student.id, item.key)).toEqual({ ok: false, reason: 'not_on_sale' });
			}
			expect((await profileOf(student.id)).gidouilles).toBe(100);
			expect(await ownedBy(student.id)).toEqual([]);
			expect(await activityOf(student.id)).toEqual([]);
		});

		it('dans sa fenêtre (ou une seule borne posée) : achat accepté', async () => {
			const student = await newStudent(100);
			const now = Date.now();
			const during = await newItem({
				family: 'almanac',
				price: 15,
				available_from: new Date(now - DAY).toISOString(),
				available_until: new Date(now + DAY).toISOString()
			});
			const sinceYesterday = await newItem({
				price: 15,
				available_from: new Date(now - DAY).toISOString()
			});
			const untilTomorrow = await newItem({
				price: 15,
				available_until: new Date(now + DAY).toISOString()
			});

			for (const item of [during, sinceYesterday, untilTomorrow]) {
				expect((await buy(student.id, item.key)).ok).toBe(true);
			}
			expect((await profileOf(student.id)).gidouilles).toBe(55);
		});

		it('double clic : deux achats simultanés, un seul débit', async () => {
			const student = await newStudent(50);
			const item = await newItem({ price: 30 });

			const outcomes = await Promise.all([buy(student.id, item.key), buy(student.id, item.key)]);
			expect(outcomes.filter((o) => o.ok)).toHaveLength(1);
			expect(outcomes.filter((o) => !o.ok)).toEqual([{ ok: false, reason: 'already_owned' }]);
			expect((await profileOf(student.id)).gidouilles).toBe(20);
			expect(await activityOf(student.id)).toHaveLength(1);
		});

		it('deux achats différents simultanés qui dépassent le solde : un seul passe', async () => {
			const student = await newStudent(50);
			const first = await newItem({ price: 30 });
			const second = await newItem({ price: 30 });

			const outcomes = await Promise.all([buy(student.id, first.key), buy(student.id, second.key)]);
			expect(outcomes.filter((o) => o.ok)).toHaveLength(1);
			expect(outcomes.find((o) => !o.ok)).toEqual({
				ok: false,
				reason: 'insufficient_funds',
				missing: 10
			});
			expect((await profileOf(student.id)).gidouilles).toBe(20);
		});

		it('achat réservé aux élèves : un prof est refusé', async () => {
			const item = await newItem({ price: 0 });
			const { error } = await service.rpc(BUY, { p_student_id: teacher.id, p_avatar: item.key });
			expect(error?.message).toContain('Élève introuvable');
			expect(await ownedBy(teacher.id)).toEqual([]);
		});
	});

	describe('port', () => {
		it('porter : avatar_url = image du catalogue ; retirer : la photo Google revient', async () => {
			const student = await newStudent(50);
			const item = await newItem({ price: 15 });
			await buy(student.id, item.key);

			expect(await wear(student.id, item.key)).toEqual({ ok: true, avatar_url: item.image_path });
			expect(await profileOf(student.id)).toMatchObject({
				worn_avatar: item.key,
				avatar_url: item.image_path,
				google_avatar_url: GOOGLE_PHOTO,
				gidouilles: 35
			});

			expect(await wear(student.id, null)).toEqual({ ok: true, avatar_url: GOOGLE_PHOTO });
			expect(await profileOf(student.id)).toMatchObject({
				worn_avatar: null,
				avatar_url: GOOGLE_PHOTO,
				google_avatar_url: GOOGLE_PHOTO,
				gidouilles: 35
			});
		});

		it('retirer sans photo Google : plus d’adresse (avatar par défaut)', async () => {
			const student = await newStudent(50, null);
			const item = await newItem({ price: 15 });
			await buy(student.id, item.key);
			await wear(student.id, item.key);

			expect(await wear(student.id, null)).toEqual({ ok: true, avatar_url: null });
			expect(await profileOf(student.id)).toMatchObject({ worn_avatar: null, avatar_url: null });
		});

		it('porter un avatar non possédé (ou inconnu) : refusé, rien ne change', async () => {
			const student = await newStudent(50);
			const other = await newStudent(50);
			const item = await newItem({ price: 15 });
			await buy(other.id, item.key);

			for (const key of [item.key, `${TAG}_inexistant`]) {
				expect(await wear(student.id, key)).toEqual({ ok: false, reason: 'not_owned' });
			}
			expect(await profileOf(student.id)).toMatchObject({
				worn_avatar: null,
				avatar_url: GOOGLE_PHOTO
			});
		});

		it('un avatar acheté reste portable hors de sa fenêtre et retiré de la vente', async () => {
			const student = await newStudent(50);
			const item = await newItem({ family: 'almanac', price: 15 });
			await buy(student.id, item.key);
			const pg = await getPostgresClient();
			await pg.query(
				`update public.${CATALOG} set active = false,
					available_from = now() - interval '2 days', available_until = now() - interval '1 day'
					where key = $1`,
				[item.key]
			);

			expect(await wear(student.id, item.key)).toEqual({ ok: true, avatar_url: item.image_path });
			expect((await profileOf(student.id)).worn_avatar).toBe(item.key);
		});

		it('porter réservé aux élèves : un prof est refusé', async () => {
			const { error } = await service.rpc(WEAR, { p_student_id: teacher.id, p_avatar: null });
			expect(error?.message).toContain('Élève introuvable');
		});
	});

	describe('garanties de la base', () => {
		it('worn_avatar ne peut désigner qu’un avatar de SA collection', async () => {
			const student = await newStudent(50);
			const other = await newStudent(50);
			const item = await newItem({ price: 15 });
			await buy(other.id, item.key);

			const pg = await getPostgresClient();
			await expect(
				pg.query('update public.profiles set worn_avatar = $2 where id = $1', [
					student.id,
					item.key
				])
			).rejects.toMatchObject({ code: FOREIGN_KEY_VIOLATION });
		});

		it('catalogue : clé, famille et chemin d’image contraints', async () => {
			const pg = await getPostgresClient();
			const bad: [string, string, string][] = [
				[`${TAG}_Majuscule`, 'galopin', '/avatars/x.webp'],
				[`${TAG}_famille`, 'dragon', '/avatars/x.webp'],
				[`${TAG}_externe`, 'galopin', 'https://exemple.com/x.webp'],
				[`${TAG}_png`, 'galopin', '/avatars/x.png'],
				[`${TAG}_remonte`, 'galopin', '/avatars/../secret.webp']
			];
			for (const [key, family, image] of bad) {
				await expect(
					pg.query(
						`insert into public.${CATALOG} (key, family, name, price, image_path, sort_order)
							values ($1, $2, 'x', 10, $3, 0)`,
						[key, family, image]
					)
				).rejects.toMatchObject({ code: CHECK_VIOLATION });
			}
			await expect(
				pg.query(
					`insert into public.${CATALOG} (key, family, name, price, image_path, sort_order)
						values ($1, 'galopin', 'x', -1, '/avatars/x.webp', 0)`,
					[`${TAG}_negatif`]
				)
			).rejects.toMatchObject({ code: CHECK_VIOLATION });
		});

		it('supprimer le compte supprime sa collection, avatar porté compris (effacement RGPD)', async () => {
			const student = await newStudent(50);
			const item = await newItem({ price: 15 });
			await buy(student.id, item.key);
			await wear(student.id, item.key);

			const pg = await getPostgresClient();
			await pg.query('delete from public.profiles where id = $1', [student.id]);
			const { rows } = await pg.query(
				`select count(*)::int as n from public.${COLLECTION} where student_id = $1`,
				[student.id]
			);
			expect(rows[0].n).toBe(0);
		});

		it('backfill : google_avatar_url copiée des photos Google existantes', async () => {
			// Vérifie la règle sur la base : aucun profil dont avatar_url est une photo
			// Google sans google_avatar_url (hors port d'un avatar).
			const pg = await getPostgresClient();
			const { rows } = await pg.query(
				`select count(*)::int as n from public.profiles
					where avatar_url like 'https://lh3.googleusercontent.com/%'
						and google_avatar_url is distinct from avatar_url`
			);
			expect(rows[0].n).toBe(0);
		});
	});

	describe('accès', () => {
		it('l’élève connecté ne peut écrire ni avatar_url, ni worn_avatar, ni google_avatar_url', async () => {
			const student = await newStudent(50);
			const item = await newItem({ price: 15 });
			await buy(student.id, item.key);

			const attempts: Record<string, string | null>[] = [
				{ avatar_url: 'https://exemple.com/image-choisie.png' },
				{ avatar_url: item.image_path },
				{ avatar_url: null },
				{ worn_avatar: item.key },
				{ google_avatar_url: 'https://exemple.com/image-choisie.png' }
			];
			for (const patch of attempts) {
				const { error } = await student.client
					.from('profiles')
					.update(patch)
					.eq('id', student.id)
					.select('id');
				// Refus du garde (puis de la policy) : 42501, jamais un succès muet
				expect(error?.code).toBe(PERMISSION_DENIED);
			}
			expect(await profileOf(student.id)).toMatchObject({
				avatar_url: GOOGLE_PHOTO,
				google_avatar_url: GOOGLE_PHOTO,
				worn_avatar: null
			});
		});

		it('ni le prof (élève de sa classe) ni l’admin n’écrivent l’avatar d’un élève', async () => {
			const student = await newStudent(50);
			const item = await newItem({ price: 15 });
			await buy(student.id, item.key);
			await wear(student.id, item.key);
			await enrollInNewClass(student.id);

			const attempts: Record<string, string | null>[] = [
				{ avatar_url: 'https://exemple.com/image-choisie.png' },
				{ avatar_url: null },
				{ worn_avatar: null },
				{ google_avatar_url: 'https://exemple.com/image-choisie.png' }
			];
			for (const client of [teacher.client, admin.client]) {
				for (const patch of attempts) {
					const { error } = await client
						.from('profiles')
						.update(patch)
						.eq('id', student.id)
						.select('id');
					expect(error?.code).toBe(PERMISSION_DENIED);
				}
			}
			expect(await profileOf(student.id)).toMatchObject({
				worn_avatar: item.key,
				avatar_url: item.image_path,
				google_avatar_url: GOOGLE_PHOTO
			});
		});

		it('le prof donne toujours des gidouilles, l’admin modifie toujours un profil', async () => {
			const student = await newStudent(50);
			await enrollInNewClass(student.id);

			const reward = await teacher.client
				.from('profiles')
				.update({ gidouilles: 70 })
				.eq('id', student.id)
				.select('gidouilles');
			expect(reward.error).toBeNull();
			expect(reward.data).toEqual([{ gidouilles: 70 }]);

			const rename = await admin.client
				.from('profiles')
				.update({ firstname: 'Bougrelas' })
				.eq('id', student.id)
				.select('firstname');
			expect(rename.error).toBeNull();
			expect(rename.data).toEqual([{ firstname: 'Bougrelas' }]);
			expect((await profileOf(student.id)).gidouilles).toBe(70);
		});

		it('l’élève connecté peut toujours modifier le reste de son profil', async () => {
			const student = await newStudent(50);
			const { data, error } = await student.client
				.from('profiles')
				.update({ firstname: 'Ubu' })
				.eq('id', student.id)
				.select('firstname');
			expect(error).toBeNull();
			expect(data).toEqual([{ firstname: 'Ubu' }]);
		});

		it('l’élève connecté ne peut ni s’offrir un avatar, ni appeler achat et port ; le visiteur non plus', async () => {
			const student = await newStudent(50);
			const item = await newItem({ price: 15 });

			const insert = await student.client
				.from(COLLECTION)
				.insert({ student_id: student.id, avatar_key: item.key, price_paid: 0 });
			expect(insert.error?.code).toBe(PERMISSION_DENIED);

			for (const client of [student.client, anon]) {
				const bought = await client.rpc(BUY, { p_student_id: student.id, p_avatar: item.key });
				expect(bought.error?.code).toBe(PERMISSION_DENIED);
				const worn = await client.rpc(WEAR, { p_student_id: student.id, p_avatar: null });
				expect(worn.error?.code).toBe(PERMISSION_DENIED);
			}
			expect((await profileOf(student.id)).gidouilles).toBe(50);
			expect(await ownedBy(student.id)).toEqual([]);
		});

		it('l’élève connecté ne peut pas écrire le catalogue', async () => {
			const student = await newStudent(0);
			const item = await newItem({ price: 60 });

			const insert = await student.client.from(CATALOG).insert({
				key: `${TAG}_pirate`,
				family: 'galopin',
				name: 'pirate',
				price: 0,
				image_path: '/avatars/pirate.webp',
				sort_order: 0
			});
			expect(insert.error?.code).toBe(PERMISSION_DENIED);
			const update = await student.client
				.from(CATALOG)
				.update({ price: 0 })
				.eq('key', item.key)
				.select('key');
			expect(update.error?.code).toBe(PERMISSION_DENIED);

			const pg = await getPostgresClient();
			const { rows } = await pg.query(`select price from public.${CATALOG} where key = $1`, [
				item.key
			]);
			expect(rows).toEqual([{ price: 60 }]);
		});

		it('tout utilisateur connecté lit le catalogue ; le visiteur rien', async () => {
			const student = await newStudent(0);
			const item = await newItem({ name: 'Polyèdre d’Achras', family: 'polyhedron' });

			for (const client of [student.client, teacher.client]) {
				const { data, error } = await client
					.from(CATALOG)
					.select('key, family, name, price, image_path')
					.eq('key', item.key);
				expect(error).toBeNull();
				expect(data).toEqual([
					{
						key: item.key,
						family: 'polyhedron',
						name: 'Polyèdre d’Achras',
						price: item.price,
						image_path: item.image_path
					}
				]);
			}

			const visitor = await anon.from(CATALOG).select('key').eq('key', item.key);
			expect(visitor.data ?? []).toEqual([]);
		});

		it('l’élève lit SA collection, pas celle d’un autre ; ni prof, ni admin, ni visiteur', async () => {
			const student = await newStudent(50);
			const other = await newStudent(50);
			const item = await newItem({ price: 15 });
			await buy(student.id, item.key);
			await buy(other.id, item.key);
			const ids = [student.id, other.id];

			const own = await student.client
				.from(COLLECTION)
				.select('student_id, avatar_key')
				.in('student_id', ids);
			expect(own.error).toBeNull();
			expect(own.data).toEqual([{ student_id: student.id, avatar_key: item.key }]);

			for (const client of [teacher.client, admin.client, anon]) {
				const { data } = await client.from(COLLECTION).select('avatar_key').in('student_id', ids);
				expect(data ?? []).toEqual([]);
			}
		});
	});

	describe('inscription (handle_new_user)', () => {
		it('à la création, la photo Google remplit avatar_url ET google_avatar_url', async () => {
			const id = crypto.randomUUID();
			await signupViaAuth(id, generateTestEmail('google'), {
				picture: GOOGLE_PHOTO,
				given_name: 'Ada'
			});

			expect(await profileOf(id)).toMatchObject({
				avatar_url: GOOGLE_PHOTO,
				google_avatar_url: GOOGLE_PHOTO,
				worn_avatar: null
			});
		});

		it('à la création par code de classe invalide, aussi', async () => {
			const id = crypto.randomUUID();
			await signupViaAuth(id, generateTestEmail('google-code'), {
				picture: GOOGLE_PHOTO,
				class_code: 'ZZ-CODE-INEXISTANT',
				firstname: 'Ada',
				lastname: 'L'
			});

			expect(await profileOf(id)).toMatchObject({
				avatar_url: GOOGLE_PHOTO,
				google_avatar_url: GOOGLE_PHOTO
			});
		});

		it('à la création d’un élève pré-inscrit par le prof, aussi', async () => {
			const id = crypto.randomUUID();
			const email = generateTestEmail('google-pre');
			const pg = await getPostgresClient();
			await pg.query(
				`insert into public.pending_students (email, firstname, lastname, grade)
					values ($1, 'Ada', 'L', '6')`,
				[email]
			);
			await signupViaAuth(id, email, { picture: GOOGLE_PHOTO });

			expect(await profileOf(id)).toMatchObject({
				avatar_url: GOOGLE_PHOTO,
				google_avatar_url: GOOGLE_PHOTO
			});
		});

		/**
		 * Profil déjà là quand la ligne auth.users arrive (branche unique_violation du
		 * trigger). La clé profiles.id → auth.users rend ce cas impossible par le chemin
		 * normal : on pose le profil en mode réplication (clés non vérifiées), puis on
		 * insère la ligne auth.users en mode normal, ce qui déclenche le trigger.
		 */
		async function existingProfileThenSignup(options: {
			avatarUrl: string | null;
			wornItem: CatalogRow | null;
		}): Promise<string> {
			const id = crypto.randomUUID();
			const email = generateTestEmail('google-existant');
			const pg = await connectPostgresClient();
			try {
				await pg.query('begin');
				await pg.query('set local session_replication_role = replica');
				await pg.query(
					`insert into public.profiles (id, email, firstname, lastname, role, status, avatar_url, google_avatar_url)
						values ($1, $2, 'Ada', 'L', 'student', 'approved', $3, $4)`,
					[id, email, options.avatarUrl, options.wornItem ? GOOGLE_PHOTO : null]
				);
				if (options.wornItem) {
					await pg.query(
						`insert into public.${COLLECTION} (student_id, avatar_key, price_paid) values ($1, $2, 0)`,
						[id, options.wornItem.key]
					);
					await pg.query('update public.profiles set worn_avatar = $2 where id = $1', [
						id,
						options.wornItem.key
					]);
				}
				await pg.query('set local session_replication_role = origin');
				await pg.query(
					`insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
						values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, $3, now(), now())`,
					[id, email, JSON.stringify({ picture: NEW_GOOGLE_PHOTO })]
				);
				await pg.query('commit');
			} catch (error) {
				await pg.query('rollback');
				throw error;
			} finally {
				await pg.end();
			}
			authUsersToDelete.push(id);
			return id;
		}

		it('profil existant avec un avatar porté : la photo Google ne le remplace pas, google_avatar_url suit', async () => {
			const item = await newItem({ price: 15 });
			const id = await existingProfileThenSignup({ avatarUrl: item.image_path, wornItem: item });

			expect(await profileOf(id)).toMatchObject({
				worn_avatar: item.key,
				avatar_url: item.image_path,
				google_avatar_url: NEW_GOOGLE_PHOTO
			});
		});

		it('profil existant sans avatar ni photo : la photo Google remplit les deux', async () => {
			const id = await existingProfileThenSignup({ avatarUrl: null, wornItem: null });

			expect(await profileOf(id)).toMatchObject({
				worn_avatar: null,
				avatar_url: NEW_GOOGLE_PHOTO,
				google_avatar_url: NEW_GOOGLE_PHOTO
			});
		});
	});
});
