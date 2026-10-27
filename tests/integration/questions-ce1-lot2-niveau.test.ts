/**
 * Chantier « questions-ce1 », lot 2 : niveau d'un brouillon dans sa catégorie (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261028130000_questions_ce1_lot2_niveau` : le brouillon c4d4bf70, dont le niveau 3
 * est déjà pris par un modèle publié de la même catégorie, prend le premier niveau libre (10).
 * Règle de David (journal docs/wip/questions-ce1-progress.md § 6).
 *
 * Le modèle n'existe qu'en production. Le test fabrique donc l'état de la prod — une copie
 * minimale portant le VRAI identifiant, en brouillon, dans sa catégorie et à son niveau relevés —
 * puis rejoue la migration **depuis son fichier**, dans une transaction annulée à la fin.
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
	niveau: number | undefined;
	date: string | undefined;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261028130000_questions_ce1_lot2_niveau.sql';
/** Identifiant de la prod ; catégorie et niveau relevés le 2026-10-28, niveau visé. */
const ID = 'c4d4bf70-6496-4772-a146-569ab0aaa176';
const AVANT_NIVEAU = 3;
const APRES_NIVEAU = 10;
/** Date de modification fabriquée : elle ne doit pas bouger (le contenu ne change pas). */
const AVANT = '2026-01-02T03:04:05.000Z';
/** Modèle publié fabriqué pour occuper le niveau visé. */
const OCCUPANT = '00000000-0000-4000-8000-00000000c1e2';

// ============================================================================
// FONCTIONS
// ============================================================================

/** Pose l'état de la prod : la copie du modèle, en brouillon, catégorie et niveau relevés. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: [ID],
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	await pg.query(
		'alter table public.question_templates disable trigger update_question_templates_updated_at'
	);
	await pg.query(
		`update public.question_templates
		    set grades = array['CE1'], theme = 'Entiers', domain = 'Apprivoiser', subdomain = 'Ecriture', level = $2
		  where id = $1`,
		[ID, AVANT_NIVEAU]
	);
	await pg.query(
		'alter table public.question_templates enable trigger update_question_templates_updated_at'
	);
}

async function lireEtat(pg: Client): Promise<Etat> {
	const q = await pg.query<{ level: number; updated_at: Date }>(
		'select level, updated_at from public.question_templates where id = $1',
		[ID]
	);
	return { niveau: q.rows[0]?.level, date: q.rows[0]?.updated_at.toISOString() };
}

// ============================================================================
// SUITE
// ============================================================================

describe('Questions CE1, lot 2 : niveau du brouillon (migration de données)', () => {
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

	it('le modèle prend EXACTEMENT son niveau visé', () => {
		expect(apres.niveau).toBe(APRES_NIVEAU);
	});

	it('`updated_at` du modèle est préservé', () => {
		expect(apres.date).toBe(AVANT);
	});

	it('le rollback écrit dans la migration rend le niveau d’avant', () => {
		expect(annule).toEqual({ niveau: AVANT_NIVEAU, date: AVANT });
	});
});

describe('Questions CE1, lot 2 : les branches d’échec de la migration', () => {
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

	it('base sans le modèle (locale) : la migration ne touche rien et passe', async () => {
		await enTransaction(async () => {
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).resolves.toBeDefined();
		});
	});

	it('un modèle publié depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(`update public.question_templates set status = 'published' where id = $1`, [
				ID
			]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèle changé depuis le relevé : 0 sur 1 conforme/
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
				    set theme = 'Entiers', domain = 'Apprivoiser', subdomain = 'Ecriture', level = $2, status = 'published'
				  where id = $1`,
				[OCCUPANT, APRES_NIVEAU]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/niveau visé déjà pris par un modèle publié : 1/
			);
		});
	});
});
