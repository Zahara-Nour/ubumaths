/**
 * Student Competences Math — list
 * ===============================
 *
 * UI élève Phase 5 — Liste des 6 compétences math (famille B) avec leur
 * niveau du socle calculé par les fonctions PL/pgSQL.
 *
 * Spec : docs/wip/skills-referentiel-design.md §8 (vue compétences math)
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import type { MathCompetenceCode, MathCompetenceLevel } from '$lib/types/skills';

export interface MathCompetenceSummary {
	id: string;
	code: MathCompetenceCode;
	name: string;
	gloss_for_student: string;
	display_order: number;
	niveau: MathCompetenceLevel;
	task_count: number;
}

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await requireRole(locals, 'student');

	// 1. Les 6 compétences (lecture publique)
	const { data: competences, error: cErr } = await locals.supabase
		.from('math_competences')
		.select('id, code, name, gloss_for_student, display_order')
		.order('display_order');

	if (cErr) throw error(500, `Erreur compétences : ${cErr.message}`);

	// 2. Niveaux calculés pour cet élève
	const { data: levels } = await locals.supabase
		.from('student_competence_level')
		.select('math_competence_id, niveau, task_count')
		.eq('student_id', user.id);

	const levelByCompId = new Map<string, { niveau: MathCompetenceLevel; task_count: number }>();
	for (const l of levels ?? []) {
		if (l.math_competence_id) {
			levelByCompId.set(l.math_competence_id, {
				niveau: (l.niveau as MathCompetenceLevel) ?? 'insuffisante',
				task_count: l.task_count ?? 0
			});
		}
	}

	const items: MathCompetenceSummary[] = (competences ?? []).map((c) => {
		const lvl = levelByCompId.get(c.id);
		return {
			id: c.id,
			code: c.code as MathCompetenceCode,
			name: c.name,
			gloss_for_student: c.gloss_for_student,
			display_order: c.display_order,
			niveau: lvl?.niveau ?? 'insuffisante',
			task_count: lvl?.task_count ?? 0
		};
	});

	return { items };
};
