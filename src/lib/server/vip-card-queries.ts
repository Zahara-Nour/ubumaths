/**
 * Server-side VIP Card Template Query Helpers
 * Used by API endpoints and +page.server.ts files
 *
 * These functions provide direct database access for server-side code.
 * For client-side components, use the vipCardTemplates store instead.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { VipCardTemplate } from '$lib/stores/vipCardTemplates.svelte';
import type { VipCardCategory, VipCardRarity } from '$lib/types/vip-card';

/**
 * Get all VIP card templates from database
 * @param supabase - Supabase client instance
 * @param enabledOnly - If true, only return enabled templates (default: false)
 * @returns Array of VIP card templates
 */
export async function getAllTemplates(
	supabase: SupabaseClient<Database>,
	enabledOnly = false
): Promise<VipCardTemplate[]> {
	let query = supabase
		.from('vip_card_templates')
		.select('*')
		.order('sort_order', { ascending: true });

	if (enabledOnly) {
		query = query.eq('is_enabled', true);
	}

	const { data, error } = await query;

	if (error) {
		console.error('❌ [vip-card-queries] Error fetching all templates:', error);
		throw error;
	}

	return (data as VipCardTemplate[]) || [];
}

/**
 * Get a single VIP card template by ID
 * @param supabase - Supabase client instance
 * @param cardId - Card template ID
 * @returns VIP card template or null if not found
 */
export async function getTemplateById(
	supabase: SupabaseClient<Database>,
	cardId: string
): Promise<VipCardTemplate | null> {
	const { data, error } = await supabase
		.from('vip_card_templates')
		.select('*')
		.eq('id', cardId)
		.single();

	if (error) {
		if (error.code === 'PGRST116') {
			// Not found - expected case
			return null;
		}
		console.error(`❌ [vip-card-queries] Error fetching template ${cardId}:`, error);
		throw error;
	}

	return data as VipCardTemplate;
}

/**
 * Get multiple VIP card templates by IDs
 * @param supabase - Supabase client instance
 * @param cardIds - Array of card template IDs
 * @returns Array of VIP card templates (only found cards)
 */
export async function getTemplatesByIds(
	supabase: SupabaseClient<Database>,
	cardIds: string[]
): Promise<VipCardTemplate[]> {
	if (cardIds.length === 0) {
		return [];
	}

	const { data, error } = await supabase.from('vip_card_templates').select('*').in('id', cardIds);

	if (error) {
		console.error('❌ [vip-card-queries] Error fetching templates by IDs:', error);
		throw error;
	}

	return (data as VipCardTemplate[]) || [];
}

/**
 * Get VIP card templates filtered by category
 * @param supabase - Supabase client instance
 * @param category - Card category to filter by
 * @param enabledOnly - If true, only return enabled templates (default: false)
 * @returns Array of VIP card templates
 */
export async function getTemplatesByCategory(
	supabase: SupabaseClient<Database>,
	category: VipCardCategory,
	enabledOnly = false
): Promise<VipCardTemplate[]> {
	let query = supabase
		.from('vip_card_templates')
		.select('*')
		.eq('category', category)
		.order('sort_order', { ascending: true });

	if (enabledOnly) {
		query = query.eq('is_enabled', true);
	}

	const { data, error } = await query;

	if (error) {
		console.error(`❌ [vip-card-queries] Error fetching templates by category ${category}:`, error);
		throw error;
	}

	return (data as VipCardTemplate[]) || [];
}

/**
 * Get VIP card templates filtered by rarity
 * @param supabase - Supabase client instance
 * @param rarity - Card rarity to filter by
 * @param enabledOnly - If true, only return enabled templates (default: false)
 * @returns Array of VIP card templates
 */
export async function getTemplatesByRarity(
	supabase: SupabaseClient<Database>,
	rarity: VipCardRarity,
	enabledOnly = false
): Promise<VipCardTemplate[]> {
	let query = supabase
		.from('vip_card_templates')
		.select('*')
		.eq('rarity', rarity)
		.order('sort_order', { ascending: true });

	if (enabledOnly) {
		query = query.eq('is_enabled', true);
	}

	const { data, error } = await query;

	if (error) {
		console.error(`❌ [vip-card-queries] Error fetching templates by rarity ${rarity}:`, error);
		throw error;
	}

	return (data as VipCardTemplate[]) || [];
}

/**
 * Get VIP card templates that have actions
 * @param supabase - Supabase client instance
 * @param enabledOnly - If true, only return enabled templates (default: false)
 * @returns Array of VIP card templates with non-null actions
 */
export async function getTemplatesWithActions(
	supabase: SupabaseClient<Database>,
	enabledOnly = false
): Promise<VipCardTemplate[]> {
	let query = supabase
		.from('vip_card_templates')
		.select('*')
		.not('action', 'is', null)
		.order('sort_order', { ascending: true });

	if (enabledOnly) {
		query = query.eq('is_enabled', true);
	}

	const { data, error } = await query;

	if (error) {
		console.error('❌ [vip-card-queries] Error fetching templates with actions:', error);
		throw error;
	}

	return (data as VipCardTemplate[]) || [];
}

/**
 * Get only enabled VIP card templates
 * @param supabase - Supabase client instance
 * @returns Array of enabled VIP card templates
 */
export async function getEnabledTemplates(
	supabase: SupabaseClient<Database>
): Promise<VipCardTemplate[]> {
	return getAllTemplates(supabase, true);
}

