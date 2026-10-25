/**
 * Chantier « questions », lot B2 du CP : nœud et tag de 10 modèles neufs (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261026150000_questions_cp_b2_rangement_tags` : les 10 brouillons « reconnaître sur une figure »
 * créés le 2026-10-25 par scripts/create-questions.ts (sans nœud ni tag) vont sur la
 * sous-notion de leur point et reçoivent ce point, un seul (ADR 0020).
 * Décision de David (journal docs/wip/questions-progress.md § 4 duodecies).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, au CP, sans nœud ni tag — puis rejoue la migration
 * **depuis son fichier**, dans une transaction annulée à la fin. Les triggers de garde des tags
 * restent actifs : chaque tag posé a passé la règle du nœud.
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
import { QUESTIONS_CP_FORMES } from '../helpers/database/later-migrations';

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

const MIGRATION = 'supabase/migrations/20261026150000_questions_cp_b2_rangement_tags.sql';
const LONGUEURS = 'Grandeurs et mesures > Longueurs';
/** Le lot : identifiant créé en prod le 2026-10-25, nœud et points attendus. */
const LOT: { id: string; noeud: string; code: string }[] = [
	{
		id: '9d6bc8b3-ee8f-4f70-a735-61b1075a9746',
		noeud: 'Géométrie > Figures planes > propriétés',
		code: 'CP-054'
	},
	{
		id: 'e7453c9b-8cbd-44ef-86ca-2aaf0340b5fa',
		noeud: 'Géométrie > Figures planes > propriétés',
		code: 'CP-055'
	},
	{
		id: 'c85626fa-c875-4314-bbb9-96c4b7c6dd48',
		noeud: 'Géométrie > Figures planes > propriétés',
		code: 'CP-056'
	},
	{
		id: '91012bab-0bab-4cd0-a86c-97574c44c9d9',
		noeud: 'Géométrie > Figures planes > propriétés',
		code: 'CP-056'
	},
	{
		id: 'b5389494-3b1c-4f32-85c2-473192c9bacc',
		noeud: 'Géométrie > Figures planes > propriétés',
		code: 'CP-057'
	},
	{
		id: 'd5a36be9-f6bb-428f-b0e0-60bee080bd19',
		noeud: 'Géométrie > Repérage et déplacements > positions et plans',
		code: 'CP-061'
	},
	{
		id: '2fc01600-c06d-45cc-a2bd-a8f89ff7fc58',
		noeud: 'Géométrie > Repérage et déplacements > positions et plans',
		code: 'CP-062'
	},
	{
		id: 'f7167af7-564a-481d-8059-47624bdf59a3',
		noeud: 'Géométrie > Repérage et déplacements > coder un déplacement',
		code: 'CP-067'
	},
	{
		id: 'd50c6e21-627f-45eb-9ca1-9dcfa6757563',
		noeud: 'Grandeurs et mesures > Longueurs > comparaison et mesure',
		code: 'CP-035'
	},
	{
		id: '7093b797-0fa4-44e1-8828-327d5d3c452b',
		noeud: 'Grandeurs et mesures > Longueurs > comparaison et mesure',
		code: 'CP-034'
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

describe('Questions CP, lot B2 : nœud et tag des modèles neufs (migration de données)', () => {
	let pg: Client;
	let apres: Etat;
	let annule: Etat;

	beforeAll(async () => {
		await cleanupAllTestData();
		const prof = await TestData.profile().withRole('teacher').create();
		pg = await getPostgresClient();

		await pg.query('begin');
		// CP-054 et CP-055 ont quitté « propriétés » depuis (20261026170000) : retrouver l'état d'alors
		await pg.query(extractRollback(QUESTIONS_CP_FORMES));
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

describe('Questions CP, lot B2 : les branches d’échec de la migration', () => {
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
			await pg.query(extractRollback(QUESTIONS_CP_FORMES));
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
				/identifiants partiellement présents : 9 modèle\(s\) sur 10/
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
					 select $1, id from public.curriculum_points where grade = 'CP' and code = 'CP-055' and archived_at is null`,
					[LOT[1].id]
				)
			).rejects.toThrow(/n'est rangé dans aucun nœud de l'arbre/);
		});
	});

	it('un point du lot archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = 'CP' and code = 'CP-061' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), 1 point\(s\)/
			);
		});
	});
});
