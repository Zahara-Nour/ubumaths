/**
 * Évaluations (chantier 4) : une série passée sous une forme, ses réglages, ses
 * destinataires, les tentatives des élèves et les résultats.
 *
 * Les séances (`test_sessions`) se rattachent à l'ÉVALUATION (`evaluation_id`),
 * plus à l'assignation : les tentatives d'un élève se comptent par évaluation.
 * Les identifiants d'assignation reprennent ceux des anciennes
 * `assessment_assignments` : les liens `/automaths/test?assignment=<id>` déjà
 * envoyés restent valides.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '$lib/types/database';
import type {
	AssignmentWithDetails,
	AttemptSummary,
	AttemptValidation,
	DbEvaluation,
	DbEvaluationAssignment,
	EvaluationResult,
	EvaluationStatistics,
	EvaluationStatus,
	EvaluationWithSeries
} from '$lib/types/evaluation';
import { getAttemptsRemaining, getStudentStatus, isEvaluationForm } from '$lib/types/evaluation';
import { isDeadlinePassed } from '$lib/utils/dates';
import { toDbSeries } from '$lib/server/series';
import type { EvaluationSettings } from '$lib/server/validation/evaluations';

type TypedSupabaseClient = SupabaseClient<Database>;

/** Évaluation et sa série, en une requête */
const EVALUATION_WITH_SERIES = '*, series:series(*)';

/** Violation d'une contrainte CHECK (forme / temps limite incohérents) */
const CHECK_VIOLATION = '23514';

/** Échec d'une opération sur une évaluation, avec le code HTTP à rendre */
export class EvaluationError extends Error {
	constructor(
		public readonly status: number,
		message: string
	) {
		super(message);
		this.name = 'EvaluationError';
	}
}

type EvaluationRowWithSeries = Tables<'evaluations'> & { series: Tables<'series'> | null };

function toStatus(value: string): EvaluationStatus {
	return value === 'published' || value === 'archived' ? value : 'draft';
}

export function toDbEvaluation(row: Tables<'evaluations'>): DbEvaluation {
	return {
		id: row.id,
		series_id: row.series_id,
		// La contrainte `evaluations_form_check` n'admet que ces deux valeurs
		form: isEvaluationForm(row.form) ? row.form : 'interactive',
		time_limit: row.time_limit,
		max_attempts: row.max_attempts,
		deadline: row.deadline,
		shuffle_questions: row.shuffle_questions,
		academic_period_id: row.academic_period_id,
		status: toStatus(row.status),
		created_by: row.created_by,
		created_at: row.created_at,
		updated_at: row.updated_at
	};
}

/** Ligne jointe → évaluation avec sa série ; null si la série est illisible */
export function toEvaluationWithSeries(row: EvaluationRowWithSeries): EvaluationWithSeries | null {
	if (!row.series) return null;
	const { series, ...evaluation } = row;
	return { ...toDbEvaluation(evaluation), series: toDbSeries(series) };
}

function toDbAssignment(row: Tables<'evaluation_assignments'>): DbEvaluationAssignment {
	return {
		id: row.id,
		evaluation_id: row.evaluation_id,
		class_id: row.class_id,
		student_id: row.student_id,
		assigned_by: row.assigned_by,
		assigned_at: row.assigned_at
	};
}

function mapEvaluationWriteError(error: { code?: string; message?: string }): EvaluationError {
	if (error.code === CHECK_VIOLATION) {
		return new EvaluationError(400, 'Réglages incohérents avec la forme choisie');
	}
	return new EvaluationError(500, 'Enregistrement impossible, réessaie dans un instant');
}

// ===========================================================================
// CRUD
// ===========================================================================

/** Créer une évaluation depuis une série (B13) */
export async function createEvaluation(
	supabase: TypedSupabaseClient,
	input: { series_id: string; settings: EvaluationSettings; status: 'draft' | 'published' },
	userId: string
): Promise<DbEvaluation> {
	const { data, error } = await supabase
		.from('evaluations')
		.insert({
			series_id: input.series_id,
			form: input.settings.form,
			time_limit: input.settings.time_limit,
			max_attempts: input.settings.max_attempts,
			deadline: input.settings.deadline,
			shuffle_questions: input.settings.shuffle_questions,
			status: input.status,
			created_by: userId
		})
		.select()
		.single();

	if (error || !data) {
		console.error('[createEvaluation] Insertion impossible :', error);
		throw error ? mapEvaluationWriteError(error) : new EvaluationError(500, 'Création impossible');
	}
	return toDbEvaluation(data);
}

