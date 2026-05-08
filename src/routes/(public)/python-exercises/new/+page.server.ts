import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Auth gate for the exercise creation page.
 *
 * Anonymous users are sent to /auth/login. Authenticated non-teachers get a
 * 403. Teachers proceed to the form (which posts directly to
 * /api/python-exercises, where ownership is enforced again).
 */
export const load: PageServerLoad = async ({ locals, url }) => {
	const { user, supabase } = locals;

	if (!user) {
		throw redirect(303, `/auth/login?next=${encodeURIComponent(url.pathname)}`);
	}

	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (profileError || !profile) {
		throw error(403, 'Profil utilisateur introuvable');
	}

	if (profile.role !== 'teacher') {
		throw error(403, "La création d'exercices est réservée aux enseignants");
	}

	return {};
};
