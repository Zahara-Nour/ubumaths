/**
 * Unit tests for programme-deck.ts
 * =================================
 *
 * Tests les 3 fonctions exportées du helper Programme deck avec mock Supabase.
 *
 * Pattern de mock : chaque méthode chaînable (`from`, `select`, `eq`, `limit`,
 * `insert`) retourne `this`. Les méthodes terminales (`maybeSingle`, `single`)
 * sont configurées par test via `mockResolvedValueOnce` pour simuler des
 * scénarios séquentiels (lookup → INSERT → lookup race).
 *
 * Couverture :
 *   - ensureProgrammeDeck : lookup hit / insert success / retry 23505 / non-23505 / error
 *   - ensureProgrammeDeckCard : INSERT success / 23505 silent no-op / propagation
 *   - isTemplateTaggedFamilyA : tagué knowledge / non tagué / erreur DB
 *
 * Source : src/lib/server/srs/programme-deck.ts (refonte chantier 2026-06-10)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	ensureProgrammeDeck,
	ensureProgrammeDeckCard,
	isTemplateTaggedFamilyA
} from './programme-deck';

// ============================================================================
// Mock Supabase fluent builder
// ============================================================================

interface MockState {
	/** Queue of responses for `.maybeSingle()` calls (in order). */
	maybeSingleResults: Array<{ data: unknown; error: unknown }>;
	/** Queue of responses for `.single()` calls (in order). */
	singleResults: Array<{ data: unknown; error: unknown }>;
	/** Direct response from `.insert()` (when no .select chain follows). */
	insertOnlyResult: { error: unknown };
}

function buildMockSupabase(state: Partial<MockState> = {}) {
	const ms = [...(state.maybeSingleResults ?? [])];
	const ss = [...(state.singleResults ?? [])];
	const insertOnly = state.insertOnlyResult ?? { error: null };

	const chain = {
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		in: vi.fn().mockReturnThis(),
		maybeSingle: vi.fn().mockImplementation(async () => {
			return ms.shift() ?? { data: null, error: null };
		}),
		single: vi.fn().mockImplementation(async () => {
			return ss.shift() ?? { data: null, error: null };
		}),
		/** insert returns chainable when followed by .select().single() ;
		 * sinon il faut traiter le `.then()` directement. On gère via .then(). */
		insert: vi.fn().mockImplementation(() => {
			// Returns a thenable + chainable for .select().single()
			const insertChain = {
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockImplementation(async () => {
					return ss.shift() ?? { data: null, error: null };
				}),
				// Direct await on .insert(...) without .select() → resolve to insertOnlyResult
				then: (onFulfilled: (v: { error: unknown }) => unknown) => {
					return Promise.resolve(insertOnly).then(onFulfilled);
				}
			};
			return insertChain;
		})
	};

	const supabase = {
		from: vi.fn().mockReturnValue(chain)
	};

	return { supabase: supabase as unknown as Parameters<typeof ensureProgrammeDeck>[0], chain };
}

// ============================================================================
// ensureProgrammeDeck
// ============================================================================

