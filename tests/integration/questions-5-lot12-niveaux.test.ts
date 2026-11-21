/**
 * Chantier « questions-5 », lot 12 : niveaux de deux brouillons dans leur nœud (Supabase local requis)
 * ===============================================================================================
 *
 * Migration `20261115074154_questions_5_lot12_niveaux` : d4f38d30 (Lire les coordonnées d'un point)
 * passe du niveau 1 au niveau 3, d4d56c1b (Placer un point de coordonnées données) du niveau 1 au
 * niveau 4, dans « Géométrie > Repérage et déplacements > coordonnées dans le plan ». Ni le nœud, ni
 * le statut, ni les tags, ni la date de modification ne changent. Décision de David du 2026-11-15
 * (journal docs/wip/questions-5-progress.md § 27, 27 bis).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, sur leur nœud, au niveau 1, en brouillon — puis rejoue
 * la migration **depuis son fichier**, dans une transaction annulée à la fin.
 *
 * @vitest-environment node
 *
 * @migration-de-donnees : hors des PR, rejoué la nuit (scripts/ci-integration-exclusions.sh)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Client } from 'pg';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';
import { extractRollback } from '../helpers/database/migration-rollback';
import { readNodePaths } from '../helpers/database/classification-paths';
import { insertProdCopies } from '../helpers/database/prod-copies';

// ============================================================================
// TYPES
// ============================================================================

interface Etat {
	niveaux: Map<string, number>;
	noeuds: Map<string, string>;
	statuts: Map<string, string>;
	dates: Map<string, string>;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261115074154_questions_5_lot12_niveaux.sql';
const LIRE = 'd4f38d30-3575-472f-827c-cc2d8ad6c651';
const PLACER = 'd4d56c1b-d411-49fc-a314-dc2bf14bf05e';
const ids = [LIRE, PLACER];
const CHEMIN = 'Géométrie > Repérage et déplacements > coordonnées dans le plan';
/** Date de modification fabriquée : elle ne doit pas bouger. */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

async function noeudDuChemin(pg: Client, chemin: string): Promise<string> {
	for (const [id, node] of await readNodePaths(pg)) {
		if (!node.archived && node.path === chemin) return id;
	}
	throw new Error(`chemin introuvable : ${chemin}`);
}

/** Pose l'état de la prod : les deux copies, sur leur nœud, au niveau 1, en brouillon. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: ids,
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	const noeud = await noeudDuChemin(pg, CHEMIN);
	await pg.query(
		'alter table public.question_templates disable trigger update_question_templates_updated_at'
	);
	await pg.query(
		`update public.question_templates
		    set classification_node_id = $2, grades = array['5'], status = 'draft', level = 1
		  where id = any($1::uuid[])`,
		[ids, noeud]
	);
	await pg.query(
		'alter table public.question_templates enable trigger update_question_templates_updated_at'
	);
}

async function lireEtat(pg: Client): Promise<Etat> {
	const chemins = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) chemins.set(id, node.path);
	const q = await pg.query<{
		id: string;
		node: string | null;
		level: number;
		status: string;
		updated_at: Date;
	}>(
		'select id, classification_node_id as node, level, status, updated_at from public.question_templates where id = any($1::uuid[])',
		[ids]
	);
	return {
		niveaux: new Map(q.rows.map((r) => [r.id, r.level])),
		noeuds: new Map(q.rows.map((r) => [r.id, chemins.get(r.node ?? '') ?? '∅'])),
		statuts: new Map(q.rows.map((r) => [r.id, r.status])),
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()]))
	};
}

/** Rejoue la migration dans un point de sauvegarde et rend le message d'erreur (ou null). */
async function echecMigration(pg: Client, preparer: () => Promise<void>): Promise<string | null> {
	await pg.query('savepoint essai');
	try {
		await preparer();
		await pg.query(readFileSync(MIGRATION, 'utf-8'));
		return null;
	} catch (e) {
		return e instanceof Error ? e.message : String(e);
	} finally {
		await pg.query('rollback to savepoint essai');
	}
}

// ============================================================================
// SUITE
// ============================================================================

