/**
 * API Endpoint: Remove VIP Card
 * ===============================
 *
 * Allows teachers to remove VIP card instances from students' collections.
 * This is a teacher-only administrative action (not for normal card usage).
 *
 * POST /api/vip-cards/remove
 *
 * @param studentId - UUID of the student who owns the card
 * @param cardId - ID of the card type to remove (e.g., "bonus", "captain")
 *
 * WORKFLOW:
 * ---------
 * 1. Find oldest unused instance of the specified cardId
 * 2. Delete that instance from profiles.vip_cards JSONB
 * 3. No gidouilles refund (student paid for the card)
 * 4. No action execution (even if card has one)
 *
 * USE CASES:
 * ----------
 * - Teacher gave card by mistake
 * - Disciplinary action (removing privileges)
 * - Correcting technical bugs/issues
 * - Student violated rules
 *
 * SECURITY:
 * ---------
 * - Requires authentication
 * - Only teachers/admins can remove cards
 * - Teacher must teach the student (verified via class_members)
 * - Finds oldest unused instance to maintain fairness
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { requireAuth } from '$lib/server/middleware/auth';
import type { StudentVipCards } from '$lib/types/vip-card';
import { getVipCardById } from '$lib/types/vip-card';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const removeCardSchema = z.object({
	studentId: z.string().uuid('Invalid student ID format'),
	cardId: z.string().min(1, 'Card ID is required')
});

// ============================================================================
// POST HANDLER
// ============================================================================

export const POST: RequestHandler = async ({ request, locals }) => {
	// Require authentication (teacher/admin)
	const { user, profile } = await requireAuth(locals);
	const supabase = locals.supabase;

	// Verify user is teacher or admin
	if (profile.role !== 'teacher' && profile.role !== 'admin') {
		throw error(403, 'Only teachers can remove student VIP cards');
	}

	// Parse and validate request body
	const body = await request.json();
	const validation = removeCardSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { studentId, cardId } = validation.data;

	// Verify that teacher teaches this student
	const { data: classCheck } = await supabase
		.from('class_members')
		.select(
			`
			class_id,
			classes!inner(teacher_id)
		`
		)
		.eq('student_id', studentId);

	const teachesStudent = classCheck?.some((cm) => {
		const classes = cm.classes as unknown;
		if (classes && typeof classes === 'object' && 'teacher_id' in classes) {
			return (classes as { teacher_id: string }).teacher_id === user.id;
		}
		return false;
	});

	if (!teachesStudent) {
		throw error(403, 'You can only remove cards for students in your classes');
	}

	// Fetch student's VIP cards
	const { data: studentProfile, error: fetchError } = await supabase
		.from('profiles')
		.select('vip_cards')
		.eq('id', studentId)
		.single();

	if (fetchError) {
		console.error('[remove-card] Error fetching student profile:', fetchError);
		throw error(500, `Failed to fetch student profile: ${fetchError.message}`);
	}

	const vipCards = (studentProfile.vip_cards || {}) as unknown as StudentVipCards;

	// Find oldest unused instance of this card type
	const entries = Object.entries(vipCards);
	const matchingInstances = entries
		.filter(([_, inst]) => inst.cardId === cardId && !inst.usedAt)
		.sort((a, b) => new Date(a[1].earnedAt).getTime() - new Date(b[1].earnedAt).getTime());

	if (matchingInstances.length === 0) {
		throw error(404, 'No unused instances of this card found');
	}

	const [instanceIdToRemove] = matchingInstances[0];

	// Get card definition for response
	const cardDef = getVipCardById(cardId);
	const cardName = cardDef?.name || cardId;

	// Remove the instance from the JSONB object
	const updatedCards = { ...vipCards };
	delete updatedCards[instanceIdToRemove];

	// Save updated cards to database
	const { error: updateError } = await supabase
		.from('profiles')
		.update({ vip_cards: updatedCards as never })
		.eq('id', studentId);

	if (updateError) {
		console.error('[remove-card] Error updating vip_cards:', updateError);
		throw error(500, `Failed to remove card: ${updateError.message}`);
	}

	// Return success
	return json({
		success: true,
		message: 'Card removed successfully',
		cardName,
		instanceId: instanceIdToRemove
	});
};
