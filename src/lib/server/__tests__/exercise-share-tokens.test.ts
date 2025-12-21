/**
 * Tests for exercise share tokens server functions
 *
 * TDD: These tests are written BEFORE the implementation.
 * All tests should fail initially until the implementation is complete.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExerciseShareToken } from '$lib/exercises/types';

// Mock Supabase client factory
function createMockSupabase(overrides: Record<string, unknown> = {}) {
	const mockFrom = vi.fn();
	const mockSelect = vi.fn();
	const mockInsert = vi.fn();
	const mockUpdate = vi.fn();
	const mockDelete = vi.fn();
	const mockEq = vi.fn();
	const mockSingle = vi.fn();
	const mockMaybeSingle = vi.fn();
	const mockRpc = vi.fn();
	const mockOrder = vi.fn();

	// Chain methods
	mockFrom.mockReturnValue({
		select: mockSelect,
		insert: mockInsert,
		update: mockUpdate,
		delete: mockDelete
	});

	mockSelect.mockReturnValue({
		eq: mockEq,
		single: mockSingle,
		maybeSingle: mockMaybeSingle,
		order: mockOrder
	});

	mockInsert.mockReturnValue({
		select: mockSelect,
		single: mockSingle
	});

	mockUpdate.mockReturnValue({
		eq: mockEq,
		select: mockSelect
	});

	mockDelete.mockReturnValue({
		eq: mockEq
	});

	mockEq.mockReturnValue({
		eq: mockEq,
		single: mockSingle,
		maybeSingle: mockMaybeSingle,
		select: mockSelect,
		order: mockOrder
	});

	mockOrder.mockReturnValue({
		data: [],
		error: null
	});

	return {
		from: mockFrom,
		rpc: mockRpc,
		_mocks: {
			mockFrom,
			mockSelect,
			mockInsert,
			mockUpdate,
			mockDelete,
			mockEq,
			mockSingle,
			mockMaybeSingle,
			mockRpc,
			mockOrder
		},
		...overrides
	} as unknown as SupabaseClient & { _mocks: Record<string, ReturnType<typeof vi.fn>> };
}

// Sample data
const mockTeacherId = '11111111-1111-1111-1111-111111111111';
const mockExerciseId = '22222222-2222-2222-2222-222222222222';
const mockTokenId = '33333333-3333-3333-3333-333333333333';
const mockToken = 'AbCdEfGh12345678';

const mockShareToken: ExerciseShareToken = {
	id: mockTokenId,
	exercise_id: mockExerciseId,
	token: mockToken,
	created_by: mockTeacherId,
	created_at: '2024-01-15T10:00:00Z',
	expires_at: null,
	is_active: true,
	access_count: 0,
	last_accessed_at: null
};

const mockExercise = {
	id: mockExerciseId,
	title: 'Test Exercise',
	statement_md: 'Test statement',
	solution_md: 'Test solution',
	difficulty: 1,
	tags: [],
	is_public: false,
	created_by: mockTeacherId,
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z',
	distribution_mode: 'on_demand'
};

describe('exercise-share-tokens', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('createShareToken', () => {
		it('should create a share token with no expiration', async () => {
			// Import dynamically to allow module to be loaded after tests are written
			const { createShareToken } = await import('../exercise-share-tokens');

			const supabase = createMockSupabase();
			supabase._mocks.mockSingle.mockResolvedValue({
				data: mockShareToken,
				error: null
			});

			const result = await createShareToken(supabase, mockExerciseId, mockTeacherId);

			expect(result.error).toBeNull();
			expect(result.data).toBeDefined();
			expect(result.data?.token).toHaveLength(16);
			expect(result.data?.exercise_id).toBe(mockExerciseId);
			expect(result.data?.is_active).toBe(true);
			expect(result.data?.expires_at).toBeNull();
		});

		it('should create a share token with expiration in days', async () => {
			const { createShareToken } = await import('../exercise-share-tokens');

			const tokenWithExpiry = {
				...mockShareToken,
				expires_at: '2024-02-14T10:00:00Z' // 30 days later
			};

			const supabase = createMockSupabase();
			supabase._mocks.mockSingle.mockResolvedValue({
				data: tokenWithExpiry,
				error: null
			});

			const result = await createShareToken(supabase, mockExerciseId, mockTeacherId, 30);

			expect(result.error).toBeNull();
			expect(result.data?.expires_at).not.toBeNull();
		});

		it('should return error if user does not own the exercise', async () => {
			const { createShareToken } = await import('../exercise-share-tokens');

			const supabase = createMockSupabase();
			supabase._mocks.mockSingle.mockResolvedValue({
				data: null,
				error: { message: 'RLS policy violation', code: '42501' }
			});

			const result = await createShareToken(supabase, mockExerciseId, 'other-user-id');

			expect(result.error).not.toBeNull();
			expect(result.data).toBeNull();
		});

		it('should generate a unique 16-character alphanumeric token', async () => {
			const { createShareToken } = await import('../exercise-share-tokens');

			const supabase = createMockSupabase();
			supabase._mocks.mockSingle.mockResolvedValue({
				data: mockShareToken,
				error: null
			});

			const result = await createShareToken(supabase, mockExerciseId, mockTeacherId);

			expect(result.data?.token).toMatch(/^[A-Za-z0-9]{16}$/);
		});
	});

	describe('getExerciseByShareToken', () => {
		it('should return exercise for a valid active token', async () => {
			const { getExerciseByShareToken } = await import('../exercise-share-tokens');

			const supabase = createMockSupabase();
			// First query: get token
			supabase._mocks.mockMaybeSingle.mockResolvedValueOnce({
				data: mockShareToken,
				error: null
			});
			// Second query: get exercise
			supabase._mocks.mockSingle.mockResolvedValue({
				data: mockExercise,
				error: null
			});

			const result = await getExerciseByShareToken(supabase, mockToken);

			expect(result.error).toBeNull();
			expect(result.data).toBeDefined();
			expect(result.data?.id).toBe(mockExerciseId);
		});

		it('should return error for non-existent token', async () => {
			const { getExerciseByShareToken } = await import('../exercise-share-tokens');

			const supabase = createMockSupabase();
			supabase._mocks.mockMaybeSingle.mockResolvedValue({
				data: null,
				error: null
			});

			const result = await getExerciseByShareToken(supabase, 'NonExistentToken1');

			expect(result.error).toBe('Token invalide');
			expect(result.data).toBeNull();
		});

		it('should return error for expired token', async () => {
			const { getExerciseByShareToken } = await import('../exercise-share-tokens');

			const expiredToken = {
				...mockShareToken,
				expires_at: '2023-01-01T00:00:00Z' // Past date
			};

			const supabase = createMockSupabase();
			supabase._mocks.mockMaybeSingle.mockResolvedValue({
				data: expiredToken,
				error: null
			});

			const result = await getExerciseByShareToken(supabase, mockToken);

			expect(result.error).toBe('Token expiré');
			expect(result.data).toBeNull();
		});

		it('should return error for revoked token (is_active=false)', async () => {
			const { getExerciseByShareToken } = await import('../exercise-share-tokens');

			const revokedToken = {
				...mockShareToken,
				is_active: false
			};

			const supabase = createMockSupabase();
			supabase._mocks.mockMaybeSingle.mockResolvedValue({
				data: revokedToken,
				error: null
			});

			const result = await getExerciseByShareToken(supabase, mockToken);

			expect(result.error).toBe('Token révoqué');
			expect(result.data).toBeNull();
		});
	});

	describe('recordTokenAccess', () => {
		it('should increment access_count and update last_accessed_at', async () => {
			const { recordTokenAccess } = await import('../exercise-share-tokens');

			const supabase = createMockSupabase();
			supabase._mocks.mockEq.mockResolvedValue({
				data: { access_count: 1 },
				error: null
			});

			// Should not throw
			await expect(recordTokenAccess(supabase, mockToken)).resolves.not.toThrow();
		});

		it('should handle database errors gracefully', async () => {
			const { recordTokenAccess } = await import('../exercise-share-tokens');

			const supabase = createMockSupabase();
			supabase._mocks.mockEq.mockResolvedValue({
				data: null,
				error: { message: 'Database error' }
			});

			// Should not throw even on error (fire-and-forget operation)
			await expect(recordTokenAccess(supabase, mockToken)).resolves.not.toThrow();
		});
	});

	describe('revokeShareToken', () => {
		it('should set is_active=false for a token owned by the user', async () => {
			const { revokeShareToken } = await import('../exercise-share-tokens');

			const supabase = createMockSupabase();
			supabase._mocks.mockSingle.mockResolvedValue({
				data: { ...mockShareToken, is_active: false },
				error: null
			});

			const result = await revokeShareToken(supabase, mockTokenId, mockTeacherId);

			expect(result.error).toBeNull();
		});

		it('should return error if token does not exist', async () => {
			const { revokeShareToken } = await import('../exercise-share-tokens');

			const supabase = createMockSupabase();
			supabase._mocks.mockSingle.mockResolvedValue({
				data: null,
				error: { message: 'Token not found', code: 'PGRST116' }
			});

			const result = await revokeShareToken(supabase, 'non-existent-id', mockTeacherId);

			expect(result.error).not.toBeNull();
		});

		it('should return error if user does not own the token', async () => {
			const { revokeShareToken } = await import('../exercise-share-tokens');

			const supabase = createMockSupabase();
			supabase._mocks.mockSingle.mockResolvedValue({
				data: null,
				error: { message: 'RLS policy violation', code: '42501' }
			});

			const result = await revokeShareToken(supabase, mockTokenId, 'other-user-id');

			expect(result.error).not.toBeNull();
		});
	});

	describe('getExerciseShareTokens', () => {
		it('should return all tokens for an exercise owned by the user', async () => {
			const { getExerciseShareTokens } = await import('../exercise-share-tokens');

			const tokens = [
				mockShareToken,
				{ ...mockShareToken, id: 'other-token-id', token: 'OtherToken123456' }
			];

			const supabase = createMockSupabase();
			supabase._mocks.mockOrder.mockResolvedValue({
				data: tokens,
				error: null
			});

			const result = await getExerciseShareTokens(supabase, mockExerciseId);

			expect(result.error).toBeNull();
			expect(result.data).toHaveLength(2);
		});

		it('should return empty array if no tokens exist', async () => {
			const { getExerciseShareTokens } = await import('../exercise-share-tokens');

			const supabase = createMockSupabase();
			supabase._mocks.mockOrder.mockResolvedValue({
				data: [],
				error: null
			});

			const result = await getExerciseShareTokens(supabase, mockExerciseId);

			expect(result.error).toBeNull();
			expect(result.data).toHaveLength(0);
		});

		it('should return error if user does not own the exercise', async () => {
			const { getExerciseShareTokens } = await import('../exercise-share-tokens');

			const supabase = createMockSupabase();
			supabase._mocks.mockOrder.mockResolvedValue({
				data: null,
				error: { message: 'RLS policy violation' }
			});

			const result = await getExerciseShareTokens(supabase, mockExerciseId);

			expect(result.error).not.toBeNull();
		});
	});

	describe('validateShareToken', () => {
		it('should return valid=true for active non-expired token matching exercise', async () => {
			const { validateShareToken } = await import('../exercise-share-tokens');

			const supabase = createMockSupabase();
			supabase._mocks.mockMaybeSingle.mockResolvedValue({
				data: mockShareToken,
				error: null
			});

			const result = await validateShareToken(supabase, mockToken, mockExerciseId);

			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('should return valid=false for token belonging to different exercise', async () => {
			const { validateShareToken } = await import('../exercise-share-tokens');

			const supabase = createMockSupabase();
			supabase._mocks.mockMaybeSingle.mockResolvedValue({
				data: mockShareToken,
				error: null
			});

			const result = await validateShareToken(supabase, mockToken, 'different-exercise-id');

			expect(result.valid).toBe(false);
			expect(result.error).toBe('Token invalide pour cet exercice');
		});

		it('should return valid=false with specific error for expired token', async () => {
			const { validateShareToken } = await import('../exercise-share-tokens');

			const expiredToken = {
				...mockShareToken,
				expires_at: '2023-01-01T00:00:00Z'
			};

			const supabase = createMockSupabase();
			supabase._mocks.mockMaybeSingle.mockResolvedValue({
				data: expiredToken,
				error: null
			});

			const result = await validateShareToken(supabase, mockToken, mockExerciseId);

			expect(result.valid).toBe(false);
			expect(result.error).toBe('Token expiré');
		});

		it('should return valid=false with specific error for revoked token', async () => {
			const { validateShareToken } = await import('../exercise-share-tokens');

			const revokedToken = {
				...mockShareToken,
				is_active: false
			};

			const supabase = createMockSupabase();
			supabase._mocks.mockMaybeSingle.mockResolvedValue({
				data: revokedToken,
				error: null
			});

			const result = await validateShareToken(supabase, mockToken, mockExerciseId);

			expect(result.valid).toBe(false);
			expect(result.error).toBe('Token révoqué');
		});
	});

	describe('generateShareToken (utility)', () => {
		it('should generate 16-character alphanumeric tokens', async () => {
			const { generateShareTokenString } = await import('../exercise-share-tokens');

			const token = generateShareTokenString();

			expect(token).toHaveLength(16);
			expect(token).toMatch(/^[A-Za-z0-9]+$/);
		});

		it('should exclude ambiguous characters (0, O, l, I)', async () => {
			const { generateShareTokenString } = await import('../exercise-share-tokens');

			// Generate many tokens and check none contain ambiguous chars
			for (let i = 0; i < 100; i++) {
				const token = generateShareTokenString();
				expect(token).not.toMatch(/[0OlI]/);
			}
		});

		it('should generate unique tokens on each call', async () => {
			const { generateShareTokenString } = await import('../exercise-share-tokens');

			const tokens = new Set<string>();
			for (let i = 0; i < 100; i++) {
				tokens.add(generateShareTokenString());
			}

			// All 100 should be unique
			expect(tokens.size).toBe(100);
		});
	});
});
