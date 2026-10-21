/**
 * Page du lien du parent : nouveau mot de passe de l'enfant (PR 3)
 * ================================================================
 *
 * Le lien arrive au parent quand l'enfant a perdu son mot de passe (« Mot de passe oublié »
 * avec l'identifiant). Le parent choisit le mot de passe ici, SANS être connecté au compte
 * de l'enfant (R2, décision 8) : `setChildPasswordFromToken` compare le jeton à l'empreinte
 * gardée dans le compte de l'enfant, puis change le mot de passe par la clé service — aucune
 * session n'est ouverte. Le lien porte `u` (compte) et `t` (jeton maison), jamais un jeton
 * de GoTrue (audit de la PR 3, B1).
 *
 * L'ouverture de la page ne consomme pas le jeton : les antivirus de messagerie ouvrent les
 * liens ; seul l'envoi du formulaire le fait.
 */
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createServerLogger } from '$lib/utils/logger';
import { childResetLinkSchema, parentSetChildPasswordSchema } from '$lib/server/validation/auth';
import { validateFormData } from '$lib/server/validation/common';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { setChildPasswordFromToken } from '$lib/server/child-password';
import { checkPasswordResetRateLimitByIP } from '$lib/server/rateLimiter';

const logger = createServerLogger('auth/reset-password/parent/+page.server.ts');

/** Le lien de la page, ou `null` s'il est incomplet ou mal formé (la page le dit). */
function readLink(source: { userId: unknown; token: unknown }) {
	const parsed = childResetLinkSchema.safeParse(source);
	return parsed.success ? parsed.data : null;
}

export const load: PageServerLoad = async ({ url }) => {
	return {
		link: readLink({ userId: url.searchParams.get('u'), token: url.searchParams.get('t') })
	};
};

export const actions = {
	setPassword: async ({ request, getClientAddress }) => {
		const formData = await request.formData();
		const link = readLink({ userId: formData.get('userId'), token: formData.get('token') });

		const ipLimit = await checkPasswordResetRateLimitByIP(getClientAddress());
		if (!ipLimit.allowed) {
			return fail(429, { error: ipLimit.message, link });
		}

		const validation = validateFormData(parentSetChildPasswordSchema, formData);
		if (!validation.success) {
			return fail(400, {
				error: Object.values(validation.errors).flat()[0] ?? 'Données invalides',
				link
			});
		}
		const { password, confirmPassword } = validation.data;
		if (password !== confirmPassword) {
			return fail(400, { error: 'Les deux mots de passe ne correspondent pas.', link });
		}

		const result = await setChildPasswordFromToken(
			createServiceRoleClient(),
			validation.data.userId,
			validation.data.token,
			password
		);
		if (result.ok) {
			logger.info('Child password set by parent');
			return { success: true as const, firstname: result.firstname, loginId: result.loginId };
		}

		if (result.reason === 'weak_password') {
			return fail(400, {
				error: 'Mot de passe trop faible ou trop courant : en choisir un autre.',
				link
			});
		}
		if (result.reason === 'server_error') {
			return fail(500, { error: 'Erreur du serveur. Réessayer dans un instant.', link });
		}
		// Jeton expiré, déjà servi, ou d'un compte qui n'est pas un enfant : même réponse.
		return fail(400, {
			expired: true,
			error: 'Ce lien a expiré ou a déjà servi. Refaire une demande de mot de passe oublié.'
		});
	}
} satisfies Actions;
