/**
 * Défauts relevés en appelant `evaluateLimit` depuis l'atelier (2026-10-14).
 *
 * 1. Fonction définie d'un seul côté du point : la valeur est celle de ce
 *    côté, et le résultat le dit (`definedSide`) — au lycée on écrit x → 0⁺.
 * 2. « Pas de limite » : la raison est donnée (`noLimitReason`).
 * 3. sin u, cos u (et a·sin u + b) quand u → ±∞ : pas de limite, oscillation.
 * 4. exp(1) s'écrit e, exp(k) s'écrit e^k.
 * 5. Un flottant non reconnu comme exact n'est jamais rendu « exact ».
 */

import { describe, it, expect } from 'vitest';
import { evaluateLimit } from '../evaluate';
import { containsFloatArtifact } from '../exact-evaluation';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { infinity, number, opposite } from '../../factory';
import type { MathNode } from '../../types';
import type { LimitDirection } from '../types';

const PLUS_INF = infinity('positive');
const MINUS_INF = infinity('negative');

function limit(latex: string, approach: MathNode, direction: LimitDirection = 'both') {
	return evaluateLimit(parseLatex(latex), 'x', approach, direction);
}

function valueLatex(latex: string, approach: MathNode, direction: LimitDirection = 'both') {
	const result = limit(latex, approach, direction);
	return result.value === null ? null : toLatex(result.value);
}

describe('fonction définie d’un seul côté du point : definedSide', () => {
	it.each([
		['\\ln x', number('0'), 'infinite', '-\\infty', 'right'],
		['\\ln(3x)', number('0'), 'infinite', '-\\infty', 'right'],
		['\\sqrt{x}', number('0'), 'exact', '0', 'right'],
		['\\sqrt{-x}', number('0'), 'exact', '0', 'left'],
		['\\ln(x-1)', number('1'), 'infinite', '-\\infty', 'right'],
		['\\frac{1}{\\sqrt{2x}}', number('0'), 'infinite', '+\\infty', 'right']
	] as const)('%s en %s : %s %s, défini à %s seulement', (latex, approach, status, value, side) => {
		const result = limit(latex, approach);
		expect(result.status).toBe(status);
		expect(result.value === null ? null : toLatex(result.value)).toBe(value);
		expect(result.direction).toBe('both');
		expect(result.definedSide).toBe(side);
	});

	it.each([
		['\\frac{1}{x}', number('0')],
		['3x^2', number('0')],
		['\\ln x', PLUS_INF],
		['\\sqrt{x}', number('4')]
	] as const)('%s en %s : définie des deux côtés, pas de definedSide', (latex, approach) => {
		expect(limit(latex, approach).definedSide).toBeUndefined();
	});

	it('côté demandé explicitement (ln x en 0⁺) : pas de definedSide', () => {
		const result = limit('\\ln x', number('0'), 'right');
		expect(toLatex(result.value as MathNode)).toBe('-\\infty');
		expect(result.definedSide).toBeUndefined();
	});
});

describe('raison de l’absence de limite : noLimitReason', () => {
	it.each([
		['\\sqrt{x}', opposite(number('1')), 'outside-domain'],
		['\\ln(2x)', opposite(number('3')), 'outside-domain'],
		['\\ln x', MINUS_INF, 'outside-domain'],
		['\\frac{1}{x}', number('0'), 'sides-differ'],
		['\\frac{2}{x-1}', number('1'), 'sides-differ'],
		['x^{-\\frac{1}{3}}', number('0'), 'sides-differ']
	] as const)('%s en %s : pas de limite (%s)', (latex, approach, reason) => {
		const result = limit(latex, approach);
		expect(result.status).toBe('does-not-exist');
		expect(result.value).toBeNull();
		expect(result.noLimitReason).toBe(reason);
	});

	it('une limite qui existe n’a pas de raison', () => {
		expect(limit('3x+1', number('2')).noLimitReason).toBeUndefined();
	});
});

