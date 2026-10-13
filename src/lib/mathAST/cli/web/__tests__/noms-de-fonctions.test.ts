/**
 * Un nom lié comme FONCTION se lit comme une fonction, quel qu'il soit
 *
 * Défaut mesuré le 2026-10-13 : le moteur lisait chaque saisie sans ses noms de
 * fonctions. Seuls les noms par défaut du parseur (f, g, h, u, v, w, F, G, H)
 * étaient des fonctions : `.def k(x) = x+1` puis `k(0)` restait `k(0)`.
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '../web-repl-engine';

function after(lines: readonly string[], input: string): string {
	const engine = new WebReplEngine();
	for (const line of lines) engine.execute(line);
	return engine.execute(input).output;
}

describe('les noms de fonctions liées', () => {
	it.each([
		[['.def k(x) = x+1'], 'k(0)', '1'],
		[['.def q(x) = 2x'], 'q(3)', '6'],
		[['.def k(x) = x+1'], 'k\\left(0\\right)', '1'],
		[['.def k(x) = x^2'], 'k(2)+k(3)', '13']
	])('%j puis %s donne %s', (lines, input, expected) => {
		expect(after(lines, input)).toBe(expected);
	});

	// Revue : le corps d'une définition, et la définition en ligne `:=`
	it.each([
		[['.def k(x) = x+1', '.def m(x) = k(x)+1'], 'm(1)', '3'],
		[['k(x) := x+1'], 'k(1)', '2']
	])('%j puis %s donne %s', (lines, input, expected) => {
		expect(after(lines, input)).toBe(expected);
	});

	it('les noms par défaut restent des fonctions à côté des noms liés', () => {
		expect(after(['.def k(x) = x+1', '.def f(x) = 2x'], 'f(k(1))')).toBe('4');
	});

	it('une lettre qui n’est pas une fonction reste un produit', () => {
		expect(after(['.def k(x) = x+1', 'a := 3'], 'a(2)')).toBe('6');
	});
});
