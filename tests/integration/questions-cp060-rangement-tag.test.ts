/**
 * Chantier « geometrie-validation » : nœud et tag du modèle CP-060 (Supabase local requis)
 * ====================================================================================================
 *
 * Migration `20261105055111_questions_cp060_rangement_tag` : le brouillon « Termine le carré ou le
 * rectangle sur le quadrillage » (1cf6eaa9), resté « Non rangé » depuis la v0.73.0, va sur
 * « Géométrie > Figures planes > constructions » et reçoit son point, CP-060, un seul (ADR 0020).
 * Journal docs/wip/geometrie-validation-progress.md § 14.
 *
 * Le modèle n'existe qu'en production. Le test fabrique donc l'état de la prod — une copie
 * minimale portant le VRAI identifiant, en CP, sans nœud ni tag — puis rejoue la migration
 * **depuis son fichier**, dans une transaction annulée à la fin. Les triggers de garde des tags
 * restent actifs : le tag posé a passé la règle du nœud.
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
	/** État du trigger `updated_at` : `O` = actif */
	trigger: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261105055111_questions_cp060_rangement_tag.sql';
const ID = '1cf6eaa9-376d-43a1-a3e4-eb7d18c40099';
const NOEUD = 'Géométrie > Figures planes > constructions';
const LONGUEURS = 'Grandeurs et mesures > Longueurs';
/** Date de modification fabriquée : elle ne doit pas bouger (ranger et taguer ne modifient pas le contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

/** Pose l'état de la prod : la copie du modèle, en CP, sans nœud ni tag. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: [ID],
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	// Le niveau posé sans toucher `updated_at` (le test vérifie justement qu'il ne bouge pas)
	await pg.query(
		'alter table public.question_templates disable trigger update_question_templates_updated_at'
	);
	await pg.query(`update public.question_templates set grades = array['CP'] where id = $1`, [ID]);
	await pg.query(
		'alter table public.question_templates enable trigger update_question_templates_updated_at'
	);
}

async function lireEtat(pg: Client): Promise<Etat> {
	const chemins = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) chemins.set(id, node.path);
	const q = await pg.query<{ node: string | null; updated_at: Date }>(
		'select classification_node_id as node, updated_at from public.question_templates where id = $1',
		[ID]
	);
	const t = await pg.query<{ grade: string; code: string }>(
		`select p.grade, p.code from public.question_template_points q
		   join public.curriculum_points p on p.id = q.point_id where q.template_id = $1`,
		[ID]
	);
	const g = await pg.query<{ tgenabled: string }>(
		`select tgenabled from pg_trigger where tgname = 'update_question_templates_updated_at'`
	);
	return {
		trigger: g.rows[0]?.tgenabled ?? '∅',
		noeud: chemins.get(q.rows[0]?.node ?? '') ?? '∅',
		date: q.rows[0]?.updated_at.toISOString() ?? '∅',
		tags: t.rows.map((r) => `${r.grade}§${r.code}`).sort()
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('Questions CP, CP-060 : nœud et tag du modèle (migration de données)', () => {
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

	it('le modèle est EXACTEMENT sur « constructions »', () => {
		expect(apres.noeud).toBe(NOEUD);
	});

	it('le modèle porte EXACTEMENT le point CP-060, rien de plus', () => {
		expect(apres.tags).toEqual(['CP§CP-060']);
	});

	it('le trigger `updated_at` est de nouveau actif après la migration et après le rollback', () => {
		expect([apres.trigger, annule.trigger]).toEqual(['O', 'O']);
	});

	it('`updated_at` du modèle est préservé', () => {
		expect(apres.date).toBe(AVANT);
	});

	it('le rollback écrit dans la migration rend l’état d’avant (sans nœud ni tag)', () => {
		expect(annule).toMatchObject({ noeud: '∅', tags: [], date: AVANT });
	});
});

describe('Questions CP, CP-060 : les branches d’échec de la migration', () => {
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

	it('base sans le modèle (locale) : la migration ne touche rien et passe', async () => {
		await enTransaction(async () => {
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).resolves.toBeDefined();
		});
	});

	it('un modèle rangé à la main depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			const parChemin = new Map<string, string>();
			for (const [id, node] of await readNodePaths(pg)) parChemin.set(node.path, id);
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[ID, parChemin.get(LONGUEURS)]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles déjà rangés depuis le relevé : 1/
			);
		});
	});

	it('le point CP-060 archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = 'CP' and code = 'CP-060' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), 1 point\(s\)/
			);
		});
	});
});
