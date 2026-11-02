/**
 * Chantier « questions-tspe », lot 3 (logarithme, continuité, convexité) : nœud et tags (Supabase local requis)
 * ==================================================================================================
 *
 * Migration `20261102053828_questions_tspe_lot3_rangement_tags` : les 6 brouillons du lot 3, créés
 * le 2026-11-02 par scripts/create-questions.ts (sans nœud ni tag), vont sur une sous-notion
 * existante et reçoivent leur point (TSPE-593, 447, 626, 426, 589, 591). Décisions de David du
 * 2026-11-02 (journal docs/wip/questions-tspe-progress.md § 16).
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

const MIGRATION = 'supabase/migrations/20261102053828_questions_tspe_lot3_rangement_tags.sql';
/** Le lot : identifiant créé en prod le 2026-11-02, nœud et point attendus (« niveau§code »). */
const LOT: { id: string; noeud: string; points: string[] }[] = [
	{
		id: '86c59a05-936c-41a5-a05e-d85ab56a2bfb',
		noeud: 'Fonctions > Logarithmes > dérivée',
		points: ['T_SPE§TSPE-593']
	},
	{
		id: '28ede1b8-76ec-4343-aab3-cd4f5f8a37a2',
		noeud: 'Fonctions > Logarithmes > équations et inéquations',
		points: ['T_SPE§TSPE-447']
	},
	{
		id: '560effd0-8fce-46a7-b59e-bc4988f4f1fc',
		noeud: 'Fonctions > Fonction exponentielle > propriétés algébriques',
		points: ['T_SPE§TSPE-626']
	},
	{
		id: '7ea93a82-d1d2-4dd3-8089-5f58cc1fe08f',
		noeud: 'Fonctions > Continuité > continuité en un point',
		points: ['T_SPE§TSPE-426']
	},
	{
		id: '9102bbb0-1e20-45d0-9af6-575a6a6f1f86',
		noeud: "Fonctions > Convexité > point d'inflexion",
		points: ['T_SPE§TSPE-589']
	},
	{
		id: '5ffe398a-1f35-4681-8b47-e123e3ee03f7',
		noeud: "Fonctions > Convexité > point d'inflexion",
		points: ['T_SPE§TSPE-591']
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

describe('Terminale spé, lot 3 : nœud et tags (migration de données)', () => {
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

	it('chaque modèle est EXACTEMENT sur sa sous-notion', () => {
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

describe('Terminale spé, lot 3 : les branches d’échec de la migration', () => {
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
				/identifiants partiellement présents : 5 modèle\(s\) sur 6/
			);
		});
	});

	it('un modèle rangé à la main depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			const chemins = await cheminsActifs(pg);
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[ids[3], chemins.get('Fonctions > Continuité > continuité en un point')]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles déjà rangés depuis le relevé : 1/
			);
		});
	});

	it('un point du lot archivé (TSPE-626) fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now()
				  where grade = 'T_SPE' and code = 'TSPE-626' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), 1 point\(s\)/
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
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[ids[1], chemins.get('Fonctions > Logarithmes > dérivée')]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : 1 modèle\(s\) sur 6 ne sont plus sur le nœud de la migration/
			);
		});
	});
});
