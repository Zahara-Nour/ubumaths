/**
 * Chantier « questions-6 », lot 10 « Distances, cercle, médiatrice » : nœud et tag de 8 brouillons (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261102090404_questions_6_lot10_rangement_tags` : les 8 brouillons de 6e créés
 * le 2026-11-02 par scripts/create-questions.ts (scripts/questions/6-distances-cercle-mediatrice/, sans
 * nœud ni tag) vont sur le nœud de leur point, un seul point chacun (ADR 0020). Décisions de
 * David (journal docs/wip/questions-6-progress.md § 24).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, en 6e, brouillons, sans nœud ni tag — puis rejoue la
 * migration **depuis son fichier**, dans une transaction annulée à la fin. Les triggers de garde
 * des tags restent actifs : chaque tag posé a passé la règle du nœud.
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
	grades: Map<string, string>;
	dates: Map<string, string>;
	tags: string[];
	trigger: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261102090404_questions_6_lot10_rangement_tags.sql';
const CERCLE = 'Géométrie > Figures planes > cercle';
const MEDIATRICE = 'Géométrie > Figures planes > médiatrice et bissectrice';
const LONGUEURS = 'Grandeurs et mesures > Longueurs';
/** Le lot : identifiant en prod, nœud et point attendus (01 à 08 de la phase 0). */
const LOT: { id: string; noeud: string; code: string }[] = [
	{ id: '4a86db27-ae09-4095-97a6-e29eb29927eb', noeud: CERCLE, code: '6-160' },
	{ id: '3ec74bbc-fe33-4362-a3ad-184a6bac2649', noeud: CERCLE, code: '6-161' },
	{ id: 'b8939937-5201-406f-885a-0e5a0b5eec4e', noeud: CERCLE, code: '6-162' },
	{ id: '48524505-717f-4dd1-a69e-c9cf016406d1', noeud: CERCLE, code: '6-163' },
	{ id: '2f3da9ce-ec43-407a-bbb9-70759bbe3027', noeud: CERCLE, code: '6-164' },
	{ id: '15f9d78b-f1b0-4d20-b72f-a4eb2bdeefe4', noeud: MEDIATRICE, code: '6-165' },
	{ id: '9e90342c-2426-4f9f-93bd-f4e6dd3d6670', noeud: MEDIATRICE, code: '6-166' },
	{ id: '1b2ed3a5-7080-4bd2-8c0d-962df1814cf7', noeud: MEDIATRICE, code: '6-167' }
];
const ids = LOT.map((m) => m.id);
/** Date de modification fabriquée : elle ne doit pas bouger (ranger et taguer ne touchent pas le contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

/** Pose l'état de la prod : 8 brouillons en 6e, sans nœud ni tag. */
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
		`update public.question_templates set grades = array['6'] where id = any($1::uuid[])`,
		[ids]
	);
	await pg.query(
		'alter table public.question_templates enable trigger update_question_templates_updated_at'
	);
}

async function lireEtat(pg: Client): Promise<Etat> {
	const chemins = new Map<string, string>();
	for (const [id, node] of await readNodePaths(pg)) chemins.set(id, node.path);
	const q = await pg.query<{ id: string; node: string | null; grades: string[]; updated_at: Date }>(
		'select id, classification_node_id as node, grades, updated_at from public.question_templates where id = any($1::uuid[])',
		[ids]
	);
	const t = await pg.query<{ template_id: string; grade: string; code: string }>(
		`select q.template_id, p.grade, p.code from public.question_template_points q
		   join public.curriculum_points p on p.id = q.point_id where q.template_id = any($1::uuid[])`,
		[ids]
	);
	const tg = await pg.query<{ tgenabled: string }>(
		`select tgenabled from pg_trigger where tgname = 'update_question_templates_updated_at'`
	);
	return {
		noeuds: new Map(q.rows.map((r) => [r.id, chemins.get(r.node ?? '') ?? '∅'])),
		grades: new Map(q.rows.map((r) => [r.id, r.grades.join(',')])),
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()])),
		tags: t.rows.map((r) => `${r.template_id}§${r.grade}§${r.code}`).sort(),
		trigger: tg.rows[0]?.tgenabled ?? '∅'
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('Questions 6e, lot 10 « Distances, cercle, médiatrice » : nœud et tag (migration de données)', () => {
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
		expect(apres.tags).toEqual(LOT.map((m) => `${m.id}§6§${m.code}`).sort());
	});

	it('les 8 modèles restent en 6e', () => {
		expect(LOT.map((m) => apres.grades.get(m.id))).toEqual(LOT.map(() => '6'));
	});

	it('`updated_at` des modèles est préservé', () => {
		expect([...apres.dates.values()]).toEqual(ids.map(() => AVANT));
	});

	it('le trigger `updated_at` est réactivé après la migration et après le rollback', () => {
		expect([apres.trigger, annule.trigger]).toEqual(['O', 'O']);
	});

	it('le rollback écrit dans la migration rend l’état d’avant', () => {
		expect(annule.tags).toEqual([]);
		expect(LOT.map((m) => annule.noeuds.get(m.id))).toEqual(LOT.map(() => '∅'));
		expect([...annule.dates.values()]).toEqual(ids.map(() => AVANT));
	});
});

