/**
 * Teacher Rewards Page - Server Load
 * ===================================
 *
 * Loads pending VIP card activation requests from students
 */

import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import type { StudentVipCards } from '$lib/types/vip-card';
import { getTemplateById, getAllTemplates } from '$lib/server/vip-card-queries';
import { getActionDescription } from '$lib/utils/vip-cards';

interface ActivationRequest {
	studentId: string;
	studentName: string;
	instanceId: string;
	cardId: string;
	cardName: string;
	actionDescription: string;
	requestedAt: string;
}

export const load: PageServerLoad = async ({ locals }) => {
	// Require teacher/admin authentication
	const { user } = await requireRole(locals, 'teacher');
	const supabase = locals.supabase;

	// Get all students that this teacher teaches
	const { data: classMembers, error: classMembersError } = await supabase
		.from('class_members')
		.select(
			`
			student_id,
			classes!inner(teacher_id)
		`
		)
		.eq('classes.teacher_id', user.id);

	if (classMembersError) {
		console.error('[rewards] Error fetching class members:', classMembersError);
		return { activationRequests: [] };
	}

	// Get unique student IDs
	const studentIds = Array.from(new Set(classMembers?.map((cm) => cm.student_id) || []));

	if (studentIds.length === 0) {
		return { activationRequests: [] };
	}

	// Fetch all these students' profiles with vip_cards
	const { data: profiles, error: profilesError } = await supabase
		.from('profiles')
		.select('id, firstname, lastname, vip_cards')
		.in('id', studentIds);

	if (profilesError) {
		console.error('[rewards] Error fetching profiles:', profilesError);
		return { activationRequests: [] };
	}

	// Extract pending activation requests
	const activationRequests: ActivationRequest[] = [];

	// Collect all pending requests first
	interface PendingRequest {
		studentId: string;
		studentName: string;
		instanceId: string;
		cardId: string;
		requestedAt: string;
	}

	const pendingRequests: PendingRequest[] = [];

	profiles?.forEach((profile) => {
		const vipCards = (profile.vip_cards || {}) as unknown as StudentVipCards;
		const studentName = `${profile.firstname || ''} ${profile.lastname || ''}`.trim();

		Object.entries(vipCards).forEach(([instanceId, instance]) => {
			// Only include instances with pending activation requests
			if (instance.activationRequestedAt && !instance.usedAt) {
				pendingRequests.push({
					studentId: profile.id,
					studentName: studentName || 'Élève',
					instanceId,
					cardId: instance.cardId,
					requestedAt: instance.activationRequestedAt
				});
			}
		});
	});

	// Fetch all card templates once (for action descriptions)
	const allTemplates = await getAllTemplates(supabase);

	// Fetch card templates for all pending requests
	for (const request of pendingRequests) {
		try {
			const template = await getTemplateById(supabase, request.cardId);

			if (template && template.action) {
				activationRequests.push({
					studentId: request.studentId,
					studentName: request.studentName,
					instanceId: request.instanceId,
					cardId: request.cardId,
					cardName: template.name, // ✅ Now reads from database, not hardcoded array!
					actionDescription: getActionDescription(template.action, allTemplates),
					requestedAt: request.requestedAt
				});
			}
		} catch (error) {
			console.error(`[rewards] Error fetching template ${request.cardId}:`, error);
		}
	}

	// Sort by requested date (most recent first)
	activationRequests.sort(
		(a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
	);

	return {
		activationRequests
	};
};
