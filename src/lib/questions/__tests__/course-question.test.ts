/**
 * Questions de cours (Q110 b)
 * ===========================
 *
 * Marqueur d'intention `options.courseQuestion` : la question vérifie une
 * connaissance ou la compréhension du cours (définition, propriété, méthode).
 * Une carte de cours (`options.courseCard`) est TOUJOURS une question de cours.
 *
 * Le marqueur est porté par le modèle et recopié sur l'instance générée.
 */

import { describe, it, expect } from 'vitest';
import { isCourseQuestion, type QuestionTemplate } from '../types';
import { applyCourseQuestionOption, readCourseQuestionOption } from '../course-question';
import { optionsSchema, questionTemplateSchema } from '../template-schema';
import { generateInstance } from '../generator/instance-generator';
import { templateMarkdown } from '$lib/ubumark';

// ============================================================================
// FIXTURES
// ============================================================================

function question(overrides: Partial<QuestionTemplate> = {}): QuestionTemplate {
	return {
		id: 'definition',
		title: 'Définition du discriminant',
		status: 'draft',
		variations: [
			{
				statement: templateMarkdown('Le discriminant de $$ax^2+bx+c$$ vaut :'),
				choices: [
					{ content: templateMarkdown('$$b^2-4ac$$') },
					{ content: templateMarkdown('$$b^2+4ac$$') }
				],
				correctChoiceIndex: '0'
			}
		],
		grades: ['1_SPE'],
		theme: 'Algèbre',
		domain: 'Polynômes',
		level: 1,
		...overrides
	};
}

// ============================================================================
// isCourseQuestion
// ============================================================================

describe('isCourseQuestion', () => {
	it('options.courseQuestion === true → question de cours', () => {
		expect(isCourseQuestion({ options: { courseQuestion: true } })).toBe(true);
	});

	it('une carte de cours est toujours une question de cours', () => {
		expect(isCourseQuestion({ options: { courseCard: true } })).toBe(true);
	});

	it('sans marqueur → pas une question de cours', () => {
		expect(isCourseQuestion({ options: {} })).toBe(false);
		expect(isCourseQuestion({ options: undefined })).toBe(false);
		expect(isCourseQuestion({ options: null })).toBe(false);
		expect(isCourseQuestion({})).toBe(false);
	});

	it('courseQuestion: false explicite → pas une question de cours', () => {
		expect(isCourseQuestion({ options: { courseQuestion: false } })).toBe(false);
	});

	it('valeur non booléenne (jsonb mal formé) → pas une question de cours', () => {
		expect(isCourseQuestion({ options: { courseQuestion: 'true' } })).toBe(false);
		expect(isCourseQuestion({ options: { courseQuestion: 1 } })).toBe(false);
	});

	it("le marqueur est recopié sur l'instance générée", () => {
		const result = generateInstance(question({ options: { courseQuestion: true } }), 3);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(isCourseQuestion(result.instance)).toBe(true);
	});

	it('instance sans marqueur → pas une question de cours', () => {
		const result = generateInstance(question(), 3);
		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(isCourseQuestion(result.instance)).toBe(false);
	});
});

// ============================================================================
// SCHÉMAS ZOD
// ============================================================================

describe('schémas : options.courseQuestion', () => {
	it('le schéma strict du modèle accepte courseQuestion: true', () => {
		const { id: _id, ...rest } = question({ options: { courseQuestion: true } });
		const parsed = questionTemplateSchema.safeParse(rest);
		expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
	});

	it('le schéma des options (routes de modèles) accepte et garde courseQuestion', () => {
		const parsed = optionsSchema.safeParse({ courseQuestion: true });
		expect(parsed.success).toBe(true);
		if (!parsed.success) return;
		expect(parsed.data.courseQuestion).toBe(true);
	});

	it('une valeur non booléenne est refusée', () => {
		expect(optionsSchema.safeParse({ courseQuestion: 'oui' }).success).toBe(false);
		const { id: _id, ...rest } = question({ options: { courseQuestion: 'oui' as never } });
		expect(questionTemplateSchema.safeParse(rest).success).toBe(false);
	});
});

// ============================================================================
// ÉDITEUR : lecture / écriture du marqueur
// ============================================================================

describe("éditeur : lecture et écriture d'options.courseQuestion", () => {
	it('lecture : marqueur présent → case cochée', () => {
		expect(readCourseQuestionOption({ courseQuestion: true })).toBe(true);
	});

	it('lecture : marqueur absent → case décochée', () => {
		expect(readCourseQuestionOption(undefined)).toBe(false);
		expect(readCourseQuestionOption({})).toBe(false);
	});

	it('écriture : case cochée → options.courseQuestion = true', () => {
		const options: NonNullable<QuestionTemplate['options']> = {};
		applyCourseQuestionOption(options, { checked: true, questionType: 'multiple_choice' });
		expect(options).toEqual({ courseQuestion: true });
	});

	it("écriture : case décochée → aucune clé (l'option disparaît)", () => {
		const options: NonNullable<QuestionTemplate['options']> = {};
		applyCourseQuestionOption(options, { checked: false, questionType: 'fill_in_blanks' });
		expect(options).toEqual({});
	});

	it('écriture : carte de cours → question de cours forcée, même case décochée', () => {
		const options: NonNullable<QuestionTemplate['options']> = { courseCard: true };
		applyCourseQuestionOption(options, { checked: false, questionType: 'course_card' });
		expect(options).toEqual({ courseCard: true, courseQuestion: true });
		expect(isCourseQuestion({ options })).toBe(true);
	});
});
