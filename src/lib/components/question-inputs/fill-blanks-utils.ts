/**
 * FillBlanksInput Utility Functions
 * ==================================
 *
 * Pure functions for AST augmentation and InputState management
 * used by the FillBlanksInput component.
 *
 * @module components/question-inputs/fill-blanks-utils
 */

import type {
	DocumentNode,
	BlockNode,
	InlineNode,
	MathInlineNode,
	MathBlockNode,
	ParagraphNode,
	InputState
} from '$lib/ubumark';
import type { InstanceBlank, QuestionInstance } from '$lib/questions/types';

type Expression = NonNullable<QuestionInstance['expressions']>[number];

/**
 * Augment AST nodes that have an expressionName with ` = answerFormat`.
 *
 * For math-inline and math-block nodes with `expressionName`, finds the
 * matching expression in the expressions array and appends ` = answerFormat`
 * to the expression content.
 *
 * Returns a new AST (does not mutate the original).
 */
export function augmentASTForExpressions(
	ast: DocumentNode,
	expressions: Expression[] | undefined
): DocumentNode {
	if (!expressions || expressions.length === 0) {
		return ast;
	}

	return {
		type: 'document',
		children: ast.children.map((block) => augmentBlockNode(block, expressions))
	};
}

function augmentBlockNode(node: BlockNode, expressions: Expression[]): BlockNode {
	if (node.type === 'paragraph') {
		return {
			...node,
			children: node.children.map((child) => augmentInlineNode(child, expressions))
		} as ParagraphNode;
	}

	if (node.type === 'math-block') {
		return augmentMathNode(node, expressions) as MathBlockNode;
	}

	// Other block types (heading, list, table, etc.) — pass through
	return node;
}

function augmentInlineNode(node: InlineNode, expressions: Expression[]): InlineNode {
	if (node.type === 'math-inline') {
		return augmentMathNode(node, expressions) as MathInlineNode;
	}

	// Other inline types (text, blank, line-break, etc.) — pass through
	return node;
}

function augmentMathNode(
	node: MathInlineNode | MathBlockNode,
	expressions: Expression[]
): MathInlineNode | MathBlockNode {
	if (!node.expressionName) {
		return node;
	}

	// If the expression already contains holes (?), it has its own
	// blanks — never augment with " = answerFormat"
	if (node.expression.includes('?')) {
		return node;
	}

	const expr = expressions.find((e) => e.name === node.expressionName);
	if (!expr?.answerFormat) {
		return node;
	}

	return {
		...node,
		expression: `${node.expression} = ${expr.answerFormat}`
	};
}

/**
 * Build an InputState array from InstanceBlank definitions.
 *
 * Creates one InputState per blank with:
 * - index: 0-based position
 * - type: 'math' or 'text' from the blank definition
 * - value: prefilled value or empty string
 * - isCorrect: null (not yet validated)
 */
export function buildInputStates(blanks: InstanceBlank[]): InputState[] {
	return blanks.map((blank, index) => ({
		index,
		type: blank.type,
		value: blank.prefilled ?? '',
		isCorrect: null
	}));
}

/**
 * Build InputStates pre-filled with correct answers (for flash back / correction display).
 *
 * Math blanks use expectedAnswerLatex (fallback: expectedAnswer).
 * Text blanks use expectedAnswer.
 * All states have isCorrect = true (visually marked as correct).
 */
export function buildInputStatesForCorrection(blanks: InstanceBlank[]): InputState[] {
	return blanks.map((blank, index) => ({
		index,
		type: blank.type,
		value:
			blank.type === 'math'
				? (blank.expectedAnswerLatex ?? blank.expectedAnswer ?? '')
				: (blank.expectedAnswer ?? ''),
		isCorrect: true
	}));
}

/**
 * Apply validation results to InputState array.
 *
 * Maps each validationResults[i] (boolean | null) onto states[i].isCorrect.
 * Returns a new array (does not mutate the original).
 *
 * Handles mismatched lengths: missing validation results default to null.
 */
export function applyValidationToInputStates(
	states: InputState[],
	validationResults: (boolean | null)[]
): InputState[] {
	return states.map((state, i) => ({
		...state,
		isCorrect: i < validationResults.length ? validationResults[i] : null
	}));
}
