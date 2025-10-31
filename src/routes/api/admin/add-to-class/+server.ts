import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { addToClassSchema } from '$lib/server/validation/admin';
import { requireRole } from '$lib/server/middleware/auth';

export const POST: RequestHandler = async ({ request, locals }) => {
	await requireRole(locals, 'admin');

	// ✅ SECURITY: Validate input with Zod
	const body = await request.json();
	const validation = addToClassSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { userId, classId } = validation.data;

	// Check if already in class
	const { data: existing } = await locals.supabase
		.from('class_members')
		.select('id')
		.eq('student_id', userId)
		.eq('class_id', classId)
		.single();

	if (existing) {
		return json({ error: 'User is already in this class' }, { status: 400 });
	}

	// Add to class_members table
	const { error: insertError } = await locals.supabase
		.from('class_members')
		.insert({ student_id: userId, class_id: classId });

	if (insertError) {
		console.error('Insert error:', insertError);
		return json({ error: insertError.message }, { status: 400 });
	}

	// Fetch the updated profile with all classes
	const { data: updatedProfile, error: fetchError } = await locals.supabase
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
