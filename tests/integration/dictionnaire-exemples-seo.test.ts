/**
 * Chantier « seo » : un exemple à part sur 14 pages du glossaire (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261121221131_glossaire_exemples_seo_contenu` : 14 entrées du dictionnaire reçoivent
 * un exemple. Le test pose l'état de la prod (les 14 sans exemple), rejoue la migration **depuis
 * son fichier**, puis son rollback documenté, dans une transaction annulée à la fin. Journal
 * docs/wip/seo-progress.md.
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
import { dictionaryRowSchema, DICTIONARY_COLUMNS } from '#lib/dictionary/entry-schema.ts';
import { SEO_EXAMPLES_2026_11_21 } from '../fixtures/lexique/exemples-seo-2026-11-21';

// Constantes

const MIGRATION = 'supabase/migrations/20261121221131_glossaire_exemples_seo_contenu.sql';
const SLUGS = SEO_EXAMPLES_2026_11_21.map((e) => e.slug);
/** Entrée hors du lot, qui a déjà son exemple : la migration ne doit pas y toucher */
const TEMOIN = 'chiffre-de-cesar';

// Types

interface Ligne {
	slug: string;
	term: string;
	sense: string | null;
	grade: string;
	exemples: { items: { grade: string; content: string }[] } | null;
	definitions: unknown;
}

// Variables

let pg: Client;

// Functions

async function lignes(slugs: string[]): Promise<Map<string, Ligne>> {
	const { rows } = await pg.query<Ligne>(
		`select slug, ${DICTIONARY_COLUMNS} from public.dictionary_entries
		  where not hidden and derived_from is null and slug = any($1)`,
		[slugs]
	);
	return new Map(rows.map((r) => [r.slug, r]));
}

async function versionCount(): Promise<number> {
	const { rows } = await pg.query<{ n: string }>(
		`select count(*) n from public.dictionary_entry_versions v
		   join public.dictionary_entries e on e.id = v.entry_id
		  where e.slug = any($1)`,
		[SLUGS]
	);
	return Number(rows[0].n);
}

describe('migration : exemples de 14 pages du glossaire', () => {
	beforeAll(async () => {
		pg = await getPostgresClient();
	});

	afterAll(async () => {
		await pg.query('rollback').catch(() => undefined);
	});

	beforeEach(async () => {
		await pg.query('begin');
		// État de la prod : les 14 entrées n'ont pas d'exemple
		await pg.query('update public.dictionary_entries set exemples = null where slug = any($1)', [
			SLUGS
		]);
	});

	afterEach(async () => {
		await pg.query('rollback');
	});

	it('les 14 entrées existent, avec le terme et le sens attendus', async () => {
		const avant = await lignes(SLUGS);
		expect([...avant.keys()].sort()).toEqual([...SLUGS].sort());
		for (const e of SEO_EXAMPLES_2026_11_21) {
			expect(avant.get(e.slug)?.term, e.slug).toBe(e.term);
			expect(avant.get(e.slug)?.sense ?? undefined, e.slug).toBe(e.sense);
		}
	});

	it('pose un exemple au niveau du terme, sans toucher à la définition, et garde la version précédente', async () => {
		const avant = await lignes(SLUGS);
		const versions = await versionCount();
		await pg.query(readFileSync(MIGRATION, 'utf-8'));
		const apres = await lignes(SLUGS);
		for (const e of SEO_EXAMPLES_2026_11_21) {
			const ligne = apres.get(e.slug);
			expect(ligne?.exemples, e.slug).toEqual({
				items: [{ grade: ligne?.grade, content: e.content }]
			});
			expect(ligne?.definitions, e.slug).toEqual(avant.get(e.slug)?.definitions);
			// La ligne reste lisible par le site (forme stricte des colonnes jsonb)
			expect(dictionaryRowSchema.safeParse(ligne).success, e.slug).toBe(true);
		}
		expect(await versionCount()).toBe(versions + SLUGS.length);
	});

	it('laisse intact l’exemple d’une entrée hors du lot', async () => {
		const avant = (await lignes([TEMOIN])).get(TEMOIN);
		expect(avant?.exemples).not.toBeNull();
		await pg.query(readFileSync(MIGRATION, 'utf-8'));
		expect((await lignes([TEMOIN])).get(TEMOIN)?.exemples).toEqual(avant?.exemples);
	});

	it('le rollback documenté retire les 14 exemples', async () => {
		await pg.query(readFileSync(MIGRATION, 'utf-8'));
		await pg.query(extractRollback(MIGRATION));
		const apres = await lignes(SLUGS);
		for (const slug of SLUGS) expect(apres.get(slug)?.exemples, slug).toBeNull();
	});

	it('échoue sans rien changer si une entrée a déjà un exemple', async () => {
		await pg.query(
			`update public.dictionary_entries
			    set exemples = '{"items": [{"grade": "6", "content": "Exemple déjà saisi."}]}'
			  where slug = 'angle-nul'`
		);
		await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
			/14 entrées sans exemple attendues, 13 trouvées/
		);
	});
});
