/**
 * Un résultat exact trop long garde son écriture (option A de David, 2026-10-12, seuil
 * 1 000 caractères) — comme `1000!` le faisait déjà. Sa valeur approchée reste au bouton ≈ et
 * en mode décimal. Valeurs attendues tirées des fractions exactes (Python `Fraction`).
 *
 * Mesuré avant : `(1+1/10000)^10000` 13 s (80 003 caractères), `(1+1/100000)^100000` bloqué
 * plus de 200 s, `1000!` en mode décimal : « result too large to stay exact ».
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '../web-repl-engine';

function exact(input: string) {
	return new WebReplEngine().execute(input);
}

function decimal(input: string) {
	const engine = new WebReplEngine();
	engine.execute('.mode decimal');
	return engine.execute(input);
}

describe('au-delà de 1 000 caractères : l’écriture gardée, la valeur approchée à côté', () => {
	it.each([
		['(1+1/1000)^1000', '\\approx 2.7169', '≈ 2.7169'],
		['1.01^365', '\\approx 37.7834', '≈ 37.7834'],
		['1000*(1+0.03/12)^360', '\\approx 2456.8422', '≈ 2456.8422'],
		['1.5^2000', '\\approx 1.5224 \\times 10^{352}', '≈ 1.5224*10^352'],
		['2^100000', '\\approx 9.9900 \\times 10^{30102}', '≈ 9.9900*10^30102'],
		['1000!', '\\approx 4.0239 \\times 10^{2567}', '≈ 4.0239*10^2567']
	])('%s', (input, approximate, decimalOutput) => {
		const line = exact(input);

		expect(line.success).toBe(true);
		expect(line.output.length).toBeLessThan(40);
		expect(line.exactTooLong).toBeGreaterThan(1000);
		expect(line.approximateLatex).toBe(approximate);
		expect(decimal(input).output).toBe(decimalOutput);
	});

	it('l’écriture gardée est celle qu’on a tapée', () => {
		expect(exact('(1+1/1000)^1000').output).toBe('(1+1/1000)^1000');
	});

	// Mesuré avant : 13 s ; et bloqué plus de 200 s pour n = 100 000
	it.each(['(1+1/10000)^10000', '(1+1/100000)^100000'])('%s en moins d’une seconde', (input) => {
		const start = performance.now();
		const exactLine = exact(input);
		const decimalLine = decimal(input);

		expect(performance.now() - start).toBeLessThan(1000);
		expect(exactLine.output).toBe(input);
		expect(decimalLine.output).toBe(input === '(1+1/10000)^10000' ? '≈ 2.7181' : '≈ 2.7183');
	});
});

describe('en deçà : rien ne change', () => {
	it.each([
		['2^1000', 302],
		['200!', 375],
		['(1+1/100)^100', 403]
	])('%s s’écrit en entier (%i caractères)', (input, length) => {
		const line = exact(input);

		expect(line.output.length).toBe(length);
		expect(line.exactTooLong).toBeUndefined();
	});

	it('une comparaison de grandes puissances rend toujours vrai ou faux', () => {
		expect(exact('2^5000 > 3^3000').output).toBe('true');
	});
});
