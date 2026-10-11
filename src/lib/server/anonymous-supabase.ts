/**
 * Client Supabase ANONYME côté serveur : il voit exactement ce que voit un
 * visiteur non connecté (rôle `anon`, RLS appliquée), quelle que soit la
 * session de la requête en cours.
 *
 * Sert aux sorties publiques destinées aux robots (sitemap) : lire avec la
 * session du visiteur y mêlerait ses propres lignes privées, et le service-role
 * contournerait la RLS. Aucune session persistée, aucun cookie écrit.
 *
 * @module lib/server/anonymous-supabase
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from '$lib/types/database';

export function createAnonymousSupabase(): SupabaseClient<Database> {
	return createClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
			detectSessionInUrl: false
		}
	});
}
