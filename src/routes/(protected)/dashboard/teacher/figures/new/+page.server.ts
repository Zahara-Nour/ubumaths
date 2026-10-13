/**
 * Nouvelle figure géométrique (ADR 0027). La RLS réserve la création au prof
 * et à l'admin ; la garde de rôle ci-dessous le dit avant elle.
 */

import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { parseFigureFormData } from '$lib/server/validation/geometry-figures';
import { createGeometryFigure, GeometryFigureError } from '$lib/server/geometry-figures';

export const load: PageServerLoad = async ({ locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);
	return {};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const { user } = await requireRoles(locals, ['teacher', 'admin']);
		const validation = parseFigureFormData(await request.formData());
		if (!validation.success) {
			return fail(400, { message: validation.error.issues[0].message });
		}

		try {
			const figure = await createGeometryFigure(locals.supabase, validation.data, user.id);
			return { id: figure.id };
		} catch (e) {
			if (e instanceof GeometryFigureError) return fail(e.status, { message: e.message });
			throw e;
		}
	}
};
