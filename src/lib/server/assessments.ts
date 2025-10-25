/**
 * Assessment Server Utilities
 * Server-side functions for managing assessments, assignments, and results
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type {
	CreateAssessmentData,
	UpdateAssessmentData,
	AssignAssessmentData,
	AttemptValidation,
	AssessmentWithCreator,
	AssignmentWithDetails,
	DbAssessmentResult,
	AssessmentStatistics,
	ClassAssessmentStatistics
} from '$lib/types/assessment';
import { isDeadlinePassed, getAttemptsRemaining, getStudentStatus } from '$lib/types/assessment';

type TypedSupabaseClient = SupabaseClient<Database>;

// ===========================================================================
// ASSESSMENT CRUD
// ===========================================================================

/**
 * Create a new assessment
 */
export async function createAssessment(
	supabase: TypedSupabaseClient,
	data: CreateAssessmentData,
	userId: string
) {
	const { data: assessment, error } = await supabase
		.from('assessments')
		.insert({
			title: data.title,
			grade: data.grade,
			description: data.description || null,
			created_by: userId,
			categories: data.categories as never, // JSONB
			settings: data.settings as never, // JSONB
			status: data.status
		})
		.select()
		.single();

	if (error) {
		console.error('Error creating assessment:', error);
		return { data: null, error };
	}

	return { data: assessment, error: null };
}

/**
 * Get assessment by ID
 */
export async function getAssessment(supabase: TypedSupabaseClient, assessmentId: string) {
	const { data, error } = await supabase
		.from('assessments')
		.select('*')
		.eq('id', assessmentId)
		.single();

	if (error) {
		console.error('Error fetching assessment:', error);
		return { data: null, error };
	}

	return { data, error: null };
}

/**
 * Get teacher's assessments
 * Optionally filter by status
 */
export async function getTeacherAssessments(
	supabase: TypedSupabaseClient,
	teacherId: string,
	status?: string
) {
	let query = supabase
		.from('assessments')
		.select(
			`
      *,
      creator:profiles!created_by(firstname, lastname)
    `
		)
		.eq('created_by', teacherId)
		.order('created_at', { ascending: false });

	if (status) {
		query = query.eq('status', status);
	}

	const { data, error } = await query;

	if (error) {
		console.error('Error fetching teacher assessments:', error);
		return { data: null, error };
	}

	// Transform to AssessmentWithCreator
	const assessments: AssessmentWithCreator[] = (data || []).map((a) => ({
		...a,
		creator: a.creator?.[0] || null
	}));

	return { data: assessments, error: null };
}

/**
 * Update an assessment
 * Teachers can only update their own assessments
 */
export async function updateAssessment(
	supabase: TypedSupabaseClient,
	assessmentId: string,
	data: UpdateAssessmentData,
	userId: string
) {
	// First verify ownership
	const { data: existing } = await supabase
		.from('assessments')
		.select('created_by')
		.eq('id', assessmentId)
		.single();

	if (!existing || existing.created_by !== userId) {
		return { data: null, error: new Error('Unauthorized') };
	}

	const updateData: Record<string, unknown> = {};
	if (data.title !== undefined) updateData.title = data.title;
	if (data.grade !== undefined) updateData.grade = data.grade;
	if (data.description !== undefined) updateData.description = data.description;
	if (data.settings !== undefined) {
		// Merge with existing settings
		const { data: current } = await getAssessment(supabase, assessmentId);
		if (current) {
			updateData.settings = { ...current.settings, ...data.settings };
		}
	}
	if (data.status !== undefined) updateData.status = data.status;

	const { data: updated, error } = await supabase
		.from('assessments')
		.update(updateData)
		.eq('id', assessmentId)
		.select()
		.single();

	if (error) {
		console.error('Error updating assessment:', error);
		return { data: null, error };
	}

	return { data: updated, error: null };
}

/**
 * Publish a draft assessment
 */
export async function publishAssessment(
	supabase: TypedSupabaseClient,
	assessmentId: string,
	userId: string
) {
	return updateAssessment(supabase, assessmentId, { status: 'published' }, userId);
}

/**
 * Archive an assessment
 */
export async function archiveAssessment(
	supabase: TypedSupabaseClient,
	assessmentId: string,
	userId: string
) {
	return updateAssessment(supabase, assessmentId, { status: 'archived' }, userId);
}

/**
 * Delete an assessment (soft delete by archiving)
 */
export async function deleteAssessment(
	supabase: TypedSupabaseClient,
	assessmentId: string,
	userId: string
) {
	// We archive instead of hard delete to preserve history
	return archiveAssessment(supabase, assessmentId, userId);
}

