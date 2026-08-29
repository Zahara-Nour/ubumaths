/**
 * Server helpers — Curriculum tracking (suivi du programme).
 *
 * Centralizes the Postgres-error → HTTP-status mapping shared by the
 * curriculum CRUD endpoints. Result rows are narrowed to the helper types in
 * `$lib/types/database-helpers` (constrained columns: grade/kind/source).
 */

import { json } from '@sveltejs/kit';
import type {
	CurriculumTheme,
	CurriculumObjective,
	CurriculumPoint
} from '$lib/types/database-helpers';

/** Minimal shape of a PostgREST/Postgres error (code is what we branch on). */
export interface DbErrorLike {
	code?: string | null;
	message?: string;
}

/** Column lists (single source of truth for SELECT projections). */
export const THEME_COLS = 'id, grade, name, display_order, created_at, updated_at';
export const OBJECTIVE_COLS = 'id, theme_id, name, display_order, created_at, updated_at';
export const POINT_COLS =
	'id, objective_id, name, display_order, kind, archived_at, created_at, updated_at';

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
		case '23503': // foreign_key_violation (e.g. unknown theme_id/objective_id)
			return json({ error: 'Référence introuvable' }, { status: 400 });
		case '22P02': // invalid_text_representation (e.g. malformed UUID path param)
			return json({ error: 'Identifiant invalide' }, { status: 400 });
		default:
			return null;
	}
}

/** A theme with its objectives, each with its points (nested tree). */
export type CurriculumTreeTheme = CurriculumTheme & {
	objectives: (CurriculumObjective & { points: CurriculumPoint[] })[];
};

/**
 * Load the full Thème → Item → Point tree for a grade (ordered by display_order
 * then name at each level). Shared by the programme editor and the
 * cahier-de-texte coverage block.
 */
export async function getCurriculumTree(
	supabase: App.Locals['supabase'],
	grade: string
): Promise<CurriculumTreeTheme[]> {
	const { data: themes } = await supabase
		.from('curriculum_themes')
		.select(THEME_COLS)
		.eq('grade', grade)
		.order('display_order', { ascending: true })
		.order('name', { ascending: true });
	const themeList = (themes ?? []) as CurriculumTheme[];
	const themeIds = themeList.map((t) => t.id);
	if (themeIds.length === 0) return [];

	const { data: objectives } = await supabase
		.from('curriculum_objectives')
		.select(OBJECTIVE_COLS)
		.in('theme_id', themeIds)
		.order('display_order', { ascending: true })
		.order('name', { ascending: true });
	const objectiveList = (objectives ?? []) as CurriculumObjective[];
	const objectiveIds = objectiveList.map((i) => i.id);

	let pointList: CurriculumPoint[] = [];
	if (objectiveIds.length > 0) {
		const { data: points } = await supabase
			.from('curriculum_points')
			.select(POINT_COLS)
			.in('objective_id', objectiveIds)
			.order('display_order', { ascending: true })
			.order('name', { ascending: true });
		pointList = (points ?? []) as CurriculumPoint[];
	}

	return themeList.map((theme) => ({
		...theme,
		objectives: objectiveList
			.filter((i) => i.theme_id === theme.id)
			.map((obj) => ({ ...obj, points: pointList.filter((p) => p.objective_id === obj.id) }))
	}));
}