/**
 * Une évaluation et sa série. Un identifiant introuvable est retenté comme
 * `legacy_assessment_id` : les anciens liens prof (`/assessments/<id>`) et la
 * vue `resources`, tant qu'elle lit `assessments`, portent l'id d'origine.
 */
export async function getEvaluation(
	supabase: TypedSupabaseClient,
	evaluationId: string
): Promise<EvaluationWithSeries | null> {
	for (const column of ['id', 'legacy_assessment_id'] as const) {
		const { data, error } = await supabase
			.from('evaluations')
			.select(EVALUATION_WITH_SERIES)
			.eq(column, evaluationId)
			.maybeSingle();

		if (error) {
			console.error('[getEvaluation] Lecture impossible :', error);
			throw new EvaluationError(500, "Impossible de charger l'évaluation");
		}
		if (data) return toEvaluationWithSeries(data as EvaluationRowWithSeries);
	}
	return null;
}

/** Évaluations d'un professeur, avec leur série et leur nombre d'assignations */
export async function getTeacherEvaluations(
	supabase: TypedSupabaseClient,
	teacherId: string
): Promise<Array<EvaluationWithSeries & { assignments_count: number }>> {
	const { data, error } = await supabase
		.from('evaluations')
		.select(`${EVALUATION_WITH_SERIES}, evaluation_assignments(id)`)
		.eq('created_by', teacherId)
		.order('created_at', { ascending: false });

	if (error) {
		console.error('[getTeacherEvaluations] Lecture impossible :', error);
		throw new EvaluationError(500, 'Impossible de charger les évaluations');
	}

	const rows = (data ?? []) as Array<
		EvaluationRowWithSeries & { evaluation_assignments: { id: string }[] | null }
	>;
	const result: Array<EvaluationWithSeries & { assignments_count: number }> = [];
	for (const { evaluation_assignments, ...row } of rows) {
		const evaluation = toEvaluationWithSeries(row);
		if (!evaluation) continue;
		result.push({ ...evaluation, assignments_count: evaluation_assignments?.length ?? 0 });
	}
	return result;
}

/** Modifier les réglages (et éventuellement le statut) d'une évaluation */
export async function updateEvaluation(
	supabase: TypedSupabaseClient,
	evaluationId: string,
	settings: EvaluationSettings,
	status?: 'draft' | 'published'
): Promise<DbEvaluation> {
	const { data, error } = await supabase
		.from('evaluations')
		.update({
			form: settings.form,
			time_limit: settings.time_limit,
			max_attempts: settings.max_attempts,
			deadline: settings.deadline,
			shuffle_questions: settings.shuffle_questions,
			...(status ? { status } : {})
		})
		.eq('id', evaluationId)
		.select();

	if (error) {
		console.error('[updateEvaluation] Écriture impossible :', error);
		throw mapEvaluationWriteError(error);
	}
	if (!data || data.length === 0) {
		throw new EvaluationError(404, 'Évaluation introuvable');
	}
	return toDbEvaluation(data[0]);
}

/** Changer le statut d'une évaluation (publier, archiver) */
export async function setEvaluationStatus(
	supabase: TypedSupabaseClient,
	evaluationId: string,
	status: EvaluationStatus
): Promise<void> {
	const { data, error } = await supabase
		.from('evaluations')
		.update({ status })
		.eq('id', evaluationId)
		.select('id');

	if (error) {
		console.error('[setEvaluationStatus] Écriture impossible :', error);
		throw new EvaluationError(500, 'Enregistrement impossible, réessaie dans un instant');
	}
	if (!data || data.length === 0) {
		throw new EvaluationError(404, 'Évaluation introuvable');
	}
}

// ===========================================================================
// ASSIGNATIONS
// ===========================================================================

/**
 * Assigner une évaluation publiée. Le propriétaire ou un admin (comme la RLS :
 * `evaluation_assignments_admin_all`) ; `assigned_by` = celui qui assigne.
 */
