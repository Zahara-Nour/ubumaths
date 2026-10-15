/**
 * Type de fiche et options du type (ADR 0030, lot 1) : ce que l'API accepte
 */
import { describe, it, expect } from 'vitest';
import {
	createWorksheetSchema,
	updateWorksheetSchema,
	studentWorksheetDetailResponseSchema
} from '../worksheets';

const base = { title: 'Équations' };

describe('type de fiche', () => {
	it.each(['worksheet', 'assessment', 'homework', 'exam'])('accepte %s', (type) => {
		expect(createWorksheetSchema.safeParse({ ...base, type }).success).toBe(true);
		expect(updateWorksheetSchema.safeParse({ type }).success).toBe(true);
	});

	it('refuse « quiz », retiré', () => {
		expect(createWorksheetSchema.safeParse({ ...base, type: 'quiz' }).success).toBe(false);
		expect(updateWorksheetSchema.safeParse({ type: 'quiz' }).success).toBe(false);
	});
});

describe('options du type dans la config', () => {
	it('accepte calculatrice, réponses sur le sujet et date de rendu valides', () => {
		const config = { calculator: 'forbidden', answers_on_sheet: true, due_date: '2026-11-12' };
		const created = createWorksheetSchema.parse({ ...base, type: 'assessment', config });
		expect(created.config).toMatchObject(config);
		const updated = updateWorksheetSchema.parse({ config: { calculator: 'allowed' } });
		expect(updated.config?.calculator).toBe('allowed');
	});

	it.each([
		{ calculator: 'parfois' },
		{ calculator: true },
		{ answers_on_sheet: 'oui' },
		{ due_date: '12/11/2026' },
		{ due_date: '2026-11-12T10:00:00Z' },
		{ due_date: '2026-13-40' },
		{ due_date: '' }
	])('refuse %o', (config) => {
		expect(createWorksheetSchema.safeParse({ ...base, config }).success).toBe(false);
		expect(updateWorksheetSchema.safeParse({ config }).success).toBe(false);
	});

	it('garde les anciennes clés d’affichage (non lues) : les retirer de la base est une étape à part', () => {
		const parsed = updateWorksheetSchema.parse({
			config: { show_title: false, numbering_style: 'roman', correction_detail: 'concise' }
		});
		expect(parsed.config).toMatchObject({
			show_title: false,
			numbering_style: 'roman',
			correction_detail: 'concise'
		});
	});
});

describe('vue de l’élève : les options du type traversent la réponse', () => {
	it('calculatrice, réponses sur le sujet, date de rendu et points gardés', () => {
		const view = studentWorksheetDetailResponseSchema.parse({
			assignment_id: '00000000-0000-4000-8000-000000000001',
			worksheet_id: '00000000-0000-4000-8000-000000000002',
			title: 'Équations',
			description: null,
			type: 'exam',
			instructions: null,
			available_from: '2026-10-15T08:00:00Z',
			closes_at: null,
			show_corrections: false,
			class_name: null,
			read_only: false,
			exercises: [],
			sections: [],
			show_points: true,
			calculator: 'forbidden',
			answers_on_sheet: true,
			due_date: '2026-11-12'
		});
		expect(view).toMatchObject({
			show_points: true,
			calculator: 'forbidden',
			answers_on_sheet: true,
			due_date: '2026-11-12'
		});
	});
});

// Lot 3 : cadres après chaque question (défaut) ou après l'exercice
describe('cadres de réponse : `answer_frames`', () => {
	it.each(['question', 'exercise'])('accepte %s', (answer_frames) => {
		const config = { answers_on_sheet: true, answer_frames };
		expect(createWorksheetSchema.parse({ ...base, type: 'exam', config }).config).toMatchObject(
			config
		);
		expect(updateWorksheetSchema.parse({ config }).config).toMatchObject(config);
	});

	it.each(['page', 'Question', '', true, 1, null])('refuse %o', (answer_frames) => {
		const config = { answers_on_sheet: true, answer_frames };
		expect(createWorksheetSchema.safeParse({ ...base, config }).success).toBe(false);
		expect(updateWorksheetSchema.safeParse({ config }).success).toBe(false);
	});

	it('la vue de l’élève garde le mode et les lignes imprimées par exercice', () => {
		const exercise = {
			id: '00000000-0000-4000-8000-000000000003',
			exercise_id: '00000000-0000-4000-8000-000000000004',
			title: null,
			position: 1,
			points: null,
			custom_instructions: null,
			statement: '1. A',
			correction: null,
			correction_visible: false,
			section_id: null,
			printed_frame_lines: { questions: [0, 3, 40] }
		};
		const view = studentWorksheetDetailResponseSchema.parse({
			assignment_id: '00000000-0000-4000-8000-000000000001',
			worksheet_id: '00000000-0000-4000-8000-000000000002',
			title: 'Équations',
			description: null,
			type: 'exam',
			instructions: null,
			available_from: '2026-10-15T08:00:00Z',
			closes_at: null,
			show_corrections: false,
			class_name: null,
			read_only: false,
			exercises: [exercise],
			sections: [],
			answers_on_sheet: true,
			answer_frames: 'exercise'
		});
		expect(view.answer_frames).toBe('exercise');
		expect(view.exercises[0].printed_frame_lines).toEqual({ questions: [0, 3, 40] });
		// Hors bornes, non entier, `null` (déjà résolu : jamais « auto »), trop de
		// questions, clé inconnue
		for (const printed of [
			{ questions: [41] },
			{ questions: [-1] },
			{ questions: [2.5] },
			{ questions: [null] },
			{ exercise: 41 },
			{ questions: Array(201).fill(3) },
			{ exercise: 3, exercise_cm: 7 }
		]) {
			const bad = { ...exercise, printed_frame_lines: printed };
			expect(
				studentWorksheetDetailResponseSchema.safeParse({ ...view, exercises: [bad] }).success
			).toBe(false);
		}
	});
});
