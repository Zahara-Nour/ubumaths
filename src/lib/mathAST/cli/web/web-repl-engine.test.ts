/**
 * Unit tests for WebReplEngine Phase 2 - Unit Integration
 *
 * Tests for unit-aware evaluation, .convert command,
 * .unitmode command, and dimensional error handling.
 *
 * Note: Units must be entered using LaTeX syntax: 5~\unit{m}
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WebReplEngine } from './web-repl-engine';

// =============================================================================
// Test Setup
// =============================================================================

describe('WebReplEngine - Unit Integration (Phase 2)', () => {
	let engine: WebReplEngine;

	beforeEach(() => {
		engine = new WebReplEngine();
	});

	// ===========================================================================
	// Expression Evaluation: Standard vs Unit-Aware
	// ===========================================================================

	describe('expression evaluation routing', () => {
		it('evaluates expression without units using standard evaluation', () => {
			const result = engine.execute('2 + 3');

			expect(result.success).toBe(true);
			expect(result.output).toContain('5');
			// Should not contain unit-specific information
			expect(result.output).not.toContain('Mode:');
		});

		it('evaluates expression with units using evaluateWithUnits', () => {
			// Use LaTeX unit syntax: 5~\unit{km}
			const result = engine.execute('5~\\unit{km}');

			expect(result.success).toBe(true);
			expect(result.output).toContain('5');
			expect(result.output).toContain('km');
			// Should contain unit mode information
			expect(result.output).toContain('Mode:');
		});

		it('evaluates complex expression without units using standard evaluation', () => {
			const result = engine.execute('\\sqrt{16} + 2^3');

			expect(result.success).toBe(true);
			expect(result.output).toContain('12');
			expect(result.output).not.toContain('Mode:');
		});
	});

	// ===========================================================================
	// Addition with Compatible Units
	// ===========================================================================

	describe('addition with compatible units', () => {
		it('adds quantities with compatible units: 5 km + 3000 m', () => {
			const result = engine.execute('5~\\unit{km} + 3000~\\unit{m}');

			expect(result.success).toBe(true);
			// Result should be 8 km (in first mode by default)
			expect(result.output).toContain('8');
		});

		it('adds quantities with same unit: 3 m + 2 m', () => {
			const result = engine.execute('3~\\unit{m} + 2~\\unit{m}');

			expect(result.success).toBe(true);
			expect(result.output).toContain('5');
			expect(result.output).toContain('m');
		});

		it('adds time units: 1 h + 30 min', () => {
			const result = engine.execute('1~\\unit{h} + 30~\\unit{min}');

			expect(result.success).toBe(true);
			// Default mode is 'first', so result should be in hours (1.5 h)
		});
	});

	// ===========================================================================
	// Addition with Incompatible Units (Dimensional Errors)
	// ===========================================================================

	describe('addition with incompatible units', () => {
		it('returns DimensionalEvaluationError for incompatible units: 5 m + 3 s', () => {
			const result = engine.execute('5~\\unit{m} + 3~\\unit{s}');

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.error?.code).toBe('DIMENSION_ERROR');
		});

		it('provides pedagogical message for dimensional errors', () => {
			const result = engine.execute('5~\\unit{m} + 3~\\unit{s}');

			expect(result.success).toBe(false);
			expect(result.output).toBeTruthy();
			// Should contain a helpful suggestion with incompatible dimensions message
			expect(result.output).toContain('incompatible dimensions');
		});

		it('returns error for mass + length: 2 kg + 5 m', () => {
			const result = engine.execute('2~\\unit{kg} + 5~\\unit{m}');

			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('DIMENSION_ERROR');
		});

		it('HTML output contains dimensional error styling', () => {
			const result = engine.execute('5~\\unit{m} + 3~\\unit{s}');

			expect(result.success).toBe(false);
			expect(result.outputHtml).toBeDefined();
			expect(result.outputHtml).toContain('Erreur dimensionnelle');
			expect(result.outputHtml).toContain('text-red');
		});
	});

	// ===========================================================================
	// .convert Command
	// ===========================================================================

	describe('.convert command', () => {
		it('converts last result to target unit', () => {
			// First evaluate an expression with units
			engine.execute('5~\\unit{km}');

			// Then convert to meters
			const result = engine.execute('.convert m');

			expect(result.success).toBe(true);
			expect(result.output).toContain('5000');
			expect(result.output).toContain('m');
		});

		it('converts complex expression result', () => {
			// Evaluate addition
			engine.execute('2~\\unit{km} + 500~\\unit{m}');

			// Convert to meters
			const result = engine.execute('.convert m');

			expect(result.success).toBe(true);
			expect(result.output).toContain('2500');
		});

		it('returns error when no previous unit result exists', () => {
			// Don't execute any unit expression first
			const result = engine.execute('.convert m');

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.error?.code).toBe('NO_AST');
			expect(result.output).toContain('unites');
		});

		it('returns error when no previous unit result after standard expression', () => {
			// Execute a non-unit expression
			engine.execute('2 + 3');

			// Try to convert
			const result = engine.execute('.convert m');

			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('NO_AST');
		});

		it('returns error for invalid unit', () => {
			engine.execute('5~\\unit{km}');
			const result = engine.execute('.convert xyz123');

			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('UNKNOWN_UNIT');
			expect(result.output).toContain('inconnue');
		});

		it('returns error for incompatible target unit', () => {
			// Evaluate a length expression
			engine.execute('5~\\unit{km}');

			// Try to convert to time unit
			const result = engine.execute('.convert s');

			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('DIMENSION_MISMATCH');
			expect(result.output).toContain('incompatibles');
		});

		it('returns error when .convert has no argument', () => {
			engine.execute('5~\\unit{km}');
			const result = engine.execute('.convert');

			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('INVALID_OPTIONS');
			expect(result.output).toContain('Usage:');
		});

		it('shows conversion factor in output', () => {
			engine.execute('1~\\unit{km}');
			const result = engine.execute('.convert m');

			expect(result.success).toBe(true);
			expect(result.output).toContain('Factor:');
		});

		it('HTML output is properly formatted', () => {
			engine.execute('5~\\unit{km}');
			const result = engine.execute('.convert m');

			expect(result.success).toBe(true);
			expect(result.outputHtml).toBeDefined();
			expect(result.outputHtml).toContain('Converted:');
		});
	});

	// ===========================================================================
	// .unitmode Command
	// ===========================================================================

	describe('.unitmode command', () => {
		it('changes mode to "first"', () => {
			const result = engine.execute('.unitmode first');

			expect(result.success).toBe(true);
			expect(result.output).toContain('first');
			expect(engine.getUnitConversionMode()).toBe('first');
		});

		it('changes mode to "si"', () => {
			const result = engine.execute('.unitmode si');

			expect(result.success).toBe(true);
			expect(result.output).toContain('si');
			expect(engine.getUnitConversionMode()).toBe('si');
		});

		it('changes mode to "best"', () => {
			const result = engine.execute('.unitmode best');

			expect(result.success).toBe(true);
			expect(result.output).toContain('best');
			expect(engine.getUnitConversionMode()).toBe('best');
		});

		it('returns error for invalid mode', () => {
			const result = engine.execute('.unitmode invalid');

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.error?.code).toBe('INVALID_OPTIONS');
			expect(result.output).toContain('first|si|best');
		});

		it('returns error for empty mode', () => {
			const result = engine.execute('.unitmode');

			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('INVALID_OPTIONS');
		});

		it('is case insensitive', () => {
			const result = engine.execute('.unitmode SI');

			expect(result.success).toBe(true);
			expect(engine.getUnitConversionMode()).toBe('si');
		});

		it('HTML output has proper styling', () => {
			const result = engine.execute('.unitmode best');

			expect(result.success).toBe(true);
			expect(result.outputHtml).toBeDefined();
			expect(result.outputHtml).toContain('text-blue-400');
		});

		it('default mode is "first"', () => {
			expect(engine.getUnitConversionMode()).toBe('first');
		});
	});

	// ===========================================================================
	// Unit Mode Affects Evaluation
	// ===========================================================================

	describe('unit mode affects evaluation results', () => {
		it('first mode converts to first unit encountered', () => {
			engine.execute('.unitmode first');
			const result = engine.execute('5~\\unit{km} + 3000~\\unit{m}');

			expect(result.success).toBe(true);
			// Result should be 8 km
			expect(result.output).toContain('8');
		});

		it('si mode normalizes to SI base units', () => {
			engine.execute('.unitmode si');
			const result = engine.execute('5~\\unit{km} + 3000~\\unit{m}');

			expect(result.success).toBe(true);
			// Result should be 8000 m
			expect(result.output).toContain('8000');
		});

		it('mode persists across multiple evaluations', () => {
			engine.execute('.unitmode si');
			engine.execute('2~\\unit{km}');

			const result = engine.execute('3~\\unit{km}');

			expect(result.success).toBe(true);
			// Should still be in SI mode
			expect(result.output).toContain('3000'); // 3 km = 3000 m
		});
	});

	// ===========================================================================
	// getLastUnitResult API
	// ===========================================================================

	describe('getLastUnitResult()', () => {
		it('returns undefined initially', () => {
			expect(engine.getLastUnitResult()).toBeUndefined();
		});

		it('returns undefined after standard evaluation', () => {
			engine.execute('2 + 3');
			expect(engine.getLastUnitResult()).toBeUndefined();
		});

		it('returns result after unit evaluation', () => {
			engine.execute('5~\\unit{km}');
			const result = engine.getLastUnitResult();

			expect(result).toBeDefined();
			expect(result?.unit).toBeDefined();
		});

		it('is updated after each unit evaluation', () => {
			engine.execute('5~\\unit{km}');
			const first = engine.getLastUnitResult();

			engine.execute('10~\\unit{m}');
			const second = engine.getLastUnitResult();

			expect(first).not.toBe(second);
		});

		it('is cleared after standard evaluation', () => {
			engine.execute('5~\\unit{km}');
			expect(engine.getLastUnitResult()).toBeDefined();

			engine.execute('2 + 3');
			expect(engine.getLastUnitResult()).toBeUndefined();
		});
	});

	// ===========================================================================
	// setUnitConversionMode API
	// ===========================================================================

	describe('setUnitConversionMode()', () => {
		it('sets mode programmatically', () => {
			engine.setUnitConversionMode('si');
			expect(engine.getUnitConversionMode()).toBe('si');
		});

		it('affects subsequent evaluations', () => {
			engine.setUnitConversionMode('si');
			const result = engine.execute('2~\\unit{km}');

			expect(result.success).toBe(true);
			// 2 km in SI mode = 2000 m
			expect(result.output).toContain('2000');
		});
	});

	// ===========================================================================
	// Edge Cases
	// ===========================================================================

	describe('edge cases', () => {
		it('handles expression with variables and units', () => {
			engine.execute('x = 5');
			const result = engine.execute('x~\\unit{km}');

			expect(result.success).toBe(true);
			expect(result.output).toContain('5');
		});

		it('handles multiplication with units: 2 * 5 m', () => {
			const result = engine.execute('2 * 5~\\unit{m}');

			expect(result.success).toBe(true);
			expect(result.output).toContain('10');
		});

		it('handles division with units: 100 m / 2', () => {
			const result = engine.execute('100~\\unit{m} / 2');

			expect(result.success).toBe(true);
			expect(result.output).toContain('50');
		});

		it('handles derived units: 10 m / 5 s', () => {
			const result = engine.execute('10~\\unit{m} / 5~\\unit{s}');

			expect(result.success).toBe(true);
			expect(result.output).toContain('2');
		});

		it('handles whitespace in .convert command', () => {
			engine.execute('5~\\unit{km}');
			const result = engine.execute('.convert   m');

			expect(result.success).toBe(true);
		});

		it('handles whitespace in .unitmode command', () => {
			const result = engine.execute('.unitmode   si');

			expect(result.success).toBe(true);
			expect(engine.getUnitConversionMode()).toBe('si');
		});
	});

	// ===========================================================================
	// Integration with Other Commands
	// ===========================================================================

	describe('integration with other commands', () => {
		it('.convert works after unit expression, not after .tree', () => {
			engine.execute('5~\\unit{km}');
			engine.execute('.tree');

			// .tree should not clear the last unit result
			const result = engine.execute('.convert m');

			expect(result.success).toBe(true);
		});

		it('unit mode is independent of input mode', () => {
			engine.execute('.latex');
			engine.execute('.unitmode si');

			expect(engine.getInputMode()).toBe('latex');
			expect(engine.getUnitConversionMode()).toBe('si');
		});
	});
});

// =============================================================================
// Phase 4: Statistics Tests
// =============================================================================

describe('WebReplEngine - Statistics (Phase 4)', () => {
	let engine: WebReplEngine;

	beforeEach(() => {
		engine = new WebReplEngine();
	});

	// ===========================================================================
	// Statistical Functions in Expressions
	// ===========================================================================

	describe('statistical functions', () => {
		it('evaluates mean function', () => {
			const result = engine.execute('mean(1, 2, 3, 4, 5)');

			expect(result.success).toBe(true);
			expect(result.output).toContain('3');
		});

		it('evaluates median function with odd count', () => {
			const result = engine.execute('median(1, 2, 3, 4, 5)');

			expect(result.success).toBe(true);
			expect(result.output).toContain('3');
		});

		it('evaluates median function with even count', () => {
			const result = engine.execute('median(1, 2, 3, 4)');

			expect(result.success).toBe(true);
			expect(result.output).toContain('2.5');
		});

		it('evaluates variance function', () => {
			const result = engine.execute('variance(2, 4, 4, 4, 5, 5, 7, 9)');

			expect(result.success).toBe(true);
			// Sample variance should be calculated
			expect(result.output).not.toBe('');
		});

		it('evaluates stdev function', () => {
			const result = engine.execute('stdev(2, 4, 4, 4, 5, 5, 7, 9)');

			expect(result.success).toBe(true);
		});

		it('evaluates min function', () => {
			const result = engine.execute('min(5, 2, 8, 1, 9)');

			expect(result.success).toBe(true);
			expect(result.output).toContain('1');
		});

		it('evaluates max function', () => {
			const result = engine.execute('max(5, 2, 8, 1, 9)');

			expect(result.success).toBe(true);
			expect(result.output).toContain('9');
		});

		it('evaluates sum function', () => {
			const result = engine.execute('sum(1, 2, 3, 4, 5)');

			expect(result.success).toBe(true);
			expect(result.output).toContain('15');
		});
	});

	// ===========================================================================
	// .stats Command
	// ===========================================================================

	describe('.stats command', () => {
		it('computes basic statistics for a list of numbers', () => {
			const result = engine.execute('.stats 1, 2, 3, 4, 5');

			expect(result.success).toBe(true);
			expect(result.output).toContain('Moyenne');
			expect(result.output).toContain('3');
			expect(result.output).toContain('Mediane');
			expect(result.output).toContain('Min');
			expect(result.output).toContain('Max');
		});

		it('computes variance and stdev for 2+ values', () => {
			const result = engine.execute('.stats 1, 2, 3, 4, 5');

			expect(result.success).toBe(true);
			expect(result.output).toContain('Ecart-type');
			expect(result.output).toContain('Variance');
		});

		it('handles single value (no variance/stdev)', () => {
			const result = engine.execute('.stats 42');

			expect(result.success).toBe(true);
			expect(result.output).toContain('42');
			expect(result.output).not.toContain('Variance');
		});

		it('returns error for no arguments', () => {
			const result = engine.execute('.stats');

			expect(result.success).toBe(false);
			expect(result.output).toContain('Usage');
		});

		it('returns error for invalid numbers', () => {
			const result = engine.execute('.stats 1, abc, 3');

			expect(result.success).toBe(false);
			expect(result.output).toContain('valides');
		});

		it('handles decimal numbers', () => {
			const result = engine.execute('.stats 1.5, 2.5, 3.5');

			expect(result.success).toBe(true);
			expect(result.output).toContain('2.5'); // mean
		});

		it('handles negative numbers', () => {
			const result = engine.execute('.stats -5, 0, 5');

			expect(result.success).toBe(true);
			expect(result.output).toContain('0'); // mean
		});
	});

	// ===========================================================================
	// .linreg Command
	// ===========================================================================

	describe('.linreg command', () => {
		it('computes linear regression for perfect fit', () => {
			const result = engine.execute('.linreg 1,2,3 : 2,4,6');

			expect(result.success).toBe(true);
			expect(result.output).toContain('Pente');
			expect(result.output).toContain('2');
			expect(result.output).toContain('R²');
			expect(result.output).toContain('1');
		});

		it('computes linear regression with intercept', () => {
			const result = engine.execute('.linreg 0,1,2 : 1,3,5');

			expect(result.success).toBe(true);
			expect(result.output).toContain('Equation');
			expect(result.output).toContain('y =');
		});

		it('returns error without colon separator', () => {
			const result = engine.execute('.linreg 1,2,3,4,5,6');

			expect(result.success).toBe(false);
			expect(result.output).toContain(':');
		});

		it('returns error for mismatched lengths', () => {
			const result = engine.execute('.linreg 1,2,3 : 4,5');

			expect(result.success).toBe(false);
			expect(result.output).toContain('different');
		});

		it('returns error for single point', () => {
			const result = engine.execute('.linreg 1 : 2');

			expect(result.success).toBe(false);
			expect(result.output).toContain('2 points');
		});

		it('returns error for constant X values', () => {
			const result = engine.execute('.linreg 5,5,5 : 1,2,3');

			expect(result.success).toBe(false);
			expect(result.output).toContain('identiques');
		});

		it('handles negative slope', () => {
			const result = engine.execute('.linreg 1,2,3 : 6,4,2');

			expect(result.success).toBe(true);
			expect(result.output).toContain('-2');
		});

		it('returns R² for non-perfect fit', () => {
			const result = engine.execute('.linreg 1,2,3,4,5 : 1,3,2,4,5');

			expect(result.success).toBe(true);
			expect(result.output).toContain('R²');
			// R² should be less than 1 for non-perfect fit
		});
	});
});