// ===========================================================================
// ASSIGNMENT MANAGEMENT
// ===========================================================================

/**
 * Assign assessment to classes and/or students
 */
export async function assignAssessment(
	supabase: TypedSupabaseClient,
	data: AssignAssessmentData,
	teacherId: string
) {
	// Verify teacher owns the assessment
	const { data: assessment } = await supabase
		.from('assessments')
		.select('created_by, status')
		.eq('id', data.assessment_id)
		.single();

	if (!assessment || assessment.created_by !== teacherId) {
		return { data: null, error: new Error('Unauthorized') };
	}

	if (assessment.status !== 'published') {
		return { data: null, error: new Error('Assessment must be published before assigning') };
	}

	const assignments: Array<{
		assessment_id: string;
		class_id: string | null;
		student_id: string | null;
		assigned_by: string;
	}> = [];

	// Create assignments for classes
	if (data.class_ids && data.class_ids.length > 0) {
		for (const classId of data.class_ids) {
			assignments.push({
				assessment_id: data.assessment_id,
				class_id: classId,
				student_id: null,
				assigned_by: teacherId
			});
		}
	}

	// Create assignments for individual students
	if (data.student_ids && data.student_ids.length > 0) {
		for (const studentId of data.student_ids) {
			assignments.push({
				assessment_id: data.assessment_id,
				class_id: null,
				student_id: studentId,
				assigned_by: teacherId
			});
		}
	}

	if (assignments.length === 0) {
		return { data: null, error: new Error('No assignments specified') };
	}

	const { data: created, error } = await supabase
		.from('assessment_assignments')
		.insert(assignments)
		.select();

	if (error) {
		console.error('Error creating assignments:', error);
		return { data: null, error };
	}

	return { data: created, error: null };
}

/**
 * Get assignments for an assessment
 */
export async function getAssessmentAssignments(
	supabase: TypedSupabaseClient,
	assessmentId: string
) {
	const { data, error } = await supabase
		.from('assessment_assignments')
		.select(
			`
      *,
      class:classes(id, name),
      student:profiles!student_id(id, firstname, lastname)
    `
		)
		.eq('assessment_id', assessmentId);

	if (error) {
		console.error('Error fetching assignments:', error);
		return { data: null, error };
	}

	return { data, error: null };
}

/**
 * Remove an assignment
 */
export async function removeAssignment(
	supabase: TypedSupabaseClient,
	assignmentId: string,
	teacherId: string
) {
	// Verify teacher owns the assessment
	const { data: assignment } = await supabase
		.from('assessment_assignments')
		.select('assessment_id')
		.eq('id', assignmentId)
		.single();

	if (!assignment) {
		return { error: new Error('Assignment not found') };
	}

	const { data: assessment } = await supabase
		.from('assessments')
		.select('created_by')
		.eq('id', assignment.assessment_id)
		.single();

	if (!assessment || assessment.created_by !== teacherId) {
		return { error: new Error('Unauthorized') };
	}

	const { error } = await supabase.from('assessment_assignments').delete().eq('id', assignmentId);

	if (error) {
		console.error('Error removing assignment:', error);
		return { error };
	}

	return { error: null };
}

// ===========================================================================
// STUDENT ASSIGNMENTS
// ===========================================================================

/**
 * Get assessments assigned to a student
 * Includes assessments assigned directly or through class membership
 */
export async function getStudentAssignments(supabase: TypedSupabaseClient, studentId: string) {
	// Get student's classes
	const { data: classMemberships } = await supabase
		.from('class_members')
		.select('class_id')
		.eq('student_id', studentId);

	const classIds = classMemberships?.map((cm) => cm.class_id) || [];

	// Get assignments (direct + class-based)
	let query = supabase
		.from('assessment_assignments')
		.select(
			`
      *,
      assessment:assessments(*)
    `
		)
		.eq('assessment.status', 'published');

	// Filter: student is directly assigned OR student is in assigned class
	if (classIds.length > 0) {
		query = query.or(`student_id.eq.${studentId},class_id.in.(${classIds.join(',')})`);
	} else {
		query = query.eq('student_id', studentId);
	}

	const { data: assignments, error } = await query;

	if (error) {
		console.error('Error fetching student assignments:', error);
		return { data: null, error };
	}

	// For each assignment, get attempt stats
	const enriched: AssignmentWithDetails[] = [];

	for (const assignment of assignments || []) {
		const { data: attempts } = await supabase
			.from('test_sessions')
			.select('score, completed_at')
			.eq('assignment_id', assignment.id)
			.eq('user_id', studentId);

		const attemptsCount = attempts?.length || 0;
		const bestScore = attempts?.reduce((max, a) => Math.max(max, a.score || 0), 0) || null;
		const lastAttempt = attempts?.[attempts.length - 1];
		const lastAttemptAt = lastAttempt?.completed_at || null;

		const status = getStudentStatus(
			attemptsCount,
			lastAttemptAt,
			assignment.assessment.settings.deadline
		);

		enriched.push({
			...assignment,
			attempts_count: attemptsCount,
			best_score: bestScore,
			last_attempt_at: lastAttemptAt,
			status
		});
	}

	return { data: enriched, error: null };
}