export async function assignEvaluation(
	supabase: TypedSupabaseClient,
	evaluationId: string,
	targets: { class_ids?: string[]; student_ids?: string[] },
	actor: { id: string; isAdmin: boolean }
): Promise<DbEvaluationAssignment[]> {
	const teacherId = actor.id;
	const evaluation = await getEvaluation(supabase, evaluationId);
	if (!evaluation) {
		throw new EvaluationError(404, 'Évaluation introuvable');
	}
	if (evaluation.created_by !== teacherId && !actor.isAdmin) {
		throw new EvaluationError(403, 'Cette évaluation ne vous appartient pas');
	}
	if (evaluation.status !== 'published') {
		throw new EvaluationError(400, "Publie l'évaluation avant de l'assigner");
	}

	const rows = [
		...(targets.class_ids ?? []).map((classId) => ({
			evaluation_id: evaluation.id,
			class_id: classId,
			student_id: null,
			assigned_by: teacherId
		})),
		...(targets.student_ids ?? []).map((studentId) => ({
			evaluation_id: evaluation.id,
			class_id: null,
			student_id: studentId,
			assigned_by: teacherId
		}))
	];
	if (rows.length === 0) {
		throw new EvaluationError(400, 'Choisis au moins une classe ou un élève');
	}

	const { data, error } = await supabase.from('evaluation_assignments').insert(rows).select();

	if (error) {
		console.error('[assignEvaluation] Insertion impossible :', error);
		throw new EvaluationError(500, "L'assignation n'a pas pu être enregistrée");
	}
	if (!data || data.length !== rows.length) {
		throw new EvaluationError(403, "L'assignation a été refusée");
	}
	return data.map(toDbAssignment);
}

export async function getEvaluationAssignments(
	supabase: TypedSupabaseClient,
	evaluationId: string
) {
	const { data, error } = await supabase
		.from('evaluation_assignments')
		.select('*, class:classes(id, name), student:profiles!student_id(id, firstname, lastname)')
		.eq('evaluation_id', evaluationId);

	if (error) {
		console.error('[getEvaluationAssignments] Lecture impossible :', error);
		throw new EvaluationError(500, 'Impossible de charger les assignations');
	}
	return data ?? [];
}

/** Retirer une assignation (RLS : seul le propriétaire de l'évaluation) */
export async function removeAssignment(
	supabase: TypedSupabaseClient,
	assignmentId: string,
	evaluationId: string
): Promise<void> {
	const { data, error } = await supabase
		.from('evaluation_assignments')
		.delete()
		.eq('id', assignmentId)
		.eq('evaluation_id', evaluationId)
		.select('id');

	if (error) {
		console.error('[removeAssignment] Suppression impossible :', error);
		throw new EvaluationError(500, 'Échec de la suppression');
	}
	if (!data || data.length === 0) {
		throw new EvaluationError(404, 'Assignation introuvable');
	}
}

// ===========================================================================
// CÔTÉ ÉLÈVE
// ===========================================================================

type AssignmentRowWithEvaluation = Tables<'evaluation_assignments'> & {
	evaluation: EvaluationRowWithSeries | null;
};

/** Une assignation et son évaluation (avec sa série), telles que la RLS les montre */
export async function getAssignmentWithEvaluation(
	supabase: TypedSupabaseClient,
	assignmentId: string
): Promise<{ assignment: DbEvaluationAssignment; evaluation: EvaluationWithSeries } | null> {
	const { data, error } = await supabase
		.from('evaluation_assignments')
		.select(`*, evaluation:evaluations(${EVALUATION_WITH_SERIES})`)
		.eq('id', assignmentId)
		.maybeSingle();

	if (error) {
		console.error('[getAssignmentWithEvaluation] Lecture impossible :', error);
		throw new EvaluationError(500, "Impossible de vérifier l'assignation");
	}
	if (!data) return null;

	const row = data as unknown as AssignmentRowWithEvaluation;
	const evaluation = row.evaluation ? toEvaluationWithSeries(row.evaluation) : null;
	if (!evaluation) return null;

	const { evaluation: _joined, ...assignment } = row;
	return { assignment: toDbAssignment(assignment), evaluation };
}

/**
 * L'utilisateur est-il DESTINATAIRE de l'assignation (nommément, ou membre
 * actif de la classe) ? Le propriétaire qui regarde son évaluation ne l'est pas.
 */
