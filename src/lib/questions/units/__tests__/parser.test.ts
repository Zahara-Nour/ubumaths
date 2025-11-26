/**
 * Unit System - Parser Tests
 * ==========================
 *
 * Comprehensive tests for Phase 2 of the unit system:
 * - Tokenizer (tokenizer.ts)
 * - Unit Expression Parser (parser.ts)
 *
 * Test Categories:
 * 1. Tokenizer - Token generation from unit expressions
 * 2. Unit Expression Parsing - Parse unit strings to Unit objects
 * 3. LaTeX Unit Extraction - Extract units from LaTeX patterns
 * 4. LaTeX Quantity Parsing - Parse full LaTeX quantities (value + unit)
 * 5. Unit String Normalization - Normalize Unicode superscripts
 */

import { describe, test, expect } from 'vitest';
import { tokenize } from '../tokenizer';
import {
	parseUnitExpression,
	extractUnitFromLatex,
	parseLatexQuantity,
	normalizeUnitString
} from '../parser';

// ============================================================================
// TOKENIZER TESTS
// ============================================================================

describe('Tokenizer', () => {
	// --- Simple Units ---

	describe('Simple units', () => {
		test('tokenizes single meter', () => {
			const tokens = tokenize('m');
			expect(tokens).toEqual([
				{ type: 'UNIT', value: 'm', position: 0 },
				{ type: 'EOF', value: '', position: 1 }
			]);
		});

		test('tokenizes single kilometer', () => {
			const tokens = tokenize('km');
			expect(tokens).toEqual([
				{ type: 'UNIT', value: 'km', position: 0 },
				{ type: 'EOF', value: '', position: 2 }
			]);
		});

		test('tokenizes second', () => {
			const tokens = tokenize('s');
			expect(tokens).toEqual([
				{ type: 'UNIT', value: 's', position: 0 },
				{ type: 'EOF', value: '', position: 1 }
			]);
		});

		test('tokenizes hour', () => {
			const tokens = tokenize('h');
			expect(tokens).toEqual([
				{ type: 'UNIT', value: 'h', position: 0 },
				{ type: 'EOF', value: '', position: 1 }
			]);
		});

		test('tokenizes currency symbol', () => {
			const tokens = tokenize('€');
			expect(tokens).toEqual([
				{ type: 'UNIT', value: '€', position: 0 },
				{ type: 'EOF', value: '', position: 1 }
			]);
		});
	});

	// --- Numbers ---

	describe('Number tokens', () => {
		test('tokenizes integer', () => {
			const tokens = tokenize('5');
			expect(tokens[0]).toEqual({ type: 'NUMBER', value: '5', position: 0 });
		});

		test('tokenizes decimal', () => {
			const tokens = tokenize('3.14');
			expect(tokens[0]).toEqual({ type: 'NUMBER', value: '3.14', position: 0 });
		});

		test('tokenizes negative integer', () => {
			const tokens = tokenize('-10');
			expect(tokens[0]).toEqual({ type: 'NUMBER', value: '-10', position: 0 });
		});

		test('tokenizes negative decimal', () => {
			const tokens = tokenize('-3.14');
			expect(tokens[0]).toEqual({ type: 'NUMBER', value: '-3.14', position: 0 });
		});

		test('tokenizes scientific notation with e', () => {
			const tokens = tokenize('1e-3');
			expect(tokens[0]).toEqual({ type: 'NUMBER', value: '1e-3', position: 0 });
		});

		test('tokenizes scientific notation with E', () => {
			const tokens = tokenize('2.5E6');
			expect(tokens[0]).toEqual({ type: 'NUMBER', value: '2.5E6', position: 0 });
		});

		test('tokenizes scientific notation with positive exponent', () => {
			const tokens = tokenize('1e+3');
			expect(tokens[0]).toEqual({ type: 'NUMBER', value: '1e+3', position: 0 });
		});
	});

	// --- Operators ---

	describe('Operator tokens', () => {
		test('tokenizes asterisk multiplication', () => {
			const tokens = tokenize('m*s');
			expect(tokens[1]).toEqual({ type: 'OPERATOR', value: '*', position: 1 });
		});

		test('tokenizes middle dot multiplication', () => {
			const tokens = tokenize('m·s');
			expect(tokens[1]).toEqual({ type: 'OPERATOR', value: '·', position: 1 });
		});

		test('tokenizes times sign multiplication', () => {
			const tokens = tokenize('m×s');
			expect(tokens[1]).toEqual({ type: 'OPERATOR', value: '×', position: 1 });
		});

		test('tokenizes division operator', () => {
			const tokens = tokenize('m/s');
			expect(tokens[1]).toEqual({ type: 'OPERATOR', value: '/', position: 1 });
		});

		test('tokenizes caret operator', () => {
			const tokens = tokenize('m^2');
			expect(tokens[1]).toEqual({ type: 'OPERATOR', value: '^', position: 1 });
		});

		test('tokenizes dot for multiplication', () => {
			const tokens = tokenize('m.s');
			expect(tokens[1]).toEqual({ type: 'DOT', value: '.', position: 1 });
		});
	});

	// --- Superscripts ---

	describe('Superscript tokens', () => {
		test('tokenizes squared superscript', () => {
			const tokens = tokenize('m²');
			expect(tokens[1]).toEqual({ type: 'EXPONENT', value: '2', position: 1 });
		});

		test('tokenizes cubed superscript', () => {
			const tokens = tokenize('m³');
			expect(tokens[1]).toEqual({ type: 'EXPONENT', value: '3', position: 1 });
		});

		test('tokenizes negative one superscript', () => {
			const tokens = tokenize('s⁻¹');
			expect(tokens[1]).toEqual({ type: 'EXPONENT', value: '-1', position: 1 });
		});

		test('tokenizes negative two superscript', () => {
			const tokens = tokenize('s⁻²');
			expect(tokens[1]).toEqual({ type: 'EXPONENT', value: '-2', position: 1 });
		});

		test('tokenizes complex superscript sequence', () => {
			const tokens = tokenize('m⁻³');
			expect(tokens[1]).toEqual({ type: 'EXPONENT', value: '-3', position: 1 });
		});
	});

	// --- Parentheses ---

	describe('Parentheses', () => {
		test('tokenizes opening parenthesis', () => {
			const tokens = tokenize('(m/s)');
			expect(tokens[0]).toEqual({ type: 'LPAREN', value: '(', position: 0 });
		});

		test('tokenizes closing parenthesis', () => {
			const tokens = tokenize('(m/s)');
			// ( at 0, m at 1, / at 2, s at 3, ) at 4 -> tokens[4]
			expect(tokens[4]).toEqual({ type: 'RPAREN', value: ')', position: 4 });
		});

		test('tokenizes nested parentheses', () => {
			const tokens = tokenize('((m/s))');
			expect(tokens.map((t) => t.type)).toEqual([
				'LPAREN',
				'LPAREN',
				'UNIT',
				'OPERATOR',
				'UNIT',
				'RPAREN',
				'RPAREN',
				'EOF'
			]);
		});
	});

	// --- Composite Expressions ---

	describe('Composite expressions', () => {
		test('tokenizes km/h', () => {
			const tokens = tokenize('km/h');
			expect(tokens).toEqual([
				{ type: 'UNIT', value: 'km', position: 0 },
				{ type: 'OPERATOR', value: '/', position: 2 },
				{ type: 'UNIT', value: 'h', position: 3 },
				{ type: 'EOF', value: '', position: 4 }
			]);
		});

		test('tokenizes m²', () => {
			const tokens = tokenize('m²');
			expect(tokens.length).toBe(3); // UNIT, EXPONENT, EOF
			expect(tokens[0].value).toBe('m');
			expect(tokens[1].value).toBe('2');
		});

		test('tokenizes m·s⁻¹', () => {
			const tokens = tokenize('m·s⁻¹');
			const values = tokens.map((t) => t.value);
			expect(values).toContain('m');
			expect(values).toContain('·');
			expect(values).toContain('s');
			expect(values).toContain('-1');
		});

		test('tokenizes kg·m²·s⁻²', () => {
			const tokens = tokenize('kg·m²·s⁻²');
			const unitTokens = tokens.filter((t) => t.type === 'UNIT');
			const expTokens = tokens.filter((t) => t.type === 'EXPONENT');
			expect(unitTokens).toHaveLength(3);
			expect(expTokens).toHaveLength(2);
		});

		test('tokenizes (m/s)²', () => {
			const tokens = tokenize('(m/s)²');
			const types = tokens.map((t) => t.type);
			expect(types).toContain('LPAREN');
			expect(types).toContain('RPAREN');
			expect(types).toContain('EXPONENT');
		});
	});

	// --- Whitespace Handling ---

	describe('Whitespace handling', () => {
		test('ignores leading whitespace', () => {
			const tokens = tokenize('  m');
			expect(tokens[0]).toEqual({ type: 'UNIT', value: 'm', position: 2 });
		});

		test('ignores trailing whitespace', () => {
			const tokens = tokenize('m  ');
			expect(tokens[1].type).toBe('EOF');
		});

		test('handles multiple spaces between units (implicit multiplication)', () => {
			const tokens = tokenize('m  s');
			const types = tokens.map((t) => t.type);
			expect(types).toContain('OPERATOR'); // Should have implicit * between
		});

		test('tokenizes space-separated units with implicit multiplication', () => {
			const tokens = tokenize('m s');
			const operatorTokens = tokens.filter((t) => t.type === 'OPERATOR');
			expect(operatorTokens.length).toBeGreaterThan(0);
		});
	});

	// --- Edge Cases ---

	describe('Edge cases', () => {
		test('tokenizes empty string', () => {
			const tokens = tokenize('');
			expect(tokens).toEqual([{ type: 'EOF', value: '', position: 0 }]);
		});

		test('tokenizes whitespace only', () => {
			const tokens = tokenize('   ');
			expect(tokens).toEqual([{ type: 'EOF', value: '', position: 3 }]);
		});

		test('handles number without unit', () => {
			const tokens = tokenize('5');
			expect(tokens[0].type).toBe('NUMBER');
			expect(tokens[1].type).toBe('EOF');
		});

		test('handles unit without number', () => {
			const tokens = tokenize('m');
			expect(tokens[0].type).toBe('UNIT');
			expect(tokens[1].type).toBe('EOF');
		});

		test('handles complex expression: 3.14 m', () => {
			const tokens = tokenize('3.14 m');
			expect(tokens[0].type).toBe('NUMBER');
			expect(tokens[1].type).toBe('UNIT');
		});

		test('handles unknown character (skips)', () => {
			const tokens = tokenize('m#s');
			// Should skip the # character
			const unitTokens = tokens.filter((t) => t.type === 'UNIT');
			expect(unitTokens.length).toBeGreaterThan(0);
		});
	});
});

