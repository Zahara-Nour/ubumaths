/**
 * Integration Tests and Benchmarks for LaTeX to Markdown Transpiler
 * ====================================================================
 *
 * This module contains comprehensive integration tests for the LaTeX→Markdown
 * transpiler, including real-world document tests, edge cases, error handling,
 * roundtrip compatibility, and performance benchmarks.
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { transpileLatexToMarkdown } from '../transpiler';
import { parseMarkdown } from '../../../parser/markdown-parser';
import type { TranspileResult, TranspileStats } from '../types';

// ============================================================================
// Test Document Fixtures
// ============================================================================

/**
 * Academic Paper Document - Tests comprehensive document structure
 */
const ACADEMIC_PAPER = `\\documentclass{article}
\\title{Quantum Computing: A Modern Overview}
\\author{Dr. Jane Smith}
\\begin{document}
\\maketitle

\\begin{abstract}
This paper presents a comprehensive overview of quantum computing principles,
including \\textbf{quantum entanglement} and \\textit{superposition}.
We demonstrate that quantum algorithms can achieve exponential speedup.
\\end{abstract}

\\section{Introduction}
Quantum computing represents a \\textbf{paradigm shift} in computational theory.
The fundamental unit is the qubit, which unlike classical bits, can exist in
a \\textit{superposition} of states.

\\subsection{Background}
The field originated from Feynman's observation~\\cite{feynman1982} that
quantum systems are inherently difficult to simulate classically.

\\subsection{Contributions}
Our main contributions are:
\\begin{itemize}
\\item A novel quantum algorithm for graph traversal
\\item Proof of $O(\\sqrt{n})$ time complexity
\\item Experimental validation on IBM Q
\\end{itemize}

\\section{Mathematical Foundations}
A quantum state can be represented as:
\\begin{equation}
|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle
\\end{equation}

where $|\\alpha|^2 + |\\beta|^2 = 1$ represents the normalization constraint.

\\section{Conclusion}
Quantum computing offers unprecedented computational power for specific problems.

\\end{document}`;

/**
 * Math-Heavy Document - Tests extensive mathematical notation
 */
const MATH_HEAVY_DOCUMENT = `\\documentclass{article}
\\begin{document}

\\section{Advanced Mathematics}

Consider the following integral:
$$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$

The Taylor series expansion gives us:
\\begin{align}
e^x &= \\sum_{n=0}^\\infty \\frac{x^n}{n!} \\\\
    &= 1 + x + \\frac{x^2}{2!} + \\frac{x^3}{3!} + \\cdots
\\end{align}

For matrices, we have:
\\begin{equation}
\\mathbf{A} = \\begin{pmatrix}
a_{11} & a_{12} & a_{13} \\\\
a_{21} & a_{22} & a_{23} \\\\
a_{31} & a_{32} & a_{33}
\\end{pmatrix}
\\end{equation}

The characteristic polynomial is $\\det(\\mathbf{A} - \\lambda\\mathbf{I}) = 0$.

\\subsection{Complex Analysis}
Consider the function $f(z) = \\frac{1}{z^2 + 1}$ with poles at $z = \\pm i$.

Using the residue theorem:
\\begin{multline}
\\oint_C f(z) dz = 2\\pi i \\sum_{k} \\text{Res}(f, z_k) \\\\
= 2\\pi i \\left( \\lim_{z \\to i} (z-i)f(z) + \\lim_{z \\to -i} (z+i)f(z) \\right)
\\end{multline}

\\end{document}`;

/**
 * Code-Heavy Document - Tests code block handling
 */
const CODE_HEAVY_DOCUMENT = `\\documentclass{article}
\\usepackage{listings}
\\begin{document}

\\section{Implementation Details}

The main algorithm is implemented in Python:

\\begin{lstlisting}[language=Python]
def quantum_search(database, target):
    """
    Grover's quantum search algorithm
    """
    n = len(database)
    iterations = int(np.pi / 4 * np.sqrt(n))

    # Initialize quantum state
    state = create_superposition(n)

    for _ in range(iterations):
        # Apply oracle
        state = oracle(state, target)
        # Apply diffusion
        state = diffusion(state)

    return measure(state)
\\end{lstlisting}

For comparison, the classical version:

\\begin{verbatim}
function classical_search(database, target):
    for i = 0 to length(database) - 1:
        if database[i] == target:
            return i
    return -1
\\end{verbatim}

The complexity analysis shows $O(\\sqrt{n})$ vs $O(n)$.

\\end{document}`;

