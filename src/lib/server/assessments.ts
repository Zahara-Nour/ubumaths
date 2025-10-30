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
import { getAttemptsRemaining, getStudentStatus } from '$lib/types/assessment';
import { isDeadlinePassed } from '$lib/utils/dates';

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
	const assessments = (data || []).map((a) => {
		const creatorData = Array.isArray(a.creator) ? a.creator[0] : a.creator;
		return {
			...a,
			creator: creatorData || null
		} as unknown as AssessmentWithCreator;
	});

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
			const currentSettings =
				current.settings && typeof current.settings === 'object' ? current.settings : {};
			updateData.settings = { ...currentSettings, ...data.settings };
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

	// N+1 Query Optimization: Batch fetch all attempts in one query
	// Instead of N queries (1 per assignment), we fetch all attempts at once and use Map lookups
	const assignmentIds = (assignments || []).map((a) => a.id);

	// Batch fetch all test attempts for all assignments (1 query instead of N)
	const { data: allAttempts } = await supabase
		.from('test_sessions')
		.select('assignment_id, score, completed_at')
		.in('assignment_id', assignmentIds)
		.eq('user_id', studentId)
		.order('completed_at', { ascending: true });

	// Build map for O(1) lookup: assignment_id -> attempts[]
	const attemptsMap = new Map<
		string,
		Array<{ score: number | null; completed_at: string | null }>
	>();
	for (const attempt of allAttempts || []) {
		const assignmentId =
			attempt.assignment_id && typeof attempt.assignment_id === 'string'
				? attempt.assignment_id
				: '';
		if (!assignmentId) continue;

		if (!attemptsMap.has(assignmentId)) {
			attemptsMap.set(assignmentId, []);
		}
		attemptsMap.get(assignmentId)!.push({
			score: attempt.score,
			completed_at: attempt.completed_at
		});
	}

	// Enrich assignments with attempt stats using in-memory map lookups (no DB calls)
	const enriched = (assignments || []).map((assignment) => {
		const attempts = attemptsMap.get(assignment.id) || [];
		const attemptsCount = attempts.length;
		const bestScore = attempts.reduce((max, a) => Math.max(max, a.score || 0), 0) || null;
		const lastAttempt = attempts[attempts.length - 1];
		const lastAttemptAt = lastAttempt?.completed_at || null;

		// Extract deadline from settings JSON
		const settings = assignment.assessment.settings;
		const deadline =
			settings && typeof settings === 'object' && 'deadline' in settings
				? (settings as { deadline: string | null }).deadline
				: null;

		const status = getStudentStatus(attemptsCount, lastAttemptAt, deadline);

		return {
			...assignment,
			attempts_count: attemptsCount,
			best_score: bestScore,
			last_attempt_at: lastAttemptAt,
			status
		} as unknown as AssignmentWithDetails;
	});

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

	// Extract deadline and max_attempts from settings JSON
	const deadline =
		settings && typeof settings === 'object' && 'deadline' in settings
			? (settings as { deadline: string | null }).deadline
			: null;

	const maxAttempts =
		settings && typeof settings === 'object' && 'max_attempts' in settings
			? (settings as { max_attempts: number | null }).max_attempts
			: null;

	// Check deadline
	const deadlinePassed = isDeadlinePassed(deadline);
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
	const attemptsRemaining = getAttemptsRemaining(currentAttempts, maxAttempts);

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
 * Optimized to batch all queries and use in-memory lookups
 *
 * @param isTestMode - If true, only include test students; if false, only real students
 */
