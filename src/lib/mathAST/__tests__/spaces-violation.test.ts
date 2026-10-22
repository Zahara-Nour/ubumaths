/**
 * Espaces des milliers : la détection seule (`checkSpacesViolation`), sans le juge.
 *
 * Repris de l'ancien test de `checkSpaces` (questions/constraint-validators),
 * enveloppe morte supprimée : ces cas sont la couverture fine de la détection
 * qu'utilise `checkForm`. Comportement actuel (4 chiffres = espace exigée), à
 * revoir avec la décision E2 du chantier simplify-carte.
 */

import { describe, it, expect } from 'vitest';
import { checkSpacesViolation } from '../cosmetic-transforms';

describe('checkSpacesViolation', () => {
	describe('French Format - Integer Part', () => {
		it('should allow 3 digits or fewer without spacing', () => {
			expect(checkSpacesViolation('1')).toBe(false);
			expect(checkSpacesViolation('12')).toBe(false);
			expect(checkSpacesViolation('123')).toBe(false);
		});

		it('should require spacing for 4+ digits (French math convention)', () => {
			expect(checkSpacesViolation('1234')).toBe(true);
			expect(checkSpacesViolation('12345')).toBe(true);
			expect(checkSpacesViolation('123456')).toBe(true);
		});

		it('should allow correct spacing with regular space', () => {
			expect(checkSpacesViolation('1 234')).toBe(false);
			expect(checkSpacesViolation('12 345')).toBe(false);
			expect(checkSpacesViolation('123 456')).toBe(false);
			expect(checkSpacesViolation('1 234 567')).toBe(false);
		});

		it('should allow correct spacing with LaTeX thin space (\\,)', () => {
			expect(checkSpacesViolation('1\\,234')).toBe(false);
			expect(checkSpacesViolation('12\\,345')).toBe(false);
			expect(checkSpacesViolation('1\\,234\\,567')).toBe(false);
		});

		it('should detect incorrect space positions in integer part', () => {
			// Wrong spacing positions (should be groups of 3 from right)
			expect(checkSpacesViolation('12 34')).toBe(true);
		});

		it('should allow large numbers with proper spacing', () => {
			expect(checkSpacesViolation('1 234 567 890')).toBe(false);
			expect(checkSpacesViolation('12 345 678 901 234')).toBe(false);
		});
	});

	describe('French Format - Decimal Part', () => {
		it('should allow 3 decimal digits or fewer without spacing', () => {
			expect(checkSpacesViolation('0.123')).toBe(false);
			expect(checkSpacesViolation('0{,}123')).toBe(false); // French LaTeX comma
		});

		it('should require spacing for 4+ decimal digits (French math convention)', () => {
			expect(checkSpacesViolation('0.1234')).toBe(true);
			expect(checkSpacesViolation('0{,}1234')).toBe(true);
			expect(checkSpacesViolation('0.12345')).toBe(true);
		});

		it('should allow correct decimal spacing (groups of 3 from left)', () => {
			expect(checkSpacesViolation('0.123 456')).toBe(false);
			expect(checkSpacesViolation('0{,}123 456')).toBe(false);
			expect(checkSpacesViolation('0.123 456 789')).toBe(false);
		});

		it('should detect incorrect decimal spacing', () => {
			expect(checkSpacesViolation('0.1234 56')).toBe(true);
		});

		it('should handle both integer and decimal parts', () => {
			expect(checkSpacesViolation('1 234.567')).toBe(false);
			expect(checkSpacesViolation('1 234.567 890')).toBe(false);
		});
	});

	describe('French Decimal Separator', () => {
		it('should recognize {,} as French decimal comma', () => {
			expect(checkSpacesViolation('3{,}14159')).toBe(true); // 5 decimal digits
			expect(checkSpacesViolation('3{,}1234')).toBe(true); // 4 decimal digits
			expect(checkSpacesViolation('3{,}141')).toBe(false); // 3 decimal digits
		});

		it('should recognize , as decimal separator in digit,digit pattern', () => {
			expect(checkSpacesViolation('3,14159')).toBe(true); // 5 decimal digits
			expect(checkSpacesViolation('3,1234')).toBe(true); // 4 decimal digits
			expect(checkSpacesViolation('3,141')).toBe(false); // 3 decimal digits
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty strings', () => {
			expect(checkSpacesViolation('')).toBe(false);
		});

		it('should handle negative numbers', () => {
			expect(checkSpacesViolation('-1 234')).toBe(false);
			expect(checkSpacesViolation('-12345')).toBe(true);
		});

		it('should handle zero', () => {
			expect(checkSpacesViolation('0')).toBe(false);
			expect(checkSpacesViolation('0.123')).toBe(false);
		});

		it('should handle multiple spaces (normalize them)', () => {
			expect(checkSpacesViolation('1  234')).toBe(false); // Multiple spaces should be normalized
		});
	});
});
