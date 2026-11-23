/**
 * Chantier « questions-cm1 », lot 8b (heures et durées) : nœuds et tags (Supabase local requis)
 * ===============================================================================================
 *
 * Migration `20261118071618_questions_cm1_lot8b_rangement_tags` : une sous-notion neuve
 * (« Grandeurs et mesures > Aires > aires sur quadrillage ») ; les 6 brouillons du lot 8b (aires et
 * angles, créés sans nœud ni tag) vont sur leur nœud, tags posés (CM1-086 à 091, CM2-071, 072, 076
 * à 078). Aucun niveau ni statut ne change. Décisions de David du 2026-11-18 (journal
 * docs/archive/wip/questions-cm1-progress.md § 22, 22 bis, 22 ter).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, à leur nœud (ou sans), à leurs niveaux, à leur statut et
 * avec leurs tags — puis rejoue la migration **depuis son fichier**, dans une transaction annulée à
 * la fin. Les triggers de garde des tags restent actifs : chaque tag posé a passé la règle du nœud.
 * Le lot (fixture) est écrit par docs/wip/questions/lot-cm1-8b-rangement.py, avec la migration,
 * depuis le relevé de la prod du 2026-11-18.
 *
 * @vitest-environment node
 *
 * @migration-de-donnees : hors des PR, rejoué la nuit (scripts/ci-integration-exclusions.sh)
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
	/** Chemins des sous-notions actives (toutes). */
	chemins: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261118071618_questions_cm1_lot8b_rangement_tags.sql';
/** Le lot, tel que relevé en prod le 2026-11-18 (tags en « programme§code »). */
const LOT: Modele[] = JSON.parse(
	readFileSync('tests/integration/fixtures/questions-cm1-lot8b-rangement.json', 'utf-8')
) as Modele[];
/** Modèle d'un identifiant court (8 caractères). */
function id(court: string): string {
	const m = LOT.find((x) => x.id.startsWith(court));
	if (!m) throw new Error(`modèle absent du lot : ${court}`);
	return m.id;
}
const ids = LOT.map((m) => m.id);
/** Sous-notion créée par la migration. */
const NEUVES = ['Grandeurs et mesures > Aires > aires sur quadrillage'];
/** Modèle hors du lot, posé sur la sous-notion neuve pour éprouver la garde du rollback. */
const INTRUS = '00000000-0000-4000-8000-0000000008b1';
/** Date de modification fabriquée : elle ne doit pas bouger (ranger et taguer ne modifient pas le contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

function cles(cote: 'tagsAvant' | 'tagsApres'): string[] {
	return LOT.flatMap((m) => m[cote].map((t) => `${m.id}§${t}`)).sort();
}

async function cheminsActifs(pg: Client): Promise<Map<string, string>> {
	const parChemin = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) {
		if (!node.archived) parChemin.set(node.path, id);
	}
	return parChemin;
}

/**
 * La base de la CI (et une base locale à jour) porte déjà cette migration : la sous-notion
 * existe. On retrouve l'état d'avant par son rollback (sans les modèles, il ne touche qu'elle).
 */
async function defaireSiAppliquee(pg: Client): Promise<void> {
	if ((await cheminsActifs(pg)).has(NEUVES[0])) await pg.query(extractRollback(MIGRATION));
}

