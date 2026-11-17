/**
 * Le plafond des 1 000 caractères et la réponse brute (`answer`), lot 2 du chantier
 * `registre-reference` : un quotient de factorielles court se calcule (`1000!/999!` → 1000,
 * règle « calcul puis mesure », David, 2026-11-01) ; une écriture gardée répond par elle-même.
 */
import { describe, expect, it } from 'vitest';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';

function run(line: string, mode: 'exact' | 'decimal' = 'exact') {
	const engine = new WebReplEngine();
	if (mode === 'decimal') engine.execute('.decimal');
	return engine.execute(line);
}

describe('Un quotient de factorielles court se calcule', () => {
	it.each([
		['1000!/999!', '1000'],
		['1000!/998!', '999000'],
		['2000!/1999!', '2000'],
		['1000!/999! + 1/2', '\\dfrac{2001}{2}'],
		['binom(1000, 500)/binom(1000, 500)', '1']
	])('%s → %s', (line, answer) => {
		const result = run(line);
		expect(result.success).toBe(true);
		expect(result.answer).toBe(answer);
		expect(result.exactTooLong).toBeUndefined();
	});

	it('le mode décimal garde la réponse exacte', () => {
		expect(run('1000!/999!', 'decimal').answer).toBe('1000');
	});

	it('une factorielle seule trop longue garde son écriture', () => {
		const result = run('1000!');
		expect(result.exactTooLong).toBeGreaterThan(1000);
		expect(result.answer).toBe('1000!');
	});
});

describe('Une écriture gardée répond par elle-même', () => {
	it.each([
		['(1+1/1000)^1000', '\\left( 1 + 1 / 1000 \\right)^{1000}'],
		['1.01^365', '1.01^{365}'],
		['0.3^1000', '0.3^{1000}']
	])('%s → %s', (line, answer) => {
		const result = run(line);
		expect(result.exactTooLong).toBeGreaterThan(1000);
		expect(result.answer).toBe(answer);
	});

	it('en mode décimal aussi', () => {
		expect(run('(1+1/1000)^1000', 'decimal').answer).toBe('\\left( 1 + 1 / 1000 \\right)^{1000}');
	});
});

describe('Une comparaison de factorielles courtes se tranche juste', () => {
	it.each([
		['1000!/999! = 1000', '\\text{vrai}'],
		['1000!/999! > 999', '\\text{vrai}'],
		['1000!/999! < 5', '\\text{faux}'],
		['1 < 1000!/999! < 2000', '\\text{vrai}'],
		['1000!/999! = 1000 et 2 > 1', '\\text{vrai}']
	])('%s → %s', (line, answer) => {
		const result = run(line);
		expect(result.success).toBe(true);
		expect(result.answer).toBe(answer);
	});
});
