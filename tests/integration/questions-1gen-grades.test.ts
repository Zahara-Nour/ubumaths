/**
 * Niveaux `1_GEN` des modèles tagués d'un point de 1re générale (Supabase local requis)
 * ================================================================================================
 *
 * Migration `20261103084609_questions_1gen_grades` : 21 modèles tagués 1GEN-* sans `1_GEN` dans
 * `grades` reçoivent ce niveau (le cahier de texte filtre par niveau). Décision de David le
 * 2026-11-03 (journal docs/wip/questions-1techno-grades-progress.md, § 6).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, aux niveaux relevés — puis rejoue la migration
 * **depuis son fichier**, dans une transaction annulée à la fin.
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
import { insertProdCopies } from '../helpers/database/prod-copies';

// ============================================================================
// TYPES
// ============================================================================

interface Etat {
	grades: Map<string, string[]>;
	dates: Map<string, string>;
	statuts: Map<string, string>;
	tags: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261103084609_questions_1gen_grades.sql';
/** Le lot : identifiant de la prod et niveaux relevés le 2026-11-03. */
const LOT: [string, string[]][] = [
	['0af4bf32-b97e-493d-bea4-917b6bbdf6f2', ['1_SPE', '1_TECHNO']],
	['0b686e01-725c-448d-9e10-b295cf9b4128', ['1_SPE', '1_TECHNO']],
	['1315d326-1a4b-4abc-af93-f8ab9aeecc66', ['1_SPE', '1_TECHNO']],
	['18e26873-dca0-4c73-bc23-f181e0164a66', ['1_SPE', '1_TECHNO']],
	['1acb6d47-5d88-4ccf-830f-98dc57d0022c', ['1_SPE', '1_TECHNO']],
	['1b1a6d7b-d776-491b-b2bc-b2bc9fe629fe', ['1_SPE', '1_TECHNO']],
	['1c65d58e-8596-4e11-b917-6c8a86d8ef0f', ['T_COMP', '1_TECHNO']],
	['337d31c3-5d6b-4bd0-b9da-f025ddb26145', ['1_SPE', '1_TECHNO']],
	['36010981-8f6b-4b95-bc86-4fcbf87be4ac', ['1_SPE', '1_TECHNO']],
	['373fc5b4-63af-409d-a1b9-1320ae9b3b75', ['1_SPE', '1_TECHNO']],
	['5cb7f6ce-8c71-4874-9b42-cd9afd4a1c29', ['1_SPE', '1_TECHNO']],
	['65e96f31-31fe-4c2b-b894-e689b998b849', ['1_SPE', '1_TECHNO']],
	['7247dbb0-eeb4-49f0-9c54-4b6ce26f2db8', ['1_SPE', '1_TECHNO']],
	['8d4e5302-a133-441d-a618-69abb9cb4b63', ['1_SPE', '1_TECHNO']],
	['8ed02829-51de-40e2-af77-8fa47d01ea98', ['1_SPE']],
	['a573d517-be46-442b-a298-03469d286e79', ['T_COMP', '1_TECHNO']],
	['a8b51d16-261f-4acd-a2c2-933d3ea9bab5', ['1_SPE', '1_TECHNO']],
	['c23840b6-f01c-4d33-ac40-4c5f9c2b6eab', ['1_SPE', '1_TECHNO']],
	['d5780995-4cd1-49f9-af54-45edca0a27b8', ['1_SPE', '1_TECHNO']],
	['eb9517ed-85ed-4702-b8d0-e155f5a5d474', ['1_SPE']],
	['ebe7e788-3fdc-4d48-8429-ecc959f35349', ['1_SPE', '1_TECHNO']]
];
const ids = LOT.map(([id]) => id);
/** Date de modification fabriquée : elle ne doit pas bouger (les niveaux ne sont pas du contenu). */
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

/** Pose l'état de la prod : les copies des modèles, aux niveaux relevés. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: ids,
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	for (const [id, grades] of LOT) {
		await sansTriggerDeDate(pg, 'update public.question_templates set grades = $2 where id = $1', [
			id,
			grades
		]);
	}
}

async function lireEtat(pg: Client): Promise<Etat> {
	const q = await pg.query<{ id: string; grades: string[]; status: string; updated_at: Date }>(
		'select id, grades, status, updated_at from public.question_templates where id = any($1::uuid[])',
		[ids]
	);
	const t = await pg.query<{ n: string }>(
		'select count(*) as n from public.question_template_points where template_id = any($1::uuid[])',
		[ids]
	);
	return {
		grades: new Map(q.rows.map((r) => [r.id, r.grades])),
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()])),
		statuts: new Map(q.rows.map((r) => [r.id, r.status])),
		tags: Number(t.rows[0].n)
	};
}

function niveaux(etat: Etat): string[][] {
	return ids.map((id) => etat.grades.get(id) ?? []);
}

// ============================================================================
// SUITE
// ============================================================================

describe('1re générale : niveau 1_GEN des modèles tagués 1GEN (migration de données)', () => {
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

	it('le lot compte 21 modèles, tous présents', () => {
		expect(new Set(ids).size).toBe(21);
		expect(avant.grades.size).toBe(21);
	});

	it('chaque modèle a EXACTEMENT ses niveaux d’avant, plus 1_GEN', () => {
		expect(niveaux(apres)).toEqual(LOT.map(([, grades]) => [...grades, '1_GEN']));
	});

	it('aucun niveau retiré : 1_SPE, 1_TECHNO et T_COMP restent', () => {
		expect(
			LOT.every(([id, grades]) => grades.every((g) => apres.grades.get(id)?.includes(g)))
		).toBe(true);
	});

	it('statuts, tags et `updated_at` ne bougent pas', () => {
		expect(apres.statuts).toEqual(avant.statuts);
		expect(apres.tags).toBe(avant.tags);
		expect([...apres.dates.values()]).toEqual(ids.map(() => AVANT));
	});

	it('le rollback écrit dans la migration rend les niveaux d’avant', () => {
		expect(niveaux(annule)).toEqual(LOT.map(([, grades]) => grades));
		expect([...annule.dates.values()]).toEqual(ids.map(() => AVANT));
	});
});

describe('1re générale : les branches d’échec de la migration', () => {
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
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).resolves.toBeDefined();
			await expect(pg.query(extractRollback(MIGRATION))).resolves.toBeDefined();
		});
	});

	it('un modèle absent fait échouer la migration (tout ou rien)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_templates where id = $1', [ids[0]]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/identifiants partiellement présents : 20 modèle\(s\) sur 21/
			);
		});
	});

	it('un niveau changé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = grades || 'T_SPE'::text where id = $1`,
				[ids[0]]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/niveaux changés depuis le relevé : 20 sur 21 conformes/
			);
		});
	});

	it('rollback refusé si un niveau a changé depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = array['1_GEN'] where id = $1`,
				[ids[0]]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : niveaux changés depuis la migration : 20 sur 21 conformes/
			);
		});
	});
});
