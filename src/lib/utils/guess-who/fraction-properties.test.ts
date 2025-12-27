/**
 * Tests for Guess Who Math Game - Fraction Properties
 *
 * @module utils/guess-who/fraction-properties.test
 */

import { describe, it, expect } from 'vitest';
import {
	gcd,
	reduceFraction,
	isIrreducible,
	areEquivalent,
	compareToOne,
	toDecimal,
	hasEvenNumerator,
	hasOddNumerator,
	hasPrimeNumerator,
	hasEvenDenominator,
	hasOddDenominator,
	hasPrimeDenominator,
	isGreaterThanOne,
	isLessThanOne,
	equalsOne,
	isEquivalentToHalf,
	checkFractionProperty,
	generateUniqueFractions,
	fractionToString,
	parseFraction,
	fractionsEqual,
	fractionToUbumark,
	fractionToInline,
	type Fraction
} from './fraction-properties';

describe('gcd', () => {
	it('calculates GCD of two numbers', () => {
		expect(gcd(12, 8)).toBe(4);
		expect(gcd(17, 13)).toBe(1);
		expect(gcd(100, 25)).toBe(25);
		expect(gcd(7, 7)).toBe(7);
	});

	it('handles zero', () => {
		expect(gcd(0, 5)).toBe(5);
		expect(gcd(5, 0)).toBe(5);
	});

	it('handles negative numbers', () => {
		expect(gcd(-12, 8)).toBe(4);
		expect(gcd(12, -8)).toBe(4);
	});
});

describe('reduceFraction', () => {
	it('reduces fractions to lowest terms', () => {
		expect(reduceFraction({ numerator: 4, denominator: 8 })).toEqual({
			numerator: 1,
			denominator: 2
		});
		expect(reduceFraction({ numerator: 6, denominator: 9 })).toEqual({
			numerator: 2,
			denominator: 3
		});
	});

	it('keeps irreducible fractions unchanged', () => {
		expect(reduceFraction({ numerator: 3, denominator: 4 })).toEqual({
			numerator: 3,
			denominator: 4
		});
	});
});

describe('isIrreducible', () => {
	it('returns true for irreducible fractions', () => {
		expect(isIrreducible({ numerator: 3, denominator: 4 })).toBe(true);
		expect(isIrreducible({ numerator: 7, denominator: 11 })).toBe(true);
		expect(isIrreducible({ numerator: 1, denominator: 2 })).toBe(true);
	});

	it('returns false for reducible fractions', () => {
		expect(isIrreducible({ numerator: 4, denominator: 8 })).toBe(false);
		expect(isIrreducible({ numerator: 6, denominator: 9 })).toBe(false);
		expect(isIrreducible({ numerator: 10, denominator: 15 })).toBe(false);
	});
});

describe('areEquivalent', () => {
	it('returns true for equivalent fractions', () => {
		expect(areEquivalent({ numerator: 1, denominator: 2 }, { numerator: 2, denominator: 4 })).toBe(
			true
		);
		expect(areEquivalent({ numerator: 3, denominator: 4 }, { numerator: 6, denominator: 8 })).toBe(
			true
		);
	});

	it('returns false for non-equivalent fractions', () => {
		expect(areEquivalent({ numerator: 1, denominator: 2 }, { numerator: 2, denominator: 5 })).toBe(
			false
		);
		expect(areEquivalent({ numerator: 3, denominator: 4 }, { numerator: 4, denominator: 5 })).toBe(
			false
		);
	});
});

describe('compareToOne', () => {
	it('returns -1 for fractions less than 1', () => {
		expect(compareToOne({ numerator: 3, denominator: 4 })).toBe(-1);
		expect(compareToOne({ numerator: 1, denominator: 2 })).toBe(-1);
	});

	it('returns 0 for fractions equal to 1', () => {
		expect(compareToOne({ numerator: 4, denominator: 4 })).toBe(0);
		expect(compareToOne({ numerator: 7, denominator: 7 })).toBe(0);
	});

	it('returns 1 for fractions greater than 1', () => {
		expect(compareToOne({ numerator: 5, denominator: 3 })).toBe(1);
		expect(compareToOne({ numerator: 7, denominator: 4 })).toBe(1);
	});
});

