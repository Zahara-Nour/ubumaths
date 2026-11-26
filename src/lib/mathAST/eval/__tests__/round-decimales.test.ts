/**
 * `round(x, n)` : arrondi exact à n décimales (2026-11-26)
 * ========================================================
 *
 * Même arrondi que le modificateur `;aN` : au plus proche, 5 vers l'extérieur, calculé
 * sur la valeur exacte (2,675 → 2,68, là où le flottant 2.675 donnerait 2,67). La valeur
 * seulement : aucun zéro d'écriture. `round(x)` est inchangé. Tous les chemins
 * d'évaluation : `evaluate` (décimal et exact), `compile`, `{{eval}}`.
 */

import { describe, it, expect } from 'vitest';
import { evaluate, evaluateNodeToRational } from '../evaluate';
import { compile } from '../compile';
import { parseCustom } from '../../parser/custom';
import { toLatex } from '../../latex-generator';
import { evaluateAstWithModifiers } from '../evaluate-with-modifiers';

function decimalOf(expression: string): unknown {
	const result = evaluate(parseCustom(expression), { mode: 'decimal' });
	return result.status === 'value' ? result.value : result;
}

function exactOf(expression: string): string {
	const result = evaluate(parseCustom(expression), { mode: 'exact' });
	if (result.status !== 'value' || typeof result.value !== 'object' || !('type' in result.value)) {
		throw new Error(JSON.stringify(result));
	}
	// Plus de fonction `round` dans le résultat : une valeur rationnelle
	expect(toLatex(result.value)).not.toContain('round');
	const r = evaluateNodeToRational(result.value);
	return `${r.n}/${r.d}`;
}

describe('round(x, n)', () => {
	it.each([
		['round(2.675, 2)', 2.68],
		['round(3.704, 2)', 3.7],
		['round(-2.345, 2)', -2.35],
		['round(2.6, 0)', 3],
		['round(-2.5, 0)', -3],
		['round(1/3, 3)', 0.333],
		['round(1234.5678, 1)', 1234.6]
	])('évalué : %s = %s', (expression, expected) => {
		expect(decimalOf(expression)).toBe(expected);
	});

	it.each([
		['round(2.675, 2)', '67/25'],
		['round(37/10, 2)', '37/10'],
		['round(1/3, 2)', '33/100'],
		['round(-2.345, 2)', '-47/20']
	])('exact : %s = %s', (expression, expected) => {
		expect(exactOf(expression)).toBe(expected);
	});

	it('round(x) est inchangé', () => {
		expect(decimalOf('round(3.5)')).toBe(4);
		expect(decimalOf('round(3.4)')).toBe(3);
	});

	it.each([
		['round(2.5, -1)', /entier/],
		['round(2.5, 1.5)', /entier/]
	])('%s : n entier ≥ 0', (expression, message) => {
		const result = evaluate(parseCustom(expression), { mode: 'decimal' });
		expect(result.status).not.toBe('value');
		if (result.status === 'unevaluable') expect(result.reason).toMatch(message);
	});

	it('compilé : même arrondi exact', () => {
		const f = compile(parseCustom('round(x, 2)'));
		expect(f({ x: 2.675 })).toBe(2.68);
		expect(f({ x: -2.345 })).toBe(-2.35);
		expect(f({ x: 1 / 3 })).toBe(0.33);
		expect(compile(parseCustom('round(x)'))({ x: 3.5 })).toBe(4);
	});

	it('dans un {{eval}} : la valeur, sans zéro d’écriture', () => {
		expect(evaluateAstWithModifiers(parseCustom('round(3.704, 2)'))).toBe('3.7');
		expect(evaluateAstWithModifiers(parseCustom('round(2.675, 2)'), { decimal: true })).toBe(
			'2.68'
		);
	});
});
