/**
 * Server helpers — Curriculum tracking (suivi du programme).
 *
 * Centralizes the Postgres-error → HTTP-status mapping shared by the
 * curriculum CRUD endpoints. The curriculum_* tables are not yet in the
 * generated database.ts, so endpoints use `.from('table' as never)` and cast
 * results to the helper types in `$lib/types/database-helpers`.
 */

import { json } from '@sveltejs/kit';

/** Minimal shape of a PostgREST/Postgres error (code is what we branch on). */
export interface DbErrorLike {
	code?: string | null;
	message?: string;
}

/** Column lists (single source of truth for SELECT projections). */
export const THEME_COLS = 'id, grade, name, display_order, created_at, updated_at';
export const ITEM_COLS = 'id, theme_id, name, display_order, created_at, updated_at';
export const POINT_COLS =
	'id, item_id, name, display_order, kind, archived_at, created_at, updated_at';

/**
 * Map a known Postgres error code to an HTTP JSON Response.
 * Returns `null` when the error is not one we translate (caller → 500).
 */
export function curriculumDbError(err: DbErrorLike, uniqueMsg = 'Doublon'): Response | null {
	switch (err.code) {
		case '23505': // unique_violation
			return json({ error: uniqueMsg }, { status: 409 });
		case '42501': // insufficient_privilege (RLS)
			return json({ error: 'Accès refusé' }, { status: 403 });
		case '23514': // check_violation
			return json({ error: 'Valeur invalide' }, { status: 400 });
		case '23503': // foreign_key_violation (e.g. unknown theme_id/item_id)
			return json({ error: 'Référence introuvable' }, { status: 400 });
		case '22P02': // invalid_text_representation (e.g. malformed UUID path param)
			return json({ error: 'Identifiant invalide' }, { status: 400 });
		default:
			return null;
	}
}
