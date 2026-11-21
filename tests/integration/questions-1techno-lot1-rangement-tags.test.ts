/**
 * 1re techno, lot 1 : nœud et tags de 2 brouillons neufs, tag 1TECHNO d'un modèle commun (Supabase local requis)
 * ================================================================================================
 *
 * Migration `20261117192425_questions_1techno_lot1_rangement_tags` :
 * - A. M1 (0e64a8b0) et M2 (28d1c03e), brouillons neufs {1_TECHNO} sans nœud ni tag, sont rangés
 *   sur le nœud de leur point et tagués 1TECHNO-039, 1TECHNO-040 ;
 * - B. 817d257f (R1 de questions-1gen), publié, {1_GEN}, tagué 1GEN-016, reçoit 1TECHNO-041 et le
 *   niveau `1_TECHNO` (ajouté, jamais affecté en bloc).
 * Journal : docs/wip/questions-1techno-progress.md (§ 23).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, dans l'état relevé — puis rejoue la migration **depuis
 * son fichier**, dans une transaction annulée à la fin.
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
	grades: Map<string, string[]>;
	dates: Map<string, string>;
	statuts: Map<string, string>;
	noeuds: Map<string, string | null>;
	/** Codes portés par chaque modèle, triés */
	codes: Map<string, string[]>;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261117192425_questions_1techno_lot1_rangement_tags.sql';
const M1 = '0e64a8b0-92c1-4c74-be3f-5894d7b7eba6';
const M2 = '28d1c03e-add8-46d1-affe-87ae04598041';
const R1 = '817d257f-dcc6-4c31-92ca-57b0d20665da';
const ids = [M1, M2, R1];
/** Point 1TECHNO visé par modèle */
const VISE: Record<string, string> = {
	[M1]: '1TECHNO-039',
	[M2]: '1TECHNO-040',
	[R1]: '1TECHNO-041'
};
/** Date de modification fabriquée : elle ne doit pas bouger (rangement et tags ne sont pas du contenu). */
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

async function noeudDuPoint(pg: Client, code: string): Promise<string> {
	const r = await pg.query<{ node_id: string }>(
		'select node_id from public.curriculum_points where code = $1 and archived_at is null',
		[code]
	);
	return r.rows[0].node_id;
}

