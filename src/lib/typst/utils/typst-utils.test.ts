/**
 * Tests for Typst utilities
 */
import { describe, it, expect } from 'vitest';
import { formatNumber, toRoman, formatDateFR, getTypeLabel } from './typst-utils';

describe('formatNumber', () => {
	describe('numeric style', () => {
		it('formats numbers as strings', () => {
			expect(formatNumber(1, 'numeric')).toBe('1');
			expect(formatNumber(10, 'numeric')).toBe('10');
			expect(formatNumber(100, 'numeric')).toBe('100');
		});
	});

	describe('alphabetic style', () => {
		it('converts 1-26 to A-Z', () => {
			expect(formatNumber(1, 'alphabetic')).toBe('A');
			expect(formatNumber(2, 'alphabetic')).toBe('B');
			expect(formatNumber(3, 'alphabetic')).toBe('C');
			expect(formatNumber(26, 'alphabetic')).toBe('Z');
		});

		it('handles numbers beyond 26', () => {
			// 27 wraps to '[' in ASCII, which may not be ideal but is expected behavior
			expect(formatNumber(27, 'alphabetic')).toBe('[');
		});
	});

	describe('roman style', () => {
		it('converts numbers to Roman numerals', () => {
			expect(formatNumber(1, 'roman')).toBe('I');
			expect(formatNumber(5, 'roman')).toBe('V');
			expect(formatNumber(10, 'roman')).toBe('X');
			expect(formatNumber(50, 'roman')).toBe('L');
			expect(formatNumber(100, 'roman')).toBe('C');
		});
	});
});

describe('toRoman', () => {
	it('converts basic numbers', () => {
		expect(toRoman(1)).toBe('I');
		expect(toRoman(2)).toBe('II');
		expect(toRoman(3)).toBe('III');
		expect(toRoman(4)).toBe('IV');
		expect(toRoman(5)).toBe('V');
		expect(toRoman(6)).toBe('VI');
		expect(toRoman(7)).toBe('VII');
		expect(toRoman(8)).toBe('VIII');
		expect(toRoman(9)).toBe('IX');
		expect(toRoman(10)).toBe('X');
	});

	it('converts tens', () => {
		expect(toRoman(20)).toBe('XX');
		expect(toRoman(30)).toBe('XXX');
		expect(toRoman(40)).toBe('XL');
		expect(toRoman(50)).toBe('L');
		expect(toRoman(60)).toBe('LX');
		expect(toRoman(70)).toBe('LXX');
		expect(toRoman(80)).toBe('LXXX');
		expect(toRoman(90)).toBe('XC');
	});

	it('converts hundreds', () => {
		expect(toRoman(100)).toBe('C');
		expect(toRoman(200)).toBe('CC');
		expect(toRoman(300)).toBe('CCC');
		expect(toRoman(400)).toBe('CD');
		expect(toRoman(500)).toBe('D');
		expect(toRoman(900)).toBe('CM');
	});

	it('converts thousands', () => {
		expect(toRoman(1000)).toBe('M');
		expect(toRoman(2000)).toBe('MM');
		expect(toRoman(3000)).toBe('MMM');
	});

	it('converts complex numbers', () => {
		expect(toRoman(14)).toBe('XIV');
		expect(toRoman(19)).toBe('XIX');
		expect(toRoman(42)).toBe('XLII');
		expect(toRoman(99)).toBe('XCIX');
		expect(toRoman(999)).toBe('CMXCIX');
		expect(toRoman(1999)).toBe('MCMXCIX');
		expect(toRoman(2024)).toBe('MMXXIV');
	});

	it('handles zero', () => {
		expect(toRoman(0)).toBe('');
	});
});

describe('formatDateFR', () => {
	it('formats a date in French locale', () => {
		// Use a fixed date for consistent testing
		const date = new Date(2024, 11, 15); // December 15, 2024
		const result = formatDateFR(date);

		// Check that it contains expected French date elements
		expect(result).toContain('15');
		expect(result).toMatch(/d[eé]cembre/i);
		expect(result).toContain('2024');
	});

	it('uses current date when no date provided', () => {
		const result = formatDateFR();
		const now = new Date();

		// Should contain current year
		expect(result).toContain(now.getFullYear().toString());
	});
});

describe('getTypeLabel', () => {
	it('returns correct French labels for worksheet types', () => {
		expect(getTypeLabel('worksheet')).toBe("Feuille d'exercices");
		expect(getTypeLabel('assessment')).toBe('Evaluation');
		expect(getTypeLabel('exam')).toBe('Examen');
		expect(getTypeLabel('quiz')).toBe('Quiz');
		expect(getTypeLabel('homework')).toBe('Devoirs');
	});

	it('returns default label for unknown types', () => {
		expect(getTypeLabel('unknown')).toBe("Feuille d'exercices");
		expect(getTypeLabel('')).toBe("Feuille d'exercices");
	});
});
