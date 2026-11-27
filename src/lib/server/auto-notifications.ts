/**
 * Automatic Notification Helpers
 *
 * Functions to create system notifications for various events.
 * These should be called from form actions or API routes when events occur.
 *
 * **SECURITY NOTE**: All messages are sanitized in `createSystemNotification()`
 * before database insertion. This provides defense-in-depth protection even though
 * system messages are code-controlled and should be safe.
 *
 * **SECURITY - HTML ESCAPING**: User-controlled data is HTML-escaped BEFORE
 * template interpolation to prevent template injection attacks. This is an
 * additional security layer (defense-in-depth) beyond DOMPurify sanitization.
 */

import { createSystemNotification } from './notifications';
import { escapeHtml } from '#lib/utils/html-escape.ts';
import { exerciseAnchorHash } from '#lib/worksheets/exercise-anchor.ts';
import type { NotificationTargetType } from '#lib/types/notification.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('server/auto-notifications');

/**
 * Create notification when an assessment is assigned to students
 *
 * @param assessmentId - ID of the assessment
 * @param assessmentTitle - Title of the assessment
 * @param teacherName - Name of the teacher who assigned it
 * @param classIds - IDs of classes assigned (optional)
 * @param studentIds - IDs of individual students assigned (optional)
 */
export async function notifyNewAssessment(data: {
	assessmentId: string;
	assessmentTitle: string;
	teacherName: string;
	classIds?: string[];
	studentIds?: string[];
}): Promise<void> {
	try {
		// Determine target type based on what was assigned
		const targetType: NotificationTargetType =
			data.classIds && data.classIds.length > 0 ? 'classes' : 'users';

		await createSystemNotification({
			title: 'Nouveau contrôle assigné',
			message: `<p><strong>${escapeHtml(data.teacherName)}</strong> vous a assigné un nouveau contrôle : <strong>${escapeHtml(data.assessmentTitle)}</strong></p>`,
			type: 'info',
			priority: 'important',
			system_event_type: 'assessment_assigned',
			target_type: targetType,
			target_class_ids: data.classIds,
			target_user_ids: data.studentIds,
			action_label: 'Voir le contrôle',
			action_url: '/dashboard/student/assessments'
		});
	} catch (error) {
		logger.error('Error creating assessment notification:', error);
		// Don't throw - notification failure shouldn't break the assignment
	}
}

/** Ce qu'il faut pour annoncer à l'élève le sort de son signalement (D6) */
interface ErrorReportNotice {
	studentId: string;
	worksheetTitle: string;
	/**
	 * Numéro de l'exercice dans LA COPIE de l'élève (ordre mélangé compris,
	 * `fetchCopyNumbering`) ; `null` s'il est inconnu : on ne cite alors aucun
	 * numéro plutôt qu'un numéro faux.
	 */
	exerciseNumber: number | null;
	/** L'affectation : le lien mène à la fiche de l'élève */
	assignmentId: string;
	/** L'exercice de fiche signalé : ancre du lien (jamais le numéro) */
	worksheetExerciseId: string;
}

/** « l'exercice <strong>7</strong> », ou « un exercice » si le numéro est inconnu */
function exerciseMention(exerciseNumber: number | null): string {
	return exerciseNumber === null
		? 'un exercice'
		: `l'exercice <strong>${Number(exerciseNumber)}</strong>`;
}

/** La fiche de l'élève, défilée jusqu'à l'exercice signalé */
function reportedExerciseUrl(data: ErrorReportNotice): string {
	return `/dashboard/student/worksheets/${data.assignmentId}${exerciseAnchorHash(data.worksheetExerciseId)}`;
}

/**
 * Create notification when a student's error report is validated
 */
export async function notifyErrorReportValidated(data: ErrorReportNotice): Promise<void> {
	try {
		await createSystemNotification({
			title: '✅ Signalement validé !',
			message: `<p>Ton signalement sur ${exerciseMention(data.exerciseNumber)} du devoir "<strong>${escapeHtml(data.worksheetTitle)}</strong>" a été validé. L'erreur a été corrigée. Merci pour ta vigilance !</p><p>Tu as gagné <strong>1 bonus</strong>.</p>`,
			type: 'info',
			priority: 'normal',
			system_event_type: 'error_report_validated',
			target_type: 'users',
			target_user_ids: [data.studentId],
			action_label: 'Voir l’exercice',
			action_url: reportedExerciseUrl(data)
		});
	} catch (error) {
		logger.error('Error creating error report validated notification:', error);
		// Don't throw - notification failure shouldn't break the validation flow
	}
}

/**
 * Create notification when a student's error report is rejected
 *
 * @param response - Optional response/reason for rejection (HTML from RichTextEditor, already sanitized)
 */
export async function notifyErrorReportRejected(
	data: ErrorReportNotice & { response?: string }
): Promise<void> {
	try {
		// response is already HTML-sanitized from RichTextEditor, do not escape it
		const responseHtml = data.response ? `<p>${data.response}</p>` : '';

		await createSystemNotification({
			title: 'Signalement traité',
			message: `<p>Ton signalement pour ${exerciseMention(data.exerciseNumber)} de "<strong>${escapeHtml(data.worksheetTitle)}</strong>" a été étudié. Aucune correction n'était nécessaire cette fois.</p>${responseHtml}<p>Continue à rester attentif !</p>`,
			type: 'info',
			priority: 'normal',
			system_event_type: 'error_report_rejected',
			target_type: 'users',
			target_user_ids: [data.studentId],
			action_label: 'Voir l’exercice',
			action_url: reportedExerciseUrl(data)
		});
	} catch (error) {
		logger.error('Error creating error report rejected notification:', error);
		// Don't throw - notification failure shouldn't break the rejection flow
	}
}
