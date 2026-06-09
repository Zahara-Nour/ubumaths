/**
 * Teacher Evaluation Tasks — list
 * ===============================
 *
 * UI prof Phase 4.1 — Liste des tâches d'évaluation famille B créées
 * par ce prof. Chacune mène à l'édition (périmètre) et plus tard à la
 * saisie en séance.
 *
 * Spec : docs/wip/skills-referentiel-design.md §3 (périmètre), §7 (evaluation_tasks)
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';

export interface EvaluationTaskListItem {
	id: string;
	name: string;
	description: string | null;
	niveau_scolaire: string;
	class_id: string | null;
	class_name: string | null;
	task_date: string | null;
	created_at: string;
	perimeter_count: number;
}

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await requireRole(locals, 'teacher');

	const { data, error: err } = await locals.supabase
		.from('evaluation_tasks')
		.select(
			`
				id,
				name,
				description,
				niveau_scolaire,
				class_id,
				task_date,
				created_at,
				class:classes (
					id,
					name
				),
				perimeter:evaluation_task_perimeter (skill_id)
			`
		)
		.eq('teacher_id', user.id)
		.order('task_date', { ascending: false, nullsFirst: false })
		.order('created_at', { ascending: false });

	if (err) {
		throw error(500, `Erreur de chargement : ${err.message}`);
	}

	const tasks: EvaluationTaskListItem[] = (data ?? []).map((t) => {
		const cls = Array.isArray(t.class) ? t.class[0] : t.class;
		return {
			id: t.id,
			name: t.name,
			description: t.description,
			niveau_scolaire: t.niveau_scolaire,
			class_id: t.class_id,
			class_name: cls?.name ?? null,
			task_date: t.task_date,
			created_at: t.created_at,
			perimeter_count: (t.perimeter ?? []).length
		};
	});

	return { tasks };
};
