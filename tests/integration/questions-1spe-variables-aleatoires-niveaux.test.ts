/**
 * Chantier « questions-1spe », lot 0-variables aléatoires : niveau de 7 brouillons dans leur catégorie (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261030201000_questions_1spe_variables_aleatoires_niveaux` : 7 des 17 brouillons de
 * Probabilités / Variables aléatoires, refusés à la publication parce que plusieurs modèles de la sélection
 * partagent catégorie et niveau, sont renumérotés (chacun change de niveau). Décision de David du
 * 2026-10-30 (journal docs/wip/questions-1spe-progress.md, § 15, D20).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, en brouillon, dans leur catégorie et à leur niveau
 * relevés — puis rejoue la migration **depuis son fichier**, dans une transaction annulée à la fin.
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
	niveaux: Map<string, number>;
	dates: Map<string, string>;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION =
	'supabase/migrations/20261030201000_questions_1spe_variables_aleatoires_niveaux.sql';
/** Le lot : identifiant de la prod, catégorie, niveau relevé le 2026-10-30 et niveau visé. */
const LOT: { id: string; subdomain: string; avant: number; apres: number }[] = [
	{
		id: '0417223e-923d-4ae2-b25c-89b60f4c7631',
		subdomain: 'Espérance',
		avant: 2,
		apres: 4
	},
	{
		id: '2af6296f-7863-40db-89de-eda542be5e45',
		subdomain: 'Variance et écart-type',
		avant: 2,
		apres: 1
	},
	{
		id: '6fbc355c-aca7-4e2e-8a55-78b3a5722e17',
		subdomain: 'Espérance',
		avant: 2,
		apres: 3
	},
	{
		id: '97b3a376-01de-42cd-8297-b0f7937e38f1',
		subdomain: "Loi d'une variable aléatoire",
		avant: 2,
		apres: 3
	},
	{
		id: 'a3f92832-2daf-4f00-94b5-68b57275e93a',
		subdomain: 'Espérance',
		avant: 1,
		apres: 2
	},
	{
		id: 'd683e906-b1ca-44f0-bed5-8df2a9740b11',
		subdomain: "Loi d'une variable aléatoire",
		avant: 3,
		apres: 4
	},
	{
		id: 'eafd17a1-6e78-4bf3-932c-da806ac9d889',
		subdomain: 'Jeux et gains',
		avant: 2,
		apres: 1
	}
];
const ids = LOT.map((m) => m.id);
/** Date de modification fabriquée : elle ne doit pas bouger (le contenu ne change pas). */
const AVANT = '2026-01-02T03:04:05.000Z';
/** Modèle publié fabriqué pour occuper un niveau visé. */
const OCCUPANT = '00000000-0000-4000-8000-000000001e5e';

// ============================================================================
// FONCTIONS
// ============================================================================

/** Pose l'état de la prod : les copies des modèles, en brouillon, catégorie et niveau relevés. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: ids,
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	await pg.query(
		'alter table public.question_templates disable trigger update_question_templates_updated_at'
	);
	for (const m of LOT) {
		await pg.query(
			`update public.question_templates
			    set grades = array['1_SPE'], theme = 'Probabilités', domain = 'Variables aléatoires', subdomain = $2, level = $3
			  where id = $1`,
			[m.id, m.subdomain, m.avant]
		);
	}
	await pg.query(
		'alter table public.question_templates enable trigger update_question_templates_updated_at'
	);
}

async function lireEtat(pg: Client): Promise<Etat> {
	const q = await pg.query<{ id: string; level: number; updated_at: Date }>(
		'select id, level, updated_at from public.question_templates where id = any($1::uuid[])',
		[ids]
	);
	return {
		niveaux: new Map(q.rows.map((r) => [r.id, r.level])),
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()]))
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('Questions 1re spé, variables aléatoires : niveau des brouillons (migration de données)', () => {
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

	it('chaque modèle prend EXACTEMENT son niveau visé', () => {
		expect(LOT.map((m) => apres.niveaux.get(m.id))).toEqual(LOT.map((m) => m.apres));
	});

	it('`updated_at` des modèles est préservé', () => {
		expect([...apres.dates.values()]).toEqual(ids.map(() => AVANT));
	});

	it('le rollback écrit dans la migration rend les niveaux d’avant', () => {
		expect(LOT.map((m) => annule.niveaux.get(m.id))).toEqual(LOT.map((m) => m.avant));
		expect([...annule.dates.values()]).toEqual(ids.map(() => AVANT));
	});
});

describe('Questions 1re spé, variables aléatoires : les branches d’échec de la migration', () => {
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

	it('base sans les modèles (locale) : la migration ne touche rien et passe', async () => {
		await enTransaction(async () => {
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).resolves.toBeDefined();
		});
	});

	it('TOUT ou RIEN : un modèle manquant fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_templates where id = $1', [ids[0]]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/identifiants partiellement présents : 6 modèle\(s\) sur 7/
			);
		});
	});

	it('un modèle publié depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(`update public.question_templates set status = 'published' where id = $1`, [
				ids[0]
			]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles changés depuis le relevé : 6 sur 7 conformes/
			);
		});
	});

	it('un niveau visé pris par un modèle publié fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await insertProdCopies(pg, {
				templateIds: [OCCUPANT],
				exerciseIds: [],
				authorId: auteur,
				timestamp: AVANT
			});
			await pg.query(
				`update public.question_templates
				    set theme = 'Probabilités', domain = 'Variables aléatoires', subdomain = 'Espérance', level = 4, status = 'published'
				  where id = $1`,
				[OCCUPANT]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/niveau visé déjà pris par un modèle publié : 1/
			);
		});
	});
});
