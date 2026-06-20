/**
 * Teacher Evaluation Task — saisie en séance (famille B)
 * ======================================================
 *
 * UI prof Phase 4.2 — Saisie en séance des observables d'une tâche
 * d'évaluation famille B.
 *
 * Le prof voit la liste des observables du périmètre déclaré + les élèves
 * de la classe ciblée. Pour chaque (élève × observable) il coche les
 * réussites ; les non-cochés du périmètre deviennent automatiquement `–`
 * à l'enregistrement ; hors périmètre = ∅ implicite.
 *
 * Spec : docs/wip/skills-referentiel-design.md §3 (saisie par périmètre)
 */

import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';

export interface StudentRow {
	id: string;
	full_name: string;
	avatar_url: string | null;
}

export interface PerimeterObservable {
	skill_id: string;
	observable_code: string;
	name: string;
	teacher_grid_text: string | null;
	competence_name: string;
	subdimension_letter: string;
}

export interface SaisieData {
	task_id: string;
	task_name: string;
	task_date: string | null;
	class_id: string | null;
	class_name: string | null;
	students: StudentRow[];
	observables: PerimeterObservable[];
	/** Map "studentId:skillId" → 'plus' | 'minus' (état actuel d'après les attempts existants) */
	existing: Record<string, 'plus' | 'minus'>;
}

export const load: PageServerLoad = async ({ locals, params }): Promise<SaisieData> => {
	await requireRole(locals, 'teacher');

	// 1. Charger la tâche + vérifier propriété
	const { data: task, error: taskErr } = await locals.supabase
		.from('evaluation_tasks')
		.select(
			`
				id, name, task_date, class_id,
				class:classes (id, name)
			`
		)
		.eq('id', params.id)
		.maybeSingle();

	if (taskErr) throw error(500, `Erreur tâche : ${taskErr.message}`);
	if (!task) throw error(404, 'Tâche introuvable');

	const cls = Array.isArray(task.class) ? task.class[0] : task.class;
	if (!task.class_id) {
		throw error(
			400,
			"Cette tâche n'est rattachée à aucune classe. Édite-la d'abord pour en choisir une."
		);
	}

	// 2. Élèves actifs de la classe
	const { data: members } = await locals.supabase
		.from('class_members')
		.select(
			`
				student_id,
				profiles:student_id (id, full_name, avatar_url)
			`
		)
		.eq('class_id', task.class_id);

	const students: StudentRow[] = (members ?? [])
		.map((m) => {
			const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
			return p ? { id: p.id, full_name: p.full_name ?? '?', avatar_url: p.avatar_url } : null;
		})
		.filter((s): s is StudentRow => s !== null)
		.sort((a, b) => a.full_name.localeCompare(b.full_name, 'fr'));

	// 3. Périmètre : observables avec leur compétence/sous-dim parent (pour grouping UI)
	const { data: perimeter, error: perErr } = await locals.supabase
		.from('evaluation_task_perimeter')
		.select(
			`
				skill:skills (
					id,
					name,
					observable_code,
					teacher_grid_text,
					display_order,
					subdimension:math_competence_subdimensions (
						letter,
						display_order,
						competence:math_competences (
							name,
							display_order
						)
					)
				)
			`
		)
		.eq('task_id', params.id);

	if (perErr) throw error(500, `Erreur périmètre : ${perErr.message}`);

	const observables: PerimeterObservable[] = (perimeter ?? [])
		.map((row) => {
			const sk = Array.isArray(row.skill) ? row.skill[0] : row.skill;
			if (!sk) return null;
			const sd = Array.isArray(sk.subdimension) ? sk.subdimension[0] : sk.subdimension;
			const comp = sd ? (Array.isArray(sd.competence) ? sd.competence[0] : sd.competence) : null;
			return {
				skill_id: sk.id,
				observable_code: sk.observable_code ?? '?',
				name: sk.name,
				teacher_grid_text: sk.teacher_grid_text,
				competence_name: comp?.name ?? '?',
				subdimension_letter: sd?.letter ?? '?',
				_compOrder: comp?.display_order ?? 999,
				_sdOrder: sd?.display_order ?? 999,
				_obsOrder: sk.display_order ?? 999
			};
		})
		.filter(
			(x): x is PerimeterObservable & { _compOrder: number; _sdOrder: number; _obsOrder: number } =>
				x !== null
		)
		.sort(
			(a, b) => a._compOrder - b._compOrder || a._sdOrder - b._sdOrder || a._obsOrder - b._obsOrder
		)
		.map(({ _compOrder, _sdOrder, _obsOrder, ...rest }) => rest);

	// 4. Attempts existants pour cette tâche (idempotence)
	const { data: existingAttempts } = await locals.supabase
		.from('skill_attempts')
		.select('student_id, skill_id, code, created_at')
		.eq('task_id', params.id)
		.order('created_at', { ascending: true });

	// Garder le dernier code par (student × skill)
	const existing: Record<string, 'plus' | 'minus'> = {};
	for (const a of existingAttempts ?? []) {
		if (a.student_id && a.skill_id && (a.code === 'plus' || a.code === 'minus')) {
			existing[`${a.student_id}:${a.skill_id}`] = a.code;
		}
	}

	return {
		task_id: task.id,
		task_name: task.name,
		task_date: task.task_date,
		class_id: task.class_id,
		class_name: cls?.name ?? null,
		students,
		observables,
		existing
	};
};

