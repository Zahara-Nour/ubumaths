/**
 * Limite d'une expression à paramètre (k, a, λ) de signe inconnu
 * (chantier limites-parametres, choix A de David du 2026-10-27).
 *
 * `normalizeExtended` lisait un signe inconnu comme positif : −k·(+∞) = +∞,
 * donc e^{−kx} en +∞ rendait +∞ — faux même pour k > 0. Quand le signe du
 * paramètre décide de la limite, le moteur refuse ; quand il ne décide pas
 * (k/x en +∞, (e^{kx} − 1)/x en 0), la limite reste calculée.
 */

import { describe, it, expect } from 'vitest';
import { evaluateLimit } from '../evaluate';
import { parseLatex } from '../../parser';
import { infinity } from '../../factory';
import { toLatex } from '../../latex-generator';
import type { LimitDirection, LimitResult } from '../types';

function limitOf(
	latex: string,
	at: string,
	direction: LimitDirection = 'both',
	variable = 'x'
): LimitResult {
	const point =
		at === '+∞' ? infinity('positive') : at === '-∞' ? infinity('negative') : parseLatex(at);
	return evaluateLimit(parseLatex(latex), variable, point, direction);
}

function valueOf(latex: string, at: string, direction: LimitDirection = 'both'): string | null {
	const result = limitOf(latex, at, direction);
	return result.value === null ? null : toLatex(result.value);
}

describe('le signe du paramètre décide : refus, jamais une valeur', () => {
	it.each([
		['e^{kx}', '+∞', 'both'],
		['e^{-kx}', '+∞', 'both'],
		['e^{kx}', '-∞', 'both'],
		['e^{-\\lambda x}', '+∞', 'both'],
		['e^{\\lambda x}', '+∞', 'both'],
		['e^{-k^2x}', '+∞', 'both'],
		['e^{k^2x}', '+∞', 'both'],
		['(x^2-x)e^{-kx}', '+∞', 'both'],
		['xe^{-kx}', '+∞', 'both'],
		['x^2e^{kx}', '-∞', 'both'],
		['kx^2+x', '+∞', 'both'],
		['kx+1', '-∞', 'both'],
		['\\frac{x^2}{kx+1}', '+∞', 'both'],
		['\\frac{k}{x}', '0', 'right'],
		['\\frac{1}{kx}', '0', 'right'],
		['\\ln(kx)', '+∞', 'both'],
		['\\ln x+kx', '+∞', 'both'],
		// coefficient littéral EN BAS : faux pour k = 0 (+∞ ; 1)
		['\\frac{x}{kx+1}', '+∞', 'both'],
		['\\frac{1}{kx+1}', '+∞', 'both'],
		// revue : 0⁺ − k·0⁺ restait 0⁺ (faux pour k > 1) ; refusés sur main
		['\\frac{1}{x-kx}', '0', 'right'],
		['\\frac{1}{x-kx}', '0', 'left'],
		['\\frac{1}{kx+x^2}', '0', 'left'],
		['\\frac{1}{kx+x^2}', '0', 'both'],
		['\\frac{1}{kx^2-x^2}', '0', 'right'],
		['\\ln(x-kx)', '0', 'right'],
		['e^{\\frac{1}{x-kx}}', '0', 'right'],
		['\\frac{1}{\\frac1x-\\frac kx}', '+∞', 'both'],
		['\\frac{1}{x-\\lambda x}', '0', 'right'],
		// même famille, déjà faux sur main (0 + 0⁺ = 0⁺)
		['\\frac{1}{kx+x^2}', '0', 'right'],
		['\\frac{1}{kx+x}', '0', 'right'],
		['\\frac{1}{kx^2+x^3}', '0', 'right'],
		['\\ln(kx+x^2)', '0', 'right']
	] as const)('%s en %s (%s)', (latex, at, direction) => {
		const result = limitOf(latex, at, direction);
		expect(result.value).toBeNull();
		expect(result.status).toBe('unsupported');
	});

	it('1-e^{-\\lambda t} en +∞, variable t : refus (rendait −∞)', () => {
		const result = limitOf('1-e^{-\\lambda t}', '+∞', 'both', 't');
		expect(result.value).toBeNull();
		expect(result.status).toBe('unsupported');
	});
});

describe('le signe du paramètre ne décide pas : limite calculée (inchangé)', () => {
	it.each([
		['\\frac{k}{x}', '+∞', 'both', '0'],
		['x-k', '+∞', 'both', '+\\infty'],
		['(x-k)^2', '+∞', 'both', '+\\infty'],
		['\\frac{1}{x-k}', '+∞', 'both', '0'],
		['\\frac{x}{x+k}', '+∞', 'both', '1'],
		['\\frac{kx^2+1}{2x^2}', '+∞', 'both', '\\dfrac{k}{2}'],
		['\\frac{kx+1}{x+2}', '+∞', 'both', 'k'],
		['\\frac{(kx+1)(x+1)}{(x+2)^2}', '+∞', 'both', 'k'],
		['\\frac{k^2x+1}{x}', '+∞', 'both', 'k^2'],
		['\\frac{\\lambda x}{x+1}', '+∞', 'both', '\\lambda'],
		['\\frac{\\lambda x+1}{2x}', '+∞', 'both', '\\dfrac{\\lambda}{2}'],
		['x^2+kx', '+∞', 'both', '+\\infty'],
		['x^2-kx', '-∞', 'both', '+\\infty'],
		['-x^3+kx^2', '+∞', 'both', '-\\infty'],
		['\\frac{e^{kx}-1}{x}', '0', 'both', 'k'],
		['\\frac{\\sin(kx)}{x}', '0', 'both', 'k'],
		['e^{kx}', '0', 'both', '1']
	] as const)('%s en %s (%s) → %s', (latex, at, direction, expected) => {
		expect(valueOf(latex, at, direction)).toBe(expected);
	});
});

describe('sans paramètre : inchangé', () => {
	it.each([
		['e^{-2x}', '+∞', '0'],
		['e^{2x}', '+∞', '+\\infty'],
		['-3x^2+x', '+∞', '-\\infty'],
		['\\frac{-2}{x}', '0', '-\\infty'],
		['(x^2-x)e^{-x}', '+∞', '0'],
		['e^{-\\pi x}', '+∞', '0']
	] as const)('%s en %s → %s', (latex, at, expected) => {
		const direction: LimitDirection = at === '0' ? 'right' : 'both';
		expect(valueOf(latex, at, direction)).toBe(expected);
	});
});
