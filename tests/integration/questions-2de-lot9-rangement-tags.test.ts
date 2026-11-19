/**
 * Chantier « questions-2de », lot 9 : nœud et tag de 18 modèles neufs (Supabase local requis)
 * ====================================================================================================
 *
 * Migration `20261103135331_questions_2de_lot9_rangement_tags` : les 18 brouillons du lot 9 (nombres
 * réels, arithmétique, intervalles), créés le 2026-11-03 par scripts/create-questions.ts (sans nœud ni
 * tag), vont sur le nœud de leur point et reçoivent ce point, un seul (ADR 0020). Journal
 * docs/wip/questions-2de-progress.md § 66.
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

const MIGRATION = 'supabase/migrations/20261103135331_questions_2de_lot9_rangement_tags.sql';
const LONGUEURS = 'Grandeurs et mesures > Longueurs';
/** Le lot : identifiants créés en prod le 2026-11-03, nœud et point attendus. */
const LOT: { id: string; noeud: string; code: string }[] = [
	{
		id: 'be39c27d-41f6-41ba-821d-70c25dd50a5e',
		noeud: 'Ensembles > Ensembles de nombres > ℕ, ℤ, 𝔻, ℚ, ℝ',
		code: '2-235'
	},
	{
		id: 'fa65910d-147f-447f-b846-8e7348e58ed0',
		noeud: 'Arithmétique > Divisibilité > multiples et diviseurs',
		code: '2-236'
	},
	{
		id: '5e6ce5a3-2071-4c79-9995-9eacd5944477',
		noeud: 'Arithmétique > Divisibilité > multiples et diviseurs',
		code: '2-418'
	},
	{
		id: 'd264f7aa-1867-43cc-93e1-f66912786117',
		noeud: 'Arithmétique > Divisibilité > pair ou impair',
		code: '2-419'
	},
	{
		id: '53c55b4a-d109-4ad1-8142-2f8568eb7407',
		noeud: 'Arithmétique > Divisibilité',
		code: '2-237'
	},
	{
		id: 'bfcbf381-d454-41f3-9097-939f72c0df16',
		noeud: 'Ensembles > Ensembles de nombres > ℕ, ℤ, 𝔻, ℚ, ℝ',
		code: '2-243'
	},
	{
		id: 'd7392618-e2e9-4c4e-a4ff-188f4e9f6be1',
		noeud: 'Ensembles > Ensembles de nombres > ℕ, ℤ, 𝔻, ℚ, ℝ',
		code: '2-247'
	},
	{
		id: 'b6ece43a-7394-4074-83f9-ab61a7fc155e',
		noeud: 'Ensembles > Ensembles de nombres > ℕ, ℤ, 𝔻, ℚ, ℝ',
		code: '2-248'
	},
	{
		id: '30585711-5e3e-40b1-a910-7f5d60b48980',
		noeud: 'Ensembles > Ensembles de nombres > nombres irrationnels',
		code: '2-422'
	},
	{
		id: 'b720edd7-fe00-4ff7-a26a-f23b4dbd72ec',
		noeud: 'Ensembles > Ensembles de nombres > intervalles',
		code: '2-407'
	},
	{
		id: '98eee50d-af83-4663-91db-e71129ff1469',
		noeud: 'Ensembles > Ensembles de nombres > intervalles',
		code: '2-252'
	},
	{
		id: '2069ac7e-ce15-41f3-9b8d-b0ff52fdcb68',
		noeud: 'Ensembles > Ensembles de nombres > intervalles',
		code: '2-251'
	},
	{
		id: 'f4a12cab-b62e-473e-92f0-b5cdc7e82d19',
		noeud: 'Fonctions > Fonction valeur absolue > équations et inéquations',
		code: '2-246'
	},
	{
		id: 'a692569a-ec38-413b-a774-4991d8c88b94',
		noeud: 'Ensembles > Ensembles de nombres > ℕ, ℤ, 𝔻, ℚ, ℝ',
		code: '2-249'
	},
	{
		id: '3b0a04c0-1af8-4040-9537-0aef99b31dd0',
		noeud: 'Ensembles > Ensembles de nombres > ℕ, ℤ, 𝔻, ℚ, ℝ',
		code: '2-250'
	},
	{
		id: 'c99ae1e8-25bd-4cf4-b2ed-dbcf2b3c672d',
		noeud: 'Nombres et calculs > Décimaux : numération > encadrement',
		code: '2-421'
	},
	{
		id: '7d411132-aecc-4788-bb06-9c9d27012e1f',
		noeud: 'Nombres et calculs > Décimaux : numération > encadrement',
		code: '2-253'
	},
	{
		id: '22b0a9d6-2d43-4db8-a3be-599b9f9e3a37',
		noeud: 'Nombres et calculs > Décimaux : numération > arrondis et ordres de grandeur',
		code: '2-254'
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

describe('Questions 2de, lot 9 : nœud et tag des modèles neufs (migration de données)', () => {
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

describe('Questions 2de, lot 9 : les branches d’échec de la migration', () => {
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
				/identifiants partiellement présents : 17 modèle\(s\) sur 18/
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
					 select $1, id from public.curriculum_points where grade = '2' and code = '2-235' and archived_at is null`,
					[LOT[0].id]
				)
			).rejects.toThrow(/n'est rangé dans aucun nœud de l'arbre/);
		});
	});

	it('un point du lot archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = '2' and code = '2-235' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), 1 point\(s\)/
			);
		});
	});
});
