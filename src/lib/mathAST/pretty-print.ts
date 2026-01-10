/**
 * MathAST Pretty Printer
 *
 * Generates a human-readable tree representation of MathAST nodes.
 * Supports ANSI color output for terminal debugging.
 */

import type {
	MathNode,
	NodeMetadata,
	AdditionNode,
	SubtractionNode,
	MultiplicationNode,
	DivisionNode,
	OppositeNode,
	PositiveNode,
	FunctionNode,
	DelimiterNode,
	RelationNode,
	UnitNode,
	MatrixNode,
	CompositionNode
} from './types';
import { format as formatUnit } from './units/formatter';

// =============================================================================
// Types
// =============================================================================

export interface PrettyPrintOptions {
	/** Enable ANSI color output (default: true) */
	readonly colors?: boolean;
	/** Initial indentation level (default: 0) */
	readonly indent?: number;
}

// =============================================================================
// ANSI Color Codes
// =============================================================================

const ANSI = {
	reset: '\x1b[0m',
	bold: '\x1b[1m',
	italic: '\x1b[3m',
	// Named colors
	black: '\x1b[30m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
	cyan: '\x1b[36m',
	white: '\x1b[37m',
	gray: '\x1b[90m',
	// Bright variants
	brightRed: '\x1b[91m',
	brightGreen: '\x1b[92m',
	brightYellow: '\x1b[93m',
	brightBlue: '\x1b[94m',
	brightMagenta: '\x1b[95m',
	brightCyan: '\x1b[96m',
	brightWhite: '\x1b[97m'
} as const;

// Map color names to ANSI codes
const COLOR_MAP: Record<string, string> = {
	black: ANSI.black,
	red: ANSI.red,
	green: ANSI.green,
	yellow: ANSI.yellow,
	blue: ANSI.blue,
	magenta: ANSI.magenta,
	purple: ANSI.magenta,
	cyan: ANSI.cyan,
	white: ANSI.white,
	gray: ANSI.gray,
	grey: ANSI.gray,
	orange: ANSI.yellow, // Approximate
	pink: ANSI.brightMagenta
};

/**
 * Convert a color string to ANSI escape code
 */
function colorToAnsi(color: string): string {
	// Check named colors
	const lower = color.toLowerCase();
	if (COLOR_MAP[lower]) {
		return COLOR_MAP[lower];
	}

	// Handle hex colors (#RGB or #RRGGBB) using 256-color mode approximation
	if (color.startsWith('#')) {
		const hex = color.slice(1);
		let r: number, g: number, b: number;

		if (hex.length === 3) {
			r = parseInt(hex[0] + hex[0], 16);
			g = parseInt(hex[1] + hex[1], 16);
			b = parseInt(hex[2] + hex[2], 16);
		} else if (hex.length === 6) {
			r = parseInt(hex.slice(0, 2), 16);
			g = parseInt(hex.slice(2, 4), 16);
			b = parseInt(hex.slice(4, 6), 16);
		} else {
			return ''; // Invalid hex
		}

		// Use 24-bit true color (supported by most modern terminals)
		return `\x1b[38;2;${r};${g};${b}m`;
	}

	return ''; // Unknown color
}

// =============================================================================
// Tree Characters
// =============================================================================

const TREE = {
	branch: '├─ ',
	last: '└─ ',
	pipe: '│  ',
	space: '   '
} as const;

// =============================================================================
// Internal Context
// =============================================================================

