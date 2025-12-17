/**
 * Probability Tree Parser - Parse Weighted Probability Trees
 * ===========================================================
 *
 * This module parses markdown probability tree blocks with support for:
 * - Flexible tree structure (unlimited depth and branches)
 * - Multiple probability formats (fraction, decimal, symbolic, LaTeX)
 * - Optional outcomes at leaf nodes
 * - LaTeX in event labels
 *
 * Syntax:
 * ```probtree
 * root: Urne
 * outcomes: true
 *
 * Rouge:3/5
 *   Rouge:2/4, P(RR)=6/20
 *   Bleue:2/4, P(RB)=6/20
 * Bleue:2/5
 *   Rouge:3/4, P(BR)=6/20
 *   Bleue:1/4, P(BB)=2/20
 * ```
 *
 * @module custom-markdown/parser/probability-tree-parser
 */

import type {
	ProbabilityTreeNode,
	ProbTreeNode,
	ProbTreeBranch,
	ProbabilityValue,
	ProbTreeConfig,
	ProbTreeParseError,
	ProbTreeParseWarning,
	ProbTreeParseResult,
	ProbTreeBlockRange
} from '../types/probability-tree';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Regex to identify probtree block start: ```probtree
 */
const PROBTREE_BLOCK_START_REGEX = /^```probtree\s*$/;

/**
 * Regex to identify block end: ```
 */
