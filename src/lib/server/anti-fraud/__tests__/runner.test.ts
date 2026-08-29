/**
 * Tests TDD du runner anti-fraud (Phase 2).
 *
 * Couvre :
 *   - Job désactivé via app_config (skip early)
 *   - Job activé sans données (rien à scanner)
 *   - Job activé avec données nominales (flags créés)
 *   - Dédoublonnage (skip si flag identique non-résolu < 7j)
 *   - dry_run (pas d'INSERT, juste comptage)
 *
 * Source : `docs/wip/srs-anti-fraud-spec-tdd.md` §B7..B8
 */

import { describe, expect, it, vi } from 'vitest';
import { runAntiFraudJob } from '../runner';
import type { ReviewEntry } from '../types';

type QueryResult = { data: unknown; error: unknown };
type TableHandler = (op: 'select' | 'insert') => Promise<QueryResult> | QueryResult;
type MockSpec = Record<string, TableHandler>;

interface MockState {
	insertedFlags: Array<Record<string, unknown>>;
}

/**
 * Build a chainable Supabase mock that dispatches on table name. The handler
 * receives 'select' or 'insert' depending on the chain used.
 */
function buildMock(tableHandlers: MockSpec, state: MockState) {
	const fromMock = vi.fn().mockImplementation((table: string) => {
		const handler = tableHandlers[table];
		if (!handler) {
			throw new Error(`Unexpected table in mock: ${table}`);
		}

		const proxy: Record<string, unknown> = {};
		const noop = () => proxy;
		for (const k of ['select', 'eq', 'in', 'is', 'not', 'gte', 'order', 'limit']) {
			proxy[k] = vi.fn(noop);
		}

		proxy.maybeSingle = vi.fn(() => Promise.resolve(handler('select')));
		proxy.single = vi.fn(() => Promise.resolve(handler('select')));

		proxy.insert = vi.fn(async (row: Record<string, unknown> | Record<string, unknown>[]) => {
			const rows = Array.isArray(row) ? row : [row];
			state.insertedFlags.push(...rows);
			return handler('insert');
		});

		proxy.then = (onFulfilled: (value: QueryResult) => unknown) =>
			Promise.resolve(handler('select')).then(onFulfilled);

		return proxy;
	});
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return { from: fromMock } as any;
}

// Anchor review dates ~1 day ago (idx seconds apart) so they always fall inside
// the runner's default 7-day scan window, whatever wall-clock date the test runs
// on. Previously hardcoded to 2026-06-08, which silently rotted out of the window
// (every "nominal data" assertion broke once real time passed 2026-06-15).
const REVIEW_BASE_MS = Date.now() - 24 * 60 * 60 * 1000;
function makeReview(idx: number, grade: 1 | 2 | 3 | 4, timeSpent?: number): ReviewEntry {
	return {
		date: new Date(REVIEW_BASE_MS + idx * 1000).toISOString(),
		grade,
		elapsedDays: 1,
		retrievability: 0.9,
		timeSpent
	};
}

// ============================================================================
// B7 — job désactivé
// ============================================================================

describe('runAntiFraudJob — désactivé', () => {
	it('exit early si app_config.anti_fraud_enabled=false', async () => {
		const state: MockState = { insertedFlags: [] };
		const supabase = buildMock(
			{
				app_config: () => ({ data: { value: 'false' }, error: null })
			},
			state
		);

		const report = await runAntiFraudJob(supabase, { dry_run: false });
		expect(report.skipped_disabled).toBe(true);
		expect(report.flags_created).toBe(0);
		expect(state.insertedFlags).toEqual([]);
	});

	it('exit early si app_config row absente (fail-safe)', async () => {
		const state: MockState = { insertedFlags: [] };
		const supabase = buildMock(
			{
				app_config: () => ({ data: null, error: null })
			},
			state
		);

		const report = await runAntiFraudJob(supabase, { dry_run: false });
		expect(report.skipped_disabled).toBe(true);
	});

	it('case-insensitive : value="TRUE" considéré activé', async () => {
		const state: MockState = { insertedFlags: [] };
		const supabase = buildMock(
			{
				app_config: () => ({ data: { value: 'TRUE' }, error: null }),
				srs_card_stats: () => ({ data: [], error: null }),
				question_template_points: () => ({ data: [], error: null })
			},
			state
		);

		const report = await runAntiFraudJob(supabase, { dry_run: false });
		expect(report.skipped_disabled).toBe(false);
	});
});