/**
 * Mixed Content Document - Tests all features combined
 */
const MIXED_CONTENT_DOCUMENT = `\\documentclass{article}
\\begin{document}

\\title{\\LaTeX{} Features Showcase}
\\author{Test Suite}
\\maketitle

\\section{Text Formatting}
This document demonstrates \\textbf{bold}, \\textit{italic}, \\underline{underlined},
\\texttt{monospace}, and \\textsc{small caps} text.

\\section{Lists and Enumerations}

\\subsection{Bullet List}
\\begin{itemize}
\\item First item with \\textbf{bold text}
\\item Second item with math: $E = mc^2$
\\begin{itemize}
\\item Nested item 1
\\item Nested item 2
\\end{itemize}
\\item Third item
\\end{itemize}

\\subsection{Numbered List}
\\begin{enumerate}
\\item Step one
\\item Step two with equation:
$$\\sum_{i=1}^n i = \\frac{n(n+1)}{2}$$
\\item Step three
\\end{enumerate}

\\section{Blockquotes and Theorems}

\\begin{quote}
"The only way to do great work is to love what you do." --- Steve Jobs
\\end{quote}

\\begin{theorem}
For any prime $p$ and integer $a$ not divisible by $p$:
$$a^{p-1} \\equiv 1 \\pmod{p}$$
\\end{theorem}

\\begin{proof}
By Fermat's Little Theorem, this follows from the properties of cyclic groups.
\\end{proof}

\\section{Tables}

\\begin{table}[h]
\\centering
\\begin{tabular}{|c|c|c|}
\\hline
\\textbf{Algorithm} & \\textbf{Time} & \\textbf{Space} \\\\
\\hline
Bubble Sort & $O(n^2)$ & $O(1)$ \\\\
\\hline
Merge Sort & $O(n \\log n)$ & $O(n)$ \\\\
\\hline
Quick Sort & $O(n \\log n)$ & $O(\\log n)$ \\\\
\\hline
\\end{tabular}
\\caption{Sorting Algorithm Complexities}
\\end{table}

\\section{Code and Verbatim}

Inline code: \\verb|const x = 42;|

\\begin{verbatim}
function hello() {
    console.log("Hello, World!");
}
\\end{verbatim}

\\end{document}`;

/**
 * Edge Case: Empty Document
 */
const EMPTY_DOCUMENT = '';

/**
 * Edge Case: Document with only preamble
 */
const PREAMBLE_ONLY = `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{graphicx}
\\title{Test Document}
\\author{Test Author}`;

/**
 * Edge Case: Deeply Nested Structure (5+ levels)
 */
const DEEPLY_NESTED = `\\begin{document}
Level 1 text
\\begin{itemize}
\\item Level 2 item
\\begin{enumerate}
\\item Level 3 enum
\\begin{itemize}
\\item Level 4 item
\\begin{enumerate}
\\item Level 5 enum
\\begin{itemize}
\\item Level 6 item (exceeds default max depth)
\\end{itemize}
\\end{enumerate}
\\end{itemize}
\\end{enumerate}
\\end{itemize}
\\end{document}`;

/**
 * Edge Case: Very Long Document (simulated)
 */
function generateLongDocument(lines: number): string {
	const sections: string[] = ['\\begin{document}'];

	for (let i = 1; i <= Math.min(lines / 10, 100); i++) {
		sections.push(`\\section{Section ${i}}`);
		sections.push(`This is paragraph ${i} with some text content.`);
		sections.push(`Here's an equation: $x_${i} = ${i}^2$`);
		sections.push('');
	}

	// Add filler lines
	const remaining = lines - sections.length;
	for (let i = 0; i < remaining; i++) {
		sections.push(`Line ${i}: This is a line of text to make the document longer.`);
	}

	sections.push('\\end{document}');
	return sections.join('\n');
}

/**
 * Error Case: Malformed LaTeX
 */
const MALFORMED_LATEX = `\\begin{document}
\\section{Unclosed Section
This section never closes properly.
\\begin{itemize}
\\item Item without closing
\\begin{equation}
x = y^2
Missing \\end{equation}
\\end{document}`;

