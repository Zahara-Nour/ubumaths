/**
 * Integration Tests: SRS deck sections CRUD
 * ==========================================
 *
 * Tests the 4 endpoints introduced by the chantier 2026-06-10 :
 *   - GET    /api/srs/decks/[id]/sections
 *   - POST   /api/srs/decks/[id]/sections
 *   - PATCH  /api/srs/decks/[id]/sections/[sectionId]
 *   - DELETE /api/srs/decks/[id]/sections/[sectionId]
 *
 * Each test exercises the full stack against a local Supabase instance (run
 * `pnpm db:start` and `pnpm db:migrate` first).
 *
 * Coverage
 * --------
 *   1. POST — création réussie + 400 Zod + 404 deck non-owned + 403 auto_managed/assigned + 409 nom dupliqué + 401 anon
 *   2. GET  — liste triée + ownership check (404)
 *   3. PATCH — MAJ partielle + 404 + 409 nom dupliqué + 400 no fields
 *   4. DELETE — suppression + cascade cards.section_id → NULL (ON DELETE SET NULL)
 *
 * Migrations required:
 *   080_create_srs_tables.sql                                    (table srs_decks/cards)
 *   20260610100100_srs_deck_sections.sql                         (table srs_deck_sections + section_id)
 *   20260610150000_followup_p0_uniques_and_checks.sql           (UNIQUE Programme)
 *
 * @module tests/integration/sections-crud
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { User } from '@supabase/supabase-js';

import { GET, POST } from '../../src/routes/api/srs/decks/[id]/sections/+server';
import { PATCH, DELETE } from '../../src/routes/api/srs/decks/[id]/sections/[sectionId]/+server';

import {
	createServiceRoleClient,
	TestData,
	createAuthenticatedClient,
	cleanupCompetenceTestData
} from '../helpers/competence-referentiel.helpers';

// ---------------------------------------------------------------------------
// Shared service client + fixtures
// ---------------------------------------------------------------------------

let service: SupabaseClient<Database>;

beforeAll(async () => {
	service = createServiceRoleClient();
});

afterAll(async () => {
	await cleanupCompetenceTestData();
	await cleanupSectionsFixtures();
});

beforeEach(async () => {
	await cleanupCompetenceTestData();
	await cleanupSectionsFixtures();
});

// Suppression des decks/sections créés par les tests précédents
async function cleanupSectionsFixtures() {
	// Tous les decks marqués comme test (via name=Test deck...) seront supprimés en cascade
	await service
		.from('srs_decks' as never)
		.delete()
		.like('name', 'Test deck%');
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

interface DeckFixture {
	id: string;
	owner_id: string;
}

async function createDeck(
	ownerId: string,
	overrides: { is_assigned?: boolean; is_auto_managed?: boolean; name?: string } = {}
): Promise<DeckFixture> {
	const { data, error } = await service
		.from('srs_decks' as never)
		.insert({
			owner_id: ownerId,
			name: overrides.name ?? `Test deck ${crypto.randomUUID().slice(0, 8)}`,
			deck_type: 'personal',
			is_assigned: overrides.is_assigned ?? false,
			is_auto_managed: overrides.is_auto_managed ?? false
		})
		.select('id, owner_id')
		.single();

	if (error) throw error;
	return data as DeckFixture;
}

async function createSection(
	deckId: string,
	overrides: { name?: string; description?: string | null; display_order?: number } = {}
): Promise<{ id: string; name: string }> {
	const { data, error } = await service
		.from('srs_deck_sections' as never)
		.insert({
			deck_id: deckId,
			name: overrides.name ?? `Section ${crypto.randomUUID().slice(0, 8)}`,
			description: overrides.description ?? null,
			display_order: overrides.display_order ?? 0
		})
		.select('id, name')
		.single();

	if (error) throw error;
	return data as { id: string; name: string };
}

// ---------------------------------------------------------------------------
// Locals + request helpers
// ---------------------------------------------------------------------------

function buildLocals(
	supabaseClient: SupabaseClient<Database>,
	userOrNull: User | null
): App.Locals {
	return {
		supabase: supabaseClient as unknown as App.Locals['supabase'],
		safeGetSession: vi.fn().mockResolvedValue({ user: userOrNull }),
		user: userOrNull,
		profile: null,
		requestId: crypto.randomUUID()
	};
}

function buildRequest(body: unknown, method: 'POST' | 'PATCH' = 'POST'): Request {
	return new Request('http://localhost/api/srs/decks/x/sections', {
		method,
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

// ============================================================================
// 1. POST /api/srs/decks/[id]/sections — création
// ============================================================================

describe('POST /api/srs/decks/[id]/sections', () => {
	it('crée une section dans un deck personnel et retourne 201 avec la row', async () => {
		const student = await TestData.profile().withRole('student').create();
		const deck = await createDeck(student.id);
		const locals = buildLocals(service, { id: student.id } as User);

		const response = await POST({
			request: buildRequest({ name: 'Symétries', display_order: 0 }),
			locals,
			params: { id: deck.id }
		} as never);

		expect(response.status).toBe(201);
		const data = await response.json();
		expect(data.section).toMatchObject({
			deck_id: deck.id,
			name: 'Symétries',
			display_order: 0
		});
		expect(data.section.id).toBeDefined();
	});

	it('returns 400 for empty body', async () => {
		const student = await TestData.profile().withRole('student').create();
		const deck = await createDeck(student.id);
		const locals = buildLocals(service, { id: student.id } as User);

		const response = await POST({
			request: buildRequest({}),
			locals,
			params: { id: deck.id }
		} as never);

		expect(response.status).toBe(400);
	});

	it('returns 400 when name exceeds 50 chars', async () => {
		const student = await TestData.profile().withRole('student').create();
		const deck = await createDeck(student.id);
		const locals = buildLocals(service, { id: student.id } as User);

		const response = await POST({
			request: buildRequest({ name: 'x'.repeat(51) }),
			locals,
			params: { id: deck.id }
		} as never);

		expect(response.status).toBe(400);
	});

	it('returns 400 for invalid JSON body', async () => {
		const student = await TestData.profile().withRole('student').create();
		const deck = await createDeck(student.id);
		const locals = buildLocals(service, { id: student.id } as User);

		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: '{ broken json'
		});

		const response = await POST({ request, locals, params: { id: deck.id } } as never);
		expect(response.status).toBe(400);
	});

	it('returns 409 when section name already exists in the deck (UNIQUE deck_id+name)', async () => {
		const student = await TestData.profile().withRole('student').create();
		const deck = await createDeck(student.id);
		await createSection(deck.id, { name: 'Triangles' });
		const locals = buildLocals(service, { id: student.id } as User);

		const response = await POST({
			request: buildRequest({ name: 'Triangles' }),
			locals,
			params: { id: deck.id }
		} as never);

		expect(response.status).toBe(409);
	});

	it('returns 403 (via RLS) when deck is assigned by teacher (is_assigned=true)', async () => {
		const student = await TestData.profile().withRole('student').create();
		const assignedDeck = await createDeck(student.id, { is_assigned: true });

		// Auth client to enforce RLS
		const studentClient = await createAuthenticatedClient(student.email);
		const locals = buildLocals(
			studentClient as unknown as SupabaseClient<Database>,
			{ id: student.id } as User
		);

		const response = await POST({
			request: buildRequest({ name: 'Some section' }),
			locals,
			params: { id: assignedDeck.id }
		} as never);

		expect(response.status).toBe(403);
	});

	it('returns 403 (via RLS) when deck is auto-managed (Programme)', async () => {
		const student = await TestData.profile().withRole('student').create();
		const programmeDeck = await createDeck(student.id, { is_auto_managed: true });

		const studentClient = await createAuthenticatedClient(student.email);
		const locals = buildLocals(
			studentClient as unknown as SupabaseClient<Database>,
			{ id: student.id } as User
		);

		const response = await POST({
			request: buildRequest({ name: 'Trying programme' }),
			locals,
			params: { id: programmeDeck.id }
		} as never);

		expect(response.status).toBe(403);
	});

	it('returns 401 when no auth session', async () => {
		const student = await TestData.profile().withRole('student').create();
		const deck = await createDeck(student.id);
		const locals = buildLocals(service, null);

		await expect(
			POST({
				request: buildRequest({ name: 'No auth' }),
				locals,
				params: { id: deck.id }
			} as never)
		).rejects.toMatchObject({ status: 401 });
	});

	it('accepts description and display_order parameters', async () => {
		const student = await TestData.profile().withRole('student').create();
		const deck = await createDeck(student.id);
		const locals = buildLocals(service, { id: student.id } as User);

		const response = await POST({
			request: buildRequest({
				name: 'Sec',
				description: 'Une jolie section',
				display_order: 5
			}),
			locals,
			params: { id: deck.id }
		} as never);

		expect(response.status).toBe(201);
		const data = await response.json();
		expect(data.section.description).toBe('Une jolie section');
		expect(data.section.display_order).toBe(5);
	});
});

// ============================================================================
// 2. GET /api/srs/decks/[id]/sections — listing
// ============================================================================

describe('GET /api/srs/decks/[id]/sections', () => {
	it('returns sections sorted by display_order then name', async () => {
		const student = await TestData.profile().withRole('student').create();
		const deck = await createDeck(student.id);
		await createSection(deck.id, { name: 'Beta', display_order: 1 });
		await createSection(deck.id, { name: 'Alpha', display_order: 0 });
		await createSection(deck.id, { name: 'Gamma', display_order: 1 });
		const locals = buildLocals(service, { id: student.id } as User);

		const response = await GET({ locals, params: { id: deck.id } } as never);
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.sections).toHaveLength(3);
		// display_order=0 → Alpha en premier
		expect(data.sections[0].name).toBe('Alpha');
		// display_order=1 → Beta avant Gamma (alphabétique)
		expect(data.sections[1].name).toBe('Beta');
		expect(data.sections[2].name).toBe('Gamma');
	});

	it('returns empty list for deck with no sections', async () => {
		const student = await TestData.profile().withRole('student').create();
		const deck = await createDeck(student.id);
		const locals = buildLocals(service, { id: student.id } as User);

		const response = await GET({ locals, params: { id: deck.id } } as never);
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.sections).toEqual([]);
	});

	it('returns 404 when deck not owned by user (defense in depth)', async () => {
		const studentA = await TestData.profile().withRole('student').create();
		const studentB = await TestData.profile().withRole('student').create();
		const deckB = await createDeck(studentB.id);
		// studentA tente d accéder au deck de studentB
		const locals = buildLocals(service, { id: studentA.id } as User);

		const response = await GET({ locals, params: { id: deckB.id } } as never);
		expect(response.status).toBe(404);
	});

	it('returns 404 when deck does not exist', async () => {
		const student = await TestData.profile().withRole('student').create();
		const locals = buildLocals(service, { id: student.id } as User);

		const response = await GET({
			locals,
			params: { id: crypto.randomUUID() }
		} as never);
		expect(response.status).toBe(404);
	});

	it('returns 401 when no auth session', async () => {
		const student = await TestData.profile().withRole('student').create();
		const deck = await createDeck(student.id);
		const locals = buildLocals(service, null);

		await expect(GET({ locals, params: { id: deck.id } } as never)).rejects.toMatchObject({
			status: 401
		});
	});
});

// ============================================================================
// 3. PATCH /api/srs/decks/[id]/sections/[sectionId] — modification
// ============================================================================

describe('PATCH /api/srs/decks/[id]/sections/[sectionId]', () => {
	it('updates name and display_order partially', async () => {
		const student = await TestData.profile().withRole('student').create();
		const deck = await createDeck(student.id);
		const section = await createSection(deck.id, { name: 'Old', display_order: 0 });
		const locals = buildLocals(service, { id: student.id } as User);

		const response = await PATCH({
			request: buildRequest({ name: 'New name', display_order: 3 }, 'PATCH'),
			locals,
			params: { id: deck.id, sectionId: section.id }
		} as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.section.name).toBe('New name');
		expect(data.section.display_order).toBe(3);
	});

	it('updates only the fields provided (partial update)', async () => {
		const student = await TestData.profile().withRole('student').create();
		const deck = await createDeck(student.id);
		const section = await createSection(deck.id, {
			name: 'Keep',
			description: 'Old desc',
			display_order: 0
		});
		const locals = buildLocals(service, { id: student.id } as User);

		const response = await PATCH({
			request: buildRequest({ description: 'New desc only' }, 'PATCH'),
			locals,
			params: { id: deck.id, sectionId: section.id }
		} as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.section.name).toBe('Keep'); // inchangé
		expect(data.section.description).toBe('New desc only');
	});

	it('returns 400 when body has no updatable fields', async () => {
		const student = await TestData.profile().withRole('student').create();
		const deck = await createDeck(student.id);
		const section = await createSection(deck.id);
		const locals = buildLocals(service, { id: student.id } as User);

		const response = await PATCH({
			request: buildRequest({}, 'PATCH'),
			locals,
			params: { id: deck.id, sectionId: section.id }
		} as never);

		expect(response.status).toBe(400);
	});

	it('returns 404 when deck not owned (defense in depth)', async () => {
		const studentA = await TestData.profile().withRole('student').create();
		const studentB = await TestData.profile().withRole('student').create();
		const deckB = await createDeck(studentB.id);
		const sectionB = await createSection(deckB.id);
		const locals = buildLocals(service, { id: studentA.id } as User);

		const response = await PATCH({
			request: buildRequest({ name: 'Hack attempt' }, 'PATCH'),
			locals,
			params: { id: deckB.id, sectionId: sectionB.id }
		} as never);

		expect(response.status).toBe(404);
	});

	it('returns 409 when new name duplicates another section in the same deck', async () => {
		const student = await TestData.profile().withRole('student').create();
		const deck = await createDeck(student.id);
		await createSection(deck.id, { name: 'Existing' });
		const target = await createSection(deck.id, { name: 'To rename' });
		const locals = buildLocals(service, { id: student.id } as User);

		const response = await PATCH({
			request: buildRequest({ name: 'Existing' }, 'PATCH'),
			locals,
			params: { id: deck.id, sectionId: target.id }
		} as never);

		expect(response.status).toBe(409);
	});

	it('returns 401 when no auth session', async () => {
		const student = await TestData.profile().withRole('student').create();
		const deck = await createDeck(student.id);
		const section = await createSection(deck.id);
		const locals = buildLocals(service, null);

		await expect(
			PATCH({
				request: buildRequest({ name: 'X' }, 'PATCH'),
				locals,
				params: { id: deck.id, sectionId: section.id }
			} as never)
		).rejects.toMatchObject({ status: 401 });
	});
});

// ============================================================================
// 4. DELETE /api/srs/decks/[id]/sections/[sectionId] — suppression
// ============================================================================

describe('DELETE /api/srs/decks/[id]/sections/[sectionId]', () => {
	it('deletes the section and returns success', async () => {
		const student = await TestData.profile().withRole('student').create();
		const deck = await createDeck(student.id);
		const section = await createSection(deck.id);
		const locals = buildLocals(service, { id: student.id } as User);

		const response = await DELETE({
			locals,
			params: { id: deck.id, sectionId: section.id }
		} as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.success).toBe(true);

		// Vérifie en DB
		const { data: rows } = await service
			.from('srs_deck_sections' as never)
			.select('id')
			.eq('id', section.id);
		expect(rows).toHaveLength(0);
	});

	it('cascades cards.section_id → NULL on delete (ON DELETE SET NULL)', async () => {
		const student = await TestData.profile().withRole('student').create();
		const deck = await createDeck(student.id);
		const section = await createSection(deck.id);

		// Crée une carte custom assignée à la section
		const { data: card, error: cardErr } = await service
			.from('srs_cards' as never)
			.insert({
				deck_id: deck.id,
				card_type: 'custom',
				front_content: 'front',
				back_content: 'back',
				section_id: section.id
			})
			.select('id, section_id')
			.single();
		expect(cardErr).toBeNull();
		expect((card as { section_id: string }).section_id).toBe(section.id);

		const locals = buildLocals(service, { id: student.id } as User);
		const response = await DELETE({
			locals,
			params: { id: deck.id, sectionId: section.id }
		} as never);
		expect(response.status).toBe(200);

		// La carte existe encore mais section_id = NULL (ON DELETE SET NULL)
		const { data: cardAfter } = await service
			.from('srs_cards' as never)
			.select('id, section_id')
			.eq('id', (card as { id: string }).id)
			.single();
		expect(cardAfter).not.toBeNull();
		expect((cardAfter as { section_id: string | null }).section_id).toBeNull();
	});

	it('returns 404 when deck not owned (defense in depth)', async () => {
		const studentA = await TestData.profile().withRole('student').create();
		const studentB = await TestData.profile().withRole('student').create();
		const deckB = await createDeck(studentB.id);
		const sectionB = await createSection(deckB.id);
		const locals = buildLocals(service, { id: studentA.id } as User);

		const response = await DELETE({
			locals,
			params: { id: deckB.id, sectionId: sectionB.id }
		} as never);

		expect(response.status).toBe(404);
	});

	it('returns 200 even when sectionId does not exist (DELETE WHERE no match)', async () => {
		// PostgreSQL DELETE on no row = success. Le endpoint ne distingue pas
		// 404 vs success ici car DELETE WHERE id=... ne signale pas l absence.
		const student = await TestData.profile().withRole('student').create();
		const deck = await createDeck(student.id);
		const locals = buildLocals(service, { id: student.id } as User);

		const response = await DELETE({
			locals,
			params: { id: deck.id, sectionId: crypto.randomUUID() }
		} as never);
		expect(response.status).toBe(200);
	});

	it('returns 401 when no auth session', async () => {
		const student = await TestData.profile().withRole('student').create();
		const deck = await createDeck(student.id);
		const section = await createSection(deck.id);
		const locals = buildLocals(service, null);

		await expect(
			DELETE({
				locals,
				params: { id: deck.id, sectionId: section.id }
			} as never)
		).rejects.toMatchObject({ status: 401 });
	});
});
