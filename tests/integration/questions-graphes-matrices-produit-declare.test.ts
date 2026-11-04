/**
 * Modèles « Graphes et matrices » : sens de AB déclaré (ADR 0035, lot 3a) (Supabase local requis)
 * ================================================================================================
 *
 * Migration `20261104165734_modeles_graphes_matrices_produit_declare` : le sens « produit » de
 * deux majuscules collées venait du thème `Graphes et matrices`. Un modèle copié ou neuf n'a plus
 * de thème : la migration écrit `shared.capitalPairs = 'product'` sur les modèles de ce thème qui
 * ne déclarent rien (en prod, 2026-11-04 : 21 brouillons, 0 déclarés, aucun publié).
 *
 * Le test fabrique l'état de la prod (copies minimales : sans déclaration, déjà déclaré `length`,
 * `shared` vide, autre thème), rejoue la migration depuis son fichier dans une transaction annulée,
 * puis son rollback écrit en commentaire.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Client } from 'pg';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { extractRollback } from '../helpers/database/migration-rollback';

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261104165734_modeles_graphes_matrices_produit_declare.sql';

/** Identifiants fabriqués (aucun lien avec la prod : la migration vise un thème, pas des ids). */
const ID = {
	sansDeclaration: '00000000-0000-4000-8000-0000000a0001',
	sharedVide: '00000000-0000-4000-8000-0000000a0002',
	autresCles: '00000000-0000-4000-8000-0000000a0003',
	declareLength: '00000000-0000-4000-8000-0000000a0004',
	autreTheme: '00000000-0000-4000-8000-0000000a0005',
	physique: '00000000-0000-4000-8000-0000000a0006'
};

// ============================================================================
// FONCTIONS
// ============================================================================

async function poserEtatProd(pg: Client): Promise<void> {
	const lignes: [string, string, string | null][] = [
		[ID.sansDeclaration, 'Graphes et matrices', null],
		[ID.sharedVide, 'Graphes et matrices', '{}'],
		[ID.autresCles, 'Graphes et matrices', '{"cleanCoefficients": true}'],
		[ID.declareLength, 'Graphes et matrices', '{"capitalPairs": "length"}'],
		[ID.autreTheme, 'Algèbre', '{"cleanCoefficients": true}'],
		[ID.physique, 'Physique-chimie', null]
	];
	for (const [id, theme, shared] of lignes) {
		await pg.query(
			`insert into public.question_templates (id, type, grades, theme, domain, level, variations, status, title, shared)
			 values ($1, 'numerical_exact', array['2'], $2, 'copie', 1, '[{}]'::jsonb, 'draft', 'copie de la prod', $3::jsonb)`,
			[id, theme, shared]
		);
	}
}

/** `shared` de chaque modèle fabriqué, par identifiant */
async function lireShared(pg: Client): Promise<Record<string, unknown>> {
	const r = await pg.query<{ id: string; shared: unknown }>(
		'select id, shared from public.question_templates where id = any($1::uuid[])',
		[Object.values(ID)]
	);
	return Object.fromEntries(r.rows.map((row) => [row.id, row.shared]));
}

// ============================================================================
// SUITE
// ============================================================================

describe('Graphes et matrices : sens « produit » déclaré (migration de données)', () => {
	let pg: Client;
	let avant: Record<string, unknown>;
	let apres: Record<string, unknown>;
	let annule: Record<string, unknown>;

	beforeAll(async () => {
		await cleanupAllTestData();
		pg = await getPostgresClient();
		await pg.query('begin');
		await poserEtatProd(pg);
		avant = await lireShared(pg);
		await pg.query(readFileSync(MIGRATION, 'utf-8'));
		apres = await lireShared(pg);
		await pg.query(extractRollback(MIGRATION));
		annule = await lireShared(pg);
	}, 60_000);

	afterAll(async () => {
		await pg.query('rollback');
		await cleanupAllTestData();
	});

	it('un modèle « Graphes et matrices » sans déclaration reçoit capitalPairs = product', () => {
		expect(apres[ID.sansDeclaration]).toEqual({ capitalPairs: 'product' });
		expect(apres[ID.sharedVide]).toEqual({ capitalPairs: 'product' });
	});

	it('les autres clés de shared sont conservées', () => {
		expect(apres[ID.autresCles]).toEqual({ cleanCoefficients: true, capitalPairs: 'product' });
	});

	it('une déclaration existante (length) n’est pas écrasée', () => {
		expect(apres[ID.declareLength]).toEqual({ capitalPairs: 'length' });
	});

	it('les modèles d’un autre thème ne bougent pas', () => {
		expect(apres[ID.autreTheme]).toEqual(avant[ID.autreTheme]);
		expect(apres[ID.physique]).toEqual(avant[ID.physique]);
	});

	it('le rollback écrit dans la migration rend l’état d’avant', () => {
		expect(annule[ID.sansDeclaration]).toEqual(avant[ID.sansDeclaration] ?? {});
		expect(annule[ID.sharedVide]).toEqual({});
		expect(annule[ID.autresCles]).toEqual({ cleanCoefficients: true });
		expect(annule[ID.declareLength]).toEqual({ capitalPairs: 'length' });
		expect(annule[ID.autreTheme]).toEqual(avant[ID.autreTheme]);
	});
});

describe('Graphes et matrices : base sans ces modèles', () => {
	let pg: Client;

	beforeAll(async () => {
		await cleanupAllTestData();
		pg = await getPostgresClient();
	});

	afterAll(async () => {
		await pg.query('rollback').catch(() => undefined);
		await cleanupAllTestData();
	});

	it('la migration passe sans rien toucher', async () => {
		await pg.query('begin');
		try {
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).resolves.toBeDefined();
		} finally {
			await pg.query('rollback');
		}
	});
});
