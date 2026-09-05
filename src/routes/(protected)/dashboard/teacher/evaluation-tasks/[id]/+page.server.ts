/**
 * Teacher Evaluation Task — edit + perimeter declaration
 * ======================================================
 *
 * UI prof Phase 4.1 — Édition d'une tâche d'évaluation et déclaration du
 * périmètre (sélection des observables famille B à observer en séance).
 *
 * Spec : docs/wip/skills-referentiel-design.md §3 (périmètre dynamique)
 */

import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import { z } from 'zod';
import type { MathCompetenceCode, SubdimensionLetter } from '$lib/types/skills';

export interface ObservableForPerimeter {
	skill_id: string;
	observable_code: string;
	name: string; // énoncé élève
	teacher_grid_text: string | null; // grille enseignant
	in_perimeter: boolean;
}

export interface SubdimensionGroup {
	letter: SubdimensionLetter;
	name: string;
	observables: ObservableForPerimeter[];
}

export interface MathCompetenceGroup {
	id: string;
	code: MathCompetenceCode;
	name: string;
	gloss_for_student: string;
	subdimensions: SubdimensionGroup[];
}

export interface TaskEditData {
	id: string;
	name: string;
	description: string | null;
	niveau_scolaire: string;
	class_id: string | null;
	task_date: string | null;
	competences: MathCompetenceGroup[];
	classes: Array<{ id: string; name: string }>;
	perimeter_count: number;
}

export const load: PageServerLoad = async ({ locals, params }): Promise<TaskEditData> => {
	await requireRole(locals, 'teacher');

	// 1. Charger la tâche
	const { data: task, error: taskErr } = await locals.supabase
		.from('evaluation_tasks')
		.select('id, name, description, niveau_scolaire, class_id, task_date')
		.eq('id', params.id)
		.maybeSingle();

	if (taskErr) throw error(500, `Erreur de chargement : ${taskErr.message}`);
	if (!task) throw error(404, 'Tâche introuvable');

	// 2. Classes du prof pour le selecteur
	const { data: classes } = await locals.supabase
		.from('classes')
		.select('id, name')
		.eq('is_active', true)
		.order('name');

	// 3. Toutes les compétences math + sous-dimensions + observables (lecture publique)
	const { data: competences, error: compErr } = await locals.supabase
		.from('math_competences')
		.select(
			`
				id,
				code,
				name,
				gloss_for_student,
				display_order,
				subdimensions:math_competence_subdimensions (
					letter,
					name,
					display_order,
					observables (
						id,
						name,
						teacher_grid_text,
						observable_code,
						display_order
					)
				)
			`
		)
		.order('display_order');

	if (compErr) throw error(500, `Erreur compétences : ${compErr.message}`);

	// 4. Périmètre actuel de la tâche
	const { data: perimeter } = await locals.supabase
		.from('evaluation_task_perimeter')
		.select('observable_id')
		.eq('task_id', params.id);

	const perimeterSet = new Set((perimeter ?? []).map((p) => p.observable_id));

	// 5. Construire la structure groupée
	const competencesGroups: MathCompetenceGroup[] = (competences ?? []).map((c) => {
		const subdims = (c.subdimensions ?? [])
			.slice()
			.sort((a, b) => a.display_order - b.display_order)
			.map((sd) => {
				const observables: ObservableForPerimeter[] = (sd.observables ?? [])
					.slice()
					.sort((a, b) => a.display_order - b.display_order)
					.map((sk) => ({
						skill_id: sk.id,
						observable_code: sk.observable_code ?? '?',
						name: sk.name,
						teacher_grid_text: sk.teacher_grid_text,
						in_perimeter: perimeterSet.has(sk.id)
					}));
				return {
					letter: sd.letter as SubdimensionLetter,
					name: sd.name,
					observables
				};
			});
		return {
			id: c.id,
			code: c.code as MathCompetenceCode,
			name: c.name,
			gloss_for_student: c.gloss_for_student,
			subdimensions: subdims
		};
	});

	return {
		id: task.id,
		name: task.name,
		description: task.description,
		niveau_scolaire: task.niveau_scolaire,
		class_id: task.class_id,
		task_date: task.task_date,
		competences: competencesGroups,
		classes: (classes ?? []) as Array<{ id: string; name: string }>,
		perimeter_count: perimeterSet.size
	};
};

const updateSchema = z.object({
	name: z.string().trim().min(1).max(200),
	description: z.string().nullable().optional(),
	class_id: z.string().uuid().nullable().optional(),
	task_date: z.string().nullable().optional()
});

export const actions: Actions = {
	update_meta: async ({ locals, request, params }) => {
		await requireRole(locals, 'teacher');
		const formData = await request.formData();
		const raw = {
			name: formData.get('name'),
			description: formData.get('description') || null,
			class_id: formData.get('class_id') || null,
			task_date: formData.get('task_date') || null
		};
		const parsed = updateSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0]?.message ?? 'Invalid input' });
		}
		const { error: updErr } = await locals.supabase
			.from('evaluation_tasks')
			.update({
				name: parsed.data.name,
				description: parsed.data.description ?? null,
				class_id: parsed.data.class_id || null,
				task_date: parsed.data.task_date || null
			})
			.eq('id', params.id);
		if (updErr) return fail(500, { message: updErr.message });
		return { success: true, message: 'Tâche mise à jour' };
	},

	save_perimeter: async ({ locals, request, params }) => {
		await requireRole(locals, 'teacher');
		// Vérifier l'existence de la tâche
		const { data: task } = await locals.supabase
			.from('evaluation_tasks')
			.select('id')
			.eq('id', params.id)
			.maybeSingle();
		if (!task) {
			return fail(404, { message: 'Tâche introuvable' });
		}

		const formData = await request.formData();
		const skillIds = formData.getAll('skill_id').map(String).filter(Boolean);

		// Stratégie idempotente : DELETE all + INSERT new (le périmètre est de petite taille, <100 lignes)
		const { error: delErr } = await locals.supabase
			.from('evaluation_task_perimeter')
			.delete()
			.eq('task_id', params.id);
		if (delErr) return fail(500, { message: `DELETE failed: ${delErr.message}` });

		if (skillIds.length > 0) {
			const { error: insErr } = await locals.supabase
				.from('evaluation_task_perimeter')
				.insert(skillIds.map((sid) => ({ task_id: params.id, observable_id: sid })));
			if (insErr) return fail(500, { message: `INSERT failed: ${insErr.message}` });
		}

		return { success: true, message: `Périmètre enregistré (${skillIds.length} observables)` };
	},

	delete: async ({ locals, params }) => {
		await requireRole(locals, 'teacher');
		const { error: delErr } = await locals.supabase
			.from('evaluation_tasks')
			.delete()
			.eq('id', params.id);
		if (delErr) return fail(500, { message: delErr.message });
		throw redirect(303, '/dashboard/teacher/evaluation-tasks');
	}
};
