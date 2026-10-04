/**
 * Non-régression « or » des commandes de simulation de l'atelier (revue de la
 * manche 14, 2026-10-04) : `.simuler`, `.fréquence`, `.échantillons` rendent,
 * pour la graine 4821, EXACTEMENT les textes relevés sur `main` (3765e70d0)
 * par un script qui importait les modules du dépôt principal.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { frequencyCommand, samplesCommand, simulateCommand } from '../simulate';

function dieAtelier(): Atelier {
	const atelier = new Atelier();
	atelier.create({ kind: 'list', name: 'L', definition: '1;2;3;4;5;6' });
	atelier.create({ kind: 'list', name: 'M', definition: '1/6;1/6;1/6;1/6;1/6;1/6' });
	return atelier;
}

const textOf = (result: { ok: true; text: string } | { ok: false; message: string }) =>
	result.ok ? result.text : `ERREUR ${result.message}`;

describe('atelier — mêmes textes que sur main (graine 4821)', () => {
	it('.simuler L M 600', () => {
		expect(textOf(simulateCommand(dieAtelier(), 'L M 600', 4821))).toBe(
			[
				'600 tirages de L avec probabilités M (graine 4821) → effectifs dans N',
				'1 : 91 fois, fréquence 0,152 — probabilité 1/6',
				'2 : 101 fois, fréquence 0,168 — probabilité 1/6',
				'3 : 99 fois, fréquence 0,165 — probabilité 1/6',
				'4 : 102 fois, fréquence 0,17 — probabilité 1/6',
				'5 : 94 fois, fréquence 0,157 — probabilité 1/6',
				'6 : 113 fois, fréquence 0,188 — probabilité 1/6',
				'Pour aller plus loin : .fréquence L M 1000 · .échantillons L M 50 100'
			].join('\n')
		);
	});

	it('.fréquence L M 1000', () => {
		expect(textOf(frequencyCommand(dieAtelier(), 'L M 1000', 4821))).toBe(
			'1 000 tirages de L avec probabilités M (graine 4821)\nmoyenne des tirages : 3,593 — espérance E = 7/2'
		);
	});

	it('.échantillons L M 50 100', () => {
		expect(textOf(samplesCommand(dieAtelier(), 'L M 50 100', 4821))).toBe(
			[
				'50 échantillons de 100 tirages de L avec probabilités M (graine 4821)',
				'μ = 7/2 ; σ ≈ 1,708 ; 2σ/√n ≈ 0,342',
				'48 échantillons sur 50 (96 %) ont une moyenne à moins de 0,342 de μ'
			].join('\n')
		);
	});
});
