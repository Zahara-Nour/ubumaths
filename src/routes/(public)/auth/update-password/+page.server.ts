/**
 * Password Update - Server Actions
 *
 * This page is reached after a user clicks a password reset link in their email.
 * The /auth/confirm handler has already verified the token and created a temporary session.
 *
 * FLOW:
 * 1. User receives password reset email
 * 2. Clicks link → /auth/confirm?token_hash=...&type=recovery
 * 3. /auth/confirm verifies token and redirects to this page
 * 4. User enters new password
 * 5. Server updates password via Supabase
 * 6. Redirect to home (user is logged in)
 *
 * Also reached from the profile (« Changer mon mot de passe », PR 3) and forced after a
 * provisional password set by the teacher (`passwordChangeHandle`, R3).
 *
 * SECURITY:
 * - Requires valid session (created by /auth/confirm)
 * - Server-side password update ensures security
 * - Password validation before update
 * - Current password required, unless the session comes from a recent email link or the
 *   password is a provisional one: a session left open is not enough
 */
import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createServerLogger } from '$lib/utils/logger';
import { updatePasswordSchema } from '$lib/server/validation/auth';
import { validateFormData } from '$lib/server/validation/common';
import { authErrorToFrench } from '$lib/server/auth/auth-error-fr';
import {
	MUST_CHANGE_PASSWORD,
	isFreshEmailLinkSession,
	mustChangePassword,
	verifyCurrentPassword
} from '$lib/server/child-password';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { checkPasswordChangeRateLimitByUser } from '$lib/server/rateLimiter';

const logger = createServerLogger('auth/update-password/+page.server.ts');

type SessionUser = { id: string; email?: string; app_metadata?: Record<string, unknown> };

/** L'ancien mot de passe est-il exigé ? Non avec un provisoire ou au retour d'un lien récent. */
async function requiresCurrentPassword(
	supabase: App.Locals['supabase'],
	user: SessionUser
): Promise<boolean> {
	if (mustChangePassword(user)) return false;
	const { data } = await supabase.auth.getClaims();
	return !isFreshEmailLinkSession(data?.claims?.amr, Math.floor(Date.now() / 1000));
}

/** Lève la marque « à changer » par la clé service ; deux essais. */
async function clearMustChangeFlag(userId: string): Promise<boolean> {
	const service = createServiceRoleClient();
	for (let attempt = 0; attempt < 2; attempt++) {
		const { error } = await service.auth.admin.updateUserById(userId, {
			app_metadata: { [MUST_CHANGE_PASSWORD]: false }
		});
		if (!error) return true;
		logger.error('Must-change flag not cleared:', error.message);
	}
	return false;
}

export const load: PageServerLoad = async ({ locals: { safeGetSession, supabase } }) => {
	// Check if user has a valid session (should have been created by /auth/confirm)
	const { user } = await safeGetSession();

	if (!user) {
		logger.error('No session found - user needs to use password reset link');
		// Redirect to password reset request page
		throw redirect(303, '/auth/reset-password');
	}

	// User has valid session, allow them to update password
	return {
		needsCurrentPassword: await requiresCurrentPassword(supabase, user),
		mustChange: mustChangePassword(user)
	};
};

export const actions = {
	/**
	 * Update password action
	 *
	 * Updates the user's password using their authenticated session
	 */
	updatePassword: async ({ request, locals: { supabase, safeGetSession } }) => {
		// Verify user is authenticated
		const { user } = await safeGetSession();

		if (!user) {
			logger.error('No authenticated user');
			return fail(401, {
				error: authErrorToFrench({ code: 'session_not_found' })
			});
		}

		// Validate inputs against the shared schema (password: min 8 characters)
		const formData = await request.formData();
		const validation = validateFormData(updatePasswordSchema, formData);

		if (!validation.success) {
			return fail(400, {
				error: Object.values(validation.errors).flat()[0] ?? 'Données invalides'
			});
		}

		const { currentPassword, password, confirmPassword } = validation.data;

		if (password !== confirmPassword) {
			return fail(400, {
				error: 'Les deux mots de passe ne correspondent pas.'
			});
		}

		if (await requiresCurrentPassword(supabase, user)) {
			if (!currentPassword || !user.email) {
				return fail(400, { error: 'Mot de passe actuel requis.' });
			}
			const limit = await checkPasswordChangeRateLimitByUser(user.id);
			if (!limit.allowed) {
				return fail(429, { error: limit.message ?? 'Trop de tentatives. Réessayer plus tard.' });
			}
			if (!(await verifyCurrentPassword(user.email, currentPassword))) {
				return fail(400, { error: 'Mot de passe actuel incorrect.' });
			}
		}

		// Update password
		logger.info('Updating password');

		const { error } = await supabase.auth.updateUser({
			password
		});

		if (error) {
			logger.error('Password update error:', error.message);
			// Jamais le message anglais de Supabase : code connu traduit, sinon repli
			return fail(400, {
				error: authErrorToFrench(error, 'Impossible de changer le mot de passe. Réessayer.')
			});
		}

		// Mot de passe provisoire remplacé : la marque se lève par la clé service
		// (`app_metadata` n'est pas modifiable par l'élève). Sans elle, il resterait bloqué.
		// Un second essai : marque restée, la page reviendrait et le même mot de passe serait
		// refusé (`same_password`) — d'où le message qui dit d'en choisir un autre.
		if (mustChangePassword(user) && !(await clearMustChangeFlag(user.id))) {
			return fail(500, {
				error:
					'Mot de passe bien changé, mais une erreur est survenue. Si la page en redemande un, en choisir un autre.'
			});
		}

		logger.info('Password updated successfully');

		// Success! User's password is updated and they're logged in
		// Redirect to home page
		throw redirect(303, '/');
	}
} satisfies Actions;
