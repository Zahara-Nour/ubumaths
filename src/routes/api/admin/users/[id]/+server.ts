/**
 * Admin User Profile API by ID
 * ==============================
 *
 * Endpoints:
 * - PATCH: Update user profile fields (partial update for inline editing)
 *
 * Security: Admin only
 * Validation: Zod (all inputs validated, see updateUserFieldsSchema)
 *
 * @module api/admin/users/[id]
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateUserFieldsSchema } from '$lib/server/validation/admin';
import type { Database } from '$lib/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ExtendedProfile = Profile & {
	schools?: { name: string } | null;
	class_members?: { class_id: string }[];
	class_ids?: string[];
};

/**
 * PATCH /api/admin/users/[id]
 *
 * Update user profile fields (partial update)
 * Used by admin dashboard inline editing feature
 *
 * Request body: Partial user profile fields (at least one field required)
 * {
 *   firstname?: string | null,
 *   lastname?: string | null,
 *   email?: string,
 *   role?: 'admin' | 'teacher' | 'student',
 *   school_id?: string | null,  // UUID
 *   is_test?: boolean
 * }
 *
 * Response: 200 with updated full profile including relations
 * {
 *   success: boolean,
 *   profile: ExtendedProfile
 * }
 *
 * Errors:
 *   - 400: Validation error or no fields provided
 *   - 401: Not authenticated
 *   - 403: Not admin
 *   - 404: User not found
 *   - 500: Server error
 */
export const PATCH: RequestHandler = async ({ request, locals, params }) => {
	// ✅ SECURITY: Authentication check
	if (!locals.profile) {
		throw error(401, 'Authentication required');
	}

	// ✅ SECURITY: Authorization check (admin only)
	if (locals.profile.role !== 'admin') {
		throw error(403, 'Admin access required');
	}

	const supabase = locals.supabase;
	const userId = params.id;

	// Validate UUID format for userId
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(userId)) {
		throw error(400, 'Invalid user ID format');
	}

	try {
		// ✅ SECURITY: Input validation with Zod
		const body = await request.json();
		const validation = updateUserFieldsSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const data = validation.data;

		// 1. Check if user exists
		const { data: existing, error: checkError } = await supabase
			.from('profiles')
			.select('id')
			.eq('id', userId)
			.maybeSingle();

		if (checkError) {
			console.error('Error checking user existence:', checkError);
			throw error(500, 'Failed to check user existence');
		}

		if (!existing) {
			throw error(404, `User with ID "${userId}" not found`);
		}

		// 2. Build update object (only include provided fields)
		const updateData: Record<string, unknown> = {};

		if (data.firstname !== undefined) updateData.firstname = data.firstname;
		if (data.lastname !== undefined) updateData.lastname = data.lastname;
		if (data.role !== undefined) updateData.role = data.role;
		if (data.school_id !== undefined) updateData.school_id = data.school_id;
		if (data.is_test !== undefined) updateData.is_test = data.is_test;

		// Always update timestamp
		updateData.updated_at = new Date().toISOString();

		console.log('🔧 [API] Updating user:', {
			userId,
			receivedData: data,
			updateData
		});

		// 3. Update profile
		const { error: updateError } = await supabase
			.from('profiles')
			.update(updateData)
			.eq('id', userId);

		if (updateError) {
			console.error('❌ [API] Error updating profile:', updateError);
			throw error(500, 'Failed to update profile');
		}

		console.log('✅ [API] Profile updated successfully');

		// 4. Fetch updated profile with relations (schools + class_members)
		const { data: updatedProfile, error: fetchError } = await supabase
			.from('profiles')
			.select(
				`
				*,
				schools (name),
				class_members (class_id)
			`
			)
			.eq('id', userId)
			.single();

		if (fetchError) {
			console.error('❌ [API] Error fetching updated profile:', fetchError);
			throw error(500, 'Failed to fetch updated profile');
		}

		console.log('📥 [API] Fetched updated profile:', {
			school_id: updatedProfile?.school_id,
			schools: updatedProfile?.schools
		});

		// 5. Transform response to match ExtendedProfile type
		const extendedProfile: ExtendedProfile = {
			...updatedProfile,
			// Transform class_members array to include class_ids
			class_ids: Array.isArray(updatedProfile.class_members)
				? updatedProfile.class_members.map((cm: { class_id: string }) => cm.class_id)
				: []
		};

		// 6. Return success response
		return json({
			success: true,
			profile: extendedProfile
		});
	} catch (err) {
		console.error('Error in PATCH /api/admin/users/[id]:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Catch-all for unexpected errors
		throw error(500, 'Internal server error');
	}
};
