/**
 * Student Objectifs Page Server
 *
 * UI élève — Liste des objectifs du niveau de l'élève, avec l'état de leurs
 * points de programme.
 *
 * Refonte 2026-06-10 (Phase 3 chantier SRS/FSRS) :
 * - `to_review` (basé sur seuil 30j arbitraire) supprimé de la VIEW et de la page.
 * - Badge FSRS agrégé par objectif (pire badge de ses points) via `computePointBadges`.
 *
 * Refonte 2026-08-29 (fusion des référentiels) :
 * - Source = l'arbre `curriculum_*`, filtré sur le niveau de l'élève
 *   (`profiles.grade`) et non plus codé en dur sur la 6ᵉ.
 * - Le `rang` d'un point est FACULTATIF. Deux formes d'objectif coexistent :
 *     · avec échelle  (points rangés 1-4) → niveau = rang max acquis
 *     · sans échelle  (points non rangés) → progression = n acquis / m
 *   `has_scale` dit à l'UI laquelle rendre.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { computePointBadges, worstBadge, type CapacityBadge } from '$lib/server/srs/capacity-badge';

export interface ObjectiveSummary {
	id: string;
	name: string;
	theme_id: string;
	theme_name: string;
	display_order: number;
	/** true si l'objectif porte une échelle descriptive (points rangés 1-4). */
	has_scale: boolean;
	/** Rang max acquis. Toujours 0 quand `has_scale` est false. */
	rang_max_acquired: 0 | 1 | 2 | 3 | 4;
	acquired_count: number;
	total_count: number;
	has_remediation: boolean;
	/** Pire badge FSRS parmi les points (priorité a_remedier > a_renforcer > ...). */
	fsrs_badge: CapacityBadge;
}

export interface ThemeWithObjectives {
	id: string;
	name: string;
	display_order: number;
	objectives: ObjectiveSummary[];
}

export interface ObjectifsPageData {
	themes: ThemeWithObjectives[];
	stats: {
		total: number;
		mastery: number; // ✨
		atteint: number; // 🟢
		en_cours: number; // 🟠
		non_commence: number; // ◯
		remediation_count: number;
		to_reinforce_count: number;
	};
}

export const load: PageServerLoad = async ({ locals }): Promise<ObjectifsPageData> => {
	const { user, profile } = await requireRole(locals, 'student');

	// Pas de niveau renseigné → rien à afficher (plutôt qu'un arbre d'un autre niveau).
	if (!profile.grade) {
		return {
			themes: [],
			stats: {
				total: 0,
				mastery: 0,
				atteint: 0,
				en_cours: 0,
				non_commence: 0,
				remediation_count: 0,
				to_reinforce_count: 0
			}
		};
	}

	// 1. Charger l'arbre Thème → Objectif → Point du niveau de l'élève
	const { data: themesData, error: themesError } = await locals.supabase
		.from('curriculum_themes')
		.select(
			`
				id,
				name,
				display_order,
				curriculum_objectives (
					id,
					name,
					display_order,
					theme_id,
					curriculum_points (
						id,
						rang,
						archived_at
					)
				)
			`
		)
		.eq('grade', profile.grade)
		.order('display_order', { ascending: true });

	if (themesError) {
		throw error(500, `Erreur de chargement du référentiel : ${themesError.message}`);
	}

	// 2. État des points (is_acquired, needs_remediation)
	const { data: stateData, error: stateError } = await locals.supabase
		.from('student_point_state_v')
		.select('point_id, is_acquired, needs_remediation')
		.eq('student_id', user.id);

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

	// 3. Collecte de tous les point_ids actifs puis calcul des badges FSRS
	const allPointIds: string[] = [];
	for (const t of themesData ?? []) {
		for (const o of t.curriculum_objectives ?? []) {
			for (const p of o.curriculum_points ?? []) {
				if (!p.archived_at) allPointIds.push(p.id);
			}
		}
	}
	const badges = await computePointBadges(locals.supabase, user.id, allPointIds);

	// 4. Construire structure
	const themes: ThemeWithObjectives[] = (themesData ?? []).map((theme) => {
		const objectives: ObjectiveSummary[] = (theme.curriculum_objectives ?? []).map((obj) => {
			const points = (obj.curriculum_points ?? []).filter((p) => !p.archived_at);
			// Un objectif « à échelle » est celui dont au moins un point porte un rang.
			const has_scale = points.some((p) => p.rang !== null);
			let rang_max: 0 | 1 | 2 | 3 | 4 = 0;
			let acquired_count = 0;
			let has_remediation = false;
			const objBadges: CapacityBadge[] = [];
			for (const point of points) {
				const state = stateByPoint.get(point.id);
				if (state?.is_acquired) {
					acquired_count += 1;
					const r = point.rang;
					if (r !== null && r >= 1 && r <= 4 && r > rang_max) {
						rang_max = r as 1 | 2 | 3 | 4;
					}
				}
				if (state?.needs_remediation) has_remediation = true;
				const b = badges.get(point.id);
				if (b) objBadges.push(b);
			}
			return {
				id: obj.id,
				name: obj.name,
				theme_id: obj.theme_id,
				theme_name: theme.name,
				display_order: obj.display_order,
				has_scale,
				rang_max_acquired: has_scale ? rang_max : 0,
				acquired_count,
				total_count: points.length,
				has_remediation,
				fsrs_badge: worstBadge(objBadges)
			};
		});
		objectives.sort((a, b) => a.display_order - b.display_order);
		return {
			id: theme.id,
			name: theme.name,
			display_order: theme.display_order,
			objectives
		};
	});

	// 5. Agrégats
	let mastery = 0,
		atteint = 0,
		en_cours = 0,
		non_commence = 0,
		remediation_count = 0,
		to_reinforce_count = 0;
	let total = 0;
	for (const t of themes) {
		for (const o of t.objectives) {
			total += 1;
			if (o.has_scale) {
				// Objectif à échelle : le niveau se lit sur le rang max acquis.
				if (o.rang_max_acquired === 4) mastery += 1;
				else if (o.rang_max_acquired === 3) atteint += 1;
				else if (o.rang_max_acquired >= 1) en_cours += 1;
				else non_commence += 1;
			} else {
				// Objectif sans échelle : on lit la couverture. Pas de ✨ — « aller
				// au-delà de l'attendu » n'a de sens que si une échelle le définit.
				if (o.total_count > 0 && o.acquired_count === o.total_count) atteint += 1;
				else if (o.acquired_count > 0) en_cours += 1;
				else non_commence += 1;
			}
			if (o.has_remediation || o.fsrs_badge === 'a_remedier') remediation_count += 1;
			else if (o.fsrs_badge === 'a_renforcer') to_reinforce_count += 1;
		}
	}

	return {
		themes,
		stats: {
			total,
			mastery,
			atteint,
			en_cours,
			non_commence,
			remediation_count,
			to_reinforce_count
		}
	};
};
