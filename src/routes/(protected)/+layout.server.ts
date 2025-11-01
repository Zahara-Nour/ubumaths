/**
 * Protected Routes Layout Server Load Function
 * ============================================
 *
 * This layout protects ALL routes under the (protected) route group.
 * Any route in src/routes/(protected)/* will automatically require authentication.
 *
 * ROUTE GROUP PATTERN:
 * -------------------
 * - Parentheses in folder names create "layout groups" in SvelteKit
 * - They don't affect the URL structure
 * - Example: (protected)/dashboard/+page.svelte → /dashboard (not /protected/dashboard)
 * - But they DO share the same layout
 *
 * AUTHENTICATION:
 * --------------
 * This layout runs BEFORE any child route loads, ensuring:
 * 1. User is authenticated (redirects to /login if not)
 * 2. User has a valid profile in the database
 * 3. Profile data (including role) is available to all child routes
 *
 * PROTECTED ROUTES:
 * ----------------
 * - /dashboard - Main dashboard (role-based views)
 * - /dashboard/classes - Class management (teachers)
 * - /dashboard/admin - Admin panel (admins only)
 * - Any future routes added to (protected)/ folder
 *
 * USAGE IN CHILD ROUTES:
 * ---------------------
 * Child routes can access authenticated user and profile via parent():
 *
 * ```typescript
 * export const load: PageServerLoad = loadMonitor.traceServerLoad(async (event) => {
	const { parent } = event;

 *   const { user, profile } = await parent();
 *   // user and profile are guaranteed to exist here
 *   // No need to call requireAuth() again!
 * };
 * ```
 *
 * SECURITY:
 * --------
 * - Runs on SERVER only (before page renders)
 * - Impossible to bypass - all child routes inherit this protection
 * - Single point of authentication for entire route group
 * - Profile data comes from database (not client/cookies)
 */

import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth';
import { createLogger } from '$lib/utils/logger';
import { loadMonitor } from '$lib/utils/loadTracer';

const logger = createLogger('(protected)/+layout.server.ts');

export const load: LayoutServerLoad = async ({ locals: { safeGetSession }, parent }) => {
	// Get the authenticated user's session
	// safeGetSession() verifies the user with Supabase auth server
	const { user } = await safeGetSession();

	// Require authentication for ALL routes in (protected) group
	// If user is null, requireAuth() throws a redirect to /login
	requireAuth(user);

	// Get profile from parent layout (root +layout.server.ts)
	// This avoids redundant database queries
	const parentData = await parent();
	const { profile } = parentData;

	// Verify profile exists
	// Every authenticated user should have a profile
	if (!profile) {
		logger.error('Profile not found for user:', user!.id);
		logger.error('This usually means:');
		logger.error('  1. User signed up but profile was not created');
		logger.error('  2. Database trigger is missing');
		logger.error('  3. Profile was deleted manually');
		throw error(
			500,
			'Your account is not fully set up. Please contact an administrator to complete your profile setup.'
		);
	}

	// Return user and profile to child routes
	// All child routes in (protected)/ can access this via parent()
	return {
		user,
		profile
	};
};
