/**
 * Chantier « questions », corrections CP : rangement, niveaux et tags (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261025000100_questions_cp_rangement_tags` : 52c4d773 perd CP-005, passe de
 * « décomposition » à « écritures » et reçoit CP-004 ; les doubles et moitiés (25285413, a3ef26ab,
 * 89bef942) passent de [CP] à [CE1] et reçoivent CE1-028 / CE1-101. Décision de David du
 * 2026-10-24 (journal docs/wip/questions-progress.md § 4 bis).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, à leur nœud, à leurs niveaux et avec leurs tags
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
	noeudAvant: string;
	noeudApres: string;
	gradesAvant: string[];
	gradesApres: string[];
	tagsAvant: string[];
	tagsApres: string[];
}

interface Etat {
	noeuds: Map<string, string>;
	grades: Map<string, string[]>;
	dates: Map<string, string>;
	tags: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261025000100_questions_cp_rangement_tags.sql';
const DOUBLE_ET_MOITIE = 'Nombres et calculs > Entiers : multiplication > double et moitié';
/** Le lot, tel que relevé en prod le 2026-10-24 (tags en « programme§code »). */
const LOT: Modele[] = [
	{
		id: '25285413-ba15-401d-a0e8-fd0a84770f3a',
		noeudAvant: DOUBLE_ET_MOITIE,
		noeudApres: DOUBLE_ET_MOITIE,
		gradesAvant: ['CP'],
		gradesApres: ['CE1'],
		tagsAvant: [],
		tagsApres: ['CE1§CE1-028']
	},
	{
		id: '52c4d773-d86c-45a3-88e4-ddc99cc4beab',
		noeudAvant: 'Nombres et calculs > Entiers : numération > décomposition',
		noeudApres: 'Nombres et calculs > Entiers : numération > écritures',
		gradesAvant: ['CP'],
		gradesApres: ['CP'],
		tagsAvant: ['CP§CP-005'],
		tagsApres: ['CP§CP-004']
	},
	{
		id: '89bef942-2e3f-4f76-8712-4bf7e6f226cf',
		noeudAvant: DOUBLE_ET_MOITIE,
		noeudApres: DOUBLE_ET_MOITIE,
		gradesAvant: ['CP'],
		gradesApres: ['CE1'],
		tagsAvant: [],
		tagsApres: ['CE1§CE1-101']
	},
	{
		id: 'a3ef26ab-2334-4061-86f4-295f5e4e0bc4',
		noeudAvant: DOUBLE_ET_MOITIE,
		noeudApres: DOUBLE_ET_MOITIE,
		gradesAvant: ['CP'],
		gradesApres: ['CE1'],
		tagsAvant: [],
		tagsApres: ['CE1§CE1-028']
	}
];
const ids = LOT.map((m) => m.id);
/** Date de modification fabriquée : elle ne doit pas bouger (ranger et taguer ne modifient pas le contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

function cles(cote: 'tagsAvant' | 'tagsApres'): string[] {
	return LOT.flatMap((m) => m[cote].map((t) => `${m.id}§${t}`)).sort();
}

/** Pose l'état de la prod : les copies des modèles, à leur nœud et à leurs niveaux d'avant, avec leurs tags d'avant. */
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
	await pg.query(
		`update public.question_templates q set classification_node_id = r.node, grades = array['CP']
		   from unnest($1::uuid[], $2::uuid[]) as r(id, node)
		  where q.id = r.id`,
		[
			ids,
			LOT.map((m) => {
				const node = parChemin.get(m.noeudAvant);
				if (!node) throw new Error(`chemin introuvable : ${m.noeudAvant}`);
				return node;
			})
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
	const q = await pg.query<{ id: string; node: string | null; grades: string[]; updated_at: Date }>(
		'select id, classification_node_id as node, grades, updated_at from public.question_templates where id = any($1::uuid[])',
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
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()])),
		tags: t.rows.map((r) => `${r.template_id}§${r.grade}§${r.code}`).sort()
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('Questions CP : rangement, niveaux et tags (migration de données)', () => {
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

	it('chaque modèle est EXACTEMENT au nœud attendu', () => {
		expect(LOT.map((m) => apres.noeuds.get(m.id))).toEqual(LOT.map((m) => m.noeudApres));
	});

	it('chaque modèle a EXACTEMENT les niveaux attendus', () => {
		expect(LOT.map((m) => apres.grades.get(m.id))).toEqual(LOT.map((m) => m.gradesApres));
	});

	it('les modèles portent EXACTEMENT les tags du lot, rien de plus (CP-005 retiré)', () => {
		expect(apres.tags).toEqual(cles('tagsApres'));
	});

	it('`updated_at` des modèles est préservé', () => {
		expect([...apres.dates.values()]).toEqual(ids.map(() => AVANT));
	});

	it('le rollback écrit dans la migration rend l’état d’avant', () => {
		expect(annule.tags).toEqual(cles('tagsAvant'));
		expect(LOT.map((m) => annule.noeuds.get(m.id))).toEqual(LOT.map((m) => m.noeudAvant));
		expect(LOT.map((m) => annule.grades.get(m.id))).toEqual(LOT.map((m) => m.gradesAvant));
		expect([...annule.dates.values()]).toEqual(ids.map(() => AVANT));
	});
});

describe('Questions CP, rangement et tags : les branches d’échec de la migration', () => {
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
				/identifiants partiellement présents : 3 modèle\(s\) sur 4/
			);
		});
	});

	it('un modèle déplacé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				'update public.question_templates set classification_node_id = null where id = $1',
				[ids[0]]
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
				`update public.curriculum_points set archived_at = now() where grade = 'CP' and code = 'CP-004' and archived_at is null`
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
				`update public.question_templates set grades = array['CP', 'CE1'] where id = $1`,
				[ids[0]]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/niveaux changés depuis le relevé : 1/
			);
		});
	});

	it('un tag retiré depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`delete from public.question_template_points q using public.curriculum_points p
				  where q.template_id = $1 and p.id = q.point_id and p.code = 'CP-005'`,
				['52c4d773-d86c-45a3-88e4-ddc99cc4beab']
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/tags différents du relevé : -52c4d773 CP-005/
			);
		});
	});

	it('un tag posé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points where grade = 'CE1' and code = 'CE1-028' and archived_at is null`,
				['25285413-ba15-401d-a0e8-fd0a84770f3a']
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/tags différents du relevé : \+25285413 CE1-028/
			);
		});
	});

	it('le rollback refuse de finir si CP-005 ne peut pas être reposé', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = 'CP' and code = 'CP-005' and archived_at is null`
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : 0 tag\(s\) reposé\(s\) sur 1/
			);
		});
	});
});