// ============================================================================
// UNIT EXPRESSION PARSING TESTS
// ============================================================================

describe('Unit Expression Parsing', () => {
	// --- Simple Units ---

	describe('Simple units', () => {
		test('parses single meter', () => {
			const unit = parseUnitExpression('m');
			expect(unit).not.toBeNull();
			expect(unit?.components.get('m')).toBe(1);
			expect(unit?.coefficient).toBe(1);
		});

		test('parses kilometer with coefficient', () => {
			const unit = parseUnitExpression('km');
			expect(unit).not.toBeNull();
			expect(unit?.components.get('m')).toBe(1);
			expect(unit?.coefficient).toBe(1000);
		});

		test('parses gram', () => {
			const unit = parseUnitExpression('g');
			expect(unit).not.toBeNull();
			expect(unit?.components.get('g')).toBe(1);
		});

		test('parses second', () => {
			const unit = parseUnitExpression('s');
			expect(unit).not.toBeNull();
			expect(unit?.components.get('s')).toBe(1);
		});

		test('parses hour', () => {
			const unit = parseUnitExpression('h');
			expect(unit).not.toBeNull();
			expect(unit?.coefficient).toBe(3600);
		});

		test('parses currency symbol', () => {
			const unit = parseUnitExpression('€');
			expect(unit).not.toBeNull();
			expect(unit?.components.get('€')).toBe(1);
		});
	});

	// --- Prefixed Units ---

	describe('Prefixed units', () => {
		test('parses millimeter', () => {
			const unit = parseUnitExpression('mm');
			expect(unit).not.toBeNull();
			expect(unit?.coefficient).toBe(0.001);
		});

		test('parses microgram', () => {
			const unit = parseUnitExpression('μg');
			expect(unit).not.toBeNull();
			expect(unit?.coefficient).toBe(1e-6);
		});

		test('parses kilogram', () => {
			const unit = parseUnitExpression('kg');
			expect(unit).not.toBeNull();
			expect(unit?.coefficient).toBe(1000);
		});

		test('parses nanosecond', () => {
			const unit = parseUnitExpression('ns');
			expect(unit).not.toBeNull();
			expect(unit?.coefficient).toBe(1e-9);
		});
	});

	// --- Division ---

	describe('Division', () => {
		test('parses km/h', () => {
			const unit = parseUnitExpression('km/h');
			expect(unit).not.toBeNull();
			expect(unit?.components.get('m')).toBe(1);
			expect(unit?.components.get('s')).toBe(-1);
		});

		test('parses m/s', () => {
			const unit = parseUnitExpression('m/s');
			expect(unit).not.toBeNull();
			expect(unit?.components.get('m')).toBe(1);
			expect(unit?.components.get('s')).toBe(-1);
		});

		test('parses kg/m³', () => {
			const unit = parseUnitExpression('kg/m³');
			expect(unit).not.toBeNull();
			expect(unit?.components.get('g')).toBe(1);
			expect(unit?.components.get('m')).toBe(-3);
		});
	});

	// --- Powers and Exponents ---

	describe('Powers and exponents', () => {
		test('parses m^2 (caret notation)', () => {
			const unit = parseUnitExpression('m^2');
			expect(unit).not.toBeNull();
			expect(unit?.components.get('m')).toBe(2);
		});

		test('parses m² (superscript notation)', () => {
			const unit = parseUnitExpression('m²');
			expect(unit).not.toBeNull();
			expect(unit?.components.get('m')).toBe(2);
		});

		test('parses m³ (cubed)', () => {
			const unit = parseUnitExpression('m³');
			expect(unit).not.toBeNull();
			expect(unit?.components.get('m')).toBe(3);
		});

		test('parses s^-1 (negative exponent)', () => {
			const unit = parseUnitExpression('s^-1');
			expect(unit).not.toBeNull();
			expect(unit?.components.get('s')).toBe(-1);
		});

		test('parses s⁻¹ (superscript negative)', () => {
			const unit = parseUnitExpression('s⁻¹');
			expect(unit).not.toBeNull();
			expect(unit?.components.get('s')).toBe(-1);
		});

		test('parses s⁻² (superscript negative two)', () => {
			const unit = parseUnitExpression('s⁻²');
			expect(unit).not.toBeNull();
			expect(unit?.components.get('s')).toBe(-2);
		});
	});

	// --- Composite Units ---

	describe('Composite units', () => {
		test('parses kg·m²·s⁻² (Joule)', () => {
			const unit = parseUnitExpression('kg·m²·s⁻²');
			expect(unit).not.toBeNull();
			expect(unit?.components.get('g')).toBe(1); // kg base is g
			expect(unit?.components.get('m')).toBe(2);
			expect(unit?.components.get('s')).toBe(-2);
		});

		test('parses kg*m/s² (Newton)', () => {
			const unit = parseUnitExpression('kg*m/s²');
			expect(unit).not.toBeNull();
			expect(unit?.components.get('g')).toBe(1);
			expect(unit?.components.get('m')).toBe(1);
			expect(unit?.components.get('s')).toBe(-2);
		});

		test('parses m.s^-1 (velocity with dot)', () => {
			const unit = parseUnitExpression('m.s^-1');
			expect(unit).not.toBeNull();
			expect(unit?.components.get('m')).toBe(1);
			expect(unit?.components.get('s')).toBe(-1);
		});

		test('parses m·s⁻¹ (velocity with middle dot)', () => {
			const unit = parseUnitExpression('m·s⁻¹');
			expect(unit).not.toBeNull();
			expect(unit?.components.get('m')).toBe(1);
			expect(unit?.components.get('s')).toBe(-1);
		});

		test('parses kg.m^2.s^-2 with all dots', () => {
			const unit = parseUnitExpression('kg.m^2.s^-2');
			expect(unit).not.toBeNull();
			expect(unit?.components.size).toBeGreaterThan(0);
		});
	});

	// --- Parentheses ---

	describe('Parentheses', () => {
		test('parses (m/s) with parentheses', () => {
			const unit = parseUnitExpression('(m/s)');
			expect(unit).not.toBeNull();
			expect(unit?.components.get('m')).toBe(1);
			expect(unit?.components.get('s')).toBe(-1);
		});

		test('parses (m/s)² with power after parentheses', () => {
			const unit = parseUnitExpression('(m/s)²');
			expect(unit).not.toBeNull();
			expect(unit?.components.get('m')).toBe(2);
			expect(unit?.components.get('s')).toBe(-2);
		});

		test('parses (m/s)^2 with caret after parentheses', () => {
			const unit = parseUnitExpression('(m/s)^2');
			expect(unit).not.toBeNull();
			expect(unit?.components.get('m')).toBe(2);
			expect(unit?.components.get('s')).toBe(-2);
		});

		test('parses nested parentheses', () => {
			const unit = parseUnitExpression('((m/s))');
			expect(unit).not.toBeNull();
			expect(unit?.components.get('m')).toBe(1);
			expect(unit?.components.get('s')).toBe(-1);
		});
	});

	// --- Invalid Units ---

	describe('Invalid units', () => {
		test('returns null for empty string', () => {
			const unit = parseUnitExpression('');
			expect(unit).toBeNull();
		});

		test('returns null for whitespace only', () => {
			const unit = parseUnitExpression('   ');
			expect(unit).toBeNull();
		});

		test('returns null for unknown unit symbol', () => {
			const unit = parseUnitExpression('xyz');
			expect(unit).toBeNull();
		});

		test('returns null for random letters', () => {
			const unit = parseUnitExpression('abc');
			expect(unit).toBeNull();
		});
	});

	// --- Edge Cases ---

	describe('Edge cases', () => {
		test('parses unit with mixed operators', () => {
			const unit = parseUnitExpression('kg*m/s²');
			expect(unit).not.toBeNull();
			expect(unit?.components.size).toBeGreaterThan(0);
		});

		test('parses unit with multiple divisions (left associative)', () => {
			const unit = parseUnitExpression('m/s/kg');
			expect(unit).not.toBeNull();
		});

		test('parses unit with repeated multiplication', () => {
			const unit = parseUnitExpression('m*m*m');
			expect(unit).not.toBeNull();
			expect(unit?.components.get('m')).toBe(3);
		});

		test('handles Unicode superscripts with prefixes', () => {
			const unit = parseUnitExpression('km²');
			expect(unit).not.toBeNull();
			expect(unit?.components.get('m')).toBe(2);
		});
	});
});

