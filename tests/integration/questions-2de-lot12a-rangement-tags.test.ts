/**
 * Chantier « questions-2de », lot 12 a : nœud et tag de 14 modèles neufs (Supabase local requis)
 * ====================================================================================================
 *
 * Migration `20261103225125_questions_2de_lot12a_rangement_tags` : les 14 brouillons du lot 12 a
 * (inégalités, comparaisons, algèbre), créés le 2026-11-03 par scripts/create-questions.ts (sans nœud ni
 * tag), vont sur leur sous-notion et reçoivent leur point, un seul (ADR 0020) ; le point est sur ce nœud,
 * ou sur sa notion (2-275, 2-278, 2-489). Journal docs/wip/questions-2de-progress.md § 71.
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

const MIGRATION = 'supabase/migrations/20261103225125_questions_2de_lot12a_rangement_tags.sql';
const LONGUEURS = 'Grandeurs et mesures > Longueurs';
/** Le lot : identifiants créés en prod le 2026-11-03, nœud et point attendus. */
const LOT: { id: string; noeud: string; code: string }[] = [
	{
		id: '57585d68-65d1-42ce-b146-99b924b517b3',
		noeud: 'Algèbre > Inégalités > règles de calcul',
		code: '2-263'
	},
	{
		id: 'd15b096f-50d8-49c5-9b5b-9d9363d55f1d',
		noeud: 'Algèbre > Inégalités > règles de calcul',
		code: '2-424'
	},
	{
		id: '9660771f-b3e2-47ad-8f11-9afc4a0f3927',
		noeud: 'Algèbre > Inégalités > comparaison et encadrement',
		code: '2-264'
	},
	{
		id: 'd8b9e814-6dd9-4719-bc1f-a14d1bbfcdc2',
		noeud: 'Algèbre > Inégalités > comparaison et encadrement',
		code: '2-425'
	},
	{
		id: '5ffcde13-e2e7-43a6-8cfb-0004e7f2295d',
		noeud: 'Algèbre > Inégalités > comparaison et encadrement',
		code: '2-276'
	},
	{
		id: '313ae1a2-1bfb-4da6-bcdd-8487bc4a84a2',
		noeud: 'Algèbre > Inégalités > comparaison et encadrement',
		code: '2-427'
	},
	{
		id: '52516a54-40e9-48e9-ac86-8a91d388dd46',
		noeud: 'Algèbre > Inégalités > comparaison et encadrement',
		code: '2-277'
	},
	{
		id: '1d25a492-f7c9-4108-bbf7-5fbd512c0813',
		noeud: 'Algèbre > Inégalités > comparaison et encadrement',
		code: '2-428'
	},
	{
		id: '9ed8c72e-60b7-4960-bbbc-fa766f11fd66',
		noeud: 'Algèbre > Équations : produit et quotient > équation quotient',
		code: '2-269'
	},
	{
		id: 'ec690625-2ca4-443e-ac1f-563c99219df6',
		noeud: 'Algèbre > Calcul littéral > isoler une variable',
		code: '2-273'
	},
	{
		id: 'd7aa3f33-53fb-4529-98da-c8a64a3f0281',
		noeud: 'Algèbre > Calcul littéral > isoler une variable',
		code: '2-274'
	},
	{
		id: '610a25fb-c317-4790-857b-6f9dd3b91648',
		noeud: 'Algèbre > Calcul littéral > factorisation',
		code: '2-275'
	},
	{
		id: 'ab668c94-7f69-4cb9-9d50-cdeec974af6c',
		noeud: 'Algèbre > Inéquations : premier degré > ax + b < c',
		code: '2-278'
	},
	{
		id: '36a37542-6efd-473d-9d2b-37227e1bcc2f',
		noeud: 'Algèbre > Calcul littéral > écriture simplifiée',
		code: '2-489'
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

describe('Questions 2de, lot 12 a : nœud et tag des modèles neufs (migration de données)', () => {
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

	it('chaque modèle est EXACTEMENT sur sa sous-notion', () => {
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

describe('Questions 2de, lot 12 a : les branches d’échec de la migration', () => {
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
					 select $1, id from public.curriculum_points where grade = '2' and code = '2-263' and archived_at is null`,
					[LOT[0].id]
				)
			).rejects.toThrow(/n'est rangé dans aucun nœud de l'arbre/);
		});
	});

	it('un point du lot archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = '2' and code = '2-263' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), 1 point\(s\)/
			);
		});
	});
});
