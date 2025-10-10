/**
 * Dashboard Layout Server Load Function
 * ======================================
 *
 * This is the ENTRY POINT for the role-based dashboard system.
 * It runs on the SERVER for every request to /dashboard/* routes.
 *
 * ROLE-BASED DASHBOARD FLOW:
 * ---------------------------
 * 1. AUTHENTICATION CHECK
 *    - Verifies user is logged in (redirects to /login if not)
 *    - Uses requireAuth() to enforce authentication
 *
 * 2. PROFILE FETCH
 *    - Fetches user's profile from database 'profiles' table
 *    - Profile contains the 'role' field: 'student' | 'teacher' | 'admin'
 *    - This role determines which dashboard view to show
 *
 * 3. DATA FLOW
 *    - Returns profile to child routes and components
 *    - All /dashboard/* routes inherit this data via SvelteKit's data flow
 *    - Child routes can access via `await parent()` in their load functions
 *    - Components receive it via the `data` prop
 *
 * SECURITY:
 * ---------
 * - Runs on SERVER (before page renders)
 * - Authentication check blocks unauthenticated users
 * - Role comes from database (not from client or cookies)
 * - SvelteKit ensures this runs before +layout.svelte renders
 *
 * INHERITED BY:
 * -------------
 * - /dashboard/+page.svelte (main dashboard with role-based views)
 * - Any future dashboard sub-routes (e.g., /dashboard/classes)
 * - All child routes automatically require authentication
 */

import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('dashboard/+layout.server.ts');

export const load: LayoutServerLoad = async ({ locals: { safeGetSession }, parent }) => {
	// STEP 1: Get the authenticated user's session
	// safeGetSession() verifies the user with Supabase auth server
	// (see src/lib/server/supabase.ts for security details)
	const { user } = await safeGetSession();

	// STEP 2: Require authentication for ALL dashboard routes
	// If user is null, requireAuth() throws a redirect to /login
	// This protects all /dashboard/* routes with a single check
	requireAuth(user);

	// STEP 3: Get profile from parent layout (already fetched in root +layout.server.ts)
	// This avoids redundant database queries
	const { profile } = await parent();

	// STEP 4: Verify profile exists
	// Every authenticated user should have a profile
	// If profile doesn't exist, redirect to profile setup page
	if (!profile) {
		logger.error('Profile not found for user:', user!.id);
		logger.error('This usually means:');
		logger.error('  1. User signed up but profile was not created');
		logger.error('  2. Database trigger is missing');
		logger.error('  3. Profile was deleted manually');
		logger.error('Solution: Create a profile for this user in the profiles table');
		throw error(
			500,
			'Your account is not fully set up. Please contact an administrator to complete your profile setup.'
		);
	}

	// STEP 5: Return profile to child routes and components
	// This data flows through SvelteKit's load chain:
	// - +layout.svelte receives it as `data.profile`
	// - +page.svelte can access it via `data.profile`
	// - Child +page.server.ts can get it via `await parent()`
	//
	// The profile.role field is used by:
	// - +page.svelte to render the correct dashboard view (Student/Teacher/Admin)
	// - +layout.svelte to display user info in the header
	// - Any child routes to enforce role-based access control
	return {
		profile
	};
};
