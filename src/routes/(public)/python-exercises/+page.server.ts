import type { PageServerLoad } from './$types';

/**
 * Landing page for the Python Exercises feature. Public — anyone (signed in
 * or not) sees the explanation. The "Créer / Mes exercices" buttons only
 * render when the visitor is a teacher.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const { user, supabase } = locals;

	let isTeacher = false;
	if (user) {
		const { data: profile } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();
		isTeacher = profile?.role === 'teacher';
	}

	return { isTeacher };
};
