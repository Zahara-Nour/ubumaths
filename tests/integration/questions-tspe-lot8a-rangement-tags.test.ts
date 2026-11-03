/**
 * Chantier « questions-tspe-restes », lot 8a (« à savoir ») : nœud et tags (Supabase local requis)
 * ================================================================================================
 *
 * Migration `20261102204034_questions_tspe_lot8a_rangement_tags` : les 11 brouillons du lot 8a, créés
 * le 2026-11-02 par scripts/create-questions.ts (sans nœud ni tag), vont sur une sous-notion
 * existante et reçoivent leur point (TSPE-381, 570, 400, 401, 410, 411, 585, 428, 429, 439, 440).
 * Phase 0 validée par David le 2026-11-02 (D-L8, journal docs/archive/wip/questions-tspe-restes-progress.md).
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

const MIGRATION = 'supabase/migrations/20261102204034_questions_tspe_lot8a_rangement_tags.sql';
/** Le lot : identifiant créé en prod le 2026-11-02, nœud et point attendus (« niveau§code »). */
const LOT: { id: string; noeud: string; points: string[] }[] = [
	{
		id: '747d627a-54ed-45f3-9ac3-d10b1d68e2a0',
		noeud: 'Suites > Limites de suites > comparaison et encadrement',
		points: ['T_SPE§TSPE-381']
	},
	{
		id: '2b29942c-0947-47cd-9a4d-77e43d34bb58',
		noeud: 'Suites > Limites de suites > comparaison et encadrement',
		points: ['T_SPE§TSPE-570']
	},
	{
		id: '5bf5b452-1039-4139-aff0-ed5224050761',
		noeud: 'Fonctions > Limites de fonctions > comparaison et encadrement',
		points: ['T_SPE§TSPE-400']
	},
	{
		id: 'f6415cb9-d177-406d-9745-8c7f30840def',
		noeud: 'Fonctions > Limites de fonctions > opérations',
		points: ['T_SPE§TSPE-401']
	},
	{
		id: '12ed13ec-d4d8-43e2-9da0-48eff48effc9',
		noeud: 'Fonctions > Convexité > caractérisations',
		points: ['T_SPE§TSPE-410']
	},
	{
		id: 'eeb72d3a-8a31-494a-afcf-6a6a580dfe69',
		noeud: 'Fonctions > Convexité > caractérisations',
		points: ['T_SPE§TSPE-411']
	},
	{
		id: 'cfd13223-e81b-427b-8a99-f7c126b9ad19',
		noeud: 'Fonctions > Convexité > caractérisations',
		points: ['T_SPE§TSPE-585']
	},
	{
		id: 'c10096eb-7403-4986-863e-e497ea477f44',
		noeud: 'Fonctions > Continuité > valeurs intermédiaires',
		points: ['T_SPE§TSPE-428']
	},
	{
		id: 'fe7f5218-5a09-4ef4-844b-e0d1202dda83',
		noeud: 'Fonctions > Continuité > valeurs intermédiaires',
		points: ['T_SPE§TSPE-429']
	},
	{
		id: '7c8b341b-34e4-4328-9e21-d4b508796021',
		noeud: 'Fonctions > Logarithmes > propriétés algébriques',
		points: ['T_SPE§TSPE-439']
	},
	{
		id: '9de80159-979b-4917-81e4-8e956147dafc',
		noeud: 'Fonctions > Logarithmes > dérivée',
		points: ['T_SPE§TSPE-440']
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

describe('Terminale spé, lot 8a : nœud et tags (migration de données)', () => {
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

describe('Terminale spé, lot 8a : les branches d’échec de la migration', () => {
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
				/identifiants partiellement présents : 10 modèle\(s\) sur 11/
			);
		});
	});

	it('un modèle rangé à la main depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			const chemins = await cheminsActifs(pg);
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[ids[3], chemins.get('Fonctions > Limites de fonctions > opérations')]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles déjà rangés depuis le relevé : 1/
			);
		});
	});

	it('un point du lot archivé (TSPE-440) fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now()
				  where grade = 'T_SPE' and code = 'TSPE-440' and archived_at is null`
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
				/rollback : 1 modèle\(s\) sur 11 ne sont plus sur le nœud de la migration/
			);
		});
	});
});
