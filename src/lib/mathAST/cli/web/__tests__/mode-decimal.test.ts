/**
 * Le mode décimal des nombres et l'écriture du texte de la console (décision
 * Q3 de David, 2026-10-11, `docs/wip/grandeurs-analyse.md` : « la règle du
 * bouton ≈ » — 4 décimales, « = » sans zéros inutiles quand c'est exact).
 *
 * Mesuré avant : `.mode decimal` puis `sqrt(2)/2` → « ≈ 0.707106781186547 »,
 * `1/4` → « ≈ 0.250000000000000 », `3` → « ≈ 3 » ; et le texte de `π/3`
 * s'écrivait `{1/3}\pi` (la forme de calcul d'`evaluate`).
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '../web-repl-engine';

function decimal(input: string) {
	const engine = new WebReplEngine();
	engine.execute('.mode decimal');
	return engine.execute(input);
}

describe('le mode décimal : 4 décimales, ≈ seulement si c’est arrondi', () => {
	it.each([
		['sqrt(2)/2', '≈ 0.7071'],
		['\\pi', '≈ 3.1416'],
		['2/7', '≈ 0.2857'],
		['1/4', '0.25'],
		['0.1+0.2', '0.3'],
		['3', '3'],
		['-1/8', '-0.125'],
		['-sqrt(2)/2', '≈ -0.7071']
	])('%s → %s', (input, expected) => {
		expect(decimal(input).output).toBe(expected);
	});
});

describe('le texte d’un résultat exact, mis au propre', () => {
	it.each([
		['\\pi/3', '\\pi/3'],
		['sqrt(2)/2', 'sqrt(2)/2']
	])('%s → %s', (input, expected) => {
		expect(new WebReplEngine().execute(input).output).toBe(expected);
	});
});

// Revue : hors de l'échelle de l'arrondi, « ≈ » se posait devant un entier exact
describe('hors de l’échelle de l’arrondi (≥ 10⁹, < 10⁻⁶)', () => {
	it('un entier exact reste sans ≈', () => {
		expect(decimal('2^{40}').output).toBe('1099511627776');
	});

	it('l’arbre affiché est une valeur décimale, pas l’écriture exacte', () => {
		const result = decimal('1/10^7');

		expect(result.ast?.type).not.toBe('division');
	});
});
