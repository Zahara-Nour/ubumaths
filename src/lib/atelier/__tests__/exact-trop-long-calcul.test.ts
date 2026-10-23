/**
 * Calcul : un résultat exact trop long garde son écriture, une note dit pourquoi (option A
 * de David, 2026-10-12). Avant, `(1+1/1000)^1000` affichait une fraction de 6 003 caractères.
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { Atelier } from '../atelier.svelte';
import { runInput } from '../calcul';

function session() {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

describe('Calcul : la valeur exacte trop longue', () => {
	it('la ligne garde l’écriture tapée, sans la recalculer', () => {
		const line = runInput(session(), '(1+1/1000)^1000');

		expect(line.kind).toBe('calcul');
		// La division tapée `/` reste en ligne, comme ailleurs dans Calcul
		expect(line.kind === 'calcul' && line.latex).toBe('\\left( 1 + 1 / 1000 \\right)^{1000}');
	});

	it('une note dit pourquoi', () => {
		const line = runInput(session(), '(1+1/1000)^1000');

		expect(line.kind === 'calcul' && line.note).toBe(
			'Valeur exacte trop longue (environ 6000 chiffres) : elle reste écrite telle quelle.'
		);
	});

	it('la valeur approchée est au bouton ≈', () => {
		const line = runInput(session(), '(1+1/1000)^1000');

		expect(line.kind === 'calcul' && line.alternative?.latex).toBe('\\approx 2{,}7169');
	});

	it('rien ne change pour un résultat exact lisible', () => {
		const line = runInput(session(), '2^10');

		expect(line.kind === 'calcul' && line.note).toBeUndefined();
	});
});