describe('Questions 5e, lot 12 : niveaux de deux brouillons (migration de données)', () => {
	let pg: Client;
	let apres: Etat;
	let annule: Etat;

	beforeAll(async () => {
		await cleanupAllTestData();
		const prof = await TestData.profile().withRole('teacher').create();
		pg = await getPostgresClient();

		await pg.query('begin');
		await poserEtatProd(pg, prof.id);
		await pg.query(readFileSync(MIGRATION, 'utf-8'));
		apres = await lireEtat(pg);
		await pg.query(extractRollback(MIGRATION));
		annule = await lireEtat(pg);
	}, 60_000);

	afterAll(async () => {
		await pg.query('rollback');
		await cleanupAllTestData();
	});

	it('d4f38d30 passe au niveau 3, d4d56c1b au niveau 4', () => {
		expect(apres.niveaux.get(LIRE)).toBe(3);
		expect(apres.niveaux.get(PLACER)).toBe(4);
	});

	it('le nœud, le statut et la date de modification ne changent pas', () => {
		expect(ids.map((i) => apres.noeuds.get(i))).toEqual([CHEMIN, CHEMIN]);
		expect(ids.map((i) => apres.statuts.get(i))).toEqual(['draft', 'draft']);
		expect(ids.map((i) => apres.dates.get(i))).toEqual([AVANT, AVANT]);
	});

	it('le rollback rend le niveau 1, sans toucher au reste', () => {
		expect(ids.map((i) => annule.niveaux.get(i))).toEqual([1, 1]);
		expect(ids.map((i) => annule.noeuds.get(i))).toEqual([CHEMIN, CHEMIN]);
		expect(ids.map((i) => annule.dates.get(i))).toEqual([AVANT, AVANT]);
	});
});

describe('Questions 5e, lot 12 : les branches d’échec de la migration des niveaux', () => {
	let pg: Client;

	beforeAll(async () => {
		await cleanupAllTestData();
		const prof = await TestData.profile().withRole('teacher').create();
		pg = await getPostgresClient();
		await pg.query('begin');
		await poserEtatProd(pg, prof.id);
	}, 60_000);

	afterAll(async () => {
		await pg.query('rollback');
		await cleanupAllTestData();
	});

	it('un seul des deux modèles présent fait échouer la migration', async () => {
		const erreur = await echecMigration(pg, async () => {
			await pg.query('delete from public.question_templates where id = $1', [PLACER]);
		});
		expect(erreur).toMatch(/identifiants partiellement présents : 1 modèle\(s\) sur 2/);
	});

	it('un niveau changé depuis le relevé fait échouer la migration', async () => {
		const erreur = await echecMigration(pg, async () => {
			await pg.query('update public.question_templates set level = 2 where id = $1', [LIRE]);
		});
		expect(erreur).toMatch(/modèles changés depuis le relevé : 1 sur 2 conformes/);
	});

	it('un modèle publié depuis le relevé fait échouer la migration', async () => {
		const erreur = await echecMigration(pg, async () => {
			await pg.query("update public.question_templates set status = 'published' where id = $1", [
				PLACER
			]);
		});
		expect(erreur).toMatch(/modèles changés depuis le relevé : 1 sur 2 conformes/);
	});

	it('un modèle déplacé de nœud depuis le relevé fait échouer la migration', async () => {
		const erreur = await echecMigration(pg, async () => {
			await pg.query(
				'update public.question_templates set classification_node_id = null where id = $1',
				[LIRE]
			);
		});
		expect(erreur).toMatch(/modèles changés depuis le relevé : 1 sur 2 conformes/);
	});

	it('le rollback refuse si un modèle a changé de niveau depuis la migration', async () => {
		await pg.query('savepoint essai');
		try {
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query('update public.question_templates set level = 5 where id = $1', [PLACER]);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback refusé : 1 modèle\(s\) sur 2 ont encore le niveau de la migration/
			);
		} finally {
			await pg.query('rollback to savepoint essai');
		}
	});

	it('sans les modèles (base locale), la migration ne touche rien et passe', async () => {
		const erreur = await echecMigration(pg, async () => {
			await pg.query('delete from public.question_templates where id = any($1::uuid[])', [ids]);
		});
		expect(erreur).toBeNull();
	});
});
