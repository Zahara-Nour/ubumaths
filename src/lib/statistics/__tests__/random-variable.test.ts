/**
 * Variable aléatoire finie : loi, espérance, variance, écart type — en calcul
 * EXACT (fractions). Programme de 1re spécialité, `1SPE-156` à `1SPE-166`.
 *
 * Spécification validée par David le 2026-10-01 (lot 6, Q40).
 */

import { describe, it, expect } from 'vitest';
import { Fraction } from '../fraction';
import { randomVariable } from '../random-variable';
import { formatLawIndicators } from '../format';

// =============================================================================
// Helpers
// =============================================================================

const F = (text: string) => {
	const f = Fraction.parse(text);
	if (f === null) throw new Error(`illisible : ${text}`);
	return f;
};

function lawOf(values: string[], probabilities: string[]) {
	const outcome = randomVariable(values.map(F), probabilities.map(F));
	if (outcome === null || !outcome.ok)
		throw new Error(`échec inattendu : ${JSON.stringify(outcome)}`);
	return outcome.value;
}

function failureOf(values: string[], probabilities: string[]) {
	const outcome = randomVariable(values.map(F), probabilities.map(F));
	if (outcome === null || outcome.ok) throw new Error('un échec était attendu');
	return outcome.message;
}

const DE = ['1', '2', '3', '4', '5', '6'];
const SIXIEMES = DE.map(() => '1/6');

// =============================================================================
// Fractions
// =============================================================================

describe('fractions exactes', () => {
	it('lit fraction, décimal à virgule ou à point, pourcentage, entier négatif', () => {
		expect(F('2/4').toString()).toBe('1/2');
		expect(F('0,25').toString()).toBe('1/4');
		expect(F('0.3').toString()).toBe('3/10');
		expect(F('25 %').toString()).toBe('1/4');
		expect(F('-3').toString()).toBe('-3');
	});

	it('refuse ce qui n’est pas un nombre, et un dénominateur nul', () => {
		expect(Fraction.parse('abc')).toBeNull();
		expect(Fraction.parse('1/0')).toBeNull();
	});

	it('retrouve la fraction d’un décimal de la machine (dénominateur ≤ 10 000)', () => {
		expect(Fraction.fromNumber(1 / 6)?.toString()).toBe('1/6');
		expect(Fraction.fromNumber(0.3)?.toString()).toBe('3/10');
		expect(Fraction.fromNumber(Math.PI)).toBeNull();
	});
});

// =============================================================================
// Loi
// =============================================================================

describe('espérance, variance, écart type', () => {
	it('le dé : E = 7/2, V = 35/12', () => {
		const law = lawOf(DE, SIXIEMES);

		expect(law.expectation.toString()).toBe('7/2');
		expect(law.variance.toString()).toBe('35/12');
		expect(law.deviation).toBeCloseTo(1.7078, 4);
		expect(law.exactDeviation).toBeNull();
	});

	it('le jeu : E = 0 (équitable), V = 7, σ = √7', () => {
		const law = lawOf(['-2', '0', '5'], ['1/2', '3/10', '1/5']);

		expect(law.expectation.toString()).toBe('0');
		expect(law.variance.toString()).toBe('7');
		expect(law.deviation).toBeCloseTo(Math.sqrt(7), 10);
	});

	it('probabilités décimales', () => {
		const law = lawOf(['0', '1'], ['0,3', '0,7']);

		expect(law.expectation.toString()).toBe('7/10');
		expect(law.variance.toString()).toBe('21/100');
	});

	it('variance carré parfait : σ exact', () => {
		const law = lawOf(['-2', '2'], ['1/2', '1/2']);

		expect(law.variance.toString()).toBe('4');
		expect(law.exactDeviation?.toString()).toBe('2');
	});
});

describe('loi invalide', () => {
	it('somme différente de 1, en fraction', () => {
		expect(failureOf(['1', '2'], ['1/2', '1/3'])).toContain('5/6');
	});

	it('probabilité négative ou supérieure à 1', () => {
		expect(failureOf(['1', '2'], ['-1/2', '3/2'])).toMatch(/entre 0 et 1/);
	});

	it('valeurs en double', () => {
		expect(failureOf(['1', '1'], ['1/2', '1/2'])).toMatch(/« 1 »/);
	});

	it('autant de valeurs que de probabilités', () => {
		expect(failureOf(['1', '2', '3'], ['1/2', '1/2'])).toMatch(/3.*2/);
	});

	it('aucune valeur : une absence', () => {
		expect(randomVariable([], [])).toBeNull();
	});
});

// =============================================================================
// Mise en forme
// =============================================================================

describe('mise en forme française', () => {
	it('le dé', () => {
		expect(formatLawIndicators('X', lawOf(DE, SIXIEMES), 'fr')).toEqual([
			'E(X) = 7/2 = 3,5',
			'V(X) = 35/12 ≈ 2,92',
			'σ(X) ≈ 1,71'
		]);
	});

	it('le jeu : E(G) = 0 ; écart type exact quand la racine tombe juste', () => {
		expect(formatLawIndicators('G', lawOf(['-2', '0', '5'], ['1/2', '3/10', '1/5']), 'fr')[0]).toBe(
			'E(G) = 0'
		);
		expect(formatLawIndicators('X', lawOf(['-2', '2'], ['1/2', '1/2']), 'fr')[2]).toBe('σ(X) = 2');
	});

	it('fraction négative : vrai signe moins ; anglais : point décimal', () => {
		const law = lawOf(['-3', '0'], ['1/4', '3/4']);

		expect(formatLawIndicators('X', law, 'fr')[0]).toBe('E(X) = −3/4 = −0,75');
		expect(formatLawIndicators('X', law, 'en')[0]).toBe('E(X) = −3/4 = −0.75');
	});

	it('choisir les indicateurs', () => {
		expect(formatLawIndicators('X', lawOf(DE, SIXIEMES), 'fr', ['variance'])).toEqual([
			'V(X) = 35/12 ≈ 2,92'
		]);
	});
});
