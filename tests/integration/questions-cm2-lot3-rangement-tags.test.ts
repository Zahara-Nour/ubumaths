/**
 * Chantier « questions-cm2 », lot 3 : nœud et tag de 5 modèles neufs, CM2 ajouté à 3 modèles du CM1
 * (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261030150000_questions_cm2_lot3_rangement_tags` :
 * - les 5 brouillons du calcul créés le 2026-10-30 par scripts/create-questions.ts (sans nœud ni
 *   tag) vont sur la sous-notion de leur point et reçoivent ce point, un seul (ADR 0020) ;
 * - 3 modèles publiés du CM1 (tables d'addition, terme manquant, tables de multiplication) passent
 *   aux niveaux {CM1, CM2} et reçoivent leur point du CM2, le tag CM1 gardé.
 * Décision de David (journal docs/wip/questions-cm2-progress.md § 8.1).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état du relevé — des copies
 * minimales portant les VRAIS identifiants — puis rejoue la migration **depuis son fichier**, dans
 * une transaction annulée à la fin. Les triggers de garde des tags restent actifs : chaque tag posé
 * a passé la règle du nœud.
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
	noeud: string;
	code: string;
	/** Tag CM1 relevé (modèle publié du CM1) ; absent pour un brouillon neuf. */
	codeCm1?: string;
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

