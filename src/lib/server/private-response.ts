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
