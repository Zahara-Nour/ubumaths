/**
 * Chantier « questions-2de-demonstrations », lot 8 (approfondissements, géométrie) : nœud et tag
 * des 5 modèles, points 2-307 et 2-310 sous Figures planes, réemploi de d4db2207 (Supabase local requis)
 * =====================================================================================================
 *
 * Migration `20261109110745_questions_2de_approfondissements_8_rangement_tags` : les points 2-307
 * et 2-310 passent de la notion Géométrie repérée à une sous-notion de Figures planes ; les
 * brouillons 6bd8366f, 574142b3, b1b7bfc1, 31177044 et 13908afe, créés le 2026-11-09 par
 * scripts/create-questions.ts (sans nœud ni tag), vont sur une sous-notion existante et reçoivent
 * leur seul point ; le modèle publié de 1re spé d4db2207 passe à {1_SPE, 2} et reçoit 2-309.
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants (les 5 brouillons au niveau {2} sans nœud ni tag,
 * d4db2207 publié, {1_SPE}, rangé et tagué 1SPE-326) — puis rejoue la migration **depuis son
 * fichier**, dans une transaction annulée à la fin. Les triggers de garde des tags restent actifs.
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
	grades: Map<string, string[]>;
	tags: string[];
	/** Chemin du nœud de 2-307 et de 2-310. */
	points: string[];
	/** Chemins des sous-notions actives (toutes). */
	chemins: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION =
	'supabase/migrations/20261109110745_questions_2de_approfondissements_8_rangement_tags.sql';
const REEMPLOI = 'd4db2207-e392-4b3b-8973-3656a4ab4642';
const COMBINAISON = 'Géométrie > Vecteurs > combinaison linéaire';
/** Les modèles : identifiants de la prod, nœud et points attendus après la migration (« niveau§code »). */
const LOT: { id: string; noeud: string; points: string[] }[] = [
	{ id: '6bd8366f-028b-4619-afc1-db1aaa24113f', noeud: COMBINAISON, points: ['2§2-305'] },
	{
		id: '574142b3-e610-4d4c-8506-8e77f0dfb630',
		noeud: 'Géométrie > Géométrie repérée > milieu et distance',
		points: ['2§2-306']
	},
	{
		id: 'b1b7bfc1-af33-44c8-93dd-e7f18acf405d',
		noeud: 'Géométrie > Figures planes > triangles',
		points: ['2§2-307']
	},
	{
		id: '31177044-256b-43e2-8a61-5003dea31b4e',
		noeud: 'Grandeurs et mesures > Aires > triangle quelconque',
		points: ['2§2-308']
	},
	{
		id: '13908afe-a957-4af1-974c-5e743adcc233',
		noeud: 'Géométrie > Figures planes > médiatrice et bissectrice',
		points: ['2§2-310']
	},
	{ id: REEMPLOI, noeud: COMBINAISON, points: ['1_SPE§1SPE-326', '2§2-309'] }
];
const ids = LOT.map((m) => m.id);
const brouillons = ids.filter((id) => id !== REEMPLOI);
const POINTS_AVANT = ['Géométrie > Géométrie repérée', 'Géométrie > Géométrie repérée'];
const POINTS_APRES = [
	'Géométrie > Figures planes > triangles',
	'Géométrie > Figures planes > médiatrice et bissectrice'
];
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

/**
 * La base locale a rejoué la migration à son `db:reset` : 2-307 et 2-310 y sont déjà sous Figures
 * planes. On les remet sur la notion Géométrie repérée (état de la prod au relevé), dans la
 * transaction ouverte, avant de rejouer la migration.
 */
async function remettreLesPoints(pg: Client): Promise<void> {
	const chemins = await cheminsActifs(pg);
	await pg.query(
		`update public.curriculum_points set node_id = $1
		  where grade = '2' and code in ('2-307', '2-310') and archived_at is null`,
		[chemins.get('Géométrie > Géométrie repérée')]
	);
}

