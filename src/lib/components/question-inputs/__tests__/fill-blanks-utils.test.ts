/**
 * FillBlanksInput Utility Functions — Tests
 * ==========================================
 *
 * Phase 6.1 TDD tests for the pure logic functions used by FillBlanksInput:
 * - augmentASTForExpressions: augments math AST nodes with expression answerFormats
 * - buildInputStates: creates InputState[] from InstanceBlank[]
 * - applyValidationToInputStates: maps validationResults onto InputState.isCorrect
 *
 * @module components/question-inputs/__tests__/fill-blanks-utils.test
 */

import { describe, it, expect } from 'vitest';
import type {
	DocumentNode,
	MathInlineNode,
	MathBlockNode,
	TextNode,
	BlankNode,
	ParagraphNode,
	InputState
} from '$lib/ubumark';
import type { InstanceBlank, QuestionInstance } from '$lib/questions/types';
import {
	augmentASTForExpressions,
	buildInputStates,
	applyValidationToInputStates
} from '../fill-blanks-utils';

// =============================================================================
// Test Helpers
// =============================================================================

type Expression = NonNullable<QuestionInstance['expressions']>[number];

function textNode(content: string): TextNode {
	return { type: 'text', content };
}

function mathInline(expression: string, expressionName?: string): MathInlineNode {
	return { type: 'math-inline', expression, syntax: 'latex', expressionName };
}

function mathBlock(expression: string, expressionName?: string): MathBlockNode {
	return { type: 'math-block', expression, syntax: 'latex', expressionName };
}

function blankNode(index: number): BlankNode {
	return { type: 'blank', index };
}

function paragraph(...children: ParagraphNode['children']): ParagraphNode {
	return { type: 'paragraph', children };
}

function doc(...children: DocumentNode['children']): DocumentNode {
	return { type: 'document', children };
}

function makeBlank(overrides: Partial<InstanceBlank> & { expectedAnswer: string }): InstanceBlank {
	return {
		type: 'math',
		...overrides
	};
}

function makeExpression(name: string, latex: string, answerFormat?: string): Expression {
	return { name, latex, answerFormat };
}

// =============================================================================
// A. augmentASTForExpressions
// =============================================================================