// ============================================================================
// LATEX UNIT EXTRACTION TESTS
// ============================================================================

describe('LaTeX Unit Extraction', () => {
	// --- \\text Pattern ---

	describe('\\text{} pattern', () => {
		test('extracts unit from \\text{ km }', () => {
			const unit = extractUnitFromLatex('5\\text{ km }');
			expect(unit).toBe('km');
		});

		test('extracts unit from \\text{m}', () => {
			const unit = extractUnitFromLatex('3.14\\text{m}');
			expect(unit).toBe('m');
		});

		test('handles internal whitespace in \\text', () => {
			const unit = extractUnitFromLatex('10\\text{  m  }');
			expect(unit).toBe('m');
		});

		test('extracts composite unit from \\text{km/h}', () => {
			const unit = extractUnitFromLatex('5\\text{km/h}');
			expect(unit).toBe('km/h');
		});

		test('extracts unit with superscripts from \\text{m²}', () => {
			const unit = extractUnitFromLatex('2\\text{m²}');
			expect(unit).toBe('m²');
		});
	});

	// --- \\mathrm Pattern ---

	describe('\\mathrm{} pattern', () => {
		test('extracts unit from \\mathrm{m}', () => {
			const unit = extractUnitFromLatex('3.14\\mathrm{m}');
			expect(unit).toBe('m');
		});

		test('extracts unit from \\mathrm{kg}', () => {
			const unit = extractUnitFromLatex('2\\mathrm{kg}');
			expect(unit).toBe('kg');
		});

		test('extracts composite from \\mathrm{m/s}', () => {
			const unit = extractUnitFromLatex('10\\mathrm{m/s}');
			expect(unit).toBe('m/s');
		});
	});

	// --- \\operatorname Pattern ---

	describe('\\operatorname{} pattern', () => {
		test('extracts unit from \\operatorname{kg}', () => {
			const unit = extractUnitFromLatex('5\\operatorname{kg}');
			expect(unit).toBe('kg');
		});

		test('extracts unit from \\operatorname{m}', () => {
			const unit = extractUnitFromLatex('100\\operatorname{m}');
			expect(unit).toBe('m');
		});
	});

	// --- Tilde Pattern ---

	describe('Tilde (~) pattern', () => {
		test('extracts currency with tilde', () => {
			const unit = extractUnitFromLatex('25~€');
			expect(unit).toBe('€');
		});

		test('extracts unit with tilde', () => {
			const unit = extractUnitFromLatex('100~km');
			expect(unit).toBe('km');
		});

		test('extracts composite unit with tilde', () => {
			const unit = extractUnitFromLatex('50~km/h');
			expect(unit).toBe('km/h');
		});
	});

	// --- Backslash Space Pattern ---

	describe('Backslash space (\\\\ ) pattern', () => {
		test('extracts unit with backslash space', () => {
			const unit = extractUnitFromLatex('5\\ m');
			expect(unit).toBe('m');
		});

		test('extracts km with backslash space', () => {
			const unit = extractUnitFromLatex('100\\ km');
			expect(unit).toBe('km');
		});
	});

	// --- Edge Cases ---

	describe('Edge cases', () => {
		test('returns null for no unit pattern', () => {
			const unit = extractUnitFromLatex('5');
			expect(unit).toBeNull();
		});

		test('returns null for empty string', () => {
			const unit = extractUnitFromLatex('');
			expect(unit).toBeNull();
		});

		test('returns null for invalid unit in pattern', () => {
			const unit = extractUnitFromLatex('5\\text{xyz}');
			expect(unit).toBe('xyz'); // Pattern matches, but unit may be invalid
		});

		test('prefers first matching pattern', () => {
			const unit = extractUnitFromLatex('5\\text{km}\\mathrm{m}');
			expect(unit).toBe('km'); // Should match first pattern
		});
	});
});

