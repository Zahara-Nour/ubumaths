/**
 * Migrations de contenu de modèles PUBLIÉS (Supabase local requis)
 * ================================================================
 *
 * Générées par `scripts/questions/migration-contenu.ts` : chacune pose une fixture sous
 * `tests/integration/fixtures/contenu-publie/` (contenu relevé en prod, contenu du fichier). Ce test
 * les rejoue TOUTES, depuis leur fichier de migration, dans une transaction annulée à la fin :
 * copie des modèles de la prod (vrais identifiants, contenu relevé), migration, vérification,
 * rollback extrait de l'en-tête (options comprises quand la migration les écrit). Il rejoue aussi une migration fabriquée par le générateur sur un
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
	/** Colonnes que la migration ne doit pas toucher */
	autres: Record<string, unknown>;
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
		changements: { ajoutees: [3], corrigees: [], specs: false, description: false, options: false }
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
		changements: { ajoutees: [], corrigees: [1], specs: true, description: true, options: false }
	},
	{
		// Forme de la prod : LaTeX avec `$$` et `$q$`, décimaux, clés hors de l'ordre de jsonb
		id: 'c0a7e000-0000-4000-8000-00000000000c',
		title: 'Le prix $q$ en $$',
		fichier: '03-prix.json',
		avant: {
			variations: [
				{
					variables: [{ name: 'q', expression: '0.5..2.5' }],
					statement: 'Le prix $q$ vaut $$q \\times 1{,}25$$ €.',
					expectedAnswers: ['{{q*1.25}}'],
					options: { tolerance: 0.01, precision: 2 }
				}
			],
			testSpecs: [{ variationIndex: 0, variables: { q: '0.5' }, answers: ['0.625'] }],
			description: null
		},
		apres: {
			variations: [
				{
					variables: [{ name: 'q', expression: '0.5..2.5' }],
					statement: 'Le prix $q$ vaut $$q \\times 1{,}25$$ €.',
					expectedAnswers: ['{{q*1.25}}'],
					options: { tolerance: 0.01, precision: 2 }
				},
				{
					zeta: 1.5e-7,
					statement: 'Combien font $$0{,}1 + 0{,}2$$ ? $contenu$ $retour$',
					expectedAnswers: ['0.3']
				}
			],
			testSpecs: [
				{ variationIndex: 0, variables: { q: '0.5' }, answers: ['0.625'] },
				{ variationIndex: 1, answers: ['0.3'] }
			],
			description: null
		},
		changements: { ajoutees: [2], corrigees: [], specs: true, description: false, options: false }
	},
	{
		// Options changées (ajout d'un réglage) en même temps qu'une variation ajoutée
		id: 'c0a7e000-0000-4000-8000-00000000000d',
		title: 'Fractions décimales',
		fichier: '04-fractions.json',
		avant: {
			variations: [V1],
			testSpecs: SPECS,
			description: null,
			options: { constraints: { spacesFromFourDigits: true } }
		},
		apres: {
			variations: [V1, V2],
			testSpecs: SPECS,
			description: null,
			options: { constraints: { spacesFromFourDigits: true, fractions: 'off' } }
		},
		changements: { ajoutees: [2], corrigees: [], specs: false, description: false, options: true }
	},
	{
		// Options posées sur un modèle qui n'en avait pas (null en base)
		id: 'c0a7e000-0000-4000-8000-00000000000e',
		title: 'Sans options',
		fichier: '05-sans-options.json',
		avant: { variations: [V1], testSpecs: SPECS, description: null, options: null },
		apres: {
			variations: [V1],
			testSpecs: SPECS,
			description: null,
			options: { orderIndependent: true }
		},
		changements: { ajoutees: [], corrigees: [], specs: false, description: false, options: true }
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
		if ('options' in c) {
			await pg.query('update public.question_templates set options = $2::jsonb where id = $1', [
				m.id,
				c.options === null ? null : JSON.stringify(c.options)
			]);
		}
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
		autres: Record<string, unknown>;
	}>(
		`select variations, test_specs, description, title, status, grades,
		        jsonb_build_object('title', title, 'status', status, 'grades', grades, 'level', level,
		          'delay', delay, 'type', type, 'options', options, 'shared', shared,
		          'classification_node_id', classification_node_id,
		          'default_display_options', default_display_options,
		          'exercise_instruction', exercise_instruction, 'created_at', created_at) as autres
		   from public.question_templates where id = $1`,
		[id]
	);
	const l = r.rows[0];
	return {
		variations: l.variations,
		testSpecs: l.test_specs,
		description: l.description,
		options: l.autres.options,
		title: l.title,
		status: l.status,
		grades: l.grades,
		autres: l.autres
	};
}

