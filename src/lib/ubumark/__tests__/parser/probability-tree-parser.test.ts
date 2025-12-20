/**
 * Probability Tree Parser Tests
 * =============================
 *
 * Unit tests for the probability tree parsing module.
 * Tests cover detection, parsing, probability formats, and error handling.
 */

import { describe, it, expect } from 'vitest';
import {
	isProbTreeBlockStart,
	isBlockEnd,
	findProbTreeBlocks,
	parseProbTreeContent,
	parseProbabilityTree,
	parseProbability,
	getMaxDepth,
	getLeafCount
} from '../../parser/probability-tree-parser';
import type { ProbTreeNode } from '../../types/probability-tree';

// ============================================================================
// DETECTION TESTS
// ============================================================================

describe('isProbTreeBlockStart', () => {
	it('should identify probtree block start', () => {
		expect(isProbTreeBlockStart('```probtree')).toBe(true);
		expect(isProbTreeBlockStart('```probtree ')).toBe(true);
	});

	it('should reject non-probtree blocks', () => {
		expect(isProbTreeBlockStart('```')).toBe(false);
		expect(isProbTreeBlockStart('```typescript')).toBe(false);
		expect(isProbTreeBlockStart('```probability')).toBe(false);
		expect(isProbTreeBlockStart('probtree')).toBe(false);
		expect(isProbTreeBlockStart('```variation')).toBe(false);
	});
});

describe('isBlockEnd', () => {
	it('should identify block end', () => {
		expect(isBlockEnd('```')).toBe(true);
		expect(isBlockEnd('``` ')).toBe(true);
	});

	it('should reject non-block-end', () => {
		expect(isBlockEnd('```probtree')).toBe(false);
		expect(isBlockEnd('text')).toBe(false);
	});
});

// ============================================================================
// BLOCK FINDING TESTS
// ============================================================================

describe('findProbTreeBlocks', () => {
	it('should find single probtree block', () => {
		const lines = ['Text before', '```probtree', 'Pile:1/2', 'Face:1/2', '```', 'Text after'];

		const blocks = findProbTreeBlocks(lines);

		expect(blocks).toHaveLength(1);
		expect(blocks[0].startIndex).toBe(1);
		expect(blocks[0].endIndex).toBe(4);
	});

	it('should find multiple probtree blocks', () => {
		const lines = ['```probtree', 'A:1/2', '```', '', '```probtree', 'B:1/3', '```'];

		const blocks = findProbTreeBlocks(lines);

		expect(blocks).toHaveLength(2);
		expect(blocks[0]).toEqual({ startIndex: 0, endIndex: 2 });
		expect(blocks[1]).toEqual({ startIndex: 4, endIndex: 6 });
	});

	it('should return empty array when no probtree blocks', () => {
		const lines = ['Just', 'regular', 'text'];

		const blocks = findProbTreeBlocks(lines);

		expect(blocks).toHaveLength(0);
	});

	it('should handle unclosed block', () => {
		const lines = ['```probtree', 'A:1/2', 'B:1/2'];

		const blocks = findProbTreeBlocks(lines);

		expect(blocks).toHaveLength(1);
		expect(blocks[0].startIndex).toBe(0);
		expect(blocks[0].endIndex).toBe(2);
	});

	it('should not match regular code blocks', () => {
		const lines = ['```typescript', 'const x = 1;', '```'];

		const blocks = findProbTreeBlocks(lines);

		expect(blocks).toHaveLength(0);
	});
});

// ============================================================================
// CONFIGURATION PARSING TESTS
// ============================================================================

