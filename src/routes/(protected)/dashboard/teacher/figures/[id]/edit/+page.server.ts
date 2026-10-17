/**
 * Modifier ou supprimer une figure géométrique (ADR 0027). Seul l'auteur y a
 * accès : la figure publique d'un autre est lisible, pas modifiable, et rend la
 * même 404 qu'une figure inexistante.
 */

import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { validateUuidParam } from '$lib/server/validation/params';
import { parseFigureFormData } from '$lib/server/validation/geometry-figures';
import {
	deleteGeometryFigure,
	FIGURE_NOT_FOUND_MESSAGE,
	GeometryFigureError,
	getOwnGeometryFigure,
	updateGeometryFigure
} from '$lib/server/geometry-figures';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user } = await requireRoles(locals, ['teacher', 'admin']);
	const id = validateUuidParam(params.id);

	try {
		const figure = await getOwnGeometryFigure(locals.supabase, id, user.id);
		if (!figure) throw error(404, FIGURE_NOT_FOUND_MESSAGE);
		return { figure };
	} catch (e) {
		if (e instanceof GeometryFigureError) throw error(e.status, e.message);
		throw e;
	}
};

export const actions: Actions = {
	save: async ({ request, params, locals }) => {
		await requireRoles(locals, ['teacher', 'admin']);
		const id = validateUuidParam(params.id);
		const validation = parseFigureFormData(await request.formData());
		if (!validation.success) {
			return fail(400, { message: validation.error.issues[0].message });
		}

		try {
			await updateGeometryFigure(locals.supabase, id, validation.data);
			return { success: true };
		} catch (e) {
			if (e instanceof GeometryFigureError) return fail(e.status, { message: e.message });
			throw e;
		}
	},

	delete: async ({ params, locals }) => {
		await requireRoles(locals, ['teacher', 'admin']);
		const id = validateUuidParam(params.id);

		try {
			await deleteGeometryFigure(locals.supabase, id);
			return { success: true };
		} catch (e) {
			if (e instanceof GeometryFigureError) return fail(e.status, { message: e.message });
			throw e;
		}
	}
};
