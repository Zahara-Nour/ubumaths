/**
 * Chantier « questions-cm1 », modèle 08 du lot 9b : déplacement vers sa sous-notion (Supabase local requis)
 * ===================================================================================
 *
 * Migration `20261119183452_questions_cm1_08_noeud` : le modèle publié 1dd68bdd (« Résoudre un
 * problème de proportionnalité », CM1-130) passe de la notion Proportionnalité > Situations de
 * proportionnalité à sa sous-notion « quatrième proportionnelle ». Le tag CM1-130 est GARDÉ (son
 * point est sur la notion, parent de la sous-notion) ; niveaux et statut inchangés, aucun nœud créé.
 * Décision de David du 2026-11-19 (journal docs/archive/wip/questions-cm1-progress.md § 26 nonies).
 *
 * Le modèle n'existe qu'en production. Le test fabrique donc l'état de la prod — une copie minimale
 * portant le VRAI identifiant, à son nœud, à ses niveaux, à son statut et avec son tag — puis rejoue
 * la migration **depuis son fichier**, dans une transaction annulée à la fin. Les triggers de garde
 * des tags restent actifs : le tag gardé a passé la règle du nœud après le déplacement.
 * Le lot (fixture) est écrit par docs/wip/questions/lot-cm1-08-noeud.py, avec la migration, depuis
 * le relevé de la prod du 2026-11-19.
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
	/** null : sans nœud. */
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

const MIGRATION = 'supabase/migrations/20261119183452_questions_cm1_08_noeud.sql';
/** Le lot, tel que relevé en prod le 2026-11-19 (tags en « programme§code »). */
const LOT: Modele[] = JSON.parse(
	readFileSync('tests/integration/fixtures/questions-cm1-08-noeud.json', 'utf-8')
) as Modele[];
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

const S = 'Proportionnalité > Situations de proportionnalité';
const MODELE = '1dd68bdd-2c62-4dd5-8908-b82b6a013a7d';

describe('Questions CM1, modèle 08 : déplacement vers « quatrième proportionnelle » (migration de données)', () => {
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

	it('le lot est celui de la décision : un modèle publié déplacé, tag gardé, rien d’autre', () => {
		expect(
			LOT.map((m) => [
				m.id,
				m.noeudAvant,
				m.noeudApres,
				m.gradesAvant.join(),
				m.gradesApres.join(),
				m.statutAvant,
				m.statutApres,
				m.tagsAvant.join(),
				m.tagsApres.join()
			])
		).toEqual([
			[
				MODELE,
				S,
				`${S} > quatrième proportionnelle`,
				'CM1',
				'CM1',
				'published',
				'published',
				'CM1§CM1-130',
				'CM1§CM1-130'
			]
		]);
	});

	it('le modèle est EXACTEMENT sur la sous-notion', () => {
		expect(apres.noeuds.get(MODELE)).toBe(`${S} > quatrième proportionnelle`);
	});

	it('le modèle garde EXACTEMENT ses niveaux et son statut', () => {
		expect(apres.grades.get(MODELE)).toEqual(['CM1']);
		expect(apres.statuts.get(MODELE)).toBe('published');
	});

	it('le modèle garde EXACTEMENT son tag, rien de plus', () => {
		expect(apres.tags).toEqual([`${MODELE}§CM1§CM1-130`]);
	});

	it('`updated_at` du modèle est préservé', () => {
		expect(apres.dates.get(MODELE)).toBe(AVANT);
	});

	it('le rollback écrit dans la migration rend l’état d’avant', () => {
		expect(annule.noeuds.get(MODELE)).toBe(S);
		expect(annule.tags).toEqual(cles('tagsAvant'));
		expect(annule.grades.get(MODELE)).toEqual(['CM1']);
		expect(annule.statuts.get(MODELE)).toBe('published');
		expect(annule.dates.get(MODELE)).toBe(AVANT);
	});
});

describe('Questions CM1, modèle 08 : les branches d’échec de la migration', () => {
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

	/** Range le modèle sur la sous-notion « caractérisation » (déplacement à la main). */
	async function deplacerALaMain(): Promise<void> {
		await pg.query(
			`update public.question_templates set classification_node_id = (
			   select s.id from public.classification_nodes s
			     join public.classification_nodes n on n.id = s.parent_id
			    where s.kind = 'subnotion' and s.name = 'caractérisation' and s.archived_at is null
			      and n.name = 'Situations de proportionnalité' and n.archived_at is null)
			  where id = $1`,
			[MODELE]
		);
	}

	it('base sans le modèle (locale) : la migration ne touche rien et passe', async () => {
		await enTransaction(async () => {
			// Base remplie par `pnpm db:seed-riche` : elle porte les modèles de la prod ; on les retire.
			await pg.query('delete from public.question_templates where id = any($1::uuid[])', [ids]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).resolves.toBeDefined();
		});
	});

	it('un modèle déplacé à la main depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await deplacerALaMain();
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles déplacés depuis le relevé : 1/
			);
		});
	});

	it('le point archivé depuis le relevé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = 'CM1' and code = 'CM1-130' and archived_at is null`
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
				[MODELE]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/niveaux changés depuis le relevé : 1/
			);
		});
	});

	it('un modèle repassé en brouillon depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(`update public.question_templates set status = 'draft' where id = $1`, [
				MODELE
			]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/statuts changés depuis le relevé : 1/
			);
		});
	});

	it('un tag retiré depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_template_points where template_id = $1', [
				MODELE
			]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/tags différents du relevé : -1dd68bdd CM1-130/
			);
		});
	});

	it('le rollback refuse si le modèle a été déplacé depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await deplacerALaMain();
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : 0 modèle\(s\) sur 1 ont encore le nœud, les niveaux et le statut de la migration/
			);
		});
	});

	it('le rollback refuse si le tag a été retiré depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query('delete from public.question_template_points where template_id = $1', [
				MODELE
			]);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : tags changés depuis la migration \(0 du lot sur 0, attendus 1\)/
			);
		});
	});

	it('base sans le modèle (locale) : le rollback ne touche rien et passe', async () => {
		await enTransaction(async () => {
			await pg.query('delete from public.question_templates where id = any($1::uuid[])', [ids]);
			await expect(pg.query(extractRollback(MIGRATION))).resolves.toBeDefined();
		});
	});
});