export async function getAssessmentResults(
	supabase: TypedSupabaseClient,
	assessmentId: string,
	isTestMode: boolean = false
): Promise<{ data: DbAssessmentResult[] | null; error: Error | null }> {
	// Step 1: Get all assignments for this assessment (1 query)
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

	// Step 2: Get assessment info once (1 query)
	const { data: assessment } = await supabase
		.from('assessments')
		.select('title, grade')
		.eq('id', assessmentId)
		.single();

	if (!assessment) {
		return { data: null, error: new Error('Assessment not found') };
	}

	// Step 3: Collect all unique class IDs and student IDs
	const classIds = [...new Set(assignments.filter((a) => a.class_id).map((a) => a.class_id!))];
	const directStudentIds = assignments.filter((a) => a.student_id).map((a) => a.student_id!);

	// Step 4: Batch fetch all class members (1 query)
	const classMembersMap = new Map<string, Array<{ student_id: string; class_id: string }>>();
	if (classIds.length > 0) {
		const { data: classMembers } = await supabase
			.from('class_members')
			.select('student_id, class_id')
			.in('class_id', classIds);

		for (const member of classMembers || []) {
			if (!classMembersMap.has(member.class_id)) {
				classMembersMap.set(member.class_id, []);
			}
			classMembersMap.get(member.class_id)!.push(member);
		}
	}

	// Step 5: Build list of all student IDs (from classes and direct assignments)
	const allStudentIds = new Set<string>(directStudentIds);
	for (const members of classMembersMap.values()) {
		for (const member of members) {
			allStudentIds.add(member.student_id);
		}
	}

	if (allStudentIds.size === 0) {
		return { data: [], error: null };
	}

	// Step 6: Batch fetch all student profiles (1 query)
	const { data: students } = await supabase
		.from('profiles')
		.select('id, firstname, lastname, is_test')
		.in('id', Array.from(allStudentIds))
		.eq('is_test', isTestMode);

	const studentsMap = new Map((students || []).map((s) => [s.id, s]));

	// Step 7: Batch fetch all class names (1 query)
	const classNamesMap = new Map<string, string>();
	if (classIds.length > 0) {
		const { data: classes } = await supabase.from('classes').select('id, name').in('id', classIds);

		for (const cls of classes || []) {
			classNamesMap.set(cls.id, cls.name);
		}
	}

	// Step 8: Batch fetch all test attempts for all assignments (1 query)
	const assignmentIds = assignments.map((a) => a.id);
	const { data: allAttempts } = await supabase
		.from('test_sessions')
		.select('assignment_id, user_id, score, completed_at, total_questions')
		.in('assignment_id', assignmentIds)
		.order('completed_at', { ascending: false });

	// Group attempts by assignment_id + user_id
	const attemptsMap = new Map<
		string,
		Array<{
			score: number | null;
			completed_at: string | null;
			total_questions: number | null;
		}>
	>();

	for (const attempt of allAttempts || []) {
		const key = `${attempt.assignment_id}:${attempt.user_id}`;
		if (!attemptsMap.has(key)) {
			attemptsMap.set(key, []);
		}
		attemptsMap.get(key)!.push({
			score: attempt.score,
			completed_at: attempt.completed_at,
			total_questions: attempt.total_questions
		});
	}

	// Step 9: Build results using in-memory lookups
	const results: DbAssessmentResult[] = [];

	for (const assignment of assignments) {
		// Handle class assignments
		if (assignment.class_id) {
			const classMembers = classMembersMap.get(assignment.class_id) || [];
			const className = classNamesMap.get(assignment.class_id) || null;

			for (const member of classMembers) {
				const student = studentsMap.get(member.student_id);
				if (!student) continue; // Skip if student not in filtered results (is_test mismatch)

				const result = buildResultFromMaps(
					assignment.id,
					assessmentId,
					assessment.title,
					assessment.grade,
					assignment.class_id,
					className,
					student,
					attemptsMap
				);
				results.push(result);
			}
		}
		// Handle direct student assignments
		else if (assignment.student_id) {
			const student = studentsMap.get(assignment.student_id);
			if (!student) continue; // Skip if student not in filtered results (is_test mismatch)

			const result = buildResultFromMaps(
				assignment.id,
				assessmentId,
				assessment.title,
				assessment.grade,
				null,
				null,
				student,
				attemptsMap
			);
			results.push(result);
		}
	}

	return { data: results, error: null };
}

