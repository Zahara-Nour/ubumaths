/**
 * Probability Tree Typst Generator - Convert probability trees to CeTZ
 * ====================================================================
 *
 * Generates Typst code using the CeTZ (Canvas Extensions for Typst) package
 * for weighted probability trees.
 *
 * Features:
 * - Horizontal tree layout (root left, leaves right)
 * - Event labels on branches
 * - Probabilities on branches
 * - Optional outcomes column at leaves
 * - Math expressions converted from LaTeX to Typst
 *
 * @module ubumark/generators/probability-tree-typst
 */

import type { ProbabilityTreeNode, ProbTreeNode } from '../types/probability-tree';
import { convertLatexToTypstMath } from './typst-generator';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface ProbTreeTypstOptions {
	/** Horizontal spacing between levels (default: 3) */
	levelSpacing?: number;
	/** Vertical spacing between siblings (default: 1.5) */
	siblingSpacing?: number;
}

const DEFAULT_OPTIONS: Required<ProbTreeTypstOptions> = {
	levelSpacing: 3,
	siblingSpacing: 1.5
};

// Layout constants for label positioning
const LABEL_OFFSET_X = 0.5; // Horizontal offset for root/outcome labels
const EVENT_LABEL_OFFSET_Y = 0.3; // Vertical offset above branch midpoint
const PROBABILITY_LABEL_OFFSET_Y = -0.3; // Vertical offset below branch midpoint

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

/**
 * Generate Typst code for a probability tree using CeTZ
 *
 * @param node - Probability tree AST node
 * @param options - Generator options
 * @returns Typst code string
 *
 * @example
 * ```typescript
 * const typst = generateProbabilityTreeTypst(treeNode);
 * // Returns CeTZ code for the probability tree
 * ```
 */
export function generateProbabilityTreeTypst(
	node: ProbabilityTreeNode,
	options: ProbTreeTypstOptions = {}
): string {
	const opts = { ...DEFAULT_OPTIONS, ...options };

	// Validate input
	if (!node.root || node.root.branches.length === 0) {
		return '// Error: Probability tree has no branches';
	}

	try {
		const importStatement = '#import "@preview/cetz:0.3.0"\n\n';

		// Calculate positions and generate tree
		const treeData = generateTreeData(node.root, node.config.showOutcomes, opts);

		return `${importStatement}#cetz.canvas({
  import cetz.draw: *

  // Styles
  set-style(
    content: (padding: 0.1),
    stroke: black
  )

${treeData}
})`;
	} catch (error) {
		return `// Error: ${error instanceof Error ? error.message : 'Failed to generate probability tree'}`;
	}
}

// ============================================================================
// TREE DATA GENERATION
// ============================================================================

interface NodePosition {
	x: number;
	y: number;
}

/**
 * Generate the complete tree drawing code
 */
function generateTreeData(
	root: ProbTreeNode,
	showOutcomes: boolean,
	opts: Required<ProbTreeTypstOptions>
): string {
	const positions = new Map<string, NodePosition>();
	const lines: string[] = [];

	// Calculate positions (similar to SVG component)
	calculatePositions(root, 0, 0, positions, opts);

	// Generate root label if present (positioned to the left of root node)
	if (root.label) {
		const rootPos = positions.get(root.id);
		if (rootPos) {
			const label = formatTypstMath(root.label);
			lines.push(`  content((${rootPos.x - LABEL_OFFSET_X}, ${rootPos.y}), $${label}$)`);
		}
	}

	// Generate branches recursively
	generateBranches(root, positions, showOutcomes, lines, opts);

	return lines.join('\n');
}

/**
 * Calculate node positions (depth-first)
 */
function calculatePositions(
	node: ProbTreeNode,
	x: number,
	yStart: number,
	positions: Map<string, NodePosition>,
	opts: Required<ProbTreeTypstOptions>
): number {
	const subtreeHeight = getSubtreeHeight(node, opts.siblingSpacing);

	if (node.isLeaf) {
		const y = yStart + subtreeHeight / 2;
		positions.set(node.id, { x, y });
		return subtreeHeight;
	}

	let currentY = yStart;
	let minChildY = Infinity;
	let maxChildY = -Infinity;

	for (const branch of node.branches) {
		const childHeight = calculatePositions(
			branch.child,
			x + opts.levelSpacing,
			currentY,
			positions,
			opts
		);
		const childPos = positions.get(branch.child.id);
		if (childPos) {
			minChildY = Math.min(minChildY, childPos.y);
			maxChildY = Math.max(maxChildY, childPos.y);
		}
		currentY += childHeight;
	}

	// Center parent between children
	const y = (minChildY + maxChildY) / 2;
	positions.set(node.id, { x, y });

	return subtreeHeight;
}

/**
 * Calculate subtree height
 */
function getSubtreeHeight(node: ProbTreeNode, siblingSpacing: number): number {
	if (node.isLeaf) {
		return siblingSpacing;
	}
	let totalHeight = 0;
	for (const branch of node.branches) {
		totalHeight += getSubtreeHeight(branch.child, siblingSpacing);
	}
	return totalHeight;
}

/**
 * Generate branch lines and labels
 */
function generateBranches(
	node: ProbTreeNode,
	positions: Map<string, NodePosition>,
	showOutcomes: boolean,
	lines: string[],
	opts: Required<ProbTreeTypstOptions>
): void {
	const parentPos = positions.get(node.id);
	if (!parentPos) return;

	for (const branch of node.branches) {
		const childPos = positions.get(branch.child.id);
		if (!childPos) continue;

		// Draw line
		lines.push(`  line((${parentPos.x}, ${parentPos.y}), (${childPos.x}, ${childPos.y}))`);

		// Calculate mid-point for labels
		const midX = (parentPos.x + childPos.x) / 2;
		const midY = (parentPos.y + childPos.y) / 2;

		// Event label (above line)
		const eventLabel = formatTypstMath(branch.eventLabel);
		lines.push(`  content((${midX}, ${midY + EVENT_LABEL_OFFSET_Y}), $${eventLabel}$)`);

		// Probability label (below line)
		const probLabel = formatTypstMath(branch.probability.display);
		lines.push(
			`  content((${midX}, ${midY + PROBABILITY_LABEL_OFFSET_Y}), text(size: 0.8em)[$${probLabel}$])`
		);

		// Outcome at leaf (positioned to the right of leaf node)
		if (showOutcomes && branch.child.isLeaf && branch.child.outcome) {
			const outcomeLabel = formatTypstMath(branch.child.outcome);
			lines.push(
				`  content((${childPos.x + LABEL_OFFSET_X}, ${childPos.y}), text(size: 0.85em)[$${outcomeLabel}$])`
			);
		}

		// Recurse for children
		generateBranches(branch.child, positions, showOutcomes, lines, opts);
	}
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Format expression for Typst math mode
 *
 * @param expr - Expression (may contain LaTeX)
 * @returns Typst math expression
 */
function formatTypstMath(expr: string): string {
	// Handle infinity shorthand
	let result = expr
		.replace(/\+inf/g, '+infinity')
		.replace(/-inf/g, '-infinity')
		.replace(/^inf$/g, 'infinity');

	// Convert any LaTeX commands to Typst
	result = convertLatexToTypstMath(result);

	return result;
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { ProbTreeTypstOptions };