describe('parseProbTreeContent - Configuration', () => {
	it('should parse root label', () => {
		const content = ['root: Urne', '', 'Rouge:1/2', 'Bleue:1/2'];

		const result = parseProbTreeContent(content);

		expect(result.node).not.toBeNull();
		expect(result.node!.config.rootLabel).toBe('Urne');
	});

	it('should parse outcomes: true', () => {
		const content = ['outcomes: true', '', 'A:1/2', 'B:1/2'];

		const result = parseProbTreeContent(content);

		expect(result.node).not.toBeNull();
		expect(result.node!.config.showOutcomes).toBe(true);
	});

	it('should default root to empty string', () => {
		const content = ['A:1/2', 'B:1/2'];

		const result = parseProbTreeContent(content);

		expect(result.node).not.toBeNull();
		expect(result.node!.config.rootLabel).toBe('');
	});

	it('should default outcomes to false', () => {
		const content = ['A:1/2', 'B:1/2'];

		const result = parseProbTreeContent(content);

		expect(result.node).not.toBeNull();
		expect(result.node!.config.showOutcomes).toBe(false);
	});

	it('should ignore empty lines in config section', () => {
		const content = ['root: Test', '', '', 'outcomes: true', '', 'A:1/2'];

		const result = parseProbTreeContent(content);

		expect(result.node).not.toBeNull();
		expect(result.node!.config.rootLabel).toBe('Test');
		expect(result.node!.config.showOutcomes).toBe(true);
	});

	it('should parse intersection: true', () => {
		const content = ['intersection: true', '', 'A:1/2', 'B:1/2'];

		const result = parseProbTreeContent(content);

		expect(result.node).not.toBeNull();
		expect(result.node!.config.showIntersection).toBe(true);
	});

	it('should default showIntersection to false', () => {
		const content = ['A:1/2', 'B:1/2'];

		const result = parseProbTreeContent(content);

		expect(result.node).not.toBeNull();
		expect(result.node!.config.showIntersection).toBe(false);
	});
});

// ============================================================================
// SIMPLE TREE PARSING TESTS
// ============================================================================

describe('parseProbTreeContent - Simple trees', () => {
	it('should parse simple binary tree (2 levels)', () => {
		const content = [
			'Pile:1/2',
			'  Pile:1/2',
			'  Face:1/2',
			'Face:1/2',
			'  Pile:1/2',
			'  Face:1/2'
		];

		const result = parseProbTreeContent(content);

		expect(result.node).not.toBeNull();
		expect(result.errors).toHaveLength(0);

		const node = result.node!;
		expect(node.type).toBe('probability-tree');
		expect(node.root.branches).toHaveLength(2);
		expect(node.root.branches[0].eventLabel).toBe('Pile');
		expect(node.root.branches[0].child.branches).toHaveLength(2);
		expect(node.maxDepth).toBe(2);
		expect(node.leafCount).toBe(4);
	});

	it('should parse tree with outcomes', () => {
		const content = ['outcomes: true', '', 'Rouge:3/5, P(R)=3/5', 'Bleue:2/5, P(B)=2/5'];

		const result = parseProbTreeContent(content);

		expect(result.node).not.toBeNull();
		expect(result.node!.root.branches[0].child.outcome).toBe('P(R)=3/5');
		expect(result.node!.root.branches[1].child.outcome).toBe('P(B)=2/5');
	});

	it('should parse single branch tree', () => {
		const content = ['A:1'];

		const result = parseProbTreeContent(content);

		expect(result.node).not.toBeNull();
		expect(result.node!.root.branches).toHaveLength(1);
		expect(result.node!.maxDepth).toBe(1);
		expect(result.node!.leafCount).toBe(1);
	});
});

// ============================================================================
// COMPLEX TREE PARSING TESTS
// ============================================================================

describe('parseProbTreeContent - Complex trees', () => {
	it('should parse deep tree (3+ levels)', () => {
		const content = [
			'A:1/2',
			'  A:1/2',
			'    A:1/2',
			'    B:1/2',
			'  B:1/2',
			'    A:1/2',
			'    B:1/2',
			'B:1/2',
			'  A:1/2',
			'  B:1/2'
		];

		const result = parseProbTreeContent(content);

		expect(result.node).not.toBeNull();
		expect(result.errors).toHaveLength(0);
		expect(result.node!.maxDepth).toBe(3);
		expect(result.node!.leafCount).toBe(6);
	});

	it('should parse n-ary tree (3 branches per node)', () => {
		const content = ['Rouge:1/3', 'Vert:1/3', 'Bleu:1/3'];

		const result = parseProbTreeContent(content);

		expect(result.node).not.toBeNull();
		expect(result.node!.root.branches).toHaveLength(3);
	});

	it('should parse asymmetric tree', () => {
		const content = ['A:1/2', '  A:1/2', '    A:1/2', '    B:1/2', '  B:1/2', 'B:1/2'];

		const result = parseProbTreeContent(content);

		expect(result.node).not.toBeNull();
		// Left branch goes 3 levels deep, right branch only 1
		expect(result.node!.maxDepth).toBe(3);
		expect(result.node!.leafCount).toBe(4); // 2 + 1 + 1
	});

	it('should handle spaces around separator', () => {
		const content = ['Pile : 1/2', 'Face : 1/2'];

		const result = parseProbTreeContent(content);

		expect(result.node).not.toBeNull();
		expect(result.node!.root.branches[0].eventLabel).toBe('Pile');
	});
});

