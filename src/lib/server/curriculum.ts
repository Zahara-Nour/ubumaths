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
import type { TablesInsert } from '$lib/types/database';

/** Minimal shape of a PostgREST/Postgres error (code is what we branch on). */
export interface DbErrorLike {
	code?: string | null;
	message?: string;
}

/** Column lists (single source of truth for SELECT projections). */
export const THEME_COLS = 'id, grade, name, display_order, created_at, updated_at';
export const OBJECTIVE_COLS = 'id, theme_id, name, display_order, created_at, updated_at';
// Projette bien TOUTES les colonnes que `CurriculumPoint` promet : une liste
// tronquée produit des champs `undefined` sur un objet que TypeScript croit
// complet. `code`, `exigence`, `regime_acquisition` et `rang` manquaient.
export const POINT_COLS =
	'id, objective_id, code, name, display_order, kind, exigence, regime_acquisition, rang, archived_at, created_at, updated_at';

/**
 * Bridge the one place where the generated types and the database disagree.
 *
 * `curriculum_points.code` is NOT NULL without a default: the trigger
 * `curriculum_points_assign_code` fills it. Postgres has no way to express
 * "supplied by a trigger", so the generated `Insert` type demands it from the
 * caller — which is exactly what we don't want, since a hand-picked code would
 * collide with the level's series.
 *
 * Callers pass everything but `code`; this function carries the cast, alone.
 */
export function pointInsert(
	values: Omit<TablesInsert<'curriculum_points'>, 'code'>
): TablesInsert<'curriculum_points'> {
	return values as TablesInsert<'curriculum_points'>;
}

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
 * then name at each level). Shared by the programme editor, the exercise
 * tagger, the cahier-de-texte coverage block and the Avancement heatmap.
 *
 * Archived points are left out by default — that is the whole point of
 * archiving: they must stop being taggable and stop counting towards coverage,
 * while keeping the history already attached to them. Only the programme editor
 * asks for them, so they can be seen and restored.
 */
export async function getCurriculumTree(
	supabase: App.Locals['supabase'],
	grade: string,
	{ includeArchived = false }: { includeArchived?: boolean } = {}
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
		let query = supabase
			.from('curriculum_points')
			.select(POINT_COLS)
			.in('objective_id', objectiveIds);
		if (!includeArchived) query = query.is('archived_at', null);
		const { data: points } = await query
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
