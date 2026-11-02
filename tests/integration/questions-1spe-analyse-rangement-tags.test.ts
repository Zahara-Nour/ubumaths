/**
 * Chantier « questions-1spe-analyse », lots A et B : nœud et tags de 9 modèles neufs, tags et niveaux de 7d6cf480 (Supabase local requis)
 * =======================================================================================
 *
 * Migration `20261102192857_questions_1spe_analyse_rangement_tags` : les 9 brouillons des lots A et
 * B (créés le 2026-11-02 par scripts/create-questions.ts, sans nœud ni tag) vont sur le nœud de
 * leur point et reçoivent ce point (B4 : aussi les points jumeaux 1GEN-062, 1TECHNO-139) ;
 * 7d6cf480 (seconde, publié) reçoit 1SPE-434, 1GEN-064, 1TECHNO-141 et les niveaux de 1re.
 * Phase 0 : journal docs/wip/questions-1spe-analyse-progress.md (Q5, Q6).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, au statut, aux niveaux, au nœud et aux tags relevés —
 * puis rejoue la migration **depuis son fichier**, dans une transaction annulée à la fin. Les
 * triggers de garde des tags restent actifs : chaque tag posé a passé la règle du nœud.
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
import { readNodePaths, nodeIdByPath } from '../helpers/database/classification-paths';
import { insertProdCopies } from '../helpers/database/prod-copies';

// ============================================================================
// TYPES
// ============================================================================

interface Etat {
	noeuds: Map<string, string>;
	dates: Map<string, string>;
	grades: Map<string, string[]>;
	statuts: Map<string, string>;
	tags: string[];
	/** État du trigger `updated_at` : `O` = actif */
	trigger: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261102192857_questions_1spe_analyse_rangement_tags.sql';
