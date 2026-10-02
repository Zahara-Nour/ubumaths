/**
 * Deux équations (ou inéquations) écrites différemment : `y=x+1` contre `y=1+x`.
 *
 * Mesuré sur `main` à `112827ef4` : la relation était un nœud OPAQUE pour la
 * normalisation, comparé par son empreinte d'arbre. Toute écriture différente
 * d'un membre — l'ordre des termes compris — rendait faux, et une réponse
 * juste était comptée fausse (`y=1+x` pour l'attendu `y=x+1`).
 *
 * ## Ce que « équivalent » veut dire pour une relation (décision du 2026-10-02)
 *
 * Même relation, membres équivalents un à un, éventuellement ÉCHANGÉS
 * (`y=x+1 ≡ x+1=y`, `x<2 ≡ 2>x`). Rien de plus : une équation multipliée par
 * une constante (`2y=2x+2`) ou réarrangée (`y-x=1`) a les mêmes solutions mais
 * n'est pas la même ÉCRITURE de la droite ; l'accepter est un choix de
 * correction, pas une équivalence d'expressions.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../equivalence';
import { parseLatex } from '../parser';

const eq = (a: string, b: string) => areEquivalent(parseLatex(a), parseLatex(b));

describe('relations : membres équivalents un à un', () => {
	it.each([
		['y=x+1', 'y=1+x'],
		['y=2x-3', 'y=-3+2x'],
		['2x+1=5', '1+2x=5'],
		['y=x+1', 'x+1=y'],
		['y=2(x+1)', 'y=2x+2'],
		['x<2', '2>x'],
		['x\\leq 2', '2\\geq x'],
		['x+1\\neq 0', '0\\neq 1+x']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
		expect(eq(b, a)).toBe(true);
	});

	it.each([
		['y=x+1', 'y=x+2'],
		['y=x+1', 'x=y+1'],
		// Mêmes solutions, mais pas la même écriture (décision ci-dessus)
		['2y=2x+2', 'y=x+1'],
		['y-x=1', 'y=x+1'],
		['x<2', '2<x'],
		['x<2', 'x\\leq 2'],
		['x<2', 'x=2'],
		['y=x+1', 'x+1']
	])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
		expect(eq(b, a)).toBe(false);
	});
});