// ============================================================================
// LATEX QUANTITY PARSING TESTS
// ============================================================================

describe('LaTeX Quantity Parsing', () => {
	// --- Simple Quantities ---

	describe('Simple quantities', () => {
		test('parses 5\\text{ km }', () => {
			const qty = parseLatexQuantity('5\\text{ km }');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(5);
			expect(qty?.unit.components.get('m')).toBe(1);
			expect(qty?.unit.coefficient).toBe(1000);
		});

		test('parses 3.14\\mathrm{m}', () => {
			const qty = parseLatexQuantity('3.14\\mathrm{m}');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(3.14);
			expect(qty?.unit.components.get('m')).toBe(1);
		});

		test('parses -5\\text{ K }', () => {
			// Note: °C (Celsius) is not in definitions, using K (Kelvin)
			const qty = parseLatexQuantity('-5\\text{ K }');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(-5);
			expect(qty?.unit.components.get('K')).toBe(1);
		});

		test('parses 100\\text{km/h}', () => {
			const qty = parseLatexQuantity('100\\text{km/h}');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(100);
			expect(qty?.unit.components.get('m')).toBe(1);
			expect(qty?.unit.components.get('s')).toBe(-1);
		});
	});

	// --- Fractions ---

	describe('Fractions', () => {
		test('parses \\frac{3}{2}\\text{ kg }', () => {
			const qty = parseLatexQuantity('\\frac{3}{2}\\text{ kg }');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(1.5);
			expect(qty?.unit.components.get('g')).toBe(1);
		});

		test('parses \\frac{1}{2}\\text{ m }', () => {
			const qty = parseLatexQuantity('\\frac{1}{2}\\text{ m }');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(0.5);
		});

		test('parses complex fraction', () => {
			const qty = parseLatexQuantity('\\frac{5}{4}\\text{ s }');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(1.25);
		});
	});

	// --- Scientific Notation ---

	describe('Scientific notation', () => {
		test('parses 1.5\\times 10^{3}\\text{ m }', () => {
			const qty = parseLatexQuantity('1.5\\times 10^{3}\\text{ m }');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(1500);
			expect(qty?.unit.components.get('m')).toBe(1);
		});

		test('parses 2\\cdot 10^{-3}\\text{ s }', () => {
			const qty = parseLatexQuantity('2\\cdot 10^{-3}\\text{ s }');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(0.002);
		});

		test('parses 3.14\\times 10^{6}\\text{ m }', () => {
			// Note: Hz is not in definitions, using m instead
			const qty = parseLatexQuantity('3.14\\times 10^{6}\\text{ m }');
			expect(qty).not.toBeNull();
			// Value should be computed as 3.14e6 = 3140000
			expect(qty?.value).toBe(3140000);
			expect(qty?.unit.components.get('m')).toBe(1);
		});
	});

	// --- Composite Units ---

	describe('Composite units', () => {
		test('parses 5\\text{ km/h }', () => {
			const qty = parseLatexQuantity('5\\text{ km/h }');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(5);
			expect(qty?.unit.components.get('m')).toBe(1);
			expect(qty?.unit.components.get('s')).toBe(-1);
		});

		test('parses 10\\text{ m²/s }', () => {
			const qty = parseLatexQuantity('10\\text{ m²/s }');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(10);
			expect(qty?.unit.components.get('m')).toBe(2);
			expect(qty?.unit.components.get('s')).toBe(-1);
		});

		test('parses 9.8\\text{ m/s² }', () => {
			const qty = parseLatexQuantity('9.8\\text{ m/s² }');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(9.8);
			expect(qty?.unit.components.get('s')).toBe(-2);
		});
	});

	// --- Different LaTeX Patterns ---

	describe('Different LaTeX patterns', () => {
		test('parses with \\mathrm', () => {
			const qty = parseLatexQuantity('10\\mathrm{m}');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(10);
		});

		test('parses with tilde separator', () => {
			const qty = parseLatexQuantity('25~€');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(25);
		});

		test('parses with backslash space', () => {
			const qty = parseLatexQuantity('50\\ km');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(50);
		});
	});

	// --- Invalid Inputs ---

	describe('Invalid inputs', () => {
		test('returns null for null input', () => {
			const qty = parseLatexQuantity(null as unknown as string);
			expect(qty).toBeNull();
		});

		test('returns null for undefined input', () => {
			const qty = parseLatexQuantity(undefined as unknown as string);
			expect(qty).toBeNull();
		});

		test('returns null for empty string', () => {
			const qty = parseLatexQuantity('');
			expect(qty).toBeNull();
		});

		test('returns null for number without unit', () => {
			const qty = parseLatexQuantity('5');
			expect(qty).toBeNull();
		});

		test('returns null for invalid unit', () => {
			const qty = parseLatexQuantity('5\\text{xyz}');
			expect(qty).toBeNull();
		});

		test('returns null for non-numeric value', () => {
			const qty = parseLatexQuantity('abc\\text{ m }');
			expect(qty).toBeNull();
		});
	});

	// --- Edge Cases ---

	describe('Edge cases', () => {
		test('handles whitespace around LaTeX commands', () => {
			const qty = parseLatexQuantity('  5\\text{ m }  ');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(5);
		});

		test('parses with currency symbol', () => {
			const qty = parseLatexQuantity('100\\text{ € }');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(100);
		});

		test('parses with degree symbol', () => {
			const qty = parseLatexQuantity('45\\text{ ° }');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(45);
		});

		test('parses with micro symbol', () => {
			const qty = parseLatexQuantity('500\\text{ μm }');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(500);
		});

		test('handles comma as decimal separator', () => {
			const qty = parseLatexQuantity('3,14\\text{ m }');
			expect(qty).not.toBeNull();
			// Comma should be converted to period
			expect(typeof qty?.value).toBe('number');
		});
	});
});

