/**
 * Student Objectif Detail Page Server
 *
 * UI élève — Détail d'un objectif famille knowledge (4 capacités).
 *
 * Refonte 2026-06-10 (Phase 3 chantier SRS/FSRS) :
 * - Suppression du flag `to_review` (issu de la VIEW, basé sur seuil 30j).
 * - Ajout du badge FSRS agrégé calculé via `computePointBadges` à partir
 *   de l'état `srs_card_stats` des templates tagués sur chaque capacité.
 *
 * Spec : docs/wip/srs-fsrs-spec-tdd.md §5
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { computePointBadges, type CapacityBadge } from '$lib/server/srs/capacity-badge';

export interface CapacityDetail {
	id: string;
	name: string;
	/** Rang dans l'échelle descriptive, ou null si l'objectif n'en porte pas. */
	rang: 1 | 2 | 3 | 4 | null;
	kind: 'connaissance' | 'savoir_faire' | 'demonstration';
	regime_acquisition: 'fluence' | 'diversite';
	/** Niveaux dont ce point figure dans la liste des « Automatismes ». */
	automatisme_grades: string[];
	is_acquired: boolean;
	needs_remediation: boolean;
	badge: CapacityBadge;
}

export interface ObjectiveDetailData {
	id: string;
	name: string;
	description: string | null;
	theme_name: string;
	theme_id: string;
	capacities: CapacityDetail[];
	/** true si l'objectif porte une échelle descriptive (points rangés 1-4). */
	has_scale: boolean;
	/** Rang max acquis. Toujours 0 quand `has_scale` est false. */
	rang_max_acquired: 0 | 1 | 2 | 3 | 4;
	acquired_count: number;
	total_count: number;
}

export const load: PageServerLoad = async ({ locals, params }): Promise<ObjectiveDetailData> => {
	const { user } = await requireRole(locals, 'student');

	// 1. Charger l'objectif + ses capacités + thème parent
	const { data: objData, error: objError } = await locals.supabase
		.from('curriculum_objectives')
		.select(
			`
				id,
				name,
				description,
				theme:curriculum_themes!curriculum_objectives_theme_id_fkey (
					id,
					name
				),
				curriculum_points (
					id,
					name,
					rang,
					kind,
					regime_acquisition,
					archived_at
				)
			`
		)
		.eq('id', params.id)
		.maybeSingle();

	if (objError) {
		throw error(500, `Erreur de chargement : ${objError.message}`);
	}
	if (!objData) {
		throw error(404, 'Objectif introuvable');
	}

	const theme = Array.isArray(objData.theme) ? objData.theme[0] : objData.theme;
	if (!theme) {
		throw error(500, 'Thème parent introuvable');
	}

	const points = (objData.curriculum_points ?? []).filter((p) => !p.archived_at);
	const pointIds = points.map((p) => p.id);

	// 2. Charger l'état BO des capacités (is_acquired, needs_remediation)
	const { data: stateData, error: stateError } = await locals.supabase
		.from('student_point_state_v')
		.select('point_id, is_acquired, needs_remediation')
		.eq('student_id', user.id)
		.in('point_id', pointIds);

	if (stateError) {
		throw error(500, `Erreur de chargement de l'état : ${stateError.message}`);
	}

	const stateByPoint = new Map<string, { is_acquired: boolean; needs_remediation: boolean }>();
	for (const row of stateData ?? []) {
		if (!row.point_id) continue;
		stateByPoint.set(row.point_id, {
			is_acquired: row.is_acquired ?? false,
			needs_remediation: row.needs_remediation ?? false
		});
	}

	// 3. Calcul des badges FSRS agrégés
	// Listes d'automatismes : de quel programme chacun de ces points est un
	// attendu d'examen. Un point peut figurer dans plusieurs listes.
	const { data: automatismeRows } = await locals.supabase
		.from('curriculum_point_automatismes')
		.select('point_id, grade')
		.in('point_id', pointIds);

	const automatismeGradesByPoint = new Map<string, string[]>();
	for (const row of automatismeRows ?? []) {
		const list = automatismeGradesByPoint.get(row.point_id) ?? [];
		list.push(row.grade);
		automatismeGradesByPoint.set(row.point_id, list);
	}

	const badges = await computePointBadges(locals.supabase, user.id, pointIds);

	// 4. Construire les points. Les objectifs à échelle sont triés par rang ;
	//    ceux sans échelle gardent l'ordre d'affichage du référentiel.
	const has_scale = points.some((p) => p.rang !== null);
	const capacities: CapacityDetail[] = points
		.sort((a, b) => (a.rang ?? Number.MAX_SAFE_INTEGER) - (b.rang ?? Number.MAX_SAFE_INTEGER))
		.map((p) => {
			const state = stateByPoint.get(p.id);
			return {
				id: p.id,
				name: p.name,
				rang: (p.rang as 1 | 2 | 3 | 4 | null) ?? null,
				kind: p.kind as 'connaissance' | 'savoir_faire' | 'demonstration',
				regime_acquisition: p.regime_acquisition as 'fluence' | 'diversite',
				automatisme_grades: automatismeGradesByPoint.get(p.id) ?? [],
				is_acquired: state?.is_acquired ?? false,
				needs_remediation: state?.needs_remediation ?? false,
				badge: badges.get(p.id) ?? 'non_commencee'
			};
		});

	// 5. Niveau atteint — seulement sur les objectifs à échelle.
	let rang_max: 0 | 1 | 2 | 3 | 4 = 0;
	let acquired_count = 0;
	for (const c of capacities) {
		if (c.is_acquired) {
			acquired_count += 1;
			if (c.rang !== null && c.rang > rang_max) {
				rang_max = c.rang;
			}
		}
	}

	return {
		id: objData.id,
		name: objData.name,
		description: objData.description,
		theme_name: theme.name,
		theme_id: theme.id,
		capacities,
		has_scale,
		rang_max_acquired: has_scale ? rang_max : 0,
		acquired_count,
		total_count: capacities.length
	};
};
