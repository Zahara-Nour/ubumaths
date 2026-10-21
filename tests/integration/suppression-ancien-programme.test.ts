/**
 * Suppression de l'ancien programme (étape 4 de C5) — intégration
 * ================================================================
 *
 * Migration `20261022080000_suppression_ancien_programme.sql` (DESTRUCTIVE, phase 0 validée par
 * David le 2026-10-21). Ce qu'on prouve :
 *   · les tables thèmes et objectifs, la colonne `objective_id` et les 8 fonctions n'existent plus ;
 *   · plus aucun point sans nœud : `node_id` est obligatoire ;
 *   · un point neuf s'insère encore, avec son code (plus de trigger d'attribution) ;
 *   · la garde du § 1 ARRÊTE la migration quand une ligne pointe encore vers un ancien point
 *     (rejouée dans une transaction annulée, sur une colonne fantôme `objective_id`).
 *
 * DOIT échouer sans la migration (catalogue).
 * `pnpm db:start` puis
 * `pnpm test:integration tests/integration/suppression-ancien-programme.test.ts`.
 *
 * @vitest-environment node
 */

import { readFileSync } from 'node:fs';
import { describe, it, expect, afterAll } from 'vitest';
import { getPostgresClient } from '../helpers/database/postgres-client';

// Constantes
const MIGRATION_PATH = new URL(
	'../../supabase/migrations/20261022080000_suppression_ancien_programme.sql',
	import.meta.url
);
const DROPPED_RELATIONS = ['curriculum_themes', 'curriculum_objectives'];
const DROPPED_FUNCTIONS = [
	'reorder_curriculum_themes',
	'reorder_curriculum_objectives',
	'reorder_curriculum_points',
	'curriculum_referenced_points',
	'place_curriculum_theme_last',
	'place_curriculum_objective_last',
	'place_curriculum_point_last',
	'assign_curriculum_point_code'
];
const TEST_CODE = 'TSPE-999';
/** Une ligne par table que la garde surveille, accrochée au point `$1`. */
const REFERENCING_ROWS: Record<string, string> = {
	student_point_state: `insert into public.student_point_state (student_id, point_id)
		values (gen_random_uuid(), $1)`,
	journal_entry_points: `insert into public.journal_entry_points (entry_id, point_id)
		values (gen_random_uuid(), $1)`,
	exercise_curriculum_points: `insert into public.exercise_curriculum_points (exercise_id, point_id)
		values (gen_random_uuid(), $1)`,
	curriculum_point_automatismes: `insert into public.curriculum_point_automatismes (point_id, grade)
		select $1, coalesce(grade, '6') from public.curriculum_points where id = $1`,
	srs_anti_fraud_flags: `insert into public.srs_anti_fraud_flags
		(student_id, capacity_point_id, flag_type, severity, score, window_start, window_end, sample_size)
		values (gen_random_uuid(), $1, 'burst', 1, 0.5, now() - interval '1 hour', now(), 0)`
};

// Functions
async function catalogValue(sql: string, params: unknown[] = []): Promise<unknown> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query(sql, params);
	return rows[0]?.value;
}

/** Le bloc de garde du § 1, seul : il doit se rejouer sur l'état d'après. */
function guardBlock(): string {
	const sql = readFileSync(MIGRATION_PATH, 'utf-8');
	const start = sql.indexOf('do $garde$');
	const end = sql.indexOf('end $garde$;');
	expect(start, 'bloc de garde introuvable').toBeGreaterThanOrEqual(0);
	expect(end, 'fin du bloc de garde introuvable').toBeGreaterThan(start);
	return sql.slice(start, end + 'end $garde$;'.length);
}

