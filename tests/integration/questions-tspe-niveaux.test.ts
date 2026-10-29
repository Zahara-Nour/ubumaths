/**
 * Chantier « questions-tspe » : niveau de 14 brouillons dans leur catégorie (Supabase local requis)
 * ===================================================================================
 *
 * Migration `20261030011000_questions_tspe_niveaux` : 14 brouillons de terminale spé partagent
 * leur niveau avec un autre modèle de leur catégorie (13 brouillons, 1 modèle publié de 1re spé),
 * ce qui bloque leur publication ; un modèle de chaque paire prend un niveau libre. Décision de
 * David du 2026-10-30 (journal docs/wip/questions-tspe-progress.md, § 6).
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

const MIGRATION = 'supabase/migrations/20261030011000_questions_tspe_niveaux.sql';
/** Le lot : identifiant de la prod, catégorie, niveau relevé le 2026-10-29 et niveau visé. */
const LOT: {
	id: string;
	theme: string;
	domain: string;
	subdomain: string;
	avant: number;
	apres: number;
}[] = [
	{
		id: '37ce7759-c2fa-4353-a726-f0c942284053',
		theme: 'Fonctions convexes',
		domain: 'Convexité',
		subdomain: 'Lecture graphique',
		avant: 2,
		apres: 1
	},
	{
		id: '3aca54e9-28c7-4ea4-930b-30be6979549b',
		theme: 'Probabilités',
		domain: 'Dénombrement',
		subdomain: 'Combinaisons',
		avant: 2,
		apres: 1
	},
	{
		id: '5072030d-8036-4621-a92b-75df54d371f9',
		theme: 'Fonctions',
		domain: 'Fonctions trigonométriques',
		subdomain: 'Parité et périodicité',
		avant: 1,
		apres: 3
	},
	{
		id: '7063979e-b3b5-4b12-8ff9-e6df2c05b23c',
		theme: 'Suites',
		domain: 'Limites de suites',
		subdomain: 'Comparaison et encadrement',
		avant: 2,
		apres: 1
	},
	{
		id: '7df468d6-647c-4b59-9a6c-026a2279fd86',
		theme: 'Fonctions',
		domain: 'Fonctions trigonométriques',
		subdomain: 'Parité et périodicité',
		avant: 2,
		apres: 4
	},
	{
		id: '7f13ca89-ad64-4665-9f6b-e11fad8f8b08',
		theme: 'Fonctions',
		domain: 'Dérivation',
		subdomain: 'Variations',
		avant: 3,
		apres: 5
	},
	{
		id: '9c7fb7cf-42b3-462e-9a8b-4c4cd8f37278',
		theme: 'Fonctions',
		domain: 'Fonctions trigonométriques',
		subdomain: 'Équations et inéquations',
		avant: 2,
		apres: 5
	},
	{
		id: 'a95a9c0d-0d5d-4a5a-ab50-294e12bb7f47',
		theme: 'Probabilités',
		domain: 'Loi binomiale',
		subdomain: 'Calcul de probabilités',
		avant: 2,
		apres: 1
	},
	{
		id: 'cac2d6ed-c215-4e58-aaeb-1b314476f41d',
		theme: 'Fonctions',
		domain: 'Fonctions trigonométriques',
		subdomain: 'Dérivées et variations',
		avant: 3,
		apres: 4
	},
	{
		id: 'd0930e8c-a11b-489e-a931-0a8679cef3c6',
		theme: 'Primitives et équations différentielles',
		domain: 'Primitives',
		subdomain: 'Primitives des fonctions de référence',
		avant: 1,
		apres: 2
	},
	{
		id: 'd3ae0f61-3377-4d00-896e-291aaaf6ba5d',
		theme: 'Fonctions',
		domain: 'Continuité',
		subdomain: 'Théorème des valeurs intermédiaires',
		avant: 2,
		apres: 3
	},
	{
		id: 'eae25eba-49aa-4be5-a3ae-eef9ec4e0a31',
		theme: 'Géométrie',
		domain: "Orthogonalité et distances dans l'espace",
		subdomain: 'Projeté orthogonal',
		avant: 3,
		apres: 2
	},
	{
		id: 'ed01a843-e3ff-4383-8933-fe7593000693',
		theme: 'Probabilités',
		domain: 'Dénombrement',
		subdomain: 'Principes additif et multiplicatif',
		avant: 1,
		apres: 2
	},
	{
		id: 'f796ffc0-d9cc-496b-97a8-9e10f07e6fc8',
		theme: 'Probabilités',
		domain: 'Dénombrement',
		subdomain: 'Reconnaître le modèle',
		avant: 2,
		apres: 1
	}
];
const ids = LOT.map((m) => m.id);
/** Date de modification fabriquée : elle ne doit pas bouger (le contenu ne change pas). */
const AVANT = '2026-01-02T03:04:05.000Z';
/** Modèle publié fabriqué pour occuper un niveau visé. */
const OCCUPANT = '00000000-0000-4000-8000-0000000075e1';

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
			    set grades = array['T_SPE'], theme = $2, domain = $3, subdomain = $4, level = $5
			  where id = $1`,
			[m.id, m.theme, m.domain, m.subdomain, m.avant]
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

describe('Questions Tle spé : niveau des brouillons (migration de données)', () => {
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

describe('Questions Tle spé : les branches d’échec de la migration', () => {
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
				/identifiants partiellement présents : 13 modèle\(s\) sur 14/
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
				/modèles changés depuis le relevé : 13 sur 14 conformes/
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
				    set theme = 'Suites', domain = 'Limites de suites', subdomain = 'Comparaison et encadrement', level = 1, status = 'published'
				  where id = $1`,
				[OCCUPANT]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/niveau visé déjà pris par un modèle publié : 1/
			);
		});
	});
});
