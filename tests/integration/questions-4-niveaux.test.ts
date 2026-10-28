/**
 * Chantier « questions-4 », lot 0 : niveaux, nœuds et tags de 7 modèles de 4e sans point (Supabase local requis)
 * ===========================================================================================================
 *
 * Migration `20261028223000_questions_4_niveaux` : 7 modèles marqués 4e sans point prennent le niveau
 * de leur point : factorisation numérique (2) → [5] + 5-008, déplacés sur « distributivité » ;
 * a/x = b (2) → [2] + 2-464, déplacés sur « Fonction inverse » ; puissance d'une puissance (3) →
 * [2] + 2-260, nœud gardé. 17f3dfcd part de [3] (lot 0 de la 3e, joué avant). Décisions de David du
 * 2026-10-28 (journal docs/wip/questions-4-progress.md § 6).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, à leur nœud, à leurs niveaux, à leur statut et sans
 * tag — puis rejoue la migration **depuis son fichier**, dans une transaction annulée à la fin.
 * Les triggers de garde des tags restent actifs : chaque tag posé a passé la règle du nœud. Le lot
 * (fixture) est écrit par docs/wip/questions-4/lot-niveaux-4.py, avec la migration, depuis le relevé
 * de la prod du 2026-10-28.
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
	noeudAvant: string;
	noeudApres: string;
	gradesAvant: string[];
	gradesApres: string[];
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

const MIGRATION = 'supabase/migrations/20261028223000_questions_4_niveaux.sql';
/** Le lot, tel que relevé en prod le 2026-10-28 (tags en « programme§code »). */
const LOT: Modele[] = JSON.parse(
	readFileSync('tests/integration/fixtures/questions-4-niveaux.json', 'utf-8')
) as Modele[];
/** Tous les modèles du lot sont relevés publiés, aux niveaux [4] ([3] pour 17f3dfcd, après la 3e). */
const STATUT_AVANT = 'published';
const FACTORISER = '2de1b93d-925e-40f7-a074-f8d7de584d04';
const PUISSANCE = '17f3dfcd-01e4-460f-9b94-40be348c2ed7';
const ids = LOT.map((m) => m.id);
/** Date de modification fabriquée : elle ne doit pas bouger (ranger et taguer ne modifient pas le contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

function cles(cote: 'tagsAvant' | 'tagsApres'): string[] {
	return LOT.flatMap((m) => m[cote].map((t) => `${m.id}§${t}`)).sort();
}

/** Pose l'état de la prod : les copies des modèles, à leur nœud, niveaux et statut d'avant, avec leurs tags d'avant. */
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
	// Copies publiées : un niveau chacune, sinon elles partagent une catégorie
	// (idx_question_templates_unique_category ne tolère qu'un modèle publié par catégorie).
	await pg.query(
		`update public.question_templates q
		    set classification_node_id = r.node, grades = string_to_array(r.grades, ','), status = $4, level = r.n
		   from unnest($1::uuid[], $2::uuid[], $3::text[]) with ordinality as r(id, node, grades, n)
		  where q.id = r.id`,
		[
			ids,
			LOT.map((m) => {
				const node = parChemin.get(m.noeudAvant);
				if (!node) throw new Error(`chemin introuvable : ${m.noeudAvant}`);
				return node;
			}),
			LOT.map((m) => m.gradesAvant.join(',')),
			STATUT_AVANT
		]
	);
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