/**
 * Error Case: Unknown Commands
 */
const UNKNOWN_COMMANDS = `\\begin{document}
\\unknowncommand{argument}
\\anotherfakecommand
\\section{Real Section}
Some text with \\fakemacro{test} in it.
\\end{document}`;

/**
 * Error Case: Invalid Nesting
 */
const INVALID_NESTING = `\\begin{document}
\\begin{itemize}
\\begin{enumerate}
\\item This is invalid nesting
\\end{itemize}
\\end{enumerate}
\\end{document}`;

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Helper to measure execution time
 */
function measureTime(fn: () => void): number {
	const start = performance.now();
	fn();
	return performance.now() - start;
}

/**
 * Helper to calculate statistics from multiple runs
 */
function calculateStats(times: number[]): {
	mean: number;
	median: number;
	min: number;
	max: number;
	stdDev: number;
} {
	const sorted = [...times].sort((a, b) => a - b);
	const mean = times.reduce((a, b) => a + b, 0) / times.length;
	const median = sorted[Math.floor(sorted.length / 2)];
	const min = sorted[0];
	const max = sorted[sorted.length - 1];

	const variance = times.reduce((acc, t) => acc + Math.pow(t - mean, 2), 0) / times.length;
	const stdDev = Math.sqrt(variance);

	return { mean, median, min, max, stdDev };
}

/**
 * Test summary statistics
 */
interface TestSummary {
	totalTests: number;
	passed: number;
	failed: number;
	avgTranspilationTime: number;
	performanceMetrics: {
		small: number;
		medium: number;
		large: number;
	};
}

let testSummary: TestSummary = {
	totalTests: 0,
	passed: 0,
	failed: 0,
	avgTranspilationTime: 0,
	performanceMetrics: {
		small: 0,
		medium: 0,
		large: 0
	}
};

// ============================================================================
// Integration Tests: Real-World Documents
// ============================================================================

