/**
 * Tests for `pedagogical-rules/radicals.ts` (Phase 5).
 *
 * Coverage :
 * - extractPerfectSquare : √8, √18, √45 (perfect-square factor extraction)
 * - extractPerfectSquare : leaves √2, √5 alone
 * - extractPerfectSquare : √4 → 2 (full extraction)
 * - multiplyRadicals : √2 × √3 → √6, √2 × √8 → 4 (full collapse)
 * - applicableLevels matrix
 */

import { describe, expect, it } from 'vitest';
import { multiply, number, sqrt } from '../../factory';
import { applyRule } from '../../pattern/rule';
import { toLatex } from '../../latex-generator';
import {
	RADICAL_RULES,
	extractPerfectSquare,
	multiplyRadicals
} from '../pedagogical-rules/radicals';

describe('radicals rules', () => {
	describe('extractPerfectSquare', () => {
		it('√8 → 2√2', () => {
			const result = applyRule(extractPerfectSquare.rule, sqrt(number('8')));
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('2');
			expect(latex).toContain('sqrt');
			// Should NOT still contain 8
			expect(latex).not.toContain('8');
		});

		it('√18 → 3√2', () => {
			const result = applyRule(extractPerfectSquare.rule, sqrt(number('18')));
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('3');
			expect(latex).toContain('sqrt');
			expect(latex).not.toContain('18');
		});

		it('√45 → 3√5', () => {
			const result = applyRule(extractPerfectSquare.rule, sqrt(number('45')));
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('3');
			expect(latex).toContain('5');
		});

		it('√4 → 2 (full extraction, no remaining radical)', () => {
			const result = applyRule(extractPerfectSquare.rule, sqrt(number('4')));
			expect(result).not.toBeNull();
			expect(toLatex(result!)).toBe('2');
		});

		it('does NOT fire on √2 (already simplified)', () => {
			const result = applyRule(extractPerfectSquare.rule, sqrt(number('2')));
			expect(result).toBeNull();
		});

		it('does NOT fire on √5 (already simplified)', () => {
			const result = applyRule(extractPerfectSquare.rule, sqrt(number('5')));
			expect(result).toBeNull();
		});

		it('does NOT fire on √1', () => {
			const result = applyRule(extractPerfectSquare.rule, sqrt(number('1')));
			expect(result).toBeNull();
		});

		it('does NOT apply in primaire', () => {
			expect(extractPerfectSquare.applicableLevels).not.toContain('primaire');
		});

		it('description college is pedagogical', () => {
			expect(extractPerfectSquare.descriptions.college?.({})).toBe(
				'On extrait le facteur carré parfait sous la racine'
			);
		});
	});

	describe('multiplyRadicals', () => {
		it('√2 × √3 → √6', () => {
			const result = applyRule(
				multiplyRadicals.rule,
				multiply(sqrt(number('2')), sqrt(number('3')), 'cross')
			);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('sqrt');
			expect(latex).toContain('6');
		});

		// La règle ne fait plus QUE multiplier : l'extraction du carré parfait
		// est une étape à part, pour que l'élève voie √2 × √8 = √16 puis
		// √16 = 4 au lieu du résultat d'un bloc.
		it('√2 × √8 → √16 (sans extraire)', () => {
			const result = applyRule(
				multiplyRadicals.rule,
				multiply(sqrt(number('2')), sqrt(number('8')), 'cross')
			);
			expect(result).not.toBeNull();
			expect(toLatex(result!)).toBe('\\sqrt{16}');
		});

		it('√3 × √12 → √36 (sans extraire)', () => {
			const result = applyRule(
				multiplyRadicals.rule,
				multiply(sqrt(number('3')), sqrt(number('12')), 'cross')
			);
			expect(result).not.toBeNull();
			expect(toLatex(result!)).toBe('\\sqrt{36}');
		});

		// Chemin B : quand le produit n'est pas un carré parfait et qu'une
		// racine se simplifie, la règle se RETIRE pour laisser l'extraction
		// passer devant — sinon il faudrait factoriser 216 de tête.
		it('ne mord PAS sur √12 × √18 (laisse extraire d abord)', () => {
			const result = applyRule(
				multiplyRadicals.rule,
				multiply(sqrt(number('12')), sqrt(number('18')), 'cross')
			);
			expect(result).toBeNull();
		});

		it('multiplie les racines à coefficient : 2√3 × 3√2 → 6√6', () => {
			const result = applyRule(
				multiplyRadicals.rule,
				multiply(
					multiply(number('2'), sqrt(number('3')), 'implicit'),
					multiply(number('3'), sqrt(number('2')), 'implicit'),
					'cross'
				)
			);
			expect(result).not.toBeNull();
			expect(toLatex(result!)).toBe('6 \\sqrt{6}');
		});

		it('does NOT fire on x × √3 (left is not a √)', () => {
			const result = applyRule(
				multiplyRadicals.rule,
				multiply(number('5'), sqrt(number('3')), 'cross')
			);
			expect(result).toBeNull();
		});

		it('does NOT apply in primaire', () => {
			expect(multiplyRadicals.applicableLevels).not.toContain('primaire');
		});

		it('description college mentions racine', () => {
			expect(multiplyRadicals.descriptions.college?.({})).toContain('racine');
		});
	});

	describe('RADICAL_RULES export', () => {
		it('contains 3 rules (extract + multiply + rationalize-denominator)', () => {
			// simplifyRootOfSquare is opt-in (decision C-1) and intentionally
			// NOT in RADICAL_RULES — added by the loader only when the flag
			// is set.
			expect(RADICAL_RULES).toHaveLength(3);
		});
	});
});