// ============================================================================
// Job activé sans données
// ============================================================================

describe('runAntiFraudJob — activé sans données', () => {
	it('retourne 0 flags si aucune srs_card_stats', async () => {
		const state: MockState = { insertedFlags: [] };
		const supabase = buildMock(
			{
				app_config: () => ({ data: { value: 'true' }, error: null }),
				srs_card_stats: () => ({ data: [], error: null }),
				question_template_points: () => ({ data: [], error: null })
			},
			state
		);

		const report = await runAntiFraudJob(supabase);
		expect(report.flags_created).toBe(0);
		expect(report.scanned_pairs).toBe(0);
	});

	it('retourne 0 flags si templates non-tagués famille A', async () => {
		const state: MockState = { insertedFlags: [] };
		const reviews = Array.from({ length: 25 }, (_, i) => makeReview(i, 4));
		const supabase = buildMock(
			{
				app_config: () => ({ data: { value: 'true' }, error: null }),
				srs_card_stats: () => ({
					data: [{ user_id: 's1', card_reference_id: 't1', review_history: reviews }],
					error: null
				}),
				question_template_points: () => ({ data: [], error: null })
			},
			state
		);

		const report = await runAntiFraudJob(supabase);
		expect(report.scanned_pairs).toBe(0);
		expect(report.flags_created).toBe(0);
	});

	it('retourne 0 flags si reviews hors fenêtre (anciennes)', async () => {
		const state: MockState = { insertedFlags: [] };
		const oldReviews = Array.from({ length: 25 }, (_, i) => ({
			date: new Date(Date.UTC(2020, 0, 1, 12, 0, i)).toISOString(),
			grade: 4 as const,
			elapsedDays: 1,
			retrievability: 0.9
		}));
		const supabase = buildMock(
			{
				app_config: () => ({ data: { value: 'true' }, error: null }),
				srs_card_stats: () => ({
					data: [{ user_id: 's1', card_reference_id: 't1', review_history: oldReviews }],
					error: null
				}),
				question_template_points: () => ({
					data: [{ template_id: 't1', skill_id: 'cap1', skills: { family: 'knowledge' } }],
					error: null
				})
			},
			state
		);

		const report = await runAntiFraudJob(supabase);
		expect(report.scanned_pairs).toBe(0);
	});
});

// ============================================================================
// Job activé avec données — détection nominale
// ============================================================================

