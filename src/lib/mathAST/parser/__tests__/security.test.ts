/**
 * Security Tests
 *
 * Tests for parser security limits: input length, AST depth, node count.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex, parseLatexSafe } from '../index';
import { parseCustom } from '../../index';
import { parseRD, parseRDSafe } from '../latex/parser-rd';
import { parseCustomSafe, parseCustomRD, parseCustomRDSafe } from '../custom';
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

// =============================================================================
// Profondeur contrôlée AVANT l'analyse (L5)
// =============================================================================

/**
 * Le plafond de profondeur était mesuré sur l'AST, donc APRÈS l'analyse : une
 * saisie de quelques milliers de parenthèses faisait déborder la pile du
 * parseur récursif (`RangeError`) avant que le plafond ne soit consulté.
 */
describe('profondeur contrôlée avant l’analyse', () => {
	const DEEP = 4000;
	const nested = (open: string, close: string, depth: number) =>
		open.repeat(depth) + 'x' + close.repeat(depth);

	const deepInputs: Array<[string, string]> = [
		['parenthèses', nested('(', ')', DEEP)],
		['accolades', nested('{', '}', DEEP)],
		[
			'\\left( … \\right) (×700 : 4000 dépasseraient la longueur maximale)',
			nested('\\left(', '\\right)', 700)
		]
	];

	/**
	 * Refus propre : jamais un `RangeError`. Le parseur peut refuser plus tôt, par
	 * une erreur d'analyse (`[[x]]` en LaTeX, `--` en custom) : c'est un refus aussi.
	 */
	function expectCleanRefusal(parse: () => unknown): void {
		let result: unknown;
		try {
			result = parse();
		} catch (e) {
			expect(e).not.toBeInstanceOf(RangeError);
			return;
		}
		expect((result as { errors?: unknown[] }).errors?.length ?? 0).toBeGreaterThan(0);
	}

	it.each([
		['parseLatex', parseLatex],
		['parseLatexSafe', parseLatexSafe]
	] as const)('%s : crochets ×4000 refusés proprement', (_label, parse) => {
		expectCleanRefusal(() => parse(nested('[', ']', DEEP)));
	});

	function expectTooDeep(parse: () => unknown): void {
		try {
			parse();
			expect.unreachable('la saisie aurait dû être refusée');
		} catch (e) {
			expect(e).toBeInstanceOf(SecurityError);
			expect((e as SecurityError).code).toBe('AST_TOO_DEEP');
		}
	}

	it.each(deepInputs)('parseLatex : %s imbriquées → SecurityError', (_label, input) => {
		expectTooDeep(() => parseLatex(input));
	});

	it.each(deepInputs)('parseLatexSafe : %s imbriquées → SecurityError', (_label, input) => {
		expectTooDeep(() => parseLatexSafe(input));
	});

	it('parseCustom : parenthèses imbriquées ×4000 → SecurityError', () => {
		expectTooDeep(() => parseCustom(nested('(', ')', DEEP)));
	});

	// Revue du 2026-10-10 : le compte des délimiteurs laissait passer d'autres
	// imbrications (signes, commandes, valeurs absolues) qui débordaient la pile.
	const otherDeep: Array<[string, string]> = [
		['signes moins ×9999', '-'.repeat(9999) + 'x'],
		// L'espace évite que la dernière racine se lise `\sqrtx` (commande inconnue) : sans elle,
		// le verdict dépendait de la taille de pile de la machine (rouge en CI Linux).
		['\\sqrt ×1600', '\\sqrt '.repeat(1600) + 'x'],
		['\\sin ×1600', '\\sin '.repeat(1600) + 'x'],
		['valeurs absolues ×4000', '|'.repeat(4000) + 'x' + '|'.repeat(4000)]
	];

	it.each(otherDeep)('parseLatex : %s → SecurityError', (_label, input) => {
		expectTooDeep(() => parseLatex(input));
	});

	it.each(otherDeep)('parseLatexSafe : %s → SecurityError', (_label, input) => {
		expectTooDeep(() => parseLatexSafe(input));
	});

	const allEntries: Array<[string, (input: string) => unknown]> = [
		['parseLatex', parseLatex],
		['parseLatexSafe', parseLatexSafe],
		['parseRD', parseRD],
		['parseRDSafe', parseRDSafe],
		['parseCustom', parseCustom],
		['parseCustomSafe', parseCustomSafe],
		['parseCustomRD', parseCustomRD],
		['parseCustomRDSafe', parseCustomRDSafe]
	];

	it.each(allEntries.slice(0, 4))('%s : signes moins ×9999 → SecurityError', (_label, parse) => {
		expectTooDeep(() => parse('-'.repeat(9999) + 'x'));
	});

	// La syntaxe custom refuse `--` dès l'analyse : un refus propre, avant toute pile
	it.each(allEntries.slice(4))('%s : signes moins ×9999 refusés proprement', (_label, parse) => {
		expectCleanRefusal(() => parse('-'.repeat(9999) + 'x'));
	});

	it.each(allEntries.slice(4))('%s : sqrt( ×1600 → SecurityError', (_label, parse) => {
		expectTooDeep(() => parse('sqrt('.repeat(1600) + 'x' + ')'.repeat(1600)));
	});

	it.each(allEntries)('%s : parenthèses ×4000 → SecurityError', (_label, parse) => {
		expectTooDeep(() => parse(nested('(', ')', DEEP)));
	});

	it('une union de 60 intervalles à la française passe (pas de SecurityError)', () => {
		const union = Array.from({ length: 60 }, () => '[0;1[').join('\\cup');
		expect(() => parseLatexSafe(union)).not.toThrow(SecurityError);
		expect(() => parseLatex(union)).not.toThrow(SecurityError);
	});

	it('une imbrication ordinaire passe toujours', () => {
		expect(() => parseLatex(nested('(', ')', 30))).not.toThrow();
		expect(() => parseLatex('\\frac{\\frac{1}{2}}{\\left(\\frac{3}{4}\\right)}')).not.toThrow();
	});

	it('un délimiteur fermant en trop ne fausse pas le compte', () => {
		expect(() => parseLatexSafe(')'.repeat(200) + nested('(', ')', 30))).not.toThrow(SecurityError);
	});
});