const LONGUEURS = 'Grandeurs et mesures > Longueurs';
const PREMIERE = ['1_SPE', '1_GEN', '1_TECHNO'];
const PENTE = '7d6cf480-b062-4e45-a593-2e85fbeb28b3';
const NOEUD_PENTE = "Fonctions > Fonctions affines > coefficient directeur et ordonnée à l'origine";
/** Les 9 neufs : identifiant créé en prod le 2026-11-02, nœud, niveaux et points attendus. */
const NEUFS = [
	{
		id: 'db7bb314-7e6a-41e8-86e8-2f38a2a71f72',
		noeud: 'Fonctions > Second degré > formes',
		grades: ['1_SPE'],
		tags: ['1_SPE§1SPE-385']
	},
	{
		id: 'aab8e41c-4539-4c90-9c1d-6ee41dc7a1cb',
		noeud: 'Fonctions > Second degré > racines',
		grades: ['1_SPE'],
		tags: ['1_SPE§1SPE-252']
	},
	{
		id: 'afe51ac4-8552-454e-b45e-46f0edbd9416',
		noeud: 'Fonctions > Second degré > signe',
		grades: ['1_SPE'],
		tags: ['1_SPE§1SPE-251']
	},
	{
		id: '5a132ffc-86bd-4db2-9e06-954e49da0da3',
		noeud: 'Fonctions > Fonction exponentielle > courbe',
		grades: ['1_SPE'],
		tags: ['1_SPE§1SPE-296']
	},
	{
		id: 'a2852ea5-ce64-4010-805b-d00874605510',
		noeud: 'Fonctions > Fonction exponentielle > courbe',
		grades: ['1_SPE'],
		tags: ['1_SPE§1SPE-407']
	},
	{
		id: 'aae5c0fc-e220-4958-9604-01f110b6fecf',
		noeud: 'Fonctions > Fonctions trigonométriques > cercle et radians',
		grades: ['1_SPE'],
		tags: ['1_SPE§1SPE-303']
	},
	{
		id: 'ac9b1868-c019-42c3-a5fe-4b2952cce654',
		noeud: 'Fonctions > Fonctions trigonométriques > cercle et radians',
		grades: ['1_SPE'],
		tags: ['1_SPE§1SPE-408']
	},
	{
		id: '558c31a7-cbf0-4f7f-b282-2ada6a64c9f3',
		noeud: 'Fonctions > Fonctions trigonométriques > cercle et radians',
		grades: ['1_SPE'],
		tags: ['1_SPE§1SPE-306']
	},
	{
		id: '33dffa7a-8523-440e-99fe-304df3ced8b3',
		noeud: 'Fonctions > Généralités sur les fonctions > signe',
		grades: PREMIERE,
		tags: ['1_SPE§1SPE-432', '1_GEN§1GEN-062', '1_TECHNO§1TECHNO-139']
	}
];
const ids = [...NEUFS.map((m) => m.id), PENTE];
/** Date de modification fabriquée : elle ne doit pas bouger (ranger et taguer ne modifient pas le contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

/** Pose l'état relevé en prod : 9 brouillons sans nœud ni tag ; 7d6cf480 publié, rangé, tagué 2-313. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: ids,
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	// Le décor ne doit pas toucher `updated_at` : le trigger est coupé le temps de le poser.
	await pg.query(
		'alter table public.question_templates disable trigger update_question_templates_updated_at'
	);
	for (const m of NEUFS) {
		await pg.query('update public.question_templates set grades = $2 where id = $1', [
			m.id,
			m.grades
		]);
	}
	await pg.query(
		`update public.question_templates set status = 'published', classification_node_id = $2 where id = $1`,
		[PENTE, await nodeIdByPath(pg, NOEUD_PENTE)]
	);
	await pg.query(
		`insert into public.question_template_points (template_id, point_id)
		 select $1, id from public.curriculum_points where grade = '2' and code = '2-313' and archived_at is null`,
		[PENTE]
	);
	await pg.query(
		'alter table public.question_templates enable trigger update_question_templates_updated_at'
	);
}

async function lireEtat(pg: Client): Promise<Etat> {
	const chemins = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) chemins.set(id, node.path);
	const q = await pg.query<{
		id: string;
		node: string | null;
		updated_at: Date;
		grades: string[];
		status: string;
	}>(
		'select id, classification_node_id as node, updated_at, grades, status from public.question_templates where id = any($1::uuid[])',
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
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()])),
		grades: new Map(q.rows.map((r) => [r.id, r.grades])),
		statuts: new Map(q.rows.map((r) => [r.id, r.status])),
		tags: t.rows.map((r) => `${r.template_id}§${r.grade}§${r.code}`).sort()
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('Questions 1re spé, analyse (lots A et B) : nœud et tags (migration de données)', () => {
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

	it('chaque modèle neuf est EXACTEMENT sur le nœud de son point ; 7d6cf480 ne bouge pas', () => {
		expect(ids.map((id) => apres.noeuds.get(id))).toEqual([
			...NEUFS.map((m) => m.noeud),
			NOEUD_PENTE
		]);
	});

	it('chaque modèle porte EXACTEMENT ses points, rien de plus (B4 et 7d6cf480 : un par programme)', () => {
		const attendus = [
			...NEUFS.flatMap((m) => m.tags.map((t) => `${m.id}§${t}`)),
			`${PENTE}§2§2-313`,
			`${PENTE}§1_SPE§1SPE-434`,
			`${PENTE}§1_GEN§1GEN-064`,
			`${PENTE}§1_TECHNO§1TECHNO-141`
		].sort();
		expect(apres.tags).toEqual(attendus);
	});

	it('7d6cf480 s’ouvre aux niveaux de 1re ; les neufs gardent les leurs ; aucun statut ne change', () => {
		expect(apres.grades.get(PENTE)).toEqual(['2', ...PREMIERE]);
		expect(NEUFS.map((m) => apres.grades.get(m.id))).toEqual(NEUFS.map((m) => m.grades));
		expect(ids.map((id) => apres.statuts.get(id))).toEqual([
			...NEUFS.map(() => 'draft'),
			'published'
		]);
	});

	it('le trigger `updated_at` est de nouveau actif après la migration et après le rollback', () => {
		expect([apres.trigger, annule.trigger]).toEqual(['O', 'O']);
	});

	it('`updated_at` des modèles est préservé', () => {
		expect(ids.map((id) => apres.dates.get(id))).toEqual(ids.map(() => AVANT));
	});

	it('le rollback écrit dans la migration rend l’état d’avant', () => {
		expect(annule.tags).toEqual([`${PENTE}§2§2-313`]);
		expect(ids.map((id) => annule.noeuds.get(id))).toEqual([...NEUFS.map(() => '∅'), NOEUD_PENTE]);
		expect(annule.grades.get(PENTE)).toEqual(['2']);
		expect(ids.map((id) => annule.dates.get(id))).toEqual(ids.map(() => AVANT));
	});
});

describe('Questions 1re spé, analyse (lots A et B) : les branches d’échec de la migration', () => {
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
			await pg.query('delete from public.question_templates where id = $1', [NEUFS[0].id]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/identifiants partiellement présents : 9 modèle\(s\) sur 10/
			);
		});
	});

	it('un modèle neuf rangé à la main depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[NEUFS[0].id, await nodeIdByPath(pg, LONGUEURS)]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles changés depuis le relevé \(statut, nœud ou niveaux\) : 9 sur 10 conformes/
			);
		});
	});

	it('7d6cf480 aux niveaux changés depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.question_templates set grades = array['2', '1_SPE'] where id = $1`,
				[PENTE]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles changés depuis le relevé \(statut, nœud ou niveaux\) : 9 sur 10 conformes/
			);
		});
	});

	it('7d6cf480 tagué depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points where grade = '1_SPE' and code = '1SPE-434' and archived_at is null`,
				[PENTE]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/tags différents du relevé : 2 tag\(s\) dont 1 du relevé, attendus 1/
			);
		});
	});

	it('un point jumeau archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = '1_GEN' and code = '1GEN-062' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), 1 point\(s\)/
			);
		});
	});
});