const BLOCK_END_REGEX = /^```\s*$/;

/**
 * Regex to parse root label: root: Label
 */
const ROOT_REGEX = /^\s*root\s*:\s*(.+?)\s*$/;

/**
 * Regex to parse outcomes config: outcomes: true/false
 */
const OUTCOMES_REGEX = /^\s*outcomes\s*:\s*(true|false)\s*$/i;

/**
 * Regex to parse branch line with optional outcome
 * Format: event:probability[, outcome]
 * Supports spaces around colon
 */
const BRANCH_REGEX = /^(\s*)(.+?)\s*:\s*([^,]+?)(?:\s*,\s*(.+?))?\s*$/;

/**
 * Regex to detect simple fraction: 1/2, 3/5, etc.
 */
const FRACTION_REGEX = /^(\d+)\s*\/\s*(\d+)$/;

/**
 * Regex to detect LaTeX fraction: \frac{1}{3}
 */
const LATEX_FRACTION_REGEX = /^\\frac\{(\d+)\}\{(\d+)\}$/;

/**
 * Regex to detect decimal number: 0.5, .333, 1, etc.
 */
const DECIMAL_REGEX = /^-?\d*\.?\d+$/;

/**
 * Indentation size (spaces per level)
 */
export const INDENT_SIZE = 2;

// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================

/**
 * Check if a line is the start of a probtree block
 */
export function isProbTreeBlockStart(line: string): boolean {
	return PROBTREE_BLOCK_START_REGEX.test(line);
}

/**
 * Check if a line is the end of a code block
 */
export function isBlockEnd(line: string): boolean {
	return BLOCK_END_REGEX.test(line) && !PROBTREE_BLOCK_START_REGEX.test(line);
}

/**
 * Find all probtree blocks in a list of lines
 */
export function findProbTreeBlocks(lines: string[]): ProbTreeBlockRange[] {
	const blocks: ProbTreeBlockRange[] = [];
	let i = 0;

	while (i < lines.length) {
		if (isProbTreeBlockStart(lines[i])) {
			const startIndex = i;
			i++;

			// Find the end of the block
			while (i < lines.length && !isBlockEnd(lines[i])) {
				i++;
			}

			const endIndex = i < lines.length ? i : lines.length - 1;
			blocks.push({ startIndex, endIndex });
		}
		i++;
	}

	return blocks;
}

// ============================================================================
// PROBABILITY PARSING
// ============================================================================

/**
 * Parse a probability string into a ProbabilityValue
 */
export function parseProbability(probStr: string): ProbabilityValue {
	const trimmed = probStr.trim();

	// Try simple fraction: 1/2, 3/5
	const fractionMatch = trimmed.match(FRACTION_REGEX);
	if (fractionMatch) {
		const numerator = parseInt(fractionMatch[1], 10);
		const denominator = parseInt(fractionMatch[2], 10);
		return {
			display: trimmed,
			numeric: denominator !== 0 ? numerator / denominator : null,
			format: 'fraction'
		};
	}

	// Try LaTeX fraction: \frac{1}{3}
	const latexFractionMatch = trimmed.match(LATEX_FRACTION_REGEX);
	if (latexFractionMatch) {
		const numerator = parseInt(latexFractionMatch[1], 10);
		const denominator = parseInt(latexFractionMatch[2], 10);
		return {
			display: trimmed,
			numeric: denominator !== 0 ? numerator / denominator : null,
			format: 'fraction'
		};
	}

	// Try decimal: 0.5, 1, .333
	if (DECIMAL_REGEX.test(trimmed)) {
		return {
			display: trimmed,
			numeric: parseFloat(trimmed),
			format: 'decimal'
		};
	}

	// Default to symbolic (P(A), P(A|B), etc.)
	return {
		display: trimmed,
		numeric: null,
		format: 'symbolic'
	};
}

// ============================================================================
// TREE CONSTRUCTION
// ============================================================================

interface ParsedBranchLine {
	indent: number;
	eventLabel: string;
	probability: ProbabilityValue;
	outcome?: string;
}

/**
 * Parse a single branch line
 */
function parseBranchLine(line: string, lineNum: number): ParsedBranchLine | ProbTreeParseError {
	const match = line.match(BRANCH_REGEX);

	if (!match) {
		return {
			message: 'Invalid branch format: missing probability separator (:)',
			line: lineNum,
			content: line
		};
	}

	const [, indentStr, eventLabel, probStr, outcome] = match;
	const indent = indentStr.length;

	// Validate indentation
	if (indent % INDENT_SIZE !== 0) {
		return {
			message: `Invalid indentation: ${indent} spaces (must be multiple of ${INDENT_SIZE})`,
			line: lineNum,
			content: line
		};
	}

	return {
		indent,
		eventLabel: eventLabel.trim(),
		probability: parseProbability(probStr),
		outcome: outcome?.trim()
	};
}

/**
 * Build tree recursively from parsed branch lines
 */
function buildTree(
	lines: ParsedBranchLine[],
	startIdx: number,
	parentIndent: number,
	depth: number,
	nodeCounter: { value: number }
): { node: ProbTreeNode; nextIdx: number; errors: ProbTreeParseError[] } {
	const errors: ProbTreeParseError[] = [];
	const branches: ProbTreeBranch[] = [];
	let i = startIdx;

	while (i < lines.length) {
		const line = lines[i];
		const expectedIndent = parentIndent + INDENT_SIZE;

		// Line belongs to parent level or above - stop
		if (line.indent <= parentIndent && i > startIdx) {
			break;
		}

		// Line belongs to this level
		if (line.indent === expectedIndent || (parentIndent === -INDENT_SIZE && line.indent === 0)) {
			const childNodeId = `node-${depth + 1}-${nodeCounter.value++}`;

			// Look ahead to see if this node has children
			const nextIdx = i + 1;
			const hasChildren = nextIdx < lines.length && lines[nextIdx].indent > line.indent;

			let childNode: ProbTreeNode;
			let nextLineIdx = nextIdx;

			if (hasChildren) {
				// Validate that children are exactly one level deeper
				if (lines[nextIdx].indent !== line.indent + INDENT_SIZE) {
					errors.push({
						message: `Orphan branch: skips indentation level`,
						line: nextIdx + 1,
						content: `indent ${lines[nextIdx].indent} after ${line.indent}`
					});
				}

				const result = buildTree(lines, nextIdx, line.indent, depth + 1, nodeCounter);
				childNode = result.node;
				childNode.id = childNodeId;
				childNode.depth = depth + 1;
				nextLineIdx = result.nextIdx;
				errors.push(...result.errors);
			} else {
				// Leaf node
				childNode = {
					id: childNodeId,
					outcome: line.outcome,
					branches: [],
					depth: depth + 1,
					isLeaf: true
				};
			}

			branches.push({
				eventLabel: line.eventLabel,
				probability: line.probability,
				child: childNode
			});

			i = nextLineIdx;
		} else if (line.indent > expectedIndent) {
			// Skip lines that are too indented (they belong to a child)
			i++;
		} else {
			// Line is less indented than expected - should not happen at this level
			break;
		}
	}

	const node: ProbTreeNode = {
		id: `node-${depth}-temp`,
		branches,
		depth,
		isLeaf: branches.length === 0
	};

	return { node, nextIdx: i, errors };
}

// ============================================================================
// CONTENT PARSING
// ============================================================================

/**
 * Parse the content of a probtree block (without the ``` markers)
 */
