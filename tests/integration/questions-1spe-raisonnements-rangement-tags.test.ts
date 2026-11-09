/**
 * Chantier « questions-1spe-raisonnements » : nœud, tag et niveau des 6 modèles du lot, niveau 1re spé
 * ajouté à 11 modèles de logique de seconde (Supabase local requis)
 * =====================================================================================================
 *
 * Migration `20261109092945_questions_1spe_raisonnements_rangement_tags` : les brouillons ab663da7,
 * 6cd78094, d9a627e4, b7b0c27b, 6058963e, 9f4c4a19, créés le 2026-11-09 par
 * scripts/create-questions.ts (sans nœud ni tag), vont sur leur sous-notion et reçoivent leur seul
 * point (1SPE-205, 2-216, 2-217, 1SPE-284, 1SPE-436, 1SPE-437) ; 6058963e et 9f4c4a19 passent aux
 * niveaux 7 et 3. Onze modèles publiés de seconde passent de {2} à {2, 1_SPE}.
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants — puis rejoue la migration **depuis son fichier**, dans
 * une transaction annulée à la fin. Les triggers de garde des tags restent actifs : chaque tag posé a
 * passé la règle du nœud (point sur le nœud ou sa notion).
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
	niveaux: Map<string, number>;
	grades: Map<string, string[]>;
	dates: Map<string, string>;
	tags: string[];
	/** Chemins des sous-notions actives (toutes). */
	chemins: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION =
	'supabase/migrations/20261109092945_questions_1spe_raisonnements_rangement_tags.sql';
/** Les 6 modèles : identifiants de la prod, niveaux scolaires, niveau avant / après, nœud et point. */
const LOT: {
	id: string;
	grades: string[];
	avant: number;
	apres: number;
	noeud: string;
	point: string;
}[] = [
	{
		id: 'ab663da7-ede6-4575-896f-4cad52753252',
		grades: ['1_SPE'],
		avant: 1,
		apres: 1,
		noeud: 'Logique > Raisonnements > par contraposée',
		point: '1_SPE§1SPE-205'
	},
	{
		id: '6cd78094-1036-4f05-9846-f57a5e51b068',
		grades: ['2', '1_SPE'],
		avant: 1,
		apres: 1,
		noeud: 'Logique > Raisonnements > disjonction de cas',
		point: '2§2-216'
	},
	{
		id: 'd9a627e4-4dbe-44aa-b668-ad70194d6d8e',
		grades: ['2', '1_SPE'],
		avant: 1,
		apres: 1,
		noeud: "Logique > Raisonnements > par l'absurde",
		point: '2§2-217'
	},
	{
		id: 'b7b0c27b-0c30-4297-b707-53f328d36f7a',
		grades: ['1_SPE'],
		avant: 9,
		apres: 9,
		noeud: 'Fonctions > Dérivation > variations et extremums',
		point: '1_SPE§1SPE-284'
	},
	{
		id: '6058963e-3c10-4140-94a4-26f008dbe11f',
		grades: ['1_SPE'],
		avant: 1,
		apres: 7,
		noeud: 'Géométrie > Produit scalaire > propriétés',
		point: '1_SPE§1SPE-436'
	},
	{
		id: '9f4c4a19-1408-412c-ad7b-0c31c8b0ee42',
		grades: ['1_SPE'],
		avant: 1,
		apres: 3,
		noeud: 'Géométrie > Géométrie repérée > milieu et distance',
		point: '1_SPE§1SPE-437'
	}
];
const ids = LOT.map((m) => m.id);
/** Les 11 modèles publiés de seconde qui reçoivent 1_SPE. */
const SECONDE = [
	'219c9470-ffe0-48a6-bebf-39fb814ad613',
	'6c3ee9e6-3c71-4ff9-943b-22691a9a92c7',
	'1e9a534f-b04c-4a1d-88fb-5aba696422e0',
	'55341e85-6782-4ccd-84a4-8b2d3ef10a80',
	'214f7500-0e36-4208-b688-44ddabde06d8',
	'75d0fc89-24b1-4edb-abf2-82b7e76f272e',
	'e05203b0-9833-4647-b6dc-39b10f2ae5be',
	'5426cead-c0c2-48d3-a10b-2e46714f9129',
	'bed58c24-6ead-4e6a-bd3e-3aaf2891ea00',
	'61d0571e-b6f3-413b-9272-3539b8a55708',
	'24fd6a10-7843-4b7c-9e7c-7a05b1696bc9'
];
const tous = [...ids, ...SECONDE];
/** Date de modification fabriquée : elle ne doit pas bouger. */
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

