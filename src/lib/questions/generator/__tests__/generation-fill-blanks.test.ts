/**
 * Fill-in-blanks Generation Pipeline Tests (Phase 3)
 * ===================================================
 *
 * Tests the complete fill-in-blanks generation pipeline:
 * - Expression marker insertion (<<expr:NAME>>)
 * - assignBlankIndices integration (? → \placeholder[N]{}, [_] → {{blank:N}})
 * - instance.expressions[] construction
 * - instance.blanks[] with inferred type (math/text) and merged validation
 * - expectedAnswerLatex generation
 * - answerFormat pipeline (variable resolution + LaTeX conversion)
 * - Coherence check (totalBlanks === blanks.length)
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../instance-generator';
import type { QuestionTemplate, QuestionVariation } from '../../types';
import { getQuestionType } from '../../types';
import { templateMarkdown } from '$lib/ubumark';

/**
 * Helper to create a minimal fill-in-blanks template
 */
function makeFillInTemplate(
	variation: QuestionVariation,
	overrides?: Partial<QuestionTemplate>
): QuestionTemplate {
	return {
		id: 'test-fib',
		title: 'Test Fill-in-Blanks',
		status: 'draft',
		variations: [variation],
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		...overrides
	};
}

/**
 * Helper to create a template with shared defaults
 */
function makeFillInTemplateWithShared(
	variation: QuestionVariation,
	shared: QuestionTemplate['shared'],
	overrides?: Partial<QuestionTemplate>
): QuestionTemplate {
	return {
		id: 'test-fib-shared',
		title: 'Test Fill-in-Blanks with Shared',
		status: 'draft',
		shared,
		variations: [variation],
		grades: ['6'],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		...overrides
	};
}

// ============================================================================
// SIMPLE MATH BLANKS (? in $...$)
// ============================================================================

describe('Fill-in-blanks: simple math blanks', () => {
	it('should replace ? in inline math with \\placeholder[N]{}', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('Calculer $? + 3$'),
			blanks: [{ expectedAnswer: '5' }]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.statement).toContain('\\placeholder[0]{}');
		expect(result.instance.statement).not.toMatch(/\$\?/);
	});

	it('should replace ? in block math with \\placeholder[N]{}', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('$$? \\times 3$$'),
			blanks: [{ expectedAnswer: '5' }]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.statement).toContain('\\placeholder[0]{}');
	});

	it('should replace multiple ? with sequential indices', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('$? + ? = 10$'),
			blanks: [{ expectedAnswer: '3' }, { expectedAnswer: '7' }]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.statement).toContain('\\placeholder[0]{}');
		expect(result.instance.statement).toContain('\\placeholder[1]{}');
	});

	it('should infer type "math" for ? blanks in $...$', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('$?$'),
			blanks: [{ expectedAnswer: '5' }]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.blanks).toHaveLength(1);
		expect(result.instance.blanks![0].type).toBe('math');
	});

	it('should generate expectedAnswerLatex for math blanks', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('$?$'),
			blanks: [{ expectedAnswer: '5' }]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.blanks![0].expectedAnswerLatex).toBe('5');
	});

	it('should have no correctChoiceIndex for fill_in_blanks', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('$?$'),
			blanks: [{ expectedAnswer: '5' }]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(getQuestionType(result.instance)).toBe('fill_in_blanks');
		expect(result.instance.correctChoiceIndex).toBeUndefined();
	});
});

// ============================================================================
// TEXT BLANKS ([_] in text)
// ============================================================================

describe('Fill-in-blanks: text blanks', () => {
	it('should replace [_] in text with {{blank:N}}', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('Le nombre est [_]'),
			blanks: [{ expectedAnswer: 'pair' }]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.statement).toContain('{{blank:0}}');
		expect(result.instance.statement).not.toContain('[_]');
	});

	it('should infer type "text" for [_] blanks', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('Le mot est [_]'),
			blanks: [{ expectedAnswer: 'entier' }]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.blanks![0].type).toBe('text');
	});

	it('should not generate expectedAnswerLatex for text blanks', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('Le mot est [_]'),
			blanks: [{ expectedAnswer: 'entier' }]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.blanks![0].expectedAnswerLatex).toBeUndefined();
	});
});

// ============================================================================
// EXPRESSION CONVENTION (expression* variables)
// ============================================================================

