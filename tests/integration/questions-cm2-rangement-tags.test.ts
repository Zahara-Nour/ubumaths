/**
 * Chantier « questions-cm2 », lot 0 (changements de niveau) : rangement, tags, niveaux et statut (Supabase local requis)
 * ======================================================================================================================
 *
 * Migration `20261028100100_questions_cm2_rangement_tags` : 10 modèles du CM1 passent au CM2 (tagués,
 * les 3 à trou déplacés vers « égalités à trous ») ; 6 modèles du CM2 passent en 6e et 2 en 5e (tagués) ;
 * 4 repassent en brouillon. Phase 0 validée par David le 2026-10-28 (journal
 * docs/wip/questions-cm2-progress.md § 5).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, à leur nœud, à leurs niveaux, publiées et sans tag — puis
 * rejoue la migration **depuis son fichier**, dans une transaction annulée à la fin. Les triggers de
 * garde des tags restent actifs : chaque tag posé a passé la règle du nœud.
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
	/** Tag posé, en « programme§code » ; aucun tag d'avant (relevé). */
	tagApres: string | null;
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

const MIGRATION = 'supabase/migrations/20261028100100_questions_cm2_rangement_tags.sql';
const MULT_DEC = 'Nombres et calculs > Décimaux : calculs > multiplication';
const DIV_DEC = 'Nombres et calculs > Décimaux : calculs > division';
const ENCADREMENT = 'Nombres et calculs > Décimaux : numération > encadrement';
const ASTUCIEUX = 'Nombres et calculs > Entiers : multiplication > calcul astucieux';
const PARTICULIERS = 'Nombres et calculs > Entiers : multiplication > produits particuliers';
const MULT_FRAC = 'Nombres et calculs > Fractions : calculs > multiplication';
const FORME_DEC = 'Nombres et calculs > Fractions : sens et écritures > forme décimale';
const TROUS = 'Algèbre > Premiers pas algébriques > égalités à trous';
const CRITERES = 'Arithmétique > Divisibilité > critères de divisibilité';
/** Tous les modèles du lot sont relevés publiés, sans tag. */
const STATUT_AVANT = 'published';

function versCm2(id: string, noeud: string, code: string, noeudApres = noeud): Modele {
	return {
		id,
		noeudAvant: noeud,
		noeudApres,
		gradesAvant: ['CM1'],
		gradesApres: ['CM2'],
		statutApres: 'published',
		tagApres: `CM2§${code}`
	};
}

function depuisCm2(id: string, noeud: string, grade: string, code: string): Modele {
	return {
		id,
		noeudAvant: noeud,
		noeudApres: noeud,
		gradesAvant: ['CM2'],
		gradesApres: [grade],
		statutApres: 'published',
		tagApres: `${grade}§${code}`
	};
}

function brouillon(id: string, noeud: string, grade: string): Modele {
	return {
		id,
		noeudAvant: noeud,
		noeudApres: noeud,
		gradesAvant: [grade],
		gradesApres: [grade],
		statutApres: 'draft',
		tagApres: null
	};
}

/** Le lot, tel que relevé en prod le 2026-10-28. */
const LOT: Modele[] = [
	versCm2('32724446-558b-4eea-ad4a-13d7c6afe435', ENCADREMENT, 'CM2-117'),
	versCm2('6379fa20-672c-4771-9d48-6d167a7a922e', ENCADREMENT, 'CM2-117'),
	versCm2('e38d205a-5737-4a0a-a9cd-aab742107c2b', MULT_DEC, 'CM2-042'),
	versCm2('19323604-1e27-4b0f-8a24-1eef76ab6e59', MULT_DEC, 'CM2-042'),
	versCm2('4643ed4a-4cb9-456f-bc7b-a36c99b8290a', ASTUCIEUX, 'CM2-046'),
	versCm2('aa788ca7-bb32-45a3-9566-cc2d70a11d29', MULT_DEC, 'CM2-065', TROUS),
	versCm2('ac2dae38-425e-4f10-ba6a-045c285355d0', MULT_DEC, 'CM2-065', TROUS),
	versCm2('a5d5a7a0-2b7f-4174-a487-4c673fee5eeb', ASTUCIEUX, 'CM2-065', TROUS),
	versCm2('8fa3108c-692b-45d1-ac2a-7d4cb8cbf798', MULT_FRAC, 'CM2-021'),
	versCm2('e320755f-fa1d-4230-9997-c5917e1c56ef', MULT_FRAC, 'CM2-021'),
	depuisCm2('7f0fbff0-88ee-41b7-962c-8ddeb3880a9d', DIV_DEC, '6', '6-121'),
	depuisCm2('3c40e59b-cde5-4eab-85b5-f8bd0f91ed80', MULT_DEC, '6', '6-118'),
	depuisCm2('814a46a9-2f73-4b2d-91e4-2052fc425b53', MULT_DEC, '6', '6-118'),
	depuisCm2('4b543657-6739-4183-8959-32f282fa826f', MULT_DEC, '6', '6-118'),
	depuisCm2('918598f5-d7b0-43f8-b679-f69ab2039134', MULT_DEC, '6', '6-118'),
	depuisCm2('9826af8b-0ba0-4c43-b9ed-dd6ccf552723', MULT_DEC, '6', '6-118'),
	depuisCm2('e81493f7-38fe-4028-a265-872329534ae3', CRITERES, '5', '5-010'),
	depuisCm2('9c03423a-38ce-44e3-ab44-20b4e90659b7', CRITERES, '5', '5-119'),
	brouillon('32351845-9672-415f-9397-fa446b6edd78', PARTICULIERS, 'CM2'),
	brouillon('e58b1357-6fa8-4fce-9518-91d09d9acc49', PARTICULIERS, 'CM2'),
	brouillon('e009f9d0-bc51-452e-9119-b6eff18cfe83', PARTICULIERS, 'CM2'),
	brouillon('322f3479-0120-4a6d-839a-4e8df194f99e', FORME_DEC, 'CM1')
];
const ids = LOT.map((m) => m.id);
const N = LOT.length;
const N_TAGS = LOT.filter((m) => m.tagApres).length;
/** Date de modification fabriquée : elle ne doit pas bouger (ranger et taguer ne modifient pas le contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FUNCTIONS
// ============================================================================

function tagsApres(): string[] {
	return LOT.filter((m) => m.tagApres)
		.map((m) => `${m.id}§${m.tagApres}`)
		.sort();
}

/** Pose l'état de la prod : les copies des modèles, à leur nœud et niveaux d'avant, publiées, sans tag. */
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
	await pg.query(
		'delete from public.question_template_points where template_id = any($1::uuid[])',
		[ids]
	);
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
// TESTS
// ============================================================================

