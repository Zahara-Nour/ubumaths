/**
 * Student Objectif Detail Page Server
 *
 * UI élève — Détail d'un objectif famille knowledge (4 capacités).
 *
 * Refonte 2026-06-10 (Phase 3 chantier SRS/FSRS) :
 * - Suppression du flag `to_review` (issu de la VIEW, basé sur seuil 30j).
 * - Ajout du badge FSRS agrégé calculé via `computeCapacityBadges` à partir
 *   de l'état `srs_card_stats` des templates tagués sur chaque capacité.
 *
 * Spec : docs/wip/srs-fsrs-spec-tdd.md §5
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { computeCapacityBadges, type CapacityBadge } from '$lib/server/srs/capacity-badge';

export interface CapacityDetail {
	id: string;
	name: string;
	display_order: 1 | 2 | 3 | 4;
	knowledge_type: 'automatisme' | 'capacite_attendue' | null;
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
	rang_max_acquired: 0 | 1 | 2 | 3 | 4;
	acquired_count: number;
}

export const load: PageServerLoad = async ({ locals, params }): Promise<ObjectiveDetailData> => {
	const { user } = await requireRole(locals, 'student');

	// 1. Charger l'objectif + ses capacités + thème parent
	const { data: objData, error: objError } = await locals.supabase
		.from('skill_objectives')
		.select(
			`
				id,
				name,
				description,
				theme:skill_themes!skill_objectives_theme_id_fkey (
					id,
					name
				),
				skills!skills_objective_id_fkey (
					id,
					name,
					display_order,
					knowledge_type
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

	const skills = objData.skills ?? [];
	const skillIds = skills.map((s) => s.id);

	// 2. Charger l'état BO des capacités (is_acquired, needs_remediation)
	const { data: stateData, error: stateError } = await locals.supabase
		.from('student_skill_state_a_v')
		.select('skill_id, is_acquired, needs_remediation')
		.eq('student_id', user.id)
		.in('skill_id', skillIds);

	if (stateError) {
		throw error(500, `Erreur de chargement de l'état : ${stateError.message}`);
	}

	const stateBySkill = new Map<string, { is_acquired: boolean; needs_remediation: boolean }>();
	for (const row of stateData ?? []) {
		if (!row.skill_id) continue;
		stateBySkill.set(row.skill_id, {
			is_acquired: row.is_acquired ?? false,
			needs_remediation: row.needs_remediation ?? false
		});
	}

	// 3. Calcul des badges FSRS agrégés
	const badges = await computeCapacityBadges(locals.supabase, user.id, skillIds);

	// 4. Construire les 4 capacités ordonnées (rang 1-4)
	const capacities: CapacityDetail[] = skills
		.filter((s) => s.display_order >= 1 && s.display_order <= 4)
		.sort((a, b) => a.display_order - b.display_order)
		.map((s) => {
			const state = stateBySkill.get(s.id);
			return {
				id: s.id,
				name: s.name,
				display_order: s.display_order as 1 | 2 | 3 | 4,
				knowledge_type: (s.knowledge_type as 'automatisme' | 'capacite_attendue' | null) ?? null,
				is_acquired: state?.is_acquired ?? false,
				needs_remediation: state?.needs_remediation ?? false,
				badge: badges.get(s.id) ?? 'non_commencee'
			};
		});

	// 5. Niveau atteint
	let rang_max: 0 | 1 | 2 | 3 | 4 = 0;
	let acquired_count = 0;
	for (const c of capacities) {
		if (c.is_acquired) {
			acquired_count += 1;
			if (c.display_order > rang_max) {
				rang_max = c.display_order;
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
		rang_max_acquired: rang_max,
		acquired_count
	};
};
