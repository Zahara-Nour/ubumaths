import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { schoolUpsertSchema } from '$lib/server/validation/schools';
import { uuidSchema } from '$lib/server/validation/common';
import { requireAdmin } from '$lib/server/middleware/auth';
import { assertTypedConfirmation } from '$lib/server/confirmAction';

export const load: PageServerLoad = async ({ locals }) => {
	// Admin only (real admin login OR step-up elevation)
	const { supabase } = await requireAdmin(locals);

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
	create: async ({ request, locals }) => {
		const { supabase } = await requireAdmin(locals);

		const formData = await request.formData();
		const parsed = schoolUpsertSchema.safeParse({
			name: formData.get('name'),
			city: formData.get('city'),
			country: formData.get('country'),
			address: formData.get('address'),
			logo_url: formData.get('logo_url'),
			uai: formData.get('uai') ?? ''
		});
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0].message });
		}

		const { error: insertError } = await supabase.from('schools').insert({
			...parsed.data,
			is_active: true
		});

		if (insertError) {
			return fail(400, { message: insertError.message });
		}

		return { success: true };
	},

	update: async ({ request, locals }) => {
		const { supabase } = await requireAdmin(locals);

		const formData = await request.formData();

		const idResult = uuidSchema.safeParse(formData.get('id'));
		if (!idResult.success) {
			return fail(400, { message: 'Identifiant école invalide' });
		}

		const parsed = schoolUpsertSchema.safeParse({
			name: formData.get('name'),
			city: formData.get('city'),
			country: formData.get('country'),
			address: formData.get('address'),
			logo_url: formData.get('logo_url'),
			uai: formData.get('uai') ?? ''
		});
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0].message });
		}

		const is_active = formData.get('is_active') === 'true';

		const { error: updateError } = await supabase
			.from('schools')
			.update({
				...parsed.data,
				is_active
			})
			.eq('id', idResult.data);

		if (updateError) {
			return fail(400, { message: updateError.message });
		}

		return { success: true };
	},

	delete: async ({ request, locals }) => {
		const { supabase } = await requireAdmin(locals);

		const formData = await request.formData();
		const id = formData.get('id') as string;

		// Typed confirmation (destructive): the admin must type the exact school name.
		// Enforced server-side — the dialog is only the friendly front door.
		const { data: school, error: schoolError } = await supabase
			.from('schools')
			.select('name')
			.eq('id', id)
			.single();
		if (schoolError || !school) {
			return fail(404, { message: 'École introuvable' });
		}
		assertTypedConfirmation(formData.get('confirm'), school.name);

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

	bulk_create: async ({ request, locals }) => {
		const { supabase } = await requireAdmin(locals);

		const formData = await request.formData();
		const schoolsJson = formData.get('schools') as string;

		if (!schoolsJson) {
			return fail(400, { message: 'No schools data provided' });
		}

		let rawSchools: unknown;
		try {
			rawSchools = JSON.parse(schoolsJson);
		} catch (_e) {
			return fail(400, { message: 'Invalid schools data' });
		}

		if (!Array.isArray(rawSchools) || rawSchools.length === 0) {
			return fail(400, { message: 'No schools data provided' });
		}

		// Validate each row with the shared schema.
		// NOTE: bulk import (spreadsheet paste) has no UAI column → uai stays NULL.
		// Admins set the UAI per school via the single-entry form / Annuaire lookup.
		const schoolsToInsert = [];
		for (const [i, row] of rawSchools.entries()) {
			const r = row as Record<string, unknown>;
			const parsed = schoolUpsertSchema.safeParse({
				name: r.name,
				city: r.city,
				country: r.country,
				address: r.address,
				logo_url: r.logo_url,
				uai: ''
			});
			if (!parsed.success) {
				return fail(400, {
					message: `Ligne ${i + 1} : ${parsed.error.issues[0].message}`
				});
			}
			schoolsToInsert.push({ ...parsed.data, is_active: true });
		}

		const { error: insertError } = await supabase.from('schools').insert(schoolsToInsert);

		if (insertError) {
			return fail(400, { message: insertError.message });
		}

		return { success: true, count: schoolsToInsert.length };
	}
};