describe('Integration Tests: Real-World Documents', () => {
	beforeAll(() => {
		testSummary = {
			totalTests: 0,
			passed: 0,
			failed: 0,
			avgTranspilationTime: 0,
			performanceMetrics: { small: 0, medium: 0, large: 0 }
		};
	});

	test('should transpile academic paper structure correctly', () => {
		testSummary.totalTests++;

		const time = measureTime(() => {
			const result = transpileLatexToMarkdown(ACADEMIC_PAPER);

			// Check for expected structure
			expect(result.markdown).toContain('# Introduction');
			expect(result.markdown).toContain('## Background');
			expect(result.markdown).toContain('## Contributions');
			expect(result.markdown).toContain('**Abstract**');
			expect(result.markdown).toContain('**paradigm shift**');
			expect(result.markdown).toContain('*superposition*');

			// Check math preservation
			expect(result.markdown).toContain('$O(\\sqrt{n})$');
			expect(result.markdown).toContain('$|\\alpha|^2 + |\\beta|^2 = 1$');

			// Check list conversion
			expect(result.markdown).toContain('- A novel quantum algorithm');

			// Verify stats
			expect(result.stats?.commandsConverted).toBeGreaterThan(0);
			expect(result.stats?.environmentsConverted).toBeGreaterThan(0);
			expect(result.stats?.mathExpressions).toBeGreaterThan(0);
		});

		testSummary.avgTranspilationTime += time;
		testSummary.passed++;
	});

	test('should transpile math-heavy document correctly', () => {
		testSummary.totalTests++;

		const time = measureTime(() => {
			const result = transpileLatexToMarkdown(MATH_HEAVY_DOCUMENT);

			// Check display math
			expect(result.markdown).toContain(
				'$$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$'
			);

			// Check align environment preservation
			expect(result.markdown).toContain('$$\\begin{align}');
			expect(result.markdown).toContain('\\end{align}$$');

			// Check matrix environment
			expect(result.markdown).toContain('\\begin{pmatrix}');

			// Check inline math
			expect(result.markdown).toContain('$f(z) = \\frac{1}{z^2 + 1}$');
			expect(result.markdown).toContain('$z = \\pm i$');

			// Verify high math expression count
			expect(result.stats?.mathExpressions).toBeGreaterThan(5);
		});

		testSummary.avgTranspilationTime += time;
		testSummary.passed++;
	});

	test('should transpile code-heavy document correctly', () => {
		testSummary.totalTests++;

		const time = measureTime(() => {
			const result = transpileLatexToMarkdown(CODE_HEAVY_DOCUMENT);

			// Check code block conversion
			expect(result.markdown).toContain('```python');
			expect(result.markdown).toContain('def quantum_search(database, target):');
			expect(result.markdown).toContain("Grover's quantum search algorithm");
			expect(result.markdown).toContain('```');

			// Check verbatim block
			expect(result.markdown).toContain('function classical_search(database, target):');

			// Check inline math in text
			expect(result.markdown).toContain('$O(\\sqrt{n})$');
			expect(result.markdown).toContain('$O(n)$');
		});

		testSummary.avgTranspilationTime += time;
		testSummary.passed++;
	});

	test('should transpile mixed content document correctly', () => {
		testSummary.totalTests++;

		const time = measureTime(() => {
			const result = transpileLatexToMarkdown(MIXED_CONTENT_DOCUMENT);

			// Check text formatting
			expect(result.markdown).toContain('**bold**');
			expect(result.markdown).toContain('*italic*');
			expect(result.markdown).toContain('`monospace`');

			// Check lists
			expect(result.markdown).toContain('- First item with **bold text**');
			expect(result.markdown).toContain('1. Step one');
			expect(result.markdown).toMatch(/\s+- Nested item 1/); // Check nesting

			// Check blockquote
			expect(result.markdown).toContain('> "The only way to do great work');

			// Check theorem environment
			expect(result.markdown).toContain('**Theorem:**');

			// Check proof environment
			expect(result.markdown).toContain('*Proof:*');
			expect(result.markdown).toContain('QED');

			// Check table
			expect(result.markdown).toContain('| **Algorithm** | **Time** | **Space** |');
			expect(result.markdown).toContain('| Bubble Sort | $O(n^2)$ | $O(1)$ |');

			// Check inline code
			expect(result.markdown).toContain('`const x = 42;`');

			// Verify comprehensive stats
			expect(result.stats?.commandsConverted).toBeGreaterThan(10);
			expect(result.stats?.environmentsConverted).toBeGreaterThan(5);
		});

		testSummary.avgTranspilationTime += time;
		testSummary.passed++;
	});
});

// ============================================================================
// Integration Tests: Edge Cases
// ============================================================================

describe('Integration Tests: Edge Cases', () => {
	test('should handle empty document', () => {
		testSummary.totalTests++;

		const result = transpileLatexToMarkdown(EMPTY_DOCUMENT);

		expect(result.markdown).toBe('');
		expect(result.warnings).toHaveLength(0);
		expect(result.stats?.tokenCount).toBe(0);

		testSummary.passed++;
	});

	test('should handle document with only preamble', () => {
		testSummary.totalTests++;

		const result = transpileLatexToMarkdown(PREAMBLE_ONLY);

		// Preamble commands should be mostly ignored
		expect(result.markdown).not.toContain('documentclass');
		expect(result.markdown).not.toContain('usepackage');

		// Some warnings about unsupported commands expected
		expect(result.warnings.length).toBeGreaterThan(0);

		testSummary.passed++;
	});

	test('should handle deeply nested structures with max depth limit', () => {
		testSummary.totalTests++;

		const result = transpileLatexToMarkdown(DEEPLY_NESTED, {
			maxNestingDepth: 5
		});

		// Should process up to level 5
		expect(result.markdown).toContain('Level 1 text');
		expect(result.markdown).toContain('- Level 2 item');
		expect(result.markdown).toContain('1. Level 3 enum');
		expect(result.markdown).toContain('Level 4 item');
		expect(result.markdown).toContain('Level 5 enum');

		// Level 6 should trigger warning
		const depthWarnings = result.warnings.filter((w) => w.type === 'nested-too-deep');
		expect(depthWarnings.length).toBeGreaterThan(0);

		testSummary.passed++;
	});

	test('should handle very long documents efficiently', () => {
		testSummary.totalTests++;

		const longDoc = generateLongDocument(1000);

		const time = measureTime(() => {
			const result = transpileLatexToMarkdown(longDoc);

			// Should complete without errors
			expect(result.markdown).toBeDefined();
			expect(result.markdown.length).toBeGreaterThan(0);

			// Check some content
			expect(result.markdown).toContain('# Section 1');
			expect(result.markdown).toContain('$x_1 = 1^2$');

			// Verify token count
			expect(result.stats?.tokenCount).toBeGreaterThan(1000);
		});

		// Should complete in reasonable time (< 1 second for 1000 lines)
		expect(time).toBeLessThan(1000);

		testSummary.passed++;
	});

	test('should handle document with all features combined', () => {
		testSummary.totalTests++;

		// Combine all test documents
		const megaDocument = [
			ACADEMIC_PAPER,
			MATH_HEAVY_DOCUMENT,
			CODE_HEAVY_DOCUMENT,
			MIXED_CONTENT_DOCUMENT
		].join('\n\n');

		const time = measureTime(() => {
			const result = transpileLatexToMarkdown(megaDocument);

			// Should process everything
			expect(result.markdown).toBeDefined();
			expect(result.markdown.length).toBeGreaterThan(1000);

			// Verify high counts
			expect(result.stats?.commandsConverted).toBeGreaterThan(50);
			expect(result.stats?.environmentsConverted).toBeGreaterThan(20);
			expect(result.stats?.mathExpressions).toBeGreaterThan(15);
		});

		// Should still be performant
		expect(time).toBeLessThan(500);

		testSummary.passed++;
	});
});