interface PrintContext {
	colors: boolean;
	lines: string[];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format metadata as a suffix string: [red, bold]
 */
function formatMetadataSuffix(metadata: NodeMetadata | undefined): string {
	if (!metadata) return '';

	const parts: string[] = [];
	if (metadata.color) parts.push(metadata.color);
	if (metadata.style && metadata.style !== 'normal') parts.push(metadata.style);
	if (metadata.annotation) parts.push(`"${metadata.annotation}"`);

	return parts.length > 0 ? ` [${parts.join(', ')}]` : '';
}

/**
 * Format extended metadata (operatorMetadata, relationMetadata, etc.)
 */
function formatExtendedMetadata(label: string, metadata: NodeMetadata | undefined): string {
	if (!metadata) return '';

	const parts: string[] = [];
	if (metadata.color) parts.push(metadata.color);
	if (metadata.style && metadata.style !== 'normal') parts.push(metadata.style);

	return parts.length > 0 ? ` ${label}:[${parts.join(', ')}]` : '';
}

/**
 * Apply ANSI color to text based on metadata
 */
function colorize(text: string, metadata: NodeMetadata | undefined, ctx: PrintContext): string {
	if (!ctx.colors || !metadata?.color) return text;

	const ansiColor = colorToAnsi(metadata.color);
	if (!ansiColor) return text;

	let result = ansiColor;

	// Apply style
	if (metadata.style === 'bold') {
		result += ANSI.bold;
	} else if (metadata.style === 'italic') {
		result += ANSI.italic;
	}

	return result + text + ANSI.reset;
}

/**
 * Generate a single line with proper prefix
 */
function addLine(
	ctx: PrintContext,
	prefix: string,
	content: string,
	metadata?: NodeMetadata
): void {
	const coloredContent = colorize(content, metadata, ctx);
	const suffix = formatMetadataSuffix(metadata);
	ctx.lines.push(prefix + coloredContent + suffix);
}

/**
 * Recursively print a node and its children
 */
function printNode(node: MathNode, ctx: PrintContext, prefix: string, childPrefix: string): void {
	switch (node.type) {
		// =========================================================================
		// Literals
		// =========================================================================
		case 'number':
			addLine(ctx, prefix, `Number: ${node.value}`, node.metadata);
			break;

		case 'variable':
			addLine(ctx, prefix, `Variable: ${node.name}`, node.metadata);
			break;

		case 'greek':
			addLine(ctx, prefix, `Greek: ${node.letter}`, node.metadata);
			break;

		case 'symbol':
			addLine(ctx, prefix, `Symbol: ${node.symbol}`, node.metadata);
			break;

		case 'hole':
			addLine(ctx, prefix, `Hole: ?${node.index}`, node.metadata);
			break;

		// =========================================================================
		// Binary Operations
		// =========================================================================
		case 'addition':
			printBinaryOp(node, 'Addition', ctx, prefix, childPrefix);
			break;

		case 'subtraction':
			printBinaryOp(node, 'Subtraction', ctx, prefix, childPrefix);
			break;

		case 'multiplication':
			printMultiplication(node, ctx, prefix, childPrefix);
			break;

		case 'division':
			printDivision(node, ctx, prefix, childPrefix);
			break;

		// =========================================================================
		// Unary Operations
		// =========================================================================
		case 'opposite':
			printUnaryOp(node, 'Opposite', ctx, prefix, childPrefix);
			break;

		case 'positive':
			printUnaryOp(node, 'Positive', ctx, prefix, childPrefix);
			break;

		// =========================================================================
		// Function
		// =========================================================================
		case 'function':
			printFunction(node, ctx, prefix, childPrefix);
			break;

		// =========================================================================
		// Structural
		// =========================================================================
		case 'delimiter':
			printDelimiter(node, ctx, prefix, childPrefix);
			break;

		case 'subscript': {
			addLine(ctx, prefix, 'Subscript', node.metadata);
			const subChildren = [
				{ label: 'base', node: node.base },
				{ label: 'subscript', node: node.subscript }
			];
			printChildren(subChildren, ctx, childPrefix);
			break;
		}

		case 'superscript': {
			addLine(ctx, prefix, 'Superscript', node.metadata);
			const supChildren = [
				{ label: 'base', node: node.base },
				{ label: 'exponent', node: node.superscript }
			];
			printChildren(supChildren, ctx, childPrefix);
			break;
		}

		// =========================================================================
		// Relation
		// =========================================================================
		case 'relation':
			printRelation(node, ctx, prefix, childPrefix);
			break;

		// =========================================================================
		// Unit
		// =========================================================================
		case 'unit':
			printUnit(node, ctx, prefix, childPrefix);
			break;

		// =========================================================================
		// Composition
		// =========================================================================
		case 'composition':
			printComposition(node, ctx, prefix, childPrefix);
			break;

		// =========================================================================
		// Matrix
		// =========================================================================
		case 'matrix':
			printMatrix(node, ctx, prefix, childPrefix);
			break;

		// =========================================================================
		// Complex
		// =========================================================================
		case 'complex': {
			addLine(ctx, prefix, 'Complex', node.metadata);
			const children = [
				{ label: 'real', node: node.real },
				{ label: 'imaginary', node: node.imaginary }
			];
			printChildren(children, ctx, childPrefix);
			break;
		}

		// =========================================================================
		// Infinity
		// =========================================================================
		case 'infinity': {
			const sign = node.sign === 'positive' ? '+∞' : '-∞';
			addLine(ctx, prefix, `Infinity(${sign})`, node.metadata);
			break;
		}

		// =========================================================================
		// Limit
		// =========================================================================
		case 'limit': {
			let header = 'Limit';
			header += ` [${node.variable} → ${node.direction}]`;
			addLine(ctx, prefix, header, node.metadata);
			const children = [
				{ label: 'approach', node: node.approach },
				{ label: 'expression', node: node.expression }
			];
			printChildren(children, ctx, childPrefix);
			break;
		}

		default: {
			// Exhaustive check
			const _exhaustive: never = node;
			throw new Error(`Unknown node type: ${(_exhaustive as MathNode).type}`);
		}
	}
}

/**
 * Print binary operation node
 */
function printBinaryOp(
	node: AdditionNode | SubtractionNode,
	name: string,
	ctx: PrintContext,
	prefix: string,
	childPrefix: string
): void {
	let header = name;
	header += formatExtendedMetadata('op', node.operatorMetadata);

	addLine(ctx, prefix, header, node.metadata);

	const children = [
		{ label: 'left', node: node.left },
		{ label: 'right', node: node.right }
	];
	printChildren(children, ctx, childPrefix);
}

/**
 * Print multiplication node with display style
 */
function printMultiplication(
	node: MultiplicationNode,
	ctx: PrintContext,
	prefix: string,
	childPrefix: string
): void {
	let header = `Multiplication [${node.displayStyle}]`;
	header += formatExtendedMetadata('op', node.operatorMetadata);

	addLine(ctx, prefix, header, node.metadata);

	const children = [
		{ label: 'left', node: node.left },
		{ label: 'right', node: node.right }
	];
	printChildren(children, ctx, childPrefix);
}

/**
 * Print division node with display style
 */
function printDivision(
	node: DivisionNode,
	ctx: PrintContext,
	prefix: string,
	childPrefix: string
): void {
	let header = `Division [${node.displayStyle}]`;
	header += formatExtendedMetadata('op', node.operatorMetadata);

	addLine(ctx, prefix, header, node.metadata);

	const children = [
		{ label: 'numerator', node: node.numerator },
		{ label: 'denominator', node: node.denominator }
	];
	printChildren(children, ctx, childPrefix);
}

/**
 * Print unary operation node
 */
function printUnaryOp(
	node: OppositeNode | PositiveNode,
	name: string,
	ctx: PrintContext,
	prefix: string,
	childPrefix: string
): void {
	let header = name;
	header += formatExtendedMetadata('op', node.operatorMetadata);

	addLine(ctx, prefix, header, node.metadata);

	printNode(node.operand, ctx, childPrefix + TREE.last, childPrefix + TREE.space);
}

/**
 * Print function node
 */
function printFunction(
	node: FunctionNode,
	ctx: PrintContext,
	prefix: string,
	childPrefix: string
): void {
	let header = `Function: ${node.name}`;

	// Extended metadata
	header += formatExtendedMetadata('name', node.nameMetadata);
	header += formatExtendedMetadata('delim', node.delimiterMetadata);
	header += formatExtendedMetadata('leftDelim', node.leftDelimiterMetadata);
	header += formatExtendedMetadata('rightDelim', node.rightDelimiterMetadata);

	addLine(ctx, prefix, header, node.metadata);

	// Collect children: args + optional power + optional base
	const children: { label: string; node: MathNode }[] = [];

	node.args.forEach((arg, i) => {
		children.push({ label: `arg[${i}]`, node: arg });
	});

	if (node.power) {
		children.push({ label: 'power', node: node.power });
	}

	if (node.base) {
		children.push({ label: 'base', node: node.base });
	}

	printChildren(children, ctx, childPrefix);
}

/**
 * Print delimiter node
 */
function printDelimiter(
	node: DelimiterNode,
	ctx: PrintContext,
	prefix: string,
	childPrefix: string
): void {
	let header = `Delimiter [${node.delimiters}]`;

	if (node.semantic) {
		header += ` (${node.semantic})`;
	}

	// Extended metadata
	header += formatExtendedMetadata('delim', node.delimiterMetadata);
	header += formatExtendedMetadata('leftDelim', node.leftDelimiterMetadata);
	header += formatExtendedMetadata('rightDelim', node.rightDelimiterMetadata);

	addLine(ctx, prefix, header, node.metadata);

	printNode(node.content, ctx, childPrefix + TREE.last, childPrefix + TREE.space);
}

/**
 * Print relation node
 */
function printRelation(
	node: RelationNode,
	ctx: PrintContext,
	prefix: string,
	childPrefix: string
): void {
	let header = `Relation: ${node.relation}`;
	header += formatExtendedMetadata('rel', node.relationMetadata);

	addLine(ctx, prefix, header, node.metadata);

	const children = [
		{ label: 'left', node: node.left },
		{ label: 'right', node: node.right }
	];
	printChildren(children, ctx, childPrefix);
}

/**
 * Print unit node
 */
function printUnit(node: UnitNode, ctx: PrintContext, prefix: string, childPrefix: string): void {
	const unitStr = formatUnit(node.unit, 'original');
	let header = `Unit: ${unitStr}`;
	header += formatExtendedMetadata('unit', node.unitMetadata);

	addLine(ctx, prefix, header, node.metadata);

	printNode(node.expression, ctx, childPrefix + TREE.last, childPrefix + TREE.space);
}

/**
 * Print composition node
 */
function printComposition(
	node: CompositionNode,
	ctx: PrintContext,
	prefix: string,
	childPrefix: string
): void {
	let header = 'Composition';
	header += formatExtendedMetadata('op', node.operatorMetadata);

	addLine(ctx, prefix, header, node.metadata);

	const children = [
		{ label: 'outer', node: node.outer },
		{ label: 'inner', node: node.inner }
	];
	printChildren(children, ctx, childPrefix);
}

/**
 * Print matrix node
 */
function printMatrix(
	node: MatrixNode,
	ctx: PrintContext,
	prefix: string,
	childPrefix: string
): void {
	const numRows = node.rows.length;
	const numCols = node.rows[0]?.length ?? 0;
	const header = `Matrix [${numRows}x${numCols}] (${node.matrixType})`;

	addLine(ctx, prefix, header, node.metadata);

	// Print each row as a labeled group
	node.rows.forEach((row, rowIndex) => {
		const isLastRow = rowIndex === node.rows.length - 1;
		const rowBranch = isLastRow ? TREE.last : TREE.branch;
		const rowPrefix = isLastRow ? TREE.space : TREE.pipe;
		const rowLabel = `row[${rowIndex}]`;

		// Print row header
		ctx.lines.push(childPrefix + rowBranch + rowLabel);

		// Print elements in the row
		row.forEach((elem, colIndex) => {
			const isLastCol = colIndex === row.length - 1;
			const colBranch = isLastCol ? TREE.last : TREE.branch;
			const colNextPrefix = isLastCol ? TREE.space : TREE.pipe;
			const elemPrefix = childPrefix + rowPrefix + colBranch;
			const elemChildPrefix = childPrefix + rowPrefix + colNextPrefix;

			printNode(elem, ctx, elemPrefix, elemChildPrefix);
		});
	});
}

/**
 * Print a list of labeled children
 */
function printChildren(
	children: { label: string; node: MathNode }[],
	ctx: PrintContext,
	parentPrefix: string
): void {
	children.forEach((child, index) => {
		const isLast = index === children.length - 1;
		const branchChar = isLast ? TREE.last : TREE.branch;
		const nextPrefix = isLast ? TREE.space : TREE.pipe;

		// Add label line
		ctx.lines.push(parentPrefix + branchChar + child.label + ':');

		// Print child node indented under the label
		printNode(
			child.node,
			ctx,
			parentPrefix + nextPrefix + TREE.last,
			parentPrefix + nextPrefix + TREE.space
		);
	});
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Generate a pretty-printed tree representation of a MathAST node.
 *
 * @param node - The MathAST node to print
 * @param options - Printing options
 * @returns Multi-line string representation
 *
 * @example
 * ```typescript
 * const ast = MathAST.add(
 *   MathAST.number('3', { color: 'red' }),
 *   MathAST.implicitMultiply(MathAST.number('2'), MathAST.variable('x'))
 * );
 *
 * console.log(prettyPrint(ast));
 * // Output:
 * // Addition
 * // ├─ left:
 * // │  └─ Number: 3 [red]
 * // └─ right:
 * //    └─ Multiplication [implicit]
 * //       ├─ left:
 * //       │  └─ Number: 2
 * //       └─ right:
 * //          └─ Variable: x
 * ```
 */
export function prettyPrint(node: MathNode, options: PrettyPrintOptions = {}): string {
	const ctx: PrintContext = {
		colors: options.colors ?? true,
		lines: []
	};

	printNode(node, ctx, '', '');

	return ctx.lines.join('\n');
}
