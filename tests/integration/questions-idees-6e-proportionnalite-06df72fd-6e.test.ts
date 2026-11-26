/**
 * idees-6e-proportionnalite, F4 : 06df72fd ouvert à la 6e (Supabase local requis)
 * ================================================================================
 *
 * Migration `20261126131952_questions_idees_6e_proportionnalite_06df72fd_6e` : le modèle de 5e
 * « Reconnaître des situations de proportionnalité », publié, rangé sur « caractérisation » et tagué
 * 5-087, reçoit le niveau `6` (ajouté, jamais affecté en bloc) et le point 6-190.
 * Journal : docs/wip/idees-6e-proportionnalite-progress.md (fiche F4).
 *
 * Le modèle n'existe qu'en production. Le test fabrique donc l'état de la prod — une copie minimale
 * portant le VRAI identifiant, au niveau relevé ({5}), rangée sur le nœud de 6-190 et taguée 5-087 —
 * puis rejoue la migration **depuis son fichier**, dans une transaction annulée à la fin.
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
import { insertProdCopies } from '../helpers/database/prod-copies';

// ============================================================================
// TYPES
// ============================================================================

interface Etat {
	grades: string[];
	date: string;
	statut: string;
	/** Codes portés par le modèle, triés */
	codes: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION =
	'supabase/migrations/20261126131952_questions_idees_6e_proportionnalite_06df72fd_6e.sql';
const ID = '06df72fd-21ad-4c0e-9f3b-13dcfa03a015';
/** Relevé de la prod du 2026-11-26 */
const GRADES_RELEVES = ['5'];
const CODE_5E = '5-087';
const CODE_6E = '6-190';
/** Date de modification fabriquée : elle ne doit pas bouger (tag et niveau ne sont pas du contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

async function sansTriggerDeDate(pg: Client, sql: string, params: unknown[]): Promise<void> {
	await pg.query(
		'alter table public.question_templates disable trigger update_question_templates_updated_at'
	);
	await pg.query(sql, params);
	await pg.query(
		'alter table public.question_templates enable trigger update_question_templates_updated_at'
	);
}

/** Pose l'état de la prod : copie publiée, {5}, sur le nœud de 6-190, tag 5-087 posé. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: [ID],
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	await sansTriggerDeDate(
		pg,
		`update public.question_templates
		    set grades = $2, status = 'published',
		        classification_node_id = (select node_id from public.curriculum_points
		                                   where code = $3 and archived_at is null)
		  where id = $1`,
		[ID, GRADES_RELEVES, CODE_6E]
	);
	await pg.query('delete from public.question_template_points where template_id = $1', [ID]);
	await pg.query(
		`insert into public.question_template_points (template_id, point_id)
		 select $1, id from public.curriculum_points where code = $2 and archived_at is null`,
		[ID, CODE_5E]
	);
	// Garde du décor : en prod, 5-087 et 6-190 sont sur le même nœud
	const r = await pg.query<{ n: string }>(
		`select count(*) as n
		   from public.curriculum_points a join public.curriculum_points b on a.node_id = b.node_id
		  where a.code = $1 and b.code = $2`,
		[CODE_5E, CODE_6E]
	);
	if (Number(r.rows[0].n) !== 1)
		throw new Error('décor faux : 5-087 et 6-190 sur des nœuds différents');
}

async function lireEtat(pg: Client): Promise<Etat> {
	const q = await pg.query<{ grades: string[]; status: string; updated_at: Date }>(
		'select grades, status, updated_at from public.question_templates where id = $1',
		[ID]
	);
	const t = await pg.query<{ code: string }>(
		`select p.code
		   from public.question_template_points t join public.curriculum_points p on p.id = t.point_id
		  where t.template_id = $1
		  order by p.code`,
		[ID]
	);
	return {
		grades: q.rows[0].grades,
		date: q.rows[0].updated_at.toISOString(),
		statut: q.rows[0].status,
		codes: t.rows.map((r) => r.code)
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('idees-6e-proportionnalite F4 : 06df72fd ouvert à la 6e (migration de données)', () => {
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

	it('au départ : {5}, seulement 5-087', () => {
		expect(avant.grades).toEqual(GRADES_RELEVES);
		expect(avant.codes).toEqual([CODE_5E]);
	});

	it('le modèle garde 5-087 et reçoit EXACTEMENT 6-190', () => {
		expect(apres.codes).toEqual([CODE_5E, CODE_6E]);
	});

	it('niveaux : {5, 6}', () => {
		expect(apres.grades).toEqual(['5', '6']);
	});

	it('statut et `updated_at` ne bougent pas', () => {
		expect(apres.statut).toBe(avant.statut);
		expect(apres.date).toBe(AVANT);
	});

	it('le rollback rend l’état de départ (tag 5-087 compris)', () => {
		expect(annule.codes).toEqual([CODE_5E]);
		expect(annule.grades).toEqual(GRADES_RELEVES);
		expect(annule.date).toBe(AVANT);
	});
});

describe('idees-6e-proportionnalite F4 : les branches d’échec de la migration', () => {
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

	it('base sans le modèle (locale) : la migration et le rollback passent sans rien toucher', async () => {
		await enTransaction(async () => {
			await pg.query('delete from public.question_templates where id = $1', [ID]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).resolves.toBeDefined();
			const tags = await pg.query<{ n: string }>(
				'select count(*) as n from public.question_template_points where template_id = $1',
				[ID]
			);
			expect(Number(tags.rows[0].n)).toBe(0);
			await expect(pg.query(extractRollback(MIGRATION))).resolves.toBeDefined();
		});
	});

	it('un modèle qui a déjà le niveau 6 fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = grades || '6'::text where id = $1`,
				[ID]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/niveau 6 différent du relevé : déjà présent/
			);
		});
	});

	it('un modèle déjà tagué d’un point de 6e fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points where code = $2`,
				[ID, CODE_6E]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/déjà tagué d'un point de 6e : 6-190/
			);
		});
	});

	it('un autre niveau ajouté entre-temps (4) est conservé', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = grades || '4'::text where id = $1`,
				[ID]
			);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			const r = await pg.query<{ grades: string[] }>(
				'select grades from public.question_templates where id = $1',
				[ID]
			);
			expect(r.rows[0].grades).toEqual(['5', '4', '6']);
			await pg.query(extractRollback(MIGRATION));
			const r2 = await pg.query<{ grades: string[] }>(
				'select grades from public.question_templates where id = $1',
				[ID]
			);
			expect(r2.rows[0].grades).toEqual(['5', '4']);
		});
	});

	it('rollback refusé si le niveau 6 a été retiré depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = array_remove(grades, '6') where id = $1`,
				[ID]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : niveau 6 retiré depuis la migration/
			);
		});
	});

	it('rollback refusé si le tag 6-190 a disparu depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`delete from public.question_template_points t using public.curriculum_points p
				  where p.id = t.point_id and p.code = $2 and t.template_id = $1`,
				[ID, CODE_6E]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : tag 6-190 absent depuis la migration/
			);
		});
	});
});
