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

// Mesuré avant (2026-10-11) : « ≈ NaN » — la fraction exacte est juste, mais ses
// termes dépassent 10³⁰⁸ et leur conversion en flottant débordait
describe('des calculs d’élèves aux fractions géantes', () => {
	it.each([
		['(1+1/1000)^1000', '≈ 2.7169'],
		['1000*(1+0.03/12)^360', '≈ 2456.8422'],
		['1.01^365', '≈ 37.7834'],
		['0.99^365', '≈ 0.0255']
	])('%s → %s', (input, expected) => {
		expect(decimal(input).output).toBe(expected);
	});
});

// Décisions a, b, c, d de David (2026-10-12) : la notation scientifique hors de [10⁻⁶ ; 10⁹[,
// écrite dans le texte comme elle se retape (`8.7700*10^9`). Avant : le flottant brut du moteur
// (`≈ 8769956796.08269`, `≈ 1.42857142857143e-7`, `18446744073709552000` faux et sans ≈)
describe('hors de l’échelle : la notation scientifique', () => {
	it.each([
		['\\pi^{20}', '≈ 8.7700*10^9'],
		['-\\pi^{20}', '≈ -8.7700*10^9'],
		['e^{30}', '≈ 1.0686*10^13'],
		['1/7000000', '≈ 1.4286*10^-7'],
		['1/8000000', '1.25*10^-7'],
		['2^{64}', '≈ 1.8447*10^19'],
		['3*10^20', '3*10^20'],
		['10^15+1', '≈ 1.0000*10^15'],
		['10^14+1', '100000000000001'],
		['0.3^1000', '≈ 1.3221*10^-523'],
		['0.5^2000', '≈ 8.7098*10^-603'],
		['1.5^2000', '≈ 1.5224*10^352']
	])('%s → %s', (input, expected) => {
		expect(decimal(input).output).toBe(expected);
	});

	it('le texte se retape dans la console', () => {
		expect(new WebReplEngine().execute('8.7700*10^9').output).toBe('8770000000');
		expect(new WebReplEngine().execute('1.4286*10^-7').output).toBe('7143/50000000000');
	});

	// Au-delà du plafond des puissances exactes, le calcul décimal du moteur échoue
	// honnêtement : la console garde la valeur, lue sur le résultat exact
	it('au-delà du plafond des puissances exactes : la valeur, pas une erreur', () => {
		expect(decimal('0.5^20000').output).toBe('≈ 2.5124*10^-6021');
		expect(new WebReplEngine().execute('1.5^2000').success).toBe(true);
	});

	// Mesuré avant : 14 s, navigateur bloqué — la fraction était réduite à chaque multiplication
	it('(1+1/10000)^10000 se calcule vite', () => {
		const start = performance.now();
		expect(decimal('(1+1/10000)^10000').output).toBe('≈ 2.7181');
		expect(performance.now() - start).toBeLessThan(3000);
	});
});
