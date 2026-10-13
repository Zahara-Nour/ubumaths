import type { PageServerLoad } from './$types';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('(public)/python-exercises/+page.server');

/**
 * Landing page for the Python Exercises feature. Public — anyone (signed in
 * or not) sees the explanation. The "Créer / Mes exercices" buttons only
 * render when the visitor is a teacher.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const { user, supabase } = locals;

	let isTeacher = false;
	if (user) {
		const { data: profile, error: profileError } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		// Élément de contexte : le repli d'affichage existe déjà, mais son absence ne
		// doit pas se confondre avec une donnée réellement vide.
		if (profileError && profileError.code !== 'PGRST116') {
			logger.error('Contexte illisible :', profileError);
		}
		isTeacher = profile?.role === 'teacher';
	}

	return { isTeacher };
};
