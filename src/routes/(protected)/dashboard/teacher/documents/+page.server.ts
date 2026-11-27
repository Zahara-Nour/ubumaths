import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Le rôle est gardé par le layout `dashboard/teacher` (professeur seulement) :
// pas de seconde lecture du profil ici.
export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();

	if (!user) {
		throw redirect(303, '/auth/login');
	}

	return {};
};
