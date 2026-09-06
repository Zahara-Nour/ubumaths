import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();

	if (!user) {
		throw redirect(303, '/auth/login');
	}

	// Get user profile to check role
	const { data: profile, error: profileError } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	// PGRST116 = pas de profil, et le refus qui suit est légitime. Toute AUTRE
	// panne produisait le même refus, indiscernable d'un refus mérité.
	if (profileError && profileError.code !== 'PGRST116') {
		console.error('Rôle illisible :', profileError);
		throw error(500, 'Impossible de vérifier vos droits');
	}

	if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
		throw redirect(303, '/dashboard');
	}

	return {};
};
