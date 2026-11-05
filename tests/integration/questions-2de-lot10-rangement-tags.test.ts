/**
 * Chantier « questions-2de », lot 10 : nœud et tag de 11 modèles neufs, niveaux de 2 anciens (Supabase local requis)
 * ====================================================================================================
 *
 * Migration `20261105194635_questions_2de_lot10_rangement_tags` : les 11 brouillons des lots 10 A
 * (ensembles) et 10 B (logique), créés le 2026-11-05 par scripts/create-questions.ts (sans nœud ni
 * tag), vont sur leur nœud et reçoivent leur point, un seul (ADR 0020) ; 2 anciens brouillons passent
 * de {2, 1_SPE} à {2} (décision L10-a). Journal docs/wip/questions-2de-progress.md § 82.
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, en seconde, sans nœud ni tag ; les anciens en
 * {2, 1_SPE} — puis rejoue la migration **depuis son fichier**, dans une transaction annulée à la
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

interface Etat {
	niveaux: Map<string, string>;
	noeuds: Map<string, string>;
	dates: Map<string, string>;
	tags: string[];
	/** État du trigger `updated_at` : `O` = actif */
	trigger: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261105194635_questions_2de_lot10_rangement_tags.sql';
const LONGUEURS = 'Grandeurs et mesures > Longueurs';
/** Le lot : identifiants créés en prod le 2026-11-05, nœud et point attendus. */
const LOT: { id: string; noeud: string; code: string }[] = [
	{
		id: '99af2696-1482-43e8-bd02-714b279180ed',
		noeud: 'Ensembles > Ensembles de nombres > appartenance et inclusion',
		code: '2-201'
	},
	{
		id: 'e7db99fc-d513-4979-8084-e1caa0279735',
		noeud: 'Ensembles > Opérations sur les ensembles',
		code: '2-202'
	},
	{
		id: 'c22d387e-5d6e-4da9-83eb-efc56748e1ea',
		noeud: 'Ensembles > Opérations sur les ensembles',
		code: '2-203'
	},
	{
		id: '994437aa-6626-4a78-8b6b-f195bb985e9b',
		noeud: 'Ensembles > Opérations sur les ensembles > complémentaire',
		code: '2-206'
	},
	{
		id: 'fa39b703-dad2-4951-a1fd-22665befafbd',
		noeud: 'Logique > Proposition mathématique',
		code: '2-208'
	},
	{
		id: '9207c6e6-2875-4927-b651-45982a09d428',
		noeud: 'Logique > Proposition mathématique > statut des lettres et des égalités',
		code: '2-209'
	},
	{
		id: 'c4e19f99-9c7a-4d6b-941a-d7e6516c078a',
		noeud: "Logique > Quantificateurs et négation > négation d'une proposition",
		code: '2-211'
	},
	{
		id: '214f7500-0e36-4208-b688-44ddabde06d8',
		noeud: 'Logique > Implication et équivalence > implication',
		code: '2-213'
	},
	{
		id: '75d0fc89-24b1-4edb-abf2-82b7e76f272e',
		noeud: 'Logique > Implication et équivalence > équivalence',
		code: '2-409'
	},
	{
		id: '61d0571e-b6f3-413b-9272-3539b8a55708',
		noeud: 'Logique > Quantificateurs et négation > pour tout, il existe',
		code: '2-215'
	},
	{
		id: '24fd6a10-7843-4b7c-9e7c-7a05b1696bc9',
		noeud: 'Logique > Quantificateurs et négation > pour tout, il existe',
		code: '2-412'
	}
];
/** Les 2 anciens brouillons dont les niveaux passent de {2, 1_SPE} à {2} (décision L10-a). */
const ANCIENS = ['5062197a-5ffa-47bf-805d-8ec39d4445b8', '5b20321f-e86a-4a13-b478-1cf4f441e920'];
const ids = LOT.map((m) => m.id);
/** Date de modification fabriquée : elle ne doit pas bouger (ranger et taguer ne modifient pas le contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

/** Pose l'état de la prod : les copies des modèles, en seconde, sans nœud ni tag ; les anciens en {2, 1_SPE}. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: [...ids, ...ANCIENS],
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	await pg.query(
		'alter table public.question_templates disable trigger update_question_templates_updated_at'
	);
	await pg.query(
		`update public.question_templates set grades = array['2', '1_SPE'] where id = any($1::uuid[])`,
		[ANCIENS]
	);
	await pg.query(
		'alter table public.question_templates enable trigger update_question_templates_updated_at'
	);
}

async function lireEtat(pg: Client): Promise<Etat> {
	const chemins = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) chemins.set(id, node.path);
	const q = await pg.query<{ id: string; node: string | null; updated_at: Date }>(
		'select id, classification_node_id as node, updated_at from public.question_templates where id = any($1::uuid[])',
		[ids]
	);
	const n = await pg.query<{ id: string; grades: string[]; updated_at: Date }>(
		'select id, grades, updated_at from public.question_templates where id = any($1::uuid[])',
		[ANCIENS]
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
		niveaux: new Map(
			n.rows.map((r) => [r.id, `${r.grades.join(',')}§${r.updated_at.toISOString()}`])
		),
		noeuds: new Map(q.rows.map((r) => [r.id, chemins.get(r.node ?? '') ?? '∅'])),
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()])),
		tags: t.rows.map((r) => `${r.template_id}§${r.grade}§${r.code}`).sort()
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('Questions 2de, lot 10 : nœud et tag des modèles neufs, niveaux des anciens (migration de données)', () => {
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

	it('chaque modèle est EXACTEMENT sur son nœud', () => {
		expect(LOT.map((m) => apres.noeuds.get(m.id))).toEqual(LOT.map((m) => m.noeud));
	});

	it('chaque modèle porte EXACTEMENT son point, rien de plus', () => {
		expect(apres.tags).toEqual(LOT.map((m) => `${m.id}§2§${m.code}`).sort());
	});

	it('le trigger `updated_at` est de nouveau actif après la migration et après le rollback', () => {
		expect([apres.trigger, annule.trigger]).toEqual(['O', 'O']);
	});

	it('`updated_at` des modèles est préservé', () => {
		expect([...apres.dates.values()]).toEqual(ids.map(() => AVANT));
	});

	it('les 2 anciens brouillons passent à {2}, `updated_at` préservé', () => {
		expect(ANCIENS.map((id) => apres.niveaux.get(id))).toEqual(ANCIENS.map(() => `2§${AVANT}`));
	});

	it('le rollback écrit dans la migration rend l’état d’avant (sans nœud ni tag)', () => {
		expect(annule.tags).toEqual([]);
		expect(LOT.map((m) => annule.noeuds.get(m.id))).toEqual(LOT.map(() => '∅'));
		expect([...annule.dates.values()]).toEqual(ids.map(() => AVANT));
		expect(ANCIENS.map((id) => annule.niveaux.get(id))).toEqual(
			ANCIENS.map(() => `2,1_SPE§${AVANT}`)
		);
	});
});

describe('Questions 2de, lot 10 : les branches d’échec de la migration', () => {
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

	it('un modèle rangé à la main depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			const parChemin = new Map<string, string>();
			for (const [id, node] of await readNodePaths(pg)) parChemin.set(node.path, id);
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[ids[0], parChemin.get(LONGUEURS)]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles déjà rangés depuis le relevé : 1/
			);
		});
	});

	// La garde « déjà tagué » ne peut pas être atteinte seule : la base refuse un tag sur un modèle
	// sans nœud, et un modèle rangé entre-temps est arrêté par la garde « déjà rangé » (test ci-dessus).
	it('un tag posé à la main suppose un rangement : la base refuse un tag sans nœud', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await expect(
				pg.query(
					`insert into public.question_template_points (template_id, point_id)
					 select $1, id from public.curriculum_points where grade = '2' and code = '2-201' and archived_at is null`,
					[LOT[0].id]
				)
			).rejects.toThrow(/n'est rangé dans aucun nœud de l'arbre/);
		});
	});

	it('un ancien brouillon manquant fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_templates where id = $1', [ANCIENS[0]]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/anciens brouillons partiellement présents : 1 sur 2/
			);
		});
	});

	it('des niveaux retouchés depuis le relevé font échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(`update public.question_templates set grades = array['2'] where id = $1`, [
				ANCIENS[1]
			]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/niveaux des anciens brouillons modifiés depuis le relevé : 1 sur 2/
			);
		});
	});

	it('une notion visée renommée fait échouer la migration (branche « notion », résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.classification_nodes set name = name || ' (renommée)'
				  where kind = 'notion' and name = 'Opérations sur les ensembles' and archived_at is null`
			);
			// 2-202 et 2-203 (sur la notion), 2-206 (sous-notion de cette notion)
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 3 nœud\(s\), 3 point\(s\)/
			);
		});
	});

	it('un point du lot archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = '2' and code = '2-201' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), 1 point\(s\)/
			);
		});
	});
});
