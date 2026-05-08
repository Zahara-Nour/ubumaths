import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { PythonExercise } from '$lib/types/python-exercises';

/**
 * List the teacher's own exercises.
 *
 * Anonymous users → /auth/login. Non-teachers → 403. Teachers see all of
 * their exos (public + private) ordered by most-recently-created first.
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
		throw error(403, 'La gestion des exercices est réservée aux enseignants');
	}

	const { data: exercises, error: fetchError } = await supabase
		.from('python_exercises')
		.select('id, title, description, tags, is_public, created_at, updated_at')
		.eq('author_id', user.id)
		.order('created_at', { ascending: false });

	if (fetchError) {
		console.error('Failed to load teacher exercises:', fetchError);
		throw error(500, 'Erreur lors du chargement de tes exercices');
	}

	return {
		exercises: (exercises ?? []) as Pick<
			PythonExercise,
			'id' | 'title' | 'description' | 'tags' | 'is_public' | 'created_at' | 'updated_at'
		>[]
	};
};
