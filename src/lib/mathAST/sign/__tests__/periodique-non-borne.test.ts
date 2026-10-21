/**
 * Signe d'une fonction à zéros PÉRIODIQUES sur un intervalle non borné
 *
 * Sur ℝ, le solveur ne rend que les zéros d'une période (`sin(πx/180)` : 0 et
 * 180, pas 360, −180…). L'échantillonnage — 5 points dans [−100 ; 100] — ne
 * voyait pas les autres : `cos(πx/180)` était déclaré négatif sur ]90 ; +∞[,
 * `eˣ·cos x` positif sur ]−∞ ; −π/2[ (revue de la PR « 60° » de l'atelier).
 *
 * Couper tout échantillonnage sur ces intervalles (premier correctif) perdait
 * des signes JUSTES : `1 + cos x`, `sin²x` sont positifs partout, leurs zéros
 * sont doubles. Règle retenue : quand f est elle-même périodique de période T,
 * son signe se lit sur UNE période entière, entre ses zéros consécutifs ; un
 * signe constant sur la période l'est partout. Sinon, le signe reste inconnu.
 */

import { describe, it, expect } from 'vitest';
import { analyzeSign } from '../analyze';
import { parseLatex } from '../../parser';
import { toCustom } from '../../custom-generator';
import { closedEndpoint, interval, posInfinityEndpoint } from '$lib/math/intervals/factory';
import type { Domain } from '../../domain/types';
import type { SignAnalysisResult } from '../types';

function study(latex: string, domain?: Domain): SignAnalysisResult {
	return analyzeSign(parseLatex(latex), { variable: 'x', ...(domain && { domain }) });
}

/** Les signes des intervalles ouverts, points zéros retirés. */
function openSigns(result: SignAnalysisResult): string[] {
	return result.signedIntervals.filter((si) => si.sign !== 'zero').map((si) => si.sign);
}

function zeroValues(result: SignAnalysisResult): string[] {
	return result.zeros.map((z) => toCustom(z.value));
}

const fromZero: Domain = {
	kind: 'interval_set',
	intervals: [interval(closedEndpoint(parseLatex('0')), posInfinityEndpoint())],
	excludedPoints: []
};

describe('zéros doubles périodiques : positif partout', () => {
	it.each(['\\cos(x)+1', '1-\\sin(x)', '\\sin(x)^2', '\\cos(x)^2'])('%s positif sur ℝ', (latex) => {
		const signs = openSigns(study(latex));
		expect(signs.length).toBeGreaterThan(0);
		expect(signs.every((s) => s === 'positive')).toBe(true);
	});

	it('1 − cos x : positif aussi de part et d’autre de 0', () => {
		expect(openSigns(study('1-\\cos(x)'))).toEqual(['positive', 'positive']);
	});

	it('cos x + 1 sur [0 ; +∞[ : positif jusqu’au bout', () => {
		expect(openSigns(study('\\cos(x)+1', fromZero))).toEqual(['positive', 'positive']);
	});
});

describe('zéros simples périodiques : pas de signe constant inventé', () => {
	it('cos(πx/180) sur ℝ : signe inconnu au-delà de ±90', () => {
		const result = study('\\cos(\\frac{\\pi x}{180})');
		expect(zeroValues(result)).toEqual(['-90', '90']);
		expect(openSigns(result)).toEqual(['unknown', 'positive', 'unknown']);
	});

	it('cos(πx/180) sur [0 ; +∞[ : inconnu sur ]90 ; +∞[', () => {
		expect(openSigns(study('\\cos(\\frac{\\pi x}{180})', fromZero))).toEqual([
			'positive',
			'unknown'
		]);
	});

	it('cos x sur ℝ : positif entre −π/2 et π/2, inconnu ailleurs', () => {
		expect(openSigns(study('\\cos(x)'))).toEqual(['unknown', 'positive', 'unknown']);
	});

	it('eˣ·cos x : pas « positif » sur ]−∞ ; −π/2[ (cos y change de signe)', () => {
		const signs = openSigns(study('e^{x}\\cos(x)'));
		expect(signs[0]).toBe('unknown');
		expect(signs.at(-1)).toBe('unknown');
	});

	it('e⁻ˣ·sin x : pas « positif » sur ]π ; +∞[', () => {
		expect(openSigns(study('e^{-x}\\sin(x)')).at(-1)).toBe('unknown');
	});
});

describe('intervalle intérieur borné : les zéros de la famille y sont listés', () => {
	it('(x − 20)·sin x sur ℝ : 2π, 3π… 6π entre π et 20', () => {
		const result = study('(x-20)\\sin(x)');
		const inner = result.zeros
			.map((z) => z.approximate ?? Number.NaN)
			.filter((v) => v > 0.5 && v < 19.5);
		expect(inner.map((v) => Math.round(v / Math.PI))).toEqual([1, 2, 3, 4, 5, 6]);
		// entre deux zéros consécutifs connus, le signe se démontre
		const bounded = result.signedIntervals.filter(
			(si) =>
				si.sign !== 'zero' &&
				si.interval.lower.value.type !== 'infinity' &&
				si.interval.upper.value.type !== 'infinity'
		);
		expect(bounded.every((si) => si.sign !== 'unknown')).toBe(true);
	});

	it('sin x sur ℝ : la liste des zéros ne change pas (0 et π)', () => {
		expect(zeroValues(study('\\sin(x)'))).toEqual(
			['0', '\\pi'].map((s) => toCustom(parseLatex(s)))
		);
	});
});