const MIGRATION = 'supabase/migrations/20261030150000_questions_cm2_lot3_rangement_tags.sql';
const LONGUEURS = 'Grandeurs et mesures > Longueurs';
const MULT_TABLES = 'Nombres et calculs > Entiers : multiplication > tables';
const ADD_TABLES = 'Nombres et calculs > Entiers : addition et soustraction > tables';
const ASTUCIEUX = 'Nombres et calculs > Entiers : addition et soustraction > calcul astucieux';
const DIV_REFLECHI = 'Nombres et calculs > Entiers : division > calcul réfléchi';
const NEUFS: Modele[] = [
	{ id: 'a4cf5fc5-313c-405a-8f8f-88d0c507395f', noeud: MULT_TABLES, code: 'CM2-149' },
	{ id: '116f68ad-0bef-4c64-9ceb-441da5173c83', noeud: ASTUCIEUX, code: 'CM2-045' },
	{ id: 'da5fdca4-fa2a-41d2-ae5e-e29bba2c35cc', noeud: ASTUCIEUX, code: 'CM2-150' },
	{ id: '1f2d5097-9ae3-4914-814a-5cfea9c568fe', noeud: DIV_REFLECHI, code: 'CM2-050' },
	{ id: '3b691903-fb8c-42e6-82d0-c643bda733ce', noeud: DIV_REFLECHI, code: 'CM2-151' }
];
const REPRIS: Modele[] = [
	{
		id: '8fee3492-87df-4227-a6f5-77d70a715b77',
		noeud: ADD_TABLES,
		code: 'CM2-035',
		codeCm1: 'CM1-035'
	},
	{
		id: 'f24bb468-6194-4dfa-b9b8-3eeb29086adc',
		noeud: ADD_TABLES,
		code: 'CM2-148',
		codeCm1: 'CM1-161'
	},
	{
		id: '50a9d91c-9647-4b98-bec1-5a7b939e3180',
		noeud: MULT_TABLES,
		code: 'CM2-036',
		codeCm1: 'CM1-036'
	}
];
const LOT = [...NEUFS, ...REPRIS];
const ids = LOT.map((m) => m.id);
/** Date de modification fabriquée : elle ne doit pas bouger (ranger, taguer, changer de niveaux). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

async function idsParChemin(pg: Client): Promise<Map<string, string>> {
	const parChemin = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) parChemin.set(node.path, id);
	return parChemin;
}

/** Pose l'état du relevé : brouillons neufs au CM2 sans nœud ni tag ; repris publiés au CM1, rangés, tag CM1. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: ids,
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	const parChemin = await idsParChemin(pg);
	await pg.query(
		'alter table public.question_templates disable trigger update_question_templates_updated_at'
	);
	await pg.query(
		`update public.question_templates set grades = array['CM2'] where id = any($1::uuid[])`,
		[NEUFS.map((m) => m.id)]
	);
	for (const [n, m] of REPRIS.entries()) {
		// Niveau distinct : index unique de catégorie sur les modèles publiés
		await pg.query(
			`update public.question_templates
			    set classification_node_id = $2, grades = array['CM1'], status = 'published', level = $3
			  where id = $1`,
			[m.id, parChemin.get(m.noeud), n + 1]
		);
		await pg.query(
			`insert into public.question_template_points (template_id, point_id)
			 select $1, id from public.curriculum_points where grade = 'CM1' and code = $2 and archived_at is null`,
			[m.id, m.codeCm1]
		);
	}
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

function tagsCm1(): string[] {
	return REPRIS.map((m) => `${m.id}§CM1§${m.codeCm1}`);
}

// ============================================================================
// SUITE
// ============================================================================

describe('Questions CM2, lot 3 : rangement, tags et niveaux (migration de données)', () => {
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

	it('chaque modèle est EXACTEMENT sur le nœud de son point', () => {
		expect(LOT.map((m) => apres.noeuds.get(m.id))).toEqual(LOT.map((m) => m.noeud));
	});

	it('chaque modèle porte EXACTEMENT son point du CM2, et les repris gardent leur point du CM1', () => {
		expect(apres.tags).toEqual([...LOT.map((m) => `${m.id}§CM2§${m.code}`), ...tagsCm1()].sort());
	});

	it('les repris passent aux niveaux {CM1, CM2}, les neufs restent au CM2', () => {
		expect(LOT.map((m) => apres.grades.get(m.id))).toEqual(
			LOT.map((m) => (m.codeCm1 ? ['CM1', 'CM2'] : ['CM2']))
		);
	});

	it('le statut ne change pas : neufs en brouillon, repris publiés', () => {
		expect(LOT.map((m) => apres.statuts.get(m.id))).toEqual(
			LOT.map((m) => (m.codeCm1 ? 'published' : 'draft'))
		);
	});

	it('`updated_at` des modèles est préservé', () => {
		expect([...apres.dates.values()]).toEqual(ids.map(() => AVANT));
	});

	it('le rollback écrit dans la migration rend l’état du relevé', () => {
		expect(annule.tags).toEqual(tagsCm1().sort());
		expect(LOT.map((m) => annule.noeuds.get(m.id))).toEqual(
			LOT.map((m) => (m.codeCm1 ? m.noeud : '∅'))
		);
		expect(LOT.map((m) => annule.grades.get(m.id))).toEqual(
			LOT.map((m) => (m.codeCm1 ? ['CM1'] : ['CM2']))
		);
		expect([...annule.dates.values()]).toEqual(ids.map(() => AVANT));
	});
});

describe('Questions CM2, lot 3 : les branches d’échec de la migration', () => {
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
				/identifiants partiellement présents : 7 modèle\(s\) sur 8/
			);
		});
	});

	it('un brouillon rangé à la main depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			const parChemin = await idsParChemin(pg);
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[NEUFS[0].id, parChemin.get(LONGUEURS)]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles neufs déjà rangés ou tagués depuis le relevé : 1/
			);
		});
	});

	it('un modèle du CM1 dont les niveaux ont changé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.question_templates set grades = array['CM1', 'CM2'] where id = $1`,
				[REPRIS[0].id]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles du CM1 changés depuis le relevé \(nœud, niveaux, statut ou tags\) : 1/
			);
		});
	});

	it('un modèle du CM1 qui a perdu son tag fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_template_points where template_id = $1', [
				REPRIS[1].id
			]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles du CM1 changés depuis le relevé \(nœud, niveaux, statut ou tags\) : 1/
			);
		});
	});

	it('un point du lot archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = 'CM2' and code = 'CM2-148' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), 1 point\(s\)/
			);
		});
	});

	it('le rollback refuse si les niveaux ont changé depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`update public.question_templates set grades = array['CM2', '6'] where id = $1`,
				[NEUFS[0].id]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : 1 modèle\(s\) n'ont plus le nœud, les niveaux et les tags laissés par la migration/
			);
		});
	});
});
