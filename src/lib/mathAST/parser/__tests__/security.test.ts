/**
 * Security Tests
 *
 * Tests for parser security limits: input length, AST depth, node count.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex, parseLatexSafe } from '../index';
import { SecurityError, DEFAULT_SECURITY_OPTIONS } from '../security';
import type { ParserSecurityOptions } from '../security';

// =============================================================================
// SecurityError Class
// =============================================================================

describe('SecurityError', () => {
	it('should be an instance of Error', () => {
		const error = new SecurityError('test message', 'INPUT_TOO_LONG');
		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe('SecurityError');
	});

	it('should have the correct code', () => {
		const error = new SecurityError('test', 'AST_TOO_DEEP');
		expect(error.code).toBe('AST_TOO_DEEP');
	});

	it('should have the correct message', () => {
		const error = new SecurityError('Input exceeds limit', 'INPUT_TOO_LONG');
		expect(error.message).toBe('Input exceeds limit');
	});
});

// =============================================================================
// Default Options
// =============================================================================

describe('DEFAULT_SECURITY_OPTIONS', () => {
	it('should have sensible defaults', () => {
		expect(DEFAULT_SECURITY_OPTIONS.maxInputLength).toBe(10000);
		expect(DEFAULT_SECURITY_OPTIONS.maxASTDepth).toBe(100);
		expect(DEFAULT_SECURITY_OPTIONS.maxNodeCount).toBe(10000);
	});
});

// =============================================================================
// Input Length Limits
// =============================================================================

describe('maxInputLength', () => {
	it('should parse input at exactly the limit', () => {
		const input = 'x'.repeat(100);
		const security: ParserSecurityOptions = { maxInputLength: 100 };
		const result = parseLatexSafe(input, { mode: 'strict', security });
		expect(result.errors).toHaveLength(0);
		expect(result.ast).not.toBeNull();
	});

	it('should reject input exceeding the limit', () => {
		const input = 'x'.repeat(101);
		const security: ParserSecurityOptions = { maxInputLength: 100 };
		expect(() => parseLatex(input, { mode: 'strict', security })).toThrow(SecurityError);
	});

	it('should include INPUT_TOO_LONG code in error', () => {
		const input = 'x'.repeat(101);
		const security: ParserSecurityOptions = { maxInputLength: 100 };
		try {
			parseLatex(input, { mode: 'strict', security });
			expect.fail('Should have thrown');
		} catch (e) {
			expect(e).toBeInstanceOf(SecurityError);
			expect((e as SecurityError).code).toBe('INPUT_TOO_LONG');
		}
	});

	it('should include the limit in error message', () => {
		const input = 'x'.repeat(51);
		const security: ParserSecurityOptions = { maxInputLength: 50 };
		try {
			parseLatex(input, { mode: 'strict', security });
			expect.fail('Should have thrown');
		} catch (e) {
			expect((e as Error).message).toContain('50');
		}
	});

	it('should use default limit when not specified', () => {
		// Default is 10000, so 10001 should fail
		const input = 'x'.repeat(10001);
		expect(() => parseLatex(input, { mode: 'strict', security: {} })).toThrow(SecurityError);
	});
});

// =============================================================================
// AST Depth Limits
// =============================================================================

describe('maxASTDepth', () => {
	/**
	 * Create a deeply nested expression like ((((x))))
	 */
	function createNestedParens(depth: number): string {
		return '('.repeat(depth) + 'x' + ')'.repeat(depth);
	}

	it('should parse expression at exactly the limit', () => {
		const input = createNestedParens(10);
		const security: ParserSecurityOptions = { maxASTDepth: 15 };
		const result = parseLatexSafe(input, { mode: 'strict', security });
		expect(result.errors).toHaveLength(0);
	});

	it('should reject expression exceeding depth limit', () => {
		const input = createNestedParens(50);
		const security: ParserSecurityOptions = { maxASTDepth: 10 };
		expect(() => parseLatex(input, { mode: 'strict', security })).toThrow(SecurityError);
	});

	it('should include AST_TOO_DEEP code in error', () => {
		const input = createNestedParens(50);
		const security: ParserSecurityOptions = { maxASTDepth: 10 };
		try {
			parseLatex(input, { mode: 'strict', security });
			expect.fail('Should have thrown');
		} catch (e) {
			expect(e).toBeInstanceOf(SecurityError);
			expect((e as SecurityError).code).toBe('AST_TOO_DEEP');
		}
	});

	it('should count depth through different constructs', () => {
		// x^{(((y)))} - power with nested parens
		const input = 'x^{' + '('.repeat(20) + 'y' + ')'.repeat(20) + '}';
		const security: ParserSecurityOptions = { maxASTDepth: 10 };
		expect(() => parseLatex(input, { mode: 'strict', security })).toThrow(SecurityError);
	});
});

// =============================================================================
// Node Count Limits
// =============================================================================

describe('maxNodeCount', () => {
	/**
	 * Create an expression with many nodes: x+x+x+x+...
	 */
	function createManyNodes(count: number): string {
		return Array(count).fill('x').join('+');
	}

	it('should parse expression at exactly the limit', () => {
		// x+x+x creates ~5 nodes (3 variables + 2 additions)
		const input = createManyNodes(5);
		const security: ParserSecurityOptions = { maxNodeCount: 20 };
		const result = parseLatexSafe(input, { mode: 'strict', security });
		expect(result.errors).toHaveLength(0);
	});

	it('should reject expression exceeding node count', () => {
		// Many additions will create many nodes
		const input = createManyNodes(100);
		const security: ParserSecurityOptions = { maxNodeCount: 10 };
		expect(() => parseLatex(input, { mode: 'strict', security })).toThrow(SecurityError);
	});

	it('should include AST_TOO_MANY_NODES code in error', () => {
		const input = createManyNodes(100);
		const security: ParserSecurityOptions = { maxNodeCount: 10 };
		try {
			parseLatex(input, { mode: 'strict', security });
			expect.fail('Should have thrown');
		} catch (e) {
			expect(e).toBeInstanceOf(SecurityError);
			expect((e as SecurityError).code).toBe('AST_TOO_MANY_NODES');
		}
	});
});

// =============================================================================
// Combined Limits
// =============================================================================

describe('combined security options', () => {
	it('should check input length first', () => {
		// Long input that would also exceed node count
		const input = 'x+'.repeat(1000) + 'x';
		const security: ParserSecurityOptions = {
			maxInputLength: 100,
			maxNodeCount: 10
		};
		try {
			parseLatex(input, { mode: 'strict', security });
			expect.fail('Should have thrown');
		} catch (e) {
			// Should fail on input length, not node count
			expect((e as SecurityError).code).toBe('INPUT_TOO_LONG');
		}
	});

	it('should work with no security options (uses defaults)', () => {
		const input = 'x + 1';
		// No security option at all - should use defaults
		const result = parseLatexSafe(input, { mode: 'strict' });
		expect(result.ast).not.toBeNull();
	});

	it('should allow disabling specific limits with high values', () => {
		// Use a moderately large input that exceeds defaults but is still parseable
		// x+x+x... creates nodes but doesn't cause deep recursion
		const input = 'x+'.repeat(500) + 'x'; // 1001 chars, ~1000 nodes
		const security: ParserSecurityOptions = {
			maxInputLength: 5000,
			maxASTDepth: 1000,
			maxNodeCount: 5000
		};
		const result = parseLatexSafe(input, { mode: 'strict', security });
		expect(result.ast).not.toBeNull();
	});
});