describe('Questions CM2 : rangement, tags, niveaux et statut (migration de données)', () => {
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

	it('chaque modèle est EXACTEMENT au nœud attendu (les 3 à trou sous « égalités à trous »)', () => {
		expect(LOT.map((m) => apres.noeuds.get(m.id))).toEqual(LOT.map((m) => m.noeudApres));
	});

	it('chaque modèle a EXACTEMENT les niveaux attendus (CM1 → CM2, CM2 → 6e et 5e)', () => {
		expect(LOT.map((m) => apres.grades.get(m.id))).toEqual(LOT.map((m) => m.gradesApres));
	});

	it('chaque modèle a EXACTEMENT le statut attendu (4 brouillons)', () => {
		expect(LOT.map((m) => apres.statuts.get(m.id))).toEqual(LOT.map((m) => m.statutApres));
	});

	it('les modèles portent EXACTEMENT les tags du lot, rien de plus', () => {
		expect(apres.tags).toEqual(tagsApres());
		expect(apres.tags).toHaveLength(N_TAGS);
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

describe('Questions CM2, rangement et tags : les branches d’échec de la migration', () => {
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
				new RegExp(`identifiants partiellement présents : ${N - 1} modèle\\(s\\) sur ${N}`)
			);
		});
	});

	it('un modèle déplacé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				'update public.question_templates set classification_node_id = null where id = $1',
				['aa788ca7-bb32-45a3-9566-cc2d70a11d29']
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
				`update public.curriculum_points set archived_at = now() where grade = '6' and code = '6-118' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\) de modèle, 5 point\(s\)/
			);
		});
	});

	it('des niveaux changés depuis le relevé font échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(`update public.question_templates set grades = array['CM2'] where id = $1`, [
				'32724446-558b-4eea-ad4a-13d7c6afe435'
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
				'7f0fbff0-88ee-41b7-962c-8ddeb3880a9d'
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
				 select $1, id from public.curriculum_points where grade = 'CM1' and code = 'CM1-132' and archived_at is null`,
				['32724446-558b-4eea-ad4a-13d7c6afe435']
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/tags différents du relevé : \+32724446 CM1-132/
			);
		});
	});

	it('le rollback refuse si un modèle a changé de niveaux depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`update public.question_templates set grades = array['CM2', '6'] where id = $1`,
				['32724446-558b-4eea-ad4a-13d7c6afe435']
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				new RegExp(
					`rollback : ${N - 1} modèle\\(s\\) sur ${N} ont encore le nœud, les niveaux et le statut de la migration`
				)
			);
		});
	});

	it('le rollback refuse si un modèle a été republié depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(`update public.question_templates set status = 'published' where id = $1`, [
				'e58b1357-6fa8-4fce-9518-91d09d9acc49'
			]);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				new RegExp(`rollback : ${N - 1} modèle\\(s\\) sur ${N} ont encore`)
			);
		});
	});

	it('le rollback refuse si un modèle a été déplacé depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				'update public.question_templates set classification_node_id = null where id = $1',
				['e58b1357-6fa8-4fce-9518-91d09d9acc49']
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				new RegExp(`rollback : ${N - 1} modèle\\(s\\) sur ${N} ont encore`)
			);
		});
	});

	it('le rollback refuse si un tag a été posé depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points where grade = 'CM1' and code = 'CM1-132' and archived_at is null`,
				['32724446-558b-4eea-ad4a-13d7c6afe435']
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				new RegExp(
					`rollback : tags changés depuis la migration \\(${N_TAGS} du lot sur ${N_TAGS + 1}, attendus ${N_TAGS}\\)`
				)
			);
		});
	});

	it('le rollback refuse si un modèle du lot a disparu depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query('delete from public.question_templates where id = $1', [
				'e58b1357-6fa8-4fce-9518-91d09d9acc49'
			]);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				new RegExp(
					`rollback : identifiants partiellement présents : ${N - 1} modèle\\(s\\) sur ${N}`
				)
			);
		});
	});

	it('base sans les modèles (locale) : le rollback ne touche rien et passe', async () => {
		await enTransaction(async () => {
			await expect(pg.query(extractRollback(MIGRATION))).resolves.toBeDefined();
		});
	});
});
