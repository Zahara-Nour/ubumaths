/**
 * Zod : lignes des cadres de réponse d'un exercice de fiche (ADR 0030, lot 4)
 *
 * Mêmes bornes que les contraintes CHECK de la colonne : entiers de 0 à 25,
 * `null` = auto, au plus 200 questions, aucune autre clé.
 */
import { describe, expect, it } from 'vitest';
import {
	answerFrameLinesSchema,
	updateWorksheetExerciseSchema,
	worksheetExerciseResponseSchema
} from '../worksheets';

describe('answer_frame_lines en écriture', () => {
	it('formes acceptées', () => {
		for (const value of [
			null,
			{},
			{ questions: [null, 0, 25] },
			{ exercise: 25 },
			{ exercise: 12 },
			{ questions: [], exercise: null }
		]) {
			expect(answerFrameLinesSchema.safeParse(value).success, JSON.stringify(value)).toBe(true);
		}
	});

	it('valeurs refusées : hors bornes, non entières, texte, trop de questions', () => {
		for (const value of [
			{ questions: [26] },
			{ questions: [40] },
			{ questions: [-1] },
			{ questions: [2.5] },
			{ questions: ['3'] },
			{ exercise: 26 },
			{ exercise: 1.5 },
			{ questions: Array(201).fill(1) },
			[1, 2],
			'3'
		]) {
			expect(answerFrameLinesSchema.safeParse(value).success, JSON.stringify(value)).toBe(false);
		}
	});

	it('`.strict()` : une clé inconnue est refusée, pas retirée en silence', () => {
		expect(answerFrameLinesSchema.safeParse({ questions: [1], secret: 'x' }).success).toBe(false);
	});

	it('la mise à jour d’un exercice de fiche l’accepte', () => {
		const parsed = updateWorksheetExerciseSchema.safeParse({
			answer_frame_lines: { questions: [0, 12] }
		});
		expect(parsed.success).toBe(true);
		expect(parsed.data?.answer_frame_lines).toEqual({ questions: [0, 12] });
		expect(
			updateWorksheetExerciseSchema.safeParse({ answer_frame_lines: { questions: [99] } }).success
		).toBe(false);
	});

	it('mise à jour `.strict()` : une clé mal orthographiée est refusée, pas ignorée', () => {
		expect(
			updateWorksheetExerciseSchema.safeParse({ answer_frame_line: { questions: [1] } }).success
		).toBe(false);
	});

	it('la réponse la garde (le schéma de réponse retire les clés non déclarées)', () => {
		const row = {
			id: '550e8400-e29b-41d4-a716-446655440001',
			worksheet_id: '550e8400-e29b-41d4-a716-446655440002',
			exercise_id: '550e8400-e29b-41d4-a716-446655440003',
			section_id: null,
			position: 1,
			points: null,
			variant_mode: 'none',
			variant_config: {},
			custom_instructions: null,
			is_essential: false,
			answer_frame_lines: { questions: [0, null] },
			created_at: '2026-10-15T10:00:00Z',
			updated_at: '2026-10-15T10:00:00Z'
		};
		const parsed = worksheetExerciseResponseSchema.parse(row);
		expect(parsed.answer_frame_lines).toEqual({ questions: [0, null] });

		// Plafond partagé : 25 lignes passent, 26 non (même borne que la CHECK)
		const at = (lines: unknown) =>
			worksheetExerciseResponseSchema.safeParse({ ...row, answer_frame_lines: lines }).success;
		expect(at({ questions: [25], exercise: 25 })).toBe(true);
		expect(at({ questions: [26] })).toBe(false);
		expect(at({ exercise: 26 })).toBe(false);
	});

	it('le PUT refuse 26 lignes, accepte 25', () => {
		const put = (lines: unknown) =>
			updateWorksheetExerciseSchema.safeParse({ answer_frame_lines: lines }).success;
		expect(put({ questions: [25, 0] })).toBe(true);
		expect(put({ questions: [26] })).toBe(false);
		expect(put({ exercise: 26 })).toBe(false);
	});
});
