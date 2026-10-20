/**
 * Noms propres des Mathoux ↔ notions de la base (Supabase local requis)
 * =====================================================================
 *
 * `MATHOU_NAMES` (src/lib/mathoux/mathou-noms.ts) est clé par NOM de notion
 * (`classification_nodes.name`) : une migration qui renomme ou crée une notion
 * ferait perdre son nom propre au Mathou (repli générique de `mathouName`),
 * sans aucune erreur. Ce test lit l'arbre tel que les migrations le laissent
 * et exige l'égalité exacte des deux ensembles : chaque notion active a son
 * nom, chaque clé de la table désigne une notion active.
 *
 * Les nœuds créés par les autres suites (« itest-… », « zz-… ») vivent sous
 * leurs propres racines : on ne lit que les notions des branches du seed
 * (copie figée : tests/integration/fixtures/arbre-notions-seed.json).
 *
 * ⚠️ Deux angles morts : un renommage fait en prod depuis la page admin de
 * l'arbre (hors migration), et une NOUVELLE branche racine (ses notions ne
 * sont pas lues) — à son seed, ajouter la branche à la copie figée.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { MATHOU_NAMES } from '../../src/lib/mathoux/mathou-noms';

// ============================================================================
// TYPES
// ============================================================================

interface ArbreJson {
	branches: { nom: string; notions: { nom: string }[] }[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const arbre: ArbreJson = JSON.parse(
	readFileSync('tests/integration/fixtures/arbre-notions-seed.json', 'utf-8')
);
const SEED_BRANCHES = arbre.branches.map((b) => b.nom);
const SEED_NOTION_COUNT = arbre.branches.flatMap((b) => b.notions).length;

// ============================================================================
// VARIABLES
// ============================================================================

let notionNames: string[] = [];

// ============================================================================
// TESTS
// ============================================================================

describe('MATHOU_NAMES ↔ classification_nodes', () => {
	beforeAll(async () => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query<{ name: string }>(
			`SELECT n.name
			 FROM public.classification_nodes n
			 JOIN public.classification_nodes b ON b.id = n.parent_id
			 WHERE n.kind = 'notion' AND n.archived_at IS NULL
			   AND b.kind = 'branch' AND b.parent_id IS NULL AND b.name = ANY($1)`,
			[SEED_BRANCHES]
		);
		notionNames = rows.map((r) => r.name);
	});

	it('lit bien les notions du seed', () => {
		expect(notionNames).toHaveLength(SEED_NOTION_COUNT);
		expect(new Set(notionNames).size).toBe(notionNames.length);
	});

	it('chaque notion active a son nom propre', () => {
		const sansNom = notionNames.filter((n) => !Object.hasOwn(MATHOU_NAMES, n));
		expect(sansNom).toEqual([]);
	});

	it('chaque clé de la table désigne une notion active', () => {
		const actives = new Set(notionNames);
		const orphelines = Object.keys(MATHOU_NAMES).filter((k) => !actives.has(k));
		expect(orphelines).toEqual([]);
	});
});
