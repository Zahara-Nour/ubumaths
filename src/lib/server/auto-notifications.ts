/**
 * Automatic Notification Helpers
 *
 * Functions to create system notifications for various events.
 * These should be called from form actions or API routes when events occur.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { createSystemNotification } from './notifications';

type SupabaseClientType = SupabaseClient<Database>;

/**
 * Create notification when a new assignment is created
 *
 * @param supabase - Supabase client
 * @param assignmentId - ID of the created assignment
 * @param assignmentTitle - Title of the assignment
 * @param classId - ID of the class
 * @param teacherName - Name of the teacher who created it
 */
export async function notifyNewAssignment(
	supabase: SupabaseClientType,
	data: {
		assignmentId: string;
		assignmentTitle: string;
		classId: string;
		teacherName: string;
	}
): Promise<void> {
	try {
		await createSystemNotification(supabase, {
			title: 'Nouveau devoir assigné',
			message: `<p><strong>${data.teacherName}</strong> a assigné un nouveau devoir : <strong>${data.assignmentTitle}</strong></p>`,
			type: 'info',
			priority: 'normal',
			system_event_type: 'assignment_created',
			target_type: 'classes',
			target_class_ids: [data.classId],
			action_label: 'Voir le devoir',
			action_url: `/dashboard/student/devoirs/${data.assignmentId}`
		});
	} catch (error) {
		console.error('Error creating assignment notification:', error);
		// Don't throw - notification failure shouldn't break the assignment creation
	}
}

/**
 * Create notification when a new resource is added
 *
 * @param supabase - Supabase client
 * @param resourceId - ID of the resource
 * @param resourceTitle - Title of the resource
 * @param classId - ID of the class
 * @param teacherName - Name of the teacher who added it
 */
export async function notifyNewResource(
	supabase: SupabaseClientType,
	data: {
		resourceId: string;
		resourceTitle: string;
		classId: string;
		teacherName: string;
	}
): Promise<void> {
	try {
		await createSystemNotification(supabase, {
			title: 'Nouvelle ressource disponible',
			message: `<p><strong>${data.teacherName}</strong> a ajouté une nouvelle ressource : <strong>${data.resourceTitle}</strong></p>`,
			type: 'info',
			priority: 'normal',
			system_event_type: 'resource_added',
			target_type: 'classes',
			target_class_ids: [data.classId],
			action_label: 'Voir la ressource',
			action_url: `/dashboard/student/resources/${data.resourceId}`
		});
	} catch (error) {
		console.error('Error creating resource notification:', error);
	}
}

/**
 * Create notification when a student earns reward points (gidouilles)
 *
 * @param supabase - Supabase client
 * @param studentId - ID of the student
 * @param amount - Amount of gidouilles earned
 * @param reason - Reason for the reward (optional)
 */
export async function notifyRewardEarned(
	supabase: SupabaseClientType,
	data: {
		studentId: string;
		amount: number;
		reason?: string;
	}
): Promise<void> {
	try {
		const message = data.reason
			? `<p>Vous avez gagné <strong>${data.amount} gidouilles</strong> ! ${data.reason}</p>`
			: `<p>Vous avez gagné <strong>${data.amount} gidouilles</strong> !</p>`;

		await createSystemNotification(supabase, {
			title: `🎉 ${data.amount} gidouilles gagnées !`,
			message,
			type: 'info',
			priority: 'normal',
			system_event_type: 'reward_earned',
			target_type: 'users',
			target_user_ids: [data.studentId]
		});
	} catch (error) {
		console.error('Error creating reward notification:', error);
	}
}

/**
 * Create notification when a student earns a VIP card
 *
 * @param supabase - Supabase client
 * @param studentId - ID of the student
 * @param cardType - Type of VIP card earned
 * @param cardName - Display name of the card
 */
export async function notifyVipCardEarned(
	supabase: SupabaseClientType,
	data: {
		studentId: string;
		cardType: string;
		cardName: string;
	}
): Promise<void> {
	try {
		await createSystemNotification(supabase, {
			title: '✨ Nouvelle carte VIP !',
			message: `<p>Félicitations ! Vous avez obtenu une nouvelle carte VIP : <strong>${data.cardName}</strong></p>`,
			type: 'info',
			priority: 'normal',
			system_event_type: 'reward_earned',
			target_type: 'users',
			target_user_ids: [data.studentId],
			action_label: 'Voir mes cartes',
			action_url: '/dashboard/student/vip-cards'
		});
	} catch (error) {
		console.error('Error creating VIP card notification:', error);
	}
}

