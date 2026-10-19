/**
 * Unit System - Parser Tests
 * ==========================
 *
 * Comprehensive tests for Phase 2 of the unit system:
 * - Unit Expression Parser (parser.ts)
 *
 * Test Categories:
 * 1. Unit Expression Parsing - Parse unit strings to Unit objects
 * 2. LaTeX Unit Extraction - Extract units from \unit{} pattern
 * 3. LaTeX Quantity Parsing - Parse full LaTeX quantities (value + unit)
 * 4. Unit String Normalization - Normalize Unicode superscripts
 */

import { describe, test, expect } from 'vitest';
import {
	parseUnitExpression,
	extractUnitFromLatex,
	parseLatexQuantity,
	normalizeUnitString
} from '../parser';

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
		// Décision du 2026-09-24 (docs/pratiques/notation-unites.md) : une seule règle
		// d'écriture pour toute l'application. Les parenthèses ne servent qu'au
		// dénominateur (`kg/(m.s)`) ; une unité entière entre parenthèses, au carré
		// ou imbriquée, est refusée — pour m²/s², écrire `m^2/s^2`.
		test('parses a parenthesised denominator: kg/(m.s)', () => {
			const unit = parseUnitExpression('kg/(m.s)');
			expect(unit?.components.get('g')).toBe(1);
			expect(unit?.components.get('m')).toBe(-1);
			expect(unit?.components.get('s')).toBe(-1);
		});

		test.each(['(m/s)', '(m/s)²', '(m/s)^2', '((m/s))'])('refuses %s', (writing) => {
			expect(parseUnitExpression(writing)).toBeNull();
		});

		test('m^2/s^2 is the way to write (m/s)²', () => {
			const unit = parseUnitExpression('m^2/s^2');
			expect(unit?.components.get('m')).toBe(2);
			expect(unit?.components.get('s')).toBe(-2);
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
	// --- \\unit{} Pattern ---

	describe('\\unit{} pattern', () => {
		test('extracts unit from \\unit{km}', () => {
			const unit = extractUnitFromLatex('5\\unit{km}');
			expect(unit).toBe('km');
		});

		test('extracts unit from \\unit{m}', () => {
			const unit = extractUnitFromLatex('3.14\\unit{m}');
			expect(unit).toBe('m');
		});

		test('extracts unit with spaces inside \\unit{}', () => {
			const unit = extractUnitFromLatex('10\\unit{ m }');
			expect(unit).toBe('m');
		});

		test('extracts composite unit from \\unit{km/h}', () => {
			const unit = extractUnitFromLatex('5\\unit{km/h}');
			expect(unit).toBe('km/h');
		});

		test('extracts unit with superscripts from \\unit{m²}', () => {
			const unit = extractUnitFromLatex('2\\unit{m²}');
			expect(unit).toBe('m²');
		});

		test('extracts complex unit expression', () => {
			const unit = extractUnitFromLatex('9.8\\unit{m/s²}');
			expect(unit).toBe('m/s²');
		});

		test('extracts unit with dot notation', () => {
			const unit = extractUnitFromLatex('5\\unit{kg.m.s^{-2}}');
			expect(unit).toBe('kg.m.s^{-2}');
		});

		test('extracts currency symbol', () => {
			const unit = extractUnitFromLatex('25\\unit{€}');
			expect(unit).toBe('€');
		});

		test('extracts degree symbol', () => {
			const unit = extractUnitFromLatex('45\\unit{°}');
			expect(unit).toBe('°');
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

		test('returns null for old \\text{} pattern (no longer supported)', () => {
			const unit = extractUnitFromLatex('5\\text{km}');
			expect(unit).toBeNull();
		});

		test('returns null for old \\mathrm{} pattern (no longer supported)', () => {
			const unit = extractUnitFromLatex('5\\mathrm{m}');
			expect(unit).toBeNull();
		});

		test('returns null for tilde pattern (no longer supported)', () => {
			const unit = extractUnitFromLatex('25~€');
			expect(unit).toBeNull();
		});

		test('handles \\unit{} at different positions', () => {
			const unit = extractUnitFromLatex('\\frac{3}{2}\\unit{kg}');
			expect(unit).toBe('kg');
		});
	});
});

// ============================================================================
// LATEX QUANTITY PARSING TESTS
// ============================================================================

describe('LaTeX Quantity Parsing', () => {
	// --- Simple Quantities ---

	describe('Simple quantities', () => {
		test('parses 5\\unit{km}', () => {
			const qty = parseLatexQuantity('5\\unit{km}');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(5);
			expect(qty?.unit.components.get('m')).toBe(1);
			expect(qty?.unit.coefficient).toBe(1000);
		});

		test('parses 3.14\\unit{m}', () => {
			const qty = parseLatexQuantity('3.14\\unit{m}');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(3.14);
			expect(qty?.unit.components.get('m')).toBe(1);
		});

		test('parses -5\\unit{K}', () => {
			const qty = parseLatexQuantity('-5\\unit{K}');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(-5);
			expect(qty?.unit.components.get('K')).toBe(1);
		});

		test('parses 100\\unit{km/h}', () => {
			const qty = parseLatexQuantity('100\\unit{km/h}');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(100);
			expect(qty?.unit.components.get('m')).toBe(1);
			expect(qty?.unit.components.get('s')).toBe(-1);
		});
	});

	// --- Fractions ---

	describe('Fractions', () => {
		test('parses \\frac{3}{2}\\unit{kg}', () => {
			const qty = parseLatexQuantity('\\frac{3}{2}\\unit{kg}');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(1.5);
			expect(qty?.unit.components.get('g')).toBe(1);
		});

		test('parses \\frac{1}{2}\\unit{m}', () => {
			const qty = parseLatexQuantity('\\frac{1}{2}\\unit{m}');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(0.5);
		});

		test('parses complex fraction', () => {
			const qty = parseLatexQuantity('\\frac{5}{4}\\unit{s}');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(1.25);
		});
	});

	// --- Scientific Notation ---

	describe('Scientific notation', () => {
		test('parses 1.5\\times 10^{3}\\unit{m}', () => {
			const qty = parseLatexQuantity('1.5\\times 10^{3}\\unit{m}');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(1500);
			expect(qty?.unit.components.get('m')).toBe(1);
		});

		test('parses 2\\cdot 10^{-3}\\unit{s}', () => {
			const qty = parseLatexQuantity('2\\cdot 10^{-3}\\unit{s}');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(0.002);
		});

		test('parses 3.14\\times 10^{6}\\unit{m}', () => {
			const qty = parseLatexQuantity('3.14\\times 10^{6}\\unit{m}');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(3140000);
			expect(qty?.unit.components.get('m')).toBe(1);
		});
	});

	// --- Composite Units ---

	describe('Composite units', () => {
		test('parses 5\\unit{km/h}', () => {
			const qty = parseLatexQuantity('5\\unit{km/h}');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(5);
			expect(qty?.unit.components.get('m')).toBe(1);
			expect(qty?.unit.components.get('s')).toBe(-1);
		});

		test('parses 10\\unit{m²/s}', () => {
			const qty = parseLatexQuantity('10\\unit{m²/s}');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(10);
			expect(qty?.unit.components.get('m')).toBe(2);
			expect(qty?.unit.components.get('s')).toBe(-1);
		});

		test('parses 9.8\\unit{m/s²}', () => {
			const qty = parseLatexQuantity('9.8\\unit{m/s²}');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(9.8);
			expect(qty?.unit.components.get('s')).toBe(-2);
		});
	});

	// --- Dimensionless Quantities ---

	describe('Dimensionless quantities', () => {
		test('parses number without unit as dimensionless', () => {
			const qty = parseLatexQuantity('42');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(42);
			expect(qty?.unit.components.size).toBe(0);
		});

		test('parses decimal without unit', () => {
			const qty = parseLatexQuantity('3.14');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(3.14);
			expect(qty?.unit.components.size).toBe(0);
		});

		test('parses fraction without unit', () => {
			const qty = parseLatexQuantity('\\frac{1}{2}');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(0.5);
			expect(qty?.unit.components.size).toBe(0);
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

		test('returns null for invalid unit', () => {
			const qty = parseLatexQuantity('5\\unit{xyz}');
			expect(qty).toBeNull();
		});

		test('returns null for non-numeric value', () => {
			const qty = parseLatexQuantity('abc\\unit{m}');
			expect(qty).toBeNull();
		});

		test('returns null for old \\text{} format', () => {
			// Format abandonné : `\text{km}` n'est pas une unité, et la valeur
			// `5\text{km}` n'est pas un nombre (la saisie élève est d'abord normalisée)
			expect(parseLatexQuantity('5\\text{km}')).toBeNull();
		});
	});

	// --- Valeur lue en arbre (mathAST) ---

	describe('Valeur lue en arbre', () => {
		test('un calcul de nombres est calculé, et en valeur exacte', () => {
			expect(parseLatexQuantity('3+2\\unit{m}')?.value).toBe(5);
			expect(parseLatexQuantity('2+\\frac{1}{2}\\unit{m}')?.value).toBe(2.5);
			// En flottants, 0,1 + 0,2 vaut 0.30000000000000004
			expect(parseLatexQuantity('0.1+0.2\\unit{m}')?.value).toBe(0.3);
		});

		test('notation scientifique et fraction, virgule décimale comprise', () => {
			expect(parseLatexQuantity('1{,}5\\cdot10^{-2}\\unit{m}')?.value).toBe(0.015);
			expect(parseLatexQuantity('1,5\\times10^{3}\\unit{m}')?.value).toBe(1500);
			expect(parseLatexQuantity('\\frac{2{,}5}{2}\\unit{m}')?.value).toBe(1.25);
			expect(parseLatexQuantity('2,5\\unit{m}')?.value).toBe(2.5);
		});

		test('la valeur est toujours un nombre', () => {
			expect(typeof parseLatexQuantity('3+2\\unit{m}')?.value).toBe('number');
			expect(typeof parseLatexQuantity('(-3)\\unit{m}')?.value).toBe('number');
		});

		test('une valeur non rationnelle est illisible (jamais son premier nombre)', () => {
			expect(parseLatexQuantity('2\\sqrt{2}\\unit{m}')).toBeNull();
			expect(parseLatexQuantity('2\\pi\\unit{m}')).toBeNull();
			expect(parseLatexQuantity('\\pi\\unit{m}')).toBeNull();
			expect(parseLatexQuantity('5x\\unit{m}')).toBeNull();
		});

		test('habillages sans sens autour de la valeur : retirés', () => {
			expect(parseLatexQuantity('5\\text{ }\\unit{m}')?.value).toBe(5);
			expect(parseLatexQuantity('\\num{5}\\unit{m}')?.value).toBe(5);
			expect(parseLatexQuantity('5~\\unit{m}')?.value).toBe(5);
			expect(parseLatexQuantity('12\\,500\\unit{m}')?.value).toBe(12500);
		});

		test('une division par zéro est illisible', () => {
			expect(parseLatexQuantity('\\frac{1}{0}\\unit{m}')).toBeNull();
		});
	});

	// --- Edge Cases ---

	describe('Edge cases', () => {
		test('handles whitespace around LaTeX', () => {
			const qty = parseLatexQuantity('  5\\unit{m}  ');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(5);
		});

		test('parses with currency symbol', () => {
			const qty = parseLatexQuantity('100\\unit{€}');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(100);
		});

		test('parses with degree symbol', () => {
			const qty = parseLatexQuantity('45\\unit{°}');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(45);
		});

		test('parses with micro symbol', () => {
			const qty = parseLatexQuantity('500\\unit{μm}');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(500);
		});

		test('handles comma as decimal separator', () => {
			const qty = parseLatexQuantity('3,14\\unit{m}');
			expect(qty).not.toBeNull();
			expect(qty?.value).toBe(3.14);
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
		const qty = parseLatexQuantity('5\\unit{km/h}');
		expect(qty).not.toBeNull();
		expect(qty?.value).toBe(5);
		expect(qty?.unit.components.get('m')).toBe(1);
		expect(qty?.unit.components.get('s')).toBe(-1);
	});

	test('end-to-end: complex scientific notation', () => {
		const qty = parseLatexQuantity('1.5\\times 10^{3}\\unit{kg·m²·s⁻²}');
		expect(qty).not.toBeNull();
		expect(qty?.value).toBe(1500);
		expect(qty?.unit.components.size).toBeGreaterThan(0);
	});

	test('end-to-end: fraction with composite unit', () => {
		const qty = parseLatexQuantity('\\frac{10}{3}\\unit{m/s}');
		expect(qty).not.toBeNull();
		expect(typeof qty?.value).toBe('number');
		expect(qty?.unit.components.get('m')).toBe(1);
		expect(qty?.unit.components.get('s')).toBe(-1);
	});

	test('parse: km/h', () => {
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

	test('extract then parse: \\unit{km/h}', () => {
		const extracted = extractUnitFromLatex('100\\unit{km/h}');
		expect(extracted).not.toBeNull();
		const unit = parseUnitExpression(extracted!);
		expect(unit).not.toBeNull();
		expect(unit?.components.get('m')).toBe(1);
	});
});
