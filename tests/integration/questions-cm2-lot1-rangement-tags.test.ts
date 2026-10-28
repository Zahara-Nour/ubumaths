/**
 * Chantier « questions-cm2 », lot 1 : rangement et tags de 8 brouillons, doublon dépublié (Supabase local requis)
 * ==============================================================================================================
 *
 * Migration `20261028160000_questions_cm2_lot1_rangement_tags` : les 8 brouillons du lot 1 (sans
 * nœud ni tag) vont sur le nœud de leur point et reçoivent son tag ; 322f3479 (doublon exact de
 * dd7db98e, CM2-039) repasse en brouillon, nœud et tag inchangés. Phase 0 validée par David le
 * 2026-10-28 (journal docs/wip/questions-cm2-progress.md § 6 et § 6.1).
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

const MIGRATION = 'supabase/migrations/20261028160000_questions_cm2_lot1_rangement_tags.sql';
const DECOMPOSITION = 'Nombres et calculs > Entiers : numération > décomposition';
const ECRITURES = 'Nombres et calculs > Entiers : numération > écritures';
const ORDRE = 'Nombres et calculs > Entiers : numération > ordre';
const FORME_DECIMALE = 'Nombres et calculs > Fractions : sens et écritures > forme décimale';
/** Lu par `lireEtat` pour un modèle sans nœud. */
const SANS_NOEUD = '∅';

function brouillon(id: string, noeud: string, code: string): Modele {
	return {
		id,
		noeudAvant: null,
		noeudApres: noeud,
		gradesAvant: ['CM2'],
		gradesApres: ['CM2'],
		statutAvant: 'draft',
		statutApres: 'draft',
		tagsAvant: [],
		tagsApres: [`CM2§${code}`]
	};
}

/** Le lot, tel que relevé en prod le 2026-10-28 (tags en « programme§code »). */
const LOT: Modele[] = [
	brouillon('0372fe18-23eb-44bd-902c-3f1b675acd9c', DECOMPOSITION, 'CM2-001'),
	brouillon('2953c9c0-5a8b-40df-b1c7-9c840da8c7e4', ORDRE, 'CM2-127'),
	{
		id: '322f3479-0120-4a6d-839a-4e8df194f99e',
		noeudAvant: FORME_DECIMALE,
		noeudApres: FORME_DECIMALE,
		gradesAvant: ['CM2'],
		gradesApres: ['CM2'],
		statutAvant: 'published',
		statutApres: 'draft',
		tagsAvant: ['CM2§CM2-039'],
		tagsApres: ['CM2§CM2-039']
	},
	brouillon('41e8421f-21f0-48f3-9b3a-e2cd0ebca51e', DECOMPOSITION, 'CM2-001'),
	brouillon('69ea8b2a-bea0-44c7-a19c-cb7089e73f19', ORDRE, 'CM2-128'),
	brouillon('7d258acc-919c-4fac-bbd7-27188df31db4', ORDRE, 'CM2-006'),
	brouillon('8e1f6003-e9b1-4761-a68e-8ace9c020248', DECOMPOSITION, 'CM2-004'),
	brouillon('d6466135-abb1-4c73-9dc3-2e81fef71359', ORDRE, 'CM2-005'),
	brouillon('d9872d4f-21d4-4308-8391-49f0553a26d0', ECRITURES, 'CM2-002')
];
const ids = LOT.map((m) => m.id);
const BROUILLON_NEUF = '0372fe18-23eb-44bd-902c-3f1b675acd9c';
const DOUBLON = '322f3479-0120-4a6d-839a-4e8df194f99e';
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

describe('Questions CM2, lot 1 : rangement, tags et doublon dépublié (migration de données)', () => {
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

	it('chaque modèle a EXACTEMENT les niveaux attendus (inchangés)', () => {
		expect(LOT.map((m) => apres.grades.get(m.id))).toEqual(LOT.map((m) => m.gradesApres));
	});

	it('chaque modèle a EXACTEMENT le statut attendu (322f3479 en brouillon)', () => {
		expect(LOT.map((m) => apres.statuts.get(m.id))).toEqual(LOT.map((m) => m.statutApres));
	});

	it('les modèles portent EXACTEMENT les tags du lot, rien de plus (CM2-039 gardé)', () => {
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

describe('Questions CM2, lot 1 : les branches d’échec de la migration', () => {
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
				/identifiants partiellement présents : 8 modèle\(s\) sur 9/
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
				[BROUILLON_NEUF, DOUBLON]
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
				`update public.curriculum_points set archived_at = now() where grade = 'CM2' and code = 'CM2-127' and archived_at is null`
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
				  where s.parent_id = n.id and s.kind = 'subnotion' and s.name = 'écritures'
				    and n.name = 'Entiers : numération' and s.archived_at is null`
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
				`update public.question_templates set grades = array['CM1', 'CM2'] where id = $1`,
				[DOUBLON]
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
				DOUBLON
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
				  where q.template_id = $1 and p.id = q.point_id and p.code = 'CM2-039'`,
				[DOUBLON]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/tags différents du relevé : -322f3479 CM2-039/
			);
		});
	});

	it('un tag posé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points where grade = 'CM1' and code = 'CM1-038' and archived_at is null`,
				[DOUBLON]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/tags différents du relevé : \+322f3479 CM1-038/
			);
		});
	});

	it('le rollback refuse si un modèle a changé de niveaux depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`update public.question_templates set grades = array['CM1', 'CM2'] where id = $1`,
				[DOUBLON]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : 8 modèle\(s\) sur 9 ont encore le nœud, les niveaux et le statut de la migration/
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
				/rollback : 8 modèle\(s\) sur 9 ont encore/
			);
		});
	});

	it('le rollback refuse si un tag a été posé depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points where grade = 'CM1' and code = 'CM1-003' and archived_at is null`,
				[BROUILLON_NEUF]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : tags changés depuis la migration \(9 du lot sur 10, attendus 9\)/
			);
		});
	});

	it('base sans les modèles (locale) : le rollback ne touche rien et passe', async () => {
		await enTransaction(async () => {
			await expect(pg.query(extractRollback(MIGRATION))).resolves.toBeDefined();
		});
	});
});
