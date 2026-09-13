/**
 * Tests du format décimal des valeurs affichées sur le graphe.
 *
 * Fige le comportement historique de l'infobulle, désormais partagé entre le
 * survol et les étiquettes figées.
 */

import { describe, it, expect } from 'vitest';
import { formatGraphValue } from '$lib/grapheur/format';

describe('formatGraphValue', () => {
	it('garde quatre chiffres significatifs', () => {
		expect(formatGraphValue(0.375)).toBe('0.375');
		expect(formatGraphValue(1 / 3)).toBe('0.3333');
	});

	it('supprime les zéros inutiles', () => {
		expect(formatGraphValue(2)).toBe('2');
		expect(formatGraphValue(2.5)).toBe('2.5');
	});

	it('écrit zéro simplement', () => {
		expect(formatGraphValue(0)).toBe('0');
	});

	// Sur un graphe, une valeur minuscule non nulle doit se distinguer de zéro.
	it('passe en notation scientifique pour les très petites valeurs', () => {
		expect(formatGraphValue(0.00001)).toBe('1.00e-5');
	});

	it('passe en notation scientifique pour les très grandes', () => {
		expect(formatGraphValue(123456)).toBe('1.23e+5');
	});

	it('garde le signe', () => {
		expect(formatGraphValue(-0.375)).toBe('-0.375');
	});

	// Une valeur non finie ne devrait jamais atteindre l'affichage, mais si elle
	// y arrive, elle doit rester lisible plutôt que de casser le rendu.
	it('écrit les valeurs non finies telles quelles', () => {
		expect(formatGraphValue(Number.POSITIVE_INFINITY)).toBe('Infinity');
		expect(formatGraphValue(Number.NaN)).toBe('NaN');
	});
});
