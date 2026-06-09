/**
 * Student Objectifs Page Server
 * =============================
 *
 * UI élève Phase 3.1 — Liste des objectifs famille knowledge (capacités 6ᵉ).
 *
 * Lit `student_skill_state_a_v` (VIEW avec `to_review` calculé), joint avec
 * `skills` + `skill_objectives` + `skill_themes` pour reconstruire l'arbre
 * par thème → objectif → capacités (rang 1-4).
 *
 * Spec : docs/wip/skills-referentiel-design.md §6.3, §8
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';

export interface ObjectiveSummary {
	id: string;
	name: string;
	theme_id: string;
	theme_name: string;
	display_order: number;
	/** Rang max des capacités acquises (0 si aucune). Cf. §6.3. */
	rang_max_acquired: 0 | 1 | 2 | 3 | 4;
	/** Nombre de capacités acquises (peut différer du rang max si non contigu). */
	acquired_count: number;
	/** Total = 4 (modèle B). */
	total_count: number;
	/** Au moins 1 capacité needs_remediation=true. */
	has_remediation: boolean;
	/** Au moins 1 capacité acquise mais to_review=true. */
	has_to_review: boolean;
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
	};
}

export const load: PageServerLoad = async ({ locals }): Promise<ObjectifsPageData> => {
	const { user } = await requireRole(locals, 'student');

	// 1. Charger thèmes + objectifs + skills du niveau scolaire 6ᵉ
	//    (le V1 ne supporte que la 6ᵉ — cf. décision Q4)
	const { data: themesData, error: themesError } = await locals.supabase
		.from('skill_themes')
		.select(
			`
				id,
				name,
				display_order,
				skill_objectives (
					id,
					name,
					display_order,
					theme_id,
					skills!skills_objective_id_fkey (
						id,
						display_order
					)
				)
			`
		)
		.eq('niveau_scolaire', '6e')
		.order('display_order', { ascending: true });

	if (themesError) {
		throw error(500, `Erreur de chargement du référentiel : ${themesError.message}`);
	}

	// 2. Charger l'état des capacités de l'élève via la VIEW (avec to_review)
	const { data: stateData, error: stateError } = await locals.supabase
		.from('student_skill_state_a_v')
		.select('skill_id, is_acquired, needs_remediation, to_review')
		.eq('student_id', user.id);

	if (stateError) {
		throw error(500, `Erreur de chargement de l'état : ${stateError.message}`);
	}

	// 3. Indexer l'état par skill_id pour lookup rapide
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

	// 4. Construire la structure thèmes → objectifs avec rang_max_acquired
	const themes: ThemeWithObjectives[] = (themesData ?? []).map((theme) => {
		const objectives: ObjectiveSummary[] = (theme.skill_objectives ?? []).map((obj) => {
			const skills = obj.skills ?? [];
			let rang_max: 0 | 1 | 2 | 3 | 4 = 0;
			let acquired_count = 0;
			let has_remediation = false;
			let has_to_review = false;
			for (const skill of skills) {
				const state = stateBySkill.get(skill.id);
				if (!state) continue;
				if (state.is_acquired) {
					acquired_count += 1;
					const r = skill.display_order;
					if (r >= 1 && r <= 4 && r > rang_max) {
						rang_max = r as 1 | 2 | 3 | 4;
					}
					if (state.to_review) has_to_review = true;
				}
				if (state.needs_remediation) has_remediation = true;
			}
			return {
				id: obj.id,
				name: obj.name,
				theme_id: obj.theme_id,
				theme_name: theme.name,
				display_order: obj.display_order,
				rang_max_acquired: rang_max,
				acquired_count,
				total_count: 4,
				has_remediation,
				has_to_review
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

	// 5. Agrégats pour le header
	let mastery = 0,
		atteint = 0,
		en_cours = 0,
		non_commence = 0,
		remediation_count = 0;
	let total = 0;
	for (const t of themes) {
		for (const o of t.objectives) {
			total += 1;
			if (o.rang_max_acquired === 4) mastery += 1;
			else if (o.rang_max_acquired === 3) atteint += 1;
			else if (o.rang_max_acquired >= 1) en_cours += 1;
			else non_commence += 1;
			if (o.has_remediation) remediation_count += 1;
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
			remediation_count
		}
	};
};
