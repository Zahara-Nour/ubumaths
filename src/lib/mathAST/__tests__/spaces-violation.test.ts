/**
 * Espaces des milliers : la détection seule (`checkSpacesViolation`), sans le juge.
 *
 * Repris de l'ancien test de `checkSpaces` (questions/constraint-validators),
 * enveloppe morte supprimée : ces cas sont la couverture fine de la détection
 * qu'utilise `checkForm`. Règle du BIPM (décision E2, simplify-carte § 15) : à
 * 4 chiffres l'espace est facultative, dès 5 elle est exigée ; chaque côté de la
 * virgule compte à part. Une espace mal placée reste une faute.
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

		it('4 chiffres : espace facultative', () => {
			expect(checkSpacesViolation('1024')).toBe(false);
			expect(checkSpacesViolation('1 024')).toBe(false);
			expect(checkSpacesViolation('1\\,024')).toBe(false);
			expect(checkSpacesViolation('-1024')).toBe(false);
		});

		it('dès 5 chiffres : espace exigée', () => {
			expect(checkSpacesViolation('30000')).toBe(true);
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
			expect(checkSpacesViolation('10 24')).toBe(true);
			expect(checkSpacesViolation('1234 567')).toBe(true);
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

		it('4 décimales : espace facultative', () => {
			expect(checkSpacesViolation('0.1234')).toBe(false);
			expect(checkSpacesViolation('0{,}1234')).toBe(false);
			expect(checkSpacesViolation('0{,}123 4')).toBe(false);
			expect(checkSpacesViolation('0{,}123\\,4')).toBe(false);
		});

		it('dès 5 décimales : espace exigée', () => {
			expect(checkSpacesViolation('0.12345')).toBe(true);
			expect(checkSpacesViolation('0{,}12345')).toBe(true);
			expect(checkSpacesViolation('0{,}123 45')).toBe(false);
		});

		it('should allow correct decimal spacing (groups of 3 from left)', () => {
			expect(checkSpacesViolation('0.123 456')).toBe(false);
			expect(checkSpacesViolation('0{,}123 456')).toBe(false);
			expect(checkSpacesViolation('0.123 456 789')).toBe(false);
		});

		it('should detect incorrect decimal spacing', () => {
			expect(checkSpacesViolation('0.1234 56')).toBe(true);
			expect(checkSpacesViolation('0{,}12 34')).toBe(true);
		});

		it('should handle both integer and decimal parts', () => {
			expect(checkSpacesViolation('1 234.567')).toBe(false);
			expect(checkSpacesViolation('1 234.567 890')).toBe(false);
			// Chaque côté compté à part : 4 + 4, rien d'exigé
			expect(checkSpacesViolation('1234{,}5678')).toBe(false);
			expect(checkSpacesViolation('12345{,}6')).toBe(true);
		});
	});

	describe('French Decimal Separator', () => {
		it('should recognize {,} as French decimal comma', () => {
			expect(checkSpacesViolation('3{,}14159')).toBe(true); // 5 decimal digits
			expect(checkSpacesViolation('3{,}1234')).toBe(false); // 4 decimal digits
			expect(checkSpacesViolation('3{,}141')).toBe(false); // 3 decimal digits
		});

		it('should recognize , as decimal separator in digit,digit pattern', () => {
			expect(checkSpacesViolation('3,14159')).toBe(true); // 5 decimal digits
			expect(checkSpacesViolation('3,1234')).toBe(false); // 4 decimal digits
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
