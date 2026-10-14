/**
 * Fonctions en escalier (partie entière `floor`, `ceil`, `round`, signe
 * `sign`) — écart V60 : `floor(x)` en 1 rendait 1, alors qu'il n'y a pas de
 * limite (à gauche 0, à droite 1).
 *
 * Méthode attendue : chaque appel est remplacé par la constante qu'il vaut
 * AU VOISINAGE du point, du côté demandé (lu sur la limite de son argument
 * et, au point de saut, sur le côté d'où l'argument l'atteint) ; la limite
 * du reste est celle du moteur. Ce qu'on ne sait pas décider est REFUSÉ
 * (`unsupported`) : jamais une réponse fausse.
 *
 * Saisie parsée (texte de l'atelier), valeur rendue assertée.
 */

import { describe, it, expect } from 'vitest';
import { evaluateLimit } from '../evaluate';
import { parse } from '../../cli/core/pipeline';
import { toLatex } from '../../latex-generator';
import type { MathNode } from '../../types';
import type { LimitDirection } from '../types';

function ast(text: string): MathNode {
	const node = parse(text).ast;
	if (!node) throw new Error(`illisible : ${text}`);
	return node;
}

function limit(input: string, at: string, dir: LimitDirection = 'both'): string {
	const point =
		at === '+inf'
			? { type: 'infinity' as const, sign: 'positive' as const }
			: at === '-inf'
				? { type: 'infinity' as const, sign: 'negative' as const }
				: ast(at);
	const result = evaluateLimit(ast(input), 'x', point, dir);
	const reason = result.noLimitReason ? ` ${result.noLimitReason}` : '';
	if (result.value === null) return `${result.status}${reason}`;
	if (result.value.type === 'infinity') {
		return `${result.status} ${result.value.sign === 'positive' ? '+inf' : '-inf'}`;
	}
	return `${result.status} ${toLatex(result.value)}`;
}

describe('V60 : partie entière en un entier', () => {
	it.each([
		['floor(x)', '1', 'both', 'does-not-exist sides-differ'],
		['floor(x)', '1', 'right', 'exact 1'],
		['floor(x)', '1', 'left', 'exact 0'],
		['floor(x)', '0', 'both', 'does-not-exist sides-differ'],
		['floor(x)', '-2', 'left', 'exact -3'],
		['floor(x)', '-2', 'right', 'exact -2']
	])('%s en %s (%s) → %s', (input, at, dir, expected) => {
		expect(limit(input, at, dir as LimitDirection)).toBe(expected);
	});
});

describe('hors d’un saut : la valeur, continue', () => {
	it.each([
		['floor(x)', '1.5', 'exact 1'],
		['floor(x)', '1/2', 'exact 0'],
		['floor(x)', '-1/2', 'exact -1'],
		['ceil(x)', '1/2', 'exact 1'],
		['round(x)', '1', 'exact 1'],
		['round(x)', '1/4', 'exact 0'],
		['sign(x)', '2', 'exact 1'],
		['sign(x)', '-3', 'exact -1'],
		['3floor(x)+x', '5/2', 'exact \\dfrac{17}{2}']
	])('%s en %s → %s', (input, at, expected) => {
		expect(limit(input, at)).toBe(expected);
	});
});

describe('en ±∞', () => {
	it.each([
		['floor(x)', '+inf', 'infinite +inf'],
		['floor(x)', '-inf', 'infinite -inf'],
		['ceil(x)', '-inf', 'infinite -inf'],
		['round(x)', '+inf', 'infinite +inf'],
		['floor(2x)', '+inf', 'infinite +inf'],
		['sign(x)', '+inf', 'exact 1'],
		['sign(x)', '-inf', 'exact -1'],
		['floor(1/x)', '+inf', 'exact 0'],
		['ceil(1/x)', '+inf', 'exact 1']
	])('%s en %s → %s', (input, at, expected) => {
		expect(limit(input, at)).toBe(expected);
	});
});

describe('les autres fonctions en escalier', () => {
	it.each([
		['ceil(x)', '3', 'both', 'does-not-exist sides-differ'],
		['ceil(x)', '3', 'left', 'exact 3'],
		['ceil(x)', '3', 'right', 'exact 4'],
		['round(x)', '1/2', 'both', 'does-not-exist sides-differ'],
		['round(x)', '1/2', 'left', 'exact 0'],
		['round(x)', '1/2', 'right', 'exact 1'],
		['sign(x)', '0', 'both', 'does-not-exist sides-differ'],
		['sign(x)', '0', 'left', 'exact -1'],
		['sign(x)', '0', 'right', 'exact 1'],
		['sgn(x)', '0', 'right', 'exact 1']
	])('%s en %s (%s) → %s', (input, at, dir, expected) => {
		expect(limit(input, at, dir as LimitDirection)).toBe(expected);
	});
});

