/**
 * Correction Release System
 * ==========================
 *
 * Manages when and how corrections are released to students for worksheet assignments.
 * Supports multiple release modes: manual, immediate, scheduled.
 *
 * Note: Worksheets are view-only (PDF or online consultation), so there's no submission
 * or due date logic. Corrections are released based on teacher choice.
 *
 * @module server/worksheets/correction-release
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorksheetAssignmentRow, CorrectionReleaseMode } from '$lib/types/worksheets';

// ============================================================================
// TYPES
// ============================================================================

export interface CorrectionAccessResult {
	canAccess: boolean;
	reason: string;
	releaseMode: CorrectionReleaseMode;
	releaseAt?: Date;
}

export interface ReleaseCorrectionsResult {
	success: boolean;
	message: string;
	affectedStudents?: number;
}

export interface CorrectionReleaseStatus {
	mode: CorrectionReleaseMode;
	isReleased: boolean;
	releaseAt: Date | null;
	studentsWithAccess: number;
	totalStudents: number;
}

// ============================================================================
// CORRECTION ACCESS CHECKS
// ============================================================================

/**
 * Check if a student can access corrections for an assignment
 *
 * @param assignment - The worksheet assignment
 * @param studentId - The student's ID
 * @param currentTime - Current time (optional, defaults to now)
 * @returns Access result with reason
 */
export function canAccessCorrections(
	assignment: WorksheetAssignmentRow,
	_studentId: string,
	currentTime: Date = new Date()
): CorrectionAccessResult {
	const { correction_release_mode, correction_release_at, status } = assignment;

	// Assignment must be active or completed
	if (status === 'draft' || status === 'cancelled') {
		return {
			canAccess: false,
			reason: "L'assignation n'est pas encore active",
			releaseMode: correction_release_mode
		};
	}

	// Check based on release mode
	switch (correction_release_mode) {
		case 'immediate':
			// Corrections are always available immediately when assignment is active
			return {
				canAccess: true,
				reason: 'Corrections disponibles immediatement',
				releaseMode: correction_release_mode
			};

		case 'scheduled': {
			// Check if scheduled release time has passed
			if (!correction_release_at) {
				return {
					canAccess: false,
					reason: 'Date de publication non definie',
					releaseMode: correction_release_mode
				};
			}

			const scheduledTime = new Date(correction_release_at);
			if (currentTime >= scheduledTime) {
				return {
					canAccess: true,
					reason: 'Corrections publiees selon le calendrier',
					releaseMode: correction_release_mode,
					releaseAt: scheduledTime
				};
			}

			return {
				canAccess: false,
				reason: `Corrections disponibles le ${scheduledTime.toLocaleDateString('fr-FR')} a ${scheduledTime.toLocaleTimeString('fr-FR')}`,
				releaseMode: correction_release_mode,
				releaseAt: scheduledTime
			};
		}

		case 'manual':
		default:
			// For manual mode, check if correction_release_at has been set (indicating manual release)
			if (correction_release_at) {
				const releaseTime = new Date(correction_release_at);
				if (currentTime >= releaseTime) {
					return {
						canAccess: true,
						reason: "Corrections publiees manuellement par l'enseignant",
						releaseMode: correction_release_mode,
						releaseAt: releaseTime
					};
				}
			}

			return {
				canAccess: false,
				reason: "Corrections non encore publiees par l'enseignant",
				releaseMode: correction_release_mode
			};
	}
}

// ============================================================================
// CORRECTION RELEASE ACTIONS
// ============================================================================

/**
 * Release corrections for an assignment (manual release)
 * Sets the correction_release_at timestamp to now
 *
 * @param supabase - Supabase client
 * @param assignmentId - The assignment ID
 * @param userId - The user performing the release (must be the creator)
 * @returns Release result
 */