/** Pose l'état de la prod : les 6 brouillons sans nœud ni tag, les 11 modèles publiés en {2}. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: tous,
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	await pg.query(
		'alter table public.question_templates disable trigger update_question_templates_updated_at'
	);
	for (const m of LOT) {
		await pg.query(
			`update public.question_templates set grades = $2::text[], level = $3, classification_node_id = null
			  where id = $1`,
			[m.id, m.grades, m.avant]
		);
	}
	await pg.query(
		`update public.question_templates set grades = array['2'], status = 'published'
		  where id = any($1::uuid[])`,
		[SECONDE]
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
	const q = await pg.query<{
		id: string;
		node: string | null;
		level: number;
		grades: string[];
		updated_at: Date;
	}>(
		`select id, classification_node_id as node, level, grades::text[] as grades, updated_at
		   from public.question_templates where id = any($1::uuid[])`,
		[tous]
	);
	const t = await pg.query<{ template_id: string; grade: string; code: string }>(
		`select q.template_id, p.grade, p.code from public.question_template_points q
		   join public.curriculum_points p on p.id = q.point_id where q.template_id = any($1::uuid[])`,
		[ids]
	);
	return {
		noeuds: new Map(q.rows.map((r) => [r.id, chemins.get(r.node ?? '') ?? '∅'])),
		niveaux: new Map(q.rows.map((r) => [r.id, r.level])),
		grades: new Map(q.rows.map((r) => [r.id, r.grades])),
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()])),
		tags: t.rows.map((r) => `${r.template_id}§${r.grade}§${r.code}`).sort(),
		chemins: sousNotions.sort()
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('1re spé, raisonnements : nœuds, tags, niveaux (migration de données)', () => {
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

	it('chaque modèle du lot est EXACTEMENT sur sa sous-notion', () => {
		expect(LOT.map((m) => apres.noeuds.get(m.id))).toEqual(LOT.map((m) => m.noeud));
	});

	it('chaque modèle du lot porte EXACTEMENT son point, rien de plus', () => {
		expect(apres.tags).toEqual(LOT.map((m) => `${m.id}§${m.point}`).sort());
	});

	it('les niveaux numérotés : 7 et 3 pour 436 et 437, les autres inchangés', () => {
		expect(LOT.map((m) => apres.niveaux.get(m.id))).toEqual(LOT.map((m) => m.apres));
	});

	it('les 11 modèles de seconde passent à {2, 1_SPE} ; les niveaux scolaires du lot ne changent pas', () => {
		expect(SECONDE.map((id) => apres.grades.get(id))).toEqual(SECONDE.map(() => ['2', '1_SPE']));
		expect(LOT.map((m) => apres.grades.get(m.id))).toEqual(LOT.map((m) => m.grades));
	});

	it('`updated_at` de tous les modèles est préservé', () => {
		expect(tous.map((id) => apres.dates.get(id))).toEqual(tous.map(() => AVANT));
	});

	it('le rollback écrit dans la migration rend l’état d’avant', () => {
		expect(annule.tags).toEqual([]);
		expect(LOT.map((m) => annule.noeuds.get(m.id))).toEqual(LOT.map(() => '∅'));
		expect(LOT.map((m) => annule.niveaux.get(m.id))).toEqual(LOT.map((m) => m.avant));
		expect(SECONDE.map((id) => annule.grades.get(id))).toEqual(SECONDE.map(() => ['2']));
		expect(tous.map((id) => annule.dates.get(id))).toEqual(tous.map(() => AVANT));
		expect(annule.chemins).toEqual(avant.chemins);
	});
});

describe('1re spé, raisonnements : les branches d’échec de la migration', () => {
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

	it('un modèle du lot supprimé depuis le relevé fait échouer la migration (tout ou rien)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_templates where id = $1', [ids[5]]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/lot partiel : 5 modèle\(s\) présent\(s\) sur 6/
			);
		});
	});

	it('un modèle de seconde supprimé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_templates where id = $1', [SECONDE[0]]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/seconde partielle : 10 modèle\(s\) présent\(s\) sur 11/
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

	it('un niveau changé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('update public.question_templates set level = 4 where id = $1', [ids[4]]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/niveau changé depuis le relevé : 1 modèle\(s\)/
			);
		});
	});

	it('un modèle de seconde dépublié ou déjà en 1re spé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(`update public.question_templates set status = 'draft' where id = $1`, [
				SECONDE[1]
			]);
			await pg.query(
				`update public.question_templates set grades = array['2', '1_SPE'] where id = $1`,
				[SECONDE[2]]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèle\(s\) de seconde changé\(s\) depuis le relevé \(statut ou niveaux\) : 2/
			);
		});
	});

	it('un point archivé (1SPE-205) fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now()
				  where grade = '1_SPE' and code = '1SPE-205' and archived_at is null`
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
			await pg.query('delete from public.question_template_points where template_id = $1', [
				ids[0]
			]);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : tags changés depuis la migration \(5 du lot sur 5, attendus 6\)/
			);
		});
	});

	it('rollback refusé si un modèle de seconde a changé de niveaux depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(`update public.question_templates set grades = array['2'] where id = $1`, [
				SECONDE[3]
			]);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : niveaux changés depuis la migration sur 1 modèle\(s\) de seconde/
			);
		});
	});

	it('rollback refusé si un modèle a changé de niveau numéroté depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query('update public.question_templates set level = 2 where id = $1', [ids[5]]);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : 1 modèle\(s\) sur 6, plus sur le nœud ou le niveau de la migration/
			);
		});
	});
});