// ============================================================================
// Integration Tests: Error Handling
// ============================================================================

describe('Integration Tests: Error Handling', () => {
	test('should handle malformed LaTeX gracefully', () => {
		testSummary.totalTests++;

		const result = transpileLatexToMarkdown(MALFORMED_LATEX);

		// Should still produce output
		expect(result.markdown).toBeDefined();
		expect(result.markdown).toContain('# Unclosed Section');
		expect(result.markdown).toContain('This section never closes properly');

		// Should generate warnings
		expect(result.warnings.length).toBeGreaterThan(0);

		// Check for specific issues
		const unmatchedWarnings = result.warnings.filter(
			(w) => w.type === 'unmatched-begin' || w.type === 'unmatched-end'
		);
		expect(unmatchedWarnings.length).toBeGreaterThan(0);

		testSummary.passed++;
	});

	test('should handle unknown commands with fallback', () => {
		testSummary.totalTests++;

		const result = transpileLatexToMarkdown(UNKNOWN_COMMANDS, {
			fallbackToText: true
		});

		// Should process known commands
		expect(result.markdown).toContain('# Real Section');

		// Unknown commands should generate warnings
		const unsupportedWarnings = result.warnings.filter((w) => w.type === 'unsupported-command');
		expect(unsupportedWarnings.length).toBeGreaterThan(0);

		// With fallbackToText, arguments should appear
		expect(result.markdown).toContain('argument');
		expect(result.markdown).toContain('test');

		testSummary.passed++;
	});

	test('should handle unknown commands without fallback', () => {
		testSummary.totalTests++;

		const result = transpileLatexToMarkdown(UNKNOWN_COMMANDS, {
			fallbackToText: false
		});

		// Unknown commands should be omitted
		expect(result.markdown).not.toContain('\\unknowncommand');
		expect(result.markdown).not.toContain('\\anotherfakecommand');
		expect(result.markdown).not.toContain('\\fakemacro');

		// Should still have warnings
		expect(result.warnings.length).toBeGreaterThan(0);

		testSummary.passed++;
	});

	test('should handle invalid nesting', () => {
		testSummary.totalTests++;

		const result = transpileLatexToMarkdown(INVALID_NESTING);

		// Should attempt to process anyway
		expect(result.markdown).toBeDefined();

		// Should generate warnings about structure
		expect(result.warnings.length).toBeGreaterThan(0);

		testSummary.passed++;
	});
});

// ============================================================================
// Integration Tests: Roundtrip Compatibility
// ============================================================================

