/**
 * Séries et séances : anciennes lignes converties en lignes de modèle — (Supabase local requis)
 * ==============================================================================================
 *
 * Migration `20261104204345_series_lignes_par_modele` (ADR 0035, lot 2b du chantier
 * automaths-arbre). Les séries et séances en ancienne forme n'existent qu'en production : le test
 * pose des modèles publiés, des séries et une séance dont les lignes désignent une catégorie
 * (`{category: {theme, domain, subdomain, level}, …}`), puis rejoue la migration **depuis son
 * fichier** et son rollback écrit en commentaire, dans une transaction annulée à la fin.
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

// ============================================================================
// TYPES
// ============================================================================

interface Decor {
	/** Modèles publiés, par clé courte */
	modeles: Record<'somme' | 'double' | 'vide', string>;
	/** Brouillon homonyme de « somme » : jamais choisi */
	brouillon: string;
	series: Record<'ancienne' | 'nouvelle' | 'verrouillee', string>;
	seance: string;
}

interface Etat {
	series: Map<string, unknown>;
	dates: Map<string, string>;
	seance: unknown;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261104204345_series_lignes_par_modele.sql';
/** Thème fabriqué : aucun modèle local ne le porte */
const THEME = 'Conversion 2b';
/** Date de modification fabriquée : elle ne doit pas bouger (Q10) */
const AVANT = '2026-01-02T03:04:05.000Z';

const cat = (domain: string, subdomain: string | null | undefined, level: number) => ({
	theme: THEME,
	domain,
	...(subdomain === undefined ? {} : { subdomain }),
	level
});

/** Lignes d'avant : sous-domaine renseigné, absent, vide */
const LIGNES_ANCIENNES = [
	{ category: cat('Additionner', 'Somme', 1), quantity: 4, delay: 10 },
	{ category: cat('Additionner', undefined, 2), quantity: 1, delay: 20 },
	{ category: cat('Multiplier', '', 3), quantity: 2, delay: 30 }
];

// ============================================================================
// FONCTIONS
// ============================================================================

async function insererModele(
	pg: Client,
	auteur: string,
	domain: string,
	subdomain: string | null,
	level: number,
	status: 'published' | 'draft'
): Promise<string> {
	const r = await pg.query<{ id: string }>(
		`insert into public.question_templates (type, grades, theme, domain, subdomain, level, variations, status, title, created_by)
		 values ('numerical_exact', array['6'], $1, $2, $3, $4, '[{}]'::jsonb, $5, 'conversion 2b', $6) returning id`,
		[THEME, domain, subdomain, level, status, auteur]
	);
	return r.rows[0].id;
}

async function insererSerie(pg: Client, auteur: string, lignes: unknown): Promise<string> {
	const r = await pg.query<{ id: string }>(
		`insert into public.series (title, grade, categories, created_by, updated_at)
		 values ('Conversion 2b', '6', $1::jsonb, $2, $3) returning id`,
		[JSON.stringify(lignes), auteur, AVANT]
	);
	return r.rows[0].id;
}

/**
 * La base locale porte des séances laissées par d'autres suites (`category: "entiers/1"`) : la
 * migration, TOUT ou RIEN, les refuserait. On les retire dans la transaction du test (annulée).
 */
async function ecarterAnciennesLignesLocales(pg: Client): Promise<void> {
	for (const table of ['test_sessions', 'series']) {
		await pg.query(
			`delete from public.${table} t
			  where exists (select 1 from jsonb_array_elements(t.categories) e where e ? 'category')`
		);
	}
}

async function poserDecor(pg: Client, prof: string, eleve: string): Promise<Decor> {
	const modeles = {
		somme: await insererModele(pg, prof, 'Additionner', 'Somme', 1, 'published'),
		double: await insererModele(pg, prof, 'Additionner', null, 2, 'published'),
		vide: await insererModele(pg, prof, 'Multiplier', null, 3, 'published')
	};
	// Homonyme non publié de « somme » (niveau 1) : la ligne doit désigner le modèle publié
	const brouillon = await insererModele(pg, prof, 'Additionner', 'Somme', 1, 'draft');

	const series = {
		ancienne: await insererSerie(pg, prof, LIGNES_ANCIENNES),
		nouvelle: await insererSerie(pg, prof, [
			{ templateId: modeles.double, quantity: 3, delay: 15 }
		]),
		// Série mêlée et verrouillée : une nouvelle ligne au milieu, une évaluation commencée
		verrouillee: await insererSerie(pg, prof, [
			LIGNES_ANCIENNES[2],
			{ templateId: modeles.somme, quantity: 5, delay: 5 },
			LIGNES_ANCIENNES[0]
		])
	};
	const ev = await pg.query<{ id: string }>(
		`insert into public.evaluations (series_id, form, created_by) values ($1, 'interactive', $2) returning id`,
		[series.verrouillee, prof]
	);
	await pg.query(
		`insert into public.test_sessions (user_id, mode, categories, total_questions, evaluation_id)
		 values ($1, 'interactive', $2::jsonb, 1, $3)`,
		[eleve, JSON.stringify([{ templateId: modeles.somme, quantity: 1, delay: 5 }]), ev.rows[0].id]
	);
	const seance = await pg.query<{ id: string }>(
		`insert into public.test_sessions (user_id, mode, categories, total_questions)
		 values ($1, 'interactive', $2::jsonb, 7) returning id`,
		[eleve, JSON.stringify(LIGNES_ANCIENNES)]
	);
	return { modeles, brouillon, series, seance: seance.rows[0].id };
}

async function lireEtat(pg: Client, decor: Decor): Promise<Etat> {
	const s = await pg.query<{ id: string; categories: unknown; updated_at: Date }>(
		'select id, categories, updated_at from public.series where id = any($1::uuid[])',
		[Object.values(decor.series)]
	);
	const t = await pg.query<{ categories: unknown }>(
		'select categories from public.test_sessions where id = $1',
		[decor.seance]
	);
	return {
		series: new Map(s.rows.map((r) => [r.id, r.categories])),
		dates: new Map(s.rows.map((r) => [r.id, r.updated_at.toISOString()])),
		seance: t.rows[0].categories
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('Séries et séances : conversion en lignes de modèle (migration de données)', () => {
	let pg: Client;
	let decor: Decor;
	let avant: Etat;
	let apres: Etat;
	let rejouee: Etat;
	let annule: Etat;
	let verrouRefuse: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		const prof = await TestData.profile().withRole('teacher').create();
		const eleve = await TestData.profile().withRole('student').create();
		pg = await getPostgresClient();

		await pg.query('begin');
		await ecarterAnciennesLignesLocales(pg);
		decor = await poserDecor(pg, prof.id, eleve.id);
		avant = await lireEtat(pg, decor);
		await pg.query(readFileSync(MIGRATION, 'utf-8'));
		apres = await lireEtat(pg, decor);
		await pg.query(readFileSync(MIGRATION, 'utf-8'));
		rejouee = await lireEtat(pg, decor);

		// Le verrou est rétabli après la conversion
		await pg.query('savepoint verrou');
		verrouRefuse = await pg
			.query(`update public.series set title = 'modifiée' where id = $1`, [
				decor.series.verrouillee
			])
			.then(
				() => 'accepté',
				(e: unknown) => (e instanceof Error ? e.message : String(e))
			);
		await pg.query('rollback to savepoint verrou');

		await pg.query(extractRollback(MIGRATION));
		annule = await lireEtat(pg, decor);
	}, 60_000);

	afterAll(async () => {
		await pg.query('rollback');
		await cleanupAllTestData();
	});

	it('une série en ancienne forme désigne les modèles publiés, ordre, nombres et durées gardés', () => {
		expect(apres.series.get(decor.series.ancienne)).toEqual([
			{ templateId: decor.modeles.somme, quantity: 4, delay: 10 },
			{ templateId: decor.modeles.double, quantity: 1, delay: 20 },
			{ templateId: decor.modeles.vide, quantity: 2, delay: 30 }
		]);
	});

	it('jamais le brouillon homonyme', () => {
		expect(JSON.stringify([...apres.series.values()])).not.toContain(decor.brouillon);
	});

	it('une série déjà en nouvelle forme ne bouge pas', () => {
		expect(apres.series.get(decor.series.nouvelle)).toEqual(
			avant.series.get(decor.series.nouvelle)
		);
	});

	it('une série verrouillée et mêlée est convertie, sa nouvelle ligne gardée en place (Q9)', () => {
		expect(apres.series.get(decor.series.verrouillee)).toEqual([
			{ templateId: decor.modeles.vide, quantity: 2, delay: 30 },
			{ templateId: decor.modeles.somme, quantity: 5, delay: 5 },
			{ templateId: decor.modeles.somme, quantity: 4, delay: 10 }
		]);
	});

	it('le verrou des séries est rétabli après la conversion', () => {
		expect(verrouRefuse).toMatch(/Série verrouillée/);
	});

	it('la date de modification des séries est gardée (Q10)', () => {
		expect([...apres.dates.values()]).toEqual([AVANT, AVANT, AVANT]);
	});

	it('une séance en ancienne forme est convertie', () => {
		expect(apres.seance).toEqual([
			{ templateId: decor.modeles.somme, quantity: 4, delay: 10 },
			{ templateId: decor.modeles.double, quantity: 1, delay: 20 },
			{ templateId: decor.modeles.vide, quantity: 2, delay: 30 }
		]);
	});

	it('rejouée, la migration ne change rien', () => {
		expect(rejouee).toEqual(apres);
	});

	it('le rollback écrit dans la migration rend des catégories équivalentes, dates gardées', () => {
		const attendu = [
			{ category: cat('Additionner', 'Somme', 1), quantity: 4, delay: 10 },
			{ category: cat('Additionner', null, 2), quantity: 1, delay: 20 },
			{ category: cat('Multiplier', null, 3), quantity: 2, delay: 30 }
		];
		expect(annule.series.get(decor.series.ancienne)).toEqual(attendu);
		expect(annule.seance).toEqual(attendu);
		expect([...annule.dates.values()]).toEqual([AVANT, AVANT, AVANT]);
	});
});

describe('Séries et séances : les branches d’échec de la conversion', () => {
	let pg: Client;
	let prof: string;

	beforeAll(async () => {
		await cleanupAllTestData();
		prof = (await TestData.profile().withRole('teacher').create()).id;
		pg = await getPostgresClient();
	});

	afterAll(async () => {
		await pg.query('rollback').catch(() => undefined);
		await cleanupAllTestData();
	});

	it('TOUT ou RIEN : une ancienne ligne sans modèle publié fait échouer la migration (Q11)', async () => {
		await pg.query('begin');
		try {
			await ecarterAnciennesLignesLocales(pg);
			await insererModele(pg, prof, 'Additionner', 'Somme', 1, 'published');
			await insererSerie(pg, prof, [
				LIGNES_ANCIENNES[0],
				{ category: cat('Retiré', null, 1), quantity: 1, delay: 10 }
			]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/1 ancienne\(s\) ligne\(s\) sans modèle publié, 0 à plusieurs modèles/
			);
		} finally {
			await pg.query('rollback');
		}
	});
});
