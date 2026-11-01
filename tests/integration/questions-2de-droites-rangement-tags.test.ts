/**
 * Chantier « questions-2de », lot 5 : nœud et tag de 16 modèles neufs (Supabase local requis)
 * =======================================================================================
 *
 * Migration `20261101160100_questions_2de_droites_rangement_tags` : les 16 brouillons
 * « droites du plan » (lots 5 A et 5 B) créés le 2026-11-01 par scripts/create-questions.ts
 * (sans nœud ni tag) vont sur le nœud de leur point et reçoivent ce point, un seul (ADR 0020).
 * Phase 0 : journal docs/wip/questions-2de-progress.md § 30.
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, en seconde, sans nœud ni tag — puis rejoue la
 * migration **depuis son fichier**, dans une transaction annulée à la fin. Les triggers de garde
 * des tags restent actifs : chaque tag posé a passé la règle du nœud.
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

const MIGRATION = 'supabase/migrations/20261101160100_questions_2de_droites_rangement_tags.sql';
const LONGUEURS = 'Grandeurs et mesures > Longueurs';
/** Le lot : identifiant créé en prod le 2026-11-01, nœud et points attendus. */
const LOT: { id: string; noeud: string; code: string }[] = [
	{
		id: '2540ca82-26ca-443e-a5f7-5f87a49629e3',
		noeud: 'Géométrie > Géométrie repérée > vecteur directeur',
		code: '2-444'
	},
	{
		id: '2cfae58d-7fdb-45f7-8ea1-777a4a307b5a',
		noeud: 'Géométrie > Géométrie repérée > équations de droites',
		code: '2-445'
	},
	{
		id: '36c21f21-fee5-4d2e-a191-364b42039cd1',
		noeud: 'Géométrie > Géométrie repérée > vecteur directeur',
		code: '2-443'
	},
	{
		id: '49df6491-f424-4560-8fba-a9c302449e3d',
		noeud: 'Géométrie > Géométrie repérée > vecteur directeur',
		code: '2-442'
	},
	{
		id: '6e074f0e-0c3a-41b8-b70a-82cb402494b3',
		noeud: 'Géométrie > Géométrie repérée > équations de droites',
		code: '2-314'
	},
	{
		id: '718b7183-415b-4a86-bbf1-70a3c1eb0c6c',
		noeud: 'Géométrie > Géométrie repérée > intersection de deux droites',
		code: '2-319'
	},
	{
		id: '7a3b209d-05b1-400d-98ba-e57d85639d05',
		noeud: 'Géométrie > Vecteurs > colinéarité',
		code: '2-317'
	},
	{
		id: '7c0f1c1a-e415-499c-97ac-cb6060f99105',
		noeud: 'Géométrie > Géométrie repérée > équations de droites',
		code: '2-312'
	},
	{
		id: '7d605742-cf00-4282-b56c-c99aee16ad14',
		noeud: 'Géométrie > Géométrie repérée > vecteur directeur',
		code: '2-311'
	},
	{
		id: '7d6cf480-b062-4e45-a593-2e85fbeb28b3',
		noeud: "Fonctions > Fonctions affines > coefficient directeur et ordonnée à l'origine",
		code: '2-313'
	},
	{
		id: '7f308eb4-40f9-408e-9c71-012464d0f79d',
		noeud: 'Géométrie > Géométrie repérée > équations de droites',
		code: '2-439'
	},
	{
		id: '8d4bd94d-73f7-4589-8b3f-67c84edcf778',
		noeud: 'Géométrie > Géométrie repérée > équations de droites',
		code: '2-316'
	},
	{
		id: 'c23f5a94-269d-4f2d-915a-ca234cec67a6',
		noeud: 'Géométrie > Géométrie repérée > intersection de deux droites',
		code: '2-318'
	},
	{
		id: 'd8a958ba-c6f2-4e6b-b4c9-ee7b370cc03e',
		noeud: 'Géométrie > Géométrie repérée > équations de droites',
		code: '2-440'
	},
	{
		id: 'e6552232-b549-4966-8863-1cba6f945fcc',
		noeud: 'Géométrie > Géométrie repérée > équations de droites',
		code: '2-441'
	},
	{
		id: 'f381c646-80fa-4cd2-86c0-0c3d9ad934be',
		noeud: 'Géométrie > Géométrie repérée > vecteur directeur',
		code: '2-315'
	}
];
const ids = LOT.map((m) => m.id);
/** Date de modification fabriquée : elle ne doit pas bouger (ranger et taguer ne modifient pas le contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

/** Pose l'état de la prod : les copies des modèles, en seconde, sans nœud ni tag. */
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

describe('Questions 2de, lot 5 : nœud et tag des modèles neufs (migration de données)', () => {
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
		expect(apres.tags).toEqual(LOT.map((m) => `${m.id}§2§${m.code}`).sort());
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

describe('Questions 2de, lot 5 : les branches d’échec de la migration', () => {
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
				/identifiants partiellement présents : 15 modèle\(s\) sur 16/
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
					 select $1, id from public.curriculum_points where grade = '2' and code = '2-311' and archived_at is null`,
					[LOT[0].id]
				)
			).rejects.toThrow(/n'est rangé dans aucun nœud de l'arbre/);
		});
	});

	it('un point du lot archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = '2' and code = '2-319' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), 1 point\(s\)/
			);
		});
	});
});