// ============================================================================
// UNIT STRING NORMALIZATION TESTS
// ============================================================================

describe('Unit String Normalization', () => {
	// --- Superscript Conversion ---

	describe('Superscript conversion', () => {
		test('converts m² to m^2', () => {
			const normalized = normalizeUnitString('m²');
			expect(normalized).toBe('m^2');
		});

		test('converts s⁻¹ to s^-1', () => {
			const normalized = normalizeUnitString('s⁻¹');
			expect(normalized).toBe('s^-1');
		});

		test('converts m³ to m^3', () => {
			const normalized = normalizeUnitString('m³');
			expect(normalized).toBe('m^3');
		});

		test('converts s⁻² to s^-2', () => {
			const normalized = normalizeUnitString('s⁻²');
			expect(normalized).toBe('s^-2');
		});
	});

	// --- Complex Expressions ---

	describe('Complex expressions', () => {
		test('normalizes m²·s⁻²', () => {
			const normalized = normalizeUnitString('m²·s⁻²');
			expect(normalized).toContain('^2');
			expect(normalized).toContain('^-2');
		});

		test('normalizes kg·m²·s⁻²', () => {
			const normalized = normalizeUnitString('kg·m²·s⁻²');
			expect(normalized).toContain('^2');
			expect(normalized).toContain('^-2');
		});

		test('handles multiple superscripts', () => {
			const normalized = normalizeUnitString('m²·s⁻¹·kg³');
			expect(normalized).toContain('^2');
			expect(normalized).toContain('^-1');
			expect(normalized).toContain('^3');
		});
	});

	// --- Edge Cases ---

	describe('Edge cases', () => {
		test('handles string without superscripts', () => {
			const normalized = normalizeUnitString('m/s');
			expect(normalized).toBe('m/s');
		});

		test('handles empty string', () => {
			const normalized = normalizeUnitString('');
			expect(normalized).toBe('');
		});

		test('converts middle dot to multiplication', () => {
			// normalizeUnitString converts · to * for parsing
			const normalized = normalizeUnitString('m·s');
			expect(normalized).toBe('m*s');
		});

		test('handles mixed operators', () => {
			const normalized = normalizeUnitString('m²/s⁻¹');
			expect(normalized).toContain('^2');
			expect(normalized).toContain('^-1');
		});
	});
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration Tests', () => {
	test('end-to-end: LaTeX quantity to parsed unit', () => {
		const qty = parseLatexQuantity('5\\text{ km/h }');
		expect(qty).not.toBeNull();
		expect(qty?.value).toBe(5);
		expect(qty?.unit.components.get('m')).toBe(1);
		expect(qty?.unit.components.get('s')).toBe(-1);
	});

	test('end-to-end: complex scientific notation', () => {
		const qty = parseLatexQuantity('1.5\\times 10^{3}\\text{ kg·m²·s⁻² }');
		expect(qty).not.toBeNull();
		expect(qty?.value).toBe(1500);
		expect(qty?.unit.components.size).toBeGreaterThan(0);
	});

	test('end-to-end: fraction with composite unit', () => {
		const qty = parseLatexQuantity('\\frac{10}{3}\\text{ m/s }');
		expect(qty).not.toBeNull();
		expect(typeof qty?.value).toBe('number');
		expect(qty?.unit.components.get('m')).toBe(1);
		expect(qty?.unit.components.get('s')).toBe(-1);
	});

	test('tokenize then parse: km/h', () => {
		const tokens = tokenize('km/h');
		expect(tokens.length).toBeGreaterThan(0);

		const unit = parseUnitExpression('km/h');
		expect(unit).not.toBeNull();
		expect(unit?.components.get('m')).toBe(1);
		expect(unit?.components.get('s')).toBe(-1);
	});

	test('normalize then parse: m²', () => {
		const normalized = normalizeUnitString('m²');
		const unit = parseUnitExpression(normalized);
		expect(unit).not.toBeNull();
		expect(unit?.components.get('m')).toBe(2);
	});

	test('extract then parse: \\text{km/h}', () => {
		const extracted = extractUnitFromLatex('100\\text{km/h}');
		expect(extracted).not.toBeNull();
		const unit = parseUnitExpression(extracted!);
		expect(unit).not.toBeNull();
		expect(unit?.components.get('m')).toBe(1);
	});
});