describe('oscillation : sin u, cos u quand u → ±∞', () => {
	it.each([
		['\\sin(x)', PLUS_INF, 'both'],
		['\\cos(x)', MINUS_INF, 'both'],
		['3\\sin(2x)+1', PLUS_INF, 'both'],
		['-2\\cos(x)-5', MINUS_INF, 'both'],
		['\\frac{\\cos(3x)}{2}', PLUS_INF, 'both'],
		['\\sin(x^2-x)', PLUS_INF, 'both'],
		['\\sin(e^x)', PLUS_INF, 'both'],
		['\\cos(\\sqrt{x})', PLUS_INF, 'both'],
		['\\sin(\\ln x)', PLUS_INF, 'both'],
		['\\sin(\\frac{1}{x})', number('0'), 'right'],
		['\\sin(\\frac{1}{x})', number('0'), 'both'],
		['2\\cos(\\frac{1}{x-1})', number('1'), 'both']
	] as const)('%s en %s (%s) : pas de limite, oscillation', (latex, approach, direction) => {
		const result = limit(latex, approach, direction);
		expect(result.status).toBe('does-not-exist');
		expect(result.value).toBeNull();
		expect(result.noLimitReason).toBe('oscillation');
	});

	it.each([
		['\\frac{\\sin x}{x}', PLUS_INF, '0'],
		['\\frac{\\sin x}{x}', number('0'), '1'],
		['x\\sin\\frac{1}{x}', number('0'), '0'],
		['e^{-x}\\sin x', PLUS_INF, '0'],
		['\\frac{\\cos x}{x^2}', PLUS_INF, '0'],
		['x+\\sin x', PLUS_INF, '+\\infty'],
		['\\sin(x)-x', PLUS_INF, '-\\infty'],
		['3\\cos(2x)', number('0'), '3']
	] as const)('non-régression : %s en %s vaut %s', (latex, approach, value) => {
		expect(valueLatex(latex, approach)).toBe(value);
	});

	it('0·sin x en +∞ vaut 0 (fonction nulle)', () => {
		expect(valueLatex('0\\sin(x)', PLUS_INF)).toBe('0');
	});

	it.each([['x\\sin x'], ['\\sin x+\\cos x']])(
		'hors périmètre : %s en +∞ reste non supportée',
		(latex) => {
			expect(limit(latex, PLUS_INF).status).toBe('unsupported');
		}
	);
});

describe('exp(k) s’écrit avec la constante e', () => {
	it('(1 + 1/x)^x en +∞ vaut e, la constante d’Euler', () => {
		const result = limit('(1+\\frac{1}{x})^x', PLUS_INF);
		expect(result.status).toBe('exact');
		expect(result.value).toMatchObject({ type: 'constant', constant: 'euler' });
	});

	it('exp(x) en 2 vaut e², pas exp(2)', () => {
		const result = limit('\\exp(x)', number('2'));
		expect(result.status).toBe('exact');
		expect(result.value).toMatchObject({
			type: 'superscript',
			base: { type: 'constant', constant: 'euler' },
			superscript: { type: 'number', value: '2' }
		});
	});

	it('3 exp(x) en 2 vaut 3e²', () => {
		expect(limit('3\\exp(x)', number('2')).value).toMatchObject({
			type: 'multiplication',
			right: { type: 'superscript', base: { type: 'constant', constant: 'euler' } }
		});
	});
});

describe('valeur approchée jamais rendue « exact »', () => {
	it.each([
		['\\frac{2x+1}{\\sqrt{2}x}', PLUS_INF, '\\sqrt{2}'],
		['\\frac{1000\\sqrt{2}x}{x+1}', PLUS_INF, '1000 \\sqrt{2}'],
		['\\ln(x+2)', number('0'), '\\ln\\left( 2 \\right)'],
		['e^{x}', number('7'), '\\exponentialE^7'],
		['\\frac{2x^2+1}{3x^2}', PLUS_INF, '\\dfrac{2}{3}'],
		['5x-3', number('2'), '7'],
		['0.5x', number('3'), '1.5'],
		['\\frac{0.3x}{x+0.7}', PLUS_INF, '0.3']
	] as const)('%s en %s : exact %s', (latex, approach, value) => {
		const result = limit(latex, approach);
		expect(result.status).toBe('exact');
		expect(toLatex(result.value as MathNode)).toBe(value);
	});

	it('repli numérique de L’Hôpital : approximate', () => {
		expect(limit('\\frac{\\sqrt{x^2+1}}{\\sqrt{3}x}', PLUS_INF).status).toBe('approximate');
	});

	describe('containsFloatArtifact', () => {
		const statement = (latex: string) => [parseLatex(latex)];
		it('décimal absent d’un énoncé sans décimal : flottant', () => {
			expect(containsFloatArtifact(number('0.5773502692'), statement('\\sqrt{x}'))).toBe(true);
			expect(
				containsFloatArtifact(opposite(number('0.3333333333333333')), statement('\\frac{1}{3x}'))
			).toBe(true);
		});
		it('décimal long (≥ 10 chiffres significatifs) : flottant, même si l’énoncé a des décimaux', () => {
			expect(containsFloatArtifact(number('0.7071067812'), statement('\\sqrt{0.5x}'))).toBe(true);
		});
		it('entier, ou décimal court d’un énoncé décimal : exact', () => {
			expect(containsFloatArtifact(number('7'), statement('5x-3'))).toBe(false);
			expect(containsFloatArtifact(number('1.5'), statement('0.5x'))).toBe(false);
			expect(containsFloatArtifact(number('0.3'), statement('\\frac{0.3x}{x+0.7}'))).toBe(false);
		});
	});
});

