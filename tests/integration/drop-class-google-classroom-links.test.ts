/**
 * Suppression de `class_google_classroom_links` — intégration
 * ===========================================================
 *
 * Migration `20261103170936_drop_class_google_classroom_links.sql` (DESTRUCTIVE,
 * M11 du chantier ecarts-a-trier, décidée par David le 2026-11-03 ; table vide,
 * lue nulle part).
 * Ce qu'on prouve : la table n'existe plus.
 *
 * DOIT échouer sans la migration (catalogue).
 * `pnpm db:start` puis
 * `pnpm test:integration tests/integration/drop-class-google-classroom-links.test.ts`.
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

describe('suppression de class_google_classroom_links (20261103170936)', () => {
	it('la table public.class_google_classroom_links n’existe plus', async () => {
		expect(
			await catalogValue(`select to_regclass('public.class_google_classroom_links')::text as value`)
		).toBe(null);
	});
});
