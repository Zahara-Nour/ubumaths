/**
 * Migrations de contenu de modèles PUBLIÉS (Supabase local requis)
 * ================================================================
 *
 * Générées par `scripts/questions/migration-contenu.ts` : chacune pose une fixture sous
 * `tests/integration/fixtures/contenu-publie/` (contenu relevé en prod, contenu du fichier). Ce test
 * les rejoue TOUTES, depuis leur fichier de migration, dans une transaction annulée à la fin :
 * copie des modèles de la prod (vrais identifiants, contenu relevé), migration, vérification,
 * rollback extrait de l'en-tête. Il rejoue aussi une migration fabriquée par le générateur sur un
 * cas synthétique, pour éprouver le générateur lui-même (gardes, tout ou rien).
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Client } from 'pg';
import { getPostgresClient } from '../helpers/database/postgres-client';
import { cleanupAllTestData } from '../helpers/database/trigger-test-helpers';
import { extractRollback } from '../helpers/database/migration-rollback';
import { insertProdCopies } from '../helpers/database/prod-copies';
import {
	genererMigration,
	type Contenu,
	type FixtureContenu,
	type ModeleMigre
} from '../../scripts/lib/migration-contenu';

// ============================================================================
// TYPES
// ============================================================================

interface Cas {
	nom: string;
	migration: string;
	modeles: ModeleMigre[];
}

interface Etat extends Contenu {
	title: string;
	status: string;
	grades: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const FIXTURES = 'tests/integration/fixtures/contenu-publie';
const TITRE = 'copie de la prod';
const SPECS = [{ variation: 0, answer: '5', expected: true }];
const V1 = { statement: 'Combien font $2+3$ ?', expectedAnswers: ['5'] };
const V2 = { statement: 'Combien font $4+3$ ?', expectedAnswers: ['7'] };
const V3 = { statement: 'Combien font $9+3$ ?', expectedAnswers: ['12'] };

/** Deux modèles fictifs : l'un gagne une variation, l'autre a une variation, ses specs et sa description corrigées */
const SYNTHETIQUES: ModeleMigre[] = [
	{
		id: 'c0a7e000-0000-4000-8000-00000000000a',
		title: 'Additions',
		fichier: '01-additions.json',
		avant: { variations: [V1, V2], testSpecs: SPECS, description: null },
		apres: { variations: [V1, V2, V3], testSpecs: SPECS, description: null },
		changements: { ajoutees: [3], corrigees: [], specs: false, description: false }
	},
	{
		id: 'c0a7e000-0000-4000-8000-00000000000b',
		title: 'Soustractions',
		fichier: '02-soustractions.json',
		avant: { variations: [V1], testSpecs: null, description: 'Ancienne\ndescription' },
		apres: {
			variations: [{ ...V1, statement: 'Combien font $2 + 3$ ?' }],
			testSpecs: SPECS,
			description: 'Nouvelle « description » avec $q$'
		},
		changements: { ajoutees: [], corrigees: [1], specs: true, description: true }
	}
];

// ============================================================================
// FONCTIONS
// ============================================================================

function casSynthetique(): Cas {
	const migration = join(mkdtempSync(join(tmpdir(), 'contenu-publie-')), 'synthetique.sql');
	writeFileSync(
		migration,
		genererMigration(
			{ lot: 'synthetique', source: 'scripts/questions/synthetique', date: '2026-11-20' },
			SYNTHETIQUES
		)
	);
	return { nom: 'cas synthétique (générateur)', migration, modeles: SYNTHETIQUES };
}

function casDesFixtures(): Cas[] {
	if (!existsSync(FIXTURES)) return [];
	return readdirSync(FIXTURES)
		.filter((f) => f.endsWith('.json'))
		.sort()
		.map((f) => {
			const fixture = JSON.parse(readFileSync(join(FIXTURES, f), 'utf-8')) as FixtureContenu;
			return { nom: fixture.migration, migration: fixture.migration, modeles: fixture.modeles };
		});
}

