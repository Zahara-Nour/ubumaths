/**
 * Chantier « questions-1spe », lot 0-géométrie repérée : niveau de 8 brouillons dans leur catégorie (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261030150030_questions_1spe_geometrie_reperee_niveaux` : 8 des 12 brouillons de
 * Géométrie / Géométrie repérée, refusés à la publication parce que plusieurs modèles de la sélection
 * partagent catégorie et niveau, sont renumérotés (chacun change de niveau). Décision de David du
 * 2026-10-30 (journal docs/wip/questions-1spe-progress.md, § 13).
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

const MIGRATION = 'supabase/migrations/20261030150030_questions_1spe_geometrie_reperee_niveaux.sql';
/** Le lot : identifiant de la prod, catégorie, niveau relevé le 2026-10-30 et niveau visé. */
const LOT: { id: string; subdomain: string; avant: number; apres: number }[] = [
	{
		id: '1602c40d-818f-4218-beb9-0d7f116992a4',
		subdomain: 'Équation de cercle',
		avant: 1,
		apres: 2
	},
	{
		id: '518f7f0b-389b-4cf2-b67c-5591ca00afb9',
		subdomain: 'Vecteur normal et équation de droite',
		avant: 2,
		apres: 3
	},
	{
		id: '60a428b9-72d0-4375-99a3-26ef6f594d3b',
		subdomain: 'Équation de cercle',
		avant: 2,
		apres: 4
	},
	{
		id: '81811b59-b17c-4d94-bbd4-7f5515b4dd6d',
		subdomain: 'Vecteur normal et équation de droite',
		avant: 3,
		apres: 5
	},
	{
		id: 'a6d7b414-b42d-4378-a3fd-eff48890cc72',
		subdomain: 'Équation de cercle',
		avant: 2,
		apres: 3
	},
	{
		id: 'c2add21a-3c8a-4f02-bb87-59755c033510',
		subdomain: 'Vecteur normal et équation de droite',
		avant: 2,
		apres: 4
	},
	{
		id: 'd7ad48d8-614c-44e3-905d-b60f6630d2f5',
		subdomain: 'Équation de cercle',
		avant: 3,
		apres: 5
	},
	{
		id: 'e710f32f-993f-4c49-9b18-f06ace3f1af7',
		subdomain: 'Vecteur normal et équation de droite',
		avant: 1,
		apres: 2
	}
];
const ids = LOT.map((m) => m.id);
/** Date de modification fabriquée : elle ne doit pas bouger (le contenu ne change pas). */
const AVANT = '2026-01-02T03:04:05.000Z';
/** Modèle publié fabriqué pour occuper un niveau visé. */
const OCCUPANT = '00000000-0000-4000-8000-000000001e5d';

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
			    set grades = array['1_SPE'], theme = 'Géométrie', domain = 'Géométrie repérée', subdomain = $2, level = $3
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

describe('Questions 1re spé, géométrie repérée : niveau des brouillons (migration de données)', () => {
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

describe('Questions 1re spé, géométrie repérée : les branches d’échec de la migration', () => {
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
				/identifiants partiellement présents : 7 modèle\(s\) sur 8/
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
				/modèles changés depuis le relevé : 7 sur 8 conformes/
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
				    set theme = 'Géométrie', domain = 'Géométrie repérée', subdomain = 'Équation de cercle', level = 5, status = 'published'
				  where id = $1`,
				[OCCUPANT]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/niveau visé déjà pris par un modèle publié : 1/
			);
		});
	});
});
