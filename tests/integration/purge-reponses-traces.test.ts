/**
 * Purge de fin d'année des réponses des traces (L6, chantier `formes-de-serie`)
 * ============================================================================
 *
 * Décisions de David (2026-11-11) : chaque dimanche, la purge RGPD efface la réponse
 * case par case (`answer_parts`) et le verdict par case (`part_verdicts`) des traces
 * créées avant le 1er août de l'année scolaire en cours (heure de Paris). Tout le reste
 * de la trace est gardé : réussi/raté, origine, lieu, durées, fin, graine, date.
 * Seules les traces sont concernées (`test_answers` n'est pas touché).
 *
 * Ce que le fichier prouve :
 *   1. la date de coupure : 1er août de l'année scolaire en cours, à minuit à Paris ;
 *   2. une trace d'il y a deux ans perd réponse et verdicts, garde tout le reste ;
 *   3. une trace de l'année en cours est gardée entière ;
 *   4. un second passage ne retouche rien ;
 *   5. ni un élève ni un visiteur ne peut lancer la purge ;
 *   6. la purge hebdomadaire l'appelle, et le passage est journalisé.
 *
 * DOIT échouer sans la migration `…_purge_reponses_traces.sql`.
 *
 * `pnpm db:start` puis `pnpm test:integration tests/integration/purge-reponses-traces.test.ts`.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPostgresClient } from '../helpers/database/postgres-client';
import {
	createServiceRoleClient,
	TestData,
	createFakeTemplate,
	cleanupCompetenceTestData
} from '../helpers/competence-referentiel.helpers';

// Types
type TraceRow = {
	success: boolean;
	source: string;
	place: string | null;
	response_ms: number | null;
	allotted_ms: number | null;
	end_reason: string | null;
	seed: number | null;
	answer_parts: string[] | null;
	part_verdicts: boolean[] | null;
	created_at: Date;
};

// Variables
let studentId: string;
let templateId: string;
let ancienne: string;
let recente: string;
let premierPassage: number;
let secondPassage: number;

// Functions
/** Trace de Contrôle blanc complète, créée il y a `age`. */
async function trace(age: string): Promise<string> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query<{ id: string }>(
		`insert into skill_attempts (student_id, template_id, success, source, place, response_ms,
		   allotted_ms, end_reason, seed, answer_parts, part_verdicts, created_at)
		 values ($1, $2, true, 'auto', 'mock_test', 12345, 30000, 'validated', 424242,
		   array['\\frac{3}{4}', '12'], array[true, false], now() - $3::interval)
		 returning id`,
		[studentId, templateId, age]
	);
	return rows[0].id;
}

async function lire(id: string): Promise<TraceRow> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query<TraceRow>(
		`select success, source, place, response_ms, allotted_ms, end_reason, seed, answer_parts,
		   part_verdicts, created_at from skill_attempts where id = $1`,
		[id]
	);
	return rows[0];
}

async function purger(): Promise<number> {
	const pg = await getPostgresClient();
	const { rows } = await pg.query<{ n: number }>('select public.purge_trace_answers()::int as n');
	return rows[0].n;
}

// ============================================================================
// TESTS
// ============================================================================

describe('purge des réponses des traces : date de coupure', () => {
	it.each([
		['2026-11-11', '2026-08-01'],
		['2027-03-01', '2026-08-01'],
		['2027-07-31', '2026-08-01'],
		['2026-08-01', '2026-08-01'],
		['2026-07-31', '2025-08-01'],
		['2027-01-01', '2026-08-01']
	])('le %s, la coupure est le 1er août %s à minuit à Paris', async (jour, coupure) => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query<{ ok: boolean }>(
			`select public.trace_answers_cutoff($1::date)
			   = ($2::date::timestamp at time zone 'Europe/Paris') as ok`,
			[jour, coupure]
		);
		expect(rows[0].ok).toBe(true);
	});
});

describe('purge des réponses des traces', () => {
	beforeAll(async () => {
		await cleanupCompetenceTestData();
		const service = createServiceRoleClient();
		const student = await TestData.profile().withRole('student').create();
		studentId = student.id;
		templateId = await createFakeTemplate(service, student.id);
		ancienne = await trace('2 years');
		recente = await trace('1 minute');
		premierPassage = await purger();
		secondPassage = await purger();
	});

	afterAll(async () => {
		await cleanupCompetenceTestData();
	});

	it("une trace d'il y a deux ans perd réponse et verdicts, garde tout le reste", async () => {
		const row = await lire(ancienne);
		expect(row.answer_parts).toBeNull();
		expect(row.part_verdicts).toBeNull();
		expect(row).toMatchObject({
			success: true,
			source: 'auto',
			place: 'mock_test',
			response_ms: 12345,
			allotted_ms: 30000,
			end_reason: 'validated',
			seed: 424242
		});
	});

	it("une trace de l'année en cours est gardée entière", async () => {
		const row = await lire(recente);
		expect(row.answer_parts).toEqual(['\\frac{3}{4}', '12']);
		expect(row.part_verdicts).toEqual([true, false]);
	});

	it('le premier passage compte la trace purgée, le second ne retouche rien', () => {
		expect(premierPassage).toBeGreaterThanOrEqual(1);
		expect(secondPassage).toBe(0);
	});

	it('ni un élève ni un visiteur ne peut lancer la purge', async () => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query<{ eleve: boolean; visiteur: boolean; serveur: boolean }>(
			`select has_function_privilege('authenticated', 'public.purge_trace_answers()', 'EXECUTE') as eleve,
			   has_function_privilege('anon', 'public.purge_trace_answers()', 'EXECUTE') as visiteur,
			   has_function_privilege('service_role', 'public.purge_trace_answers()', 'EXECUTE') as serveur`
		);
		expect(rows[0]).toEqual({ eleve: false, visiteur: false, serveur: true });
	});

	it('le passage est journalisé (page admin des tâches planifiées)', async () => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query<{ n: number }>(
			`select count(*)::int as n from background_job_runs
			 where job_name = 'trace_answers_purge' and status = 'success'
			   and started_at > now() - interval '5 minutes'`
		);
		expect(rows[0].n).toBeGreaterThanOrEqual(2);
	});

	it('la purge hebdomadaire appelle purge_trace_answers', async () => {
		const pg = await getPostgresClient();
		const { rows } = await pg.query<{ def: string }>(
			`select pg_get_functiondef('public.run_cleanup_expired_data'::regproc) as def`
		);
		expect(rows[0].def).toContain('purge_trace_answers()');
		expect(rows[0].def).toContain('run_retention_c11()');
	});
});
