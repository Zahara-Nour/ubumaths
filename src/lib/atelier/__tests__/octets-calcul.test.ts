/**
 * Calcul : les quantités d'information (octets, bits) — 2026-10-13
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { Atelier } from '../atelier.svelte';
import { runInput, type CalcResult } from '../calcul';

function session() {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

const latexOf = (result: CalcResult) =>
	result.kind === 'calcul' || result.kind === 'commande' ? result.latex : undefined;

describe('octets et bits dans Calcul', () => {
	it.each([
		['2^10[o]', '1024~\\mathrm{o}'],
		['5[Mo]+500[ko]', '5{,}5~\\mathrm{Mo}'],
		['5 ko', '5~\\mathrm{ko}'],
		// « Ko » accepté pour le ko (décision de David, 2026-10-18)
		['5 Ko + 3 ko', '8~\\mathrm{Ko}'],
		['1[Ko]+1[o]', '1{,}001~\\mathrm{Ko}'],
		['100[Mbit/s]*8[s]', '800~\\mathrm{Mbit}']
	])('%s', (input, latex) => {
		expect(latexOf(runInput(session(), input))).toBe(latex);
	});

	it.each([
		['1[Kio]', 'o', '1~\\mathrm{Kio} = 1024~\\mathrm{o}'],
		['8[bit]', 'o', '8~\\mathrm{bit} = 1~\\mathrm{o}'],
		['1[Go]', 'Mo', '1~\\mathrm{Go} = 1000~\\mathrm{Mo}']
	])('%s puis .convertir %s', (quantity, unit, latex) => {
		const s = session();
		runInput(s, quantity);

		expect(latexOf(runInput(s, `.convertir ${unit}`))).toBe(latex);
	});

	it('une quantité de données ne s’ajoute pas à une longueur', () => {
		const result = runInput(session(), '5[Mo]+3[m]');

		expect(result.kind === 'refus' && result.message).toBe(
			'On ne peut pas ajouter une quantité de données et une longueur.'
		);
	});
});
