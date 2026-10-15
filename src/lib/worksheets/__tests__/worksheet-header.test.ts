/**
 * Le type de fiche décide de l'en-tête (ADR 0030, lot 1)
 *
 * Une seule fonction pure dit ce que l'en-tête imprime, d'après le type et les
 * options du type ; le PDF du prof et celui de l'élève la lisent tous deux.
 */
import { describe, it, expect } from 'vitest';
import { worksheetHeader, TYPE_OPTION_KEYS, configForType } from '../worksheet-header';

describe('worksheetHeader : le type décide', () => {
	it("fiche d'exercices : le titre seul, quelles que soient les options", () => {
		const header = worksheetHeader('worksheet', {
			show_points: true,
			calculator: 'forbidden',
			answers_on_sheet: true,
			due_date: '2026-11-12'
		});
		expect(header).toEqual({
			studentName: false,
			className: false,
			dateLine: false,
			dueDate: false,
			points: false,
			calculator: null,
			duration: false,
			answersOnSheet: false
		});
	});

	it("fiche d'exercices, option « Nom de l'élève » : le nom seul (ni classe, ni date)", () => {
		const header = worksheetHeader('worksheet', { show_student_name: true });
		expect(header.studentName).toBe(true);
		expect(header.className).toBe(false);
		expect(header.dateLine).toBe(false);
		expect(header.dueDate).toBe(false);
		expect(worksheetHeader('worksheet', {}).studentName).toBe(false);
	});

	it('évaluation écrite : nom, classe, date à remplir, calculatrice ; points et cadres en option', () => {
		expect(worksheetHeader('assessment', {})).toEqual({
			studentName: true,
			className: true,
			dateLine: true,
			dueDate: false,
			points: false,
			calculator: null,
			duration: false,
			answersOnSheet: false
		});
		const options = worksheetHeader('assessment', {
			show_points: true,
			calculator: 'allowed',
			answers_on_sheet: true
		});
		expect(options.points).toBe(true);
		expect(options.calculator).toBe('allowed');
		expect(options.answersOnSheet).toBe(true);
	});

	it('devoir maison : nom, classe, date de rendu ; ni points, ni calculatrice, ni date à remplir', () => {
		const header = worksheetHeader('homework', {
			show_points: true,
			calculator: 'allowed',
			answers_on_sheet: true,
			due_date: '2026-11-12'
		});
		expect(header).toEqual({
			studentName: true,
			className: true,
			dateLine: false,
			dueDate: true,
			points: false,
			calculator: null,
			duration: false,
			answersOnSheet: false
		});
	});

	it('examen blanc : points TOUJOURS, durée, calculatrice, cadres en option', () => {
		const header = worksheetHeader('exam', { show_points: false, calculator: 'forbidden' });
		expect(header).toEqual({
			studentName: true,
			className: true,
			dateLine: true,
			dueDate: false,
			points: true,
			calculator: 'forbidden',
			duration: true,
			answersOnSheet: false
		});
		expect(worksheetHeader('exam', { answers_on_sheet: true }).answersOnSheet).toBe(true);
	});

	it("type inconnu ou absent (ligne abîmée) : traité en fiche d'exercices", () => {
		expect(worksheetHeader('quiz' as never, { show_points: true })).toEqual(
			worksheetHeader('worksheet', {})
		);
		expect(worksheetHeader(undefined as never, {}).studentName).toBe(false);
	});

	it('les options proposées par type', () => {
		expect(TYPE_OPTION_KEYS).toEqual({
			worksheet: ['show_student_name'],
			assessment: ['show_points', 'calculator', 'answers_on_sheet'],
			homework: ['due_date'],
			exam: ['calculator', 'answers_on_sheet']
		});
	});
});

describe('configForType : seules les options du type partent', () => {
	it('évaluation écrite : ses options, pas la date de rendu ni le nom', () => {
		expect(
			configForType('assessment', {
				show_points: true,
				calculator: 'allowed',
				due_date: '2026-11-12',
				show_student_name: true
			})
		).toEqual({ show_points: true, calculator: 'allowed', shuffle_exercises: false });
	});

	it("fiche d'exercices : le nom de l'élève, et le mélange", () => {
		expect(
			configForType('worksheet', { show_student_name: true, shuffle_exercises: true })
		).toEqual({ show_student_name: true, shuffle_exercises: true });
	});

	it('placement des cadres : gardé avec « réponses sur le sujet », perdu ailleurs (lot 3)', () => {
		const config = { answers_on_sheet: true, answer_frames: 'exercise' as const };
		expect(configForType('exam', config)).toMatchObject(config);
		expect(configForType('assessment', config)).toMatchObject(config);
		expect(configForType('worksheet', config)).not.toHaveProperty('answer_frames');
		expect(configForType('homework', config)).not.toHaveProperty('answer_frames');
	});
});