describe('runAntiFraudJob — activé avec données nominales', () => {
	it('crée un flag high_easy_ratio sur 25 reviews Easy', async () => {
		const state: MockState = { insertedFlags: [] };
		const reviews = Array.from({ length: 25 }, (_, i) => makeReview(i, 4));

		const supabase = buildMock(
			{
				app_config: () => ({ data: { value: 'true' }, error: null }),
				srs_card_stats: () => ({
					data: [{ user_id: 's1', card_reference_id: 't1', review_history: reviews }],
					error: null
				}),
				question_template_points: () => ({
					data: [{ template_id: 't1', skill_id: 'cap1', skills: { family: 'knowledge' } }],
					error: null
				}),
				skill_attempts: () => ({ data: [], error: null }),
				srs_anti_fraud_flags: (op) => {
					if (op === 'select') return { data: [], error: null };
					return { data: null, error: null };
				}
			},
			state
		);

		const report = await runAntiFraudJob(supabase);
		expect(report.scanned_pairs).toBeGreaterThan(0);
		expect(report.flags_created).toBeGreaterThanOrEqual(1);
		expect(state.insertedFlags.some((f) => f.flag_type === 'high_easy_ratio')).toBe(true);
	});

	it('crée un composite si ≥ 2 signaux déclenchés', async () => {
		const state: MockState = { insertedFlags: [] };
		// 30 reviews grade=4 + timeSpent=1 → high_easy_ratio + fast_timeSpent
		const reviews = Array.from({ length: 30 }, (_, i) => makeReview(i, 4, 1));

		const supabase = buildMock(
			{
				app_config: () => ({ data: { value: 'true' }, error: null }),
				srs_card_stats: () => ({
					data: [{ user_id: 's1', card_reference_id: 't1', review_history: reviews }],
					error: null
				}),
				question_template_points: () => ({
					data: [{ template_id: 't1', skill_id: 'cap1', skills: { family: 'knowledge' } }],
					error: null
				}),
				skill_attempts: () => ({ data: [], error: null }),
				srs_anti_fraud_flags: (op) => {
					if (op === 'select') return { data: [], error: null };
					return { data: null, error: null };
				}
			},
			state
		);

		const report = await runAntiFraudJob(supabase);
		// Au moins composite + 2 signaux individuels.
		expect(report.flags_created).toBeGreaterThanOrEqual(2);
		expect(state.insertedFlags.some((f) => f.flag_type === 'composite')).toBe(true);
	});

	it('respecte le filtre student_id', async () => {
		const state: MockState = { insertedFlags: [] };
		const supabase = buildMock(
			{
				app_config: () => ({ data: { value: 'true' }, error: null }),
				srs_card_stats: () => ({ data: [], error: null }),
				question_template_points: () => ({ data: [], error: null })
			},
			state
		);

		const report = await runAntiFraudJob(supabase, {
			student_id: '00000000-0000-0000-0000-000000000001',
			dry_run: false
		});
		expect(report.flags_created).toBe(0);
	});
});

// ============================================================================
// Dédoublonnage
// ============================================================================

describe('runAntiFraudJob — dédoublonnage', () => {
	it('skip si flag identique non-résolu < 7j existe', async () => {
		const state: MockState = { insertedFlags: [] };
		const reviews = Array.from({ length: 25 }, (_, i) => makeReview(i, 4));

		const supabase = buildMock(
			{
				app_config: () => ({ data: { value: 'true' }, error: null }),
				srs_card_stats: () => ({
					data: [{ user_id: 's1', card_reference_id: 't1', review_history: reviews }],
					error: null
				}),
				question_template_points: () => ({
					data: [{ template_id: 't1', skill_id: 'cap1', skills: { family: 'knowledge' } }],
					error: null
				}),
				skill_attempts: () => ({ data: [], error: null }),
				srs_anti_fraud_flags: (op) => {
					if (op === 'select') return { data: [{ id: 'existing-flag' }], error: null };
					return { data: null, error: null };
				}
			},
			state
		);

		const report = await runAntiFraudJob(supabase);
		expect(report.skipped_dedupe).toBeGreaterThan(0);
		expect(state.insertedFlags.length).toBe(0);
	});
});

// ============================================================================
// dry_run
// ============================================================================

describe('runAntiFraudJob — dry_run', () => {
	it('compte les flags candidats sans INSERT', async () => {
		const state: MockState = { insertedFlags: [] };
		const reviews = Array.from({ length: 25 }, (_, i) => makeReview(i, 4));

		const supabase = buildMock(
			{
				app_config: () => ({ data: { value: 'true' }, error: null }),
				srs_card_stats: () => ({
					data: [{ user_id: 's1', card_reference_id: 't1', review_history: reviews }],
					error: null
				}),
				question_template_points: () => ({
					data: [{ template_id: 't1', skill_id: 'cap1', skills: { family: 'knowledge' } }],
					error: null
				}),
				skill_attempts: () => ({ data: [], error: null })
			},
			state
		);

		const report = await runAntiFraudJob(supabase, { dry_run: true });
		expect(report.flags_created).toBeGreaterThan(0);
		expect(state.insertedFlags.length).toBe(0);
	});
});
