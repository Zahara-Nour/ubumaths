/**
 * Page publique d'une figure géométrique (ADR 0027), lisible sans compte.
 *
 * Une figure privée et une figure inexistante rendent LA MÊME 404 : la page ne
 * doit pas révéler qu'un identifiant existe. Un identifiant mal formé aussi.
 * Pas de tags : `anon` ne lit pas `resource_tags`.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { figureIdSchema } from '$lib/server/validation/geometry-figures';
import {
	FIGURE_NOT_FOUND_MESSAGE,
	GeometryFigureError,
	getPublicGeometryFigure
} from '$lib/server/geometry-figures';

export const load: PageServerLoad = async ({ params, locals }) => {
	const id = figureIdSchema.safeParse(params.id);
	if (!id.success) throw error(404, FIGURE_NOT_FOUND_MESSAGE);

	try {
		const figure = await getPublicGeometryFigure(locals.supabase, id.data);
		if (!figure) throw error(404, FIGURE_NOT_FOUND_MESSAGE);
		return { figure };
	} catch (e) {
		if (e instanceof GeometryFigureError) throw error(e.status, e.message);
		throw e;
	}
};
