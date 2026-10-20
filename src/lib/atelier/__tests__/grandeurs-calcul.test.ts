/**
 * Les grandeurs vues depuis une ligne de Calcul (phase 0
 * `docs/archive/wip/grandeurs-phase0.md`, lot A).
 *
 * Mesuré avant : `5[km]` affichait « 5 » (l'arbre de la réponse n'avait pas
 * d'unité), `d/t` avec d = 5 km et t = 2 h affichait « 5/2 m/s ».
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

describe('une grandeur s’affiche avec son unité', () => {
	it.each([
		['5[km]', '5~\\mathrm{km}'],
		['10[km]/1[h]', '10~\\mathrm{km}/\\mathrm{h}'],
		['12[km]+300[m]', '12{,}3~\\mathrm{km}'],
		['7[mm]*5[mm]', '35~\\mathrm{mm}^{2}']
	])('%s', (input, latex) => {
		expect(latexOf(runInput(session(), input))).toBe(latex);
	});
});

describe('les grandeurs nommées du panneau', () => {
	it('d/t donne une vitesse en km/h, v·3 h une distance en km', () => {
		const s = session();
		runInput(s, 'd = 5[km]');
		runInput(s, 't = 2[h]');
		runInput(s, 'v = d/t');

		expect(latexOf(runInput(s, 'd/t'))).toBe('2{,}5~\\mathrm{km}/\\mathrm{h}');
		expect(latexOf(runInput(s, 'v*3[h]'))).toBe('7{,}5~\\mathrm{km}');
		// Une grandeur du panneau clôt le terme : d/(2 h), pas (d/2) h (revue de la PR 4)
		expect(latexOf(runInput(s, 'd/2[h]'))).toBe('2{,}5~\\mathrm{km}/\\mathrm{h}');
	});
});

describe('une erreur de dimension, en français', () => {
	it('5[m]+3[s]', () => {
		const result = runInput(session(), '5[m]+3[s]');

		expect(result.kind === 'refus' && result.message).toBe(
			'On ne peut pas ajouter une longueur et une durée.'
		);
	});
});

describe('le bouton ≈ d’une grandeur', () => {
	it('10[km]/3 propose ≈ 3,3333 km', () => {
		const result = runInput(session(), '10[km]/3');

		expect(result.kind === 'calcul' && result.alternative).toEqual({
			label: 'Valeur approchée',
			latex: '\\approx 3{,}3333~\\mathrm{km}'
		});
	});
});

describe('.convertir', () => {
	it('écrit la grandeur égale à sa conversion, en mathématiques', () => {
		const s = session();
		runInput(s, '12[km]+300[m]');

		expect(latexOf(runInput(s, '.convertir m'))).toBe('12{,}3~\\mathrm{km} = 12300~\\mathrm{m}');
	});
});
