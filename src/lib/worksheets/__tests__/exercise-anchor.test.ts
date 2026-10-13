/**
 * L'ancre d'un exercice de fiche (décision D6 de David, 2026-10-13)
 * =================================================================
 *
 * Une notification de signalement et la page du prof pointent vers un
 * exercice précis d'une fiche. L'ancre est fondée sur l'identifiant de
 * l'exercice de fiche (`worksheet_exercises.id`), jamais sur son numéro : le
 * numéro change d'une copie à l'autre quand la fiche est mélangée.
 */
import { describe, it, expect } from 'vitest';
import {
	exerciseAnchorHash,
	exerciseAnchorId,
	worksheetExerciseIdFromHash
} from '../exercise-anchor';

const WE_ID = '550e8400-e29b-41d4-a716-446655440012';

describe('ancre d’un exercice de fiche', () => {
	it('fondée sur l’identifiant de l’exercice de fiche', () => {
		expect(exerciseAnchorId(WE_ID)).toBe(`exercice-${WE_ID}`);
		expect(exerciseAnchorHash(WE_ID)).toBe(`#exercice-${WE_ID}`);
	});

	it('relue depuis l’adresse : l’identifiant, sinon `null`', () => {
		expect(worksheetExerciseIdFromHash(`#exercice-${WE_ID}`)).toBe(WE_ID);
		expect(worksheetExerciseIdFromHash('')).toBeNull();
		expect(worksheetExerciseIdFromHash('#exercice-3')).toBeNull();
		expect(worksheetExerciseIdFromHash('#autre-chose')).toBeNull();
	});
});