describe('composées : l’argument atteint le saut, d’un côté ou des deux', () => {
	it.each([
		['floor(2x)', '1/2', 'both', 'does-not-exist sides-differ'],
		['floor(2x)', '1/2', 'left', 'exact 0'],
		['floor(2x)', '1/2', 'right', 'exact 1'],
		['floor(-x)', '1', 'left', 'exact -1'],
		['floor(-x)', '1', 'right', 'exact -2'],
		// x² atteint 0 par au-dessus des deux côtés : la limite existe
		['floor(x^2)', '0', 'both', 'exact 0'],
		['sign(x^2)', '0', 'both', 'exact 1'],
		['floor(x^2)', '1', 'left', 'exact 0'],
		['floor(x^2)', '1', 'right', 'exact 1'],
		['floor(sin(x))', '0', 'left', 'exact -1'],
		['floor(sin(x))', '0', 'right', 'exact 0'],
		['floor(sin(x))', '0', 'both', 'does-not-exist sides-differ'],
		['floor(1/x)', '0', 'right', 'infinite +inf']
	])('%s en %s (%s) → %s', (input, at, dir, expected) => {
		expect(limit(input, at, dir as LimitDirection)).toBe(expected);
	});
});

describe('composées : la fonction en escalier dans une expression', () => {
	it.each([
		['floor(x)/x', '1', 'left', 'exact 0'],
		['floor(x)/x', '1', 'right', 'exact 1'],
		['floor(x)/x', '1', 'both', 'does-not-exist sides-differ'],
		['x-floor(x)', '1', 'left', 'exact 1'],
		['x-floor(x)', '1', 'right', 'exact 0'],
		['floor(x)+1', '1', 'both', 'does-not-exist sides-differ'],
		['floor(x)+floor(-x)', '1', 'both', 'exact -1'],
		['sign(x)*x', '0', 'both', 'exact 0'],
		['floor(x)/(x-1)', '1', 'right', 'infinite +inf'],
		['(x-floor(x))/x', '3/2', 'both', 'exact \\dfrac{1}{3}']
	])('%s en %s (%s) → %s', (input, at, dir, expected) => {
		expect(limit(input, at, dir as LimitDirection)).toBe(expected);
	});
});

describe('ce qu’on ne sait pas décider : refus honnête, jamais une réponse fausse', () => {
	it.each([
		// floor(x)/x en +∞ vaut 1 (gendarmes), mais aucun remplacement ne le montre
		['floor(x)/x', '+inf'],
		['x-floor(x)', '+inf'],
		// imbriquées
		['floor(floor(x)/2)', '1'],
		// argument qui oscille
		['floor(sin(1/x))', '0']
	])('%s en %s → unsupported', (input, at) => {
		expect(limit(input, at)).toBe('unsupported');
	});
});

describe('revue : u − L identiquement nul d’un côté — refus, jamais le côté du moteur', () => {
	// lim 1/(u − L) rendait +∞ même quand u − L ≡ 0 de ce côté (|x| − x à droite)
	it.each([
		['sign(x+abs(x))', '0', 'both'],
		['ceil(abs(x)-x)', '0', 'both'],
		['ceil(x-abs(x))', '0', 'right'],
		['sign(abs(x)-x)', '0', 'right']
	])('%s en %s (%s) → unsupported', (input, at, dir) => {
		expect(limit(input, at, dir as LimitDirection)).toBe('unsupported');
	});

	it.each([
		['sign(x+abs(x))', '0', 'right', 'exact 1'],
		['ceil(abs(x)-x)', '0', 'left', 'exact 1']
	])(
		'le côté où u − L ne s’annule pas reste calculé : %s en %s (%s) → %s',
		(input, at, dir, expected) => {
			expect(limit(input, at, dir as LimitDirection)).toBe(expected);
		}
	);
});

describe('revue : un point en π', () => {
	it.each([
		['floor(x)', 'π', 'exact 3'],
		['ceil(x)', 'π/2', 'exact 2'],
		['floor(x)', '\\pi', 'exact 3'],
		['sign(x-3)', 'π', 'exact 1']
	])('%s en %s → %s', (input, at, expected) => {
		expect(limit(input, at)).toBe(expected);
	});
});
