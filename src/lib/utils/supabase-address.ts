/**
 * Adresses de Supabase vues du navigateur.
 *
 * En prod, c'est `PUBLIC_SUPABASE_URL`, telle quelle. En dev sur la base locale,
 * le navigateur passe par le relais du serveur de dev (`#lib/dev/supabase-relay.ts`) :
 * ces trois fonctions sont le seul endroit où l'appli le sait.
 */

import { dev } from '$app/env';
import { PUBLIC_SUPABASE_URL } from '$app/env/public';
import {
	directAddress,
	isRelayed,
	relayedAddress,
	relayedSupabaseUrl,
	sessionCookieName
} from '#lib/dev/supabase-relay.ts';

/**
 * Adresse de Supabase pour le client du navigateur.
 *
 * @param pageOrigin origine de la page (`location.origin`)
 */
export function browserSupabaseUrl(pageOrigin: string): string {
	return relayedSupabaseUrl(PUBLIC_SUPABASE_URL, pageOrigin, dev);
}

/**
 * Nom du cookie de session à imposer au client du navigateur quand il passe par
 * le relais : celui que le serveur déduit de l'adresse directe. `undefined`
 * ailleurs (prod comprise) : le nom par défaut, inchangé.
 */
export function browserSessionCookie(): { name: string } | undefined {
	return isRelayed(PUBLIC_SUPABASE_URL, dev)
		? { name: sessionCookieName(PUBLIC_SUPABASE_URL) }
		: undefined;
}

/**
 * Une adresse fabriquée avec `PUBLIC_SUPABASE_URL` (image du stockage, lien
 * signé) telle que le navigateur doit la recevoir. À appeler au dernier moment,
 * après les contrôles d'origine, qui portent sur l'adresse d'origine.
 */
export function toBrowserAddress(address: string): string {
	return relayedAddress(address, PUBLIC_SUPABASE_URL, dev);
}

/**
 * Une adresse que le client du navigateur vient de fabriquer (`getPublicUrl`
 * après un envoi), telle qu'elle doit s'ENREGISTRER : jamais l'adresse du relais,
 * propre à l'appareil. Inchangée en prod. Navigateur seulement.
 */
export function toStoredAddress(address: string): string {
	// Hors navigateur (tests, serveur) : pas de relais, donc rien à défaire
	if (typeof location === 'undefined') return address;
	return directAddress(address, PUBLIC_SUPABASE_URL, location.origin, dev);
}
