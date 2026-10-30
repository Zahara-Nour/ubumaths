/**
 * Chantier « questions-3 », lot 4b (résolutions graphiques, fonction carré, Thalès) : nœuds et tags (Supabase local requis)
 * ===================================================================================
 *
 * Migration `20261030162300_questions_3_lot4b_rangement_tags` : les 6 brouillons du lot 4b (créés
 * sans nœud ni tag) vont sur le nœud de leur point, tag posé (3-042, 3-065, 3-057, 3-046, 3-053,
 * 3-037). Aucun niveau ni statut ne change. Décisions de David du 2026-10-30 (journal
 * docs/wip/questions-3-progress.md § 11.14).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, sans nœud, à leurs niveaux, à leur statut et sans tag —
 * puis rejoue la migration **depuis son fichier**, dans une transaction annulée à la fin. Les
 * triggers de garde des tags restent actifs : chaque tag posé a passé la règle du nœud. Le lot
 * (fixture) est écrit par docs/wip/questions/lot-rangement-3-4b.py, avec la migration, depuis
 * le relevé de la prod du 2026-10-30.
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
	/** null : sans nœud (brouillon neuf). */
	noeudAvant: string | null;
	noeudApres: string;
	gradesAvant: string[];
	gradesApres: string[];
	statutAvant: string;
	statutApres: string;
	tagsAvant: string[];
	tagsApres: string[];
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

const MIGRATION = 'supabase/migrations/20261030162300_questions_3_lot4b_rangement_tags.sql';
/** Le lot, tel que relevé en prod le 2026-10-30 (tags en « programme§code »). */
const LOT: Modele[] = JSON.parse(
	readFileSync('tests/integration/fixtures/questions-3-lot4b-rangement.json', 'utf-8')
) as Modele[];
/** Modèle d'un identifiant court (8 caractères). */
function id(court: string): string {
	const m = LOT.find((x) => x.id.startsWith(court));
	if (!m) throw new Error(`modèle absent du lot : ${court}`);
	return m.id;
}
const ids = LOT.map((m) => m.id);
/** Date de modification fabriquée : elle ne doit pas bouger (ranger et taguer ne modifient pas le contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

function cles(cote: 'tagsAvant' | 'tagsApres'): string[] {
	return LOT.flatMap((m) => m[cote].map((t) => `${m.id}§${t}`)).sort();
}

/** Pose l'état de la prod : les copies des modèles, à leur nœud (ou sans), niveaux et statut d'avant, avec leurs tags d'avant. */
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
	// Un niveau par copie, sinon elles partagent une catégorie
	// (idx_question_templates_unique_category ne tolère qu'un modèle publié par catégorie).
	for (const [n, m] of LOT.entries()) {
		const node = m.noeudAvant === null ? null : parChemin.get(m.noeudAvant);
		if (node === undefined) throw new Error(`chemin introuvable : ${m.noeudAvant}`);
		await pg.query(
			`update public.question_templates
			    set classification_node_id = $2, grades = $3::text[], status = $4, level = $5
			  where id = $1`,
			[m.id, node, m.gradesAvant, m.statutAvant, n + 1]
		);
	}
	await pg.query(
		'alter table public.question_templates enable trigger update_question_templates_updated_at'
	);
	const avant = LOT.flatMap((m) => m.tagsAvant.map((t) => [m.id, ...t.split('§')]));
	const r = await pg.query(
		`insert into public.question_template_points (template_id, point_id)
		 select r.id, p.id
		   from unnest($1::uuid[], $2::text[], $3::text[]) as r(id, grade, code)
		   join public.curriculum_points p on p.grade = r.grade and p.code = r.code and p.archived_at is null`,
		[avant.map((t) => t[0]), avant.map((t) => t[1]), avant.map((t) => t[2])]
	);
	if (r.rowCount !== avant.length) {
		throw new Error(`tags d'avant posés : ${r.rowCount}/${avant.length}`);
	}
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
		'select id, classification_node_id as node, grades, status, updated_at from public.question_templates where id = any($1::uuid[])',
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

