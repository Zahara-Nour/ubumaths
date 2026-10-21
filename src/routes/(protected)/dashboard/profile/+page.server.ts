/**
 * Mon profil — données de la page
 *
 * « Changer mon mot de passe » n'est montré qu'aux comptes qui en ont un (fournisseur
 * `email`) : un compte Google seul resterait bloqué sur l'ancien mot de passe demandé.
 */
import type { PageServerLoad } from './$types';
import { hasPasswordLogin } from '$lib/server/child-password';

export const load: PageServerLoad = async ({ locals }) => {
	return { canChangePassword: !!locals.user && hasPasswordLogin(locals.user) };
};
