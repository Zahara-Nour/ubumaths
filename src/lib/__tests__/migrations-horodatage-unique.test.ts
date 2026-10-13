/**
 * Garde : deux migrations ne partagent jamais le même horodatage.
 *
 * Supabase identifie une migration par son horodatage (`schema_migrations.version`).
 * Le 2026-10-13, trois chantiers menés en parallèle ont pris `20261016101500` puis
 * `20261016101700` à quelques minutes d'écart : chaque PR était verte seule, et le
 * doublon n'apparaissait qu'une fois les deux sur main, au `db:migrate`.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATIONS = join(process.cwd(), 'supabase/migrations');

describe('supabase/migrations', () => {
	it('aucun horodatage n’est pris par deux migrations', () => {
		const byVersion = new Map<string, string[]>();
		for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql'))) {
			const version = file.split('_')[0];
			byVersion.set(version, [...(byVersion.get(version) ?? []), file]);
		}
		const duplicates = [...byVersion.values()].filter((files) => files.length > 1);
		expect(duplicates, 'renommer la plus récente : horodatage max + 1 min').toEqual([]);
	});
});