// ===========================================================================
// ATTEMPT VALIDATION
// ===========================================================================

/**
 * Validate if a student can start a new attempt for an assignment
 */
export async function validateAttempt(
	supabase: TypedSupabaseClient,
	assignmentId: string,
	studentId: string
): Promise<AttemptValidation> {
	// Get assignment and assessment
	const { data: assignment } = await supabase
		.from('assessment_assignments')
		.select('*, assessment:assessments(*)')
		.eq('id', assignmentId)
		.single();

	if (!assignment) {
		return {
			can_attempt: false,
			reason: 'Assignment not found',
			attempts_remaining: 0,
			deadline_passed: false,
			current_attempts: 0
		};
	}

	const settings = assignment.assessment.settings;

	// Check deadline
	const deadlinePassed = isDeadlinePassed(settings.deadline);
	if (deadlinePassed) {
		return {
			can_attempt: false,
			reason: 'Deadline has passed',
			attempts_remaining: 0,
			deadline_passed: true,
			current_attempts: 0
		};
	}

	// Count existing attempts
	const { data: existingAttempts } = await supabase
		.from('test_sessions')
		.select('id')
		.eq('assignment_id', assignmentId)
		.eq('user_id', studentId);

	const currentAttempts = existingAttempts?.length || 0;
	const attemptsRemaining = getAttemptsRemaining(currentAttempts, settings.max_attempts);

	// Check if attempts exhausted
	if (attemptsRemaining !== null && attemptsRemaining <= 0) {
		return {
			can_attempt: false,
			reason: 'Maximum attempts reached',
			attempts_remaining: 0,
			deadline_passed: false,
			current_attempts: currentAttempts
		};
	}

	// All good!
	return {
		can_attempt: true,
		attempts_remaining: attemptsRemaining,
		deadline_passed: false,
		current_attempts: currentAttempts
	};
}

// ===========================================================================
// RESULTS & STATISTICS
// ===========================================================================

/**
 * Get results for an assessment (teacher view)
 * Uses the assessment_results view
 */
export async function getAssessmentResults(
	supabase: TypedSupabaseClient,
	assessmentId: string
): Promise<{ data: DbAssessmentResult[] | null; error: Error | null }> {
	// First get all assignments for this assessment
	const { data: assignments, error: assignError } = await supabase
		.from('assessment_assignments')
		.select('id, class_id, student_id')
		.eq('assessment_id', assessmentId);

	if (assignError) {
		console.error('Error fetching assignments:', assignError);
		return { data: null, error: assignError };
	}

	if (!assignments || assignments.length === 0) {
		return { data: [], error: null };
	}

	const results: DbAssessmentResult[] = [];

	// For each assignment, get student results
	for (const assignment of assignments) {
		// If assigned to class, get all class members
		if (assignment.class_id) {
			const { data: classMembers } = await supabase
				.from('class_members')
				.select('student_id, profiles:profiles!student_id(id, firstname, lastname)')
				.eq('class_id', assignment.class_id);

			for (const member of classMembers || []) {
				const result = await getStudentAssignmentResult(
					supabase,
					assignment.id,
					assessmentId,
					member.student_id,
					assignment.class_id
				);
				if (result) results.push(result);
			}
		}
		// If assigned to individual student
		else if (assignment.student_id) {
			const result = await getStudentAssignmentResult(
				supabase,
				assignment.id,
				assessmentId,
				assignment.student_id,
				null
			);
			if (result) results.push(result);
		}
	}

	return { data: results, error: null };
}

/**
 * Helper: Get result for a specific student assignment
 */