describe('f(u), f continue en la limite EXACTE de u (√, exp, puissances)', () => {
	it.each([
		['\\sqrt{\\frac{x^2+1}{4x^2}}', MINUS_INF, '\\dfrac{1}{2}'],
		['\\sqrt{\\frac{x^2+1}{4x^2}}', PLUS_INF, '\\dfrac{1}{2}'],
		['\\sqrt{\\frac{9x^2+1}{4x^2}}', MINUS_INF, '\\dfrac{3}{2}'],
		['\\sqrt{\\frac{x+1}{2x}}', PLUS_INF, '\\dfrac{\\sqrt{2}}{2}'],
		['\\frac{\\sqrt{4x^2+1}}{x}', PLUS_INF, '2'],
		['\\frac{\\sqrt{4x^2+1}}{x}', MINUS_INF, '-2'],
		['\\ln(\\frac{2x+1}{x})', PLUS_INF, '\\ln\\left( 2 \\right)'],
		['e^{\\frac{3x+1}{x}}', MINUS_INF, '\\exponentialE^3'],
		['(\\frac{2x+1}{x})^3', MINUS_INF, '8'],
		['\\sqrt{x+3}', number('1'), '2'],
		['\\sqrt{2+\\frac{1}{x}}', PLUS_INF, '\\sqrt{2}'],
		['(2-\\frac{1}{x})^{\\frac{1}{2}}', PLUS_INF, '\\sqrt{2}'],
		['\\left(\\frac{2x}{x+1}\\right)^{\\frac{1}{2}}', PLUS_INF, '\\sqrt{2}'],
		['\\left(\\frac{2x}{x+1}\\right)^{\\frac{1}{3}}', PLUS_INF, '\\sqrt[3]{2}'],
		['\\left(\\frac{4x}{x+1}\\right)^{\\frac{1}{2}}', PLUS_INF, '2'],
		['\\left(\\frac{2x}{x+1}\\right)^{\\frac{3}{2}}', PLUS_INF, '2 \\sqrt{2}'],
		['\\left(\\frac{2x}{x+1}\\right)^{-\\frac{1}{2}}', PLUS_INF, '\\dfrac{\\sqrt{2}}{2}']
	] as const)('%s en %s : exact %s', (latex, approach, value) => {
		const result = limit(latex, approach);
		expect(result.status).toBe('exact');
		expect(toLatex(result.value as MathNode)).toBe(value);
	});
});

describe('constante + fonction qui diverge en un point exclu : comme 1/x', () => {
	it.each([
		['\\frac{1}{3}+\\frac{1}{x}', number('0')],
		['2+\\frac{1}{x}', number('0')],
		['\\frac{1}{x}+0.5', number('0')],
		['x+\\frac{3}{x-2}', number('2')]
	] as const)('%s en %s : pas de limite, sides-differ', (latex, approach) => {
		const result = limit(latex, approach);
		expect(result.status).toBe('does-not-exist');
		expect(result.noLimitReason).toBe('sides-differ');
	});

	it.each([
		['\\frac{1}{3}+\\frac{1}{x}', 'left', '-\\infty'],
		['2+\\frac{1}{x}', 'right', '+\\infty']
	] as const)('%s en 0 (%s) : %s', (latex, direction, value) => {
		expect(valueLatex(latex, number('0'), direction)).toBe(value);
	});

	it('2 + 1/x² en 0 : +∞ des deux côtés', () => {
		expect(valueLatex('2+\\frac{1}{x^2}', number('0'))).toBe('+\\infty');
	});
});

describe('analyse côté par côté : un côté non conclu ne prouve pas « pas de limite »', () => {
	it('1/x − 1/(eˣ − 1) en 0 n’est pas déclarée sans limite (vaut 1/2)', () => {
		const result = limit('\\frac{1}{x}-\\frac{1}{e^x-1}', number('0'));
		expect(result.status).not.toBe('does-not-exist');
	});
});
