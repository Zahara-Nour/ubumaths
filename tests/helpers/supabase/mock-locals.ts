/**
 * Mock Locals Factory
 * ===================
 *
 * Creates mock SvelteKit locals objects for API route and page server tests.
 * Handles both authenticated and unauthenticated cases with proper types.
 *
 * @example
 * ```typescript
 * // Authenticated user
 * const locals = createMockLocals('user-123');
 *
 * // Authenticated teacher
 * const teacherLocals = createMockLocals('teacher-456', undefined, 'teacher');
 *
 * // Unauthenticated
 * const anonLocals = createMockLocals();
 *
 * // With custom Supabase mock
 * const supabase = createMockSupabase();
 * const customLocals = createMockLocals('user-789', supabase);
 * ```
 */

import { vi } from 'vitest';
import { createMockSupabase, type MockSupabaseClient } from './mock-client';
import { type ProfileRole } from '../fixtures/profiles';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** User role type - re-exported from fixtures for compatibility */
export type UserRole = ProfileRole;

/**
 * Mock user object structure
 */
export interface MockUser {
	id: string;
	email?: string;
	app_metadata?: Record<string, unknown>;
	user_metadata?: Record<string, unknown>;
}

/**
 * Mock profile object structure matching profiles table
 */
export interface MockProfile {
	id: string;
	role: UserRole;
	firstname?: string;
	lastname?: string;
	email?: string;
	is_test?: boolean;
}

/**
 * Mock session object structure
 */
export interface MockSession {
	access_token: string;
	refresh_token?: string;
	expires_in?: number;
	expires_at?: number;
	token_type?: string;
	user?: MockUser;
}

/**
 * Safe get session result type
 */
export interface SafeGetSessionResult {
	user: MockUser | null;
	session: MockSession | null;
}

/** Mock function type for safeGetSession */
type SafeGetSessionMock = ReturnType<typeof vi.fn> & {
	(): Promise<SafeGetSessionResult>;
};

/**
 * Mock locals object structure matching App.Locals
 */
export interface MockLocals {
	user: MockUser | null;
	profile?: MockProfile | null;
	supabase: MockSupabaseClient;
	session?: MockSession | null;
	safeGetSession: SafeGetSessionMock;
}

// ============================================================================
// MOCK LOCALS FACTORY
// ============================================================================

/**
 * Creates a mock locals object for API route and page server tests.
 *
 * @param userId - Optional user ID for authenticated state. If undefined, creates unauthenticated locals.
 * @param supabase - Optional pre-configured mock Supabase client. Creates new one if not provided.
 * @param role - Optional user role. Defaults to 'student'.
 *
 * @returns Mock locals object with user, safeGetSession, and supabase
 *
 * @example
 * ```typescript
 * // Test authenticated student
 * const locals = createMockLocals('student-123');
 * expect(locals.user?.id).toBe('student-123');
 *
 * // Test authenticated teacher
 * const teacherLocals = createMockLocals('teacher-456', undefined, 'teacher');
 * expect(teacherLocals.profile?.role).toBe('teacher');
 *
 * // Test unauthenticated
 * const anonLocals = createMockLocals();
 * expect(anonLocals.user).toBeNull();
 *
 * // Test with configured Supabase mock
 * const supabase = createMockSupabase();
 * supabase._mockChain.single.mockResolvedValueOnce({
 *   data: { id: '123' },
 *   error: null
 * });
 * const customLocals = createMockLocals('user-789', supabase);
 * ```
 */
export function createMockLocals(
	userId?: string,
	supabase?: MockSupabaseClient,
	role: UserRole = 'student'
): MockLocals {
	const mockSupabase = supabase ?? createMockSupabase();

	if (userId) {
		// Authenticated state
		const user: MockUser = {
			id: userId,
			email: `${role}@voltairedoha.com`,
			app_metadata: {},
			user_metadata: {}
		};

		const profile: MockProfile = {
			id: userId,
			role,
			firstname: role.charAt(0).toUpperCase() + role.slice(1),
			lastname: 'User',
			email: `${role}@voltairedoha.com`,
			is_test: false
		};

		const session: MockSession = {
			access_token: `mock-token-${userId}`,
			refresh_token: `mock-refresh-${userId}`,
			expires_in: 3600,
			expires_at: Math.floor(Date.now() / 1000) + 3600,
			token_type: 'bearer',
			user
		};

		return {
			user,
			profile,
			supabase: mockSupabase,
			session,
			safeGetSession: vi.fn().mockResolvedValue({
				user,
				session
			})
		};
	}

	// Unauthenticated state
	return {
		user: null,
		profile: null,
		supabase: mockSupabase,
		session: null,
		safeGetSession: vi.fn().mockResolvedValue({
			user: null,
			session: null
		})
	};
}

// ============================================================================
// SPECIALIZED MOCK LOCALS FACTORIES
// ============================================================================

/**
 * Creates mock locals for an authenticated student
 *
 * @param studentId - Student user ID
 * @param supabase - Optional pre-configured mock Supabase client
 */
export function createStudentLocals(studentId: string, supabase?: MockSupabaseClient): MockLocals {
	return createMockLocals(studentId, supabase, 'student');
}

/**
 * Creates mock locals for an authenticated teacher
 *
 * @param teacherId - Teacher user ID
 * @param supabase - Optional pre-configured mock Supabase client
 */
export function createTeacherLocals(teacherId: string, supabase?: MockSupabaseClient): MockLocals {
	return createMockLocals(teacherId, supabase, 'teacher');
}

/**
 * Creates mock locals for an authenticated admin
 *
 * @param adminId - Admin user ID
 * @param supabase - Optional pre-configured mock Supabase client
 */
export function createAdminLocals(adminId: string, supabase?: MockSupabaseClient): MockLocals {
	return createMockLocals(adminId, supabase, 'admin');
}

/**
 * Creates mock locals for an unauthenticated user
 *
 * @param supabase - Optional pre-configured mock Supabase client
 */
export function createUnauthenticatedLocals(supabase?: MockSupabaseClient): MockLocals {
	return createMockLocals(undefined, supabase);
}

// ============================================================================
// LOCALS CONFIGURATION HELPERS
// ============================================================================

/**
 * Configure mock locals with a custom profile
 *
 * @param locals - Mock locals to configure
 * @param profile - Partial profile data to merge
 *
 * @example
 * ```typescript
 * const locals = createMockLocals('user-123');
 * configureLocalsProfile(locals, {
 *   firstname: 'Alice',
 *   lastname: 'Smith',
 *   is_test: true
 * });
 * ```
 */
export function configureLocalsProfile(locals: MockLocals, profile: Partial<MockProfile>): void {
	if (locals.profile) {
		locals.profile = { ...locals.profile, ...profile };
	} else if (locals.user) {
		locals.profile = {
			id: locals.user.id,
			role: 'student',
			...profile
		};
	}
}

/**
 * Configure mock locals to simulate session expiry
 *
 * @param locals - Mock locals to configure
 */
export function configureSessionExpired(locals: MockLocals): void {
	if (locals.session) {
		locals.session = {
			...locals.session,
			expires_at: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
		};
	}
	locals.safeGetSession.mockResolvedValue({
		user: null,
		session: null
	});
}

/**
 * Configure mock locals with a test user flag
 *
 * @param locals - Mock locals to configure
 */
export function configureTestUser(locals: MockLocals): void {
	if (locals.profile) {
		locals.profile.is_test = true;
	}
}
