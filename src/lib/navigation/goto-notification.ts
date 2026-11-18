/**
 * Suivre le lien d'une notification (`action_url`, lu en base).
 *
 * SvelteKit 3 : `goto` rejette une adresse qui ne correspond à aucune route
 * (`navigation_route_missing`) au lieu de charger la page ; un lien périmé
 * (route renommée depuis l'envoi) ne faisait alors plus rien au clic. On
 * retombe sur un chargement complet, comme en kit 2 : l'élève voit la page, ou
 * la 404. Le repli n'accepte qu'un chemin du site (`/…`, jamais `//…`), pour
 * qu'une adresse en base ne puisse pas envoyer ailleurs.
 */
import { goto } from '$app/navigation';

/** Vrai pour un chemin du site : `/x`, mais ni `//hôte` ni `/\hôte`. */
export function isSitePath(url: string): boolean {
	return url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\');
}

export function gotoNotification(url: string): void {
	if (!isSitePath(url)) return;
	// Adresse lue en base : pas de type de route à vérifier ici.
	goto(url as Parameters<typeof goto>[0]).catch(() => {
		window.location.assign(url);
	});
}
