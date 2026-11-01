/**
 * « Trois points alignés ? Vérifie à la règle » passe au CP ET au CE1 (Supabase local requis)
 * ==========================================================================================
 *
 * Migration `20261101224702_questions_cp_ce1_alignes_rangement_tags` : le brouillon a7dfe502,
 * écrit pour CP-058 et resté sans nœud ni tag, prend les niveaux {CP, CE1}, va sur « Géométrie >
 * Figures planes > propriétés » (nœud de CP-058 et de CE1-073) et porte ces deux points (ADR
 * 0020 : un point par programme). Décision de David (journal docs/wip/questions-ce1-progress.md
 * § 16, question 5 reposée).
 *
 * Le modèle n'existe qu'en production. Le test fabrique donc l'état de la prod — une copie
 * minimale portant le VRAI identifiant, au CP, sans nœud ni tag — puis rejoue la migration
 * **depuis son fichier**, dans une transaction annulée à la fin. Les triggers de garde des tags
 * restent actifs : chaque tag posé a passé la règle du nœud.
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
	grades: string[];
	date: string;
	tags: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261101224702_questions_cp_ce1_alignes_rangement_tags.sql';
const ID = 'a7dfe502-4af3-4130-8f88-3d8ab14bf91b';
const PROPRIETES = 'Géométrie > Figures planes > propriétés';
/** Date de modification fabriquée : elle ne doit pas bouger. */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

/** Requête sous trigger `updated_at` coupé (la date fabriquée reste en place). */
async function sansDate(pg: Client, sql: string, params: unknown[] = []): Promise<void> {
	await pg.query(
		'alter table public.question_templates disable trigger update_question_templates_updated_at'
	);
	await pg.query(sql, params);
	await pg.query(
		'alter table public.question_templates enable trigger update_question_templates_updated_at'
	);
}

/** Pose l'état de la prod : la copie du modèle, brouillon, au CP seul, sans nœud ni tag. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: [ID],
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	await sansDate(pg, `update public.question_templates set grades = array['CP'] where id = $1`, [
		ID
	]);
}

async function lireEtat(pg: Client): Promise<Etat> {
	const chemins = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) chemins.set(id, node.path);
	const q = await pg.query<{ node: string | null; grades: string[]; updated_at: Date }>(
		'select classification_node_id as node, grades, updated_at from public.question_templates where id = $1',
		[ID]
	);
	const t = await pg.query<{ grade: string; code: string }>(
		`select p.grade, p.code from public.question_template_points q
		   join public.curriculum_points p on p.id = q.point_id where q.template_id = $1`,
		[ID]
	);
	return {
		noeud: chemins.get(q.rows[0].node ?? '') ?? '∅',
		grades: [...q.rows[0].grades].sort(),
		date: q.rows[0].updated_at.toISOString(),
		tags: t.rows.map((r) => `${r.grade}§${r.code}`).sort()
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('« Trois points alignés ? » au CP et au CE1 (migration de données)', () => {
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

	it('le modèle est au CP ET au CE1', () => {
		expect(apres.grades).toEqual(['CE1', 'CP']);
	});

	it('le modèle est EXACTEMENT sur le nœud des deux points', () => {
		expect(apres.noeud).toBe(PROPRIETES);
	});

	it('le modèle porte EXACTEMENT CP-058 et CE1-073, rien de plus', () => {
		expect(apres.tags).toEqual(['CE1§CE1-073', 'CP§CP-058']);
	});

	it('`updated_at` est préservé', () => {
		expect(apres.date).toBe(AVANT);
	});

	it('le rollback écrit dans la migration rend l’état d’avant (CP seul, sans nœud ni tag)', () => {
		expect(annule).toEqual({ noeud: '∅', grades: ['CP'], date: AVANT, tags: [] });
	});
});

describe('« Trois points alignés ? » : les branches d’échec', () => {
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

	it('un modèle passé au CE1 depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await sansDate(
				pg,
				`update public.question_templates set grades = array['CP', 'CE1'] where id = $1`,
				[ID]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèle changé depuis le relevé/
			);
		});
	});

	it('un modèle rangé à la main depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			const parChemin = new Map<string, string>();
			for (const [id, node] of await readNodePaths(pg)) parChemin.set(node.path, id);
			await sansDate(
				pg,
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[ID, parChemin.get(PROPRIETES)]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèle changé depuis le relevé/
			);
		});
	});

	it('un des deux points archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = 'CP' and code = 'CP-058' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/points introuvables sur le nœud : CP-058/
			);
		});
	});

	it('le rollback refuse un modèle publié depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await sansDate(
				pg,
				`update public.question_templates set status = 'published' where id = $1`,
				[ID]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(/rollback refusé/);
		});
	});
});