/**
 * Build an assessment result object from pre-fetched in-memory maps
 *
 * This helper function constructs a single assessment result record for a student
 * by looking up their attempts in a pre-built Map. This is part of the N+1 query
 * optimization strategy - all attempts are fetched once in bulk, then this function
 * performs O(1) lookups instead of querying the database for each student.
 *
 * OPTIMIZATION PATTERN:
 * - Called during the result assembly phase of getAssessmentResults()
 * - Works in conjunction with the attemptsMap built at lines 607-626
 * - Eliminates one database query per student (crucial for 100+ students)
 * - All data is already in memory, so lookups are extremely fast
 *
 * @param assignmentId - The assessment assignment ID
 * @param assessmentId - The assessment ID (for reference)
 * @param assessmentTitle - Assessment title (from assessment record)
 * @param assessmentGrade - Grade level (from assessment record)
 * @param classId - Class ID if assignment is class-based, null for direct student assignment
 * @param className - Class name (for display), null for direct student assignment
 * @param student - Student profile data { id, firstname, lastname, is_test }
 * @param attemptsMap - Pre-built Map<string, attempts[]> from database query
 *        Keys are formatted as "${assignmentId}:${studentId}"
 * @returns Complete DbAssessmentResult object with calculated stats
 *
 * @example
 * ```typescript
 * // This is called internally during result assembly:
 * const result = buildResultFromMaps(
 *   assignmentId,
 *   assessmentId,
 *   'Math Quiz',
 *   '6eme',
 *   classId,
 *   'Class 6A',
 *   student,
 *   attemptsMap
 * );
 * ```
 *
 * CALCULATION LOGIC:
 * The function performs these calculations from the attempts list:
 * - Attempts count: Total number of test sessions (length of attempts array)
 * - Best score: Maximum score across all attempts (0 if no valid scores)
 * - Last attempt: The first item in the array (pre-sorted DESC by completed_at)
 * - Last attempt time: When the most recent attempt was completed
 * - Total questions: Number of questions from the most recent attempt
 * - Status: Calculated from attempts count, deadline, and completion status
 */
function buildResultFromMaps(
	assignmentId: string,
	assessmentId: string,
	assessmentTitle: string,
	assessmentGrade: string,
	classId: string | null,
	className: string | null,
	student: {
		id: string;
		firstname: string | null;
		lastname: string | null;
		is_test: boolean;
	},
	attemptsMap: Map<
		string,
		Array<{
			score: number | null;
			completed_at: string | null;
			total_questions: number | null;
		}>
	>
): DbAssessmentResult {
	// STEP 1: Build lookup key and retrieve attempts for this student-assignment pair
	// Key format: "${assignmentId}:${studentId}" (matches keys built in getAssessmentResults)
	const attemptsKey = `${assignmentId}:${student.id}`;
	const attempts = attemptsMap.get(attemptsKey) || [];

	// STEP 2: Calculate attempt statistics
	// Count: Total number of test sessions for this assignment-student pair
	const attemptsCount = attempts.length;

	// Best score: Maximum score across all attempts
	// reduce() finds the maximum, defaulting to 0 for null scores, then || null if no attempts
	const bestScore = attempts.reduce((max, a) => Math.max(max, a.score || 0), 0) || null;

	// Last attempt: The first item (pre-sorted DESC by completed_at in getAssessmentResults)
	// This is the most recent attempt
	const lastAttempt = attempts[0];

	// Last attempt timestamp: When the most recent attempt was completed
	const lastAttemptAt = lastAttempt?.completed_at || null;

	// Total questions: From the most recent attempt (useful for score interpretation)
	const totalQuestions = lastAttempt?.total_questions || null;

	// STEP 3: Calculate student status (not_started, in_progress, completed, expired)
	const status = getStudentStatus(attemptsCount, lastAttemptAt, null);

	// STEP 4: Assemble and return the complete result object
	return {
		assignment_id: assignmentId,
		assessment_id: assessmentId,
		assessment_title: assessmentTitle,
		assessment_grade: assessmentGrade,
		class_id: classId,
		student_id: student.id,
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
 *
 * @param isTestMode - If true, only include test students; if false, only real students
 */
export async function getAssessmentStatistics(
	supabase: TypedSupabaseClient,
	assessmentId: string,
	isTestMode: boolean = false
): Promise<{ data: AssessmentStatistics | null; error: Error | null }> {
	const { data: results, error } = await getAssessmentResults(supabase, assessmentId, isTestMode);

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
 *
 * @param isTestMode - If true, only include test students; if false, only real students
 */
export async function getClassStatistics(
	supabase: TypedSupabaseClient,
	assessmentId: string,
	isTestMode: boolean = false
): Promise<{ data: ClassAssessmentStatistics[] | null; error: Error | null }> {
	const { data: results, error } = await getAssessmentResults(supabase, assessmentId, isTestMode);

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
