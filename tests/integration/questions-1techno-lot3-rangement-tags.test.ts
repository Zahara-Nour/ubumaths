/**
 * 1re techno, lot 3 « dérivation » : nœud et tags de 9 brouillons neufs (Supabase local requis)
 * ================================================================================================
 *
 * Migration `20261118055440_questions_1techno_lot3_rangement_tags` : 9 brouillons neufs {1_TECHNO},
 * sans nœud ni tag, sont rangés sur le nœud de leur point et reçoivent chacun leur point 1TECHNO.
 * Journal : docs/wip/questions-1techno-progress.md (§ 25).
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

const MIGRATION = 'supabase/migrations/20261118055440_questions_1techno_lot3_rangement_tags.sql';
/** Point 1TECHNO visé par modèle */
const VISE: Record<string, string> = {
	'06bee149-e006-4b9f-8f0b-1e21ace0a1cf': '1TECHNO-128',
	'5643abd0-1454-4b03-b612-3fd3b1a1ca33': '1TECHNO-069',
	'382171b6-f5b5-490d-97c1-e0e9db592ac4': '1TECHNO-071',
	'9b89e676-8833-4b2e-aa44-ef34c8655785': '1TECHNO-072',
	'531a7080-9b20-46be-a614-7104d5401451': '1TECHNO-074',
	'8efb084c-aefe-41f2-a8b5-50167d6f7257': '1TECHNO-130',
	'77a599ef-2cee-4ac2-b1cc-f0036d56b9d7': '1TECHNO-131',
	'14b60caa-e18e-46d8-9ff6-3889fd9de40e': '1TECHNO-081',
	'936b7e76-74eb-4c82-a3b8-bdccb3682cfc': '1TECHNO-056'
};
const ids = Object.keys(VISE);
const M2 = ids[1];
const M8 = ids[7];
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

/** Pose l'état de la prod : 9 brouillons {1_TECHNO} sans nœud ni tag. */
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
		[ids]
	);
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

describe('1re techno lot 3 : rangement et tags (migration de données)', () => {
	let pg: Client;
	let avant: Etat;
	let apres: Etat;
	let annule: Etat;
	let noeudsVises: string[];

	beforeAll(async () => {
		await cleanupAllTestData();
		const prof = await TestData.profile().withRole('teacher').create();
		pg = await getPostgresClient();

		await pg.query('begin');
		await poserEtatProd(pg, prof.id);
		noeudsVises = [];
		for (const id of ids) noeudsVises.push(await noeudDuPoint(pg, VISE[id]));
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

	it('au départ : les 9 brouillons sont sans nœud ni tag', () => {
		expect(parModele(avant.noeuds)).toEqual(ids.map(() => null));
		expect(parModele(avant.codes)).toEqual(ids.map(() => []));
	});

	it('chaque modèle est rangé sur le nœud de son point', () => {
		expect(parModele(apres.noeuds)).toEqual(noeudsVises);
	});

	it('chaque modèle reçoit EXACTEMENT son point 1TECHNO', () => {
		expect(parModele(apres.codes)).toEqual(ids.map((id) => [VISE[id]]));
	});

	it('niveaux, statuts et `updated_at` ne bougent pas', () => {
		expect(parModele(apres.grades)).toEqual(ids.map(() => ['1_TECHNO']));
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

describe('1re techno lot 3 : les branches d’échec de la migration', () => {
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
				                                   where code = '1TECHNO-081' and archived_at is null)
				  where id = $1`,
				[M8]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/brouillons différents du relevé .* 8 sur 9 conformes/
			);
		});
	});

	it('un brouillon sans le niveau 1_TECHNO fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = '{1_SPE}' where id = $1`,
				[M2]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/brouillons différents du relevé .* 8 sur 9 conformes/
			);
		});
	});

	it('rollback refusé si un tag 1TECHNO a disparu depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`delete from public.question_template_points t using public.curriculum_points p
				  where p.id = t.point_id and p.code = '1TECHNO-069' and t.template_id = $1`,
				[M2]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : tags changés depuis la migration : 8 sur 9 présents/
			);
		});
	});
});
