/**
 * Chantier « questions-6 », lot 6b « Grandeurs et probabilités » : nœud et tag de 6 brouillons (Supabase local requis)
 * ======================================================================================
 *
 * Migration `20261030170000_questions_6_lot6b_rangement_tags` : les 7 brouillons de 6e créés
 * le 2026-10-30 par scripts/create-questions.ts (scripts/questions/6-grandeurs/, sans
 * nœud ni tag) vont sur le nœud de leur point, un seul point chacun (ADR 0020). Décisions de
 * David (journal docs/wip/questions-6-progress.md § 13).
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
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261030170000_questions_6_lot6b_rangement_tags.sql';
const PERIMETRES = 'Grandeurs et mesures > Périmètres > disque';
const DUREES = 'Grandeurs et mesures > Durées';
const LONGUEURS = 'Grandeurs et mesures > Longueurs';
/** Le lot : identifiant en prod, nœud et point attendus (M7 à M13 de la phase 0). */
const LOT: { id: string; noeud: string; code: string }[] = [
	{ id: '4343af4c-1549-4eb3-8471-8fd3f9233c38', noeud: PERIMETRES, code: '6-145' },
	{ id: 'ccb4f5e5-3494-4447-9f6a-3bc3b3622eab', noeud: PERIMETRES, code: '6-146' },
	{ id: 'cfb4c692-04d8-4cd9-9849-3b5cb94628e5', noeud: PERIMETRES, code: '6-147' },
	{
		id: '5db370fc-6573-4398-aaee-7014947e25b9',
		noeud: 'Grandeurs et mesures > Volumes > conversions',
		code: '6-153'
	},
	{ id: 'ffca5b4a-cb8d-43c2-979e-fb7956046032', noeud: `${DUREES} > conversions`, code: '6-156' },
	{
		id: 'ee82f057-9b6a-46e6-9892-ca2f9578dd9d',
		noeud: `${DUREES} > calcul de durées`,
		code: '6-158'
	},
	{
		id: '78dcb478-bcde-4234-99bf-4f396d1511e6',
		noeud: 'Probabilités > Expériences aléatoires > probabilité simple',
		code: '6-186'
	}
];
const ids = LOT.map((m) => m.id);
/** Date de modification fabriquée : elle ne doit pas bouger (ranger et taguer ne touchent pas le contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

/** Pose l'état de la prod : 7 brouillons en 6e, sans nœud ni tag. */
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
	return {
		noeuds: new Map(q.rows.map((r) => [r.id, chemins.get(r.node ?? '') ?? '∅'])),
		grades: new Map(q.rows.map((r) => [r.id, r.grades.join(',')])),
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()])),
		tags: t.rows.map((r) => `${r.template_id}§${r.grade}§${r.code}`).sort()
	};
}

// ============================================================================
// SUITE
// ============================================================================

describe('Questions 6e, lot 6b « Grandeurs et probabilités » : nœud et tag (migration de données)', () => {
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

	it('les 7 modèles restent en 6e', () => {
		expect(LOT.map((m) => apres.grades.get(m.id))).toEqual(LOT.map(() => '6'));
	});

	it('`updated_at` des modèles est préservé', () => {
		expect([...apres.dates.values()]).toEqual(ids.map(() => AVANT));
	});

	it('le rollback écrit dans la migration rend l’état d’avant', () => {
		expect(annule.tags).toEqual([]);
		expect(LOT.map((m) => annule.noeuds.get(m.id))).toEqual(LOT.map(() => '∅'));
		expect([...annule.dates.values()]).toEqual(ids.map(() => AVANT));
	});
});

describe('Questions 6e, lot 6b « Grandeurs et probabilités » : les branches d’échec de la migration', () => {
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
				 select $1, id from public.curriculum_points where grade = '6' and code = '6-145' and archived_at is null`,
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
				/rollback : état changé depuis la migration \(6 intact\(s\) sur 7, 7 tag\(s\)\)/
			);
		});
	});

	it('le rollback refuse si un tag a changé de modèle depuis la migration (total inchangé)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			// 7 tags au total, mais le premier modèle n'a plus le sien et le deuxième en porte deux
			await pg.query('alter table public.question_template_points disable trigger user');
			await pg.query('delete from public.question_template_points where template_id = $1', [
				ids[0]
			]);
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points where grade = '6' and code = '6-158' and archived_at is null`,
				[ids[1]]
			);
			await pg.query('alter table public.question_template_points enable trigger user');
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : état changé depuis la migration \(5 intact\(s\) sur 7, 7 tag\(s\)\)/
			);
		});
	});

	it('un point du lot archivé fait échouer la migration (résolution stricte)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`update public.curriculum_points set archived_at = now() where grade = '6' and code = '6-186' and archived_at is null`
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/chemins ou points introuvables : 0 nœud\(s\), 1 point\(s\)/
			);
		});
	});
});