describe('ensureProgrammeDeck', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns existing deck id when one already exists', async () => {
		const { supabase } = buildMockSupabase({
			maybeSingleResults: [{ data: { id: 'deck-existing' }, error: null }]
		});

		const result = await ensureProgrammeDeck(supabase, 'student-uuid');

		expect(result).toBe('deck-existing');
	});

	it('creates a new deck when none exists (lookup miss + insert success)', async () => {
		const { supabase, chain } = buildMockSupabase({
			maybeSingleResults: [{ data: null, error: null }], // lookup miss
			singleResults: [{ data: { id: 'deck-new' }, error: null }] // insert success
		});

		const result = await ensureProgrammeDeck(supabase, 'student-uuid');

		expect(result).toBe('deck-new');
		// Vérifie que l insert a bien été appelé avec les bons champs
		expect(chain.insert).toHaveBeenCalledWith(
			expect.objectContaining({
				owner_id: 'student-uuid',
				name: 'Programme',
				deck_type: 'personal',
				is_assigned: false,
				is_auto_managed: true
			})
		);
	});

	it('retries on 23505 (race) and returns the deck created by other thread', async () => {
		const { supabase } = buildMockSupabase({
			maybeSingleResults: [
				{ data: null, error: null }, // 1er lookup : miss
				{ data: { id: 'deck-race-winner' }, error: null } // refresh après 23505
			],
			singleResults: [{ data: null, error: { code: '23505', message: 'unique_violation' } }]
		});

		const result = await ensureProgrammeDeck(supabase, 'student-uuid');

		expect(result).toBe('deck-race-winner');
	});

	it('throws on non-23505 insert errors', async () => {
		const { supabase } = buildMockSupabase({
			maybeSingleResults: [{ data: null, error: null }],
			singleResults: [{ data: null, error: { code: '42501', message: 'permission denied' } }]
		});

		await expect(ensureProgrammeDeck(supabase, 'student-uuid')).rejects.toMatchObject({
			code: '42501'
		});
	});

	it('throws original 23505 when refresh returns no row (index inconsistant)', async () => {
		const { supabase } = buildMockSupabase({
			maybeSingleResults: [
				{ data: null, error: null }, // 1er lookup : miss
				{ data: null, error: null } // refresh après 23505 : toujours rien
			],
			singleResults: [{ data: null, error: { code: '23505', message: 'unique_violation' } }]
		});

		await expect(ensureProgrammeDeck(supabase, 'student-uuid')).rejects.toMatchObject({
			code: '23505'
		});
	});

	it('throws on refresh error after 23505 (DB issue during retry)', async () => {
		const { supabase } = buildMockSupabase({
			maybeSingleResults: [
				{ data: null, error: null }, // 1er lookup : miss
				{ data: null, error: { code: '08006', message: 'connection failure' } } // refresh fail
			],
			singleResults: [{ data: null, error: { code: '23505', message: 'unique_violation' } }]
		});

		await expect(ensureProgrammeDeck(supabase, 'student-uuid')).rejects.toMatchObject({
			code: '08006'
		});
	});

	it('throws when initial lookup itself fails', async () => {
		const { supabase } = buildMockSupabase({
			maybeSingleResults: [{ data: null, error: { code: '08006', message: 'connection failure' } }]
		});

		await expect(ensureProgrammeDeck(supabase, 'student-uuid')).rejects.toMatchObject({
			code: '08006'
		});
	});

	it('filters lookup by owner_id and is_auto_managed=true', async () => {
		const { supabase, chain } = buildMockSupabase({
			maybeSingleResults: [{ data: { id: 'deck-1' }, error: null }]
		});

		await ensureProgrammeDeck(supabase, 'student-xyz');

		// Vérifie que les .eq() ont été appelés correctement
		expect(chain.eq).toHaveBeenCalledWith('owner_id', 'student-xyz');
		expect(chain.eq).toHaveBeenCalledWith('is_auto_managed', true);
	});
});

// ============================================================================
// ensureProgrammeDeckCard
// ============================================================================

