/**
 * 1re techno, lot 4 « algorithmique » : nœud et tags de 8 brouillons neufs (Supabase local requis)
 * ================================================================================================
 *
 * Migration `20261118190129_questions_1techno_lot4_rangement_tags` : 8 brouillons neufs, sans nœud
 * ni tag, sont rangés sur le nœud de leur point 1TECHNO et reçoivent ce point ; M2 ({1_TECHNO,1_SPE})
 * reçoit aussi 1SPE-362, sur le même nœud « simulation ».
 * Journal : docs/wip/questions-1techno-progress.md (§ 26).
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

const MIGRATION = 'supabase/migrations/20261118190129_questions_1techno_lot4_rangement_tags.sql';
/** Points visés par modèle (triés), le point 1TECHNO donnant le nœud */
const VISE: Record<string, string[]> = {
	'fba4bd3c-0888-4ce1-a4a3-70be99b68987': ['1TECHNO-003'],
	'2bf630e5-d983-4123-a5b8-17a9a0eddbe6': ['1SPE-362', '1TECHNO-103'],
	'dfeed66c-f7fb-4a28-b8d8-80d5bf61a3e7': ['1TECHNO-101'],
	'a14d1b12-505f-492c-8f72-35efa16ab3be': ['1TECHNO-105'],
	'ecba4038-e4f2-4861-835b-2b2d3beab467': ['1TECHNO-107'],
	'b916ab0f-73d5-4c3d-80d6-5300f4594f91': ['1TECHNO-051'],
	'92120570-1a05-4caa-a0da-5e4d3e20e897': ['1TECHNO-122'],
	'3263f8f6-44af-4952-9cf0-45fdc0d8e344': ['1TECHNO-067']
};
/** Niveaux du relevé */
const NIVEAUX: Record<string, string[]> = Object.fromEntries(
	Object.keys(VISE).map((id) => [id, VISE[id].length === 2 ? ['1_TECHNO', '1_SPE'] : ['1_TECHNO']])
);
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

/** Pose l'état de la prod : 8 brouillons sans nœud ni tag, niveaux du relevé. */
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
	for (const id of ids) {
		await sansTriggerDeDate(
			pg,
			`update public.question_templates
			    set grades = $2::text[], status = 'draft', classification_node_id = null
			  where id = $1`,
			[id, NIVEAUX[id]]
		);
	}
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

describe('1re techno lot 4 : rangement et tags (migration de données)', () => {
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
		for (const id of ids) noeudsVises.push(await noeudDuPoint(pg, VISE[id].at(-1) ?? ''));
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

	it('au départ : les 8 brouillons sont sans nœud ni tag', () => {
		expect(parModele(avant.noeuds)).toEqual(ids.map(() => null));
		expect(parModele(avant.codes)).toEqual(ids.map(() => []));
	});

	it('chaque modèle est rangé sur le nœud de son point', () => {
		expect(parModele(apres.noeuds)).toEqual(noeudsVises);
	});

	it('chaque modèle reçoit EXACTEMENT ses points (M2 : 1SPE-362 en plus)', () => {
		expect(parModele(apres.codes)).toEqual(ids.map((id) => VISE[id]));
	});

	it('niveaux, statuts et `updated_at` ne bougent pas', () => {
		expect(parModele(apres.grades)).toEqual(ids.map((id) => NIVEAUX[id]));
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

describe('1re techno lot 4 : les branches d’échec de la migration', () => {
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
				/identifiants partiellement présents : 7 modèle\(s\) sur 8/
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
				                                   where code = '1TECHNO-067' and archived_at is null)
				  where id = $1`,
				[M8]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/brouillons différents du relevé .* 7 sur 8 conformes/
			);
		});
	});

	it('un brouillon aux niveaux changés fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = '{1_TECHNO}' where id = $1`,
				[M2]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/brouillons différents du relevé .* 7 sur 8 conformes/
			);
		});
	});

	it('rollback refusé si un tag a disparu depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`delete from public.question_template_points t using public.curriculum_points p
				  where p.id = t.point_id and p.code = '1SPE-362' and t.template_id = $1`,
				[M2]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : tags changés depuis la migration : 8 sur 9 présents/
			);
		});
	});
});
