/**
 * Chantier « questions-1spe », D3 : tags de 2 modèles publiés (Supabase local requis)
 * ==================================================================================
 *
 * Migration `20261101160000_questions_1spe_tags_d3` : f1440b52 « Dériver un quotient » passe de
 * 1SPE-274 à 1SPE-396 (quotient) ; 318ea542 « Étude de fonction : par quoi commencer » reçoit
 * 1SPE-283, comme ses deux cartes sœurs. Ni nœud, ni niveau, ni contenu ne changent.
 * Décision de David le 2026-11-01 (journal docs/wip/questions-1spe-progress.md § 17).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, à leur nœud, en 1re spé, publiées, avec leurs tags
 * d'avant — puis rejoue la migration **depuis son fichier**, dans une transaction annulée à la
 * fin. Les triggers de garde des tags restent actifs : chaque tag posé a passé la règle du nœud.
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
	noeud: string;
	avant: string[];
	apres: string[];
}

interface Etat {
	noeuds: Map<string, string>;
	grades: Map<string, string[]>;
	statuts: Map<string, string>;
	dates: Map<string, string>;
	tags: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261101160000_questions_1spe_tags_d3.sql';
const F1440 = 'f1440b52-5a2b-4e6a-a112-7182b029d023';
const F318 = '318ea542-65cb-4040-9b46-1d5803d9dee5';
/** Le lot, tel que relevé en prod le 2026-11-01 (MCP). */
const LOT: Modele[] = [
	{
		id: F1440,
		noeud: 'Fonctions > Dérivation > opérations sur les dérivées',
		avant: ['1SPE-274'],
		apres: ['1SPE-396']
	},
	{
		id: F318,
		noeud: 'Fonctions > Dérivation > variations et extremums',
		avant: [],
		apres: ['1SPE-283']
	}
];
const ids = LOT.map((m) => m.id);
/** Date de modification fabriquée : elle ne doit pas bouger (taguer ne modifie pas le contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

function cles(cote: 'avant' | 'apres'): string[] {
	return LOT.flatMap((m) => m[cote].map((c) => `${m.id}§1_SPE§${c}`)).sort();
}

async function tagger(pg: Client, id: string, code: string): Promise<void> {
	const r = await pg.query(
		`insert into public.question_template_points (template_id, point_id)
		 select $1, id from public.curriculum_points where grade = '1_SPE' and code = $2 and archived_at is null`,
		[id, code]
	);
	if (r.rowCount !== 1) throw new Error(`tag non posé : ${id} ${code}`);
}

/** Pose l'état de la prod : copies publiées en 1re spé, à leur nœud, avec leurs tags d'avant. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: ids,
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	const parChemin = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) {
		if (!node.archived) parChemin.set(node.path, id);
	}
	await pg.query(
		'alter table public.question_templates disable trigger update_question_templates_updated_at'
	);
	// Copies publiées : un niveau chacune (un seul modèle publié par catégorie et par niveau).
	for (const [n, m] of LOT.entries()) {
		const node = parChemin.get(m.noeud);
		if (!node) throw new Error(`chemin introuvable : ${m.noeud}`);
		await pg.query(
			`update public.question_templates
			    set classification_node_id = $2, grades = array['1_SPE'], status = 'published', level = $3
			  where id = $1`,
			[m.id, node, n + 1]
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
		grades: string[];
		status: string;
		updated_at: Date;
	}>(
		'select id, classification_node_id as node, grades, status, updated_at from public.question_templates where id = any($1::uuid[]) order by id',
		[ids]
	);
	const t = await pg.query<{ template_id: string; grade: string; code: string }>(
		`select q.template_id, p.grade, p.code from public.question_template_points q
		   join public.curriculum_points p on p.id = q.point_id where q.template_id = any($1::uuid[])`,
		[ids]
	);
	return {
		noeuds: new Map(q.rows.map((r) => [r.id, chemins.get(r.node ?? '') ?? '∅'])),
		grades: new Map(q.rows.map((r) => [r.id, r.grades])),
		statuts: new Map(q.rows.map((r) => [r.id, r.status])),
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()])),
		tags: t.rows.map((r) => `${r.template_id}§${r.grade}§${r.code}`).sort()
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('Questions 1re spé, D3 : tags de 2 modèles publiés (migration de données)', () => {
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

	it('les modèles portent EXACTEMENT les tags du lot (396 et 283 posés, 274 retiré)', () => {
		expect(apres.tags).toEqual(cles('apres'));
	});

	it('ni nœud, ni niveaux, ni statut, ni `updated_at` ne changent', () => {
		expect(LOT.map((m) => apres.noeuds.get(m.id))).toEqual(LOT.map((m) => m.noeud));
		expect(LOT.map((m) => apres.grades.get(m.id))).toEqual(LOT.map(() => ['1_SPE']));
		expect(LOT.map((m) => apres.statuts.get(m.id))).toEqual(LOT.map(() => 'published'));
		expect([...apres.dates.values()]).toEqual(ids.map(() => AVANT));
	});

	it('le rollback écrit dans la migration rend l’état d’avant', () => {
		expect(annule.tags).toEqual(cles('avant'));
		expect(LOT.map((m) => annule.noeuds.get(m.id))).toEqual(LOT.map((m) => m.noeud));
		expect([...annule.dates.values()]).toEqual(ids.map(() => AVANT));
	});
});

describe('Questions 1re spé, D3 : les branches d’échec de la migration', () => {
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
			await pg.query('delete from public.question_templates where id = $1', [F318]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/identifiants partiellement présents : 1 modèle\(s\) sur 2/
			);
		});
	});

	it('un modèle déplacé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			const parChemin = new Map<string, string>();
			for (const [id, node] of await readNodePaths(pg)) {
				if (!node.archived) parChemin.set(node.path, id);
			}
			// 318ea542 n'a pas de tag : il peut changer de nœud.
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[F318, parChemin.get(LOT[0].noeud)]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles déplacés depuis le relevé : 1/
			);
		});
	});

	it('un tag changé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await tagger(pg, F318, '1SPE-283');
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/tags différents du relevé : 2 tag\(s\) au lieu de 1/
			);
		});
	});

	it('un point du lot archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = '1_SPE' and code = '1SPE-396' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/points introuvables ou hors du nœud du modèle : 1/
			);
		});
	});

	it('le rollback refuse si un tag a changé depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`delete from public.question_template_points q using public.curriculum_points p
				  where q.template_id = $1 and p.id = q.point_id and p.code = '1SPE-283'`,
				[F318]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : tags changés depuis la migration/
			);
		});
	});

	it('le rollback refuse si 1SPE-274 ne peut pas être reposé (point archivé)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = '1_SPE' and code = '1SPE-274' and archived_at is null`
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : points introuvables : 1/
			);
		});
	});
});
