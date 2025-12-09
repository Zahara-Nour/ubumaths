/**
 * Minesweeper Authorization Tests
 * ================================
 *
 * Comprehensive tests verifying that teachers and admins are treated the same
 * as anonymous users for minesweeper recording (no database persistence).
 *
 * Defense-in-depth approach:
 * - API endpoints return 403 Forbidden for teachers/admins
 * - Store logic returns false for shouldUseDatabase()
 * - Database RLS policies prevent INSERT/UPDATE
 * - RPC functions reject non-students
 *
 * Test Coverage:
 * 1. API Endpoint Authorization (403 for teachers/admins)
 * 2. Student Access (200/201 for students)
 * 3. Anonymous Access (401 for unauthenticated)
 *
 * Endpoints tested:
 * - POST /api/games/minesweeper/start
 * - POST /api/games/minesweeper/[id]/complete
 * - POST /api/games/minesweeper/[id]/loss
 * - POST /api/games/minesweeper/[id]/hint
 * - GET /api/games/minesweeper/current
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi } from 'vitest';
import {
	createMockSupabase,
	createMockLocals,
	createMockRequest,
	mockSuccess,
	mockSequence
} from '$tests/helpers';

// ============================================================================
// TEST DATA
// ============================================================================

const TEST_IDS = {
	student: '550e8400-e29b-41d4-a716-446655440001',
	teacher: '550e8400-e29b-41d4-a716-446655440002',
	admin: '550e8400-e29b-41d4-a716-446655440003',
	game: '550e8400-e29b-41d4-a716-446655440011'
};

const mockProfiles = {
	student: {
		id: TEST_IDS.student,
		role: 'student',
		email: 'student@voltairedoha.com',
		firstname: 'Student',
		lastname: 'User',
		school_id: 'school-1',
		is_test: false,
		created_at: '2024-01-01T00:00:00Z'
	},
	teacher: {
		id: TEST_IDS.teacher,
		role: 'teacher',
		email: 'teacher@voltairedoha.com',
		firstname: 'Teacher',
		lastname: 'User',
		school_id: 'school-1',
		is_test: false,
		created_at: '2024-01-01T00:00:00Z'
	},
	admin: {
		id: TEST_IDS.admin,
		role: 'admin',
		email: 'admin@voltairedoha.com',
		firstname: 'Admin',
		lastname: 'User',
		school_id: 'school-1',
		is_test: false,
		created_at: '2024-01-01T00:00:00Z'
	}
};

const mockGame = {
	id: TEST_IDS.game,
	student_id: TEST_IDS.student,
	difficulty: 'beginner',
	status: 'in_progress',
	mines_count: 10,
	grid_state: {
		rows: 9,
		cols: 9,
		mines: [[1, 2]],
		revealed: [[0, 0]],
		flagged: [],
		adjacentCounts: {}
	},
	flags_used: 0,
	cells_revealed: 1,
	hints_used: 0,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z'
};

// ============================================================================
// POST /api/games/minesweeper/start - START NEW GAME
// ============================================================================

describe('POST /api/games/minesweeper/start', () => {
	it('should allow students to start games', async () => {
		const { POST } = await import('./start/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(TEST_IDS.student, mockSupabase);

		// Mock profile check (student)
		mockSequence(mockSupabase, [
			{ data: mockProfiles.student, error: null }, // requireRole profile check
			{
				data: mockGame as any, // Game data already includes id
				error: null
			} // insert game
		]);

		const request = createMockRequest({
			difficulty: 'beginner'
		});

		const response = await POST({ request, locals } as any);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.game).toBeDefined();
		expect(data.game.id).toBe(TEST_IDS.game);
	}, 10000); // 10 second timeout

	it('should reject teachers with 403 Forbidden', async () => {
		const { POST } = await import('./start/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(TEST_IDS.teacher, mockSupabase);

		// Mock profile check (teacher)
		mockSuccess(mockSupabase, mockProfiles.teacher);

		const request = createMockRequest({
			difficulty: 'beginner'
		});

		try {
			await POST({ request, locals } as any);
			expect.fail('Should have thrown 403 error');
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.body.message).toContain('Élèves uniquement');
		}
	});

	it('should reject admins with 403 Forbidden', async () => {
		const { POST } = await import('./start/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(TEST_IDS.admin, mockSupabase);

		// Mock profile check (admin)
		mockSuccess(mockSupabase, mockProfiles.admin);

		const request = createMockRequest({
			difficulty: 'beginner'
		});

		try {
			await POST({ request, locals } as any);
			expect.fail('Should have thrown 403 error');
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.body.message).toContain('Élèves uniquement');
		}
	});

	it('should reject unauthenticated requests with 401', async () => {
		const { POST } = await import('./start/+server');

		const locals = createMockLocals(); // No user

		const request = createMockRequest({
			difficulty: 'beginner'
		});

		try {
			await POST({ request, locals } as any);
			expect.fail('Should have thrown 401 error');
		} catch (err: any) {
			expect(err.status).toBe(401);
			expect(err.body.message).toContain('Non autorisé');
		}
	});
});

// ============================================================================
// POST /api/games/minesweeper/[id]/complete - COMPLETE GAME (WIN)
// ============================================================================

describe('POST /api/games/minesweeper/[id]/complete', () => {
	it('should allow students to complete games', async () => {
		const { POST } = await import('./[id]/complete/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(TEST_IDS.student, mockSupabase);

		// Create valid grid state with 10 mines for beginner difficulty
		const validGridState = {
			rows: 9,
			cols: 9,
			mines: [
				[0, 0],
				[0, 1],
				[1, 0],
				[1, 1],
				[2, 2],
				[3, 3],
				[4, 4],
				[5, 5],
				[6, 6],
				[7, 7]
			], // 10 mines for beginner
			revealed: [[0, 2]],
			flagged: [],
			adjacentCounts: {}
		};

		// Mock profile check and game fetch
		mockSequence(mockSupabase, [
			{ data: mockProfiles.student, error: null }, // requireRole profile check
			{
				data: { ...mockGame, grid_state: validGridState } as any,
				error: null
			} // fetch game
		]);

		// Mock RPC call with .single() support
		(mockSupabase.rpc as ReturnType<typeof vi.fn>).mockReturnValue({
			single: vi.fn().mockResolvedValue({
				data: {
					success: true,
					gidouilles_awarded: 10,
					time_seconds: 60,
					achievements: []
				},
				error: null
			})
		});

		const request = createMockRequest({
			grid_state: validGridState
		});

		const response = await POST({
			request,
			locals,
			params: { id: TEST_IDS.game }
		} as any);

		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.gidouilles).toBe(10);
		expect(mockSupabase.rpc).toHaveBeenCalledWith('complete_minesweeper_game', {
			p_game_id: TEST_IDS.game,
			p_grid_state: expect.any(Object)
		});
	});

	it('should reject teachers with 403 Forbidden', async () => {
		const { POST } = await import('./[id]/complete/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(TEST_IDS.teacher, mockSupabase);

		// Mock profile check (teacher)
		mockSuccess(mockSupabase, mockProfiles.teacher);

		const request = createMockRequest({
			grid_state: mockGame.grid_state
		});

		try {
			await POST({
				request,
				locals,
				params: { id: TEST_IDS.game }
			} as any);
			expect.fail('Should have thrown 403 error');
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.body.message).toContain('Élèves uniquement');
		}
	});

	it('should reject admins with 403 Forbidden', async () => {
		const { POST } = await import('./[id]/complete/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(TEST_IDS.admin, mockSupabase);

		// Mock profile check (admin)
		mockSuccess(mockSupabase, mockProfiles.admin);

		const request = createMockRequest({
			grid_state: mockGame.grid_state
		});

		try {
			await POST({
				request,
				locals,
				params: { id: TEST_IDS.game }
			} as any);
			expect.fail('Should have thrown 403 error');
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.body.message).toContain('Élèves uniquement');
		}
	});

	it('should reject unauthenticated requests with 401', async () => {
		const { POST } = await import('./[id]/complete/+server');

		const locals = createMockLocals(); // No user

		const request = createMockRequest({
			grid_state: mockGame.grid_state
		});

		try {
			await POST({
				request,
				locals,
				params: { id: TEST_IDS.game }
			} as any);
			expect.fail('Should have thrown 401 error');
		} catch (err: any) {
			expect(err.status).toBe(401);
			expect(err.body.message).toContain('Non autorisé');
		}
	});
});

// ============================================================================
// POST /api/games/minesweeper/[id]/loss - RECORD LOSS
// ============================================================================

describe('POST /api/games/minesweeper/[id]/loss', () => {
	it('should allow students to record losses', async () => {
		const { POST } = await import('./[id]/loss/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(TEST_IDS.student, mockSupabase);

		// Create valid grid state with 10 mines for beginner difficulty
		const validGridState = {
			rows: 9,
			cols: 9,
			mines: [
				[0, 0],
				[0, 1],
				[1, 0],
				[1, 1],
				[2, 2],
				[3, 3],
				[4, 4],
				[5, 5],
				[6, 6],
				[7, 7]
			], // 10 mines for beginner
			revealed: [[0, 2]],
			flagged: [],
			adjacentCounts: {}
		};

		// Mock profile check and game fetch
		mockSequence(mockSupabase, [
			{ data: mockProfiles.student, error: null }, // requireRole profile check
			{
				data: { ...mockGame, grid_state: validGridState } as any,
				error: null
			} // fetch game
		]);

		// Mock RPC call (no return value needed, just success)
		(mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			data: null,
			error: null
		});

		const request = createMockRequest({
			grid_state: validGridState
		});

		const response = await POST({
			request,
			locals,
			params: { id: TEST_IDS.game }
		} as any);

		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(mockSupabase.rpc).toHaveBeenCalledWith('record_minesweeper_loss', {
			p_game_id: TEST_IDS.game,
			p_grid_state: expect.any(Object)
		});
	});

	it('should reject teachers with 403 Forbidden', async () => {
		const { POST } = await import('./[id]/loss/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(TEST_IDS.teacher, mockSupabase);

		// Mock profile check (teacher)
		mockSuccess(mockSupabase, mockProfiles.teacher);

		const request = createMockRequest({
			grid_state: mockGame.grid_state
		});

		try {
			await POST({
				request,
				locals,
				params: { id: TEST_IDS.game }
			} as any);
			expect.fail('Should have thrown 403 error');
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.body.message).toContain('Élèves uniquement');
		}
	});

	it('should reject admins with 403 Forbidden', async () => {
		const { POST } = await import('./[id]/loss/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(TEST_IDS.admin, mockSupabase);

		// Mock profile check (admin)
		mockSuccess(mockSupabase, mockProfiles.admin);

		const request = createMockRequest({
			grid_state: mockGame.grid_state
		});

		try {
			await POST({
				request,
				locals,
				params: { id: TEST_IDS.game }
			} as any);
			expect.fail('Should have thrown 403 error');
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.body.message).toContain('Élèves uniquement');
		}
	});

	it('should reject unauthenticated requests with 401', async () => {
		const { POST } = await import('./[id]/loss/+server');

		const locals = createMockLocals(); // No user

		const request = createMockRequest({
			grid_state: mockGame.grid_state
		});

		try {
			await POST({
				request,
				locals,
				params: { id: TEST_IDS.game }
			} as any);
			expect.fail('Should have thrown 401 error');
		} catch (err: any) {
			expect(err.status).toBe(401);
			expect(err.body.message).toContain('Non autorisé');
		}
	});
});

// ============================================================================
// POST /api/games/minesweeper/[id]/hint - USE HINT
// ============================================================================

describe('POST /api/games/minesweeper/[id]/hint', () => {
	it('should allow students to use hints', async () => {
		const { POST } = await import('./[id]/hint/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(TEST_IDS.student, mockSupabase);

		// Mock profile check
		mockSuccess(mockSupabase, mockProfiles.student);

		// Mock RPC call with .single() support
		(mockSupabase.rpc as ReturnType<typeof vi.fn>).mockReturnValue({
			single: vi.fn().mockResolvedValue({
				data: {
					success: true,
					hints_used: 1,
					hints_remaining: 2,
					gidouilles_spent: 10,
					remaining_gidouilles: 90,
					penalty_notice: 'Using hints applies 30% penalty to final reward'
				},
				error: null
			})
		});

		const response = await POST({
			request: createMockRequest(),
			locals,
			params: { id: TEST_IDS.game }
		} as any);

		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.hints_used).toBe(1);
		expect(mockSupabase.rpc).toHaveBeenCalledWith('use_hint', {
			p_game_id: TEST_IDS.game
		});
	});

	it('should reject teachers with 403 Forbidden', async () => {
		const { POST } = await import('./[id]/hint/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(TEST_IDS.teacher, mockSupabase);

		// Mock profile check (teacher)
		mockSuccess(mockSupabase, mockProfiles.teacher);

		try {
			await POST({
				request: createMockRequest(),
				locals,
				params: { id: TEST_IDS.game }
			} as any);
			expect.fail('Should have thrown 403 error');
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.body.message).toContain('Élèves uniquement');
		}
	});

	it('should reject admins with 403 Forbidden', async () => {
		const { POST } = await import('./[id]/hint/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(TEST_IDS.admin, mockSupabase);

		// Mock profile check (admin)
		mockSuccess(mockSupabase, mockProfiles.admin);

		try {
			await POST({
				request: createMockRequest(),
				locals,
				params: { id: TEST_IDS.game }
			} as any);
			expect.fail('Should have thrown 403 error');
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.body.message).toContain('Élèves uniquement');
		}
	});

	it('should reject unauthenticated requests with 401', async () => {
		const { POST } = await import('./[id]/hint/+server');

		const locals = createMockLocals(); // No user

		try {
			await POST({
				request: createMockRequest(),
				locals,
				params: { id: TEST_IDS.game }
			} as any);
			expect.fail('Should have thrown 401 error');
		} catch (err: any) {
			expect(err.status).toBe(401);
			expect(err.body.message).toContain('Non autorisé');
		}
	});
});

// ============================================================================
// GET /api/games/minesweeper/current - GET CURRENT GAME
// ============================================================================

describe('GET /api/games/minesweeper/current', () => {
	it('should allow students to fetch current game', async () => {
		const { GET } = await import('./current/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(TEST_IDS.student, mockSupabase);

		// Mock profile check
		mockSuccess(mockSupabase, mockProfiles.student);

		// Mock game fetch with maybeSingle
		mockSupabase._mockChain.maybeSingle.mockResolvedValueOnce({
			data: mockGame as any,
			error: null
		});

		const response = await GET({ locals } as any);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.game).toBeDefined();
		expect(data.game.id).toBe(TEST_IDS.game);
	});

	it('should reject teachers with 403 Forbidden', async () => {
		const { GET } = await import('./current/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(TEST_IDS.teacher, mockSupabase);

		// Mock profile check (teacher)
		mockSuccess(mockSupabase, mockProfiles.teacher);

		try {
			await GET({ locals } as any);
			expect.fail('Should have thrown 403 error');
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.body.message).toContain('Élèves uniquement');
		}
	});

	it('should reject admins with 403 Forbidden', async () => {
		const { GET } = await import('./current/+server');

		const mockSupabase = createMockSupabase();
		const locals = createMockLocals(TEST_IDS.admin, mockSupabase);

		// Mock profile check (admin)
		mockSuccess(mockSupabase, mockProfiles.admin);

		try {
			await GET({ locals } as any);
			expect.fail('Should have thrown 403 error');
		} catch (err: any) {
			expect(err.status).toBe(403);
			expect(err.body.message).toContain('Élèves uniquement');
		}
	});

	it('should reject unauthenticated requests with 401', async () => {
		const { GET } = await import('./current/+server');

		const locals = createMockLocals(); // No user

		try {
			await GET({ locals } as any);
			expect.fail('Should have thrown 401 error');
		} catch (err: any) {
			expect(err.status).toBe(401);
			expect(err.body.message).toContain('Non autorisé');
		}
	});
});