/**
 * Create notification when a student unlocks a badge
 *
 * @param supabase - Supabase client
 * @param studentId - ID of the student
 * @param badgeName - Name of the badge
 * @param badgeDescription - Description of the badge (optional)
 */
export async function notifyBadgeUnlocked(
	supabase: SupabaseClientType,
	data: {
		studentId: string;
		badgeName: string;
		badgeDescription?: string;
	}
): Promise<void> {
	try {
		const message = data.badgeDescription
			? `<p>Bravo ! Vous avez débloqué le badge <strong>${data.badgeName}</strong> :<br/><em>${data.badgeDescription}</em></p>`
			: `<p>Bravo ! Vous avez débloqué le badge <strong>${data.badgeName}</strong> !</p>`;

		await createSystemNotification(supabase, {
			title: '🏆 Nouveau badge débloqué !',
			message,
			type: 'info',
			priority: 'normal',
			system_event_type: 'badge_unlocked',
			target_type: 'users',
			target_user_ids: [data.studentId],
			action_label: 'Voir mes badges',
			action_url: '/dashboard/student/badges'
		});
	} catch (error) {
		console.error('Error creating badge notification:', error);
	}
}

/**
 * Create notification for system maintenance announcement
 *
 * @param supabase - Supabase client
 * @param date - Date of maintenance
 * @param duration - Expected duration
 * @param description - Description of what will be done
 */
export async function notifyMaintenance(
	supabase: SupabaseClientType,
	data: {
		date: string;
		duration: string;
		description: string;
	}
): Promise<void> {
	try {
		await createSystemNotification(supabase, {
			title: 'Maintenance programmée',
			message: `<p><strong>Une maintenance est prévue le ${data.date}</strong></p><p>Durée estimée : ${data.duration}</p><p>${data.description}</p>`,
			type: 'alert',
			priority: 'important',
			system_event_type: 'maintenance_scheduled',
			target_type: 'all'
		});
	} catch (error) {
		console.error('Error creating maintenance notification:', error);
	}
}

/**
 * Create notification for new feature release
 *
 * @param supabase - Supabase client
 * @param featureName - Name of the new feature
 * @param description - Description of the feature
 * @param targetRoles - Which roles can access the feature (optional, defaults to all)
 * @param actionUrl - Link to more info or to use the feature (optional)
 */
export async function notifyFeatureRelease(
	supabase: SupabaseClientType,
	data: {
		featureName: string;
		description: string;
		targetRoles?: string[];
		actionUrl?: string;
	}
): Promise<void> {
	try {
		await createSystemNotification(supabase, {
			title: `🎉 Nouvelle fonctionnalité : ${data.featureName}`,
			message: `<p>${data.description}</p>`,
			type: 'announcement',
			priority: 'normal',
			system_event_type: 'feature_released',
			target_type: data.targetRoles ? 'role' : 'all',
			target_roles: data.targetRoles,
			action_label: data.actionUrl ? 'Découvrir' : undefined,
			action_url: data.actionUrl
		});
	} catch (error) {
		console.error('Error creating feature release notification:', error);
	}
}

/**
 * Create notification when an assessment is assigned to students
 *
 * @param supabase - Supabase client
 * @param assessmentId - ID of the assessment
 * @param assessmentTitle - Title of the assessment
 * @param teacherName - Name of the teacher who assigned it
 * @param classIds - IDs of classes assigned (optional)
 * @param studentIds - IDs of individual students assigned (optional)
 */
export async function notifyNewAssessment(
	supabase: SupabaseClientType,
	data: {
		assessmentId: string;
		assessmentTitle: string;
		teacherName: string;
		classIds?: string[];
		studentIds?: string[];
	}
): Promise<void> {
	try {
		// Determine target type based on what was assigned
		const targetType = data.classIds && data.classIds.length > 0 ? 'classes' : 'users';

		await createSystemNotification(supabase, {
			title: 'Nouvelle évaluation assignée',
			message: `<p><strong>${data.teacherName}</strong> vous a assigné une nouvelle évaluation : <strong>${data.assessmentTitle}</strong></p>`,
			type: 'info',
			priority: 'important',
			system_event_type: 'assessment_assigned',
			target_type: targetType,
			target_class_ids: data.classIds,
			target_user_ids: data.studentIds,
			action_label: "Voir l'évaluation",
			action_url: '/dashboard/student/assessments'
		});
	} catch (error) {
		console.error('Error creating assessment notification:', error);
		// Don't throw - notification failure shouldn't break the assignment
	}
}
