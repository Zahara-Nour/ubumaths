import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals: { safeGetSession, supabase }, parent }) => {
	// Get authenticated user from session
	const { user } = await safeGetSession();

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	// Get profile from parent layout (already verified by dashboard layout)
	const { profile } = await parent();

	// Verify admin role
	if (profile.role !== 'admin') {
		throw error(403, 'Admin access required');
	}

	// Fetch all schools
	const { data: schools, error: schoolsError } = await supabase
		.from('schools')
		.select('*')
		.order('name');

	if (schoolsError) {
		console.error('Error fetching schools:', schoolsError);
		throw error(500, 'Failed to load schools');
	}

	return {
		schools: schools || []
	};
};

export const actions: Actions = {
	create: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const city = formData.get('city') as string;
		const country = formData.get('country') as string;
		const address = formData.get('address') as string;
		const logo_url = formData.get('logo_url') as string;

		const { error: insertError } = await supabase.from('schools').insert({
			name,
			city,
			country,
			address: address || null,
			logo_url: logo_url || null,
			is_active: true
		});

		if (insertError) {
			return fail(400, { message: insertError.message });
		}

		return { success: true };
	},

	update: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const name = formData.get('name') as string;
		const city = formData.get('city') as string;
		const country = formData.get('country') as string;
		const address = formData.get('address') as string;
		const logo_url = formData.get('logo_url') as string;
		const is_active = formData.get('is_active') === 'true';

		const { error: updateError } = await supabase
			.from('schools')
			.update({
				name,
				city,
				country,
				address: address || null,
				logo_url: logo_url || null,
				is_active
			})
			.eq('id', id);

		if (updateError) {
			return fail(400, { message: updateError.message });
		}

		return { success: true };
	},

	delete: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;

		// Check if school has any profiles associated
		const { data: profiles, error: checkError } = await supabase
			.from('profiles')
			.select('id')
			.eq('school_id', id)
			.limit(1);

		if (checkError) {
			return fail(400, { message: 'Error checking school usage' });
		}

		if (profiles && profiles.length > 0) {
			return fail(400, {
				message: 'Cannot delete school with associated users. Please deactivate instead.'
			});
		}

		const { error: deleteError } = await supabase.from('schools').delete().eq('id', id);

		if (deleteError) {
			return fail(400, { message: deleteError.message });
		}

		return { success: true };
	},

	bulk_create: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const schoolsJson = formData.get('schools') as string;

		if (!schoolsJson) {
			return fail(400, { message: 'No schools data provided' });
		}

		let schools: any[];
		try {
			schools = JSON.parse(schoolsJson);
		} catch (e) {
			return fail(400, { message: 'Invalid schools data' });
		}

		// Validate all schools have required fields
		for (const school of schools) {
			if (!school.name || !school.city || !school.country) {
				return fail(400, { message: 'All schools must have name, city, and country' });
			}
		}

		// Prepare schools for insert
		const schoolsToInsert = schools.map((school) => ({
			name: school.name,
			city: school.city,
			country: school.country,
			address: school.address || null,
			logo_url: school.logo_url || null,
			is_active: true
		}));

		const { error: insertError } = await supabase.from('schools').insert(schoolsToInsert);

		if (insertError) {
			return fail(400, { message: insertError.message });
		}

		return { success: true, count: schools.length };
	}
};
