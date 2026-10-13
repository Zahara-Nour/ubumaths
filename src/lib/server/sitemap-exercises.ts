/**
 * Exercices listés dans `sitemap.xml` : ceux que leur auteur a choisi
 * d'« Afficher sur Google » (`is_public AND search_indexed`).
 *
 * La lecture passe par un client ANONYME (`createAnonymousSupabase`) : le plan
 * ne doit contenir que ce qu'un visiteur non connecté peut lire. Une panne rend
 * une liste vide — le plan se sert alors sans les exercices, jamais en 500.
 *
 * @module lib/server/sitemap-exercises
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('server/sitemap-exercises');

// Types

export interface IndexedExerciseEntry {
	/** Chemin de la page publique : `/exercice/<slug>`, ou l'id à défaut de slug. */
	path: string;
	/** Date de dernière modification, AAAA-MM-JJ (UTC). */
	lastmod: string;
}

// Constantes

/** Plafond par lecture, très au-delà du catalogue actuel (le protocole en admet 50 000). */
export const SITEMAP_EXERCISE_LIMIT = 5000;

// Functions

export async function fetchIndexedExercises(
	supabase: SupabaseClient<Database>
): Promise<IndexedExerciseEntry[]> {
	try {
		const { data, error } = await supabase
			.from('exercises')
			.select('id, slug, updated_at')
			.eq('is_public', true)
			.eq('search_indexed', true)
			.order('updated_at', { ascending: false })
			.limit(SITEMAP_EXERCISE_LIMIT);

		if (error) {
			logger.error('[sitemap] Exercices illisibles, plan servi sans eux :', error);
			return [];
		}

		return (data ?? []).map((row) => ({
			// La page `/exercice/[slug]` accepte aussi l'id (repli UUID).
			path: `/exercice/${encodeURIComponent(row.slug ?? row.id)}`,
			lastmod: row.updated_at.slice(0, 10)
		}));
	} catch (e) {
		logger.error('[sitemap] Lecture des exercices impossible, plan servi sans eux :', e);
		return [];
	}
}
