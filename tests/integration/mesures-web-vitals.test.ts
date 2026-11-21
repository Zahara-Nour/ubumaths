/**
 * Mesures de performance chez nous : table anonyme, lecture admin seul, purge à 90 jours
 * ======================================================================================
 *
 * Chantier `amelioration`, PR 1 (phase 0 validée par David le 2026-11-21) : Vercel a rendu
 * payant le détail par indicateur ; les mesures des visiteurs (LCP, FCP, TTFB, INP, CLS)
 * sont gardées dans notre base, sans rien qui désigne une personne.
 *
 * Ce que le fichier prouve :
 *   1. la table ne porte aucune colonne d'identité (ni compte, ni adresse, ni navigateur) ;
 *   2. l'admin lit les lignes ; ni le prof, ni l'élève, ni le visiteur ne les lisent ;
 *   3. seul le serveur écrit : personne d'autre n'ajoute, ne modifie ni n'efface, admin compris ;
 *   4. une ligne mal formée est refusée (indicateur, valeur, page, appareil) ;
 *   5. l'heure d'une mesure est arrondie à l'heure, son identifiant est tiré au hasard,
 *      et le serveur ne fixe ni l'un ni l'autre ;
 *   6. la purge efface les lignes de plus de 90 jours, garde les autres, est journalisée,
 *      n'est lançable que par le serveur, et la purge hebdomadaire l'appelle.
 *
 * DOIT échouer sans la migration `…_mesures_web_vitals.sql`.
 *
 * `pnpm test:integration tests/integration/mesures-web-vitals.test.ts`.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';

// Types
type Role = 'anon' | 'authenticated' | 'service_role';
type Resultat<T> = { rows: T[]; code: string | null };

// Constantes
const PAGE = '/(public)/cours/[token]';
const INSERTION = `insert into public.web_vital_samples (route, metric, value, device_type)
	values ($1, $2, $3, $4) returning id`;

// Variables
let adminId: string;
let teacherId: string;
let studentId: string;

// Functions
/**
 * Joue une requête sous un rôle de l'API, avec le compte donné dans le jeton, puis annule
 * tout : mêmes droits et mêmes policies que par PostgREST, `auth.uid()` réel (jamais NULL
 * pour un compte connecté).
 */
async function enTantQue<T extends Record<string, unknown>>(
	role: Role,
	userId: string | null,
	sql: string,
	params: unknown[] = []
): Promise<Resultat<T>> {
	const pg = await getPostgresClient();
	await pg.query('begin');
	try {
		await pg.query(`set local role ${role}`);
		await pg.query(`select set_config('request.jwt.claims', $1, true)`, [
			JSON.stringify(userId ? { sub: userId, role } : { role })
		]);
		const { rows } = await pg.query<T>(sql, params);
		return { rows, code: null };
	} catch (err) {
		const code = (err as { code?: string }).code;
		if (!code) throw err;
		return { rows: [], code };
	} finally {
		await pg.query('rollback');
	}
}

/** Ligne posée par le propriétaire de la base, vieille de `age` (hors droits de l'API). */
async function ligne(age: string, route = PAGE): Promise<string> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query<{ id: string }>(
		`insert into public.web_vital_samples (route, metric, value, device_type, created_at)
		 values ($1, 'LCP', 1234.5, 'mobile', now() - $2::interval) returning id`,
		[route, age]
	);
	return rows[0].id;
}

async function existe(id: string): Promise<boolean> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query('select 1 from public.web_vital_samples where id = $1', [id]);
	return rows.length === 1;
}

async function purger(): Promise<number> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query<{ n: number }>(
		'select public.purge_web_vital_samples()::int as n'
	);
	return rows[0].n;
}

// ============================================================================
// TESTS
// ============================================================================