/** Pose l'état de la prod : M1, M2 brouillons {1_TECHNO} sans nœud ni tag ; R1 publié {1_GEN}, rangé, tag 1GEN-016. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: ids,
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	await pg.query(
		'delete from public.question_template_points where template_id = any($1::uuid[])',
		[ids]
	);
	await sansTriggerDeDate(
		pg,
		`update public.question_templates
		    set grades = '{1_TECHNO}', status = 'draft', classification_node_id = null
		  where id = any($1::uuid[])`,
		[[M1, M2]]
	);
	await sansTriggerDeDate(
		pg,
		`update public.question_templates
		    set grades = '{1_GEN}', status = 'published',
		        classification_node_id = (select node_id from public.curriculum_points
		                                   where code = '1GEN-016' and archived_at is null)
		  where id = $1`,
		[R1]
	);
	await pg.query(
		`insert into public.question_template_points (template_id, point_id)
		 select $1, id from public.curriculum_points where code = '1GEN-016' and archived_at is null`,
		[R1]
	);
	// Garde du décor : en prod, 1GEN-016 et 1TECHNO-041 sont sur le même nœud
	if ((await noeudDuPoint(pg, '1GEN-016')) !== (await noeudDuPoint(pg, '1TECHNO-041')))
		throw new Error('décor faux : 1GEN-016 et 1TECHNO-041 sur des nœuds différents');
}

async function lireEtat(pg: Client): Promise<Etat> {
	const q = await pg.query<{
		id: string;
		grades: string[];
		status: string;
		updated_at: Date;
		classification_node_id: string | null;
	}>(
		`select id, grades, status, updated_at, classification_node_id
		   from public.question_templates where id = any($1::uuid[])`,
		[ids]
	);
	const t = await pg.query<{ template_id: string; code: string }>(
		`select t.template_id, p.code
		   from public.question_template_points t join public.curriculum_points p on p.id = t.point_id
		  where t.template_id = any($1::uuid[])
		  order by p.code`,
		[ids]
	);
	const codes = new Map<string, string[]>(ids.map((id) => [id, []]));
	for (const r of t.rows) codes.get(r.template_id)?.push(r.code);
	return {
		grades: new Map(q.rows.map((r) => [r.id, r.grades])),
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()])),
		statuts: new Map(q.rows.map((r) => [r.id, r.status])),
		noeuds: new Map(q.rows.map((r) => [r.id, r.classification_node_id])),
		codes
	};
}

function parModele<T>(m: Map<string, T>): (T | undefined)[] {
	return ids.map((id) => m.get(id));
}

// ============================================================================
// SUITE
// ============================================================================

describe('1re techno lot 1 : rangement et tags (migration de données)', () => {
	let pg: Client;
	let avant: Etat;
	let apres: Etat;
	let annule: Etat;
	let noeud039: string;
	let noeud040: string;
	let noeud041: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		const prof = await TestData.profile().withRole('teacher').create();
		pg = await getPostgresClient();

		await pg.query('begin');
		await poserEtatProd(pg, prof.id);
		noeud039 = await noeudDuPoint(pg, '1TECHNO-039');
		noeud040 = await noeudDuPoint(pg, '1TECHNO-040');
		noeud041 = await noeudDuPoint(pg, '1TECHNO-041');
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

	it('au départ : M1, M2 sans nœud ni tag ; R1 rangé avec son seul point 1GEN', () => {
		expect(parModele(avant.noeuds)).toEqual([null, null, noeud041]);
		expect(parModele(avant.codes)).toEqual([[], [], ['1GEN-016']]);
		expect(parModele(avant.grades)).toEqual([['1_TECHNO'], ['1_TECHNO'], ['1_GEN']]);
	});

	it('M1 et M2 sont rangés sur le nœud de leur point ; R1 ne bouge pas', () => {
		expect(parModele(apres.noeuds)).toEqual([noeud039, noeud040, noeud041]);
	});

	it('chaque modèle reçoit EXACTEMENT son point 1TECHNO (R1 garde 1GEN-016)', () => {
		expect(parModele(apres.codes)).toEqual([[VISE[M1]], [VISE[M2]], ['1GEN-016', VISE[R1]]]);
	});

	it('niveaux : M1, M2 inchangés ; R1 {1_GEN, 1_TECHNO}', () => {
		expect(parModele(apres.grades)).toEqual([['1_TECHNO'], ['1_TECHNO'], ['1_GEN', '1_TECHNO']]);
	});

	it('statuts et `updated_at` ne bougent pas', () => {
		expect(apres.statuts).toEqual(avant.statuts);
		expect(parModele(apres.dates)).toEqual(ids.map(() => AVANT));
	});

	it('le rollback rend l’état de départ', () => {
		expect(parModele(annule.noeuds)).toEqual(parModele(avant.noeuds));
		expect(parModele(annule.codes)).toEqual(parModele(avant.codes));
		expect(parModele(annule.grades)).toEqual(parModele(avant.grades));
		expect(parModele(annule.dates)).toEqual(ids.map(() => AVANT));
	});
});

describe('1re techno lot 1 : les branches d’échec de la migration', () => {
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

	it('base sans les modèles (locale) : la migration et le rollback passent sans rien toucher', async () => {
		await enTransaction(async () => {
			await pg.query('delete from public.question_templates where id = any($1::uuid[])', [ids]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).resolves.toBeDefined();
			const tags = await pg.query<{ n: string }>(
				'select count(*) as n from public.question_template_points where template_id = any($1::uuid[])',
				[ids]
			);
			expect(Number(tags.rows[0].n)).toBe(0);
			await expect(pg.query(extractRollback(MIGRATION))).resolves.toBeDefined();
		});
	});

	it('un modèle absent fait échouer la migration (tout ou rien)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_templates where id = $1', [M2]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/identifiants partiellement présents : 2 modèle\(s\) sur 3/
			);
		});
	});

	it('un brouillon déjà rangé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await sansTriggerDeDate(
				pg,
				`update public.question_templates
				    set classification_node_id = (select node_id from public.curriculum_points
				                                   where code = '1TECHNO-039')
				  where id = $1`,
				[M1]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/brouillons M1, M2 différents du relevé .* 1 sur 2 conformes/
			);
		});
	});

	it('R1 qui a déjà 1_TECHNO fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = grades || '1_TECHNO'::text where id = $1`,
				[R1]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/817d257f différent du relevé/
			);
		});
	});

	it('R1 déplacé sur un autre nœud fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_template_points where template_id = $1', [R1]);
			await sansTriggerDeDate(
				pg,
				`update public.question_templates
				    set classification_node_id = (select node_id from public.curriculum_points
				                                   where code = '1TECHNO-039')
				  where id = $1`,
				[R1]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/817d257f différent du relevé/
			);
		});
	});

	it('un autre niveau ajouté entre-temps sur R1 (1_SPE) est conservé', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = grades || '1_SPE'::text where id = $1`,
				[R1]
			);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			const r = await pg.query<{ grades: string[] }>(
				'select grades from public.question_templates where id = $1',
				[R1]
			);
			expect(r.rows[0].grades).toEqual(['1_GEN', '1_SPE', '1_TECHNO']);
			await pg.query(extractRollback(MIGRATION));
			const r2 = await pg.query<{ grades: string[] }>(
				'select grades from public.question_templates where id = $1',
				[R1]
			);
			expect(r2.rows[0].grades).toEqual(['1_GEN', '1_SPE']);
		});
	});

	it('rollback refusé si 1_TECHNO a été retiré de R1 depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = array_remove(grades, '1_TECHNO') where id = $1`,
				[R1]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : 1_TECHNO retiré de 817d257f depuis la migration/
			);
		});
	});

	it('rollback refusé si un tag 1TECHNO a disparu depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`delete from public.question_template_points t using public.curriculum_points p
				  where p.id = t.point_id and p.code = '1TECHNO-040' and t.template_id = $1`,
				[M2]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : tags changés depuis la migration : 2 sur 3 présents/
			);
		});
	});
});
