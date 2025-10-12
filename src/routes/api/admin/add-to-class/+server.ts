import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals: { safeGetSession, supabase } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const { userId, classId } = await request.json();

	if (!userId || !classId) {
		return json({ error: 'User ID and Class ID are required' }, { status: 400 });
	}

	// Check if already in class
	const { data: existing } = await supabase
		.from('class_members')
		.select('id')
		.eq('student_id', userId)
		.eq('class_id', classId)
		.single();

	if (existing) {
		return json({ error: 'User is already in this class' }, { status: 400 });
	}

	// Add to class_members table
	const { error: insertError } = await supabase
		.from('class_members')
		.insert({ student_id: userId, class_id: classId });

	if (insertError) {
		console.error('Insert error:', insertError);
		return json({ error: insertError.message }, { status: 400 });
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
		class_ids: updatedProfile.class_members?.map((cm: any) => cm.class_id) || []
	};

	return json({ success: true, profile: profileWithClasses });
};
