/**
 * Chantier « ensembles-2de », gros lot « nombres et calculs » : nœud et tag de 36 modèles neufs (Supabase local requis)
 * ====================================================================================================
 *
 * Migration `20261120150926_questions_2de_nombres_rangement_tags` : les 36 brouillons du gros lot,
 * créés le 2026-11-20 par scripts/create-questions.ts (sans nœud ni tag), vont sur leur nœud et
 * reçoivent leur point, un seul (ADR 0020) ; les 5 modèles hors programme sont rangés SANS point.
 * Journal docs/wip/ensembles-2de-progress.md.
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, en seconde, sans nœud ni tag — puis rejoue la migration
 * **depuis son fichier**, dans une transaction annulée à la fin. Les triggers de garde des tags
 * restent actifs : chaque tag posé a passé la règle du nœud.
 *
 * @vitest-environment node
 *
 * @migration-de-donnees : hors des PR, rejoué la nuit (scripts/ci-integration-exclusions.sh)
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

const MIGRATION = 'supabase/migrations/20261120150926_questions_2de_nombres_rangement_tags.sql';
const LONGUEURS = 'Grandeurs et mesures > Longueurs';
/** Le lot : identifiants créés en prod le 2026-11-20, nœud et point attendus (null : hors programme, sans point). */
const LOT: { id: string; noeud: string; code: string | null }[] = [
	{
		id: '10a51999-6d45-41fb-80db-03b70dfeecb8',
		noeud: 'Nombres et calculs > Décimaux : numération > arrondis et ordres de grandeur',
		code: '2-254'
	},
	{
		id: 'ca1a1201-e819-4ad2-8237-dd61c3d1dbc2',
		noeud: 'Nombres et calculs > Décimaux : numération > arrondis et ordres de grandeur',
		code: '2-254'
	},
	{
		id: '51f08367-a8db-4714-a119-821107398cdb',
		noeud: 'Algèbre > Inégalités > comparaison et encadrement',
		code: '2-264'
	},
	{
		id: 'c6634cf8-b7d9-42f6-b12d-a504fd32bc34',
		noeud: 'Ensembles > Ensembles de nombres > intervalles',
		code: '2-244'
	},
	{
		id: 'a0018475-8694-4bfb-8823-b722394687d0',
		noeud: 'Fonctions > Fonction valeur absolue > définition et distance',
		code: '2-420'
	},
	{
		id: '37b3a637-bd6e-46ae-bf85-a19175d41c9a',
		noeud: 'Fonctions > Fonction valeur absolue > équations et inéquations',
		code: null
	},
	{
		id: '896125d8-9c88-44e3-a1eb-9cf070077634',
		noeud: 'Fonctions > Fonction valeur absolue > définition et distance',
		code: null
	},
	{
		id: 'aece0612-6686-46f6-883f-7326cfecd506',
		noeud: 'Algèbre > Calcul littéral > expressions fractionnaires',
		code: '2-272'
	},
	{
		id: '3e4a8f6c-55fe-49d1-bf7d-0ae352e1451a',
		noeud: 'Algèbre > Calcul littéral > expressions fractionnaires',
		code: '2-272'
	},
	{
		id: '7b4a0268-8d79-455c-b8f4-0af1b84a96f3',
		noeud: 'Algèbre > Calcul littéral > expressions fractionnaires',
		code: '2-272'
	},
	{
		id: '9882dc64-40cd-48ce-9681-4e7a3be923c8',
		noeud: 'Algèbre > Calcul littéral > expressions fractionnaires',
		code: '2-272'
	},
	{
		id: 'a5f9a809-4f1e-4b40-a340-13540500cf3f',
		noeud: 'Algèbre > Calcul littéral > expressions fractionnaires',
		code: '2-272'
	},
	{
		id: '502e4f97-26fa-42e1-b247-e9c57b96f664',
		noeud: 'Algèbre > Calcul littéral > expressions fractionnaires',
		code: '2-272'
	},
	{
		id: '46b95c39-fc13-4e8d-a013-50799dbfd666',
		noeud: 'Algèbre > Calcul littéral > expressions fractionnaires',
		code: '2-272'
	},
	{
		id: '3326ea25-4329-40a9-a3e9-536de7abbb47',
		noeud: 'Algèbre > Inégalités > comparaison et encadrement',
		code: '2-264'
	},
	{
		id: 'a1a20304-015a-4c63-807e-aa69a58cbb7d',
		noeud: 'Ensembles > Ensembles de nombres > ℕ, ℤ, 𝔻, ℚ, ℝ',
		code: '2-248'
	},
	{
		id: '2be2c495-9f07-4d76-8e21-65e189c8345d',
		noeud: 'Arithmétique > Divisibilité > multiples et diviseurs',
		code: '2-236'
	},
	{
		id: '943033bf-3420-4660-8941-14bf2c2030d9',
		noeud: 'Arithmétique > Divisibilité > multiples et diviseurs',
		code: '2-236'
	},
	{
		id: '73bceb97-6f47-4e93-97c4-70606e8813a7',
		noeud: 'Arithmétique > Divisibilité > multiples et diviseurs',
		code: null
	},
	{
		id: '0bd51758-ede5-4969-b76a-a6608f4a4df1',
		noeud: 'Arithmétique > Divisibilité > multiples et diviseurs',
		code: null
	},
	{
		id: '8fb1a23a-6e98-4b58-8745-caf5fec3dc88',
		noeud: 'Nombres et calculs > Puissances : calculs',
		code: '2-260'
	},
	{
		id: 'f6d63dfa-94a6-4be7-b19e-367405c574b6',
		noeud: 'Nombres et calculs > Puissances : calculs',
		code: '2-260'
	},
	{
		id: 'f8736002-2920-444f-973f-b365e1c429d5',
		noeud: 'Nombres et calculs > Puissances : calculs',
		code: '2-260'
	},
	{
		id: '747d5773-0e0d-4094-9c3b-11daef5e2463',
		noeud: 'Nombres et calculs > Puissances : calculs',
		code: '2-260'
	},
	{
		id: 'fa0dd978-a74e-4488-bcfd-026aef0288cc',
		noeud: 'Nombres et calculs > Puissances : calculs',
		code: '2-260'
	},
	{
		id: 'fbb2d0da-e126-41ec-b8d1-f0e97bf4f974',
		noeud: 'Nombres et calculs > Puissances : calculs',
		code: '2-260'
	},
	{
		id: 'a80f1a52-d7ad-414e-ad42-6f0f2fe4e761',
		noeud: 'Nombres et calculs > Puissances : calculs',
		code: '2-270'
	},
	{
		id: '0369c9ac-5e72-4175-b40b-a23617f23615',
		noeud: 'Nombres et calculs > Puissances : calculs',
		code: '2-270'
	},
	{
		id: '204ac445-03a6-4c17-b4a3-67704cf664fd',
		noeud: 'Nombres et calculs > Puissances : calculs',
		code: '2-270'
	},
	{
		id: '516273a4-899d-4e12-8fe6-6cc1fa055442',
		noeud: 'Nombres et calculs > Racines carrées : calculs > propriétés',
		code: '2-261'
	},
	{
		id: '5ddd58db-f08b-44d4-bc9c-67ee47250ace',
		noeud: 'Nombres et calculs > Racines carrées : calculs > propriétés',
		code: '2-261'
	},
	{
		id: '4c79b893-f663-4e49-9e33-9fd3bacb7e3b',
		noeud: 'Nombres et calculs > Racines carrées : calculs > propriétés',
		code: '2-261'
	},
	{
		id: 'db1834a6-3374-47bd-94c9-87c9aa263604',
		noeud: 'Nombres et calculs > Racines carrées : calculs > propriétés',
		code: '2-261'
	},
	{
		id: '9f01ca57-6330-40b6-a423-997ff357a6f3',
		noeud: 'Nombres et calculs > Décimaux : numération > arrondis et ordres de grandeur',
		code: '2-254'
	},
	{
		id: 'c7840c10-3e06-4aa7-ab97-257f80cd16d2',
		noeud: 'Algèbre > Inégalités > comparaison et encadrement',
		code: '2-264'
	},
	{
		id: '96ede34c-259b-43f0-b920-d9e90003576e',
		noeud: 'Nombres et calculs > Racines carrées : calculs > techniques de calcul',
		code: null
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

describe('Questions 2de, nombres et calculs : nœud et tag des modèles neufs (migration de données)', () => {
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

	it('chaque modèle porte EXACTEMENT son point, rien de plus ; les hors programme aucun', () => {
		expect(apres.tags).toEqual(
			LOT.filter((m) => m.code !== null)
				.map((m) => `${m.id}§2§${m.code}`)
				.sort()
		);
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

describe('Questions 2de, nombres et calculs : les branches d’échec de la migration', () => {
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
			await pg.query('delete from public.question_templates where id = any($1::uuid[])', [ids]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).resolves.toBeDefined();
		});
	});

	it('TOUT ou RIEN : un modèle manquant fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_templates where id = $1', [ids[0]]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/identifiants partiellement présents : 35 modèle\(s\) sur 36/
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
					 select $1, id from public.curriculum_points where grade = '2' and code = '2-254' and archived_at is null`,
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
				  where kind = 'notion' and name = 'Puissances : calculs' and archived_at is null`
			);
			// 9 modèles rangés sur la notion « Puissances : calculs », tous avec un point (2-260, 2-270)
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 9 nœud\(s\), 9 point\(s\)/
			);
		});
	});

	it('un point du lot archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = '2' and code = '2-248' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), 1 point\(s\)/
			);
		});
	});
});
