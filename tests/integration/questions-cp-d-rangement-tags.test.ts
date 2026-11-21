/**
 * Chantier « questions » (CP), lot D : nœud et tag de 6 modèles neufs (Supabase local requis)
 * ===================================================================================
 *
 * Migration `20261119195149_questions_cp_d_rangement_tags` : les 6 brouillons du lot D (collections,
 * droite graduée, bandelettes, diagramme en barres) créés le 2026-11-19 par
 * scripts/create-questions.ts (sans nœud ni tag) vont sur le nœud de leur point (une sous-notion) et
 * reçoivent leur point, un seul (ADR 0020). Décision de David (journal docs/wip/questions-progress.md
 * § 4 septdecies).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, au CP, sans nœud ni tag — puis rejoue la migration
 * **depuis son fichier**, dans une transaction annulée à la fin. Les triggers de garde des tags
 * restent actifs : chaque tag posé a passé la règle du nœud.
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

interface Etat {
	noeuds: Map<string, string>;
	dates: Map<string, string>;
	tags: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261119195149_questions_cp_d_rangement_tags.sql';
const PROBABILITES = 'Probabilités > Expériences aléatoires';
/** Le lot : identifiant créé en prod le 2026-11-19, nœud et points attendus. */
const LOT: { id: string; noeud: string; code: string }[] = [
	{
		id: 'ea370045-e86b-42c3-ac78-10843d9b847d',
		noeud: 'Nombres et calculs > Entiers : numération > dénombrement',
		code: 'CP-001'
	},
	{
		id: '4c2de9af-6293-48de-9c3a-1eaf555e55ea',
		noeud: 'Nombres et calculs > Entiers : numération > ordre',
		code: 'CP-070'
	},
	{
		id: '11a01460-f201-44f5-83fc-18041c5c585d',
		noeud: 'Nombres et calculs > Entiers : numération > droite graduée',
		code: 'CP-008'
	},
	{
		id: '6fc49a88-ae90-4e4d-b099-4b66519a1274',
		noeud: 'Grandeurs et mesures > Longueurs > comparaison et mesure',
		code: 'CP-033'
	},
	{
		id: '59ffdd9e-1a90-412a-9eb1-f04374042bb6',
		noeud: 'Grandeurs et mesures > Longueurs > comparaison et mesure',
		code: 'CP-033'
	},
	{
		id: 'd0dec6cb-3785-499c-adf3-267a0f24c008',
		noeud: 'Statistiques > Représenter des données > diagrammes en barres',
		code: 'CP-072'
	}
];
const ids = LOT.map((m) => m.id);
/** Date de modification fabriquée : elle ne doit pas bouger (ranger et taguer ne modifient pas le contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

/** Pose l'état de la prod : les copies des modèles, au CP, sans nœud ni tag. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: ids,
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	await pg.query(
		'alter table public.question_templates disable trigger update_question_templates_updated_at'
	);
	await pg.query(
		`update public.question_templates set grades = array['CP'] where id = any($1::uuid[])`,
		[ids]
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
	const t = await pg.query<{ template_id: string; grade: string; code: string }>(
		`select q.template_id, p.grade, p.code from public.question_template_points q
		   join public.curriculum_points p on p.id = q.point_id where q.template_id = any($1::uuid[])`,
		[ids]
	);
	return {
		noeuds: new Map(q.rows.map((r) => [r.id, chemins.get(r.node ?? '') ?? '∅'])),
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()])),
		tags: t.rows.map((r) => `${r.template_id}§${r.grade}§${r.code}`).sort()
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('Questions CP, lot D : nœud et tag des modèles neufs (migration de données)', () => {
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

	it('chaque modèle est EXACTEMENT sur son nœud (celui de son point)', () => {
		expect(LOT.map((m) => apres.noeuds.get(m.id))).toEqual(LOT.map((m) => m.noeud));
	});

	it('chaque modèle porte EXACTEMENT son point, rien de plus', () => {
		expect(apres.tags).toEqual(LOT.map((m) => `${m.id}§CP§${m.code}`).sort());
	});

	it('`updated_at` des modèles est préservé', () => {
		expect([...apres.dates.values()]).toEqual(ids.map(() => AVANT));
	});

	it('le rollback écrit dans la migration rend l’état d’avant (sans nœud ni tag)', () => {
		expect(annule.tags).toEqual([]);
		expect(LOT.map((m) => annule.noeuds.get(m.id))).toEqual(LOT.map(() => '∅'));
		expect([...annule.dates.values()]).toEqual(ids.map(() => AVANT));
	});
});

describe('Questions CP, lot D : les branches d’échec de la migration', () => {
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
				/identifiants partiellement présents : 5 modèle\(s\) sur 6/
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
				[ids[0], parChemin.get(PROBABILITES)]
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
					 select $1, id from public.curriculum_points where grade = 'CP' and code = 'CP-034' and archived_at is null`,
					[LOT[0].id]
				)
			).rejects.toThrow(/n'est rangé dans aucun nœud de l'arbre/);
		});
	});

	it('un point du lot archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = 'CP' and code = 'CP-008' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), 1 point\(s\)/
			);
		});
	});
});
