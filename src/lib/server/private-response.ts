/**
 * Réponses qu'aucun cache partagé ne doit garder (hooks.server.ts)
 * ================================================================
 *
 * - Une page HTML d'un utilisateur connecté embarque ses jetons de session
 *   dans les données SvelteKit (finding H2 de l'audit 2026-08).
 * - Une réponse qui pose un cookie : le client Supabase rafraîchit une session
 *   expirée sur n'importe quelle requête, et son `Set-Cookie` porte les jetons.
 *   Sur une réponse publique (`/api/dictionnaire`, `Cache-Control: public`), un
 *   cache partagé (proxy d'établissement) la rejouerait à un autre poste.
 *
 * @module server/private-response
 */

export const PRIVATE_NO_STORE = 'private, no-store';

/** La réponse doit-elle partir en `private, no-store`, quoi qu'ait demandé la route ? */
export function mustStayPrivate(headers: Headers, signedIn: boolean): boolean {
	if (headers.has('set-cookie')) return true;
	return signedIn && (headers.get('content-type') ?? '').includes('text/html');
}

/**
 * Consignes des caches de CDN : elles passent avant `Cache-Control` (doc de
 * Vercel), un `private, no-store` seul ne les annulerait donc pas.
 *
 * ⚠️ Règle : une route ne pose de consigne de CDN (`s-maxage`,
 * `Vercel-CDN-Cache-Control`…) que si sa réponse ne dépend de personne (client
 * anonyme, ni `locals`, ni cookies). Le cache de Vercel ne tient pas compte des
 * cookies, et `mustStayPrivate` ne voit pas une réponse JSON lue avec la
 * session qui ne pose pas de cookie.
 */
const CDN_CACHE_HEADERS = ['cdn-cache-control', 'vercel-cdn-cache-control'];

/** Rend la réponse privée : `private, no-store`, sans consigne de CDN */
export function makePrivate(headers: Headers): void {
	headers.set('cache-control', PRIVATE_NO_STORE);
	for (const name of CDN_CACHE_HEADERS) headers.delete(name);
}

/**
 * Ce que fait le hook (`securityHeadersHandle`) sur chaque réponse : la rend
 * privée si elle doit l'être, consignes de CDN comprises. Rend `true` si elle
 * l'a fait.
 */
export function enforcePrivacy(headers: Headers, signedIn: boolean): boolean {
	if (!mustStayPrivate(headers, signedIn)) return false;
	makePrivate(headers);
	return true;
}
