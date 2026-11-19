/**
 * Chantier « questions-tspe-demonstrations », lot 3 (dérivation, logarithme, primitives) : nœud et tag des
 * 5 modèles (Supabase local requis)
 * =====================================================================================================
 *
 * Migration `20261111224848_questions_tspe_demonstrations_3_rangement_tags` : les brouillons aa8e1716,
 * 2d8d1efd, f68e6a98, eaf0f7f5, 3885e298, créés le 2026-11-11 par scripts/create-questions.ts (sans
 * nœud ni tag), vont sur le nœud de leur point (TSPE-421, 448, 449, 471, 472) et reçoivent ce seul
 * point. TSPE-472 est sur une NOTION sans sous-notion (« y′ = ay ») : ce modèle va sur la notion.
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, au niveau {T_SPE}, sans nœud ni tag — puis rejoue
 * la migration **depuis son fichier**, dans une transaction annulée à la fin. Les triggers de garde
 * des tags restent actifs : chaque tag posé a passé la règle du nœud (point sur le nœud ou sa notion).
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

const MIGRATION =
	'supabase/migrations/20261111224848_questions_tspe_demonstrations_3_rangement_tags.sql';
/** Les modèles : identifiants créés en prod le 2026-11-11, nœud et point attendus (« niveau§code »). */
const LOT: { id: string; noeud: string; points: string[] }[] = [
	{
		id: 'aa8e1716-c6e1-4247-8d7e-4c77ff910b5c',
		noeud: 'Fonctions > Convexité > inégalités de convexité',
		points: ['T_SPE§TSPE-421']
	},
	{
		id: '2d8d1efd-3882-4797-b7ed-adf3b3e40b31',
		noeud: 'Fonctions > Logarithmes > dérivée',
		points: ['T_SPE§TSPE-448']
	},
	{
		id: 'f68e6a98-a41a-4f13-8c25-a5d00730f10e',
		noeud: 'Fonctions > Limites de fonctions > croissances comparées',
		points: ['T_SPE§TSPE-449']
	},
	{
		id: 'eaf0f7f5-3c73-407c-8fa7-d5233b461e3f',
		noeud: 'Équations différentielles > y′ = f > primitives : notion',
		points: ['T_SPE§TSPE-471']
	},
	{
		id: '3885e298-197d-4813-a368-993b045e3495',
		noeud: 'Équations différentielles > y′ = ay',
		points: ['T_SPE§TSPE-472']
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

/** Pose l'état de la prod : les copies des modèles, aux niveaux de la prod, sans nœud ni tag. */
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

describe('terminale spé, démonstrations lot 3 : nœuds et tags (migration de données)', () => {
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

	it('l’arbre des notions ne change pas (aucun nœud neuf)', () => {
		expect(apres.chemins).toEqual(avant.chemins);
	});

	it('chaque modèle est EXACTEMENT sur son nœud (la notion pour TSPE-472)', () => {
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

describe('terminale spé, démonstrations lot 3 : les branches d’échec de la migration', () => {
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

	it('base sans le modèle (locale) : la migration passe sans rien toucher', async () => {
		await enTransaction(async () => {
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).resolves.toBeDefined();
		});
	});

	it('un modèle supprimé depuis le relevé fait échouer la migration (tout ou rien)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_templates where id = $1', [ids[2]]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/lot partiel : 4 modèle\(s\) présent\(s\) sur 5/
			);
		});
	});

	it('un modèle rangé à la main depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			const chemins = await cheminsActifs(pg);
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[ids[0], chemins.get(LOT[0].noeud)]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèle\(s\) déjà rangé\(s\) depuis le relevé : 1/
			);
		});
	});

	it('un modèle tagué à la main depuis le relevé fait échouer la migration', async () => {
		// Un trigger interdit un tag sur un modèle sans nœud : un modèle tagué est donc forcément
		// rangé, et c'est la garde « déjà rangé » qui l'arrête (la garde « déjà tagué » est un filet).
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			const chemins = await cheminsActifs(pg);
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[ids[0], chemins.get(LOT[0].noeud)]
			);
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, p.id from public.curriculum_points p
				  where p.grade = 'T_SPE' and p.code = 'TSPE-421' and p.archived_at is null`,
				[ids[0]]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèle\(s\) déjà rangé\(s\) depuis le relevé : 1/
			);
		});
	});

	it('un point archivé (TSPE-421) fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now()
				  where grade = 'T_SPE' and code = 'TSPE-421' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), 1 point\(s\)/
			);
		});
	});

	it('rollback refusé si un tag du modèle a été retiré depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`delete from public.question_template_points q using public.curriculum_points p
				  where q.template_id = $1 and p.id = q.point_id and p.code = 'TSPE-421'`,
				[ids[0]]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : tags changés depuis la migration \(4 du lot sur 4, attendus 5\)/
			);
		});
	});

	it('rollback refusé si le modèle a été déplacé depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query('delete from public.question_template_points where template_id = $1', [
				ids[0]
			]);
			const chemins = await cheminsActifs(pg);
			const autre = [...chemins.keys()].find(
				(c) => c.startsWith('Fonctions > ') && c !== LOT[0].noeud && c.split(' > ').length === 3
			);
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[ids[0], chemins.get(autre ?? '')]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : 1 modèle\(s\) sur 5, plus sur le nœud de la migration/
			);
		});
	});
});