/** Copies des modèles de la prod, portant le contenu donné (celui relevé, par défaut) */
async function poserEtatProd(
	pg: Client,
	modeles: ModeleMigre[],
	contenu: (m: ModeleMigre) => Contenu = (m) => m.avant
): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: modeles.map((m) => m.id),
		exerciseIds: [],
		authorId: modeles[0].id,
		timestamp: '2026-01-02T03:04:05.000Z'
	});
	for (const m of modeles) {
		const c = contenu(m);
		await pg.query(
			`update public.question_templates
			    set variations = $2::jsonb, test_specs = $3::jsonb, description = $4, status = 'published'
			  where id = $1`,
			[
				m.id,
				JSON.stringify(c.variations),
				c.testSpecs === null ? null : JSON.stringify(c.testSpecs),
				c.description
			]
		);
	}
}

async function lireEtat(pg: Client, id: string): Promise<Etat> {
	const r = await pg.query<{
		variations: unknown[];
		test_specs: unknown;
		description: string | null;
		title: string;
		status: string;
		grades: string[];
	}>(
		`select variations, test_specs, description, title, status, grades
		   from public.question_templates where id = $1`,
		[id]
	);
	const l = r.rows[0];
	return {
		variations: l.variations,
		testSpecs: l.test_specs,
		description: l.description,
		title: l.title,
		status: l.status,
		grades: l.grades
	};
}

function contenuDe(e: Etat): Contenu {
	return { variations: e.variations, testSpecs: e.testSpecs, description: e.description };
}

// ============================================================================
// SUITES
// ============================================================================

const TOUS: Cas[] = [casSynthetique(), ...casDesFixtures()];

describe.each(TOUS)('$nom', ({ migration, modeles }) => {
	let pg: Client;

	beforeAll(async () => {
		await cleanupAllTestData();
		pg = await getPostgresClient();
	}, 60_000);

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

	it('migration : chaque modèle porte le contenu du fichier ; titre, statut, niveaux inchangés ; rollback : la prod', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, modeles);
			const avant = await Promise.all(modeles.map((m) => lireEtat(pg, m.id)));
			for (const [i, m] of modeles.entries()) expect(contenuDe(avant[i])).toEqual(m.avant);

			await pg.query(readFileSync(migration, 'utf-8'));
			for (const [i, m] of modeles.entries()) {
				const apres = await lireEtat(pg, m.id);
				expect(contenuDe(apres)).toEqual(m.apres);
				expect([apres.title, apres.status, apres.grades]).toEqual([
					TITRE,
					'published',
					avant[i].grades
				]);
			}

			await pg.query(extractRollback(migration));
			for (const m of modeles) expect(contenuDe(await lireEtat(pg, m.id))).toEqual(m.avant);
		});
	});

	it('modèles absents (base locale) : ne fait rien, sans erreur', async () => {
		await enTransaction(async () => {
			await pg.query('delete from public.question_templates where id = any($1::uuid[])', [
				modeles.map((m) => m.id)
			]);
			await expect(pg.query(readFileSync(migration, 'utf-8'))).resolves.toBeDefined();
		});
	});

	it('contenu du DERNIER modèle changé depuis le relevé : refuse, et aucun modèle n’est écrit', async () => {
		const dernier = modeles.at(-1);
		if (!dernier) throw new Error('aucun modèle');
		const retouche = (m: ModeleMigre): Contenu =>
			m === dernier ? { ...m.avant, description: 'retouchée depuis le relevé' } : m.avant;
		await enTransaction(async () => {
			await poserEtatProd(pg, modeles, retouche);
			await pg.query('savepoint s');
			await expect(pg.query(readFileSync(migration, 'utf-8'))).rejects.toThrow(/contenu différent/);
			await pg.query('rollback to savepoint s');
			for (const m of modeles) expect(contenuDe(await lireEtat(pg, m.id))).toEqual(retouche(m));
		});
	});

	it('migration déjà jouée : la rejouer refuse', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, modeles, (m) => m.apres);
			await expect(pg.query(readFileSync(migration, 'utf-8'))).rejects.toThrow(/contenu différent/);
		});
	});

	it('rollback sur un contenu qui n’est plus celui de la migration : refuse', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, modeles);
			await expect(pg.query(extractRollback(migration))).rejects.toThrow(/contenu différent/);
		});
	});
});
