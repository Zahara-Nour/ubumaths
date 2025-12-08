/**
 * Pending Approval Page Server Load
 *
 * Controls access to the pending approval page:
 * - Redirects to login if not authenticated
 * - Redirects to dashboard if already approved
 * - Signs out and redirects with error if rejected
 * - Allows access only for pending users
 */

import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('auth/pending-approval');

export const load: PageServerLoad = async ({ locals }) => {
	const { user, profile, supabase } = locals;

	// Not logged in - redirect to login
	if (!user) {
		logger.info('Unauthenticated user accessing pending-approval, redirecting to login');
		throw redirect(303, '/auth/login');
	}

	// No profile - this shouldn't happen but handle it
	if (!profile) {
		logger.warn('User without profile accessing pending-approval:', user.email);
		throw redirect(303, '/auth/login');
	}

	// User is approved - redirect to dashboard
	if (profile.status === 'approved') {
		logger.info('Approved user accessing pending-approval, redirecting to dashboard:', user.email);
		throw redirect(303, '/dashboard');
	}

	// User is rejected - sign out and redirect with error
	if (profile.status === 'rejected') {
		logger.warn('Rejected user accessing pending-approval:', user.email);
		await supabase.auth.signOut();
		const errorMessage = profile.rejection_reason
			? `Votre inscription a été refusée : ${profile.rejection_reason}`
			: 'Votre inscription a été refusée.';
		throw redirect(303, `/auth/login?error=${encodeURIComponent(errorMessage)}`);
	}

	// User is pending - allow access to this page
	logger.info('Pending user viewing approval page:', user.email);
	return {};
};