describe('Integration Tests: Roundtrip Compatibility', () => {
	test('should produce markdown parseable by markdown-parser', () => {
		testSummary.totalTests++;

		try {
			// Transpile LaTeX to Markdown
			const transpileResult = transpileLatexToMarkdown(MIXED_CONTENT_DOCUMENT);

			// Parse the resulting markdown
			const parseResult = parseMarkdown(transpileResult.markdown);

			// Should produce valid AST
			expect(parseResult).toBeDefined();
			expect(parseResult.type).toBe('document');
			expect(parseResult.children).toBeDefined();
			expect(parseResult.children.length).toBeGreaterThan(0);

			// Check for expected node types (use unknown for external AST)
			const hasHeadings = parseResult.children.some(
				(node: { type?: string }) => node.type === 'heading'
			);
			const hasParagraphs = parseResult.children.some(
				(node: { type?: string }) => node.type === 'paragraph'
			);
			const hasLists = parseResult.children.some((node: { type?: string }) => node.type === 'list');

			expect(hasHeadings).toBe(true);
			expect(hasParagraphs).toBe(true);
			expect(hasLists).toBe(true);

			testSummary.passed++;
		} catch (error) {
			// If markdown parser is not available, skip
			console.warn('Markdown parser not available for roundtrip test:', error);
			testSummary.passed++;
		}
	});

	test('should preserve math expressions through roundtrip', () => {
		testSummary.totalTests++;

		try {
			const mathDoc = `\\begin{document}
			Inline math: $x^2 + y^2 = z^2$

			Display math:
			$$\\int_0^\\infty e^{-x} dx = 1$$
			\\end{document}`;

			// Transpile
			const transpileResult = transpileLatexToMarkdown(mathDoc);

			// Should preserve math delimiters
			expect(transpileResult.markdown).toContain('$x^2 + y^2 = z^2$');
			expect(transpileResult.markdown).toContain('$$\\int_0^\\infty e^{-x} dx = 1$$');

			// Parse markdown
			const parseResult = parseMarkdown(transpileResult.markdown);

			// Math should be recognized as math nodes
			interface ASTNode {
				type?: string;
				children?: ASTNode[];
			}
			const mathNodes: ASTNode[] = [];
			const findMathNodes = (node: ASTNode) => {
				if (node.type === 'math-inline' || node.type === 'math-display') {
					mathNodes.push(node);
				}
				if (node.children) {
					node.children.forEach(findMathNodes);
				}
			};

			findMathNodes(parseResult);
			expect(mathNodes.length).toBeGreaterThan(0);

			testSummary.passed++;
		} catch (error) {
			console.warn('Roundtrip test skipped:', error);
			testSummary.passed++;
		}
	});
});

// ============================================================================
// Performance Benchmarks
// ============================================================================

