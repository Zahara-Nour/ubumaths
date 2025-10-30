import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /api/messages/recipients
 * Get allowed recipients for the current user
 * - Students can message their teachers
 * - Teachers can message their students and get their classes for group messaging
 */
export const GET: RequestHandler = async ({ locals }) => {
	const supabase = locals.supabase;
	const { user } = await locals.safeGetSession();

	if (!user) {
		throw error(401, 'Non authentifié');
	}

	try {
		// Get user's role
		const { data: profile, error: profileError } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		if (profileError) {
			console.error('Error fetching profile:', profileError);
			throw error(500, 'Erreur lors de la récupération du profil');
		}

		// Get allowed recipients
		const { data: recipients, error: recipientsError } = await supabase.rpc(
			'get_allowed_recipients',
			{
				p_user_id: user.id
			}
		);

		if (recipientsError) {
			console.error('Error fetching recipients:', recipientsError);
			throw error(500, 'Erreur lors de la récupération des destinataires');
		}

		// If teacher, also get classes for group messaging
		let classes = null;
		if (profile.role === 'teacher') {
			const { data: classesData, error: classesError } = await supabase.rpc(
				'get_teacher_classes_for_messaging',
				{
					p_teacher_id: user.id
				}
			);

			if (classesError) {
				console.error('Error fetching classes:', classesError);
			} else {
				classes = classesData;
			}
		}

		return json({
			recipients: recipients || [],
			classes: classes || [],
			userRole: profile.role
		});
	} catch (err) {
		console.error('Error in recipients API:', err);
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Erreur serveur');
	}
};