describe('ensureProgrammeDeckCard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('inserts a new card successfully when none exists', async () => {
		// 1. ensureProgrammeDeck retourne un deck existant
		// 2. INSERT srs_cards réussit
		const { supabase, chain } = buildMockSupabase({
			maybeSingleResults: [{ data: { id: 'deck-uuid' }, error: null }], // deck lookup
			insertOnlyResult: { error: null } // card insert success
		});

		await expect(
			ensureProgrammeDeckCard(supabase, 'student-uuid', 'template-uuid')
		).resolves.toBeUndefined();

		// Vérifie que insert a été appelé avec les bonnes valeurs
		expect(chain.insert).toHaveBeenCalledWith({
			deck_id: 'deck-uuid',
			card_type: 'template',
			template_id: 'template-uuid'
		});
	});

	it('no-ops silently on 23505 (carte déjà présente)', async () => {
		const { supabase } = buildMockSupabase({
			maybeSingleResults: [{ data: { id: 'deck-uuid' }, error: null }],
			insertOnlyResult: { error: { code: '23505', message: 'unique_violation' } }
		});

		// Ne doit PAS throw
		await expect(
			ensureProgrammeDeckCard(supabase, 'student-uuid', 'template-uuid')
		).resolves.toBeUndefined();
	});

	it('throws on non-23505 insert errors', async () => {
		const { supabase } = buildMockSupabase({
			maybeSingleResults: [{ data: { id: 'deck-uuid' }, error: null }],
			insertOnlyResult: {
				error: { code: '42501', message: 'permission denied' }
			}
		});

		await expect(
			ensureProgrammeDeckCard(supabase, 'student-uuid', 'template-uuid')
		).rejects.toMatchObject({
			code: '42501'
		});
	});

	it('propagates errors from ensureProgrammeDeck (deck lookup fails)', async () => {
		const { supabase } = buildMockSupabase({
			maybeSingleResults: [{ data: null, error: { code: '08006', message: 'connection failure' } }]
		});

		await expect(
			ensureProgrammeDeckCard(supabase, 'student-uuid', 'template-uuid')
		).rejects.toMatchObject({
			code: '08006'
		});
	});

	it('chains ensureProgrammeDeck and INSERT (deck created → card added)', async () => {
		const { supabase, chain } = buildMockSupabase({
			maybeSingleResults: [{ data: null, error: null }], // deck lookup miss
			singleResults: [{ data: { id: 'deck-fresh' }, error: null }], // deck created
			insertOnlyResult: { error: null } // card insert success
		});

		await ensureProgrammeDeckCard(supabase, 'student-uuid', 'template-uuid');

		// Vérifie séquence : un INSERT pour deck puis un INSERT pour card
		expect(chain.insert).toHaveBeenCalledTimes(2);
		// 1er INSERT (deck) avec owner_id
		expect(chain.insert).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				owner_id: 'student-uuid',
				is_auto_managed: true
			})
		);
		// 2e INSERT (card) référence le deck créé
		expect(chain.insert).toHaveBeenNthCalledWith(2, {
			deck_id: 'deck-fresh',
			card_type: 'template',
			template_id: 'template-uuid'
		});
	});
});

// ============================================================================
// isTemplateTaggedFamilyA
// ============================================================================

describe('isTemplateTaggedFamilyA', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	/** Le helper utilise `.from().select().eq().eq().limit()` qui se résout
	 * directement (pas de `.maybeSingle()` ni `.single()`). On adapte le mock. */
	function buildTaggedMock(data: unknown, error: unknown = null) {
		const chain = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			limit: vi.fn().mockResolvedValue({ data, error })
		};
		const supabase = {
			from: vi.fn().mockReturnValue(chain)
		};
		return {
			supabase: supabase as unknown as Parameters<typeof isTemplateTaggedFamilyA>[0],
			chain
		};
	}

	it('returns true when at least one knowledge skill is tagged', async () => {
		const { supabase } = buildTaggedMock([
			{ skill_id: 'skill-uuid', skills: { family: 'knowledge' } }
		]);

		await expect(isTemplateTaggedFamilyA(supabase, 'template-uuid')).resolves.toBe(true);
	});

	it('returns false when no skills are tagged (empty array)', async () => {
		const { supabase } = buildTaggedMock([]);

		await expect(isTemplateTaggedFamilyA(supabase, 'template-uuid')).resolves.toBe(false);
	});

	it('returns false when data is null', async () => {
		const { supabase } = buildTaggedMock(null);

		await expect(isTemplateTaggedFamilyA(supabase, 'template-uuid')).resolves.toBe(false);
	});

	it('returns false on DB error (degraded mode)', async () => {
		const { supabase } = buildTaggedMock(null, { message: 'connection failure' });

		await expect(isTemplateTaggedFamilyA(supabase, 'template-uuid')).resolves.toBe(false);
	});

	it('filters on family=knowledge via skills!inner', async () => {
		const { supabase, chain } = buildTaggedMock([
			{ skill_id: 'skill-uuid', skills: { family: 'knowledge' } }
		]);

		await isTemplateTaggedFamilyA(supabase, 'template-xyz');

		// Le filtre est appliqué côté Supabase via .eq()
		expect(chain.eq).toHaveBeenCalledWith('template_id', 'template-xyz');
		expect(chain.eq).toHaveBeenCalledWith('skills.family', 'knowledge');
	});

	it('uses limit(1) for efficiency (presence check, not full enumeration)', async () => {
		const { supabase, chain } = buildTaggedMock([
			{ skill_id: 'skill-uuid', skills: { family: 'knowledge' } }
		]);

		await isTemplateTaggedFamilyA(supabase, 'template-uuid');

		expect(chain.limit).toHaveBeenCalledWith(1);
	});

	it('returns true even when data has multiple rows', async () => {
		const { supabase } = buildTaggedMock([
			{ skill_id: 'skill-1', skills: { family: 'knowledge' } },
			{ skill_id: 'skill-2', skills: { family: 'knowledge' } }
		]);

		await expect(isTemplateTaggedFamilyA(supabase, 'template-uuid')).resolves.toBe(true);
	});
});