describe('mesures de performance chez nous', () => {
	beforeAll(async () => {
		await cleanupAllTestData();
		const pg = await getPostgresClient();
		await pg.query('delete from public.web_vital_samples');
		adminId = (await TestData.profile().withRole('admin').create()).id;
		teacherId = (await TestData.profile().withRole('teacher').create()).id;
		studentId = (await TestData.profile().withRole('student').create()).id;
		await ligne('1 minute');
	});

	afterAll(async () => {
		const pg = await getPostgresClient();
		await pg.query('delete from public.web_vital_samples');
		await cleanupAllTestData();
	});

	describe('rien qui désigne une personne', () => {
		it('la table ne porte que la date, la page, l’indicateur, la valeur et l’appareil', async () => {
			const pg = await getPostgresClient();
			const { rows } = await pg.query<{ column_name: string }>(
				`select column_name from information_schema.columns
				 where table_schema = 'public' and table_name = 'web_vital_samples'
				 order by ordinal_position`
			);
			expect(rows.map((r) => r.column_name)).toEqual([
				'id',
				'created_at',
				'route',
				'metric',
				'value',
				'device_type'
			]);
		});

		it('l’heure d’une mesure est arrondie à l’heure', async () => {
			const { rows, code } = await enTantQue<{ arrondie: boolean }>(
				'service_role',
				null,
				`with nouvelle as (${INSERTION.replace('returning id', 'returning created_at')})
				 select created_at = date_trunc('hour', created_at) as arrondie from nouvelle`,
				[PAGE, 'FCP', 900, 'desktop']
			);
			expect(code).toBeNull();
			expect(rows[0].arrondie).toBe(true);
		});

		it('l’identifiant d’une ligne est tiré au hasard, pas un compteur', async () => {
			const pg = await getPostgresClient();
			const { rows } = await pg.query<{ data_type: string; column_default: string }>(
				`select data_type, column_default from information_schema.columns
				 where table_schema = 'public' and table_name = 'web_vital_samples'
				   and column_name = 'id'`
			);
			expect(rows[0]).toEqual({ data_type: 'uuid', column_default: 'gen_random_uuid()' });
		});

		it('une page qui contient un identifiant (adresse réelle) est refusée', async () => {
			const { code } = await enTantQue('service_role', null, INSERTION, [
				'/cours/0b9f6a52-4c1d-4e9a-9d0e-1f2a3b4c5d6e',
				'LCP',
				1000,
				'mobile'
			]);
			expect(code).toBe('23514');
		});
	});

	describe('qui lit', () => {
		it('l’admin lit les lignes', async () => {
			const { rows, code } = await enTantQue(
				'authenticated',
				adminId,
				'select id from public.web_vital_samples'
			);
			expect(code).toBeNull();
			expect(rows).toHaveLength(1);
		});

		it('le prof ne lit aucune ligne', async () => {
			const { rows, code } = await enTantQue(
				'authenticated',
				teacherId,
				'select id from public.web_vital_samples'
			);
			expect(code).toBeNull();
			expect(rows).toEqual([]);
		});

		it('l’élève ne lit aucune ligne', async () => {
			const { rows, code } = await enTantQue(
				'authenticated',
				studentId,
				'select id from public.web_vital_samples'
			);
			expect(code).toBeNull();
			expect(rows).toEqual([]);
		});

		it('le visiteur est refusé', async () => {
			const { code } = await enTantQue('anon', null, 'select id from public.web_vital_samples');
			expect(code).toBe('42501');
		});

		it('le serveur lit les lignes', async () => {
			const { rows, code } = await enTantQue(
				'service_role',
				null,
				'select id from public.web_vital_samples'
			);
			expect(code).toBeNull();
			expect(rows).toHaveLength(1);
		});
	});

	describe('qui écrit', () => {
		it('le serveur ajoute une mesure', async () => {
			const { rows, code } = await enTantQue('service_role', null, INSERTION, [
				PAGE,
				'CLS',
				0.05,
				'tablet'
			]);
			expect(code).toBeNull();
			expect(rows).toHaveLength(1);
		});

		it.each<[string, Role, () => string | null]>([
			['l’admin', 'authenticated', () => adminId],
			['le prof', 'authenticated', () => teacherId],
			['l’élève', 'authenticated', () => studentId],
			['le visiteur', 'anon', () => null]
		])('%s ne peut pas ajouter de mesure', async (_qui, role, compte) => {
			const { code } = await enTantQue(role, compte(), INSERTION, [PAGE, 'LCP', 1000, 'mobile']);
			expect(code).toBe('42501');
		});

		it.each([
			['modifier', 'update public.web_vital_samples set value = 1'],
			['effacer', 'delete from public.web_vital_samples'],
			['vider', 'truncate public.web_vital_samples']
		])('l’admin ne peut pas %s les mesures', async (_geste, sql) => {
			const { code } = await enTantQue('authenticated', adminId, sql);
			expect(code).toBe('42501');
		});

		it.each([
			['modifier', 'update public.web_vital_samples set value = 1'],
			['effacer', 'delete from public.web_vital_samples'],
			['vider', 'truncate public.web_vital_samples'],
			[
				'dater',
				`insert into public.web_vital_samples (route, metric, value, device_type, created_at)
				 values ('/', 'LCP', 100, 'mobile', now())`
			],
			[
				'numéroter',
				`insert into public.web_vital_samples (id, route, metric, value, device_type)
				 values (gen_random_uuid(), '/', 'LCP', 100, 'mobile')`
			]
		])('le serveur ne peut pas %s une mesure', async (_geste, sql) => {
			const { code } = await enTantQue('service_role', null, sql);
			expect(code).toBe('42501');
		});

		it.each<[string, Role, () => string | null]>([
			['le prof', 'authenticated', () => teacherId],
			['l’élève', 'authenticated', () => studentId],
			['le visiteur', 'anon', () => null]
		])('%s ne peut ni modifier ni effacer', async (_qui, role, compte) => {
			const modifier = await enTantQue(
				role,
				compte(),
				'update public.web_vital_samples set value = 1'
			);
			const effacer = await enTantQue(role, compte(), 'delete from public.web_vital_samples');
			expect([modifier.code, effacer.code]).toEqual(['42501', '42501']);
		});
	});

	describe('ligne mal formée', () => {
		it.each([
			['indicateur inconnu', PAGE, 'FID', 100, 'mobile'],
			['valeur négative', PAGE, 'LCP', -1, 'mobile'],
			['valeur au-delà de dix minutes', PAGE, 'LCP', 600001, 'mobile'],
			['décalage de mise en page absurde', PAGE, 'CLS', 101, 'mobile'],
			['valeur qui n’est pas un nombre', PAGE, 'LCP', 'NaN', 'mobile'],
			['valeur infinie', PAGE, 'LCP', 'Infinity', 'mobile'],
			['page sans barre initiale', 'cours', 'LCP', 100, 'mobile'],
			['page avec ses paramètres', '/cours?eleve=1', 'LCP', 100, 'mobile'],
			['page avec une ancre', '/cours#partie', 'LCP', 100, 'mobile'],
			['page avec un jeton à majuscules', '/c/AbC123xYz', 'LCP', 100, 'mobile'],
			['page avec une adresse de courriel', '/profil/eleve@local.test', 'LCP', 100, 'mobile'],
			['page avec une espace', '/profil/prenom nom', 'LCP', 100, 'mobile'],
			['page finissant par une barre', '/cours/', 'LCP', 100, 'mobile'],
			['page trop longue', `/${'a'.repeat(200)}`, 'LCP', 100, 'mobile'],
			['appareil inconnu', PAGE, 'LCP', 100, 'montre']
		])('%s : refusée', async (_cas, route, metric, value, device) => {
			const { code } = await enTantQue('service_role', null, INSERTION, [
				route,
				metric,
				value,
				device
			]);
			expect(code).toBe('23514');
		});

		it.each([
			['dix minutes pile', PAGE, 'INP', 600000],
			['décalage de mise en page de 100 pile', PAGE, 'CLS', 100],
			['page de 200 caractères pile', `/${'a'.repeat(199)}`, 'LCP', 100],
			['l’accueil', '/', 'LCP', 100],
			['paramètre facultatif', '/(protected)/dashboard/[[tab]]', 'LCP', 100],
			['paramètre à matcher et reste', '/fiches/[id=uuid]/[...rest]', 'LCP', 100]
		])('borne acceptée : %s', async (_cas, route, metric, value) => {
			const { code } = await enTantQue('service_role', null, INSERTION, [
				route,
				metric,
				value,
				'desktop'
			]);
			expect(code).toBeNull();
		});
	});

	describe('purge à 90 jours', () => {
		let ancienne: string;
		let limite: string;
		let recente: string;
		let parLaPurgeHebdo: string;
		let premierPassage: number;
		let secondPassage: number;
		let passagesAvant: number;

		/** Passages de la purge journalisés « réussi », depuis toujours. */
		async function passagesJournalises(): Promise<number> {
			const pg = await getPostgresClient();
			const { rows } = await pg.query<{ n: number }>(
				`select count(*)::int as n from background_job_runs
				 where job_name = 'web_vital_samples_purge' and status = 'success'`
			);
			return rows[0].n;
		}

		beforeAll(async () => {
			passagesAvant = await passagesJournalises();
			ancienne = await ligne('91 days');
			limite = await ligne('89 days');
			recente = await ligne('1 hour');
			premierPassage = await purger();
			secondPassage = await purger();
			// Purge hebdomadaire réelle : elle doit atteindre une ligne ancienne.
			parLaPurgeHebdo = await ligne('120 days');
			const pg = await getPostgresClient();
			await pg.query('select public.run_cleanup_expired_data()');
		});

		it('une ligne de 91 jours est effacée', async () => {
			expect(await existe(ancienne)).toBe(false);
		});

		it('une ligne de 89 jours et une ligne récente sont gardées', async () => {
			expect(await existe(limite)).toBe(true);
			expect(await existe(recente)).toBe(true);
		});

		it('le premier passage compte la ligne effacée, le second n’efface rien', () => {
			expect(premierPassage).toBe(1);
			expect(secondPassage).toBe(0);
		});

		it('la purge hebdomadaire (run_cleanup_expired_data) efface une ligne ancienne', async () => {
			expect(await existe(parLaPurgeHebdo)).toBe(false);
		});

		it('la purge hebdomadaire garde ses autres purges', async () => {
			const pg = await getPostgresClient();
			const { rows } = await pg.query<{ def: string }>(
				`select pg_get_functiondef('public.run_cleanup_expired_data'::regproc) as def`
			);
			expect(rows[0].def).toContain('purge_web_vital_samples()');
			expect(rows[0].def).toContain('purge_trace_answers()');
			expect(rows[0].def).toContain('run_retention_c11()');
		});

		it('seul le serveur peut lancer la purge', async () => {
			const pg = await getPostgresClient();
			const { rows } = await pg.query<{ connecte: boolean; visiteur: boolean; serveur: boolean }>(
				`select has_function_privilege('authenticated', 'public.purge_web_vital_samples()', 'EXECUTE') as connecte,
				   has_function_privilege('anon', 'public.purge_web_vital_samples()', 'EXECUTE') as visiteur,
				   has_function_privilege('service_role', 'public.purge_web_vital_samples()', 'EXECUTE') as serveur`
			);
			expect(rows[0]).toEqual({ connecte: false, visiteur: false, serveur: true });
		});

		it('l’admin, appelant la purge lui-même, est refusé', async () => {
			const { code } = await enTantQue(
				'authenticated',
				adminId,
				'select public.purge_web_vital_samples()'
			);
			expect(code).toBe('42501');
		});

		it('chaque passage est journalisé (page admin des tâches planifiées)', async () => {
			// Deux passages directs et celui de la purge hebdomadaire, comptés depuis le début
			// de ce bloc : une relance du fichier ne les trouve pas déjà là.
			expect((await passagesJournalises()) - passagesAvant).toBe(3);
		});
	});
});