async function getStudentAssignmentResult(
	supabase: TypedSupabaseClient,
	assignmentId: string,
	assessmentId: string,
	studentId: string,
	classId: string | null
): Promise<DbAssessmentResult | null> {
	// Get assessment info
	const { data: assessment } = await supabase
		.from('assessments')
		.select('title, grade')
		.eq('id', assessmentId)
		.single();

	// Get student info
	const { data: student } = await supabase
		.from('profiles')
		.select('id, firstname, lastname')
		.eq('id', studentId)
		.single();

	// Get class info if applicable
	let className: string | null = null;
	if (classId) {
		const { data: classData } = await supabase
			.from('classes')
			.select('name')
			.eq('id', classId)
			.single();
		className = classData?.name || null;
	}

	// Get all attempts for this student
	const { data: attempts } = await supabase
		.from('test_sessions')
		.select('score, completed_at, total_questions')
		.eq('assignment_id', assignmentId)
		.eq('user_id', studentId)
		.order('completed_at', { ascending: false });

	const attemptsCount = attempts?.length || 0;
	const bestScore = attempts?.reduce((max, a) => Math.max(max, a.score || 0), 0) || null;
	const lastAttempt = attempts?.[0]; // Most recent
	const lastAttemptAt = lastAttempt?.completed_at || null;
	const totalQuestions = lastAttempt?.total_questions || null;

	// Determine status
	const status = getStudentStatus(
		attemptsCount,
		lastAttemptAt,
		null // We'll get settings later if needed
	);

	if (!assessment || !student) return null;

	return {
		assignment_id: assignmentId,
		assessment_id: assessmentId,
		assessment_title: assessment.title,
		assessment_grade: assessment.grade,
		class_id: classId,
		student_id: studentId,
		student_user_id: student.id,
		student_firstname: student.firstname,
		student_lastname: student.lastname,
		class_name: className,
		best_score: bestScore,
		attempts_count: attemptsCount,
		last_attempt_at: lastAttemptAt,
		status,
		total_questions: totalQuestions
	};
}

/**
 * Get assessment statistics
 */
export async function getAssessmentStatistics(
	supabase: TypedSupabaseClient,
	assessmentId: string
): Promise<{ data: AssessmentStatistics | null; error: Error | null }> {
	const { data: results, error } = await getAssessmentResults(supabase, assessmentId);

	if (error || !results) {
		return { data: null, error };
	}

	const totalAssigned = results.length;
	const notStarted = results.filter((r) => r.status === 'not_started').length;
	const inProgress = results.filter((r) => r.status === 'in_progress').length;
	const completed = results.filter((r) => r.status === 'completed').length;
	const expired = results.filter((r) => r.status === 'expired').length;

	const completedResults = results.filter((r) => r.best_score !== null);
	const averageScore =
		completedResults.length > 0
			? completedResults.reduce((sum, r) => sum + (r.best_score || 0), 0) / completedResults.length
			: null;

	const scores = completedResults.map((r) => r.best_score || 0);
	const minScore = scores.length > 0 ? Math.min(...scores) : null;
	const maxScore = scores.length > 0 ? Math.max(...scores) : null;

	const completionRate = totalAssigned > 0 ? (completed / totalAssigned) * 100 : 0;

	return {
		data: {
			assessment_id: assessmentId,
			total_assigned: totalAssigned,
			not_started: notStarted,
			in_progress: inProgress,
			completed: completed,
			expired: expired,
			average_score: averageScore,
			min_score: minScore,
			max_score: maxScore,
			completion_rate: completionRate
		},
		error: null
	};
}

/**
 * Get class-level statistics for an assessment
 */
export async function getClassStatistics(
	supabase: TypedSupabaseClient,
	assessmentId: string
): Promise<{ data: ClassAssessmentStatistics[] | null; error: Error | null }> {
	const { data: results, error } = await getAssessmentResults(supabase, assessmentId);

	if (error || !results) {
		return { data: null, error };
	}

	// Group by class
	const byClass = new Map<string, DbAssessmentResult[]>();

	for (const result of results) {
		if (!result.class_id || !result.class_name) continue;

		const key = result.class_id;
		if (!byClass.has(key)) {
			byClass.set(key, []);
		}
		byClass.get(key)!.push(result);
	}

	// Calculate stats per class
	const classStats: ClassAssessmentStatistics[] = [];

	for (const [classId, classResults] of byClass.entries()) {
		const className = classResults[0].class_name || 'Unknown';
		const totalStudents = classResults.length;
		const completed = classResults.filter((r) => r.status === 'completed').length;

		const completedResults = classResults.filter((r) => r.best_score !== null);
		const averageScore =
			completedResults.length > 0
				? completedResults.reduce((sum, r) => sum + (r.best_score || 0), 0) /
					completedResults.length
				: null;

		const completionRate = totalStudents > 0 ? (completed / totalStudents) * 100 : 0;

		classStats.push({
			class_id: classId,
			class_name: className,
			total_students: totalStudents,
			completed: completed,
			average_score: averageScore,
			completion_rate: completionRate
		});
	}

	return { data: classStats, error: null };
}
