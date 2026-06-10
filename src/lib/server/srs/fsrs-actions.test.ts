/**
 * Unit tests for fsrs-actions.ts
 * ================================
 *
 * Tests les helpers FSRS partagés (load/init/upsert/review) avec mock Supabase
 * et mock FSRS.
 *
 * Couverture :
 *   - loadOrInitCardStats : lookup hit (map row → CardStats), miss (init via fsrs.initCard).
 *   - upsertCardStats : UPSERT avec conflict resolution, throw on error.
 *   - applyFsrsReview : pipeline complet load → reviewCard → upsert, propagation grade/timeSpent.
 *
 * Source : src/lib/server/srs/fsrs-actions.ts (refactor 2026-06-10 code-quality #2.2)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadOrInitCardStats, upsertCardStats, applyFsrsReview } from './fsrs-actions';
import { FSRS } from '$lib/srs/fsrs';
import { Grade, type CardStats } from '$lib/srs/types';

// ============================================================================
// Mock builders
// ============================================================================

function buildMockSupabase(opts: {
	maybeSingleData?: unknown;
	maybeSingleError?: unknown;
	upsertError?: unknown;
}) {
	const upsertMock = vi.fn().mockResolvedValue({ error: opts.upsertError ?? null });
	const chain = {
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		maybeSingle: vi.fn().mockResolvedValue({
			data: opts.maybeSingleData ?? null,
			error: opts.maybeSingleError ?? null
		}),
		upsert: upsertMock
	};
	const supabase = {
		from: vi.fn().mockReturnValue(chain)
	};
	return { supabase: supabase as never, chain, upsertMock };
}

function buildFsrs() {
	// Vrai FSRS — pas besoin de mocker (fonctions pures sans I/O)
	return new FSRS();
}

// Row DB factice (snake_case) telle qu'elle vient de srs_card_stats
function dbRow(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: 'stats-uuid',
		user_id: 'user-uuid',
		card_reference_type: 'template',
		card_reference_id: 'tpl-uuid',
		difficulty: 5,
		stability: 2.3,
		state: 'review',
		last_review: '2026-06-01T00:00:00Z',
		next_review: '2026-06-15T00:00:00Z',
		total_reviews: 3,
		review_history: [],
		created_at: '2026-05-01T00:00:00Z',
		updated_at: '2026-06-01T00:00:00Z',
		...overrides
	};
}

// ============================================================================
// loadOrInitCardStats
// ============================================================================

describe('loadOrInitCardStats', () => {
	beforeEach(() => vi.clearAllMocks());

	it('maps existing row from snake_case to camelCase CardStats', async () => {
		const { supabase } = buildMockSupabase({ maybeSingleData: dbRow() });
		const stats = await loadOrInitCardStats(
			supabase,
			buildFsrs(),
			'user-uuid',
			'template',
			'tpl-uuid'
		);

		expect(stats.id).toBe('stats-uuid');
		expect(stats.userId).toBe('user-uuid');
		expect(stats.cardReferenceType).toBe('template');
		expect(stats.cardReferenceId).toBe('tpl-uuid');
		expect(stats.difficulty).toBe(5);
		expect(stats.stability).toBe(2.3);
		expect(stats.state).toBe('review');
		expect(stats.lastReview).toBe('2026-06-01T00:00:00Z');
		expect(stats.nextReview).toBe('2026-06-15T00:00:00Z');
		expect(stats.totalReviews).toBe(3);
		expect(stats.reviewHistory).toEqual([]);
		expect(stats.createdAt).toBe('2026-05-01T00:00:00Z');
		expect(stats.updatedAt).toBe('2026-06-01T00:00:00Z');
	});

	it('initializes via FSRS.initCard when no row exists (stability=0 for first review)', async () => {
		const { supabase } = buildMockSupabase({ maybeSingleData: null });
		const stats = await loadOrInitCardStats(
			supabase,
			buildFsrs(),
			'user-uuid',
			'template',
			'tpl-uuid'
		);

		expect(stats.userId).toBe('user-uuid');
		expect(stats.cardReferenceType).toBe('template');
		expect(stats.cardReferenceId).toBe('tpl-uuid');
		// FSRS.initCard renvoie stability=0 → mode "first review" préservé
		expect(stats.stability).toBe(0);
		expect(stats.state).toBe('new');
		expect(stats.totalReviews).toBe(0);
		expect(stats.reviewHistory).toEqual([]);
		// id généré, createdAt = now
		expect(stats.id).toMatch(/^[0-9a-f-]{36}$/);
		expect(stats.createdAt).toBeDefined();
	});

	it('handles null review_history as empty array', async () => {
		const { supabase } = buildMockSupabase({
			maybeSingleData: dbRow({ review_history: null })
		});
		const stats = await loadOrInitCardStats(
			supabase,
			buildFsrs(),
			'user-uuid',
			'template',
			'tpl-uuid'
		);

		expect(stats.reviewHistory).toEqual([]);
	});

	it('supports cardReferenceType="custom"', async () => {
		const { supabase } = buildMockSupabase({ maybeSingleData: null });
		const stats = await loadOrInitCardStats(
			supabase,
			buildFsrs(),
			'user-uuid',
			'custom',
			'custom-card-uuid'
		);

		expect(stats.cardReferenceType).toBe('custom');
		expect(stats.cardReferenceId).toBe('custom-card-uuid');
	});

	it('uses the lookup filter by user_id, card_reference_type, card_reference_id', async () => {
		const { supabase, chain } = buildMockSupabase({ maybeSingleData: dbRow() });
		await loadOrInitCardStats(supabase, buildFsrs(), 'user-xyz', 'template', 'tpl-abc');

		expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-xyz');
		expect(chain.eq).toHaveBeenCalledWith('card_reference_type', 'template');
		expect(chain.eq).toHaveBeenCalledWith('card_reference_id', 'tpl-abc');
	});
});

// ============================================================================
// upsertCardStats
// ============================================================================

describe('upsertCardStats', () => {
	beforeEach(() => vi.clearAllMocks());

	const sampleStats: CardStats = {
		id: 'stats-uuid',
		userId: 'user-uuid',
		cardReferenceType: 'template',
		cardReferenceId: 'tpl-uuid',
		difficulty: 5,
		stability: 2.3,
		state: 'review',
		lastReview: '2026-06-01T00:00:00Z',
		nextReview: '2026-06-15T00:00:00Z',
		totalReviews: 3,
		reviewHistory: [],
		createdAt: '2026-05-01T00:00:00Z',
		updatedAt: '2026-06-01T00:00:00Z'
	};

	it('upserts successfully and resolves void', async () => {
		const { supabase } = buildMockSupabase({});
		await expect(upsertCardStats(supabase, sampleStats)).resolves.toBeUndefined();
	});

	it('throws on UPSERT error', async () => {
		const { supabase } = buildMockSupabase({ upsertError: { code: '42501', message: 'denied' } });
		await expect(upsertCardStats(supabase, sampleStats)).rejects.toMatchObject({ code: '42501' });
	});

	it('uses conflict key user_id,card_reference_type,card_reference_id', async () => {
		const { supabase, upsertMock } = buildMockSupabase({});
		await upsertCardStats(supabase, sampleStats);

		// Vérifie le 2e argument (options) du UPSERT
		expect(upsertMock).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({ onConflict: 'user_id,card_reference_type,card_reference_id' })
		);
	});

	it('maps camelCase CardStats back to snake_case columns', async () => {
		const { supabase, upsertMock } = buildMockSupabase({});
		await upsertCardStats(supabase, sampleStats);

		// 1er arg = row DB en snake_case
		expect(upsertMock).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'stats-uuid',
				user_id: 'user-uuid',
				card_reference_type: 'template',
				card_reference_id: 'tpl-uuid',
				difficulty: 5,
				stability: 2.3,
				state: 'review',
				last_review: '2026-06-01T00:00:00Z',
				next_review: '2026-06-15T00:00:00Z',
				total_reviews: 3,
				review_history: []
			}),
			expect.any(Object)
		);
	});
});

// ============================================================================
// applyFsrsReview
// ============================================================================

describe('applyFsrsReview', () => {
	beforeEach(() => vi.clearAllMocks());

	it('pipeline complet : load existing → reviewCard → upsert avec stats mises à jour', async () => {
		const { supabase, upsertMock } = buildMockSupabase({ maybeSingleData: dbRow() });
		const fsrs = buildFsrs();

		const result = await applyFsrsReview(
			supabase,
			fsrs,
			'user-uuid',
			'template',
			'tpl-uuid',
			Grade.GOOD
		);

		// Les stats retournées préservent id/createdAt de l'existant
		expect(result.id).toBe('stats-uuid');
		expect(result.createdAt).toBe('2026-05-01T00:00:00Z');
		// totalReviews incrémenté
		expect(result.totalReviews).toBe(4);
		// review history a 1 entrée de plus
		expect(result.reviewHistory).toHaveLength(1);
		expect(result.reviewHistory[0].grade).toBe(Grade.GOOD);

		// upsert a bien été appelé
		expect(upsertMock).toHaveBeenCalled();
	});

	it('initialise puis review quand pas de stats existantes (cas 1ʳᵉ interaction)', async () => {
		const { supabase, upsertMock } = buildMockSupabase({ maybeSingleData: null });
		const fsrs = buildFsrs();

		const result = await applyFsrsReview(
			supabase,
			fsrs,
			'user-uuid',
			'template',
			'tpl-uuid',
			Grade.GOOD
		);

		// 1ʳᵉ review → totalReviews=1, state transition new → learning
		expect(result.totalReviews).toBe(1);
		expect(result.state).toBe('learning');
		expect(result.lastReview).not.toBeNull();
		expect(upsertMock).toHaveBeenCalled();
	});

	it('propage le timeSpent dans le reviewHistory', async () => {
		const { supabase } = buildMockSupabase({ maybeSingleData: null });
		const fsrs = buildFsrs();

		const result = await applyFsrsReview(
			supabase,
			fsrs,
			'user-uuid',
			'template',
			'tpl-uuid',
			Grade.GOOD,
			42
		);

		expect(result.reviewHistory[0].timeSpent).toBe(42);
	});

	it('Grade.AGAIN transitionne en relearning', async () => {
		const { supabase } = buildMockSupabase({ maybeSingleData: dbRow({ state: 'review' }) });
		const fsrs = buildFsrs();

		const result = await applyFsrsReview(
			supabase,
			fsrs,
			'user-uuid',
			'template',
			'tpl-uuid',
			Grade.AGAIN
		);

		expect(result.state).toBe('relearning');
	});

	it('throws sur erreur UPSERT (fail-loud)', async () => {
		const { supabase } = buildMockSupabase({
			maybeSingleData: null,
			upsertError: { code: '42501', message: 'permission denied' }
		});

		await expect(
			applyFsrsReview(supabase, buildFsrs(), 'user-uuid', 'template', 'tpl-uuid', Grade.GOOD)
		).rejects.toMatchObject({ code: '42501' });
	});

	it('supporte cardReferenceType=custom (cartes custom front/back)', async () => {
		const { supabase, upsertMock } = buildMockSupabase({ maybeSingleData: null });
		const fsrs = buildFsrs();

		const result = await applyFsrsReview(
			supabase,
			fsrs,
			'user-uuid',
			'custom',
			'custom-uuid',
			Grade.HARD
		);

		expect(result.cardReferenceType).toBe('custom');
		expect(result.cardReferenceId).toBe('custom-uuid');
		expect(upsertMock).toHaveBeenCalledWith(
			expect.objectContaining({
				card_reference_type: 'custom',
				card_reference_id: 'custom-uuid'
			}),
			expect.any(Object)
		);
	});
});