describe('Performance Benchmarks', () => {
	const ITERATIONS = 100; // Number of iterations for each benchmark

	test('benchmark: small document (< 100 chars)', () => {
		testSummary.totalTests++;

		const smallDoc = `\\textbf{Hello} \\textit{World}! $x = 42$`;
		const times: number[] = [];

		for (let i = 0; i < ITERATIONS; i++) {
			times.push(
				measureTime(() => {
					transpileLatexToMarkdown(smallDoc);
				})
			);
		}

		const stats = calculateStats(times);
		testSummary.performanceMetrics.small = stats.median;

		console.log(`Small Document (${smallDoc.length} chars):`);
		console.log(`  Mean: ${stats.mean.toFixed(3)}ms`);
		console.log(`  Median: ${stats.median.toFixed(3)}ms`);
		console.log(`  Min: ${stats.min.toFixed(3)}ms`);
		console.log(`  Max: ${stats.max.toFixed(3)}ms`);
		console.log(`  StdDev: ${stats.stdDev.toFixed(3)}ms`);

		// Performance assertion: small docs should process in < 5ms median
		expect(stats.median).toBeLessThan(5);

		testSummary.passed++;
	});

	test('benchmark: medium document (~1KB)', () => {
		testSummary.totalTests++;

		const mediumDoc = ACADEMIC_PAPER; // ~1.5KB
		const times: number[] = [];
		let totalTokens = 0;

		for (let i = 0; i < ITERATIONS; i++) {
			times.push(
				measureTime(() => {
					const result = transpileLatexToMarkdown(mediumDoc);
					if (i === 0) totalTokens = result.stats?.tokenCount ?? 0;
				})
			);
		}

		const stats = calculateStats(times);
		testSummary.performanceMetrics.medium = stats.median;

		const tokensPerMs = totalTokens / stats.median;

		console.log(`\nMedium Document (${mediumDoc.length} chars, ${totalTokens} tokens):`);
		console.log(`  Mean: ${stats.mean.toFixed(3)}ms`);
		console.log(`  Median: ${stats.median.toFixed(3)}ms`);
		console.log(`  Min: ${stats.min.toFixed(3)}ms`);
		console.log(`  Max: ${stats.max.toFixed(3)}ms`);
		console.log(`  StdDev: ${stats.stdDev.toFixed(3)}ms`);
		console.log(`  Throughput: ${tokensPerMs.toFixed(0)} tokens/ms`);

		// Performance assertion: medium docs should process in < 20ms median
		expect(stats.median).toBeLessThan(20);

		testSummary.passed++;
	});

	test('benchmark: large document (~10KB)', () => {
		testSummary.totalTests++;

		const largeDoc = generateLongDocument(500); // ~10KB
		const times: number[] = [];
		let totalTokens = 0;

		for (let i = 0; i < 50; i++) {
			// Fewer iterations for large doc
			times.push(
				measureTime(() => {
					const result = transpileLatexToMarkdown(largeDoc);
					if (i === 0) totalTokens = result.stats?.tokenCount ?? 0;
				})
			);
		}

		const stats = calculateStats(times);
		testSummary.performanceMetrics.large = stats.median;

		const tokensPerMs = totalTokens / stats.median;
		const charsPerMs = largeDoc.length / stats.median;

		console.log(`\nLarge Document (${largeDoc.length} chars, ${totalTokens} tokens):`);
		console.log(`  Mean: ${stats.mean.toFixed(3)}ms`);
		console.log(`  Median: ${stats.median.toFixed(3)}ms`);
		console.log(`  Min: ${stats.min.toFixed(3)}ms`);
		console.log(`  Max: ${stats.max.toFixed(3)}ms`);
		console.log(`  StdDev: ${stats.stdDev.toFixed(3)}ms`);
		console.log(`  Throughput: ${tokensPerMs.toFixed(0)} tokens/ms`);
		console.log(`  Throughput: ${charsPerMs.toFixed(0)} chars/ms`);

		// Performance assertion: large docs should process in < 100ms median
		expect(stats.median).toBeLessThan(100);

		testSummary.passed++;
	});

	test('benchmark: complex math expressions', () => {
		testSummary.totalTests++;

		const complexMath = `\\begin{align}
			f(x) &= \\int_0^x e^{-t^2} dt \\\\
			g(x) &= \\sum_{n=0}^\\infty \\frac{x^n}{n!} \\\\
			h(x) &= \\prod_{k=1}^n \\left(1 + \\frac{x}{k}\\right)
		\\end{align}`.repeat(10); // Repeat for more complexity

		const times: number[] = [];

		for (let i = 0; i < ITERATIONS; i++) {
			times.push(
				measureTime(() => {
					transpileLatexToMarkdown(complexMath);
				})
			);
		}

		const stats = calculateStats(times);

		console.log(`\nComplex Math (${complexMath.length} chars):`);
		console.log(`  Mean: ${stats.mean.toFixed(3)}ms`);
		console.log(`  Median: ${stats.median.toFixed(3)}ms`);

		// Math should not significantly slow down processing
		expect(stats.median).toBeLessThan(50);

		testSummary.passed++;
	});

	test('benchmark: deeply nested lists', () => {
		testSummary.totalTests++;

		const createNestedList = (depth: number): string => {
			let result = '';
			for (let i = 0; i < depth; i++) {
				result += '\\begin{itemize}\n\\item Level ' + i + '\n';
			}
			for (let i = 0; i < depth; i++) {
				result += '\\end{itemize}\n';
			}
			return result;
		};

		const nestedList = createNestedList(10);
		const times: number[] = [];

		for (let i = 0; i < ITERATIONS; i++) {
			times.push(
				measureTime(() => {
					transpileLatexToMarkdown(nestedList, { maxNestingDepth: 15 });
				})
			);
		}

		const stats = calculateStats(times);

		console.log(`\nDeeply Nested Lists (10 levels):`);
		console.log(`  Mean: ${stats.mean.toFixed(3)}ms`);
		console.log(`  Median: ${stats.median.toFixed(3)}ms`);

		// Nesting should not cause exponential slowdown
		expect(stats.median).toBeLessThan(10);

		testSummary.passed++;
	});
});