/** Le contenu lu, à la forme de celui du modèle : `options` seulement si la migration les écrit */
function contenuDe(e: Etat, m: ModeleMigre): Contenu {
	const c: Contenu = {
		variations: e.variations,
		testSpecs: e.testSpecs,
		description: e.description
	};
	if ('options' in m.avant) c.options = e.options;
	return c;
}

/** Les colonnes que la migration ne doit pas toucher : `options` en sort quand elle les écrit */
function autresDe(e: Etat, m: ModeleMigre): Record<string, unknown> {
	if (!('options' in m.avant)) return e.autres;
	const { options: _options, ...reste } = e.autres;
	return reste;
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
			for (const [i, m] of modeles.entries()) expect(contenuDe(avant[i], m)).toEqual(m.avant);

			await pg.query(readFileSync(migration, 'utf-8'));
			for (const [i, m] of modeles.entries()) {
				const apres = await lireEtat(pg, m.id);
				expect(contenuDe(apres, m)).toEqual(m.apres);
				expect([apres.title, apres.status]).toEqual([TITRE, 'published']);
				expect(autresDe(apres, m)).toEqual(autresDe(avant[i], m));
			}

			await pg.query(extractRollback(migration));
			for (const m of modeles) expect(contenuDe(await lireEtat(pg, m.id), m)).toEqual(m.avant);
		});
	});

	// Un lot d'un seul modèle n'a pas d'« autres » : rien à vérifier.
	it.skipIf(modeles.length < 2)(
		'un modèle absent parmi d’autres : les présents sont migrés, sans erreur',
		async () => {
			const [absent, ...presents] = modeles;
			await enTransaction(async () => {
				await poserEtatProd(pg, modeles);
				await pg.query('delete from public.question_templates where id = $1', [absent.id]);
				await pg.query(readFileSync(migration, 'utf-8'));
				for (const m of presents) expect(contenuDe(await lireEtat(pg, m.id), m)).toEqual(m.apres);
			});
		}
	);

	// Seules les migrations écrites depuis le 2026-11-26 nomment le modèle absent : les plus
	// anciennes, déjà jouées en prod, le sautent sans rien dire (le cas synthétique est toujours à jour).
	it.skipIf(!readFileSync(migration, 'utf-8').includes('raise notice'))(
		'modèle absent : sauté, et nommé par un notice',
		async () => {
			const [absent] = modeles;
			const notices: string[] = [];
			const ecouter = (n: { message?: string }) => notices.push(n.message ?? '');
			pg.on('notice', ecouter);
			try {
				await enTransaction(async () => {
					await poserEtatProd(pg, modeles);
					await pg.query('delete from public.question_templates where id = $1', [absent.id]);
					await pg.query(readFileSync(migration, 'utf-8'));
				});
			} finally {
				pg.off('notice', ecouter);
			}
			expect(notices).toEqual([`${absent.id.slice(0, 8)} absent, saute`]);
		}
	);

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
			for (const m of modeles) expect(contenuDe(await lireEtat(pg, m.id), m)).toEqual(retouche(m));
		});
	});

	it('options d’un modèle retouchées depuis le relevé : refuse', async () => {
		const cible = modeles.find((m) => 'options' in m.avant);
		if (!cible) {
			// Aucun modèle n'y change d'options : la migration ne les écrit pas
			expect(readFileSync(migration, 'utf-8')).not.toMatch(/\boptions = /);
			return;
		}
		const retouche = (m: ModeleMigre): Contenu =>
			m === cible ? { ...m.avant, options: { retouchees: true } } : m.avant;
		await enTransaction(async () => {
			await poserEtatProd(pg, modeles, retouche);
			await expect(pg.query(readFileSync(migration, 'utf-8'))).rejects.toThrow(/contenu différent/);
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
