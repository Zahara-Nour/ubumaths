/**
 * Niveaux `1_TECHNO` des modèles tagués d'un point de 1re technologique (Supabase local requis)
 * ================================================================================================
 *
 * Migration `20261103082130_questions_1techno_grades` : 53 modèles tagués 1TECHNO-* sans `1_TECHNO`
 * dans `grades` reçoivent ce niveau (le cahier de texte filtre par niveau). Décision de David le
 * 2026-11-03 (journal docs/wip/questions-1techno-grades-progress.md).
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

const MIGRATION = 'supabase/migrations/20261103082130_questions_1techno_grades.sql';
/** Le lot : identifiant de la prod et niveaux relevés le 2026-11-03. */
const LOT: [string, string[]][] = [
	['0495289a-abb1-4fed-b058-5e924a5f05ed', ['1_SPE']],
	['05387201-2403-409a-8ebe-5898b6e77e3c', ['1_SPE']],
	['0718f490-bfdd-4a62-b78f-b15753c27d8a', ['1_SPE']],
	['0af4bf32-b97e-493d-bea4-917b6bbdf6f2', ['1_SPE']],
	['0b686e01-725c-448d-9e10-b295cf9b4128', ['1_SPE']],
	['1239554b-d442-4be6-8867-d9dc38311999', ['1_SPE']],
	['1315d326-1a4b-4abc-af93-f8ab9aeecc66', ['1_SPE']],
	['1666b8e9-8225-4e66-8b8c-4d5190806ed1', ['1_SPE']],
	['17f64f63-9af0-48ea-96b1-a74e0bef16f4', ['1_SPE']],
	['18e26873-dca0-4c73-bc23-f181e0164a66', ['1_SPE']],
	['19961e67-88c4-43bf-a76b-6a2af61dedf3', ['1_SPE']],
	['1acb6d47-5d88-4ccf-830f-98dc57d0022c', ['1_SPE']],
	['1b1a6d7b-d776-491b-b2bc-b2bc9fe629fe', ['1_SPE']],
	['1bbfa5f2-1c32-4a81-92cf-b9e7c5996977', ['1_SPE']],
	['1c65d58e-8596-4e11-b917-6c8a86d8ef0f', ['T_COMP']],
	['2dd2b712-3687-4910-ab92-378c46125129', ['1_SPE']],
	['31a77ba9-520c-4f35-82b3-066492b512c1', ['1_SPE']],
	['337d31c3-5d6b-4bd0-b9da-f025ddb26145', ['1_SPE']],
	['36010981-8f6b-4b95-bc86-4fcbf87be4ac', ['1_SPE']],
	['373fc5b4-63af-409d-a1b9-1320ae9b3b75', ['1_SPE']],
	['46913a48-c97f-4f00-9cdc-b98214b8420b', ['1_SPE']],
	['5ba712bc-fda7-4d3c-80ee-b2aa8de6cc4f', ['1_SPE']],
	['5cb7f6ce-8c71-4874-9b42-cd9afd4a1c29', ['1_SPE']],
	['65e96f31-31fe-4c2b-b894-e689b998b849', ['1_SPE']],
	['6dd2f133-e203-4cf6-a422-6a0e716203f3', ['1_SPE']],
	['6fbc355c-aca7-4e2e-8a55-78b3a5722e17', ['1_SPE']],
	['7247dbb0-eeb4-49f0-9c54-4b6ce26f2db8', ['1_SPE']],
	['7703e625-8a3e-48bd-b4d3-245201766457', ['1_SPE']],
	['782bf7f8-b6af-43f2-a1d7-78089cdb9485', ['1_SPE']],
	['79d69593-e815-496c-b429-637a1cd68b4d', ['1_SPE']],
	['83b1f614-95db-4d74-9fbf-d4d502ee8c01', ['1_SPE']],
	['8d4e5302-a133-441d-a618-69abb9cb4b63', ['1_SPE']],
	['97b3a376-01de-42cd-8297-b0f7937e38f1', ['1_SPE']],
	['a0089728-f07a-46ba-8109-7550d2ac800d', ['1_SPE']],
	['a3f92832-2daf-4f00-94b5-68b57275e93a', ['1_SPE']],
	['a430a698-851d-40b9-b4b0-146153788397', ['1_SPE']],
	['a573d517-be46-442b-a298-03469d286e79', ['T_COMP']],
	['a8b51d16-261f-4acd-a2c2-933d3ea9bab5', ['1_SPE']],
	['bf3e3211-3dc9-4a91-964a-eb8a68350903', ['1_SPE']],
	['c23840b6-f01c-4d33-ac40-4c5f9c2b6eab', ['1_SPE']],
	['c90fa022-9493-4812-adb7-c785babee9d4', ['1_SPE']],
	['cda8e0d2-366c-482f-8cf3-2564b4b7083d', ['1_SPE']],
	['d2067413-da43-42bb-a24c-642d2a3cc5e8', ['1_SPE']],
	['d5780995-4cd1-49f9-af54-45edca0a27b8', ['1_SPE']],
	['d58208eb-48f8-4a77-b5bb-55cddcd845ab', ['1_SPE']],
	['d683e906-b1ca-44f0-bed5-8df2a9740b11', ['1_SPE']],
	['e5205176-140d-4376-9761-8172ca8bf10a', ['1_SPE']],
	['eafd17a1-6e78-4bf3-932c-da806ac9d889', ['1_SPE']],
	['ebe7e788-3fdc-4d48-8429-ecc959f35349', ['1_SPE']],
	['ecba8a9e-bedb-478d-a324-a4f3fbdb3967', ['1_SPE']],
	['ed8444bb-dfa3-4b6c-8414-27afb3066d2b', ['1_SPE']],
	['f36ce3ff-9ae5-435e-b6c2-affe0ad902ec', ['1_SPE']],
	['f52395d1-31ca-4bdb-be8f-723c5d96d2ac', ['1_SPE']]
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

describe('1re techno : niveau 1_TECHNO des modèles tagués 1TECHNO (migration de données)', () => {
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

	it('le lot compte 53 modèles, tous présents', () => {
		expect(new Set(ids).size).toBe(53);
		expect(avant.grades.size).toBe(53);
	});

	it('chaque modèle a EXACTEMENT ses niveaux d’avant, plus 1_TECHNO', () => {
		expect(niveaux(apres)).toEqual(LOT.map(([, grades]) => [...grades, '1_TECHNO']));
	});

	it('aucun niveau retiré : 1_SPE et T_COMP restent', () => {
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

describe('1re techno : les branches d’échec de la migration', () => {
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
				/identifiants partiellement présents : 52 modèle\(s\) sur 53/
			);
		});
	});

	it('un niveau changé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = grades || '1_GEN'::text where id = $1`,
				[ids[0]]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/niveaux changés depuis le relevé : 52 sur 53 conformes/
			);
		});
	});

	it('rollback refusé si un niveau a changé depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = array['1_TECHNO'] where id = $1`,
				[ids[0]]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : niveaux changés depuis la migration : 52 sur 53 conformes/
			);
		});
	});
});
