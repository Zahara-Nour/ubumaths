/**
 * Noms anglais des nœuds de l'arbre : le lot de traductions (ADR 0043, PR 3)
 * ==========================================================================
 *
 * Migration `20261124204132_noms_anglais_noeuds_traductions` : 637 noms anglais, un par nœud
 * actif de l'arbre, vérifiés contre les programmes anglais et validés par David le 2026-11-24
 * (journal docs/wip/notions-en-anglais-progress.md). La liste attendue est la fixture
 * `noms-anglais-noeuds.json` (chemin « Branche > Notion > Sous-notion » → nom anglais) : les
 * identifiants des nœuds diffèrent d'une base à l'autre, pas les chemins.
 *
 * La pile de test a déjà joué la migration. Le test pose donc l'état de la prod d'avant (aucun nœud
 * n'a de nom anglais), rejoue la migration **depuis son fichier**, puis son rollback écrit en
 * commentaire, dans une transaction annulée à la fin.
 *
 * @vitest-environment node
 *
 * @migration-de-donnees : hors des PR, rejoué la nuit (scripts/ci-integration-exclusions.sh)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Client } from 'pg';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { extractRollback } from '../helpers/database/migration-rollback';

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261124204132_noms_anglais_noeuds_traductions.sql';
const ATTENDUS: Record<string, string> = JSON.parse(
	readFileSync('tests/integration/fixtures/noms-anglais-noeuds.json', 'utf-8')
);
/** Exemples lus à l'œil : le théorème de Gauss, un nom avec apostrophe, une branche. */
const EXEMPLES: Record<string, string> = {
	'Arithmétique > PGCD, Bézout et Gauss > théorèmes de Bézout et de Gauss':
		"Bézout's identity and Euclid's lemma",
	'Géométrie > Théorème de Pythagore': "Pythagoras' theorem",
	Arithmétique: 'Number theory'
};
/**
 * Nœuds créés APRÈS cette migration, avec leur nom anglais posé par leur propre migration : le
 * rejeu de celle-ci (tous les noms anglais retirés d'abord) les laisse sans nom, c'est attendu.
 */
const CREES_APRES = new Set([
	'Géométrie > Agrandissement et réduction' // 20261127110709
]);
const CHEMINS_ACTIFS = `with recursive p as (
	select id, name::text as chemin from public.classification_nodes
	 where parent_id is null and archived_at is null
	union all
	select c.id, p.chemin || ' > ' || c.name from public.classification_nodes c
	  join p on c.parent_id = p.id where c.archived_at is null
)`;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Pose l'état de la prod d'avant la migration : aucun nœud n'a de nom anglais. */
async function poserEtatProd(pg: Client): Promise<void> {
	await pg.query(
		`update public.classification_nodes set translations = translations - 'en' where translations ? 'en'`
	);
}

/** Nom anglais de chaque nœud qui en a un, par chemin (`∅` pour un nœud archivé). */
async function lireNoms(pg: Client): Promise<Map<string, string>> {
	const r = await pg.query<{ chemin: string | null; name: string }>(
		`${CHEMINS_ACTIFS}
		 select p.chemin, c.translations -> 'en' ->> 'name' as name
		   from public.classification_nodes c left join p on p.id = c.id
		  where c.translations ? 'en'`
	);
	return new Map(r.rows.map((x) => [x.chemin ?? `∅ ${x.name}`, x.name]));
}

async function lireCheminsActifs(pg: Client): Promise<string[]> {
	const r = await pg.query<{ chemin: string }>(`${CHEMINS_ACTIFS} select chemin from p`);
	return r.rows.map((x) => x.chemin);
}

function trie(m: Map<string, string> | Record<string, string>): [string, string][] {
	const entrees = m instanceof Map ? [...m] : Object.entries(m);
	return entrees.sort(([a], [b]) => a.localeCompare(b));
}

// ============================================================================
// SUITE
// ============================================================================

describe('Noms anglais des nœuds : le lot de traductions (migration de données)', () => {
	let pg: Client;
	let apres: Map<string, string>;
	let annule: Map<string, string>;
	let actifs: string[];

	beforeAll(async () => {
		pg = await getPostgresClient();
		await pg.query('begin');
		await poserEtatProd(pg);
		await pg.query(readFileSync(MIGRATION, 'utf-8'));
		apres = await lireNoms(pg);
		actifs = await lireCheminsActifs(pg);
		await pg.query(extractRollback(MIGRATION));
		annule = await lireNoms(pg);
	}, 60_000);

	afterAll(async () => {
		await pg.query('rollback');
	});

	it('chaque nœud de la liste reçoit EXACTEMENT son nom anglais, et aucun autre nœud', () => {
		expect(trie(apres)).toEqual(trie(ATTENDUS));
	});

	it('tous les nœuds actifs ont un nom anglais', () => {
		expect(actifs.filter((chemin) => !apres.has(chemin) && !CREES_APRES.has(chemin))).toEqual([]);
	});

	it('les exemples lus à l’œil sont sur le bon nœud', () => {
		for (const [chemin, en] of Object.entries(EXEMPLES)) expect(apres.get(chemin)).toBe(en);
	});

	it('le rollback écrit dans la migration rend l’état d’avant (aucun nom anglais)', () => {
		expect(annule.size).toBe(0);
	});
});

describe('Noms anglais des nœuds : la migration n’efface rien et refuse un arbre différent', () => {
	let pg: Client;

	beforeAll(async () => {
		pg = await getPostgresClient();
	});

	afterAll(async () => {
		await pg.query('rollback').catch(() => undefined);
	});

	async function enTransaction(corps: () => Promise<void>): Promise<void> {
		await pg.query('begin');
		try {
			await corps();
		} finally {
			await pg.query('rollback');
		}
	}

	it('un nœud qui a déjà un nom anglais le garde', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg);
			await pg.query(
				`update public.classification_nodes
				    set translations = '{"en": {"name": "Hand-written name"}}'
				  where name = 'Arithmétique' and parent_id is null`
			);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			expect((await lireNoms(pg)).get('Arithmétique')).toBe('Hand-written name');
		});
	});

	it('rejouée deux fois, elle passe et ne change rien', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			const une = trie(await lireNoms(pg));
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			expect(trie(await lireNoms(pg))).toEqual(une);
		});
	});

	it('un nœud renommé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg);
			await pg.query(
				`update public.classification_nodes set name = 'Arithmétique (renommée)'
				  where name = 'Arithmétique' and parent_id is null`
			);
			// La branche et ses descendants : 1 branche + ses notions et sous-notions
			const attendus = Object.keys(ATTENDUS).filter(
				(c) => c === 'Arithmétique' || c.startsWith('Arithmétique > ')
			).length;
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				new RegExp(`noeuds absents de la base : ${attendus}$`)
			);
		});
	});
});