// ============================================================================
// PROBABILITY FORMAT PARSING TESTS
// ============================================================================

describe('parseProbability', () => {
	it('should parse simple fraction', () => {
		const prob = parseProbability('1/2');

		expect(prob.display).toBe('1/2');
		expect(prob.numeric).toBeCloseTo(0.5);
		expect(prob.format).toBe('fraction');
	});

	it('should parse complex fraction', () => {
		const prob = parseProbability('3/5');

		expect(prob.display).toBe('3/5');
		expect(prob.numeric).toBeCloseTo(0.6);
		expect(prob.format).toBe('fraction');
	});

	it('should parse decimal', () => {
		const prob = parseProbability('0.333');

		expect(prob.display).toBe('0.333');
		expect(prob.numeric).toBeCloseTo(0.333);
		expect(prob.format).toBe('decimal');
	});

	it('should parse integer as decimal', () => {
		const prob = parseProbability('1');

		expect(prob.display).toBe('1');
		expect(prob.numeric).toBe(1);
		expect(prob.format).toBe('decimal');
	});

	it('should parse symbolic probability', () => {
		const prob = parseProbability('P(A)');

		expect(prob.display).toBe('P(A)');
		expect(prob.numeric).toBeNull();
		expect(prob.format).toBe('symbolic');
	});

	it('should parse conditional probability', () => {
		const prob = parseProbability('P(A|B)');

		expect(prob.display).toBe('P(A|B)');
		expect(prob.numeric).toBeNull();
		expect(prob.format).toBe('symbolic');
	});

	it('should parse LaTeX fraction', () => {
		const prob = parseProbability('\\frac{1}{3}');

		expect(prob.display).toBe('\\frac{1}{3}');
		expect(prob.numeric).toBeCloseTo(1 / 3);
		expect(prob.format).toBe('fraction');
	});
});

// ============================================================================
// LATEX IN LABELS TESTS
// ============================================================================

describe('parseProbTreeContent - LaTeX in labels', () => {
	it('should parse LaTeX in event labels', () => {
		const content = ['$A \\cap B$:1/2', '$A \\cup B$:1/2'];

		const result = parseProbTreeContent(content);

		expect(result.node).not.toBeNull();
		expect(result.node!.root.branches[0].eventLabel).toBe('$A \\cap B$');
		expect(result.node!.root.branches[1].eventLabel).toBe('$A \\cup B$');
	});

	it('should parse LaTeX in outcomes', () => {
		const content = ['A:1/2, $P(A) = \\frac{1}{2}$', 'B:1/2, $P(B) = \\frac{1}{2}$'];

		const result = parseProbTreeContent(content);

		expect(result.node).not.toBeNull();
		expect(result.node!.root.branches[0].child.outcome).toBe('$P(A) = \\frac{1}{2}$');
	});
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('parseProbTreeContent - Error handling', () => {
	it('should error if line has no probability separator', () => {
		const content = [
			'Pile 1/2', // Missing colon
			'Face:1/2'
		];

		const result = parseProbTreeContent(content);

		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors[0].message).toContain('probability');
	});

	it('should error if indentation is not multiple of 2', () => {
		const content = [
			'A:1/2',
			'   B:1/2' // 3 spaces instead of 2
		];

		const result = parseProbTreeContent(content);

		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors[0].message).toContain('indentation');
	});

	it('should error if branch is orphaned (skips level)', () => {
		const content = [
			'A:1/2',
			'    B:1/2' // Jumps from depth 0 to depth 2
		];

		const result = parseProbTreeContent(content);

		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors[0].message.toLowerCase()).toContain('orphan');
	});

	it('should warn if probabilities do not sum to 1', () => {
		const content = [
			'A:1/3',
			'B:1/3'
			// Missing 1/3
		];

		const result = parseProbTreeContent(content);

		// Should still parse but with warning
		expect(result.node).not.toBeNull();
		expect(result.warnings.length).toBeGreaterThan(0);
		expect(result.warnings[0].message).toContain('sum');
	});

	it('should handle empty content', () => {
		const content: string[] = [];

		const result = parseProbTreeContent(content);

		expect(result.errors.length).toBeGreaterThan(0);
	});
});

