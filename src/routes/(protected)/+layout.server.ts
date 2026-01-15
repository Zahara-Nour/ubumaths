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
 * export const load: PageServerLoad = async ({ parent }) => {
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
import { error, redirect } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth';
import { createLogger } from '$lib/utils/logger';
import { logError } from '$lib/server/errorMonitoring';
import { getConsentStatus, type ConsentProfile } from '$lib/utils/consent';

const logger = createLogger('(protected)/+layout.server.ts');

export const load: LayoutServerLoad = async ({ locals }) => {
	// User and profile are already loaded in locals by userProfileHandle (hooks.server.ts)
	const { user, profile } = locals;

	console.log('🎨 [PROTECTED LAYOUT SERVER] Exécution');

	// Require authentication for ALL routes in (protected) group
	// If user is null, requireAuth() throws a redirect to /login
	requireAuth(user);

	// Verify profile exists
	// Every authenticated user should have a profile
	if (!profile) {
		logger.error('Profile not found for user:', user!.id);
		logger.error('This usually means:');
		logger.error('  1. User signed up but profile was not created');
		logger.error('  2. Database trigger is missing');
		logger.error('  3. Profile was deleted manually');

		// Log to error_logs table for admin visibility
		try {
			await logError(locals.supabase, {
				error_type: 'server_load',
				severity: 'error',
				message: '[profile_missing] Profile not found for authenticated user',
				url: '(protected) layout',
				user_id: user!.id,
				context: {
					user_email: user!.email,
					possible_causes: [
						'User signed up but profile was not created',
						'Database trigger is missing',
						'Profile was deleted manually'
					]
				}
			});
		} catch (logErr) {
			console.error('[protected layout] Failed to log error:', logErr);
		}

		throw error(
			500,
			'Your account is not fully set up. Please contact an administrator to complete your profile setup.'
		);
	}

	// Check user approval status
	if (profile.status === 'pending') {
		logger.info('User pending approval, redirecting:', user!.email);
		throw redirect(303, '/auth/pending-approval');
	}

	if (profile.status === 'rejected') {
		logger.warn('Rejected user attempting to access protected route:', user!.email);
		// Sign out the rejected user
		await locals.supabase.auth.signOut();
		throw redirect(303, '/login?error=' + encodeURIComponent('Accès refusé.'));
	}

	// Get consent status for students (RGPD Article 8)
	// This is passed to child routes for UI display and client-side checks
	const consentStatus = getConsentStatus({
		role: profile.role,
		consent_required: profile.consent_required ?? false,
		consent_granted_at: profile.consent_granted_at ?? null,
		consent_grace_period_ends: profile.consent_grace_period_ends ?? null
	} as ConsentProfile);

	// Return user, profile, and consent status to child routes
	// Child routes can access this via locals or parent()
	return {
		user,
		profile,
		consentStatus
	};
};
