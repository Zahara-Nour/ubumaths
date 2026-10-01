/**
 * Privilèges par défaut de `public` : rien pour `anon` (base locale requise)
 * ========================================================================
 *
 * Migration `20261001120000_droits_par_defaut_sans_anon` : une table ou une
 * séquence créée par `postgres` dans `public` ne donne plus aucun droit à
 * `anon`. `authenticated` et `service_role` gardent leurs défauts, et les
 * objets EXISTANTS gardent leurs GRANT (portée décidée : futurs objets seuls).
 *
 * Les objets temporaires sont créés via la connexion directe `postgres` (même
 * rôle que les migrations), donc soumis aux mêmes privilèges par défaut.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPostgresClient } from '../helpers/database/postgres-client';

const TABLE = 'public.zz_droits_defaut_table';
const SEQUENCE = 'public.zz_droits_defaut_seq';
const FONCTION = 'public.zz_droits_defaut_fn()';

const TABLE_PRIVILEGES = [
	'SELECT',
	'INSERT',
	'UPDATE',
	'DELETE',
	'TRUNCATE',
	'REFERENCES',
	'TRIGGER'
] as const;
const SEQUENCE_PRIVILEGES = ['USAGE', 'SELECT', 'UPDATE'] as const;

/** Tables existantes lues sans connexion : elles doivent garder leur droit. */
const TABLES_EXISTANTES_LISIBLES = [
	'question_templates',
	'python_exercises',
	'resource_tags'
] as const;

async function hasTablePrivilege(role: string, obj: string, priv: string): Promise<boolean> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query<{ granted: boolean }>(
		'select has_table_privilege($1, $2, $3) as granted',
		[role, obj, priv]
	);
	return rows[0].granted;
}

async function hasSequencePrivilege(role: string, obj: string, priv: string): Promise<boolean> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query<{ granted: boolean }>(
		'select has_sequence_privilege($1, $2, $3) as granted',
		[role, obj, priv]
	);
	return rows[0].granted;
}

async function dropTemporaryObjects(): Promise<void> {
	const pg = await getPostgresClient();
	await pg.query(`drop table if exists ${TABLE}`);
	await pg.query(`drop sequence if exists ${SEQUENCE}`);
	await pg.query(`drop function if exists ${FONCTION}`);
}

describe('privilèges par défaut du schéma public — aucun droit pour anon', () => {
	beforeAll(async () => {
		await dropTemporaryObjects();
		const pg = await getPostgresClient();
		await pg.query(`create table ${TABLE} (id uuid primary key default gen_random_uuid())`);
		await pg.query(`create sequence ${SEQUENCE}`);
		await pg.query(`create function ${FONCTION} returns int language sql as 'select 1'`);
	});

	afterAll(async () => {
		await dropTemporaryObjects();
	});

	describe('nouvelle table', () => {
		it.each(TABLE_PRIVILEGES)(`anon n'a pas le privilège %s`, async (privilege) => {
			expect(await hasTablePrivilege('anon', TABLE, privilege)).toBe(false);
		});

		it('authenticated garde ses défauts (arwdxtm, sans TRUNCATE)', async () => {
			for (const p of ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'REFERENCES', 'TRIGGER']) {
				expect(await hasTablePrivilege('authenticated', TABLE, p), p).toBe(true);
			}
			expect(await hasTablePrivilege('authenticated', TABLE, 'TRUNCATE')).toBe(false);
		});

		it('service_role garde tous ses défauts', async () => {
			for (const p of TABLE_PRIVILEGES) {
				expect(await hasTablePrivilege('service_role', TABLE, p), p).toBe(true);
			}
		});
	});

	describe('nouvelle séquence', () => {
		it.each(SEQUENCE_PRIVILEGES)(`anon n'a pas le privilège %s`, async (privilege) => {
			expect(await hasSequencePrivilege('anon', SEQUENCE, privilege)).toBe(false);
		});

		it.each(['authenticated', 'service_role'])('%s garde USAGE, SELECT, UPDATE', async (role) => {
			for (const p of SEQUENCE_PRIVILEGES) {
				expect(await hasSequencePrivilege(role, SEQUENCE, p), p).toBe(true);
			}
		});
	});

	describe('nouvelle fonction', () => {
		it('authenticated et service_role peuvent l’exécuter', async () => {
			const pg = await getPostgresClient();
			const { rows } = await pg.query<{ auth: boolean; service: boolean }>(
				`select has_function_privilege('authenticated', $1, 'EXECUTE') as auth,
				        has_function_privilege('service_role', $1, 'EXECUTE') as service`,
				[FONCTION]
			);
			expect(rows[0]).toEqual({ auth: true, service: true });
		});

		// Hors portée de la migration : le défaut câblé de Postgres donne EXECUTE
		// à PUBLIC (donc à anon) sur toute fonction neuve — mesuré en local et en
		// prod le 2026-10-01. Décision séparée à prendre avant d'activer ce test.
		it.todo('anon et PUBLIC n’ont pas EXECUTE sur une fonction neuve');
	});

	describe('objets existants : inchangés', () => {
		it.each(TABLES_EXISTANTES_LISIBLES)('anon lit toujours %s', async (table) => {
			expect(await hasTablePrivilege('anon', `public.${table}`, 'SELECT')).toBe(true);
		});
	});
});