export const actions: Actions = {
	save: async ({ locals, request, params }) => {
		await requireRole(locals, 'teacher');

		// Re-vérifier l'existence
		const { data: task } = await locals.supabase
			.from('evaluation_tasks')
			.select('id, class_id')
			.eq('id', params.id)
			.maybeSingle();
		if (!task) {
			return fail(404, { message: 'Tâche introuvable' });
		}

		// Récupérer le périmètre (skill_ids autorisés)
		const { data: perimeter } = await locals.supabase
			.from('evaluation_task_perimeter')
			.select('skill_id')
			.eq('task_id', params.id);
		const allowedSkillIds = new Set((perimeter ?? []).map((p) => p.skill_id));
		if (allowedSkillIds.size === 0) {
			return fail(400, { message: 'Aucun observable dans le périmètre.' });
		}

		// Récupérer les élèves de la classe
		const { data: members } = await locals.supabase
			.from('class_members')
			.select('student_id')
			.eq('class_id', task.class_id);
		const allowedStudentIds = new Set((members ?? []).map((m) => m.student_id).filter(Boolean));
		if (allowedStudentIds.size === 0) {
			return fail(400, { message: 'Aucun élève dans la classe.' });
		}

		// Parser le body : chaque "check__<studentId>__<skillId>" = 'on' si coché
		const formData = await request.formData();
		const checked = new Set<string>();
		for (const [key, val] of formData.entries()) {
			if (!key.startsWith('check__') || val !== 'on') continue;
			const [, sid, skid] = key.split('__');
			if (allowedStudentIds.has(sid) && allowedSkillIds.has(skid)) {
				checked.add(`${sid}:${skid}`);
			}
		}

		// Construire les rows à insérer : tous les (student × skill du périmètre)
		// → 'plus' si coché, 'minus' sinon
		const rowsToInsert: Array<{
			student_id: string;
			skill_id: string;
			code: 'plus' | 'minus';
			task_id: string;
			source: 'teacher';
		}> = [];
		for (const sid of allowedStudentIds) {
			if (!sid) continue;
			for (const skid of allowedSkillIds) {
				rowsToInsert.push({
					student_id: sid,
					skill_id: skid,
					code: checked.has(`${sid}:${skid}`) ? 'plus' : 'minus',
					task_id: params.id,
					source: 'teacher'
				});
			}
		}

		// Idempotence : DELETE tous les attempts existants de cette tâche, puis INSERT batch
		const { error: delErr } = await locals.supabase
			.from('skill_attempts')
			.delete()
			.eq('task_id', params.id);
		if (delErr) return fail(500, { message: `DELETE failed: ${delErr.message}` });

		const { error: insErr } = await locals.supabase.from('skill_attempts').insert(rowsToInsert);
		if (insErr) return fail(500, { message: `INSERT failed: ${insErr.message}` });

		return {
			success: true,
			message: `Saisie enregistrée (${rowsToInsert.length} observations, ${checked.size} réussites)`
		};
	}
};
