/**
 * Chantier « questions-4 », lot 1 : niveau d'un brouillon dans sa catégorie (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261101193000_questions_4_lot1_niveau` : a635df43 (Fraction d'une fraction),
 * refusé à la publication parce que ece43e92 (publié) occupe le niveau 5 de Fractions / Calculer /
 * Fraction d'une quantité (niveaux 1 à 6 pris), passe au niveau 7. Décision de David du 2026-11-01
 * (journal docs/wip/questions-4-progress.md, § 38).
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
	niveaux: Map<string, number>;
	dates: Map<string, string>;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261101193000_questions_4_lot1_niveau.sql';
/** Le lot : identifiant de la prod, catégorie, niveau relevé le 2026-11-01 et niveau visé. */
const LOT: { id: string; subdomain: string; avant: number; apres: number }[] = [
	{
		id: 'a635df43-313d-47f7-a445-2020867ed2e4',
		subdomain: "Fraction d'une quantité",
		avant: 5,
		apres: 7
	}
];
const ids = LOT.map((m) => m.id);
/** Date de modification fabriquée : elle ne doit pas bouger (le contenu ne change pas). */
const AVANT = '2026-01-02T03:04:05.000Z';
/** Modèle publié fabriqué pour occuper un niveau visé. */
const OCCUPANT = '00000000-0000-4000-8000-0000000a635d';

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
			    set grades = array['4'], theme = 'Fractions', domain = 'Calculer', subdomain = $2, level = $3
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

describe('Questions 4e, lot 1 : niveau du brouillon (migration de données)', () => {
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

describe('Questions 4e, lot 1 : les branches d’échec de la migration', () => {
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

	it('un modèle publié depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(`update public.question_templates set status = 'published' where id = $1`, [
				ids[0]
			]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles changés depuis le relevé : 0 sur 1 conformes/
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
				    set theme = 'Fractions', domain = 'Calculer', subdomain = 'Fraction d''une quantité', level = 7, status = 'published'
				  where id = $1`,
				[OCCUPANT]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/niveau visé déjà pris par un modèle publié : 1/
			);
		});
	});
});