export async function releaseCorrections(
	supabase: SupabaseClient,
	assignmentId: string,
	userId: string
): Promise<ReleaseCorrectionsResult> {
	// Verify user is the assignment creator
	const { data: assignment, error: fetchError } = await supabase
		.from('worksheet_assignments')
		.select('id, created_by, worksheet_id, class_id, correction_release_mode')
		.eq('id', assignmentId)
		.single();

	if (fetchError || !assignment) {
		return {
			success: false,
			message: 'Assignation non trouvee'
		};
	}

	if (assignment.created_by !== userId) {
		return {
			success: false,
			message: "Vous n'etes pas autorise a publier les corrections de cette assignation"
		};
	}

	// Update the correction_release_at timestamp
	const now = new Date().toISOString();
	const { error: updateError } = await supabase
		.from('worksheet_assignments')
		.update({
			correction_release_at: now,
			updated_at: now
		})
		.eq('id', assignmentId);

	if (updateError) {
		return {
			success: false,
			message: 'Erreur lors de la publication des corrections'
		};
	}

	// Count affected students
	let affectedStudents = 0;
	if (assignment.class_id) {
		// First get student IDs from the class
		const { data: classMembers } = await supabase
			.from('class_members')
			.select('student_id')
			.eq('class_id', assignment.class_id);

		if (classMembers && classMembers.length > 0) {
			const studentIds = classMembers.map((m) => m.student_id);
			const { count } = await supabase
				.from('worksheet_instances')
				.select('id', { count: 'exact', head: true })
				.eq('worksheet_id', assignment.worksheet_id)
				.in('student_id', studentIds);

			affectedStudents = count ?? 0;
		}
	}

	return {
		success: true,
		message: 'Corrections publiees avec succes',
		affectedStudents
	};
}

/**
 * Revoke corrections for an assignment (remove manual release)
 * Clears the correction_release_at timestamp
 *
 * @param supabase - Supabase client
 * @param assignmentId - The assignment ID
 * @param userId - The user performing the revoke (must be the creator)
 * @returns Revoke result
 */
export async function revokeCorrections(
	supabase: SupabaseClient,
	assignmentId: string,
	userId: string
): Promise<ReleaseCorrectionsResult> {
	// Verify user is the assignment creator
	const { data: assignment, error: fetchError } = await supabase
		.from('worksheet_assignments')
		.select('id, created_by, correction_release_mode')
		.eq('id', assignmentId)
		.single();

	if (fetchError || !assignment) {
		return {
			success: false,
			message: 'Assignation non trouvee'
		};
	}

	if (assignment.created_by !== userId) {
		return {
			success: false,
			message: "Vous n'etes pas autorise a modifier cette assignation"
		};
	}

	// Only allow revoking for manual mode
	if (assignment.correction_release_mode !== 'manual') {
		return {
			success: false,
			message: "La revocation n'est possible qu'en mode manuel"
		};
	}

	// Clear the correction_release_at timestamp
	const { error: updateError } = await supabase
		.from('worksheet_assignments')
		.update({
			correction_release_at: null,
			updated_at: new Date().toISOString()
		})
		.eq('id', assignmentId);

	if (updateError) {
		return {
			success: false,
			message: 'Erreur lors de la revocation des corrections'
		};
	}

	return {
		success: true,
		message: 'Acces aux corrections revoque'
	};
}

/**
 * Update correction release settings for an assignment
 *
 * @param supabase - Supabase client
 * @param assignmentId - The assignment ID
 * @param userId - The user performing the update (must be the creator)
 * @param settings - New correction release settings
 * @returns Update result
 */
export async function updateCorrectionSettings(
	supabase: SupabaseClient,
	assignmentId: string,
	userId: string,
	settings: {
		correction_release_mode?: CorrectionReleaseMode;
		correction_release_at?: string | null;
	}
): Promise<ReleaseCorrectionsResult> {
	// Verify user is the assignment creator
	const { data: assignment, error: fetchError } = await supabase
		.from('worksheet_assignments')
		.select('id, created_by')
		.eq('id', assignmentId)
		.single();

	if (fetchError || !assignment) {
		return {
			success: false,
			message: 'Assignation non trouvee'
		};
	}

	if (assignment.created_by !== userId) {
		return {
			success: false,
			message: "Vous n'etes pas autorise a modifier cette assignation"
		};
	}

	// Update settings
	const { error: updateError } = await supabase
		.from('worksheet_assignments')
		.update({
			...settings,
			updated_at: new Date().toISOString()
		})
		.eq('id', assignmentId);

	if (updateError) {
		return {
			success: false,
			message: 'Erreur lors de la mise a jour des parametres'
		};
	}

	return {
		success: true,
		message: 'Parametres de correction mis a jour'
	};
}

