/**
 * Teacher — Avancement d'une fiche assignée
 * ==========================================
 *
 * Rend visible au prof l'auto-évaluation que les élèves posent exercice par
 * exercice dans la vue fiche (`student_exercise_mastery`). C'était jusqu'ici
 * le seul signal pédagogique réellement produit par les élèves, et aucune page
 * enseignante ne le lisait.
 *
 * Les fiches étant en consultation seule (pas de rendu, pas de correction
 * automatique), c'est aussi la seule mesure d'avancement disponible.
 *
 * Périmètre des élèves = membres actifs de la classe ciblée ∪ élèves assignés
 * individuellement. Une assignation peut être l'un, l'autre, ou les deux.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { requireRoles } from '$lib/server/middleware/auth';
import type { MasteryStatus } from '$lib/types/exercise-mastery';

const uuidSchema = z.string().uuid();

export interface StudentProgressRow {
	studentId: string;
	displayName: string;
	/** Exercices positionnés « maîtrisé ». */
	mastered: number;
	/** Exercices positionnés « à retravailler » — le signal de décrochage. */
	needsReview: number;
	/** Exercices positionnés « non travaillé » (déclaration explicite). */
	notWorked: number;
	/** Exercices jamais positionnés. */
	untouched: number;
	/** Date de la dernière auto-évaluation, ou null si aucune. */
	lastActivityAt: string | null;
}

export interface WorksheetProgressData {
	worksheetTitle: string;
	assignmentTitle: string | null;
	className: string | null;
	exerciseCount: number;
	students: StudentProgressRow[];
	stats: {
		total: number;
		/** Élèves ayant positionné au moins un exercice. */
		started: number;
		/** Élèves ayant positionné tous les exercices. */
		completed: number;
		/** Élèves avec au moins un « à retravailler ». */
		struggling: number;
	};
}

function formatName(first: string | null, last: string | null): string {
	return [first, last].filter((x): x is string => !!x?.trim()).join(' ') || 'Élève sans nom';
}

export const load: PageServerLoad = async ({ locals, params }): Promise<WorksheetProgressData> => {
	await requireRoles(locals, ['teacher', 'admin']);

	if (!uuidSchema.safeParse(params.id).success) throw error(400, 'ID de fiche invalide');
	if (!uuidSchema.safeParse(params.assignmentId).success) {
		throw error(400, "ID d'assignation invalide");
	}

	const { data: worksheet } = await locals.supabase
		.from('worksheets')
		.select('id, title')
		.eq('id', params.id)
		.maybeSingle();
	if (!worksheet) throw error(404, 'Fiche non trouvée');

	const { data: assignment } = await locals.supabase
		.from('worksheet_assignments')
		.select('id, title, class_id, worksheet_id')
		.eq('id', params.assignmentId)
		.eq('worksheet_id', params.id)
		.maybeSingle();
	if (!assignment) throw error(404, 'Assignation non trouvée');

	// --- Périmètre élèves : classe ciblée ∪ assignés individuellement ---------
	const studentIds = new Set<string>();
	let className: string | null = null;

	if (assignment.class_id) {
		const [{ data: klass }, { data: members }] = await Promise.all([
			locals.supabase.from('classes').select('name').eq('id', assignment.class_id).maybeSingle(),
			locals.supabase
				.from('class_members')
				.select('student_id')
				.eq('class_id', assignment.class_id)
				.eq('status', 'active')
		]);
		className = klass?.name ?? null;
		for (const m of members ?? []) studentIds.add(m.student_id);
	}

	const { data: individual } = await locals.supabase
		.from('worksheet_assignment_students')
		.select('student_id')
		.eq('assignment_id', params.assignmentId);
	for (const row of individual ?? []) studentIds.add(row.student_id);

	// --- Exercices de la fiche ------------------------------------------------
	const { data: exercises } = await locals.supabase
		.from('worksheet_exercises')
		.select('exercise_id')
		.eq('worksheet_id', params.id);
	const exerciseIds = [...new Set((exercises ?? []).map((e) => e.exercise_id))];

	const ids = [...studentIds];
	if (ids.length === 0 || exerciseIds.length === 0) {
		return {
			worksheetTitle: worksheet.title,
			assignmentTitle: assignment.title,
			className,
			exerciseCount: exerciseIds.length,
			students: [],
			stats: { total: 0, started: 0, completed: 0, struggling: 0 }
		};
	}

	// --- Profils + auto-évaluations ------------------------------------------
	const [{ data: profiles }, { data: mastery }] = await Promise.all([
		locals.supabase.from('profiles').select('id, firstname, lastname, full_name').in('id', ids),
		locals.supabase
			.from('student_exercise_mastery')
			.select('student_id, exercise_id, status, updated_at')
			.in('student_id', ids)
			.in('exercise_id', exerciseIds)
	]);

	const nameById = new Map(
		(profiles ?? []).map((p) => [p.id, p.full_name?.trim() || formatName(p.firstname, p.lastname)])
	);

	type Bucket = { mastered: number; needsReview: number; notWorked: number; last: string | null };
	const byStudent = new Map<string, Bucket>();
	for (const row of mastery ?? []) {
		const b = byStudent.get(row.student_id) ?? {
			mastered: 0,
			needsReview: 0,
			notWorked: 0,
			last: null
		};
		const status = row.status as MasteryStatus;
		if (status === 'mastered') b.mastered += 1;
		else if (status === 'needs_review') b.needsReview += 1;
		else b.notWorked += 1;
		if (b.last === null || row.updated_at > b.last) b.last = row.updated_at;
		byStudent.set(row.student_id, b);
	}

	const students: StudentProgressRow[] = ids
		.map((id) => {
			const b = byStudent.get(id) ?? { mastered: 0, needsReview: 0, notWorked: 0, last: null };
			const positioned = b.mastered + b.needsReview + b.notWorked;
			return {
				studentId: id,
				displayName: nameById.get(id) ?? 'Élève sans nom',
				mastered: b.mastered,
				needsReview: b.needsReview,
				notWorked: b.notWorked,
				untouched: Math.max(0, exerciseIds.length - positioned),
				lastActivityAt: b.last
			};
		})
		// Ceux qui ont le plus besoin d'attention d'abord : « à retravailler »
		// décroissant, puis les moins avancés, puis alphabétique.
		.sort(
			(a, b) =>
				b.needsReview - a.needsReview ||
				b.untouched - a.untouched ||
				a.displayName.localeCompare(b.displayName, 'fr')
		);

	return {
		worksheetTitle: worksheet.title,
		assignmentTitle: assignment.title,
		className,
		exerciseCount: exerciseIds.length,
		students,
		stats: {
			total: students.length,
			started: students.filter((s) => s.untouched < exerciseIds.length).length,
			completed: students.filter((s) => s.untouched === 0).length,
			struggling: students.filter((s) => s.needsReview > 0).length
		}
	};
};
