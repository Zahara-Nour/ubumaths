import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { awardGidouillesSchema } from '$lib/server/validation/rewards';

export const POST: RequestHandler = async ({ request, locals: { safeGetSession, supabase } }) => {
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	try {
		// ✅ SECURITY: Validate input with Zod
		const body = await request.json();
		const validation = awardGidouillesSchema.safeParse(body);

		if (!validation.success) {
			throw error(400, validation.error.issues[0].message);
		}

		const { studentId, amount } = validation.data;

		// Verify the user is a teacher
		const { data: profile, error: profileError } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		if (profileError || !profile) {
			throw error(500, 'Failed to fetch user profile');
		}

		if (profile.role !== 'teacher' && profile.role !== 'admin') {
			throw error(403, 'Only teachers and admins can award gidouilles');
		}

		// Verify the student exists and is in one of the teacher's classes (for teachers)
		if (profile.role === 'teacher') {
			const { data: classMemberships, error: membershipError } = await supabase
				.from('class_members')
				.select(
					`
					class_id,
					classes!inner (
						teacher_id
					)
				`
				)
				.eq('student_id', studentId);

			if (membershipError) {
				throw error(500, 'Failed to verify class membership');
			}

			// Check if any of the student's classes are taught by this teacher
			const isTeacherOfStudent = classMemberships?.some((membership) => {
				const classData = Array.isArray(membership.classes)
					? membership.classes[0]
					: membership.classes;
				return classData?.teacher_id === user.id;
			});

			if (!isTeacherOfStudent) {
				throw error(403, 'You can only award gidouilles to your own students');
			}
		}

		// Fetch current gidouilles amount
		const { data: currentProfile, error: fetchError } = await supabase
			.from('profiles')
			.select('gidouilles')
			.eq('id', studentId)
			.single();

		if (fetchError) {
			throw error(500, 'Failed to fetch student profile');
		}

		// Calculate new amount
		const newAmount = (currentProfile.gidouilles || 0) + amount;

		// Update gidouilles
		const { error: updateError } = await supabase
			.from('profiles')
			.update({ gidouilles: newAmount })
			.eq('id', studentId);

		if (updateError) {
			throw error(500, 'Failed to update gidouilles');
		}

		return json({ success: true, newAmount });
	} catch (err) {
		console.error('Error awarding gidouilles:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Internal server error');
	}
};
