/**
 * Student Objectifs Page Server
 *
 * UI élève — Liste des objectifs famille knowledge (capacités 6ᵉ).
 *
 * Refonte 2026-06-10 (Phase 3 chantier SRS/FSRS) :
 * - `to_review` (basé sur seuil 30j arbitraire) supprimé de la VIEW et de la page.
 * - Calcul d'un badge FSRS agrégé par objectif (priorité du pire badge sur ses
 *   capacités) via `computeCapacityBadges`.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { computeCapacityBadges, type CapacityBadge } from '$lib/server/srs/capacity-badge';

export interface ObjectiveSummary {
	id: string;
	name: string;
	theme_id: string;
	theme_name: string;
	display_order: number;
	rang_max_acquired: 0 | 1 | 2 | 3 | 4;
	acquired_count: number;
	total_count: number;
	has_remediation: boolean;
	/** Pire badge FSRS parmi les capacités (priorité a_remedier > a_renforcer > ...). */
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

const BADGE_PRIORITY: Record<CapacityBadge, number> = {
	a_remedier: 5,
	a_renforcer: 4,
	en_apprentissage: 3,
	acquise_en_memoire: 2,
	non_commencee: 1
};

function worstBadge(badges: CapacityBadge[]): CapacityBadge {
	if (badges.length === 0) return 'non_commencee';
	return badges.reduce((acc, b) => (BADGE_PRIORITY[b] > BADGE_PRIORITY[acc] ? b : acc));
}

export const load: PageServerLoad = async ({ locals }): Promise<ObjectifsPageData> => {
	const { user } = await requireRole(locals, 'student');

	// 1. Charger thèmes + objectifs + skills du niveau scolaire 6ᵉ
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

	// 2. État BO des capacités (is_acquired, needs_remediation)
	const { data: stateData, error: stateError } = await locals.supabase
		.from('student_skill_state_a_v')
		.select('skill_id, is_acquired, needs_remediation')
		.eq('student_id', user.id);

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

	// 3. Collecte de tous les skill_ids puis calcul des badges FSRS
	const allSkillIds: string[] = [];
	for (const t of themesData ?? []) {
		for (const o of t.skill_objectives ?? []) {
			for (const s of o.skills ?? []) allSkillIds.push(s.id);
		}
	}
	const badges = await computeCapacityBadges(locals.supabase, user.id, allSkillIds);

	// 4. Construire structure
	const themes: ThemeWithObjectives[] = (themesData ?? []).map((theme) => {
		const objectives: ObjectiveSummary[] = (theme.skill_objectives ?? []).map((obj) => {
			const skills = obj.skills ?? [];
			let rang_max: 0 | 1 | 2 | 3 | 4 = 0;
			let acquired_count = 0;
			let has_remediation = false;
			const objBadges: CapacityBadge[] = [];
			for (const skill of skills) {
				const state = stateBySkill.get(skill.id);
				if (state?.is_acquired) {
					acquired_count += 1;
					const r = skill.display_order;
					if (r >= 1 && r <= 4 && r > rang_max) {
						rang_max = r as 1 | 2 | 3 | 4;
					}
				}
				if (state?.needs_remediation) has_remediation = true;
				const b = badges.get(skill.id);
				if (b) objBadges.push(b);
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
			if (o.rang_max_acquired === 4) mastery += 1;
			else if (o.rang_max_acquired === 3) atteint += 1;
			else if (o.rang_max_acquired >= 1) en_cours += 1;
			else non_commence += 1;
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
