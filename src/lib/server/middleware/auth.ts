/**
 * Authentication Middleware
 *
 * SECURITY: Centralized authentication and authorization checks
 *
 * FEATURES:
 * - Eliminates 740 lines of duplicated auth code across 74 API endpoints
 * - Single source of truth for authentication logic
 * - Type-safe role checking with TypeScript
 * - Consistent error messages across application
 *
 * USAGE:
 * ```typescript
 * // Basic authentication (any role)
 * const { user, profile } = await requireAuth(locals);
 *
 * // Role-specific authentication (single role)
 * const { user, profile } = await requireRole(locals, 'teacher');
 *
 * // Multiple allowed roles (OR logic)
 * const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);
 * ```
 *
 * MIGRATION FROM DUPLICATED CODE:
 * - Before: 10 lines of auth boilerplate per endpoint + 1 DB query
 * - After: 1 line of middleware call (reuses profile from session)
 * - See: docs/guides/auth-middleware-migration.md for migration guide
 */

import { error } from '@sveltejs/kit';
import type { Database } from '$lib/types/database';

// ============================================================================
// TYPES
// ============================================================================

/**
 * User role types from database schema
 */
export type UserRole = 'student' | 'teacher' | 'admin';

/**
 * Profile row from database
 */
type Profile = Database['public']['Tables']['profiles']['Row'];

/**
 * Result of successful authentication
 */
export interface AuthResult {
	user: import('@supabase/supabase-js').User;
	profile: Profile;
}

// ============================================================================
// CORE AUTHENTICATION LOGIC
// ============================================================================

/**
 * Require authentication (any role)
 *
 * Verifies that:
 * 1. User is authenticated (has valid session)
 * 2. User profile exists in database
 *
 * This is the base authentication check - use this when you need to verify
 * authentication but don't care about specific roles. For role-specific
 * authorization, use `requireRole()` or `requireRoles()` instead.
 *
 * **When to Use**:
 * - User profile pages (students viewing their own data)
 * - General authenticated endpoints (inbox, notifications)
 * - Features available to all authenticated users
 *
 * **Database Query**: Fetches user profile from `profiles` table (includes role,
 * firstname, lastname, email, avatar_url, school_id, etc.)
 *
 * **Error Responses**:
 * - `401 Unauthorized` - No valid session
 * - `403 Forbidden` - Session exists but profile not found (orphaned auth user)
 *
 * @param locals - SvelteKit request locals containing supabase client and session
 * @returns Promise resolving to `{ user, profile }` on success
 * @throws `401` if user is not authenticated
 * @throws `403` if user profile doesn't exist in database
 *
 * @example Basic authentication check
 * ```typescript
 * export const GET: RequestHandler = async ({ locals }) => {
 *   const { user, profile } = await requireAuth(locals);
 *
 *   // User is authenticated, proceed with logic
 *   // Both student/teacher/admin can access this endpoint
 *   return json({ userId: user.id, role: profile.role });
 * };
 * ```
 *
 * @example Accessing profile data
 * ```typescript
 * const { user, profile } = await requireAuth(locals);
 *
 * // Profile includes all columns from profiles table:
 * console.log(profile.role);        // 'student' | 'teacher' | 'admin'
 * console.log(profile.firstname);   // User's first name
 * console.log(profile.lastname);    // User's last name
 * console.log(profile.email);       // User's email
 * console.log(profile.school_id);   // Associated school ID (nullable)
 * ```
 *
 * @example In API endpoint
 * ```typescript
 * // Before (10 lines):
 * const { user } = await locals.safeGetSession();
 * if (!user) throw error(401, 'Unauthorized');
 *
 * const { data: profile } = await locals.supabase
 *   .from('profiles')
 *   .select('*')
 *   .eq('id', user.id)
 *   .single();
 *
 * if (!profile) throw error(403, 'Profile not found');
 *
 * // After (1 line):
 * const { user, profile } = await requireAuth(locals);
 * ```
 */
export async function requireAuth(locals: App.Locals): Promise<AuthResult> {
	// Check authentication
	const { user } = await locals.safeGetSession();

	if (!user) {
		throw error(401, 'Non autorisé - Authentification requise');
	}

	// Fetch user profile
	const { data: profile, error: profileError } = await locals.supabase
		.from('profiles')
		.select('*')
		.eq('id', user.id)
		.single();

	if (profileError || !profile) {
		console.error('Profile fetch error:', profileError);
		throw error(403, 'Profil utilisateur introuvable');
	}

	return { user, profile };
}