describe('Fill-in-blanks: expression convention', () => {
	it('should insert <<expr:NAME>> marker for expression variables', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('$${{expression1}}$$'),
			variables: [
				{ name: 'a', expression: '2' },
				{ name: 'b', expression: '3' },
				{ name: 'expression1', expression: '{{a}}+{{b}}' }
			],
			blanks: [{ expectedAnswer: '{{eval:a+b}}' }]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		// The marker should be present in the statement
		expect(result.instance.statement).toContain('<<expr:expression1>>');
	});

	it('should populate instance.expressions[] with name, latex, value, and answerFormat', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('$${{expression1}}$$'),
			variables: [
				{ name: 'a', expression: '2' },
				{ name: 'b', expression: '3' },
				{ name: 'expression1', expression: '{{a}}+{{b}}' }
			],
			answerFormats: { expression1: '?' },
			blanks: [{ expectedAnswer: '{{eval:a+b}}' }]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.expressions).toBeDefined();
		expect(result.instance.expressions).toHaveLength(1);
		expect(result.instance.expressions![0].name).toBe('expression1');
		expect(result.instance.expressions![0].latex).toBeDefined();
		expect(result.instance.expressions![0].latex.length).toBeGreaterThan(0);
		// answerFormat "?" → \placeholder[0]{}
		expect(result.instance.expressions![0].answerFormat).toContain('\\placeholder[0]{}');
		// value is the custom-format expression post variable resolution
		expect(result.instance.expressions![0].value).toBe('2+3');
	});

	it('should populate instance.expressions[].value with custom format (no LaTeX)', () => {
		// Custom format keeps `*` (LaTeX would render `\times`); value must be parsable
		// by parseCustomSafe and consumable by pedagogical-arithmetic.
		const template = makeFillInTemplate({
			statement: templateMarkdown('$${{expression1}}$$'),
			variables: [
				{ name: 'a', expression: '2' },
				{ name: 'b', expression: '3' },
				{ name: 'c', expression: '4' },
				{ name: 'expression1', expression: '{{a}}+{{b}}*{{c}}' }
			],
			blanks: [{ expectedAnswer: '{{eval:a+b*c}}' }]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.expressions![0].value).toBe('2+3*4');
		// LaTeX contains \times, value does not — they are different formats
		expect(result.instance.expressions![0].value).not.toContain('\\times');
	});

	it('should use default answerFormat "?" when no answerFormats entry exists', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('$${{expression1}}$$'),
			variables: [
				{ name: 'a', expression: '5' },
				{ name: 'expression1', expression: '{{a}}+3' }
			],
			// No answerFormats → default "?" for expression1
			blanks: [{ expectedAnswer: '{{eval:a+3}}' }]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.expressions).toHaveLength(1);
		// Default "?" → \placeholder[0]{}
		expect(result.instance.expressions![0].answerFormat).toContain('\\placeholder[0]{}');
	});

	it('should resolve variables in answerFormat and convert to LaTeX', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('$${{expression1}}$$'),
			variables: [
				{ name: 'a', expression: '2' },
				{ name: 'b', expression: '3' },
				{ name: 'expression1', expression: '10^{{a}}*10^{{b}}' }
			],
			answerFormats: { expression1: '10^?' },
			blanks: [{ expectedAnswer: '{{eval:a+b}}' }]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		// "10^?" → LaTeX → "10^{?}" → assignBlankIndices → "10^{\placeholder[0]{}}"
		const af = result.instance.expressions![0].answerFormat!;
		expect(af).toContain('\\placeholder[0]{}');
		expect(af).toContain('10');
	});

	it('should handle expression without answerFormat (? in expression content)', () => {
		// Pattern: expression has ? directly in its content (fill-in inside expression)
		// No answerFormat because the ? is in the statement itself
		const template = makeFillInTemplate({
			statement: templateMarkdown('$?+5=10$'),
			blanks: [{ expectedAnswer: '5' }]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		// No expressions array (no expression* variable used)
		expect(result.instance.expressions).toBeUndefined();
		// Statement has placeholder for the ?
		expect(result.instance.statement).toContain('\\placeholder[0]{}');
	});

	it('should handle two expression variables simultaneously', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('$${{expression1}}$$ et $${{expression2}}$$'),
			variables: [
				{ name: 'a', expression: '2' },
				{ name: 'b', expression: '3' },
				{ name: 'expression1', expression: '{{a}}+{{b}}' },
				{ name: 'expression2', expression: '{{a}}*{{b}}' }
			],
			answerFormats: { expression1: '?', expression2: '?' },
			blanks: [{ expectedAnswer: '{{eval:a+b}}' }, { expectedAnswer: '{{eval:a*b}}' }]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.expressions).toHaveLength(2);
		expect(result.instance.expressions![0].name).toBe('expression1');
		expect(result.instance.expressions![1].name).toBe('expression2');
		// Sequential indices: expression1 gets 0, expression2 gets 1
		expect(result.instance.expressions![0].answerFormat).toContain('\\placeholder[0]{}');
		expect(result.instance.expressions![1].answerFormat).toContain('\\placeholder[1]{}');
	});
});

