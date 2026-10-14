/**
 * Une cellule de la grille tapée dans Calcul (tableur intégré, phase 0 §8).
 *
 * L'atelier ne lit la grille que par une colonne NOMMÉE (Q1) : `A2` dans
 * Calcul est refusé en le disant, au lieu de « Nombre 2 écrit après un
 * facteur », qui fait chercher une faute de frappe.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine(), seed: () => 1 };
}

function answer(text: string): string {
	const result = runInput(session(), text);
	if (result.kind === 'refus') return result.message;
	if (result.kind === 'calcul' || result.kind === 'commande') return result.output;
	return result.kind;
}

describe('une cellule tapée dans Calcul', () => {
	it.each(['A2', 'B2+1', '2*C12', 'sqrt(A2)'])('%s : refus qui nomme la cellule', (text) => {
		const cell = /[A-Z]\d+/.exec(text)![0];

		expect(answer(text)).toBe(
			`${cell} est une cellule de la grille : nomme sa colonne pour t’en servir.`
		);
	});

	it('une saisie qui se calcule ne change pas', () => {
		expect(answer('2+3')).toBe('5');
		expect(answer('x^2+1')).not.toContain('cellule');
	});

	it('un nom indicé (A_2) n’est pas une cellule', () => {
		expect(answer('A_2+1')).not.toContain('cellule');
	});
});
