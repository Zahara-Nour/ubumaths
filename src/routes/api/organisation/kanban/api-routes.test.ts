/**
 * Kanban API Routes - Integration Tests
 * ======================================
 *
 * Tests for all kanban API endpoints:
 * - GET/POST  /api/organisation/kanban/boards
 * - GET/PATCH/DELETE /api/organisation/kanban/boards/[boardId]
 * - POST /api/organisation/kanban/boards/[boardId]/columns
 * - PATCH/DELETE /api/organisation/kanban/columns/[columnId]
 * - POST /api/organisation/kanban/columns/[columnId]/cards
 * - PATCH/DELETE /api/organisation/kanban/cards/[cardId]
 *
 * Auth flow: requireAuth → safeGetSession() + profiles.single()
 * The 401 message is 'Non autorisé - Authentification requise'.
 * The 403 (profile missing) message is 'Profil utilisateur introuvable'.
 *
 * @module api/organisation/kanban/api-routes.test
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi } from 'vitest';
import {
	createMockSupabase,
	createMockLocals,
	createMockRequest,
	mockRpcSuccess,
	mockRpcError
} from '$tests/helpers';

// Rate-limit checks live in a different module and hit a service-role client
// (not the per-request supabase we mock here). In unit tests we don't want
// them to make real network calls or share state across tests, so we stub all
// three kanban helpers to always allow the request.
vi.mock('$lib/server/rateLimiter', () => ({
	checkKanbanBoardCreateRateLimit: vi.fn(async () => ({ allowed: true })),
	checkKanbanColumnMutationRateLimit: vi.fn(async () => ({ allowed: true })),
	checkKanbanCardMutationRateLimit: vi.fn(async () => ({ allowed: true }))
}));

// ============================================================================
// TEST DATA
// ============================================================================

const TEST_IDS = {
	user: '550e8400-e29b-41d4-a716-446655440001',
	otherUser: '550e8400-e29b-41d4-a716-446655440002',
	teacher: '550e8400-e29b-41d4-a716-446655440003',
	board: '550e8400-e29b-41d4-a716-446655440010',
	board2: '550e8400-e29b-41d4-a716-446655440011',
	column: '550e8400-e29b-41d4-a716-446655440020',
	column2: '550e8400-e29b-41d4-a716-446655440021',
	card: '550e8400-e29b-41d4-a716-446655440030',
	class: '550e8400-e29b-41d4-a716-446655440040'
};

// Minimal profile mock returned by requireAuth's profiles.single() call.
const mockProfile = {
	id: TEST_IDS.user,
	role: 'student',
	firstname: 'Test',
	lastname: 'User',
	email: 'user@voltairedoha.com',
	is_test: false
};

const mockBoard = {
	id: TEST_IDS.board,
	owner_id: TEST_IDS.user,
	class_id: null,
	title: 'Mon tableau',
	created_at: '2026-05-26T00:00:00Z',
	updated_at: '2026-05-26T00:00:00Z'
};

const mockColumn = {
	id: TEST_IDS.column,
	board_id: TEST_IDS.board,
	title: 'À faire',
	position: 1,
	created_at: '2026-05-26T00:00:00Z'
};

const mockCard = {
	id: TEST_IDS.card,
	column_id: TEST_IDS.column,
	title: 'Tâche 1',
	description: null,
	position: 1,
	created_at: '2026-05-26T00:00:00Z',
	updated_at: '2026-05-26T00:00:00Z'
};

// ============================================================================
// HELPER: mock requireAuth's profile query (always the first `.single()` call)
// ============================================================================

function mockAuthProfile(supabase: ReturnType<typeof createMockSupabase>, userId = TEST_IDS.user) {
	// requireAuth calls: safeGetSession (from locals) then profiles.single()
	supabase._mockChain.single.mockResolvedValueOnce({
		data: { ...mockProfile, id: userId },
		error: null
	});
}

// ============================================================================
// POST /api/organisation/kanban/boards
// ============================================================================

describe('POST /api/organisation/kanban/boards', () => {
	it('should return 401 when unauthenticated', async () => {
		const { POST } = await import('./boards/+server');
		const locals = createMockLocals(); // no user → safeGetSession returns null
		const request = createMockRequest({ title: 'Nouveau tableau' });

		try {
			await POST({ locals, request } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(401);
		}
	});

	it('should return 400 when title is empty', async () => {
		const { POST } = await import('./boards/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({ title: '' });

		try {
			await POST({ locals, request } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(400);
		}
	});

	it('should return 400 when title exceeds 200 characters', async () => {
		const { POST } = await import('./boards/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({ title: 'A'.repeat(201) });

		try {
			await POST({ locals, request } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(400);
		}
	});

	it('should return 400 when JSON is malformed', async () => {
		const { POST } = await import('./boards/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);

		// Make request.json() throw to simulate malformed JSON
		const badRequest = {
			...createMockRequest({}),
			json: () => Promise.reject(new SyntaxError('Unexpected token'))
		} as unknown as Request;

		try {
			await POST({ locals, request: badRequest } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(400);
		}
	});

	it('should return 403 when user is not teacher of the class', async () => {
		const { POST } = await import('./boards/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({ title: 'Tableau classe', class_id: TEST_IDS.class });

		// isClassTeacher → classes.maybeSingle() → teacher_id differs from user
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { teacher_id: TEST_IDS.otherUser },
			error: null
		});

		try {
			await POST({ locals, request } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(403);
		}
	});

	it('should create a personal board (no class_id) with 201', async () => {
		const { POST } = await import('./boards/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({ title: 'Mon tableau perso' });

		// insert().select().single()
		supabase._mockChain.single.mockResolvedValueOnce({
			data: mockBoard,
			error: null
		});

		const response = await POST({ locals, request } as any);
		const data = await response.json();
		expect(response.status).toBe(201);
		expect(data.board).toBeDefined();
		expect(data.board.title).toBe('Mon tableau');
	});

	it('should create a class board with 201 when user is teacher', async () => {
		const { POST } = await import('./boards/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({ title: 'Tableau classe', class_id: TEST_IDS.class });

		// isClassTeacher → classes.maybeSingle() → teacher_id matches user
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { teacher_id: TEST_IDS.user },
			error: null
		});

		// insert().select().single()
		supabase._mockChain.single.mockResolvedValueOnce({
			data: { ...mockBoard, class_id: TEST_IDS.class },
			error: null
		});

		const response = await POST({ locals, request } as any);
		const data = await response.json();
		expect(response.status).toBe(201);
		expect(data.board.class_id).toBe(TEST_IDS.class);
	});
});

// ============================================================================
// GET /api/organisation/kanban/boards
// ============================================================================

describe('GET /api/organisation/kanban/boards', () => {
	it('should return 401 when unauthenticated', async () => {
		const { GET } = await import('./boards/+server');
		const locals = createMockLocals();

		try {
			await GET({ locals } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(401);
		}
	});

	it('should return 200 with a list of boards', async () => {
		const { GET } = await import('./boards/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);

		// getAccessibleBoards now calls the get_accessible_kanban_boards RPC.
		mockRpcSuccess(supabase, 'get_accessible_kanban_boards', [
			{
				id: TEST_IDS.board,
				owner_id: TEST_IDS.user,
				class_id: null,
				title: 'Mon tableau',
				created_at: '2026-05-26T00:00:00.000Z',
				updated_at: '2026-05-26T00:00:00.000Z',
				column_count: 0,
				card_count: 0
			},
			{
				id: TEST_IDS.board2,
				owner_id: TEST_IDS.user,
				class_id: null,
				title: 'Second',
				created_at: '2026-05-25T00:00:00.000Z',
				updated_at: '2026-05-25T00:00:00.000Z',
				column_count: 0,
				card_count: 0
			}
		]);

		const response = await GET({
			locals,
			url: new URL('http://localhost/api/organisation/kanban/boards')
		} as any);
		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.boards).toHaveLength(2);
		// Page wasn't full (default 100) → nextCursor null.
		expect(data.nextCursor).toBeNull();
	});

	it('should return 500 on DB error', async () => {
		const { GET } = await import('./boards/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);

		mockRpcError(supabase, 'get_accessible_kanban_boards', 'DB crash');

		try {
			await GET({
				locals,
				url: new URL('http://localhost/api/organisation/kanban/boards')
			} as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(500);
		}
	});
});

// ============================================================================
// GET /api/organisation/kanban/boards/[boardId]
// ============================================================================

describe('GET /api/organisation/kanban/boards/[boardId]', () => {
	it('should return 401 when unauthenticated', async () => {
		const { GET } = await import('./boards/[boardId]/+server');
		const locals = createMockLocals();

		try {
			await GET({ locals, params: { boardId: TEST_IDS.board } } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(401);
		}
	});

	it('should return 400 when boardId is not a UUID', async () => {
		const { GET } = await import('./boards/[boardId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);

		try {
			await GET({ locals, params: { boardId: 'not-a-uuid' } } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(400);
		}
	});

	it('should return 404 when board does not exist (RLS invisible)', async () => {
		const { GET } = await import('./boards/[boardId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);

		// getBoardWithContent → maybeSingle() returns null
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: null,
			error: null
		});

		try {
			await GET({ locals, params: { boardId: TEST_IDS.board } } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(404);
		}
	});

	it('should return 200 with board content (columns pre-sorted by PostgREST)', async () => {
		const { GET } = await import('./boards/[boardId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);

		// PostgREST now orders by position natively; the handler trusts the
		// response order. We mock columns already in ascending position order.
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: {
				...mockBoard,
				columns: [
					{
						...mockColumn,
						id: TEST_IDS.column2,
						position: 1,
						cards: []
					},
					{
						...mockColumn,
						position: 2,
						cards: [{ ...mockCard, position: 1 }]
					}
				]
			},
			error: null
		});

		const response = await GET({ locals, params: { boardId: TEST_IDS.board } } as any);
		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.board).toBeDefined();
		expect(data.board.columns[0].id).toBe(TEST_IDS.column2);
		expect(data.board.columns[1].id).toBe(TEST_IDS.column);
	});
});

// ============================================================================
// PATCH /api/organisation/kanban/boards/[boardId]
// ============================================================================

describe('PATCH /api/organisation/kanban/boards/[boardId]', () => {
	it('should return 401 when unauthenticated', async () => {
		const { PATCH } = await import('./boards/[boardId]/+server');
		const locals = createMockLocals();
		const request = createMockRequest({ title: 'Nouveau titre' }, 'PATCH');

		try {
			await PATCH({ locals, params: { boardId: TEST_IDS.board }, request } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(401);
		}
	});

	it('should return 400 when boardId is not a UUID', async () => {
		const { PATCH } = await import('./boards/[boardId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({ title: 'Nouveau titre' }, 'PATCH');

		try {
			await PATCH({ locals, params: { boardId: 'bad-id' }, request } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(400);
		}
	});

	it('should return 400 when title is empty or missing', async () => {
		const { PATCH } = await import('./boards/[boardId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({ title: '' }, 'PATCH');

		try {
			await PATCH({ locals, params: { boardId: TEST_IDS.board }, request } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(400);
		}
	});

	it('should return 404 when board not found (assertBoardOwner)', async () => {
		const { PATCH } = await import('./boards/[boardId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({ title: 'Renommé' }, 'PATCH');

		// assertBoardOwner → maybeSingle returns null
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: null,
			error: null
		});

		try {
			await PATCH({ locals, params: { boardId: TEST_IDS.board }, request } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(404);
		}
	});

	it('should return 403 when user is not the board owner', async () => {
		const { PATCH } = await import('./boards/[boardId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({ title: 'Renommé' }, 'PATCH');

		// assertBoardOwner → board owned by someone else
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { ...mockBoard, owner_id: TEST_IDS.otherUser },
			error: null
		});

		try {
			await PATCH({ locals, params: { boardId: TEST_IDS.board }, request } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(403);
		}
	});

	it('should return 200 on successful rename', async () => {
		const { PATCH } = await import('./boards/[boardId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({ title: 'Titre renommé' }, 'PATCH');

		// assertBoardOwner → owned by user
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockBoard,
			error: null
		});

		// update().eq().select().single()
		supabase._mockChain.single.mockResolvedValueOnce({
			data: { ...mockBoard, title: 'Titre renommé' },
			error: null
		});

		const response = await PATCH({ locals, params: { boardId: TEST_IDS.board }, request } as any);
		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.board.title).toBe('Titre renommé');
	});
});

// ============================================================================
// DELETE /api/organisation/kanban/boards/[boardId]
// ============================================================================

describe('DELETE /api/organisation/kanban/boards/[boardId]', () => {
	it('should return 401 when unauthenticated', async () => {
		const { DELETE } = await import('./boards/[boardId]/+server');
		const locals = createMockLocals();

		try {
			await DELETE({ locals, params: { boardId: TEST_IDS.board } } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(401);
		}
	});

	it('should return 403 when user is not the board owner', async () => {
		const { DELETE } = await import('./boards/[boardId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);

		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { ...mockBoard, owner_id: TEST_IDS.otherUser },
			error: null
		});

		try {
			await DELETE({ locals, params: { boardId: TEST_IDS.board } } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(403);
		}
	});

	it('should return 200 on successful delete', async () => {
		const { DELETE } = await import('./boards/[boardId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);

		// assertBoardOwner → owned by user
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockBoard,
			error: null
		});

		// delete().eq() uses thenable protocol
		supabase._mockChain.then.mockImplementationOnce((onFulfilled: any) =>
			Promise.resolve(onFulfilled({ data: null, error: null }))
		);

		const response = await DELETE({ locals, params: { boardId: TEST_IDS.board } } as any);
		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
	});
});

// ============================================================================
// POST /api/organisation/kanban/boards/[boardId]/columns
// ============================================================================

describe('POST /api/organisation/kanban/boards/[boardId]/columns', () => {
	it('should return 401 when unauthenticated', async () => {
		const { POST } = await import('./boards/[boardId]/columns/+server');
		const locals = createMockLocals();
		const request = createMockRequest({ title: 'Col', position: 1 });

		try {
			await POST({ locals, params: { boardId: TEST_IDS.board }, request } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(401);
		}
	});

	it('should return 400 when boardId is not a UUID', async () => {
		const { POST } = await import('./boards/[boardId]/columns/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({ title: 'Col', position: 1 });

		try {
			await POST({ locals, params: { boardId: 'bad-id' }, request } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(400);
		}
	});

	it('should return 400 when body is invalid (missing title)', async () => {
		const { POST } = await import('./boards/[boardId]/columns/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({ position: 1 }); // no title

		try {
			await POST({ locals, params: { boardId: TEST_IDS.board }, request } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(400);
		}
	});

	it('should return 403 when user is not the board owner', async () => {
		const { POST } = await import('./boards/[boardId]/columns/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({ title: 'Colonne', position: 1 });

		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { ...mockBoard, owner_id: TEST_IDS.otherUser },
			error: null
		});

		try {
			await POST({ locals, params: { boardId: TEST_IDS.board }, request } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(403);
		}
	});

	it('should return 201 on successful column creation', async () => {
		const { POST } = await import('./boards/[boardId]/columns/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({ title: 'Nouvelle colonne', position: 1 });

		// assertBoardOwner
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockBoard,
			error: null
		});

		// insert().select().single()
		supabase._mockChain.single.mockResolvedValueOnce({
			data: mockColumn,
			error: null
		});

		const response = await POST({
			locals,
			params: { boardId: TEST_IDS.board },
			request
		} as any);
		const data = await response.json();
		expect(response.status).toBe(201);
		expect(data.column).toBeDefined();
	});
});

// ============================================================================
// PATCH /api/organisation/kanban/columns/[columnId]
// ============================================================================

describe('PATCH /api/organisation/kanban/columns/[columnId]', () => {
	it('should return 401 when unauthenticated', async () => {
		const { PATCH } = await import('./columns/[columnId]/+server');
		const locals = createMockLocals();
		const request = createMockRequest({ title: 'Renommé' }, 'PATCH');

		try {
			await PATCH({ locals, params: { columnId: TEST_IDS.column }, request } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(401);
		}
	});

	it('should return 400 when body has neither title nor position (refine)', async () => {
		const { PATCH } = await import('./columns/[columnId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({}, 'PATCH'); // empty body

		try {
			await PATCH({ locals, params: { columnId: TEST_IDS.column }, request } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(400);
		}
	});

	it('should return 404 when column not found', async () => {
		const { PATCH } = await import('./columns/[columnId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({ title: 'Renommé' }, 'PATCH');

		// getColumnBoardId → maybeSingle returns null
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

		try {
			await PATCH({ locals, params: { columnId: TEST_IDS.column }, request } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(404);
		}
	});

	it('should return 403 when user is not board owner', async () => {
		const { PATCH } = await import('./columns/[columnId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({ title: 'Renommé' }, 'PATCH');

		// getColumnBoardId → returns board id
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { board_id: TEST_IDS.board },
			error: null
		});

		// assertBoardOwner → board owned by someone else
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { ...mockBoard, owner_id: TEST_IDS.otherUser },
			error: null
		});

		try {
			await PATCH({ locals, params: { columnId: TEST_IDS.column }, request } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(403);
		}
	});

	it('should return 200 when renaming only (no position change)', async () => {
		const { PATCH } = await import('./columns/[columnId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({ title: 'En cours' }, 'PATCH');

		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { board_id: TEST_IDS.board },
			error: null
		});
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({ data: mockBoard, error: null });
		supabase._mockChain.single.mockResolvedValueOnce({
			data: { ...mockColumn, title: 'En cours' },
			error: null
		});

		const response = await PATCH({
			locals,
			params: { columnId: TEST_IDS.column },
			request
		} as any);
		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.column.title).toBe('En cours');
	});

	it('should return 200 when repositioning only (no title change)', async () => {
		const { PATCH } = await import('./columns/[columnId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({ position: 2.5 }, 'PATCH');

		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { board_id: TEST_IDS.board },
			error: null
		});
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({ data: mockBoard, error: null });
		supabase._mockChain.single.mockResolvedValueOnce({
			data: { ...mockColumn, position: 2.5 },
			error: null
		});

		const response = await PATCH({
			locals,
			params: { columnId: TEST_IDS.column },
			request
		} as any);
		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.column.position).toBe(2.5);
	});

	it('should return 200 when renaming and repositioning simultaneously', async () => {
		const { PATCH } = await import('./columns/[columnId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({ title: 'Terminé', position: 3 }, 'PATCH');

		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { board_id: TEST_IDS.board },
			error: null
		});
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({ data: mockBoard, error: null });
		supabase._mockChain.single.mockResolvedValueOnce({
			data: { ...mockColumn, title: 'Terminé', position: 3 },
			error: null
		});

		const response = await PATCH({
			locals,
			params: { columnId: TEST_IDS.column },
			request
		} as any);
		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.column.title).toBe('Terminé');
		expect(data.column.position).toBe(3);
	});
});

// ============================================================================
// DELETE /api/organisation/kanban/columns/[columnId]
// ============================================================================

describe('DELETE /api/organisation/kanban/columns/[columnId]', () => {
	it('should return 401 when unauthenticated', async () => {
		const { DELETE } = await import('./columns/[columnId]/+server');
		const locals = createMockLocals();

		try {
			await DELETE({ locals, params: { columnId: TEST_IDS.column } } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(401);
		}
	});

	it('should return 404 when column not found', async () => {
		const { DELETE } = await import('./columns/[columnId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);

		supabase._mockChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

		try {
			await DELETE({ locals, params: { columnId: TEST_IDS.column } } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(404);
		}
	});

	it('should return 403 when user is not board owner', async () => {
		const { DELETE } = await import('./columns/[columnId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);

		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { board_id: TEST_IDS.board },
			error: null
		});
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { ...mockBoard, owner_id: TEST_IDS.otherUser },
			error: null
		});

		try {
			await DELETE({ locals, params: { columnId: TEST_IDS.column } } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(403);
		}
	});

	it('should return 200 on successful column deletion', async () => {
		const { DELETE } = await import('./columns/[columnId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);

		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { board_id: TEST_IDS.board },
			error: null
		});
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({ data: mockBoard, error: null });

		// delete().eq() uses thenable
		supabase._mockChain.then.mockImplementationOnce((onFulfilled: any) =>
			Promise.resolve(onFulfilled({ data: null, error: null }))
		);

		const response = await DELETE({ locals, params: { columnId: TEST_IDS.column } } as any);
		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
	});
});

// ============================================================================
// POST /api/organisation/kanban/columns/[columnId]/cards
// ============================================================================

describe('POST /api/organisation/kanban/columns/[columnId]/cards', () => {
	it('should return 401 when unauthenticated', async () => {
		const { POST } = await import('./columns/[columnId]/cards/+server');
		const locals = createMockLocals();
		const request = createMockRequest({ title: 'Carte', position: 1 });

		try {
			await POST({ locals, params: { columnId: TEST_IDS.column }, request } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(401);
		}
	});

	it('should return 404 when column is not accessible (RLS, board invisible)', async () => {
		const { POST } = await import('./columns/[columnId]/cards/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({ title: 'Carte', position: 1 });

		// getColumnBoardId → null (column not found or RLS invisible)
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

		try {
			await POST({ locals, params: { columnId: TEST_IDS.column }, request } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(404);
		}
	});

	it('should return 201 with description null (omitted)', async () => {
		const { POST } = await import('./columns/[columnId]/cards/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({ title: 'Carte sans description', position: 1 });

		// getColumnBoardId → returns board id
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { board_id: TEST_IDS.board },
			error: null
		});
		// assertBoardAccess → board visible
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({ data: mockBoard, error: null });
		// insert().select().single()
		supabase._mockChain.single.mockResolvedValueOnce({
			data: mockCard,
			error: null
		});

		const response = await POST({
			locals,
			params: { columnId: TEST_IDS.column },
			request
		} as any);
		const data = await response.json();
		expect(response.status).toBe(201);
		expect(data.card).toBeDefined();
		expect(data.card.description).toBeNull();
	});

	it('should return 201 with description provided', async () => {
		const { POST } = await import('./columns/[columnId]/cards/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({
			title: 'Carte avec description',
			description: 'Détails de la tâche',
			position: 1
		});

		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { board_id: TEST_IDS.board },
			error: null
		});
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({ data: mockBoard, error: null });
		supabase._mockChain.single.mockResolvedValueOnce({
			data: { ...mockCard, description: 'Détails de la tâche' },
			error: null
		});

		const response = await POST({
			locals,
			params: { columnId: TEST_IDS.column },
			request
		} as any);
		const data = await response.json();
		expect(response.status).toBe(201);
		expect(data.card.description).toBe('Détails de la tâche');
	});

	it('should return 201 with a valid ISO due_date', async () => {
		const { POST } = await import('./columns/[columnId]/cards/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const due = '2026-06-12T00:00:00.000Z';
		const request = createMockRequest({
			title: 'Carte avec échéance',
			position: 1,
			due_date: due
		});

		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { board_id: TEST_IDS.board },
			error: null
		});
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({ data: mockBoard, error: null });
		supabase._mockChain.single.mockResolvedValueOnce({
			data: { ...mockCard, due_date: due },
			error: null
		});

		const response = await POST({
			locals,
			params: { columnId: TEST_IDS.column },
			request
		} as any);
		const data = await response.json();
		expect(response.status).toBe(201);
		expect(data.card.due_date).toBe(due);
	});

	it('should reject an invalid due_date format', async () => {
		const { POST } = await import('./columns/[columnId]/cards/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({
			title: 'Carte',
			position: 1,
			due_date: 'not-a-date'
		});

		try {
			await POST({ locals, params: { columnId: TEST_IDS.column }, request } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(400);
		}
	});
});

// ============================================================================
// PATCH /api/organisation/kanban/cards/[cardId]
// ============================================================================

describe('PATCH /api/organisation/kanban/cards/[cardId]', () => {
	it('should return 401 when unauthenticated', async () => {
		const { PATCH } = await import('./cards/[cardId]/+server');
		const locals = createMockLocals();
		const request = createMockRequest({ title: 'Renommé' }, 'PATCH');

		try {
			await PATCH({ locals, params: { cardId: TEST_IDS.card }, request } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(401);
		}
	});

	it('should return 400 when body has no field at all (refine)', async () => {
		const { PATCH } = await import('./cards/[cardId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({}, 'PATCH');

		try {
			await PATCH({ locals, params: { cardId: TEST_IDS.card }, request } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(400);
		}
	});

	it('should return 400 when column_id is provided without position (refine)', async () => {
		const { PATCH } = await import('./cards/[cardId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({ column_id: TEST_IDS.column2 }, 'PATCH');

		try {
			await PATCH({ locals, params: { cardId: TEST_IDS.card }, request } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(400);
		}
	});

	it('should return 404 when card not found', async () => {
		const { PATCH } = await import('./cards/[cardId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({ title: 'Renommé' }, 'PATCH');

		// getCardColumnId → null
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

		try {
			await PATCH({ locals, params: { cardId: TEST_IDS.card }, request } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(404);
		}
	});

	it('should return 400 on cross-board move attempt', async () => {
		const { PATCH } = await import('./cards/[cardId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		// Moving to column2, which is on board2 (different from card's current board)
		const request = createMockRequest({ column_id: TEST_IDS.column2, position: 1 }, 'PATCH');

		// getCardColumnId → current column (on board)
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { column_id: TEST_IDS.column },
			error: null
		});
		// Promise.all: getColumnBoardId(currentColumn) + getColumnBoardId(destColumn)
		// First maybeSingle: source board
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { board_id: TEST_IDS.board },
			error: null
		});
		// Second maybeSingle: dest board (different board!)
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { board_id: TEST_IDS.board2 },
			error: null
		});

		try {
			await PATCH({ locals, params: { cardId: TEST_IDS.card }, request } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(400);
		}
	});

	it('should return 200 when editing title and description', async () => {
		const { PATCH } = await import('./cards/[cardId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest(
			{ title: 'Nouveau titre', description: 'Nouvelle description' },
			'PATCH'
		);

		// getCardColumnId
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { column_id: TEST_IDS.column },
			error: null
		});
		// update().eq().select().single()
		supabase._mockChain.single.mockResolvedValueOnce({
			data: { ...mockCard, title: 'Nouveau titre', description: 'Nouvelle description' },
			error: null
		});

		const response = await PATCH({ locals, params: { cardId: TEST_IDS.card }, request } as any);
		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.card.title).toBe('Nouveau titre');
		expect(data.card.description).toBe('Nouvelle description');
	});

	it('should return 200 on intra-board card move', async () => {
		const { PATCH } = await import('./cards/[cardId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		// Moving to column2 but same board
		const request = createMockRequest({ column_id: TEST_IDS.column2, position: 2 }, 'PATCH');

		// getCardColumnId
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { column_id: TEST_IDS.column },
			error: null
		});
		// Promise.all: source board
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { board_id: TEST_IDS.board },
			error: null
		});
		// Promise.all: dest board (same board!)
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { board_id: TEST_IDS.board },
			error: null
		});
		// update().eq().select().single()
		supabase._mockChain.single.mockResolvedValueOnce({
			data: { ...mockCard, column_id: TEST_IDS.column2, position: 2 },
			error: null
		});

		const response = await PATCH({ locals, params: { cardId: TEST_IDS.card }, request } as any);
		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.card.column_id).toBe(TEST_IDS.column2);
	});

	it('should return 200 when setting due_date to a valid ISO datetime', async () => {
		const { PATCH } = await import('./cards/[cardId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const due = '2026-12-31T00:00:00.000Z';
		const request = createMockRequest({ due_date: due }, 'PATCH');

		// getCardColumnId
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { column_id: TEST_IDS.column },
			error: null
		});
		// update
		supabase._mockChain.single.mockResolvedValueOnce({
			data: { ...mockCard, due_date: due },
			error: null
		});

		const response = await PATCH({ locals, params: { cardId: TEST_IDS.card }, request } as any);
		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.card.due_date).toBe(due);
	});

	it('should return 200 when clearing due_date with explicit null', async () => {
		const { PATCH } = await import('./cards/[cardId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({ due_date: null }, 'PATCH');

		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { column_id: TEST_IDS.column },
			error: null
		});
		supabase._mockChain.single.mockResolvedValueOnce({
			data: { ...mockCard, due_date: null },
			error: null
		});

		const response = await PATCH({ locals, params: { cardId: TEST_IDS.card }, request } as any);
		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.card.due_date).toBeNull();
	});

	it('should reject an invalid due_date format', async () => {
		const { PATCH } = await import('./cards/[cardId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);
		const request = createMockRequest({ due_date: '12-06-2026' }, 'PATCH');

		try {
			await PATCH({ locals, params: { cardId: TEST_IDS.card }, request } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(400);
		}
	});
});

// ============================================================================
// DELETE /api/organisation/kanban/cards/[cardId]
// ============================================================================

describe('DELETE /api/organisation/kanban/cards/[cardId]', () => {
	it('should return 401 when unauthenticated', async () => {
		const { DELETE } = await import('./cards/[cardId]/+server');
		const locals = createMockLocals();

		try {
			await DELETE({ locals, params: { cardId: TEST_IDS.card } } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(401);
		}
	});

	it('should return 404 when card not found', async () => {
		const { DELETE } = await import('./cards/[cardId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);

		supabase._mockChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

		try {
			await DELETE({ locals, params: { cardId: TEST_IDS.card } } as any);
			expect.fail('Should have thrown');
		} catch (err: any) {
			expect(err.status).toBe(404);
		}
	});

	it('should return 200 on successful card deletion', async () => {
		const { DELETE } = await import('./cards/[cardId]/+server');
		const supabase = createMockSupabase();
		mockAuthProfile(supabase);
		const locals = createMockLocals(TEST_IDS.user, supabase);

		// getCardColumnId → card exists
		supabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: { column_id: TEST_IDS.column },
			error: null
		});

		// delete().eq() uses thenable
		supabase._mockChain.then.mockImplementationOnce((onFulfilled: any) =>
			Promise.resolve(onFulfilled({ data: null, error: null }))
		);

		const response = await DELETE({ locals, params: { cardId: TEST_IDS.card } } as any);
		const data = await response.json();
		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
	});
});
