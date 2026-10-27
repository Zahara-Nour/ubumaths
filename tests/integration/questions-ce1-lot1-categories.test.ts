/**
 * Chantier « questions-ce1 », lot 1 : 3 modèles publiés quittent les catégories « astucieuses » (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261027200000_questions_ce1_lot1_categories` : ajouter ou soustraire des dizaines
 * ou des centaines entières passe en « Somme » / « Différence », à côté de « Ajouter 10 » et
 * « Soustraire 10 ». Décision de David (journal docs/wip/questions-ce1-progress.md § 6).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, PUBLIÉES, dans leur catégorie et à leur niveau
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
	categories: Map<string, string>;
	dates: Map<string, string>;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261027200000_questions_ce1_lot1_categories.sql';
/** Le lot : identifiant de la prod, catégorie et niveau relevés le 2026-10-27, et visés. */
const LOT: {
	id: string;
	domain: string;
	avant: { subdomain: string; level: number };
	apres: { subdomain: string; level: number };
}[] = [
	{
		id: '0b490331-eda5-4201-b4be-a77e5ebe2229',
		domain: 'Soustraire',
		avant: { subdomain: 'Différence astucieuse', level: 8 },
		apres: { subdomain: 'Différence', level: 15 }
	},
	{
		id: '240bb640-0548-4ff2-ac47-1b182ca3fcc2',
		domain: 'Additionner',
		avant: { subdomain: 'Somme astucieuse', level: 11 },
		apres: { subdomain: 'Somme', level: 20 }
	},
	{
		id: 'cb08bf78-8c21-4c48-83da-8214dbc2d7a2',
		domain: 'Additionner',
		avant: { subdomain: 'Somme astucieuse', level: 12 },
		apres: { subdomain: 'Somme', level: 21 }
	}
];
const ids = LOT.map((m) => m.id);
/** Date de modification fabriquée : elle ne doit pas bouger (le contenu ne change pas). */
const AVANT = '2026-01-02T03:04:05.000Z';
/** Modèle publié fabriqué pour occuper une place visée. */
const OCCUPANT = '00000000-0000-4000-8000-00000000c1e1';

// ============================================================================
// FONCTIONS
// ============================================================================

/** Pose l'état de la prod : les copies des modèles, publiées, catégorie et niveau relevés. */
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
			    set grades = array['CE1'], theme = 'Entiers', domain = $2, subdomain = $3, level = $4,
			        status = 'published'
			  where id = $1`,
			[m.id, m.domain, m.avant.subdomain, m.avant.level]
		);
	}
	await pg.query(
		'alter table public.question_templates enable trigger update_question_templates_updated_at'
	);
}

async function lireEtat(pg: Client): Promise<Etat> {
	const q = await pg.query<{ id: string; subdomain: string; level: number; updated_at: Date }>(
		'select id, subdomain, level, updated_at from public.question_templates where id = any($1::uuid[])',
		[ids]
	);
	return {
		categories: new Map(q.rows.map((r) => [r.id, `${r.subdomain}§${r.level}`])),
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()]))
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('Questions CE1, lot 1 : catégories des modèles publiés (migration de données)', () => {
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

	it('chaque modèle prend EXACTEMENT sa catégorie et son niveau visés', () => {
		expect(LOT.map((m) => apres.categories.get(m.id))).toEqual(
			LOT.map((m) => `${m.apres.subdomain}§${m.apres.level}`)
		);
	});

	it('`updated_at` des modèles est préservé', () => {
		expect([...apres.dates.values()]).toEqual(ids.map(() => AVANT));
	});

	it('le rollback écrit dans la migration rend les catégories et niveaux d’avant', () => {
		expect(LOT.map((m) => annule.categories.get(m.id))).toEqual(
			LOT.map((m) => `${m.avant.subdomain}§${m.avant.level}`)
		);
		expect([...annule.dates.values()]).toEqual(ids.map(() => AVANT));
	});
});

describe('Questions CE1, lot 1 : les branches d’échec de la migration', () => {
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
				/identifiants partiellement présents : 2 modèle\(s\) sur 3/
			);
		});
	});

	it('un modèle dépublié depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(`update public.question_templates set status = 'draft' where id = $1`, [
				ids[0]
			]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles changés depuis le relevé : 2 sur 3 conformes/
			);
		});
	});

	it('une place visée prise par un modèle publié fait échouer la migration', async () => {
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
				    set theme = 'Entiers', domain = 'Additionner', subdomain = 'Somme', level = 20, status = 'published'
				  where id = $1`,
				[OCCUPANT]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/place visée déjà prise par un modèle publié : 1/
			);
		});
	});
});
