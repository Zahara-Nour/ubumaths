/**
 * Accès à une ligne de fiche (`worksheet_exercises`) par les routes de la page d'édition
 * =====================================================================================
 *
 * La fiche doit exister et être celle du prof (ou de l'école de l'admin) ; la ligne doit être une
 * ligne de CETTE fiche. Renvoie la fiche (avec son état) et la ligne.
 *
 * @module server/worksheets/worksheet-line-access
 */

import { error } from '@sveltejs/kit';
import { uuidSchema } from '#lib/server/validation/common.ts';

export async function verifyWorksheetLineAccess(
	supabase: App.Locals['supabase'],
	worksheetId: string,
	lineId: string,
	userId: string,
	role: string,
	schoolId: string | null
) {
	if (!uuidSchema.safeParse(worksheetId).success) {
		throw error(400, 'Identifiant de fiche invalide');
	}
	if (!uuidSchema.safeParse(lineId).success) {
		throw error(400, 'Identifiant d’exercice invalide');
	}

	const { data: worksheet, error: worksheetError } = await supabase
		.from('worksheets')
		.select('id, created_by, school_id, status')
		.eq('id', worksheetId)
		.single();

	if (worksheetError || !worksheet) {
		throw error(404, 'Fiche introuvable');
	}

	if (role === 'teacher' && worksheet.created_by !== userId) {
		throw error(403, 'Accès réservé à l’auteur de la fiche');
	}

	if (role === 'admin' && schoolId && worksheet.school_id !== schoolId) {
		throw error(403, 'Cette fiche appartient à une autre école');
	}

	const { data: worksheetExercise, error: exerciseError } = await supabase
		.from('worksheet_exercises')
		.select('*')
		.eq('id', lineId)
		.eq('worksheet_id', worksheetId)
		.single();

	if (exerciseError || !worksheetExercise) {
		throw error(404, 'Exercice introuvable dans cette fiche');
	}

	return { worksheet, worksheetExercise };
}