/** Pose l'état de la prod : les copies des modèles, à leur nœud (ou sans), niveaux et statut d'avant, avec leurs tags d'avant. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await defaireSiAppliquee(pg);
	await insertProdCopies(pg, {
		templateIds: ids,
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	const parChemin = await cheminsActifs(pg);
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
	const sousNotions: string[] = [];
	for (const [id, node] of await readNodePaths(pg)) {
		chemins.set(id, node.path);
		if (!node.archived && node.path.split(' > ').length === 3) sousNotions.push(node.path);
	}
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
		tags: t.rows.map((r) => `${r.template_id}§${r.grade}§${r.code}`).sort(),
		chemins: sousNotions.sort()
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('Questions CM1, lot 8b : sous-notion, nœuds et tags (migration de données)', () => {
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

	it('la sous-notion neuve est créée, une fois, et rien d’autre', () => {
		for (const c of NEUVES) expect(avant.chemins).not.toContain(c);
		expect(apres.chemins).toEqual([...avant.chemins, ...NEUVES].sort());
	});

	it('le lot est celui des décisions : 6 brouillons rangés et tagués, rien d’autre', () => {
		const A = 'Grandeurs et mesures > Aires';
		const G = 'Grandeurs et mesures > Angles';
		const CM12 = 'CM1,CM2';
		const attendus: [string, string, string, string][] = [
			['31d64c00', A + ' > aires sur quadrillage', CM12, 'CM1§CM1-087,CM2§CM2-072'],
			['4c1ce174', G, CM12, 'CM1§CM1-090,CM2§CM2-077'],
			['614048c9', A + ' > unités et conversions', 'CM1', 'CM1§CM1-088'],
			['8da9f669', G, CM12, 'CM1§CM1-089,CM2§CM2-076'],
			['97f2374b', G + ' > comparaison', CM12, 'CM1§CM1-091,CM2§CM2-078'],
			['d623374d', A + ' > aires sur quadrillage', CM12, 'CM1§CM1-086,CM2§CM2-071']
		];
		expect(
			LOT.map((m) => [
				m.id.slice(0, 8),
				m.noeudAvant,
				m.noeudApres,
				m.gradesAvant.join(),
				m.gradesApres.join(),
				m.statutAvant,
				m.statutApres,
				m.tagsAvant.join(),
				m.tagsApres.join()
			])
		).toEqual(
			attendus.map(([court, noeud, grades, tags]) => [
				court,
				null,
				noeud,
				grades,
				grades,
				'draft',
				'draft',
				'',
				tags
			])
		);
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

	it('le rollback écrit dans la migration rend l’état d’avant (sans nœud, sans tag, sans la sous-notion neuve)', () => {
		expect(annule.chemins).toEqual(avant.chemins);
		expect(annule.tags).toEqual(cles('tagsAvant'));
		expect(LOT.map((m) => annule.noeuds.get(m.id))).toEqual(LOT.map((m) => m.noeudAvant ?? '∅'));
		expect(LOT.map((m) => annule.grades.get(m.id))).toEqual(LOT.map((m) => m.gradesAvant));
		expect(LOT.map((m) => annule.statuts.get(m.id))).toEqual(LOT.map((m) => m.statutAvant));
		expect([...annule.dates.values()]).toEqual(ids.map(() => AVANT));
	});
});

describe('Questions CM1, lot 8b : les branches d’échec de la migration', () => {
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

	it('base sans les modèles (locale) : la migration ne touche aucun modèle, crée la sous-notion et passe', async () => {
		await enTransaction(async () => {
			await defaireSiAppliquee(pg);
			// Base remplie par `pnpm db:seed-riche` : elle porte les modèles de la prod ; on les retire.
			await pg.query('delete from public.question_templates where id = any($1::uuid[])', [ids]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).resolves.toBeDefined();
			const chemins = await cheminsActifs(pg);
			for (const c of NEUVES) expect(chemins.has(c)).toBe(true);
		});
	});

	it('une sous-notion déjà créée à la main (autre casse) fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			const notion = (await cheminsActifs(pg)).get('Grandeurs et mesures > Aires');
			await pg.query(
				`insert into public.classification_nodes (kind, parent_id, name, position)
				 values ('subnotion', $1, 'Aires sur quadrillage', 99)`,
				[notion]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/sous-notions déjà présentes : 1/
			);
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
				  where question_templates.id = $1 and p.grade = 'CM1' and p.code = 'CM1-086' and p.archived_at is null`,
				[id('d623374d')]
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
				`update public.curriculum_points set archived_at = now() where grade = 'CM1' and code = 'CM1-091' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\) de modèle, 1 point\(s\)/
			);
		});
	});

	it('des niveaux changés depuis le relevé font échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.question_templates set grades = array['CM1', 'CM2'] where id = $1`,
				[id('614048c9')]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/niveaux changés depuis le relevé : 1/
			);
		});
	});

	it('un brouillon publié depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(`update public.question_templates set status = 'published' where id = $1`, [
				id('31d64c00')
			]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/statuts changés depuis le relevé : 1/
			);
		});
	});

	// Un brouillon sans nœud ne peut pas recevoir de tag (trigger de garde) : un tag posé à la main
	// suppose qu'il a d'abord été rangé à la main.
	it('un brouillon rangé ET tagué à la main depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.question_templates set classification_node_id = p.node_id
				   from public.curriculum_points p
				  where question_templates.id = $1 and p.grade = 'CM1' and p.code = 'CM1-089' and p.archived_at is null`,
				[id('8da9f669')]
			);
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, p.id from public.curriculum_points p
				  where p.grade = 'CM1' and p.code = 'CM1-089' and p.archived_at is null`,
				[id('8da9f669')]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles déplacés depuis le relevé : 1/
			);
		});
	});

	it('le rollback refuse si un point posé ne peut plus être résolu (point archivé)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = 'CM1' and code = 'CM1-091' and archived_at is null`
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
				`update public.question_templates set grades = array['CM1', 'CM2'] where id = $1`,
				[id('614048c9')]
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
				id('97f2374b')
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
				id('d623374d')
			]);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : tags changés depuis la migration \(9 du lot sur 9, attendus 11\)/
			);
		});
	});

	it('le rollback refuse si un modèle a disparu depuis la migration (TOUT ou RIEN)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query('delete from public.question_templates where id = $1', [id('31d64c00')]);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : identifiants partiellement présents : 5 modèle\(s\) sur 6/
			);
		});
	});

	it('base sans les modèles (locale) : le rollback ne touche rien et passe', async () => {
		await enTransaction(async () => {
			// Base remplie par `pnpm db:seed-riche` : elle porte les modèles de la prod ; on les retire.
			await pg.query('delete from public.question_templates where id = any($1::uuid[])', [ids]);
			await defaireSiAppliquee(pg);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await expect(pg.query(extractRollback(MIGRATION))).resolves.toBeDefined();
			for (const c of NEUVES) expect((await cheminsActifs(pg)).has(c)).toBe(false);
		});
	});

	it('rollback refusé si la sous-notion neuve porte un modèle hors du lot', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await insertProdCopies(pg, {
				templateIds: [INTRUS],
				exerciseIds: [],
				authorId: auteur,
				timestamp: AVANT
			});
			const sn = (await cheminsActifs(pg)).get(NEUVES[0]);
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[INTRUS, sn]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/une sous-notion neuve porte autre chose que les modèles du lot/
			);
		});
	});
});
