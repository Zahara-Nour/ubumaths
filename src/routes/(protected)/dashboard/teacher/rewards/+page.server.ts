/**
 * Teacher Rewards Page - Server Load
 * ===================================
 *
 * Loads pending VIP card activation requests from students
 */

import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import type { StudentVipCards } from '$lib/types/vip-card';
import { getVipCardById } from '$lib/types/vip-card';
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

	profiles?.forEach((profile) => {
		const vipCards = (profile.vip_cards || {}) as unknown as StudentVipCards;
		const studentName = `${profile.firstname || ''} ${profile.lastname || ''}`.trim();

		Object.entries(vipCards).forEach(([instanceId, instance]) => {
			// Only include instances with pending activation requests
			if (instance.activationRequestedAt && !instance.usedAt) {
				const cardDef = getVipCardById(instance.cardId);

				if (cardDef && cardDef.action) {
					activationRequests.push({
						studentId: profile.id,
						studentName: studentName || 'Élève',
						instanceId,
						cardId: instance.cardId,
						cardName: cardDef.name,
						actionDescription: getActionDescription(cardDef.action),
						requestedAt: instance.activationRequestedAt
					});
				}
			}
		});
	});

	// Sort by requested date (most recent first)
	activationRequests.sort(
		(a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
	);

	return {
		activationRequests
	};
};
