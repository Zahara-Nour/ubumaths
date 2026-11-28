/**
 * 1re techno, lot 5 « graphiques » : nœud et tags de 3 brouillons neufs (Supabase local requis)
 * ================================================================================================
 *
 * Migration `20261118203102_questions_1techno_lot5_rangement_tags` : 3 brouillons neufs, sans nœud
 * ni tag, sont rangés sur le nœud de leur point 1TECHNO et reçoivent ce point.
 * Journal : docs/wip/questions-1techno-progress.md (§ 28 et 29).
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

const MIGRATION = 'supabase/migrations/20261118203102_questions_1techno_lot5_rangement_tags.sql';
/** Point visé par modèle, qui donne aussi le nœud */
const VISE: Record<string, string[]> = {
	'd0eb1666-9852-4bc5-8f7f-a0b4db23dcc3': ['1TECHNO-059'],
	'fc84a1c8-f0fd-45c5-bf58-40009ac00efa': ['1TECHNO-121'],
	'8d2047fe-91f1-47fa-888e-aeb296f2434b': ['1TECHNO-104']
};
/** Niveaux du relevé */
const NIVEAUX: Record<string, string[]> = Object.fromEntries(
	Object.keys(VISE).map((id) => [id, ['1_TECHNO']])
);
const ids = Object.keys(VISE);
const N1 = ids[0];
const N3 = ids[2];
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

/** Pose l'état de la prod : 3 brouillons sans nœud ni tag, niveaux du relevé. */
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

describe('1re techno lot 5 : rangement et tags (migration de données)', () => {
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

	it('au départ : les 3 brouillons sont sans nœud ni tag', () => {
		expect(parModele(avant.noeuds)).toEqual(ids.map(() => null));
		expect(parModele(avant.codes)).toEqual(ids.map(() => []));
	});

	it('chaque modèle est rangé sur le nœud de son point', () => {
		expect(parModele(apres.noeuds)).toEqual(noeudsVises);
	});

	it('chaque modèle reçoit EXACTEMENT son point', () => {
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

describe('1re techno lot 5 : les branches d’échec de la migration', () => {
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
			await pg.query('delete from public.question_templates where id = $1', [N1]);
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
				                                   where code = '1TECHNO-104' and archived_at is null)
				  where id = $1`,
				[N3]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/brouillons différents du relevé .* 2 sur 3 conformes/
			);
		});
	});

	it('un brouillon aux niveaux changés fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = '{1_TECHNO,1_GEN}' where id = $1`,
				[N1]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/brouillons différents du relevé .* 2 sur 3 conformes/
			);
		});
	});

	it('rollback refusé si un tag a disparu depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`delete from public.question_template_points t using public.curriculum_points p
				  where p.id = t.point_id and p.code = '1TECHNO-059' and t.template_id = $1`,
				[N1]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : tags changés depuis la migration : 2 sur 3 présents/
			);
		});
	});
});
