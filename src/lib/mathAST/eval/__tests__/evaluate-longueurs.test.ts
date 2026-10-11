/**
 * Évaluer une longueur ou un nom de figure : un message en français, lisible par un
 * élève si jamais il remonte jusqu'à lui (au lieu de « Cannot evaluate node type »).
 */

import { describe, it, expect } from 'vitest';
import { evaluateNodeToApproximatedNumber } from '../evaluate';
import { parseLatex } from '../../parser';

describe('évaluer une longueur ou un nom de figure', () => {
	it('3AB : la valeur de la longueur AB n’est pas donnée', () => {
		expect(() =>
			evaluateNodeToApproximatedNumber(parseLatex('3AB', { capitalPairs: 'length' }))
		).toThrow('On ne connaît pas la valeur de la longueur AB.');
	});

	it('ABC : un nom de figure n’est pas un nombre', () => {
		expect(() =>
			evaluateNodeToApproximatedNumber(parseLatex('ABC', { capitalPairs: 'length' }))
		).toThrow('ABC est le nom d’une figure, pas un nombre : on ne peut pas le calculer.');
	});
});
