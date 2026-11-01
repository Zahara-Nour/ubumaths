/**
 * Chantier « questions-ce2 », lot 5 (problèmes) : nœud et tag des 12 brouillons neufs
 * (Supabase local requis)
 * ===============================================================================================
 *
 * Migration `20261101160300_questions_ce2_lot5_rangement_tags` : les 12 brouillons créés le
 * 2026-11-01 (scripts/questions/ce2-5/) vont chacun sur le nœud de leur point, une sous-notion de
 * « Problèmes arithmétiques » (parties-tout, comparaison, en deux étapes ou plus, multiplicatifs, produits cartésiens), et reçoivent
 * ce point, un seul (ADR 0020). Journal docs/wip/questions-ce2-progress.md, § 9.
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, en CE2, sans nœud ni tag — puis rejoue la migration
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

const LONGUEURS = 'Grandeurs et mesures > Longueurs';
const MIGRATION = 'supabase/migrations/20261101160300_questions_ce2_lot5_rangement_tags.sql';
const PARTIES_TOUT = 'Nombres et calculs > Problèmes arithmétiques > parties-tout';
const COMPARAISON = 'Nombres et calculs > Problèmes arithmétiques > comparaison';
const ETAPES = 'Nombres et calculs > Problèmes arithmétiques > en deux étapes ou plus';
const MULTIPLICATIFS = 'Nombres et calculs > Problèmes arithmétiques > multiplicatifs';
const CARTESIENS = 'Nombres et calculs > Problèmes arithmétiques > produits cartésiens';
/** Le lot : identifiants créés en prod le 2026-11-01, nœuds (des sous-notions) et points attendus. */
const LOT: { id: string; noeud: string; code: string }[] = [
	{ id: '08cac7de-8f4d-42fa-b557-9b833cacde92', noeud: PARTIES_TOUT, code: 'CE2-029' },
	{ id: 'a2bee082-e50e-44b7-880b-baf7b16c9748', noeud: PARTIES_TOUT, code: 'CE2-029' },
	{ id: '4f47f8d6-48ad-46e3-a237-57ce5ad64b9a', noeud: PARTIES_TOUT, code: 'CE2-029' },
	{ id: '10f05004-a9a0-49d0-9646-52b1951cbc52', noeud: COMPARAISON, code: 'CE2-079' },
	{ id: '28988062-64e3-407f-8b14-9340e155fb5c', noeud: ETAPES, code: 'CE2-030' },
	{ id: '4948acaf-461e-4ba7-b969-e8b596d2fa34', noeud: ETAPES, code: 'CE2-030' },
	{ id: 'fe26e846-1349-47de-b2bc-789194309461', noeud: MULTIPLICATIFS, code: 'CE2-031' },
	{ id: '37a715c4-273b-449e-811f-8d79232a3761', noeud: MULTIPLICATIFS, code: 'CE2-031' },
	{ id: '059b8bba-c68f-4b8d-b93a-04a33e8d1c1c', noeud: MULTIPLICATIFS, code: 'CE2-031' },
	{ id: '0f5d9ad8-4676-432e-88aa-d8f6fff43184', noeud: COMPARAISON, code: 'CE2-033' },
	{ id: '43b40fc7-917e-4e8f-8136-1868242354ac', noeud: ETAPES, code: 'CE2-032' },
	{ id: '837d027b-37c9-4378-b721-5122948d8402', noeud: CARTESIENS, code: 'CE2-034' }
];
const ids = LOT.map((m) => m.id);
/** Date de modification fabriquée : elle ne doit pas bouger (ranger et taguer ne modifient pas le contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

/** Pose l'état de la prod : les copies des modèles, en CE2, sans nœud ni tag. */
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
		`update public.question_templates set grades = array['CE2'] where id = any($1::uuid[])`,
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

describe('Questions CE2, lot 5 : nœud et tag des brouillons neufs (migration de données)', () => {
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
		expect(apres.tags).toEqual(LOT.map((m) => `${m.id}§CE2§${m.code}`).sort());
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

describe('Questions CE2, lot 5 : les branches d’échec de la migration', () => {
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
			await pg.query('delete from public.question_templates where id = $1', [ids[11]]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/identifiants partiellement présents : 11 modèle\(s\) sur 12/
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
					 select $1, id from public.curriculum_points where grade = 'CE2' and code = 'CE2-011' and archived_at is null`,
					[LOT[0].id]
				)
			).rejects.toThrow(/n'est rangé dans aucun nœud de l'arbre/);
		});
	});

	it('un point du lot archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = 'CE2' and code = 'CE2-034' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), 1 point\(s\)/
			);
		});
	});
});
