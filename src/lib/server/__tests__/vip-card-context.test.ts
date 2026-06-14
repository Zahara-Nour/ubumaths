/**
 * VIP Card Activation Context Validator - Unit Tests
 * ===================================================
 *
 * Tests for validateActivationContext function.
 * Uses mocked Supabase client.
 */

import { describe, it, expect, vi } from 'vitest';
import { validateActivationContext } from '../vip-card-context';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

/** Create a mock Supabase client with configurable query results */
function createMockSupabase(queryResult: { data: unknown[] | null; error: unknown | null }) {
	const mockLimit = vi.fn().mockResolvedValue(queryResult);
	const mockEqStatus = vi.fn().mockReturnValue({ limit: mockLimit });
	const mockEqStudent = vi.fn().mockReturnValue({ eq: mockEqStatus });
	const mockSelect = vi.fn().mockReturnValue({ eq: mockEqStudent });
	const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

	return {
		from: mockFrom,
		mockFrom,
		mockSelect
	} as unknown as SupabaseClient<Database>;
}

describe('validateActivationContext', () => {
	const studentId = '00000000-0000-0000-0000-000000000001';

	describe('context: "any"', () => {
		it('should always return true', async () => {
			const supabase = createMockSupabase({ data: [], error: null });
			const result = await validateActivationContext('any', supabase, studentId);
			expect(result).toBe(true);
		});

		it('should not query the database', async () => {
			const supabase = createMockSupabase({ data: [], error: null });
			await validateActivationContext('any', supabase, studentId);
			// "any" validator should not call supabase.from()
			expect(supabase.from).not.toHaveBeenCalled();
		});
	});

	describe('context: "minesweeper"', () => {
		it('should return true when student has an in-progress game', async () => {
			const supabase = createMockSupabase({
				data: [{ id: 'game-1' }],
				error: null
			});
			const result = await validateActivationContext('minesweeper', supabase, studentId);
			expect(result).toBe(true);
		});

		it('should return false when student has no in-progress game', async () => {
			const supabase = createMockSupabase({
				data: [],
				error: null
			});
			const result = await validateActivationContext('minesweeper', supabase, studentId);
			expect(result).toBe(false);
		});

		it('should return false when query returns null data', async () => {
			const supabase = createMockSupabase({
				data: null,
				error: null
			});
			const result = await validateActivationContext('minesweeper', supabase, studentId);
			expect(result).toBe(false);
		});

		it('should query minesweeper_games table', async () => {
			const supabase = createMockSupabase({ data: [], error: null });
			await validateActivationContext('minesweeper', supabase, studentId);
			expect(supabase.from).toHaveBeenCalledWith('minesweeper_games');
		});
	});

	describe('unknown context', () => {
		it('should return false for unknown context values', async () => {
			const supabase = createMockSupabase({ data: [], error: null });
			const result = await validateActivationContext('unknown_context', supabase, studentId);
			expect(result).toBe(false);
		});

		it('should return false for empty string context', async () => {
			const supabase = createMockSupabase({ data: [], error: null });
			const result = await validateActivationContext('', supabase, studentId);
			expect(result).toBe(false);
		});
	});
});
