/**
 * Unit tests for programme-deck.ts
 * =================================
 *
 * Tests les 2 fonctions exportées du helper Programme deck avec mock Supabase.
 *
 * Pattern de mock : chaque méthode chaînable (`from`, `select`, `eq`, `limit`,
 * `insert`) retourne `this`. Les méthodes terminales (`maybeSingle`, `single`)
 * sont configurées par test via `mockResolvedValueOnce` pour simuler des
 * scénarios séquentiels (lookup → INSERT → lookup race).
 *
 * Couverture :
 *   - ensureProgrammeDeck : lookup hit / création par le client SERVICE / retry 23505 / non-23505 / error
 *   - ensureProgrammeDeckCard : carte écrite par le client SERVICE (jamais celui
 *     de l'élève) / 23505 silent no-op / 0 ligne rendue = erreur / propagation
 *
 * Note : `isTemplateTaggedFamilyA` a été supprimé en 2026-06-10 (refactor
 * code-quality #2.3) — le tagging est désormais récupéré inline dans
 * `/api/srs/review/submit` via la nested query du card SELECT.
 *
 * Source : src/lib/server/srs/programme-deck.ts (refonte chantier 2026-06-10)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Client service simulé :
//   - `from('srs_cards').insert(...).select('id')` rend le prochain résultat de
//     la file `results` ;
//   - `from('srs_decks').insert(...).select('id').single()` (création du paquet
//     Programme) rend le prochain résultat de la file `deckResults`.
const service = vi.hoisted(() => {
	const results: Array<{ data: unknown; error: unknown }> = [];
	const deckResults: Array<{ data: unknown; error: unknown }> = [];
	const select = vi.fn(async () => results.shift() ?? { data: [{ id: 'card-uuid' }], error: null });
	const insert = vi.fn(() => ({ select }));
	const deckSingle = vi.fn(async () => deckResults.shift() ?? { data: null, error: null });
	const deckSelect = vi.fn(() => ({ single: deckSingle }));
	const deckInsert = vi.fn(() => ({ select: deckSelect }));
	const from = vi.fn((table: string) =>
		table === 'srs_decks' ? { insert: deckInsert } : { insert }
	);
	return { results, deckResults, select, insert, deckInsert, from };
});

vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => ({ from: service.from })
}));

import { ensureProgrammeDeck, ensureProgrammeDeckCard } from '../programme-deck';

// ============================================================================
// Mock Supabase fluent builder
// ============================================================================

interface MockState {
	/** Queue of responses for `.maybeSingle()` calls (in order). */
	maybeSingleResults: Array<{ data: unknown; error: unknown }>;
	/** Réponses de la création du paquet par le client SERVICE (dans l'ordre). */
	deckInsertResults: Array<{ data: unknown; error: unknown }>;
}

