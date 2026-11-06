/**
 * Photo du compte Google lue dans les métadonnées d'un utilisateur Supabase.
 *
 * Seule une adresse servie par Google (`https://lh3.googleusercontent.com/…`) est
 * acceptée : les métadonnées viennent du client (inscription GoTrue directe) et une
 * adresse quelconque finirait affichée chez les autres élèves. Même règle que
 * `handle_new_user` en base (migration 20261106164739, boutique d'avatars).
 */

// Constantes
export const GOOGLE_PHOTO_PREFIX = 'https://lh3.googleusercontent.com/';

// Functions
/** Rend la photo Google (`picture`, à défaut `avatar_url`) si elle est servie par Google, sinon null. */
export function googlePhotoUrl(
	metadata: Record<string, unknown> | null | undefined
): string | null {
	const candidate = metadata?.picture ?? metadata?.avatar_url;
	if (typeof candidate !== 'string' || !candidate.startsWith(GOOGLE_PHOTO_PREFIX)) return null;
	return candidate;
}
