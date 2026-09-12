/**
 * Composer une classe depuis l'année précédente — chargement
 * ===========================================================
 *
 * On ne charge ici que les destinations possibles. Les candidats dépendent de
 * la destination choisie et sont lus à la demande, par
 * `/api/admin/class-composition-source`.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/middleware/auth';

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase } = await requireAdmin(locals);

	// Les destinations : classes actives, rattachées à une année non terminée.
	// Le filtre de date se fait ici plutôt qu'en SQL pour rester lisible ; le
	// parc compte une dizaine de classes.
	const { data: classes, error: classesError } = await supabase
		.from('classes')
		.select(
			'id, name, is_active, school:schools(id, name), school_year:school_years(id, name, end_date)'
		)
		.eq('is_active', true)
		.order('name');

	if (classesError) {
		console.error('Lecture des classes impossible :', classesError);
		throw error(500, 'Impossible de charger les classes');
	}

	const aujourdHui = new Date().toISOString().slice(0, 10);

	// PostgREST type une jointure « vers un » en tableau quand il ne peut pas
	// prouver l'unicité ; à l'exécution c'est un objet. L'idiome du dépôt.
	const versUn = <T>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

	const destinations = (classes ?? [])
		.map((c) => ({
			id: c.id,
			name: c.name,
			ecole: versUn(c.school),
			annee: versUn(c.school_year)
		}))
		.filter((c) => c.annee !== null && c.annee.end_date >= aujourdHui)
		.map((c) => ({
			id: c.id,
			name: c.name,
			school_name: c.ecole?.name ?? null,
			school_year_name: c.annee?.name ?? ''
		}));

	return { destinations };
};