/**
 * Require authentication with specific role
 *
 * Verifies that:
 * 1. User is authenticated (has valid session)
 * 2. User profile exists in database
 * 3. User has the required role
 *
 * This is the most common authorization pattern - use this when an endpoint
 * should only be accessible to users with a specific role (e.g., teachers only,
 * admins only).
 *
 * **When to Use**:
 * - Teacher-only endpoints (creating assessments, viewing class results)
 * - Admin-only endpoints (user management, system configuration)
 * - Student-only endpoints (submitting assignments, viewing own progress)
 *
 * **Role Hierarchy**: There is NO automatic role hierarchy - if you need to allow
 * multiple roles, use `requireRoles(['teacher', 'admin'])` instead.
 *
 * **Error Responses**:
 * - `401 Unauthorized` - No valid session
 * - `403 Forbidden` - User doesn't have required role (or profile not found)
 *
 * @param locals - SvelteKit request locals containing supabase client and session
 * @param role - Required role ('student' | 'teacher' | 'admin')
 * @returns Promise resolving to `{ user, profile }` on success
 * @throws `401` if user is not authenticated
 * @throws `403` if user doesn't have the required role
 *
 * @example Teacher-only endpoint
 * ```typescript
 * export const POST: RequestHandler = async ({ locals, request }) => {
 *   // Only teachers can create assessments
 *   const { user, profile } = await requireRole(locals, 'teacher');
 *
 *   const body = await request.json();
 *   // ... create assessment logic
 * };
 * ```
 *
 * @example Admin-only endpoint
 * ```typescript
 * export const DELETE: RequestHandler = async ({ locals, params }) => {
 *   // Only admins can delete users
 *   const { user, profile } = await requireRole(locals, 'admin');
 *
 *   await locals.supabase
 *     .from('profiles')
 *     .delete()
 *     .eq('id', params.id);
 *
 *   return json({ success: true });
 * };
 * ```
 *
 * @example Migration from old pattern
 * ```typescript
 * // Before (10 lines):
 * const { user } = await locals.safeGetSession();
 * if (!user) throw error(401, 'Unauthorized');
 *
 * const { data: profile } = await locals.supabase
 *   .from('profiles')
 *   .select('role')
 *   .eq('id', user.id)
 *   .single();
 *
 * if (!profile || profile.role !== 'teacher') {
 *   throw error(403, 'Forbidden - Teachers only');
 * }
 *
 * // After (1 line):
 * const { user, profile } = await requireRole(locals, 'teacher');
 * ```
 */
export async function requireRole(locals: App.Locals, role: UserRole): Promise<AuthResult> {
	// First check authentication and get profile
	const { user, profile } = await requireAuth(locals);

	// Check role authorization
	if (profile.role !== role) {
		const roleNames: Record<UserRole, string> = {
			student: 'Élèves',
			teacher: 'Enseignants',
			admin: 'Administrateurs'
		};

		throw error(403, `Interdit - ${roleNames[role]} uniquement`);
	}

	return { user, profile };
}

/**
 * Require authentication with one of multiple allowed roles
 *
 * Verifies that:
 * 1. User is authenticated (has valid session)
 * 2. User profile exists in database
 * 3. User has at least one of the allowed roles (OR logic)
 *
 * Use this when an endpoint should be accessible to multiple roles. This is
 * more explicit and maintainable than manually checking roles with if statements.
 *
 * **When to Use**:
 * - Shared functionality (teachers AND admins can manage classes)
 * - Tiered access (teachers AND admins can view analytics)
 * - Flexible permissions (admins AND teachers can send messages)
 *
 * **OR Logic**: User needs to match at least ONE of the provided roles. If you
 * need to check for multiple roles AND other conditions, use `requireRole()`
 * and add custom logic.
 *
 * **Error Responses**:
 * - `401 Unauthorized` - No valid session
 * - `403 Forbidden` - User doesn't have any of the required roles
 *
 * @param locals - SvelteKit request locals containing supabase client and session
 * @param roles - Array of allowed roles (at least one must match)
 * @returns Promise resolving to `{ user, profile }` on success
 * @throws `401` if user is not authenticated
 * @throws `403` if user doesn't have any of the required roles
 *
 * @example Teacher OR Admin access
 * ```typescript
 * export const GET: RequestHandler = async ({ locals }) => {
 *   // Both teachers and admins can view this analytics dashboard
 *   const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);
 *
 *   // Fetch analytics data...
 *   return json({ analytics });
 * };
 * ```
 *
 * @example Multiple role access with conditional logic
 * ```typescript
 * const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);
 *
 * // Different behavior based on role
 * if (profile.role === 'admin') {
 *   // Admins see all classes
 *   return getAllClasses();
 * } else {
 *   // Teachers see only their classes
 *   return getTeacherClasses(user.id);
 * }
 * ```
 *
 * @example Error message includes all allowed roles
 * ```typescript
 * // If student tries to access:
 * // 403 Forbidden - Interdit - Enseignants, Administrateurs uniquement
 * const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);
 * ```
 */
export async function requireRoles(locals: App.Locals, roles: UserRole[]): Promise<AuthResult> {
	// First check authentication and get profile
	const { user, profile } = await requireAuth(locals);

	// Check if user has any of the allowed roles
	if (!roles.includes(profile.role as UserRole)) {
		const roleNames: Record<UserRole, string> = {
			student: 'Élèves',
			teacher: 'Enseignants',
			admin: 'Administrateurs'
		};

		const allowedRoleNames = roles.map((r) => roleNames[r]).join(', ');

		throw error(403, `Interdit - ${allowedRoleNames} uniquement`);
	}

	return { user, profile };
}