export async function isAssignmentRecipient(
	supabase: TypedSupabaseClient,
	assignment: Pick<DbEvaluationAssignment, 'class_id' | 'student_id'>,
	userId: string
): Promise<boolean> {
	if (assignment.student_id === userId) return true;
	if (!assignment.class_id) return false;

	const { data, error } = await supabase
		.from('class_members')
		.select('id')
		.eq('class_id', assignment.class_id)
		.eq('student_id', userId)
		.eq('status', 'active')
		.maybeSingle();

	if (error) {
		console.error('[isAssignmentRecipient] Adhésion illisible :', error);
		throw new EvaluationError(500, 'Impossible de vérifier votre accès');
	}
	return !!data;
}

/** Nombre de séances d'un élève rattachées à une évaluation (B14) */
export async function countAttempts(
	supabase: TypedSupabaseClient,
	evaluationId: string,
	userId: string
): Promise<number> {
	const { count, error } = await supabase
		.from('test_sessions')
		.select('id', { count: 'exact', head: true })
		.eq('evaluation_id', evaluationId)
		.eq('user_id', userId);

	if (error) {
		console.error('[countAttempts] Tentatives illisibles :', error);
		throw new EvaluationError(500, 'Impossible de vérifier vos tentatives précédentes');
	}
	return count ?? 0;
}

function refused(reason: string, extra: Partial<AttemptValidation> = {}): AttemptValidation {
	return {
		can_attempt: false,
		reason,
		attempts_remaining: 0,
		deadline_passed: false,
		current_attempts: 0,
		...extra
	};
}

/**
 * Un élève peut-il commencer une tentative (B14) ? Date limite et nombre de
 * tentatives sont ceux de l'ÉVALUATION ; les tentatives se comptent par
 * `test_sessions.evaluation_id` + élève. Une panne refuse (on n'accorde pas une
 * tentative qu'on ne sait pas justifier).
 */
export async function validateAttempt(
	supabase: TypedSupabaseClient,
	evaluation: Pick<DbEvaluation, 'id' | 'status' | 'deadline' | 'max_attempts'>,
	studentId: string
): Promise<AttemptValidation> {
	if (evaluation.status !== 'published') {
		return refused("Cette évaluation n'est pas ouverte");
	}
	if (isDeadlinePassed(evaluation.deadline)) {
		return refused('La date limite est dépassée', { deadline_passed: true });
	}

	let currentAttempts: number;
	try {
		currentAttempts = await countAttempts(supabase, evaluation.id, studentId);
	} catch {
		return refused('Impossible de vérifier vos tentatives précédentes');
	}

	const attemptsRemaining = getAttemptsRemaining(currentAttempts, evaluation.max_attempts);
	if (attemptsRemaining !== null && attemptsRemaining <= 0) {
		return refused('Nombre maximal de tentatives atteint', { current_attempts: currentAttempts });
	}

	return {
		can_attempt: true,
		attempts_remaining: attemptsRemaining,
		deadline_passed: false,
		current_attempts: currentAttempts
	};
}

/**
 * Évaluations assignées à un élève (nommément ou via une classe active), avec
 * ses tentatives.
 */
