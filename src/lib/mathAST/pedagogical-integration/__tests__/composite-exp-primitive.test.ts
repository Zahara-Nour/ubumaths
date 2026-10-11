/**
 * Forme u'·e^u : la primitive est e^u, une seule fois rééquilibrée.
 *
 * Revue du 2026-10-10 : `∫ e^{2x} dx` rendait `0.5 · exp(2x)/2` = e^{2x}/4. Le
 * chemin composé multiplie déjà par 1/u' (`constantFactor`), et `expRule`, qui
 * calcule ∫ e^{ax} dx = e^{ax}/a, divisait une seconde fois par a.
 * VALEUR : F′ = f numériquement (différence finie centrée).
 */
import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { compile } from '../../eval/compile';
import { generatePedagogicalIntegrationSteps } from '../pipeline';

const POINTS = [-1.2, -0.3, 0.4, 1.1];
const E = Math.E;

describe('u’·e^u : la primitive pédagogique a la bonne valeur', () => {
	it.each([
		['e^{2x}', (x: number) => E ** (2 * x)],
		['e^{3x+1}', (x: number) => E ** (3 * x + 1)],
		['5e^{x}', (x: number) => 5 * E ** x],
		['2xe^{x^2}', (x: number) => 2 * x * E ** (x * x)],
		['e^{-4x}', (x: number) => E ** (-4 * x)]
	] as const)('∫ %s dx : F′ = f', (latex, f) => {
		const { antiderivative } = generatePedagogicalIntegrationSteps(parseLatex(latex), {
			level: 'lycee'
		});
		const F = compile(antiderivative);
		for (const x of POINTS) {
			const h = 1e-5;
			const slope = (F({ x: x + h }) - F({ x: x - h })) / (2 * h);
			expect(slope).toBeCloseTo(f(x), 4);
		}
	});
});
