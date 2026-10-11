/**
 * Revue de #947 (2026-10-08) :
 *
 * 1. GEL : 1/((x + 1)² + 3) ne rendait jamais la main (extraction des carrés
 *    sur des entiers géants dans `arctanClassForm`, hors budget) ;
 * 2. DOMAINE : ln(u²) = 2 ln|u| (et non 2 ln u) — la primitive doit être
 *    définie là où f l'est (x < 0 compris) ;
 * 3. INTÉGRALE DÉFINIE À TRAVERS UN PÔLE : refus explicite, jamais une valeur ;
 * 4. l'exploration de c/D (identities.ts) n'enregistre pas d'étapes en double.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { integrate, integrateDefinite } from '../integrate';
import { compile } from '../../eval/compile';

// =============================================================================
// Constantes
// =============================================================================

const POINTS: readonly number[] = [-2.7, -1.3, -0.45, 0.35, 0.85, 1.65, 2.45, 3.3];

/** Marge CI : quelques dizaines de ms en local */
const MAX_MS = 2000;

// =============================================================================
// Outils
// =============================================================================

/** Premier écart F′ ≠ f aux points où f est définie (négatifs compris), ou null */
function derivativeMismatch(latex: string): string | null {
	const result = integrate(parseLatex(latex), { variable: 'x' });
	if (result.status !== 'exact' || result.antiderivative === null) return `statut ${result.status}`;
	const F = compile(result.antiderivative);
	const f = compile(parseLatex(latex));
	let negativeChecked = 0;
	for (const x of POINTS) {
		const fx = f({ x });
		if (!Number.isFinite(fx)) continue;
		const h = 1e-5 * Math.max(1, Math.abs(x));
		const slope = (F({ x: x + h }) - F({ x: x - h })) / (2 * h);
		if (!(Math.abs(slope - fx) <= 1e-5 * Math.max(1, Math.abs(fx)))) {
			return `F′(${x}) = ${slope} ≠ f(${x}) = ${fx}`;
		}
		if (x < 0) negativeChecked++;
	}
	return negativeChecked >= 2 ? null : 'moins de 2 points négatifs';
}

// =============================================================================
// 1. Gel
// =============================================================================

describe('trinôme Δ < 0 à coefficients irrationnels : rend la main', () => {
	it.each([
		'\\frac{1}{(x+1)^2+3}',
		'\\frac{1}{(x+\\sqrt{2})^2+3}',
		'\\frac{1}{(x+1)^2+\\sqrt{3}}',
		'\\frac{1}{x^2+\\sqrt{2}x+3}',
		'\\frac{1}{(\\sqrt{2}x+1)^2+1}',
		'\\frac{1}{(x+\\pi)^2+2}'
	])('%s : < 2 s, et juste si une primitive est rendue', (latex) => {
		const start = performance.now();
		const result = integrate(parseLatex(latex), { variable: 'x' });
		expect(performance.now() - start).toBeLessThan(MAX_MS);
		if (result.status === 'exact') expect(derivativeMismatch(latex)).toBeNull();
	});

	it('1/((x + 1)² + 3) : primitive exacte (arctan)', () => {
		expect(derivativeMismatch('\\frac{1}{(x+1)^2+3}')).toBeNull();
	});
});

// =============================================================================
// 2. Domaine : ln(u²) = 2 ln|u|
// =============================================================================

describe('ln(x²) : primitive définie pour x < 0 aussi', () => {
	it.each(['\\ln(x^2)', '\\frac{\\ln(x^2)}{x^2}', '\\frac{\\ln(x^2)}{x}', 'x\\ln(x^2)'])(
		'%s : F′ = f de part et d’autre de 0',
		(latex) => {
			expect(derivativeMismatch(latex)).toBeNull();
		}
	);
});

// =============================================================================
// 3. Intégrale définie à travers un pôle
// =============================================================================

describe('intégrale définie : une singularité dans [a ; b] est refusée', () => {
	it.each([
		['\\frac{\\cos x}{\\sin x}', '-3', '2'],
		['\\tan^2(x)', '-3', '2'],
		['\\frac{1}{\\cos^2(x)}', '-3', '2'],
		['\\frac{1}{\\tan(x)}', '-3', '2'],
		['\\frac{2}{\\tan(3x+1)}', '-3', '2'],
		['\\frac{1}{\\cos^2(\\pi x)}', '-3', '2'],
		['\\frac{1}{x}', '-1', '1'],
		['\\frac{1}{x^2}', '-1', '1'],
		['\\frac{1}{x}', '0', '1']
	])('∫ %s sur [%s ; %s] : aucune valeur, refus en français', (latex, lower, upper) => {
		const result = integrateDefinite(parseLatex(latex), parseLatex(lower), parseLatex(upper), {
			variable: 'x'
		});
		expect(result.value).toBeNull();
		expect(result.status).not.toBe('exact');
		expect(result.error ?? '').toMatch(/diverge|n'est pas définie/);
	});

	it.each([
		['\\tan x', '0', '\\frac{\\pi}{4}', Math.log(2) / 2],
		['\\frac{1}{\\cos^2(x)}', '-1', '1', 2 * Math.tan(1)],
		['\\frac{\\cos x}{\\sin x}', '1', '3', Math.log(Math.sin(3) / Math.sin(1))],
		['\\frac{1}{x}', '-2', '-1', -Math.log(2)],
		['\\frac{1}{\\sqrt{x}}', '0', '1', 2],
		['\\ln(x)', '1', 'e', 1],
		['\\sqrt[3]{x}', '-1', '8', 11.25],
		['e^{x}', '0', '30', Math.exp(30) - 1]
	])(
		'∫ %s sur [%s ; %s] : valeur exacte (près d’un pôle, sans le franchir)',
		(latex, lower, upper, expected) => {
			const result = integrateDefinite(parseLatex(latex), parseLatex(lower), parseLatex(upper), {
				variable: 'x'
			});
			expect(result.status).toBe('exact');
			expect(result.value).not.toBeNull();
			const value = result.value === null ? Number.NaN : compile(result.value)({});
			expect(Math.abs(value - expected)).toBeLessThan(1e-8 * Math.max(1, Math.abs(expected)));
		}
	);
});

// =============================================================================
// 4. Étapes sans doublon
// =============================================================================

describe('c/D : l’exploration de 1/D n’enregistre pas d’étapes', () => {
	it.each([
		['\\frac{2}{\\cos^2(x)}', 'Primitive de 1/cos²(u)'],
		['\\frac{2}{\\tan(x)}', '1/tan(u) = cos(u)/sin(u)']
	])('%s : factorisation, PUIS « %s » une seule fois', (latex, description) => {
		const result = integrate(parseLatex(latex), { variable: 'x', verbosity: 'detailed' });
		expect(result.status).toBe('exact');
		const descriptions = result.steps.map((s) => s.description);
		const factor = descriptions.indexOf('Factorisation de la constante du numérateur');
		const unit = descriptions.findIndex((d) => d.startsWith(description));
		expect(descriptions.filter((d) => d.startsWith(description))).toHaveLength(1);
		expect(factor).toBeGreaterThanOrEqual(0);
		expect(unit).toBeGreaterThan(factor);
	});
});
