/**
 * 1re techno, lot G : tags 1TECHNO sur 3 modèles communs avec la 1re générale (Supabase local requis)
 * ================================================================================================
 *
 * Migration `20261117164821_questions_1techno_lot_g_tags` : 3 modèles de suites géométriques,
 * publiés, rangés et tagués 1GEN par questions-1gen, reçoivent un point 1TECHNO et le niveau
 * `1_TECHNO` (ajouté, jamais affecté en bloc). Journal : docs/wip/questions-1techno-progress.md (§ 16).
 *
 * Les modèles n'existent qu'en production. Le test fabrique donc l'état de la prod — des copies
 * minimales portant les VRAIS identifiants, au niveau relevé ({1_GEN}), rangées sur le nœud du point
 * visé et taguées de leur point 1GEN — puis rejoue la migration **depuis son fichier**, dans une
 * transaction annulée à la fin.
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
import { insertProdCopies } from '../helpers/database/prod-copies';

// ============================================================================
// TYPES
// ============================================================================

interface Etat {
	grades: Map<string, string[]>;
	dates: Map<string, string>;
	statuts: Map<string, string>;
	/** Codes portés par chaque modèle, triés */
	codes: Map<string, string[]>;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION = 'supabase/migrations/20261117164821_questions_1techno_lot_g_tags.sql';
/** Le lot : identifiant de la prod, point 1GEN déjà posé (relevé du 2026-11-17), point 1TECHNO visé. */
const LOT: [string, string, string][] = [
	['0b5c3db6-cb37-40fc-8247-12e3ace03a46', '1GEN-028', '1TECHNO-036'],
	['c4887e49-2337-4ac7-a2c9-369434868b65', '1GEN-029', '1TECHNO-038'],
	['569e0140-d5da-440f-a4c3-07bae4e6b30b', '1GEN-030', '1TECHNO-049']
];
const ids = LOT.map(([id]) => id);
const GRADES_RELEVES = ['1_GEN'];
/** Date de modification fabriquée : elle ne doit pas bouger (tags et niveaux ne sont pas du contenu). */
const AVANT = '2026-01-02T03:04:05.000Z';

// ============================================================================
// FONCTIONS
// ============================================================================

async function sansTriggerDeDate(pg: Client, sql: string, params: unknown[]): Promise<void> {
	await pg.query(
		'alter table public.question_templates disable trigger update_question_templates_updated_at'
	);
	await pg.query(sql, params);
	await pg.query(
		'alter table public.question_templates enable trigger update_question_templates_updated_at'
	);
}

/** Pose l'état de la prod : copies publiées, {1_GEN}, sur le nœud du point 1TECHNO, tag 1GEN posé. */
async function poserEtatProd(pg: Client, auteur: string): Promise<void> {
	await insertProdCopies(pg, {
		templateIds: ids,
		exerciseIds: [],
		authorId: auteur,
		timestamp: AVANT
	});
	for (const [id, codeGen, codeTechno] of LOT) {
		await sansTriggerDeDate(
			pg,
			`update public.question_templates
			    set grades = $2, status = 'published',
			        classification_node_id = (select node_id from public.curriculum_points
			                                   where code = $3 and archived_at is null)
			  where id = $1`,
			[id, GRADES_RELEVES, codeTechno]
		);
		await pg.query('delete from public.question_template_points where template_id = $1', [id]);
		await pg.query(
			`insert into public.question_template_points (template_id, point_id)
			 select $1, id from public.curriculum_points where code = $2 and archived_at is null`,
			[id, codeGen]
		);
	}
	// Garde du décor : en prod, point 1GEN et point 1TECHNO sont sur le même nœud
	const r = await pg.query<{ n: string }>(
		`select count(*) as n
		   from unnest($1::text[], $2::text[]) as l(g, t)
		   join public.curriculum_points pg_ on pg_.code = l.g
		   join public.curriculum_points pt on pt.code = l.t
		  where pg_.node_id = pt.node_id`,
		[LOT.map(([, g]) => g), LOT.map(([, , t]) => t)]
	);
	if (Number(r.rows[0].n) !== 3)
		throw new Error('décor faux : 1GEN et 1TECHNO sur des nœuds différents');
}

async function lireEtat(pg: Client): Promise<Etat> {
	const q = await pg.query<{ id: string; grades: string[]; status: string; updated_at: Date }>(
		'select id, grades, status, updated_at from public.question_templates where id = any($1::uuid[])',
		[ids]
	);
	const t = await pg.query<{ template_id: string; code: string }>(
		`select t.template_id, p.code
		   from public.question_template_points t join public.curriculum_points p on p.id = t.point_id
		  where t.template_id = any($1::uuid[])
		  order by p.code`,
		[ids]
	);
	const codes = new Map<string, string[]>(ids.map((id) => [id, []]));
	for (const r of t.rows) codes.get(r.template_id)?.push(r.code);
	return {
		grades: new Map(q.rows.map((r) => [r.id, r.grades])),
		dates: new Map(q.rows.map((r) => [r.id, r.updated_at.toISOString()])),
		statuts: new Map(q.rows.map((r) => [r.id, r.status])),
		codes
	};
}

function parModele<T>(m: Map<string, T>): (T | undefined)[] {
	return ids.map((id) => m.get(id));
}

// ============================================================================
// SUITE
// ============================================================================