/**
 * Check if a card template exists by ID
 * @param supabase - Supabase client instance
 * @param cardId - Card template ID
 * @returns True if template exists, false otherwise
 */
export async function templateExists(
	supabase: SupabaseClient<Database>,
	cardId: string
): Promise<boolean> {
	const { data, error } = await supabase
		.from('vip_card_templates')
		.select('id')
		.eq('id', cardId)
		.single();

	if (error) {
		if (error.code === 'PGRST116') {
			return false; // Not found
		}
		console.error(`❌ [vip-card-queries] Error checking template existence for ${cardId}:`, error);
		throw error;
	}

	return data !== null;
}

/**
 * VIP Card Activation Request Interface
 * Represents a pending activation request with student and card details
 */
export interface VipCardActivationRequest {
	instanceId: string; // VIP card instance ID (key in vip_cards JSONB)
	cardId: string; // Card template ID
	cardName: string; // Card name (from template)
	cardImagePath: string; // Card image path (from template)
	cardAction: VipCardTemplate['action']; // Card action (from template)
	studentId: string; // Student's profile ID
	studentName: string; // Student's full name
	studentEmail: string; // Student's email
	requestedAt: string; // ISO timestamp when request was made
	requestedBy: string; // UUID of student who requested (should match studentId)
}

/**
 * Get all pending VIP card activation requests for a teacher
 * Queries all students in all classes taught by the teacher
 *
 * @param supabase - Supabase client instance
 * @param teacherId - Teacher's profile ID
 * @returns Array of pending activation requests with student and card details
 */
export async function getPendingActivationRequests(
	supabase: SupabaseClient<Database>,
	teacherId: string
): Promise<VipCardActivationRequest[]> {
	// Step 1: Get all class IDs where teacher teaches
	const { data: teacherClasses, error: classesError } = await supabase
		.from('classes')
		.select('id')
		.eq('teacher_id', teacherId);

	if (classesError) {
		console.error('❌ [vip-card-queries] Error fetching teacher classes:', classesError);
		throw classesError;
	}

	if (!teacherClasses || teacherClasses.length === 0) {
		return []; // Teacher has no classes
	}

	const classIds = teacherClasses.map((c) => c.id);

	// Step 2: Get all active student IDs in these classes
	const { data: classMembers, error: membersError } = await supabase
		.from('class_members')
		.select('student_id, profiles!inner(email, firstname, lastname)')
		.in('class_id', classIds)
		.eq('status', 'active');

	if (membersError) {
		console.error('❌ [vip-card-queries] Error fetching class members:', membersError);
		throw membersError;
	}

	if (!classMembers || classMembers.length === 0) {
		return []; // Teacher has no students
	}

	const studentIds = [...new Set(classMembers.map((m) => m.student_id))];

	// Step 3: Get all student profiles with their vip_cards
	const { data: students, error: studentsError } = await supabase
		.from('profiles')
		.select('id, email, firstname, lastname, vip_cards')
		.in('id', studentIds);

	if (studentsError) {
		console.error('❌ [vip-card-queries] Error fetching student profiles:', studentsError);
		throw studentsError;
	}

	if (!students || students.length === 0) {
		return [];
	}

	// Step 4: Get all VIP card templates for card details
	const templates = await getAllTemplates(supabase, false);
	const templateMap = new Map(templates.map((t) => [t.id, t]));

	// Step 5: Extract pending requests from vip_cards JSONB
	const pendingRequests: VipCardActivationRequest[] = [];

	for (const student of students) {
		if (!student.vip_cards || typeof student.vip_cards !== 'object') {
			continue;
		}

		const vipCards = student.vip_cards as Record<
			string,
			{
				cardId: string;
				earnedAt: string;
				usedAt: string | null;
				activationRequestedAt?: string | null;
				activationRequestedBy?: string | null;
				activationApprovedAt?: string | null;
			}
		>;

		for (const [instanceId, instance] of Object.entries(vipCards)) {
			// Only include if:
			// 1. Has pending activation request
			// 2. Not yet approved (activationApprovedAt is null)
			// 3. Not yet used
			// 4. Card template exists
			if (
				instance.activationRequestedAt &&
				!instance.activationApprovedAt &&
				!instance.usedAt &&
				templateMap.has(instance.cardId)
			) {
				const template = templateMap.get(instance.cardId)!;

				pendingRequests.push({
					instanceId,
					cardId: instance.cardId,
					cardName: template.name,
					cardImagePath: template.image_path,
					cardAction: template.action,
					studentId: student.id,
					studentName: `${student.firstname || ''} ${student.lastname || ''}`.trim() || 'Unknown',
					studentEmail: student.email || 'no-email@example.com',
					requestedAt: instance.activationRequestedAt,
					requestedBy: instance.activationRequestedBy || student.id
				});
			}
		}
	}

	// Step 6: Sort by request date (oldest first)
	pendingRequests.sort(
		(a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime()
	);

	return pendingRequests;
}

/**
 * Count pending VIP card activation requests for a teacher
 * Used for sidebar notification badge
 *
 * @param supabase - Supabase client instance
 * @param teacherId - Teacher's profile ID
 * @returns Number of pending activation requests
 */
export async function countPendingActivationRequests(
	supabase: SupabaseClient<Database>,
	teacherId: string
): Promise<number> {
	const requests = await getPendingActivationRequests(supabase, teacherId);
	return requests.length;
}
