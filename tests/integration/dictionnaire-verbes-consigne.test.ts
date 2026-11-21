/**
 * Chantier « mots-cliquables » (R5) : verbes de consigne « jamais souligné » (Supabase local requis)
 * ==================================================================================================
 *
 * Migration `20261116205041_dictionnaire_verbes_consigne_jamais_soulignes` : 10 entrées du
 * dictionnaire passent à `auto_link = false`. Le test pose l'état de la prod (les 10 soulignables),
 * rejoue la migration **depuis son fichier**, puis son rollback documenté, dans une transaction
 * annulée à la fin. Journal docs/wip/mots-cliquables-progress.md.
 *
 * @vitest-environment node
 *
 * @migration-de-donnees : hors des PR, rejoué la nuit (scripts/ci-integration-exclusions.sh)
 */
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Client } from 'pg';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { extractRollback } from '../helpers/database/migration-rollback';
import { CONSIGNE_VERBS_2026_11_16 } from '../fixtures/lexique/verbes-consigne-2026-11-16';

// Constantes

const MIGRATION =
	'supabase/migrations/20261116205041_dictionnaire_verbes_consigne_jamais_soulignes.sql';
const VERBES = [...CONSIGNE_VERBS_2026_11_16];
/** Notions : restent soulignables */
const NOTIONS = ['résoudre', 'développer', 'factoriser', 'simplifier'];

// Variables

let pg: Client;

// Functions

async function autoLinks(terms: string[]): Promise<Map<string, boolean>> {
	const { rows } = await pg.query<{ term: string; auto_link: boolean }>(
		'select term, auto_link from public.dictionary_entries where sense is null and not hidden and term = any($1)',
		[terms]
	);
	return new Map(rows.map((r) => [r.term, r.auto_link]));
}

async function versionCount(): Promise<number> {
	const { rows } = await pg.query<{ n: string }>(
		`select count(*) n from public.dictionary_entry_versions v
		   join public.dictionary_entries e on e.id = v.entry_id
		  where e.sense is null and e.term = any($1)`,
		[VERBES]
	);
	return Number(rows[0].n);
}

describe('migration : verbes de consigne jamais soulignés', () => {
	beforeAll(async () => {
		pg = await getPostgresClient();
	});

	afterAll(async () => {
		await pg.query('rollback').catch(() => undefined);
	});

	beforeEach(async () => {
		await pg.query('begin');
		// État de la prod : les 10 verbes et les notions sont soulignables
		await pg.query(
			'update public.dictionary_entries set auto_link = true where sense is null and term = any($1)',
			[[...VERBES, ...NOTIONS]]
		);
	});

	afterEach(async () => {
		await pg.query('rollback');
	});

	it('les 10 entrées existent, une seule fois chacune', async () => {
		const links = await autoLinks(VERBES);
		expect([...links.keys()].sort()).toEqual([...VERBES].sort());
	});

	it('passe les 10 verbes à « jamais souligné », garde leur version précédente', async () => {
		const before = await versionCount();
		await pg.query(readFileSync(MIGRATION, 'utf-8'));
		const links = await autoLinks(VERBES);
		for (const verbe of VERBES) expect(links.get(verbe), verbe).toBe(false);
		expect(await versionCount()).toBe(before + VERBES.length);
	});

	it('laisse les notions soulignables', async () => {
		await pg.query(readFileSync(MIGRATION, 'utf-8'));
		const links = await autoLinks(NOTIONS);
		for (const notion of NOTIONS) expect(links.get(notion), notion).toBe(true);
	});

	it('le rollback documenté rend les 10 verbes soulignables', async () => {
		await pg.query(readFileSync(MIGRATION, 'utf-8'));
		await pg.query(extractRollback(MIGRATION));
		const links = await autoLinks(VERBES);
		for (const verbe of VERBES) expect(links.get(verbe), verbe).toBe(true);
	});

	it('échoue sans rien changer si une entrée manque (masquée)', async () => {
		await pg.query(
			"update public.dictionary_entries set hidden = true where sense is null and term = 'tracer'"
		);
		await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
			/10 entrées attendues, 9 trouvées/
		);
	});
});
