/**
 * Mock Supabase Client Type Utilities
 * ====================================
 *
 * Provides type-safe mock implementations for Supabase client in tests.
 * This file helps avoid TypeScript errors when mocking Supabase query builder methods.
 */

import type { SupabaseClient as _SupabaseClient } from '@supabase/supabase-js';
import type { Database as _Database } from '$lib/types/database';

/**
 * Mock query builder that includes all common Supabase query methods
 */
export interface MockQueryBuilder<T = unknown> {
	select: (columns?: string) => MockQueryBuilder<T>;
	insert: (data: unknown) => MockQueryBuilder<T>;
	update: (data: unknown) => MockQueryBuilder<T>;
	delete: () => MockQueryBuilder<T>;
	eq: (column: string, value: unknown) => MockQueryBuilder<T>;
	neq: (column: string, value: unknown) => MockQueryBuilder<T>;
	in: (column: string, values: unknown[]) => MockQueryBuilder<T>;
	is: (column: string, value: unknown) => MockQueryBuilder<T>;
	order: (column: string, options?: { ascending?: boolean }) => MockQueryBuilder<T>;
	range: (from: number, to: number) => MockQueryBuilder<T>;
	limit: (count: number) => MockQueryBuilder<T>;
	single: () => Promise<{ data: T | null; error: unknown }>;
	maybeSingle: () => Promise<{ data: T | null; error: unknown }>;
	then: (
		onfulfilled?: ((value: { data: T[] | null; error: unknown }) => unknown) | null,
		onrejected?: ((reason: unknown) => unknown) | null
	) => Promise<unknown>;
}

/**
 * Mock Supabase Client with query builder methods
 *
 * Note: We intentionally do NOT extend SupabaseClient to avoid type conflicts.
 * In tests, cast the mock as `any` when assigning to Locals.supabase.
 */
export interface MockSupabaseClient {
	from: <T = unknown>(table: string) => MockQueryBuilder<T>;
	rpc: (fn: string, params?: unknown) => Promise<{ data: unknown; error: unknown }>;
}

/**
 * Create a mock query builder for testing
 */
export function createMockQueryBuilder<T = unknown>(): MockQueryBuilder<T> {
	const builder: MockQueryBuilder<T> = {
		select: () => builder,
		insert: () => builder,
		update: () => builder,
		delete: () => builder,
		eq: () => builder,
		neq: () => builder,
		in: () => builder,
		is: () => builder,
		order: () => builder,
		range: () => builder,
		limit: () => builder,
		single: async () => ({ data: null, error: null }),
		maybeSingle: async () => ({ data: null, error: null }),
		then: async (onfulfilled) => {
			const result = { data: null, error: null };
			return onfulfilled ? onfulfilled(result) : result;
		}
	};
	return builder;
}
