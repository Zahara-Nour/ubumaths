/**
 * Chantier « questions-1spe », lot 6a « à savoir » : nœud et tag de 7 modèles neufs (Supabase local requis)
 * =======================================================================================
 *
 * Migration `20261102090607_questions_1spe_savoir_a_rangement_tags` : les 7 brouillons
 * « à savoir » (dérivées usuelles, exponentielle, indépendance, variance) créés le 2026-11-02 par scripts/create-questions.ts
 * (sans nœud ni tag) vont sur le nœud de leur point et reçoivent ce point, un seul (ADR 0020).
 * Phase 0 : journal docs/wip/questions-1spe-progress.md § 23.
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, sans nœud ni tag — puis rejoue la migration **depuis
 * son fichier**, dans une transaction annulée à la fin. Les triggers de garde des tags restent
 * actifs : chaque tag posé a passé la règle du nœud.
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
	noeuds: Map<string, string>;
	dates: Map<string, string>;
	tags: string[];
	/** État du trigger `updated_at` : `O` = actif */
	trigger: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261102090607_questions_1spe_savoir_a_rangement_tags.sql';
const LONGUEURS = 'Grandeurs et mesures > Longueurs';
/** Le lot : identifiant créé en prod le 2026-11-02, nœud et points attendus. */
const LOT = [
	{
		id: '21f42c7f-82bc-4204-b294-cb9658bcfd8e',
		noeud: 'Probabilités > Probabilités conditionnelles > indépendance',
		code: '1SPE-336'
	},
	{
		id: '56ec6a7c-dc66-4729-bc2c-6d1ba3e41851',
		noeud: 'Fonctions > Fonction exponentielle > propriétés algébriques',
		code: '1SPE-404'
	},
	{
		id: '7201f3b2-bb5c-4963-a6a6-f64cdeb6f111',
		noeud: 'Fonctions > Dérivation > fonctions dérivées',
		code: '1SPE-392'
	},
	{
		id: 'a16a9bba-2cc5-48d8-b98b-eb4fee6ded3d',
		noeud: 'Fonctions > Dérivation > fonctions dérivées',
		code: '1SPE-391'
	},
	{
		id: 'a181f10b-1b9c-436c-8f8c-51cce68352db',
		noeud: 'Fonctions > Dérivation > fonctions dérivées',
		code: '1SPE-264'
	},
	{
		id: 'c24d21e1-1441-4f0a-90fd-12a0288a234a',
		noeud: 'Fonctions > Fonction exponentielle > propriétés algébriques',
		code: '1SPE-290'
	},
	{
		id: 'fba01378-d2d7-4d44-9236-300a5871ef1c',
		noeud: 'Probabilités > Variables aléatoires > variance et écart-type',
		code: '1SPE-350'
	}
];
const ids = LOT.map((m) => m.id);
/** Date de modification fabriquée : elle ne doit pas bouger (ranger et taguer ne modifient pas le contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

/** Pose l'état de la prod : les copies des modèles, sans nœud ni tag. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: ids,
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
}

async function lireEtat(pg: Client): Promise<Etat> {
	const chemins = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) chemins.set(id, node.path);
	const q = await pg.query<{ id: string; node: string | null; updated_at: Date }>(
		'select id, classification_node_id as node, updated_at from public.question_templates where id = any($1::uuid[])',
		[ids]
	);
	const t = await pg.query<{ template_id: string; grade: string; code: string }>(
		`select q.template_id, p.grade, p.code from public.question_template_points q
		   join public.curriculum_points p on p.id = q.point_id where q.template_id = any($1::uuid[])`,
		[ids]
	);
	const g = await pg.query<{ tgenabled: string }>(
		`select tgenabled from pg_trigger where tgname = 'update_question_templates_updated_at'`
	);
	return {
		trigger: g.rows[0]?.tgenabled ?? '∅',
		noeuds: new Map(q.rows.map((r) => [r.id, chemins.get(r.node ?? '') ?? '∅'])),
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()])),
		tags: t.rows.map((r) => `${r.template_id}§${r.grade}§${r.code}`).sort()
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('Questions 1re spé, lot 6a « à savoir » : nœud et tag des modèles neufs (migration de données)', () => {
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

	it('chaque modèle est EXACTEMENT sur le nœud de son point', () => {
		expect(LOT.map((m) => apres.noeuds.get(m.id))).toEqual(LOT.map((m) => m.noeud));
	});

	it('chaque modèle porte EXACTEMENT son point, rien de plus', () => {
		expect(apres.tags).toEqual(LOT.map((m) => `${m.id}§1_SPE§${m.code}`).sort());
	});

	it('le trigger `updated_at` est de nouveau actif après la migration et après le rollback', () => {
		expect([apres.trigger, annule.trigger]).toEqual(['O', 'O']);
	});

	it('`updated_at` des modèles est préservé', () => {
		expect([...apres.dates.values()]).toEqual(ids.map(() => AVANT));
	});

	it('le rollback écrit dans la migration rend l’état d’avant (sans nœud ni tag)', () => {
		expect(annule.tags).toEqual([]);
		expect(LOT.map((m) => annule.noeuds.get(m.id))).toEqual(LOT.map(() => '∅'));
		expect([...annule.dates.values()]).toEqual(ids.map(() => AVANT));
	});
});

describe('Questions 1re spé, lot 6a « à savoir » : les branches d’échec de la migration', () => {
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
				/identifiants partiellement présents : 6 modèle\(s\) sur 7/
			);
		});
	});

	it('un modèle rangé à la main depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			const parChemin = new Map<string, string>();
			for (const [id, node] of await readNodePaths(pg)) parChemin.set(node.path, id);
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[ids[0], parChemin.get(LONGUEURS)]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles déjà rangés depuis le relevé : 1/
			);
		});
	});

	// La garde « déjà tagué » ne peut pas être atteinte seule : la base refuse un tag sur un modèle
	// sans nœud, et un modèle rangé entre-temps est arrêté par la garde « déjà rangé » (test ci-dessus).
	it('un tag posé à la main suppose un rangement : la base refuse un tag sans nœud', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await expect(
				pg.query(
					`insert into public.question_template_points (template_id, point_id)
					 select $1, id from public.curriculum_points where grade = '1_SPE' and code = '1SPE-264' and archived_at is null`,
					[LOT[0].id]
				)
			).rejects.toThrow(/n'est rangé dans aucun nœud de l'arbre/);
		});
	});

	it('un point du lot archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = '1_SPE' and code = '1SPE-350' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), 1 point\(s\)/
			);
		});
	});
});