// ============================================================================
// NODE ID GENERATION TESTS
// ============================================================================

describe('parseProbTreeContent - Node IDs', () => {
	it('should generate unique IDs for each node', () => {
		const content = ['A:1/2', '  A:1/2', '  B:1/2', 'B:1/2'];

		const result = parseProbTreeContent(content);
		expect(result.node).not.toBeNull();

		const ids = new Set<string>();
		function collectIds(node: ProbTreeNode) {
			ids.add(node.id);
			node.branches.forEach((b) => collectIds(b.child));
		}
		collectIds(result.node!.root);

		// Root + 4 children = 5 nodes
		expect(ids.size).toBe(5);
	});

	it('should set correct depth for each node', () => {
		const content = ['A:1/2', '  A:1/2', '    A:1/2'];

		const result = parseProbTreeContent(content);
		expect(result.node).not.toBeNull();

		const root = result.node!.root;
		expect(root.depth).toBe(0);
		expect(root.branches[0].child.depth).toBe(1);
		expect(root.branches[0].child.branches[0].child.depth).toBe(2);
	});

	it('should correctly identify leaf nodes', () => {
		const content = ['A:1/2', '  A:1/2', '  B:1/2', 'B:1/2'];

		const result = parseProbTreeContent(content);
		expect(result.node).not.toBeNull();

		const root = result.node!.root;
		expect(root.isLeaf).toBe(false);
		expect(root.branches[0].child.isLeaf).toBe(false);
		expect(root.branches[0].child.branches[0].child.isLeaf).toBe(true);
		expect(root.branches[1].child.isLeaf).toBe(true);
	});
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('getMaxDepth', () => {
	it('should return correct max depth', () => {
		const content = ['A:1/2', '  A:1/2', '    A:1/2', 'B:1/2'];

		const result = parseProbTreeContent(content);
		expect(result.node).not.toBeNull();

		expect(getMaxDepth(result.node!)).toBe(3);
	});
});

describe('getLeafCount', () => {
	it('should return correct leaf count', () => {
		const content = ['A:1/2', '  A:1/2', '  B:1/2', 'B:1/2', '  A:1/2', '  B:1/2'];

		const result = parseProbTreeContent(content);
		expect(result.node).not.toBeNull();

		expect(getLeafCount(result.node!)).toBe(4);
	});
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('parseProbabilityTree - Full block parsing', () => {
	it('should parse complete probtree block', () => {
		const lines = [
			'```probtree',
			'root: Piece',
			'outcomes: true',
			'',
			'Pile:1/2',
			'  Pile:1/2, P(PP)=1/4',
			'  Face:1/2, P(PF)=1/4',
			'Face:1/2',
			'  Pile:1/2, P(FP)=1/4',
			'  Face:1/2, P(FF)=1/4',
			'```'
		];

		const result = parseProbabilityTree(lines, 0, 10);

		expect(result.node).not.toBeNull();
		expect(result.errors).toHaveLength(0);

		const node = result.node!;
		expect(node.type).toBe('probability-tree');
		expect(node.config.rootLabel).toBe('Piece');
		expect(node.config.showOutcomes).toBe(true);
		expect(node.maxDepth).toBe(2);
		expect(node.leafCount).toBe(4);
	});
});
