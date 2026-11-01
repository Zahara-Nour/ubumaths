/**
 * L22 : `e`, `i` et `π` sont lus en constantes par le parseur ; le filtre de
 * noms qui les écartait de `getVariables` ne servait plus qu'aux variables
 * indicées (`e_1`, `i_1`), qu'il prenait à tort pour la constante d'Euler ou
 * l'unité imaginaire.
 */
import { describe, it, expect } from 'vitest';
import { parseLatex } from '$lib/mathAST/parser';
import { constantNames } from '../calculus-reading';

describe('constantNames : constantes indicées (L22)', () => {
	it.each(['3x^2+e_1', 'x+i_1', '2e^x+C_1'])('%s : une constante', (latex) => {
		expect(constantNames(parseLatex(latex), 'x')).toHaveLength(1);
	});

	it('e^x + i + π : aucune constante d’intégration', () => {
		expect(constantNames(parseLatex('3e^x+i+\\pi x'), 'x')).toEqual([]);
	});
});
