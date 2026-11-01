/**
 * Chantier « questions-tspe », Q3 : tags, un nœud et des niveaux de 10 modèles publiés
 * (Supabase local requis)
 * ==================================================================================
 *
 * Migration `20261101220000_questions_tspe_tags_niveaux_q3` : sept modèles reçoivent leur point
 * TSPE (dd0ee69a change de point, 481 → 489), ef3c495c passe sous « triangle de Pascal »
 * (TCOMP-296 → TCOMP-361, + TSPE-316), et l'ordre de « Loi binomiale / Coefficients binomiaux »
 * devient 07ebdcbe 1, 4dcbae71 2, 970dab52 3, ef3c495c 4 (D-D1). Décisions de David le 2026-11-01
 * (journal docs/wip/questions-tspe-progress.md § 14).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, publiées, à leur nœud et à leur niveau, avec leurs
 * tags d'avant ; 970dab52 occupe le niveau 3 de la catégorie — puis rejoue la migration **depuis
 * son fichier**, dans une transaction annulée à la fin. Les triggers de garde des tags restent
 * actifs : chaque tag posé a passé la règle du nœud, et l'index unique des publiés a tenu.
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

interface Modele {
	id: string;
	/** Catégorie partagée (échange de niveaux) ; sinon une catégorie propre à la copie. */
	categorie: boolean;
	noeud: [avant: string, apres: string];
	niveau: [avant: number, apres: number];
	avant: string[];
	apres: string[];
}

