/**
 * Chantier « questions-2de », lot « corrections » : niveaux, nœuds et tags (Supabase local requis)
 * ==============================================================================================
 *
 * Migration `20261027192100_questions_2de_rangement_tags` : 6 modèles de 1re spé tagués d'un point
 * de seconde passent en [2, 1_SPE] (tag gardé) ; a26e6e50, 68db64b0, f96d3e43 partent en terminale
 * spé (tag de seconde → TSPE-306 / TSPE-599, nœud de leur point) ; 4cc21ccd et c7cdca01 perdent
 * 2-328. Décisions de David du 2026-10-27 (journal docs/wip/questions-2de-progress.md §§ 5-6).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, à leur nœud, à leurs niveaux, à leur statut et avec
 * leurs tags d'avant — puis rejoue la migration **depuis son fichier**, dans une transaction
 * annulée à la fin. Les triggers de garde des tags restent actifs : chaque tag posé a passé la
 * règle du nœud. Le lot (fixture) est écrit par docs/wip/questions-2de/lot-rangement-2de.py, avec
 * la migration, depuis le relevé de la prod du 2026-10-27.
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

const MIGRATION = 'supabase/migrations/20261027192100_questions_2de_rangement_tags.sql';
/** Le lot, tel que relevé en prod le 2026-10-27 (tags en « programme§code »). */
const LOT: Modele[] = JSON.parse(
	readFileSync('tests/integration/fixtures/questions-2de-rangement.json', 'utf-8')
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
	for (const [n, m] of LOT.entries()) {
		const node = parChemin.get(m.noeudAvant);
		if (!node) throw new Error(`chemin introuvable : ${m.noeudAvant}`);
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

describe('Questions 2de : niveaux, nœuds et tags (migration de données)', () => {
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

	it('le lot est celui des décisions : 9 niveaux changés, 3 déplacés, 3 tags posés, 5 retirés', () => {
		expect(LOT).toHaveLength(11);
		expect(LOT.filter((m) => m.noeudAvant !== m.noeudApres)).toHaveLength(3);
		expect(LOT.filter((m) => m.gradesApres.join() !== m.gradesAvant.join())).toHaveLength(9);
		const avant = new Set(cles('tagsAvant'));
		const apres = new Set(cles('tagsApres'));
		expect([...apres].filter((t) => !avant.has(t))).toHaveLength(3);
		expect([...avant].filter((t) => !apres.has(t))).toHaveLength(5);
		expect(['4cc21ccd', 'c7cdca01'].map((c) => LOT.find((m) => m.id === id(c))?.tagsApres)).toEqual(
			[[], []]
		);
		expect(LOT.filter((m) => m.gradesAvant.join() === '1_SPE').map((m) => m.gradesApres)).toEqual(
			Array(6).fill(['2', '1_SPE'])
		);
	});

	it('chaque modèle est EXACTEMENT au nœud attendu', () => {
		expect(LOT.map((m) => apres.noeuds.get(m.id))).toEqual(LOT.map((m) => m.noeudApres));
	});

	it('chaque modèle a EXACTEMENT les niveaux attendus', () => {
		expect(LOT.map((m) => apres.grades.get(m.id))).toEqual(LOT.map((m) => m.gradesApres));
	});

	it('aucun statut ne change', () => {
		expect(LOT.map((m) => apres.statuts.get(m.id))).toEqual(LOT.map((m) => m.statutApres));
	});

	it('les modèles portent EXACTEMENT les tags du lot, rien de plus (gardés, posés ; retirés partis)', () => {
		expect(apres.tags).toEqual(cles('tagsApres'));
	});

	it('`updated_at` des modèles est préservé', () => {
		expect([...apres.dates.values()]).toEqual(ids.map(() => AVANT));
	});

	it('le rollback écrit dans la migration rend l’état d’avant', () => {
		expect(annule.tags).toEqual(cles('tagsAvant'));
		expect(LOT.map((m) => annule.noeuds.get(m.id))).toEqual(LOT.map((m) => m.noeudAvant));
		expect(LOT.map((m) => annule.grades.get(m.id))).toEqual(LOT.map((m) => m.gradesAvant));
		expect(LOT.map((m) => annule.statuts.get(m.id))).toEqual(LOT.map((m) => m.statutAvant));
		expect([...annule.dates.values()]).toEqual(ids.map(() => AVANT));
	});
});

describe('Questions 2de, rangement : les branches d’échec de la migration', () => {
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
				/identifiants partiellement présents : 10 modèle\(s\) sur 11/
			);
		});
	});

	it('un modèle déplacé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			// Un modèle tagué ne peut pas perdre son rangement : le tag part d'abord (la garde des
			// nœuds passe avant celle des tags).
			await pg.query('delete from public.question_template_points where template_id = $1', [
				id('68db64b0')
			]);
			await pg.query(
				'update public.question_templates set classification_node_id = null where id = $1',
				[id('68db64b0')]
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
				`update public.curriculum_points set archived_at = now() where grade = 'T_SPE' and code = 'TSPE-599' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\) de modèle, 2 point\(s\)/
			);
		});
	});

	it('des niveaux changés depuis le relevé font échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(`update public.question_templates set grades = array['2'] where id = $1`, [
				id('8b59ca4b')
			]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/niveaux changés depuis le relevé : 1/
			);
		});
	});

	it('un statut changé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(`update public.question_templates set status = 'published' where id = $1`, [
				id('a26e6e50')
			]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/statuts changés depuis le relevé : 1/
			);
		});
	});

	it('un tag retiré depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`delete from public.question_template_points q using public.curriculum_points p
				  where q.template_id = $1 and p.id = q.point_id and p.code = '2-328'`,
				[id('4cc21ccd')]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/tags différents du relevé : -4cc21ccd 2-328/
			);
		});
	});

	it('un tag changé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			// Un point par programme : 2-403 laisse sa place à 2-201 (même nœud).
			await pg.query('delete from public.question_template_points where template_id = $1', [
				id('5062197a')
			]);
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points where grade = '2' and code = '2-201' and archived_at is null`,
				[id('5062197a')]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/tags différents du relevé : (?=.*\+5062197a 2-201)(?=.*-5062197a 2-403)/
			);
		});
	});

	it('le rollback refuse si 2-328 ne peut pas être reposé (point archivé)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = '2' and code = '2-328' and archived_at is null`
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
			await pg.query(`update public.question_templates set grades = array['1_SPE'] where id = $1`, [
				id('8b59ca4b')
			]);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : 10 modèle\(s\) sur 11 ont encore le nœud, les niveaux et le statut de la migration/
			);
		});
	});

	it('le rollback refuse si un modèle a été publié depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(`update public.question_templates set status = 'published' where id = $1`, [
				id('f96d3e43')
			]);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : 10 modèle\(s\) sur 11 ont encore/
			);
		});
	});

	it('le rollback refuse si un tag a été posé depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points where grade = '2' and code = '2-352' and archived_at is null`,
				[id('4cc21ccd')]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : tags changés depuis la migration \(9 du lot sur 10, attendus 9\)/
			);
		});
	});

	it('le rollback refuse si un modèle a disparu depuis la migration (TOUT ou RIEN)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query('delete from public.question_templates where id = $1', [id('c7cdca01')]);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : identifiants partiellement présents : 10 modèle\(s\) sur 11/
			);
		});
	});

	it('base sans les modèles (locale) : le rollback ne touche rien et passe', async () => {
		await enTransaction(async () => {
			await expect(pg.query(extractRollback(MIGRATION))).resolves.toBeDefined();
		});
	});
});
