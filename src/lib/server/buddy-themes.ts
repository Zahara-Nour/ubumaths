/**
 * Thème du programme d'une question, pour le bonus « nouveau thème » du Palotin
 * ==============================================================================
 *
 * Le thème d'une réponse est celui du programme du point que valide la
 * question : `question_template_points` → `curriculum_points` →
 * `curriculum_objectives` → `curriculum_themes`. On retient l'IDENTIFIANT du
 * thème (stable, contrairement à son nom) ; il est rangé tel quel dans
 * `student_buddies.themes_explored`.
 *
 * Une question qui valide des points de plusieurs thèmes en reçoit UN seul,
 * toujours le même (le plus petit identifiant) : la réponse garde un seul thème,
 * comme le calcul d'XP l'attend, et le choix ne dépend pas de l'ordre de lecture.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('server/buddy-themes');

/**
 * Thème du programme de chaque question, en UNE requête pour toute la séance.
 *
 * Une question sans point (ou dont le point n'a pas d'objectif) est absente de
 * la carte rendue. Une panne de lecture ne lève pas : elle rend une carte vide
 * (aucun bonus de thème), le gain de base reste dû.
 */
export async function fetchTemplateThemeIds(
	supabase: SupabaseClient<Database>,
	templateIds: string[]
): Promise<Map<string, string>> {
	const themes = new Map<string, string>();
	if (templateIds.length === 0) return themes;

	// Jointures à gauche (pas de `!inner`) : un point masqué ne fait pas
	// disparaître la ligne, il laisse seulement la question sans thème.
	const { data, error } = await supabase
		.from('question_template_points')
		.select('template_id, curriculum_points(curriculum_objectives(theme_id))')
		.in('template_id', templateIds);

	if (error) {
		logger.error('Thèmes des questions illisibles :', error);
		return themes;
	}

	for (const link of data ?? []) {
		const themeId = link.curriculum_points?.curriculum_objectives?.theme_id;
		if (!themeId) continue;
		const current = themes.get(link.template_id);
		if (current === undefined || themeId < current) themes.set(link.template_id, themeId);
	}

	return themes;
}