// ============================================================================
// BLANK DEFAULTS + PER-BLANK OVERRIDES
// ============================================================================

describe('Fill-in-blanks: blankDefaults + per-blank overrides', () => {
	it('should apply blankDefaults.precision to all blanks', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('$?$ et $?$'),
			blankDefaults: { precision: { type: 'decimal', digits: 2 } },
			blanks: [{ expectedAnswer: '3.14' }, { expectedAnswer: '2.72' }]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.blanks![0].precision).toEqual({ type: 'decimal', digits: 2 });
		expect(result.instance.blanks![1].precision).toEqual({ type: 'decimal', digits: 2 });
	});

	it('should allow per-blank precision override of blankDefaults', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('$?$ et $?$'),
			blankDefaults: { precision: { type: 'decimal', digits: 2 } },
			blanks: [
				{ expectedAnswer: '3.14' },
				{ expectedAnswer: '2.72', precision: { type: 'significant', digits: 3 } }
			]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.blanks![0].precision).toEqual({ type: 'decimal', digits: 2 });
		expect(result.instance.blanks![1].precision).toEqual({ type: 'significant', digits: 3 });
	});

	it('should apply blankDefaults.unit and allow per-blank unit override', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('$?$ et $?$'),
			blankDefaults: { unit: { expected: false } },
			blanks: [
				{ expectedAnswer: '1000' },
				{ expectedAnswer: '5', unit: { expected: true, required: 'm' } }
			]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.blanks![0].unit).toEqual({ expected: false });
		expect(result.instance.blanks![1].unit).toEqual({ expected: true, required: 'm' });
	});

	it('should apply blankDefaults from shared when variation has none', () => {
		const template = makeFillInTemplateWithShared(
			{
				statement: templateMarkdown('$?$'),
				blanks: [{ expectedAnswer: '5' }]
			},
			{
				blankDefaults: { precision: { type: 'tolerance', tolerance: 0.1, mode: 'absolute' } }
			}
		);

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.blanks![0].precision).toEqual({
			type: 'tolerance',
			tolerance: 0.1,
			mode: 'absolute'
		});
	});

	it('should apply answerFormats from shared', () => {
		const template = makeFillInTemplateWithShared(
			{
				statement: templateMarkdown('$${{expression1}}$$'),
				variables: [
					{ name: 'a', expression: '2' },
					{ name: 'b', expression: '3' },
					{ name: 'expression1', expression: '10^{{a}}*10^{{b}}' }
				],
				blanks: [{ expectedAnswer: '{{eval:a+b}}' }]
			},
			{
				answerFormats: { expression1: '10^?' }
			}
		);

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.expressions).toHaveLength(1);
		expect(result.instance.expressions![0].answerFormat).toContain('\\placeholder[0]{}');
	});
});

// ============================================================================
// MIXED BLANKS (math + text) WITH GLOBAL COUNTER
// ============================================================================

describe('Fill-in-blanks: mixed math + text blanks', () => {
	it('should assign sequential indices across math and text blanks', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('$?$ est un nombre [_]'),
			blanks: [{ expectedAnswer: '7' }, { expectedAnswer: 'premier' }]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		// Math blank at index 0, text blank at index 1
		expect(result.instance.statement).toContain('\\placeholder[0]{}');
		expect(result.instance.statement).toContain('{{blank:1}}');
		expect(result.instance.blanks![0].type).toBe('math');
		expect(result.instance.blanks![1].type).toBe('text');
	});

	it('should count text before math when [_] appears first', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('Le mot [_] vaut $?$'),
			blanks: [{ expectedAnswer: 'pi' }, { expectedAnswer: '3.14' }]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.statement).toContain('{{blank:0}}');
		expect(result.instance.statement).toContain('\\placeholder[1]{}');
		expect(result.instance.blanks![0].type).toBe('text');
		expect(result.instance.blanks![1].type).toBe('math');
	});
});

