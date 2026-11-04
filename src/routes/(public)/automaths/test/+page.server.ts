import { redirect } from '@sveltejs/kit';
import { resolveTestLaunch } from '$lib/utils/test-launch';
import type { PageServerLoad } from './$types';

/**
 * Le serveur n'envoie AUCUN modèle : la page les lit dans le cache de l'onglet
 * (`questionTemplatesCache`, lu une fois, gardé 5 min par Vercel).
 *
 * Évaluation assignée (`?assignment=`) : le serveur tire et corrige ; la page
 * ne reçoit que les questions publiques de la tentative (chantier 5, ADR 0015,
 * E19). L'aperçu du prof charge les modèles lui-même, à la demande.
 *
 * Lien de série SANS forme (`?modeles=…` ou ancien `?categories=…` seul) : redirection vers le panier,
 * qui y met la série (Q46). Plus de fenêtre de choix pour un lien.
 */
export const load: PageServerLoad = async ({ url }) => {
	if (url.searchParams.has('assignment')) return {};

	const launch = resolveTestLaunch(url.searchParams);
	if (launch.kind === 'cart') {
		redirect(307, launch.href);
	}
	return {};
};
