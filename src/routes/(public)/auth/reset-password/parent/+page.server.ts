/**
 * Page du lien du parent : nouveau mot de passe de l'enfant (PR 3)
 * ================================================================
 *
 * Le lien arrive au parent quand l'enfant a perdu son mot de passe (« Mot de passe oublié »
 * avec l'identifiant). Le parent choisit le mot de passe ici, SANS être connecté au compte
 * de l'enfant (R2, décision 8) : `setChildPasswordFromToken` vérifie le jeton sur un client
 * jetable et ferme aussitôt la session ouverte par GoTrue.
 *
 * L'ouverture de la page ne consomme pas le jeton : les antivirus de messagerie ouvrent les
 * liens ; seul l'envoi du formulaire le fait.
 */
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createServerLogger } from '$lib/utils/logger';
import { parentSetChildPasswordSchema } from '$lib/server/validation/auth';
import { validateFormData } from '$lib/server/validation/common';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { setChildPasswordFromToken } from '$lib/server/child-password';
import { checkPasswordResetRateLimitByIP } from '$lib/server/rateLimiter';

const logger = createServerLogger('auth/reset-password/parent/+page.server.ts');

export const load: PageServerLoad = async ({ url }) => {
	return { tokenHash: url.searchParams.get('token_hash') };
};

export const actions = {
	setPassword: async ({ request, getClientAddress }) => {
		const formData = await request.formData();
		const tokenHash = String(formData.get('tokenHash') ?? '');

		const ipLimit = await checkPasswordResetRateLimitByIP(getClientAddress());
		if (!ipLimit.allowed) {
			return fail(429, { error: ipLimit.message, tokenHash });
		}

		const validation = validateFormData(parentSetChildPasswordSchema, formData);
		if (!validation.success) {
			return fail(400, {
				error: Object.values(validation.errors).flat()[0] ?? 'Données invalides',
				tokenHash
			});
		}
		const { password, confirmPassword } = validation.data;
		if (password !== confirmPassword) {
			return fail(400, { error: 'Les deux mots de passe ne correspondent pas.', tokenHash });
		}

		const result = await setChildPasswordFromToken(
			createServiceRoleClient(),
			validation.data.tokenHash,
			password
		);
		if (result.ok) {
			logger.info('Child password set by parent');
			return { success: true as const, firstname: result.firstname, loginId: result.loginId };
		}

		if (result.reason === 'weak_password') {
			return fail(400, {
				error: 'Mot de passe trop faible ou trop courant : en choisir un autre.',
				tokenHash
			});
		}
		if (result.reason === 'server_error') {
			return fail(500, { error: 'Erreur du serveur. Réessayer dans un instant.', tokenHash });
		}
		// Jeton expiré, déjà servi, ou d'un compte qui n'est pas un enfant : même réponse.
		return fail(400, {
			expired: true,
			error: 'Ce lien a expiré ou a déjà servi. Refaire une demande de mot de passe oublié.'
		});
	}
} satisfies Actions;
