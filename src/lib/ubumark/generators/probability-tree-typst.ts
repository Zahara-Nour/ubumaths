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
// These match the SVG component's layout logic
const NODE_LABEL_WIDTH = 0.8; // Width reserved for event labels at each node
const LEAF_LABEL_GAP = 0.15; // Extra gap between branch end and leaf event label
const OUTCOME_OFFSET_X = 0.5; // Horizontal offset for outcome labels after event label
const PROBABILITY_LABEL_OFFSET_Y = 0.25; // Perpendicular offset for probability (above line)

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

	// Generate root label if present and non-empty (positioned at root node)
	if (root.label) {
		const rootPos = positions.get(root.id);
		if (rootPos) {
			const label = formatTypstMath(root.label);
			// Only generate label if non-empty after processing
			// Negate Y to match Typst canvas coordinate system
			// Center the label in the NODE_LABEL_WIDTH space
			if (label.trim()) {
				lines.push(`  content((${rootPos.x + NODE_LABEL_WIDTH / 2}, ${-rootPos.y}), $${label}$)`);
			}
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
 *
 * Layout follows the reference SVG component:
 * - Branch lines START after parent's event label space (parentPos.x + NODE_LABEL_WIDTH)
 * - Branch lines END at child position (childPos.x)
 * - Event labels are centered in the NODE_LABEL_WIDTH space at child position
 * - Probability labels ABOVE the branch line (perpendicular offset)
 * - Y axis is negated to match Typst canvas (Y up) vs SVG (Y down)
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

		// Negate Y to convert from SVG coordinates (Y down) to Typst canvas (Y up)
		const parentY = -parentPos.y;
		const childY = -childPos.y;

		// Branch starts AFTER parent's event label, ends at child position
		const branchStartX = parentPos.x + NODE_LABEL_WIDTH;
		const branchEndX = childPos.x;

		// Draw line (leaving space for event labels)
		lines.push(`  line((${branchStartX}, ${parentY}), (${branchEndX}, ${childY}))`);

		// Calculate mid-point for probability label (based on actual line, not node positions)
		const midX = (branchStartX + branchEndX) / 2;
		const midY = (parentY + childY) / 2;

		// Calculate perpendicular offset for probability label (above line)
		// Vector from branch start to end
		const dx = branchEndX - branchStartX;
		const dy = childY - parentY;
		const length = Math.sqrt(dx * dx + dy * dy);
		// Normal vector (perpendicular, pointing "above" the line)
		// For a vector (dx, dy), the perpendicular is (-dy, dx) normalized
		const normalX = -dy / length;
		const normalY = dx / length;
		// Position probability label above the line
		const probX = midX + normalX * PROBABILITY_LABEL_OFFSET_Y;
		const probY = midY + normalY * PROBABILITY_LABEL_OFFSET_Y;

		// Probability label (above line, perpendicular offset)
		const probLabel = formatTypstMath(branch.probability.display);
		lines.push(
			`  content((${probX.toFixed(2)}, ${probY.toFixed(2)}), text(size: 0.8em)[$${probLabel}$])`
		);

		// Event label at child position (centered in NODE_LABEL_WIDTH space)
		// Add extra gap for leaf nodes to avoid labels being too close to branch ends
		const eventLabel = formatTypstMath(branch.eventLabel);
		const leafGap = branch.child.isLeaf ? LEAF_LABEL_GAP : 0;
		const eventLabelX = childPos.x + leafGap + NODE_LABEL_WIDTH / 2;
		lines.push(`  content((${eventLabelX}, ${childY}), $${eventLabel}$)`);

		// Outcome at leaf (positioned to the right of event label space)
		if (showOutcomes && branch.child.isLeaf && branch.child.outcome) {
			const outcomeLabel = formatTypstMath(branch.child.outcome);
			lines.push(
				`  content((${childPos.x + NODE_LABEL_WIDTH + OUTCOME_OFFSET_X}, ${childY}), text(size: 0.85em)[$${outcomeLabel}$])`
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
 * Convert decimal numbers to French notation for Typst math mode.
 * Uses Typst string comma "," for proper decimal display.
 *
 * @example
 * "0.85" → "0\",\"85"
 * "3.14159" → "3\",\"14159"
 *
 * @param text - Text containing decimal numbers
 * @returns Text with decimals converted to French format
 */
function toFrenchDecimalTypst(text: string): string {
	// Match decimal numbers (digits with decimal point)
	// Pattern: integer part (optional), decimal point, decimal part
	return text.replace(/(\d+)\.(\d+)/g, '$1","$2');
}

/**
 * Format expression for Typst math mode
 *
 * Handles:
 * - LaTeX command conversion
 * - French decimal notation (0.85 → 0","85)
 * - Dollar sign stripping
 *
 * @param expr - Expression (may contain LaTeX)
 * @returns Typst math expression
 */
function formatTypstMath(expr: string): string {
	// Strip surrounding $...$ delimiters if present (they'll be added by the generator)
	let result = expr.trim();
	if (result.startsWith('$') && result.endsWith('$')) {
		result = result.slice(1, -1);
	}

	// Handle infinity shorthand
	result = result
		.replace(/\+inf/g, '+infinity')
		.replace(/-inf/g, '-infinity')
		.replace(/^inf$/g, 'infinity');

	// Convert decimal numbers to French notation BEFORE LaTeX conversion
	// This ensures "0.85" becomes "0","85" in Typst
	result = toFrenchDecimalTypst(result);

	// Convert any LaTeX commands to Typst
	result = convertLatexToTypstMath(result);

	return result;
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { ProbTreeTypstOptions };
