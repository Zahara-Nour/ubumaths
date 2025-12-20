/**
 * Probability Tree LaTeX Generator - Convert probability trees to TikZ
 * ====================================================================
 *
 * Generates LaTeX code using TikZ for weighted probability trees.
 *
 * Features:
 * - Horizontal tree layout (root left, leaves right)
 * - Event labels above branches, probabilities below
 * - Optional outcomes column at leaves
 * - Proper LaTeX math escaping
 *
 * @module ubumark/generators/probability-tree-latex
 */

import type { ProbabilityTreeNode, ProbTreeNode, ProbTreeBranch } from '../types/probability-tree';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface ProbTreeLatexOptions {
	/** Level distance between nodes (default: 3cm) */
	levelDistance?: string;
	/** Sibling distance between branches (default: 1.5cm) */
	siblingDistance?: string;
}

const DEFAULT_OPTIONS: Required<ProbTreeLatexOptions> = {
	levelDistance: '3cm',
	siblingDistance: '1.5cm'
};

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

/**
 * Generate LaTeX code for a probability tree using TikZ
 *
 * @param node - Probability tree AST node
 * @param options - Generator options
 * @returns LaTeX code string
 *
 * @example
 * ```typescript
 * const latex = generateProbabilityTreeLatex(treeNode);
 * // Returns TikZ code for the probability tree
 * ```
 */
export function generateProbabilityTreeLatex(
	node: ProbabilityTreeNode,
	options: ProbTreeLatexOptions = {}
): string {
	const opts = { ...DEFAULT_OPTIONS, ...options };

	// Validate input
	if (!node.root || node.root.branches.length === 0) {
		return '% Error: Probability tree has no branches';
	}

	try {
		const treeContent = generateTreeContent(node.root, node.config.showOutcomes, 0);

		return `\\begin{tikzpicture}[
  grow=right,
  level distance=${opts.levelDistance},
  sibling distance=${opts.siblingDistance},
  every node/.style={font=\\small},
  edge from parent/.style={draw, -latex},
  level 1/.style={sibling distance=2cm},
  level 2/.style={sibling distance=1.5cm}
]
${treeContent}
\\end{tikzpicture}`;
	} catch (error) {
		return `% Error: ${error instanceof Error ? error.message : 'Failed to generate probability tree'}`;
	}
}

// ============================================================================
// TREE CONTENT GENERATION
// ============================================================================

/**
 * Generate the tree content recursively
 *
 * @param treeNode - Current tree node
 * @param showOutcomes - Whether to show outcomes at leaves
 * @param depth - Current depth in the tree
 * @returns TikZ node content
 */
function generateTreeContent(treeNode: ProbTreeNode, showOutcomes: boolean, depth: number): string {
	// Root node
	const rootLabel = treeNode.label ? `$${escapeLatexMath(treeNode.label)}$` : '';

	if (treeNode.isLeaf) {
		// Leaf node with optional outcome
		if (showOutcomes && treeNode.outcome) {
			return `\\node {${escapeLatexMath(treeNode.outcome)}};`;
		}
		return `\\node {};`;
	}

	// Build children
	const children = treeNode.branches
		.map((branch) => generateBranch(branch, showOutcomes, depth + 1))
		.join('\n');

	const indent = '  '.repeat(depth);

	return `${indent}\\node {${rootLabel}}
${children}`;
}

/**
 * Generate a branch with its edge labels and child subtree
 *
 * @param branch - Branch to generate
 * @param showOutcomes - Whether to show outcomes
 * @param depth - Current depth
 * @returns TikZ branch content
 */
function generateBranch(branch: ProbTreeBranch, showOutcomes: boolean, depth: number): string {
	const indent = '  '.repeat(depth);
	const eventLabel = escapeLatexMath(branch.eventLabel);
	const probLabel = escapeLatexMath(branch.probability.display);

	// Child content
	let childContent: string;

	if (branch.child.isLeaf) {
		// Leaf node
		if (showOutcomes && branch.child.outcome) {
			childContent = `{$${escapeLatexMath(branch.child.outcome)}$}`;
		} else {
			childContent = '{}';
		}
	} else {
		// Recursive children
		const grandChildren = branch.child.branches
			.map((b) => generateBranch(b, showOutcomes, depth + 1))
			.join('\n');
		childContent = `{}\n${grandChildren}`;
	}

	return `${indent}child {
${indent}  node ${childContent}
${indent}  edge from parent node[above] {$${eventLabel}$} node[below] {$${probLabel}$}
${indent}}`;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Escape special LaTeX characters in math mode
 *
 * @param expr - Expression to escape
 * @returns Escaped expression
 */
function escapeLatexMath(expr: string): string {
	// Convert common shorthand to LaTeX
	return expr
		.replace(/\+inf/g, '+\\infty')
		.replace(/-inf/g, '-\\infty')
		.replace(/^inf$/g, '\\infty');
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { ProbTreeLatexOptions };