// ============================================================================
// EXPRESSION + STATEMENT BLANKS WITH GLOBAL COUNTER
// ============================================================================

describe('Fill-in-blanks: expression + statement blanks', () => {
	it('should count expression answerFormat blanks before statement blanks', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('$${{expression1}}$$ et $? + ?$'),
			variables: [
				{ name: 'a', expression: '2' },
				{ name: 'b', expression: '3' },
				{ name: 'expression1', expression: '10^{{a}}*10^{{b}}' }
			],
			answerFormats: { expression1: '10^?' },
			blanks: [
				{ expectedAnswer: '{{eval:a+b}}' }, // index 0 (expression answerFormat)
				{ expectedAnswer: '3' }, // index 1 (1st ? in statement)
				{ expectedAnswer: '7' } // index 2 (2nd ? in statement)
			]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		// Expression reserves index 0
		expect(result.instance.expressions![0].answerFormat).toContain('\\placeholder[0]{}');
		// Statement ? get indices 1 and 2
		expect(result.instance.statement).toContain('\\placeholder[1]{}');
		expect(result.instance.statement).toContain('\\placeholder[2]{}');
		expect(result.instance.blanks).toHaveLength(3);
	});

	it('should count expression + text blanks correctly', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('$${{expression1}}$$ Le resultat est [_]'),
			variables: [{ name: 'expression1', expression: '5+3' }],
			answerFormats: { expression1: '?' },
			blanks: [
				{ expectedAnswer: '8' }, // index 0 (expression)
				{ expectedAnswer: 'huit' } // index 1 (text [_])
			]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.expressions![0].answerFormat).toContain('\\placeholder[0]{}');
		expect(result.instance.statement).toContain('{{blank:1}}');
		expect(result.instance.blanks![0].type).toBe('math');
		expect(result.instance.blanks![1].type).toBe('text');
	});
});

// ============================================================================
// COHERENCE CHECK (totalBlanks === blanks.length)
// ============================================================================