describe('suppression de l’ancien programme (20261022080000)', () => {
	afterAll(async () => {
		const pg = await getPostgresClient();
		await pg.query(`delete from public.curriculum_points where code = $1`, [TEST_CODE]);
	});

	describe('catalogue', () => {
		it.each(DROPPED_RELATIONS)('la table public.%s n’existe plus', async (name) => {
			expect(await catalogValue(`select to_regclass($1)::text as value`, [`public.${name}`])).toBe(
				null
			);
		});

		it('la colonne curriculum_points.objective_id n’existe plus', async () => {
			const count = await catalogValue(
				`select count(*)::int as value from information_schema.columns
				 where table_schema = 'public' and table_name = 'curriculum_points'
				   and column_name = 'objective_id'`
			);
			expect(count).toBe(0);
		});

		it('aucune des 8 fonctions de l’ancien monde n’existe plus', async () => {
			const pg = await getPostgresClient();
			const { rows } = await pg.query(
				`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
				 where n.nspname = 'public' and p.proname = any($1::text[])`,
				[DROPPED_FUNCTIONS]
			);
			expect(rows.map((row: { proname: string }) => row.proname)).toEqual([]);
		});

		it('curriculum_points.node_id est obligatoire', async () => {
			const nullable = await catalogValue(
				`select is_nullable as value from information_schema.columns
				 where table_schema = 'public' and table_name = 'curriculum_points'
				   and column_name = 'node_id'`
			);
			expect(nullable).toBe('NO');
		});

		it('la contrainte curriculum_points_one_generation n’existe plus', async () => {
			const count = await catalogValue(
				`select count(*)::int as value from pg_constraint
				 where conname = 'curriculum_points_one_generation'`
			);
			expect(count).toBe(0);
		});
	});

	describe('points neufs', () => {
		it('un point neuf s’insère avec son code ; sans nœud ou sans code, il est refusé', async () => {
			const pg = await getPostgresClient();
			const { rows } = await pg.query(
				`select node_id, grade, kind, exigence, regime_acquisition
				   from public.curriculum_points where grade = 'T_SPE' limit 1`
			);
			const model = rows[0] as {
				node_id: string;
				grade: string;
				kind: string;
				exigence: string;
				regime_acquisition: string;
			};
			expect(model, 'décor : un point de Tle spé').toBeDefined();
			const insert = `insert into public.curriculum_points
				(code, name, node_id, grade, kind, exigence, regime_acquisition)
				values ($1, 'Point de test', $2, $3, $4, $5, $6)`;

			await pg.query(insert, [
				TEST_CODE,
				model.node_id,
				model.grade,
				model.kind,
				model.exigence,
				model.regime_acquisition
			]);
			const count = await catalogValue(
				`select count(*)::int as value from public.curriculum_points where code = $1`,
				[TEST_CODE]
			);
			expect(count).toBe(1);

			await expect(
				pg.query(insert, [
					'TSPE-998',
					null,
					model.grade,
					model.kind,
					model.exigence,
					model.regime_acquisition
				])
			).rejects.toThrow(/node_id/);
			await expect(
				pg.query(insert, [
					null,
					model.node_id,
					model.grade,
					model.kind,
					model.exigence,
					model.regime_acquisition
				])
			).rejects.toThrow(/code/);
		});
	});

	describe('garde du § 1 (transaction annulée, colonne fantôme)', () => {
		it('les tables surveillées sont verrouillées AVANT la garde', () => {
			const sql = readFileSync(MIGRATION_PATH, 'utf-8');
			const lock = sql.indexOf('lock table public.curriculum_points');
			expect(lock, 'verrou absent').toBeGreaterThanOrEqual(0);
			expect(lock).toBeLessThan(sql.indexOf('do $garde$'));
			const statement = sql.slice(lock, sql.indexOf(';', lock));
			for (const table of Object.keys(REFERENCING_ROWS)) {
				expect(statement, `${table} non verrouillée`).toContain(`public.${table}`);
			}
		});

		it('passe quand aucun ancien point n’est référencé', async () => {
			const pg = await getPostgresClient();
			await pg.query('begin');
			try {
				await pg.query(`alter table public.curriculum_points add column objective_id uuid`);
				await expect(pg.query(guardBlock())).resolves.toBeDefined();
			} finally {
				await pg.query('rollback');
			}
		});

		it.each(Object.keys(REFERENCING_ROWS))(
			'ARRÊTE la migration quand %s pointe vers un ancien point',
			async (table) => {
				const pg = await getPostgresClient();
				await pg.query('begin');
				try {
					await pg.query(`alter table public.curriculum_points add column objective_id uuid`);
					const { rows } = await pg.query(`select id from public.curriculum_points limit 1`);
					const pointId = (rows[0] as { id: string } | undefined)?.id;
					expect(pointId, 'décor : un point').toBeDefined();
					// Décor sans ses parents (élève, exercice, entrée du cahier) : clés étrangères et
					// triggers suspendus le temps de l'insertion, dans la transaction annulée.
					await pg.query(`set local session_replication_role = replica`);
					await pg.query(REFERENCING_ROWS[table], [pointId]);
					await pg.query(`set local session_replication_role = origin`);
					await pg.query(
						`update public.curriculum_points set objective_id = gen_random_uuid() where id = $1`,
						[pointId]
					);
					await expect(pg.query(guardBlock())).rejects.toThrow(
						new RegExp(`anciens points encore référencés : .*${table} \\(\\d+\\)`)
					);
				} finally {
					await pg.query('rollback');
				}
			}
		);
	});
});
