/**
 * Chantier « questions-2de », lot 7 : nœud et tag de 21 modèles neufs (Supabase local requis)
 * =======================================================================================
 *
 * Migration `20261101224703_questions_2de_signes_variations_rangement_tags` : les 21 brouillons
 * « signes et variations » (lots 7 A, 7 B et 7 C) créés le 2026-11-01 par scripts/create-questions.ts
 * (sans nœud ni tag) vont sur le nœud de leur point et reçoivent ce point, un seul (ADR 0020).
 * Phase 0 : journal docs/wip/questions-2de-progress.md § 44.
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

const MIGRATION =
	'supabase/migrations/20261101224703_questions_2de_signes_variations_rangement_tags.sql';
const LONGUEURS = 'Grandeurs et mesures > Longueurs';
/** Le lot : identifiant créé en prod le 2026-11-01, nœud et points attendus. */
const LOT: { id: string; noeud: string; code: string }[] = [
	{
		id: '0cecc7f2-9741-4d83-ad08-99b5d0c3007c',
		noeud: 'Fonctions > Généralités sur les fonctions > signe',
		code: '2-329'
	},
	{
		id: '118c4696-2486-4ab8-9012-e27ab1986e50',
		noeud: 'Algèbre > Inéquations : produit et quotient > tableau de signes',
		code: '2-451'
	},
	{
		id: '23908ef7-a9ac-4218-a8a7-5faf479a8158',
		noeud: 'Fonctions > Fonction valeur absolue',
		code: '2-475'
	},
	{
		id: '275cb665-f0ab-4649-8188-df9ae44bb322',
		noeud: 'Fonctions > Généralités sur les fonctions > variations',
		code: '2-477'
	},
	{
		id: '284bc012-619b-4692-b0b0-6a26097ca326',
		noeud: 'Algèbre > Inéquations : produit et quotient > tableau de signes',
		code: '2-449'
	},
	{
		id: '3810a06c-a433-41f6-9fbc-533c2acfaf4f',
		noeud: 'Fonctions > Généralités sur les fonctions > variations',
		code: '2-349'
	},
	{
		id: '39154ac5-b4b2-4995-a953-ab980156bce1',
		noeud: 'Fonctions > Généralités sur les fonctions > extremums',
		code: '2-350'
	},
	{
		id: '4f887f53-263e-4ef3-b497-b3b50d83ec59',
		noeud: 'Fonctions > Généralités sur les fonctions > variations',
		code: '2-356'
	},
	{
		id: '6670b161-4120-44a4-a6fd-22c8db71d2a1',
		noeud: 'Fonctions > Fonctions affines > variations et signe',
		code: '2-352'
	},
	{
		id: '6bb5ff09-34ba-401b-a7d5-8edb76d9dee0',
		noeud: 'Algèbre > Inéquations : produit et quotient > tableau de signes',
		code: '2-268'
	},
	{
		id: '71174c9c-2ab7-4829-9f0f-d8e81e2eb7a8',
		noeud: 'Algèbre > Inéquations : produit et quotient > tableau de signes',
		code: '2-450'
	},
	{
		id: '71c7933f-edca-45b8-9847-b180a8c05196',
		noeud: 'Fonctions > Généralités sur les fonctions > signe',
		code: '2-476'
	},
	{
		id: '752c6c5e-8bb3-4e35-9d94-1447a07a2cf4',
		noeud: 'Fonctions > Fonction valeur absolue > variations',
		code: '2-354'
	},
	{
		id: '80826238-a393-4840-b6be-b115dbfae8d7',
		noeud: 'Algèbre > Inéquations : produit et quotient > tableau de signes',
		code: '2-426'
	},
	{
		id: '93bc8b5e-b2a5-4793-b64e-271601504498',
		noeud: 'Fonctions > Généralités sur les fonctions > variations',
		code: '2-345'
	},
	{
		id: '9c7ab1c7-d3f3-4c78-96f4-c14e5a657574',
		noeud: 'Algèbre > Inéquations : produit et quotient > tableau de signes',
		code: '2-446'
	},
	{
		id: '9e35f8ba-9427-40ad-a62a-13422f50442b',
		noeud: 'Fonctions > Généralités sur les fonctions > variations',
		code: '2-473'
	},
	{
		id: 'a1cd5403-c607-42d2-a49d-a73d076e1f16',
		noeud: 'Fonctions > Fonction carré > variations',
		code: '2-355'
	},
	{
		id: 'd80a7d42-d377-415e-b5b1-5fc0a0b01b5a',
		noeud: 'Algèbre > Inéquations : produit et quotient > tableau de signes',
		code: '2-337'
	},
	{
		id: 'e372112e-c0f1-4b8d-9fad-cf84372bd1dc',
		noeud: 'Fonctions > Généralités sur les fonctions > extremums',
		code: '2-346'
	},
	{
		id: 'f0163416-0610-49cc-bf2d-83db744dbf43',
		noeud: 'Algèbre > Inéquations : produit et quotient > tableau de signes',
		code: '2-330'
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

describe('Questions 2de, lot 7 : nœud et tag des modèles neufs (migration de données)', () => {
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

describe('Questions 2de, lot 7 : les branches d’échec de la migration', () => {
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
				/identifiants partiellement présents : 20 modèle\(s\) sur 21/
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
					 select $1, id from public.curriculum_points where grade = '2' and code = '2-329' and archived_at is null`,
					[LOT[0].id]
				)
			).rejects.toThrow(/n'est rangé dans aucun nœud de l'arbre/);
		});
	});

	it('un point du lot archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = '2' and code = '2-477' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), 1 point\(s\)/
			);
		});
	});
});