describe('Fill-in-blanks: coherence check', () => {
	it('should fail when blanks.length < totalBlanks in statement', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('$?$ et $?$'),
			blanks: [{ expectedAnswer: '5' }] // 1 blank but 2 ? in statement
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(false);
		if (result.success) return;

		expect(result.errors.some((e) => /blank/i.test(e) || /mismatch/i.test(e))).toBe(true);
	});

	it('should fail when blanks.length > totalBlanks in statement', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('$?$'),
			blanks: [{ expectedAnswer: '5' }, { expectedAnswer: '7' }] // 2 blanks but only 1 ? in statement
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// REAL-WORLD EXAMPLES (old-questions patterns)
// ============================================================================

describe('Fill-in-blanks: real-world examples', () => {
	// Pattern from globalIndex 10: result/rewrite simple, default answerFormat "?"
	// Original: expression = "(&1*100) + (&2*10) + &3"
	it('should handle result/rewrite with default answerFormat (globalIndex 10 pattern)', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('$${{expression1}}$$'),
			variables: [
				{ name: 'a', expression: '3' },
				{ name: 'b', expression: '5' },
				{ name: 'c', expression: '7' },
				{ name: 'expression1', expression: '({{a}}*100)+({{b}}*10)+{{c}}' }
			],
			// No answerFormats → default "?" for expression1
			blanks: [{ expectedAnswer: '{{eval:(a*100)+(b*10)+c}}' }]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.expressions).toHaveLength(1);
		expect(result.instance.expressions![0].name).toBe('expression1');
		expect(result.instance.expressions![0].answerFormat).toContain('\\placeholder[0]{}');
		expect(result.instance.blanks).toHaveLength(1);
		expect(result.instance.blanks![0].expectedAnswer).toBe('357');
		expect(result.instance.blanks![0].type).toBe('math');
		expect(result.instance.blanks![0].expectedAnswerLatex).toBeDefined();
		expect(result.instance.correctChoiceIndex).toBeUndefined();
	});

	// Pattern from globalIndex 51: fill-in with ? in statement (not expression convention)
	// Original: expression = "?+&1=10"
	it('should handle fill-in with ? in statement (globalIndex 51 pattern)', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('$?+{{a}}=10$'),
			variables: [{ name: 'a', expression: '3' }],
			blanks: [{ expectedAnswer: '{{eval:10-a}}' }]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		// No expressions (no expression* variable)
		expect(result.instance.expressions).toBeUndefined();
		expect(result.instance.statement).toContain('\\placeholder[0]{}');
		expect(result.instance.blanks![0].expectedAnswer).toBe('7');
		expect(result.instance.blanks![0].type).toBe('math');
		expect(result.instance.blanks![0].expectedAnswerLatex).toBe('7');
	});

	// Pattern from globalIndex 413: result/rewrite with answerFormat "10^?"
	// Original: expression = "10^&2*10^&3", answerFormat = "10^?"
	it('should handle expression with answerFormat 10^? (globalIndex 413 pattern)', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('$${{expression1}}$$'),
			variables: [
				{ name: 'a', expression: '2' },
				{ name: 'b', expression: '3' },
				{ name: 'expression1', expression: '10^{{a}}*10^{{b}}' }
			],
			answerFormats: { expression1: '10^?' },
			blanks: [{ expectedAnswer: '{{eval:a+b}}' }]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.expressions).toHaveLength(1);
		expect(result.instance.expressions![0].name).toBe('expression1');
		expect(result.instance.expressions![0].latex).toBeDefined();
		// answerFormat: "10^?" → LaTeX → "10^{?}" → placeholder → "10^{\placeholder[0]{}}"
		const af = result.instance.expressions![0].answerFormat!;
		expect(af).toContain('\\placeholder[0]{}');
		expect(result.instance.blanks).toHaveLength(1);
		expect(result.instance.blanks![0].expectedAnswer).toBe('5');
		expect(result.instance.blanks![0].expectedAnswerLatex).toBe('5');
		expect(result.instance.blanks![0].type).toBe('math');
	});

	// Pattern from globalIndex 411: result/rewrite with answerFormat "?*10^?" (multi-blanks)
	// Original: expression = "[._&1,&3*10^{&4}_]", answerFormat = "?*10^?"
	it('should handle expression with multi-blank answerFormat ?*10^? (globalIndex 411 pattern)', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('$${{expression1}}$$'),
			variables: [
				{ name: 'a', expression: '3' },
				{ name: 'b', expression: '24' },
				{ name: 'c', expression: '4' },
				{ name: 'expression1', expression: '{{a}},{{b}}*10^{{c}}' }
			],
			answerFormats: { expression1: '?*10^?' },
			blanks: [
				{ expectedAnswer: '{{a}},{{b}}' }, // mantissa
				{ expectedAnswer: '{{c}}' } // exponent
			]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.expressions).toHaveLength(1);
		expect(result.instance.expressions![0].name).toBe('expression1');
		// answerFormat "?*10^?" has 2 placeholders
		const af = result.instance.expressions![0].answerFormat!;
		expect(af).toContain('\\placeholder[0]{}');
		expect(af).toContain('\\placeholder[1]{}');
		expect(result.instance.blanks).toHaveLength(2);
		expect(result.instance.blanks![0].expectedAnswer).toBe('3,24');
		expect(result.instance.blanks![1].expectedAnswer).toBe('4');
	});
});

// ============================================================================
// VARIABLE RESOLUTION IN BLANKS
// ============================================================================

describe('Fill-in-blanks: variable resolution in blanks', () => {
	it('should resolve {{eval:...}} in expectedAnswer', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('$?$'),
			variables: [
				{ name: 'a', expression: '7' },
				{ name: 'b', expression: '3' }
			],
			blanks: [{ expectedAnswer: '{{eval:a+b}}' }]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.blanks![0].expectedAnswer).toBe('10');
	});

	it('should resolve {{var}} references in expectedAnswer', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('$?$'),
			variables: [{ name: 'a', expression: '42' }],
			blanks: [{ expectedAnswer: '{{a}}' }]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.blanks![0].expectedAnswer).toBe('42');
	});

	it('should resolve prefilled value', () => {
		const template = makeFillInTemplate({
			statement: templateMarkdown('$?$'),
			variables: [{ name: 'a', expression: '5' }],
			blanks: [{ expectedAnswer: '10', prefilled: '{{a}}' }]
		});

		const result = generateInstance(template, 42);
		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.instance.blanks![0].prefilled).toBe('5');
	});
});
