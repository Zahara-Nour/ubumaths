/**
 * Chantier « questions-2de », lot 11 : nœud et tag de 15 modèles neufs (Supabase local requis)
 * ====================================================================================================
 *
 * Migration `20261106050048_questions_2de_lot11_rangement_tags` : les 15 brouillons des lots 11 A
 * (variables et instructions) et 11 B (fonctions), créés les 2026-11-05 et 2026-11-06 par
 * scripts/create-questions.ts (sans nœud ni tag), vont sur leur nœud et reçoivent leur point, un seul
 * (ADR 0020). Journal docs/wip/questions-2de-progress.md § 87.
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, en seconde, sans nœud ni tag — puis rejoue la migration
 * **depuis son fichier**, dans une transaction annulée à la fin. Les triggers de garde des tags
 * restent actifs : chaque tag posé a passé la règle du nœud.
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

const MIGRATION = 'supabase/migrations/20261106050048_questions_2de_lot11_rangement_tags.sql';
const LONGUEURS = 'Grandeurs et mesures > Longueurs';
/** Le lot : identifiants créés en prod les 2026-11-05 et 2026-11-06, nœud et point attendus. */
const LOT: { id: string; noeud: string; code: string }[] = [
	{
		id: 'b7785962-b3a1-491b-988d-fcff7707ef29',
		noeud: 'Algorithmique > Variables et instructions > types',
		code: '2-218'
	},
	{
		id: 'b3db9b3c-67e3-4031-8489-80836c988654',
		noeud: 'Algorithmique > Variables et instructions > types',
		code: '2-223'
	},
	{
		id: '1bb39e2d-4b9c-4fe2-b434-bfc06894f871',
		noeud: 'Algorithmique > Variables et instructions > variables et affectation',
		code: '2-219'
	},
	{
		id: 'bfdb42c0-5157-458b-b3f9-00e4deac849c',
		noeud: 'Algorithmique > Variables et instructions > variables et affectation',
		code: '2-220'
	},
	{
		id: '3f4c0e5f-d2dc-4004-a471-bab7e6350514',
		noeud: 'Algorithmique > Variables et instructions > variables et affectation',
		code: '2-224'
	},
	{
		id: '5bd3323d-8cf5-4f62-a4a8-15d6245494ab',
		noeud: 'Algorithmique > Variables et instructions > instructions conditionnelles',
		code: '2-221'
	},
	{
		id: 'e2cc8a48-5b81-4909-9d8c-5000fc4340b8',
		noeud: 'Algorithmique > Variables et instructions > instructions conditionnelles',
		code: '2-415'
	},
	{
		id: '2ffa6d80-d62d-4de5-87f1-fcbb3fea7438',
		noeud: 'Algorithmique > Boucles > boucle bornée',
		code: '2-222'
	},
	{
		id: '3cacefc5-59a1-498e-a453-fc25369110f9',
		noeud: 'Algorithmique > Boucles > boucle non bornée',
		code: '2-413'
	},
	{
		id: '8f0bbf63-6861-453d-acf1-a942dbf7e67c',
		noeud: 'Algorithmique > Variables et instructions',
		code: '2-228'
	},
	{
		id: 'da04078f-0afb-4ca3-910e-45cb480e3b48',
		noeud: 'Algorithmique > Fonctions Python > définir une fonction',
		code: '2-229'
	},
	{
		id: '8d46dd50-34ea-4504-b92f-d269a84f0179',
		noeud: 'Algorithmique > Fonctions Python > appeler une fonction',
		code: '2-416'
	},
	{
		id: 'e4784c78-13d5-49ac-b50b-b07efca03d19',
		noeud: 'Algorithmique > Fonctions Python > définir une fonction',
		code: '2-232'
	},
	{
		id: '4ce02817-c5b4-4500-9d0c-0bbf7be0a662',
		noeud: 'Algorithmique > Fonctions Python > définir une fonction',
		code: '2-233'
	},
	{
		id: 'f77e86cf-e00f-41e7-a214-2b5ccefecf01',
		noeud: 'Algorithmique > Fonctions Python > définir une fonction',
		code: '2-417'
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

describe('Questions 2de, lot 11 : nœud et tag des modèles neufs (migration de données)', () => {
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

	it('chaque modèle est EXACTEMENT sur son nœud', () => {
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

describe('Questions 2de, lot 11 : les branches d’échec de la migration', () => {
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
				/identifiants partiellement présents : 14 modèle\(s\) sur 15/
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
					 select $1, id from public.curriculum_points where grade = '2' and code = '2-218' and archived_at is null`,
					[LOT[0].id]
				)
			).rejects.toThrow(/n'est rangé dans aucun nœud de l'arbre/);
		});
	});

	it('une notion visée renommée fait échouer la migration (branche « notion », résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.classification_nodes set name = name || ' (renommée)'
				  where kind = 'notion' and name = 'Variables et instructions' and archived_at is null`
			);
			// 2-228 (sur la notion), 2-218, 2-223, 2-219, 2-220, 2-224, 2-221, 2-415 (sous-notions)
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 8 nœud\(s\), 8 point\(s\)/
			);
		});
	});

	it('un point du lot archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = '2' and code = '2-218' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), 1 point\(s\)/
			);
		});
	});
});
