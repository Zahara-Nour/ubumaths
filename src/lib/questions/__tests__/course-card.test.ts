/**
 * Cartes de cours (#617)
 * ======================
 *
 * Une carte de cours est une question SANS case ni choix : recto = énoncé,
 * verso = correction. Elle est marquée explicitement (`options.courseCard`),
 * jamais inférée de l'absence de cases — sinon une question à trous cassée
 * deviendrait une carte en silence.
 */

import { describe, it, expect } from 'vitest';
import { getQuestionType, type QuestionTemplate } from '../types';
import { validateTemplate } from '../validators/template-validator';
import { generateInstance } from '../generator/instance-generator';
import { runAllTestSpecs, runTestSpec } from '../test-spec-runner';
import { questionTemplateSchema } from '../template-schema';
import { courseCardBack, courseCardFront, excludeCourseCards, isCourseCard } from '../course-card';
import { questionTypeSchema } from '$lib/server/validation/questions';
import { checkTemplate } from '$lib/migration/review/check-template';
import { toTemplateInsertRow } from '$lib/migration/review/template-insert-row';
import { templateMarkdown } from '$lib/ubumark';

// ============================================================================
// FIXTURES
// ============================================================================

function card(overrides: Partial<QuestionTemplate> = {}): QuestionTemplate {
	return {
		id: 'carte',
		title: 'Ensemble de définition',
		status: 'draft',
		options: { courseCard: true },
		variations: [
			{
				statement: templateMarkdown('Que fait-on en premier pour étudier $$f(x)={{a}}/x$$ ?'),
				variables: [{ name: 'a', expression: '{{random:2..9}}' }],
				correction: {
					steps: [templateMarkdown('On détermine son ensemble de définition ({{a}} ≠ 0 ici).')]
				}
			}
		],
		grades: ['2'],
		theme: 'Fonctions',
		domain: 'Généralités',
		level: 1,
		...overrides
	};
}

function blankQuestion(overrides: Partial<QuestionTemplate> = {}): QuestionTemplate {
	return {
		id: 'trous',
		title: 'Double',
		status: 'draft',
		variations: [
			{
				statement: templateMarkdown('Le double de 3 est $?$'),
				blanks: [{ expectedAnswer: '6' }]
			}
		],
		grades: ['6'],
		theme: 'Entiers',
		domain: 'Multiplier',
		level: 1,
		...overrides
	};
}

// ============================================================================
// TYPE
// ============================================================================

describe('type course_card', () => {
	it('lit le marqueur explicite options.courseCard', () => {
		expect(getQuestionType({ options: { courseCard: true } })).toBe('course_card');
		expect(getQuestionType(card())).toBe('course_card');
	});

	it("n'infère jamais une carte de l'absence de cases ou de choix", () => {
		expect(getQuestionType({})).toBe('fill_in_blanks');
		expect(getQuestionType({ options: { courseCard: false } })).toBe('fill_in_blanks');
		expect(getQuestionType({ options: {} })).toBe('fill_in_blanks');
		expect(getQuestionType({ options: null })).toBe('fill_in_blanks');
	});

	it('laisse inchangée l’inférence QCM', () => {
		expect(getQuestionType({ choices: [{}, {}] })).toBe('multiple_choice');
		expect(getQuestionType({ shared: { choices: [{}] } })).toBe('multiple_choice');
	});

	it('isCourseCard ne répond vrai qu’au booléen true', () => {
		expect(isCourseCard({ options: { courseCard: true } })).toBe(true);
		expect(isCourseCard({ options: { courseCard: 'true' } })).toBe(false);
		expect(isCourseCard({ options: undefined })).toBe(false);
		expect(isCourseCard({})).toBe(false);
	});

	it('Zod : la valeur course_card est acceptée, le marqueur aussi', () => {
		expect(questionTypeSchema.safeParse('course_card').success).toBe(true);
		const { id: _id, ...rest } = card();
		const parsed = questionTemplateSchema.safeParse(rest);
		expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
	});

	it('la ligne d’import écrit type = course_card', () => {
		expect(toTemplateInsertRow(card(), 'u').type).toBe('course_card');
		expect(toTemplateInsertRow(blankQuestion(), 'u').type).toBe('fill_in_blanks');
	});
});

// ============================================================================
// VALIDATION & GÉNÉRATION
// ============================================================================

