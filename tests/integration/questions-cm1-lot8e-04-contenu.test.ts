/**
 * CM1, lot 8e : corrigé du modèle 04 (b423785d) sans débordement à 390 px (Supabase local requis)
 * ================================================================================================
 *
 * Migration `20261119060346_questions_cm1_lot8e_04_contenu` : seule la dernière étape du corrigé de
 * la variation 3 change. Le modèle n'existe qu'en production : le test fabrique une copie portant le
 * vrai identifiant et les variations relevées en prod (fixture, md5 vérifié), puis rejoue la migration
 * **depuis son fichier**, dans une transaction annulée à la fin. Journal :
 * docs/archive/wip/questions-cm1-progress.md (§ 25 septies).
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
import { extractRollback } from '../helpers/database/migration-rollback';
import { insertProdCopies } from '../helpers/database/prod-copies';

// ============================================================================
// TYPES
// ============================================================================

interface Variation {
	statement: string;
	correction: { steps: string[] };
	[cle: string]: unknown;
}

interface Fixture {
	id: string;
	md5Prod: string;
	md5SpecsProd: string;
	grades: string[];
	status: string;
	avant: Variation[];
	apres: Variation[];
	testSpecs: unknown[];
	ancienne: string;
	nouvelle: string;
}

interface Etat {
	variations: Variation[];
	md5: string;
	md5Specs: string;
	grades: string[];
	status: string;
	title: string;
	testSpecs: unknown;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261119060346_questions_cm1_lot8e_04_contenu.sql';
const F: Fixture = JSON.parse(
	readFileSync('tests/integration/fixtures/questions-cm1-lot8e-04-contenu.json', 'utf-8')
);
const TITRE = 'copie de la prod';

// ============================================================================
// FONCTIONS
// ============================================================================

/** Copie du modèle de la prod : variations, specs, niveaux et statut relevés. */
async function poserEtatProd(pg: Client, variations: Variation[] = F.avant): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: [F.id],
		exerciseIds: [],
		authorId: F.id,
		timestamp: '2026-01-02T03:04:05.000Z'
	});
	await pg.query(
		`update public.question_templates
		    set variations = $2::jsonb, test_specs = $3::jsonb, grades = $4, status = $5
		  where id = $1`,
		[F.id, JSON.stringify(variations), JSON.stringify(F.testSpecs), F.grades, F.status]
	);
}

async function lireEtat(pg: Client): Promise<Etat> {
	const r = await pg.query<{
		variations: Variation[];
		md5: string;
		md5_specs: string;
		grades: string[];
		status: string;
		title: string;
		test_specs: unknown;
	}>(
		`select variations, md5(variations::text) as md5, md5(test_specs::text) as md5_specs,
		        grades, status, title, test_specs
		   from public.question_templates where id = $1`,
		[F.id]
	);
	const l = r.rows[0];
	return {
		variations: l.variations,
		md5: l.md5,
		md5Specs: l.md5_specs,
		grades: l.grades,
		status: l.status,
		title: l.title,
		testSpecs: l.test_specs
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('b423785d v3 : corrigé sans formule-phrase (migration de contenu)', () => {
	let pg: Client;
	let avant: Etat;
	let apres: Etat;
	let annule: Etat;

	beforeAll(async () => {
		await cleanupAllTestData();
		pg = await getPostgresClient();
		await pg.query('begin');
		await poserEtatProd(pg);
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

	it('le décor porte EXACTEMENT le contenu relevé en prod (md5 des variations et des specs)', () => {
		expect(avant.md5).toBe(F.md5Prod);
		expect(avant.md5Specs).toBe(F.md5SpecsProd);
		expect(avant.variations[2].correction.steps.at(-1)).toBe(F.ancienne);
	});

	it('après : les variations de la source', () => {
		expect(apres.variations).toEqual(F.apres);
	});

	it('la dernière étape de v3 ne colore plus que « triangles »', () => {
		const etape = apres.variations[2].correction.steps.at(-1) ?? '';
		expect(etape).toBe(F.nouvelle);
		expect(etape).toContain('\\text{triangles}');
		expect(etape).not.toContain('\\text{ses faces');
	});

	it('rien d’autre ne change : v1, v2, le reste de v3, specs, niveaux, statut, titre', () => {
		expect(apres.variations.slice(0, 2)).toEqual(avant.variations.slice(0, 2));
		const { correction: c1, ...v3Apres } = apres.variations[2];
		const { correction: c0, ...v3Avant } = avant.variations[2];
		expect(v3Apres).toEqual(v3Avant);
		expect(c1.steps.slice(0, -1)).toEqual(c0.steps.slice(0, -1));
		expect(c1.steps).toHaveLength(c0.steps.length);
		expect(apres.testSpecs).toEqual(avant.testSpecs);
		expect([apres.grades, apres.status, apres.title]).toEqual([F.grades, F.status, TITRE]);
	});

	it('le rollback rend le contenu de la prod', () => {
		expect(annule.variations).toEqual(F.avant);
		expect(annule.md5).toBe(F.md5Prod);
	});
});

describe('b423785d v3 : les branches de garde de la migration', () => {
	let pg: Client;

	beforeAll(async () => {
		await cleanupAllTestData();
		pg = await getPostgresClient();
	});

	afterAll(async () => {
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

	it('modèle absent (base locale) : ne fait rien, sans erreur', async () => {
		await enTransaction(async () => {
			await pg.query('delete from public.question_templates where id = $1', [F.id]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).resolves.toBeDefined();
		});
	});

	it('contenu modifié depuis le relevé : refuse, rien n’est écrit', async () => {
		const modifie = structuredClone(F.avant);
		modifie[2].correction.steps[0] = 'retouché depuis';
		await enTransaction(async () => {
			await poserEtatProd(pg, modifie);
			await pg.query('savepoint s');
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(/contenu différent/);
			await pg.query('rollback to savepoint s');
			expect((await lireEtat(pg)).variations).toEqual(modifie);
		});
	});

	it('migration déjà jouée : la rejouer refuse', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, F.apres);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(/contenu différent/);
		});
	});

	it('rollback sur un contenu qui n’est plus celui de la migration : refuse', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, F.avant);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(/contenu différent/);
		});
	});
});
