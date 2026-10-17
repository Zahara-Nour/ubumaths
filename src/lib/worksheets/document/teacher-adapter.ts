/**
 * Document d'une fiche depuis la copie du prof (ADR 0028)
 *
 * La copie recalculée (`buildWorksheetCopy`, ou une instance stockée) porte
 * toutes les corrections : le prof les voit toutes.
 *
 * @module worksheets/document/teacher-adapter
 */

import {
	localizedText,
	worksheetLocale,
	type InstanceData,
	type WorksheetConfig,
	type WorksheetRow
} from '$lib/types/worksheets';
import { worksheetHeader } from '../worksheet-header';
import type { WorksheetDocument } from './types';
import { placeExercises, writtenOrNull } from './numbering';
import { estimateAnswerFrames } from './answer-frames';
import { resolveAnswerFrames } from './answer-frame-lines';

export interface TeacherCopyInput {
	worksheet: WorksheetRow;
	instance: InstanceData;
	config: WorksheetConfig;
}

export function documentFromTeacherCopy({
	worksheet,
	instance,
	config
}: TeacherCopyInput): WorksheetDocument {
	const locale = worksheetLocale(config);
	// Le type décide des points et des cadres (ADR 0030), comme pour l'élève
	const header = worksheetHeader(worksheet.type, config);
	const frameMode = config.answer_frames ?? 'question';
	const sections = [...(instance.sections ?? [])].sort((a, b) => a.position - b.position);

	// Ordre tiré au sort : il prime sur `position`
	const ordered = instance.exercise_order
		? instance.exercise_order.map((index) => instance.exercises[index])
		: instance.exercises;

	return {
		title: localizedText(worksheet.title, worksheet.translations, 'title', locale) ?? '',
		type: worksheet.type,
		locale,
		description: worksheet.description ?? null,
		assignment: null,
		exercises: placeExercises(ordered, sections, 'numeric', true).map(
			({ exercise, number, sectionId }) => ({
				number,
				sectionId,
				title: exercise.title ?? null,
				statement: exercise.statement,
				correction: {
					solution: writtenOrNull(exercise.solution),
					answers: writtenOrNull(exercise.answers)
				},
				points: exercise.points ?? null,
				instructions: exercise.custom_instructions ?? null,
				// La copie du prof ne porte pas la marque ★
				essential: false,
				genericFunctions: exercise.generic_functions ?? null,
				capitalPairs: exercise.capital_pairs,
				// Cadres de réponse : réglage du prof, sinon estimés d'après le corrigé
				// de cette copie
				answerFrames: header.answersOnSheet
					? resolveAnswerFrames(
							estimateAnswerFrames(exercise.statement, writtenOrNull(exercise.solution)),
							exercise.answer_frame_lines,
							frameMode
						)
					: null
			})
		),
		sections: sections.map(({ id, title, instructions }) => ({ id, title, instructions })),
		display: {
			showPoints: header.points,
			answersOnSheet: header.answersOnSheet,
			answerFrames: frameMode
		}
	};
}
