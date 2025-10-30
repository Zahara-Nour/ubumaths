/**
 * Server-Side Authentication and Authorization Utilities
 * ======================================================
 *
 * This module provides the core authorization logic for the role-based dashboard system.
 * It works in conjunction with the Supabase authentication system to provide role-based
 * access control (RBAC) for protected routes.
 *
 * ROLE-BASED DASHBOARD ARCHITECTURE:
 * -----------------------------------
 * 1. User authenticates via Supabase (session verified in hooks.server.ts)
 * 2. Profile is fetched from database (contains role: 'student' | 'teacher' | 'admin')
 * 3. Dashboard routes use these utilities to enforce access control
 * 4. Different dashboard views are rendered based on user role
 *
 * AVAILABLE ROLES:
 * ----------------
 * - 'student': Can view their own progress, assignments, and classes
 * - 'teacher': Can manage classes, create assignments, and view student progress
 * - 'admin': Full system access, user management, and platform settings
 *
 * SECURITY PATTERN:
 * -----------------
 * - All checks happen SERVER-SIDE in +layout.server.ts or +page.server.ts files
 * - User role comes from database 'profiles' table (not from client or JWT)
 * - SvelteKit's load functions throw redirects/errors to enforce access control
 * - Client components receive verified role data via props
 *
 * USAGE EXAMPLES:
 * ---------------
 * See /dashboard route for complete implementation examples
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Profile, UserRole } from '$lib/types/database';
import { error, redirect } from '@sveltejs/kit';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('server/auth.ts');

/**
 * Get the user's profile from the database
 *
 * Fetches the complete profile record for an authenticated user, including their role.
 * This is the PRIMARY source of truth for user roles in the application.
 *
 * ROLE-BASED DASHBOARD PATTERN:
 * The profile contains the 'role' field ('student' | 'teacher' | 'admin') which
 * determines what dashboard view and features the user has access to.
 *
 * @param supabase - The Supabase client instance (from event.locals.supabase)
 * @param userId - The authenticated user's ID (from session.user.id)
 * @returns Profile object with role, or null if not found
 *
 * @example
 * ```typescript
 * // In +layout.server.ts or +page.server.ts
 * const { user } = await safeGetSession();
 * const profile = await getUserProfile(supabase, user.id);
 *
 * // Profile contains:
 * // - id: string
 * // - email: string
 * // - full_name: string | null
 * // - role: 'student' | 'teacher' | 'admin'  <- Used for dashboard routing
 * // - created_at, updated_at: timestamps
 * ```
 */
export async function getUserProfile(
	supabase: SupabaseClient<Database>,
	userId: string
): Promise<Profile | null> {
	try {
		// Add 3-second timeout to prevent hanging on slow database queries
		const profilePromise = supabase.from('profiles').select('*').eq('id', userId).single();

		const timeoutPromise = new Promise<never>((_, reject) =>
			setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
		);

		// Query the profiles table for this user's record (with timeout)
		const { data, error: err } = await Promise.race([profilePromise, timeoutPromise]);

		if (err) {
			logger.error('Error fetching user profile:', err);
			return null;
		}

		// Return the profile with role information
		return data;
	} catch (error) {
		logger.error('Timeout or error fetching user profile:', error);
		return null;
	}
}

/**
 * Require authentication - redirects to login if user is not authenticated
 *
 * This is the FIRST line of defense for protected routes. It ensures that only
 * authenticated users can access certain pages.
 *
 * WHEN TO USE:
 * Call this in +layout.server.ts or +page.server.ts for any route that requires login.
 * For the dashboard, this is called in /dashboard/+layout.server.ts to protect all
 * dashboard routes at once.
 *
 * @param user - User object from safeGetSession() (contains at minimum an id)
 * @throws {redirect} 303 redirect to /login if user is null/undefined
 *
 * @example
 * ```typescript
 * // In /dashboard/+layout.server.ts
 * export const load = async ({ locals: { safeGetSession } }) => {
 *   const { user } = await safeGetSession();
 *
 *   // Protect all dashboard routes - redirect to login if not authenticated
 *   requireAuth(user);
 *
 *   // User is authenticated, continue...
 * };
 * ```
 */