interface Etat {
	noeuds: Map<string, string>;
	niveaux: Map<string, number>;
	statuts: Map<string, string>;
	dates: Map<string, string>;
	tags: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261101220000_questions_tspe_tags_niveaux_q3.sql';
const COEF = 'Dénombrement > Combinaisons > coefficients binomiaux';
const PASCAL = 'Dénombrement > Combinaisons > triangle de Pascal';
const EF3C = 'ef3c495c-632b-40ec-840d-fbbf7bfc879a';
const E07 = '07ebdcbe-dc7c-45cf-ad81-df70231719a2';
const DD0E = 'dd0ee69a-2203-47a3-b2b8-af70a77281d3';
/** Hors lot : occupe le niveau 3 de la catégorie, qui ne bouge pas. */
const S970 = '970dab52-4ded-45f7-988f-0ddf6e68c554';

/** Le lot, tel que relevé en prod le 2026-11-01 (MCP). */
const LOT: Modele[] = [
	{
		id: 'a80a780f-bed5-404c-b5fe-db4211437ac8',
		categorie: false,
		noeud: ['Fonctions > Convexité > caractérisations', 'Fonctions > Convexité > caractérisations'],
		niveau: [1, 1],
		avant: [],
		apres: ['TSPE-586']
	},
	{
		id: '4ff9d049-afd9-4fd2-be40-f8e242923af4',
		categorie: false,
		noeud: [
			'Probabilités > Loi binomiale > schéma de Bernoulli',
			'Probabilités > Loi binomiale > schéma de Bernoulli'
		],
		niveau: [1, 1],
		avant: ['TCOMP-367', 'TTECHNO-089'],
		apres: ['TCOMP-367', 'TTECHNO-089', 'TSPE-508']
	},
	{
		id: '7a0b795c-b802-44c2-b06c-e3631610908c',
		categorie: false,
		noeud: ['Intégration > Valeur moyenne', 'Intégration > Valeur moyenne'],
		niveau: [3, 3],
		avant: ['TCOMP-269'],
		apres: ['TCOMP-269', 'TSPE-609']
	},
	{
		id: '5e702745-c4ba-4d75-9188-902ac7373531',
		categorie: false,
		noeud: [
			"Intégration > Fonction intégrale > dérivée d'une fonction intégrale",
			"Intégration > Fonction intégrale > dérivée d'une fonction intégrale"
		],
		niveau: [3, 3],
		avant: ['TCOMP-272'],
		apres: ['TCOMP-272', 'TSPE-476']
	},
	{
		id: DD0E,
		categorie: false,
		noeud: [
			"Intégration > Calcul d'intégrales > positivité et inégalités",
			"Intégration > Calcul d'intégrales > positivité et inégalités"
		],
		niveau: [2, 2],
		avant: ['TSPE-481'],
		apres: ['TSPE-489']
	},
	{
		id: '624bf511-0830-4aa7-91cc-1d016a94df2b',
		categorie: false,
		noeud: [
			'Équations différentielles > Généralités > allure des courbes',
			'Équations différentielles > Généralités > allure des courbes'
		],
		niveau: [2, 2],
		avant: ['TCOMP-249'],
		apres: ['TCOMP-249', 'TSPE-465']
	},
	{
		id: 'f1963ef2-4618-4ae7-9491-9955dacd0258',
		categorie: false,
		noeud: ["Suites > Modèles d'évolution > seuil", "Suites > Modèles d'évolution > seuil"],
		niveau: [2, 2],
		avant: ['TCOMP-239'],
		apres: ['TCOMP-239', 'TSPE-392']
	},
	{
		id: EF3C,
		categorie: true,
		noeud: [COEF, PASCAL],
		niveau: [1, 4],
		avant: ['TCOMP-296'],
		apres: ['TCOMP-361', 'TSPE-316']
	},
	{
		id: E07,
		categorie: true,
		noeud: [COEF, COEF],
		niveau: [2, 1],
		avant: ['TCOMP-288'],
		apres: ['TCOMP-288']
	},
	{
		id: '4dcbae71-f935-4792-93fe-0357b18e3511',
		categorie: true,
		noeud: [COEF, COEF],
		niveau: [4, 2],
		avant: ['TCOMP-288', 'TSPE-314'],
		apres: ['TCOMP-288', 'TSPE-314']
	}
];
const ids = LOT.map((m) => m.id);
/** Date de modification fabriquée : elle ne doit pas bouger (ranger ne modifie pas le contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

function grade(code: string): string {
	if (code.startsWith('TSPE-')) return 'T_SPE';
	if (code.startsWith('TCOMP-')) return 'T_COMP';
	if (code.startsWith('TTECHNO-')) return 'T_TECHNO';
	throw new Error(`code inconnu : ${code}`);
}

function cles(cote: 'avant' | 'apres'): string[] {
	return LOT.flatMap((m) => m[cote].map((c) => `${m.id}§${c}`)).sort();
}

async function tagger(pg: Client, id: string, code: string): Promise<void> {
	const r = await pg.query(
		`insert into public.question_template_points (template_id, point_id)
		 select $1, id from public.curriculum_points where grade = $2 and code = $3 and archived_at is null`,
		[id, grade(code), code]
	);
	if (r.rowCount !== 1) throw new Error(`tag non posé : ${id} ${code}`);
}

async function idParChemin(pg: Client): Promise<Map<string, string>> {
	const parChemin = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) {
		if (!node.archived) parChemin.set(node.path, id);
	}
	return parChemin;
}

/** Pose l'état de la prod : copies publiées, à leur nœud et leur niveau, avec leurs tags d'avant. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: [...ids, S970],
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	const parChemin = await idParChemin(pg);
	await pg.query(
		'alter table public.question_templates disable trigger update_question_templates_updated_at'
	);
	const copies = [
		...LOT.map((m) => ({
			id: m.id,
			categorie: m.categorie,
			noeud: m.noeud[0],
			niveau: m.niveau[0]
		})),
		{ id: S970, categorie: true, noeud: COEF, niveau: 3 }
	];
	for (const [n, c] of copies.entries()) {
		const node = parChemin.get(c.noeud);
		if (!node) throw new Error(`chemin introuvable : ${c.noeud}`);
		// Hors catégorie partagée : une catégorie par copie (un seul publié par catégorie et niveau).
		await pg.query(
			`update public.question_templates
			    set classification_node_id = $2, grades = array['T_SPE', 'T_COMP'], status = 'published',
			        level = $3, theme = $4, domain = $5, subdomain = $6
			  where id = $1`,
			c.categorie
				? [c.id, node, c.niveau, 'Probabilités', 'Loi binomiale', 'Coefficients binomiaux']
				: [c.id, node, c.niveau, 'copie', `copie-${n}`, null]
		);
	}
	await pg.query(
		'alter table public.question_templates enable trigger update_question_templates_updated_at'
	);
	for (const m of LOT) for (const c of m.avant) await tagger(pg, m.id, c);
}

async function lireEtat(pg: Client): Promise<Etat> {
	const chemins = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) chemins.set(id, node.path);
	const q = await pg.query<{
		id: string;
		node: string | null;
		level: number;
		status: string;
		updated_at: Date;
	}>(
		'select id, classification_node_id as node, level, status, updated_at from public.question_templates where id = any($1::uuid[]) order by id',
		[[...ids, S970]]
	);
	const t = await pg.query<{ template_id: string; code: string }>(
		`select q.template_id, p.code from public.question_template_points q
		   join public.curriculum_points p on p.id = q.point_id where q.template_id = any($1::uuid[])`,
		[ids]
	);
	return {
		noeuds: new Map(q.rows.map((r) => [r.id, chemins.get(r.node ?? '') ?? '∅'])),
		niveaux: new Map(q.rows.map((r) => [r.id, r.level])),
		statuts: new Map(q.rows.map((r) => [r.id, r.status])),
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()])),
		tags: t.rows.map((r) => `${r.template_id}§${r.code}`).sort()
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('Questions terminale spé, Q3 : tags, nœud et niveaux (migration de données)', () => {
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

	it('les modèles portent EXACTEMENT les tags visés', () => {
		expect(apres.tags).toEqual(cles('apres'));
	});

	it('ef3c495c passe sous « triangle de Pascal », les autres ne bougent pas', () => {
		expect(LOT.map((m) => apres.noeuds.get(m.id))).toEqual(LOT.map((m) => m.noeud[1]));
	});

	it('la catégorie suit l’ordre D-D1 : chemins 1, cas particuliers 2, symétrie 3, Pascal 4', () => {
		expect(LOT.map((m) => apres.niveaux.get(m.id))).toEqual(LOT.map((m) => m.niveau[1]));
		expect(apres.niveaux.get(S970)).toBe(3);
	});

	it('ni statut ni `updated_at` ne changent', () => {
		expect([...apres.statuts.values()]).toEqual([...ids, S970].map(() => 'published'));
		expect([...apres.dates.values()]).toEqual([...ids, S970].map(() => AVANT));
	});

	it('le rollback écrit dans la migration rend l’état d’avant', () => {
		expect(annule.tags).toEqual(cles('avant'));
		expect(LOT.map((m) => annule.noeuds.get(m.id))).toEqual(LOT.map((m) => m.noeud[0]));
		expect(LOT.map((m) => annule.niveaux.get(m.id))).toEqual(LOT.map((m) => m.niveau[0]));
		expect([...annule.dates.values()]).toEqual([...ids, S970].map(() => AVANT));
	});
});

describe('Questions terminale spé, Q3 : les branches d’échec de la migration', () => {
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

	it('base sans les modèles (locale) : le rollback ne touche rien et passe', async () => {
		await enTransaction(async () => {
			await expect(pg.query(extractRollback(MIGRATION))).resolves.toBeDefined();
		});
	});

	it('TOUT ou RIEN : un modèle manquant fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_templates where id = $1', [E07]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/identifiants partiellement présents : 9 modèle\(s\) sur 10/
			);
		});
	});

	it('un niveau changé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('update public.question_templates set level = 9 where id = $1', [E07]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles changés depuis le relevé \(statut, nœud ou niveau\) : 9 sur 10/
			);
		});
	});

	it('un modèle dépublié depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query("update public.question_templates set status = 'draft' where id = $1", [DD0E]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles changés depuis le relevé \(statut, nœud ou niveau\) : 9 sur 10/
			);
		});
	});

	it('un tag changé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await tagger(pg, EF3C, 'TSPE-313');
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/tags différents du relevé/
			);
		});
	});

	it('un niveau visé pris par un modèle publié hors du lot fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			// Les niveaux 1 à 4 de la catégorie sont tous pris : pour qu'un modèle hors du lot occupe
			// un niveau visé, l'index unique est retiré le temps de la transaction (annulée).
			await pg.query('drop index public.idx_question_templates_unique_category');
			await pg.query('update public.question_templates set level = 4 where id = $1', [S970]);
			// 970dab52 occupe maintenant le niveau 4 que vise ef3c495c.
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/niveau visé déjà pris par un modèle publié hors du lot : 1/
			);
		});
	});

	it('un point du lot archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = 'T_SPE' and code = 'TSPE-489' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/points introuvables : 1/
			);
		});
	});

	it('le rollback refuse si un tag a changé depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`delete from public.question_template_points q using public.curriculum_points p
				  where q.template_id = $1 and p.id = q.point_id and p.code = 'TSPE-489'`,
				[DD0E]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : tags changés depuis la migration/
			);
		});
	});

	it('le rollback refuse si un niveau a changé depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query('update public.question_templates set level = 9 where id = $1', [E07]);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : modèles changés depuis la migration \(9 sur 10 conformes\)/
			);
		});
	});
});
