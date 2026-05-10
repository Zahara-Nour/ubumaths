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
		.select(
			'id, title, description, level, is_public, created_at, updated_at, python_exercise_tags(python_tags(name))'
		)
		.eq('author_id', user.id)
		.order('created_at', { ascending: false });

	if (fetchError) {
		console.error('Failed to load teacher exercises:', fetchError);
		throw error(500, 'Erreur lors du chargement de tes exercices');
	}

	// Flatten the junction (python_exercise_tags > python_tags) into a plain `tags: string[]`.
	const flattened = (exercises ?? []).map((row) => {
		const nested = (row as Record<string, unknown>).python_exercise_tags;
		const tagNames: string[] = Array.isArray(nested)
			? nested
					.map((j) => {
						const tag = (j as Record<string, unknown>).python_tags;
						return tag && typeof tag === 'object' && 'name' in tag
							? (tag as { name: string }).name
							: null;
					})
					.filter((n): n is string => Boolean(n))
					.sort()
			: [];
		const { python_exercise_tags: _stripped, ...rest } = row as Record<string, unknown>;
		return { ...(rest as Record<string, unknown>), tags: tagNames };
	});

	return {
		exercises: flattened as unknown as Pick<
			PythonExercise,
			'id' | 'title' | 'description' | 'level' | 'tags' | 'is_public' | 'created_at' | 'updated_at'
		>[]
	};
};