describe('validation d’une carte', () => {
	it('accepte une carte sans case (recto + verso)', () => {
		expect(validateTemplate(card())).toEqual([]);
	});

	it('refuse une carte sans verso', () => {
		const sansVerso = card({
			variations: [{ statement: templateMarkdown('Recto') }]
		});
		expect(validateTemplate(sansVerso).join(' ')).toMatch(/course_card requires a correction/);
	});

	it('refuse une carte au verso vide', () => {
		const versoVide = card({
			variations: [
				{ statement: templateMarkdown('Recto'), correction: { steps: [templateMarkdown('  ')] } }
			]
		});
		expect(validateTemplate(versoVide).join(' ')).toMatch(/course_card requires a correction/);
	});

	it('refuse une carte qui porte des cases ou des choix', () => {
		const avecCase = card({
			variations: [
				{
					statement: templateMarkdown('Recto $?$'),
					blanks: [{ expectedAnswer: '1' }],
					correction: { steps: [templateMarkdown('Verso')] }
				}
			]
		});
		expect(validateTemplate(avecCase).join(' ')).toMatch(/course_card cannot have blanks/);
	});

	it('une question à trous sans case reste refusée (inchangé)', () => {
		const cassee = blankQuestion({ variations: [{ statement: templateMarkdown('Sans case') }] });
		expect(validateTemplate(cassee).join(' ')).toMatch(/fill_in_blanks requires blanks/);
	});

	it('génère une instance de type course_card, variables résolues', () => {
		const result = generateInstance(card(), 7);
		expect(result.success).toBe(true);
		if (!result.success) return;
		const { instance } = result;
		expect(getQuestionType(instance)).toBe('course_card');
		expect(instance.blanks).toBeUndefined();
		expect(instance.choices).toBeUndefined();
		// La forme LaTeX exacte appartient au moteur ; la variable est résolue
		expect(courseCardFront(instance)).toMatch(/^Que fait-on en premier/);
		expect(courseCardFront(instance)).not.toContain('{{');
		expect(courseCardFront(instance)).toMatch(/[2-9]/);
		expect(courseCardBack(instance)).toMatch(/^On détermine son ensemble de définition \(\d ≠ 0/);
	});
});

// ============================================================================
// VÉRIFICATION (specs, relecture)
// ============================================================================

describe('vérification d’une carte', () => {
	it('aucune spec exigée : le lanceur ne rend rien', () => {
		expect(runAllTestSpecs(card())).toEqual([]);
	});

	it('une spec posée sur une carte est une erreur explicite', () => {
		const result = runTestSpec(card(), {
			description: 'x',
			variables: { a: '3' },
			answers: ['1'],
			expected: { status: 'correct' }
		});
		expect(result.passed).toBe(false);
		expect(result.error).toMatch(/carte de cours/i);
	});

	it('checkTemplate : importable sans spec, 50 tirages analysés', () => {
		const report = checkTemplate(card());
		expect(report.reasons).toEqual([]);
		expect(report.passed).toBe(true);
		expect(report.generation.attempts).toBe(50);
	});

	it('checkTemplate : verso vide → non importable, raison en français', () => {
		const report = checkTemplate(
			card({
				variations: [
					{ statement: templateMarkdown('Recto'), correction: { steps: [templateMarkdown('')] } }
				]
			})
		);
		expect(report.passed).toBe(false);
		expect(report.reasons.join(' ')).toMatch(/erreur\(s\) de structure/);
	});

	it('checkTemplate : une question à trous sans spec reste refusée', () => {
		expect(checkTemplate(blankQuestion()).reasons).toContain('aucune spec de test');
	});
});

// ============================================================================
// TESTS NOTÉS
// ============================================================================

describe('exclusion des évaluations notées', () => {
	it('retire les cartes et garde le reste dans l’ordre', () => {
		const templates = [blankQuestion({ id: 'a' }), card({ id: 'b' }), blankQuestion({ id: 'c' })];
		expect(excludeCourseCards(templates).map((t) => t.id)).toEqual(['a', 'c']);
	});

	it('lit aussi une ligne brute de la base (options jsonb)', () => {
		const rows = [
			{ id: 'x', options: { courseCard: true } as unknown },
			{ id: 'y', options: null as unknown }
		];
		expect(excludeCourseCards(rows).map((r) => r.id)).toEqual(['y']);
	});
});
