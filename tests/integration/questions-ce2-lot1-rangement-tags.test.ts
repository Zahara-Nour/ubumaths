/**
 * Chantier « questions-ce2 », lots 0 et 1 : rangement, tags, niveaux et statut (Supabase local requis)
 * ===================================================================================================
 *
 * Migration `20261028130100_questions_ce2_lot1_rangement_tags` : les 5 brouillons du lot 1 (sans
 * nœud ni tag) vont sur le nœud de leur point et reçoivent son tag ; 03675b9b (Les multiples de
 * 25) passe de [CE1] à [CE1, CE2] et reçoit CE2-077 ; 427c735c et 44c46578 repassent en
 * brouillon. Phase 0 validée par David le 2026-10-28 (journal docs/wip/questions-ce2-progress.md
 * § 4 bis et § 5).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, à leur nœud, à leurs niveaux, à leur statut et avec
 * leurs tags d'avant — puis rejoue la migration **depuis son fichier**, dans une transaction
 * annulée à la fin. Les triggers de garde des tags restent actifs : chaque tag posé a passé la
 * règle du nœud.
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
	/** `null` : brouillon neuf, relevé sans nœud. */
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

const MIGRATION = 'supabase/migrations/20261028130100_questions_ce2_lot1_rangement_tags.sql';
const TABLES = 'Nombres et calculs > Entiers : addition et soustraction > tables';
const DOUBLE_ADDITION =
	'Nombres et calculs > Entiers : addition et soustraction > double et moitié';
const DECOMPOSITION = 'Nombres et calculs > Entiers : multiplication > décomposition';
const PRODUIT = 'Nombres et calculs > Entiers : multiplication > calcul astucieux';
const PARTICULIERS = 'Nombres et calculs > Entiers : multiplication > produits particuliers';
/** Lu par `lireEtat` pour un modèle sans nœud. */
const SANS_NOEUD = '∅';

function brouillon(id: string, noeud: string, code: string): Modele {
	return {
		id,
		noeudAvant: null,
		noeudApres: noeud,
		gradesAvant: ['CE2'],
		gradesApres: ['CE2'],
		statutAvant: 'draft',
		statutApres: 'draft',
		tagsAvant: [],
		tagsApres: [`CE2§${code}`]
	};
}

function jumeau(id: string): Modele {
	return {
		id,
		noeudAvant: DOUBLE_ADDITION,
		noeudApres: DOUBLE_ADDITION,
		gradesAvant: ['CE2'],
		gradesApres: ['CE2'],
		statutAvant: 'published',
		statutApres: 'draft',
		tagsAvant: [],
		tagsApres: []
	};
}

