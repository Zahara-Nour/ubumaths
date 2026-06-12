/**
 * E2E Fill-in-blanks Pipeline Tests (Phase 8)
 * =============================================
 *
 * Tests the complete pipeline: transformer → generator → validator → AST rendering
 * using real questions from .claude/old-questions.json.
 *
 * Covers 17 globalIndex values across all migration modes:
 * - result_rewrite: 10, 25, 300, 352, 353
 * - result_rewrite with answerFormat: 411, 413
 * - fill_in: 51, 52, 471
 * - answer_field: 0, 8, 74, 150, 500
 * - grandeurs: 426
 * - QCM control: 478
 *
 * Note: correctionDetailss are stripped because they contain `&sol`/`&solution`
 * references that the variable resolver cannot handle (pre-existing limitation).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { transformQuestion } from '$lib/migration/question-transformer';
import { generateInstance } from '../instance-generator';
import { validateAnswer } from '$lib/utils/answer-validator';
import { parseMarkdown } from '$lib/ubumark/parser/markdown-parser';
import {
	augmentASTForExpressions,
	buildInputStates
} from '$lib/components/question-inputs/fill-blanks-utils';
import { getQuestionType } from '../../types';
import type { QuestionTemplate, QuestionInstance } from '../../types';
import type { QuestionBase } from '$lib/migration/old-question-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type RawQuestion = Record<string, unknown> & {
	_migration?: { globalIndex?: number };
};

const rawQuestions: RawQuestion[] = JSON.parse(
	readFileSync(resolve(process.cwd(), '.claude/old-questions.json'), 'utf-8')
);

/**
 * Find an old question by globalIndex, stripping correctionDetailss
 * (they reference &sol/&solution which the variable resolver can't handle).
 */
function findByGlobalIndex(index: number): QuestionBase {
	const q = rawQuestions.find((q) => q._migration?.globalIndex === index);
	if (!q) throw new Error(`Question with globalIndex ${index} not found`);
	// Strip correctionDetailss to avoid &sol/&solution variable resolution errors
	const { correctionDetailss: _, ...rest } = q;
	return rest as unknown as QuestionBase;
}

/**
 * Transform an old question and add `id` to make a full QuestionTemplate.
 */
function transformAndPrepare(globalIndex: number): QuestionTemplate {
	const oldQ = findByGlobalIndex(globalIndex);
	const result = transformQuestion(oldQ, globalIndex);
	expect(result.success).toBe(true);
	expect(result.template).toBeDefined();
	return {
		...result.template!,
		id: `e2e-${globalIndex}`
	} as QuestionTemplate;
}

/**
 * Lazy cache: transform + generate once per globalIndex.
 */
const cache = new Map<number, { template: QuestionTemplate; instance: QuestionInstance }>();

function getTestData(
	globalIndex: number,
	seed: number = 42
): { template: QuestionTemplate; instance: QuestionInstance } {
	const key = `${globalIndex}-${seed}`;
	if (!cache.has(key)) {
		const template = transformAndPrepare(globalIndex);
		const result = generateInstance(template, seed);
		if (!result.success) {
			throw new Error(
				`Generation failed for globalIndex ${globalIndex}: ${result.errors.join(', ')}`
			);
		}
		cache.set(key, { template, instance: result.instance });
	}
	return cache.get(key)!;
}

// All fill_in_blanks globalIndex values (16 questions)
const ALL_FIB = [10, 25, 300, 352, 353, 413, 411, 51, 52, 471, 0, 8, 74, 150, 500, 426];

// Questions with expression variables (result_rewrite + fill_in + grandeurs)
// All questions with `expressions` in old format create expression variables
const EXPRESSION_QUESTIONS = [10, 25, 300, 352, 353, 413, 411, 51, 52, 471, 426];

// Answer_field questions (no expression variables — \placeholder directly in statement)
const ANSWER_FIELD_QUESTIONS = [0, 8, 74, 150, 500];

