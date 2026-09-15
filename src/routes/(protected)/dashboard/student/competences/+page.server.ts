/**
 * Ancienne URL « Mes compétences mathématiques » — conservée en redirection.
 *
 * La liste vit désormais dans l'onglet « Ma façon de faire des maths » de
 * `/dashboard/student/progression`.
 *
 * La route de détail `/dashboard/student/competences/[code]` n'est PAS
 * concernée : elle reste à son adresse.
 */

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	redirect(308, '/dashboard/student/progression?onglet=competences');
};
