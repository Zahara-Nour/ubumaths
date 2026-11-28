/**
 * Chantier « questions-1gen » : points 1GEN et niveau 1_GEN de 19 modèles (Supabase local requis)
 * ==================================================================================
 *
 * Migration `20261117124605_questions_1gen_tags` : 11 modèles reçoivent un point 1GEN et le
 * niveau 1_GEN (A) ; 5397c20f reçoit un point 1GEN, 1_GEN déjà présent (B) ; 6 modèles perdent le
 * niveau 1_GEN, sans tag touché (C) ; 1acb6d47 perd 1GEN-022 et le niveau 1_GEN (D). Ni nœud, ni
 * contenu, ni statut ne changent ; les autres niveaux et les tags des autres programmes restent.
 * Décision de David le 2026-11-17 (journal docs/wip/questions-1gen-progress.md § 5 à 7).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, à leur nœud, avec leurs niveaux, leur statut et leurs
 * tags relevés — puis rejoue la migration **depuis son fichier**, dans une transaction annulée à
 * la fin. Les triggers de garde des tags restent actifs : chaque tag posé a passé la règle du nœud.
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
	lettre: 'A' | 'B' | 'C' | 'D';
	noeud: string;
	statut: 'draft' | 'published';
	gradesAvant: string[];
	gradesApres: string[];
	avant: string[];
	apres: string[];
}

interface Etat {
	trigger: string;
	noeuds: Map<string, string>;
	grades: Map<string, string[]>;
	statuts: Map<string, string>;
	dates: Map<string, string>;
	tags: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261117124605_questions_1gen_tags.sql';
const MODELES_EVOLUTION = "Suites > Modèles d'évolution";
const SUCCESSIVES =
	'Probabilités > Probabilités conditionnelles > épreuves indépendantes successives';
const SPE = ['1_SPE'];
const SPE_TECHNO = ['1_SPE', '1_TECHNO'];
const SPE_TECHNO_GEN = ['1_SPE', '1_TECHNO', '1_GEN'];
const SPE_GEN_TECHNO = ['1_SPE', '1_GEN', '1_TECHNO'];

/** A : point 1GEN posé et 1_GEN ajouté. */
function a(
	id: string,
	noeud: string,
	avant: string,
	pose: string,
	statut: Modele['statut'] = 'published',
	grades: string[] = SPE
): Modele {
	return {
		id,
		lettre: 'A',
		noeud,
		statut,
		gradesAvant: grades,
		gradesApres: [...grades, '1_GEN'],
		avant: [avant],
		apres: [avant, pose]
	};
}

/** C : 1_GEN retiré, aucun tag touché. */
function c(id: string, noeud: string, tag: string): Modele {
	return {
		id,
		lettre: 'C',
		noeud,
		statut: 'published',
		gradesAvant: SPE_GEN_TECHNO,
		gradesApres: SPE_TECHNO,
		avant: [tag],
		apres: [tag]
	};
}