describe('Questions 6e, lot 10 « Distances, cercle, médiatrice » : les branches d’échec de la migration', () => {
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
				/identifiants partiellement présents : 7 modèle\(s\) sur 8/
			);
		});
	});

	it('un brouillon rangé à la main depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			const parChemin = new Map<string, string>();
			for (const [id, node] of await readNodePaths(pg)) parChemin.set(node.path, id);
			await pg.query(
				'update public.question_templates set classification_node_id = $2 where id = $1',
				[ids[0], parChemin.get(LONGUEURS)]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles rangés depuis le relevé : 1/
			);
		});
	});

	it('un niveau changé depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(`update public.question_templates set grades = array['5'] where id = $1`, [
				ids[0]
			]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/niveaux changés depuis le relevé : 1/
			);
		});
	});

	it('un brouillon publié depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(`update public.question_templates set status = 'published' where id = $1`, [
				ids[0]
			]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/statuts changés depuis le relevé : 1/
			);
		});
	});

	it('un brouillon tagué à la main depuis le relevé fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			// Un tag exige le nœud du point (trigger), et un modèle rangé tombe d'abord sous la garde
			// du nœud : pour atteindre la garde des tags, le tag est posé triggers coupés.
			await pg.query('alter table public.question_template_points disable trigger user');
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points where grade = '6' and code = '6-160' and archived_at is null`,
				[ids[0]]
			);
			await pg.query('alter table public.question_template_points enable trigger user');
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/modèles déjà tagués depuis le relevé : 1 tag\(s\)/
			);
		});
	});

	it('le rollback refuse si un modèle a été publié depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(`update public.question_templates set status = 'published' where id = $1`, [
				ids[0]
			]);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : état changé depuis la migration \(7 intact\(s\) sur 8, 8 tag\(s\)\)/
			);
		});
	});

	it('le rollback refuse si un tag a changé de modèle depuis la migration (total inchangé)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			// 8 tags au total, mais le premier modèle n'a plus le sien et le deuxième en porte deux
			await pg.query('alter table public.question_template_points disable trigger user');
			await pg.query('delete from public.question_template_points where template_id = $1', [
				ids[0]
			]);
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points where grade = '6' and code = '6-162' and archived_at is null`,
				[ids[1]]
			);
			await pg.query('alter table public.question_template_points enable trigger user');
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : état changé depuis la migration \(6 intact\(s\) sur 8, 8 tag\(s\)\)/
			);
		});
	});

	it('un point du lot archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = '6' and code = '6-167' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), 1 point\(s\)/
			);
		});
	});

	it('une sous-notion du lot archivée fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			const parChemin = new Map<string, string>();
			for (const [id, node] of await readNodePaths(pg)) parChemin.set(node.path, id);
			await pg.query('update public.classification_nodes set archived_at = now() where id = $1', [
				parChemin.get(MEDIATRICE)
			]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 3 nœud\(s\), 3 point\(s\)/
			);
		});
	});
});