// ============================================================================
// Sanity / regression
// ============================================================================

describe('Regression : sequence of calls preserves idempotence', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('2 sequential ensureProgrammeDeckCard calls on same template → 1 valid path even if 23505 on 2nd', async () => {
		// 1er appel : deck créé + card insertée
		// 2e appel : deck déjà là (lookup hit) + card 23505 (no-op)
		// Le test simule les 2 chaînes via un seul mock partagé.
		const ms = [
			{ data: null, error: null }, // 1er deck lookup miss
			{ data: { id: 'deck-1' }, error: null } // 2e deck lookup hit
		];
		const ss = [{ data: { id: 'deck-1' }, error: null }]; // 1er deck créé

		// Insert sequence:
		//   1. INSERT deck (single) → succeeds
		//   2. INSERT card (insert-only) → succeeds (1er card)
		//   3. INSERT card (insert-only) → 23505 (2e card no-op)
		let insertOnlyCalls = 0;
		const insertResults: Array<{ error: unknown }> = [
			{ error: null }, // 1er card
			{ error: { code: '23505', message: 'unique_violation' } } // 2e card
		];

		const chain: {
			select: ReturnType<typeof vi.fn>;
			eq: ReturnType<typeof vi.fn>;
			limit: ReturnType<typeof vi.fn>;
			in: ReturnType<typeof vi.fn>;
			maybeSingle: ReturnType<typeof vi.fn>;
			single: ReturnType<typeof vi.fn>;
			insert: ReturnType<typeof vi.fn>;
		} = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			in: vi.fn().mockReturnThis(),
			maybeSingle: vi
				.fn()
				.mockImplementation(async () => ms.shift() ?? { data: null, error: null }),
			single: vi.fn().mockImplementation(async () => ss.shift() ?? { data: null, error: null }),
			insert: vi.fn().mockImplementation(() => {
				return {
					select: vi.fn().mockReturnThis(),
					single: vi.fn().mockImplementation(async () => ss.shift() ?? { data: null, error: null }),
					then: (onFulfilled: (v: { error: unknown }) => unknown) => {
						const result = insertResults[insertOnlyCalls] ?? { error: null };
						insertOnlyCalls += 1;
						return Promise.resolve(result).then(onFulfilled);
					}
				};
			})
		};
		const supabase = { from: vi.fn().mockReturnValue(chain) };

		const wrap = supabase as unknown as Parameters<typeof ensureProgrammeDeckCard>[0];

		// 1er appel : crée tout
		await expect(
			ensureProgrammeDeckCard(wrap, 'student-uuid', 'template-uuid')
		).resolves.toBeUndefined();
		// 2e appel : carte déjà là, no-op
		await expect(
			ensureProgrammeDeckCard(wrap, 'student-uuid', 'template-uuid')
		).resolves.toBeUndefined();
	});
});