/** Pose l'état de la prod : les 5 brouillons sans nœud ni tag, d4db2207 publié, rangé, tagué 1SPE-326. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: ids,
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	const chemins = await cheminsActifs(pg);
	await pg.query(
		'alter table public.question_templates disable trigger update_question_templates_updated_at'
	);
	await pg.query(
		`update public.question_templates set grades = array['2'], classification_node_id = null
		  where id = any($1::uuid[])`,
		[brouillons]
	);
	await pg.query(
		`update public.question_templates set grades = array['1_SPE'], level = 2,
		        classification_node_id = $2, status = 'published'
		  where id = $1`,
		[REEMPLOI, chemins.get(COMBINAISON)]
	);
	await pg.query(
		`insert into public.question_template_points (template_id, point_id)
		 select $1, p.id from public.curriculum_points p
		  where p.grade = '1_SPE' and p.code = '1SPE-326' and p.archived_at is null`,
		[REEMPLOI]
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
	const q = await pg.query<{ id: string; node: string | null; updated_at: Date; grades: string[] }>(
		`select id, classification_node_id as node, updated_at, grades::text[] as grades
		   from public.question_templates where id = any($1::uuid[])`,
		[ids]
	);
	const t = await pg.query<{ template_id: string; grade: string; code: string }>(
		`select q.template_id, p.grade, p.code from public.question_template_points q
		   join public.curriculum_points p on p.id = q.point_id where q.template_id = any($1::uuid[])`,
		[ids]
	);
	const p = await pg.query<{ code: string; node_id: string | null }>(
		`select code, node_id from public.curriculum_points
		  where grade = '2' and code in ('2-307', '2-310') and archived_at is null order by code`
	);
	return {
		noeuds: new Map(q.rows.map((r) => [r.id, chemins.get(r.node ?? '') ?? '∅'])),
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()])),
		grades: new Map(q.rows.map((r) => [r.id, r.grades])),
		tags: t.rows.map((r) => `${r.template_id}§${r.grade}§${r.code}`).sort(),
		points: p.rows.map((r) => chemins.get(r.node_id ?? '') ?? '∅'),
		chemins: sousNotions.sort()
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('seconde, approfondissements lot 8 : points, nœuds, tags et réemploi (migration de données)', () => {
	let pg: Client;
	let avant: Etat;
	let apres: Etat;
	let annule: Etat;

	beforeAll(async () => {
		await cleanupAllTestData();
		const prof = await TestData.profile().withRole('teacher').create();
		pg = await getPostgresClient();

		await pg.query('begin');
		await remettreLesPoints(pg);
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

	it('avant : 2-307 et 2-310 sur la notion Géométrie repérée', () => {
		expect(avant.points).toEqual(POINTS_AVANT);
	});

	it('2-307 et 2-310 passent sous Figures planes', () => {
		expect(apres.points).toEqual(POINTS_APRES);
	});

	it('l’arbre des notions ne change pas (aucune sous-notion neuve)', () => {
		expect(apres.chemins).toEqual(avant.chemins);
	});

	it('chaque modèle est EXACTEMENT sur sa sous-notion', () => {
		expect(LOT.map((m) => apres.noeuds.get(m.id))).toEqual(LOT.map((m) => m.noeud));
	});

	it('chaque modèle porte EXACTEMENT ses points, rien de plus', () => {
		expect(apres.tags).toEqual(LOT.flatMap((m) => m.points.map((p) => `${m.id}§${p}`)).sort());
	});

	it('d4db2207 passe à {1_SPE, 2}, les brouillons restent à {2}', () => {
		expect(LOT.map((m) => apres.grades.get(m.id))).toEqual(
			LOT.map((m) => (m.id === REEMPLOI ? ['1_SPE', '2'] : ['2']))
		);
	});

	it('`updated_at` des modèles est préservé', () => {
		expect([...apres.dates.values()]).toEqual(ids.map(() => AVANT));
	});

	it('le rollback écrit dans la migration rend l’état d’avant', () => {
		expect(annule.tags).toEqual([`${REEMPLOI}§1_SPE§1SPE-326`]);
		expect(LOT.map((m) => annule.noeuds.get(m.id))).toEqual(
			LOT.map((m) => (m.id === REEMPLOI ? COMBINAISON : '∅'))
		);
		expect(annule.grades.get(REEMPLOI)).toEqual(['1_SPE']);
		expect(annule.points).toEqual(POINTS_AVANT);
		expect([...annule.dates.values()]).toEqual(ids.map(() => AVANT));
		expect(annule.chemins).toEqual(avant.chemins);
	});
});

describe('seconde, approfondissements lot 8 : les branches d’échec de la migration', () => {
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
			await remettreLesPoints(pg);
			await corps();
		} finally {
			await pg.query('rollback');
		}
	}

	it('base sans les modèles (locale) : la migration déplace les points et ne touche rien d’autre', async () => {
		await enTransaction(async () => {
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			expect((await lireEtat(pg)).points).toEqual(POINTS_APRES);
		});
	});

	it('un modèle supprimé depuis le relevé fait échouer la migration (tout ou rien)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_templates where id = $1', [ids[1]]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/lot partiel : 5 modèle\(s\) présent\(s\) sur 6/
			);
		});
	});

	it('un modèle rangé à la main depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			const chemins = await cheminsActifs(pg);
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[ids[1], chemins.get(LOT[1].noeud)]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèle\(s\) déjà rangé\(s\) depuis le relevé : 1/
			);
		});
	});

	it('d4db2207 dépublié depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(`update public.question_templates set status = 'draft' where id = $1`, [
				REEMPLOI
			]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/d4db2207 changé depuis le relevé/
			);
		});
	});

	it('un point déjà déplacé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			const chemins = await cheminsActifs(pg);
			await pg.query(
				`update public.curriculum_points set node_id = $1
				  where grade = '2' and code = '2-307' and archived_at is null`,
				[chemins.get(POINTS_APRES[0])]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/point\(s\) déplacé\(s\) ou archivé\(s\) depuis le relevé : 1 sur 2/
			);
		});
	});

	it('un point archivé (2-305) fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now()
				  where grade = '2' and code = '2-305' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), 1 point\(s\)/
			);
		});
	});

	it('rollback refusé si un tag du lot a été retiré depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`delete from public.question_template_points q using public.curriculum_points p
				  where q.template_id = $1 and p.id = q.point_id and p.code = '2-305'`,
				[ids[0]]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : tags changés depuis la migration \(5 du lot sur 5, attendus 6\)/
			);
		});
	});

	it('rollback refusé si un modèle a été déplacé depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query('delete from public.question_template_points where template_id = $1', [
				ids[3]
			]);
			const chemins = await cheminsActifs(pg);
			const autre = [...chemins.keys()].find(
				(c) =>
					c.startsWith('Grandeurs et mesures > Aires > ') &&
					c !== LOT[3].noeud &&
					c.split(' > ').length === 3
			);
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[ids[3], chemins.get(autre ?? '')]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : 1 modèle\(s\) sur 6, plus sur le nœud de la migration/
			);
		});
	});
});
