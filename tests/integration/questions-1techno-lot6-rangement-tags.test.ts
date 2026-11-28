/**
 * 1re techno, lot 6 : nœud et tags de 5 brouillons neufs, retrait de 97b3a376 (Supabase local requis)
 * ================================================================================================
 *
 * Migration `20261119052352_questions_1techno_lot6_rangement_tags` :
 * - A. P1–P5 (brouillons {1_TECHNO}), sans nœud ni tag, sont rangés sur le nœud de leur point
 *   1TECHNO et tagués de ce seul point ;
 * - B. 97b3a376 (1re spé, publié, {1_SPE,1_TECHNO}, tags 1SPE-353 + 1TECHNO-137) perd son tag
 *   1TECHNO-137 et le niveau `1_TECHNO`.
 * Journal : docs/wip/questions-1techno-progress.md (§ 30-31).
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

const MIGRATION = 'supabase/migrations/20261119052352_questions_1techno_lot6_rangement_tags.sql';
/** Brouillons neufs : [id, point 1TECHNO] */
const BROUILLONS: [string, string][] = [
	['699b1aae-eada-468e-af95-25f74aede343', '1TECHNO-090'],
	['ef34cc66-8aac-4e06-8cb0-d6c4acf93997', '1TECHNO-097'],
	['4ccf75c2-eae2-4d85-8045-50bdf26add73', '1TECHNO-136'],
	['b342c534-4dfd-4a37-ba06-0c48e7d50ae2', '1TECHNO-137'],
	['2405ca31-d856-454d-9e1e-682ec371e088', '1TECHNO-013']
];
const P1 = BROUILLONS[0][0];
const P4 = BROUILLONS[3][0];
const SPE = '97b3a376-01de-42cd-8297-b0f7937e38f1';
const ids = [...BROUILLONS.map(([id]) => id), SPE];
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

async function taguer(pg: Client, id: string, code: string): Promise<void> {
	await pg.query(
		`insert into public.question_template_points (template_id, point_id)
		 select $1, id from public.curriculum_points where code = $2 and archived_at is null`,
		[id, code]
	);
}

/** Pose l'état de la prod : 5 brouillons {1_TECHNO} sans nœud ni tag ; 97b3a376 publié {1_SPE,1_TECHNO}, rangé, 1SPE-353 + 1TECHNO-137. */
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
		[BROUILLONS.map(([id]) => id)]
	);
	await sansTriggerDeDate(
		pg,
		`update public.question_templates
		    set grades = '{1_SPE,1_TECHNO}', status = 'published',
		        classification_node_id = (select node_id from public.curriculum_points
		                                   where code = '1TECHNO-137' and archived_at is null)
		  where id = $1`,
		[SPE]
	);
	await taguer(pg, SPE, '1TECHNO-137');
	// 1SPE-353 : posé seulement s'il est sur le même nœud (décor de la prod) ; sinon le test garde
	// son sens, 97b3a376 n'ayant alors que son point 1TECHNO
	if ((await noeudDuPoint(pg, '1SPE-353')) === (await noeudDuPoint(pg, '1TECHNO-137')))
		await taguer(pg, SPE, '1SPE-353');
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

describe('1re techno lot 6 : rangement, tags et retrait (migration de données)', () => {
	let pg: Client;
	let avant: Etat;
	let apres: Etat;
	let annule: Etat;
	let noeudsVises: string[];
	let codesSpe: string[];

	beforeAll(async () => {
		await cleanupAllTestData();
		const prof = await TestData.profile().withRole('teacher').create();
		pg = await getPostgresClient();

		await pg.query('begin');
		await poserEtatProd(pg, prof.id);
		noeudsVises = [];
		for (const [, techno] of BROUILLONS) noeudsVises.push(await noeudDuPoint(pg, techno));
		avant = await lireEtat(pg);
		codesSpe = avant.codes.get(SPE) ?? [];
		await pg.query(readFileSync(MIGRATION, 'utf-8'));
		apres = await lireEtat(pg);
		await pg.query(extractRollback(MIGRATION));
		annule = await lireEtat(pg);
	}, 60_000);

	afterAll(async () => {
		await pg.query('rollback');
		await cleanupAllTestData();
	});

	it('au départ : 5 brouillons sans nœud ni tag ; 97b3a376 porte 1TECHNO-137', () => {
		expect(parModele(avant.noeuds).slice(0, 5)).toEqual(BROUILLONS.map(() => null));
		expect(parModele(avant.codes).slice(0, 5)).toEqual(BROUILLONS.map(() => []));
		expect(codesSpe).toContain('1TECHNO-137');
	});

	it('les 5 brouillons sont rangés sur le nœud de leur point 1TECHNO ; 97b3a376 ne bouge pas', () => {
		expect(parModele(apres.noeuds)).toEqual([...noeudsVises, avant.noeuds.get(SPE)]);
	});

	it('chaque brouillon reçoit EXACTEMENT son point 1TECHNO', () => {
		expect(parModele(apres.codes).slice(0, 5)).toEqual(BROUILLONS.map(([, techno]) => [techno]));
	});

	it('97b3a376 perd 1TECHNO-137 et `1_TECHNO`, garde le reste', () => {
		expect(apres.codes.get(SPE)).toEqual(codesSpe.filter((c) => c !== '1TECHNO-137'));
		expect(apres.grades.get(SPE)).toEqual(['1_SPE']);
	});

	it('niveaux des brouillons, statuts et `updated_at` ne bougent pas', () => {
		expect(parModele(apres.grades).slice(0, 5)).toEqual(parModele(avant.grades).slice(0, 5));
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

describe('1re techno lot 6 : les branches d’échec de la migration', () => {
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
			await pg.query('delete from public.question_templates where id = $1', [SPE]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/identifiants partiellement présents : 5 modèle\(s\) sur 6/
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
				                                   where code = '1TECHNO-090' and archived_at is null)
				  where id = $1`,
				[P1]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/brouillons P1–P5 différents du relevé .* 4 sur 5 conformes/
			);
		});
	});

	it('un brouillon publié fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set status = 'published' where id = $1`,
				[P4]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/brouillons P1–P5 différents du relevé .* 4 sur 5 conformes/
			);
		});
	});

	it('97b3a376 sans `1_TECHNO` fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = array_remove(grades, '1_TECHNO') where id = $1`,
				[SPE]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/97b3a376 différent du relevé/
			);
		});
	});

	it('97b3a376 sans son tag 1TECHNO-137 fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`delete from public.question_template_points t using public.curriculum_points p
				  where p.id = t.point_id and p.code = '1TECHNO-137' and t.template_id = $1`,
				[SPE]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/97b3a376 différent du relevé/
			);
		});
	});

	it('rollback refusé si un tag posé a disparu depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`delete from public.question_template_points t using public.curriculum_points p
				  where p.id = t.point_id and p.code = '1TECHNO-137' and t.template_id = $1`,
				[P4]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : tags changés depuis la migration : 4 sur 5 présents/
			);
		});
	});

	it('rollback refusé si un des 5 a été publié depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set status = 'published' where id = $1`,
				[P4]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : un des 5 modèles n'est plus un brouillon/
			);
		});
	});

	it('rollback refusé si 97b3a376 a repris `1_TECHNO` depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = grades || '1_TECHNO'::text where id = $1`,
				[SPE]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : 97b3a376 a repris 1_TECHNO/
			);
		});
	});
});
