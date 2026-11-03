/**
 * L'écriture décimale de la réponse brute (`decimal`, `decimalExact`) et la
 * réponse exacte dans les deux modes — décisions A et B du lot 2 du chantier
 * `registre-reference` (David, 2026-11-01) : le registre rend TOUJOURS
 * `answer` + `decimal` + `decimalExact` ; le mode décimal est un choix
 * d'affichage de l'outil.
 *
 * Le corpus (`tests/fixtures/mathast/registre-corpus.ts`) juge le mode exact ;
 * ici : le mode décimal, les grandeurs, et ce qui n'en a pas.
 *
 * Mesuré avant : `3`, `2^40`, `100!` sans écriture décimale (`approximateLatex`
 * se tait pour un nombre déjà écrit) ; en mode décimal, `answer` de `1/3`
 * valait `0.3333`.
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '../web-repl-engine';

// =============================================================================
// Fonctions
// =============================================================================

function run(input: string, mode: 'exact' | 'decimal' = 'exact') {
	const engine = new WebReplEngine();
	if (mode === 'decimal') engine.execute('.mode decimal');
	return engine.execute(input);
}

// =============================================================================
// Tests
// =============================================================================

describe('decimal et decimalExact, dans les deux modes', () => {
	it.each([
		['1/3', '\\dfrac{1}{3}', '0.3333', false],
		['1/4', '\\dfrac{1}{4}', '0.25', true],
		['3', '3', '3', true],
		['2^40', '1099511627776', '1099511627776', true],
		['2^64', '18446744073709551616', '1.8447 \\times 10^{19}', false],
		// Négatifs : le moins reste, seuls `=` / `≈` sont à l'outil (revue)
		['-1/3', '-\\dfrac{1}{3}', '-0.3333', false],
		['-3', '-3', '-3', true]
	] as const)('%s', (input, answer, decimal, exact) => {
		for (const mode of ['exact', 'decimal'] as const) {
			const result = run(input, mode);
			expect(result.answer, mode).toBe(answer);
			expect(result.decimal, mode).toBe(decimal);
			expect(result.decimalExact, mode).toBe(exact);
		}
	});
});

describe('une grandeur garde son unité', () => {
	it('1/3[km] : réponse exacte, décimale arrondie, dans les deux modes', () => {
		for (const mode of ['exact', 'decimal'] as const) {
			const result = run('1/3[km]', mode);
			expect(result.answer, mode).toBe('\\dfrac{1}{3}~\\unit{km}');
			expect(result.decimal, mode).toBe('0.3333~\\unit{km}');
			expect(result.decimalExact, mode).toBe(false);
		}
	});

	it('une grandeur négative garde son moins', () => {
		const result = run('2[h]-3[h]');
		expect(result.decimal).toBe('-1~\\unit{h}');
		expect(result.decimalExact).toBe(true);
	});

	it('une conversion (`.convert`) n’a pas encore de réponse brute', () => {
		const engine = new WebReplEngine();
		engine.execute('1[km]');
		const result = engine.execute('.convert m');
		expect(result.success).toBe(true);
		expect(result.answer).toBeUndefined();
		expect(result.decimal).toBeUndefined();
	});
});

describe('pas d’écriture décimale', () => {
	it.each(['2x+1', '2<3'])('%s', (input) => {
		const result = run(input);
		expect(result.decimal).toBeUndefined();
		expect(result.decimalExact).toBeUndefined();
	});
});
