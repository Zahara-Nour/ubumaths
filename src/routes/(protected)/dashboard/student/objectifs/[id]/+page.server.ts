/**
 * Student Objectif Detail Page Server
 * ===================================
 *
 * UI élève Phase 3.2 — Détail d'un objectif famille knowledge (4 capacités).
 *
 * Spec : docs/wip/skills-referentiel-design.md §8 (vue détail style PDF 2016)
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';

export interface CapacityDetail {
	id: string;
	name: string;
	display_order: 1 | 2 | 3 | 4;
	knowledge_type: 'automatisme' | 'capacite_attendue' | null;
	is_acquired: boolean;
	to_review: boolean;
	needs_remediation: boolean;
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

	// 2. Charger l'état des capacités via la VIEW (avec to_review)
	const { data: stateData, error: stateError } = await locals.supabase
		.from('student_skill_state_a_v')
		.select('skill_id, is_acquired, needs_remediation, to_review')
		.eq('student_id', user.id)
		.in('skill_id', skillIds);

	if (stateError) {
		throw error(500, `Erreur de chargement de l'état : ${stateError.message}`);
	}

	const stateBySkill = new Map<
		string,
		{ is_acquired: boolean; needs_remediation: boolean; to_review: boolean }
	>();
	for (const row of stateData ?? []) {
		if (!row.skill_id) continue;
		stateBySkill.set(row.skill_id, {
			is_acquired: row.is_acquired ?? false,
			needs_remediation: row.needs_remediation ?? false,
			to_review: row.to_review ?? false
		});
	}

	// 3. Construire les 4 capacités ordonnées (rang 1-4)
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
				to_review: state?.to_review ?? false,
				needs_remediation: state?.needs_remediation ?? false
			};
		});

	// 4. Niveau atteint
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