describe('augmentASTForExpressions', () => {
	describe('expression augmentation', () => {
		it('should augment inline math with expressionName and answerFormat', () => {
			expect.assertions(2);
			const ast = doc(paragraph(mathInline('10^{2} \\times 10^{3}', 'expression1')));
			const expressions: Expression[] = [
				makeExpression('expression1', '10^{2} \\times 10^{3}', '10^{\\placeholder[0]{}}')
			];

			const result = augmentASTForExpressions(ast, expressions);

			const p = result.children[0] as ParagraphNode;
			const math = p.children[0] as MathInlineNode;
			expect(math.expression).toBe('10^{2} \\times 10^{3} = 10^{\\placeholder[0]{}}');
			expect(math.expressionName).toBe('expression1');
		});

		it('should augment block math with expressionName and answerFormat', () => {
			expect.assertions(2);
			const ast = doc(mathBlock('5 + 3', 'expression1'));
			const expressions: Expression[] = [
				makeExpression('expression1', '5 + 3', '\\placeholder[0]{}')
			];

			const result = augmentASTForExpressions(ast, expressions);

			const math = result.children[0] as MathBlockNode;
			expect(math.expression).toBe('5 + 3 = \\placeholder[0]{}');
			expect(math.expressionName).toBe('expression1');
		});

		it('should augment expression with default answerFormat (single placeholder)', () => {
			expect.assertions(1);
			// Generator always provides answerFormat, even for default "?" → "\placeholder[0]{}"
			const ast = doc(paragraph(mathInline('5 + 3', 'expression1')));
			const expressions: Expression[] = [
				makeExpression('expression1', '5 + 3', '\\placeholder[0]{}')
			];

			const result = augmentASTForExpressions(ast, expressions);

			const p = result.children[0] as ParagraphNode;
			const math = p.children[0] as MathInlineNode;
			expect(math.expression).toBe('5 + 3 = \\placeholder[0]{}');
		});

		it('should augment multi-placeholder answerFormat', () => {
			expect.assertions(1);
			const ast = doc(paragraph(mathInline('2{,}5 \\times 10^{3}', 'expression1')));
			const expressions: Expression[] = [
				makeExpression(
					'expression1',
					'2{,}5 \\times 10^{3}',
					'\\placeholder[0]{} \\times 10^{\\placeholder[1]{}}'
				)
			];

			const result = augmentASTForExpressions(ast, expressions);

			const p = result.children[0] as ParagraphNode;
			const math = p.children[0] as MathInlineNode;
			expect(math.expression).toBe(
				'2{,}5 \\times 10^{3} = \\placeholder[0]{} \\times 10^{\\placeholder[1]{}}'
			);
		});

		it('should not augment math nodes without expressionName', () => {
			expect.assertions(1);
			const ast = doc(paragraph(mathInline('x^2 + 1')));
			const expressions: Expression[] = [
				makeExpression('expression1', '5 + 3', '\\placeholder[0]{}')
			];

			const result = augmentASTForExpressions(ast, expressions);

			const p = result.children[0] as ParagraphNode;
			const math = p.children[0] as MathInlineNode;
			expect(math.expression).toBe('x^2 + 1');
		});

		it('should not augment when expressions array is undefined', () => {
			expect.assertions(1);
			const ast = doc(paragraph(mathInline('5 + 3', 'expression1')));

			const result = augmentASTForExpressions(ast, undefined);

			const p = result.children[0] as ParagraphNode;
			const math = p.children[0] as MathInlineNode;
			expect(math.expression).toBe('5 + 3');
		});

		it('should not augment when expression name not found in expressions array', () => {
			expect.assertions(1);
			const ast = doc(paragraph(mathInline('5 + 3', 'expression1')));
			const expressions: Expression[] = [
				makeExpression('expression2', '7 - 2', '\\placeholder[0]{}')
			];

			const result = augmentASTForExpressions(ast, expressions);

			const p = result.children[0] as ParagraphNode;
			const math = p.children[0] as MathInlineNode;
			expect(math.expression).toBe('5 + 3');
		});

		it('should handle expression without answerFormat (fallback)', () => {
			expect.assertions(1);
			// Edge case: answerFormat is undefined (shouldn't happen in practice,
			// but the function should handle it gracefully — no augmentation)
			const ast = doc(paragraph(mathInline('5 + 3', 'expression1')));
			const expressions: Expression[] = [makeExpression('expression1', '5 + 3', undefined)];

			const result = augmentASTForExpressions(ast, expressions);

			const p = result.children[0] as ParagraphNode;
			const math = p.children[0] as MathInlineNode;
			// No answerFormat → no augmentation (cannot determine placeholder index)
			expect(math.expression).toBe('5 + 3');
		});
	});

	describe('multiple expressions', () => {
		it('should augment multiple expressions in the same paragraph', () => {
			expect.assertions(2);
			const ast = doc(
				paragraph(
					mathInline('a + b', 'expression1'),
					textNode(' et '),
					mathInline('c - d', 'expression2')
				)
			);
			const expressions: Expression[] = [
				makeExpression('expression1', 'a + b', '\\placeholder[0]{}'),
				makeExpression('expression2', 'c - d', '\\placeholder[1]{}')
			];

			const result = augmentASTForExpressions(ast, expressions);

			const p = result.children[0] as ParagraphNode;
			expect((p.children[0] as MathInlineNode).expression).toBe('a + b = \\placeholder[0]{}');
			expect((p.children[2] as MathInlineNode).expression).toBe('c - d = \\placeholder[1]{}');
		});

		it('should augment expression in one block and leave other blocks unchanged', () => {
			expect.assertions(2);
			const ast = doc(mathBlock('a + b', 'expression1'), paragraph(textNode('Some text')));
			const expressions: Expression[] = [
				makeExpression('expression1', 'a + b', '\\placeholder[0]{}')
			];

			const result = augmentASTForExpressions(ast, expressions);

			const math = result.children[0] as MathBlockNode;
			expect(math.expression).toBe('a + b = \\placeholder[0]{}');
			const p = result.children[1] as ParagraphNode;
			expect((p.children[0] as TextNode).content).toBe('Some text');
		});
	});

	describe('mixed nodes — non-expression nodes preserved', () => {
		it('should preserve text, blank, and plain math nodes', () => {
			expect.assertions(4);
			const ast = doc(
				paragraph(
					textNode('Calculer '),
					mathInline('2 + \\placeholder[0]{}'),
					textNode(' et '),
					blankNode(1)
				)
			);

			const result = augmentASTForExpressions(ast, []);

			const p = result.children[0] as ParagraphNode;
			expect((p.children[0] as TextNode).content).toBe('Calculer ');
			expect((p.children[1] as MathInlineNode).expression).toBe('2 + \\placeholder[0]{}');
			expect((p.children[2] as TextNode).content).toBe(' et ');
			expect((p.children[3] as BlankNode).index).toBe(1);
		});

		it('should not mutate the original AST', () => {
			expect.assertions(2);
			const original = doc(paragraph(mathInline('5 + 3', 'expression1')));
			const expressions: Expression[] = [
				makeExpression('expression1', '5 + 3', '\\placeholder[0]{}')
			];

			const result = augmentASTForExpressions(original, expressions);

			// Original should be unchanged
			const origP = original.children[0] as ParagraphNode;
			expect((origP.children[0] as MathInlineNode).expression).toBe('5 + 3');
			// Result should be augmented
			const resP = result.children[0] as ParagraphNode;
			expect((resP.children[0] as MathInlineNode).expression).toBe('5 + 3 = \\placeholder[0]{}');
		});
	});
});

