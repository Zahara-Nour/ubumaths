/**
 * Écart V65 — plusieurs lettres, aucune inconnue précisée.
 *
 * `detectVariable` ne choisit une inconnue que s'il n'y a qu'UNE lettre. Avec
 * `|x| = a`, `ax = 1` ou `a\cos x = 1` appelés sans `variable`, il rendait
 * `null`, et `solve` traitait l'équation comme CONSTANTE : « contradiction »,
 * `no-solution` sans `error` — un ∅ affirmé, que `isSolverFailure` ne
 * distinguait pas d'une vraie absence de solution.
 *
 * Comportement voulu : un refus (`isSolverFailure`), qui dit de préciser
 * l'inconnue. Une équation vraie pour toutes les valeurs (`a = a`) reste une
 * identité, une équation dont les lettres s'éliminent (`x + y = x + y + 1`)
 * une contradiction, et une équation sans lettre reste jugée comme avant.
 */

import { describe, it, expect } from 'vitest';
import { solve } from '../solve';
import { isSolverFailure } from '../types';
import { parseLatex } from '../../parser';
import type { RelationNode } from '../../types';

function relationOf(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (node.type !== 'relation') throw new Error(`Relation attendue : ${latex}`);
	return node;
}

describe('plusieurs lettres sans inconnue précisée : refus, jamais ∅', () => {
	it.each(['|x|=a', '|x^2-1|=a', 'a\\cos x=1', 'ax=1', 'a\\ln x=1', 'x^2=a', '|x-a|=1', 'e^{x}=a'])(
		'%s : échec du solveur, qui demande l’inconnue',
		(latex) => {
			const result = solve(relationOf(latex));
			expect(isSolverFailure(result)).toBe(true);
			expect(result.solutions).toEqual([]);
			expect(result.error).toMatch(/inconnue/);
		}
	);

	it('a = a : vraie pour toute valeur, reste une identité', () => {
		expect(solve(relationOf('a+b=b+a')).status).toBe('infinite');
	});

	it('x + y = x + y + 1 : les lettres s’éliminent, contradiction démontrée', () => {
		const result = solve(relationOf('x+y=x+y+1'));
		expect(result.status).toBe('no-solution');
		expect(isSolverFailure(result)).toBe(false);
	});

	it('avec l’inconnue précisée, ax = 1 se résout comme avant', () => {
		const result = solve(relationOf('ax=1'), { variable: 'x' });
		expect(result.status).toBe('unique');
	});
});

describe('aucune lettre : jugée comme avant', () => {
	it('1 = 2 : contradiction démontrée, sans erreur', () => {
		const result = solve(relationOf('1=2'));
		expect(result.status).toBe('no-solution');
		expect(isSolverFailure(result)).toBe(false);
	});

	it('2 = 2 : identité', () => {
		expect(solve(relationOf('2=2')).status).toBe('infinite');
	});
});