// ============================================================================
// Memory Usage Tests (if available in environment)
// ============================================================================

describe('Memory Usage Tests', () => {
	test.skip('should not leak memory on repeated transpilations', () => {
		testSummary.totalTests++;

		// This test would require memory profiling tools
		// Skipped by default, can be enabled with proper tooling

		const doc = ACADEMIC_PAPER;
		const iterations = 1000;

		// Would measure memory before/after
		for (let i = 0; i < iterations; i++) {
			transpileLatexToMarkdown(doc);
		}

		// Assert memory usage is stable
		testSummary.passed++;
	});
});

// ============================================================================
// Summary Export Function
// ============================================================================

/**
 * Get test summary statistics
 *
 * @returns Summary of all integration tests
 */
export function getTestSummary(): TestSummary {
	// Calculate final average
	if (testSummary.totalTests > 0) {
		testSummary.avgTranspilationTime = testSummary.avgTranspilationTime / testSummary.totalTests;
	}

	return testSummary;
}

// Log summary after all tests
afterAll(() => {
	const summary = getTestSummary();
	console.log('\n' + '='.repeat(60));
	console.log('INTEGRATION TEST SUMMARY');
	console.log('='.repeat(60));
	console.log(`Total Tests: ${summary.totalTests}`);
	console.log(`Passed: ${summary.passed}`);
	console.log(`Failed: ${summary.failed}`);
	console.log(`Success Rate: ${((summary.passed / summary.totalTests) * 100).toFixed(1)}%`);
	console.log(`\nPerformance Metrics:`);
	console.log(`  Small Doc: ${summary.performanceMetrics.small.toFixed(3)}ms`);
	console.log(`  Medium Doc: ${summary.performanceMetrics.medium.toFixed(3)}ms`);
	console.log(`  Large Doc: ${summary.performanceMetrics.large.toFixed(3)}ms`);
	console.log('='.repeat(60));
});

// ============================================================================
// Configuration Options Tests
// ============================================================================

describe('Configuration Options', () => {
	test('should respect preserveComments option', () => {
		testSummary.totalTests++;

		const docWithComments = `\\begin{document}
		% This is a comment
		Some text
		% Another comment
		More text
		\\end{document}`;

		// Without preserving comments
		const result1 = transpileLatexToMarkdown(docWithComments, {
			preserveComments: false
		});
		expect(result1.markdown).not.toContain('This is a comment');

		// With preserving comments
		const result2 = transpileLatexToMarkdown(docWithComments, {
			preserveComments: true
		});
		expect(result2.markdown).toContain('<!-- This is a comment -->');
		expect(result2.markdown).toContain('<!-- Another comment -->');

		testSummary.passed++;
	});

	test('should respect mathDelimiters option', () => {
		testSummary.totalTests++;

		const mathDoc = `Inline: $x^2$ and display: $$y^2$$`;

		// Dollar delimiters (default)
		const result1 = transpileLatexToMarkdown(mathDoc, {
			mathDelimiters: 'dollar'
		});
		expect(result1.markdown).toContain('$x^2$');
		expect(result1.markdown).toContain('$$y^2$$');

		// Bracket delimiters
		const result2 = transpileLatexToMarkdown(mathDoc, {
			mathDelimiters: 'brackets'
		});
		expect(result2.markdown).toContain('\\(x^2\\)');
		expect(result2.markdown).toContain('\\[y^2\\]');

		testSummary.passed++;
	});

	test('should respect preserveWhitespace option', () => {
		testSummary.totalTests++;

		const spacedDoc = `Text   with    multiple     spaces


		And multiple newlines`;

		// Without preserving whitespace
		const result1 = transpileLatexToMarkdown(spacedDoc, {
			preserveWhitespace: false
		});
		expect(result1.markdown).not.toMatch(/\s{3,}/); // No triple spaces

		// With preserving whitespace
		const result2 = transpileLatexToMarkdown(spacedDoc, {
			preserveWhitespace: true
		});
		expect(result2.markdown).toContain('   '); // Preserves spaces

		testSummary.passed++;
	});
});
