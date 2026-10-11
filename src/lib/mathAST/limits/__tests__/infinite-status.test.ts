/**
 * Statut d'une limite infinie (2026-10-07) : l'oracle relevait douze limites
 * dont la valeur ±∞ était juste mais le statut `exact` au lieu de `infinite`
 * (L'Hôpital, substitution directe, composition…). Invariant : une limite
 * dont la valeur est un nœud infini a TOUJOURS le statut `infinite`.
 */

import { describe, it, expect } from 'vitest';
import { evaluateLimit } from '../evaluate';
import { positiveInfinity } from '../../factory';
import { parseLatex } from '../../parser';
import { computeVariations } from '../../variations/compute';
import { formatBoundaryLimits, formatVariationTable } from '../../variations/format';
import { parseCustom } from '../../parser/custom';
import type { LimitDirection, LimitResult } from '../types';
import type { MathNode } from '../../types';

function target(at: string): MathNode {
	return at === '+inf' ? positiveInfinity() : parseLatex(at);
}

function summary(result: LimitResult): string {
	if (result.value === null) return `${result.status} null`;
	if (result.value.type !== 'infinity') return `${result.status} fini`;
	return `${result.status} ${result.value.sign === 'positive' ? '+inf' : '-inf'}`;
}

describe('limite infinie → statut « infinite »', () => {
	it.each([
		// f, borne, côté, attendu
		['\\frac{1}{x}', '0', 'right', 'infinite +inf'],
		['\\frac{e^x}{x}', '+inf', 'both', 'infinite +inf'],
		['\\ln x', '0', 'right', 'infinite -inf'],
		['\\frac{x}{\\ln x}', '+inf', 'both', 'infinite +inf'],
		['\\frac{x^3+1}{x^2-4}', '+inf', 'both', 'infinite +inf']
	] as const)('%s en %s (%s) : %s', (f, at, dir, expected) => {
		const result = evaluateLimit(parseLatex(f), 'x', target(at), dir as LimitDirection);
		expect(summary(result)).toBe(expected);
	});

	it('saisie élève \\lim_{t\\to0^+}\\ln t : infinite −∞', () => {
		expect(summary(evaluateLimit(parseLatex('\\lim_{t\\to0^+}\\ln t')))).toBe('infinite -inf');
	});
});

describe('tableau de variations : les bornes infinies restent affichées', () => {
	it.each([
		['1/x', ['-inf', '+inf']],
		['ln(x)', ['-inf', '+inf']]
	] as const)('%s : ±∞ présents aux bornes', (f, infinities) => {
		const result = computeVariations(parseCustom(f), {
			variable: 'x',
			includeBoundaryLimits: true
		});
		const limits = result.boundaryLimits ?? [];
		const labels = limits.map((bl) => bl.limit).filter((l) => typeof l === 'string');
		expect(labels).toContain('infinity');
		expect(labels).toContain('negative_infinity');
		const text = formatBoundaryLimits(limits, 'x') + formatVariationTable(result);
		for (const symbol of infinities) expect(text).toContain(symbol);
	});
});