/** Le lot, tel que relevé en prod le 2026-11-17 (MCP). */
const LOT: Modele[] = [
	a('103cf8d9-a014-44d0-a4a0-08d94749a60e', MODELES_EVOLUTION, '1SPE-230', '1GEN-048'),
	a(
		'21f42c7f-82bc-4204-b294-cb9658bcfd8e',
		'Probabilités > Probabilités conditionnelles > indépendance',
		'1SPE-336',
		'1GEN-009'
	),
	a('42bb2d66-4559-4a1b-8124-de6977fbb0b1', SUCCESSIVES, '1SPE-343', '1GEN-011'),
	a('70e682f9-9f54-495b-8943-69c8597a5c32', MODELES_EVOLUTION, '1SPE-230', '1GEN-017'),
	a(
		'c90fa022-9493-4812-adb7-c785babee9d4',
		MODELES_EVOLUTION,
		'1TECHNO-042',
		'1GEN-017',
		'draft',
		SPE_TECHNO
	),
	a(
		'aab8e41c-4539-4c90-9c1d-6ee41dc7a1cb',
		'Fonctions > Second degré > racines',
		'1SPE-252',
		'1GEN-023'
	),
	a(
		'afe51ac4-8552-454e-b45e-46f0edbd9416',
		'Fonctions > Second degré > signe',
		'1SPE-251',
		'1GEN-055'
	),
	a(
		'bd27e002-ca19-444e-948b-f8ed4fc8bbb5',
		'Suites > Suites arithmétiques',
		'1SPE-372',
		'1GEN-018'
	),
	a(
		'd2067413-da43-42bb-a24c-642d2a3cc5e8',
		'Suites > Généralités sur les suites > représentation graphique',
		'1TECHNO-045',
		'1GEN-031',
		'draft',
		SPE_TECHNO
	),
	a('d8c9cb60-e9c5-4f38-a8d9-b5c2b83de908', SUCCESSIVES, '1SPE-426', '1GEN-010'),
	a('f2ed0ea0-e285-49fc-93df-9e388cc36eb0', SUCCESSIVES, '1SPE-339', '1GEN-010'),
	{
		id: '5397c20f-7b3a-4d56-b441-644607e0138a',
		lettre: 'B',
		noeud: 'Fonctions > Généralités sur les fonctions > signe',
		statut: 'published',
		gradesAvant: SPE_GEN_TECHNO,
		gradesApres: SPE_GEN_TECHNO,
		avant: ['1SPE-432'],
		apres: ['1SPE-432', '1GEN-062']
	},
	c(
		'9852d62c-4109-4155-aa56-afef8c72d923',
		'Statistiques > Représenter des données > diagrammes circulaires',
		'5-113'
	),
	c(
		'7f82d15a-1c46-4bd5-81bc-a9f5e21048ed',
		'Fonctions > Généralités sur les fonctions > variations',
		'2-349'
	),
	c(
		'95ee57c8-4e16-4554-add5-cb8f72ee6f28',
		'Fonctions > Généralités sur les fonctions > équations et inéquations f(x) = k',
		'2-448'
	),
	c(
		'0f673c27-9814-445f-9643-97c5fab9ce5b',
		'Fonctions > Fonctions affines > variations et signe',
		'2-328'
	),
	c(
		'1c86d122-92f8-4bee-a566-b023ffb79dda',
		'Statistiques > Représenter des données > courbes et repères',
		'5-135'
	),
	c(
		'f5585668-2ec1-45d1-a279-d82f45903926',
		'Géométrie > Géométrie repérée > équations de droites',
		'2-314'
	),
	{
		id: '1acb6d47-5d88-4ccf-830f-98dc57d0022c',
		lettre: 'D',
		noeud: 'Fonctions > Second degré > parabole',
		statut: 'published',
		gradesAvant: SPE_TECHNO_GEN,
		gradesApres: SPE_TECHNO,
		avant: ['1GEN-022', '1SPE-402', '1TECHNO-057'],
		apres: ['1SPE-402', '1TECHNO-057']
	}
];
const ids = LOT.map((m) => m.id);
const M103 = LOT[0].id;
const M9852 = '9852d62c-4109-4155-aa56-afef8c72d923';
const M5397 = '5397c20f-7b3a-4d56-b441-644607e0138a';
/** Date de modification fabriquée : elle ne doit pas bouger (taguer ne modifie pas le contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

function gradeDe(code: string): string {
	if (code.startsWith('1GEN-')) return '1_GEN';
	if (code.startsWith('1SPE-')) return '1_SPE';
	if (code.startsWith('1TECHNO-')) return '1_TECHNO';
	return code.split('-')[0];
}

function cles(cote: 'avant' | 'apres'): string[] {
	return LOT.flatMap((m) => m[cote].map((code) => `${m.id}§${gradeDe(code)}§${code}`)).sort();
}

function trie(grades: string[] | undefined): string[] {
	return [...(grades ?? [])].sort();
}

async function tagger(pg: Client, id: string, code: string): Promise<void> {
	const r = await pg.query(
		`insert into public.question_template_points (template_id, point_id)
		 select $1, id from public.curriculum_points where grade = $2 and code = $3 and archived_at is null`,
		[id, gradeDe(code), code]
	);
	if (r.rowCount !== 1) throw new Error(`tag non posé : ${id} ${code}`);
}

async function noeudsParChemin(pg: Client): Promise<Map<string, string>> {
	const parChemin = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) {
		if (!node.archived) parChemin.set(node.path, id);
	}
	return parChemin;
}

/** Pose l'état de la prod : copies à leur nœud, avec niveaux, statut et tags relevés. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: ids,
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	const parChemin = await noeudsParChemin(pg);
	await pg.query(
		'alter table public.question_templates disable trigger update_question_templates_updated_at'
	);
	// Un niveau de difficulté chacun (un seul modèle publié par catégorie et par niveau).
	for (const [n, m] of LOT.entries()) {
		const node = parChemin.get(m.noeud);
		if (!node) throw new Error(`chemin introuvable : ${m.noeud}`);
		await pg.query(
			`update public.question_templates
			    set classification_node_id = $2, grades = $3::text[], status = $4, level = $5
			  where id = $1`,
			[m.id, node, m.gradesAvant, m.statut, n + 1]
		);
	}
	await pg.query(
		'alter table public.question_templates enable trigger update_question_templates_updated_at'
	);
	for (const m of LOT) for (const code of m.avant) await tagger(pg, m.id, code);
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
	const g = await pg.query<{ tgenabled: string }>(
		`select tgenabled from pg_trigger where tgname = 'update_question_templates_updated_at'`
	);
	return {
		trigger: g.rows[0]?.tgenabled ?? '∅',
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

describe('Questions 1re générale : points 1GEN et niveau 1_GEN de 19 modèles (migration de données)', () => {
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

	it('les modèles portent EXACTEMENT les tags visés (1GEN posés, 1GEN-022 retiré, les autres intacts)', () => {
		expect(apres.tags).toEqual(cles('apres'));
	});

	it('A et B portent 1_GEN, C et D ne le portent plus, les autres niveaux restent (ordre compris)', () => {
		expect(LOT.map((m) => apres.grades.get(m.id))).toEqual(LOT.map((m) => m.gradesApres));
	});

	it('ni nœud, ni statut, ni `updated_at` ne changent ; le trigger de date est réactivé', () => {
		expect(LOT.map((m) => apres.noeuds.get(m.id))).toEqual(LOT.map((m) => m.noeud));
		expect(LOT.map((m) => apres.statuts.get(m.id))).toEqual(LOT.map((m) => m.statut));
		expect([...apres.dates.values()]).toEqual(ids.map(() => AVANT));
		expect(apres.trigger).toBe('O');
	});

	it('le rollback écrit dans la migration rend l’état d’avant', () => {
		expect(annule.tags).toEqual(cles('avant'));
		// array_append remet 1_GEN en fin de tableau : l'ensemble des niveaux est rendu.
		expect(LOT.map((m) => trie(annule.grades.get(m.id)))).toEqual(
			LOT.map((m) => trie(m.gradesAvant))
		);
		expect(LOT.map((m) => annule.noeuds.get(m.id))).toEqual(LOT.map((m) => m.noeud));
		expect([...annule.dates.values()]).toEqual(ids.map(() => AVANT));
		expect(annule.trigger).toBe('O');
	});

	it('chaque modèle porte au plus un point par programme (ADR 0020)', () => {
		const parProgramme = apres.tags.map((t) => t.split('§').slice(0, 2).join('§'));
		expect(new Set(parProgramme).size).toBe(parProgramme.length);
	});
});

describe('Questions 1re générale : les branches d’échec de la migration', () => {
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

	/** Base locale remplie par `pnpm db:seed-riche` : elle porte les vrais modèles ; on les retire. */
	async function sansLesModeles(): Promise<void> {
		await pg.query('delete from public.question_templates where id = any($1::uuid[])', [ids]);
	}

	it('base sans les modèles (locale) : la migration ne touche rien et passe', async () => {
		await enTransaction(async () => {
			await sansLesModeles();
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).resolves.toBeDefined();
		});
	});

	it('base sans les modèles (locale) : le rollback ne touche rien et passe', async () => {
		await enTransaction(async () => {
			await sansLesModeles();
			await expect(pg.query(extractRollback(MIGRATION))).resolves.toBeDefined();
		});
	});

	it('TOUT ou RIEN : un modèle manquant fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_templates where id = $1', [M9852]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/identifiants partiellement présents : 18 modèle\(s\) sur 19/
			);
		});
	});

	it('un modèle déplacé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			const parChemin = await noeudsParChemin(pg);
			// 103cf8d9 porte 1SPE-230, posé sur la notion : il peut descendre dans une sous-notion.
			const seuil = parChemin.get(`${MODELES_EVOLUTION} > seuil`);
			if (!seuil) throw new Error('chemin introuvable : seuil');
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[M103, seuil]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles déplacés depuis le relevé : 1/
			);
		});
	});

	it('un tag différent du relevé fait échouer la migration (tag d’un autre programme retiré)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`delete from public.question_template_points q using public.curriculum_points p
				  where q.template_id = $1 and p.id = q.point_id and p.code = '5-113'`,
				[M9852]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/tags différents du relevé : 20 tag\(s\) dont 20 du relevé, attendus 21/
			);
		});
	});

	it('un point visé archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = '1_GEN' and code = '1GEN-062' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/points introuvables ou hors du nœud du modèle : 1/
			);
		});
	});

	it('B sans 1_GEN fait échouer la migration (point 1GEN sur un modèle hors 1re générale)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				'alter table public.question_templates disable trigger update_question_templates_updated_at'
			);
			await pg.query(
				`update public.question_templates set grades = array_remove(grades, '1_GEN') where id = $1`,
				[M5397]
			);
			await pg.query(
				'alter table public.question_templates enable trigger update_question_templates_updated_at'
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(/lot incohérent/);
		});
	});

	it('rejouer la migration la refuse proprement (tags déjà posés)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/tags différents du relevé/
			);
		});
	});

	it('le rollback refuse si un tag a changé depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`delete from public.question_template_points q using public.curriculum_points p
				  where q.template_id = $1 and p.id = q.point_id and p.code = '1GEN-062'`,
				[M5397]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : tags changés depuis la migration/
			);
		});
	});

	it('le rollback refuse si 1GEN-022 ne peut pas être reposé (point archivé)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = '1_GEN' and code = '1GEN-022' and archived_at is null`
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : points introuvables : 1/
			);
		});
	});
});
