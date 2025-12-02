/**
 * Unit tests for input format detection
 *
 * Tests the auto-detection logic that determines whether input is LaTeX
 * or custom syntax based on pattern matching.
 */

import { describe, it, expect } from 'vitest';
import { detectInputFormat } from '../core/input-detector';

describe('detectInputFormat', () => {
	// =============================================================================
	// LaTeX Detection
	// =============================================================================

	describe('LaTeX detection', () => {
		it('detects \\frac as LaTeX', () => {
			const result = detectInputFormat('\\frac{a}{b}');
			expect(result.format).toBe('latex');
			expect(result.confidence).toBeGreaterThan(0.8);
		});

		it('detects \\sin as LaTeX', () => {
			const result = detectInputFormat('\\sin(x)');
			expect(result.format).toBe('latex');
			expect(result.confidence).toBeGreaterThan(0.8);
		});

		it('detects \\cos as LaTeX', () => {
			const result = detectInputFormat('\\cos(x)');
			expect(result.format).toBe('latex');
			expect(result.confidence).toBeGreaterThan(0.8);
		});

		it('detects braced superscript as LaTeX', () => {
			const result = detectInputFormat('x^{2}');
			expect(result.format).toBe('latex');
			expect(result.confidence).toBeGreaterThan(0.8);
		});

		it('detects braced subscript as LaTeX', () => {
			const result = detectInputFormat('a_{ij}');
			expect(result.format).toBe('latex');
			expect(result.confidence).toBeGreaterThan(0.8);
		});

		it('detects \\sqrt as LaTeX', () => {
			const result = detectInputFormat('\\sqrt{x}');
			expect(result.format).toBe('latex');
			expect(result.confidence).toBeGreaterThan(0.8);
		});

		it('detects \\sqrt with index as LaTeX', () => {
			const result = detectInputFormat('\\sqrt[3]{x}');
			expect(result.format).toBe('latex');
			expect(result.confidence).toBeGreaterThan(0.8);
		});

		it('detects \\left delimiter as LaTeX', () => {
			const result = detectInputFormat('\\left(x+y\\right)');
			expect(result.format).toBe('latex');
			expect(result.confidence).toBeGreaterThan(0.8);
		});

		it('detects \\text as LaTeX', () => {
			const result = detectInputFormat('\\text{hello}');
			expect(result.format).toBe('latex');
			expect(result.confidence).toBeGreaterThan(0.8);
		});

		it('detects \\textbf as LaTeX', () => {
			const result = detectInputFormat('\\textbf{bold}');
			expect(result.format).toBe('latex');
			expect(result.confidence).toBeGreaterThan(0.8);
		});

		it('detects \\color as LaTeX', () => {
			const result = detectInputFormat('\\color{red}{x}');
			expect(result.format).toBe('latex');
			expect(result.confidence).toBeGreaterThan(0.8);
		});

		it('detects multiple LaTeX commands', () => {
			const result = detectInputFormat('\\frac{\\sin(x)}{\\cos(x)}');
			expect(result.format).toBe('latex');
			expect(result.confidence).toBeGreaterThan(0.8);
		});

		it('detects Greek letters as LaTeX', () => {
			const result = detectInputFormat('\\alpha + \\beta');
			expect(result.format).toBe('latex');
			expect(result.confidence).toBeGreaterThan(0.8);
		});

		it('detects complex LaTeX expression', () => {
			const result = detectInputFormat('\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}');
			expect(result.format).toBe('latex');
			expect(result.confidence).toBeGreaterThan(0.8);
		});
	});

	// =============================================================================
	// Simple Expressions
	// =============================================================================

	describe('Simple expressions', () => {
		it('treats simple expression as LaTeX with lower confidence', () => {
			const result = detectInputFormat('x + y');
			expect(result.format).toBe('latex');
			expect(result.confidence).toBeLessThanOrEqual(0.5);
		});

		it('treats x^2 as LaTeX with lower confidence', () => {
			const result = detectInputFormat('x^2');
			expect(result.format).toBe('latex');
			expect(result.confidence).toBeLessThanOrEqual(0.5);
		});

		it('treats a_i as LaTeX with lower confidence', () => {
			const result = detectInputFormat('a_i');
			expect(result.format).toBe('latex');
			expect(result.confidence).toBeLessThanOrEqual(0.5);
		});

		it('treats simple variable as LaTeX with lower confidence', () => {
			const result = detectInputFormat('x');
			expect(result.format).toBe('latex');
			expect(result.confidence).toBeLessThanOrEqual(0.5);
		});

		it('treats simple number as LaTeX with lower confidence', () => {
			const result = detectInputFormat('42');
			expect(result.format).toBe('latex');
			expect(result.confidence).toBeLessThanOrEqual(0.5);
		});

		it('treats arithmetic expression as LaTeX with lower confidence', () => {
			const result = detectInputFormat('2 * x + 3');
			expect(result.format).toBe('latex');
			expect(result.confidence).toBeLessThanOrEqual(0.5);
		});
	});

	// =============================================================================
	// Edge Cases
	// =============================================================================

	describe('Edge cases', () => {
		it('returns unknown format for empty string', () => {
			const result = detectInputFormat('');
			expect(result.format).toBe('unknown');
			expect(result.confidence).toBe(0);
		});

		it('returns unknown format for whitespace-only string', () => {
			const result = detectInputFormat('   ');
			expect(result.format).toBe('unknown');
			expect(result.confidence).toBe(0);
		});

		it('trims input before detection', () => {
			const result = detectInputFormat('  \\frac{a}{b}  ');
			expect(result.format).toBe('latex');
			expect(result.confidence).toBeGreaterThan(0.8);
		});

		it('handles mixed content', () => {
			const result = detectInputFormat('x + \\frac{a}{b}');
			expect(result.format).toBe('latex');
			expect(result.confidence).toBeGreaterThan(0.8);
		});

		it('detects LaTeX even with extra whitespace', () => {
			const result = detectInputFormat('\\frac { a } { b }');
			expect(result.format).toBe('latex');
			expect(result.confidence).toBeGreaterThan(0.8);
		});
	});

	// =============================================================================
	// Confidence Levels
	// =============================================================================

	describe('Confidence levels', () => {
		it('returns high confidence for LaTeX commands', () => {
			const commands = ['\\frac{a}{b}', '\\sin(x)', '\\sqrt{x}', 'x^{2}', 'a_{i}'];

			for (const cmd of commands) {
				const result = detectInputFormat(cmd);
				expect(result.confidence).toBeGreaterThan(0.8);
			}
		});

		it('returns medium confidence for simple expressions', () => {
			const exprs = ['x + y', 'x^2', '2*x', 'a', '42'];

			for (const expr of exprs) {
				const result = detectInputFormat(expr);
				expect(result.confidence).toBeLessThanOrEqual(0.5);
				expect(result.confidence).toBeGreaterThan(0);
			}
		});

		it('returns zero confidence for empty input', () => {
			const result = detectInputFormat('');
			expect(result.confidence).toBe(0);
		});
	});
});