describe('Questions 4e, lot 0 : niveaux, nœuds et tags (migration de données)', () => {
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

	it('le lot est celui des décisions : 7 niveaux changés, 7 tags, 4 déplacements, 17f3dfcd part de [3]', () => {
		expect(LOT).toHaveLength(7);
		expect(LOT.filter((m) => m.noeudAvant !== m.noeudApres)).toHaveLength(4);
		expect(LOT.filter((m) => m.gradesApres.join() !== m.gradesAvant.join())).toHaveLength(7);
		expect(LOT.filter((m) => m.gradesAvant.join() === '4')).toHaveLength(6);
		expect(LOT.find((m) => m.id === PUISSANCE)?.gradesAvant).toEqual(['3']);
		expect(LOT.flatMap((m) => m.tagsAvant)).toHaveLength(0);
		const tags = LOT.flatMap((m) => m.tagsApres).sort();
		expect(tags).toEqual([
			...Array(3).fill('2§2-260'),
			...Array(2).fill('2§2-464'),
			...Array(2).fill('5§5-008')
		]);
		for (const m of LOT) expect(m.gradesApres).toEqual([m.tagsApres[0].split('§')[0]]);
	});

	it('chaque modèle est EXACTEMENT au nœud attendu', () => {
		expect(LOT.map((m) => apres.noeuds.get(m.id))).toEqual(LOT.map((m) => m.noeudApres));
	});

	it('chaque modèle a EXACTEMENT les niveaux attendus', () => {
		expect(LOT.map((m) => apres.grades.get(m.id))).toEqual(LOT.map((m) => m.gradesApres));
	});

	it('chaque modèle reste publié', () => {
		expect(LOT.map((m) => apres.statuts.get(m.id))).toEqual(LOT.map(() => 'published'));
	});

	it('les modèles portent EXACTEMENT les tags du lot, rien de plus', () => {
		expect(apres.tags).toEqual(cles('tagsApres'));
	});

	it('`updated_at` des modèles est préservé', () => {
		expect([...apres.dates.values()]).toEqual(ids.map(() => AVANT));
	});

	it('le rollback écrit dans la migration rend l’état d’avant', () => {
		expect(annule.tags).toEqual([]);
		expect(LOT.map((m) => annule.noeuds.get(m.id))).toEqual(LOT.map((m) => m.noeudAvant));
		expect(LOT.map((m) => annule.grades.get(m.id))).toEqual(LOT.map((m) => m.gradesAvant));
		expect(LOT.map((m) => annule.statuts.get(m.id))).toEqual(LOT.map(() => STATUT_AVANT));
		expect([...annule.dates.values()]).toEqual(ids.map(() => AVANT));
	});
});

describe('Questions 4e, lot 0 : les branches d’échec de la migration', () => {
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
				/identifiants partiellement présents : 6 modèle\(s\) sur 7/
			);
		});
	});

	it('un modèle déplacé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				'update public.question_templates set classification_node_id = null where id = $1',
				[FACTORISER]
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
				`update public.curriculum_points set archived_at = now() where grade = '5' and code = '5-008' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\) de modèle, 2 point\(s\)/
			);
		});
	});

	it('des niveaux changés depuis le relevé font échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(`update public.question_templates set grades = array['3'] where id = $1`, [
				FACTORISER
			]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/niveaux changés depuis le relevé : 1/
			);
		});
	});

	it('un statut changé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(`update public.question_templates set status = 'draft' where id = $1`, [
				FACTORISER
			]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/statuts changés depuis le relevé : 1/
			);
		});
	});

	it('un tag posé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points where grade = '4' and code = '4-070' and archived_at is null`,
				[FACTORISER]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/tags différents du relevé : \+2de1b93d 4-070/
			);
		});
	});

	it('le rollback refuse si un modèle a changé de niveaux depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`update public.question_templates set grades = array['5', '4'] where id = $1`,
				[FACTORISER]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : 6 modèle\(s\) sur 7 ont encore le nœud, les niveaux et le statut de la migration/
			);
		});
	});

	it('le rollback refuse si un modèle a été dépublié depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(`update public.question_templates set status = 'draft' where id = $1`, [
				FACTORISER
			]);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : 6 modèle\(s\) sur 7 ont encore/
			);
		});
	});

	it('le rollback refuse si un tag a été posé depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points where grade = 'CM2' and code = 'CM2-047' and archived_at is null`,
				[FACTORISER]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : tags changés depuis la migration \(7 du lot sur 8, attendus 7\)/
			);
		});
	});

	it('le rollback refuse si un modèle a disparu depuis la migration (TOUT ou RIEN)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query('delete from public.question_templates where id = $1', [FACTORISER]);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : identifiants partiellement présents : 6 modèle\(s\) sur 7/
			);
		});
	});

	it('base sans les modèles (locale) : le rollback ne touche rien et passe', async () => {
		await enTransaction(async () => {
			await expect(pg.query(extractRollback(MIGRATION))).resolves.toBeDefined();
		});
	});
});