// =============================================================================
// B. buildInputStates
// =============================================================================

describe('buildInputStates', () => {
	it('should create one InputState per blank', () => {
		expect.assertions(4);
		const blanks: InstanceBlank[] = [
			makeBlank({ expectedAnswer: '5', type: 'math' }),
			makeBlank({ expectedAnswer: 'entier', type: 'text' })
		];

		const states = buildInputStates(blanks);

		expect(states).toHaveLength(2);
		expect(states[0]).toMatchObject({ index: 0, type: 'math', value: '', isCorrect: null });
		expect(states[1]).toMatchObject({ index: 1, type: 'text', value: '', isCorrect: null });
		// Verify all fields exist
		expect(states[0].index).toBe(0);
	});

	it('should handle prefilled blanks', () => {
		expect.assertions(2);
		const blanks: InstanceBlank[] = [
			makeBlank({ expectedAnswer: '5', type: 'math', prefilled: '3' }),
			makeBlank({ expectedAnswer: 'pair', type: 'text' })
		];

		const states = buildInputStates(blanks);

		expect(states[0].value).toBe('3');
		expect(states[1].value).toBe('');
	});

	it('should return empty array for no blanks', () => {
		expect.assertions(1);
		const states = buildInputStates([]);
		expect(states).toHaveLength(0);
	});

	it('should preserve blank type (math vs text)', () => {
		expect.assertions(3);
		const blanks: InstanceBlank[] = [
			makeBlank({ expectedAnswer: 'a', type: 'math' }),
			makeBlank({ expectedAnswer: 'b', type: 'text' }),
			makeBlank({ expectedAnswer: 'c', type: 'math' })
		];

		const states = buildInputStates(blanks);

		expect(states[0].type).toBe('math');
		expect(states[1].type).toBe('text');
		expect(states[2].type).toBe('math');
	});
});

// =============================================================================
// C. applyValidationToInputStates
// =============================================================================

describe('applyValidationToInputStates', () => {
	it('should map boolean validation results to isCorrect', () => {
		expect.assertions(2);
		const states: InputState[] = [
			{ index: 0, type: 'math', value: '5', isCorrect: null },
			{ index: 1, type: 'text', value: 'pair', isCorrect: null }
		];
		const validationResults: (boolean | null)[] = [true, false];

		const result = applyValidationToInputStates(states, validationResults);

		expect(result[0].isCorrect).toBe(true);
		expect(result[1].isCorrect).toBe(false);
	});

	it('should handle null validation results (not yet validated)', () => {
		expect.assertions(2);
		const states: InputState[] = [
			{ index: 0, type: 'math', value: '5', isCorrect: null },
			{ index: 1, type: 'text', value: '', isCorrect: null }
		];
		const validationResults: (boolean | null)[] = [true, null];

		const result = applyValidationToInputStates(states, validationResults);

		expect(result[0].isCorrect).toBe(true);
		expect(result[1].isCorrect).toBeNull();
	});

	it('should handle empty validation results (pre-submission)', () => {
		expect.assertions(2);
		const states: InputState[] = [
			{ index: 0, type: 'math', value: '5', isCorrect: null },
			{ index: 1, type: 'text', value: 'pair', isCorrect: null }
		];

		const result = applyValidationToInputStates(states, []);

		expect(result[0].isCorrect).toBeNull();
		expect(result[1].isCorrect).toBeNull();
	});

	it('should not mutate original states', () => {
		expect.assertions(2);
		const states: InputState[] = [{ index: 0, type: 'math', value: '5', isCorrect: null }];
		const validationResults: (boolean | null)[] = [true];

		const result = applyValidationToInputStates(states, validationResults);

		expect(states[0].isCorrect).toBeNull();
		expect(result[0].isCorrect).toBe(true);
	});

	it('should handle mismatched lengths gracefully', () => {
		expect.assertions(2);
		const states: InputState[] = [
			{ index: 0, type: 'math', value: '5', isCorrect: null },
			{ index: 1, type: 'text', value: 'pair', isCorrect: null }
		];
		// Only one validation result for two states
		const validationResults: (boolean | null)[] = [true];

		const result = applyValidationToInputStates(states, validationResults);

		expect(result[0].isCorrect).toBe(true);
		expect(result[1].isCorrect).toBeNull();
	});
});