function buildMockSupabase(state: Partial<MockState> = {}) {
	const ms = [...(state.maybeSingleResults ?? [])];
	service.deckResults.length = 0;
	service.deckResults.push(...(state.deckInsertResults ?? []));

	const chain = {
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		in: vi.fn().mockReturnThis(),
		maybeSingle: vi.fn().mockImplementation(async () => {
			return ms.shift() ?? { data: null, error: null };
		}),
		// Le client de l'élève n'écrit JAMAIS : paquet et carte passent par le
		// client service simulé plus haut. Espionné pour le prouver.
		insert: vi.fn()
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
			deckInsertResults: [{ data: { id: 'deck-new' }, error: null }] // insert success
		});

		const result = await ensureProgrammeDeck(supabase, 'student-uuid');

		expect(result).toBe('deck-new');
		// Créé par le client SERVICE, pour le userId reçu de la session…
		expect(service.from).toHaveBeenCalledWith('srs_decks');
		// … jamais par le client de l'élève
		expect(chain.insert).not.toHaveBeenCalled();
		expect(service.deckInsert).toHaveBeenCalledWith(
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
			deckInsertResults: [{ data: null, error: { code: '23505', message: 'unique_violation' } }]
		});

		const result = await ensureProgrammeDeck(supabase, 'student-uuid');

		expect(result).toBe('deck-race-winner');
	});

	it('throws on non-23505 insert errors', async () => {
		const { supabase } = buildMockSupabase({
			maybeSingleResults: [{ data: null, error: null }],
			deckInsertResults: [{ data: null, error: { code: '42501', message: 'permission denied' } }]
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
			deckInsertResults: [{ data: null, error: { code: '23505', message: 'unique_violation' } }]
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
			deckInsertResults: [{ data: null, error: { code: '23505', message: 'unique_violation' } }]
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

const CARTE = { deck_id: 'deck-uuid', card_type: 'template', template_id: 'template-uuid' };

describe('ensureProgrammeDeckCard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		service.results.length = 0;
	});

	it('écrit la carte avec le client SERVICE, jamais avec celui de l’élève', async () => {
		const { supabase, chain } = buildMockSupabase({
			maybeSingleResults: [{ data: { id: 'deck-uuid' }, error: null }]
		});
		service.results.push({ data: [{ id: 'card-uuid' }], error: null });

		await expect(
			ensureProgrammeDeckCard(supabase, 'student-uuid', 'template-uuid')
		).resolves.toBeUndefined();

		expect(service.from).toHaveBeenCalledWith('srs_cards');
		expect(service.insert).toHaveBeenCalledWith(CARTE);
		expect(service.select).toHaveBeenCalledWith('id');
		// Le client de l'élève ne touche jamais `srs_cards`
		expect(supabase.from).not.toHaveBeenCalledWith('srs_cards');
		expect(chain.insert).not.toHaveBeenCalled();
	});

	it('cherche le paquet du userId reçu (propriétaire = élève de la session)', async () => {
		const { supabase, chain } = buildMockSupabase({
			maybeSingleResults: [{ data: { id: 'deck-uuid' }, error: null }]
		});

		await ensureProgrammeDeckCard(supabase, 'student-uuid', 'template-uuid');

		expect(supabase.from).toHaveBeenCalledWith('srs_decks');
		expect(chain.eq).toHaveBeenCalledWith('owner_id', 'student-uuid');
		expect(chain.eq).toHaveBeenCalledWith('is_auto_managed', true);
	});

	it('no-ops silently on 23505 (carte déjà présente)', async () => {
		const { supabase } = buildMockSupabase({
			maybeSingleResults: [{ data: { id: 'deck-uuid' }, error: null }]
		});
		service.results.push({ data: null, error: { code: '23505', message: 'unique_violation' } });

		await expect(
			ensureProgrammeDeckCard(supabase, 'student-uuid', 'template-uuid')
		).resolves.toBeUndefined();
	});

	it('throws on non-23505 insert errors', async () => {
		const { supabase } = buildMockSupabase({
			maybeSingleResults: [{ data: { id: 'deck-uuid' }, error: null }]
		});
		service.results.push({ data: null, error: { code: '42501', message: 'permission denied' } });

		await expect(
			ensureProgrammeDeckCard(supabase, 'student-uuid', 'template-uuid')
		).rejects.toMatchObject({ code: '42501' });
	});

	it('échoue quand l’écriture rend zéro ligne sans erreur (refus silencieux)', async () => {
		const { supabase } = buildMockSupabase({
			maybeSingleResults: [{ data: { id: 'deck-uuid' }, error: null }]
		});
		service.results.push({ data: [], error: null });

		await expect(
			ensureProgrammeDeckCard(supabase, 'student-uuid', 'template-uuid')
		).rejects.toThrow(/0 ligne/);
	});

	it('propagates errors from ensureProgrammeDeck (deck lookup fails) sans rien écrire', async () => {
		const { supabase } = buildMockSupabase({
			maybeSingleResults: [{ data: null, error: { code: '08006', message: 'connection failure' } }]
		});

		await expect(
			ensureProgrammeDeckCard(supabase, 'student-uuid', 'template-uuid')
		).rejects.toMatchObject({ code: '08006' });
		expect(service.insert).not.toHaveBeenCalled();
	});

	it('chains ensureProgrammeDeck and INSERT (deck created → card added)', async () => {
		const { supabase, chain } = buildMockSupabase({
			maybeSingleResults: [{ data: null, error: null }], // deck lookup miss
			deckInsertResults: [{ data: { id: 'deck-fresh' }, error: null }] // deck created
		});

		await ensureProgrammeDeckCard(supabase, 'student-uuid', 'template-uuid');

		// Le paquet est créé par le client SERVICE (jamais celui de l'élève)…
		expect(chain.insert).not.toHaveBeenCalled();
		expect(service.deckInsert).toHaveBeenCalledTimes(1);
		expect(service.deckInsert).toHaveBeenCalledWith(
			expect.objectContaining({ owner_id: 'student-uuid', is_auto_managed: true })
		);
		// … la carte par le client service, dans le paquet créé
		expect(service.insert).toHaveBeenCalledWith({ ...CARTE, deck_id: 'deck-fresh' });
	});
});

// ============================================================================
// Sanity / regression
// ============================================================================

describe('Regression : sequence of calls preserves idempotence', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		service.results.length = 0;
	});

	it('2 sequential ensureProgrammeDeckCard calls on same template → 2nd is a 23505 no-op', async () => {
		const { supabase } = buildMockSupabase({
			maybeSingleResults: [
				{ data: null, error: null }, // 1er deck lookup miss
				{ data: { id: 'deck-1' }, error: null } // 2e deck lookup hit
			],
			deckInsertResults: [{ data: { id: 'deck-1' }, error: null }] // 1er deck créé
		});
		service.results.push(
			{ data: [{ id: 'card-1' }], error: null },
			{ data: null, error: { code: '23505', message: 'unique_violation' } }
		);

		await expect(
			ensureProgrammeDeckCard(supabase, 'student-uuid', 'template-uuid')
		).resolves.toBeUndefined();
		await expect(
			ensureProgrammeDeckCard(supabase, 'student-uuid', 'template-uuid')
		).resolves.toBeUndefined();
		expect(service.insert).toHaveBeenCalledTimes(2);
	});
});