export function requireAuth(user: { id: string } | null) {
	if (!user) {
		// User is not authenticated - redirect to login page
		// 303 status ensures a GET request is made to /auth/login
		throw redirect(303, '/auth/login');
	}
}

/**
 * Require specific role(s) - throws 403 error if user doesn't have required role
 *
 * This is the SECOND line of defense for role-based access control. Use this when
 * specific routes should only be accessible to certain roles (e.g., teacher-only pages).
 *
 * ROLE-BASED DASHBOARD USE CASES:
 * - Require 'teacher' role for /dashboard/classes (managing classes)
 * - Require 'admin' role for /dashboard/admin (system settings)
 * - Require ['teacher', 'admin'] for /dashboard/exercises/create
 *
 * NOTE: The main /dashboard route doesn't use this - it renders different views
 * based on role instead of blocking access.
 *
 * @param profile - User's profile from getUserProfile() (contains role)
 * @param allowedRoles - Single role or array of roles that are allowed
 * @throws {error} 403 Forbidden - Thrown in two cases:
 *   - "Access denied: No profile found" if profile is null (user not properly initialized)
 *   - "Access denied: This page requires {role} role" if user's role is not in allowedRoles
 *   SvelteKit's error() function returns a 403 HTTP response that navigates to error page
 *
 * @example
 * ```typescript
 * // Require teacher role only
 * requireRole(profile, 'teacher');
 *
 * // Allow either teacher or admin
 * requireRole(profile, ['teacher', 'admin']);
 *
 * // In a +page.server.ts that should only be accessed by teachers:
 * export const load = async ({ parent }) => {
 *   const { profile } = await parent(); // Get from parent layout
 *   requireRole(profile, 'teacher'); // Block non-teachers with 403
 *
 *   // Only teachers reach this point
 *   return { teacherData: ... };
 * };
 * ```
 *
 * ERROR BEHAVIOR:
 * When authorization fails, SvelteKit throws a 403 Forbidden error that:
 * - Halts execution and prevents the rest of the load function from running
 * - Automatically redirects the user to +error.svelte with the error message
 * - Returns an HTTP 403 status to the client
 * - The user sees a generic "Access Denied" error page with the error message
 */
export function requireRole(profile: Profile | null, allowedRoles: UserRole | UserRole[]) {
	// Check if profile exists
	if (!profile) {
		throw error(403, 'Access denied: No profile found');
	}

	// Normalize to array for consistent checking
	const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

	// Check if user's role is in the allowed list
	if (!roles.includes(profile.role)) {
		throw error(403, `Access denied: This page requires ${roles.join(' or ')} role`);
	}

	// User has required role, continue
}

/**
 * Check if user has a specific role (non-throwing helper)
 *
 * Use this for conditional rendering or logic that doesn't need to block access.
 * Unlike requireRole(), this doesn't throw an error - it just returns true/false.
 *
 * ROLE-BASED DASHBOARD USE CASE:
 * Used in components to show/hide features based on role.
 *
 * @param profile - User's profile (can be null)
 * @param role - The role to check for
 * @returns true if user has the exact role, false otherwise
 *
 * @example
 * ```typescript
 * // In a Svelte component
 * {#if hasRole(data.profile, 'teacher')}
 *   <button>Create Assignment</button>
 * {/if}
 * ```
 */
export function hasRole(profile: Profile | null, role: UserRole): boolean {
	return profile?.role === role;
}

/**
 * Check if user has any of the specified roles (non-throwing helper)
 *
 * Similar to hasRole() but checks against multiple roles. Useful for features
 * that should be available to multiple role types.
 *
 * ROLE-BASED DASHBOARD USE CASE:
 * Show "Create Exercise" button to both teachers and admins.
 *
 * @param profile - User's profile (can be null)
 * @param roles - Array of roles to check against
 * @returns true if user has any of the roles, false otherwise
 *
 * @example
 * ```typescript
 * // Show admin features to both teachers and admins
 * {#if hasAnyRole(data.profile, ['teacher', 'admin'])}
 *   <button>Advanced Settings</button>
 * {/if}
 * ```
 */
export function hasAnyRole(profile: Profile | null, roles: UserRole[]): boolean {
	if (!profile) return false;
	return roles.includes(profile.role);
}
