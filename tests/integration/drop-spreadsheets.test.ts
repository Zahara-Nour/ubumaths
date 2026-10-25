/**
 * Suppression de la table du tableur V4 — intégration
 * ===================================================
 *
 * Migration `20261025230000_drop_spreadsheets.sql` (DESTRUCTIVE, demandée par David le
 * 2026-10-25, après le deploy:prod v0.47.0 qui livre le retrait de `/spreadsheet`, #1692).
 * Ce qu'on prouve : la table `spreadsheets` et sa fonction de trigger n'existent plus.
 *
 * DOIT échouer sans la migration (catalogue).
 * `pnpm db:start` puis
 * `pnpm test:integration tests/integration/drop-spreadsheets.test.ts`.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { getPostgresClient } from '../helpers/database/postgres-client';

// Functions
async function catalogValue(sql: string, params: unknown[] = []): Promise<unknown> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(sql, params);
	return rows[0]?.value;
}

describe('suppression de la table du tableur V4 (20261025230000)', () => {
	it('la table public.spreadsheets n’existe plus', async () => {
		expect(await catalogValue(`select to_regclass('public.spreadsheets')::text as value`)).toBe(
			null
		);
	});

	it('la fonction update_spreadsheets_updated_at n’existe plus', async () => {
		const count = await catalogValue(
			`select count(*)::int as value from pg_proc p join pg_namespace n on n.oid = p.pronamespace
			 where n.nspname = 'public' and p.proname = 'update_spreadsheets_updated_at'`
		);
		expect(count).toBe(0);
	});
});
