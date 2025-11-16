/**
 * Shared Mock Supabase Client Helpers
 *
 * Provides comprehensive mock types and factory functions for Supabase client
 * to ensure consistency across all test files and eliminate TypeScript errors
 * related to missing query builder methods.
 */

import { vi } from 'vitest';
import type { SupabaseClient as _SupabaseClient } from '@supabase/supabase-js';
import type { Database as _Database } from '$lib/types/database';

/**
 * Mock query builder that includes ALL Supabase query methods
 * This prevents TypeScript errors about missing methods like .order(), .single(), etc.
 */
interface MockQueryBuilder {
	from: ReturnType<typeof vi.fn>;
	select: ReturnType<typeof vi.fn>;
	insert: ReturnType<typeof vi.fn>;
	update: ReturnType<typeof vi.fn>;
	delete: ReturnType<typeof vi.fn>;
	eq: ReturnType<typeof vi.fn>;
	neq: ReturnType<typeof vi.fn>;
	gt: ReturnType<typeof vi.fn>;
	gte: ReturnType<typeof vi.fn>;
	lt: ReturnType<typeof vi.fn>;
	lte: ReturnType<typeof vi.fn>;
	like: ReturnType<typeof vi.fn>;
	ilike: ReturnType<typeof vi.fn>;
	is: ReturnType<typeof vi.fn>;
	in: ReturnType<typeof vi.fn>;
	contains: ReturnType<typeof vi.fn>;
	containedBy: ReturnType<typeof vi.fn>;
	range: ReturnType<typeof vi.fn>;
	order: ReturnType<typeof vi.fn>;
	limit: ReturnType<typeof vi.fn>;
	single: ReturnType<typeof vi.fn>;
	maybeSingle: ReturnType<typeof vi.fn>;
	not: ReturnType<typeof vi.fn>;
	or: ReturnType<typeof vi.fn>;
	filter: ReturnType<typeof vi.fn>;
	match: ReturnType<typeof vi.fn>;
	textSearch: ReturnType<typeof vi.fn>;
	returns: ReturnType<typeof vi.fn>;
}

/**
 * Creates a comprehensive mock Supabase client with all query builder methods.
 * All methods return `this` for chainability, allowing patterns like:
 * supabase.from('table').select('*').eq('id', '123').order('created_at').single()
 *
 * The mock is returned as `any` to bypass TypeScript's strict type checking since
 * the real SupabaseClient has a complex type structure that's hard to mock accurately.
 *
 * @returns Mock Supabase client (as any to prevent type errors)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createMockSupabase(): any {
	const mock: MockQueryBuilder = {
		from: vi.fn().mockReturnThis(),
		select: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		update: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		neq: vi.fn().mockReturnThis(),
		gt: vi.fn().mockReturnThis(),
		gte: vi.fn().mockReturnThis(),
		lt: vi.fn().mockReturnThis(),
		lte: vi.fn().mockReturnThis(),
		like: vi.fn().mockReturnThis(),
		ilike: vi.fn().mockReturnThis(),
		is: vi.fn().mockReturnThis(),
		in: vi.fn().mockReturnThis(),
		contains: vi.fn().mockReturnThis(),
		containedBy: vi.fn().mockReturnThis(),
		range: vi.fn().mockReturnThis(),
		order: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		single: vi.fn(),
		maybeSingle: vi.fn(),
		not: vi.fn().mockReturnThis(),
		or: vi.fn().mockReturnThis(),
		filter: vi.fn().mockReturnThis(),
		match: vi.fn().mockReturnThis(),
		textSearch: vi.fn().mockReturnThis(),
		returns: vi.fn().mockReturnThis()
	};

	return mock;
}

/**
 * Type-safe mock for RequestEvent locals
 * Use this to create properly typed locals for test contexts
 */
export interface MockLocals {
	user: { id: string } | null;
	profile: { id: string; role: string } | null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	supabase: any;
	session: null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	safeGetSession: any;
}

/**
 * Creates a mock locals object with authenticated user
 */
export function createAuthenticatedLocals(userId: string, role: string): MockLocals {
	return {
		user: { id: userId },
		profile: { id: userId, role },
		supabase: createMockSupabase(),
		session: null,
		safeGetSession: vi.fn()
	};
}

/**
 * Creates a mock locals object for unauthenticated user
 */
export function createUnauthenticatedLocals(): MockLocals {
	return {
		user: null,
		profile: null,
		supabase: createMockSupabase(),
		session: null,
		safeGetSession: vi.fn()
	};
}