describe('Questions 3e, lot 4b : nœuds et tags (migration de données)', () => {
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

	it('le lot est celui des décisions : 6 brouillons rangés, 6 tags posés, rien d’autre', () => {
		expect(LOT).toHaveLength(6);
		expect(LOT.map((m) => m.id.slice(0, 8)).sort()).toEqual([
			'19889310',
			'320f5ac7',
			'7407f328',
			'77500c81',
			'8cb2cdfd',
			'eb04ebf7'
		]);
		expect(LOT.every((m) => m.statutAvant === 'draft' && m.statutApres === 'draft')).toBe(true);
		expect(LOT.every((m) => m.noeudAvant === null && m.tagsAvant.length === 0)).toBe(true);
		expect(LOT.every((m) => m.gradesAvant.join() === '3' && m.gradesApres.join() === '3')).toBe(
			true
		);
		expect(cles('tagsAvant')).toEqual([]);
		expect(cles('tagsApres')).toHaveLength(6);
		expect(LOT.map((m) => [m.id.slice(0, 8), m.tagsApres.join(), m.noeudApres])).toEqual([
			[
				'19889310',
				'3§3-037',
				'Proportionnalité > Situations de proportionnalité > caractérisation'
			],
			['320f5ac7', '3§3-057', 'Algèbre > Inéquations : premier degré > ax + b < c'],
			['7407f328', '3§3-046', 'Fonctions > Fonction carré > définition et courbe'],
			['77500c81', '3§3-065', 'Fonctions > Fonctions affines > fonction linéaire'],
			['8cb2cdfd', '3§3-053', 'Fonctions > Fonction carré > x² = k, x² < k'],
			['eb04ebf7', '3§3-042', 'Fonctions > Fonctions affines > fonction linéaire']
		]);
	});

	it('chaque modèle est EXACTEMENT au nœud attendu', () => {
		expect(LOT.map((m) => apres.noeuds.get(m.id))).toEqual(LOT.map((m) => m.noeudApres));
	});

	it('chaque modèle garde EXACTEMENT ses niveaux', () => {
		expect(LOT.map((m) => apres.grades.get(m.id))).toEqual(LOT.map((m) => m.gradesApres));
	});

	it('chaque modèle garde EXACTEMENT son statut', () => {
		expect(LOT.map((m) => apres.statuts.get(m.id))).toEqual(LOT.map((m) => m.statutApres));
	});

	it('les modèles portent EXACTEMENT les tags du lot, rien de plus', () => {
		expect(apres.tags).toEqual(cles('tagsApres'));
	});

	it('`updated_at` des modèles est préservé', () => {
		expect([...apres.dates.values()]).toEqual(ids.map(() => AVANT));
	});

	it('le rollback écrit dans la migration rend l’état d’avant', () => {
		expect(annule.tags).toEqual(cles('tagsAvant'));
		expect(LOT.map((m) => annule.noeuds.get(m.id))).toEqual(LOT.map((m) => m.noeudAvant ?? '∅'));
		expect(LOT.map((m) => annule.grades.get(m.id))).toEqual(LOT.map((m) => m.gradesAvant));
		expect(LOT.map((m) => annule.statuts.get(m.id))).toEqual(LOT.map((m) => m.statutAvant));
		expect([...annule.dates.values()]).toEqual(ids.map(() => AVANT));
	});
});

describe('Questions 3e, lot 4b : les branches d’échec de la migration', () => {
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
				/identifiants partiellement présents : 5 modèle\(s\) sur 6/
			);
		});
	});

	it('un brouillon rangé à la main depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.question_templates set classification_node_id = p.node_id
				   from public.curriculum_points p
				  where question_templates.id = $1 and p.grade = '3' and p.code = '3-042' and p.archived_at is null`,
				[id('eb04ebf7')]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles déplacés depuis le relevé : 1/
			);
		});
	});

	it('un point du lot archivé depuis le relevé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = '3' and code = '3-053' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\) de modèle, 1 point\(s\)/
			);
		});
	});

	it('des niveaux changés depuis le relevé font échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(`update public.question_templates set grades = array['4'] where id = $1`, [
				id('77500c81')
			]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/niveaux changés depuis le relevé : 1/
			);
		});
	});

	it('un brouillon publié depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(`update public.question_templates set status = 'published' where id = $1`, [
				id('320f5ac7')
			]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/statuts changés depuis le relevé : 1/
			);
		});
	});

	// Pas de cas « tag ajouté depuis le relevé » : les 6 modèles sont sans nœud, et le trigger des tags
	// refuse de taguer un modèle qui n'est rangé nulle part. Ranger puis taguer échoue déjà sur la
	// garde des nœuds (cas « brouillon rangé à la main »).

	it('le rollback refuse si un point posé ne peut plus être résolu (point archivé)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = '3' and code = '3-046' and archived_at is null`
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : chemins ou points introuvables/
			);
		});
	});

	it('le rollback refuse si un modèle a changé de niveaux depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`update public.question_templates set grades = array['3', '4'] where id = $1`,
				[id('eb04ebf7')]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : 5 modèle\(s\) sur 6 ont encore le nœud, les niveaux et le statut de la migration/
			);
		});
	});

	it('le rollback refuse si un brouillon a été publié depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(`update public.question_templates set status = 'published' where id = $1`, [
				id('77500c81')
			]);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : 5 modèle\(s\) sur 6 ont encore/
			);
		});
	});

	it('le rollback refuse si un tag a été retiré depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query('delete from public.question_template_points where template_id = $1', [
				id('7407f328')
			]);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : tags changés depuis la migration \(5 du lot sur 5, attendus 6\)/
			);
		});
	});

	it('le rollback refuse si un modèle a disparu depuis la migration (TOUT ou RIEN)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query('delete from public.question_templates where id = $1', [id('320f5ac7')]);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : identifiants partiellement présents : 5 modèle\(s\) sur 6/
			);
		});
	});

	it('base sans les modèles (locale) : le rollback ne touche rien et passe', async () => {
		await enTransaction(async () => {
			await expect(pg.query(extractRollback(MIGRATION))).resolves.toBeDefined();
		});
	});
});
