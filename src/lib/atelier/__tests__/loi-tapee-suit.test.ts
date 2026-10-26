/**
 * « X suit B(10 ; 0,5) » est la RÉPONSE de la console à `.binomiale X 10 0,5`.
 * Un élève qui la recopie recevait « Il manque « ) » » : la console lui dit
 * maintenant la commande à taper (écart du lot 9 de verifs-auto, 2026-10-26).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '../calcul';

function refusal(input: string): string {
	const result = runInput({ atelier: new Atelier(), engine: new WebReplEngine() }, input);
	return result.kind === 'refus' ? result.message : `pas un refus : ${result.kind}`;
}

describe('« X suit … » tapé : la commande de la loi', () => {
	it('X suit B(10;0,5) → .binomiale X 10 0,5', () => {
		expect(refusal('X suit B(10;0,5)')).toBe(
			'« X suit B(10 ; 0,5) » est ce que répond la console : pour définir la loi, tape .binomiale X 10 0,5'
		);
	});

	it('espaces et virgule séparatrice', () => {
		expect(refusal('X suit B(10 ; 0,5)')).toContain('tape .binomiale X 10 0,5');
	});

	it('G, E : leur commande', () => {
		expect(refusal('X suit G(0,2)')).toContain('tape .geometrique X 0,2');
		expect(refusal('T suit E(0,5)')).toContain('tape .exponentielle T 0,5');
	});

	it('N : la console écrit la variance, la commande prend l’écart type', () => {
		expect(refusal('T suit N(100 ; 225)')).toContain(
			'tape .normale T 100 σ, avec σ l’écart type (ici σ² = 225)'
		);
	});

	it('une loi sans lettre connue : l’exemple de .aide', () => {
		expect(refusal('X suit Z(3)')).toContain('.binomiale X 10 0,3');
	});
});
