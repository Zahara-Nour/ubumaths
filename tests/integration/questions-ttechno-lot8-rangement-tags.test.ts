/**
 * Chantier « questions-ttechno », lot 8 : nœud et tag de 7 modèles neufs (Supabase local requis)
 * ==========================================================================================
 *
 * Migration `20261119144747_questions_ttechno_lot8_rangement_tags` : les 7 brouillons du lot 8
 * de Tle techno (loi binomiale) créés le 2026-11-19 par
 * scripts/create-questions.ts (sans nœud ni tag) vont sur le nœud de leur point et reçoivent ce
 * point, un seul (ADR 0020). Décision de David (journal docs/wip/questions-ttechno-progress.md
 * § 54 et § 55).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, en T_TECHNO, sans nœud ni tag — puis rejoue la migration
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

const MIGRATION = 'supabase/migrations/20261119144747_questions_ttechno_lot8_rangement_tags.sql';
const LOI = 'Probabilités > Loi binomiale';
const ESPERANCE = 'Probabilités > Loi binomiale > espérance et variance';
const PASCAL = 'Dénombrement > Combinaisons > triangle de Pascal';
const COEFFICIENTS = 'Dénombrement > Combinaisons > coefficients binomiaux';
const LONGUEURS = 'Grandeurs et mesures > Longueurs';
/** Le lot : identifiant créé en prod le 2026-11-19, nœud et points attendus. */
const LOT: { id: string; noeud: string; code: string }[] = [
	{ id: '9fa1b0e9-82b4-487d-a97b-cc7c16d29a76', noeud: LOI, code: 'TTECHNO-057' },
	{ id: '98ce1795-1cb6-4116-87d1-7ee062e0c2bb', noeud: PASCAL, code: 'TTECHNO-060' },
	{ id: '04e65a91-c47e-4aa9-a92f-aa652e03adbb', noeud: COEFFICIENTS, code: 'TTECHNO-061' },
	{ id: 'bacd052e-9780-4f1d-9f6a-2e97733168a9', noeud: LOI, code: 'TTECHNO-067' },
	{ id: 'ae383e7c-937d-44e8-bf19-280ebf98be6e', noeud: LOI, code: 'TTECHNO-090' },
	{ id: '82a0e909-3b31-46b8-9b5b-136bb7342b9b', noeud: ESPERANCE, code: 'TTECHNO-069' },
	{ id: '8ad50484-b694-4109-8e4b-183bb7dbdf91', noeud: ESPERANCE, code: 'TTECHNO-091' }
];
const ids = LOT.map((m) => m.id);
/** Date de modification fabriquée : elle ne doit pas bouger (ranger et taguer ne modifient pas le contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

/** Pose l'état de la prod : les copies des modèles, en T_TECHNO, sans nœud ni tag. */
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
		`update public.question_templates set grades = array['T_TECHNO'] where id = any($1::uuid[])`,
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

describe('Questions TTECHNO, lot 8 : nœud et tag des modèles neufs (migration de données)', () => {
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

	it('chaque modèle porte EXACTEMENT son point, rien de plus', () => {
		expect(apres.tags).toEqual(LOT.map((m) => `${m.id}§T_TECHNO§${m.code}`).sort());
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

describe('Questions TTECHNO, lot 8 : les branches d’échec de la migration', () => {
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
				/identifiants partiellement présents : 6 modèle\(s\) sur 7/
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
					 select $1, id from public.curriculum_points where grade = 'T_TECHNO' and code = 'TTECHNO-057' and archived_at is null`,
					[LOT[0].id]
				)
			).rejects.toThrow(/n'est rangé dans aucun nœud de l'arbre/);
		});
	});

	it('un point du lot archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = 'T_TECHNO' and code = 'TTECHNO-091' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), 1 point\(s\)/
			);
		});
	});
});
