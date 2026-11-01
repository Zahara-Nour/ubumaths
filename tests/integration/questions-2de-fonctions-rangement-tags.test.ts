/**
 * Chantier « questions-2de », lot 6 : nœud et tag de 20 modèles neufs (Supabase local requis)
 * =======================================================================================
 *
 * Migration `20261101213600_questions_2de_fonctions_rangement_tags` : les 20 brouillons
 * « fonctions de référence, résolutions » (lots 6 A, 6 B et 6 C) créés le 2026-11-01 par scripts/create-questions.ts
 * (sans nœud ni tag) vont sur le nœud de leur point et reçoivent ce point, un seul (ADR 0020).
 * Phase 0 : journal docs/wip/questions-2de-progress.md § 37.
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

const MIGRATION = 'supabase/migrations/20261101213600_questions_2de_fonctions_rangement_tags.sql';
const LONGUEURS = 'Grandeurs et mesures > Longueurs';
/** Le lot : identifiant créé en prod le 2026-11-01, nœud et points attendus. */
const LOT: { id: string; noeud: string; code: string }[] = [
	{
		id: '05e8453d-71c7-443b-8045-72291ed5e860',
		noeud: 'Fonctions > Fonction racine carrée > √x = k, √x < k',
		code: '2-467'
	},
	{
		id: '1048e462-5585-4cf1-8915-2c6d7bf95244',
		noeud: 'Fonctions > Fonction inverse > définition et courbe',
		code: '2-335'
	},
	{
		id: '214f91c0-997a-4086-9fd9-747f0311ca30',
		noeud: 'Fonctions > Fonction inverse > 1/x = k, 1/x < k',
		code: '2-466'
	},
	{
		id: '2a249385-5832-40da-b1f4-afe13707d2c3',
		noeud: 'Fonctions > Généralités sur les fonctions > équations et inéquations f(x) = k',
		code: '2-336'
	},
	{
		id: '345beb60-d98f-4392-8470-cfe1414a6e03',
		noeud: 'Fonctions > Généralités sur les fonctions',
		code: '2-325'
	},
	{
		id: '37f39db3-985b-4ee9-84e1-ad28afeb59df',
		noeud: 'Fonctions > Fonction carré > x² = k, x² < k',
		code: '2-461'
	},
	{
		id: '42c19a19-4533-4dc5-81a3-2dba70b5cdb4',
		noeud: 'Fonctions > Généralités sur les fonctions > appartenance à une courbe',
		code: '2-327'
	},
	{
		id: '602bd8d7-589e-4bf5-9b8c-40f113b5e219',
		noeud: 'Fonctions > Fonction carré > définition et courbe',
		code: '2-334'
	},
	{
		id: '80a87e34-251c-481a-a086-7b7add231cc9',
		noeud: 'Fonctions > Fonction valeur absolue > équations et inéquations',
		code: '2-460'
	},
	{
		id: '811f6004-df26-437a-976d-3ac11eec62be',
		noeud: 'Fonctions > Fonction cube > x³ = k, x³ < k',
		code: '2-472'
	},
	{
		id: '8bc8159f-1095-4b71-ba96-329ffe90471b',
		noeud: 'Fonctions > Fonction carré > x² = k, x² < k',
		code: '2-463'
	},
	{
		id: '9723b1e4-ff05-4b08-961a-5207bc879cce',
		noeud: 'Fonctions > Généralités sur les fonctions > ensemble de définition',
		code: '2-326'
	},
	{
		id: 'aeaff491-9215-47c0-aba1-c021a335d6d0',
		noeud: 'Fonctions > Fonctions affines > équations',
		code: '2-457'
	},
	{
		id: 'b44e582b-a999-43c0-873a-16309427bf59',
		noeud: 'Fonctions > Fonction valeur absolue',
		code: '2-333'
	},
	{
		id: 'bcfbf5f8-367e-4927-8041-489acaeb9831',
		noeud: 'Fonctions > Généralités sur les fonctions > appartenance à une courbe',
		code: '2-331'
	},
	{
		id: 'cd8f96ba-2aab-4e4f-b0ff-de7dd4713b54',
		noeud: 'Fonctions > Fonction racine carrée > √x = k, √x < k',
		code: '2-469'
	},
	{
		id: 'd49de3f3-05c3-4986-8825-9e13b4544161',
		noeud: 'Fonctions > Fonctions affines > équations',
		code: '2-455'
	},
	{
		id: 'd86c9577-898c-4c0b-8fc0-bf789c20bc89',
		noeud: 'Fonctions > Généralités sur les fonctions > équations et inéquations f(x) = k',
		code: '2-448'
	},
	{
		id: 'ddc60d24-ddce-473b-8e23-58af62ec8b78',
		noeud: 'Fonctions > Généralités sur les fonctions > appartenance à une courbe',
		code: '2-447'
	},
	{
		id: 'e7b37987-fcb4-42e1-b133-b3b83ba55865',
		noeud: 'Fonctions > Fonction cube > x³ = k, x³ < k',
		code: '2-470'
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

describe('Questions 2de, lot 6 : nœud et tag des modèles neufs (migration de données)', () => {
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

describe('Questions 2de, lot 6 : les branches d’échec de la migration', () => {
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
				/identifiants partiellement présents : 19 modèle\(s\) sur 20/
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
					 select $1, id from public.curriculum_points where grade = '2' and code = '2-325' and archived_at is null`,
					[LOT[0].id]
				)
			).rejects.toThrow(/n'est rangé dans aucun nœud de l'arbre/);
		});
	});

	it('un point du lot archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = '2' and code = '2-472' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), 1 point\(s\)/
			);
		});
	});
});