describe('toDecimal', () => {
	it('converts fractions to decimal', () => {
		expect(toDecimal({ numerator: 1, denominator: 2 })).toBe(0.5);
		expect(toDecimal({ numerator: 3, denominator: 4 })).toBe(0.75);
		expect(toDecimal({ numerator: 1, denominator: 3 })).toBeCloseTo(0.333, 2);
	});
});

describe('numerator properties', () => {
	const evenNum: Fraction = { numerator: 4, denominator: 7 };
	const oddNum: Fraction = { numerator: 5, denominator: 8 };
	const primeNum: Fraction = { numerator: 7, denominator: 10 };

	it('hasEvenNumerator', () => {
		expect(hasEvenNumerator(evenNum)).toBe(true);
		expect(hasEvenNumerator(oddNum)).toBe(false);
	});

	it('hasOddNumerator', () => {
		expect(hasOddNumerator(oddNum)).toBe(true);
		expect(hasOddNumerator(evenNum)).toBe(false);
	});

	it('hasPrimeNumerator', () => {
		expect(hasPrimeNumerator(primeNum)).toBe(true);
		expect(hasPrimeNumerator(evenNum)).toBe(false);
	});
});

describe('denominator properties', () => {
	const evenDenom: Fraction = { numerator: 3, denominator: 4 };
	const oddDenom: Fraction = { numerator: 2, denominator: 7 };
	const primeDenom: Fraction = { numerator: 4, denominator: 11 };

	it('hasEvenDenominator', () => {
		expect(hasEvenDenominator(evenDenom)).toBe(true);
		expect(hasEvenDenominator(oddDenom)).toBe(false);
	});

	it('hasOddDenominator', () => {
		expect(hasOddDenominator(oddDenom)).toBe(true);
		expect(hasOddDenominator(evenDenom)).toBe(false);
	});

	it('hasPrimeDenominator', () => {
		expect(hasPrimeDenominator(primeDenom)).toBe(true);
		expect(hasPrimeDenominator(evenDenom)).toBe(false);
	});
});

describe('comparison properties', () => {
	it('isGreaterThanOne', () => {
		expect(isGreaterThanOne({ numerator: 5, denominator: 3 })).toBe(true);
		expect(isGreaterThanOne({ numerator: 3, denominator: 5 })).toBe(false);
		expect(isGreaterThanOne({ numerator: 4, denominator: 4 })).toBe(false);
	});

	it('isLessThanOne', () => {
		expect(isLessThanOne({ numerator: 3, denominator: 5 })).toBe(true);
		expect(isLessThanOne({ numerator: 5, denominator: 3 })).toBe(false);
		expect(isLessThanOne({ numerator: 4, denominator: 4 })).toBe(false);
	});

	it('equalsOne', () => {
		expect(equalsOne({ numerator: 4, denominator: 4 })).toBe(true);
		expect(equalsOne({ numerator: 3, denominator: 4 })).toBe(false);
	});

	it('isEquivalentToHalf', () => {
		expect(isEquivalentToHalf({ numerator: 1, denominator: 2 })).toBe(true);
		expect(isEquivalentToHalf({ numerator: 2, denominator: 4 })).toBe(true);
		expect(isEquivalentToHalf({ numerator: 3, denominator: 6 })).toBe(true);
		expect(isEquivalentToHalf({ numerator: 2, denominator: 5 })).toBe(false);
	});
});

