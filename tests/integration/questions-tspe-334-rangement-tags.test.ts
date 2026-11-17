/**
 * Chantier « solide-vecteur » (terminale spé, TSPE-334) : nœud et tag (Supabase local requis)
 * ================================================================================================
 *
 * Migration `20261104070713_questions_tspe_334_rangement_tags` : le brouillon « Espace : tracer une
 * combinaison linéaire de vecteurs », créé le 2026-11-04 par scripts/create-questions.ts (sans nœud
 * ni tag), va sur la sous-notion « Géométrie > Espace > vecteurs de l'espace » et reçoit son point,
 * TSPE-334. Question d'accès tranchée par David le 2026-11-04 (journal
 * docs/wip/solide-vecteur-progress.md).
 *
 * Le modèle n'existe qu'en production. Le test fabrique donc l'état de la prod — une copie minimale
 * portant le VRAI identifiant, en [T_SPE], sans nœud ni tag — puis rejoue la migration **depuis son
 * fichier**, dans une transaction annulée à la fin. Les triggers de garde des tags restent actifs :
 * le tag posé a passé la règle du nœud (point sur le nœud ou sa notion).
 *
 * @vitest-environment node
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
	noeud: string;
	date: string;
	tags: string[];
	/** Chemins des sous-notions actives (toutes). */
	chemins: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261104070713_questions_tspe_334_rangement_tags.sql';
/** Identifiant créé en prod le 2026-11-04. */
const ID = '7ce9936b-7835-4b99-9e2b-f3644f2956af';
const NOEUD = "Géométrie > Espace > vecteurs de l'espace";
/** Date de modification fabriquée : elle ne doit pas bouger (ranger et taguer ne modifient pas le contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

async function cheminsActifs(pg: Client): Promise<Map<string, string>> {
	const parChemin = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) {
		if (!node.archived) parChemin.set(node.path, id);
	}
	return parChemin;
}

/** Pose l'état de la prod : la copie du modèle, en [T_SPE], sans nœud ni tag. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: [ID],
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	await pg.query(
		'alter table public.question_templates disable trigger update_question_templates_updated_at'
	);
	await pg.query(
		`update public.question_templates set grades = array['T_SPE'], classification_node_id = null
		  where id = $1`,
		[ID]
	);
	await pg.query(
		'alter table public.question_templates enable trigger update_question_templates_updated_at'
	);
}

async function lireEtat(pg: Client): Promise<Etat> {
	const chemins = new Map<string, string>();
	const sousNotions: string[] = [];
	for (const [id, node] of await readNodePaths(pg)) {
		chemins.set(id, node.path);
		if (!node.archived && node.path.split(' > ').length === 3) sousNotions.push(node.path);
	}
	const q = await pg.query<{ node: string | null; updated_at: Date }>(
		'select classification_node_id as node, updated_at from public.question_templates where id = $1',
		[ID]
	);
	const t = await pg.query<{ grade: string; code: string }>(
		`select p.grade, p.code from public.question_template_points q
		   join public.curriculum_points p on p.id = q.point_id where q.template_id = $1`,
		[ID]
	);
	return {
		noeud: chemins.get(q.rows[0]?.node ?? '') ?? '∅',
		date: q.rows[0]?.updated_at.toISOString() ?? '∅',
		tags: t.rows.map((r) => `${r.grade}§${r.code}`).sort(),
		chemins: sousNotions.sort()
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('Terminale spé, TSPE-334 : nœud et tag (migration de données)', () => {
	let pg: Client;
	let avant: Etat;
	let apres: Etat;
	let annule: Etat;

	beforeAll(async () => {
		await cleanupAllTestData();
		const prof = await TestData.profile().withRole('teacher').create();
		pg = await getPostgresClient();

		await pg.query('begin');
		await poserEtatProd(pg, prof.id);
		avant = await lireEtat(pg);
		await pg.query(readFileSync(MIGRATION, 'utf-8'));
		apres = await lireEtat(pg);
		await pg.query(extractRollback(MIGRATION));
		annule = await lireEtat(pg);
	}, 60_000);

	afterAll(async () => {
		await pg.query('rollback');
		await cleanupAllTestData();
	});

	it('l’arbre des notions ne change pas (aucune sous-notion neuve)', () => {
		expect(apres.chemins).toEqual(avant.chemins);
	});

	it('le modèle est EXACTEMENT sur « vecteurs de l’espace »', () => {
		expect(apres.noeud).toBe(NOEUD);
	});

	it('le modèle porte EXACTEMENT TSPE-334, rien de plus', () => {
		expect(apres.tags).toEqual(['T_SPE§TSPE-334']);
	});

	it('`updated_at` du modèle est préservé', () => {
		expect(apres.date).toBe(AVANT);
	});

	it('le rollback écrit dans la migration rend l’état d’avant (sans nœud, sans tag)', () => {
		expect(annule.tags).toEqual([]);
		expect(annule.noeud).toBe('∅');
		expect(annule.date).toBe(AVANT);
		expect(annule.chemins).toEqual(avant.chemins);
	});
});

describe('Terminale spé, TSPE-334 : les branches d’échec de la migration', () => {
	let pg: Client;
	let auteur: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		auteur = (await TestData.profile().withRole('teacher').create()).id;
		pg = await getPostgresClient();
	});

	afterAll(async () => {
		await pg.query('rollback').catch(() => undefined);
		await cleanupAllTestData();
	});

	async function enTransaction(corps: () => Promise<void>): Promise<void> {
		await pg.query('begin');
		try {
			await corps();
		} finally {
			await pg.query('rollback');
		}
	}

	it('base sans le modèle (locale) : la migration passe sans rien toucher', async () => {
		await enTransaction(async () => {
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).resolves.toBeDefined();
		});
	});

	it('un modèle rangé à la main depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			const chemins = await cheminsActifs(pg);
			const ailleurs = chemins.get('Géométrie > Espace > coordonnées');
			expect(ailleurs).toBeDefined();
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[ID, ailleurs]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèle déjà rangé depuis le relevé/
			);
		});
	});

	it('le point TSPE-334 archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now()
				  where grade = 'T_SPE' and code = 'TSPE-334' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/nœud ou point introuvable/
			);
		});
	});

	it('rollback refusé si le modèle a été déplacé depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query('delete from public.question_template_points where template_id = $1', [ID]);
			const chemins = await cheminsActifs(pg);
			const ailleurs = chemins.get('Géométrie > Espace > coordonnées');
			expect(ailleurs).toBeDefined();
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[ID, ailleurs]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : le modèle n’est plus sur le nœud de la migration/
			);
		});
	});
});