export function parseProbTreeContent(lines: string[]): ProbTreeParseResult {
	const errors: ProbTreeParseError[] = [];
	const warnings: ProbTreeParseWarning[] = [];

	if (lines.length === 0) {
		return {
			node: null,
			errors: [{ message: 'Empty probtree block' }],
			warnings: []
		};
	}

	// Parse configuration
	const config: ProbTreeConfig = {
		rootLabel: '',
		showOutcomes: false
	};

	const branchLines: ParsedBranchLine[] = [];
	let lineNum = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		lineNum = i + 1;

		// Skip empty lines
		if (line.trim() === '') {
			continue;
		}

		// Try to parse as root config
		const rootMatch = line.match(ROOT_REGEX);
		if (rootMatch) {
			config.rootLabel = rootMatch[1];
			continue;
		}

		// Try to parse as outcomes config
		const outcomesMatch = line.match(OUTCOMES_REGEX);
		if (outcomesMatch) {
			config.showOutcomes = outcomesMatch[1].toLowerCase() === 'true';
			continue;
		}

		// Must be a branch line
		const parsed = parseBranchLine(line, lineNum);

		if ('message' in parsed) {
			errors.push(parsed);
		} else {
			branchLines.push(parsed);
		}
	}

	// If we have errors, return early
	if (errors.length > 0) {
		return { node: null, errors, warnings };
	}

	// If no branch lines, error
	if (branchLines.length === 0) {
		return {
			node: null,
			errors: [{ message: 'No branches defined in probtree block' }],
			warnings
		};
	}

	// Build the tree
	const nodeCounter = { value: 0 };
	const rootId = `node-0-${nodeCounter.value++}`;

	const { node: rootNode, errors: buildErrors } = buildTree(
		branchLines,
		0,
		-INDENT_SIZE,
		0,
		nodeCounter
	);

	errors.push(...buildErrors);

	if (errors.length > 0) {
		return { node: null, errors, warnings };
	}

	// Set root node properties
	rootNode.id = rootId;
	rootNode.label = config.rootLabel;
	rootNode.depth = 0;
	rootNode.isLeaf = rootNode.branches.length === 0;

	// Check probability sums
	checkProbabilitySums(rootNode, warnings);

	// Calculate metadata
	const maxDepth = calculateMaxDepth(rootNode);
	const leafCount = calculateLeafCount(rootNode);

	const result: ProbabilityTreeNode = {
		type: 'probability-tree',
		root: rootNode,
		config,
		maxDepth,
		leafCount
	};

	return { node: result, errors: [], warnings };
}

/**
 * Check if probabilities sum to 1 at each node
 */
function checkProbabilitySums(node: ProbTreeNode, warnings: ProbTreeParseWarning[]): void {
	if (node.branches.length === 0) return;

	let sum = 0;
	let allNumeric = true;

	for (const branch of node.branches) {
		if (branch.probability.numeric !== null) {
			sum += branch.probability.numeric;
		} else {
			allNumeric = false;
		}
	}

	if (allNumeric && Math.abs(sum - 1) > 0.001) {
		warnings.push({
			message: `Probabilities do not sum to 1 at node ${node.id} (sum = ${sum.toFixed(4)})`,
			context: node.branches.map((b) => b.probability.display).join(' + ')
		});
	}

	// Recurse
	for (const branch of node.branches) {
		checkProbabilitySums(branch.child, warnings);
	}
}

/**
 * Calculate maximum depth of tree
 */
function calculateMaxDepth(node: ProbTreeNode): number {
	if (node.branches.length === 0) {
		return node.depth;
	}

	let maxChildDepth = node.depth;
	for (const branch of node.branches) {
		const childDepth = calculateMaxDepth(branch.child);
		if (childDepth > maxChildDepth) {
			maxChildDepth = childDepth;
		}
	}

	return maxChildDepth;
}

/**
 * Calculate number of leaf nodes
 */
function calculateLeafCount(node: ProbTreeNode): number {
	if (node.branches.length === 0) {
		return 1;
	}

	let count = 0;
	for (const branch of node.branches) {
		count += calculateLeafCount(branch.child);
	}

	return count;
}

// ============================================================================
// BLOCK PARSING
// ============================================================================

/**
 * Parse a probtree block from lines array with start/end indices
 */
export function parseProbabilityTree(
	lines: string[],
	startIndex: number,
	endIndex: number
): ProbTreeParseResult {
	// Extract content lines (skip ``` markers)
	const contentLines = lines.slice(startIndex + 1, endIndex);

	return parseProbTreeContent(contentLines);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get maximum depth of a parsed tree
 */
export function getMaxDepth(node: ProbabilityTreeNode): number {
	return node.maxDepth;
}

/**
 * Get number of leaf nodes in a parsed tree
 */
export function getLeafCount(node: ProbabilityTreeNode): number {
	return node.leafCount;
}
