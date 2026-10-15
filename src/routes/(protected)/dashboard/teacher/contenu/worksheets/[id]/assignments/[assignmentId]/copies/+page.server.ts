/**
 * Copies par élève d'une affectation (ADR 0030, lot 5)
 * ====================================================
 *
 * Les élèves dont le prof imprime une copie à leur nom : la liste de
 * l'affectation (`GET …/students` : membres actifs des classes visées et
 * élèves visés nommément), réservée au prof créateur et à l'admin — son refus
 * est celui de la page. Les copies elles-mêmes sont demandées par la page à
 * l'aperçu (`…/preview?studentId=`) ; le PDF est fabriqué dans le navigateur.
 */

import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { sortCopyRecipients } from '$lib/worksheets/student-copies';
import type { PageServerLoad } from './$types';

const paramsSchema = z.object({
	id: z.string().uuid('Identifiant de fiche invalide'),
	assignmentId: z.string().uuid('Identifiant d’affectation invalide')
});

/** Ce que la page lit de la liste de l'affectation ; le reste est ignoré */
const studentsResponseSchema = z.object({
	students: z
		.array(
			z.object({
				id: z.string().uuid(),
				first_name: z.string().nullable(),
				last_name: z.string().nullable(),
				class_name: z.string().nullable()
			})
		)
		.max(2000)
});

export const load: PageServerLoad = async ({ params, locals, fetch }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw error(401, 'Connexion requise');
	}

	const validParams = paramsSchema.safeParse(params);
	if (!validParams.success) {
		throw error(400, validParams.error.issues[0].message);
	}
	const { id: worksheetId, assignmentId } = validParams.data;

	const response = await fetch(`/api/worksheets/assignments/${assignmentId}/students`);
	if (!response.ok) {
		if (response.status === 403 || response.status === 404) {
			throw error(response.status, 'Affectation introuvable ou accès refusé');
		}
		throw error(500, 'Impossible de charger les élèves de l’affectation');
	}

	const body = studentsResponseSchema.safeParse(await response.json().catch(() => null));
	if (!body.success) {
		throw error(500, 'Impossible de charger les élèves de l’affectation');
	}

	return {
		worksheetId,
		assignmentId,
		students: sortCopyRecipients(body.data.students)
	};
};