export async function getStudentAssignments(
	supabase: TypedSupabaseClient,
	studentId: string
): Promise<AssignmentWithDetails[]> {
	const { data: memberships, error: membershipsError } = await supabase
		.from('class_members')
		.select('class_id')
		.eq('student_id', studentId)
		.eq('status', 'active');

	// Sans cette garde, une panne réduisait la liste des classes à zéro : les
	// évaluations affectées À LA CLASSE disparaissaient de l'écran de l'élève.
	if (membershipsError) {
		console.error('[getStudentAssignments] Classes illisibles :', membershipsError);
		throw new EvaluationError(500, 'Impossible de charger vos évaluations');
	}
	const classIds = (memberships ?? []).map((m) => m.class_id);

	let query = supabase
		.from('evaluation_assignments')
		.select(`*, evaluation:evaluations(${EVALUATION_WITH_SERIES})`);
	query =
		classIds.length > 0
			? query.or(`student_id.eq.${studentId},class_id.in.(${classIds.join(',')})`)
			: query.eq('student_id', studentId);

	const { data, error } = await query;
	if (error) {
		console.error('[getStudentAssignments] Assignations illisibles :', error);
		throw new EvaluationError(500, 'Impossible de charger vos évaluations');
	}

	const assignments: Array<{
		assignment: DbEvaluationAssignment;
		evaluation: EvaluationWithSeries;
	}> = [];
	for (const raw of (data ?? []) as unknown as AssignmentRowWithEvaluation[]) {
		const evaluation = raw.evaluation ? toEvaluationWithSeries(raw.evaluation) : null;
		if (!evaluation || evaluation.status !== 'published') continue;
		const { evaluation: _joined, ...assignment } = raw;
		assignments.push({ assignment: toDbAssignment(assignment), evaluation });
	}
	if (assignments.length === 0) return [];

	const evaluationIds = [...new Set(assignments.map((a) => a.evaluation.id))];
	const { data: sessions, error: sessionsError } = await supabase
		.from('test_sessions')
		.select('evaluation_id, grade, completed_at')
		.in('evaluation_id', evaluationIds)
		.eq('user_id', studentId)
		.order('completed_at', { ascending: true });

	// Le nombre de tentatives décide de ce que l'élève peut encore faire : une
	// panne ne doit pas le ramener à zéro.
	if (sessionsError) {
		console.error('[getStudentAssignments] Tentatives illisibles :', sessionsError);
		throw new EvaluationError(500, 'Impossible de charger vos évaluations');
	}

	const attemptsByEvaluation = new Map<
		string,
		Array<{ grade: number | null; completed_at: string | null }>
	>();
	for (const session of sessions ?? []) {
		if (!session.evaluation_id) continue;
		const list = attemptsByEvaluation.get(session.evaluation_id) ?? [];
		list.push({ grade: session.grade, completed_at: session.completed_at });
		attemptsByEvaluation.set(session.evaluation_id, list);
	}

	return assignments.map(({ assignment, evaluation }) => {
		const attempts = attemptsByEvaluation.get(evaluation.id) ?? [];
		const lastAttemptAt = attempts[attempts.length - 1]?.completed_at || null;
		return {
			...assignment,
			evaluation,
			attempts_count: attempts.length,
			best_grade: bestGrade(attempts),
			last_attempt_at: lastAttemptAt,
			status: getStudentStatus(attempts.length, lastAttemptAt, evaluation.deadline)
		};
	});
}

// ===========================================================================
// RÉSULTATS (professeur)
// ===========================================================================

/**
 * Meilleure note sur 20 (Q36) parmi les tentatives NOTÉES ; null s'il n'y en a
 * aucune. Une note de 0 est une note (pas « aucune »).
 */
export function bestGrade(attempts: ReadonlyArray<{ grade: number | null }>): number | null {
	const grades = attempts.flatMap((a) => (a.grade === null ? [] : [Number(a.grade)]));
	return grades.length > 0 ? Math.max(...grades) : null;
}

/**
 * Résultats d'une évaluation : un élève par ligne (une assignation de classe et
 * une assignation nominative ne le comptent pas deux fois), ses séances lues par
 * `evaluation_id`.
 *
 * @param isTestMode - true : élèves de test seulement ; false : vrais élèves
 */
