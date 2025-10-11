/**
 * Dashboard Main Page Server Load Function
 * ==========================================
 *
 * This is the server load function for the /dashboard route.
 * It inherits authentication and profile data from the parent layout.
 *
 * ROLE-BASED DASHBOARD PATTERN:
 * ------------------------------
 * This page doesn't enforce specific roles - instead, it passes the profile
 * to the client component (+page.svelte), which renders different dashboard
 * views based on the user's role:
 *
 * - role === 'student'  → Renders StudentDashboard.svelte
 * - role === 'teacher'  → Renders TeacherDashboard.svelte
 * - role === 'admin'    → Renders AdminDashboard.svelte
 *
 * AUTHENTICATION:
 * ---------------
 * Access control is handled by the parent layout (+layout.server.ts).
 * By the time this function runs, we're guaranteed:
 * - User is authenticated (redirected to /login if not)
 * - Profile exists in the database
 * - Profile contains a valid role
 *
 * DATA INHERITANCE:
 * -----------------
 * We use `await parent()` to get data from +layout.server.ts.
 * This is efficient because:
 * - No duplicate database queries
 * - Profile is already fetched and verified
 * - SvelteKit automatically deduplicates parent() calls
 *
 * WHY NOT ENFORCE ROLE HERE:
 * --------------------------
 * We could use `requireRole(profile, ['student', 'teacher', 'admin'])`,
 * but that's redundant since all three roles should access /dashboard.
 * Instead, we let the client component handle role-based rendering.
 *
 * For routes that SHOULD restrict by role (e.g., /dashboard/admin),
 * those would use requireRole() in their +page.server.ts.
 */

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	// Inherit profile from parent layout (+layout.server.ts)
	// This contains the user's role which determines the dashboard view
	const { profile } = await parent();

	// Return profile to the client component
	// +page.svelte will use profile.role to render the correct dashboard
	return {
		profile
	};
};
