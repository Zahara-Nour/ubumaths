/**
 * Chantier « questions-tspe-lot9 » (espace sur figure) : nœud et tags (Supabase local requis)
 * ================================================================================================
 *
 * Migration `20261103131044_questions_tspe_lot9_rangement_tags` : les 8 brouillons du lot 9, créés
 * le 2026-11-03 par scripts/create-questions.ts (sans nœud ni tag), vont sur un nœud existant de
 * « Géométrie > Espace » et reçoivent leur point (TSPE-335, 336, 337, 338, 339, 551, 552, 553) ;
 * F8 (TSPE-339) va sur la notion « Espace » elle-même, où le point est rangé.
 * Phase 0 validée par David le 2026-11-03 (D-L9, journal docs/wip/questions-tspe-lot9-progress.md).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, en [T_SPE], sans nœud ni tag — puis rejoue la migration
 * **depuis son fichier**, dans une transaction annulée à la fin. Les triggers de garde des tags
 * restent actifs : chaque tag posé a passé la règle du nœud (point sur le nœud ou sa notion).
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
	/** Chemins des sous-notions actives (toutes). */
	chemins: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261103131044_questions_tspe_lot9_rangement_tags.sql';
/** Le lot : identifiant créé en prod le 2026-11-03, nœud et point attendus (« niveau§code »). */
const LOT: { id: string; noeud: string; points: string[] }[] = [
	{
		id: 'd7a361ca-3a71-430a-82e4-720a1b14c0ad',
		noeud: 'Géométrie > Espace > coplanarité et décomposition',
		points: ['T_SPE§TSPE-335']
	},
	{
		id: '63669e60-3140-4f55-8d5e-cc9d390adaf1',
		noeud: 'Géométrie > Espace > coplanarité et décomposition',
		points: ['T_SPE§TSPE-338']
	},
	{
		id: '4c19f2cb-1c90-4b43-83ad-521ee4edb1f0',
		noeud: 'Géométrie > Espace > coplanarité et décomposition',
		points: ['T_SPE§TSPE-337']
	},
	{
		id: 'f9df1cd9-9791-42a3-bb5f-c0c84ad84d9c',
		noeud: 'Géométrie > Espace > coplanarité et décomposition',
		points: ['T_SPE§TSPE-553']
	},
	{
		id: 'd6d9d5f7-8af1-45ba-aa9f-fb5f9e0fc82e',
		noeud: 'Géométrie > Espace > positions relatives et intersections',
		points: ['T_SPE§TSPE-336']
	},
	{
		id: 'f61cd451-0435-4fa7-ba72-93b1f98f65b8',
		noeud: 'Géométrie > Espace > positions relatives et intersections',
		points: ['T_SPE§TSPE-551']
	},
	{
		id: '14a02a32-092f-4c1c-83cc-44f912c66f43',
		noeud: 'Géométrie > Espace > positions relatives et intersections',
		points: ['T_SPE§TSPE-552']
	},
	{
		id: 'a45a315b-9610-4452-9ab3-df00d5eb24bf',
		noeud: 'Géométrie > Espace',
		points: ['T_SPE§TSPE-339']
	}
];
const ids = LOT.map((m) => m.id);
/** Date de modification fabriquée : elle ne doit pas bouger (ranger et taguer ne modifient pas le contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

async function cheminsActifs(pg: Client): Promise<Map<string, string>> {
	const parChemin = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) {
		if (!node.archived) parChemin.set(node.path, id);
	}
	return parChemin;
}

/** Pose l'état de la prod : les copies des modèles, en [T_SPE], sans nœud ni tag. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: ids,
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	await pg.query(
		'alter table public.question_templates disable trigger update_question_templates_updated_at'
	);
	await pg.query(
		`update public.question_templates set grades = array['T_SPE'], classification_node_id = null
		  where id = any($1::uuid[])`,
		[ids]
	);
	await pg.query(
		'alter table public.question_templates enable trigger update_question_templates_updated_at'
	);
}

async function lireEtat(pg: Client): Promise<Etat> {
	const chemins = new Map<string, string>();
	const sousNotions: string[] = [];
	for (const [id, node] of await readNodePaths(pg)) {
		chemins.set(id, node.path);
		if (!node.archived && node.path.split(' > ').length === 3) sousNotions.push(node.path);
	}
	const q = await pg.query<{ id: string; node: string | null; updated_at: Date }>(
		'select id, classification_node_id as node, updated_at from public.question_templates where id = any($1::uuid[])',
		[ids]
	);
	const t = await pg.query<{ template_id: string; grade: string; code: string }>(
		`select q.template_id, p.grade, p.code from public.question_template_points q
		   join public.curriculum_points p on p.id = q.point_id where q.template_id = any($1::uuid[])`,
		[ids]
	);
	return {
		noeuds: new Map(q.rows.map((r) => [r.id, chemins.get(r.node ?? '') ?? '∅'])),
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()])),
		tags: t.rows.map((r) => `${r.template_id}§${r.grade}§${r.code}`).sort(),
		chemins: sousNotions.sort()
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('Terminale spé, lot 9 (espace sur figure) : nœud et tags (migration de données)', () => {
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

	it('l’arbre des notions ne change pas (aucune sous-notion neuve)', () => {
		expect(apres.chemins).toEqual(avant.chemins);
	});

	it('chaque modèle est EXACTEMENT sur son nœud (F8 sur la notion « Espace »)', () => {
		expect(LOT.map((m) => apres.noeuds.get(m.id))).toEqual(LOT.map((m) => m.noeud));
	});

	it('chaque modèle porte EXACTEMENT son point, rien de plus', () => {
		expect(apres.tags).toEqual(LOT.flatMap((m) => m.points.map((p) => `${m.id}§${p}`)).sort());
	});

	it('`updated_at` des modèles est préservé', () => {
		expect([...apres.dates.values()]).toEqual(ids.map(() => AVANT));
	});

	it('le rollback écrit dans la migration rend l’état d’avant (sans nœud, sans tag)', () => {
		expect(annule.tags).toEqual([]);
		expect(LOT.map((m) => annule.noeuds.get(m.id))).toEqual(LOT.map(() => '∅'));
		expect([...annule.dates.values()]).toEqual(ids.map(() => AVANT));
		expect(annule.chemins).toEqual(avant.chemins);
	});
});

describe('Terminale spé, lot 9 (espace sur figure) : les branches d’échec de la migration', () => {
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

	it('base sans les modèles (locale) : la migration passe sans rien toucher', async () => {
		await enTransaction(async () => {
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).resolves.toBeDefined();
		});
	});

	it('TOUT ou RIEN : un modèle manquant fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_templates where id = $1', [ids[0]]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/identifiants partiellement présents : 7 modèle\(s\) sur 8/
			);
		});
	});

	it('un modèle rangé à la main depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			const chemins = await cheminsActifs(pg);
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[ids[2], chemins.get('Géométrie > Espace > coordonnées')]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles déjà rangés depuis le relevé : 1/
			);
		});
	});

	it('un modèle tagué à la main depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			const chemins = await cheminsActifs(pg);
			const noeud = chemins.get(LOT[1].noeud);
			expect(noeud).toBeDefined();
			// Un tag exige un nœud (trigger), et un modèle tagué ne peut plus perdre le sien : l'état
			// « tagué sans nœud » ne se fabrique pas. Un modèle tagué à la main est donc arrêté par la
			// garde du nœud, qui passe avant celle des tags.
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[ids[1], noeud]
			);
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points
				  where grade = 'T_SPE' and code = 'TSPE-338' and archived_at is null`,
				[ids[1]]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles déjà rangés depuis le relevé : 1/
			);
		});
	});

	it('un point du lot archivé (TSPE-552) fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now()
				  where grade = 'T_SPE' and code = 'TSPE-552' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), 1 point\(s\)/
			);
		});
	});

	it('la notion Espace a reçu une sous-notion neuve : la migration échoue (F8 irait sur la notion)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			const chemins = await cheminsActifs(pg);
			const espace = chemins.get('Géométrie > Espace');
			expect(espace).toBeDefined();
			await pg.query(
				`insert into public.classification_nodes (kind, parent_id, name, position)
				 values ('subnotion', $1, 'sous-notion ajoutée depuis le relevé', 99)`,
				[espace]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/notion visée sans sous-notion, mais elle en a une non admise : 1 modèle\(s\)/
			);
		});
	});

	it('rollback refusé si un modèle du lot a été déplacé depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query('delete from public.question_template_points where template_id = $1', [
				ids[1]
			]);
			const chemins = await cheminsActifs(pg);
			const ailleurs = chemins.get('Géométrie > Espace > coordonnées');
			// Le chemin doit exister : sinon le modèle serait « déplacé » vers aucun nœud
			expect(ailleurs).toBeDefined();
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[ids[1], ailleurs]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : 1 modèle\(s\) sur 8 ne sont plus sur le nœud de la migration/
			);
		});
	});
});
