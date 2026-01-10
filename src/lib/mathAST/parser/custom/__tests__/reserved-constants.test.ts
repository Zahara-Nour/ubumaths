/**
 * Tests for reserved constants 'e' and 'i' in Custom parser
 *
 * In the custom parser:
 * - 'e' is parsed as MathConstantNode('euler') - Euler's number
 * - 'i' is parsed as ComplexNode(0, 1) - imaginary unit
 */

import { describe, it, expect } from 'vitest';
import { parseCustomSafe } from '../index';
import {
	isMathConstant,
	isEulerConstant,
	isComplex,
	isNumber,
	isSuperscript
} from '../../../guards';

describe('Reserved constants in custom parser', () => {
	describe("Euler's number 'e'", () => {
		it("parses 'e' as MathConstantNode(euler)", () => {
			const result = parseCustomSafe('e');
			expect(result.errors).toHaveLength(0);
			expect(result.ast).not.toBeNull();

			expect(isMathConstant(result.ast!)).toBe(true);
			expect(isEulerConstant(result.ast!)).toBe(true);
			if (isMathConstant(result.ast!)) {
				expect(result.ast!.constant).toBe('euler');
			}
		});

		it("parses 'e^x' as e^x with Euler constant as base", () => {
			const result = parseCustomSafe('e^x');
			expect(result.errors).toHaveLength(0);
			expect(result.ast).not.toBeNull();

			expect(isSuperscript(result.ast!)).toBe(true);
			if (isSuperscript(result.ast!)) {
				expect(isEulerConstant(result.ast!.base)).toBe(true);
			}
		});

		it("parses '2e' as 2 * e (implicit multiplication)", () => {
			const result = parseCustomSafe('2e');
			expect(result.errors).toHaveLength(0);
			expect(result.ast).not.toBeNull();

			expect(result.ast!.type).toBe('multiplication');
			if (result.ast!.type === 'multiplication') {
				expect(isNumber(result.ast!.left)).toBe(true);
				expect(isEulerConstant(result.ast!.right)).toBe(true);
			}
		});
	});

	describe("Imaginary unit 'i'", () => {
		it("parses 'i' as ComplexNode(0, 1)", () => {
			const result = parseCustomSafe('i');
			expect(result.errors).toHaveLength(0);
			expect(result.ast).not.toBeNull();

			expect(isComplex(result.ast!)).toBe(true);
			if (isComplex(result.ast!)) {
				expect(isNumber(result.ast!.real)).toBe(true);
				expect(isNumber(result.ast!.imaginary)).toBe(true);
				if (isNumber(result.ast!.real) && isNumber(result.ast!.imaginary)) {
					expect(result.ast!.real.value).toBe('0');
					expect(result.ast!.imaginary.value).toBe('1');
				}
			}
		});

		it("parses '3 + 4i' as 3 + (4 * i)", () => {
			const result = parseCustomSafe('3 + 4i');
			expect(result.errors).toHaveLength(0);
			expect(result.ast).not.toBeNull();
			expect(result.ast!.type).toBe('addition');
		});

		it("parses 'i^2' as i^2", () => {
			const result = parseCustomSafe('i^2');
			expect(result.errors).toHaveLength(0);
			expect(result.ast).not.toBeNull();

			expect(isSuperscript(result.ast!)).toBe(true);
			if (isSuperscript(result.ast!)) {
				expect(isComplex(result.ast!.base)).toBe(true);
			}
		});
	});

	describe('combined expressions', () => {
		it("parses 'e^2' correctly", () => {
			const result = parseCustomSafe('e^2');
			expect(result.errors).toHaveLength(0);
			expect(result.ast).not.toBeNull();

			expect(isSuperscript(result.ast!)).toBe(true);
			if (isSuperscript(result.ast!)) {
				expect(isEulerConstant(result.ast!.base)).toBe(true);
			}
		});

		it("parses 'a + bi' with a, b as variables and i as imaginary unit", () => {
			const result = parseCustomSafe('a + bi');
			expect(result.errors).toHaveLength(0);
			expect(result.ast).not.toBeNull();

			// Should be: a + (b * i)
			expect(result.ast!.type).toBe('addition');
		});
	});
});
