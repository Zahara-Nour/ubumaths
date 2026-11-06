/**
 * Chantier « automatismes-1spe » : point neuf 2-496 « application numérique d'une formule », nœud
 * et tag du modèle neuf qui le travaille (Supabase local requis)
 * ============================================================================================
 *
 * Migration `20261106162749_automatismes_1spe_point_application_numerique` : crée le point 2-496
 * (Automatismes de 2de, sur « Algèbre > Calcul littéral > substitution ») et ses références
 * d'automatismes, puis range le brouillon c1c9cfc3 sur ce nœud avec ce point (ADR 0020).
 * Journal docs/wip/automatismes-1spe-progress.md.
 *
 * Le modèle n'existe qu'en production. Le test fabrique donc l'état de la prod — une copie
 * minimale portant le VRAI identifiant, sans nœud ni tag — puis rejoue la migration **depuis son
 * fichier**, dans une transaction annulée à la fin. La migration est déjà appliquée à la base
 * locale : le test retire d'abord le point (rollback écrit dans la migration) pour repartir de
 * l'état d'avant.
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
import { readNodePaths } from '../helpers/database/classification-paths';
import { insertProdCopies } from '../helpers/database/prod-copies';

// ============================================================================
// TYPES
// ============================================================================

interface Etat {
	noeud: string;
	date: string | undefined;
	tags: string[];
	/** Le point 2-496, s'il existe : attributs et chemin du nœud. */
	point: string | null;
	references: string[];
	/** État du trigger `updated_at` : `O` = actif */
	trigger: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION =
	'supabase/migrations/20261106162749_automatismes_1spe_point_application_numerique.sql';
const ID = 'c1c9cfc3-ff82-4d7d-9df8-d32853a59bee';
const NOEUD = 'Algèbre > Calcul littéral > substitution';
const LONGUEURS = 'Grandeurs et mesures > Longueurs';
const POINT = [
	'2',
	"Effectuer une application numérique d'une formule (notamment pour les formules utilisées dans les autres disciplines)",
	'savoir_faire',
	'attendu',
	'fluence',
	'Automatismes > Calcul numérique et algébrique',
	'51',
	NOEUD
].join('§');
const REFERENCES = ['1_GEN', '1_SPE', '1_TECHNO', '2', 'T_COMP', 'T_SPE', 'T_TECHNO'];
/** Date de modification fabriquée : elle ne doit pas bouger (ranger et taguer ne modifient pas le contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

/** Pose l'état de la prod : sans le point 2-496, et la copie du modèle, sans nœud ni tag. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await pg.query(extractRollback(MIGRATION));
	await insertProdCopies(pg, {
		templateIds: [ID],
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
}

async function lireEtat(pg: Client): Promise<Etat> {
	const chemins = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) chemins.set(id, node.path);
	const q = await pg.query<{ node: string | null; updated_at: Date }>(
		'select classification_node_id as node, updated_at from public.question_templates where id = $1',
		[ID]
	);
	const t = await pg.query<{ grade: string; code: string }>(
		`select p.grade, p.code from public.question_template_points q
		   join public.curriculum_points p on p.id = q.point_id where q.template_id = $1`,
		[ID]
	);
	const p = await pg.query<{
		grade: string;
		name: string;
		kind: string;
		exigence: string;
		regime_acquisition: string;
		rubrique: string;
		display_order: number;
		node_id: string;
	}>(`select * from public.curriculum_points where code = '2-496'`);
	const r = await pg.query<{ grade: string }>(
		`select a.grade from public.curriculum_point_automatismes a
		   join public.curriculum_points p on p.id = a.point_id where p.code = '2-496' order by a.grade`
	);
	const g = await pg.query<{ tgenabled: string }>(
		`select tgenabled from pg_trigger where tgname = 'update_question_templates_updated_at'`
	);
	const pt = p.rows[0];
	return {
		trigger: g.rows[0]?.tgenabled ?? '∅',
		noeud: chemins.get(q.rows[0]?.node ?? '') ?? '∅',
		date: q.rows[0]?.updated_at.toISOString(),
		tags: t.rows.map((x) => `${x.grade}§${x.code}`).sort(),
		point: pt
			? [
					pt.grade,
					pt.name,
					pt.kind,
					pt.exigence,
					pt.regime_acquisition,
					pt.rubrique,
					String(pt.display_order),
					chemins.get(pt.node_id) ?? '∅'
				].join('§')
			: null,
		references: r.rows.map((x) => x.grade)
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('Automatismes de 1re : point 2-496 et rangement du modèle « application numérique » (migration de données)', () => {
	let pg: Client;
	let avant: Etat;
	let apres: Etat;
	let annule: Etat;

	beforeAll(async () => {
		await cleanupAllTestData();
		const prof = await TestData.profile().withRole('teacher').create();
		pg = await getPostgresClient();

		await pg.query('begin');
		await poserEtatProd(pg, prof.id);
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

	it('avant : ni point 2-496, ni nœud, ni tag', () => {
		expect([avant.point, avant.references, avant.noeud, avant.tags]).toEqual([null, [], '∅', []]);
	});

	it('le point 2-496 est créé avec EXACTEMENT ses attributs, sur son nœud', () => {
		expect(apres.point).toBe(POINT);
	});

	it('le point est rattaché aux automatismes de EXACTEMENT sept niveaux', () => {
		expect(apres.references).toEqual(REFERENCES);
	});

	it('le modèle est sur son nœud et porte EXACTEMENT le point 2-496', () => {
		expect([apres.noeud, apres.tags]).toEqual([NOEUD, ['2§2-496']]);
	});

	it('le trigger `updated_at` est de nouveau actif ; `updated_at` du modèle est préservé', () => {
		expect([apres.trigger, annule.trigger]).toEqual(['O', 'O']);
		expect([apres.date, annule.date]).toEqual([AVANT, AVANT]);
	});

	it('le rollback écrit dans la migration rend l’état d’avant', () => {
		expect(annule).toEqual(avant);
	});
});

describe('Automatismes de 1re, point 2-496 : les branches d’échec de la migration', () => {
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

	it('base sans le modèle (locale) : la migration crée le point et passe', async () => {
		await enTransaction(async () => {
			await pg.query(extractRollback(MIGRATION));
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			const etat = await lireEtat(pg);
			expect([etat.point, etat.references]).toEqual([POINT, REFERENCES]);
		});
	});

	it('le code 2-496 déjà pris fait échouer la migration', async () => {
		await enTransaction(async () => {
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/le code 2-496 est déjà pris/
			);
		});
	});

	it('le modèle rangé à la main depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			const parChemin = new Map<string, string>();
			for (const [id, node] of await readNodePaths(pg)) parChemin.set(node.path, id);
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[ID, parChemin.get(LONGUEURS)]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles déjà rangés depuis le relevé : 1/
			);
		});
	});

	it('le nœud « substitution » archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			const parChemin = new Map<string, string>();
			for (const [id, node] of await readNodePaths(pg)) parChemin.set(node.path, id);
			await pg.query('update public.classification_nodes set archived_at = now() where id = $1', [
				parChemin.get(NOEUD)
			]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/point 2-496 non créé/
			);
		});
	});
});