export async function getEvaluationResults(
	supabase: TypedSupabaseClient,
	evaluation: Pick<EvaluationWithSeries, 'id' | 'series' | 'deadline'>,
	isTestMode: boolean = false
): Promise<EvaluationResult[]> {
	const { data: assignments, error: assignError } = await supabase
		.from('evaluation_assignments')
		.select('id, class_id, student_id')
		.eq('evaluation_id', evaluation.id);

	if (assignError) {
		console.error('[getEvaluationResults] Assignations illisibles :', assignError);
		throw new EvaluationError(500, 'Impossible de charger les résultats');
	}
	if (!assignments || assignments.length === 0) return [];

	const classIds = [...new Set(assignments.flatMap((a) => (a.class_id ? [a.class_id] : [])))];

	const membersByClass = new Map<string, string[]>();
	if (classIds.length > 0) {
		const { data: members, error: membersError } = await supabase
			.from('class_members')
			.select('student_id, class_id')
			.in('class_id', classIds)
			.eq('status', 'active');

		// Ces membres décident QUELS élèves figurent au tableau : une panne les
		// faisait tous disparaître (« personne n'a composé »).
		if (membersError) {
			console.error('[getEvaluationResults] Membres illisibles :', membersError);
			throw new EvaluationError(500, 'Impossible de charger les résultats');
		}
		for (const member of members ?? []) {
			const list = membersByClass.get(member.class_id) ?? [];
			list.push(member.student_id);
			membersByClass.set(member.class_id, list);
		}
	}

	// Élève → (assignation, classe) : la première assignation de classe l'emporte
	const targets = new Map<string, { assignmentId: string; classId: string | null }>();
	for (const assignment of assignments) {
		if (assignment.class_id) {
			for (const studentId of membersByClass.get(assignment.class_id) ?? []) {
				if (!targets.has(studentId)) {
					targets.set(studentId, { assignmentId: assignment.id, classId: assignment.class_id });
				}
			}
		}
	}
	for (const assignment of assignments) {
		if (assignment.student_id && !targets.has(assignment.student_id)) {
			targets.set(assignment.student_id, { assignmentId: assignment.id, classId: null });
		}
	}
	if (targets.size === 0) return [];

	const studentIds = [...targets.keys()];
	const [studentsRes, classesRes, sessionsRes] = await Promise.all([
		supabase
			.from('profiles')
			.select('id, firstname, lastname, is_test')
			.in('id', studentIds)
			.eq('is_test', isTestMode),
		classIds.length > 0
			? supabase.from('classes').select('id, name').in('id', classIds)
			: Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
		supabase
			.from('test_sessions')
			.select('user_id, grade, points_earned, created_at, completed_at, total_questions')
			.eq('evaluation_id', evaluation.id)
			.in('user_id', studentIds)
			.order('completed_at', { ascending: false })
	]);

	if (studentsRes.error) {
		console.error('[getEvaluationResults] Profils illisibles :', studentsRes.error);
		throw new EvaluationError(500, 'Impossible de charger les résultats');
	}
	// Ce sont les copies : sans elles, tout le monde paraîtrait « non composé »
	if (sessionsRes.error) {
		console.error('[getEvaluationResults] Copies illisibles :', sessionsRes.error);
		throw new EvaluationError(500, 'Impossible de charger les résultats');
	}
	// Le nom de classe n'est qu'une étiquette : son absence se journalise
	if (classesRes.error) {
		console.error('[getEvaluationResults] Noms de classes illisibles :', classesRes.error);
	}

	const classNames = new Map((classesRes.data ?? []).map((c) => [c.id, c.name]));
	const attemptsByStudent = new Map<string, AttemptSummary[]>();
	for (const session of sessionsRes.data ?? []) {
		if (!session.user_id) continue;
		const list = attemptsByStudent.get(session.user_id) ?? [];
		list.push({
			grade: session.grade === null ? null : Number(session.grade),
			points_earned: session.points_earned === null ? null : Number(session.points_earned),
			total_questions: session.total_questions,
			created_at: session.created_at,
			completed_at: session.completed_at
		});
		attemptsByStudent.set(session.user_id, list);
	}

	const results: EvaluationResult[] = [];
	for (const student of studentsRes.data ?? []) {
		const target = targets.get(student.id);
		if (!target) continue;
		const attempts = attemptsByStudent.get(student.id) ?? [];
		const lastAttempt = attempts[0];
		const lastAttemptAt = lastAttempt?.completed_at || null;
		results.push({
			assignment_id: target.assignmentId,
			evaluation_id: evaluation.id,
			title: evaluation.series.title,
			grade: evaluation.series.grade,
			class_id: target.classId,
			class_name: target.classId ? (classNames.get(target.classId) ?? null) : null,
			student_id: student.id,
			student_firstname: student.firstname,
			student_lastname: student.lastname,
			best_grade: bestGrade(attempts),
			attempts_count: attempts.length,
			attempts,
			last_attempt_at: lastAttemptAt,
			status: getStudentStatus(attempts.length, lastAttemptAt, evaluation.deadline),
			total_questions: lastAttempt?.total_questions || null
		});
	}
	return results;
}

export function computeEvaluationStatistics(
	evaluationId: string,
	results: EvaluationResult[]
): EvaluationStatistics {
	const total = results.length;
	const completed = results.filter((r) => r.status === 'completed').length;
	const grades = results.flatMap((r) => (r.best_grade === null ? [] : [r.best_grade]));

	return {
		evaluation_id: evaluationId,
		total_assigned: total,
		not_started: results.filter((r) => r.status === 'not_started').length,
		in_progress: results.filter((r) => r.status === 'in_progress').length,
		completed,
		expired: results.filter((r) => r.status === 'expired').length,
		average_grade: grades.length > 0 ? grades.reduce((s, v) => s + v, 0) / grades.length : null,
		min_grade: grades.length > 0 ? Math.min(...grades) : null,
		max_grade: grades.length > 0 ? Math.max(...grades) : null,
		completion_rate: total > 0 ? (completed / total) * 100 : 0
	};
}
