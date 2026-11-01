/**
 * Chantier « questions-ce2 », lot 4 (fractions) : niveau de 3 brouillons dans leur catégorie (Supabase local requis)
 * ===========================================================================================
 *
 * Migration `20261101090000_questions_ce2_lot4_niveaux` : le brouillon c73dfcd0, refusé à la
 * publication parce que son niveau 18 de Fractions / Calculer / Addition et Soustraction est pris
 * par un modèle publié du CM1, monte d'un cran, et les deux brouillons qui le suivent aussi.
 * Décision de David du 2026-11-01 (journal docs/wip/questions-ce2-progress.md, § 8).
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

const MIGRATION = 'supabase/migrations/20261101090000_questions_ce2_lot4_niveaux.sql';
/** Le lot : identifiant de la prod, niveau relevé le 2026-11-01 et niveau visé. */
const LOT: { id: string; avant: number; apres: number }[] = [
	{ id: 'c73dfcd0-855c-417d-93ec-cae6d8e45138', avant: 18, apres: 19 },
	{ id: '1f6fb2c2-f7b6-46d2-bdd9-defd927f8247', avant: 19, apres: 20 },
	{ id: 'de7d9cf3-db6c-4ff0-9a36-bd370ac70ab3', avant: 20, apres: 21 }
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
			    set grades = array['CE2'], theme = 'Fractions', domain = 'Calculer', subdomain = 'Addition et Soustraction', level = $2
			  where id = $1`,
			[m.id, m.avant]
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

describe('Questions CE2, lot 4 : niveau des brouillons (migration de données)', () => {
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

describe('Questions CE2, lot 4 : les branches d’échec de la migration', () => {
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

	it('un modèle publié depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(`update public.question_templates set status = 'published' where id = $1`, [
				ids[0]
			]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles changés depuis le relevé : 2 sur 3 conformes/
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
				    set theme = 'Fractions', domain = 'Calculer', subdomain = 'Addition et Soustraction', level = 21, status = 'published'
				  where id = $1`,
				[OCCUPANT]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/niveau visé déjà pris par un modèle publié : 1/
			);
		});
	});
});
