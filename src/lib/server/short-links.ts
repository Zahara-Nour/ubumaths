/**
 * Liens courts des QR codes : création et lecture
 * ==============================================
 *
 * Tout passe par les deux fonctions SQL de la migration
 * `20261019170000_liens_courts` : la table `short_links` n'est lisible ni
 * écrivable par personne en direct.
 *
 * - `create_short_link` : prof ou admin (42501 sinon), cible interne (22023
 *   sinon), même cible → même code ;
 * - `resolve_short_link` : quiconque a le code ; code inconnu ou mal formé → null.
 *
 * @module server/short-links
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { SHORT_LINK_CODE, shortLinkTargetSchema } from '$lib/validation/short-link';

// ============================================================================
// TYPES
// ============================================================================

export class ShortLinkError extends Error {
	constructor(
		message: string,
		public readonly status: 400 | 403 | 500
	) {
		super(message);
		this.name = 'ShortLinkError';
	}
}

// ============================================================================
// FONCTIONS
// ============================================================================

/** Le code du lien court de `target` (créé ou retrouvé). */
export async function createShortLink(
	supabase: SupabaseClient<Database>,
	target: string
): Promise<string> {
	const { data, error } = await supabase.rpc('create_short_link', { p_target: target });
	if (error) {
		if (error.code === '42501') throw new ShortLinkError('Seul un prof crée un lien court', 403);
		if (error.code === '22023') {
			throw new ShortLinkError('Un lien court mène à une adresse du site', 400);
		}
		throw new ShortLinkError('Lien court impossible à créer', 500);
	}
	if (typeof data !== 'string' || !SHORT_LINK_CODE.test(data)) {
		throw new ShortLinkError('Lien court impossible à créer', 500);
	}
	return data;
}

/**
 * La cible du code, ou `null` s'il n'existe pas. Une cible relue qui n'est
 * plus un chemin interne est traitée comme absente : on ne redirige jamais
 * hors du site, même si la base a été remplie autrement.
 */
export async function resolveShortLink(
	supabase: SupabaseClient<Database>,
	code: string
): Promise<string | null> {
	const { data, error } = await supabase.rpc('resolve_short_link', { p_code: code });
	if (error) throw error;
	if (data === null) return null;
	return shortLinkTargetSchema.safeParse(data).success ? data : null;
}