describe('checkFractionProperty', () => {
	const f: Fraction = { numerator: 3, denominator: 4 };

	it('checks is_irreducible', () => {
		expect(checkFractionProperty(f, 'is_irreducible')).toBe(true);
		expect(checkFractionProperty({ numerator: 4, denominator: 8 }, 'is_irreducible')).toBe(false);
	});

	it('checks numerator properties', () => {
		expect(checkFractionProperty(f, 'numerator_odd')).toBe(true);
		expect(checkFractionProperty(f, 'numerator_even')).toBe(false);
		expect(checkFractionProperty(f, 'numerator_prime')).toBe(true);
	});

	it('checks denominator properties', () => {
		expect(checkFractionProperty(f, 'denominator_even')).toBe(true);
		expect(checkFractionProperty(f, 'denominator_odd')).toBe(false);
		expect(checkFractionProperty(f, 'denominator_prime')).toBe(false);
	});

	it('checks comparison properties', () => {
		expect(checkFractionProperty(f, 'less_than_one')).toBe(true);
		expect(checkFractionProperty(f, 'greater_than_one')).toBe(false);
		expect(checkFractionProperty({ numerator: 5, denominator: 5 }, 'equals_one')).toBe(true);
	});

	it('checks parameterized properties', () => {
		expect(checkFractionProperty(f, 'numerator_greater_than', 2)).toBe(true);
		expect(checkFractionProperty(f, 'numerator_less_than', 5)).toBe(true);
		expect(checkFractionProperty(f, 'denominator_equals', 4)).toBe(true);
	});

	it('throws for missing required param', () => {
		expect(() => checkFractionProperty(f, 'numerator_greater_than')).toThrow();
		expect(() => checkFractionProperty(f, 'denominator_equals')).toThrow();
	});
});

describe('generateUniqueFractions', () => {
	it('generates the requested number of fractions', () => {
		const fractions = generateUniqueFractions(10, 1, 10, 2, 10);
		expect(fractions).toHaveLength(10);
	});

	it('generates unique (non-equivalent) fractions', () => {
		const fractions = generateUniqueFractions(10, 1, 10, 2, 10);

		// Check each pair for equivalence
		for (let i = 0; i < fractions.length; i++) {
			for (let j = i + 1; j < fractions.length; j++) {
				expect(areEquivalent(fractions[i], fractions[j])).toBe(false);
			}
		}
	});

	it('generates only irreducible fractions when requested', () => {
		const fractions = generateUniqueFractions(10, 1, 10, 2, 10, { irreducibleOnly: true });

		for (const f of fractions) {
			expect(isIrreducible(f)).toBe(true);
		}
	});

	it('throws when cannot generate enough unique fractions', () => {
		// Try to generate more fractions than possible in a tiny range
		expect(() => generateUniqueFractions(100, 1, 2, 2, 3)).toThrow();
	});
});

describe('fractionToString', () => {
	it('converts fraction to string', () => {
		expect(fractionToString({ numerator: 3, denominator: 4 })).toBe('3/4');
		expect(fractionToString({ numerator: 7, denominator: 2 })).toBe('7/2');
	});
});

describe('parseFraction', () => {
	it('parses valid fraction strings', () => {
		expect(parseFraction('3/4')).toEqual({ numerator: 3, denominator: 4 });
		expect(parseFraction('7/2')).toEqual({ numerator: 7, denominator: 2 });
	});

	it('throws for invalid strings', () => {
		expect(() => parseFraction('3')).toThrow();
		expect(() => parseFraction('a/b')).toThrow();
		expect(() => parseFraction('3/0')).toThrow();
	});
});

describe('fractionsEqual', () => {
	it('returns true for identical fractions', () => {
		expect(fractionsEqual({ numerator: 3, denominator: 4 }, { numerator: 3, denominator: 4 })).toBe(
			true
		);
	});

	it('returns false for different fractions (even if equivalent)', () => {
		expect(fractionsEqual({ numerator: 1, denominator: 2 }, { numerator: 2, denominator: 4 })).toBe(
			false
		);
	});
});

describe('display functions', () => {
	it('fractionToUbumark generates LaTeX format', () => {
		expect(fractionToUbumark({ numerator: 3, denominator: 4 })).toBe('$\\frac{3}{4}$');
		expect(fractionToUbumark({ numerator: 7, denominator: 2 })).toBe('$\\frac{7}{2}$');
	});

	it('fractionToInline generates simple format', () => {
		expect(fractionToInline({ numerator: 3, denominator: 4 })).toBe('3/4');
		expect(fractionToInline({ numerator: 7, denominator: 2 })).toBe('7/2');
	});
});
