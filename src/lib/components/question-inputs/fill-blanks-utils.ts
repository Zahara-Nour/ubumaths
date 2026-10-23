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
	TableNode,
	InputState
} from '$lib/ubumark';
import { parseMarkdown } from '$lib/ubumark';
import type { InstanceBlank, QuestionInstance } from '$lib/questions/types';
import { hasPrompts } from '$lib/components/markdown/utils/math-utils';
import type { CapitalPairs } from '$lib/mathAST/parser/types';
import { toFrenchDecimal } from '$lib/utils/french-math';

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
	expressions: Expression[] | undefined,
	capitalPairs?: CapitalPairs
): DocumentNode {
	if (!expressions || expressions.length === 0) {
		return ast;
	}

	return {
		type: 'document',
		children: ast.children.map((block) => augmentBlockNode(block, expressions, capitalPairs))
	};
}

function augmentBlockNode(
	node: BlockNode,
	expressions: Expression[],
	capitalPairs?: CapitalPairs
): BlockNode {
	if (node.type === 'paragraph') {
		return {
			...node,
			children: node.children.map((child) => augmentInlineNode(child, expressions, capitalPairs))
		} as ParagraphNode;
	}

	if (node.type === 'math-block') {
		return augmentMathNode(node, expressions, capitalPairs) as MathBlockNode;
	}

	// Other block types (heading, list, table, etc.) — pass through
	return node;
}

function augmentInlineNode(
	node: InlineNode,
	expressions: Expression[],
	capitalPairs?: CapitalPairs
): InlineNode {
	if (node.type === 'math-inline') {
		return augmentMathNode(node, expressions, capitalPairs) as MathInlineNode;
	}

	// Other inline types (text, blank, line-break, etc.) — pass through
	return node;
}

function augmentMathNode(
	node: MathInlineNode | MathBlockNode,
	expressions: Expression[],
	capitalPairs?: CapitalPairs
): MathInlineNode | MathBlockNode {
	if (!node.expressionName) {
		return node;
	}

	// If the expression already contains prompts/holes, it has its own
	// blanks — never augment with " = answerFormat"
	if (hasPrompts(node.expression, node.syntax, capitalPairs)) {
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
 *
 * `minDigits` : seuil des espaces de groupement de la question (4 : « Espaces dès
 * 4 chiffres ») ; absent, celui du BIPM.
 */
export function buildInputStates(blanks: InstanceBlank[], minDigits?: number): InputState[] {
	return blanks.map((blank, index) => ({
		index,
		type: blank.type === 'graphical' ? 'graphical' : blank.type,
		value: blank.prefilled
			? blank.type === 'math'
				? toFrenchDecimal(blank.prefilled, minDigits === undefined ? {} : { minDigits })
				: blank.prefilled
			: '',
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
 * `unoptimalResults[i]` : case juste mais perfectible (ambre, cf. `InputState.unoptimal`).
 */
export function applyValidationToInputStates(
	states: InputState[],
	validationResults: (boolean | null)[],
	unoptimalResults: boolean[] = []
): InputState[] {
	return states.map((state, i) => ({
		...state,
		isCorrect: i < validationResults.length ? validationResults[i] : null,
		unoptimal: unoptimalResults[i] === true
	}));
}

// ============================================================================
// TROUS DANS UNE CELLULE DE TABLEAU
// ============================================================================

/** Vrai si un des éléments en ligne est un trou (texte ou case MathLive) */
export function inlineNodesHaveBlanks(
	children: InlineNode[],
	capitalPairs?: CapitalPairs
): boolean {
	return children.some(
		(child) =>
			child.type === 'blank' ||
			(child.type === 'math-inline' && hasPrompts(child.expression, child.syntax, capitalPairs))
	);
}

/**
 * Éléments en ligne d'une cellule de tableau.
 *
 * Le parseur garde la cellule en chaîne (`TableCellNode.content`) ; la relire
 * comme un paragraphe donne les mêmes nœuds que dans le texte de l'énoncé
 * (`\placeholder[N]{}` → math-inline, `{{blank:N}}` → blank), donc les mêmes
 * composants de saisie. Une cellule qui ne se lit pas comme un paragraphe
 * (cas dégénéré) ne rend aucun nœud.
 */
export function tableCellInlineNodes(content: string): InlineNode[] {
	const [first] = parseMarkdown(content).children;
	return first?.type === 'paragraph' ? first.children : [];
}

/** Vrai si la cellule contient au moins un trou */
export function cellHasBlanks(content: string, capitalPairs?: CapitalPairs): boolean {
	// Filtre rapide : sans `\placeholder`, `{{blank:` ni `?` (trou d'une formule `~…~`),
	// pas de trou — évite de relire chaque cellule de chaque tableau
	if (!/placeholder|\{\{blank:|\?/.test(content)) return false;
	return inlineNodesHaveBlanks(tableCellInlineNodes(content), capitalPairs);
}

/** Vrai si une cellule du tableau (en-tête compris) contient un trou */
export function tableHasBlanks(node: TableNode, capitalPairs?: CapitalPairs): boolean {
	return [node.header, ...node.rows].some((row) =>
		row.some((cell) => cellHasBlanks(cell.content, capitalPairs))
	);
}
