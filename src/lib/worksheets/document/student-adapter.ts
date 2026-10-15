/**
 * Document d'une fiche depuis la vue de l'élève (ADR 0028)
 *
 * Le serveur a déjà filtré les corrections. Garde en plus : une correction
 * dont `correction_visible` est faux n'entre jamais dans le document, même si
 * le texte arrivait par erreur.
 *
 * @module worksheets/document/student-adapter
 */

import { isContentLocale, type ContentLocale } from '$lib/types/locale';
import type { StudentWorksheetView } from '$lib/types/worksheets';
import { worksheetHeader } from '../worksheet-header';
import type { WorksheetDocument } from './types';
import { placeExercises, writtenOrNull } from './numbering';

export function documentFromStudentView(view: StudentWorksheetView): WorksheetDocument {
	// Validée plutôt que supposée : la valeur traverse une réponse d'API
	const locale: ContentLocale = isContentLocale(view.language) ? view.language : 'fr';
	// Le type décide des points et des cadres (ADR 0030), comme pour le prof
	const header = worksheetHeader(view.type, view);
	const sections = [...(view.sections ?? [])].sort((a, b) => a.position - b.position);

	return {
		title: view.title,
		type: view.type,
		locale,
		description: view.description,
		assignment: { instructions: view.instructions },
		// Ordre tiré (« mélanger les exercices ») : celui de la copie, déjà appliqué
		// par le serveur ; sinon, ordre des positions
		exercises: placeExercises(
			view.exercises ?? [],
			sections,
			'numeric',
			view.shuffled === true
		).map(({ exercise, number, sectionId }) => ({
			number,
			sectionId,
			title: exercise.title ?? null,
			statement: exercise.statement,
			correction: exercise.correction_visible
				? {
						solution: writtenOrNull(exercise.correction),
						answers: writtenOrNull(exercise.answers)
					}
				: null,
			points: exercise.points ?? null,
			instructions: exercise.custom_instructions ?? null,
			essential: exercise.is_essential ?? false,
			genericFunctions: exercise.generic_functions ?? null,
			capitalPairs: exercise.capital_pairs,
			// Estimées par le serveur sur la copie de l'élève, correction masquée comprise
			answerFrameEstimate: exercise.answer_frame_estimate ?? null
		})),
		sections: sections.map(({ id, title, instructions }) => ({ id, title, instructions })),
		display: {
			showPoints: header.points,
			answersOnSheet: header.answersOnSheet,
			answerFrames: view.answer_frames ?? 'question'
		}
	};
}