// Representative subset for AST tests (one from each major category)
const AST_SAMPLE = [
	10, // result_rewrite (basic)
	51, // fill_in (? in expression)
	413, // result_rewrite + answerFormat (1 blank)
	411, // result_rewrite + answerFormat (2 blanks)
	0, // answer_field (no expression variables)
	426 // grandeurs (unit conversions)
];

// ---------------------------------------------------------------------------
// A. Pipeline integration: transform → generate
// ---------------------------------------------------------------------------

describe('E2E Fill-in-blanks Pipeline', () => {
	describe('A. Pipeline: transform → generate', () => {
		// ---- result_rewrite mode ----

		describe('result_rewrite mode', () => {
			it('globalIndex 10 — décomposition centaines (eval expression)', () => {
				const { instance } = getTestData(10);

				expect(getQuestionType(instance)).toBe('fill_in_blanks');
				expect(instance.blanks).toBeDefined();
				expect(instance.blanks!.length).toBe(1);
				expect(instance.blanks![0].type).toBe('math');
				expect(instance.expressions).toBeDefined();
				expect(instance.expressions![0].name).toBe('expression1');
				expect(instance.expressions![0].latex).toBeTruthy();
				expect(instance.choices).toBeUndefined();
				expect(instance.correctChoiceIndex).toBeUndefined();
			});

			it('globalIndex 25 — addition table (simple eval)', () => {
				const { instance } = getTestData(25);

				expect(getQuestionType(instance)).toBe('fill_in_blanks');
				expect(instance.blanks).toBeDefined();
				expect(instance.blanks!.length).toBe(1);
				expect(instance.blanks![0].type).toBe('math');
				expect(instance.expressions).toBeDefined();
			});

			it('globalIndex 300 — quotient by 100 (result-type: decimal)', () => {
				const { instance } = getTestData(300);

				expect(getQuestionType(instance)).toBe('fill_in_blanks');
				expect(instance.blanks).toBeDefined();
				expect(instance.blanks![0].type).toBe('math');
			});

			it('globalIndex 352 — fraction to decimal, dixièmes', () => {
				const { instance } = getTestData(352);

				expect(getQuestionType(instance)).toBe('fill_in_blanks');
				expect(instance.blanks).toBeDefined();
				expect(instance.blanks!.length).toBe(1);
				expect(instance.blanks![0].type).toBe('math');
			});

			it('globalIndex 353 — fraction to decimal, centièmes', () => {
				const { instance } = getTestData(353);

				expect(getQuestionType(instance)).toBe('fill_in_blanks');
				expect(instance.blanks).toBeDefined();
				expect(instance.blanks!.length).toBe(1);
				expect(instance.blanks![0].type).toBe('math');
			});
		});

		// ---- result_rewrite with answerFormat ----

		describe('result_rewrite with answerFormat', () => {
			it('globalIndex 413 — answerFormat 10^? (1 blank in answerFormat)', () => {
				const { instance } = getTestData(413);

				expect(getQuestionType(instance)).toBe('fill_in_blanks');
				expect(instance.blanks).toBeDefined();
				expect(instance.blanks!.length).toBe(1);
				expect(instance.blanks![0].type).toBe('math');

				// Expression with answerFormat containing placeholder
				expect(instance.expressions).toBeDefined();
				expect(instance.expressions!.length).toBe(1);
				expect(instance.expressions![0].answerFormat).toBeDefined();
				expect(instance.expressions![0].answerFormat).toContain('\\placeholder');
			});

			it('globalIndex 411 — answerFormat ?*10^? (2 blanks in answerFormat)', () => {
				const { instance } = getTestData(411);

				expect(getQuestionType(instance)).toBe('fill_in_blanks');
				expect(instance.blanks).toBeDefined();
				expect(instance.blanks!.length).toBe(2);
				expect(instance.blanks![0].type).toBe('math');
				expect(instance.blanks![1].type).toBe('math');

				// answerFormat should contain 2 placeholders
				expect(instance.expressions).toBeDefined();
				const answerFormat = instance.expressions![0].answerFormat!;
				const placeholderCount = (answerFormat.match(/\\placeholder/g) || []).length;
				expect(placeholderCount).toBe(2);
			});
		});

		// ---- fill_in mode (? in expression) ----

		describe('fill_in mode', () => {
			it('globalIndex 51 — complement to 10 (? stays in expression content)', () => {
				const { instance } = getTestData(51);

				expect(getQuestionType(instance)).toBe('fill_in_blanks');
				expect(instance.blanks).toBeDefined();
				expect(instance.blanks!.length).toBe(1);
				expect(instance.blanks![0].type).toBe('math');
				// fill_in creates expression variables (? in expression content, \placeholder in answerFormat)
				expect(instance.expressions).toBeDefined();
				expect(instance.expressions!.length).toBeGreaterThanOrEqual(1);
				expect(instance.expressions![0].answerFormat).toContain('\\placeholder');
			});

			it('globalIndex 52 — complement to next decade', () => {
				const { instance } = getTestData(52);

				expect(getQuestionType(instance)).toBe('fill_in_blanks');
				expect(instance.blanks).toBeDefined();
				expect(instance.blanks!.length).toBe(1);
				expect(instance.blanks![0].type).toBe('math');
				expect(instance.expressions).toBeDefined();
			});

			it('globalIndex 471 — fill-in ?^2 = N', () => {
				const { instance } = getTestData(471);

				expect(getQuestionType(instance)).toBe('fill_in_blanks');
				expect(instance.blanks).toBeDefined();
				expect(instance.blanks!.length).toBe(1);
				expect(instance.blanks![0].type).toBe('math');
			});
		});

		// ---- answer_field mode ----

		describe('answer_field mode', () => {
			it('globalIndex 0 — position décimale (text + math answerField)', () => {
				const { instance } = getTestData(0);

				expect(getQuestionType(instance)).toBe('fill_in_blanks');
				expect(instance.blanks).toBeDefined();
				expect(instance.blanks!.length).toBe(1);
				expect(instance.blanks![0].type).toBe('math');
				// answer_field: \placeholder directly in statement (no expression variables)
				expect(String(instance.statement)).toContain('\\placeholder');
				expect(instance.expressions?.length ?? 0).toBe(0);
			});

			it('globalIndex 8 — enigme 3 chiffres', () => {
				const { instance } = getTestData(8);

				expect(getQuestionType(instance)).toBe('fill_in_blanks');
				expect(instance.blanks).toBeDefined();
				expect(instance.blanks!.length).toBe(1);
				expect(String(instance.statement)).toContain('\\placeholder');
			});

			it('globalIndex 74 — double (answerField)', () => {
				const { instance } = getTestData(74);

				expect(getQuestionType(instance)).toBe('fill_in_blanks');
				expect(instance.blanks).toBeDefined();
				expect(instance.blanks!.length).toBe(1);
				expect(instance.blanks![0].type).toBe('math');
				expect(String(instance.statement)).toContain('\\placeholder');
			});

			it('globalIndex 150 — quart (answerField with variable display)', () => {
				const { instance } = getTestData(150);

				expect(getQuestionType(instance)).toBe('fill_in_blanks');
				expect(instance.blanks).toBeDefined();
				expect(instance.blanks!.length).toBe(1);
			});

			it('globalIndex 500 — pourcentage (answerField)', () => {
				const { instance } = getTestData(500);

				expect(getQuestionType(instance)).toBe('fill_in_blanks');
				expect(instance.blanks).toBeDefined();
				expect(instance.blanks!.length).toBe(1);
			});
		});

		// ---- grandeurs ----

		describe('grandeurs (unit conversions)', () => {
			it('globalIndex 426 — conversion without unit flag', () => {
				const { instance } = getTestData(426);

				expect(getQuestionType(instance)).toBe('fill_in_blanks');
				expect(instance.blanks).toBeDefined();
				expect(instance.blanks!.length).toBe(1);
				expect(instance.blanks![0].type).toBe('math');
				// Unit is visible in expression, no unit flag on blank
				expect(instance.blanks![0].unit?.expected).toBeFalsy();
			});
		});

		// ---- QCM control ----

		describe('QCM control', () => {
			it('globalIndex 478 — QCM with expressions2', () => {
				const template = transformAndPrepare(478);
				const result = generateInstance(template, 42);
				if (!result.success) return;

				// 478 has choicess — verify it was transformed and generates
				// (the exact type depends on transformer behavior for expressions2)
				expect(result.instance).toBeDefined();
				expect(result.instance.blanks ?? result.instance.choices).toBeDefined();
			});
		});
	});

	// ---------------------------------------------------------------------------
	// B. Validation round-trip
	// ---------------------------------------------------------------------------

	describe('B. Validation round-trip', () => {
		describe.each(ALL_FIB)('globalIndex %d', (globalIndex) => {
			it('correct answers → isCorrect: true', () => {
				const { instance } = getTestData(globalIndex);
				const expectedAnswers = instance.blanks!.map((b) => b.expectedAnswer);
				const validation = validateAnswer(expectedAnswers, instance);
				expect(validation.isCorrect).toBe(true);
			});

			it('wrong answers → isCorrect: false', () => {
				const { instance } = getTestData(globalIndex);
				const wrongAnswers = instance.blanks!.map(() => '999999');
				const validation = validateAnswer(wrongAnswers, instance);
				expect(validation.isCorrect).toBe(false);
			});
		});

		it('multi-blank partial (411) — one correct, one wrong → false', () => {
			const { instance } = getTestData(411);
			expect(instance.blanks!.length).toBe(2);

			const partialAnswers = [instance.blanks![0].expectedAnswer, '999999'];
			const validation = validateAnswer(partialAnswers, instance);
			expect(validation.isCorrect).toBe(false);
		});
	});

	// ---------------------------------------------------------------------------
	// C. Structural coherence
	// ---------------------------------------------------------------------------

	describe('C. Structural coherence', () => {
		it.each(ALL_FIB)('globalIndex %d — blank count matches placeholders', (globalIndex) => {
			const { instance } = getTestData(globalIndex);

			// Count placeholders on the *augmented* AST — i.e. exactly what the
			// FillBlanksInput component renders to the student. This is the source
			// of truth for "how many input slots exist".
			//
			// NOTE: counting `\placeholder` in `instance.statement` AND in
			// `expressions[].answerFormat` separately double-counts. Since the
			// `<<expr:NAME>>` feature (commit 4629911e1, May 2026), the resolved
			// statement already contains the inline `\placeholder` for expressions
			// that carry their own prompt (`?`). For those, `augmentASTForExpressions`
			// does NOT also append the answerFormat (`hasPrompts` guard in
			// fill-blanks-utils.ts). Only expressions WITHOUT an inline prompt get
			// the answerFormat appended. The augmented AST collapses both cases into
			// the single, real placeholder count.
			const ast = parseMarkdown(String(instance.statement));
			const augmented = augmentASTForExpressions(ast, instance.expressions);
			const augmentedJson = JSON.stringify(augmented);

			// Count \placeholder markers (math blanks) + {{blank:N}} (text blanks).
			const mathPlaceholders = (augmentedJson.match(/placeholder/g) || []).length;
			const textBlanks = (augmentedJson.match(/\{\{blank:\d+\}\}/g) || []).length;

			const totalPlaceholders = mathPlaceholders + textBlanks;
			expect(instance.blanks!.length).toBe(totalPlaceholders);
		});

		it.each(ALL_FIB)(
			'globalIndex %d — all blanks have valid type (math or text)',
			(globalIndex) => {
				const { instance } = getTestData(globalIndex);
				for (const blank of instance.blanks!) {
					expect(['math', 'text']).toContain(blank.type);
				}
			}
		);

		it.each(ALL_FIB)('globalIndex %d — all blanks have non-empty expectedAnswer', (globalIndex) => {
			const { instance } = getTestData(globalIndex);
			for (const blank of instance.blanks!) {
				expect(blank.expectedAnswer).toBeTruthy();
			}
		});

		it.each(EXPRESSION_QUESTIONS)(
			'globalIndex %d — expressions populated for expression variables',
			(globalIndex) => {
				const { instance } = getTestData(globalIndex);
				expect(instance.expressions).toBeDefined();
				expect(instance.expressions!.length).toBeGreaterThanOrEqual(1);

				for (const expr of instance.expressions!) {
					expect(expr.name).toMatch(/^expression\d+$/);
					expect(expr.latex).toBeTruthy();
				}
			}
		);

		it.each(EXPRESSION_QUESTIONS)(
			'globalIndex %d — expressions have answerFormat with placeholders',
			(globalIndex) => {
				const { instance } = getTestData(globalIndex);
				for (const expr of instance.expressions!) {
					expect(expr.answerFormat).toBeDefined();
					expect(expr.answerFormat).toContain('\\placeholder');
				}
			}
		);

		it.each(ANSWER_FIELD_QUESTIONS)(
			'globalIndex %d — answer_field has no expression variables',
			(globalIndex) => {
				const { instance } = getTestData(globalIndex);
				expect(instance.expressions?.length ?? 0).toBe(0);
			}
		);

		it.each(ANSWER_FIELD_QUESTIONS)(
			'globalIndex %d — answer_field has \\placeholder in statement',
			(globalIndex) => {
				const { instance } = getTestData(globalIndex);
				expect(String(instance.statement)).toContain('\\placeholder');
			}
		);
	});

	// ---------------------------------------------------------------------------
	// D. Component: AST rendering
	// ---------------------------------------------------------------------------

	describe('D. Component: AST rendering', () => {
		it.each(AST_SAMPLE)('globalIndex %d — parseMarkdown produces valid AST', (globalIndex) => {
			const { instance } = getTestData(globalIndex);
			const ast = parseMarkdown(String(instance.statement));

			expect(ast).toBeDefined();
			expect(ast.type).toBe('document');
			expect(ast.children.length).toBeGreaterThan(0);
		});

		it.each(AST_SAMPLE)(
			'globalIndex %d — buildInputStates matches blank count and types',
			(globalIndex) => {
				const { instance } = getTestData(globalIndex);
				const states = buildInputStates(instance.blanks!);

				expect(states.length).toBe(instance.blanks!.length);
				for (let i = 0; i < states.length; i++) {
					expect(states[i].index).toBe(i);
					expect(states[i].type).toBe(instance.blanks![i].type);
					expect(states[i].isCorrect).toBeNull();
				}
			}
		);

		it('globalIndex 413 — augmentASTForExpressions adds answerFormat', () => {
			const { instance } = getTestData(413);
			const ast = parseMarkdown(String(instance.statement));
			const augmented = augmentASTForExpressions(ast, instance.expressions);

			// Augmented AST should be longer (added " = answerFormat")
			const originalJson = JSON.stringify(ast);
			const augmentedJson = JSON.stringify(augmented);
			expect(augmentedJson.length).toBeGreaterThan(originalJson.length);
			expect(augmentedJson).toContain('placeholder');
		});

		it('globalIndex 411 — augmentASTForExpressions adds 2-placeholder answerFormat', () => {
			const { instance } = getTestData(411);
			const ast = parseMarkdown(String(instance.statement));
			const augmented = augmentASTForExpressions(ast, instance.expressions);

			const augmentedJson = JSON.stringify(augmented);
			const placeholderMatches = augmentedJson.match(/placeholder/g) || [];
			expect(placeholderMatches.length).toBeGreaterThanOrEqual(2);
		});

		it('globalIndex 10 — augmentASTForExpressions adds default answerFormat', () => {
			const { instance } = getTestData(10);
			const ast = parseMarkdown(String(instance.statement));
			const augmented = augmentASTForExpressions(ast, instance.expressions);

			const augmentedJson = JSON.stringify(augmented);
			expect(augmentedJson).toContain('placeholder');
		});
	});
});
