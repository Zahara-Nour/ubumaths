import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { removeFromClassSchema } from '$lib/server/validation/admin';

export const POST: RequestHandler = async ({ request, locals: { safeGetSession, supabase } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	// ✅ SECURITY: Verify admin role
	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'admin') {
		throw error(403, 'Forbidden - Admin access required');
	}

	// ✅ SECURITY: Validate input with Zod
	const body = await request.json();
	const validation = removeFromClassSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { userId, classId } = validation.data;

	// Remove from class_members table
	const { error: deleteError } = await supabase
		.from('class_members')
		.delete()
		.eq('student_id', userId)
		.eq('class_id', classId);

	if (deleteError) {
		console.error('Delete error:', deleteError);
		return json({ error: deleteError.message }, { status: 400 });
	}

	// Fetch the updated profile with all classes
	const { data: updatedProfile, error: fetchError } = await supabase
		.from('profiles')
		.select('*, schools(name), class_members(class_id)')
		.eq('id', userId)
		.single();

	if (fetchError) {
		console.error('Fetch error:', fetchError);
		return json({ error: fetchError.message }, { status: 400 });
	}

	// Transform class_members array to class_ids array
	const profileWithClasses = {
		...updatedProfile,
		class_ids: updatedProfile.class_members?.map((cm: { class_id: string }) => cm.class_id) || []
	};

	return json({ success: true, profile: profileWithClasses });
};
