/**
 * 1re techno, lot 2 : nœud et tags de 8 brouillons neufs, retrait de 1acb6d47 (Supabase local requis)
 * ================================================================================================
 *
 * Migration `20261117222845_questions_1techno_lot2_rangement_tags` :
 * - A. M1–M7 (brouillons {1_GEN,1_TECHNO}) et M8 (brouillon {1_TECHNO}), sans nœud ni tag, sont
 *   rangés sur le nœud de leur point 1TECHNO et tagués : un point 1TECHNO chacun, plus un point 1GEN
 *   pour M1–M7 ;
 * - B. 1acb6d47 (1re spé, publié, {1_SPE,1_TECHNO}, tags 1SPE-402 + 1TECHNO-057) perd son tag
 *   1TECHNO-057 et le niveau `1_TECHNO`.
 * Journal : docs/wip/questions-1techno-progress.md (§ 24).
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

const MIGRATION = 'supabase/migrations/20261117222845_questions_1techno_lot2_rangement_tags.sql';
/** Brouillons neufs : [id, point 1TECHNO, point 1GEN (null pour M8)] */
const BROUILLONS: [string, string, string | null][] = [
	['129067e4-e97c-458c-9bd7-540383a5dac6', '1TECHNO-057', '1GEN-022'],
	['7efa9e79-e985-407d-bdec-73dce30ef283', '1TECHNO-061', '1GEN-024'],
	['f81b8735-9b8f-41aa-ada0-08b7415a6076', '1TECHNO-123', '1GEN-052'],
	['493adeb4-7eb9-4156-bd1b-79996f54c5e4', '1TECHNO-124', '1GEN-053'],
	['f95f05a0-4c66-409f-9ea3-0f9fcdd98759', '1TECHNO-062', '1GEN-025'],
	['e539088a-1eee-4259-8e61-b0f6fa514eaf', '1TECHNO-125', '1GEN-054'],
	['82e40d16-6069-4bea-b7e6-df3344d26bd3', '1TECHNO-126', '1GEN-027'],
	['9adefa88-5d73-4fea-b64e-538323a3f45f', '1TECHNO-064', null]
];
const M1 = BROUILLONS[0][0];
const M8 = BROUILLONS[7][0];
const COMMUNS = BROUILLONS.slice(0, 7).map(([id]) => id);
const SPE = '1acb6d47-5d88-4ccf-830f-98dc57d0022c';
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

/** Pose l'état de la prod : 8 brouillons sans nœud ni tag ; 1acb6d47 publié {1_SPE,1_TECHNO}, rangé, 1SPE-402 + 1TECHNO-057. */
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
		    set grades = '{1_GEN,1_TECHNO}', status = 'draft', classification_node_id = null
		  where id = any($1::uuid[])`,
		[COMMUNS]
	);
	await sansTriggerDeDate(
		pg,
		`update public.question_templates
		    set grades = '{1_TECHNO}', status = 'draft', classification_node_id = null
		  where id = $1`,
		[M8]
	);
	await sansTriggerDeDate(
		pg,
		`update public.question_templates
		    set grades = '{1_SPE,1_TECHNO}', status = 'published',
		        classification_node_id = (select node_id from public.curriculum_points
		                                   where code = '1TECHNO-057' and archived_at is null)
		  where id = $1`,
		[SPE]
	);
	await taguer(pg, SPE, '1TECHNO-057');
	// 1SPE-402 : posé seulement s'il est sur le même nœud (décor de la prod) ; sinon le test garde
	// son sens, 1acb6d47 n'ayant alors que son point 1TECHNO
	if ((await noeudDuPoint(pg, '1SPE-402')) === (await noeudDuPoint(pg, '1TECHNO-057')))
		await taguer(pg, SPE, '1SPE-402');
	// Garde du décor : en prod, chaque point 1GEN est sur le nœud du point 1TECHNO de son modèle
	for (const [, techno, gen] of BROUILLONS)
		if (gen && (await noeudDuPoint(pg, gen)) !== (await noeudDuPoint(pg, techno)))
			throw new Error(`décor faux : ${gen} et ${techno} sur des nœuds différents`);
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

describe('1re techno lot 2 : rangement, tags et retrait (migration de données)', () => {
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

	it('au départ : 8 brouillons sans nœud ni tag ; 1acb6d47 porte 1TECHNO-057', () => {
		expect(parModele(avant.noeuds).slice(0, 8)).toEqual(BROUILLONS.map(() => null));
		expect(parModele(avant.codes).slice(0, 8)).toEqual(BROUILLONS.map(() => []));
		expect(codesSpe).toContain('1TECHNO-057');
	});

	it('les 8 brouillons sont rangés sur le nœud de leur point 1TECHNO ; 1acb6d47 ne bouge pas', () => {
		expect(parModele(apres.noeuds)).toEqual([...noeudsVises, avant.noeuds.get(SPE)]);
	});

	it('chaque brouillon reçoit EXACTEMENT son point 1TECHNO et, s’il est commun, son point 1GEN', () => {
		expect(parModele(apres.codes).slice(0, 8)).toEqual(
			BROUILLONS.map(([, techno, gen]) => (gen ? [gen, techno] : [techno]))
		);
	});

	it('1acb6d47 perd 1TECHNO-057 et `1_TECHNO`, garde le reste', () => {
		expect(apres.codes.get(SPE)).toEqual(codesSpe.filter((c) => c !== '1TECHNO-057'));
		expect(apres.grades.get(SPE)).toEqual(['1_SPE']);
	});

	it('niveaux des brouillons, statuts et `updated_at` ne bougent pas', () => {
		expect(parModele(apres.grades).slice(0, 8)).toEqual(parModele(avant.grades).slice(0, 8));
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

describe('1re techno lot 2 : les branches d’échec de la migration', () => {
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
				/identifiants partiellement présents : 8 modèle\(s\) sur 9/
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
				                                   where code = '1TECHNO-057' and archived_at is null)
				  where id = $1`,
				[M1]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/brouillons M1–M8 différents du relevé .* 7 sur 8 conformes/
			);
		});
	});

	it('un brouillon commun sans `1_GEN` fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = '{1_TECHNO}' where id = $1`,
				[M1]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/brouillons M1–M8 différents du relevé .* 7 sur 8 conformes/
			);
		});
	});

	it('1acb6d47 sans `1_TECHNO` fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = array_remove(grades, '1_TECHNO') where id = $1`,
				[SPE]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/1acb6d47 différent du relevé/
			);
		});
	});

	it('1acb6d47 sans son tag 1TECHNO-057 fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`delete from public.question_template_points t using public.curriculum_points p
				  where p.id = t.point_id and p.code = '1TECHNO-057' and t.template_id = $1`,
				[SPE]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/1acb6d47 différent du relevé/
			);
		});
	});

	it('rollback refusé si un tag posé a disparu depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`delete from public.question_template_points t using public.curriculum_points p
				  where p.id = t.point_id and p.code = '1GEN-022' and t.template_id = $1`,
				[M1]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : tags changés depuis la migration : 14 sur 15 présents/
			);
		});
	});

	it('rollback refusé si 1acb6d47 a repris `1_TECHNO` depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = grades || '1_TECHNO'::text where id = $1`,
				[SPE]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : 1acb6d47 a repris 1_TECHNO/
			);
		});
	});
});