/** Le lot, tel que relevé en prod le 2026-10-28 (tags en « programme§code »). */
const LOT: Modele[] = [
	{
		id: '03675b9b-030e-46f5-9316-abfd55cbc2a2',
		noeudAvant: PARTICULIERS,
		noeudApres: PARTICULIERS,
		gradesAvant: ['CE1'],
		gradesApres: ['CE1', 'CE2'],
		statutAvant: 'published',
		statutApres: 'published',
		tagsAvant: ['CE1§CE1-083'],
		tagsApres: ['CE1§CE1-083', 'CE2§CE2-077']
	},
	brouillon('0c9071d1-e498-4c1b-913f-6c7753416a49', TABLES, 'CE2-020'),
	brouillon('2cdbac43-8e03-461b-8307-60232192f890', DECOMPOSITION, 'CE2-078'),
	brouillon('32c0d191-649a-4133-9eda-b94b6e40e450', PRODUIT, 'CE2-093'),
	jumeau('427c735c-aaa5-4ddd-9da6-40e3c46997bd'),
	jumeau('44c46578-b2fd-43d9-b672-498219ef229c'),
	brouillon('df4f2372-bce6-4480-a279-eb08ffb84ec7', PRODUIT, 'CE2-026'),
	brouillon('e7763a96-991f-49d4-8e13-08dcbd109eea', TABLES, 'CE2-084')
];
const ids = LOT.map((m) => m.id);
const BROUILLON_NEUF = '0c9071d1-e498-4c1b-913f-6c7753416a49';
const MULTIPLES_25 = '03675b9b-030e-46f5-9316-abfd55cbc2a2';
const JUMEAU = '427c735c-aaa5-4ddd-9da6-40e3c46997bd';
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
		    set classification_node_id = r.node, grades = string_to_array(r.grades, ','), status = r.statut, level = r.n
		   from unnest($1::uuid[], $2::uuid[], $3::text[], $4::text[]) with ordinality as r(id, node, grades, statut, n)
		  where q.id = r.id`,
		[
			ids,
			LOT.map((m) => {
				if (m.noeudAvant === null) return null;
				const node = parChemin.get(m.noeudAvant);
				if (!node) throw new Error(`chemin introuvable : ${m.noeudAvant}`);
				return node;
			}),
			LOT.map((m) => m.gradesAvant.join(',')),
			LOT.map((m) => m.statutAvant)
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
		noeuds: new Map(q.rows.map((r) => [r.id, chemins.get(r.node ?? '') ?? SANS_NOEUD])),
		grades: new Map(q.rows.map((r) => [r.id, r.grades])),
		statuts: new Map(q.rows.map((r) => [r.id, r.status])),
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()])),
		tags: t.rows.map((r) => `${r.template_id}§${r.grade}§${r.code}`).sort()
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('Questions CE2, lots 0 et 1 : rangement, tags, niveaux et statut (migration de données)', () => {
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

	it('chaque modèle est EXACTEMENT au nœud attendu (les brouillons sur le nœud de leur point)', () => {
		expect(LOT.map((m) => apres.noeuds.get(m.id))).toEqual(LOT.map((m) => m.noeudApres));
	});

	it('chaque modèle a EXACTEMENT les niveaux attendus (03675b9b en CE1 et CE2)', () => {
		expect(LOT.map((m) => apres.grades.get(m.id))).toEqual(LOT.map((m) => m.gradesApres));
	});

	it('chaque modèle a EXACTEMENT le statut attendu (427c735c et 44c46578 en brouillon)', () => {
		expect(LOT.map((m) => apres.statuts.get(m.id))).toEqual(LOT.map((m) => m.statutApres));
	});

	it('les modèles portent EXACTEMENT les tags du lot, rien de plus (CE1-083 gardé)', () => {
		expect(apres.tags).toEqual(cles('tagsApres'));
	});

	it('`updated_at` des modèles est préservé', () => {
		expect([...apres.dates.values()]).toEqual(ids.map(() => AVANT));
	});

	it('le rollback écrit dans la migration rend l’état d’avant', () => {
		expect(annule.tags).toEqual(cles('tagsAvant'));
		expect(LOT.map((m) => annule.noeuds.get(m.id))).toEqual(
			LOT.map((m) => m.noeudAvant ?? SANS_NOEUD)
		);
		expect(LOT.map((m) => annule.grades.get(m.id))).toEqual(LOT.map((m) => m.gradesAvant));
		expect(LOT.map((m) => annule.statuts.get(m.id))).toEqual(LOT.map((m) => m.statutAvant));
		expect([...annule.dates.values()]).toEqual(ids.map(() => AVANT));
	});
});

describe('Questions CE2, lots 0 et 1 : les branches d’échec de la migration', () => {
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
				/identifiants partiellement présents : 7 modèle\(s\) sur 8/
			);
		});
	});

	it('un brouillon rangé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.question_templates set classification_node_id = (
				   select classification_node_id from public.question_templates where id = $2)
				  where id = $1`,
				[BROUILLON_NEUF, MULTIPLES_25]
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
				`update public.curriculum_points set archived_at = now() where grade = 'CE2' and code = 'CE2-077' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\) de modèle, 1 point\(s\)/
			);
		});
	});

	it('un nœud de destination archivé depuis le relevé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.classification_nodes s set archived_at = now()
				   from public.classification_nodes n
				  where s.parent_id = n.id and s.kind = 'subnotion' and s.name = 'décomposition'
				    and n.name = 'Entiers : multiplication' and s.archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 1 nœud\(s\) de modèle, 0 point\(s\)/
			);
		});
	});

	it('des niveaux changés depuis le relevé font échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.question_templates set grades = array['CE1', 'CE2'] where id = $1`,
				[MULTIPLES_25]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/niveaux changés depuis le relevé : 1/
			);
		});
	});

	it('un statut changé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(`update public.question_templates set status = 'draft' where id = $1`, [
				JUMEAU
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
				  where q.template_id = $1 and p.id = q.point_id and p.code = 'CE1-083'`,
				[MULTIPLES_25]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/tags différents du relevé : -03675b9b CE1-083/
			);
		});
	});

	it('un tag posé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points where grade = 'CE2' and code = 'CE2-077' and archived_at is null`,
				[MULTIPLES_25]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/tags différents du relevé : \+03675b9b CE2-077/
			);
		});
	});

	it('le rollback refuse si un modèle a changé de niveaux depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`update public.question_templates set grades = array['CE1', 'CE2', 'CM1'] where id = $1`,
				[MULTIPLES_25]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : 7 modèle\(s\) sur 8 ont encore le nœud, les niveaux et le statut de la migration/
			);
		});
	});

	it('le rollback refuse si un modèle a été publié depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(`update public.question_templates set status = 'published' where id = $1`, [
				BROUILLON_NEUF
			]);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : 7 modèle\(s\) sur 8 ont encore/
			);
		});
	});

	it('le rollback refuse si un tag a été posé depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points where grade = 'CM1' and code = 'CM1-044' and archived_at is null`,
				['df4f2372-bce6-4480-a279-eb08ffb84ec7']
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : tags changés depuis la migration \(7 du lot sur 8, attendus 7\)/
			);
		});
	});

	it('base sans les modèles (locale) : le rollback ne touche rien et passe', async () => {
		await enTransaction(async () => {
			await expect(pg.query(extractRollback(MIGRATION))).resolves.toBeDefined();
		});
	});
});