describe('1re techno lot G : tags 1TECHNO sur 3 modèles communs (migration de données)', () => {
	let pg: Client;
	let avant: Etat;
	let apres: Etat;
	let annule: Etat;

	beforeAll(async () => {
		await cleanupAllTestData();
		const prof = await TestData.profile().withRole('teacher').create();
		pg = await getPostgresClient();

		await pg.query('begin');
		await poserEtatProd(pg, prof.id);
		avant = await lireEtat(pg);
		await pg.query(readFileSync(MIGRATION, 'utf-8'));
		apres = await lireEtat(pg);
		await pg.query(extractRollback(MIGRATION));
		annule = await lireEtat(pg);
	}, 60_000);

	afterAll(async () => {
		await pg.query('rollback');
		await cleanupAllTestData();
	});

	it('au départ : 3 modèles, {1_GEN}, seulement leur point 1GEN', () => {
		expect(parModele(avant.grades)).toEqual(ids.map(() => GRADES_RELEVES));
		expect(parModele(avant.codes)).toEqual(LOT.map(([, g]) => [g]));
	});

	it('chaque modèle garde son point 1GEN et reçoit EXACTEMENT son point 1TECHNO', () => {
		expect(parModele(apres.codes)).toEqual(LOT.map(([, g, t]) => [g, t]));
	});

	it('niveaux : {1_GEN, 1_TECHNO}', () => {
		expect(parModele(apres.grades)).toEqual(ids.map(() => ['1_GEN', '1_TECHNO']));
	});

	it('statuts et `updated_at` ne bougent pas', () => {
		expect(apres.statuts).toEqual(avant.statuts);
		expect(parModele(apres.dates)).toEqual(ids.map(() => AVANT));
	});

	it('le rollback rend l’état de départ (tag 1GEN compris)', () => {
		expect(parModele(annule.codes)).toEqual(LOT.map(([, g]) => [g]));
		expect(parModele(annule.grades)).toEqual(ids.map(() => GRADES_RELEVES));
		expect(parModele(annule.dates)).toEqual(ids.map(() => AVANT));
	});
});

describe('1re techno lot G : les branches d’échec de la migration', () => {
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

	it('base sans les modèles (locale) : la migration et le rollback passent sans rien toucher', async () => {
		await enTransaction(async () => {
			await pg.query('delete from public.question_templates where id = any($1::uuid[])', [ids]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).resolves.toBeDefined();
			const tags = await pg.query<{ n: string }>(
				'select count(*) as n from public.question_template_points where template_id = any($1::uuid[])',
				[ids]
			);
			expect(Number(tags.rows[0].n)).toBe(0);
			await expect(pg.query(extractRollback(MIGRATION))).resolves.toBeDefined();
		});
	});

	it('un modèle absent fait échouer la migration (tout ou rien)', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query('delete from public.question_templates where id = $1', [ids[0]]);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/identifiants partiellement présents : 2 modèle\(s\) sur 3/
			);
		});
	});

	it('un modèle qui a déjà 1_TECHNO fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = grades || '1_TECHNO'::text where id = $1`,
				[ids[0]]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/niveau 1_TECHNO différent du relevé : 2 sur 3 conformes/
			);
		});
	});

	it('un modèle déjà tagué d’un point 1TECHNO fait échouer la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(
				`insert into public.question_template_points (template_id, point_id)
				 select $1, id from public.curriculum_points where code = '1TECHNO-036'`,
				[ids[0]]
			);
			await expect(pg.query(readFileSync(MIGRATION, 'utf-8'))).rejects.toThrow(
				/déjà tagué\(s\) d'un point 1TECHNO : 0b5c3db6 \(1TECHNO-036\)/
			);
		});
	});

	it('un autre niveau ajouté entre-temps (1_SPE) est conservé', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = grades || '1_SPE'::text where id = $1`,
				[ids[0]]
			);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			const r = await pg.query<{ grades: string[] }>(
				'select grades from public.question_templates where id = $1',
				[ids[0]]
			);
			expect(r.rows[0].grades).toEqual(['1_GEN', '1_SPE', '1_TECHNO']);
			await pg.query(extractRollback(MIGRATION));
			const r2 = await pg.query<{ grades: string[] }>(
				'select grades from public.question_templates where id = $1',
				[ids[0]]
			);
			expect(r2.rows[0].grades).toEqual(['1_GEN', '1_SPE']);
		});
	});

	it('rollback refusé si 1_TECHNO a été retiré depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await sansTriggerDeDate(
				pg,
				`update public.question_templates set grades = array_remove(grades, '1_TECHNO') where id = $1`,
				[ids[0]]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : 1_TECHNO retiré depuis la migration : 2 sur 3 conformes/
			);
		});
	});

	it('rollback refusé si un tag 1TECHNO a disparu depuis la migration', async () => {
		await enTransaction(async () => {
			await poserEtatProd(pg, auteur);
			await pg.query(readFileSync(MIGRATION, 'utf-8'));
			await pg.query(
				`delete from public.question_template_points t using public.curriculum_points p
				  where p.id = t.point_id and p.code = '1TECHNO-036' and t.template_id = $1`,
				[ids[0]]
			);
			await expect(pg.query(extractRollback(MIGRATION))).rejects.toThrow(
				/rollback : tags changés depuis la migration : 2 sur 3 présents/
			);
		});
	});
});