// ============================================================================
// CORRECTION STATUS QUERIES
// ============================================================================

/**
 * Get correction release status for an assignment
 *
 * @param supabase - Supabase client
 * @param assignmentId - The assignment ID
 * @returns Correction release status
 */
export async function getCorrectionReleaseStatus(
	supabase: SupabaseClient,
	assignmentId: string
): Promise<CorrectionReleaseStatus | null> {
	// Fetch assignment
	const { data: assignment, error: assignmentError } = await supabase
		.from('worksheet_assignments')
		.select(
			`
			id,
			worksheet_id,
			class_id,
			correction_release_mode,
			correction_release_at,
			status
		`
		)
		.eq('id', assignmentId)
		.single();

	if (assignmentError || !assignment) {
		return null;
	}

	// Check if corrections are currently released
	const accessResult = canAccessCorrections(
		assignment as WorksheetAssignmentRow,
		'check-only' // We're just checking status, not for a specific student
	);

	// Count students with access
	let studentsWithAccess = 0;
	let totalStudents = 0;

	if (assignment.class_id) {
		// Get class members first
		const { data: classMembers } = await supabase
			.from('class_members')
			.select('student_id')
			.eq('class_id', assignment.class_id);

		if (classMembers && classMembers.length > 0) {
			const studentIds = classMembers.map((m) => m.student_id);

			// Get instances for students in this class
			const { count } = await supabase
				.from('worksheet_instances')
				.select('id', { count: 'exact', head: true })
				.eq('worksheet_id', assignment.worksheet_id)
				.in('student_id', studentIds);

			totalStudents = count ?? 0;

			// If corrections are released, all students have access
			if (accessResult.canAccess) {
				studentsWithAccess = totalStudents;
			}
		}
	}

	return {
		mode: assignment.correction_release_mode as CorrectionReleaseMode,
		isReleased: accessResult.canAccess,
		releaseAt: assignment.correction_release_at ? new Date(assignment.correction_release_at) : null,
		studentsWithAccess,
		totalStudents
	};
}

/**
 * Check if a specific student can access corrections for their instance
 *
 * @param supabase - Supabase client
 * @param instanceId - The worksheet instance ID
 * @param studentId - The student's ID
 * @returns Access result with reason
 */
export async function canStudentAccessInstanceCorrection(
	supabase: SupabaseClient,
	instanceId: string,
	studentId: string
): Promise<CorrectionAccessResult> {
	// Fetch instance with related assignment
	const { data: instance, error: instanceError } = await supabase
		.from('worksheet_instances')
		.select(
			`
			id,
			student_id,
			worksheet_id,
			status
		`
		)
		.eq('id', instanceId)
		.single();

	if (instanceError || !instance) {
		return {
			canAccess: false,
			reason: 'Instance non trouvee',
			releaseMode: 'manual'
		};
	}

	// Verify student owns this instance
	if (instance.student_id !== studentId) {
		return {
			canAccess: false,
			reason: 'Acces non autorise',
			releaseMode: 'manual'
		};
	}

	// Find the assignment for this worksheet
	const { data: assignment, error: assignmentError } = await supabase
		.from('worksheet_assignments')
		.select('*')
		.eq('worksheet_id', instance.worksheet_id)
		.eq('status', 'active')
		.maybeSingle();

	if (assignmentError) {
		return {
			canAccess: false,
			reason: 'Erreur lors de la verification',
			releaseMode: 'manual'
		};
	}

	// If no assignment found, default to manual mode with no access
	if (!assignment) {
		return {
			canAccess: false,
			reason: 'Aucune assignation associee trouvee',
			releaseMode: 'manual'
		};
	}

	// Check access based on assignment settings
	return canAccessCorrections(assignment as WorksheetAssignmentRow, studentId);
}
